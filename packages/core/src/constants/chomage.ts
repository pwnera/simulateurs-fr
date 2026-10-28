/**
 * Assurance chômage (ARE) – paramètres en vigueur en 2026.
 * Pas de revalorisation au 1er juillet 2026 : les montants du 1er juillet 2025 restent applicables.
 * Convention d'assurance chômage du 15 novembre 2024 (en vigueur au 1er avril 2025) et loi n° 2026-470
 * du 11 juin 2026 (rupture conventionnelle).
 * @see https://www.unedic.org/actualites/allocations-dassurance-chomage-pas-de-revalorisation-au-1er-juillet-2026
 */
import { PASS_2026 } from "./plafonds.js";

export const ARE = {
  /** Partie fixe de la formule 40,4 % SJR + partie fixe (€ / jour). */
  partieFixe: 13.18,
  tauxFormule1: 0.404,
  tauxFormule2: 0.57,
  /** Allocation minimale (€ / jour). */
  allocationMinimale: 32.13,
  /** Plafond : 75 % du SJR. */
  plafondSjr: 0.75,
  /** Salaires retenus dans la limite de 4 PASS. */
  sjrMax: Math.round(((4 * PASS_2026) / 365) * 100) / 100,
  /** Dégressivité : × 0,7 à partir du 183e jour, si moins de 55 ans et AJ > seuil ; plancher = seuil. */
  degressivite: { coefficient: 0.7, seuil: 92.57, apresJours: 182, ageExempte: 55 },
  /** Durée : jours d'affiliation × 0,75, minimum 182 jours. */
  coefficientDuree: 0.75,
  dureeMinJours: 182,
  /** Durée maximale selon l'âge à la fin du contrat (jours). */
  dureeMaxJours: { "moins-55": 548, "55-56": 685, "57-plus": 822 },
  /** Rupture conventionnelle (fin de contrat à partir du 1er septembre 2026) : 15 mois / 20,5 mois. */
  dureeMaxJoursRuptureConventionnelle: { "moins-55": 456, "55-56": 624, "57-plus": 624 },
  /** Affiliation minimale : 6 mois (130 jours ou 910 heures) sur la période de référence. */
  affiliationMinMois: 6,
  /** Période de référence : 24 mois (36 mois à partir de 55 ans). */
  periodeReferenceMois: { "moins-55": 24, "55-56": 36, "57-plus": 36 },
  /** Retenue retraite complémentaire : 3 % du SJR (sans descendre sous l'allocation minimale). */
  retenueRetraite: 0.03,
  /** CSG 6,2 % + CRDS 0,5 % sur 98,25 % de l'allocation, si l'AJ dépasse le seuil d'exonération. */
  csgCrds: 0.067,
  assietteCsg: 0.9825,
  seuilExonerationCsg: 61,
  /** Versement mensuel sur une base de 30 jours depuis avril 2025. */
  joursParMois: 30,
} as const;

export type TrancheAgeARE = "moins-55" | "55-56" | "57-plus";
