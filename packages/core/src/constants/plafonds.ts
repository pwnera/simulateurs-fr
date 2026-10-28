/**
 * Plafonds et paramètres annuels (Sécurité sociale, SMIC).
 * Mise à jour à chaque revalorisation (voir docs/BAREMES_2026.md).
 */
export const SOURCE_PLAFONDS = "URSSAF, Sécurité sociale";

/** PASS : plafond annuel de la Sécurité sociale. PMSS : plafond mensuel. */
export const PLAFONDS_2024 = {
  plafondSecuAnnuel: 46_368,
  plafondSecuMensuel: 3_864,
  plafondSecuHoraire: 29,
} as const;

export const PLAFONDS_2025 = {
  plafondSecuAnnuel: 47_100,
  plafondSecuMensuel: 3_925,
  plafondSecuHoraire: 29,
} as const;

/** Arrêté du 22 décembre 2025. */
export const PLAFONDS_2026 = {
  plafondSecuAnnuel: 48_060,
  plafondSecuTrimestriel: 12_015,
  plafondSecuMensuel: 4_005,
  plafondSecuQuinzaine: 2_003,
  plafondSecuHebdomadaire: 924,
  plafondSecuJournalier: 220,
  plafondSecuHoraire: 30,
} as const;

/**
 * Annoncé par le BOSS le 16 octobre 2026 (+1,74 %), arrêté attendu fin décembre 2026.
 * Pas encore utilisé par les calculateurs : seulement affiché sur /baremes-2027.
 */
export const PLAFONDS_2027 = {
  plafondSecuAnnuel: 48_900,
  plafondSecuTrimestriel: 12_225,
  plafondSecuMensuel: 4_075,
  plafondSecuQuinzaine: 2_038,
  plafondSecuHebdomadaire: 940,
  plafondSecuJournalier: 224,
  plafondSecuHoraire: 30,
} as const;

export type YearKey = "2024" | "2025" | "2026";

export const YEARS_AVAILABLE: YearKey[] = ["2026", "2025", "2024"];

export function getPlafonds(year: YearKey = "2026") {
  if (year === "2024") return PLAFONDS_2024;
  if (year === "2025") return PLAFONDS_2025;
  return PLAFONDS_2026;
}

export const PASS_2026 = PLAFONDS_2026.plafondSecuAnnuel;
export const PMSS_2026 = PLAFONDS_2026.plafondSecuMensuel;
export const PASS_2027 = PLAFONDS_2027.plafondSecuAnnuel;
export const PMSS_2027 = PLAFONDS_2027.plafondSecuMensuel;

/** PASS annuel par année (arrêtés annuels ; gelé en 2021 et 2022 ; 2027 annoncé). */
export const PASS_HISTORIQUE: [year: number, pass: number][] = [
  [2019, 40_524],
  [2020, 41_136],
  [2021, 41_136],
  [2022, 41_136],
  [2023, 43_992],
  [2024, PLAFONDS_2024.plafondSecuAnnuel],
  [2025, PLAFONDS_2025.plafondSecuAnnuel],
  [2026, PASS_2026],
  [2027, PASS_2027],
];

/**
 * SMIC (France métropolitaine).
 * 12,02 €/h au 1er janvier 2026 (décret 2025-1228), 12,31 €/h depuis le 1er juin 2026
 * (revalorisation automatique de 2,41 %, arrêté du 22 mai 2026).
 */
export const SMIC_HORAIRE_BRUT_JANVIER_2026 = 12.02;
export const SMIC_HORAIRE_BRUT = 12.31;
/** Mensuel 35 h = horaire × 35 × 52 / 12 (151,67 h). */
export const SMIC_BRUT_MENSUEL = 1_867.02;
/** Date d'effet de la valeur courante du SMIC (affichage). */
export const SMIC_DATE_EFFET = "1er juin 2026";
