/**
 * Compare un salaire net mensuel aux références (SMIC, médiane, déciles D1/D9).
 * Donne une idée "votre salaire est-il dans la moyenne" sans prétendre à une analyse métier/région.
 * Source : Insee Première n° 2079, octobre 2025 (données 2024, secteur privé, EQTP).
 */

import {
  SMIC_NET_MENSUEL,
  SALAIRE_MEDIAN_NET_MENSUEL,
  SALAIRE_MOYEN_NET_MENSUEL,
  D9_NET_MENSUEL,
  BENCHMARKS_YEAR,
} from "../constants/salaire-benchmarks.js";

export type SalaireComparisonLevel =
  | "below_smic"
  | "around_smic"
  | "below_median"
  | "around_median"
  | "above_median"
  | "top_10_pct";

export interface SalaireComparisonResult {
  level: SalaireComparisonLevel;
  /** Court libellé pour l'UI */
  label: string;
  /** Phrase d'explication */
  message: string;
  /** Info complémentaire (ex. déciles, médian/moyen) */
  extraInfo?: string;
  /** Année des données de référence */
  sourceYear: string;
}

const BAND_SMIC_LOW = 0.95;
const BAND_SMIC_HIGH = 1.15;
const BAND_MEDIAN_LOW = 0.9;
const BAND_MEDIAN_HIGH = 1.15;
const BAND_D9_LOW = 0.97;

/**
 * Compare le salaire net mensuel aux références SMIC, médiane et D9 (temps plein, secteur privé).
 * Pour un temps partiel, le net mensuel est plus bas ; la comparaison reste indicative.
 */
export function compareSalaireToBenchmarks(
  netMensuel: number
): SalaireComparisonResult {
  const sourceYear = BENCHMARKS_YEAR;
  const medianFormatted = SALAIRE_MEDIAN_NET_MENSUEL.toLocaleString("fr-FR");
  const meanFormatted = SALAIRE_MOYEN_NET_MENSUEL.toLocaleString("fr-FR");

  if (netMensuel < SMIC_NET_MENSUEL * BAND_SMIC_LOW) {
    return {
      level: "below_smic",
      label: "Sous le SMIC",
      message: "Votre net est sous le SMIC. Vérifiez temps partiel, convention, primes.",
      extraInfo: `En France, le salaire médian (secteur privé, temps plein) est d'environ ${medianFormatted} € net / mois.`,
      sourceYear,
    };
  }

  if (netMensuel <= SMIC_NET_MENSUEL * BAND_SMIC_HIGH) {
    return {
      level: "around_smic",
      label: "Proche du SMIC",
      message: "Votre net est proche du SMIC (minimum légal).",
      extraInfo: `Salaire médian : ${medianFormatted} € net / mois. Salaire moyen : ${meanFormatted} € (plus élevé car tiré vers le haut par les hauts revenus).`,
      sourceYear,
    };
  }

  if (netMensuel < SALAIRE_MEDIAN_NET_MENSUEL * BAND_MEDIAN_LOW) {
    return {
      level: "below_median",
      label: "Sous le salaire médian",
      message: "Votre net est sous le salaire médian.",
      extraInfo: `La médiane (${medianFormatted} € net / mois) signifie que 50 % des salariés gagnent moins, 50 % gagnent plus. Le salaire moyen est de ${meanFormatted} €.`,
      sourceYear,
    };
  }

  if (netMensuel <= SALAIRE_MEDIAN_NET_MENSUEL * BAND_MEDIAN_HIGH) {
    return {
      level: "around_median",
      label: "Proche du salaire médian",
      message: "Votre net est dans la fourchette du médian.",
      extraInfo: `Médian : ${medianFormatted} € net / mois ; moyen : ${meanFormatted} €. Les 10 % les mieux payés gagnent au moins ${D9_NET_MENSUEL.toLocaleString("fr-FR")} € net / mois.`,
      sourceYear,
    };
  }

  if (netMensuel >= D9_NET_MENSUEL * BAND_D9_LOW) {
    return {
      level: "top_10_pct",
      label: "Dans les 10 % des salariés les mieux payés",
      message: "Votre net vous place dans les 10 % les mieux payés.",
      extraInfo: `Salaire médian : ${medianFormatted} € ; moyen : ${meanFormatted} €. Seuil D9 (top 10 %) : ${D9_NET_MENSUEL.toLocaleString("fr-FR")} € net / mois.`,
      sourceYear,
    };
  }

  return {
    level: "above_median",
    label: "Au-dessus du salaire médian",
    message: "Votre net est au-dessus du médian (50 % les mieux payés).",
    extraInfo: `Médian : ${medianFormatted} € net / mois ; moyen : ${meanFormatted} €. Les 10 % les mieux payés gagnent au moins ${D9_NET_MENSUEL.toLocaleString("fr-FR")} €.`,
    sourceYear,
  };
}
