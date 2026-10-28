/**
 * Auto-entrepreneur / micro-entrepreneur : CA → net, impôt, plafonds, TVA et retraite (2026).
 */
import {
  ABATTEMENT_MICRO,
  ABATTEMENT_MICRO_MIN,
  ACRE_TAUX,
  CA_4_TRIMESTRES_2026,
  CFP_MICRO,
  FRANCHISE_TVA_2026,
  PLAFONDS_CA_MICRO,
  TAUX_MICRO_2026,
  TAUX_VERSEMENT_LIBERATOIRE,
  type ActiviteMicro,
} from "../constants/micro-entreprise.js";
import { calculImpotRevenu } from "./impot-revenu.js";

export type AutoEntrepreneurActivite = ActiviteMicro;

export type AcreOption = "non" | "50" | "25";

export interface AutoEntrepreneurInput {
  caMensuel?: number;
  caAnnuel?: number;
  activite: AutoEntrepreneurActivite;
  /** true = ACRE au taux actuel (25 %) ; préférer `acre` pour préciser le taux. */
  beneficiaireAcre?: boolean;
  acre?: AcreOption;
  /** Artisan inscrit à la chambre des métiers (CFP 0,3 % au lieu de 0,1 %). */
  artisan?: boolean;
  versementLiberatoire?: boolean;
  /** Taux de prélèvement à la source en % (0–45), appliqué au bénéfice imposable. */
  tauxPrelevementSource?: number;
}

export interface AutoEntrepreneurResult {
  netMensuel: number;
  netAnnuel: number;
  /** Cotisations sociales + CFP (mensuel). */
  cotisations: number;
  /** Taux global de cotisations appliqué au CA (CFP comprise). */
  tauxCotisations: number;
  /** dont contribution à la formation professionnelle (mensuel). */
  cfp: number;
  impotMensuel: number;
  impotAnnuel: number;
  /** Taux d'imposition rapporté au CA (%), pour affichage. */
  tauxIR: number;
  /** Taux de prélèvement estimé sur le bénéfice imposable (%), pour le curseur. */
  tauxPASEstime: number;
  revenuImposableAnnuel: number;
  netMensuelApresImpots: number;
  netAnnuelApresImpots: number;
  plafondAnnuel: number;
  sousPlafond: boolean;
  /** Franchise en base de TVA. */
  tva: { seuil: number; seuilMajore: number; statut: "franchise" | "seuil-depasse" | "assujetti" };
  /** Trimestres de retraite validés (0 à 4). */
  trimestresRetraite: number;
  caPour4Trimestres: number;
  message: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function autoEntrepreneur(input: AutoEntrepreneurInput): AutoEntrepreneurResult {
  const { activite, versementLiberatoire = false, tauxPrelevementSource } = input;
  const caMensuel = input.caAnnuel != null ? input.caAnnuel / 12 : Math.max(0, input.caMensuel ?? 0);
  const caAnnuel = caMensuel * 12;
  const plafondAnnuel = PLAFONDS_CA_MICRO[activite];
  const sousPlafond = caAnnuel <= plafondAnnuel;

  const acre: AcreOption = input.acre ?? (input.beneficiaireAcre ? "25" : "non");
  const exoneration = acre === "50" ? ACRE_TAUX.avantJuillet2026 : acre === "25" ? ACRE_TAUX.depuisJuillet2026 : 0;
  const tauxSocial = TAUX_MICRO_2026[activite] * (1 - exoneration);
  const tauxCfp =
    activite === "services_bnc" || activite === "liberale_cipav"
      ? CFP_MICRO.liberal
      : input.artisan
        ? CFP_MICRO.artisan
        : CFP_MICRO.commercant;
  const cfp = caMensuel * tauxCfp;
  const cotisations = caMensuel * tauxSocial + cfp;
  const netMensuel = caMensuel - cotisations;

  // Bénéfice imposable = CA − abattement forfaitaire (71 % / 50 % / 34 %, minimum 305 €)
  const abattement = Math.min(caAnnuel, Math.max(ABATTEMENT_MICRO_MIN, caAnnuel * ABATTEMENT_MICRO[activite]));
  const revenuImposableAnnuel = Math.max(0, caAnnuel - abattement);
  const impotBareme = calculImpotRevenu({ revenuImposable: revenuImposableAnnuel }).impotNet;
  const tauxPASEstime = revenuImposableAnnuel > 0 ? Math.round((impotBareme / revenuImposableAnnuel) * 10000) / 100 : 0;

  let impotAnnuel: number;
  if (versementLiberatoire) {
    impotAnnuel = caAnnuel * TAUX_VERSEMENT_LIBERATOIRE[activite];
  } else if (tauxPrelevementSource != null && tauxPrelevementSource >= 0 && tauxPrelevementSource <= 45) {
    impotAnnuel = (revenuImposableAnnuel * tauxPrelevementSource) / 100;
  } else {
    impotAnnuel = impotBareme;
  }
  const impotMensuel = impotAnnuel / 12;

  const tvaSeuils =
    activite === "vente" ? FRANCHISE_TVA_2026.vente : FRANCHISE_TVA_2026.services;
  const tvaStatut = caAnnuel <= tvaSeuils.seuil ? "franchise" : caAnnuel <= tvaSeuils.majore ? "seuil-depasse" : "assujetti";

  const caPour4Trimestres = CA_4_TRIMESTRES_2026[activite];
  // La validation dépend des cotisations retraite versées : réduite en proportion par l'ACRE.
  const caEffectif = caAnnuel * (1 - exoneration);
  const trimestresRetraite = Math.max(0, Math.min(4, Math.floor((caEffectif / caPour4Trimestres) * 4 + 1e-9)));

  const messages: string[] = [];
  messages.push(
    sousPlafond
      ? "Sous le plafond de chiffre d'affaires de la micro-entreprise."
      : "Au-dessus du plafond : si le dépassement se répète deux années de suite, vous basculez au régime réel."
  );
  if (tvaStatut === "seuil-depasse") messages.push("Seuil de franchise de TVA dépassé : vous facturerez la TVA à partir du 1er janvier suivant.");
  if (tvaStatut === "assujetti") messages.push("Seuil majoré de TVA dépassé : la TVA est due dès le jour du dépassement.");

  return {
    netMensuel: r2(netMensuel),
    netAnnuel: r2(netMensuel * 12),
    cotisations: r2(cotisations),
    tauxCotisations: tauxSocial + tauxCfp,
    cfp: r2(cfp),
    impotMensuel: r2(impotMensuel),
    impotAnnuel: r2(impotAnnuel),
    tauxIR: caAnnuel > 0 ? r2((impotAnnuel / caAnnuel) * 100) : 0,
    tauxPASEstime,
    revenuImposableAnnuel: r2(revenuImposableAnnuel),
    netMensuelApresImpots: r2(netMensuel - impotMensuel),
    netAnnuelApresImpots: r2((netMensuel - impotMensuel) * 12),
    plafondAnnuel,
    sousPlafond,
    tva: { seuil: tvaSeuils.seuil, seuilMajore: tvaSeuils.majore, statut: tvaStatut },
    trimestresRetraite,
    caPour4Trimestres,
    message: messages.join(" "),
  };
}
