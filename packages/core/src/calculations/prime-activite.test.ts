import { describe, it, expect } from "vitest";
import { primeActivite, coefficientFoyer, bonificationIndividuelle } from "./prime-activite.js";

describe("prime d'activité (1er avril 2026)", () => {
  it("montant forfaitaire majoré selon le foyer", () => {
    expect(638.28 * coefficientFoyer(false, 0)).toBeCloseTo(638.28, 2);
    expect(638.28 * coefficientFoyer(true, 0)).toBeCloseTo(957.42, 2);
    expect(638.28 * coefficientFoyer(false, 2)).toBeCloseTo(1148.9, 1);
    expect(638.28 * coefficientFoyer(true, 2)).toBeCloseTo(1340.39, 1);
    expect(638.28 * coefficientFoyer(false, 3)).toBeCloseTo(1404.22, 1);
  });

  it("bonification : 0 sous 59 × SMIC horaire, 240,63 € au-delà de 138 × SMIC", () => {
    expect(bonificationIndividuelle(700)).toBe(0);
    expect(bonificationIndividuelle(1800)).toBeCloseTo(240.63, 1);
    const mid = bonificationIndividuelle(1200);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(240.63);
  });

  it("personne seule sans aide au logement (ordres de grandeur publiés)", () => {
    // 1 000 € → ≈ 304,51 € ; 1 700 € → ≈ 196,36 € ; 2 000 € → ≈ 75,91 € (avant CRDS)
    expect(primeActivite({ revenusMensuels: 1000 }).montantMensuelEstime).toBeCloseTo(304.51 * 0.995, 0);
    expect(primeActivite({ revenusMensuels: 1700 }).montantMensuelEstime).toBeCloseTo(196.36 * 0.995, 0);
    expect(primeActivite({ revenusMensuels: 2000 }).montantMensuelEstime).toBeCloseTo(75.91 * 0.995, 0);
  });

  it("plafond ≈ 2 190 € net pour une personne seule ; forfait logement le réduit", () => {
    expect(primeActivite({ revenusMensuels: 2200 }).eligible).toBe(false);
    const sans = primeActivite({ revenusMensuels: 1300 });
    const avec = primeActivite({ revenusMensuels: 1300, logement: "locataire-aide" });
    expect(sans.montantMensuelEstime - avec.montantMensuelEstime).toBeCloseTo(76.59 * 0.995, 1);
  });

  it("pas de prime sans revenus d'activité", () => {
    expect(primeActivite({ revenusMensuels: 0, autresRessources: 500 }).eligible).toBe(false);
  });

  it("couple avec enfants : deux bonifications", () => {
    const r = primeActivite({ revenusMensuels: 1500, revenusConjoint: 1000, couple: true, nbEnfants: 2 });
    expect(r.bonification).toBeGreaterThan(240);
    expect(r.eligible).toBe(true);
  });
});
