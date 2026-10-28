"""Salaire brut ↔ net (2026).

Secteur privé et fonction publique : cotisations calculées ligne par ligne
(calculations/cotisations_salariales.py). Profession libérale : cotisations de travailleur
indépendant sur le revenu avant cotisations (calculations/cotisations_tns.py).

Mois de primes (13e mois…) et primes annuelles : le net mensuel affiché est celui d'un mois
habituel ; le net annuel inclut toutes les primes (cotisations calculées sur la moyenne mensuelle,
comme la régularisation annuelle du plafond).
"""
from .._js import js_round
from ..constants.plafonds import PMSS_2026
from .cotisations_salariales import cotisations_salariales
from .cotisations_tns import cotisations_tns
from .impot_revenu import estimer_taux_prelevement_source, round_taux_to_slider_step

# Majoration des heures sup (25 % = taux 1,25).
_MAJORATION_HS_25 = 1.25

# Heures travaillées par mois à temps plein (35 h × 52 / 12).
HEURES_MENSUELLES = 35 * (52 / 12)


def _calcul_mois(brut, statut, pmss, heures_sup_brut, mutuelle, primes_fp):
    if statut == "profession-liberale":
        tns = cotisations_tns(brut * 12, "liberal")
        total = tns["total"] / 12
        non_deductible = (tns["total"] - tns["deductible"]) / 12
        lignes = [
            {
                "id": l["id"],
                "label": l["label"],
                "base": js_round((tns["assiette"] / 12) * 100) / 100,
                "taux": l["montant"] / tns["assiette"] if tns["assiette"] > 0 else 0,
                "montant": js_round((l["montant"] / 12) * 100) / 100,
                "deductible": l["id"] != "csg-crds",
            }
            for l in tns["lignes"]
        ]
        net = brut - total
        return {"total": total, "net_a_payer": net, "net_imposable": net + non_deductible, "net_social": net, "lignes": lignes, "reduction_heures_sup": 0}
    r = cotisations_salariales(
        brut=brut,
        statut=statut,
        pmss=pmss,
        heures_sup_brut=heures_sup_brut,
        mutuelle_salariale=mutuelle,
        primes_fonction_publique=primes_fp,
    )
    return {
        "total": r["total"],
        "net_a_payer": r["net_a_payer"],
        "net_imposable": r["net_imposable"],
        "net_social": r["net_social"],
        "lignes": r["lignes"],
        "reduction_heures_sup": r["reduction_heures_sup"],
    }


def _r2(n):
    return js_round(n * 100) / 100


def remuneration_temps_partiel_fp(quotite):
    """Fonction publique : part du traitement versée selon la quotité de temps partiel.
    80 % et 90 % sont payés 6/7 et 32/35 du traitement (ex-art. 40 loi n° 84-16) ; sinon proportionnel.
    """
    if abs(quotite - 0.8) < 1e-9:
        return 6 / 7
    if abs(quotite - 0.9) < 1e-9:
        return 32 / 35
    return quotite


def brut_to_net(
    *,
    brut_mensuel,
    statut,
    temps_travail_percent=None,
    mois_prime=None,
    taux_prelevement_source=None,
    primes_annuelle=None,
    heures_sup_mensuelles=None,
    mutuelle_mensuelle=None,
):
    temps = min(1, max(0.01, (100 if temps_travail_percent is None else temps_travail_percent) / 100))
    fp = statut == "fonction-publique"
    base = max(0, brut_mensuel) * (remuneration_temps_partiel_fp(temps) if fp else temps)
    mois_prime = 12 if mois_prime is None else mois_prime
    primes_annuelle = max(0, 0 if primes_annuelle is None else primes_annuelle)
    heures_sup = max(0, 0 if heures_sup_mensuelles is None else heures_sup_mensuelles)
    mutuelle = max(0, 0 if mutuelle_mensuelle is None else mutuelle_mensuelle)
    pmss = PMSS_2026 * temps
    heures = HEURES_MENSUELLES * temps
    brut_horaire = base / heures if heures > 0 else 0
    hs_brut = heures_sup * brut_horaire * _MAJORATION_HS_25

    # Mois habituel
    brut_mensuel = base + hs_brut
    mois = _calcul_mois(brut_mensuel, statut, pmss, hs_brut, mutuelle, 0)

    # Année : salaire × mois de primes + primes, cotisations sur la moyenne mensuelle
    brut_annuel = base * mois_prime + primes_annuelle + hs_brut * 12
    moyen = brut_annuel / 12
    # Fonction publique : les primes (hors traitement) relèvent de la RAFP.
    primes_fp_moyennes = primes_annuelle / 12 + (base * (mois_prime - 12)) / 12 if fp else 0
    annee = _calcul_mois(moyen, statut, pmss, hs_brut, mutuelle, primes_fp_moyennes)
    net_annuel = annee["net_a_payer"] * 12
    net_imposable_annuel = annee["net_imposable"] * 12

    taux_pas_estime = estimer_taux_prelevement_source(
        net_imposable_annuel, 1, {"appliquer_abattement10": statut != "profession-liberale"}
    )
    taux_ir = min(100, max(0, 0 if taux_prelevement_source is None else taux_prelevement_source)) / 100
    impot_mensuel = mois["net_imposable"] * taux_ir
    impot_annuel = net_imposable_annuel * taux_ir

    return {
        "brut_mensuel": _r2(brut_mensuel),
        "brut_annuel": _r2(brut_annuel),
        "brut_horaire": _r2(brut_horaire),
        "net_mensuel": _r2(mois["net_a_payer"]),
        "net_annuel": _r2(net_annuel),
        "net_mensuel_moyen": _r2(net_annuel / 12),
        "net_horaire": _r2(brut_horaire * (mois["net_a_payer"] / brut_mensuel) if brut_mensuel > 0 else 0),
        "net_imposable_mensuel": _r2(mois["net_imposable"]),
        "net_imposable_annuel": _r2(net_imposable_annuel),
        "net_social_mensuel": _r2(mois["net_social"]),
        "net_social_annuel": _r2(annee["net_social"] * 12),
        "impot_mensuel": _r2(impot_mensuel),
        "net_mensuel_apres_impots": _r2(mois["net_a_payer"] - impot_mensuel),
        "net_annuel_apres_impots": _r2(net_annuel - impot_annuel),
        "cotisations_mensuelles": _r2(mois["total"]),
        "taux_cotisations_effectif": mois["total"] / brut_mensuel if brut_mensuel > 0 else 0,
        "lignes": mois["lignes"],
        "reduction_heures_sup": _r2(mois["reduction_heures_sup"]),
        "taux_pas_estime": taux_pas_estime,
    }


def brut_to_net_taux_estime(
    *,
    brut_mensuel,
    statut,
    temps_travail_percent=None,
    mois_prime=None,
    primes_annuelle=None,
    heures_sup_mensuelles=None,
    mutuelle_mensuelle=None,
):
    """brut_to_net avec le taux de prélèvement à la source estimé (arrondi au pas du curseur, 0,5 %),
    comme le calculateur quand l'utilisateur ne saisit pas de taux. Sert aux chiffres des pages preset.
    """
    input = {
        "brut_mensuel": brut_mensuel,
        "statut": statut,
        "temps_travail_percent": temps_travail_percent,
        "mois_prime": mois_prime,
        "primes_annuelle": primes_annuelle,
        "heures_sup_mensuelles": heures_sup_mensuelles,
        "mutuelle_mensuelle": mutuelle_mensuelle,
    }
    taux_prelevement_source = round_taux_to_slider_step(brut_to_net(**input)["taux_pas_estime"], 0.5)
    return {**brut_to_net(**input, taux_prelevement_source=taux_prelevement_source), "taux_prelevement_source": taux_prelevement_source}


def net_to_brut(
    *,
    net_mensuel,
    statut,
    temps_travail_percent=None,
    mois_prime=None,
    taux_prelevement_source=None,
    mutuelle_mensuelle=None,
):
    """Brut correspondant à un net mensuel (inverse de brut_to_net, par dichotomie).
    Le net saisi est celui effectivement perçu (après temps partiel).
    """
    target = max(0, net_mensuel)
    temps = min(1, max(0.01, (100 if temps_travail_percent is None else temps_travail_percent) / 100))

    def run(brut_mensuel):
        return brut_to_net(
            brut_mensuel=brut_mensuel,
            statut=statut,
            temps_travail_percent=temps_travail_percent,
            mois_prime=mois_prime,
            taux_prelevement_source=taux_prelevement_source,
            mutuelle_mensuelle=mutuelle_mensuelle,
        )

    lo = 0
    hi = (target * 3) / temps + 100
    for _ in range(60):
        mid = (lo + hi) / 2
        if run(mid)["net_mensuel"] < target:
            lo = mid
        else:
            hi = mid
    return run(js_round(hi * 100) / 100)
