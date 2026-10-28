// Fichier généré par scripts/gen-schemas.mjs, ne pas modifier.
export const SCHEMAS: Record<string, Record<string, unknown>> = {
  "salaire_brut_en_net": {
    "type": "object",
    "properties": {
      "brutMensuel": {
        "type": "number"
      },
      "statut": {
        "type": "string",
        "enum": [
          "non-cadre",
          "cadre",
          "fonction-publique",
          "profession-liberale",
          "portage"
        ]
      },
      "tempsTravailPercent": {
        "type": "number"
      },
      "moisPrime": {
        "type": "number"
      },
      "tauxPrelevementSource": {
        "type": "number"
      },
      "primesAnnuelle": {
        "type": "number",
        "description": "Primes / bonus annuel."
      },
      "heuresSupMensuelles": {
        "type": "number",
        "description": "Heures supplémentaires moyennes par mois (majoration 25 %)."
      },
      "mutuelleMensuelle": {
        "type": "number",
        "description": "Part salariale de la mutuelle (€ / mois)."
      }
    },
    "required": [
      "brutMensuel",
      "statut"
    ],
    "additionalProperties": false
  },
  "salaire_net_en_brut": {
    "type": "object",
    "properties": {
      "netMensuel": {
        "type": "number"
      },
      "statut": {
        "type": "string",
        "enum": [
          "non-cadre",
          "cadre",
          "fonction-publique",
          "profession-liberale",
          "portage"
        ]
      },
      "tempsTravailPercent": {
        "type": "number"
      },
      "moisPrime": {
        "type": "number"
      },
      "tauxPrelevementSource": {
        "type": "number"
      },
      "mutuelleMensuelle": {
        "type": "number"
      }
    },
    "required": [
      "netMensuel",
      "statut"
    ],
    "additionalProperties": false
  },
  "indemnite_licenciement": {
    "type": "object",
    "properties": {
      "dernierSalaireMensuelBrut": {
        "type": "number"
      },
      "dernierSalaireMensuelNet": {
        "type": "number"
      },
      "tauxCotisations": {
        "type": "number"
      },
      "moyenne3DerniersMois": {
        "type": "number",
        "description": "Moyenne brute des 3 derniers mois (facultatif, retenue si plus favorable)."
      },
      "ancienneteAnnees": {
        "type": "number"
      },
      "ancienneteMois": {
        "type": "number"
      },
      "anneeBarèmes": {
        "type": "string",
        "enum": [
          "2024",
          "2025",
          "2026"
        ],
        "description": "Conservé pour compatibilité des URL ; l'indemnité légale ne dépend pas du plafond de la Sécurité sociale."
      },
      "convention": {
        "type": "string"
      },
      "categorie": {
        "type": "string",
        "enum": [
          "non-cadre",
          "cadre"
        ],
        "description": "Syntec : cadre (IC) ou ETAM ; Métallurgie : groupes F à I (cadre) ou A à E."
      },
      "fauteGrave": {
        "type": "boolean"
      },
      "ruptureConventionnelle": {
        "type": "boolean",
        "description": "Rupture conventionnelle : pas de condition de 8 mois d'ancienneté."
      }
    },
    "required": [
      "ancienneteAnnees"
    ],
    "additionalProperties": false
  },
  "rupture_conventionnelle": {
    "type": "object",
    "properties": {
      "dernierSalaireMensuelBrut": {
        "type": "number"
      },
      "dernierSalaireMensuelNet": {
        "type": "number"
      },
      "tauxCotisations": {
        "type": "number"
      },
      "moyenne3DerniersMois": {
        "type": "number"
      },
      "ancienneteAnnees": {
        "type": "number"
      },
      "ancienneteMois": {
        "type": "number"
      },
      "anneeBarèmes": {
        "type": "string",
        "enum": [
          "2024",
          "2025",
          "2026"
        ]
      },
      "convention": {
        "type": "string"
      },
      "categorie": {
        "type": "string",
        "enum": [
          "non-cadre",
          "cadre"
        ],
        "description": "Syntec : cadre (IC) ou ETAM ; Métallurgie : groupes F à I (cadre) ou A à E."
      },
      "indemniteNegociee": {
        "type": "number",
        "description": "Montant brut négocié (facultatif)."
      },
      "remunerationAnnuelleN1": {
        "type": "number",
        "description": "Rémunération brute de l'année civile précédente (défaut : salaire de référence × 12)."
      }
    },
    "required": [
      "ancienneteAnnees"
    ],
    "additionalProperties": false
  },
  "allocation_chomage": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "salaireBrutMensuelMoyen": {
        "type": "number",
        "description": "Salaire brut mensuel moyen sur la période de référence (primes comprises)."
      },
      "ageMoins55": {
        "type": "boolean",
        "description": "Compatibilité : true = moins de 55 ans."
      },
      "trancheAge": {
        "type": "string",
        "enum": [
          "moins-55",
          "55-56",
          "57-plus"
        ]
      },
      "moisTravailles": {
        "type": "number",
        "description": "Mois travaillés sur la période de référence (24 ou 36 mois). Défaut : toute la période."
      },
      "ruptureConventionnelle": {
        "type": "boolean",
        "description": "Fin de contrat par rupture conventionnelle (règles du 1er septembre 2026)."
      }
    },
    "required": [
      "salaireBrutMensuelMoyen"
    ]
  },
  "simulation_apl": {
    "type": "object",
    "properties": {
      "loyerMensuel": {
        "type": "number"
      },
      "revenusMensuels": {
        "type": "number",
        "description": "Revenus nets mensuels du foyer (salaires, chômage…). Convertis en ressources annuelles imposables."
      },
      "nbPersonnes": {
        "type": "number",
        "description": "Compatibilité : nombre de personnes du foyer (adultes + enfants)."
      },
      "nbEnfants": {
        "type": "number"
      },
      "couple": {
        "type": "boolean"
      },
      "zone": {
        "type": "string",
        "enum": [
          "1",
          "2",
          "3"
        ]
      },
      "colocation": {
        "type": "boolean"
      },
      "etudiant": {
        "type": "boolean"
      },
      "boursier": {
        "type": "boolean"
      },
      "ressourcesAnnuelles": {
        "type": "number",
        "description": "Ressources annuelles déjà connues (net imposable après abattement) : remplace la conversion."
      }
    },
    "required": [
      "loyerMensuel",
      "revenusMensuels"
    ],
    "additionalProperties": false
  },
  "heures_supplementaires": {
    "type": "object",
    "properties": {
      "tauxHoraireBrut": {
        "type": "number"
      },
      "tauxHoraireNet": {
        "type": "number"
      },
      "tauxCotisations": {
        "type": "number"
      },
      "salaireMensuelBrut": {
        "type": "number",
        "description": "Salaire mensuel brut (alternatif au taux horaire). Heures mensuelles déduites de heuresContratHebdo."
      },
      "heuresContratHebdo": {
        "anyOf": [
          {
            "type": "number"
          },
          {
            "type": "number",
            "enum": [
              35,
              37,
              39
            ]
          }
        ],
        "description": "Heures contractuelles par semaine (35, 37, 39 ou personnalisé). Défaut 35."
      },
      "tauxMajoration1": {
        "type": "number",
        "description": "Majoration 1 (ex. 0.25 pour 25%). Défaut 0.25."
      },
      "tauxMajoration2": {
        "type": "number",
        "description": "Majoration 2 (ex. 0.5 pour 50%). Défaut 0.5."
      },
      "heuresSup25": {
        "type": "number"
      },
      "heuresSup50": {
        "type": "number"
      },
      "tauxChargesNet": {
        "type": "number",
        "description": "Taux de charges salariales pour estimation net (défaut 0.22)."
      },
      "heuresComp10": {
        "type": "number",
        "description": "Heures complémentaires (temps partiel) majorées à 10 %."
      },
      "reductionSalariale": {
        "type": "boolean",
        "description": "Appliquer la réduction de cotisations salariales sur heures sup (défaut : oui)."
      }
    },
    "required": [
      "heuresSup25",
      "heuresSup50"
    ],
    "additionalProperties": false
  },
  "conges_payes_jours_acquis": {
    "type": "object",
    "properties": {
      "decompte": {
        "type": "string",
        "enum": [
          "ouvrables",
          "ouvres"
        ],
        "description": "Congés payés : jours acquis, restants et indemnité (Code du travail).\n\nAcquisition (art. L3141-3 et suivants) : 2,5 jours ouvrables par mois de travail effectif, soit 30 jours ouvrables (5 semaines) par période de référence (1er juin – 31 mai en général). En jours ouvrés : 25 jours par an (2,08 jours / mois).\n\nArrêts maladie (loi n° 2024-364 du 22 avril 2024) :\n- maladie non professionnelle : 2 jours ouvrables par mois d'arrêt, plafond 24 jours ouvrables par an   (en cumul avec les jours acquis pendant le travail, le total reste plafonné à 30 jours) ;\n- accident du travail / maladie professionnelle : 2,5 jours ouvrables par mois (assimilé à du travail).\n\nIndemnité (art. L3141-24) : le salarié perçoit la plus favorable de deux méthodes :\n- maintien de salaire : ce qu'il aurait gagné s'il avait travaillé ;\n- règle du dixième : 1/10 de la rémunération brute totale perçue pendant la période de référence,   au prorata des jours pris."
      },
      "moisTravailles": {
        "type": "number",
        "description": "Mois de travail effectif (ou assimilés : congés, AT/MP, maternité…) sur la période."
      },
      "moisMaladie": {
        "type": "number",
        "description": "Mois d'arrêt maladie non professionnelle sur la période."
      }
    },
    "required": [
      "decompte",
      "moisTravailles"
    ],
    "additionalProperties": false
  },
  "conges_payes_indemnite": {
    "type": "object",
    "properties": {
      "decompte": {
        "type": "string",
        "enum": [
          "ouvrables",
          "ouvres"
        ],
        "description": "Congés payés : jours acquis, restants et indemnité (Code du travail).\n\nAcquisition (art. L3141-3 et suivants) : 2,5 jours ouvrables par mois de travail effectif, soit 30 jours ouvrables (5 semaines) par période de référence (1er juin – 31 mai en général). En jours ouvrés : 25 jours par an (2,08 jours / mois).\n\nArrêts maladie (loi n° 2024-364 du 22 avril 2024) :\n- maladie non professionnelle : 2 jours ouvrables par mois d'arrêt, plafond 24 jours ouvrables par an   (en cumul avec les jours acquis pendant le travail, le total reste plafonné à 30 jours) ;\n- accident du travail / maladie professionnelle : 2,5 jours ouvrables par mois (assimilé à du travail).\n\nIndemnité (art. L3141-24) : le salarié perçoit la plus favorable de deux méthodes :\n- maintien de salaire : ce qu'il aurait gagné s'il avait travaillé ;\n- règle du dixième : 1/10 de la rémunération brute totale perçue pendant la période de référence,   au prorata des jours pris."
      },
      "jours": {
        "type": "number",
        "description": "Jours de congés à indemniser (pris ou non pris)."
      },
      "joursAcquisPeriode": {
        "type": "number",
        "description": "Jours acquis sur la période de référence (base de proratisation du dixième)."
      },
      "salaireBrutMensuel": {
        "type": "number",
        "description": "Salaire brut mensuel habituel (maintien de salaire)."
      },
      "remunerationReference": {
        "type": "number",
        "description": "Rémunération brute totale de la période de référence (règle du dixième). Défaut : salaire × 12."
      }
    },
    "required": [
      "decompte",
      "jours",
      "joursAcquisPeriode",
      "salaireBrutMensuel"
    ],
    "additionalProperties": false
  },
  "prime_activite": {
    "type": "object",
    "properties": {
      "revenusMensuels": {
        "type": "number",
        "description": "Revenus professionnels nets mensuels (personne 1). En compatibilité : revenus du foyer."
      },
      "revenusConjoint": {
        "type": "number",
        "description": "Revenus professionnels nets mensuels du conjoint."
      },
      "nbPersonnes": {
        "type": "number",
        "description": "Compatibilité : nombre de personnes du foyer."
      },
      "nbEnfants": {
        "type": "number"
      },
      "couple": {
        "type": "boolean"
      },
      "autresRessources": {
        "type": "number",
        "description": "Autres ressources mensuelles (chômage, pensions, allocations familiales…)."
      },
      "logement": {
        "type": "string",
        "enum": [
          "locataire-aide",
          "locataire-sans-aide",
          "proprietaire",
          "heberge"
        ]
      },
      "aideLogement": {
        "type": "number",
        "description": "Montant de l'aide au logement perçue (forfait logement = min(aide, forfait))."
      }
    },
    "required": [
      "revenusMensuels"
    ],
    "additionalProperties": false
  },
  "indemnites_kilometriques": {
    "type": "object",
    "properties": {
      "puissanceFiscale": {
        "type": "number"
      },
      "distanceAnnuelle": {
        "type": "number"
      },
      "typeVehicule": {
        "type": "string",
        "enum": [
          "voiture",
          "moto",
          "cyclomoteur"
        ]
      },
      "electrique": {
        "type": "boolean"
      },
      "salairesNetsImposables": {
        "type": "number",
        "description": "Salaires nets imposables annuels (pour comparer avec l'abattement de 10 %)."
      },
      "autresFraisReels": {
        "type": "number",
        "description": "Autres frais réels déductibles (repas, formation…) ajoutés à la comparaison."
      }
    },
    "required": [
      "puissanceFiscale",
      "distanceAnnuelle"
    ],
    "additionalProperties": false
  },
  "preavis": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "demission",
          "licenciement",
          "depart-retraite",
          "mise-retraite",
          "essai-employeur",
          "essai-salarie"
        ],
        "description": "Préavis : durée selon le type de rupture et l'ancienneté (Code du travail).\n\n- Licenciement (art. L1234-1) : < 6 mois → pas de minimum légal (convention / usage) ;   6 mois à < 2 ans → 1 mois ; ≥ 2 ans → 2 mois. Pas de préavis en cas de faute grave ou lourde.   Travailleur handicapé (art. L5213-9) : durée doublée, dans la limite de 3 mois.\n- Démission : aucune durée légale ; elle est fixée par la convention collective, un accord,   le contrat ou les usages (souvent 1 mois non-cadre, 3 mois cadre).\n- Départ ou mise à la retraite (art. L1237-6 et L1237-10) : mêmes durées que le licenciement.\n- Rupture de la période d'essai (art. L1221-25 et L1221-26) : délai de prévenance.\n\nQuand une convention ou le contrat prévoit une durée plus longue (licenciement, retraite), c'est la durée la plus favorable au salarié qui s'applique."
      },
      "ancienneteAnnees": {
        "type": "number"
      },
      "ancienneteMois": {
        "type": "number"
      },
      "cadre": {
        "type": "boolean"
      },
      "fauteGrave": {
        "type": "boolean",
        "description": "Licenciement pour faute grave ou lourde : pas de préavis."
      },
      "travailleurHandicape": {
        "type": "boolean",
        "description": "Bénéficiaire de l'obligation d'emploi (travailleur handicapé)."
      },
      "dureeConventionnelleMois": {
        "type": "number",
        "description": "Durée conventionnelle ou contractuelle connue, en mois (prioritaire si plus favorable)."
      },
      "presenceJours": {
        "type": "number",
        "description": "Présence dans l'entreprise en jours calendaires (rupture de période d'essai)."
      },
      "dateNotification": {
        "type": "string",
        "description": "Date de notification (point de départ du préavis), format AAAA-MM-JJ."
      }
    },
    "required": [
      "type",
      "ancienneteAnnees"
    ],
    "additionalProperties": false
  },
  "solde_tout_compte": {
    "type": "object",
    "properties": {
      "salaireBrutMensuel": {
        "type": "number",
        "description": "Salaire brut mensuel."
      },
      "joursTravaillesDansLeMois": {
        "type": "number"
      },
      "joursOuvresMois": {
        "type": "number",
        "description": "Jours ouvrés du mois de départ (souvent 20 à 23)."
      },
      "joursCongesNonPris": {
        "type": "number"
      },
      "decompteConges": {
        "type": "string",
        "enum": [
          "ouvrables",
          "ouvres"
        ],
        "description": "Congés payés : jours acquis, restants et indemnité (Code du travail).\n\nAcquisition (art. L3141-3 et suivants) : 2,5 jours ouvrables par mois de travail effectif, soit 30 jours ouvrables (5 semaines) par période de référence (1er juin – 31 mai en général). En jours ouvrés : 25 jours par an (2,08 jours / mois).\n\nArrêts maladie (loi n° 2024-364 du 22 avril 2024) :\n- maladie non professionnelle : 2 jours ouvrables par mois d'arrêt, plafond 24 jours ouvrables par an   (en cumul avec les jours acquis pendant le travail, le total reste plafonné à 30 jours) ;\n- accident du travail / maladie professionnelle : 2,5 jours ouvrables par mois (assimilé à du travail).\n\nIndemnité (art. L3141-24) : le salarié perçoit la plus favorable de deux méthodes :\n- maintien de salaire : ce qu'il aurait gagné s'il avait travaillé ;\n- règle du dixième : 1/10 de la rémunération brute totale perçue pendant la période de référence,   au prorata des jours pris."
      },
      "joursAcquisPeriode": {
        "type": "number",
        "description": "Jours acquis sur la période (base du dixième). Défaut : 30 ouvrables / 25 ouvrés."
      },
      "remunerationReferenceConges": {
        "type": "number",
        "description": "Rémunération brute de la période de référence des congés (règle du dixième)."
      },
      "preavisNonEffectueMois": {
        "type": "number",
        "description": "Préavis non effectué à l'initiative de l'employeur (mois)."
      },
      "moisPourTreizieme": {
        "type": "number",
        "description": "13e mois : nombre de mois travaillés dans l'année en cours (0 = pas de 13e mois)."
      },
      "remunerationTotaleCDD": {
        "type": "number",
        "description": "CDD : rémunération brute totale versée pendant le contrat (prime de précarité)."
      },
      "indemniteRupture": {
        "type": "number",
        "description": "Indemnité de rupture (licenciement, rupture conventionnelle) en brut."
      },
      "tauxCotisations": {
        "type": "number",
        "description": "Taux de cotisations salariales pour l'estimation du net. Défaut 22 %."
      }
    },
    "required": [
      "salaireBrutMensuel",
      "joursTravaillesDansLeMois",
      "joursOuvresMois",
      "joursCongesNonPris"
    ],
    "additionalProperties": false
  },
  "compare_offres": {
    "type": "object",
    "properties": {
      "offreA": {
        "type": "object",
        "properties": {
          "brutMensuel": {
            "type": "number"
          },
          "statut": {
            "type": "string",
            "enum": [
              "non-cadre",
              "cadre"
            ]
          },
          "primesAnnuelle": {
            "type": "number"
          },
          "rttJours": {
            "type": "number"
          }
        },
        "required": [
          "brutMensuel",
          "statut"
        ],
        "additionalProperties": false
      },
      "offreB": {
        "type": "object",
        "properties": {
          "brutMensuel": {
            "type": "number"
          },
          "statut": {
            "type": "string",
            "enum": [
              "non-cadre",
              "cadre"
            ]
          },
          "primesAnnuelle": {
            "type": "number"
          },
          "rttJours": {
            "type": "number"
          }
        },
        "required": [
          "brutMensuel",
          "statut"
        ],
        "additionalProperties": false
      }
    },
    "required": [
      "offreA",
      "offreB"
    ],
    "additionalProperties": false
  },
  "freelance_tjm_ca_net": {
    "type": "object",
    "properties": {
      "caMensuel": {
        "type": "number"
      },
      "tjm": {
        "type": "number"
      },
      "joursParMois": {
        "type": "number"
      },
      "chargesMensuelles": {
        "type": "number",
        "description": "Charges professionnelles mensuelles (déduites en société ; payées de votre poche en micro)."
      },
      "statut": {
        "type": "string",
        "enum": [
          "micro",
          "portage",
          "sasu_is",
          "eurl_ir",
          "eurl_is"
        ]
      },
      "activiteMicro": {
        "type": "string",
        "enum": [
          "vente",
          "services_bic",
          "services_bnc",
          "liberale_cipav"
        ],
        "description": "Micro : activité. Défaut : prestations BNC."
      },
      "fraisPortagePercent": {
        "type": "number",
        "description": "Portage : frais de gestion (%)."
      },
      "partRemuneration": {
        "type": "number",
        "description": "SASU / EURL à l'IS : part du résultat consacrée à la rémunération (0-100 %)."
      },
      "capitalSocial": {
        "type": "number",
        "description": "EURL à l'IS : capital social (seuil de 10 % pour les dividendes). Défaut 1 000 €."
      },
      "professionTNS": {
        "type": "string",
        "enum": [
          "artisan",
          "commercant",
          "liberal",
          "liberal-cipav"
        ],
        "description": "Profession TNS (EURL) : artisan, commerçant, libéral ou libéral Cipav."
      },
      "tauxPrelevementSource": {
        "type": "number",
        "description": "Taux de prélèvement à la source (%) remplaçant l'estimation au barème."
      }
    },
    "required": [
      "statut"
    ],
    "additionalProperties": false
  },
  "auto_entrepreneur": {
    "type": "object",
    "properties": {
      "caMensuel": {
        "type": "number"
      },
      "caAnnuel": {
        "type": "number"
      },
      "activite": {
        "type": "string",
        "enum": [
          "vente",
          "services_bic",
          "services_bnc",
          "liberale_cipav"
        ],
        "description": "Micro-entreprise (auto-entrepreneur) – paramètres 2026. Taux de cotisations : décret n° 2025-943 du 8 septembre 2025. ACRE : LFSS 2026 et décret n° 2026-69. Plafonds de CA 2026-2028 et franchise en base de TVA (art. 293 B CGI, loi de finances 2026)."
      },
      "beneficiaireAcre": {
        "type": "boolean",
        "description": "true = ACRE au taux actuel (25 %) ; préférer `acre` pour préciser le taux."
      },
      "acre": {
        "type": "string",
        "enum": [
          "non",
          "50",
          "25"
        ]
      },
      "artisan": {
        "type": "boolean",
        "description": "Artisan inscrit à la chambre des métiers (CFP 0,3 % au lieu de 0,1 %)."
      },
      "versementLiberatoire": {
        "type": "boolean"
      },
      "tauxPrelevementSource": {
        "type": "number",
        "description": "Taux de prélèvement à la source en % (0–45), appliqué au bénéfice imposable."
      }
    },
    "required": [
      "activite"
    ],
    "additionalProperties": false
  },
  "portage_salarial": {
    "type": "object",
    "properties": {
      "tjm": {
        "type": "number"
      },
      "joursTravaillesParMois": {
        "type": "number"
      },
      "caMensuel": {
        "type": "number"
      },
      "fraisPortagePercent": {
        "type": "number",
        "description": "Frais de gestion de la société de portage (% du CA HT). Défaut 7 %."
      },
      "fraisProfessionnels": {
        "type": "number",
        "description": "Frais professionnels remboursés chaque mois (hors cotisations et impôt)."
      },
      "tauxPrelevementSource": {
        "type": "number",
        "description": "Taux de prélèvement à la source (%) appliqué au net imposable."
      }
    },
    "additionalProperties": false
  },
  "comparatif_statuts": {
    "type": "object",
    "properties": {
      "revenuMensuelSouhaite": {
        "type": "number",
        "description": "Mode « ca » : CA mensuel HT. Mode « net » : net mensuel après impôt visé."
      },
      "mode": {
        "type": "string",
        "enum": [
          "net",
          "ca"
        ]
      },
      "chargesMensuelles": {
        "type": "number",
        "description": "Charges professionnelles mensuelles (hors salarié)."
      }
    },
    "required": [
      "revenuMensuelSouhaite",
      "mode"
    ],
    "additionalProperties": false
  },
  "seuils_micro_entreprise": {
    "type": "object",
    "properties": {
      "activite": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "vente",
              "services_bic",
              "services_bnc",
              "liberale_cipav"
            ],
            "description": "Micro-entreprise (auto-entrepreneur) – paramètres 2026. Taux de cotisations : décret n° 2025-943 du 8 septembre 2025. ACRE : LFSS 2026 et décret n° 2026-69. Plafonds de CA 2026-2028 et franchise en base de TVA (art. 293 B CGI, loi de finances 2026)."
          },
          {
            "type": "string",
            "const": "mixte"
          }
        ]
      },
      "caAnnuel": {
        "type": "number",
        "description": "CA annuel encaissé (HT). Pour une activité mixte : CA total."
      },
      "caServicesMixte": {
        "type": "number",
        "description": "Activité mixte : part de prestations de services dans le CA."
      },
      "depassementAnneePrecedente": {
        "type": "boolean",
        "description": "Plafond micro déjà dépassé l'année précédente ?"
      }
    },
    "required": [
      "activite",
      "caAnnuel"
    ],
    "additionalProperties": false
  },
  "tva_freelance": {
    "type": "object",
    "properties": {
      "caHTAnnuel": {
        "type": "number"
      },
      "activite": {
        "type": "string",
        "enum": [
          "vente",
          "prestations",
          "specifique"
        ]
      },
      "tauxTVA": {
        "type": "number",
        "description": "Taux de TVA applicable à vos ventes. Défaut 20 %."
      },
      "depensesTTC": {
        "type": "number",
        "description": "Dépenses professionnelles TTC annuelles soumises à TVA (pour la TVA déductible)."
      },
      "tauxTVADepenses": {
        "type": "number",
        "description": "Taux moyen de TVA sur les dépenses. Défaut 20 %."
      },
      "optionTVA": {
        "type": "boolean",
        "description": "Opter pour la TVA malgré la franchise."
      }
    },
    "required": [
      "caHTAnnuel",
      "activite"
    ],
    "additionalProperties": false
  },
  "retraite_prevoyance_independants": {
    "type": "object",
    "properties": {
      "revenusAnnuels": {
        "type": "number",
        "description": "Micro : CA annuel. Réel : revenu professionnel annuel avant cotisations."
      },
      "regime": {
        "type": "string",
        "enum": [
          "micro",
          "reel"
        ]
      },
      "activiteMicro": {
        "type": "string",
        "enum": [
          "vente",
          "services_bic",
          "services_bnc",
          "liberale_cipav"
        ],
        "description": "Micro-entreprise (auto-entrepreneur) – paramètres 2026. Taux de cotisations : décret n° 2025-943 du 8 septembre 2025. ACRE : LFSS 2026 et décret n° 2026-69. Plafonds de CA 2026-2028 et franchise en base de TVA (art. 293 B CGI, loi de finances 2026)."
      },
      "profession": {
        "type": "string",
        "enum": [
          "artisan",
          "commercant",
          "liberal",
          "liberal-cipav"
        ]
      }
    },
    "required": [
      "revenusAnnuels",
      "regime"
    ],
    "additionalProperties": false
  }
};
