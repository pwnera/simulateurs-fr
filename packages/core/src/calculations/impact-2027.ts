/**
 * Effet des barèmes 2027 sur un salaire (page /baremes-2027), salarié non-cadre à temps plein :
 * - net mensuel avec le PMSS 2026 puis 2027, à taux de cotisations inchangés ;
 * - impôt d'un célibataire sur le même revenu annuel avec le barème 2026 puis le barème 2027 proposé (PLF).
 */
import { BAREME_IR_2026, BAREME_IR_2027_PLF } from "../constants/impot-revenu.js";
import { PMSS_2026, PMSS_2027 } from "../constants/plafonds.js";
import { cotisationsSalariales } from "./cotisations-salariales.js";
import { abattementFraisPro, calculImpotRevenu } from "./impot-revenu.js";

export interface Impact2027 {
  brutMensuel: number;
  net2026: number;
  net2027: number;
  /** Impôt annuel, barème 2026. */
  impot2026: number;
  /** Impôt annuel sur le même revenu, barème 2027 du PLF. */
  impot2027: number;
}

export function impact2027(brutMensuel: number): Impact2027 {
  const mois = (pmss: number) => cotisationsSalariales({ brut: brutMensuel, statut: "non-cadre", pmss });
  const m2026 = mois(PMSS_2026);
  const netImposableAnnuel = m2026.netImposable * 12;
  const revenuImposable = netImposableAnnuel - abattementFraisPro(netImposableAnnuel);
  return {
    brutMensuel,
    net2026: m2026.netAPayer,
    net2027: mois(PMSS_2027).netAPayer,
    impot2026: calculImpotRevenu({ revenuImposable, bareme: BAREME_IR_2026 }).impotNet,
    impot2027: calculImpotRevenu({ revenuImposable, bareme: BAREME_IR_2027_PLF }).impotNet,
  };
}
