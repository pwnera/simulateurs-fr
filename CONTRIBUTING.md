# Contribuer

Merci ! Les corrections de barème, les cas limites et les bugs d'arrondi sont les contributions les plus utiles.

## Installer et tester

```sh
npm ci
npm run build       # core, puis mcp (schémas JSON générés depuis les types)
npm test            # tests TypeScript
cd python && python -m venv .venv && .venv/bin/pip install pytest -e . && .venv/bin/pytest -q tests
```

## Changer un barème ou une formule

1. Modifiez le TypeScript dans `packages/core/src` (les taux et plafonds sont dans `constants/`). C'est la référence.
2. Ajoutez ou adaptez un test à côté (`*.test.ts`).
3. Régénérez les cas de référence : `npm run build -w packages/core && node packages/core/scripts/gen-fixtures.mjs`.
4. Reportez le changement dans `python/src/calculsalairebrutnet` (mêmes noms, en `snake_case`) jusqu'à ce que `pytest` repasse.
5. Citez la source officielle (Urssaf, Légifrance, Unédic, CAF, BOFiP...) dans la pull request.

## Messages de commit

Les versions sont publiées par [Release Please](https://github.com/googleapis/release-please) à partir des messages de commit ([Conventional Commits](https://www.conventionalcommits.org/fr/)) :

- `fix: arrondi de la CSG sur les primes` donne une version corrective (1.0.1) ;
- `feat: barèmes 2027` donne une version mineure (1.1.0) ;
- `feat!: ...` ou un pied `BREAKING CHANGE:` donne une version majeure.

Les paquets npm, PyPI, le plugin et l'extension partagent un même numéro de version.

## Style

Textes en français. Pas de tiret cadratin : une virgule, deux-points ou une nouvelle phrase (la CI le vérifie).
