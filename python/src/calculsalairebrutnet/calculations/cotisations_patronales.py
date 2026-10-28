"""Cotisations patronales ligne par ligne et coût employeur (2026)."""
from .._js import js_round, js_sum
from ..constants.cotisations_patronales import COTISATIONS_PATRONALES_2026 as _P, RGDU_2026
from ..constants.plafonds import PMSS_2026


def _r2(n):
    return js_round(n * 100) / 100


def coefficient_rgdu(remuneration_annuelle, effectif50_plus=False, temps_travail=1):
    """Coefficient de la réduction générale dégressive unique pour une rémunération annuelle brute.
    Le SMIC de référence est proratisé selon la durée contractuelle (temps partiel)."""
    smic = RGDU_2026["smic_annuel"] * temps_travail
    if remuneration_annuelle <= 0 or remuneration_annuelle >= 3 * smic:
        return 0
    tdelta = RGDU_2026["tdelta50_plus"] if effectif50_plus else RGDU_2026["tdelta_moins50"]
    x = max(0, 0.5 * ((3 * smic) / remuneration_annuelle - 1))
    c = RGDU_2026["tmin"] + tdelta * min(1, x) ** RGDU_2026["puissance"]
    return js_round(min(RGDU_2026["tmin"] + tdelta, c) * 10000) / 10000


def cotisations_patronales(
    *,
    brut,
    cadre=None,
    effectif50_plus=None,
    effectif11_plus=None,
    taux_atmp=None,
    assurance_chomage=None,
    rgdu=None,
    pmss=None,
    temps_travail=None,
):
    brut = max(0, brut)
    temps = min(1, max(0.01, 1 if temps_travail is None else temps_travail))
    pmss = PMSS_2026 * temps if pmss is None else pmss
    chomage = assurance_chomage is not False
    t1 = min(brut, pmss)
    t2 = max(0, min(brut, 8 * pmss) - pmss)
    plafond4 = min(brut, 4 * pmss)
    lignes = []

    def add(id, label, montant):
        if montant > 0:
            lignes.append({"id": id, "label": label, "montant": _r2(montant)})

    add("maladie", "Maladie, maternité, invalidité", brut * _P["maladie"])
    add("vieillesse", "Assurance vieillesse", t1 * _P["vieillesse_plafonnee"] + brut * _P["vieillesse_deplafonnee"])
    add("famille", "Allocations familiales", brut * _P["allocations_familiales"])
    add("atmp", "Accidents du travail", brut * (_P["atmp_moyen"] if taux_atmp is None else taux_atmp))
    add("csa", "Contribution solidarité autonomie", brut * _P["csa"])
    add("fnal", "FNAL", brut * _P["fnal50_plus"] if effectif50_plus else t1 * _P["fnal_moins50"])
    if chomage:
        add("chomage", "Assurance chômage", plafond4 * _P["chomage"])
        add("ags", "AGS (garantie des salaires)", plafond4 * _P["ags"])
    add("retraite-complementaire", "Retraite complémentaire Agirc-Arrco", t1 * _P["agirc_arrco_t1"] + t2 * _P["agirc_arrco_t2"])
    add("ceg-cet", "CEG / CET", t1 * _P["ceg_t1"] + t2 * _P["ceg_t2"] + ((t1 + t2) * _P["cet"] if brut > pmss else 0))
    if cadre:
        add("apec", "APEC", plafond4 * _P["apec"])
        add("prevoyance", "Prévoyance cadre (minimum)", t1 * _P["prevoyance_cadre"])
        if effectif11_plus is not False:
            add("forfait-social", "Forfait social sur la prévoyance (8 %)", t1 * _P["prevoyance_cadre"] * _P["forfait_social_prevoyance"])
    add("dialogue-social", "Dialogue social", brut * _P["dialogue_social"])
    add("formation", "Formation professionnelle", brut * (_P["formation_moins11"] if effectif11_plus is False else _P["formation11_plus"]))
    add("apprentissage", "Taxe d'apprentissage", brut * _P["taxe_apprentissage"])

    total_avant = js_sum(l["montant"] for l in lignes)
    appliquer_rgdu = chomage if rgdu is None else rgdu
    reduction = brut * coefficient_rgdu(brut * 12, bool(effectif50_plus), temps) if appliquer_rgdu else 0
    total = max(0, total_avant - reduction)
    return {
        "lignes": lignes,
        "total_avant_reduction": _r2(total_avant),
        "reduction_generale": _r2(reduction),
        "total": _r2(total),
        "cout_employeur": _r2(brut + total),
        "taux_effectif": total / brut if brut > 0 else 0,
    }


def brut_depuis_cout_employeur(cout, options=None):
    """Brut correspondant à un coût employeur (enveloppe) donné, par dichotomie."""
    options = {} if options is None else options
    lo = 0
    hi = max(0, cout)
    for _ in range(60):
        mid = (lo + hi) / 2
        if cotisations_patronales(**{**options, "brut": mid})["cout_employeur"] < cout:
            lo = mid
        else:
            hi = mid
    return _r2(lo)
