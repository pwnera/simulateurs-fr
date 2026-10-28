/**
 * Heures de travail de référence (France).
 * Semaine civile = lundi à dimanche.
 * Heures mensuelles = heuresHebdo * 52 / 12 (méthode du mois civil).
 */

export const HEURES_SEMAINE_LEGALE = 35;
export const HEURES_MENSUELLES_35H = Math.round((35 * 52) / 12 * 100) / 100; // 151,67
export const HEURES_MENSUELLES_37H = Math.round((37 * 52) / 12 * 100) / 100; // 160,33
export const HEURES_MENSUELLES_39H = Math.round((39 * 52) / 12 * 100) / 100; // 169

export type HoraireContratPreset = 35 | 37 | 39;

export const HEURES_MENSUELLES_PAR_HORAIRE: Record<HoraireContratPreset, number> = {
  35: HEURES_MENSUELLES_35H,
  37: HEURES_MENSUELLES_37H,
  39: HEURES_MENSUELLES_39H,
};

/** Heures mensuelles pour un horaire hebdo personnalisé (ex. 38). */
export function getHeuresMensuelles(heuresHebdo: number): number {
  return Math.round((heuresHebdo * 52) / 12 * 100) / 100;
}

/** Plafonds légaux (France). */
export const PLAFOND_HEBDO_HEURES = 48;
export const PLAFOND_MOYENNE_12_SEMAINES_HEURES = 44;
export const CONTINGENT_ANNUEL_HEURES_SUP = 220;

/** Majorations légales par défaut (8 premières heures sup puis au-delà). */
export const MAJORATION_25_DEFAULT = 0.25;
export const MAJORATION_50_DEFAULT = 0.5;
