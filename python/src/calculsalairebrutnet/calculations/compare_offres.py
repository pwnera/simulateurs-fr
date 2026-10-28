"""Comparateur d'offres - deux offres en net."""
from .._js import js_round
from .salaire import brut_to_net

# Jours ouvrés par mois (approximation pour valoriser les RTT).
_JOURS_OUVRES_MENSUELS = 22


def _detail(r, valeur_rtt):
    def r2(n):
        return js_round(n * 100) / 100

    return {"net_mensuel": r["net_mensuel"], "net_primes": r2(r["net_annuel"] - r["net_mensuel"] * 12), "valeur_rtt": r2(valeur_rtt)}


def compare_offres(offre_a, offre_b):
    # Les primes passent par le moteur de cotisations (plafond annuel de la Sécurité sociale compris).
    result_a = brut_to_net(
        brut_mensuel=offre_a["brut_mensuel"],
        statut=offre_a["statut"],
        primes_annuelle=0 if offre_a.get("primes_annuelle") is None else offre_a["primes_annuelle"],
    )
    result_b = brut_to_net(
        brut_mensuel=offre_b["brut_mensuel"],
        statut=offre_b["statut"],
        primes_annuelle=0 if offre_b.get("primes_annuelle") is None else offre_b["primes_annuelle"],
    )
    # Les jours de RTT sont valorisés au salaire net journalier (hors primes).
    net_journalier_a = result_a["net_mensuel"] / _JOURS_OUVRES_MENSUELS
    net_journalier_b = result_b["net_mensuel"] / _JOURS_OUVRES_MENSUELS
    valeur_rtt_a = net_journalier_a * (0 if offre_a.get("rtt_jours") is None else offre_a["rtt_jours"])
    valeur_rtt_b = net_journalier_b * (0 if offre_b.get("rtt_jours") is None else offre_b["rtt_jours"])
    net_a = result_a["net_annuel"] + valeur_rtt_a
    net_b = result_b["net_annuel"] + valeur_rtt_b
    ecart = net_a - net_b
    meilleure = "egal"
    if abs(ecart) >= 0.5:
        meilleure = "A" if ecart > 0 else "B"
    return {
        "net_a": js_round(net_a * 100) / 100,
        "net_b": js_round(net_b * 100) / 100,
        "ecart": js_round(abs(ecart) * 100) / 100,
        "meilleure": meilleure,
        "detail_a": _detail(result_a, valeur_rtt_a),
        "detail_b": _detail(result_b, valeur_rtt_b),
    }
