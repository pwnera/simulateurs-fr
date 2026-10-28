/**
 * Barème kilométrique fiscal (frais réels) applicable aux revenus 2025 (déclaration 2026).
 * Inchangé depuis l'arrêté du 27 mars 2023 (BOI-BAREME-000001-20230720).
 * Formule par tranche : montant = d × a + b (d = distance professionnelle annuelle en km).
 * Véhicules 100 % électriques : montant majoré de 20 %.
 * @see https://bofip.impots.gouv.fr/bofip/2185-PGP.html/identifiant=BOI-BAREME-000001-20230720
 */
export const ANNEE_REVENUS_BAREME_KM = 2025;
export const MAJORATION_ELECTRIQUE = 0.2;

export type TypeVehicule = "voiture" | "moto" | "cyclomoteur";

export interface TrancheKm {
  /** Borne haute incluse de la tranche (km). */
  jusqua: number;
  a: number;
  b: number;
}

export interface CategorieKm {
  id: string;
  label: string;
  /** Puissance fiscale minimale / maximale couverte (CV). */
  cvMin: number;
  cvMax: number;
  tranches: [TrancheKm, TrancheKm, TrancheKm];
}

const voiture = (id: string, label: string, cvMin: number, cvMax: number, t: number[]): CategorieKm => ({
  id,
  label,
  cvMin,
  cvMax,
  tranches: [
    { jusqua: 5000, a: t[0], b: 0 },
    { jusqua: 20000, a: t[1], b: t[2] },
    { jusqua: Infinity, a: t[3], b: 0 },
  ],
});

const deuxRoues = (id: string, label: string, cvMin: number, cvMax: number, t: number[]): CategorieKm => ({
  id,
  label,
  cvMin,
  cvMax,
  tranches: [
    { jusqua: 3000, a: t[0], b: 0 },
    { jusqua: 6000, a: t[1], b: t[2] },
    { jusqua: Infinity, a: t[3], b: 0 },
  ],
});

export const BAREME_KM: Record<TypeVehicule, CategorieKm[]> = {
  voiture: [
    voiture("v3", "3 CV et moins", 0, 3, [0.529, 0.316, 1065, 0.37]),
    voiture("v4", "4 CV", 4, 4, [0.606, 0.34, 1330, 0.407]),
    voiture("v5", "5 CV", 5, 5, [0.636, 0.357, 1395, 0.427]),
    voiture("v6", "6 CV", 6, 6, [0.665, 0.374, 1457, 0.447]),
    voiture("v7", "7 CV et plus", 7, Infinity, [0.697, 0.394, 1515, 0.47]),
  ],
  moto: [
    deuxRoues("m2", "1 ou 2 CV", 0, 2, [0.395, 0.099, 891, 0.248]),
    deuxRoues("m5", "3, 4 ou 5 CV", 3, 5, [0.468, 0.082, 1158, 0.275]),
    deuxRoues("m6", "Plus de 5 CV", 6, Infinity, [0.606, 0.079, 1583, 0.343]),
  ],
  cyclomoteur: [deuxRoues("c", "Cyclomoteur (≤ 50 cm³)", 0, Infinity, [0.315, 0.079, 711, 0.198])],
};

/** Distance domicile-travail retenue au-delà de laquelle il faut justifier (km aller). */
export const DISTANCE_DOMICILE_TRAVAIL_MAX = 40;
