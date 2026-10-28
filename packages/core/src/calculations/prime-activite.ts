/**
 * Prime d'activité (CAF/MSA) – estimation mensuelle, barème au 1er avril 2026.
 *
 * PA = MF + 59,85 % × revenus professionnels + bonifications − max(ressources + forfait logement, MF)
 * - MF : montant forfaitaire majoré selon la composition du foyer ;
 * - bonification individuelle par travailleur : de 0 (revenus ≤ 59 × SMIC horaire) à 240,63 €
 *   (revenus ≥ 138 × SMIC horaire) ;
 * - forfait logement si le foyer perçoit une aide au logement, est propriétaire ou hébergé gratuitement ;
 * - non versée en dessous de 15 € ; CRDS de 0,5 %.
 */
import { PRIME_ACTIVITE as PA } from "../constants/aides-caf.js";
import { SMIC_HORAIRE_BRUT } from "../constants/plafonds.js";

export type LogementPA = "locataire-aide" | "locataire-sans-aide" | "proprietaire" | "heberge";

export interface PrimeActiviteInput {
  /** Revenus professionnels nets mensuels (personne 1). En compatibilité : revenus du foyer. */
  revenusMensuels: number;
  /** Revenus professionnels nets mensuels du conjoint. */
  revenusConjoint?: number;
  /** Compatibilité : nombre de personnes du foyer. */
  nbPersonnes?: number;
  nbEnfants?: number;
  couple?: boolean;
  /** Autres ressources mensuelles (chômage, pensions, allocations familiales…). */
  autresRessources?: number;
  logement?: LogementPA;
  /** Montant de l'aide au logement perçue (forfait logement = min(aide, forfait)). */
  aideLogement?: number;
}

export interface PrimeActiviteResult {
  eligible: boolean;
  montantMensuelEstime: number;
  montantForfaitaire: number;
  partRevenus: number;
  bonification: number;
  ressourcesRetenues: number;
  forfaitLogement: number;
  message: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Coefficient de majoration du montant forfaitaire selon la composition du foyer. */
export function coefficientFoyer(couple: boolean, enfants: number): number {
  let coef = 1 + (couple ? PA.majoration2e : 0);
  for (let i = 1; i <= enfants; i++) {
    if (i >= 3) coef += PA.majorationEnfantSupp;
    else if (i === 1 && !couple) coef += PA.majoration2e;
    else coef += PA.majoration3e;
  }
  return coef;
}

/** Bonification individuelle pour un travailleur selon ses revenus professionnels mensuels. */
export function bonificationIndividuelle(revenus: number, smicHoraire = SMIC_HORAIRE_BRUT): number {
  const seuil = PA.bonification.seuilHeuresSmic * smicHoraire;
  const plein = PA.bonification.pleinHeuresSmic * smicHoraire;
  const max = PA.bonification.tauxMax * PA.montantForfaitaire;
  if (revenus <= seuil) return 0;
  if (revenus >= plein) return max;
  return (max * (revenus - seuil)) / (plein - seuil);
}

export function primeActivite(input: PrimeActiviteInput): PrimeActiviteResult {
  const enfants = Math.max(0, Math.floor(input.nbEnfants ?? 0));
  const couple = input.couple ?? Math.max(1, input.nbPersonnes ?? 1) - enfants >= 2;
  const r1 = Math.max(0, input.revenusMensuels);
  const r2c = couple ? Math.max(0, input.revenusConjoint ?? 0) : 0;
  const revenusPro = r1 + r2c;
  const autres = Math.max(0, input.autresRessources ?? 0);
  const personnes = (couple ? 2 : 1) + enfants;

  const MF = PA.montantForfaitaire * coefficientFoyer(couple, enfants);
  const forfaitMax = PA.forfaitLogement[Math.min(3, personnes) - 1];
  const logement = input.logement ?? "locataire-sans-aide";
  const forfaitLogement =
    logement === "locataire-sans-aide"
      ? 0
      : logement === "locataire-aide" && input.aideLogement != null
        ? Math.min(Math.max(0, input.aideLogement), forfaitMax)
        : forfaitMax;

  const bonification = bonificationIndividuelle(r1) + (couple ? bonificationIndividuelle(r2c) : 0);
  const partRevenus = PA.tauxRevenusPro * revenusPro;
  const ressources = revenusPro + autres;
  const brut = MF + partRevenus + bonification - Math.max(ressources + forfaitLogement, MF);
  const montant = revenusPro > 0 ? Math.max(0, brut) : 0;
  const eligible = montant >= PA.versementMinimum;

  let message: string;
  if (revenusPro <= 0) message = "La prime d'activité est réservée aux personnes qui ont des revenus d'activité.";
  else if (!eligible && montant > 0) message = `Montant inférieur à ${PA.versementMinimum} € : la prime n'est pas versée.`;
  else if (!eligible) message = "Vos ressources dépassent le plafond pour votre composition familiale.";
  else message = "Estimation selon le barème officiel. La CAF calcule le montant sur la moyenne de vos revenus du trimestre précédent.";

  return {
    eligible,
    montantMensuelEstime: eligible ? r2(montant * 0.995) : 0,
    montantForfaitaire: r2(MF),
    partRevenus: r2(partRevenus),
    bonification: r2(bonification),
    ressourcesRetenues: r2(ressources),
    forfaitLogement: r2(forfaitLogement),
    message,
  };
}
