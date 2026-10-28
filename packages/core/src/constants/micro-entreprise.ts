/**
 * Micro-entreprise (auto-entrepreneur) – paramètres 2026.
 * Taux de cotisations : décret n° 2025-943 du 8 septembre 2025. ACRE : LFSS 2026 et décret n° 2026-69.
 * Plafonds de CA 2026-2028 et franchise en base de TVA (art. 293 B CGI, loi de finances 2026).
 * @see https://www.autoentrepreneur.urssaf.fr/
 * @see https://entreprendre.service-public.gouv.fr/vosdroits/F21746
 */
export type ActiviteMicro = "vente" | "services_bic" | "services_bnc" | "liberale_cipav";

/** Taux de cotisations sociales (hors ACRE) sur le CA encaissé. */
export const TAUX_MICRO_2026: Record<ActiviteMicro, number> = {
  vente: 0.123,
  services_bic: 0.212,
  services_bnc: 0.256,
  liberale_cipav: 0.232,
};

/** Contribution à la formation professionnelle : commerçants 0,1 %, artisans 0,3 %, libéraux 0,2 %. */
export const CFP_MICRO = { commercant: 0.001, artisan: 0.003, liberal: 0.002 } as const;

/** Versement libératoire de l'impôt sur le revenu (sur le CA). */
export const TAUX_VERSEMENT_LIBERATOIRE: Record<ActiviteMicro, number> = {
  vente: 0.01,
  services_bic: 0.017,
  services_bnc: 0.022,
  liberale_cipav: 0.022,
};
/** Condition d'accès au versement libératoire en 2026 : RFR 2024 ≤ 29 315 € par part. */
export const VLF_PLAFOND_RFR_PAR_PART = 29_315;

/** Abattements forfaitaires pour l'impôt (minimum 305 €). */
export const ABATTEMENT_MICRO: Record<ActiviteMicro, number> = {
  vente: 0.71,
  services_bic: 0.5,
  services_bnc: 0.34,
  liberale_cipav: 0.34,
};
export const ABATTEMENT_MICRO_MIN = 305;

/** Plafonds de chiffre d'affaires 2026-2028. */
export const PLAFONDS_CA_MICRO: Record<ActiviteMicro, number> = {
  vente: 203_100,
  services_bic: 83_600,
  services_bnc: 83_600,
  liberale_cipav: 83_600,
};

/** Franchise en base de TVA 2026 : seuil et seuil majoré (perte immédiate de la franchise au-delà). */
export const FRANCHISE_TVA_2026 = {
  vente: { seuil: 85_000, majore: 93_500 },
  services: { seuil: 37_500, majore: 41_250 },
  /** Avocats, auteurs et artistes-interprètes (activités spécifiques). */
  specifique: { seuil: 50_000, majore: 55_000 },
} as const;

/** ACRE : exonération de 50 % (création avant le 1er juillet 2026) ou 25 % (à partir du 1er juillet 2026). */
export const ACRE_TAUX = { avantJuillet2026: 0.5, depuisJuillet2026: 0.25 } as const;

/** CA annuel permettant de valider 4 trimestres de retraite en 2026 (circulaire CNAV 2025-33). */
export const CA_4_TRIMESTRES_2026: Record<ActiviteMicro, number> = {
  vente: 24_115,
  services_bic: 13_992,
  services_bnc: 10_850,
  liberale_cipav: 11_168,
};
