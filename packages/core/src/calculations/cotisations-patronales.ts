/**
 * Cotisations patronales ligne par ligne et coût employeur (2026).
 */
import { PMSS_2026 } from "../constants/plafonds.js";
import { COTISATIONS_PATRONALES_2026 as P, RGDU_2026 } from "../constants/cotisations-patronales.js";

export interface CotisationsPatronalesInput {
  /** Brut mensuel. */
  brut: number;
  cadre?: boolean;
  /** Effectif de 50 salariés ou plus (FNAL 0,5 %, RGDU). Défaut : non. */
  effectif50Plus?: boolean;
  /** Effectif de 11 salariés ou plus (formation 1 %). Défaut : oui. */
  effectif11Plus?: boolean;
  /** Taux AT/MP de l'entreprise. Défaut : moyenne nationale 2,08 %. */
  tauxAtmp?: number;
  /** Cotisations chômage et AGS (false pour un président de SAS/SASU). Défaut : oui. */
  assuranceChomage?: boolean;
  /** Appliquer la RGDU (réservée aux salariés relevant de l'assurance chômage). Défaut : = assuranceChomage. */
  rgdu?: boolean;
  /** Plafond mensuel. Défaut : PMSS × temps de travail. */
  pmss?: number;
  /** Quotité de temps de travail (0,5 = mi-temps). Proratise le SMIC de la RGDU et le plafond. Défaut : 1. */
  tempsTravail?: number;
}

export interface CotisationPatronaleLigne {
  id: string;
  label: string;
  montant: number;
}

export interface CotisationsPatronalesResult {
  lignes: CotisationPatronaleLigne[];
  totalAvantReduction: number;
  reductionGenerale: number;
  total: number;
  coutEmployeur: number;
  tauxEffectif: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Coefficient de la réduction générale dégressive unique pour une rémunération annuelle brute. */
/** Le SMIC de référence est proratisé selon la durée contractuelle (temps partiel). */
export function coefficientRGDU(remunerationAnnuelle: number, effectif50Plus = false, tempsTravail = 1): number {
  const smic = RGDU_2026.smicAnnuel * tempsTravail;
  if (remunerationAnnuelle <= 0 || remunerationAnnuelle >= 3 * smic) return 0;
  const tdelta = effectif50Plus ? RGDU_2026.tdelta50Plus : RGDU_2026.tdeltaMoins50;
  const x = Math.max(0, 0.5 * ((3 * smic) / remunerationAnnuelle - 1));
  const c = RGDU_2026.tmin + tdelta * Math.pow(Math.min(1, x), RGDU_2026.puissance);
  return Math.round(Math.min(RGDU_2026.tmin + tdelta, c) * 10000) / 10000;
}

export function cotisationsPatronales(input: CotisationsPatronalesInput): CotisationsPatronalesResult {
  const brut = Math.max(0, input.brut);
  const temps = Math.min(1, Math.max(0.01, input.tempsTravail ?? 1));
  const pmss = input.pmss ?? PMSS_2026 * temps;
  const chomage = input.assuranceChomage !== false;
  const t1 = Math.min(brut, pmss);
  const t2 = Math.max(0, Math.min(brut, 8 * pmss) - pmss);
  const plafond4 = Math.min(brut, 4 * pmss);
  const lignes: CotisationPatronaleLigne[] = [];
  const add = (id: string, label: string, montant: number) => {
    if (montant > 0) lignes.push({ id, label, montant: r2(montant) });
  };

  add("maladie", "Maladie, maternité, invalidité", brut * P.maladie);
  add("vieillesse", "Assurance vieillesse", t1 * P.vieillessePlafonnee + brut * P.vieillesseDeplafonnee);
  add("famille", "Allocations familiales", brut * P.allocationsFamiliales);
  add("atmp", "Accidents du travail", brut * (input.tauxAtmp ?? P.atmpMoyen));
  add("csa", "Contribution solidarité autonomie", brut * P.csa);
  add("fnal", "FNAL", input.effectif50Plus ? brut * P.fnal50Plus : t1 * P.fnalMoins50);
  if (chomage) {
    add("chomage", "Assurance chômage", plafond4 * P.chomage);
    add("ags", "AGS (garantie des salaires)", plafond4 * P.ags);
  }
  add("retraite-complementaire", "Retraite complémentaire Agirc-Arrco", t1 * P.agircArrcoT1 + t2 * P.agircArrcoT2);
  add("ceg-cet", "CEG / CET", t1 * P.cegT1 + t2 * P.cegT2 + (brut > pmss ? (t1 + t2) * P.cet : 0));
  if (input.cadre) {
    add("apec", "APEC", plafond4 * P.apec);
    add("prevoyance", "Prévoyance cadre (minimum)", t1 * P.prevoyanceCadre);
    if (input.effectif11Plus !== false) {
      add("forfait-social", "Forfait social sur la prévoyance (8 %)", t1 * P.prevoyanceCadre * P.forfaitSocialPrevoyance);
    }
  }
  add("dialogue-social", "Dialogue social", brut * P.dialogueSocial);
  add("formation", "Formation professionnelle", brut * (input.effectif11Plus === false ? P.formationMoins11 : P.formation11Plus));
  add("apprentissage", "Taxe d'apprentissage", brut * P.taxeApprentissage);

  const totalAvant = lignes.reduce((s, l) => s + l.montant, 0);
  const appliquerRgdu = input.rgdu ?? chomage;
  const reduction = appliquerRgdu ? brut * coefficientRGDU(brut * 12, input.effectif50Plus, temps) : 0;
  const total = Math.max(0, totalAvant - reduction);
  return {
    lignes,
    totalAvantReduction: r2(totalAvant),
    reductionGenerale: r2(reduction),
    total: r2(total),
    coutEmployeur: r2(brut + total),
    tauxEffectif: brut > 0 ? total / brut : 0,
  };
}

/** Brut correspondant à un coût employeur (enveloppe) donné, par dichotomie. */
export function brutDepuisCoutEmployeur(cout: number, options: Omit<CotisationsPatronalesInput, "brut"> = {}): number {
  let lo = 0;
  let hi = Math.max(0, cout);
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (cotisationsPatronales({ ...options, brut: mid }).coutEmployeur < cout) lo = mid;
    else hi = mid;
  }
  return r2(lo);
}
