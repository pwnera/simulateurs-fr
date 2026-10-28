"""Congés payés : jours acquis, restants et indemnité (Code du travail).

Acquisition (art. L3141-3 et suivants) : 2,5 jours ouvrables par mois de travail effectif,
soit 30 jours ouvrables (5 semaines) par période de référence (1er juin – 31 mai en général).
En jours ouvrés : 25 jours par an (2,08 jours / mois).

Arrêts maladie (loi n° 2024-364 du 22 avril 2024) :
- maladie non professionnelle : 2 jours ouvrables par mois d'arrêt, plafond 24 jours ouvrables par an
  (en cumul avec les jours acquis pendant le travail, le total reste plafonné à 30 jours) ;
- accident du travail / maladie professionnelle : 2,5 jours ouvrables par mois (assimilé à du travail).

Indemnité (art. L3141-24) : le salarié perçoit la plus favorable de deux méthodes :
- maintien de salaire : ce qu'il aurait gagné s'il avait travaillé ;
- règle du dixième : 1/10 de la rémunération brute totale perçue pendant la période de référence,
  au prorata des jours pris.
"""
import math

from .._js import js_round

JOURS_PAR_MOIS = {"ouvrables": 2.5, "ouvres": 25 / 12}
JOURS_ANNUELS = {"ouvrables": 30, "ouvres": 25}
# Nombre moyen de jours ouvrables / ouvrés par mois (pour le maintien de salaire).
JOURS_MOYENS_MOIS = {"ouvrables": 26, "ouvres": 21.67}
# Plafond annuel des jours acquis pendant un arrêt maladie non professionnelle (ouvrables).
PLAFOND_ACQUIS_MALADIE_OUVRABLES = 24
JOURS_PAR_MOIS_MALADIE_OUVRABLES = 2


def _round_up_half(n):
    # Le Code du travail arrondit au nombre entier immédiatement supérieur (art. L3141-7).
    return math.ceil(n - 1e-9)


def jours_acquis(*, decompte, mois_travailles, mois_maladie=None):
    mt = max(0, min(12, mois_travailles))
    mm = max(0, min(12 - mt, 0 if mois_maladie is None else mois_maladie))
    ratio = 25 / 30 if decompte == "ouvres" else 1
    jours_travail = mt * JOURS_PAR_MOIS[decompte]
    jours_maladie = min(PLAFOND_ACQUIS_MALADIE_OUVRABLES, mm * JOURS_PAR_MOIS_MALADIE_OUVRABLES) * ratio
    total = min(JOURS_ANNUELS[decompte], jours_travail + jours_maladie)
    return {
        "jours_travail": js_round(jours_travail * 100) / 100,
        "jours_maladie": js_round(jours_maladie * 100) / 100,
        "jours_acquis": _round_up_half(total),
    }


def indemnite_conges(*, decompte, jours, jours_acquis_periode, salaire_brut_mensuel, remuneration_reference=None):
    jours = max(0, jours)
    salaire = max(0, salaire_brut_mensuel)
    maintien = (salaire / JOURS_MOYENS_MOIS[decompte]) * jours
    ref = remuneration_reference if remuneration_reference is not None and remuneration_reference > 0 else salaire * 12
    base = jours_acquis_periode if jours_acquis_periode > 0 else JOURS_ANNUELS[decompte]
    dixieme = (ref / 10) * min(1, jours / base)
    methode = "dixieme" if dixieme > maintien else "maintien"
    return {
        "maintien_salaire": js_round(maintien * 100) / 100,
        "regle_dixieme": js_round(dixieme * 100) / 100,
        "indemnite": js_round(max(maintien, dixieme) * 100) / 100,
        "methode": methode,
    }


def conges_payes(*, jours_acquis, jours_pris, salaire_journalier_net=None):
    """Compatibilité : solde de congés et valeur simple (jours restants × salaire journalier)."""
    salaire_journalier_net = 0 if salaire_journalier_net is None else salaire_journalier_net
    restants = max(0, jours_acquis - jours_pris)
    return {
        "jours_restants": restants,
        "valeur_estimee": js_round(restants * salaire_journalier_net * 100) / 100,
    }
