import { describe, expect, it } from "vitest";
import { handleMcpMessage, handleMcpRequest } from "./handler.js";

const rpc = (body: unknown) =>
  handleMcpRequest(new Request("https://x/mcp", { method: "POST", body: JSON.stringify(body) })).then(async (r) => ({
    status: r.status,
    body: r.status === 202 ? null : await r.json(),
  }));

describe("handleMcpRequest", () => {
  it("initialise et renvoie la version demandée", async () => {
    const { body } = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.capabilities.tools).toBeDefined();
  });

  it("accepte les notifications sans réponse", async () => {
    expect((await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
  });

  it("liste 21 outils avec un schéma objet", async () => {
    const { body } = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(body.result.tools).toHaveLength(21);
    for (const t of body.result.tools) expect(t.inputSchema.type).toBe("object");
  });

  it("calcule un salaire brut en net avec la source", async () => {
    const { body } = await rpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "salaire_brut_en_net", arguments: { brutMensuel: 3000, statut: "non-cadre" } },
    });
    expect(body.result.isError).toBeUndefined();
    expect(body.result.structuredContent.netMensuel).toBeGreaterThan(2000);
    expect(body.result.structuredContent.netMensuel).toBeLessThan(3000);
    expect(body.result.structuredContent.source).toBe("https://www.calculsalairebrutnet.fr/outils/salaire-brut-net");
  });

  it("calcule l'ARE depuis le salaire brut moyen", async () => {
    const { body } = await rpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "allocation_chomage", arguments: { salaireBrutMensuelMoyen: 2500 } },
    });
    expect(body.result.isError).toBeUndefined();
  });

  it("renvoie une erreur d'outil sur paramètres invalides", async () => {
    const { body } = await rpc({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "salaire_brut_en_net", arguments: { brutMensuel: "beaucoup", statut: "pdg" } },
    });
    expect(body.result.isError).toBe(true);
  });

  it("rejette un outil inconnu, une méthode inconnue, un GET et du JSON invalide", async () => {
    expect((await rpc({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "__proto__" } })).body.error.code).toBe(-32602);
    expect((await rpc({ jsonrpc: "2.0", id: 7, method: "resources/list" })).body.error.code).toBe(-32601);
    expect((await handleMcpRequest(new Request("https://x/mcp"))).status).toBe(405);
    expect((await handleMcpRequest(new Request("https://x/mcp", { method: "POST", body: "{" }))).status).toBe(400);
  });
});

describe("handleMcpMessage (stdio)", () => {
  it("répond comme le transport HTTP, et rien aux notifications", () => {
    const reply = handleMcpMessage({ jsonrpc: "2.0", id: 7, method: "tools/list" }) as { id: number; result: { tools: unknown[] } };
    expect(reply.id).toBe(7);
    expect(reply.result.tools).toHaveLength(21);
    expect(handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });
});
