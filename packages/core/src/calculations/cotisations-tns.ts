/**
 * Cotisations sociales d'un travailleur indépendant au réel (EI, gérant majoritaire d'EURL/SARL),
 * à partir du revenu professionnel avant cotisations (réforme de l'assiette 2026).
 */
import { PASS_2026, SMIC_HORAIRE_BRUT_JANVIER_2026 } from "../constants/plafonds.js";
import {
  ABATTEMENT_ASSIETTE_TNS,
  ALLOCATIONS_FAMILIALES_TNS,
  CFP_TNS,
  CSG_CRDS_TNS,
  CSG_DEDUCTIBLE_TNS,
  MALADIE_TNS_AU_DELA_3_PASS,
  MALADIE_TNS_PALIERS,
  TNS_CIPAV,
  TNS_SSI,
} from "../constants/cotisations-tns.js";

export type ProfessionTNS = "artisan" | "commercant" | "liberal" | "liberal-cipav";

export interface CotisationTNSLigne {
  id: string;
  label: string;
  montant: number;
  /** Rattachement pour les synthèses (retraite, santé, famille, CSG…). */
  groupe: "retraite" | "sante" | "prevoyance" | "famille" | "csg" | "formation";
}

export interface CotisationsTNSResult {
  /** Revenu professionnel avant cotisations (annuel). */
  revenu: number;
  /** Assiette sociale après abattement de 26 %. */
  assiette: number;
  lignes: CotisationTNSLigne[];
  total: number;
  /** Revenu après cotisations (= rémunération nette avant impôt). */
  revenuNet: number;
  /** Part déductible fiscalement (tout sauf CSG non déductible + CRDS). */
  deductible: number;
  /** Taux global : total / revenu. */
  tauxGlobal: number;
  /** Cotisations retraite (base + complémentaire). */
  retraite: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Assiette sociale unique : revenu − 26 % (abattement compris entre 1,76 % et 130 % du PASS). */
export function assietteSocialeTNS(revenu: number, pass = PASS_2026): number {
  if (revenu <= 0) return 0;
  const abattement = Math.min(
    ABATTEMENT_ASSIETTE_TNS.plafond * pass,
    Math.max(ABATTEMENT_ASSIETTE_TNS.plancher * pass, revenu * ABATTEMENT_ASSIETTE_TNS.taux)
  );
  return Math.max(0, revenu - abattement);
}

/** Taux maladie-maternité progressif (sous 3 PASS) ; au-delà, 8,5 % jusqu'à 3 PASS puis 6,5 %. */
export function cotisationMaladieTNS(assiette: number, pass = PASS_2026): number {
  if (assiette <= 0) return 0;
  const ratio = assiette / pass;
  if (ratio > 3) {
    return 3 * pass * 0.085 + (assiette - 3 * pass) * MALADIE_TNS_AU_DELA_3_PASS;
  }
  let prevSeuil = 0;
  let prevTaux = 0;
  for (const p of MALADIE_TNS_PALIERS) {
    if (ratio <= p.seuil) {
      const t = prevTaux + ((p.taux - prevTaux) * (ratio - prevSeuil)) / (p.seuil - prevSeuil);
      return assiette * t;
    }
    prevSeuil = p.seuil;
    prevTaux = p.taux;
  }
  return assiette * 0.085;
}

export function cotisationAllocationsFamilialesTNS(assiette: number, pass = PASS_2026): number {
  const { seuilBas, seuilHaut, taux } = ALLOCATIONS_FAMILIALES_TNS;
  const ratio = assiette / pass;
  if (ratio <= seuilBas) return 0;
  if (ratio >= seuilHaut) return assiette * taux;
  return assiette * taux * ((ratio - seuilBas) / (seuilHaut - seuilBas));
}

/**
 * Cotisations annuelles d'un TNS au réel.
 * @param revenu Revenu professionnel annuel avant cotisations sociales (bénéfice + cotisations).
 */
export function cotisationsTNS(revenu: number, profession: ProfessionTNS = "liberal"): CotisationsTNSResult {
  const pass = PASS_2026;
  const R = Math.max(0, revenu);
  const A = assietteSocialeTNS(R, pass);
  const lignes: CotisationTNSLigne[] = [];
  const add = (id: string, label: string, montant: number, groupe: CotisationTNSLigne["groupe"]) => {
    if (montant > 0) lignes.push({ id, label, montant: r2(montant), groupe });
  };

  add("maladie", "Maladie-maternité", cotisationMaladieTNS(A, pass), "sante");

  if (profession === "liberal-cipav") {
    const c = TNS_CIPAV;
    add("ij", "Indemnités journalières", Math.min(Math.max(A, c.ij.minPass * pass), c.ij.plafondPass * pass) * c.ij.taux, "sante");
    const t1 = Math.min(A, pass);
    add(
      "retraite-base",
      "Retraite de base (CNAVPL)",
      Math.max(t1, TNS_SSI.retraiteBaseAssietteMinHeuresSmic * SMIC_HORAIRE_BRUT_JANVIER_2026) * c.retraiteBaseT1 +
        Math.max(0, Math.min(A, c.retraiteBasePlafondPass * pass) - pass) * c.retraiteBaseT2,
      "retraite"
    );
    add(
      "retraite-complementaire",
      "Retraite complémentaire (Cipav)",
      t1 * c.complementaireT1 + Math.max(0, Math.min(A, c.complementairePlafondPass * pass) - pass) * c.complementaireT2,
      "retraite"
    );
    add("invalidite-deces", "Invalidité-décès", Math.min(A, c.invaliditeDecesPlafondPass * pass) * c.invaliditeDeces, "prevoyance");
  } else {
    const s = TNS_SSI;
    add("ij", "Indemnités journalières", Math.min(Math.max(A, s.ij.minPass * pass), s.ij.plafondPass * pass) * s.ij.taux, "sante");
    const assietteRetraiteMin = s.retraiteBaseAssietteMinHeuresSmic * SMIC_HORAIRE_BRUT_JANVIER_2026;
    add(
      "retraite-base",
      "Retraite de base",
      Math.max(Math.min(A, pass), assietteRetraiteMin) * s.retraiteBaseT1 + A * s.retraiteBaseTotal,
      "retraite"
    );
    add(
      "retraite-complementaire",
      "Retraite complémentaire",
      Math.min(A, pass) * s.rciT1 + Math.max(0, Math.min(A, s.rciPlafondPass * pass) - pass) * s.rciT2,
      "retraite"
    );
    add("invalidite-deces", "Invalidité-décès", Math.max(Math.min(A, pass), s.invaliditeDecesMinPass * pass) * s.invaliditeDeces, "prevoyance");
  }

  add("allocations-familiales", "Allocations familiales", cotisationAllocationsFamilialesTNS(A, pass), "famille");
  const csg = A * CSG_CRDS_TNS;
  add("csg-crds", "CSG-CRDS", csg, "csg");
  add(
    "cfp",
    "Formation professionnelle (CFP)",
    (profession === "artisan" ? CFP_TNS.artisan : CFP_TNS.commercantLiberal) * pass,
    "formation"
  );

  const total = lignes.reduce((sum, l) => sum + l.montant, 0);
  const nonDeductible = A * (CSG_CRDS_TNS - CSG_DEDUCTIBLE_TNS);
  const retraite = lignes.filter((l) => l.groupe === "retraite").reduce((sum, l) => sum + l.montant, 0);
  return {
    revenu: r2(R),
    assiette: r2(A),
    lignes,
    total: r2(total),
    revenuNet: r2(R - total),
    deductible: r2(total - nonDeductible),
    tauxGlobal: R > 0 ? total / R : 0,
    retraite: r2(retraite),
  };
}
