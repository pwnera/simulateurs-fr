import { describe, it, expect } from "vitest";
import { tvaFreelance } from "./tva-freelance.js";
import { seuilsPlafondsMicro, positionSeuils } from "./seuils-micro.js";

describe("seuils micro 2026", () => {
  it("returns the 2026-2028 values", () => {
    const s = seuilsPlafondsMicro();
    expect(s.plafondCAVente).toBe(203100);
    expect(s.plafondCAServices).toBe(83600);
    expect(s.seuilTVA).toBe(37500);
    expect(s.seuilTVAVente).toBe(85000);
  });

  it("positions a CA against thresholds", () => {
    const p = positionSeuils({ activite: "services_bnc", caAnnuel: 40000 });
    expect(p.jauges.find((j) => j.id === "tva")?.statut).toBe("attention");
    expect(p.jauges.find((j) => j.id === "plafond-micro")?.statut).toBe("ok");
    expect(p.jauges.find((j) => j.id === "retraite")?.statut).toBe("ok");
    const over = positionSeuils({ activite: "services_bic", caAnnuel: 90000, depassementAnneePrecedente: true });
    expect(over.jauges[0].statut).toBe("depasse");
    expect(over.jauges[0].explication).toContain("régime réel");
  });

  it("mixed activity: services part capped at 83 600 €", () => {
    const p = positionSeuils({ activite: "mixte", caAnnuel: 150000, caServicesMixte: 90000 });
    expect(p.jauges[0].statut).toBe("depasse");
  });
});

describe("tvaFreelance", () => {
  it("franchise under 37 500 € (services)", () => {
    const r = tvaFreelance({ caHTAnnuel: 30000, activite: "prestations" });
    expect(r.statut).toBe("franchise");
    expect(r.tvaCollectee).toBe(0);
  });

  it("between seuil and seuil majoré: franchise until 31 December", () => {
    expect(tvaFreelance({ caHTAnnuel: 40000, activite: "prestations" }).statut).toBe("fin-au-1er-janvier");
  });

  it("above seuil majoré: TVA collected, deductible VAT on expenses", () => {
    const r = tvaFreelance({ caHTAnnuel: 50000, activite: "prestations", depensesTTC: 6000 });
    expect(r.statut).toBe("assujetti-immediat");
    expect(r.tvaCollectee).toBe(10000);
    expect(r.tvaDeductible).toBe(1000);
    expect(r.tvaAReverser).toBe(9000);
  });

  it("vente thresholds and option", () => {
    expect(tvaFreelance({ caHTAnnuel: 90000, activite: "vente" }).statut).toBe("fin-au-1er-janvier");
    expect(tvaFreelance({ caHTAnnuel: 20000, activite: "prestations", optionTVA: true, tauxTVA: 0.1 }).tvaCollectee).toBe(2000);
  });
});
