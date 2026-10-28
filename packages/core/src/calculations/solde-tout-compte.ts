/**
 * Solde de tout compte : sommes versées à la fin du contrat (estimation).
 *
 * - Salaire du dernier mois au prorata des jours ouvrés travaillés.
 * - Indemnité compensatrice de congés payés (art. L3141-28) : plus favorable entre maintien de
 *   salaire et règle du dixième.
 * - Indemnité compensatrice de préavis (art. L1234-5) si l'employeur dispense le salarié de préavis.
 * - Prorata de 13e mois si le contrat ou la convention le prévoit.
 * - Indemnité de fin de contrat (prime de précarité) en CDD : 10 % de la rémunération brute totale
 *   (art. L1243-8), sauf exceptions (CDD saisonnier, étudiant, refus de CDI…). Elle entre dans
 *   l'assiette de l'indemnité compensatrice de congés payés.
 * - Indemnité de rupture (licenciement, rupture conventionnelle) : saisie par l'utilisateur ; dans la
 *   limite du montant légal ou conventionnel elle est exonérée de cotisations, CSG-CRDS et impôt.
 */
import { indemniteConges, type Decompte } from "./conges.js";

export const TAUX_PRIME_PRECARITE = 0.1;

export interface SoldeToutCompteInput {
  /** Salaire brut mensuel. */
  salaireBrutMensuel: number;
  joursTravaillesDansLeMois: number;
  /** Jours ouvrés du mois de départ (souvent 20 à 23). */
  joursOuvresMois: number;
  joursCongesNonPris: number;
  decompteConges?: Decompte;
  /** Jours acquis sur la période (base du dixième). Défaut : 30 ouvrables / 25 ouvrés. */
  joursAcquisPeriode?: number;
  /** Rémunération brute de la période de référence des congés (règle du dixième). */
  remunerationReferenceConges?: number;
  /** Préavis non effectué à l'initiative de l'employeur (mois). */
  preavisNonEffectueMois?: number;
  /** 13e mois : nombre de mois travaillés dans l'année en cours (0 = pas de 13e mois). */
  moisPourTreizieme?: number;
  /** CDD : rémunération brute totale versée pendant le contrat (prime de précarité). */
  remunerationTotaleCDD?: number;
  /** Indemnité de rupture (licenciement, rupture conventionnelle) en brut. */
  indemniteRupture?: number;
  /** Taux de cotisations salariales pour l'estimation du net. Défaut 22 %. */
  tauxCotisations?: number;
}

export interface SoldeLigne {
  id: "prorata" | "conges" | "preavis" | "treizieme" | "precarite" | "rupture";
  label: string;
  brut: number;
  net: number;
  /** Exonérée de cotisations (indemnité de rupture dans la limite légale). */
  exoneree?: boolean;
}

export interface SoldeToutCompteResult {
  lignes: SoldeLigne[];
  totalBrut: number;
  totalNetEstime: number;
  /** Compatibilité avec l'ancienne API. */
  prorataSalaire: number;
  indemniteConges: number;
  totalEstime: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function soldeToutCompte(input: SoldeToutCompteInput): SoldeToutCompteResult {
  const salaire = Math.max(0, input.salaireBrutMensuel);
  const taux = input.tauxCotisations ?? 0.22;
  const net = (b: number) => b * (1 - taux);
  const lignes: SoldeLigne[] = [];

  const jo = input.joursOuvresMois > 0 ? input.joursOuvresMois : 22;
  const jt = Math.max(0, Math.min(jo, input.joursTravaillesDansLeMois));
  const prorata = (salaire * jt) / jo;
  lignes.push({ id: "prorata", label: "Salaire du dernier mois (prorata)", brut: r2(prorata), net: r2(net(prorata)) });

  // CDD : la prime de précarité entre dans l'assiette de l'indemnité de congés (règle du dixième).
  const remuCdd = Math.max(0, input.remunerationTotaleCDD ?? 0);
  const precarite = remuCdd * TAUX_PRIME_PRECARITE;

  const decompte = input.decompteConges ?? "ouvres";
  const conges = Math.max(0, input.joursCongesNonPris);
  let ic = 0;
  if (conges > 0 && salaire > 0) {
    ic = indemniteConges({
      decompte,
      jours: conges,
      // CDD : sauf saisie contraire, on suppose qu'aucun congé n'a été pris (10 % de la rémunération totale).
      joursAcquisPeriode: input.joursAcquisPeriode ?? (remuCdd > 0 ? conges : decompte === "ouvres" ? 25 : 30),
      salaireBrutMensuel: salaire,
      remunerationReference:
        input.remunerationReferenceConges ?? (remuCdd > 0 ? remuCdd + precarite : undefined),
    }).indemnite;
    lignes.push({ id: "conges", label: "Indemnité compensatrice de congés payés", brut: r2(ic), net: r2(net(ic)) });
  }

  const preavisMois = Math.max(0, input.preavisNonEffectueMois ?? 0);
  if (preavisMois > 0) {
    const p = salaire * preavisMois;
    lignes.push({ id: "preavis", label: "Indemnité compensatrice de préavis", brut: r2(p), net: r2(net(p)) });
  }

  const moisTreizieme = Math.max(0, Math.min(12, input.moisPourTreizieme ?? 0));
  if (moisTreizieme > 0) {
    const t = (salaire * moisTreizieme) / 12;
    lignes.push({ id: "treizieme", label: "13e mois au prorata", brut: r2(t), net: r2(net(t)) });
  }

  if (precarite > 0) {
    lignes.push({ id: "precarite", label: "Indemnité de fin de CDD (10 %)", brut: r2(precarite), net: r2(net(precarite)) });
  }

  const rupture = Math.max(0, input.indemniteRupture ?? 0);
  if (rupture > 0) {
    lignes.push({ id: "rupture", label: "Indemnité de rupture", brut: r2(rupture), net: r2(rupture), exoneree: true });
  }

  const totalBrut = lignes.reduce((s, l) => s + l.brut, 0);
  const totalNet = lignes.reduce((s, l) => s + l.net, 0);
  return {
    lignes,
    totalBrut: r2(totalBrut),
    totalNetEstime: r2(totalNet),
    prorataSalaire: r2(prorata),
    indemniteConges: r2(ic),
    totalEstime: r2(totalBrut),
  };
}
