/**
 * Cotisations sociales 2026.
 *
 * 1. Taux détaillés des cotisations salariales du secteur privé (bulletin de paie), utilisés par le
 *    moteur de calcul brut → net (lib/calculations/cotisations-salariales.ts).
 * 2. Taux moyens par statut, utilisés pour les estimations rapides (net ↔ brut approximatif).
 *
 * Sources : urssaf.fr (taux secteur privé 2026), agirc-arrco.fr (cotisations 2026),
 * service-public.gouv.fr F2971 (CSG/CRDS), retraitesdeletat.gouv.fr (fonction publique).
 */
export const YEAR_COTISATIONS = "2026" as const;
export const SOURCE_COTISATIONS = "URSSAF et Agirc-Arrco (taux 2026)";

export type StatutSalarie =
  | "non-cadre"
  | "cadre"
  | "fonction-publique"
  | "profession-liberale"
  | "portage";

/** Parts salariales 2026 (T1 = jusqu'à 1 PASS, T2 = de 1 à 8 PASS). */
export const COTISATIONS_SALARIALES_2026 = {
  vieillessePlafonnee: 0.069,
  vieillesseDeplafonnee: 0.004,
  agircArrcoT1: 0.0315,
  agircArrcoT2: 0.0864,
  cegT1: 0.0086,
  cegT2: 0.0108,
  /** Contribution d'équilibre technique : dès que la rémunération dépasse 1 PASS (T1 + T2). */
  cet: 0.0014,
  /** APEC (cadres), jusqu'à 4 PASS. */
  apec: 0.00024,
  csgDeductible: 0.068,
  csgNonDeductible: 0.024,
  crds: 0.005,
  /** Assiette CSG/CRDS : 98,25 % du brut jusqu'à 4 PASS (abattement de 1,75 %). */
  assietteCsg: 0.9825,
} as const;

/** Prévoyance cadre minimale à la charge de l'employeur (1,50 % de la tranche 1) : entre dans l'assiette CSG. */
export const PREVOYANCE_CADRE_PATRONALE = 0.015;

/** Fonction publique (titulaire) : pension civile 11,10 % du traitement, RAFP 5 % des primes (plafond 20 % du traitement). */
export const COTISATIONS_FONCTION_PUBLIQUE = {
  pensionCivile: 0.111,
  rafp: 0.05,
  plafondPrimesRafp: 0.2,
} as const;

/**
 * Taux moyens (part salariale) pour les estimations rapides.
 * Secteur privé sous le plafond : 20,84 % hors mutuelle, ≈ 22 % mutuelle comprise.
 */
export const TAUX_COTISATIONS: Record<StatutSalarie, number> = {
  "non-cadre": 0.22,
  cadre: 0.22,
  "fonction-publique": 0.2,
  "profession-liberale": 0.32,
  portage: 0.22,
};

export function getTauxCotisations(statut: StatutSalarie): number {
  return TAUX_COTISATIONS[statut] ?? TAUX_COTISATIONS["non-cadre"];
}
