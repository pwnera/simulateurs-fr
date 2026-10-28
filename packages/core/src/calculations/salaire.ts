/**
 * Salaire brut ↔ net (2026).
 *
 * Secteur privé et fonction publique : cotisations calculées ligne par ligne
 * (lib/calculations/cotisations-salariales.ts). Profession libérale : cotisations de travailleur
 * indépendant sur le revenu avant cotisations (lib/calculations/cotisations-tns.ts).
 *
 * Mois de primes (13e mois…) et primes annuelles : le net mensuel affiché est celui d'un mois
 * habituel ; le net annuel inclut toutes les primes (cotisations calculées sur la moyenne mensuelle,
 * comme la régularisation annuelle du plafond).
 */
import type { StatutSalarie } from "../constants/taux-cotisations.js";
import { PMSS_2026 } from "../constants/plafonds.js";
import { cotisationsSalariales, type CotisationLigne } from "./cotisations-salariales.js";
import { cotisationsTNS } from "./cotisations-tns.js";
import { estimerTauxPrelevementSource, roundTauxToSliderStep } from "./impot-revenu.js";

export interface SalaireInput {
  brutMensuel: number;
  statut: StatutSalarie;
  tempsTravailPercent?: number; // 100 = full time
  moisPrime?: number; // 12, 13, 14, 15, 16
  tauxPrelevementSource?: number; // 0-100
  /** Primes / bonus annuel. */
  primesAnnuelle?: number;
  /** Heures supplémentaires moyennes par mois (majoration 25 %). */
  heuresSupMensuelles?: number;
  /** Part salariale de la mutuelle (€ / mois). */
  mutuelleMensuelle?: number;
}

/** Majoration des heures sup (25 % = taux 1,25). */
const MAJORATION_HS_25 = 1.25;

/** Heures travaillées par mois à temps plein (35 h × 52 / 12). */
export const HEURES_MENSUELLES = 35 * (52 / 12);

export interface SalaireResult {
  /** Brut d'un mois habituel (temps partiel et heures sup compris). */
  brutMensuel: number;
  /** Brut annuel (mois de primes et primes comprises). */
  brutAnnuel: number;
  brutHoraire: number;
  /** Net d'un mois habituel, avant impôt. */
  netMensuel: number;
  /** Net annuel avant impôt, primes comprises. */
  netAnnuel: number;
  /** Net annuel ÷ 12 (lisse les primes). */
  netMensuelMoyen: number;
  netHoraire: number;
  /** Base de l'impôt sur le revenu (net + CSG non déductible + CRDS − heures sup exonérées). */
  netImposableMensuel: number;
  netImposableAnnuel: number;
  /** Montant net social (à déclarer à la CAF / MSA). */
  netSocialMensuel: number;
  netSocialAnnuel: number;
  /** Impôt prélevé à la source sur un mois habituel. */
  impotMensuel: number;
  netMensuelApresImpots: number;
  netAnnuelApresImpots: number;
  cotisationsMensuelles: number;
  /** Taux de cotisations effectif (cotisations / brut). */
  tauxCotisationsEffectif: number;
  /** Détail des cotisations d'un mois habituel. */
  lignes: CotisationLigne[];
  /** Réduction de cotisations sur heures sup (mois habituel). */
  reductionHeuresSup: number;
  /** Taux de prélèvement à la source estimé (barème, 1 part) pour ce salaire, en %. */
  tauxPASEstime: number;
}

interface MoisCalcule {
  total: number;
  netAPayer: number;
  netImposable: number;
  netSocial: number;
  lignes: CotisationLigne[];
  reductionHeuresSup: number;
}

function calculMois(
  brut: number,
  statut: StatutSalarie,
  pmss: number,
  heuresSupBrut: number,
  mutuelle: number,
  primesFp: number
): MoisCalcule {
  if (statut === "profession-liberale") {
    const tns = cotisationsTNS(brut * 12, "liberal");
    const total = tns.total / 12;
    const nonDeductible = (tns.total - tns.deductible) / 12;
    const lignes: CotisationLigne[] = tns.lignes.map((l) => ({
      id: l.id,
      label: l.label,
      base: Math.round((tns.assiette / 12) * 100) / 100,
      taux: tns.assiette > 0 ? l.montant / tns.assiette : 0,
      montant: Math.round((l.montant / 12) * 100) / 100,
      deductible: l.id !== "csg-crds",
    }));
    const net = brut - total;
    return { total, netAPayer: net, netImposable: net + nonDeductible, netSocial: net, lignes, reductionHeuresSup: 0 };
  }
  const r = cotisationsSalariales({
    brut,
    statut,
    pmss,
    heuresSupBrut,
    mutuelleSalariale: mutuelle,
    primesFonctionPublique: primesFp,
  });
  return {
    total: r.total,
    netAPayer: r.netAPayer,
    netImposable: r.netImposable,
    netSocial: r.netSocial,
    lignes: r.lignes,
    reductionHeuresSup: r.reductionHeuresSup,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fonction publique : part du traitement versée selon la quotité de temps partiel.
 * 80 % et 90 % sont payés 6/7 et 32/35 du traitement (ex-art. 40 loi n° 84-16) ; sinon proportionnel.
 */
export function remunerationTempsPartielFP(quotite: number): number {
  if (Math.abs(quotite - 0.8) < 1e-9) return 6 / 7;
  if (Math.abs(quotite - 0.9) < 1e-9) return 32 / 35;
  return quotite;
}

export function brutToNet(input: SalaireInput): SalaireResult {
  const temps = Math.min(1, Math.max(0.01, (input.tempsTravailPercent ?? 100) / 100));
  const fp = input.statut === "fonction-publique";
  const base = Math.max(0, input.brutMensuel) * (fp ? remunerationTempsPartielFP(temps) : temps);
  const moisPrime = input.moisPrime ?? 12;
  const primesAnnuelle = Math.max(0, input.primesAnnuelle ?? 0);
  const heuresSup = Math.max(0, input.heuresSupMensuelles ?? 0);
  const mutuelle = Math.max(0, input.mutuelleMensuelle ?? 0);
  const pmss = PMSS_2026 * temps;
  const heures = HEURES_MENSUELLES * temps;
  const brutHoraire = heures > 0 ? base / heures : 0;
  const hsBrut = heuresSup * brutHoraire * MAJORATION_HS_25;

  // Mois habituel
  const brutMensuel = base + hsBrut;
  const mois = calculMois(brutMensuel, input.statut, pmss, hsBrut, mutuelle, 0);

  // Année : salaire × mois de primes + primes, cotisations sur la moyenne mensuelle
  const brutAnnuel = base * moisPrime + primesAnnuelle + hsBrut * 12;
  const moyen = brutAnnuel / 12;
  // Fonction publique : les primes (hors traitement) relèvent de la RAFP.
  const primesFpMoyennes = fp ? primesAnnuelle / 12 + (base * (moisPrime - 12)) / 12 : 0;
  const annee = calculMois(moyen, input.statut, pmss, hsBrut, mutuelle, primesFpMoyennes);
  const netAnnuel = annee.netAPayer * 12;
  const netImposableAnnuel = annee.netImposable * 12;

  const tauxPASEstime = estimerTauxPrelevementSource(netImposableAnnuel, 1, {
    appliquerAbattement10: input.statut !== "profession-liberale",
  });
  const tauxIR = Math.min(100, Math.max(0, input.tauxPrelevementSource ?? 0)) / 100;
  const impotMensuel = mois.netImposable * tauxIR;
  const impotAnnuel = netImposableAnnuel * tauxIR;

  return {
    brutMensuel: r2(brutMensuel),
    brutAnnuel: r2(brutAnnuel),
    brutHoraire: r2(brutHoraire),
    netMensuel: r2(mois.netAPayer),
    netAnnuel: r2(netAnnuel),
    netMensuelMoyen: r2(netAnnuel / 12),
    netHoraire: r2(brutMensuel > 0 ? brutHoraire * (mois.netAPayer / brutMensuel) : 0),
    netImposableMensuel: r2(mois.netImposable),
    netImposableAnnuel: r2(netImposableAnnuel),
    netSocialMensuel: r2(mois.netSocial),
    netSocialAnnuel: r2(annee.netSocial * 12),
    impotMensuel: r2(impotMensuel),
    netMensuelApresImpots: r2(mois.netAPayer - impotMensuel),
    netAnnuelApresImpots: r2(netAnnuel - impotAnnuel),
    cotisationsMensuelles: r2(mois.total),
    tauxCotisationsEffectif: brutMensuel > 0 ? mois.total / brutMensuel : 0,
    lignes: mois.lignes,
    reductionHeuresSup: r2(mois.reductionHeuresSup),
    tauxPASEstime,
  };
}

/**
 * brutToNet avec le taux de prélèvement à la source estimé (arrondi au pas du curseur, 0,5 %),
 * comme le calculateur quand l'utilisateur ne saisit pas de taux. Sert aux chiffres des pages preset.
 */
export function brutToNetTauxEstime(
  input: Omit<SalaireInput, "tauxPrelevementSource">
): SalaireResult & { tauxPrelevementSource: number } {
  const tauxPrelevementSource = roundTauxToSliderStep(brutToNet(input).tauxPASEstime, 0.5);
  return { ...brutToNet({ ...input, tauxPrelevementSource }), tauxPrelevementSource };
}

export interface SalaireNetInput {
  netMensuel: number;
  statut: StatutSalarie;
  tempsTravailPercent?: number;
  moisPrime?: number;
  tauxPrelevementSource?: number;
  mutuelleMensuelle?: number;
}

/**
 * Brut correspondant à un net mensuel (inverse de brutToNet, par dichotomie).
 * Le net saisi est celui effectivement perçu (après temps partiel).
 */
export function netToBrut(input: SalaireNetInput): SalaireResult {
  const target = Math.max(0, input.netMensuel);
  const temps = Math.min(1, Math.max(0.01, (input.tempsTravailPercent ?? 100) / 100));
  const run = (brutMensuel: number) =>
    brutToNet({
      brutMensuel,
      statut: input.statut,
      tempsTravailPercent: input.tempsTravailPercent,
      moisPrime: input.moisPrime,
      tauxPrelevementSource: input.tauxPrelevementSource,
      mutuelleMensuelle: input.mutuelleMensuelle,
    });
  let lo = 0;
  let hi = (target * 3) / temps + 100;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (run(mid).netMensuel < target) lo = mid;
    else hi = mid;
  }
  return run(Math.round(hi * 100) / 100);
}
