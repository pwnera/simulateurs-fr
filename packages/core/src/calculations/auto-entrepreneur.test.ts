import { describe, it, expect } from "vitest";
import { autoEntrepreneur } from "./auto-entrepreneur.js";

describe("autoEntrepreneur (2026)", () => {
  it("BNC : 25,6 % + CFP 0,2 %", () => {
    const r = autoEntrepreneur({ caMensuel: 4000, activite: "services_bnc" });
    expect(r.cotisations).toBeCloseTo(4000 * 0.258, 2);
    expect(r.netMensuel).toBeCloseTo(4000 * 0.742, 2);
  });

  it("vente : 12,3 % + CFP 0,1 % ; services BIC artisan : 21,2 % + 0,3 %", () => {
    expect(autoEntrepreneur({ caMensuel: 5000, activite: "vente" }).cotisations).toBeCloseTo(5000 * 0.124, 2);
    expect(autoEntrepreneur({ caMensuel: 5000, activite: "services_bic", artisan: true }).cotisations).toBeCloseTo(5000 * 0.215, 2);
  });

  it("ACRE : −50 % avant juillet 2026, −25 % ensuite (CFP non réduite)", () => {
    const a50 = autoEntrepreneur({ caMensuel: 3000, activite: "services_bnc", acre: "50" });
    const a25 = autoEntrepreneur({ caMensuel: 3000, activite: "services_bnc", acre: "25" });
    expect(a50.cotisations).toBeCloseTo(3000 * (0.128 + 0.002), 2);
    expect(a25.cotisations).toBeCloseTo(3000 * (0.192 + 0.002), 2);
    expect(autoEntrepreneur({ caMensuel: 3000, activite: "services_bnc", beneficiaireAcre: true }).cotisations).toBe(a25.cotisations);
  });

  it("impôt au barème sur le bénéfice (CA − 34 %), avec décote", () => {
    const r = autoEntrepreneur({ caMensuel: 3000, activite: "services_bnc" });
    expect(r.revenuImposableAnnuel).toBeCloseTo(36000 * 0.66, 2);
    // 23 760 € imposables : (23 760 − 11 600) × 11 % = 1 337,6 → décote 897 − 605,3 = 291,7 → ≈ 1 046 €
    expect(r.impotAnnuel).toBeCloseTo(1046, 0);
  });

  it("versement libératoire : 2,2 % du CA en BNC", () => {
    const r = autoEntrepreneur({ caMensuel: 3000, activite: "services_bnc", versementLiberatoire: true });
    expect(r.impotMensuel).toBeCloseTo(66, 2);
  });

  it("taux personnalisé appliqué au bénéfice imposable, pas au CA", () => {
    const r = autoEntrepreneur({ caMensuel: 3000, activite: "services_bic", tauxPrelevementSource: 10 });
    expect(r.impotMensuel).toBeCloseTo(3000 * 0.5 * 0.1, 2);
  });

  it("plafonds et TVA", () => {
    const r = autoEntrepreneur({ caAnnuel: 40000, activite: "services_bnc" });
    expect(r.sousPlafond).toBe(true);
    expect(r.tva.statut).toBe("seuil-depasse");
    expect(autoEntrepreneur({ caAnnuel: 90000, activite: "services_bnc" }).sousPlafond).toBe(false);
    expect(autoEntrepreneur({ caAnnuel: 80000, activite: "vente" }).tva.statut).toBe("franchise");
  });

  it("trimestres de retraite validés", () => {
    expect(autoEntrepreneur({ caAnnuel: 11000, activite: "services_bnc" }).trimestresRetraite).toBe(4);
    expect(autoEntrepreneur({ caAnnuel: 6000, activite: "services_bic" }).trimestresRetraite).toBe(1);
  });
});
