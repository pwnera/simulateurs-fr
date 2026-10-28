/**
 * Congés payés : jours acquis, restants et indemnité (Code du travail).
 *
 * Acquisition (art. L3141-3 et suivants) : 2,5 jours ouvrables par mois de travail effectif,
 * soit 30 jours ouvrables (5 semaines) par période de référence (1er juin – 31 mai en général).
 * En jours ouvrés : 25 jours par an (2,08 jours / mois).
 *
 * Arrêts maladie (loi n° 2024-364 du 22 avril 2024) :
 * - maladie non professionnelle : 2 jours ouvrables par mois d'arrêt, plafond 24 jours ouvrables par an
 *   (en cumul avec les jours acquis pendant le travail, le total reste plafonné à 30 jours) ;
 * - accident du travail / maladie professionnelle : 2,5 jours ouvrables par mois (assimilé à du travail).
 *
 * Indemnité (art. L3141-24) : le salarié perçoit la plus favorable de deux méthodes :
 * - maintien de salaire : ce qu'il aurait gagné s'il avait travaillé ;
 * - règle du dixième : 1/10 de la rémunération brute totale perçue pendant la période de référence,
 *   au prorata des jours pris.
 */

export type Decompte = "ouvrables" | "ouvres";

export const JOURS_PAR_MOIS: Record<Decompte, number> = { ouvrables: 2.5, ouvres: 25 / 12 };
export const JOURS_ANNUELS: Record<Decompte, number> = { ouvrables: 30, ouvres: 25 };
/** Nombre moyen de jours ouvrables / ouvrés par mois (pour le maintien de salaire). */
export const JOURS_MOYENS_MOIS: Record<Decompte, number> = { ouvrables: 26, ouvres: 21.67 };
/** Plafond annuel des jours acquis pendant un arrêt maladie non professionnelle (ouvrables). */
export const PLAFOND_ACQUIS_MALADIE_OUVRABLES = 24;
export const JOURS_PAR_MOIS_MALADIE_OUVRABLES = 2;

export interface AcquisitionInput {
  decompte: Decompte;
  /** Mois de travail effectif (ou assimilés : congés, AT/MP, maternité…) sur la période. */
  moisTravailles: number;
  /** Mois d'arrêt maladie non professionnelle sur la période. */
  moisMaladie?: number;
}

export interface AcquisitionResult {
  joursTravail: number;
  joursMaladie: number;
  joursAcquis: number;
}

function roundUpHalf(n: number): number {
  // Le Code du travail arrondit au nombre entier immédiatement supérieur (art. L3141-7).
  return Math.ceil(n - 1e-9);
}

export function joursAcquis(input: AcquisitionInput): AcquisitionResult {
  const mt = Math.max(0, Math.min(12, input.moisTravailles));
  const mm = Math.max(0, Math.min(12 - mt, input.moisMaladie ?? 0));
  const ratio = input.decompte === "ouvres" ? 25 / 30 : 1;
  const joursTravail = mt * JOURS_PAR_MOIS[input.decompte];
  const joursMaladie = Math.min(PLAFOND_ACQUIS_MALADIE_OUVRABLES, mm * JOURS_PAR_MOIS_MALADIE_OUVRABLES) * ratio;
  const total = Math.min(JOURS_ANNUELS[input.decompte], joursTravail + joursMaladie);
  return {
    joursTravail: Math.round(joursTravail * 100) / 100,
    joursMaladie: Math.round(joursMaladie * 100) / 100,
    joursAcquis: roundUpHalf(total),
  };
}

export interface IndemniteCongesInput {
  decompte: Decompte;
  /** Jours de congés à indemniser (pris ou non pris). */
  jours: number;
  /** Jours acquis sur la période de référence (base de proratisation du dixième). */
  joursAcquisPeriode: number;
  /** Salaire brut mensuel habituel (maintien de salaire). */
  salaireBrutMensuel: number;
  /** Rémunération brute totale de la période de référence (règle du dixième). Défaut : salaire × 12. */
  remunerationReference?: number;
}

export interface IndemniteCongesResult {
  maintienSalaire: number;
  regleDixieme: number;
  indemnite: number;
  methode: "maintien" | "dixieme";
}

export function indemniteConges(input: IndemniteCongesInput): IndemniteCongesResult {
  const jours = Math.max(0, input.jours);
  const salaire = Math.max(0, input.salaireBrutMensuel);
  const maintien = (salaire / JOURS_MOYENS_MOIS[input.decompte]) * jours;
  const ref = input.remunerationReference != null && input.remunerationReference > 0 ? input.remunerationReference : salaire * 12;
  const base = input.joursAcquisPeriode > 0 ? input.joursAcquisPeriode : JOURS_ANNUELS[input.decompte];
  const dixieme = (ref / 10) * Math.min(1, jours / base);
  const methode = dixieme > maintien ? "dixieme" : "maintien";
  return {
    maintienSalaire: Math.round(maintien * 100) / 100,
    regleDixieme: Math.round(dixieme * 100) / 100,
    indemnite: Math.round(Math.max(maintien, dixieme) * 100) / 100,
    methode,
  };
}

/** Compatibilité : solde de congés et valeur simple (jours restants × salaire journalier). */
export interface CongesInput {
  joursAcquis: number;
  joursPris: number;
  salaireJournalierNet?: number;
}

export interface CongesResult {
  joursRestants: number;
  valeurEstimee: number;
}

export function congesPayes(input: CongesInput): CongesResult {
  const { joursAcquis: acquis, joursPris, salaireJournalierNet = 0 } = input;
  const restants = Math.max(0, acquis - joursPris);
  return {
    joursRestants: restants,
    valeurEstimee: Math.round(restants * salaireJournalierNet * 100) / 100,
  };
}
