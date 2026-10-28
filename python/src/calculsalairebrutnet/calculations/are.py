"""Allocation d'aide au retour à l'emploi (ARE) : montant, durée et dégressivité (estimation).

- SJR = salaires bruts de la période de référence ÷ jours calendaires de la période d'emploi
  (salaires plafonnés à 4 PASS).
- AJ brute = max(40,4 % × SJR + 13,18 €, 57 % × SJR), au moins 32,13 €, au plus 75 % du SJR.
- Durée = jours d'affiliation × 0,75 (min 182 j), plafonnée selon l'âge (548 / 685 / 822 j)
  ou, après une rupture conventionnelle (fin de contrat à partir du 1er septembre 2026), 456 / 624 j.
- Dégressivité : −30 % à partir du 7e mois si moins de 55 ans et AJ > 92,57 € (plancher 92,57 €).
- Net : retenue retraite complémentaire 3 % du SJR, CSG/CRDS 6,7 % sur 98,25 % (taux plein).
"""
import math

from .._js import fr_number, js_round, js_str
from ..constants.chomage import ARE


def _r2(n):
    return js_round(n * 100) / 100


def sjr_depuis_salaire(salaire_brut_mensuel_moyen):
    return _r2(min(ARE["sjr_max"], (max(0, salaire_brut_mensuel_moyen) * 12) / 365))


def _net_jour(aj, sjr):
    retraite = min(ARE["retenue_retraite"] * sjr, max(0, aj - ARE["allocation_minimale"]))
    apres_retraite = aj - retraite
    csg = (
        min(aj * ARE["assiette_csg"] * ARE["csg_crds"], max(0, apres_retraite - ARE["seuil_exoneration_csg"]))
        if aj >= ARE["seuil_exoneration_csg"]
        else 0
    )
    return {"net": apres_retraite - csg, "retraite": retraite, "csg": csg}


def allocation_chomage(
    *,
    salaire_journalier_reference,
    age_moins55=None,
    tranche_age=None,
    mois_travailles=None,
    rupture_conventionnelle=None,
):
    tranche = ("55-56" if age_moins55 is False else "moins-55") if tranche_age is None else tranche_age
    sjr = min(ARE["sjr_max"], max(0, salaire_journalier_reference))
    f1 = ARE["taux_formule1"] * sjr + ARE["partie_fixe"]
    f2 = ARE["taux_formule2"] * sjr
    aj = max(f1, f2)
    formule = "40,4 % + partie fixe" if f1 >= f2 else "57 %"
    if aj < ARE["allocation_minimale"]:
        aj = ARE["allocation_minimale"]
        formule = "minimum"
    if aj > ARE["plafond_sjr"] * sjr:
        aj = ARE["plafond_sjr"] * sjr
        formule = "plafond 75 %"

    periode = ARE["periode_reference_mois"][tranche]
    mois = max(0, min(periode, periode if mois_travailles is None else mois_travailles))
    eligible = mois >= ARE["affiliation_min_mois"] and sjr > 0
    jours_affiliation = js_round((mois * 365) / 12)
    max_ = (
        ARE["duree_max_jours_rupture_conventionnelle"][tranche]
        if rupture_conventionnelle
        else ARE["duree_max_jours"][tranche]
    )
    duree_jours = (
        min(max_, max(ARE["duree_min_jours"], math.ceil(jours_affiliation * ARE["coefficient_duree"] - 1e-9)))
        if eligible
        else 0
    )

    degressivite = ARE["degressivite"]
    degressive = tranche == "moins-55" and aj > degressivite["seuil"] and duree_jours > degressivite["apres_jours"]
    aj_degressive = max(degressivite["seuil"], aj * degressivite["coefficient"]) if degressive else aj
    total_brut = (
        aj * degressivite["apres_jours"] + aj_degressive * (duree_jours - degressivite["apres_jours"])
        if degressive
        else aj * duree_jours
    )

    n = _net_jour(aj, sjr)
    notes = []
    if degressive:
        notes.append(
            f"À partir du 7e mois, l'allocation baisse de 30 % ({fr_number(_r2(aj_degressive))} € / jour), sans descendre sous 92,57 €."
        )
    if rupture_conventionnelle:
        notes.append(
            "Rupture conventionnelle : durée maximale réduite (15 mois avant 55 ans, 20,5 mois ensuite) pour une fin de contrat depuis le 1er septembre 2026."
        )
    notes.append(
        "Un délai d'attente de 7 jours et d'éventuels différés (congés payés, indemnités supra-légales) s'appliquent avant le premier versement."
    )

    return {
        "sjr": _r2(sjr),
        "allocation_journaliere": _r2(aj),
        "formule": formule,
        "allocation_mensuelle": _r2(aj * ARE["jours_par_mois"]),
        "allocation_journaliere_nette": _r2(n["net"]),
        "allocation_mensuelle_nette": _r2(n["net"] * ARE["jours_par_mois"]),
        "retenue_retraite": _r2(n["retraite"]),
        "csg_crds": _r2(n["csg"]),
        "duree_jours": duree_jours,
        "duree_max_mois": js_round((duree_jours / (365 / 12)) * 10) / 10,
        "degressive": degressive,
        "allocation_journaliere_degressive": _r2(aj_degressive),
        "total_brut": _r2(total_brut),
        "eligible": eligible,
        "message": (
            "Montant et durée définitifs fixés par France Travail après étude de votre dossier."
            if eligible
            else f"Il faut avoir travaillé au moins {js_str(ARE['affiliation_min_mois'])} mois sur les {js_str(periode)} derniers mois pour ouvrir des droits."
        ),
        "notes": notes,
    }
