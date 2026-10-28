"""Retraite et prévoyance des indépendants (2026) : part des cotisations consacrée à la retraite et à la
prévoyance, trimestres de retraite validés et indemnités journalières maladie.

- Réel (EI, gérant majoritaire) : moteur de cotisations TNS 2026 (assiette avec abattement de 26 %).
- Micro-entreprise : cotisations forfaitaires sur le CA ; trimestres selon les seuils de CA 2026.
- 1 trimestre de retraite de base = revenu cotisé de 150 × SMIC horaire (1 803 € en 2026), 4 maximum.
- Indemnités journalières : 1/730 du revenu annuel moyen (3 dernières années), plafonné à 1 PASS pour
  les artisans et commerçants, 3 PASS pour les professions libérales ; aucune indemnité sous 10 % du PASS.
"""
import math

from .._js import fr_number, js_round, js_str
from ..constants.micro_entreprise import CA_4_TRIMESTRES_2026, TAUX_MICRO_2026
from ..constants.plafonds import PASS_2026, SMIC_HORAIRE_BRUT_JANVIER_2026
from .cotisations_tns import cotisations_tns

HEURES_SMIC_PAR_TRIMESTRE = 150
REVENU_PAR_TRIMESTRE = js_round(HEURES_SMIC_PAR_TRIMESTRE * SMIC_HORAIRE_BRUT_JANVIER_2026)
# Répartition des cotisations micro (vente, services BIC) : retraite de base 43,45 %, complémentaire 19,75 % (décret 2025-943).
_PART_RETRAITE_MICRO_BIC = 0.4345 + 0.1975
_PART_INVALIDITE_MICRO_BIC = 0.0315
_ABATTEMENT_MICRO = {"vente": 0.71, "services_bic": 0.5, "services_bnc": 0.34, "liberale_cipav": 0.34}


def _r2(n):
    return js_round(n * 100) / 100


def _indemnite_journaliere(revenu, profession):
    """profession : ProfessionTNS | "micro-bic" | "micro-liberal"."""
    if revenu < 0.1 * PASS_2026:
        return 0
    liberal = profession == "liberal" or profession == "liberal-cipav" or profession == "micro-liberal"
    plafond = (3 if liberal else 1) * PASS_2026
    return min(revenu, plafond) / 730


def retraite_prevoyance_independants(*, revenus_annuels, regime, activite_micro=None, profession=None):
    """revenus_annuels : CA annuel en micro, revenu professionnel annuel avant cotisations au réel.
    regime : "micro" | "reel".
    """
    revenus = max(0, revenus_annuels)

    if regime == "micro":
        activite = "services_bic" if activite_micro is None else activite_micro
        total = revenus * TAUX_MICRO_2026[activite]
        bic = activite == "vente" or activite == "services_bic"
        retraite = total * _PART_RETRAITE_MICRO_BIC if bic else 0
        base = total * 0.4345 if bic else 0
        prevoyance = total * _PART_INVALIDITE_MICRO_BIC if bic else 0
        seuil = CA_4_TRIMESTRES_2026[activite]
        trimestres = max(0, min(4, math.floor((revenus / seuil) * 4 + 1e-9)))
        revenu_apres_abattement = revenus * (1 - _ABATTEMENT_MICRO[activite])
        return {
            "total_cotisations": _r2(total),
            "cotisation_retraite_base": _r2(base),
            "cotisation_retraite_complementaire": _r2(retraite - base),
            "cotisation_retraite": _r2(retraite),
            "cotisation_prevoyance": _r2(prevoyance),
            "total": _r2(retraite + prevoyance),
            "trimestres": trimestres,
            "seuil4_trimestres": seuil,
            "indemnite_journaliere": _r2(_indemnite_journaliere(revenu_apres_abattement, "micro-bic" if bic else "micro-liberal")),
            "repartition_connue": bic,
            "lignes": [
                {"label": "Retraite de base", "montant": _r2(base)},
                {"label": "Retraite complémentaire", "montant": _r2(retraite - base)},
                {"label": "Invalidité-décès", "montant": _r2(prevoyance)},
                {"label": "Maladie, CSG-CRDS et autres", "montant": _r2(total - retraite - prevoyance)},
            ]
            if bic
            else [{"label": "Cotisations sociales (taux global)", "montant": _r2(total)}],
            "message": "Votre chiffre d'affaires valide 4 trimestres de retraite de base."
            if trimestres >= 4
            else f"Il faut {fr_number(seuil)} € de chiffre d'affaires annuel pour valider 4 trimestres.",
        }

    profession = "liberal" if profession is None else profession
    tns = cotisations_tns(revenus, profession)

    def get(id):
        return next((l["montant"] for l in tns["lignes"] if l["id"] == id), 0)

    base = get("retraite-base")
    compl = get("retraite-complementaire")
    prevoyance = get("invalidite-deces") + get("ij")
    # Trimestres : selon le revenu soumis à la retraite de base (avec l'assiette minimale, 3 trimestres).
    assiette_retraite = max(tns["assiette"], 450 * SMIC_HORAIRE_BRUT_JANVIER_2026)
    trimestres = max(0, min(4, math.floor(assiette_retraite / REVENU_PAR_TRIMESTRE)))
    # Revenu avant cotisations donnant une assiette de 4 trimestres (assiette = revenu − 26 %).
    seuil4 = js_round((4 * REVENU_PAR_TRIMESTRE) / 0.74)
    return {
        "total_cotisations": _r2(tns["total"]),
        "cotisation_retraite_base": _r2(base),
        "cotisation_retraite_complementaire": _r2(compl),
        "cotisation_retraite": _r2(base + compl),
        "cotisation_prevoyance": _r2(prevoyance),
        "total": _r2(base + compl + prevoyance),
        "trimestres": trimestres,
        "seuil4_trimestres": seuil4,
        "indemnite_journaliere": _r2(_indemnite_journaliere(tns["assiette"], profession)),
        "repartition_connue": True,
        "lignes": [{"label": l["label"], "montant": l["montant"]} for l in tns["lignes"]],
        "message": "Votre revenu valide 4 trimestres de retraite de base."
        if trimestres >= 4
        else f"Les cotisations minimales valident {js_str(trimestres)} trimestre(s) ; il faut environ {fr_number(seuil4)} € de revenu annuel pour en valider 4.",
    }
