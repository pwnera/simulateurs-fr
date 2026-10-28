import { describe, it, expect } from "vitest";
import { compareSalaireToBenchmarks } from "./salaire-comparison.js";
import {
  SMIC_NET_MENSUEL,
  SALAIRE_MEDIAN_NET_MENSUEL,
  D9_NET_MENSUEL,
} from "../constants/salaire-benchmarks.js";

describe("salaire-comparison", () => {
  it("returns below_smic for net well under SMIC", () => {
    const r = compareSalaireToBenchmarks(1200);
    expect(r.level).toBe("below_smic");
    expect(r.label).toBe("Sous le SMIC");
    expect(r.extraInfo).toContain("médian");
  });

  it("returns around_smic for net near SMIC", () => {
    const r = compareSalaireToBenchmarks(SMIC_NET_MENSUEL);
    expect(r.level).toBe("around_smic");
  });

  it("returns below_median for net between SMIC and median", () => {
    const r = compareSalaireToBenchmarks(SALAIRE_MEDIAN_NET_MENSUEL * 0.85);
    expect(r.level).toBe("below_median");
  });

  it("returns around_median for net near median", () => {
    const r = compareSalaireToBenchmarks(SALAIRE_MEDIAN_NET_MENSUEL);
    expect(r.level).toBe("around_median");
  });

  it("returns above_median for net above median but below D9", () => {
    const r = compareSalaireToBenchmarks(3000);
    expect(r.level).toBe("above_median");
    expect(r.label).toBe("Au-dessus du salaire médian");
  });

  it("returns top_10_pct for net at or above D9", () => {
    const r = compareSalaireToBenchmarks(D9_NET_MENSUEL);
    expect(r.level).toBe("top_10_pct");
    expect(r.label).toBe("Dans les 10 % des salariés les mieux payés");
  });
});
