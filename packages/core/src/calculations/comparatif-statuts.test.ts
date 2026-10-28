import { describe, it, expect } from "vitest";
import { comparatifStatuts } from "./comparatif-statuts.js";

describe("comparatifStatuts", () => {
  it("CA mode: micro keeps the most at moderate CA, salarié/portage the least", () => {
    const r = comparatifStatuts({ revenuMensuelSouhaite: 6000, mode: "ca" });
    const micro = r.lignes.find((l) => l.id === "micro")!;
    const portage = r.lignes.find((l) => l.id === "portage")!;
    expect(micro.netApresImpot).toBeGreaterThan(portage.netApresImpot);
    expect(r.meilleur).toBe("micro");
    for (const l of r.lignes) expect(l.caMensuel).toBe(6000);
  });

  it("net mode: required CA reaches the target net", () => {
    const r = comparatifStatuts({ revenuMensuelSouhaite: 3000, mode: "net" });
    for (const l of r.lignes) expect(l.netApresImpot).toBeCloseTo(3000, 0);
    const micro = r.lignes.find((l) => l.id === "micro")!;
    const portage = r.lignes.find((l) => l.id === "portage")!;
    expect(portage.caMensuel).toBeGreaterThan(micro.caMensuel);
  });
});
