/**
 * Paramètres des aides de la CAF (France métropolitaine).
 *
 * APL / allocations de logement en location (arrêté du 27 septembre 2019) – valeurs au 1er octobre 2026
 * (arrêté du 28 septembre 2026, +1,15 %). R0 2026 = valeurs 2025 (décret 2025-1401).
 * Prime d'activité – valeurs au 1er avril 2026 (décret n° 2026-222 du 30 mars 2026).
 * RSA – montant forfaitaire au 1er avril 2026 (décret n° 2026-220).
 * @see https://www.legifrance.gouv.fr/loda/id/JORFTEXT000039160329
 */
export const APL_DATE_BAREME = "1er octobre 2026";

export type ZoneAPL = "1" | "2" | "3";

/** Loyers plafonds : [personne seule, couple sans personne à charge, 1 personne à charge, + par personne à charge supplémentaire]. */
export const APL_LOYERS_PLAFONDS: Record<ZoneAPL, [number, number, number, number]> = {
  "1": [336.97, 406.4, 459.32, 66.65],
  "2": [293.68, 359.47, 404.49, 58.88],
  "3": [275.25, 333.67, 374.13, 53.62],
};
export const APL_COEF_COLOCATION = 0.75;

export const APL_FORFAIT_CHARGES = {
  general: 61.29,
  colocationIsole: 30.64,
  colocationCouple: 61.29,
  parPersonneACharge: 13.9,
} as const;

/** Participation minimale P0 = max(8,5 % × (L + C), forfait). */
export const APL_P0 = { taux: 0.085, forfait: 40.01 } as const;

/** Taux famille TF selon la composition : isolé, couple, puis 1 à 6 personnes à charge ; −0,06 point par personne au-delà. */
export const APL_TF = { isole: 0.0283, couple: 0.0315, pac: [0.027, 0.0238, 0.0201, 0.0185, 0.0179, 0.0173], parPacSupp: -0.0006 } as const;

/** Taux de loyer TL selon RL = L / loyer de référence (loyer plafond zone 2). */
export const APL_TL = { seuil1: 0.45, seuil2: 0.75, taux1: 0.0045, taux2: 0.0068 } as const;

/** Abattement forfaitaire R0 (annuel) : isolé, couple, puis 1 à 6 personnes à charge ; +346 € par personne au-delà. */
export const APL_R0 = { isole: 5235, couple: 7501, pac: [8947, 9148, 9498, 9851, 10202, 10554], parPacSupp: 346 } as const;

export const APL_MINORATION = 5;
export const APL_CRDS = 0.005;
/** Seuil de non-versement des ALF / ALS (pas de seuil pour l'APL). */
export const AL_SEUIL_VERSEMENT = 10;

/** Dégressivité pour loyers élevés : début et fin (multiples du loyer plafond). */
export const APL_DEGRESSIVITE: Record<ZoneAPL, [number, number]> = {
  "1": [3.4, 4],
  "2": [2.5, 3.1],
  "3": [2.5, 3.1],
};

/** Étudiants : ressources forfaitaires minimales (location), minorées pour les boursiers. */
export const APL_ETUDIANT = { forfaitRessources: 8600, minorationBoursier: 1700 } as const;

// --- Prime d'activité (1er avril 2026) ---
export const PRIME_ACTIVITE_DATE_BAREME = "1er avril 2026";
export const PRIME_ACTIVITE = {
  montantForfaitaire: 638.28,
  /** Part des revenus professionnels prise en compte. */
  tauxRevenusPro: 0.5985,
  /** Majorations : 2e personne +50 %, 3e +30 %, à partir du 3e enfant +40 % par enfant. */
  majoration2e: 0.5,
  majoration3e: 0.3,
  majorationEnfantSupp: 0.4,
  /** Parent isolé : 128,412 % + 42,804 % par enfant. */
  parentIsoleBase: 1.28412,
  parentIsoleParEnfant: 0.42804,
  /** Forfait logement : 12 % / 16 % / 16,5 % du montant forfaitaire (1 / 2 / 3 personnes et plus). */
  forfaitLogement: [76.59, 153.19, 189.57],
  /** Bonification individuelle : de 0 (≤ 59 × SMIC horaire) à 37,7 % du MF (≥ 138 × SMIC horaire). */
  bonification: { seuilHeuresSmic: 59, pleinHeuresSmic: 138, tauxMax: 0.377 },
  versementMinimum: 15,
} as const;

export const RSA_MONTANT_FORFAITAIRE = 651.69;
