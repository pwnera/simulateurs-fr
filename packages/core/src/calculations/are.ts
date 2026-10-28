/**
 * Allocation d'aide au retour à l'emploi (ARE) : montant, durée et dégressivité (estimation).
 *
 * - SJR = salaires bruts de la période de référence ÷ jours calendaires de la période d'emploi
 *   (salaires plafonnés à 4 PASS).
 * - AJ brute = max(40,4 % × SJR + 13,18 €, 57 % × SJR), au moins 32,13 €, au plus 75 % du SJR.
 * - Durée = jours d'affiliation × 0,75 (min 182 j), plafonnée selon l'âge (548 / 685 / 822 j)
 *   ou, après une rupture conventionnelle (fin de contrat à partir du 1er septembre 2026), 456 / 624 j.
 * - Dégressivité : −30 % à partir du 7e mois si moins de 55 ans et AJ > 92,57 € (plancher 92,57 €).
 * - Net : retenue retraite complémentaire 3 % du SJR, CSG/CRDS 6,7 % sur 98,25 % (taux plein).
 */
import { ARE, type TrancheAgeARE } from "../constants/chomage.js";

export interface AREInput {
  salaireJournalierReference: number;
  /** Compatibilité : true = moins de 55 ans. */
  ageMoins55?: boolean;
  trancheAge?: TrancheAgeARE;
  /** Mois travaillés sur la période de référence (24 ou 36 mois). Défaut : toute la période. */
  moisTravailles?: number;
  /** Fin de contrat par rupture conventionnelle (règles du 1er septembre 2026). */
  ruptureConventionnelle?: boolean;
}

export interface AREResult {
  sjr: number;
  /** AJ brute avant retenues. */
  allocationJournaliere: number;
  /** Formule retenue. */
  formule: "40,4 % + partie fixe" | "57 %" | "minimum" | "plafond 75 %";
  allocationMensuelle: number;
  allocationJournaliereNette: number;
  allocationMensuelleNette: number;
  retenueRetraite: number;
  csgCrds: number;
  dureeJours: number;
  dureeMaxMois: number;
  degressive: boolean;
  /** AJ brute après dégressivité (à partir du 7e mois). */
  allocationJournaliereDegressive: number;
  /** Total brut estimé sur toute la durée. */
  totalBrut: number;
  eligible: boolean;
  message: string;
  notes: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function sjrDepuisSalaire(salaireBrutMensuelMoyen: number): number {
  return r2(Math.min(ARE.sjrMax, (Math.max(0, salaireBrutMensuelMoyen) * 12) / 365));
}

function netJour(aj: number, sjr: number): { net: number; retraite: number; csg: number } {
  const retraite = Math.min(ARE.retenueRetraite * sjr, Math.max(0, aj - ARE.allocationMinimale));
  const apresRetraite = aj - retraite;
  const csg = aj >= ARE.seuilExonerationCsg ? Math.min(aj * ARE.assietteCsg * ARE.csgCrds, Math.max(0, apresRetraite - ARE.seuilExonerationCsg)) : 0;
  return { net: apresRetraite - csg, retraite, csg };
}

export function allocationChomage(input: AREInput): AREResult {
  const tranche: TrancheAgeARE = input.trancheAge ?? (input.ageMoins55 === false ? "55-56" : "moins-55");
  const sjr = Math.min(ARE.sjrMax, Math.max(0, input.salaireJournalierReference));
  const f1 = ARE.tauxFormule1 * sjr + ARE.partieFixe;
  const f2 = ARE.tauxFormule2 * sjr;
  let aj = Math.max(f1, f2);
  let formule: AREResult["formule"] = f1 >= f2 ? "40,4 % + partie fixe" : "57 %";
  if (aj < ARE.allocationMinimale) {
    aj = ARE.allocationMinimale;
    formule = "minimum";
  }
  if (aj > ARE.plafondSjr * sjr) {
    aj = ARE.plafondSjr * sjr;
    formule = "plafond 75 %";
  }

  const periode = ARE.periodeReferenceMois[tranche];
  const mois = Math.max(0, Math.min(periode, input.moisTravailles ?? periode));
  const eligible = mois >= ARE.affiliationMinMois && sjr > 0;
  const joursAffiliation = Math.round((mois * 365) / 12);
  const max = input.ruptureConventionnelle ? ARE.dureeMaxJoursRuptureConventionnelle[tranche] : ARE.dureeMaxJours[tranche];
  const dureeJours = eligible ? Math.min(max, Math.max(ARE.dureeMinJours, Math.ceil(joursAffiliation * ARE.coefficientDuree - 1e-9))) : 0;

  const { degressivite } = ARE;
  const degressive = tranche === "moins-55" && aj > degressivite.seuil && dureeJours > degressivite.apresJours;
  const ajDegressive = degressive ? Math.max(degressivite.seuil, aj * degressivite.coefficient) : aj;
  const totalBrut = degressive
    ? aj * degressivite.apresJours + ajDegressive * (dureeJours - degressivite.apresJours)
    : aj * dureeJours;

  const n = netJour(aj, sjr);
  const notes: string[] = [];
  if (degressive) notes.push(`À partir du 7e mois, l'allocation baisse de 30 % (${r2(ajDegressive).toLocaleString("fr-FR")} € / jour), sans descendre sous 92,57 €.`);
  if (input.ruptureConventionnelle) notes.push("Rupture conventionnelle : durée maximale réduite (15 mois avant 55 ans, 20,5 mois ensuite) pour une fin de contrat depuis le 1er septembre 2026.");
  notes.push("Un délai d'attente de 7 jours et d'éventuels différés (congés payés, indemnités supra-légales) s'appliquent avant le premier versement.");

  return {
    sjr: r2(sjr),
    allocationJournaliere: r2(aj),
    formule,
    allocationMensuelle: r2(aj * ARE.joursParMois),
    allocationJournaliereNette: r2(n.net),
    allocationMensuelleNette: r2(n.net * ARE.joursParMois),
    retenueRetraite: r2(n.retraite),
    csgCrds: r2(n.csg),
    dureeJours,
    dureeMaxMois: Math.round((dureeJours / (365 / 12)) * 10) / 10,
    degressive,
    allocationJournaliereDegressive: r2(ajDegressive),
    totalBrut: r2(totalBrut),
    eligible,
    message: eligible
      ? "Montant et durée définitifs fixés par France Travail après étude de votre dossier."
      : `Il faut avoir travaillé au moins ${ARE.affiliationMinMois} mois sur les ${periode} derniers mois pour ouvrir des droits.`,
    notes,
  };
}
