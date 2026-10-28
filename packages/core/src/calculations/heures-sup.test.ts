import { describe, it, expect } from "vitest";
import {
  calculHeuresSup,
  calculHeuresSupSemaine,
  arrondirDureeHeures,
  heuresPayeesEquivalentes,
} from "./heures-sup.js";
import { HEURES_MENSUELLES_35H, HEURES_MENSUELLES_39H } from "../constants/heures-travail.js";

describe("heures-sup", () => {
  describe("calculHeuresSup", () => {
    it("computes 25% and 50% from taux horaire brut", () => {
      const r = calculHeuresSup({
        tauxHoraireBrut: 20,
        heuresSup25: 5,
        heuresSup50: 2,
      });
      expect(r.montantBrut25).toBe(20 * 1.25 * 5);
      expect(r.montantBrut50).toBe(20 * 1.5 * 2);
      expect(r.totalBrut).toBe(125 + 60);
      expect(r.tauxHoraireBrut).toBe(20);
      // 22 % de cotisations − réduction salariale 11,31 % = 10,69 %
      expect(r.netEstime).toBeCloseTo(185 * (1 - (0.22 - 0.1131)), 2);
      expect(r.reductionSalariale).toBeCloseTo(185 * 0.1131, 2);
    });

    it("derives taux from salaire mensuel brut (35h)", () => {
      const brutMensuel = 2275.05;
      const r = calculHeuresSup({
        salaireMensuelBrut: brutMensuel,
        heuresContratHebdo: 35,
        heuresSup25: 1,
        heuresSup50: 0,
      });
      const tauxAttendu = brutMensuel / HEURES_MENSUELLES_35H;
      expect(r.tauxHoraireBrut).toBeCloseTo(tauxAttendu, 2);
      expect(r.montantBrut25).toBeCloseTo(tauxAttendu * 1.25 * 1, 2);
    });

    it("derives taux from salaire mensuel brut (39h, 4 h sup structurelles à 125 %)", () => {
      const brutMensuel = 2600;
      const r = calculHeuresSup({
        salaireMensuelBrut: brutMensuel,
        heuresContratHebdo: 39,
        heuresSup25: 0,
        heuresSup50: 0,
      });
      // 151,67 + 17,33 × 1,25 = 173,33 h payées « au taux normal »
      expect(heuresPayeesEquivalentes(39)).toBeCloseTo(173.33, 1);
      expect(r.tauxHoraireBrut).toBeCloseTo(brutMensuel / 173.33, 2);
      expect(r.tauxHoraireBrut).toBeLessThan(brutMensuel / HEURES_MENSUELLES_39H);
    });

    it("uses custom majorations when provided", () => {
      const r = calculHeuresSup({
        tauxHoraireBrut: 10,
        tauxMajoration1: 0.1,
        tauxMajoration2: 0.5,
        heuresSup25: 2,
        heuresSup50: 1,
      });
      expect(r.montantBrut25).toBe(10 * 1.1 * 2);
      expect(r.montantBrut50).toBe(10 * 1.5 * 1);
    });

    it("uses tauxCotisations for net when tauxHoraireNet given", () => {
      const r = calculHeuresSup({
        tauxHoraireNet: 15.6,
        tauxCotisations: 0.22,
        heuresSup25: 1,
        heuresSup50: 0,
      });
      const brutAttendu = 15.6 / 0.78;
      expect(r.tauxHoraireBrut).toBeCloseTo(brutAttendu, 2);
      expect(r.netEstime).toBeCloseTo(r.totalBrut * (1 - (0.22 - 0.1131)), 2);
    });

    it("uses tauxChargesNet when provided", () => {
      const r = calculHeuresSup({
        tauxHoraireBrut: 20,
        heuresSup25: 1,
        heuresSup50: 0,
        tauxChargesNet: 0.25,
        reductionSalariale: false,
      });
      expect(r.netEstime).toBeCloseTo(r.totalBrut * 0.75, 2);
      expect(r.tauxChargesUtilise).toBe(0.25);
    });

    it("prices heures complémentaires at 10 %", () => {
      const r = calculHeuresSup({ tauxHoraireBrut: 12, heuresSup25: 0, heuresSup50: 0, heuresComp10: 2 });
      expect(r.montantBrut10).toBeCloseTo(26.4, 2);
      expect(r.totalBrut).toBeCloseTo(26.4, 2);
    });
  });

  describe("arrondirDureeHeures", () => {
    it("arrondit à la minute", () => {
      expect(arrondirDureeHeures(1.234, "minute")).toBeCloseTo(1.23, 2);
      expect(arrondirDureeHeures(1.25, "minute")).toBe(1.25);
    });
    it("arrondit au quart d'heure", () => {
      expect(arrondirDureeHeures(1.125, "quart")).toBe(1.25);
      expect(arrondirDureeHeures(1.2, "quart")).toBe(1.25);
      expect(arrondirDureeHeures(1.0, "quart")).toBe(1);
    });
    it("arrondit à l'heure commencée", () => {
      expect(arrondirDureeHeures(1.1, "heure_commencee")).toBe(2);
      expect(arrondirDureeHeures(1.0, "heure_commencee")).toBe(1);
    });
  });

  describe("calculHeuresSupSemaine", () => {
    it("retourne 0 heures sup si total <= seuil 35h", () => {
      const jours = [
        { debutMinutes: 9 * 60, finMinutes: 12 * 60, pauseMinutes: 0 },
        { debutMinutes: 14 * 60, finMinutes: 18 * 60, pauseMinutes: 0 },
      ];
      const j = [...jours, null, null, null, null, null];
      const r = calculHeuresSupSemaine(j, 35, "minute");
      expect(r.totalHeures).toBe(7);
      expect(r.heuresNormales).toBe(7);
      expect(r.heuresSup25).toBe(0);
      expect(r.heuresSup50).toBe(0);
    });

    it("répartit heures sup 25% / 50% pour 41h (35h base)", () => {
      const totalMinutes = 41 * 60; // 2460
      const jours = [
        ...Array(5).fill({ debutMinutes: 0, finMinutes: 6 * 60, pauseMinutes: 0 }),
        ...Array(2).fill({ debutMinutes: 0, finMinutes: 5 * 60 + 30, pauseMinutes: 0 }),
      ];
      const r = calculHeuresSupSemaine(jours, 35, "minute");
      expect(r.totalHeures).toBe(41);
      expect(r.heuresNormales).toBe(35);
      expect(r.heuresSup25).toBe(6);
      expect(r.heuresSup50).toBe(0);
    });

    it("39h contract: hours 40–43 at 25 %, beyond 43 h at 50 %", () => {
      const jours = [
        ...Array(5).fill({ debutMinutes: 0, finMinutes: 9 * 60, pauseMinutes: 0 }),
        { debutMinutes: 0, finMinutes: 3 * 60, pauseMinutes: 0 },
        null,
      ];
      const r = calculHeuresSupSemaine(jours, 39, "minute");
      expect(r.totalHeures).toBe(48);
      expect(r.heuresSup25).toBe(4);
      expect(r.heuresSup50).toBe(5);
    });

    it("part-time: heures complémentaires 10 % up to 1/10 of contract, then 25 %", () => {
      const jours = [
        ...Array(4).fill({ debutMinutes: 0, finMinutes: 7 * 60, pauseMinutes: 0 }),
        null,
        null,
        null,
      ];
      const r = calculHeuresSupSemaine(jours, 24, "minute");
      expect(r.totalHeures).toBe(28);
      expect(r.heuresComp10).toBe(2.4);
      expect(r.heuresSup25).toBe(1.6);
      expect(r.heuresSup50).toBe(0);
    });

    it("applique arrondi quart d'heure", () => {
      const jours = [{ debutMinutes: 0, finMinutes: 8 * 60 + 10, pauseMinutes: 0 }];
      const j = [...jours, null, null, null, null, null, null];
      const r = calculHeuresSupSemaine(j, 35, "quart");
      expect(r.totalHeures).toBe(8.25);
      expect(r.heuresNormales).toBe(8.25);
      expect(r.heuresSup25).toBe(0);
    });
  });
});
