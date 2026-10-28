"""Heures de travail de référence (France).
Semaine civile = lundi à dimanche.
Heures mensuelles = heuresHebdo * 52 / 12 (méthode du mois civil).
"""
from .._js import js_round

HEURES_SEMAINE_LEGALE = 35
HEURES_MENSUELLES_35H = js_round((35 * 52) / 12 * 100) / 100  # 151,67
HEURES_MENSUELLES_37H = js_round((37 * 52) / 12 * 100) / 100  # 160,33
HEURES_MENSUELLES_39H = js_round((39 * 52) / 12 * 100) / 100  # 169

HEURES_MENSUELLES_PAR_HORAIRE = {
    35: HEURES_MENSUELLES_35H,
    37: HEURES_MENSUELLES_37H,
    39: HEURES_MENSUELLES_39H,
}


def get_heures_mensuelles(heures_hebdo):
    """Heures mensuelles pour un horaire hebdo personnalisé (ex. 38)."""
    return js_round((heures_hebdo * 52) / 12 * 100) / 100


# Plafonds légaux (France).
PLAFOND_HEBDO_HEURES = 48
PLAFOND_MOYENNE_12_SEMAINES_HEURES = 44
CONTINGENT_ANNUEL_HEURES_SUP = 220

# Majorations légales par défaut (8 premières heures sup puis au-delà).
MAJORATION_25_DEFAULT = 0.25
MAJORATION_50_DEFAULT = 0.5
