import { describe, it, expect } from "vitest";
import { simulationAPL } from "./apl.js";

describe("simulationAPL (barème au 1er octobre 2026)", () => {
  it("worked example: single, zone 2, rent 450 €, R = 14 100 €", () => {
    const r = simulationAPL({ loyerMensuel: 450, revenusMensuels: 0, ressourcesAnnuelles: 14040, zone: "2" });
    expect(r.ressourcesRetenues).toBe(14100);
    expect(r.loyerRetenu).toBe(293.68);
    expect(r.forfaitCharges).toBe(61.29);
    expect(r.p0).toBe(40.01);
    expect(r.tauxParticipation).toBeCloseTo(0.03135, 5);
    expect(r.participationPersonnelle).toBeCloseTo(317.93, 1);
    expect(r.aideBrute).toBeCloseTo(32.04, 1);
    expect(r.aplEstimee).toBeCloseTo(31.88, 1);
  });

  it("maximum aid when resources are below R0", () => {
    expect(simulationAPL({ loyerMensuel: 800, revenusMensuels: 0, zone: "1" }).aideBrute).toBeCloseTo(353.25, 1);
    expect(simulationAPL({ loyerMensuel: 600, revenusMensuels: 0, zone: "2" }).aideBrute).toBeCloseTo(309.96, 1);
    expect(simulationAPL({ loyerMensuel: 600, revenusMensuels: 0, zone: "3" }).aideBrute).toBeCloseTo(291.53, 1);
  });

  it("decreases with resources and reaches zero", () => {
    const bas = simulationAPL({ loyerMensuel: 600, revenusMensuels: 1000, zone: "2" });
    const haut = simulationAPL({ loyerMensuel: 600, revenusMensuels: 2500, zone: "2" });
    expect(bas.aplEstimee).toBeGreaterThan(haut.aplEstimee);
    expect(haut.eligible).toBe(false);
  });

  it("family with children gets more", () => {
    const seul = simulationAPL({ loyerMensuel: 900, revenusMensuels: 1800, zone: "1" });
    const famille = simulationAPL({ loyerMensuel: 900, revenusMensuels: 1800, zone: "1", couple: true, nbEnfants: 2 });
    expect(famille.aplEstimee).toBeGreaterThan(seul.aplEstimee);
    expect(famille.loyerPlafond).toBeCloseTo(459.32 + 66.65, 2);
  });

  it("legacy params: 2 personnes sans enfant = couple", () => {
    const r = simulationAPL({ loyerMensuel: 700, revenusMensuels: 1200, nbPersonnes: 2, nbEnfants: 0, zone: "2" });
    expect(r.loyerPlafond).toBe(359.47);
  });

  it("students: resources floor", () => {
    const r = simulationAPL({ loyerMensuel: 500, revenusMensuels: 0, zone: "2", etudiant: true });
    expect(r.ressourcesRetenues).toBe(8600);
    const b = simulationAPL({ loyerMensuel: 500, revenusMensuels: 0, zone: "2", etudiant: true, boursier: true });
    expect(b.ressourcesRetenues).toBe(6900);
    expect(b.aplEstimee).toBeGreaterThan(r.aplEstimee);
  });

  it("dégressivité for very high rents (zone 2: from 2.5 × plafond)", () => {
    const normal = simulationAPL({ loyerMensuel: 700, revenusMensuels: 0, zone: "2" });
    const cher = simulationAPL({ loyerMensuel: 850, revenusMensuels: 0, zone: "2" });
    expect(cher.degressivite).toBeGreaterThan(0);
    expect(cher.aplEstimee).toBeLessThan(normal.aplEstimee);
    expect(simulationAPL({ loyerMensuel: 1000, revenusMensuels: 0, zone: "2" }).aplEstimee).toBe(0);
  });
});
