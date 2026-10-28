/**
 * Aide au logement en location (APL / ALF / ALS) – secteur locatif ordinaire, métropole.
 *
 * Aide = L + C − Pp − 5 €, avec :
 * - L : loyer réel (hors charges) plafonné selon la zone et la composition du foyer ;
 * - C : forfait charges ;
 * - Pp = P0 + Tp × (R − R0) : participation personnelle, R = ressources annuelles arrondies à la centaine
 *   supérieure, P0 = max(8,5 % × (L + C), 40,01 €), Tp = TF + TL.
 * Dégressivité pour les loyers très élevés, CRDS de 0,5 % sur le montant versé.
 */
import {
  APL_CRDS,
  APL_DEGRESSIVITE,
  APL_ETUDIANT,
  APL_FORFAIT_CHARGES,
  APL_LOYERS_PLAFONDS,
  APL_COEF_COLOCATION,
  APL_MINORATION,
  APL_P0,
  APL_R0,
  APL_TF,
  APL_TL,
  AL_SEUIL_VERSEMENT,
  type ZoneAPL,
} from "../constants/aides-caf.js";

export interface APLInput {
  loyerMensuel: number;
  /** Revenus nets mensuels du foyer (salaires, chômage…). Convertis en ressources annuelles imposables. */
  revenusMensuels: number;
  /** Compatibilité : nombre de personnes du foyer (adultes + enfants). */
  nbPersonnes?: number;
  nbEnfants?: number;
  couple?: boolean;
  zone?: ZoneAPL;
  colocation?: boolean;
  etudiant?: boolean;
  boursier?: boolean;
  /** Ressources annuelles déjà connues (net imposable après abattement) : remplace la conversion. */
  ressourcesAnnuelles?: number;
}

export interface APLResult {
  aplEstimee: number;
  /** Montant avant CRDS. */
  aideBrute: number;
  loyerRetenu: number;
  loyerPlafond: number;
  forfaitCharges: number;
  ressourcesRetenues: number;
  r0: number;
  p0: number;
  tauxParticipation: number;
  participationPersonnelle: number;
  degressivite: number;
  eligible: boolean;
  message: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Revenus nets mensuels → ressources annuelles retenues (net imposable − 10 %), arrondies à la centaine supérieure. */
export function ressourcesDepuisNetMensuel(netMensuel: number): number {
  // Net imposable ≈ net × 1,036 (CSG non déductible + CRDS), puis abattement de 10 % pour frais professionnels.
  return Math.max(0, netMensuel) * 12 * 1.036 * 0.9;
}

function loyerPlafond(zone: ZoneAPL, couple: boolean, pac: number): number {
  const [seul, coupleSans, unePac, parPac] = APL_LOYERS_PLAFONDS[zone];
  if (pac <= 0) return couple ? coupleSans : seul;
  return unePac + (pac - 1) * parPac;
}

function tauxFamille(couple: boolean, pac: number): number {
  if (pac <= 0) return couple ? APL_TF.couple : APL_TF.isole;
  if (pac <= 6) return APL_TF.pac[pac - 1];
  return APL_TF.pac[5] + (pac - 6) * APL_TF.parPacSupp;
}

function r0(couple: boolean, pac: number): number {
  if (pac <= 0) return couple ? APL_R0.couple : APL_R0.isole;
  if (pac <= 6) return APL_R0.pac[pac - 1];
  return APL_R0.pac[5] + (pac - 6) * APL_R0.parPacSupp;
}

function tauxLoyer(rl: number): number {
  const RL = Math.round(rl * 10000) / 10000;
  if (RL < APL_TL.seuil1) return 0;
  if (RL < APL_TL.seuil2) return Math.round(APL_TL.taux1 * (RL - APL_TL.seuil1) * 1e5) / 1e5;
  return Math.round((APL_TL.taux1 * (APL_TL.seuil2 - APL_TL.seuil1) + APL_TL.taux2 * (RL - APL_TL.seuil2)) * 1e5) / 1e5;
}

export function simulationAPL(input: APLInput): APLResult {
  const zone = input.zone ?? "2";
  const pac = Math.max(0, Math.floor(input.nbEnfants ?? 0));
  const couple = input.couple ?? Math.max(1, input.nbPersonnes ?? 1) - pac >= 2;
  const loyer = Math.max(0, input.loyerMensuel);

  let plafond = loyerPlafond(zone, couple, pac);
  if (input.colocation) plafond *= APL_COEF_COLOCATION;
  const L = Math.min(loyer, plafond);
  const C = input.colocation
    ? (couple ? APL_FORFAIT_CHARGES.colocationCouple : APL_FORFAIT_CHARGES.colocationIsole) + pac * APL_FORFAIT_CHARGES.parPersonneACharge
    : APL_FORFAIT_CHARGES.general + pac * APL_FORFAIT_CHARGES.parPersonneACharge;

  let R = input.ressourcesAnnuelles ?? ressourcesDepuisNetMensuel(input.revenusMensuels);
  if (input.etudiant) {
    R = Math.max(R, APL_ETUDIANT.forfaitRessources - (input.boursier ? APL_ETUDIANT.minorationBoursier : 0));
  }
  R = Math.ceil(R / 100) * 100;
  const R0 = r0(couple, pac);

  const P0 = Math.max(APL_P0.taux * (L + C), APL_P0.forfait);
  const loyerReference = loyerPlafond("2", couple, pac) * (input.colocation ? APL_COEF_COLOCATION : 1);
  const TL = tauxLoyer(loyerReference > 0 ? L / loyerReference : 0);
  const Tp = tauxFamille(couple, pac) + TL;
  const Pp = P0 + Tp * Math.max(0, R - R0);

  let aide = L + C - Pp - APL_MINORATION;
  // Dégressivité : loyers très supérieurs au plafond
  const [d1, d2] = APL_DEGRESSIVITE[zone];
  let degressivite = 0;
  if (aide > 0 && loyer > d1 * plafond) {
    const ratio = Math.min(1, (loyer - d1 * plafond) / ((d2 - d1) * plafond));
    degressivite = aide * ratio;
    aide -= degressivite;
  }
  aide = Math.max(0, aide);
  const versee = aide * (1 - APL_CRDS);
  const eligible = versee > 0;

  let message: string;
  if (!eligible) message = "Vos ressources dépassent le seuil au-delà duquel l'aide au logement est nulle pour ce loyer et cette composition familiale.";
  else if (versee < AL_SEUIL_VERSEMENT) message = "Montant très faible : pour une ALF ou une ALS, les aides inférieures à 10 € ne sont pas versées.";
  else message = "Estimation selon le barème officiel. La CAF calculera le montant définitif à partir de vos ressources réelles des 12 derniers mois.";

  return {
    aplEstimee: r2(versee),
    aideBrute: r2(aide),
    loyerRetenu: r2(L),
    loyerPlafond: r2(plafond),
    forfaitCharges: r2(C),
    ressourcesRetenues: R,
    r0: R0,
    p0: r2(P0),
    tauxParticipation: Tp,
    participationPersonnelle: r2(Pp),
    degressivite: r2(degressivite),
    eligible,
    message,
  };
}
