"""Assurance chômage (ARE) – paramètres en vigueur en 2026.
Pas de revalorisation au 1er juillet 2026 : les montants du 1er juillet 2025 restent applicables.
Convention d'assurance chômage du 15 novembre 2024 (en vigueur au 1er avril 2025) et loi n° 2026-470
du 11 juin 2026 (rupture conventionnelle).
@see https://www.unedic.org/actualites/allocations-dassurance-chomage-pas-de-revalorisation-au-1er-juillet-2026
"""
from .._js import js_round
from .plafonds import PASS_2026

ARE = {
    # Partie fixe de la formule 40,4 % SJR + partie fixe (€ / jour).
    "partie_fixe": 13.18,
    "taux_formule1": 0.404,
    "taux_formule2": 0.57,
    # Allocation minimale (€ / jour).
    "allocation_minimale": 32.13,
    # Plafond : 75 % du SJR.
    "plafond_sjr": 0.75,
    # Salaires retenus dans la limite de 4 PASS.
    "sjr_max": js_round(((4 * PASS_2026) / 365) * 100) / 100,
    # Dégressivité : × 0,7 à partir du 183e jour, si moins de 55 ans et AJ > seuil ; plancher = seuil.
    "degressivite": {"coefficient": 0.7, "seuil": 92.57, "apres_jours": 182, "age_exempte": 55},
    # Durée : jours d'affiliation × 0,75, minimum 182 jours.
    "coefficient_duree": 0.75,
    "duree_min_jours": 182,
    # Durée maximale selon l'âge à la fin du contrat (jours).
    "duree_max_jours": {"moins-55": 548, "55-56": 685, "57-plus": 822},
    # Rupture conventionnelle (fin de contrat à partir du 1er septembre 2026) : 15 mois / 20,5 mois.
    "duree_max_jours_rupture_conventionnelle": {"moins-55": 456, "55-56": 624, "57-plus": 624},
    # Affiliation minimale : 6 mois (130 jours ou 910 heures) sur la période de référence.
    "affiliation_min_mois": 6,
    # Période de référence : 24 mois (36 mois à partir de 55 ans).
    "periode_reference_mois": {"moins-55": 24, "55-56": 36, "57-plus": 36},
    # Retenue retraite complémentaire : 3 % du SJR (sans descendre sous l'allocation minimale).
    "retenue_retraite": 0.03,
    # CSG 6,2 % + CRDS 0,5 % sur 98,25 % de l'allocation, si l'AJ dépasse le seuil d'exonération.
    "csg_crds": 0.067,
    "assiette_csg": 0.9825,
    "seuil_exoneration_csg": 61,
    # Versement mensuel sur une base de 30 jours depuis avril 2025.
    "jours_par_mois": 30,
}
