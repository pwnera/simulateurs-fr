/**
 * Impôt sur le revenu : barème 2026 applicable aux revenus 2025 (loi de finances pour 2026,
 * loi n° 2026-103 du 19 février 2026, art. 2 ; revalorisation de 0,9 %).
 * @see https://www.service-public.gouv.fr/particuliers/vosdroits/F1419
 * @see https://bofip.impots.gouv.fr/bofip/2494-PGP.html
 */
export const BAREME_IR_YEAR = "2026" as const;
export const REVENUS_IR_YEAR = 2025;

export interface BaremeIR {
  /** Tranches par part (revenu net imposable). */
  tranches: { max: number; taux: number }[];
  /** Décote : montant forfaitaire − 45,25 % de l'impôt brut, si l'impôt brut est inférieur au seuil. */
  decote: { celibataire: { forfait: number; seuil: number }; couple: { forfait: number; seuil: number }; taux: number };
  /** Plafonnement de l'avantage du quotient familial par demi-part supplémentaire. */
  plafondQfDemiPart: number;
}

/** Tranches du barème par part (revenu net imposable). */
export const TRANCHES_IR: { max: number; taux: number }[] = [
  { max: 11_600, taux: 0 },
  { max: 29_579, taux: 0.11 },
  { max: 84_577, taux: 0.3 },
  { max: 181_917, taux: 0.41 },
  { max: Infinity, taux: 0.45 },
];

/** Décote : montant forfaitaire − 45,25 % de l'impôt brut, si l'impôt brut est inférieur au seuil. */
export const DECOTE = {
  celibataire: { forfait: 897, seuil: 1_982 },
  couple: { forfait: 1_483, seuil: 3_277 },
  taux: 0.4525,
} as const;

/** Plafonnement de l'avantage du quotient familial par demi-part supplémentaire. */
export const PLAFOND_QF_DEMI_PART = 1_807;

export const BAREME_IR_2026: BaremeIR = { tranches: TRANCHES_IR, decote: DECOTE, plafondQfDemiPart: PLAFOND_QF_DEMI_PART };

/**
 * Barème 2027 (revenus 2026) proposé par le projet de loi de finances pour 2027 (n° 3210, art. 2, +2,1 %),
 * en débat au Parlement. Seulement affiché sur /baremes-2027 ; seuils de décote = forfait ÷ 45,25 %.
 */
export const BAREME_IR_2027_PLF: BaremeIR = {
  tranches: [
    { max: 11_844, taux: 0 },
    { max: 30_200, taux: 0.11 },
    { max: 86_353, taux: 0.3 },
    { max: 185_737, taux: 0.41 },
    { max: Infinity, taux: 0.45 },
  ],
  decote: {
    celibataire: { forfait: 915, seuil: 2_022 },
    couple: { forfait: 1_513, seuil: 3_343 },
    taux: 0.4525,
  },
  plafondQfDemiPart: 1_845,
};

/** Abattement forfaitaire de 10 % pour frais professionnels (salaires) : minimum et maximum par personne. */
export const ABATTEMENT_10_MIN = 509;
export const ABATTEMENT_10_MAX = 14_555;
