"""Cotisations salariales ligne par ligne (bulletin de paie 2026) et nets associés.

- Secteur privé (non-cadre, cadre, portage) : vieillesse, Agirc-Arrco, CEG/CET, APEC (cadres),
  CSG/CRDS sur 98,25 % du brut (+ prévoyance cadre patronale), réduction de cotisations sur heures sup.
- Fonction publique (titulaire) : pension civile 11,10 % du traitement, RAFP 5 % des primes, CSG/CRDS.

Net imposable = net à payer + CSG non déductible + CRDS − heures sup exonérées.
Montant net social = brut − toutes les cotisations et contributions salariales (y compris mutuelle).
"""
from .._js import js_round, js_sum
from ..constants.plafonds import PMSS_2026
from ..constants.taux_cotisations import (
    COTISATIONS_FONCTION_PUBLIQUE,
    COTISATIONS_SALARIALES_2026 as _C,
    PREVOYANCE_CADRE_PATRONALE,
)
from .heures_sup import TAUX_REDUCTION_SALARIALE_HS


def _r2(n):
    return js_round(n * 100) / 100


def cotisations_salariales(
    *,
    brut,
    statut,
    pmss=None,
    heures_sup_brut=None,
    mutuelle_salariale=None,
    primes_fonction_publique=None,
):
    """Lignes : {id, label, base, taux, montant, deductible} (deductible false pour la CSG non déductible et la CRDS)."""
    input = {
        "brut": brut,
        "statut": statut,
        "pmss": pmss,
        "heures_sup_brut": heures_sup_brut,
        "mutuelle_salariale": mutuelle_salariale,
        "primes_fonction_publique": primes_fonction_publique,
    }
    brut = max(0, brut)
    pmss = PMSS_2026 if pmss is None else pmss
    hs = min(brut, max(0, 0 if heures_sup_brut is None else heures_sup_brut))
    lignes = []

    def add(id, label, base, taux, deductible=True):
        montant = base * taux
        if montant > 0:
            lignes.append({"id": id, "label": label, "base": _r2(base), "taux": taux, "montant": _r2(montant), "deductible": deductible})

    assiette_csg = 0
    taux_vieillesse_hs = 0

    if statut == "fonction-publique":
        primes = min(brut, max(0, 0 if primes_fonction_publique is None else primes_fonction_publique))
        traitement = brut - primes
        fp = COTISATIONS_FONCTION_PUBLIQUE
        add("pension-civile", "Retraite (pension civile)", traitement, fp["pension_civile"])
        add("rafp", "Retraite additionnelle (RAFP)", min(primes, traitement * fp["plafond_primes_rafp"]), fp["rafp"])
        assiette_csg = brut * _C["assiette_csg"]
        taux_vieillesse_hs = fp["pension_civile"]
    else:
        cadre = statut == "cadre" or statut == "portage"
        t1 = min(brut, pmss)
        t2 = max(0, min(brut, 8 * pmss) - pmss)
        add("vieillesse-plafonnee", "Assurance vieillesse plafonnée", t1, _C["vieillesse_plafonnee"])
        add("vieillesse-deplafonnee", "Assurance vieillesse déplafonnée", brut, _C["vieillesse_deplafonnee"])
        add("agirc-arrco-t1", "Retraite complémentaire Agirc-Arrco T1", t1, _C["agirc_arrco_t1"])
        add("agirc-arrco-t2", "Retraite complémentaire Agirc-Arrco T2", t2, _C["agirc_arrco_t2"])
        add("ceg-t1", "Contribution d'équilibre général T1", t1, _C["ceg_t1"])
        add("ceg-t2", "Contribution d'équilibre général T2", t2, _C["ceg_t2"])
        if brut > pmss:
            add("cet", "Contribution d'équilibre technique", t1 + t2, _C["cet"])
        if cadre:
            add("apec", "APEC", min(brut, 4 * pmss), _C["apec"])
        plafond_csg = 4 * pmss
        assiette_csg = min(brut, plafond_csg) * _C["assiette_csg"] + max(0, brut - plafond_csg)
        # La prévoyance cadre financée par l'employeur entre dans l'assiette de la CSG/CRDS
        # mais pas dans le net imposable (CGI art. 83 1° quater) ; T1 suit le plafond proratisé du temps partiel.
        if cadre:
            assiette_csg += t1 * PREVOYANCE_CADRE_PATRONALE
        taux_vieillesse_hs = min(
            TAUX_REDUCTION_SALARIALE_HS,
            _C["vieillesse_plafonnee"] + _C["vieillesse_deplafonnee"] + _C["agirc_arrco_t1"] + _C["ceg_t1"],
        )

    add("csg-deductible", "CSG déductible", assiette_csg, _C["csg_deductible"])
    add("csg-non-deductible", "CSG non déductible", assiette_csg, _C["csg_non_deductible"], False)
    add("crds", "CRDS", assiette_csg, _C["crds"], False)

    mutuelle = max(0, 0 if mutuelle_salariale is None else mutuelle_salariale)
    if mutuelle > 0:
        lignes.append({"id": "mutuelle", "label": "Mutuelle (part salariale)", "base": mutuelle, "taux": 1, "montant": _r2(mutuelle), "deductible": True})

    reduction_heures_sup = hs * taux_vieillesse_hs
    total = js_sum(l["montant"] for l in lignes) - reduction_heures_sup
    net_a_payer = brut - total
    non_deductible = js_sum(l["montant"] for l in lignes if not l["deductible"])

    # Heures sup exonérées d'impôt : le net imposable est celui de la rémunération hors heures sup
    # (sur les heures sup, la CSG/CRDS est entièrement non déductible et le reste est exonéré).
    net_imposable = net_a_payer + non_deductible
    heures_sup_net_exonere = 0
    if hs > 0:
        hors_hs = cotisations_salariales(**{**input, "brut": brut - hs, "heures_sup_brut": 0})
        net_imposable = hors_hs["net_imposable"]
        heures_sup_net_exonere = net_a_payer - hors_hs["net_a_payer"]

    return {
        "lignes": lignes,
        "total": _r2(total),
        "reduction_heures_sup": _r2(reduction_heures_sup),
        "net_a_payer": _r2(net_a_payer),
        "net_imposable": _r2(max(0, net_imposable)),
        "net_social": _r2(net_a_payer),
        "heures_sup_net_exonere": _r2(max(0, heures_sup_net_exonere)),
    }
