import { describe, it, expect } from "vitest";
import { caPourBrutPortage, portageSalarial, PORTAGE_MINIMUM_BRUT_MENSUEL } from "./portage.js";

describe("portageSalarial (2026)", () => {
  it("net ≈ 50 % du CA (TJM 500 €, 20 jours, frais 7 %)", () => {
    const r = portageSalarial({ tjm: 500, joursTravaillesParMois: 20, fraisPortagePercent: 7 });
    expect(r.caBrutMensuel).toBe(10000);
    expect(r.apresFrais).toBe(9300);
    expect(r.coutSalaire).toBeCloseTo(9300, 0);
    expect(r.brutMensuel + r.chargesPatronales).toBeCloseTo(9300, 0);
    expect(r.tauxNetSurCA).toBeGreaterThan(0.48);
    expect(r.tauxNetSurCA).toBeLessThan(0.54);
  });

  it("frais professionnels remboursés augmentent le net perçu", () => {
    const sans = portageSalarial({ caMensuel: 8000, fraisPortagePercent: 8 });
    const avec = portageSalarial({ caMensuel: 8000, fraisPortagePercent: 8, fraisProfessionnels: 500 });
    expect(avec.netMensuel).toBeGreaterThan(sans.netMensuel);
    expect(avec.fraisRembourses).toBe(500);
  });

  it("signale une rémunération sous le minimum de 75 % du PASS", () => {
    expect(PORTAGE_MINIMUM_BRUT_MENSUEL).toBeCloseTo(3003.75, 2);
    expect(portageSalarial({ caMensuel: 4000 }).sousMinimum).toBe(true);
    expect(portageSalarial({ caMensuel: 9000 }).sousMinimum).toBe(false);
  });

  it("caPourBrutPortage est l'inverse de portageSalarial", () => {
    const ca = caPourBrutPortage(PORTAGE_MINIMUM_BRUT_MENSUEL, 10);
    const r = portageSalarial({ caMensuel: ca, fraisPortagePercent: 10 });
    expect(r.brutMensuel).toBeCloseTo(PORTAGE_MINIMUM_BRUT_MENSUEL, 0);
  });

  it("impôt à la source sur le net imposable", () => {
    const r = portageSalarial({ caMensuel: 9000, tauxPrelevementSource: 10 });
    expect(r.impotMensuel).toBeCloseTo(r.netImposable * 0.1, 2);
  });
});
