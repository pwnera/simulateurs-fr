/**
 * Impôt sur le revenu : barème progressif, quotient familial (avec plafonnement) et décote.
 * Barème 2026 applicable aux revenus 2025 (voir lib/constants/impot-revenu.ts).
 * @see https://www.service-public.gouv.fr/particuliers/vosdroits/F1419
 */
import {
  ABATTEMENT_10_MAX,
  ABATTEMENT_10_MIN,
  BAREME_IR_2026,
  BAREME_IR_YEAR,
  type BaremeIR,
} from "../constants/impot-revenu.js";

export { BAREME_IR_YEAR };

/** Impôt d'une part selon le barème progressif. */
function impotUnePart(revenuParPart: number, tranches: BaremeIR["tranches"]): number {
  if (revenuParPart <= 0) return 0;
  let impot = 0;
  let prevMax = 0;
  for (const { max, taux } of tranches) {
    const haut = Math.min(revenuParPart, max);
    if (haut > prevMax) impot += (haut - prevMax) * taux;
    if (revenuParPart <= max) break;
    prevMax = max;
  }
  return impot;
}

/** Impôt brut du foyer pour un nombre de parts (sans plafonnement). */
function impotParts(revenuImposable: number, nbParts: number, tranches: BaremeIR["tranches"]): number {
  return impotUnePart(revenuImposable / nbParts, tranches) * nbParts;
}

export interface ImpotRevenuInput {
  /** Revenu net imposable du foyer (après abattement de 10 % ou frais réels). */
  revenuImposable: number;
  /** Nombre de parts fiscales (1 célibataire, 2 couple, + 0,5 par enfant…). */
  nbParts?: number;
  /** Couple marié / pacsé (imposition commune). Défaut : nbParts ≥ 2. */
  couple?: boolean;
  /** Défaut : barème 2026 (revenus 2025). */
  bareme?: BaremeIR;
}

export interface ImpotRevenuResult {
  /** Impôt après quotient familial (plafonné), avant décote. */
  impotBrut: number;
  decote: number;
  /** Impôt dû. */
  impotNet: number;
  /** Taux marginal d'imposition (par part). */
  tauxMarginal: number;
  /** Taux moyen = impôt net / revenu imposable. */
  tauxMoyen: number;
  /** Plafonnement du quotient familial appliqué. */
  plafonnementQF: boolean;
}

export function calculImpotRevenu(input: ImpotRevenuInput): ImpotRevenuResult {
  const revenu = Math.max(0, input.revenuImposable);
  const nbParts = Math.max(1, input.nbParts ?? 1);
  const couple = input.couple ?? nbParts >= 2;
  const partsBase = couple ? 2 : 1;
  const { tranches, decote: decoteBareme, plafondQfDemiPart } = input.bareme ?? BAREME_IR_2026;

  const impotAvecParts = impotParts(revenu, nbParts, tranches);
  let impotBrut = impotAvecParts;
  let plafonnementQF = false;
  if (nbParts > partsBase) {
    const impotBase = impotParts(revenu, partsBase, tranches);
    const avantageMax = (nbParts - partsBase) * 2 * plafondQfDemiPart;
    if (impotBase - impotAvecParts > avantageMax) {
      impotBrut = impotBase - avantageMax;
      plafonnementQF = true;
    }
  }

  const d = couple ? decoteBareme.couple : decoteBareme.celibataire;
  const decote = impotBrut > 0 && impotBrut < d.seuil ? Math.min(impotBrut, Math.max(0, d.forfait - decoteBareme.taux * impotBrut)) : 0;
  const impotNet = Math.max(0, impotBrut - decote);

  const parPart = revenu / nbParts;
  const tranche = tranches.find((t) => parPart <= t.max) ?? tranches[tranches.length - 1];
  return {
    impotBrut: Math.round(impotBrut),
    decote: Math.round(decote),
    impotNet: Math.round(impotNet),
    tauxMarginal: tranche.taux,
    tauxMoyen: revenu > 0 ? impotNet / revenu : 0,
    plafonnementQF,
  };
}

/** Abattement forfaitaire de 10 % pour frais professionnels (min / max légaux). */
export function abattementFraisPro(salairesAnnuels: number): number {
  if (salairesAnnuels <= 0) return 0;
  return Math.min(salairesAnnuels, ABATTEMENT_10_MAX, Math.max(ABATTEMENT_10_MIN, salairesAnnuels * 0.1));
}

/**
 * Estime le taux de prélèvement à la source (en %) à partir d'un revenu annuel.
 * Le taux est rapporté au revenu saisi (net imposable), comme le taux personnalisé du bulletin.
 *
 * @param netAnnuel - Revenu annuel (net imposable pour un salarié)
 * @param nbParts - Nombre de parts fiscales (défaut 1)
 * @param options.appliquerAbattement10 - Applique l'abattement de 10 % (salaires) avant le barème
 * @returns Taux en % (0 à 45)
 */
export function estimerTauxPrelevementSource(
  netAnnuel: number,
  nbParts = 1,
  options?: { appliquerAbattement10?: boolean }
): number {
  if (netAnnuel <= 0 || nbParts <= 0) return 0;
  const revenuImposable = options?.appliquerAbattement10 ? netAnnuel - abattementFraisPro(netAnnuel) : netAnnuel;
  const { impotNet } = calculImpotRevenu({ revenuImposable, nbParts });
  const taux = (impotNet / netAnnuel) * 100;
  return Math.min(45, Math.max(0, Math.round(taux * 100) / 100));
}

/**
 * Arrondit le taux au pas du slider (0.5 %) pour affichage cohérent.
 */
export function roundTauxToSliderStep(taux: number, step = 0.5): number {
  return Math.round(taux / step) * step;
}
