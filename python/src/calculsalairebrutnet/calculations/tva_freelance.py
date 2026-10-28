"""TVA d'un freelance : franchise en base (art. 293 B du CGI, seuils 2026), TVA collectée,
TVA déductible et TVA à reverser.
"""
from .._js import fr_number, js_round
from ..constants.micro_entreprise import FRANCHISE_TVA_2026

# ActiviteTVA : "vente" | "prestations" | "specifique".

TAUX_TVA = [
    {"value": 0.2, "label": "20 % (taux normal)"},
    {"value": 0.1, "label": "10 % (restauration, travaux…)"},
    {"value": 0.055, "label": "5,5 % (livres, énergie…)"},
    {"value": 0.021, "label": "2,1 % (presse…)"},
]


def _r2(n):
    return js_round(n * 100) / 100


def tva_freelance(*, ca_ht_annuel, activite, taux_tva=None, depenses_ttc=None, taux_tva_depenses=None, option_tva=None):
    """taux_tva : défaut 20 %. depenses_ttc : dépenses professionnelles TTC annuelles soumises à TVA.
    taux_tva_depenses : taux moyen sur les dépenses, défaut 20 %. option_tva : opter pour la TVA malgré la franchise.
    """
    ca = max(0, ca_ht_annuel)
    s = FRANCHISE_TVA_2026["vente"] if activite == "vente" else FRANCHISE_TVA_2026["specifique"] if activite == "specifique" else FRANCHISE_TVA_2026["services"]
    taux = 0.2 if taux_tva is None else taux_tva
    if ca > s["majore"]:
        statut = "assujetti-immediat"
    elif ca > s["seuil"]:
        statut = "fin-au-1er-janvier"
    elif option_tva:
        statut = "option"
    else:
        statut = "franchise"
    assujetti = statut == "assujetti-immediat" or statut == "option"
    tva_collectee = ca * taux if assujetti else 0
    depenses = max(0, 0 if depenses_ttc is None else depenses_ttc)
    taux_dep = 0.2 if taux_tva_depenses is None else taux_tva_depenses
    tva_deductible = (depenses * taux_dep) / (1 + taux_dep) if assujetti else 0

    fmt = fr_number
    messages = {
        "franchise": f"Sous le seuil de franchise ({fmt(s['seuil'])} €) : pas de TVA à facturer. Mentionnez « TVA non applicable, art. 293 B du CGI » sur vos factures.",
        "fin-au-1er-janvier": f"Seuil de {fmt(s['seuil'])} € dépassé mais pas le seuil majoré ({fmt(s['majore'])} €) : vous restez en franchise jusqu'au 31 décembre, puis facturez la TVA au 1er janvier suivant.",
        "assujetti-immediat": f"Seuil majoré de {fmt(s['majore'])} € dépassé : la TVA s'applique dès la facture qui fait franchir le seuil.",
        "option": "Option pour la TVA : vous facturez la TVA et récupérez celle de vos achats (utile si vos clients sont des entreprises).",
    }

    return {
        "franchise_tva": not assujetti,
        "statut": statut,
        "seuil_franchise": s["seuil"],
        "seuil_majore": s["majore"],
        "tva_collectee": _r2(tva_collectee),
        "tva_deductible": _r2(tva_deductible),
        "tva_a_reverser": _r2(max(0, tva_collectee - tva_deductible)),
        "ca_ttc": _r2(ca + tva_collectee),
        "message": messages[statut],
    }
