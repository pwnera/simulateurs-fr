"""Aide au logement en location (APL / ALF / ALS) – secteur locatif ordinaire, métropole.

Aide = L + C − Pp − 5 €, avec :
- L : loyer réel (hors charges) plafonné selon la zone et la composition du foyer ;
- C : forfait charges ;
- Pp = P0 + Tp × (R − R0) : participation personnelle, R = ressources annuelles arrondies à la centaine
  supérieure, P0 = max(8,5 % × (L + C), 40,01 €), Tp = TF + TL.
Dégressivité pour les loyers très élevés, CRDS de 0,5 % sur le montant versé.
"""
import math

from .._js import js_round, js_str
from ..constants.aides_caf import (
    AL_SEUIL_VERSEMENT,
    APL_COEF_COLOCATION,
    APL_CRDS,
    APL_DEGRESSIVITE,
    APL_ETUDIANT,
    APL_FORFAIT_CHARGES,
    APL_LOYERS_PLAFONDS,
    APL_MINORATION,
    APL_P0,
    APL_R0,
    APL_TF,
    APL_TL,
)


def _r2(n):
    return js_round(n * 100) / 100


def ressources_depuis_net_mensuel(net_mensuel):
    """Revenus nets mensuels → ressources annuelles retenues (net imposable − 10 %), arrondies à la centaine supérieure."""
    # Net imposable ≈ net × 1,036 (CSG non déductible + CRDS), puis abattement de 10 % pour frais professionnels.
    return max(0, net_mensuel) * 12 * 1.036 * 0.9


def _loyer_plafond(zone, couple, pac):
    seul, couple_sans, une_pac, par_pac = APL_LOYERS_PLAFONDS[zone]
    if pac <= 0:
        return couple_sans if couple else seul
    return une_pac + (pac - 1) * par_pac


def _taux_famille(couple, pac):
    if pac <= 0:
        return APL_TF["couple"] if couple else APL_TF["isole"]
    if pac <= 6:
        return APL_TF["pac"][pac - 1]
    return APL_TF["pac"][5] + (pac - 6) * APL_TF["par_pac_supp"]


def _r0(couple, pac):
    if pac <= 0:
        return APL_R0["couple"] if couple else APL_R0["isole"]
    if pac <= 6:
        return APL_R0["pac"][pac - 1]
    return APL_R0["pac"][5] + (pac - 6) * APL_R0["par_pac_supp"]


def _taux_loyer(rl):
    RL = js_round(rl * 10000) / 10000
    if RL < APL_TL["seuil1"]:
        return 0
    if RL < APL_TL["seuil2"]:
        return js_round(APL_TL["taux1"] * (RL - APL_TL["seuil1"]) * 1e5) / 1e5
    return js_round((APL_TL["taux1"] * (APL_TL["seuil2"] - APL_TL["seuil1"]) + APL_TL["taux2"] * (RL - APL_TL["seuil2"])) * 1e5) / 1e5


def simulation_apl(
    *,
    loyer_mensuel,
    revenus_mensuels,
    nb_personnes=None,
    nb_enfants=None,
    couple=None,
    zone=None,
    colocation=None,
    etudiant=None,
    boursier=None,
    ressources_annuelles=None,
):
    # Les clés d'objet JavaScript sont des chaînes : zone 1 et "1" désignent la même zone.
    zone = "2" if zone is None else js_str(zone)
    pac = max(0, math.floor(0 if nb_enfants is None else nb_enfants))
    if couple is None:
        couple = max(1, 1 if nb_personnes is None else nb_personnes) - pac >= 2
    loyer = max(0, loyer_mensuel)

    plafond = _loyer_plafond(zone, couple, pac)
    if colocation:
        plafond *= APL_COEF_COLOCATION
    L = min(loyer, plafond)
    C = (
        (APL_FORFAIT_CHARGES["colocation_couple"] if couple else APL_FORFAIT_CHARGES["colocation_isole"])
        + pac * APL_FORFAIT_CHARGES["par_personne_a_charge"]
        if colocation
        else APL_FORFAIT_CHARGES["general"] + pac * APL_FORFAIT_CHARGES["par_personne_a_charge"]
    )

    R = ressources_depuis_net_mensuel(revenus_mensuels) if ressources_annuelles is None else ressources_annuelles
    if etudiant:
        R = max(R, APL_ETUDIANT["forfait_ressources"] - (APL_ETUDIANT["minoration_boursier"] if boursier else 0))
    R = math.ceil(R / 100) * 100
    R0 = _r0(couple, pac)

    P0 = max(APL_P0["taux"] * (L + C), APL_P0["forfait"])
    loyer_reference = _loyer_plafond("2", couple, pac) * (APL_COEF_COLOCATION if colocation else 1)
    TL = _taux_loyer(L / loyer_reference if loyer_reference > 0 else 0)
    Tp = _taux_famille(couple, pac) + TL
    Pp = P0 + Tp * max(0, R - R0)

    aide = L + C - Pp - APL_MINORATION
    # Dégressivité : loyers très supérieurs au plafond
    d1, d2 = APL_DEGRESSIVITE[zone]
    degressivite = 0
    if aide > 0 and loyer > d1 * plafond:
        ratio = min(1, (loyer - d1 * plafond) / ((d2 - d1) * plafond))
        degressivite = aide * ratio
        aide -= degressivite
    aide = max(0, aide)
    versee = aide * (1 - APL_CRDS)
    eligible = versee > 0

    if not eligible:
        message = "Vos ressources dépassent le seuil au-delà duquel l'aide au logement est nulle pour ce loyer et cette composition familiale."
    elif versee < AL_SEUIL_VERSEMENT:
        message = "Montant très faible : pour une ALF ou une ALS, les aides inférieures à 10 € ne sont pas versées."
    else:
        message = "Estimation selon le barème officiel. La CAF calculera le montant définitif à partir de vos ressources réelles des 12 derniers mois."

    return {
        "apl_estimee": _r2(versee),
        "aide_brute": _r2(aide),
        "loyer_retenu": _r2(L),
        "loyer_plafond": _r2(plafond),
        "forfait_charges": _r2(C),
        "ressources_retenues": R,
        "r0": R0,
        "p0": _r2(P0),
        "taux_participation": Tp,
        "participation_personnelle": _r2(Pp),
        "degressivite": _r2(degressivite),
        "eligible": eligible,
        "message": message,
    }
