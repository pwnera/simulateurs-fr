#!/usr/bin/env node
/// <reference types="node" />
/**
 * Transport stdio : un message JSON-RPC par ligne sur l'entrée standard, une réponse par ligne sur la sortie.
 * Pour Claude Desktop, Glama et tout client MCP local. Les calculs tournent sur la machine, sans réseau.
 * Usage : npx -y @calculsalairebrutnet/mcp
 */
import { createInterface } from "node:readline";
import { handleMcpMessage, PARSE_ERROR } from "./handler.js";

for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  let body: unknown;
  try {
    body = JSON.parse(line);
  } catch {
    process.stdout.write(JSON.stringify(PARSE_ERROR) + "\n");
    continue;
  }
  const reply = handleMcpMessage(body);
  if (reply !== null) process.stdout.write(JSON.stringify(reply) + "\n");
}
