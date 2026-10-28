# @calculsalairebrutnet/core

Le moteur de calcul de [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr) : salaire brut et net, cotisations salariales et patronales, impôt sur le revenu, indemnités de licenciement et de rupture conventionnelle, chômage (ARE), APL, prime d'activité, heures supplémentaires, congés payés, préavis, solde de tout compte, et revenus des freelances (TJM, micro-entreprise, EURL, SASU, portage salarial). Barèmes français 2026.

Sans dépendance, hors ligne, ESM, types inclus. Node 18+, navigateurs, Workers, Deno, Bun.

```sh
npm install @calculsalairebrutnet/core
```

```ts
import { brutToNet, autoEntrepreneur } from "@calculsalairebrutnet/core";

brutToNet({ brutMensuel: 3000, statut: "cadre" }).netMensuel; // 2369.71
autoEntrepreneur({ activite: "services_bnc", caMensuel: 5000 }).netMensuel; // 3710
```

Le même moteur existe en Python ([`calculsalairebrutnet`](https://pypi.org/project/calculsalairebrutnet/)) et en serveur MCP pour les assistants IA ([mode d'emploi](https://www.calculsalairebrutnet.fr/integrer/ia)). Code, tests et cas de référence : [github.com/pwnera/simulateurs-fr](https://github.com/pwnera/simulateurs-fr).

Résultats indicatifs. Licence MIT.
