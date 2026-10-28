import { describe, it, expect } from "vitest";
import { retraitePrevoyanceIndependants, REVENU_PAR_TRIMESTRE } from "./retraite-independants.js";

describe("retraitePrevoyanceIndependants", () => {
  it("1 trimestre = 150 × SMIC horaire", () => {
    expect(REVENU_PAR_TRIMESTRE).toBe(1803);
  });

  it("réel : retraite ≈ 60 % des cotisations à revenu moyen, 4 trimestres", () => {
    const r = retraitePrevoyanceIndependants({ revenusAnnuels: 40000, regime: "reel", profession: "commercant" });
    expect(r.trimestres).toBe(4);
    expect(r.cotisationRetraite / r.totalCotisations).toBeGreaterThan(0.45);
    expect(r.cotisationRetraite / r.totalCotisations).toBeLessThan(0.75);
    expect(r.indemniteJournaliere).toBeCloseTo(29600 / 730, 1);
  });

  it("réel, revenu nul : cotisations minimales et 3 trimestres", () => {
    const r = retraitePrevoyanceIndependants({ revenusAnnuels: 0, regime: "reel", profession: "artisan" });
    expect(r.trimestres).toBe(3);
    expect(r.indemniteJournaliere).toBe(0);
  });

  it("micro BIC : répartition retraite connue et trimestres selon le CA", () => {
    const r = retraitePrevoyanceIndependants({ revenusAnnuels: 14000, regime: "micro", activiteMicro: "services_bic" });
    expect(r.repartitionConnue).toBe(true);
    expect(r.trimestres).toBe(4);
    expect(r.cotisationRetraite).toBeCloseTo(14000 * 0.212 * 0.632, 1);
  });

  it("micro BNC : trimestres seulement", () => {
    const r = retraitePrevoyanceIndependants({ revenusAnnuels: 5000, regime: "micro", activiteMicro: "services_bnc" });
    expect(r.repartitionConnue).toBe(false);
    expect(r.trimestres).toBe(1);
  });
});
