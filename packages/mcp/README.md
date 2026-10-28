# @calculsalairebrutnet/mcp

Le serveur [MCP](https://modelcontextprotocol.io) des simulateurs de [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr) : 21 outils (salaire brut et net, indemnités, chômage, APL, freelance...) pour Claude, ChatGPT, Cursor et tout client MCP. Barèmes français 2026.

**Rien à installer pour s'en servir** : la version hébergée est gratuite, sans inscription, à l'adresse `https://www.calculsalairebrutnet.fr/mcp` ([mode d'emploi par application](https://www.calculsalairebrutnet.fr/integrer/ia)).

Ce paquet sert à l'héberger soi-même. Transport « Streamable HTTP » sans état : une fonction `Request` vers `Response`, sans session ni dépendance Node.

```sh
npm install @calculsalairebrutnet/mcp
```

```ts
import { handleMcpRequest } from "@calculsalairebrutnet/mcp";

// Cloudflare Workers
export default { fetch: (request: Request) => handleMcpRequest(request) };

// Deno : Deno.serve(handleMcpRequest)
// Bun :  Bun.serve({ fetch: handleMcpRequest })
```

`handleMcpRequest(request, { onToolCall(name) {} })` prévient à chaque appel d'outil, par exemple pour compter les usages. Les paramètres sont validés par des schémas JSON générés depuis les types de [`@calculsalairebrutnet/core`](https://www.npmjs.com/package/@calculsalairebrutnet/core).

Code et tests : [github.com/pwnera/simulateurs-fr](https://github.com/pwnera/simulateurs-fr). Licence MIT.
