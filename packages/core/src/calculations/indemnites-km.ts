/**
 * Indemnités kilométriques : barème fiscal (frais réels) et comparaison avec l'abattement de 10 %.
 */
import {
  BAREME_KM,
  MAJORATION_ELECTRIQUE,
  DISTANCE_DOMICILE_TRAVAIL_MAX,
  type CategorieKm,
  type TrancheKm,
  type TypeVehicule,
} from "../constants/bareme-kilometrique.js";
import { ABATTEMENT_10_MIN, ABATTEMENT_10_MAX } from "../constants/impot-revenu.js";

export interface IndemnitesKMInput {
  puissanceFiscale: number; // CV
  distanceAnnuelle: number; // km
  typeVehicule?: TypeVehicule;
  electrique?: boolean;
  /** Salaires nets imposables annuels (pour comparer avec l'abattement de 10 %). */
  salairesNetsImposables?: number;
  /** Autres frais réels déductibles (repas, formation…) ajoutés à la comparaison. */
  autresFraisReels?: number;
}

export interface IndemnitesKMResult {
  montantAnnuelNonImposable: number;
  /** Montant avant majoration électrique. */
  montantBase: number;
  majorationElectrique: number;
  categorie: CategorieKm;
  trancheIndex: number;
  /** Formule appliquée, ex. « d × 0,374 + 1 457 ». */
  formule: string;
  tranche: string;
  /** Abattement forfaitaire de 10 % correspondant aux salaires saisis (si fournis). */
  abattement10?: number;
  /** Frais réels totaux (IK + autres frais). */
  totalFraisReels?: number;
  fraisReelsPlusAvantageux?: boolean;
}

export function getCategorie(type: TypeVehicule, cv: number): CategorieKm {
  const cats = BAREME_KM[type];
  return cats.find((c) => cv >= c.cvMin && cv <= c.cvMax) ?? (cv < cats[0].cvMin ? cats[0] : cats[cats.length - 1]);
}

const TRANCHE_LABELS: Record<"voiture" | "deuxRoues", [string, string, string]> = {
  voiture: ["jusqu'à 5 000 km", "de 5 001 à 20 000 km", "au-delà de 20 000 km"],
  deuxRoues: ["jusqu'à 3 000 km", "de 3 001 à 6 000 km", "au-delà de 6 000 km"],
};

function trancheLabel(type: TypeVehicule, i: number): string {
  return TRANCHE_LABELS[type === "voiture" ? "voiture" : "deuxRoues"][i];
}

function formatCoef(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export function formuleTranche(t: TrancheKm): string {
  return t.b > 0 ? `d × ${formatCoef(t.a)} + ${t.b.toLocaleString("fr-FR")} €` : `d × ${formatCoef(t.a)}`;
}

/** Distance annuelle domicile-travail (aller-retour), plafonnée à 40 km aller sauf justification. */
export function distanceDomicileTravail(kmAller: number, jours: number, plafonner = true): number {
  const aller = plafonner ? Math.min(kmAller, DISTANCE_DOMICILE_TRAVAIL_MAX) : kmAller;
  return Math.max(0, aller) * 2 * Math.max(0, jours);
}

/** Abattement forfaitaire de 10 % sur les salaires (min / max de l'année). */
export function abattementForfaitaire10(salairesNetsImposables: number): number {
  if (salairesNetsImposables <= 0) return 0;
  return Math.min(ABATTEMENT_10_MAX, Math.max(ABATTEMENT_10_MIN, salairesNetsImposables * 0.1), salairesNetsImposables);
}

export function indemnitesKilometriques(input: IndemnitesKMInput): IndemnitesKMResult {
  const type = input.typeVehicule ?? "voiture";
  const d = Math.max(0, input.distanceAnnuelle);
  const categorie = getCategorie(type, input.puissanceFiscale);
  const trancheIndex = categorie.tranches.findIndex((t) => d <= t.jusqua);
  const t = categorie.tranches[trancheIndex];
  const base = d * t.a + (d > 0 ? t.b : 0);
  const majoration = input.electrique ? base * MAJORATION_ELECTRIQUE : 0;
  const montant = base + majoration;
  const result: IndemnitesKMResult = {
    montantAnnuelNonImposable: Math.round(montant * 100) / 100,
    montantBase: Math.round(base * 100) / 100,
    majorationElectrique: Math.round(majoration * 100) / 100,
    categorie,
    trancheIndex,
    formule: formuleTranche(t),
    tranche: `Barème ${categorie.label}, ${trancheLabel(type, trancheIndex)}`,
  };
  if (input.salairesNetsImposables != null && input.salairesNetsImposables > 0) {
    const abattement = abattementForfaitaire10(input.salairesNetsImposables);
    const total = montant + Math.max(0, input.autresFraisReels ?? 0);
    result.abattement10 = Math.round(abattement * 100) / 100;
    result.totalFraisReels = Math.round(total * 100) / 100;
    result.fraisReelsPlusAvantageux = total > abattement;
  }
  return result;
}
