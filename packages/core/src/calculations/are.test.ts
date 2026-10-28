import { describe, it, expect } from "vitest";
import { allocationChomage, sjrDepuisSalaire } from "./are.js";

describe("allocationChomage (ARE 2026)", () => {
  it("uses 40,4 % SJR + 13,18 € for modest salaries", () => {
    // SJR 60 € : 40,4 % × 60 + 13,18 = 37,42 > 57 % × 60 = 34,20
    const r = allocationChomage({ salaireJournalierReference: 60 });
    expect(r.allocationJournaliere).toBe(37.42);
    expect(r.formule).toBe("40,4 % + partie fixe");
    expect(r.allocationMensuelle).toBeCloseTo(37.42 * 30, 2);
  });

  it("uses 57 % SJR for higher salaries", () => {
    const r = allocationChomage({ salaireJournalierReference: 100 });
    expect(r.allocationJournaliere).toBe(57);
    expect(r.formule).toBe("57 %");
  });

  it("applies the minimum then the 75 % cap", () => {
    // SJR 40 € : formule 29,34 € → minimum 32,13 € (sous 75 % × 40 = 30 € → plafond)
    const r = allocationChomage({ salaireJournalierReference: 40 });
    expect(r.allocationJournaliere).toBe(30);
    expect(r.formule).toBe("plafond 75 %");
    const r2 = allocationChomage({ salaireJournalierReference: 45 });
    expect(r2.allocationJournaliere).toBe(32.13);
  });

  it("caps the SJR at 4 PASS", () => {
    const r = allocationChomage({ salaireJournalierReference: 2000 });
    expect(r.sjr).toBeCloseTo((4 * 48060) / 365, 1);
    expect(r.allocationJournaliere).toBeCloseTo(r.sjr * 0.57, 1);
  });

  it("duration: 0,75 × affiliation, max 548 days under 55", () => {
    expect(allocationChomage({ salaireJournalierReference: 80 }).dureeJours).toBe(548);
    expect(allocationChomage({ salaireJournalierReference: 80, moisTravailles: 12 }).dureeJours).toBe(274);
    expect(allocationChomage({ salaireJournalierReference: 80, moisTravailles: 6 }).dureeJours).toBe(182);
    expect(allocationChomage({ salaireJournalierReference: 80, moisTravailles: 5 }).eligible).toBe(false);
  });

  it("duration for seniors: 685 days (55-56), 822 days (57+)", () => {
    expect(allocationChomage({ salaireJournalierReference: 80, trancheAge: "55-56" }).dureeJours).toBe(685);
    expect(allocationChomage({ salaireJournalierReference: 80, trancheAge: "57-plus" }).dureeJours).toBe(822);
    expect(allocationChomage({ salaireJournalierReference: 80, ageMoins55: false }).dureeJours).toBe(685);
  });

  it("rupture conventionnelle: reduced max durations", () => {
    expect(allocationChomage({ salaireJournalierReference: 80, ruptureConventionnelle: true }).dureeJours).toBe(456);
    expect(allocationChomage({ salaireJournalierReference: 80, trancheAge: "57-plus", ruptureConventionnelle: true }).dureeJours).toBe(624);
  });

  it("dégressivité under 55 when AJ > 92,57 €", () => {
    const r = allocationChomage({ salaireJournalierReference: 250 });
    expect(r.allocationJournaliere).toBe(142.5);
    expect(r.degressive).toBe(true);
    expect(r.allocationJournaliereDegressive).toBeCloseTo(99.75, 2);
    const senior = allocationChomage({ salaireJournalierReference: 250, trancheAge: "55-56" });
    expect(senior.degressive).toBe(false);
  });

  it("net: 3 % retraite + CSG/CRDS above the exemption threshold", () => {
    const r = allocationChomage({ salaireJournalierReference: 150 });
    const retraite = 4.5;
    const csg = 85.5 * 0.9825 * 0.067;
    expect(r.allocationJournaliereNette).toBeCloseTo(85.5 - retraite - csg, 2);
    // Allocation sous le seuil d'exonération (≈ 61 €) : retraite seule, pas de CSG/CRDS
    const bas = allocationChomage({ salaireJournalierReference: 100 });
    expect(bas.csgCrds).toBe(0);
    expect(bas.allocationJournaliereNette).toBe(54);
  });

  it("SJR from a monthly salary", () => {
    expect(sjrDepuisSalaire(1867.02)).toBeCloseTo(61.38, 2);
  });
});
