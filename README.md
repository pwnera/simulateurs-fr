<a href="https://www.calculsalairebrutnet.fr/integrer/ia"><img src="assets/banner.png" width="100%" alt="Simulateurs FR : les simulateurs de calculsalairebrutnet.fr dans votre code et votre IA. TypeScript, Python, serveur MCP pour Claude, ChatGPT et Cursor."></a>

# Simulateurs FR

**Le moteur de calcul de [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr), en open source.** Salaire brut et net, cotisations, impôt sur le revenu, indemnités de licenciement et de rupture conventionnelle, chômage (ARE), APL, prime d'activité, congés payés, préavis, et revenus des freelances (TJM, auto-entrepreneur, portage salarial, comparatif des statuts). Barèmes 2026.

> **English.** The open-source calculation engine behind [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr), the French salary and freelance calculators: gross to net pay, social contributions, income tax, severance, unemployment benefits, housing aid and self-employed income, under 2026 French rules. TypeScript and Python packages that run offline and give identical results, plus a free hosted MCP server for AI assistants.

[![CI](https://github.com/pwnera/simulateurs-fr/actions/workflows/ci.yml/badge.svg)](https://github.com/pwnera/simulateurs-fr/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@calculsalairebrutnet/core)](https://www.npmjs.com/package/@calculsalairebrutnet/core)
[![PyPI](https://img.shields.io/pypi/v/calculsalairebrutnet)](https://pypi.org/project/calculsalairebrutnet/)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-green)](LICENSE)

## Contenu

| Dossier | Quoi | Où |
|---|---|---|
| [`packages/core`](packages/core) | Le moteur TypeScript, sans dépendance, hors ligne | npm `@calculsalairebrutnet/core` |
| [`packages/mcp`](packages/mcp) | Le serveur MCP : HTTP sans état (Workers, Deno, Bun, Node 18+) ou stdio en local | npm `@calculsalairebrutnet/mcp` |
| [`python`](python) | Le même moteur en Python 3.9+, sans dépendance | PyPI `calculsalairebrutnet` |
| [`skills`](skills), [`.mcp.json`](.mcp.json) | Plugin Claude Code et Cursor : serveur MCP et skill | `/plugin install` |
| [`gemini-extension.json`](gemini-extension.json) | Extension Gemini CLI | `gemini extensions install` |
| [`server.json`](server.json) | Fiche du registre MCP officiel | `fr.calculsalairebrutnet/simulateurs` |
| [`fixtures`](fixtures) | 1 789 cas de référence produits par le moteur TypeScript | tests des deux langages |

## Dans votre assistant IA

Le serveur MCP est hébergé gratuitement, sans inscription : `https://www.calculsalairebrutnet.fr/mcp`. Boutons d'installation pour Cursor, VS Code, LM Studio et Goose, et pas à pas pour Claude, ChatGPT et Le Chat : [calculsalairebrutnet.fr/integrer/ia](https://www.calculsalairebrutnet.fr/integrer/ia).

```sh
# Claude Code : serveur et skill
/plugin marketplace add pwnera/simulateurs-fr
/plugin install simulateurs-fr@calculsalairebrutnet

# Gemini CLI
gemini extensions install https://github.com/pwnera/simulateurs-fr

# Codex CLI
codex mcp add simulateurs-fr --url https://www.calculsalairebrutnet.fr/mcp
```

Le serveur ne garde aucun montant : il journalise seulement le nom de l'outil appelé.

Hors ligne, sur votre machine (Claude Desktop et clients MCP locaux) : `npx -y @calculsalairebrutnet/mcp`, en stdio. Les calculs restent sur votre poste.

## Sur votre site

Pas besoin de code : le simulateur brut / net s'intègre en collant un extrait HTML, gratuit et toujours à jour des barèmes. Code à copier et aperçu : [calculsalairebrutnet.fr/integrer](https://www.calculsalairebrutnet.fr/integrer).

## TypeScript

```sh
npm install @calculsalairebrutnet/core
```

```ts
import { brutToNet } from "@calculsalairebrutnet/core";

brutToNet({ brutMensuel: 3000, statut: "cadre" }).netMensuel; // 2369.71
```

## Python

```sh
pip install calculsalairebrutnet
```

```py
from calculsalairebrutnet import brut_to_net

brut_to_net(brut_mensuel=3000, statut="cadre")["net_mensuel"]  # 2369.71
```

Les noms suivent le TypeScript en `snake_case` (`brutToNet` devient `brut_to_net`, `netMensuel` devient `net_mensuel`).

## Les 21 outils

Chaque outil MCP renvoie aussi la page du simulateur, pour vérifier le détail.

| Outil MCP | Simulateur |
|---|---|
| `salaire_brut_en_net` | [Salaire brut en net](https://www.calculsalairebrutnet.fr/outils/salaire-brut-net) |
| `salaire_net_en_brut` | [Salaire net en brut](https://www.calculsalairebrutnet.fr/outils/salaire-brut-net) |
| `indemnite_licenciement` | [Indemnité de licenciement](https://www.calculsalairebrutnet.fr/outils/indemnite-licenciement) |
| `rupture_conventionnelle` | [Rupture conventionnelle](https://www.calculsalairebrutnet.fr/outils/rupture-conventionnelle) |
| `allocation_chomage` | [Allocation chômage (ARE)](https://www.calculsalairebrutnet.fr/outils/allocation-chomage) |
| `simulation_apl` | [Simulation APL](https://www.calculsalairebrutnet.fr/outils/simulation-apl) |
| `heures_supplementaires` | [Heures supplémentaires](https://www.calculsalairebrutnet.fr/outils/heures-supplementaires) |
| `conges_payes_jours_acquis` | [Congés payés : jours acquis](https://www.calculsalairebrutnet.fr/outils/conges-payes) |
| `conges_payes_indemnite` | [Congés payés : indemnité](https://www.calculsalairebrutnet.fr/outils/conges-payes) |
| `prime_activite` | [Prime d'activité](https://www.calculsalairebrutnet.fr/outils/prime-activite) |
| `indemnites_kilometriques` | [Indemnités kilométriques](https://www.calculsalairebrutnet.fr/outils/indemnites-kilometriques) |
| `preavis` | [Préavis](https://www.calculsalairebrutnet.fr/outils/preavis) |
| `solde_tout_compte` | [Solde de tout compte](https://www.calculsalairebrutnet.fr/outils/solde-tout-compte) |
| `compare_offres` | [Comparateur d'offres](https://www.calculsalairebrutnet.fr/outils/compare-offres) |
| `freelance_tjm_ca_net` | [TJM / CA en net (freelance)](https://www.calculsalairebrutnet.fr/freelances/tjm-ca-net) |
| `auto_entrepreneur` | [Auto-entrepreneur](https://www.calculsalairebrutnet.fr/freelances/auto-entrepreneur) |
| `portage_salarial` | [Portage salarial](https://www.calculsalairebrutnet.fr/freelances/portage-salarial) |
| `comparatif_statuts` | [Comparatif des statuts](https://www.calculsalairebrutnet.fr/freelances/comparatif-statuts) |
| `seuils_micro_entreprise` | [Seuils et plafonds micro-entreprise](https://www.calculsalairebrutnet.fr/freelances/seuils-plafonds-micro) |
| `tva_freelance` | [TVA freelance](https://www.calculsalairebrutnet.fr/freelances/tva-freelance) |
| `retraite_prevoyance_independants` | [Retraite et prévoyance des indépendants](https://www.calculsalairebrutnet.fr/freelances/retraite-prevoyance-independants) |

## Exactitude

Le moteur TypeScript fait référence : c'est lui qui tourne sur [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr). Le script `packages/core/scripts/gen-fixtures.mjs` en tire 1 789 cas, et le portage Python doit les retrouver à 1e-9 près. La CI échoue si un écart apparaît ou si les fixtures ne sont plus à jour.

Les barèmes (Urssaf, Agirc-Arrco, impôt, Unédic, CAF) et leurs sources sont listés sur la page [Sources et barèmes](https://www.calculsalairebrutnet.fr/sources). Les résultats sont des estimations : ils ne remplacent ni un bulletin de paie, ni l'avis de France Travail, de la CAF ou d'un expert-comptable.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md). Les corrections de barème sont les plus utiles : chaque 1er janvier, une partie des taux change.

## Licence

[MIT](LICENSE). Fait par l'équipe de [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr).
