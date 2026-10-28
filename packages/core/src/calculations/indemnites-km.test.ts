import { describe, it, expect } from "vitest";
import { indemnitesKilometriques, distanceDomicileTravail, abattementForfaitaire10 } from "./indemnites-km.js";

describe("indemnitesKilometriques (barème revenus 2025)", () => {
  it("first tranche: d × a", () => {
    const r = indemnitesKilometriques({ puissanceFiscale: 5, distanceAnnuelle: 4000 });
    expect(r.tranche).toContain("5 000");
    expect(r.montantAnnuelNonImposable).toBeCloseTo(4000 * 0.636, 2);
  });

  it("second tranche: d × a + b", () => {
    const r = indemnitesKilometriques({ puissanceFiscale: 6, distanceAnnuelle: 15000 });
    expect(r.tranche).toContain("5 001");
    expect(r.montantAnnuelNonImposable).toBeCloseTo(15000 * 0.374 + 1457, 2);
    expect(r.formule.replace(/\s/g, " ")).toBe("d × 0,374 + 1 457 €");
  });

  it("third tranche and 7 CV and more", () => {
    const r = indemnitesKilometriques({ puissanceFiscale: 8, distanceAnnuelle: 25000 });
    expect(r.tranche).toContain("20 000");
    expect(r.montantAnnuelNonImposable).toBeCloseTo(25000 * 0.47, 2);
  });

  it("is continuous at tranche boundaries (≈)", () => {
    const a = indemnitesKilometriques({ puissanceFiscale: 4, distanceAnnuelle: 5000 }).montantAnnuelNonImposable;
    const b = indemnitesKilometriques({ puissanceFiscale: 4, distanceAnnuelle: 5001 }).montantAnnuelNonImposable;
    expect(Math.abs(b - a)).toBeLessThan(5);
  });

  it("adds 20 % for electric vehicles", () => {
    const r = indemnitesKilometriques({ puissanceFiscale: 3, distanceAnnuelle: 10000, electrique: true });
    const base = 10000 * 0.316 + 1065;
    expect(r.montantBase).toBeCloseTo(base, 2);
    expect(r.montantAnnuelNonImposable).toBeCloseTo(base * 1.2, 2);
  });

  it("motos and cyclomoteurs", () => {
    expect(indemnitesKilometriques({ typeVehicule: "moto", puissanceFiscale: 4, distanceAnnuelle: 2000 }).montantAnnuelNonImposable).toBeCloseTo(936, 2);
    expect(indemnitesKilometriques({ typeVehicule: "moto", puissanceFiscale: 7, distanceAnnuelle: 5000 }).montantAnnuelNonImposable).toBeCloseTo(5000 * 0.079 + 1583, 2);
    expect(indemnitesKilometriques({ typeVehicule: "cyclomoteur", puissanceFiscale: 1, distanceAnnuelle: 8000 }).montantAnnuelNonImposable).toBeCloseTo(8000 * 0.198, 2);
  });

  it("compares with the 10 % abattement", () => {
    const r = indemnitesKilometriques({ puissanceFiscale: 5, distanceAnnuelle: 12000, salairesNetsImposables: 30000 });
    expect(r.abattement10).toBe(3000);
    expect(r.fraisReelsPlusAvantageux).toBe(true);
  });
});

describe("helpers", () => {
  it("domicile-travail distance is capped at 40 km one way", () => {
    expect(distanceDomicileTravail(25, 200)).toBe(10000);
    expect(distanceDomicileTravail(60, 200)).toBe(16000);
    expect(distanceDomicileTravail(60, 200, false)).toBe(24000);
  });

  it("abattement 10 % min/max", () => {
    expect(abattementForfaitaire10(2000)).toBe(509);
    expect(abattementForfaitaire10(500)).toBe(500);
  });
});
