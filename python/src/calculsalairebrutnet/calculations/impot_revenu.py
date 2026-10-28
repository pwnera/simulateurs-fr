"""Impôt sur le revenu : barème progressif, quotient familial (avec plafonnement) et décote.
Barème 2026 applicable aux revenus 2025 (voir constants/impot_revenu.py).
@see https://www.service-public.gouv.fr/particuliers/vosdroits/F1419
"""
from .._js import js_round
from ..constants.impot_revenu import (
    ABATTEMENT_10_MAX,
    ABATTEMENT_10_MIN,
    BAREME_IR_2026,
    BAREME_IR_YEAR,
)


def _impot_une_part(revenu_par_part, tranches):
    """Impôt d'une part selon le barème progressif."""
    if revenu_par_part <= 0:
        return 0
    impot = 0
    prev_max = 0
    for t in tranches:
        max_, taux = t["max"], t["taux"]
        haut = min(revenu_par_part, max_)
        if haut > prev_max:
            impot += (haut - prev_max) * taux
        if revenu_par_part <= max_:
            break
        prev_max = max_
    return impot


def _impot_parts(revenu_imposable, nb_parts, tranches):
    """Impôt brut du foyer pour un nombre de parts (sans plafonnement)."""
    return _impot_une_part(revenu_imposable / nb_parts, tranches) * nb_parts


def calcul_impot_revenu(*, revenu_imposable, nb_parts=None, couple=None, bareme=None):
    """bareme : défaut barème 2026 (revenus 2025)."""
    revenu = max(0, revenu_imposable)
    nb_parts = max(1, 1 if nb_parts is None else nb_parts)
    couple = nb_parts >= 2 if couple is None else couple
    parts_base = 2 if couple else 1
    b = BAREME_IR_2026 if bareme is None else bareme
    tranches, decote_bareme, plafond_qf_demi_part = b["tranches"], b["decote"], b["plafond_qf_demi_part"]

    impot_avec_parts = _impot_parts(revenu, nb_parts, tranches)
    impot_brut = impot_avec_parts
    plafonnement_qf = False
    if nb_parts > parts_base:
        impot_base = _impot_parts(revenu, parts_base, tranches)
        avantage_max = (nb_parts - parts_base) * 2 * plafond_qf_demi_part
        if impot_base - impot_avec_parts > avantage_max:
            impot_brut = impot_base - avantage_max
            plafonnement_qf = True

    d = decote_bareme["couple"] if couple else decote_bareme["celibataire"]
    decote = min(impot_brut, max(0, d["forfait"] - decote_bareme["taux"] * impot_brut)) if impot_brut > 0 and impot_brut < d["seuil"] else 0
    impot_net = max(0, impot_brut - decote)

    par_part = revenu / nb_parts
    tranche = next((t for t in tranches if par_part <= t["max"]), tranches[len(tranches) - 1])
    return {
        "impot_brut": js_round(impot_brut),
        "decote": js_round(decote),
        "impot_net": js_round(impot_net),
        "taux_marginal": tranche["taux"],
        "taux_moyen": impot_net / revenu if revenu > 0 else 0,
        "plafonnement_qf": plafonnement_qf,
    }


def abattement_frais_pro(salaires_annuels):
    """Abattement forfaitaire de 10 % pour frais professionnels (min / max légaux)."""
    if salaires_annuels <= 0:
        return 0
    return min(salaires_annuels, ABATTEMENT_10_MAX, max(ABATTEMENT_10_MIN, salaires_annuels * 0.1))


def estimer_taux_prelevement_source(net_annuel, nb_parts=1, options=None):
    """Estime le taux de prélèvement à la source (en %, de 0 à 45) à partir d'un revenu annuel.
    Le taux est rapporté au revenu saisi (net imposable), comme le taux personnalisé du bulletin.
    options["appliquer_abattement10"] : applique l'abattement de 10 % (salaires) avant le barème.
    """
    if net_annuel <= 0 or nb_parts <= 0:
        return 0
    revenu_imposable = net_annuel - abattement_frais_pro(net_annuel) if options and options.get("appliquer_abattement10") else net_annuel
    impot_net = calcul_impot_revenu(revenu_imposable=revenu_imposable, nb_parts=nb_parts)["impot_net"]
    taux = (impot_net / net_annuel) * 100
    return min(45, max(0, js_round(taux * 100) / 100))


def round_taux_to_slider_step(taux, step=0.5):
    """Arrondit le taux au pas du slider (0.5 %) pour affichage cohérent."""
    return js_round(taux / step) * step
