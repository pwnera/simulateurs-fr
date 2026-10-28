"""Rupture conventionnelle (CDI) : indemnité spécifique minimale et régime de l'indemnité négociée.

- Minimum (art. L1237-13) : indemnité légale de licenciement, ou conventionnelle si plus favorable
  (employeurs couverts par l'ANI de 2008). Due sans condition d'ancienneté minimale (prorata).
- Régime fiscal (art. 80 duodecies CGI) : exonération d'impôt du plus élevé entre le montant
  légal/conventionnel et 2 × la rémunération brute annuelle N-1 ou 50 % de l'indemnité, dans la
  limite de 6 PASS.
- Cotisations : exonération dans la limite de la part non imposable et de 2 PASS ; CSG/CRDS (9,7 %)
  sur la part qui dépasse le montant légal ou conventionnel.
- Employeur : contribution spécifique de 40 % sur la part exonérée de cotisations (depuis 2026).
- Chômage : différé spécifique = part supra-légale ÷ 111,8 (150 jours max) ; durée maximale
  d'indemnisation réduite pour une fin de contrat à partir du 1er septembre 2026 (loi 2026-470).
"""
import math

from .._js import js_round
from ..constants.plafonds import PASS_2026
from .licenciement import indemnite_licenciement

CONTRIBUTION_PATRONALE_RC = 0.4
DIVISEUR_DIFFERE_SPECIFIQUE = 111.8
DIFFERE_SPECIFIQUE_MAX_JOURS = 150
TAUX_CSG_CRDS_INDEMNITE = 0.097


def _r2(n):
    return js_round(n * 100) / 100


def regime_indemnite_negociee(montant, minimum, remuneration_annuelle, taux_cotisations=0.22):
    I = max(0, montant)
    supra = max(0, I - minimum)
    exonere_impot = min(I, max(minimum, min(6 * PASS_2026, max(2 * remuneration_annuelle, 0.5 * I))))
    exonere_cotisations = 0 if I > 10 * PASS_2026 else min(exonere_impot, 2 * PASS_2026)
    soumis_cotisations = I - exonere_cotisations
    # CSG/CRDS : dues sur la part qui dépasse le montant légal ou conventionnel (sans abattement de 1,75 %).
    csg_crds = supra * TAUX_CSG_CRDS_INDEMNITE
    # Les cotisations salariales (hors CSG/CRDS) ne portent que sur la part non exonérée.
    cotisations = soumis_cotisations * max(0, taux_cotisations - TAUX_CSG_CRDS_INDEMNITE * 0.9825)
    differe = min(DIFFERE_SPECIFIQUE_MAX_JOURS, math.floor(supra / DIVISEUR_DIFFERE_SPECIFIQUE))
    contribution = exonere_cotisations * CONTRIBUTION_PATRONALE_RC
    return {
        "montant": _r2(I),
        "supra_legale": _r2(supra),
        "exonere_impot": _r2(exonere_impot),
        "imposable": _r2(I - exonere_impot),
        "exonere_cotisations": _r2(exonere_cotisations),
        "soumis_cotisations": _r2(soumis_cotisations),
        "csg_crds": _r2(csg_crds),
        "cotisations_estimees": _r2(cotisations),
        "net_estime": _r2(I - csg_crds - cotisations),
        "differe_jours": differe,
        "contribution_patronale": _r2(contribution),
        "cout_employeur": _r2(I + contribution),
    }


def indemnite_rupture_conventionnelle(
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
    indemnite_negociee=None,
    remuneration_annuelle_n1=None,
):
    licenciement = indemnite_licenciement(
        anciennete_annees=anciennete_annees,
        dernier_salaire_mensuel_brut=dernier_salaire_mensuel_brut,
        dernier_salaire_mensuel_net=dernier_salaire_mensuel_net,
        taux_cotisations=taux_cotisations,
        moyenne3_derniers_mois=moyenne3_derniers_mois,
        anciennete_mois=anciennete_mois,
        annee_barèmes=annee_barèmes,
        convention=convention,
        categorie=categorie,
        rupture_conventionnelle=True,
    )
    minimum = licenciement["indemnite_estimee"]
    negociee = (
        regime_indemnite_negociee(
            indemnite_negociee,
            minimum,
            licenciement["salaire_reference"] * 12 if remuneration_annuelle_n1 is None else remuneration_annuelle_n1,
            0.22 if taux_cotisations is None else taux_cotisations,
        )
        if indemnite_negociee is not None and indemnite_negociee > 0
        else None
    )
    return {
        "indemnite_legale_min": minimum,
        "licenciement": licenciement,
        "negociee": negociee,
        "message": "L'indemnité de rupture conventionnelle ne peut être inférieure à l'indemnité légale de licenciement (ou conventionnelle si elle est plus favorable). Tout montant au-delà se négocie.",
    }
