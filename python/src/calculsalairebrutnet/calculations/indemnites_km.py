"""Indemnités kilométriques : barème fiscal (frais réels) et comparaison avec l'abattement de 10 %."""
from .._js import fr_number, js_round
from ..constants.bareme_kilometrique import BAREME_KM, DISTANCE_DOMICILE_TRAVAIL_MAX, MAJORATION_ELECTRIQUE
from ..constants.impot_revenu import ABATTEMENT_10_MAX, ABATTEMENT_10_MIN


def get_categorie(type, cv):
    cats = BAREME_KM[type]
    for c in cats:
        if cv >= c["cv_min"] and cv <= c["cv_max"]:
            return c
    return cats[0] if cv < cats[0]["cv_min"] else cats[-1]


_TRANCHE_LABELS = {
    "voiture": ["jusqu'à 5 000 km", "de 5 001 à 20 000 km", "au-delà de 20 000 km"],
    "deux_roues": ["jusqu'à 3 000 km", "de 3 001 à 6 000 km", "au-delà de 6 000 km"],
}


def _tranche_label(type_, i):
    return _TRANCHE_LABELS["voiture" if type_ == "voiture" else "deux_roues"][i]


def _format_coef(n):
    return fr_number(n, 3)


def formule_tranche(t):
    return f"d × {_format_coef(t['a'])} + {fr_number(t['b'])} €" if t["b"] > 0 else f"d × {_format_coef(t['a'])}"


def distance_domicile_travail(km_aller, jours, plafonner=True):
    """Distance annuelle domicile-travail (aller-retour), plafonnée à 40 km aller sauf justification."""
    aller = min(km_aller, DISTANCE_DOMICILE_TRAVAIL_MAX) if plafonner else km_aller
    return max(0, aller) * 2 * max(0, jours)


def abattement_forfaitaire10(salaires_nets_imposables):
    """Abattement forfaitaire de 10 % sur les salaires (min / max de l'année)."""
    if salaires_nets_imposables <= 0:
        return 0
    return min(ABATTEMENT_10_MAX, max(ABATTEMENT_10_MIN, salaires_nets_imposables * 0.1), salaires_nets_imposables)


def indemnites_kilometriques(
    *,
    puissance_fiscale,
    distance_annuelle,
    type_vehicule=None,
    electrique=None,
    salaires_nets_imposables=None,
    autres_frais_reels=None,
):
    type_ = "voiture" if type_vehicule is None else type_vehicule
    d = max(0, distance_annuelle)
    categorie = get_categorie(type_, puissance_fiscale)
    tranche_index = next((i for i, t in enumerate(categorie["tranches"]) if d <= t["jusqua"]), -1)
    t = categorie["tranches"][tranche_index]
    base = d * t["a"] + (t["b"] if d > 0 else 0)
    majoration = base * MAJORATION_ELECTRIQUE if electrique else 0
    montant = base + majoration
    result = {
        "montant_annuel_non_imposable": js_round(montant * 100) / 100,
        "montant_base": js_round(base * 100) / 100,
        "majoration_electrique": js_round(majoration * 100) / 100,
        "categorie": categorie,
        "tranche_index": tranche_index,
        "formule": formule_tranche(t),
        "tranche": f"Barème {categorie['label']}, {_tranche_label(type_, tranche_index)}",
    }
    if salaires_nets_imposables is not None and salaires_nets_imposables > 0:
        abattement = abattement_forfaitaire10(salaires_nets_imposables)
        total = montant + max(0, 0 if autres_frais_reels is None else autres_frais_reels)
        result["abattement10"] = js_round(abattement * 100) / 100
        result["total_frais_reels"] = js_round(total * 100) / 100
        result["frais_reels_plus_avantageux"] = total > abattement
    return result
