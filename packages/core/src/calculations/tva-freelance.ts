/**
 * TVA d'un freelance : franchise en base (art. 293 B du CGI, seuils 2026), TVA collectée,
 * TVA déductible et TVA à reverser.
 */
import { FRANCHISE_TVA_2026 } from "../constants/micro-entreprise.js";

export type ActiviteTVA = "vente" | "prestations" | "specifique";

export const TAUX_TVA = [
  { value: 0.2, label: "20 % (taux normal)" },
  { value: 0.1, label: "10 % (restauration, travaux…)" },
  { value: 0.055, label: "5,5 % (livres, énergie…)" },
  { value: 0.021, label: "2,1 % (presse…)" },
] as const;

export interface TVAFreelanceInput {
  caHTAnnuel: number;
  activite: ActiviteTVA;
  /** Taux de TVA applicable à vos ventes. Défaut 20 %. */
  tauxTVA?: number;
  /** Dépenses professionnelles TTC annuelles soumises à TVA (pour la TVA déductible). */
  depensesTTC?: number;
  /** Taux moyen de TVA sur les dépenses. Défaut 20 %. */
  tauxTVADepenses?: number;
  /** Opter pour la TVA malgré la franchise. */
  optionTVA?: boolean;
}

export interface TVAFreelanceResult {
  franchiseTVA: boolean;
  statut: "franchise" | "fin-au-1er-janvier" | "assujetti-immediat" | "option";
  seuilFranchise: number;
  seuilMajore: number;
  tvaCollectee: number;
  tvaDeductible: number;
  tvaAReverser: number;
  caTTC: number;
  message: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function tvaFreelance(input: TVAFreelanceInput): TVAFreelanceResult {
  const ca = Math.max(0, input.caHTAnnuel);
  const s =
    input.activite === "vente" ? FRANCHISE_TVA_2026.vente : input.activite === "specifique" ? FRANCHISE_TVA_2026.specifique : FRANCHISE_TVA_2026.services;
  const taux = input.tauxTVA ?? 0.2;
  let statut: TVAFreelanceResult["statut"];
  if (ca > s.majore) statut = "assujetti-immediat";
  else if (ca > s.seuil) statut = "fin-au-1er-janvier";
  else if (input.optionTVA) statut = "option";
  else statut = "franchise";
  const assujetti = statut === "assujetti-immediat" || statut === "option";
  const tvaCollectee = assujetti ? ca * taux : 0;
  const depenses = Math.max(0, input.depensesTTC ?? 0);
  const tauxDep = input.tauxTVADepenses ?? 0.2;
  const tvaDeductible = assujetti ? (depenses * tauxDep) / (1 + tauxDep) : 0;

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const messages: Record<TVAFreelanceResult["statut"], string> = {
    franchise: `Sous le seuil de franchise (${fmt(s.seuil)} €) : pas de TVA à facturer. Mentionnez « TVA non applicable, art. 293 B du CGI » sur vos factures.`,
    "fin-au-1er-janvier": `Seuil de ${fmt(s.seuil)} € dépassé mais pas le seuil majoré (${fmt(s.majore)} €) : vous restez en franchise jusqu'au 31 décembre, puis facturez la TVA au 1er janvier suivant.`,
    "assujetti-immediat": `Seuil majoré de ${fmt(s.majore)} € dépassé : la TVA s'applique dès la facture qui fait franchir le seuil.`,
    option: "Option pour la TVA : vous facturez la TVA et récupérez celle de vos achats (utile si vos clients sont des entreprises).",
  };

  return {
    franchiseTVA: !assujetti,
    statut,
    seuilFranchise: s.seuil,
    seuilMajore: s.majore,
    tvaCollectee: r2(tvaCollectee),
    tvaDeductible: r2(tvaDeductible),
    tvaAReverser: r2(Math.max(0, tvaCollectee - tvaDeductible)),
    caTTC: r2(ca + tvaCollectee),
    message: messages[statut],
  };
}
