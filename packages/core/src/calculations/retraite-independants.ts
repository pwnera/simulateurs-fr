/**
 * Retraite et prévoyance des indépendants (2026) : part des cotisations consacrée à la retraite et à la
 * prévoyance, trimestres de retraite validés et indemnités journalières maladie.
 *
 * - Réel (EI, gérant majoritaire) : moteur de cotisations TNS 2026 (assiette avec abattement de 26 %).
 * - Micro-entreprise : cotisations forfaitaires sur le CA ; trimestres selon les seuils de CA 2026.
 * - 1 trimestre de retraite de base = revenu cotisé de 150 × SMIC horaire (1 803 € en 2026), 4 maximum.
 * - Indemnités journalières : 1/730 du revenu annuel moyen (3 dernières années), plafonné à 1 PASS pour
 *   les artisans et commerçants, 3 PASS pour les professions libérales ; aucune indemnité sous 10 % du PASS.
 */
import { PASS_2026, SMIC_HORAIRE_BRUT_JANVIER_2026 } from "../constants/plafonds.js";
import { CA_4_TRIMESTRES_2026, TAUX_MICRO_2026, type ActiviteMicro } from "../constants/micro-entreprise.js";
import { cotisationsTNS, type ProfessionTNS } from "./cotisations-tns.js";

export const HEURES_SMIC_PAR_TRIMESTRE = 150;
export const REVENU_PAR_TRIMESTRE = Math.round(HEURES_SMIC_PAR_TRIMESTRE * SMIC_HORAIRE_BRUT_JANVIER_2026);
/** Répartition des cotisations micro (vente, services BIC) : retraite de base 43,45 %, complémentaire 19,75 % (décret 2025-943). */
const PART_RETRAITE_MICRO_BIC = 0.4345 + 0.1975;
const PART_INVALIDITE_MICRO_BIC = 0.0315;
const ABATTEMENT_MICRO: Record<ActiviteMicro, number> = { vente: 0.71, services_bic: 0.5, services_bnc: 0.34, liberale_cipav: 0.34 };

export interface RetraiteIndependantsInput {
  /** Micro : CA annuel. Réel : revenu professionnel annuel avant cotisations. */
  revenusAnnuels: number;
  regime: "micro" | "reel";
  activiteMicro?: ActiviteMicro;
  profession?: ProfessionTNS;
}

export interface RetraiteIndependantsResult {
  totalCotisations: number;
  cotisationRetraiteBase: number;
  cotisationRetraiteComplementaire: number;
  /** Retraite de base + complémentaire. */
  cotisationRetraite: number;
  /** Invalidité-décès + indemnités journalières. */
  cotisationPrevoyance: number;
  /** Compatibilité : ancien champ (retraite + prévoyance). */
  total: number;
  trimestres: number;
  /** Revenu (ou CA en micro) nécessaire pour 4 trimestres. */
  seuil4Trimestres: number;
  indemniteJournaliere: number;
  /** null si la répartition n'est pas connue (micro BNC / Cipav). */
  repartitionConnue: boolean;
  lignes: { label: string; montant: number }[];
  message: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function indemniteJournaliere(revenu: number, profession: ProfessionTNS | "micro-bic" | "micro-liberal"): number {
  if (revenu < 0.1 * PASS_2026) return 0;
  const liberal = profession === "liberal" || profession === "liberal-cipav" || profession === "micro-liberal";
  const plafond = (liberal ? 3 : 1) * PASS_2026;
  return Math.min(revenu, plafond) / 730;
}

export function retraitePrevoyanceIndependants(input: RetraiteIndependantsInput): RetraiteIndependantsResult {
  const revenus = Math.max(0, input.revenusAnnuels);

  if (input.regime === "micro") {
    const activite = input.activiteMicro ?? "services_bic";
    const total = revenus * TAUX_MICRO_2026[activite];
    const bic = activite === "vente" || activite === "services_bic";
    const retraite = bic ? total * PART_RETRAITE_MICRO_BIC : 0;
    const base = bic ? total * 0.4345 : 0;
    const prevoyance = bic ? total * PART_INVALIDITE_MICRO_BIC : 0;
    const seuil = CA_4_TRIMESTRES_2026[activite];
    const trimestres = Math.max(0, Math.min(4, Math.floor((revenus / seuil) * 4 + 1e-9)));
    const revenuApresAbattement = revenus * (1 - ABATTEMENT_MICRO[activite]);
    return {
      totalCotisations: r2(total),
      cotisationRetraiteBase: r2(base),
      cotisationRetraiteComplementaire: r2(retraite - base),
      cotisationRetraite: r2(retraite),
      cotisationPrevoyance: r2(prevoyance),
      total: r2(retraite + prevoyance),
      trimestres,
      seuil4Trimestres: seuil,
      indemniteJournaliere: r2(indemniteJournaliere(revenuApresAbattement, bic ? "micro-bic" : "micro-liberal")),
      repartitionConnue: bic,
      lignes: bic
        ? [
            { label: "Retraite de base", montant: r2(base) },
            { label: "Retraite complémentaire", montant: r2(retraite - base) },
            { label: "Invalidité-décès", montant: r2(prevoyance) },
            { label: "Maladie, CSG-CRDS et autres", montant: r2(total - retraite - prevoyance) },
          ]
        : [{ label: "Cotisations sociales (taux global)", montant: r2(total) }],
      message:
        trimestres >= 4
          ? "Votre chiffre d'affaires valide 4 trimestres de retraite de base."
          : `Il faut ${seuil.toLocaleString("fr-FR")} € de chiffre d'affaires annuel pour valider 4 trimestres.`,
    };
  }

  const profession = input.profession ?? "liberal";
  const tns = cotisationsTNS(revenus, profession);
  const get = (id: string) => tns.lignes.find((l) => l.id === id)?.montant ?? 0;
  const base = get("retraite-base");
  const compl = get("retraite-complementaire");
  const prevoyance = get("invalidite-deces") + get("ij");
  // Trimestres : selon le revenu soumis à la retraite de base (avec l'assiette minimale, 3 trimestres).
  const assietteRetraite = Math.max(tns.assiette, 450 * SMIC_HORAIRE_BRUT_JANVIER_2026);
  const trimestres = Math.max(0, Math.min(4, Math.floor(assietteRetraite / REVENU_PAR_TRIMESTRE)));
  // Revenu avant cotisations donnant une assiette de 4 trimestres (assiette = revenu − 26 %).
  const seuil4 = Math.round((4 * REVENU_PAR_TRIMESTRE) / 0.74);
  return {
    totalCotisations: r2(tns.total),
    cotisationRetraiteBase: r2(base),
    cotisationRetraiteComplementaire: r2(compl),
    cotisationRetraite: r2(base + compl),
    cotisationPrevoyance: r2(prevoyance),
    total: r2(base + compl + prevoyance),
    trimestres,
    seuil4Trimestres: seuil4,
    indemniteJournaliere: r2(indemniteJournaliere(tns.assiette, profession)),
    repartitionConnue: true,
    lignes: tns.lignes.map((l) => ({ label: l.label, montant: l.montant })),
    message:
      trimestres >= 4
        ? "Votre revenu valide 4 trimestres de retraite de base."
        : `Les cotisations minimales valident ${trimestres} trimestre(s) ; il faut environ ${seuil4.toLocaleString("fr-FR")} € de revenu annuel pour en valider 4.`,
  };
}
