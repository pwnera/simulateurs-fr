/**
 * Heures supplémentaires - majorations (France).
 * Art. L3121-36 : 25 % de la 36e à la 43e heure, 50 % au-delà (sauf accord prévoyant un autre taux,
 * au minimum 10 %). Semaine civile = lundi–dimanche.
 *
 * Net : les heures sup bénéficient d'une réduction de cotisations salariales égale aux cotisations
 * d'assurance vieillesse, dans la limite de 11,31 % (art. L241-17 CSS), et sont exonérées d'impôt sur
 * le revenu dans la limite de 7 500 € nets par an (art. 81 quater CGI).
 */
import {
  HEURES_MENSUELLES_PAR_HORAIRE,
  getHeuresMensuelles,
  type HoraireContratPreset,
} from "../constants/heures-travail.js";

export type ArrondiHeures = "minute" | "quart" | "heure_commencee";

/** Durée légale hebdomadaire et seuil de passage à 50 %. */
export const SEUIL_HS_25 = 35;
export const SEUIL_HS_50 = 43;
/** Taux maximal de la réduction de cotisations salariales sur heures sup (art. D241-21 CSS). */
export const TAUX_REDUCTION_SALARIALE_HS = 0.1131;
/** Plafond annuel d'exonération d'impôt sur le revenu des heures sup (net imposable). */
export const PLAFOND_EXONERATION_IR_HS = 7500;

export interface HeuresSupInput {
  tauxHoraireBrut?: number;
  tauxHoraireNet?: number;
  tauxCotisations?: number; // e.g. 0.22 when tauxHoraireNet is used
  /** Salaire mensuel brut (alternatif au taux horaire). Heures mensuelles déduites de heuresContratHebdo. */
  salaireMensuelBrut?: number;
  /** Heures contractuelles par semaine (35, 37, 39 ou personnalisé). Défaut 35. */
  heuresContratHebdo?: number | HoraireContratPreset;
  /** Majoration 1 (ex. 0.25 pour 25%). Défaut 0.25. */
  tauxMajoration1?: number;
  /** Majoration 2 (ex. 0.5 pour 50%). Défaut 0.5. */
  tauxMajoration2?: number;
  heuresSup25: number;
  heuresSup50: number;
  /** Taux de charges salariales pour estimation net (défaut 0.22). */
  tauxChargesNet?: number;
  /** Heures complémentaires (temps partiel) majorées à 10 %. */
  heuresComp10?: number;
  /** Appliquer la réduction de cotisations salariales sur heures sup (défaut : oui). */
  reductionSalariale?: boolean;
}

export interface HeuresSupResult {
  montantBrut25: number;
  montantBrut50: number;
  /** Heures complémentaires à 10 % (temps partiel). */
  montantBrut10: number;
  totalBrut: number;
  netEstime: number;
  /** Réduction de cotisations salariales appliquée (€). */
  reductionSalariale: number;
  /** Taux de cotisations effectivement retenu sur les heures sup (après réduction). */
  tauxChargesEffectif: number;
  /** Taux horaire brut utilisé (dérivé si salaire mensuel). */
  tauxHoraireBrut: number;
  /** Pour récap : total heures travaillées (normales + sup) si connu. */
  totalHeuresTravaillees?: number;
  heuresNormales?: number;
  /** Taux de charges utilisé pour net estimé. */
  tauxChargesUtilise: number;
}

function getHeuresMensuellesRef(heuresContratHebdo: number): number {
  if (heuresContratHebdo === 35 || heuresContratHebdo === 37 || heuresContratHebdo === 39) {
    return HEURES_MENSUELLES_PAR_HORAIRE[heuresContratHebdo as HoraireContratPreset];
  }
  return getHeuresMensuelles(heuresContratHebdo);
}

/**
 * Nombre d'heures « équivalent taux normal » payées par un salaire mensuel. Au-delà de 35 h, les heures
 * contractuelles (ex. 36e à 39e) sont des heures sup structurelles déjà payées à 125 % :
 * 39 h → 151,67 + 17,33 × 1,25 = 173,33 h.
 */
export function heuresPayeesEquivalentes(heuresContratHebdo: number, majoration1 = 0.25): number {
  if (heuresContratHebdo <= SEUIL_HS_25) return getHeuresMensuellesRef(heuresContratHebdo);
  const base = getHeuresMensuellesRef(SEUIL_HS_25);
  const h25 = getHeuresMensuelles(Math.min(heuresContratHebdo, SEUIL_HS_50) - SEUIL_HS_25);
  const h50 = getHeuresMensuelles(Math.max(0, heuresContratHebdo - SEUIL_HS_50));
  return base + h25 * (1 + majoration1) + h50 * 1.5;
}

function getTauxHoraireBrut(input: HeuresSupInput): number {
  if (input.tauxHoraireBrut != null && input.tauxHoraireBrut > 0) return input.tauxHoraireBrut;
  if (input.salaireMensuelBrut != null && input.salaireMensuelBrut > 0) {
    const hebdo = input.heuresContratHebdo ?? 35;
    const h = typeof hebdo === "number" ? hebdo : 35;
    return input.salaireMensuelBrut / heuresPayeesEquivalentes(h, input.tauxMajoration1 ?? 0.25);
  }
  const net = input.tauxHoraireNet ?? 0;
  const taux = input.tauxCotisations ?? 0.22;
  if (net <= 0) return 0;
  return net / (1 - taux);
}

export function calculHeuresSup(input: HeuresSupInput): HeuresSupResult {
  const tauxHoraireBrut = getTauxHoraireBrut(input);
  const m1 = input.tauxMajoration1 ?? 0.25;
  const m2 = input.tauxMajoration2 ?? 0.5;
  const { heuresSup25, heuresSup50 } = input;
  const heuresComp10 = input.heuresComp10 ?? 0;
  const tauxCharges = input.tauxChargesNet ?? 0.22;
  const m25 = tauxHoraireBrut * (1 + m1) * heuresSup25;
  const m50 = tauxHoraireBrut * (1 + m2) * heuresSup50;
  const m10 = tauxHoraireBrut * 1.1 * heuresComp10;
  const totalBrut = m25 + m50 + m10;
  const reduction = input.reductionSalariale === false ? 0 : Math.min(TAUX_REDUCTION_SALARIALE_HS, tauxCharges);
  const tauxEffectif = Math.max(0, tauxCharges - reduction);
  const netEstime = totalBrut * (1 - tauxEffectif);
  return {
    montantBrut25: Math.round(m25 * 100) / 100,
    montantBrut50: Math.round(m50 * 100) / 100,
    montantBrut10: Math.round(m10 * 100) / 100,
    totalBrut: Math.round(totalBrut * 100) / 100,
    netEstime: Math.round(netEstime * 100) / 100,
    reductionSalariale: Math.round(totalBrut * reduction * 100) / 100,
    tauxChargesEffectif: tauxEffectif,
    tauxHoraireBrut: Math.round(tauxHoraireBrut * 100) / 100,
    tauxChargesUtilise: tauxCharges,
  };
}

/** Arrondit une durée en heures selon le mode. */
export function arrondirDureeHeures(heures: number, mode: ArrondiHeures): number {
  if (mode === "minute") return Math.round(heures * 60) / 60;
  if (mode === "quart") return Math.round(heures * 4) / 4; // 0,25 pas
  if (mode === "heure_commencee") return Math.ceil(heures);
  return heures;
}

/** Arrondit pour affichage (2 décimales). */
export function roundHeuresDisplay(h: number): number {
  return Math.round(h * 100) / 100;
}

/** Entrée pour un jour (début/fin en minutes depuis 0h00, pause en minutes). */
export interface JourneeTravail {
  debutMinutes: number;
  finMinutes: number;
  pauseMinutes: number;
}

/**
 * Calcule les heures travaillées sur une semaine (tableau de 7 jours).
 * - Temps plein (contrat ≥ 35 h) : heures au-delà du contrat ; majorées à 25 % jusqu'à 43 h, 50 % au-delà.
 * - Temps partiel (contrat < 35 h) : heures complémentaires, majorées à 10 % dans la limite du 1/10e
 *   de la durée contractuelle, 25 % au-delà (art. L3123-29) ; au-delà de 35 h, règles des heures sup.
 */
export function calculHeuresSupSemaine(
  jours: (JourneeTravail | null)[],
  heuresContratHebdo: number,
  arrondi: ArrondiHeures,
  _tauxMajoration1 = 0.25,
  _tauxMajoration2 = 0.5
): { heuresNormales: number; heuresSup25: number; heuresSup50: number; heuresComp10: number; totalHeures: number } {
  let totalMinutes = 0;
  for (const j of jours) {
    if (!j) continue;
    const d = Math.max(0, j.finMinutes - j.debutMinutes - j.pauseMinutes);
    totalMinutes += d;
  }
  const totalHeures = arrondirDureeHeures(totalMinutes / 60, arrondi);
  const contrat = heuresContratHebdo;
  const r = (n: number) => Math.round(Math.max(0, n) * 100) / 100;
  if (totalHeures <= contrat) {
    return { heuresNormales: r(totalHeures), heuresSup25: 0, heuresSup50: 0, heuresComp10: 0, totalHeures };
  }
  let comp10 = 0;
  let h25 = 0;
  if (contrat < SEUIL_HS_25) {
    const complementaires = Math.min(totalHeures, SEUIL_HS_25) - contrat;
    comp10 = Math.min(complementaires, contrat / 10);
    h25 += complementaires - comp10;
  }
  const debutHs = Math.max(contrat, SEUIL_HS_25);
  h25 += Math.max(0, Math.min(totalHeures, SEUIL_HS_50) - debutHs);
  const h50 = Math.max(0, totalHeures - Math.max(debutHs, SEUIL_HS_50));
  return {
    heuresNormales: r(contrat),
    heuresSup25: r(h25),
    heuresSup50: r(h50),
    heuresComp10: r(comp10),
    totalHeures,
  };
}
