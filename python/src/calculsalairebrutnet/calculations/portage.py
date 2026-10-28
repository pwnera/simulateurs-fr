"""Portage salarial : TJM ou CA de mission → salaire net (2026).

CA HT − frais de gestion de la société de portage = enveloppe ; l'enveloppe finance les frais
professionnels remboursés puis le coût employeur du salaire (brut + cotisations patronales, cadre).
Net = brut − cotisations salariales (cadre). Rémunération minimale d'un salarié porté à temps plein :
75 % du PASS (art. L1254-2 du Code du travail).
"""
from .._js import js_round
from ..constants.plafonds import PASS_2026
from .cotisations_patronales import brut_depuis_cout_employeur, cotisations_patronales
from .cotisations_salariales import cotisations_salariales

PORTAGE_MINIMUM_BRUT_MENSUEL = js_round(((0.75 * PASS_2026) / 12) * 100) / 100
# Salaire minimum de la convention collective du portage salarial (IDCC 3219), en part du plafond mensuel de la Sécurité sociale.
PORTAGE_MINIMUMS_CONVENTION = [
    {"niveau": "Junior", "taux": 0.7},
    {"niveau": "Senior", "taux": 0.75},
    {"niveau": "Forfait jours", "taux": 0.85},
]
# Taux AT/MP retenu pour une activité de conseil.
_TAUX_ATMP_PORTAGE = 0.009
_OPTIONS_EMPLOYEUR = {"cadre": True, "effectif50_plus": True, "taux_atmp": _TAUX_ATMP_PORTAGE}


def _r2(n):
    return js_round(n * 100) / 100


def ca_pour_brut_portage(brut, frais_portage_percent):
    """CA mensuel HT nécessaire pour verser `brut` en portage (frais de gestion déduits, sans frais professionnels)."""
    frais = min(0.5, max(0, frais_portage_percent / 100))
    return cotisations_patronales(**_OPTIONS_EMPLOYEUR, brut=brut)["cout_employeur"] / (1 - frais)


def portage_salarial(
    *,
    tjm=None,
    jours_travailles_par_mois=None,
    ca_mensuel=None,
    frais_portage_percent=None,
    frais_professionnels=None,
    taux_prelevement_source=None,
):
    """frais_portage_percent : % du CA HT, défaut 7 %. frais_professionnels : remboursés chaque mois.
    taux_prelevement_source : % appliqué au net imposable.
    """
    frais = min(0.5, max(0, (7 if frais_portage_percent is None else frais_portage_percent) / 100))
    if ca_mensuel is not None:
        ca = ca_mensuel
    else:
        ca = tjm * (18 if jours_travailles_par_mois is None else jours_travailles_par_mois) if tjm is not None and tjm > 0 else 0
    frais_gestion = ca * frais
    enveloppe = max(0, ca - frais_gestion)
    frais_rembourses = min(enveloppe, max(0, 0 if frais_professionnels is None else frais_professionnels))
    cout_salaire = enveloppe - frais_rembourses

    brut = brut_depuis_cout_employeur(cout_salaire, _OPTIONS_EMPLOYEUR)
    patronales = cotisations_patronales(**_OPTIONS_EMPLOYEUR, brut=brut)
    salariales = cotisations_salariales(brut=brut, statut="portage")
    taux = min(45, max(0, 0 if taux_prelevement_source is None else taux_prelevement_source)) / 100
    impot = salariales["net_imposable"] * taux
    net_percu = salariales["net_a_payer"] + frais_rembourses

    return {
        "ca_brut_mensuel": _r2(ca),
        "frais_gestion": _r2(frais_gestion),
        "apres_frais": _r2(enveloppe),
        "frais_rembourses": _r2(frais_rembourses),
        "cout_salaire": _r2(cout_salaire),
        "charges_patronales": _r2(patronales["total"]),
        "brut_mensuel": _r2(brut),
        "cotisations_salariales": _r2(salariales["total"]),
        "net_salaire": _r2(salariales["net_a_payer"]),
        "net_mensuel": _r2(net_percu),
        "net_imposable": _r2(salariales["net_imposable"]),
        "impot_mensuel": _r2(impot),
        "net_apres_impot": _r2(net_percu - impot),
        "cotisations": _r2(patronales["total"] + salariales["total"]),
        "taux_net_sur_ca": net_percu / ca if ca > 0 else 0,
        "sous_minimum": ca > 0 and brut < PORTAGE_MINIMUM_BRUT_MENSUEL,
    }
