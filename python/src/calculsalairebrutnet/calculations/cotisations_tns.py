"""Cotisations sociales d'un travailleur indépendant au réel (EI, gérant majoritaire d'EURL/SARL),
à partir du revenu professionnel avant cotisations (réforme de l'assiette 2026).
"""
from .._js import js_round, js_sum
from ..constants.cotisations_tns import (
    ABATTEMENT_ASSIETTE_TNS,
    ALLOCATIONS_FAMILIALES_TNS,
    CFP_TNS,
    CSG_CRDS_TNS,
    CSG_DEDUCTIBLE_TNS,
    MALADIE_TNS_AU_DELA_3_PASS,
    MALADIE_TNS_PALIERS,
    TNS_CIPAV,
    TNS_SSI,
)
from ..constants.plafonds import PASS_2026, SMIC_HORAIRE_BRUT_JANVIER_2026

# ProfessionTNS : "artisan" | "commercant" | "liberal" | "liberal-cipav".
# Groupes de lignes : "retraite" | "sante" | "prevoyance" | "famille" | "csg" | "formation".


def _r2(n):
    return js_round(n * 100) / 100


def assiette_sociale_tns(revenu, pass_=PASS_2026):
    """Assiette sociale unique : revenu − 26 % (abattement compris entre 1,76 % et 130 % du PASS)."""
    if revenu <= 0:
        return 0
    abattement = min(
        ABATTEMENT_ASSIETTE_TNS["plafond"] * pass_,
        max(ABATTEMENT_ASSIETTE_TNS["plancher"] * pass_, revenu * ABATTEMENT_ASSIETTE_TNS["taux"]),
    )
    return max(0, revenu - abattement)


def cotisation_maladie_tns(assiette, pass_=PASS_2026):
    """Taux maladie-maternité progressif (sous 3 PASS) ; au-delà, 8,5 % jusqu'à 3 PASS puis 6,5 %."""
    if assiette <= 0:
        return 0
    ratio = assiette / pass_
    if ratio > 3:
        return 3 * pass_ * 0.085 + (assiette - 3 * pass_) * MALADIE_TNS_AU_DELA_3_PASS
    prev_seuil = 0
    prev_taux = 0
    for p in MALADIE_TNS_PALIERS:
        if ratio <= p["seuil"]:
            t = prev_taux + ((p["taux"] - prev_taux) * (ratio - prev_seuil)) / (p["seuil"] - prev_seuil)
            return assiette * t
        prev_seuil = p["seuil"]
        prev_taux = p["taux"]
    return assiette * 0.085


def cotisation_allocations_familiales_tns(assiette, pass_=PASS_2026):
    seuil_bas = ALLOCATIONS_FAMILIALES_TNS["seuil_bas"]
    seuil_haut = ALLOCATIONS_FAMILIALES_TNS["seuil_haut"]
    taux = ALLOCATIONS_FAMILIALES_TNS["taux"]
    ratio = assiette / pass_
    if ratio <= seuil_bas:
        return 0
    if ratio >= seuil_haut:
        return assiette * taux
    return assiette * taux * ((ratio - seuil_bas) / (seuil_haut - seuil_bas))


def cotisations_tns(revenu, profession="liberal"):
    """Cotisations annuelles d'un TNS au réel.
    revenu : revenu professionnel annuel avant cotisations sociales (bénéfice + cotisations).
    """
    pass_ = PASS_2026
    R = max(0, revenu)
    A = assiette_sociale_tns(R, pass_)
    lignes = []

    def add(id, label, montant, groupe):
        if montant > 0:
            lignes.append({"id": id, "label": label, "montant": _r2(montant), "groupe": groupe})

    add("maladie", "Maladie-maternité", cotisation_maladie_tns(A, pass_), "sante")

    if profession == "liberal-cipav":
        c = TNS_CIPAV
        add("ij", "Indemnités journalières", min(max(A, c["ij"]["min_pass"] * pass_), c["ij"]["plafond_pass"] * pass_) * c["ij"]["taux"], "sante")
        t1 = min(A, pass_)
        add(
            "retraite-base",
            "Retraite de base (CNAVPL)",
            max(t1, TNS_SSI["retraite_base_assiette_min_heures_smic"] * SMIC_HORAIRE_BRUT_JANVIER_2026) * c["retraite_base_t1"]
            + max(0, min(A, c["retraite_base_plafond_pass"] * pass_) - pass_) * c["retraite_base_t2"],
            "retraite",
        )
        add(
            "retraite-complementaire",
            "Retraite complémentaire (Cipav)",
            t1 * c["complementaire_t1"] + max(0, min(A, c["complementaire_plafond_pass"] * pass_) - pass_) * c["complementaire_t2"],
            "retraite",
        )
        add("invalidite-deces", "Invalidité-décès", min(A, c["invalidite_deces_plafond_pass"] * pass_) * c["invalidite_deces"], "prevoyance")
    else:
        s = TNS_SSI
        add("ij", "Indemnités journalières", min(max(A, s["ij"]["min_pass"] * pass_), s["ij"]["plafond_pass"] * pass_) * s["ij"]["taux"], "sante")
        assiette_retraite_min = s["retraite_base_assiette_min_heures_smic"] * SMIC_HORAIRE_BRUT_JANVIER_2026
        add(
            "retraite-base",
            "Retraite de base",
            max(min(A, pass_), assiette_retraite_min) * s["retraite_base_t1"] + A * s["retraite_base_total"],
            "retraite",
        )
        add(
            "retraite-complementaire",
            "Retraite complémentaire",
            min(A, pass_) * s["rci_t1"] + max(0, min(A, s["rci_plafond_pass"] * pass_) - pass_) * s["rci_t2"],
            "retraite",
        )
        add("invalidite-deces", "Invalidité-décès", max(min(A, pass_), s["invalidite_deces_min_pass"] * pass_) * s["invalidite_deces"], "prevoyance")

    add("allocations-familiales", "Allocations familiales", cotisation_allocations_familiales_tns(A, pass_), "famille")
    csg = A * CSG_CRDS_TNS
    add("csg-crds", "CSG-CRDS", csg, "csg")
    add(
        "cfp",
        "Formation professionnelle (CFP)",
        (CFP_TNS["artisan"] if profession == "artisan" else CFP_TNS["commercant_liberal"]) * pass_,
        "formation",
    )

    total = js_sum(l["montant"] for l in lignes)
    non_deductible = A * (CSG_CRDS_TNS - CSG_DEDUCTIBLE_TNS)
    retraite = js_sum(l["montant"] for l in lignes if l["groupe"] == "retraite")
    return {
        "revenu": _r2(R),
        "assiette": _r2(A),
        "lignes": lignes,
        "total": _r2(total),
        "revenu_net": _r2(R - total),
        "deductible": _r2(total - non_deductible),
        "taux_global": total / R if R > 0 else 0,
        "retraite": _r2(retraite),
    }
