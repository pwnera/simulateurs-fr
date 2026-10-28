"""Seuils et plafonds de la micro-entreprise 2026 : plafonds de CA, franchise de TVA, versement
libératoire et validation des trimestres de retraite. Position d'un CA donné par rapport à ces seuils.
"""
import math

from .._js import fr_number, js_round, js_str
from ..constants.micro_entreprise import (
    CA_4_TRIMESTRES_2026,
    FRANCHISE_TVA_2026,
    PLAFONDS_CA_MICRO,
    VLF_PLAFOND_RFR_PAR_PART,
)

# ActiviteSeuils : ActiviteMicro | "mixte". Jauges : id "plafond-micro" | "tva" | "retraite", statut "ok" | "attention" | "depasse".


def seuils_plafonds_micro():
    return {
        "plafond_ca_vente": PLAFONDS_CA_MICRO["vente"],
        "plafond_ca_services": PLAFONDS_CA_MICRO["services_bic"],
        "plafond_ca_liberale": PLAFONDS_CA_MICRO["services_bnc"],
        "seuil_tva": FRANCHISE_TVA_2026["services"]["seuil"],
        "seuil_tva_majore": FRANCHISE_TVA_2026["services"]["majore"],
        "seuil_tva_vente": FRANCHISE_TVA_2026["vente"]["seuil"],
        "seuil_tva_vente_majore": FRANCHISE_TVA_2026["vente"]["majore"],
        "vlf_plafond_rfr_par_part": VLF_PLAFOND_RFR_PAR_PART,
        "message": "Plafonds de CA valables de 2026 à 2028. Le régime micro est perdu après deux années consécutives de dépassement. La franchise de TVA est perdue dès le dépassement du seuil majoré.",
    }


def position_seuils(*, activite, ca_annuel, ca_services_mixte=None, depassement_annee_precedente=None):
    """ca_annuel : CA annuel encaissé (HT), CA total pour une activité mixte.
    ca_services_mixte : activité mixte, part de prestations de services dans le CA.
    depassement_annee_precedente : plafond micro déjà dépassé l'année précédente ?
    """
    ca = max(0, ca_annuel)
    mixte = activite == "mixte"
    services = min(ca, max(0, 0 if ca_services_mixte is None else ca_services_mixte)) if mixte else 0 if activite == "vente" else ca
    plafond = PLAFONDS_CA_MICRO["vente"] if mixte else PLAFONDS_CA_MICRO[activite]
    jauges = []

    # Plafond micro (mixte : 203 100 € au total dont 83 600 € de services)
    depasse_plafond = ca > plafond or (mixte and services > PLAFONDS_CA_MICRO["services_bic"])
    if depasse_plafond:
        explication = (
            "Deuxième année de dépassement : vous passez au régime réel au 1er janvier de l'année suivante."
            if depassement_annee_precedente
            else "Premier dépassement : vous restez en micro cette année ; un second dépassement l'année prochaine entraînera le passage au réel."
        )
    else:
        explication = f"Il vous reste {fr_number(js_round(plafond - ca))} € avant le plafond."
    jauges.append({
        "id": "plafond-micro",
        "label": "Plafond de la micro-entreprise",
        "seuil": plafond,
        "valeur": ca,
        "ratio": ca / plafond if plafond > 0 else 0,
        "statut": "depasse" if depasse_plafond else "attention" if ca > plafond * 0.85 else "ok",
        "explication": explication,
    })

    # Franchise de TVA
    tva_vente = FRANCHISE_TVA_2026["vente"]
    tva_services = FRANCHISE_TVA_2026["services"]
    tva = tva_vente if activite == "vente" or (mixte and services == 0) else tva_services
    # Activité mixte : la franchise est perdue si le CA global dépasse le seuil vente ou si les services dépassent leur seuil.
    depasse_majore = (ca > tva_vente["majore"] or services > tva_services["majore"]) if mixte else ca > tva["majore"]
    depasse_seuil = (ca > tva_vente["seuil"] or services > tva_services["seuil"]) if mixte else ca > tva["seuil"]
    if tva["seuil"] > 0:
        ratio = max(ca / tva_vente["seuil"], services / tva_services["seuil"]) if mixte else ca / tva["seuil"]
    else:
        ratio = 0
    jauges.append({
        "id": "tva",
        "label": "Franchise en base de TVA",
        "seuil": tva_services["seuil"] if mixte else tva["seuil"],
        "seuil_majore": tva_services["majore"] if mixte else tva["majore"],
        "valeur": services if mixte else ca,
        "ratio": ratio,
        "statut": "depasse" if depasse_majore else "attention" if depasse_seuil else "ok",
        "explication": "Seuil majoré dépassé : vous devez facturer la TVA dès le jour du dépassement."
        if depasse_majore
        else "Seuil dépassé mais sous le seuil majoré : la franchise s'arrête au 1er janvier de l'année suivante."
        if depasse_seuil
        else "Vous facturez sans TVA (mention « TVA non applicable, art. 293 B du CGI »).",
    })

    # Retraite
    activite_retraite = "vente" if mixte else activite
    ca4 = CA_4_TRIMESTRES_2026[activite_retraite]
    jauges.append({
        "id": "retraite",
        "label": "Validation de 4 trimestres de retraite",
        "seuil": ca4,
        "valeur": ca,
        "ratio": ca / ca4 if ca4 > 0 else 0,
        "statut": "ok" if ca >= ca4 else "attention",
        "explication": "Votre CA valide 4 trimestres de retraite de base."
        if ca >= ca4
        else f"{js_str(min(4, math.floor((ca / ca4) * 4)))} trimestre(s) validé(s) ; il faut {fr_number(ca4)} € de CA pour en valider 4.",
    })

    return {
        "jauges": jauges,
        "marge_avant_tva": max(0, (tva_vente["seuil"] if mixte else tva["seuil"]) - ca),
        "marge_avant_plafond": max(0, plafond - ca),
    }
