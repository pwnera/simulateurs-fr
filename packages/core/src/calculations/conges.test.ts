import { describe, it, expect } from "vitest";
import { joursAcquis, indemniteConges, congesPayes } from "./conges.js";

describe("joursAcquis", () => {
  it("full year = 30 jours ouvrables / 25 ouvrés", () => {
    expect(joursAcquis({ decompte: "ouvrables", moisTravailles: 12 }).joursAcquis).toBe(30);
    expect(joursAcquis({ decompte: "ouvres", moisTravailles: 12 }).joursAcquis).toBe(25);
  });

  it("rounds up to the next whole day (L3141-7)", () => {
    // 5 mois × 2,5 = 12,5 → 13
    expect(joursAcquis({ decompte: "ouvrables", moisTravailles: 5 }).joursAcquis).toBe(13);
  });

  it("non-professional sick leave: 2 days per month, capped at 24", () => {
    const r = joursAcquis({ decompte: "ouvrables", moisTravailles: 6, moisMaladie: 6 });
    expect(r.joursTravail).toBe(15);
    expect(r.joursMaladie).toBe(12);
    expect(r.joursAcquis).toBe(27);
    const full = joursAcquis({ decompte: "ouvrables", moisTravailles: 0, moisMaladie: 12 });
    expect(full.joursAcquis).toBe(24);
  });

  it("never exceeds 12 months in total", () => {
    const r = joursAcquis({ decompte: "ouvrables", moisTravailles: 10, moisMaladie: 6 });
    expect(r.joursMaladie).toBe(4);
    expect(r.joursAcquis).toBe(29);
  });
});

describe("indemniteConges", () => {
  it("maintien de salaire when salary is stable", () => {
    const r = indemniteConges({ decompte: "ouvrables", jours: 26, joursAcquisPeriode: 30, salaireBrutMensuel: 2600 });
    expect(r.maintienSalaire).toBe(2600);
    // dixième : 31 200 / 10 × 26/30 = 2 704
    expect(r.regleDixieme).toBe(2704);
    expect(r.methode).toBe("dixieme");
    expect(r.indemnite).toBe(2704);
  });

  it("dixième uses the reference remuneration (primes, heures sup)", () => {
    const r = indemniteConges({
      decompte: "ouvres",
      jours: 25,
      joursAcquisPeriode: 25,
      salaireBrutMensuel: 2000,
      remunerationReference: 30000,
    });
    expect(r.regleDixieme).toBe(3000);
    expect(r.indemnite).toBe(3000);
  });
});

describe("congesPayes (compat)", () => {
  it("computes remaining days", () => {
    expect(congesPayes({ joursAcquis: 25, joursPris: 5, salaireJournalierNet: 80 })).toEqual({ joursRestants: 20, valeurEstimee: 1600 });
  });
});
