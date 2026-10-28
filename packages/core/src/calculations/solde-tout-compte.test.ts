import { describe, it, expect } from "vitest";
import { soldeToutCompte } from "./solde-tout-compte.js";

describe("soldeToutCompte", () => {
  it("prorates the last month on worked days", () => {
    const r = soldeToutCompte({ salaireBrutMensuel: 2200, joursTravaillesDansLeMois: 11, joursOuvresMois: 22, joursCongesNonPris: 0 });
    expect(r.prorataSalaire).toBe(1100);
    expect(r.totalBrut).toBe(1100);
    expect(r.totalNetEstime).toBeCloseTo(1100 * 0.78, 2);
  });

  it("adds indemnité compensatrice de congés (best of maintien / dixième)", () => {
    const r = soldeToutCompte({
      salaireBrutMensuel: 2167,
      joursTravaillesDansLeMois: 22,
      joursOuvresMois: 22,
      joursCongesNonPris: 10,
      decompteConges: "ouvres",
    });
    // maintien : 2167 / 21,67 × 10 = 1000 ; dixième : 26 004 / 10 × 10/25 = 1040,16
    expect(r.indemniteConges).toBeCloseTo(1040.16, 1);
  });

  it("CDD: prime de précarité 10 % and congés on remuneration + précarité", () => {
    const r = soldeToutCompte({
      salaireBrutMensuel: 2000,
      joursTravaillesDansLeMois: 22,
      joursOuvresMois: 22,
      joursCongesNonPris: 15,
      decompteConges: "ouvrables",
      remunerationTotaleCDD: 12000,
    });
    const precarite = r.lignes.find((l) => l.id === "precarite");
    expect(precarite?.brut).toBe(1200);
    expect(r.indemniteConges).toBe(1320);
  });

  it("indemnité de rupture is exempt (net = brut)", () => {
    const r = soldeToutCompte({
      salaireBrutMensuel: 3000,
      joursTravaillesDansLeMois: 0,
      joursOuvresMois: 21,
      joursCongesNonPris: 0,
      indemniteRupture: 5000,
      preavisNonEffectueMois: 2,
    });
    expect(r.lignes.find((l) => l.id === "rupture")?.net).toBe(5000);
    expect(r.lignes.find((l) => l.id === "preavis")?.brut).toBe(6000);
    expect(r.totalBrut).toBe(11000);
  });
});
