/**
 * Références pour comparer un salaire au marché (SMIC, médiane, déciles).
 * Utilisé par le calculateur salaire brut net pour "Votre salaire en comparaison".
 * Source : Insee Première n° 2079, octobre 2025 (données 2024, secteur privé, EQTP).
 * @see https://www.insee.fr/en/statistiques/8661101
 * @see https://www.insee.fr/fr/statistiques/serie/010752342
 */

/**
 * SMIC net mensuel (35 h) depuis le 1er juin 2026 : 1 867,02 € brut − 20,84 % de cotisations
 * (valeur publiée par l'Urssaf, hors mutuelle).
 */
export const SMIC_NET_MENSUEL = 1_477.93;

/**
 * Salaire net médian en équivalent temps plein, secteur privé (France).
 * Insee Première n° 2079, oct. 2025, données 2024.
 */
export const SALAIRE_MEDIAN_NET_MENSUEL = 2190;

/**
 * Salaire net moyen en EQTP, secteur privé (France).
 * Plus élevé que la médiane car tiré vers le haut par les hauts revenus.
 */
export const SALAIRE_MOYEN_NET_MENSUEL = 2733;

/** D1 : 10 % des salariés gagnent moins que ce montant (net mensuel EQTP). */
export const D1_NET_MENSUEL = 1492;

/** D9 : 10 % des salariés gagnent plus que ce montant (net mensuel EQTP). */
export const D9_NET_MENSUEL = 4334;

/** Année des données (secteur privé, EQTP). */
export const BENCHMARKS_YEAR = "2024" as const;

/** Libellé source pour l’UI. */
export const BENCHMARKS_SOURCE_LABEL =
  "Insee Première n° 2079, oct. 2025 (données 2024, secteur privé)";

/** URL de la publication INSEE (comparaison salariale). */
export const BENCHMARKS_SOURCE_URL =
  "https://www.insee.fr/en/statistiques/8661101";
