"""Indemnité de licenciement : légale et conventionnelle (estimation).

Légale (art. L1234-9 et R1234-2 du Code du travail) :
- CDI, 8 mois d'ancienneté ininterrompue, hors faute grave ou lourde ;
- 1/4 de mois de salaire par année d'ancienneté jusqu'à 10 ans, 1/3 de mois au-delà ;
- années incomplètes : au prorata des mois complets ; pas de plafond ;
- salaire de référence (R1234-4) : le plus favorable entre la moyenne des 12 derniers mois
  et le tiers des 3 derniers mois (primes annuelles proratisées).

Conventions (le salarié perçoit le montant le plus favorable entre légal et conventionnel) :
- Syntec (avenant 46, depuis le 1er mai 2023) : ETAM = légal ; ingénieurs et cadres à partir de
  2 ans d'ancienneté : 1/3 de mois par année, sans plafond.
- Métallurgie (CCN du 7 février 2022, art. 75, depuis 2024) : groupes A à E = légal ; groupes F à I
  avec au moins 8 ans d'ancienneté : 1/5 de mois par année jusqu'à 7 ans + 3/5 au-delà, plafond 18 mois
  (majorations selon l'âge non intégrées).
"""
import math

from .._js import fr_number, js_round, js_str


def _r2(n):
    return js_round(n * 100) / 100


def _get_brut_from_input(dernier_salaire_mensuel_brut, dernier_salaire_mensuel_net, taux_cotisations):
    if dernier_salaire_mensuel_brut is not None and dernier_salaire_mensuel_brut > 0:
        return dernier_salaire_mensuel_brut
    net = 0 if dernier_salaire_mensuel_net is None else dernier_salaire_mensuel_net
    taux = 0.22 if taux_cotisations is None else taux_cotisations
    if net <= 0:
        return 0
    return net / (1 - taux)


def _format_annees(a):
    ans = math.floor(a)
    mois = js_round((a - ans) * 12)
    parts = []
    if ans > 0:
        parts.append(f"{js_str(ans)} an{'s' if ans > 1 else ''}")
    if mois > 0:
        parts.append(f"{js_str(mois)} mois")
    return " et ".join(parts) or "0 mois"


def mois_indemnite_legale(anciennete):
    """Indemnité légale en mois de salaire pour une ancienneté en années."""
    return min(10, anciennete) / 4 + max(0, anciennete - 10) / 3


def _conventionnelle(convention, categorie, anciennete, salaire):
    if convention == "syntec":
        if categorie == "cadre" and anciennete >= 2:
            m = anciennete / 3
            return {
                "montant": salaire * m,
                "tranches": [{"label": f"Syntec cadres : 1/3 de mois × {_format_annees(anciennete)}", "montant": _r2(salaire * m)}],
                "note": "Syntec (IDCC 1486) : 1/3 de mois par année pour les ingénieurs et cadres dès 2 ans d'ancienneté, sans plafond depuis le 1er mai 2023.",
            }
        return {
            "montant": salaire * mois_indemnite_legale(anciennete),
            "tranches": [],
            "note": (
                "Syntec : avant 2 ans d'ancienneté, l'indemnité des cadres suit le barème légal."
                if categorie == "cadre"
                else "Syntec (ETAM) : l'indemnité conventionnelle est alignée sur l'indemnité légale."
            ),
        }
    if convention == "metallurgie":
        if categorie == "cadre" and anciennete >= 8:
            m = min(18, min(7, anciennete) / 5 + max(0, anciennete - 7) * (3 / 5))
            t1 = (salaire * min(7, anciennete)) / 5
            t2 = salaire * max(0, anciennete - 7) * (3 / 5)
            return {
                "montant": salaire * m,
                "tranches": [
                    {"label": "Métallurgie F à I : 1/5 de mois × 7 premières années", "montant": _r2(t1)},
                    {"label": f"3/5 de mois × {_format_annees(max(0, anciennete - 7))} au-delà", "montant": _r2(t2)},
                ],
                "note": "Métallurgie (IDCC 3248), groupes F à I : plafond de 18 mois. Une majoration selon l'âge (à partir de 50 ans) peut s'ajouter : vérifiez l'article 75 de la convention.",
            }
        return {
            "montant": salaire * mois_indemnite_legale(anciennete),
            "tranches": [],
            "note": (
                "Métallurgie, groupes F à I : le barème conventionnel s'applique à partir de 8 ans d'ancienneté ; avant, l'indemnité légale."
                if categorie == "cadre"
                else "Métallurgie, groupes A à E : l'indemnité conventionnelle est alignée sur l'indemnité légale."
            ),
        }
    return None


def indemnite_licenciement(
    *,
    anciennete_annees,
    dernier_salaire_mensuel_brut=None,
    dernier_salaire_mensuel_net=None,
    taux_cotisations=None,
    moyenne3_derniers_mois=None,
    anciennete_mois=None,
    annee_barèmes=None,
    convention=None,
    categorie=None,
    faute_grave=None,
    rupture_conventionnelle=None,
):
    # annee_barèmes : conservé pour compatibilité des URL ; l'indemnité légale ne dépend pas du plafond de la Sécurité sociale.
    dernier = _get_brut_from_input(dernier_salaire_mensuel_brut, dernier_salaire_mensuel_net, taux_cotisations)
    salaire_reference = max(dernier, 0 if moyenne3_derniers_mois is None else moyenne3_derniers_mois)
    mois_total = max(0, math.floor(anciennete_annees * 12 + (0 if anciennete_mois is None else anciennete_mois)))
    anciennete = mois_total / 12
    notes = []

    def empty(detail, eligible=False):
        return {
            "indemnite_estimee": 0,
            "indemnite_legale": 0,
            "indemnite_conventionnelle": None,
            "base": "legale",
            "salaire_reference": _r2(salaire_reference),
            "anciennete": anciennete,
            "eligible": eligible,
            "tranches": [],
            "mois_de_salaire": 0,
            "detail": detail,
            "notes": notes,
        }

    if salaire_reference <= 0:
        return empty("Saisissez un salaire pour estimer l'indemnité.")
    if faute_grave and not rupture_conventionnelle:
        return empty("Pas d'indemnité de licenciement en cas de faute grave ou lourde.")
    if not rupture_conventionnelle and mois_total < 8:
        return empty("Il faut au moins 8 mois d'ancienneté ininterrompue pour avoir droit à l'indemnité légale de licenciement.")
    if mois_total <= 0:
        return empty("Ancienneté nulle : pas d'indemnité minimale.", True)

    premieres = min(10, anciennete)
    au_dela = max(0, anciennete - 10)
    tranches = [{"label": f"1/4 de mois × {_format_annees(premieres)}", "montant": _r2((salaire_reference * premieres) / 4)}]
    if au_dela > 0:
        tranches.append({"label": f"1/3 de mois × {_format_annees(au_dela)} au-delà de 10 ans", "montant": _r2((salaire_reference * au_dela) / 3)})
    legale = salaire_reference * mois_indemnite_legale(anciennete)

    categorie = "non-cadre" if categorie is None else categorie
    conv = _conventionnelle(convention, categorie, anciennete, salaire_reference)
    if conv is not None and conv.get("note"):
        notes.append(conv["note"])
    if convention == "autre":
        notes.append("Votre convention collective peut prévoir une indemnité plus favorable : comparez avec son barème (article « indemnité de licenciement »).")
    conv_montant = conv["montant"] if conv is not None else None
    retenue = max(legale, 0 if conv_montant is None else conv_montant)
    base = "conventionnelle" if conv_montant is not None and conv_montant > legale + 0.005 else "legale"

    return {
        "indemnite_estimee": _r2(retenue),
        "indemnite_legale": _r2(legale),
        "indemnite_conventionnelle": _r2(conv_montant) if conv_montant is not None else None,
        "base": base,
        "salaire_reference": _r2(salaire_reference),
        "anciennete": anciennete,
        "eligible": True,
        "tranches": conv["tranches"] if base == "conventionnelle" and conv else tranches,
        "mois_de_salaire": js_round((retenue / salaire_reference) * 100) / 100,
        "detail": f"Basé sur {_format_annees(anciennete)} d'ancienneté et un salaire de référence de {fr_number(js_round(salaire_reference))} € brut.",
        "notes": notes,
    }
