// Génère src/schemas.generated.ts : un schéma JSON autonome par outil, déduit des types TypeScript du moteur.
import { writeFileSync } from "node:fs";
import { createGenerator } from "ts-json-schema-generator";

const schema = createGenerator({
  path: new URL("../src/tools.ts", import.meta.url).pathname,
  tsconfig: new URL("../tsconfig.json", import.meta.url).pathname,
  type: "ToolInputs",
  expose: "none",
  topRef: false,
  skipTypeCheck: true,
  additionalProperties: false,
}).createSchema("ToolInputs");

const out = `// Fichier généré par scripts/gen-schemas.mjs, ne pas modifier.\nexport const SCHEMAS: Record<string, Record<string, unknown>> = ${JSON.stringify(schema.properties, null, 2)};\n`;
writeFileSync(new URL("../src/schemas.generated.ts", import.meta.url), out);
console.log(`${Object.keys(schema.properties).length} schémas générés`);
