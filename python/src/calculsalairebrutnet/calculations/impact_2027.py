"""Effet des barèmes 2027 sur un salaire (page /baremes-2027), salarié non-cadre à temps plein :
- net mensuel avec le PMSS 2026 puis 2027, à taux de cotisations inchangés ;
- impôt d'un célibataire sur le même revenu annuel avec le barème 2026 puis le barème 2027 proposé (PLF).
"""
from ..constants.impot_revenu import BAREME_IR_2026, BAREME_IR_2027_PLF
from ..constants.plafonds import PMSS_2026, PMSS_2027
from .cotisations_salariales import cotisations_salariales
from .impot_revenu import abattement_frais_pro, calcul_impot_revenu


def impact2027(brut_mensuel):
    """Résultat : brut_mensuel, net2026, net2027, impot2026 (barème 2026), impot2027 (barème 2027 du PLF)."""

    def mois(pmss):
        return cotisations_salariales(brut=brut_mensuel, statut="non-cadre", pmss=pmss)

    m2026 = mois(PMSS_2026)
    net_imposable_annuel = m2026["net_imposable"] * 12
    revenu_imposable = net_imposable_annuel - abattement_frais_pro(net_imposable_annuel)
    return {
        "brut_mensuel": brut_mensuel,
        "net2026": m2026["net_a_payer"],
        "net2027": mois(PMSS_2027)["net_a_payer"],
        "impot2026": calcul_impot_revenu(revenu_imposable=revenu_imposable, bareme=BAREME_IR_2026)["impot_net"],
        "impot2027": calcul_impot_revenu(revenu_imposable=revenu_imposable, bareme=BAREME_IR_2027_PLF)["impot_net"],
    }
