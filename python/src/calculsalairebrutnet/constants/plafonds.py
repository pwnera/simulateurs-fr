"""Plafonds et paramètres annuels (Sécurité sociale, SMIC).
Mise à jour à chaque revalorisation (voir docs/BAREMES_2026.md).
"""
SOURCE_PLAFONDS = "URSSAF, Sécurité sociale"

# PASS : plafond annuel de la Sécurité sociale. PMSS : plafond mensuel.
PLAFONDS_2024 = {
    "plafond_secu_annuel": 46_368,
    "plafond_secu_mensuel": 3_864,
    "plafond_secu_horaire": 29,
}

PLAFONDS_2025 = {
    "plafond_secu_annuel": 47_100,
    "plafond_secu_mensuel": 3_925,
    "plafond_secu_horaire": 29,
}

# Arrêté du 22 décembre 2025.
PLAFONDS_2026 = {
    "plafond_secu_annuel": 48_060,
    "plafond_secu_trimestriel": 12_015,
    "plafond_secu_mensuel": 4_005,
    "plafond_secu_quinzaine": 2_003,
    "plafond_secu_hebdomadaire": 924,
    "plafond_secu_journalier": 220,
    "plafond_secu_horaire": 30,
}

# Annoncé par le BOSS le 16 octobre 2026 (+1,74 %), arrêté attendu fin décembre 2026.
# Pas encore utilisé par les calculateurs : seulement affiché sur /baremes-2027.
PLAFONDS_2027 = {
    "plafond_secu_annuel": 48_900,
    "plafond_secu_trimestriel": 12_225,
    "plafond_secu_mensuel": 4_075,
    "plafond_secu_quinzaine": 2_038,
    "plafond_secu_hebdomadaire": 940,
    "plafond_secu_journalier": 224,
    "plafond_secu_horaire": 30,
}

YEARS_AVAILABLE = ["2026", "2025", "2024"]


def get_plafonds(year="2026"):
    if year == "2024":
        return PLAFONDS_2024
    if year == "2025":
        return PLAFONDS_2025
    return PLAFONDS_2026


PASS_2026 = PLAFONDS_2026["plafond_secu_annuel"]
PMSS_2026 = PLAFONDS_2026["plafond_secu_mensuel"]
PASS_2027 = PLAFONDS_2027["plafond_secu_annuel"]
PMSS_2027 = PLAFONDS_2027["plafond_secu_mensuel"]

# PASS annuel par année (arrêtés annuels ; gelé en 2021 et 2022 ; 2027 annoncé) : [année, PASS].
PASS_HISTORIQUE = [
    [2019, 40_524],
    [2020, 41_136],
    [2021, 41_136],
    [2022, 41_136],
    [2023, 43_992],
    [2024, PLAFONDS_2024["plafond_secu_annuel"]],
    [2025, PLAFONDS_2025["plafond_secu_annuel"]],
    [2026, PASS_2026],
    [2027, PASS_2027],
]

# SMIC (France métropolitaine).
# 12,02 €/h au 1er janvier 2026 (décret 2025-1228), 12,31 €/h depuis le 1er juin 2026
# (revalorisation automatique de 2,41 %, arrêté du 22 mai 2026).
SMIC_HORAIRE_BRUT_JANVIER_2026 = 12.02
SMIC_HORAIRE_BRUT = 12.31
# Mensuel 35 h = horaire × 35 × 52 / 12 (151,67 h).
SMIC_BRUT_MENSUEL = 1_867.02
# Date d'effet de la valeur courante du SMIC (affichage).
SMIC_DATE_EFFET = "1er juin 2026"
