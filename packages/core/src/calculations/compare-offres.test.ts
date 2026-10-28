import { describe, it, expect } from "vitest";
import { compareOffres } from "./compare-offres.js";

describe("compareOffres", () => {
  it("returns equal when same offer", () => {
    const o = { brutMensuel: 3000, statut: "cadre" as const };
    const r = compareOffres(o, o);
    expect(r.meilleure).toBe("egal");
    expect(r.ecart).toBe(0);
    expect(r.netA).toBe(r.netB);
  });

  it("A better when higher net", () => {
    const r = compareOffres(
      { brutMensuel: 3500, statut: "cadre" },
      { brutMensuel: 3000, statut: "cadre" }
    );
    expect(r.meilleure).toBe("A");
    expect(r.netA).toBeGreaterThan(r.netB);
  });

  it("includes primes in net", () => {
    const r = compareOffres(
      { brutMensuel: 3000, statut: "cadre", primesAnnuelle: 3000 },
      { brutMensuel: 3000, statut: "cadre" }
    );
    expect(r.netA).toBeGreaterThan(r.netB);
  });
});
