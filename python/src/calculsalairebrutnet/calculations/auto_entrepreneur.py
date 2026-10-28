"""Auto-entrepreneur / micro-entrepreneur : CA → net, impôt, plafonds, TVA et retraite (2026)."""
import math

from .._js import js_round
from ..constants.micro_entreprise import (
    ABATTEMENT_MICRO,
    ABATTEMENT_MICRO_MIN,
    ACRE_TAUX,
    CA_4_TRIMESTRES_2026,
    CFP_MICRO,
    FRANCHISE_TVA_2026,
    PLAFONDS_CA_MICRO,
    TAUX_MICRO_2026,
    TAUX_VERSEMENT_LIBERATOIRE,
)
from .impot_revenu import calcul_impot_revenu

# AutoEntrepreneurActivite : ActiviteMicro. AcreOption : "non" | "50" | "25".


def _r2(n):
    return js_round(n * 100) / 100


def auto_entrepreneur(
    *,
    activite,
    ca_mensuel=None,
    ca_annuel=None,
    beneficiaire_acre=None,
    acre=None,
    artisan=None,
    versement_liberatoire=None,
    taux_prelevement_source=None,
):
    """beneficiaire_acre : True = ACRE au taux actuel (25 %) ; préférer `acre` pour préciser le taux.
    artisan : inscrit à la chambre des métiers (CFP 0,3 % au lieu de 0,1 %).
    taux_prelevement_source : en % (0–45), appliqué au bénéfice imposable.
    """
    versement_liberatoire = False if versement_liberatoire is None else versement_liberatoire
    ca_mensuel = ca_annuel / 12 if ca_annuel is not None else max(0, 0 if ca_mensuel is None else ca_mensuel)
    ca_annuel = ca_mensuel * 12
    plafond_annuel = PLAFONDS_CA_MICRO[activite]
    sous_plafond = ca_annuel <= plafond_annuel

    acre = ("25" if beneficiaire_acre else "non") if acre is None else acre
    exoneration = ACRE_TAUX["avant_juillet2026"] if acre == "50" else ACRE_TAUX["depuis_juillet2026"] if acre == "25" else 0
    taux_social = TAUX_MICRO_2026[activite] * (1 - exoneration)
    if activite == "services_bnc" or activite == "liberale_cipav":
        taux_cfp = CFP_MICRO["liberal"]
    else:
        taux_cfp = CFP_MICRO["artisan"] if artisan else CFP_MICRO["commercant"]
    cfp = ca_mensuel * taux_cfp
    cotisations = ca_mensuel * taux_social + cfp
    net_mensuel = ca_mensuel - cotisations

    # Bénéfice imposable = CA − abattement forfaitaire (71 % / 50 % / 34 %, minimum 305 €)
    abattement = min(ca_annuel, max(ABATTEMENT_MICRO_MIN, ca_annuel * ABATTEMENT_MICRO[activite]))
    revenu_imposable_annuel = max(0, ca_annuel - abattement)
    impot_bareme = calcul_impot_revenu(revenu_imposable=revenu_imposable_annuel)["impot_net"]
    taux_pas_estime = js_round((impot_bareme / revenu_imposable_annuel) * 10000) / 100 if revenu_imposable_annuel > 0 else 0

    if versement_liberatoire:
        impot_annuel = ca_annuel * TAUX_VERSEMENT_LIBERATOIRE[activite]
    elif taux_prelevement_source is not None and taux_prelevement_source >= 0 and taux_prelevement_source <= 45:
        impot_annuel = (revenu_imposable_annuel * taux_prelevement_source) / 100
    else:
        impot_annuel = impot_bareme
    impot_mensuel = impot_annuel / 12

    tva_seuils = FRANCHISE_TVA_2026["vente"] if activite == "vente" else FRANCHISE_TVA_2026["services"]
    tva_statut = "franchise" if ca_annuel <= tva_seuils["seuil"] else "seuil-depasse" if ca_annuel <= tva_seuils["majore"] else "assujetti"

    ca_pour4_trimestres = CA_4_TRIMESTRES_2026[activite]
    # La validation dépend des cotisations retraite versées : réduite en proportion par l'ACRE.
    ca_effectif = ca_annuel * (1 - exoneration)
    trimestres_retraite = max(0, min(4, math.floor((ca_effectif / ca_pour4_trimestres) * 4 + 1e-9)))

    messages = [
        "Sous le plafond de chiffre d'affaires de la micro-entreprise."
        if sous_plafond
        else "Au-dessus du plafond : si le dépassement se répète deux années de suite, vous basculez au régime réel."
    ]
    if tva_statut == "seuil-depasse":
        messages.append("Seuil de franchise de TVA dépassé : vous facturerez la TVA à partir du 1er janvier suivant.")
    if tva_statut == "assujetti":
        messages.append("Seuil majoré de TVA dépassé : la TVA est due dès le jour du dépassement.")

    return {
        "net_mensuel": _r2(net_mensuel),
        "net_annuel": _r2(net_mensuel * 12),
        "cotisations": _r2(cotisations),
        "taux_cotisations": taux_social + taux_cfp,
        "cfp": _r2(cfp),
        "impot_mensuel": _r2(impot_mensuel),
        "impot_annuel": _r2(impot_annuel),
        "taux_ir": _r2((impot_annuel / ca_annuel) * 100) if ca_annuel > 0 else 0,
        "taux_pas_estime": taux_pas_estime,
        "revenu_imposable_annuel": _r2(revenu_imposable_annuel),
        "net_mensuel_apres_impots": _r2(net_mensuel - impot_mensuel),
        "net_annuel_apres_impots": _r2((net_mensuel - impot_mensuel) * 12),
        "plafond_annuel": plafond_annuel,
        "sous_plafond": sous_plafond,
        "tva": {"seuil": tva_seuils["seuil"], "seuil_majore": tva_seuils["majore"], "statut": tva_statut},
        "trimestres_retraite": trimestres_retraite,
        "ca_pour4_trimestres": ca_pour4_trimestres,
        "message": " ".join(messages),
    }
