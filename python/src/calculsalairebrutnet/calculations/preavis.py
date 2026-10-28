"""Préavis : durée selon le type de rupture et l'ancienneté (Code du travail).

- Licenciement (art. L1234-1) : < 6 mois → pas de minimum légal (convention / usage) ;
  6 mois à < 2 ans → 1 mois ; ≥ 2 ans → 2 mois. Pas de préavis en cas de faute grave ou lourde.
  Travailleur handicapé (art. L5213-9) : durée doublée, dans la limite de 3 mois.
- Démission : aucune durée légale ; elle est fixée par la convention collective, un accord,
  le contrat ou les usages (souvent 1 mois non-cadre, 3 mois cadre).
- Départ ou mise à la retraite (art. L1237-6 et L1237-10) : mêmes durées que le licenciement.
- Rupture de la période d'essai (art. L1221-25 et L1221-26) : délai de prévenance.

Quand une convention ou le contrat prévoit une durée plus longue (licenciement, retraite), c'est
la durée la plus favorable au salarié qui s'applique.
"""
import calendar
import math
import re
from datetime import date

from .._js import fr_number, js_round, js_str

_JOURS_PAR_MOIS = 30


def _utc(y, m0, d):
    """Date.UTC(y, m0, d) en jour ordinal : mois et jours hors bornes débordent comme en JavaScript."""
    return date(y + m0 // 12, m0 % 12 + 1, 1).toordinal() + d - 1


def _set_utc_date(o, x):
    """setUTCDate(x) : quantième x (tronqué) du mois courant, avec débordement."""
    return o - date.fromordinal(o).day + math.trunc(x)


def _add_to_date(iso, duree, unite):
    m = re.fullmatch(r"([0-9]{4})-([0-9]{2})-([0-9]{2})", iso)
    if not m:
        return None
    y = int(m.group(1))
    if y <= 99:  # Date.UTC lit les années 0 à 99 comme 1900 à 1999.
        y += 1900
    o = _utc(y, int(m.group(2)) - 1, int(m.group(3)))
    if unite == "mois":
        whole = math.floor(duree)
        d = date.fromordinal(o)
        day = d.day
        o = _utc(d.year, d.month - 1 + whole, 1)
        d = date.fromordinal(o)
        last_day = calendar.monthrange(d.year, d.month)[1]
        # Le préavis expire la veille du même quantième (ex. 15 mars + 1 mois → 14 avril inclus) ;
        # si ce quantième n'existe pas (31 janvier → février), il expire le dernier jour du mois.
        clamped = day > last_day
        o = _set_utc_date(o, min(day, last_day))
        rest = duree - whole
        if rest > 0:
            o += js_round(rest * _JOURS_PAR_MOIS)
        if not clamped or rest > 0:
            o -= 1
    elif unite == "semaines":
        o = _set_utc_date(o, date.fromordinal(o).day + duree * 7 - 1)
    elif unite == "jours":
        o = _set_utc_date(o, date.fromordinal(o).day + duree - 1)
    else:
        o += math.trunc(duree) // 24
    return date.fromordinal(int(o)).isoformat()


def preavis_legal_licenciement_mois(anciennete_totale_mois):
    """Durée légale de préavis de licenciement / retraite, en mois (None si < 6 mois)."""
    if anciennete_totale_mois < 6:
        return None
    if anciennete_totale_mois < 24:
        return 1
    return 2


def _to_result(duree, unite, rest, date_notification=None):
    jours = (
        duree * _JOURS_PAR_MOIS
        if unite == "mois"
        else duree * 7
        if unite == "semaines"
        else duree
        if unite == "jours"
        else duree / 24
    )
    result = {
        "duree": duree,
        "unite": unite,
        "duree_jours": js_round(jours * 10) / 10,
        "duree_mois": js_round((jours / _JOURS_PAR_MOIS) * 10) / 10,
        **rest,
    }
    if date_notification and duree > 0:
        result["date_fin"] = _add_to_date(date_notification, duree, unite)
    return result


def _format_mois(m):
    if float(m).is_integer():
        return f"{js_str(m)} mois"
    return f"{fr_number(m)} mois"


def preavis(
    *,
    type,
    anciennete_annees,
    anciennete_mois=None,
    cadre=None,
    faute_grave=None,
    travailleur_handicape=None,
    duree_conventionnelle_mois=None,
    presence_jours=None,
    date_notification=None,
):
    anciennete_mois = max(0, math.floor(anciennete_annees * 12 + (0 if anciennete_mois is None else anciennete_mois)))
    conv = duree_conventionnelle_mois if duree_conventionnelle_mois is not None and duree_conventionnelle_mois > 0 else None
    notes = []
    date_ = date_notification

    if type == "essai-employeur" or type == "essai-salarie":
        presence = max(0, anciennete_mois * _JOURS_PAR_MOIS if presence_jours is None else presence_jours)
        if type == "essai-salarie":
            h = 24 if presence < 8 else 48
            return _to_result(h, "heures", {
                "duree_legale": h,
                "origine": "legale",
                "message": f"Délai de prévenance de {js_str(h)} heures pour le salarié ({'moins de 8 jours' if presence < 8 else '8 jours ou plus'} de présence).",
                "notes": ["Le délai de prévenance ne peut pas prolonger la période d'essai au-delà de sa durée maximale."],
            }, date_)
        if presence < 8:
            return _to_result(24, "heures", {"duree_legale": 24, "origine": "legale", "message": "Délai de prévenance de 24 heures (moins de 8 jours de présence).", "notes": notes}, date_)
        if presence < 30:
            return _to_result(48, "heures", {"duree_legale": 48, "origine": "legale", "message": "Délai de prévenance de 48 heures (entre 8 jours et 1 mois de présence).", "notes": notes}, date_)
        if presence < 90:
            return _to_result(2, "semaines", {"duree_legale": 2, "origine": "legale", "message": "Délai de prévenance de 2 semaines (entre 1 et 3 mois de présence).", "notes": notes}, date_)
        return _to_result(1, "mois", {
            "duree_legale": 1,
            "origine": "legale",
            "message": "Délai de prévenance de 1 mois (plus de 3 mois de présence).",
            "notes": ["Si l'employeur ne respecte pas ce délai, il doit verser une indemnité compensatrice (sauf faute grave)."],
        }, date_)

    if type == "demission":
        if conv is not None:
            return _to_result(conv, "mois", {
                "duree_legale": None,
                "origine": "conventionnelle",
                "message": f"Préavis de démission de {_format_mois(conv)} selon votre convention collective ou votre contrat.",
                "notes": ["Votre employeur peut vous dispenser d'effectuer tout ou partie du préavis (il reste alors payé s'il en prend l'initiative)."],
            }, date_)
        usage = 3 if cadre else 1
        return _to_result(usage, "mois", {
            "duree_legale": None,
            "origine": "usage",
            "message": f"Le Code du travail ne fixe pas de durée de préavis de démission. La durée la plus courante est de {_format_mois(usage)} pour un {'cadre' if cadre else 'non-cadre'}, mais c'est votre convention collective ou votre contrat qui fait foi.",
            "notes": [
                "Certaines conventions prévoient 2 mois pour les agents de maîtrise et techniciens.",
                "Votre employeur peut vous dispenser d'effectuer tout ou partie du préavis.",
            ],
        }, date_)

    # Licenciement, départ ou mise à la retraite
    if type == "licenciement" and faute_grave:
        return _to_result(0, "mois", {
            "duree_legale": 0,
            "origine": "aucune",
            "message": "Pas de préavis (ni d'indemnité compensatrice) en cas de licenciement pour faute grave ou lourde.",
            "notes": notes,
        })

    legal = preavis_legal_licenciement_mois(anciennete_mois)
    duree = 0 if legal is None else legal
    origine = "legale" if legal is not None else "aucune"
    if conv is not None and conv > duree:
        duree = conv
        origine = "conventionnelle"
    if travailleur_handicape and duree > 0 and duree < 3:
        doublee = min(3, duree * 2)
        notes.append(f"Travailleur handicapé : durée doublée ({_format_mois(duree)} → {_format_mois(doublee)}), dans la limite de 3 mois.")
        duree = doublee
    if cadre and origine == "legale" and type == "licenciement":
        notes.append("Pour les cadres, la plupart des conventions collectives prévoient 3 mois : vérifiez la vôtre.")
    if type == "depart-retraite":
        notes.append("Départ volontaire à la retraite : mêmes durées que pour un licenciement (art. L1237-10).")
    if type == "mise-retraite":
        notes.append("Mise à la retraite par l'employeur : mêmes durées que pour un licenciement (art. L1237-6).")

    label = "licenciement" if type == "licenciement" else "retraite"
    if legal is None and origine == "aucune":
        message = f"Moins de 6 mois d'ancienneté : la loi ne fixe pas de durée minimale de préavis de {label}. Appliquez la durée prévue par votre convention collective ou les usages."
    elif origine == "conventionnelle":
        legal_txt = f" ({_format_mois(legal)})" if legal is not None else ""
        message = f"Préavis de {_format_mois(duree)} : votre convention ou votre contrat est plus favorable que la loi{legal_txt}."
    else:
        message = f"Préavis légal de {_format_mois(duree)} ({'entre 6 mois et 2 ans' if anciennete_mois < 24 else '2 ans ou plus'} d'ancienneté)."
    return _to_result(duree, "mois", {"duree_legale": legal, "origine": origine, "message": message, "notes": notes}, date_)
