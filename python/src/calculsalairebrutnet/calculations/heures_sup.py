"""Heures supplémentaires - majorations (France).
Art. L3121-36 : 25 % de la 36e à la 43e heure, 50 % au-delà (sauf accord prévoyant un autre taux,
au minimum 10 %). Semaine civile = lundi–dimanche.

Net : les heures sup bénéficient d'une réduction de cotisations salariales égale aux cotisations
d'assurance vieillesse, dans la limite de 11,31 % (art. L241-17 CSS), et sont exonérées d'impôt sur
le revenu dans la limite de 7 500 € nets par an (art. 81 quater CGI).
"""
import math

from .._js import js_round
from ..constants.heures_travail import HEURES_MENSUELLES_PAR_HORAIRE, get_heures_mensuelles

# Durée légale hebdomadaire et seuil de passage à 50 %.
SEUIL_HS_25 = 35
SEUIL_HS_50 = 43
# Taux maximal de la réduction de cotisations salariales sur heures sup (art. D241-21 CSS).
TAUX_REDUCTION_SALARIALE_HS = 0.1131
# Plafond annuel d'exonération d'impôt sur le revenu des heures sup (net imposable).
PLAFOND_EXONERATION_IR_HS = 7500


def _get_heures_mensuelles_ref(heures_contrat_hebdo):
    if heures_contrat_hebdo == 35 or heures_contrat_hebdo == 37 or heures_contrat_hebdo == 39:
        return HEURES_MENSUELLES_PAR_HORAIRE[heures_contrat_hebdo]
    return get_heures_mensuelles(heures_contrat_hebdo)


def heures_payees_equivalentes(heures_contrat_hebdo, majoration1=0.25):
    """Nombre d'heures « équivalent taux normal » payées par un salaire mensuel. Au-delà de 35 h, les heures
    contractuelles (ex. 36e à 39e) sont des heures sup structurelles déjà payées à 125 % :
    39 h → 151,67 + 17,33 × 1,25 = 173,33 h.
    """
    if heures_contrat_hebdo <= SEUIL_HS_25:
        return _get_heures_mensuelles_ref(heures_contrat_hebdo)
    base = _get_heures_mensuelles_ref(SEUIL_HS_25)
    h25 = get_heures_mensuelles(min(heures_contrat_hebdo, SEUIL_HS_50) - SEUIL_HS_25)
    h50 = get_heures_mensuelles(max(0, heures_contrat_hebdo - SEUIL_HS_50))
    return base + h25 * (1 + majoration1) + h50 * 1.5


def _get_taux_horaire_brut(taux_horaire_brut, salaire_mensuel_brut, heures_contrat_hebdo, taux_majoration1, taux_horaire_net, taux_cotisations):
    if taux_horaire_brut is not None and taux_horaire_brut > 0:
        return taux_horaire_brut
    if salaire_mensuel_brut is not None and salaire_mensuel_brut > 0:
        hebdo = 35 if heures_contrat_hebdo is None else heures_contrat_hebdo
        h = hebdo if isinstance(hebdo, (int, float)) else 35
        return salaire_mensuel_brut / heures_payees_equivalentes(h, 0.25 if taux_majoration1 is None else taux_majoration1)
    net = 0 if taux_horaire_net is None else taux_horaire_net
    taux = 0.22 if taux_cotisations is None else taux_cotisations
    if net <= 0:
        return 0
    return net / (1 - taux)


def calcul_heures_sup(
    *,
    heures_sup25,
    heures_sup50,
    taux_horaire_brut=None,
    taux_horaire_net=None,
    taux_cotisations=None,
    salaire_mensuel_brut=None,
    heures_contrat_hebdo=None,
    taux_majoration1=None,
    taux_majoration2=None,
    taux_charges_net=None,
    heures_comp10=None,
    reduction_salariale=None,
):
    taux_horaire_brut = _get_taux_horaire_brut(
        taux_horaire_brut, salaire_mensuel_brut, heures_contrat_hebdo, taux_majoration1, taux_horaire_net, taux_cotisations
    )
    m1 = 0.25 if taux_majoration1 is None else taux_majoration1
    m2 = 0.5 if taux_majoration2 is None else taux_majoration2
    heures_comp10 = 0 if heures_comp10 is None else heures_comp10
    taux_charges = 0.22 if taux_charges_net is None else taux_charges_net
    m25 = taux_horaire_brut * (1 + m1) * heures_sup25
    m50 = taux_horaire_brut * (1 + m2) * heures_sup50
    m10 = taux_horaire_brut * 1.1 * heures_comp10
    total_brut = m25 + m50 + m10
    reduction = 0 if reduction_salariale is False else min(TAUX_REDUCTION_SALARIALE_HS, taux_charges)
    taux_effectif = max(0, taux_charges - reduction)
    net_estime = total_brut * (1 - taux_effectif)
    return {
        "montant_brut25": js_round(m25 * 100) / 100,
        "montant_brut50": js_round(m50 * 100) / 100,
        "montant_brut10": js_round(m10 * 100) / 100,
        "total_brut": js_round(total_brut * 100) / 100,
        "net_estime": js_round(net_estime * 100) / 100,
        "reduction_salariale": js_round(total_brut * reduction * 100) / 100,
        "taux_charges_effectif": taux_effectif,
        "taux_horaire_brut": js_round(taux_horaire_brut * 100) / 100,
        "taux_charges_utilise": taux_charges,
    }


def arrondir_duree_heures(heures, mode):
    """Arrondit une durée en heures selon le mode."""
    if mode == "minute":
        return js_round(heures * 60) / 60
    if mode == "quart":
        return js_round(heures * 4) / 4  # 0,25 pas
    if mode == "heure_commencee":
        return math.ceil(heures)
    return heures


def round_heures_display(h):
    """Arrondit pour affichage (2 décimales)."""
    return js_round(h * 100) / 100


def calcul_heures_sup_semaine(jours, heures_contrat_hebdo, arrondi, _taux_majoration1=0.25, _taux_majoration2=0.5):
    """Calcule les heures travaillées sur une semaine (liste de 7 jours, None pour un jour non travaillé).
    - Temps plein (contrat ≥ 35 h) : heures au-delà du contrat ; majorées à 25 % jusqu'à 43 h, 50 % au-delà.
    - Temps partiel (contrat < 35 h) : heures complémentaires, majorées à 10 % dans la limite du 1/10e
      de la durée contractuelle, 25 % au-delà (art. L3123-29) ; au-delà de 35 h, règles des heures sup.
    """
    total_minutes = 0
    for j in jours:
        if j is None:
            continue
        total_minutes += max(0, j["fin_minutes"] - j["debut_minutes"] - j["pause_minutes"])
    total_heures = arrondir_duree_heures(total_minutes / 60, arrondi)
    contrat = heures_contrat_hebdo

    def r(n):
        return js_round(max(0, n) * 100) / 100

    if total_heures <= contrat:
        return {"heures_normales": r(total_heures), "heures_sup25": 0, "heures_sup50": 0, "heures_comp10": 0, "total_heures": total_heures}
    comp10 = 0
    h25 = 0
    if contrat < SEUIL_HS_25:
        complementaires = min(total_heures, SEUIL_HS_25) - contrat
        comp10 = min(complementaires, contrat / 10)
        h25 += complementaires - comp10
    debut_hs = max(contrat, SEUIL_HS_25)
    h25 += max(0, min(total_heures, SEUIL_HS_50) - debut_hs)
    h50 = max(0, total_heures - max(debut_hs, SEUIL_HS_50))
    return {
        "heures_normales": r(contrat),
        "heures_sup25": r(h25),
        "heures_sup50": r(h50),
        "heures_comp10": r(comp10),
        "total_heures": total_heures,
    }
