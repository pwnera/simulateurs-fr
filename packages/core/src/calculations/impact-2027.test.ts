import { describe, it, expect } from "vitest";
import { BAREME_IR_2027_PLF } from "../constants/impot-revenu.js";
import { impact2027 } from "./impact-2027.js";
import { calculImpotRevenu } from "./impot-revenu.js";

describe("impact-2027", () => {
  it("applique le barème 2027 du PLF (tranches et décote)", () => {
    // (30 000 − 11 844) × 11 % = 1 997,16 ; décote 915 − 45,25 % × 1 997,16 = 11,28
    expect(calculImpotRevenu({ revenuImposable: 30_000, bareme: BAREME_IR_2027_PLF }).impotNet).toBe(1_986);
    // Barème 2026 par défaut : 1 977,69 + 421 × 30 %, pas de décote
    expect(calculImpotRevenu({ revenuImposable: 30_000 }).impotNet).toBe(2_104);
  });

  it("2 500 € brut : net inchangé, impôt en baisse", () => {
    const r = impact2027(2_500);
    expect(r.net2027).toBe(r.net2026);
    expect(r.impot2027).toBeLessThan(r.impot2026);
  });

  it("au-dessus du PMSS 2027 : la tranche 1 plus large coûte environ 0,83 € par mois", () => {
    const r = impact2027(5_000);
    // 70 € passent de T2 (9,72 %) à T1 (10,91 %)
    expect(r.net2026 - r.net2027).toBeCloseTo(70 * 0.0119, 1);
  });
});
