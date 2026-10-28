/**
 * Cotisations patronales 2026 (secteur privé, régime général).
 * Depuis le 1er janvier 2026, les taux réduits maladie (7 %) et allocations familiales (3,45 %) sont
 * supprimés et intégrés à la réduction générale dégressive unique (RGDU).
 * @see https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html
 * @see https://www.urssaf.fr/accueil/employeur/beneficier-exonerations/reduction-generale-cotisation.html
 */
export const COTISATIONS_PATRONALES_2026 = {
  maladie: 0.13,
  vieillessePlafonnee: 0.0855,
  vieillesseDeplafonnee: 0.0211,
  allocationsFamiliales: 0.0525,
  /** Taux AT/MP moyen national 2026 (variable selon l'entreprise). */
  atmpMoyen: 0.0208,
  csa: 0.003,
  fnalMoins50: 0.001,
  fnal50Plus: 0.005,
  /** Chômage et AGS : jusqu'à 4 PMSS. */
  chomage: 0.04,
  ags: 0.0025,
  agircArrcoT1: 0.0472,
  agircArrcoT2: 0.1295,
  cegT1: 0.0129,
  cegT2: 0.0162,
  cet: 0.0021,
  apec: 0.00036,
  /** Prévoyance cadre minimale (1,50 % de la tranche 1). */
  prevoyanceCadre: 0.015,
  /** Forfait social sur les contributions patronales de prévoyance (entreprises de 11 salariés et plus, CSS L137-15/16). */
  forfaitSocialPrevoyance: 0.08,
  dialogueSocial: 0.00016,
  formationMoins11: 0.0055,
  formation11Plus: 0.01,
  taxeApprentissage: 0.0068,
} as const;

/** RGDU : C = Tmin + Tdelta × [½ × (3 × SMIC annuel / rémunération annuelle − 1)]^P, nulle à partir de 3 SMIC. */
export const RGDU_2026 = {
  tmin: 0.02,
  tdeltaMoins50: 0.3781,
  tdelta50Plus: 0.3821,
  puissance: 1.75,
  /**
   * SMIC annuel retenu pour 2026 (valeur au 1er janvier, gelée pour l'année : 12,02 € × 1 820 h).
   * Gel prévu par le décret n° 2026-509 du 12 juin 2026 (art. D241-7 CSS) : la revalorisation du
   * 1er juin (12,31 €) ne s'applique pas à la RGDU. Le moteur URSSAF « modele-social » 11.1.0 ne
   * l'intègre pas encore (écart d'environ 30 €/mois sur le coût employeur à 2 500 € brut).
   */
  smicAnnuel: 21_876.4,
} as const;
