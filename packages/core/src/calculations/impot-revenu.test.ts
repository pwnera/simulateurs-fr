import { describe, it, expect } from "vitest";
import {
  estimerTauxPrelevementSource,
  roundTauxToSliderStep,
  BAREME_IR_YEAR,
  calculImpotRevenu,
  abattementFraisPro,
} from "./impot-revenu.js";

describe("impot-revenu", () => {
  it("exports barème year", () => {
    expect(BAREME_IR_YEAR).toBe("2026");
  });

  describe("estimerTauxPrelevementSource", () => {
    it("returns 0 for zero or negative net annuel", () => {
      expect(estimerTauxPrelevementSource(0)).toBe(0);
      expect(estimerTauxPrelevementSource(-1000)).toBe(0);
    });

    it("returns 0 for net annuel below first tranche (11600)", () => {
      expect(estimerTauxPrelevementSource(10_000)).toBe(0);
      expect(estimerTauxPrelevementSource(11_600)).toBe(0);
    });

    it("returns ~7.01% for 30k (service-public example)", () => {
      const taux = estimerTauxPrelevementSource(30_000);
      expect(taux).toBeGreaterThanOrEqual(7);
      expect(taux).toBeLessThanOrEqual(7.02);
    });

    it("returns higher rate for higher net", () => {
      const taux50k = estimerTauxPrelevementSource(50_000);
      const taux20k = estimerTauxPrelevementSource(20_000);
      expect(taux50k).toBeGreaterThan(taux20k);
    });

    it("respects nbParts (2 parts reduce effective rate)", () => {
      const taux1 = estimerTauxPrelevementSource(60_000, 1);
      const taux2 = estimerTauxPrelevementSource(60_000, 2);
      expect(taux2).toBeLessThan(taux1);
    });

    it("with 10% abattement yields lower rate for same net", () => {
      const sans = estimerTauxPrelevementSource(30_000, 1, { appliquerAbattement10: false });
      const avec = estimerTauxPrelevementSource(30_000, 1, { appliquerAbattement10: true });
      expect(avec).toBeLessThanOrEqual(sans);
    });
  });

  describe("roundTauxToSliderStep", () => {
    it("rounds to 0.5 step", () => {
      expect(roundTauxToSliderStep(5.2, 0.5)).toBe(5);
      expect(roundTauxToSliderStep(5.25, 0.5)).toBe(5.5);
      expect(roundTauxToSliderStep(5.7, 0.5)).toBe(5.5);
    });
  });
});

describe("calculImpotRevenu", () => {
  it("applies the décote for modest incomes (single)", () => {
    // 20 000 € : impôt brut = 8 400 × 11 % = 924 ; décote = 897 − 45,25 % × 924 = 478,89
    const r = calculImpotRevenu({ revenuImposable: 20_000 });
    expect(r.impotBrut).toBe(924);
    expect(r.decote).toBe(479);
    expect(r.impotNet).toBe(445);
  });

  it("no décote above the threshold", () => {
    const r = calculImpotRevenu({ revenuImposable: 30_000 });
    expect(r.decote).toBe(0);
    expect(r.impotNet).toBe(2104);
    expect(r.tauxMarginal).toBe(0.3);
  });

  it("couple with 2 children (3 parts) and QF cap", () => {
    // Haut revenu : l'avantage des 2 demi-parts est plafonné à 2 × 1 807 €
    const r = calculImpotRevenu({ revenuImposable: 200_000, nbParts: 3, couple: true });
    const couple = calculImpotRevenu({ revenuImposable: 200_000, nbParts: 2, couple: true });
    expect(r.plafonnementQF).toBe(true);
    expect(couple.impotNet - r.impotNet).toBe(2 * 1807);
  });

  it("abattement 10 % respects min and max", () => {
    expect(abattementFraisPro(3_000)).toBe(509);
    expect(abattementFraisPro(40_000)).toBe(4_000);
    expect(abattementFraisPro(200_000)).toBe(14_555);
  });
});
