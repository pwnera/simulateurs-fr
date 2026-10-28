"""Paramètres des aides de la CAF (France métropolitaine).

APL / allocations de logement en location (arrêté du 27 septembre 2019) – valeurs au 1er octobre 2026
(arrêté du 28 septembre 2026, +1,15 %). R0 2026 = valeurs 2025 (décret 2025-1401).
Prime d'activité – valeurs au 1er avril 2026 (décret n° 2026-222 du 30 mars 2026).
RSA – montant forfaitaire au 1er avril 2026 (décret n° 2026-220).
@see https://www.legifrance.gouv.fr/loda/id/JORFTEXT000039160329
"""
APL_DATE_BAREME = "1er octobre 2026"

# Loyers plafonds : [personne seule, couple sans personne à charge, 1 personne à charge, + par personne à charge supplémentaire].
APL_LOYERS_PLAFONDS = {
    "1": [336.97, 406.4, 459.32, 66.65],
    "2": [293.68, 359.47, 404.49, 58.88],
    "3": [275.25, 333.67, 374.13, 53.62],
}
APL_COEF_COLOCATION = 0.75

APL_FORFAIT_CHARGES = {
    "general": 61.29,
    "colocation_isole": 30.64,
    "colocation_couple": 61.29,
    "par_personne_a_charge": 13.9,
}

# Participation minimale P0 = max(8,5 % × (L + C), forfait).
APL_P0 = {"taux": 0.085, "forfait": 40.01}

# Taux famille TF selon la composition : isolé, couple, puis 1 à 6 personnes à charge ; −0,06 point par personne au-delà.
APL_TF = {"isole": 0.0283, "couple": 0.0315, "pac": [0.027, 0.0238, 0.0201, 0.0185, 0.0179, 0.0173], "par_pac_supp": -0.0006}

# Taux de loyer TL selon RL = L / loyer de référence (loyer plafond zone 2).
APL_TL = {"seuil1": 0.45, "seuil2": 0.75, "taux1": 0.0045, "taux2": 0.0068}

# Abattement forfaitaire R0 (annuel) : isolé, couple, puis 1 à 6 personnes à charge ; +346 € par personne au-delà.
APL_R0 = {"isole": 5235, "couple": 7501, "pac": [8947, 9148, 9498, 9851, 10202, 10554], "par_pac_supp": 346}

APL_MINORATION = 5
APL_CRDS = 0.005
# Seuil de non-versement des ALF / ALS (pas de seuil pour l'APL).
AL_SEUIL_VERSEMENT = 10

# Dégressivité pour loyers élevés : début et fin (multiples du loyer plafond).
APL_DEGRESSIVITE = {
    "1": [3.4, 4],
    "2": [2.5, 3.1],
    "3": [2.5, 3.1],
}

# Étudiants : ressources forfaitaires minimales (location), minorées pour les boursiers.
APL_ETUDIANT = {"forfait_ressources": 8600, "minoration_boursier": 1700}

# --- Prime d'activité (1er avril 2026) ---
PRIME_ACTIVITE_DATE_BAREME = "1er avril 2026"
PRIME_ACTIVITE = {
    "montant_forfaitaire": 638.28,
    # Part des revenus professionnels prise en compte.
    "taux_revenus_pro": 0.5985,
    # Majorations : 2e personne +50 %, 3e +30 %, à partir du 3e enfant +40 % par enfant.
    "majoration2e": 0.5,
    "majoration3e": 0.3,
    "majoration_enfant_supp": 0.4,
    # Parent isolé : 128,412 % + 42,804 % par enfant.
    "parent_isole_base": 1.28412,
    "parent_isole_par_enfant": 0.42804,
    # Forfait logement : 12 % / 16 % / 16,5 % du montant forfaitaire (1 / 2 / 3 personnes et plus).
    "forfait_logement": [76.59, 153.19, 189.57],
    # Bonification individuelle : de 0 (≤ 59 × SMIC horaire) à 37,7 % du MF (≥ 138 × SMIC horaire).
    "bonification": {"seuil_heures_smic": 59, "plein_heures_smic": 138, "taux_max": 0.377},
    "versement_minimum": 15,
}

RSA_MONTANT_FORFAITAIRE = 651.69
