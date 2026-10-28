import { describe, it, expect } from "vitest";
import { preavis, preavisLegalLicenciementMois } from "./preavis.js";

describe("préavis de licenciement (L1234-1)", () => {
  it("no legal minimum under 6 months", () => {
    expect(preavisLegalLicenciementMois(5)).toBeNull();
    const r = preavis({ type: "licenciement", ancienneteAnnees: 0, ancienneteMois: 5 });
    expect(r.duree).toBe(0);
    expect(r.origine).toBe("aucune");
  });

  it("1 month between 6 months and 2 years", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 1, ancienneteMois: 11 });
    expect(r.duree).toBe(1);
    expect(r.unite).toBe("mois");
    expect(r.origine).toBe("legale");
  });

  it("2 months from 2 years", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 2 });
    expect(r.duree).toBe(2);
    expect(preavis({ type: "licenciement", ancienneteAnnees: 15 }).duree).toBe(2);
  });

  it("no notice for faute grave", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 10, fauteGrave: true });
    expect(r.duree).toBe(0);
  });

  it("uses the conventional duration when more favourable", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 3, cadre: true, dureeConventionnelleMois: 3 });
    expect(r.duree).toBe(3);
    expect(r.origine).toBe("conventionnelle");
    expect(r.dureeLegale).toBe(2);
  });

  it("keeps the legal duration when the convention is less favourable", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 3, dureeConventionnelleMois: 1 });
    expect(r.duree).toBe(2);
    expect(r.origine).toBe("legale");
  });

  it("doubles for travailleur handicapé, capped at 3 months", () => {
    expect(preavis({ type: "licenciement", ancienneteAnnees: 1, travailleurHandicape: true }).duree).toBe(2);
    expect(preavis({ type: "licenciement", ancienneteAnnees: 5, travailleurHandicape: true }).duree).toBe(3);
  });
});

describe("préavis de démission", () => {
  it("uses common usage when no convention is given", () => {
    expect(preavis({ type: "demission", ancienneteAnnees: 4 }).duree).toBe(1);
    expect(preavis({ type: "demission", ancienneteAnnees: 4, cadre: true }).duree).toBe(3);
    expect(preavis({ type: "demission", ancienneteAnnees: 4 }).dureeLegale).toBeNull();
  });

  it("uses the conventional duration when given", () => {
    const r = preavis({ type: "demission", ancienneteAnnees: 1, dureeConventionnelleMois: 2 });
    expect(r.duree).toBe(2);
    expect(r.origine).toBe("conventionnelle");
  });
});

describe("retraite", () => {
  it("départ volontaire follows licenciement durations", () => {
    expect(preavis({ type: "depart-retraite", ancienneteAnnees: 1 }).duree).toBe(1);
    expect(preavis({ type: "mise-retraite", ancienneteAnnees: 20 }).duree).toBe(2);
  });
});

describe("période d'essai (délai de prévenance)", () => {
  it("employer side depends on presence", () => {
    expect(preavis({ type: "essai-employeur", ancienneteAnnees: 0, presenceJours: 5 })).toMatchObject({ duree: 24, unite: "heures" });
    expect(preavis({ type: "essai-employeur", ancienneteAnnees: 0, presenceJours: 20 })).toMatchObject({ duree: 48, unite: "heures" });
    expect(preavis({ type: "essai-employeur", ancienneteAnnees: 0, presenceJours: 45 })).toMatchObject({ duree: 2, unite: "semaines" });
    expect(preavis({ type: "essai-employeur", ancienneteAnnees: 0, presenceJours: 100 })).toMatchObject({ duree: 1, unite: "mois" });
  });

  it("employee side is 24 h or 48 h", () => {
    expect(preavis({ type: "essai-salarie", ancienneteAnnees: 0, presenceJours: 3 }).duree).toBe(24);
    expect(preavis({ type: "essai-salarie", ancienneteAnnees: 0, presenceJours: 60 }).duree).toBe(48);
  });
});

describe("date de fin", () => {
  it("ends the day before the same day of month", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 3, dateNotification: "2026-03-15" });
    expect(r.dateFin).toBe("2026-05-14");
  });

  it("handles month-end overflow", () => {
    const r = preavis({ type: "licenciement", ancienneteAnnees: 1, dateNotification: "2026-01-31" });
    expect(r.dateFin).toBe("2026-02-28");
  });

  it("weeks", () => {
    const r = preavis({ type: "essai-employeur", ancienneteAnnees: 0, presenceJours: 45, dateNotification: "2026-06-01" });
    expect(r.dateFin).toBe("2026-06-14");
  });
});
