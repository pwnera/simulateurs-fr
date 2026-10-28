import { describe, it, expect } from "vitest";
import { simulerFreelance, impotSocietes, normalizeStatutFreelance } from "./freelance.js";

const base = { tjm: 500, joursParMois: 18 };

describe("simulerFreelance", () => {
  it("impôt sur les sociétés 15 % / 25 %", () => {
    expect(impotSocietes(40000)).toBe(6000);
    expect(impotSocietes(100000)).toBe(42500 * 0.15 + 57500 * 0.25);
  });

  it("micro : net ≈ 74 % du CA avant impôt en BNC", () => {
    const r = simulerFreelance({ ...base, statut: "micro" });
    expect(r.caMensuel).toBe(9000);
    expect(r.cotisationsMensuelles).toBeCloseTo(9000 * 0.258, 1);
    expect(r.netAvantImpotMensuel).toBeCloseTo(9000 * 0.742, 1);
  });

  it("portage : net ≈ 50 % du CA", () => {
    const r = simulerFreelance({ ...base, statut: "portage", fraisPortagePercent: 7 });
    expect(r.netAvantImpotMensuel / r.caMensuel).toBeGreaterThan(0.48);
    expect(r.netAvantImpotMensuel / r.caMensuel).toBeLessThan(0.54);
  });

  it("SASU tout en salaire : pas de minimum artificiel, net ≈ 55 % du résultat", () => {
    const r = simulerFreelance({ caMensuel: 2000, chargesMensuelles: 1000, statut: "sasu_is", partRemuneration: 100 });
    expect(r.netAvantImpotMensuel).toBeLessThan(1000);
    const r2 = simulerFreelance({ ...base, statut: "sasu_is", partRemuneration: 100 });
    expect(r2.netAvantImpotMensuel / r2.caMensuel).toBeGreaterThan(0.5);
    expect(r2.netAvantImpotMensuel / r2.caMensuel).toBeLessThan(0.6);
    expect(r2.impotSocietesMensuel).toBe(0);
  });

  it("SASU 100 % dividendes : IS puis PFU 31,4 %", () => {
    const r = simulerFreelance({ caMensuel: 5000, statut: "sasu_is", partRemuneration: 0 });
    const benef = 60000;
    const is = 42500 * 0.15 + 17500 * 0.25;
    const div = benef - is;
    expect(r.impotSocietesMensuel * 12).toBeCloseTo(is, 0);
    expect(r.netApresImpotAnnuel).toBeCloseTo(div * (1 - 0.314), -1);
  });

  it("EURL IR : cotisations TNS ≈ 30-33 % du résultat", () => {
    const r = simulerFreelance({ caMensuel: 6000, chargesMensuelles: 1000, statut: "eurl_ir" });
    const tauxCot = r.cotisationsMensuelles / 5000;
    expect(tauxCot).toBeGreaterThan(0.28);
    expect(tauxCot).toBeLessThan(0.35);
  });

  it("EURL IS : dividendes au-delà de 10 % du capital soumis aux cotisations TNS", () => {
    const r = simulerFreelance({ caMensuel: 8000, statut: "eurl_is", partRemuneration: 50, capitalSocial: 1000 });
    expect(r.lignes.some((l) => l.label.includes("Cotisations TNS sur dividendes"))).toBe(true);
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it("charges supérieures au CA : activité déficitaire", () => {
    expect(simulerFreelance({ caMensuel: 1000, chargesMensuelles: 2000, statut: "sasu_is" }).error).toBeDefined();
  });

  it("maps legacy statuts", () => {
    expect(normalizeStatutFreelance("auto")).toBe("micro");
    expect(normalizeStatutFreelance("sasu")).toBe("sasu_is");
    expect(normalizeStatutFreelance("eurl")).toBe("eurl_ir");
    expect(normalizeStatutFreelance("xyz")).toBeNull();
  });
});
