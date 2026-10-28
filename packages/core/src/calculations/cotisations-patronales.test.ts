import { describe, it, expect } from "vitest";
import { coefficientRGDU, cotisationsPatronales, brutDepuisCoutEmployeur } from "./cotisations-patronales.js";

describe("RGDU 2026", () => {
  it("maximum at the SMIC, zero from 3 SMIC", () => {
    expect(coefficientRGDU(21876.4)).toBe(0.3981);
    expect(coefficientRGDU(21876.4, true)).toBe(0.4021);
    expect(coefficientRGDU(3 * 21876.4)).toBe(0);
    const mid = coefficientRGDU(2 * 21876.4);
    expect(mid).toBeGreaterThan(0.02);
    expect(mid).toBeLessThan(0.3981);
  });
});

describe("cotisationsPatronales", () => {
  it("employer cost at the SMIC is close to brut + 4 % after RGDU", () => {
    const r = cotisationsPatronales({ brut: 1823.03, effectif11Plus: false, tauxAtmp: 0.01 });
    // Les cotisations couvertes par la RGDU (39,81 %) sont presque entièrement exonérées au SMIC
    expect(r.tauxEffectif).toBeLessThan(0.08);
  });

  it("≈ 44-46 % for a cadre above 3 SMIC", () => {
    const r = cotisationsPatronales({ brut: 6000, cadre: true, effectif50Plus: true, tauxAtmp: 0.01 });
    expect(r.reductionGenerale).toBe(0);
    expect(r.tauxEffectif).toBeGreaterThan(0.4);
    expect(r.tauxEffectif).toBeLessThan(0.47);
  });

  it("président de SASU : no chômage, no RGDU", () => {
    const r = cotisationsPatronales({ brut: 2000, cadre: true, assuranceChomage: false });
    expect(r.lignes.some((l) => l.id === "chomage")).toBe(false);
    expect(r.reductionGenerale).toBe(0);
  });

  it("inverts an employer cost", () => {
    const opts = { cadre: true, effectif50Plus: true, tauxAtmp: 0.01 };
    const b = brutDepuisCoutEmployeur(9000, opts);
    expect(cotisationsPatronales({ ...opts, brut: b }).coutEmployeur).toBeCloseTo(9000, 0);
  });
});

describe("écarts vérifiés avec le moteur URSSAF (modele-social 11.1.0)", () => {
  it("temps partiel : SMIC de la RGDU proratisé (même coefficient qu'un temps plein équivalent)", () => {
    expect(coefficientRGDU(1250 * 12, false, 0.5)).toBe(coefficientRGDU(2500 * 12));
    const plein = cotisationsPatronales({ brut: 2500 });
    const mi = cotisationsPatronales({ brut: 1250, tempsTravail: 0.5 });
    expect(mi.reductionGenerale).toBeCloseTo(plein.reductionGenerale / 2, 1);
    expect(mi.coutEmployeur).toBeCloseTo(plein.coutEmployeur / 2, 0);
  });

  it("forfait social de 8 % sur la prévoyance cadre à partir de 11 salariés", () => {
    const avec = cotisationsPatronales({ brut: 8000, cadre: true });
    const sans = cotisationsPatronales({ brut: 8000, cadre: true, effectif11Plus: false });
    expect(avec.lignes.find((l) => l.id === "forfait-social")?.montant).toBe(4.81);
    expect(sans.lignes.find((l) => l.id === "forfait-social")).toBeUndefined();
    // Coût URSSAF 11 548,65 € (effectif 19) : identique au centime près.
    expect(avec.coutEmployeur).toBeCloseTo(11548.65, 1);
  });

  it("au-dessus de 3 SMIC, coût employeur identique à l'URSSAF (non-cadre 6 000 €)", () => {
    expect(cotisationsPatronales({ brut: 6000 }).coutEmployeur).toBeCloseTo(8611.56, 1);
  });
});

