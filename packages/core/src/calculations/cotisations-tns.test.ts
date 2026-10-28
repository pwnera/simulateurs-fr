import { describe, it, expect } from "vitest";
import { assietteSocialeTNS, cotisationMaladieTNS, cotisationsTNS } from "./cotisations-tns.js";

const PASS = 48_060;

describe("assietteSocialeTNS", () => {
  it("applies the 26 % abattement within floor and ceiling", () => {
    expect(assietteSocialeTNS(50_000)).toBe(37_000);
    // plancher : 1,76 % PASS ≈ 846 €
    expect(assietteSocialeTNS(2_000)).toBeCloseTo(2_000 - 0.0176 * PASS, 2);
    // plafond : 130 % PASS = 62 478 €
    expect(assietteSocialeTNS(400_000)).toBeCloseTo(400_000 - 1.3 * PASS, 2);
  });
});

describe("cotisationMaladieTNS", () => {
  it("is zero under 20 % PASS and progressive above", () => {
    expect(cotisationMaladieTNS(0.15 * PASS)).toBe(0);
    expect(cotisationMaladieTNS(0.4 * PASS)).toBeCloseTo(0.4 * PASS * 0.015, 2);
    expect(cotisationMaladieTNS(1.1 * PASS)).toBeCloseTo(1.1 * PASS * 0.065, 2);
    expect(cotisationMaladieTNS(3 * PASS)).toBeCloseTo(3 * PASS * 0.085, 2);
  });

  it("8,5 % up to 3 PASS then 6,5 %", () => {
    expect(cotisationMaladieTNS(4 * PASS)).toBeCloseTo(3 * PASS * 0.085 + PASS * 0.065, 2);
  });
});

describe("cotisationsTNS", () => {
  it("≈ 32 % of income before contributions at 60 k€ (artisan/commerçant)", () => {
    const r = cotisationsTNS(60_000, "commercant");
    expect(r.tauxGlobal).toBeGreaterThan(0.3);
    expect(r.tauxGlobal).toBeLessThan(0.35);
    expect(r.revenuNet).toBeCloseTo(60_000 - r.total, 2);
  });

  it("≈ 31 % at 100 k€", () => {
    const r = cotisationsTNS(100_000, "liberal");
    expect(r.tauxGlobal).toBeGreaterThan(0.29);
    expect(r.tauxGlobal).toBeLessThan(0.33);
    expect(r.lignes.find((l) => l.id === "allocations-familiales")?.montant).toBeGreaterThan(0);
  });

  it("applies minimum contributions at zero income (retraite, IJ, invalidité)", () => {
    const r = cotisationsTNS(0, "artisan");
    // ≈ 967 € retraite + 96 € IJ + 72 € invalidité-décès + CFP
    expect(r.lignes.find((l) => l.id === "retraite-base")?.montant).toBeCloseTo(450 * 12.02 * 0.1787, 0);
    expect(r.total).toBeGreaterThan(1_100);
    expect(r.total).toBeLessThan(1_300);
  });

  it("Cipav professions use CNAVPL / Cipav retirement rates", () => {
    const r = cotisationsTNS(50_000, "liberal-cipav");
    expect(r.lignes.find((l) => l.id === "retraite-complementaire")?.label).toContain("Cipav");
    expect(r.tauxGlobal).toBeGreaterThan(0.2);
    expect(r.tauxGlobal).toBeLessThan(0.35);
  });
});
