"""Solde de tout compte : sommes versées à la fin du contrat (estimation).

- Salaire du dernier mois au prorata des jours ouvrés travaillés.
- Indemnité compensatrice de congés payés (art. L3141-28) : plus favorable entre maintien de
  salaire et règle du dixième.
- Indemnité compensatrice de préavis (art. L1234-5) si l'employeur dispense le salarié de préavis.
- Prorata de 13e mois si le contrat ou la convention le prévoit.
- Indemnité de fin de contrat (prime de précarité) en CDD : 10 % de la rémunération brute totale
  (art. L1243-8), sauf exceptions (CDD saisonnier, étudiant, refus de CDI…). Elle entre dans
  l'assiette de l'indemnité compensatrice de congés payés.
- Indemnité de rupture (licenciement, rupture conventionnelle) : saisie par l'utilisateur ; dans la
  limite du montant légal ou conventionnel elle est exonérée de cotisations, CSG-CRDS et impôt.
"""
from .._js import js_round, js_sum
from .conges import indemnite_conges

TAUX_PRIME_PRECARITE = 0.1


def _r2(n):
    return js_round(n * 100) / 100


def solde_tout_compte(
    *,
    salaire_brut_mensuel,
    jours_travailles_dans_le_mois,
    jours_ouvres_mois,
    jours_conges_non_pris,
    decompte_conges=None,
    jours_acquis_periode=None,
    remuneration_reference_conges=None,
    preavis_non_effectue_mois=None,
    mois_pour_treizieme=None,
    remuneration_totale_cdd=None,
    indemnite_rupture=None,
    taux_cotisations=None,
):
    salaire = max(0, salaire_brut_mensuel)
    taux = 0.22 if taux_cotisations is None else taux_cotisations

    def net(b):
        return b * (1 - taux)

    lignes = []

    jo = jours_ouvres_mois if jours_ouvres_mois > 0 else 22
    jt = max(0, min(jo, jours_travailles_dans_le_mois))
    prorata = (salaire * jt) / jo
    lignes.append({"id": "prorata", "label": "Salaire du dernier mois (prorata)", "brut": _r2(prorata), "net": _r2(net(prorata))})

    # CDD : la prime de précarité entre dans l'assiette de l'indemnité de congés (règle du dixième).
    remu_cdd = max(0, 0 if remuneration_totale_cdd is None else remuneration_totale_cdd)
    precarite = remu_cdd * TAUX_PRIME_PRECARITE

    decompte = "ouvres" if decompte_conges is None else decompte_conges
    conges = max(0, jours_conges_non_pris)
    ic = 0
    if conges > 0 and salaire > 0:
        # CDD : sauf saisie contraire, on suppose qu'aucun congé n'a été pris (10 % de la rémunération totale).
        if jours_acquis_periode is None:
            jours_acquis_periode = conges if remu_cdd > 0 else 25 if decompte == "ouvres" else 30
        if remuneration_reference_conges is None:
            remuneration_reference_conges = remu_cdd + precarite if remu_cdd > 0 else None
        ic = indemnite_conges(
            decompte=decompte,
            jours=conges,
            jours_acquis_periode=jours_acquis_periode,
            salaire_brut_mensuel=salaire,
            remuneration_reference=remuneration_reference_conges,
        )["indemnite"]
        lignes.append({"id": "conges", "label": "Indemnité compensatrice de congés payés", "brut": _r2(ic), "net": _r2(net(ic))})

    preavis_mois = max(0, 0 if preavis_non_effectue_mois is None else preavis_non_effectue_mois)
    if preavis_mois > 0:
        p = salaire * preavis_mois
        lignes.append({"id": "preavis", "label": "Indemnité compensatrice de préavis", "brut": _r2(p), "net": _r2(net(p))})

    mois_treizieme = max(0, min(12, 0 if mois_pour_treizieme is None else mois_pour_treizieme))
    if mois_treizieme > 0:
        t = (salaire * mois_treizieme) / 12
        lignes.append({"id": "treizieme", "label": "13e mois au prorata", "brut": _r2(t), "net": _r2(net(t))})

    if precarite > 0:
        lignes.append({"id": "precarite", "label": "Indemnité de fin de CDD (10 %)", "brut": _r2(precarite), "net": _r2(net(precarite))})

    rupture = max(0, 0 if indemnite_rupture is None else indemnite_rupture)
    if rupture > 0:
        lignes.append({"id": "rupture", "label": "Indemnité de rupture", "brut": _r2(rupture), "net": _r2(rupture), "exoneree": True})

    total_brut = js_sum(l["brut"] for l in lignes)
    total_net = js_sum(l["net"] for l in lignes)
    return {
        "lignes": lignes,
        "total_brut": _r2(total_brut),
        "total_net_estime": _r2(total_net),
        "prorata_salaire": _r2(prorata),
        "indemnite_conges": _r2(ic),
        "total_estime": _r2(total_brut),
    }
