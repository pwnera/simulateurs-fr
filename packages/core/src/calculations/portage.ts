/**
 * Portage salarial : TJM ou CA de mission → salaire net (2026).
 *
 * CA HT − frais de gestion de la société de portage = enveloppe ; l'enveloppe finance les frais
 * professionnels remboursés puis le coût employeur du salaire (brut + cotisations patronales, cadre).
 * Net = brut − cotisations salariales (cadre). Rémunération minimale d'un salarié porté à temps plein :
 * 75 % du PASS (art. L1254-2 du Code du travail).
 */
import { PASS_2026 } from "../constants/plafonds.js";
import { brutDepuisCoutEmployeur, cotisationsPatronales } from "./cotisations-patronales.js";
import { cotisationsSalariales } from "./cotisations-salariales.js";

export const PORTAGE_MINIMUM_BRUT_MENSUEL = Math.round(((0.75 * PASS_2026) / 12) * 100) / 100;
/** Salaire minimum de la convention collective du portage salarial (IDCC 3219), en part du plafond mensuel de la Sécurité sociale. */
export const PORTAGE_MINIMUMS_CONVENTION = [
  { niveau: "Junior", taux: 0.7 },
  { niveau: "Senior", taux: 0.75 },
  { niveau: "Forfait jours", taux: 0.85 },
] as const;
/** Taux AT/MP retenu pour une activité de conseil. */
const TAUX_ATMP_PORTAGE = 0.009;
const OPTIONS_EMPLOYEUR = { cadre: true, effectif50Plus: true, tauxAtmp: TAUX_ATMP_PORTAGE };

/** CA mensuel HT nécessaire pour verser `brut` en portage (frais de gestion déduits, sans frais professionnels). */
export function caPourBrutPortage(brut: number, fraisPortagePercent: number): number {
  const frais = Math.min(0.5, Math.max(0, fraisPortagePercent / 100));
  return cotisationsPatronales({ ...OPTIONS_EMPLOYEUR, brut }).coutEmployeur / (1 - frais);
}

export interface PortageInput {
  tjm?: number;
  joursTravaillesParMois?: number;
  caMensuel?: number;
  /** Frais de gestion de la société de portage (% du CA HT). Défaut 7 %. */
  fraisPortagePercent?: number;
  /** Frais professionnels remboursés chaque mois (hors cotisations et impôt). */
  fraisProfessionnels?: number;
  /** Taux de prélèvement à la source (%) appliqué au net imposable. */
  tauxPrelevementSource?: number;
}

export interface PortageResult {
  caBrutMensuel: number;
  fraisGestion: number;
  /** CA − frais de gestion. */
  apresFrais: number;
  fraisRembourses: number;
  /** Coût employeur du salaire (brut + charges patronales). */
  coutSalaire: number;
  chargesPatronales: number;
  brutMensuel: number;
  cotisationsSalariales: number;
  /** Salaire net avant impôt. */
  netSalaire: number;
  /** Ce que vous percevez : salaire net + frais remboursés (avant impôt). */
  netMensuel: number;
  netImposable: number;
  impotMensuel: number;
  netApresImpot: number;
  /** Total cotisations (patronales + salariales). */
  cotisations: number;
  /** Net perçu / CA. */
  tauxNetSurCA: number;
  sousMinimum: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function portageSalarial(input: PortageInput): PortageResult {
  const frais = Math.min(0.5, Math.max(0, (input.fraisPortagePercent ?? 7) / 100));
  const ca =
    input.caMensuel ??
    (input.tjm != null && input.tjm > 0 ? input.tjm * (input.joursTravaillesParMois ?? 18) : 0);
  const fraisGestion = ca * frais;
  const enveloppe = Math.max(0, ca - fraisGestion);
  const fraisRembourses = Math.min(enveloppe, Math.max(0, input.fraisProfessionnels ?? 0));
  const coutSalaire = enveloppe - fraisRembourses;

  const brut = brutDepuisCoutEmployeur(coutSalaire, OPTIONS_EMPLOYEUR);
  const patronales = cotisationsPatronales({ ...OPTIONS_EMPLOYEUR, brut });
  const salariales = cotisationsSalariales({ brut, statut: "portage" });
  const taux = Math.min(45, Math.max(0, input.tauxPrelevementSource ?? 0)) / 100;
  const impot = salariales.netImposable * taux;
  const netPercu = salariales.netAPayer + fraisRembourses;

  return {
    caBrutMensuel: r2(ca),
    fraisGestion: r2(fraisGestion),
    apresFrais: r2(enveloppe),
    fraisRembourses: r2(fraisRembourses),
    coutSalaire: r2(coutSalaire),
    chargesPatronales: r2(patronales.total),
    brutMensuel: r2(brut),
    cotisationsSalariales: r2(salariales.total),
    netSalaire: r2(salariales.netAPayer),
    netMensuel: r2(netPercu),
    netImposable: r2(salariales.netImposable),
    impotMensuel: r2(impot),
    netApresImpot: r2(netPercu - impot),
    cotisations: r2(patronales.total + salariales.total),
    tauxNetSurCA: ca > 0 ? netPercu / ca : 0,
    sousMinimum: ca > 0 && brut < PORTAGE_MINIMUM_BRUT_MENSUEL,
  };
}
