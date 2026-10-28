"""Compare un salaire net mensuel aux références (SMIC, médiane, déciles D1/D9).
Donne une idée "votre salaire est-il dans la moyenne" sans prétendre à une analyse métier/région.
Source : Insee Première n° 2079, octobre 2025 (données 2024, secteur privé, EQTP).
"""
from .._js import fr_number
from ..constants.salaire_benchmarks import (
    BENCHMARKS_YEAR,
    D9_NET_MENSUEL,
    SALAIRE_MEDIAN_NET_MENSUEL,
    SALAIRE_MOYEN_NET_MENSUEL,
    SMIC_NET_MENSUEL,
)

_BAND_SMIC_LOW = 0.95
_BAND_SMIC_HIGH = 1.15
_BAND_MEDIAN_LOW = 0.9
_BAND_MEDIAN_HIGH = 1.15
_BAND_D9_LOW = 0.97


def compare_salaire_to_benchmarks(net_mensuel):
    """Compare le salaire net mensuel aux références SMIC, médiane et D9 (temps plein, secteur privé).
    Pour un temps partiel, le net mensuel est plus bas ; la comparaison reste indicative.
    """
    source_year = BENCHMARKS_YEAR
    median_formatted = fr_number(SALAIRE_MEDIAN_NET_MENSUEL)
    mean_formatted = fr_number(SALAIRE_MOYEN_NET_MENSUEL)
    d9_formatted = fr_number(D9_NET_MENSUEL)

    if net_mensuel < SMIC_NET_MENSUEL * _BAND_SMIC_LOW:
        return {
            "level": "below_smic",
            "label": "Sous le SMIC",
            "message": "Votre net est sous le SMIC. Vérifiez temps partiel, convention, primes.",
            "extra_info": f"En France, le salaire médian (secteur privé, temps plein) est d'environ {median_formatted} € net / mois.",
            "source_year": source_year,
        }

    if net_mensuel <= SMIC_NET_MENSUEL * _BAND_SMIC_HIGH:
        return {
            "level": "around_smic",
            "label": "Proche du SMIC",
            "message": "Votre net est proche du SMIC (minimum légal).",
            "extra_info": f"Salaire médian : {median_formatted} € net / mois. Salaire moyen : {mean_formatted} € (plus élevé car tiré vers le haut par les hauts revenus).",
            "source_year": source_year,
        }

    if net_mensuel < SALAIRE_MEDIAN_NET_MENSUEL * _BAND_MEDIAN_LOW:
        return {
            "level": "below_median",
            "label": "Sous le salaire médian",
            "message": "Votre net est sous le salaire médian.",
            "extra_info": f"La médiane ({median_formatted} € net / mois) signifie que 50 % des salariés gagnent moins, 50 % gagnent plus. Le salaire moyen est de {mean_formatted} €.",
            "source_year": source_year,
        }

    if net_mensuel <= SALAIRE_MEDIAN_NET_MENSUEL * _BAND_MEDIAN_HIGH:
        return {
            "level": "around_median",
            "label": "Proche du salaire médian",
            "message": "Votre net est dans la fourchette du médian.",
            "extra_info": f"Médian : {median_formatted} € net / mois ; moyen : {mean_formatted} €. Les 10 % les mieux payés gagnent au moins {d9_formatted} € net / mois.",
            "source_year": source_year,
        }

    if net_mensuel >= D9_NET_MENSUEL * _BAND_D9_LOW:
        return {
            "level": "top_10_pct",
            "label": "Dans les 10 % des salariés les mieux payés",
            "message": "Votre net vous place dans les 10 % les mieux payés.",
            "extra_info": f"Salaire médian : {median_formatted} € ; moyen : {mean_formatted} €. Seuil D9 (top 10 %) : {d9_formatted} € net / mois.",
            "source_year": source_year,
        }

    return {
        "level": "above_median",
        "label": "Au-dessus du salaire médian",
        "message": "Votre net est au-dessus du médian (50 % les mieux payés).",
        "extra_info": f"Médian : {median_formatted} € net / mois ; moyen : {mean_formatted} €. Les 10 % les mieux payés gagnent au moins {d9_formatted} €.",
        "source_year": source_year,
    }
