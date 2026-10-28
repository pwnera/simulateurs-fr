---
name: simulateurs-fr
description: Calcule avec les barèmes français 2026 le salaire brut et net, les indemnités de licenciement et de rupture conventionnelle, l'allocation chômage (ARE), les APL, la prime d'activité, les heures supplémentaires, les congés payés, le préavis, le solde de tout compte et les revenus des freelances (TJM, auto-entrepreneur, portage salarial, comparatif des statuts, TVA, seuils micro, retraite). À utiliser pour toute question sur un montant de paie, une indemnité, une aide ou un revenu d'indépendant en France. S'appuie sur le serveur MCP de calculsalairebrutnet.fr.
---

# Simulateurs calculsalairebrutnet.fr

Les outils du serveur MCP `simulateurs-fr` (`https://www.calculsalairebrutnet.fr/mcp`) font les calculs, avec les formules du site [calculsalairebrutnet.fr](https://www.calculsalairebrutnet.fr). Ce skill dit lequel choisir, quoi demander et comment répondre.

## Règles

1. Ne calculez jamais un montant de tête : appelez l'outil, même pour un ordre de grandeur. Cotisations, plafonds et barème de l'impôt changent chaque année, les outils les connaissent.
2. Avant l'appel, demandez seulement ce qui change nettement le résultat et que l'utilisateur n'a pas donné, une ou deux questions à la fois. Pour le reste, laissez la valeur par défaut de l'outil et dites laquelle vous avez retenue.
3. Donnez d'abord le montant principal, arrondi à l'euro, puis les deux ou trois hypothèses qui comptent (statut, temps de travail, ancienneté...).
4. Citez la page `source` renvoyée par l'outil : l'utilisateur y vérifie le détail et ajuste ses paramètres.
5. Les résultats sont indicatifs. Avant une décision (signature, rupture, création d'entreprise), conseillez de vérifier selon le cas avec la convention collective, France Travail, la CAF, l'Urssaf ou un expert-comptable.
6. Si les outils ne répondent pas, proposez d'ajouter le serveur MCP `https://www.calculsalairebrutnet.fr/mcp` (mode d'emploi : https://www.calculsalairebrutnet.fr/integrer/ia) au lieu d'improviser un calcul.

## Quel outil pour quelle question

| Question | Outil | À demander si l'utilisateur ne l'a pas dit |
|---|---|---|
| « 3 000 € brut, combien en net ? » | `salaire_brut_en_net` | brut mensuel, cadre ou non-cadre |
| « Quel brut pour 2 500 € net ? » | `salaire_net_en_brut` | net mensuel visé, cadre ou non-cadre |
| Indemnité de licenciement | `indemnite_licenciement` | ancienneté, dernier salaire brut, convention collective si connue |
| Rupture conventionnelle | `rupture_conventionnelle` | ancienneté, dernier salaire brut, montant négocié s'il existe |
| Allocation chômage (ARE) | `allocation_chomage` | salaire brut mensuel moyen, âge, mois travaillés |
| APL | `simulation_apl` | loyer, revenus mensuels, foyer, zone (1, 2 ou 3) |
| Prime d'activité | `prime_activite` | revenus mensuels, foyer, logement |
| Heures supplémentaires | `heures_supplementaires` | heures à 25 % et à 50 %, taux horaire ou salaire |
| Jours de congés acquis | `conges_payes_jours_acquis` | mois travaillés, décompte en jours ouvrables ou ouvrés |
| Indemnité de congés payés | `conges_payes_indemnite` | salaire brut, jours pris, jours acquis sur la période |
| Indemnités kilométriques | `indemnites_kilometriques` | puissance fiscale, kilomètres par an, voiture ou deux-roues |
| Durée du préavis | `preavis` | démission ou licenciement, ancienneté, cadre ou non |
| Solde de tout compte | `solde_tout_compte` | salaire brut, jours travaillés dans le mois, congés non pris |
| Comparer deux offres | `compare_offres` | salaire, primes et avantages de chaque offre |
| Freelance : du TJM au net | `freelance_tjm_ca_net` | statut (micro, EURL, SASU, portage...), TJM et jours, ou chiffre d'affaires |
| Auto-entrepreneur | `auto_entrepreneur` | activité (services, vente, libéral), chiffre d'affaires |
| Portage salarial | `portage_salarial` | TJM et jours, ou chiffre d'affaires, frais de gestion |
| Quel statut choisir | `comparatif_statuts` | revenu mensuel souhaité, charges |
| Seuils de la micro-entreprise | `seuils_micro_entreprise` | activité, chiffre d'affaires annuel |
| TVA d'un freelance | `tva_freelance` | chiffre d'affaires HT, activité |
| Retraite et prévoyance d'un indépendant | `retraite_prevoyance_independants` | revenus annuels, régime |

## Exemple

> Je suis cadre, 3 000 € brut par mois. Combien je touche ?

Appelez `salaire_brut_en_net` avec `{ "brutMensuel": 3000, "statut": "cadre" }`, puis répondez : « Environ 2 370 € net par mois avant impôt, soit 28 437 € par an (cadre, temps plein, barèmes 2026). Détail et réglages : https://www.calculsalairebrutnet.fr/outils/salaire-brut-net ».
