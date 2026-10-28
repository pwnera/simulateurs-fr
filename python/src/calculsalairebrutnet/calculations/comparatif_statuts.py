"""Comparatif des statuts pour un même chiffre d'affaires (ou un même net visé) :
salarié, micro-entreprise, portage salarial, SASU, EURL (2026).

- Mode « ca » : net après impôt obtenu dans chaque statut pour un CA mensuel HT. Pour le salarié,
  le CA est assimilé au coût employeur total (ce que l'entreprise dépense pour vous).
- Mode « net » : CA (ou coût employeur) nécessaire pour atteindre un net après impôt visé.
"""
from .._js import js_round
from .cotisations_patronales import brut_depuis_cout_employeur, cotisations_patronales
from .freelance import simuler_freelance
from .salaire import brut_to_net

# StatutCompare : "salarie" | "micro" | "portage" | "sasu" | "sasu_dividendes" | "eurl_ir".

STATUTS_COMPARES = [
    {"id": "salarie", "label": "Salarié (CDI)"},
    {"id": "micro", "label": "Micro-entreprise (BNC)"},
    {"id": "portage", "label": "Portage salarial"},
    {"id": "sasu", "label": "SASU (salaire)"},
    {"id": "sasu_dividendes", "label": "SASU (dividendes)"},
    {"id": "eurl_ir", "label": "EURL / EI au réel"},
]

_OPTIONS_SALARIE = {"cadre": True, "effectif50_plus": False, "taux_atmp": 0.009}


def _r2(n):
    return js_round(n * 100) / 100


def _net_pour(id, ca, charges):
    if id == "salarie":
        brut = brut_depuis_cout_employeur(ca, _OPTIONS_SALARIE)
        sans_impot = brut_to_net(brut_mensuel=brut, statut="cadre")
        r = brut_to_net(brut_mensuel=brut, statut="cadre", taux_prelevement_source=sans_impot["taux_pas_estime"])
        return {"avant": r["net_mensuel"], "apres": r["net_mensuel_apres_impots"]}
    statut = "micro" if id == "micro" else "portage" if id == "portage" else "eurl_ir" if id == "eurl_ir" else "sasu_is"
    r = simuler_freelance(
        ca_mensuel=ca,
        charges_mensuelles=charges,
        statut=statut,
        activite_micro="services_bnc",
        part_remuneration=0 if id == "sasu_dividendes" else 100,
    )
    return {"avant": r["net_avant_impot_mensuel"], "apres": r["net_apres_impot_mensuel"]}


def _ca_pour_net(id, net_vise, charges):
    lo = 0
    hi = max(1000, net_vise * 4 + charges * 2)
    for _ in range(50):
        mid = (lo + hi) / 2
        if _net_pour(id, mid, charges)["apres"] < net_vise:
            lo = mid
        else:
            hi = mid
    return hi


def comparatif_statuts(*, revenu_mensuel_souhaite, mode, charges_mensuelles=None):
    """mode « ca » : revenu_mensuel_souhaite = CA mensuel HT ; mode « net » : net mensuel après impôt visé.
    charges_mensuelles : charges professionnelles (hors salarié).
    """
    valeur = max(0, revenu_mensuel_souhaite)
    charges = max(0, 0 if charges_mensuelles is None else charges_mensuelles)
    lignes = []
    for s in STATUTS_COMPARES:
        id = s["id"]
        charges_statut = 0 if id == "salarie" else charges
        ca = valeur if mode == "ca" else _ca_pour_net(id, valeur, charges_statut)
        n = _net_pour(id, ca, charges_statut)
        lignes.append({
            "id": id,
            "label": s["label"],
            "ca_mensuel": _r2(ca),
            "net_avant_impot": _r2(n["avant"]),
            "net_apres_impot": _r2(n["apres"]),
            "taux_prelevements": max(0, (ca - charges_statut - n["apres"]) / ca) if ca > 0 else 0,
        })
    best = lignes[0]
    for b in lignes[1:]:
        if mode == "ca":
            best = b if b["net_apres_impot"] > best["net_apres_impot"] else best
        else:
            best = b if b["ca_mensuel"] < best["ca_mensuel"] else best

    def get(id):
        return next(l for l in lignes if l["id"] == id)

    salarie = get("salarie")
    return {
        "lignes": lignes,
        "meilleur": best["id"],
        "salarie": {
            "brut_mensuel": _r2(brut_depuis_cout_employeur(salarie["ca_mensuel"], _OPTIONS_SALARIE)),
            "net_mensuel": salarie["net_avant_impot"],
        },
        "auto": {"ca_mensuel": get("micro")["ca_mensuel"], "net_mensuel": get("micro")["net_avant_impot"]},
        "portage": {"ca_mensuel": get("portage")["ca_mensuel"], "net_mensuel": get("portage")["net_avant_impot"]},
        "sasu": {"ca_mensuel": get("sasu")["ca_mensuel"], "net_mensuel": get("sasu")["net_avant_impot"]},
    }


def brut_salarie_depuis_cout(cout):
    """Coût employeur → brut (exposé pour l'affichage)."""
    brut = brut_depuis_cout_employeur(cout, _OPTIONS_SALARIE)
    return {"brut": brut, "patronales": cotisations_patronales(**_OPTIONS_SALARIE, brut=brut)["total"]}
