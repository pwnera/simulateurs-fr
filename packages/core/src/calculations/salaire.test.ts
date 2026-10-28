import { describe, it, expect } from "vitest";
import { brutToNet, brutToNetTauxEstime, netToBrut, remunerationTempsPartielFP, HEURES_MENSUELLES } from "./salaire.js";
import { SMIC_BRUT_MENSUEL } from "../constants/plafonds.js";

describe("salaire", () => {
  describe("brutToNet (secteur privé, 2026)", () => {
    it("SMIC: net = 1 477,93 € (valeur officielle depuis le 1er juin 2026)", () => {
      const r = brutToNet({ brutMensuel: SMIC_BRUT_MENSUEL, statut: "non-cadre" });
      expect(r.brutMensuel).toBe(1867.02);
      expect(r.netMensuel).toBeCloseTo(1477.93, 1);
      // ≈ 20,84 % de cotisations hors mutuelle
      expect(r.tauxCotisationsEffectif).toBeCloseTo(0.2084, 3);
    });

    it("net imposable = net + CSG non déductible + CRDS", () => {
      const r = brutToNet({ brutMensuel: 2000, statut: "non-cadre" });
      const assiette = 2000 * 0.9825;
      expect(r.netImposableMensuel).toBeCloseTo(r.netMensuel + assiette * 0.029, 1);
      expect(r.netImposableMensuel).toBeGreaterThan(r.netMensuel);
      expect(r.netSocialMensuel).toBe(r.netMensuel);
    });

    it("cadre: APEC and prévoyance in the CSG base, close to non-cadre below the PASS", () => {
      const nc = brutToNet({ brutMensuel: 3000, statut: "non-cadre" });
      const c = brutToNet({ brutMensuel: 3000, statut: "cadre" });
      expect(c.netMensuel).toBeLessThan(nc.netMensuel);
      expect(nc.netMensuel - c.netMensuel).toBeLessThan(10);
      expect(c.lignes.some((l) => l.id === "apec")).toBe(true);
    });

    it("above the PASS: T2 rates and CET apply", () => {
      const r = brutToNet({ brutMensuel: 6000, statut: "cadre" });
      expect(r.lignes.some((l) => l.id === "agirc-arrco-t2")).toBe(true);
      expect(r.lignes.some((l) => l.id === "cet")).toBe(true);
      // La vieillesse plafonnée s'arrête au PASS : le taux global reste proche de 21 %
      expect(r.tauxCotisationsEffectif).toBeGreaterThan(0.2);
      expect(r.tauxCotisationsEffectif).toBeLessThan(0.23);
    });

    it("applies part-time percentage", () => {
      const r = brutToNet({ brutMensuel: 2000, statut: "non-cadre", tempsTravailPercent: 80 });
      expect(r.brutMensuel).toBe(1600);
      expect(r.brutHoraire).toBeCloseTo(2000 / HEURES_MENSUELLES, 2);
    });

    it("applies prélèvement à la source on the net imposable", () => {
      const r = brutToNet({ brutMensuel: 2000, statut: "non-cadre", tauxPrelevementSource: 10 });
      expect(r.impotMensuel).toBeCloseTo(r.netImposableMensuel * 0.1, 1);
      expect(r.netMensuelApresImpots).toBeCloseTo(r.netMensuel - r.impotMensuel, 1);
    });

    it("13e mois: monthly net unchanged, annual net includes the 13th month", () => {
      const m12 = brutToNet({ brutMensuel: 2500, statut: "non-cadre", moisPrime: 12 });
      const m13 = brutToNet({ brutMensuel: 2500, statut: "non-cadre", moisPrime: 13 });
      expect(m13.netMensuel).toBe(m12.netMensuel);
      expect(m13.brutAnnuel).toBe(2500 * 13);
      expect(m13.netAnnuel).toBeCloseTo((m12.netAnnuel * 13) / 12, 0);
    });

    it("includes primes annuelles in the annual figures", () => {
      const r = brutToNet({ brutMensuel: 2000, statut: "non-cadre", moisPrime: 12, primesAnnuelle: 6000 });
      expect(r.brutAnnuel).toBe(30000);
      expect(r.netMensuelMoyen).toBeCloseTo(r.netAnnuel / 12, 2);
      expect(r.netMensuelMoyen).toBeGreaterThan(r.netMensuel);
    });

    it("heures sup: majoration 25 %, réduction salariale and exempt from tax", () => {
      const sans = brutToNet({ brutMensuel: 2000, statut: "non-cadre" });
      const r = brutToNet({ brutMensuel: 2000, statut: "non-cadre", heuresSupMensuelles: 5 });
      const hs = 5 * (2000 / HEURES_MENSUELLES) * 1.25;
      expect(r.brutMensuel).toBeCloseTo(2000 + hs, 1);
      expect(r.reductionHeuresSup).toBeCloseTo(hs * 0.1131, 1);
      // Le net imposable n'augmente pas (heures sup exonérées)
      expect(r.netImposableMensuel).toBeCloseTo(sans.netImposableMensuel, 1);
      // Net des heures sup ≈ brut − CSG/CRDS
      expect(r.netMensuel - sans.netMensuel).toBeCloseTo(hs * (1 - 0.097 * 0.9825), 0);
    });

    it("fonction publique: pension civile 11,10 % + CSG/CRDS", () => {
      const r = brutToNet({ brutMensuel: 2500, statut: "fonction-publique" });
      expect(r.tauxCotisationsEffectif).toBeCloseTo(0.111 + 0.097 * 0.9825, 3);
    });

    it("profession libérale: cotisations TNS (≈ 30 %)", () => {
      const r = brutToNet({ brutMensuel: 4000, statut: "profession-liberale" });
      expect(r.tauxCotisationsEffectif).toBeGreaterThan(0.28);
      expect(r.tauxCotisationsEffectif).toBeLessThan(0.36);
    });

    it("mutuelle reduces the net", () => {
      const r = brutToNet({ brutMensuel: 2000, statut: "non-cadre", mutuelleMensuelle: 40 });
      const sans = brutToNet({ brutMensuel: 2000, statut: "non-cadre" });
      expect(sans.netMensuel - r.netMensuel).toBeCloseTo(40, 2);
    });

    it("estimates the PAS rate on the net imposable", () => {
      expect(brutToNet({ brutMensuel: 1867.02, statut: "non-cadre" }).tauxPASEstime).toBeLessThan(2);
      expect(brutToNet({ brutMensuel: 4000, statut: "cadre" }).tauxPASEstime).toBeGreaterThan(7);
    });
  });

  describe("netToBrut", () => {
    it("inverts brutToNet", () => {
      const brut = brutToNet({ brutMensuel: 2000, statut: "non-cadre" });
      const r = netToBrut({ netMensuel: brut.netMensuel, statut: "non-cadre" });
      expect(r.brutMensuel).toBeCloseTo(2000, 0);
      expect(r.netMensuel).toBeCloseTo(brut.netMensuel, 1);
    });

    it("works with part-time and above the PASS", () => {
      const r = netToBrut({ netMensuel: 1200, statut: "non-cadre", tempsTravailPercent: 80 });
      expect(r.netMensuel).toBeCloseTo(1200, 1);
      const c = netToBrut({ netMensuel: 5000, statut: "cadre" });
      expect(c.netMensuel).toBeCloseTo(5000, 1);
      expect(c.brutMensuel).toBeGreaterThan(6300);
    });
  });

  describe("brutToNetTauxEstime", () => {
    it("applique le taux estimé arrondi à 0,5 % (chiffres des pages preset)", () => {
      const r = brutToNetTauxEstime({ brutMensuel: 5000, statut: "cadre" });
      expect(r.tauxPrelevementSource % 0.5).toBe(0);
      expect(Math.abs(r.tauxPrelevementSource - r.tauxPASEstime)).toBeLessThanOrEqual(0.25);
      expect(r.netMensuel).toBe(brutToNet({ brutMensuel: 5000, statut: "cadre" }).netMensuel);
      expect(r.impotMensuel).toBeCloseTo((r.netImposableMensuel * r.tauxPrelevementSource) / 100, 1);
      expect(r.netMensuelApresImpots).toBeLessThan(r.netMensuel);
    });
  });

  describe("temps partiel fonction publique", () => {
    it("80 % et 90 % payés 6/7 et 32/35 du traitement, autres quotités au prorata", () => {
      expect(remunerationTempsPartielFP(0.8)).toBe(6 / 7);
      expect(remunerationTempsPartielFP(0.9)).toBe(32 / 35);
      expect(remunerationTempsPartielFP(0.5)).toBe(0.5);
      expect(remunerationTempsPartielFP(1)).toBe(1);
    });

    it("brutToNet applique la surrémunération aux fonctionnaires seulement", () => {
      const fp80 = brutToNet({ brutMensuel: 3500, statut: "fonction-publique", tempsTravailPercent: 80 });
      const fp90 = brutToNet({ brutMensuel: 3500, statut: "fonction-publique", tempsTravailPercent: 90 });
      const fp50 = brutToNet({ brutMensuel: 3500, statut: "fonction-publique", tempsTravailPercent: 50 });
      expect(fp80.brutMensuel).toBe(3000);
      expect(fp90.brutMensuel).toBe(3200);
      expect(fp50.brutMensuel).toBe(1750);
      // Retenues (pension civile, CSG/CRDS) sur le traitement versé
      expect(fp80.netMensuel).toBe(brutToNet({ brutMensuel: 3000, statut: "fonction-publique" }).netMensuel);
      expect(brutToNet({ brutMensuel: 3500, statut: "non-cadre", tempsTravailPercent: 80 }).brutMensuel).toBe(2800);
    });

    it("netToBrut retrouve le traitement temps plein à 80 %", () => {
      const net = brutToNet({ brutMensuel: 3500, statut: "fonction-publique", tempsTravailPercent: 80 }).netMensuel;
      const r = netToBrut({ netMensuel: net, statut: "fonction-publique", tempsTravailPercent: 80 });
      expect(r.brutMensuel).toBeCloseTo(3000, 0);
    });
  });
});
