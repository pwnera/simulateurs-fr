import { describe, it, expect } from "vitest";
import { indemniteLicenciement, moisIndemniteLegale } from "./licenciement.js";
import { indemniteRuptureConventionnelle, regimeIndemniteNegociee } from "./rupture-conventionnelle.js";

describe("indemnité légale de licenciement", () => {
  it("1/4 de mois par année jusqu'à 10 ans", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 2500, ancienneteAnnees: 5 });
    expect(r.indemniteLegale).toBe(3125);
    expect(r.indemniteEstimee).toBe(3125);
  });

  it("1/3 de mois au-delà de 10 ans, sans plafond", () => {
    // 12 ans : 10 × 1/4 + 2 × 1/3 = 3,1667 mois
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 3000, ancienneteAnnees: 12 });
    expect(r.indemniteEstimee).toBeCloseTo(3000 * (2.5 + 2 / 3), 1);
    // Salaire élevé : pas de plafonnement au PASS
    const haut = indemniteLicenciement({ dernierSalaireMensuelBrut: 20000, ancienneteAnnees: 4 });
    expect(haut.indemniteEstimee).toBe(20000);
  });

  it("années incomplètes au prorata des mois", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 2400, ancienneteAnnees: 2, ancienneteMois: 6 });
    expect(r.indemniteEstimee).toBe(1500);
  });

  it("8 mois d'ancienneté minimum, pas d'indemnité pour faute grave", () => {
    expect(indemniteLicenciement({ dernierSalaireMensuelBrut: 2000, ancienneteAnnees: 0, ancienneteMois: 7 }).eligible).toBe(false);
    const huit = indemniteLicenciement({ dernierSalaireMensuelBrut: 2400, ancienneteAnnees: 0, ancienneteMois: 8 });
    expect(huit.indemniteEstimee).toBe(400);
    expect(indemniteLicenciement({ dernierSalaireMensuelBrut: 2000, ancienneteAnnees: 5, fauteGrave: true }).indemniteEstimee).toBe(0);
  });

  it("retient la moyenne des 3 derniers mois si plus favorable", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 2500, moyenne3DerniersMois: 3000, ancienneteAnnees: 4 });
    expect(r.salaireReference).toBe(3000);
    expect(r.indemniteEstimee).toBe(3000);
  });

  it("convertit un net en brut", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelNet: 1950, tauxCotisations: 0.22, ancienneteAnnees: 4 });
    expect(r.salaireReference).toBeCloseTo(2500, 0);
  });

  it("moisIndemniteLegale", () => {
    expect(moisIndemniteLegale(10)).toBe(2.5);
    expect(moisIndemniteLegale(13)).toBe(3.5);
  });
});

describe("conventions", () => {
  it("Syntec cadres : 1/3 de mois par année dès 2 ans", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 4500, ancienneteAnnees: 6, convention: "syntec", categorie: "cadre" });
    expect(r.indemniteLegale).toBe(6750);
    expect(r.indemniteConventionnelle).toBe(9000);
    expect(r.indemniteEstimee).toBe(9000);
    expect(r.base).toBe("conventionnelle");
  });

  it("Syntec ETAM = légal", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 2500, ancienneteAnnees: 6, convention: "syntec", categorie: "non-cadre" });
    expect(r.indemniteEstimee).toBe(r.indemniteLegale);
    expect(r.base).toBe("legale");
  });

  it("Métallurgie F à I : 1/5 puis 3/5 de mois dès 8 ans, plafond 18 mois", () => {
    const r = indemniteLicenciement({ dernierSalaireMensuelBrut: 4000, ancienneteAnnees: 12, convention: "metallurgie", categorie: "cadre" });
    // 7/5 + 5 × 3/5 = 4,4 mois > légal 3,1667 mois
    expect(r.indemniteConventionnelle).toBeCloseTo(4000 * 4.4, 1);
    const long = indemniteLicenciement({ dernierSalaireMensuelBrut: 4000, ancienneteAnnees: 40, convention: "metallurgie", categorie: "cadre" });
    // légal 40 ans = 2,5 + 10 = 12,5 mois ; conventionnel plafonné à 18 mois
    expect(long.indemniteConventionnelle).toBe(4000 * 18);
  });
});

describe("rupture conventionnelle", () => {
  it("pas de condition de 8 mois (prorata)", () => {
    const r = indemniteRuptureConventionnelle({ dernierSalaireMensuelBrut: 2400, ancienneteAnnees: 0, ancienneteMois: 6 });
    expect(r.indemniteLegaleMin).toBe(300);
  });

  it("indemnité négociée : différé spécifique, CSG sur le supra-légal, contribution patronale 40 %", () => {
    const d = regimeIndemniteNegociee(15000, 5000, 36000);
    expect(d.supraLegale).toBe(10000);
    expect(d.differeJours).toBe(Math.floor(10000 / 111.8));
    expect(d.exonereImpot).toBe(15000);
    expect(d.csgCrds).toBeCloseTo(970, 2);
    expect(d.cotisationsEstimees).toBe(0);
    expect(d.contributionPatronale).toBe(6000);
  });

  it("au-delà de 2 PASS, la part excédentaire est soumise à cotisations", () => {
    const d = regimeIndemniteNegociee(150000, 20000, 120000);
    expect(d.exonereCotisations).toBe(2 * 48060);
    expect(d.soumisCotisations).toBe(150000 - 2 * 48060);
    expect(d.differeJours).toBe(150);
  });
});
