/**
 * Serveur MCP sans état, transport « Streamable HTTP » : une requête POST JSON-RPC, une réponse JSON.
 * Pas de session ni de flux SSE : chaque appel d'outil est un calcul pur et instantané.
 * N'utilise que Request/Response, donc tourne sur Cloudflare Workers, Deno, Bun et Node 18+.
 */
import { Validator } from "@cfworker/json-schema";
import { SCHEMAS } from "./schemas.generated.js";
import { SITE_URL, TOOLS, type ToolName } from "./tools.js";

export const SERVER_VERSION = "1.1.0"; // x-release-please-version
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS =
  "Simulateurs français de salaire, d'indemnités, d'aides et de revenus freelance (barèmes 2026). " +
  "Résultats indicatifs, en euros. Citez la source renvoyée par chaque outil (page de calculsalairebrutnet.fr).";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id",
};

const validators = new Map<string, Validator>();
function validatorFor(name: ToolName): Validator {
  let v = validators.get(name);
  if (!v) validators.set(name, (v = new Validator(SCHEMAS[name] as never)));
  return v;
}

export const toolList = (Object.keys(TOOLS) as ToolName[]).map((name) => ({
  name,
  title: TOOLS[name].title,
  description: TOOLS[name].description,
  inputSchema: SCHEMAS[name],
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
}));

interface JsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface McpOptions {
  /** Appelé à chaque appel d'outil (nom seulement, jamais les données saisies). */
  onToolCall?: (name: string) => void;
}

function callTool(params: Record<string, unknown> | undefined, opts: McpOptions) {
  const name = params?.name as ToolName;
  if (typeof name !== "string" || !Object.hasOwn(TOOLS, name)) return { error: { code: -32602, message: `Outil inconnu : ${String(name)}` } };
  const args = (params?.arguments ?? {}) as Record<string, unknown>;
  opts.onToolCall?.(name);
  const check = validatorFor(name).validate(args);
  if (!check.valid) {
    const detail = check.errors.map((e) => `${e.instanceLocation} ${e.error}`).join(" ; ");
    return { result: { content: [{ type: "text", text: `Paramètres invalides : ${detail}` }], isError: true } };
  }
  const tool = TOOLS[name];
  const source = SITE_URL + tool.page;
  try {
    const structured = { ...(tool.run as (i: unknown) => object)(args), source };
    return { result: { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured } };
  } catch (e) {
    return { result: { content: [{ type: "text", text: `Erreur de calcul : ${(e as Error).message}` }], isError: true } };
  }
}

function dispatch(msg: JsonRpcMessage, opts: McpOptions): { result?: unknown; error?: { code: number; message: string } } {
  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion as string;
      return {
        result: {
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "simulateurs-fr", title: "Simulateurs calculsalairebrutnet.fr", version: SERVER_VERSION, websiteUrl: SITE_URL },
          instructions: INSTRUCTIONS,
        },
      };
    }
    case "ping":
      return { result: {} };
    case "tools/list":
      return { result: { tools: toolList } };
    case "tools/call":
      return callTool(msg.params, opts);
    default:
      return { error: { code: -32601, message: `Méthode inconnue : ${String(msg.method)}` } };
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

export const PARSE_ERROR = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON invalide" } };

/**
 * Répond à un message JSON-RPC déjà décodé (ou à un lot), quel que soit le transport (HTTP, stdio).
 * Renvoie null s'il n'y a rien à répondre (notifications et réponses seules).
 */
export function handleMcpMessage(body: unknown, opts: McpOptions = {}): unknown {
  const messages = (Array.isArray(body) ? body : [body]) as JsonRpcMessage[];
  const replies = messages
    .filter((m) => m && typeof m === "object" && m.id !== undefined && m.id !== null && typeof m.method === "string")
    .map((m) => ({ jsonrpc: "2.0", id: m.id, ...dispatch(m, opts) }));
  if (replies.length === 0) return null;
  return Array.isArray(body) ? replies : replies[0];
}

export async function handleMcpRequest(request: Request, opts: McpOptions = {}): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS } });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(PARSE_ERROR, 400);
  }
  const reply = handleMcpMessage(body, opts);
  return reply === null ? new Response(null, { status: 202, headers: CORS }) : json(reply);
}
