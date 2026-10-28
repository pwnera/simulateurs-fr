/**
 * TJM / CA → net selon le statut du freelance (2026).
 *
 * - Micro-entreprise : cotisations sur le CA (voir auto-entrepreneur.ts).
 * - Portage salarial : frais de gestion puis salaire de cadre (voir portage.ts).
 * - SASU à l'IS : rémunération du président (assimilé salarié : pas de chômage ni de RGDU), impôt sur
 *   les sociétés (15 % jusqu'à 42 500 €, 25 % au-delà) puis dividendes au PFU de 31,4 % (2026).
 * - EURL à l'IR (ou EI au réel) : cotisations TNS sur le bénéfice, bénéfice imposé au barème.
 * - EURL à l'IS : rémunération de gérant (cotisations TNS, abattement de 10 %), IS, dividendes au PFU ;
 *   la part des dividendes au-delà de 10 % du capital supporte les cotisations TNS.
 */
import { calculImpotRevenu, abattementFraisPro } from "./impot-revenu.js";
import { cotisationsSalariales } from "./cotisations-salariales.js";
import { cotisationsPatronales, brutDepuisCoutEmployeur } from "./cotisations-patronales.js";
import { cotisationsTNS, type ProfessionTNS } from "./cotisations-tns.js";
import { autoEntrepreneur, type AutoEntrepreneurActivite } from "./auto-entrepreneur.js";
import { portageSalarial } from "./portage.js";

export type StatutFreelance = "micro" | "portage" | "sasu_is" | "eurl_ir" | "eurl_is";

/** Impôt sur les sociétés 2026 : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà. */
export const IS_TAUX_REDUIT = 0.15;
export const IS_TAUX_NORMAL = 0.25;
export const IS_SEUIL_TAUX_REDUIT = 42_500;
/** Prélèvement forfaitaire unique 2026 : 12,8 % d'impôt + 18,6 % de prélèvements sociaux (LFSS 2026). */
export const PFU_IR = 0.128;
export const PFU_PRELEVEMENTS_SOCIAUX = 0.186;
export const PFU_TOTAL = PFU_IR + PFU_PRELEVEMENTS_SOCIAUX;

export interface FreelanceInput {
  caMensuel?: number;
  tjm?: number;
  joursParMois?: number;
  /** Charges professionnelles mensuelles (déduites en société ; payées de votre poche en micro). */
  chargesMensuelles?: number;
  statut: StatutFreelance;
  /** Micro : activité. Défaut : prestations BNC. */
  activiteMicro?: AutoEntrepreneurActivite;
  /** Portage : frais de gestion (%). */
  fraisPortagePercent?: number;
  /** SASU / EURL à l'IS : part du résultat consacrée à la rémunération (0-100 %). */
  partRemuneration?: number;
  /** EURL à l'IS : capital social (seuil de 10 % pour les dividendes). Défaut 1 000 €. */
  capitalSocial?: number;
  /** Profession TNS (EURL) : artisan, commerçant, libéral ou libéral Cipav. */
  professionTNS?: ProfessionTNS;
  /** Taux de prélèvement à la source (%) remplaçant l'estimation au barème. */
  tauxPrelevementSource?: number;
}

export interface FreelanceLigne {
  label: string;
  montant: number;
  kind: "base" | "sub" | "total" | "add";
  hint?: string;
}

export interface FreelanceRepartition {
  name: string;
  value: number;
  variant: "deduction" | "cotisations" | "impot" | "amount";
}

export interface FreelanceResult {
  statut: StatutFreelance;
  caMensuel: number;
  chargesMensuelles: number;
  /** Cotisations sociales (et frais de portage) mensuelles. */
  cotisationsMensuelles: number;
  impotSocietesMensuel: number;
  /** Impôt sur le revenu (barème + PFU sur dividendes). */
  impotMensuel: number;
  /** Ce qui reste avant impôt sur le revenu (rémunération nette + dividendes nets de prélèvements sociaux). */
  netAvantImpotMensuel: number;
  /** Ce qui reste après tous prélèvements et charges. */
  netApresImpotMensuel: number;
  netApresImpotAnnuel: number;
  tauxNetSurCA: number;
  /** Taux de prélèvement estimé au barème (sur la base imposable au barème), en %. */
  tauxIREstime: number;
  lignes: FreelanceLigne[];
  repartition: FreelanceRepartition[];
  notes: string[];
  error?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function impotSocietes(benefice: number): number {
  if (benefice <= 0) return 0;
  return Math.min(benefice, IS_SEUIL_TAUX_REDUIT) * IS_TAUX_REDUIT + Math.max(0, benefice - IS_SEUIL_TAUX_REDUIT) * IS_TAUX_NORMAL;
}

/** Impôt annuel au barème sur un revenu imposable, ou au taux personnalisé. */
function impotBareme(revenuImposableAnnuel: number, baseTauxPerso: number, tauxPerso?: number): { impot: number; tauxEstime: number } {
  const impot = calculImpotRevenu({ revenuImposable: Math.max(0, revenuImposableAnnuel) }).impotNet;
  const tauxEstime = baseTauxPerso > 0 ? Math.round((impot / baseTauxPerso) * 10000) / 100 : 0;
  if (tauxPerso != null && tauxPerso >= 0 && tauxPerso <= 45) return { impot: (baseTauxPerso * tauxPerso) / 100, tauxEstime };
  return { impot, tauxEstime };
}

function getCaMensuel(input: FreelanceInput): number {
  if (input.caMensuel != null) return Math.max(0, input.caMensuel);
  if (input.tjm != null && input.tjm > 0) return input.tjm * Math.max(0, input.joursParMois ?? 18);
  return 0;
}

/** Rémunération de président de SASU : coût total (annuel) → brut, cotisations, net, net imposable. */
function remunerationPresident(coutAnnuel: number) {
  const coutMensuel = coutAnnuel / 12;
  const options = { cadre: true, assuranceChomage: false, rgdu: false, effectif11Plus: false, tauxAtmp: 0.009 };
  const brut = brutDepuisCoutEmployeur(coutMensuel, options);
  const pat = cotisationsPatronales({ ...options, brut });
  const sal = cotisationsSalariales({ brut, statut: "cadre" });
  return {
    brut: brut * 12,
    patronales: pat.total * 12,
    salariales: sal.total * 12,
    net: sal.netAPayer * 12,
    netImposable: sal.netImposable * 12,
  };
}

export function simulerFreelance(input: FreelanceInput): FreelanceResult {
  const ca = getCaMensuel(input);
  const charges = Math.max(0, input.chargesMensuelles ?? 0);
  const tauxPerso = input.tauxPrelevementSource;
  const notes: string[] = [];
  const lignes: FreelanceLigne[] = [{ label: "Chiffre d'affaires HT", montant: r2(ca), kind: "base" }];

  const finish = (p: {
    cotisations: number;
    is: number;
    impot: number;
    netAvantImpot: number;
    tauxEstime: number;
    repartition: FreelanceRepartition[];
    error?: string;
  }): FreelanceResult => {
    const netApres = p.netAvantImpot - p.impot;
    return {
      statut: input.statut,
      caMensuel: r2(ca),
      chargesMensuelles: r2(charges),
      cotisationsMensuelles: r2(p.cotisations),
      impotSocietesMensuel: r2(p.is),
      impotMensuel: r2(p.impot),
      netAvantImpotMensuel: r2(p.netAvantImpot),
      netApresImpotMensuel: r2(netApres),
      netApresImpotAnnuel: r2(netApres * 12),
      tauxNetSurCA: ca > 0 ? netApres / ca : 0,
      tauxIREstime: p.tauxEstime,
      lignes,
      repartition: p.repartition.filter((x) => x.value > 0),
      notes,
      error: p.error,
    };
  };

  if (input.statut === "micro") {
    const activite = input.activiteMicro ?? "services_bnc";
    const ae = autoEntrepreneur({ caMensuel: ca, activite, tauxPrelevementSource: tauxPerso });
    const netAvant = ae.netMensuel - charges;
    lignes.push({ label: `− Cotisations sociales et CFP (${(ae.tauxCotisations * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %)`, montant: -ae.cotisations, kind: "sub" });
    if (charges > 0) lignes.push({ label: "− Frais professionnels (non déductibles en micro)", montant: -charges, kind: "sub" });
    lignes.push({ label: "Net avant impôt", montant: r2(netAvant), kind: "total" });
    lignes.push({ label: "− Impôt sur le revenu", montant: -ae.impotMensuel, kind: "sub", hint: `Barème sur le CA après abattement de ${activite === "vente" ? 71 : activite === "services_bic" ? 50 : 34} %` });
    if (!ae.sousPlafond) notes.push(`Au-delà de ${ae.plafondAnnuel.toLocaleString("fr-FR")} € de CA annuel, la micro-entreprise n'est plus possible durablement.`);
    if (ae.tva.statut !== "franchise") notes.push("Votre CA dépasse le seuil de franchise de TVA : vous facturez la TVA en plus de votre TJM (sans impact sur ce net HT).");
    return finish({
      cotisations: ae.cotisations,
      is: 0,
      impot: ae.impotMensuel,
      netAvantImpot: netAvant,
      tauxEstime: ae.tauxPASEstime,
      repartition: [
        { name: "Frais", value: charges, variant: "deduction" },
        { name: "Cotisations", value: ae.cotisations, variant: "cotisations" },
        { name: "Impôt", value: ae.impotMensuel, variant: "impot" },
        { name: "Net", value: netAvant - ae.impotMensuel, variant: "amount" },
      ],
    });
  }

  if (input.statut === "portage") {
    const p0 = portageSalarial({ caMensuel: ca, fraisPortagePercent: input.fraisPortagePercent, fraisProfessionnels: charges });
    const base = p0.netImposable * 12;
    const { impot, tauxEstime } = impotBareme(base - abattementFraisPro(base), base, tauxPerso);
    const impotM = impot / 12;
    lignes.push({ label: `− Frais de gestion (${(input.fraisPortagePercent ?? 7).toLocaleString("fr-FR")} %)`, montant: -p0.fraisGestion, kind: "sub" });
    if (charges > 0) lignes.push({ label: "− Frais professionnels (remboursés sur justificatifs)", montant: -charges, kind: "sub" });
    lignes.push({ label: "− Cotisations patronales", montant: -p0.chargesPatronales, kind: "sub" });
    lignes.push({ label: "Salaire brut", montant: p0.brutMensuel, kind: "total" });
    lignes.push({ label: "− Cotisations salariales", montant: -p0.cotisationsSalariales, kind: "sub" });
    lignes.push({ label: "Salaire net avant impôt", montant: p0.netSalaire, kind: "total" });
    lignes.push({ label: "− Impôt sur le revenu", montant: -r2(impotM), kind: "sub" });
    if (p0.sousMinimum) notes.push("Salaire brut sous le minimum du portage (75 % du PASS à temps plein).");
    return finish({
      cotisations: p0.cotisations + p0.fraisGestion,
      is: 0,
      impot: impotM,
      netAvantImpot: p0.netSalaire,
      tauxEstime,
      repartition: [
        { name: "Frais", value: p0.fraisGestion + charges, variant: "deduction" },
        { name: "Cotisations", value: p0.cotisations, variant: "cotisations" },
        { name: "Impôt", value: impotM, variant: "impot" },
        { name: "Net", value: p0.netSalaire - impotM, variant: "amount" },
      ],
    });
  }

  // Sociétés : résultat avant rémunération
  const resultatMensuel = ca - charges;
  if (charges > 0) lignes.push({ label: "− Charges professionnelles", montant: -charges, kind: "sub" });
  lignes.push({ label: "Résultat avant rémunération", montant: r2(resultatMensuel), kind: "total" });
  if (resultatMensuel <= 0) {
    return finish({
      cotisations: 0,
      is: 0,
      impot: 0,
      netAvantImpot: 0,
      tauxEstime: 0,
      repartition: [],
      error: "Activité déficitaire : les charges dépassent le chiffre d'affaires.",
    });
  }
  const resultatAnnuel = resultatMensuel * 12;
  const part = Math.min(1, Math.max(0, (input.partRemuneration ?? 100) / 100));

  if (input.statut === "eurl_ir") {
    const tns = cotisationsTNS(resultatAnnuel, input.professionTNS ?? "liberal");
    const beneficeImposable = resultatAnnuel - tns.deductible;
    const { impot, tauxEstime } = impotBareme(beneficeImposable, beneficeImposable, tauxPerso);
    const netAvant = tns.revenuNet / 12;
    lignes.push({ label: `− Cotisations TNS (${(tns.tauxGlobal * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %)`, montant: -r2(tns.total / 12), kind: "sub", hint: "Assiette 2026 : résultat − 26 %" });
    lignes.push({ label: "Revenu net avant impôt", montant: r2(netAvant), kind: "total" });
    lignes.push({ label: "− Impôt sur le revenu", montant: -r2(impot / 12), kind: "sub", hint: "Barème sur le bénéfice (CSG non déductible réintégrée)" });
    return finish({
      cotisations: tns.total / 12,
      is: 0,
      impot: impot / 12,
      netAvantImpot: netAvant,
      tauxEstime,
      repartition: [
        { name: "Charges", value: charges, variant: "deduction" },
        { name: "Cotisations TNS", value: tns.total / 12, variant: "cotisations" },
        { name: "Impôt", value: impot / 12, variant: "impot" },
        { name: "Net", value: netAvant - impot / 12, variant: "amount" },
      ],
    });
  }

  if (input.statut === "sasu_is") {
    const coutRemu = resultatAnnuel * part;
    const remu = remunerationPresident(coutRemu);
    const beneficeAvantIS = resultatAnnuel - coutRemu;
    const is = impotSocietes(beneficeAvantIS);
    const dividendes = Math.max(0, beneficeAvantIS - is);
    const ps = dividendes * PFU_PRELEVEMENTS_SOCIAUX;
    const irDividendes = dividendes * PFU_IR;
    const baseSalaire = remu.netImposable;
    const { impot: irSalaire, tauxEstime } = impotBareme(baseSalaire - abattementFraisPro(baseSalaire), baseSalaire, tauxPerso);
    const netAvant = (remu.net + dividendes - ps) / 12;
    const impot = (irSalaire + irDividendes) / 12;
    if (coutRemu > 0) {
      lignes.push({ label: "Coût de la rémunération", montant: r2(coutRemu / 12), kind: "base", hint: `${Math.round(part * 100)} % du résultat` });
      lignes.push({ label: "− Cotisations patronales (sans chômage)", montant: -r2(remu.patronales / 12), kind: "sub" });
      lignes.push({ label: "− Cotisations salariales", montant: -r2(remu.salariales / 12), kind: "sub" });
      lignes.push({ label: "Salaire net", montant: r2(remu.net / 12), kind: "total" });
    }
    if (beneficeAvantIS > 0) {
      lignes.push({ label: "Bénéfice avant IS", montant: r2(beneficeAvantIS / 12), kind: "base" });
      lignes.push({ label: "− Impôt sur les sociétés (15 % / 25 %)", montant: -r2(is / 12), kind: "sub" });
      lignes.push({ label: "Dividendes bruts", montant: r2(dividendes / 12), kind: "total" });
      lignes.push({ label: "− Prélèvements sociaux (18,6 %)", montant: -r2(ps / 12), kind: "sub" });
    }
    lignes.push({ label: "Net avant impôt sur le revenu", montant: r2(netAvant), kind: "total" });
    lignes.push({ label: "− Impôt sur le revenu", montant: -r2(impot), kind: "sub", hint: dividendes > 0 ? "Barème sur le salaire + 12,8 % sur les dividendes" : "Barème sur le salaire (abattement 10 %)" });
    if (coutRemu > 0 && remu.brut < 0.25 * 48_060) notes.push("Un salaire brut inférieur à environ 7 200 € par an ne valide pas 4 trimestres de retraite.");
    if (coutRemu === 0) notes.push("Sans rémunération, le président ne cotise pas : aucune protection sociale (retraite, maladie) n'est acquise.");
    return finish({
      cotisations: (remu.patronales + remu.salariales + ps) / 12,
      is: is / 12,
      impot,
      netAvantImpot: netAvant,
      tauxEstime,
      repartition: [
        { name: "Charges", value: charges, variant: "deduction" },
        { name: "Cotisations", value: (remu.patronales + remu.salariales + ps) / 12, variant: "cotisations" },
        { name: "IS", value: is / 12, variant: "impot" },
        { name: "Impôt", value: impot, variant: "impot" },
        { name: "Net", value: netAvant - impot, variant: "amount" },
      ],
    });
  }

  // EURL à l'IS
  const profession = input.professionTNS ?? "liberal";
  const revenuAvantCotisations = resultatAnnuel * part;
  const tns = cotisationsTNS(revenuAvantCotisations, profession);
  const beneficeAvantIS = resultatAnnuel - revenuAvantCotisations;
  const is = impotSocietes(beneficeAvantIS);
  const dividendes = Math.max(0, beneficeAvantIS - is);
  const seuil10 = 0.1 * Math.max(0, input.capitalSocial ?? 1000);
  const divTns = Math.max(0, dividendes - seuil10);
  const divPfu = dividendes - divTns;
  const cotDiv = divTns > 0 ? cotisationsTNS(revenuAvantCotisations + divTns, profession).total - tns.total : 0;
  const ps = divPfu * PFU_PRELEVEMENTS_SOCIAUX;
  const irDividendes = dividendes * PFU_IR;
  const remuImposable = Math.max(0, revenuAvantCotisations - tns.deductible);
  const { impot: irRemu, tauxEstime } = impotBareme(remuImposable - abattementFraisPro(remuImposable), remuImposable, tauxPerso);
  const netAvant = (tns.revenuNet + dividendes - cotDiv - ps) / 12;
  const impot = (irRemu + irDividendes) / 12;
  if (revenuAvantCotisations > 0) {
    lignes.push({ label: "Rémunération du gérant (avant cotisations)", montant: r2(revenuAvantCotisations / 12), kind: "base", hint: `${Math.round(part * 100)} % du résultat` });
    lignes.push({ label: "− Cotisations TNS", montant: -r2(tns.total / 12), kind: "sub" });
    lignes.push({ label: "Rémunération nette", montant: r2(tns.revenuNet / 12), kind: "total" });
  }
  if (beneficeAvantIS > 0) {
    lignes.push({ label: "Bénéfice avant IS", montant: r2(beneficeAvantIS / 12), kind: "base" });
    lignes.push({ label: "− Impôt sur les sociétés (15 % / 25 %)", montant: -r2(is / 12), kind: "sub" });
    lignes.push({ label: "Dividendes bruts", montant: r2(dividendes / 12), kind: "total" });
    if (cotDiv > 0) lignes.push({ label: "− Cotisations TNS sur dividendes (> 10 % du capital)", montant: -r2(cotDiv / 12), kind: "sub" });
    if (ps > 0) lignes.push({ label: "− Prélèvements sociaux (18,6 %)", montant: -r2(ps / 12), kind: "sub" });
  }
  lignes.push({ label: "Net avant impôt sur le revenu", montant: r2(netAvant), kind: "total" });
  lignes.push({ label: "− Impôt sur le revenu", montant: -r2(impot), kind: "sub", hint: dividendes > 0 ? "Barème sur la rémunération + 12,8 % sur les dividendes" : "Barème sur la rémunération (abattement 10 %)" });
  if (divTns > 0) notes.push("En EURL, les dividendes dépassant 10 % du capital social supportent les cotisations TNS : la rémunération est souvent plus avantageuse.");
  return finish({
    cotisations: (tns.total + cotDiv + ps) / 12,
    is: is / 12,
    impot,
    netAvantImpot: netAvant,
    tauxEstime,
    repartition: [
      { name: "Charges", value: charges, variant: "deduction" },
      { name: "Cotisations", value: (tns.total + cotDiv + ps) / 12, variant: "cotisations" },
      { name: "IS", value: is / 12, variant: "impot" },
      { name: "Impôt", value: impot, variant: "impot" },
      { name: "Net", value: netAvant - impot, variant: "amount" },
    ],
  });
}

/** Compatibilité : statuts historiques (« sasu » = SASU tout en salaire, « eurl » = EURL à l'IR). */
export function normalizeStatutFreelance(statut: string | undefined | null): StatutFreelance | null {
  switch ((statut ?? "").toLowerCase()) {
    case "micro":
    case "auto":
    case "auto-entrepreneur":
      return "micro";
    case "portage":
      return "portage";
    case "sasu":
    case "sasu_is":
      return "sasu_is";
    case "eurl":
    case "eurl_ir":
      return "eurl_ir";
    case "eurl_is":
      return "eurl_is";
    default:
      return null;
  }
}
