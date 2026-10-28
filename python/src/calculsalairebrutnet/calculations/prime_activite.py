"""Prime d'activité (CAF/MSA) – estimation mensuelle, barème au 1er avril 2026.

PA = MF + 59,85 % × revenus professionnels + bonifications − max(ressources + forfait logement, MF)
- MF : montant forfaitaire majoré selon la composition du foyer ;
- bonification individuelle par travailleur : de 0 (revenus ≤ 59 × SMIC horaire) à 240,63 €
  (revenus ≥ 138 × SMIC horaire) ;
- forfait logement si le foyer perçoit une aide au logement, est propriétaire ou hébergé gratuitement ;
- non versée en dessous de 15 € ; CRDS de 0,5 %.
"""
import math

from .._js import js_round, js_str
from ..constants.aides_caf import PRIME_ACTIVITE as _PA
from ..constants.plafonds import SMIC_HORAIRE_BRUT


def _r2(n):
    return js_round(n * 100) / 100


def coefficient_foyer(couple, enfants):
    """Coefficient de majoration du montant forfaitaire selon la composition du foyer."""
    coef = 1 + (_PA["majoration2e"] if couple else 0)
    i = 1
    while i <= enfants:
        if i >= 3:
            coef += _PA["majoration_enfant_supp"]
        elif i == 1 and not couple:
            coef += _PA["majoration2e"]
        else:
            coef += _PA["majoration3e"]
        i += 1
    return coef


def bonification_individuelle(revenus, smic_horaire=SMIC_HORAIRE_BRUT):
    """Bonification individuelle pour un travailleur selon ses revenus professionnels mensuels."""
    seuil = _PA["bonification"]["seuil_heures_smic"] * smic_horaire
    plein = _PA["bonification"]["plein_heures_smic"] * smic_horaire
    max_ = _PA["bonification"]["taux_max"] * _PA["montant_forfaitaire"]
    if revenus <= seuil:
        return 0
    if revenus >= plein:
        return max_
    return (max_ * (revenus - seuil)) / (plein - seuil)


def prime_activite(
    *,
    revenus_mensuels,
    revenus_conjoint=None,
    nb_personnes=None,
    nb_enfants=None,
    couple=None,
    autres_ressources=None,
    logement=None,
    aide_logement=None,
):
    enfants = max(0, math.floor(0 if nb_enfants is None else nb_enfants))
    if couple is None:
        couple = max(1, 1 if nb_personnes is None else nb_personnes) - enfants >= 2
    r1 = max(0, revenus_mensuels)
    r2c = max(0, 0 if revenus_conjoint is None else revenus_conjoint) if couple else 0
    revenus_pro = r1 + r2c
    autres = max(0, 0 if autres_ressources is None else autres_ressources)
    personnes = (2 if couple else 1) + enfants

    MF = _PA["montant_forfaitaire"] * coefficient_foyer(couple, enfants)
    forfait_max = _PA["forfait_logement"][min(3, personnes) - 1]
    logement = "locataire-sans-aide" if logement is None else logement
    if logement == "locataire-sans-aide":
        forfait_logement = 0
    elif logement == "locataire-aide" and aide_logement is not None:
        forfait_logement = min(max(0, aide_logement), forfait_max)
    else:
        forfait_logement = forfait_max

    bonification = bonification_individuelle(r1) + (bonification_individuelle(r2c) if couple else 0)
    part_revenus = _PA["taux_revenus_pro"] * revenus_pro
    ressources = revenus_pro + autres
    brut = MF + part_revenus + bonification - max(ressources + forfait_logement, MF)
    montant = max(0, brut) if revenus_pro > 0 else 0
    eligible = montant >= _PA["versement_minimum"]

    if revenus_pro <= 0:
        message = "La prime d'activité est réservée aux personnes qui ont des revenus d'activité."
    elif not eligible and montant > 0:
        message = f"Montant inférieur à {js_str(_PA['versement_minimum'])} € : la prime n'est pas versée."
    elif not eligible:
        message = "Vos ressources dépassent le plafond pour votre composition familiale."
    else:
        message = "Estimation selon le barème officiel. La CAF calcule le montant sur la moyenne de vos revenus du trimestre précédent."

    return {
        "eligible": eligible,
        "montant_mensuel_estime": _r2(montant * 0.995) if eligible else 0,
        "montant_forfaitaire": _r2(MF),
        "part_revenus": _r2(part_revenus),
        "bonification": _r2(bonification),
        "ressources_retenues": _r2(ressources),
        "forfait_logement": _r2(forfait_logement),
        "message": message,
    }
