/**
 * Cotisations des travailleurs indépendants (TNS) au réel – 2026.
 *
 * Réforme de l'assiette (revenus 2025, régularisation 2026) : assiette unique = revenu professionnel
 * avant cotisations − abattement de 26 % (plancher 1,76 % du PASS, plafond 130 % du PASS).
 * Taux artisans, commerçants et professions libérales non réglementées (SSI) : décret n° 2024-688.
 * Professions libérales réglementées (CNAVPL / Cipav) : retraite de base et complémentaire propres.
 *
 * @see https://www.urssaf.fr/accueil/independant/comprendre-payer-cotisations/reforme-cotisations-independants.html
 * @see https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-ac-plnr.html
 */
export const TNS_YEAR = "2026" as const;

export const ABATTEMENT_ASSIETTE_TNS = {
  taux: 0.26,
  /** En fraction du PASS. */
  plancher: 0.0176,
  plafond: 1.3,
} as const;

/** Maladie-maternité : taux progressif (en fraction du PASS → taux), appliqué à tout le revenu sous 3 PASS. */
export const MALADIE_TNS_PALIERS: { seuil: number; taux: number }[] = [
  { seuil: 0.2, taux: 0 },
  { seuil: 0.4, taux: 0.015 },
  { seuil: 0.6, taux: 0.04 },
  { seuil: 1.1, taux: 0.065 },
  { seuil: 2, taux: 0.077 },
  { seuil: 3, taux: 0.085 },
];
/** Au-delà de 3 PASS : 8,5 % jusqu'à 3 PASS puis 6,5 % sur le surplus. */
export const MALADIE_TNS_AU_DELA_3_PASS = 0.065;

export const TNS_SSI = {
  /** Indemnités journalières : 0,5 % jusqu'à 5 PASS, assiette minimale 40 % du PASS. */
  ij: { taux: 0.005, plafondPass: 5, minPass: 0.4 },
  /** Retraite de base : 17,87 % jusqu'à 1 PASS + 0,72 % sur la totalité ; assiette minimale 450 × SMIC horaire. */
  retraiteBaseT1: 0.1787,
  retraiteBaseTotal: 0.0072,
  retraiteBaseAssietteMinHeuresSmic: 450,
  /** Retraite complémentaire (RCI) : 8,1 % jusqu'à 1 PASS, 9,1 % de 1 à 4 PASS. */
  rciT1: 0.081,
  rciT2: 0.091,
  rciPlafondPass: 4,
  /** Invalidité-décès : 1,3 % jusqu'à 1 PASS, assiette minimale 11,5 % du PASS. */
  invaliditeDeces: 0.013,
  invaliditeDecesMinPass: 0.115,
} as const;

export const TNS_CIPAV = {
  /** Retraite de base CNAVPL : 8,73 % jusqu'à 1 PASS + 1,87 % de 1 à 5 PASS. */
  retraiteBaseT1: 0.0873,
  retraiteBaseT2: 0.0187,
  retraiteBasePlafondPass: 5,
  /** Retraite complémentaire Cipav : 9 % jusqu'à 1 PASS, 22 % de 1 à 4 PASS. */
  complementaireT1: 0.09,
  complementaireT2: 0.22,
  complementairePlafondPass: 4,
  /** Invalidité-décès : 0,5 % jusqu'à 1,85 PASS. */
  invaliditeDeces: 0.005,
  invaliditeDecesPlafondPass: 1.85,
  /** Indemnités journalières professions libérales : 0,3 % jusqu'à 3 PASS (minimum 40 % du PASS). */
  ij: { taux: 0.003, plafondPass: 3, minPass: 0.4 },
} as const;

/** Allocations familiales : 0 % jusqu'à 110 % du PASS, puis progressif jusqu'à 3,1 % à 140 % du PASS. */
export const ALLOCATIONS_FAMILIALES_TNS = { seuilBas: 1.1, seuilHaut: 1.4, taux: 0.031 } as const;

/** CSG (9,2 %) + CRDS (0,5 %) sur l'assiette unique ; part déductible : 6,8 %. */
export const CSG_CRDS_TNS = 0.097;
export const CSG_DEDUCTIBLE_TNS = 0.068;

/** Contribution à la formation professionnelle (en fraction du PASS). */
export const CFP_TNS = { commercantLiberal: 0.0025, artisan: 0.0029 } as const;
