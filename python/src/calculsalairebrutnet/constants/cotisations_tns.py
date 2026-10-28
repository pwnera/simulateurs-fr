"""Cotisations des travailleurs indépendants (TNS) au réel – 2026.

Réforme de l'assiette (revenus 2025, régularisation 2026) : assiette unique = revenu professionnel
avant cotisations − abattement de 26 % (plancher 1,76 % du PASS, plafond 130 % du PASS).
Taux artisans, commerçants et professions libérales non réglementées (SSI) : décret n° 2024-688.
Professions libérales réglementées (CNAVPL / Cipav) : retraite de base et complémentaire propres.

@see https://www.urssaf.fr/accueil/independant/comprendre-payer-cotisations/reforme-cotisations-independants.html
@see https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-ac-plnr.html
"""
TNS_YEAR = "2026"

ABATTEMENT_ASSIETTE_TNS = {
    "taux": 0.26,
    # En fraction du PASS.
    "plancher": 0.0176,
    "plafond": 1.3,
}

# Maladie-maternité : taux progressif (en fraction du PASS → taux), appliqué à tout le revenu sous 3 PASS.
MALADIE_TNS_PALIERS = [
    {"seuil": 0.2, "taux": 0},
    {"seuil": 0.4, "taux": 0.015},
    {"seuil": 0.6, "taux": 0.04},
    {"seuil": 1.1, "taux": 0.065},
    {"seuil": 2, "taux": 0.077},
    {"seuil": 3, "taux": 0.085},
]
# Au-delà de 3 PASS : 8,5 % jusqu'à 3 PASS puis 6,5 % sur le surplus.
MALADIE_TNS_AU_DELA_3_PASS = 0.065

TNS_SSI = {
    # Indemnités journalières : 0,5 % jusqu'à 5 PASS, assiette minimale 40 % du PASS.
    "ij": {"taux": 0.005, "plafond_pass": 5, "min_pass": 0.4},
    # Retraite de base : 17,87 % jusqu'à 1 PASS + 0,72 % sur la totalité ; assiette minimale 450 × SMIC horaire.
    "retraite_base_t1": 0.1787,
    "retraite_base_total": 0.0072,
    "retraite_base_assiette_min_heures_smic": 450,
    # Retraite complémentaire (RCI) : 8,1 % jusqu'à 1 PASS, 9,1 % de 1 à 4 PASS.
    "rci_t1": 0.081,
    "rci_t2": 0.091,
    "rci_plafond_pass": 4,
    # Invalidité-décès : 1,3 % jusqu'à 1 PASS, assiette minimale 11,5 % du PASS.
    "invalidite_deces": 0.013,
    "invalidite_deces_min_pass": 0.115,
}

TNS_CIPAV = {
    # Retraite de base CNAVPL : 8,73 % jusqu'à 1 PASS + 1,87 % de 1 à 5 PASS.
    "retraite_base_t1": 0.0873,
    "retraite_base_t2": 0.0187,
    "retraite_base_plafond_pass": 5,
    # Retraite complémentaire Cipav : 9 % jusqu'à 1 PASS, 22 % de 1 à 4 PASS.
    "complementaire_t1": 0.09,
    "complementaire_t2": 0.22,
    "complementaire_plafond_pass": 4,
    # Invalidité-décès : 0,5 % jusqu'à 1,85 PASS.
    "invalidite_deces": 0.005,
    "invalidite_deces_plafond_pass": 1.85,
    # Indemnités journalières professions libérales : 0,3 % jusqu'à 3 PASS (minimum 40 % du PASS).
    "ij": {"taux": 0.003, "plafond_pass": 3, "min_pass": 0.4},
}

# Allocations familiales : 0 % jusqu'à 110 % du PASS, puis progressif jusqu'à 3,1 % à 140 % du PASS.
ALLOCATIONS_FAMILIALES_TNS = {"seuil_bas": 1.1, "seuil_haut": 1.4, "taux": 0.031}

# CSG (9,2 %) + CRDS (0,5 %) sur l'assiette unique ; part déductible : 6,8 %.
CSG_CRDS_TNS = 0.097
CSG_DEDUCTIBLE_TNS = 0.068

# Contribution à la formation professionnelle (en fraction du PASS).
CFP_TNS = {"commercant_liberal": 0.0025, "artisan": 0.0029}
