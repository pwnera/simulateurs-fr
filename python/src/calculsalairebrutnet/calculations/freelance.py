"""TJM / CA → net selon le statut du freelance (2026).

- Micro-entreprise : cotisations sur le CA (voir auto_entrepreneur.py).
- Portage salarial : frais de gestion puis salaire de cadre (voir portage.py).
- SASU à l'IS : rémunération du président (assimilé salarié : pas de chômage ni de RGDU), impôt sur
  les sociétés (15 % jusqu'à 42 500 €, 25 % au-delà) puis dividendes au PFU de 31,4 % (2026).
- EURL à l'IR (ou EI au réel) : cotisations TNS sur le bénéfice, bénéfice imposé au barème.
- EURL à l'IS : rémunération de gérant (cotisations TNS, abattement de 10 %), IS, dividendes au PFU ;
  la part des dividendes au-delà de 10 % du capital supporte les cotisations TNS.
"""
from .._js import fr_number, js_round, js_str
from .auto_entrepreneur import auto_entrepreneur
from .cotisations_patronales import brut_depuis_cout_employeur, cotisations_patronales
from .cotisations_salariales import cotisations_salariales
from .cotisations_tns import cotisations_tns
from .impot_revenu import abattement_frais_pro, calcul_impot_revenu
from .portage import portage_salarial

# StatutFreelance : "micro" | "portage" | "sasu_is" | "eurl_ir" | "eurl_is".

# Impôt sur les sociétés 2026 : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà.
IS_TAUX_REDUIT = 0.15
IS_TAUX_NORMAL = 0.25
IS_SEUIL_TAUX_REDUIT = 42_500
# Prélèvement forfaitaire unique 2026 : 12,8 % d'impôt + 18,6 % de prélèvements sociaux (LFSS 2026).
PFU_IR = 0.128
PFU_PRELEVEMENTS_SOCIAUX = 0.186
PFU_TOTAL = PFU_IR + PFU_PRELEVEMENTS_SOCIAUX


def _r2(n):
    return js_round(n * 100) / 100


def impot_societes(benefice):
    if benefice <= 0:
        return 0
    return min(benefice, IS_SEUIL_TAUX_REDUIT) * IS_TAUX_REDUIT + max(0, benefice - IS_SEUIL_TAUX_REDUIT) * IS_TAUX_NORMAL


def _impot_bareme(revenu_imposable_annuel, base_taux_perso, taux_perso=None):
    """Impôt annuel au barème sur un revenu imposable, ou au taux personnalisé."""
    impot = calcul_impot_revenu(revenu_imposable=max(0, revenu_imposable_annuel))["impot_net"]
    taux_estime = js_round((impot / base_taux_perso) * 10000) / 100 if base_taux_perso > 0 else 0
    if taux_perso is not None and taux_perso >= 0 and taux_perso <= 45:
        return {"impot": (base_taux_perso * taux_perso) / 100, "taux_estime": taux_estime}
    return {"impot": impot, "taux_estime": taux_estime}


def _get_ca_mensuel(ca_mensuel, tjm, jours_par_mois):
    if ca_mensuel is not None:
        return max(0, ca_mensuel)
    if tjm is not None and tjm > 0:
        return tjm * max(0, 18 if jours_par_mois is None else jours_par_mois)
    return 0


def _remuneration_president(cout_annuel):
    """Rémunération de président de SASU : coût total (annuel) → brut, cotisations, net, net imposable."""
    cout_mensuel = cout_annuel / 12
    options = {"cadre": True, "assurance_chomage": False, "rgdu": False, "effectif11_plus": False, "taux_atmp": 0.009}
    brut = brut_depuis_cout_employeur(cout_mensuel, options)
    pat = cotisations_patronales(**options, brut=brut)
    sal = cotisations_salariales(brut=brut, statut="cadre")
    return {
        "brut": brut * 12,
        "patronales": pat["total"] * 12,
        "salariales": sal["total"] * 12,
        "net": sal["net_a_payer"] * 12,
        "net_imposable": sal["net_imposable"] * 12,
    }


def simuler_freelance(
    *,
    statut,
    ca_mensuel=None,
    tjm=None,
    jours_par_mois=None,
    charges_mensuelles=None,
    activite_micro=None,
    frais_portage_percent=None,
    part_remuneration=None,
    capital_social=None,
    profession_tns=None,
    taux_prelevement_source=None,
):
    """charges_mensuelles : déduites en société ; payées de votre poche en micro.
    activite_micro : défaut prestations BNC. part_remuneration : SASU / EURL à l'IS, 0-100 %.
    capital_social : EURL à l'IS (seuil de 10 % pour les dividendes), défaut 1 000 €.
    taux_prelevement_source : % remplaçant l'estimation au barème.
    """
    ca = _get_ca_mensuel(ca_mensuel, tjm, jours_par_mois)
    charges = max(0, 0 if charges_mensuelles is None else charges_mensuelles)
    taux_perso = taux_prelevement_source
    notes = []
    lignes = [{"label": "Chiffre d'affaires HT", "montant": _r2(ca), "kind": "base"}]

    def finish(cotisations, is_, impot, net_avant_impot, taux_estime, repartition, error=None):
        net_apres = net_avant_impot - impot
        return {
            "statut": statut,
            "ca_mensuel": _r2(ca),
            "charges_mensuelles": _r2(charges),
            "cotisations_mensuelles": _r2(cotisations),
            "impot_societes_mensuel": _r2(is_),
            "impot_mensuel": _r2(impot),
            "net_avant_impot_mensuel": _r2(net_avant_impot),
            "net_apres_impot_mensuel": _r2(net_apres),
            "net_apres_impot_annuel": _r2(net_apres * 12),
            "taux_net_sur_ca": net_apres / ca if ca > 0 else 0,
            "taux_ir_estime": taux_estime,
            "lignes": lignes,
            "repartition": [x for x in repartition if x["value"] > 0],
            "notes": notes,
            "error": error,
        }

    if statut == "micro":
        activite = "services_bnc" if activite_micro is None else activite_micro
        ae = auto_entrepreneur(ca_mensuel=ca, activite=activite, taux_prelevement_source=taux_perso)
        net_avant = ae["net_mensuel"] - charges
        lignes.append({"label": f"− Cotisations sociales et CFP ({fr_number(ae['taux_cotisations'] * 100, 2)} %)", "montant": -ae["cotisations"], "kind": "sub"})
        if charges > 0:
            lignes.append({"label": "− Frais professionnels (non déductibles en micro)", "montant": -charges, "kind": "sub"})
        lignes.append({"label": "Net avant impôt", "montant": _r2(net_avant), "kind": "total"})
        abattement = 71 if activite == "vente" else 50 if activite == "services_bic" else 34
        lignes.append({"label": "− Impôt sur le revenu", "montant": -ae["impot_mensuel"], "kind": "sub", "hint": f"Barème sur le CA après abattement de {abattement} %"})
        if not ae["sous_plafond"]:
            notes.append(f"Au-delà de {fr_number(ae['plafond_annuel'])} € de CA annuel, la micro-entreprise n'est plus possible durablement.")
        if ae["tva"]["statut"] != "franchise":
            notes.append("Votre CA dépasse le seuil de franchise de TVA : vous facturez la TVA en plus de votre TJM (sans impact sur ce net HT).")
        return finish(
            cotisations=ae["cotisations"],
            is_=0,
            impot=ae["impot_mensuel"],
            net_avant_impot=net_avant,
            taux_estime=ae["taux_pas_estime"],
            repartition=[
                {"name": "Frais", "value": charges, "variant": "deduction"},
                {"name": "Cotisations", "value": ae["cotisations"], "variant": "cotisations"},
                {"name": "Impôt", "value": ae["impot_mensuel"], "variant": "impot"},
                {"name": "Net", "value": net_avant - ae["impot_mensuel"], "variant": "amount"},
            ],
        )

    if statut == "portage":
        p0 = portage_salarial(ca_mensuel=ca, frais_portage_percent=frais_portage_percent, frais_professionnels=charges)
        base = p0["net_imposable"] * 12
        b = _impot_bareme(base - abattement_frais_pro(base), base, taux_perso)
        impot_m = b["impot"] / 12
        lignes.append({"label": f"− Frais de gestion ({fr_number(7 if frais_portage_percent is None else frais_portage_percent)} %)", "montant": -p0["frais_gestion"], "kind": "sub"})
        if charges > 0:
            lignes.append({"label": "− Frais professionnels (remboursés sur justificatifs)", "montant": -charges, "kind": "sub"})
        lignes.append({"label": "− Cotisations patronales", "montant": -p0["charges_patronales"], "kind": "sub"})
        lignes.append({"label": "Salaire brut", "montant": p0["brut_mensuel"], "kind": "total"})
        lignes.append({"label": "− Cotisations salariales", "montant": -p0["cotisations_salariales"], "kind": "sub"})
        lignes.append({"label": "Salaire net avant impôt", "montant": p0["net_salaire"], "kind": "total"})
        lignes.append({"label": "− Impôt sur le revenu", "montant": -_r2(impot_m), "kind": "sub"})
        if p0["sous_minimum"]:
            notes.append("Salaire brut sous le minimum du portage (75 % du PASS à temps plein).")
        return finish(
            cotisations=p0["cotisations"] + p0["frais_gestion"],
            is_=0,
            impot=impot_m,
            net_avant_impot=p0["net_salaire"],
            taux_estime=b["taux_estime"],
            repartition=[
                {"name": "Frais", "value": p0["frais_gestion"] + charges, "variant": "deduction"},
                {"name": "Cotisations", "value": p0["cotisations"], "variant": "cotisations"},
                {"name": "Impôt", "value": impot_m, "variant": "impot"},
                {"name": "Net", "value": p0["net_salaire"] - impot_m, "variant": "amount"},
            ],
        )

    # Sociétés : résultat avant rémunération
    resultat_mensuel = ca - charges
    if charges > 0:
        lignes.append({"label": "− Charges professionnelles", "montant": -charges, "kind": "sub"})
    lignes.append({"label": "Résultat avant rémunération", "montant": _r2(resultat_mensuel), "kind": "total"})
    if resultat_mensuel <= 0:
        return finish(
            cotisations=0,
            is_=0,
            impot=0,
            net_avant_impot=0,
            taux_estime=0,
            repartition=[],
            error="Activité déficitaire : les charges dépassent le chiffre d'affaires.",
        )
    resultat_annuel = resultat_mensuel * 12
    part = min(1, max(0, (100 if part_remuneration is None else part_remuneration) / 100))

    if statut == "eurl_ir":
        tns = cotisations_tns(resultat_annuel, "liberal" if profession_tns is None else profession_tns)
        benefice_imposable = resultat_annuel - tns["deductible"]
        b = _impot_bareme(benefice_imposable, benefice_imposable, taux_perso)
        impot = b["impot"]
        net_avant = tns["revenu_net"] / 12
        lignes.append({"label": f"− Cotisations TNS ({fr_number(tns['taux_global'] * 100, 1)} %)", "montant": -_r2(tns["total"] / 12), "kind": "sub", "hint": "Assiette 2026 : résultat − 26 %"})
        lignes.append({"label": "Revenu net avant impôt", "montant": _r2(net_avant), "kind": "total"})
        lignes.append({"label": "− Impôt sur le revenu", "montant": -_r2(impot / 12), "kind": "sub", "hint": "Barème sur le bénéfice (CSG non déductible réintégrée)"})
        return finish(
            cotisations=tns["total"] / 12,
            is_=0,
            impot=impot / 12,
            net_avant_impot=net_avant,
            taux_estime=b["taux_estime"],
            repartition=[
                {"name": "Charges", "value": charges, "variant": "deduction"},
                {"name": "Cotisations TNS", "value": tns["total"] / 12, "variant": "cotisations"},
                {"name": "Impôt", "value": impot / 12, "variant": "impot"},
                {"name": "Net", "value": net_avant - impot / 12, "variant": "amount"},
            ],
        )

    if statut == "sasu_is":
        cout_remu = resultat_annuel * part
        remu = _remuneration_president(cout_remu)
        benefice_avant_is = resultat_annuel - cout_remu
        is_ = impot_societes(benefice_avant_is)
        dividendes = max(0, benefice_avant_is - is_)
        ps = dividendes * PFU_PRELEVEMENTS_SOCIAUX
        ir_dividendes = dividendes * PFU_IR
        base_salaire = remu["net_imposable"]
        b = _impot_bareme(base_salaire - abattement_frais_pro(base_salaire), base_salaire, taux_perso)
        ir_salaire = b["impot"]
        net_avant = (remu["net"] + dividendes - ps) / 12
        impot = (ir_salaire + ir_dividendes) / 12
        if cout_remu > 0:
            lignes.append({"label": "Coût de la rémunération", "montant": _r2(cout_remu / 12), "kind": "base", "hint": f"{js_str(js_round(part * 100))} % du résultat"})
            lignes.append({"label": "− Cotisations patronales (sans chômage)", "montant": -_r2(remu["patronales"] / 12), "kind": "sub"})
            lignes.append({"label": "− Cotisations salariales", "montant": -_r2(remu["salariales"] / 12), "kind": "sub"})
            lignes.append({"label": "Salaire net", "montant": _r2(remu["net"] / 12), "kind": "total"})
        if benefice_avant_is > 0:
            lignes.append({"label": "Bénéfice avant IS", "montant": _r2(benefice_avant_is / 12), "kind": "base"})
            lignes.append({"label": "− Impôt sur les sociétés (15 % / 25 %)", "montant": -_r2(is_ / 12), "kind": "sub"})
            lignes.append({"label": "Dividendes bruts", "montant": _r2(dividendes / 12), "kind": "total"})
            lignes.append({"label": "− Prélèvements sociaux (18,6 %)", "montant": -_r2(ps / 12), "kind": "sub"})
        lignes.append({"label": "Net avant impôt sur le revenu", "montant": _r2(net_avant), "kind": "total"})
        lignes.append({
            "label": "− Impôt sur le revenu",
            "montant": -_r2(impot),
            "kind": "sub",
            "hint": "Barème sur le salaire + 12,8 % sur les dividendes" if dividendes > 0 else "Barème sur le salaire (abattement 10 %)",
        })
        if cout_remu > 0 and remu["brut"] < 0.25 * 48_060:
            notes.append("Un salaire brut inférieur à environ 7 200 € par an ne valide pas 4 trimestres de retraite.")
        if cout_remu == 0:
            notes.append("Sans rémunération, le président ne cotise pas : aucune protection sociale (retraite, maladie) n'est acquise.")
        return finish(
            cotisations=(remu["patronales"] + remu["salariales"] + ps) / 12,
            is_=is_ / 12,
            impot=impot,
            net_avant_impot=net_avant,
            taux_estime=b["taux_estime"],
            repartition=[
                {"name": "Charges", "value": charges, "variant": "deduction"},
                {"name": "Cotisations", "value": (remu["patronales"] + remu["salariales"] + ps) / 12, "variant": "cotisations"},
                {"name": "IS", "value": is_ / 12, "variant": "impot"},
                {"name": "Impôt", "value": impot, "variant": "impot"},
                {"name": "Net", "value": net_avant - impot, "variant": "amount"},
            ],
        )

    # EURL à l'IS
    profession = "liberal" if profession_tns is None else profession_tns
    revenu_avant_cotisations = resultat_annuel * part
    tns = cotisations_tns(revenu_avant_cotisations, profession)
    benefice_avant_is = resultat_annuel - revenu_avant_cotisations
    is_ = impot_societes(benefice_avant_is)
    dividendes = max(0, benefice_avant_is - is_)
    seuil10 = 0.1 * max(0, 1000 if capital_social is None else capital_social)
    div_tns = max(0, dividendes - seuil10)
    div_pfu = dividendes - div_tns
    cot_div = cotisations_tns(revenu_avant_cotisations + div_tns, profession)["total"] - tns["total"] if div_tns > 0 else 0
    ps = div_pfu * PFU_PRELEVEMENTS_SOCIAUX
    ir_dividendes = dividendes * PFU_IR
    remu_imposable = max(0, revenu_avant_cotisations - tns["deductible"])
    b = _impot_bareme(remu_imposable - abattement_frais_pro(remu_imposable), remu_imposable, taux_perso)
    ir_remu = b["impot"]
    net_avant = (tns["revenu_net"] + dividendes - cot_div - ps) / 12
    impot = (ir_remu + ir_dividendes) / 12
    if revenu_avant_cotisations > 0:
        lignes.append({"label": "Rémunération du gérant (avant cotisations)", "montant": _r2(revenu_avant_cotisations / 12), "kind": "base", "hint": f"{js_str(js_round(part * 100))} % du résultat"})
        lignes.append({"label": "− Cotisations TNS", "montant": -_r2(tns["total"] / 12), "kind": "sub"})
        lignes.append({"label": "Rémunération nette", "montant": _r2(tns["revenu_net"] / 12), "kind": "total"})
    if benefice_avant_is > 0:
        lignes.append({"label": "Bénéfice avant IS", "montant": _r2(benefice_avant_is / 12), "kind": "base"})
        lignes.append({"label": "− Impôt sur les sociétés (15 % / 25 %)", "montant": -_r2(is_ / 12), "kind": "sub"})
        lignes.append({"label": "Dividendes bruts", "montant": _r2(dividendes / 12), "kind": "total"})
        if cot_div > 0:
            lignes.append({"label": "− Cotisations TNS sur dividendes (> 10 % du capital)", "montant": -_r2(cot_div / 12), "kind": "sub"})
        if ps > 0:
            lignes.append({"label": "− Prélèvements sociaux (18,6 %)", "montant": -_r2(ps / 12), "kind": "sub"})
    lignes.append({"label": "Net avant impôt sur le revenu", "montant": _r2(net_avant), "kind": "total"})
    lignes.append({
        "label": "− Impôt sur le revenu",
        "montant": -_r2(impot),
        "kind": "sub",
        "hint": "Barème sur la rémunération + 12,8 % sur les dividendes" if dividendes > 0 else "Barème sur la rémunération (abattement 10 %)",
    })
    if div_tns > 0:
        notes.append("En EURL, les dividendes dépassant 10 % du capital social supportent les cotisations TNS : la rémunération est souvent plus avantageuse.")
    return finish(
        cotisations=(tns["total"] + cot_div + ps) / 12,
        is_=is_ / 12,
        impot=impot,
        net_avant_impot=net_avant,
        taux_estime=b["taux_estime"],
        repartition=[
            {"name": "Charges", "value": charges, "variant": "deduction"},
            {"name": "Cotisations", "value": (tns["total"] + cot_div + ps) / 12, "variant": "cotisations"},
            {"name": "IS", "value": is_ / 12, "variant": "impot"},
            {"name": "Impôt", "value": impot, "variant": "impot"},
            {"name": "Net", "value": net_avant - impot, "variant": "amount"},
        ],
    )


def normalize_statut_freelance(statut):
    """Compatibilité : statuts historiques (« sasu » = SASU tout en salaire, « eurl » = EURL à l'IR)."""
    s = ("" if statut is None else statut).lower()
    if s in ("micro", "auto", "auto-entrepreneur"):
        return "micro"
    if s == "portage":
        return "portage"
    if s in ("sasu", "sasu_is"):
        return "sasu_is"
    if s in ("eurl", "eurl_ir"):
        return "eurl_ir"
    if s == "eurl_is":
        return "eurl_is"
    return None
