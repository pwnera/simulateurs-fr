/**
 * Cotisations salariales ligne par ligne (bulletin de paie 2026) et nets associés.
 *
 * - Secteur privé (non-cadre, cadre, portage) : vieillesse, Agirc-Arrco, CEG/CET, APEC (cadres),
 *   CSG/CRDS sur 98,25 % du brut (+ prévoyance cadre patronale), réduction de cotisations sur heures sup.
 * - Fonction publique (titulaire) : pension civile 11,10 % du traitement, RAFP 5 % des primes, CSG/CRDS.
 *
 * Net imposable = net à payer + CSG non déductible + CRDS − heures sup exonérées.
 * Montant net social = brut − toutes les cotisations et contributions salariales (y compris mutuelle).
 */
import { PMSS_2026 } from "../constants/plafonds.js";
import {
  COTISATIONS_FONCTION_PUBLIQUE,
  COTISATIONS_SALARIALES_2026 as C,
  PREVOYANCE_CADRE_PATRONALE,
  type StatutSalarie,
} from "../constants/taux-cotisations.js";
import { TAUX_REDUCTION_SALARIALE_HS } from "./heures-sup.js";

export interface CotisationLigne {
  id: string;
  label: string;
  base: number;
  taux: number;
  montant: number;
  /** false pour la CSG non déductible et la CRDS (réintégrées au net imposable). */
  deductible: boolean;
}

export interface CotisationsSalarialesInput {
  /** Brut du mois, heures sup comprises. */
  brut: number;
  statut: Exclude<StatutSalarie, "profession-liberale">;
  /** Plafond mensuel (proratisé pour un temps partiel). Défaut : PMSS 2026. */
  pmss?: number;
  /** Part du brut correspondant à des heures sup ou complémentaires (réduction salariale, exonération IR). */
  heuresSupBrut?: number;
  /** Part salariale de la mutuelle obligatoire (€ / mois). */
  mutuelleSalariale?: number;
  /** Fonction publique : primes et indemnités du mois (soumises à la RAFP, non à la pension civile). */
  primesFonctionPublique?: number;
}

export interface CotisationsSalarialesResult {
  lignes: CotisationLigne[];
  /** Total des cotisations après réduction heures sup, mutuelle comprise. */
  total: number;
  reductionHeuresSup: number;
  netAPayer: number;
  netImposable: number;
  netSocial: number;
  /** Net des heures sup exonéré d'impôt (dans la limite annuelle). */
  heuresSupNetExonere: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function cotisationsSalariales(input: CotisationsSalarialesInput): CotisationsSalarialesResult {
  const brut = Math.max(0, input.brut);
  const pmss = input.pmss ?? PMSS_2026;
  const hs = Math.min(brut, Math.max(0, input.heuresSupBrut ?? 0));
  const lignes: CotisationLigne[] = [];
  const add = (id: string, label: string, base: number, taux: number, deductible = true) => {
    const montant = base * taux;
    if (montant > 0) lignes.push({ id, label, base: r2(base), taux, montant: r2(montant), deductible });
  };

  let assietteCsg = 0;
  let tauxVieillesseHs = 0;

  if (input.statut === "fonction-publique") {
    const primes = Math.min(brut, Math.max(0, input.primesFonctionPublique ?? 0));
    const traitement = brut - primes;
    const fp = COTISATIONS_FONCTION_PUBLIQUE;
    add("pension-civile", "Retraite (pension civile)", traitement, fp.pensionCivile);
    add("rafp", "Retraite additionnelle (RAFP)", Math.min(primes, traitement * fp.plafondPrimesRafp), fp.rafp);
    assietteCsg = brut * C.assietteCsg;
    tauxVieillesseHs = fp.pensionCivile;
  } else {
    const cadre = input.statut === "cadre" || input.statut === "portage";
    const t1 = Math.min(brut, pmss);
    const t2 = Math.max(0, Math.min(brut, 8 * pmss) - pmss);
    add("vieillesse-plafonnee", "Assurance vieillesse plafonnée", t1, C.vieillessePlafonnee);
    add("vieillesse-deplafonnee", "Assurance vieillesse déplafonnée", brut, C.vieillesseDeplafonnee);
    add("agirc-arrco-t1", "Retraite complémentaire Agirc-Arrco T1", t1, C.agircArrcoT1);
    add("agirc-arrco-t2", "Retraite complémentaire Agirc-Arrco T2", t2, C.agircArrcoT2);
    add("ceg-t1", "Contribution d'équilibre général T1", t1, C.cegT1);
    add("ceg-t2", "Contribution d'équilibre général T2", t2, C.cegT2);
    if (brut > pmss) add("cet", "Contribution d'équilibre technique", t1 + t2, C.cet);
    if (cadre) add("apec", "APEC", Math.min(brut, 4 * pmss), C.apec);
    const plafondCsg = 4 * pmss;
    assietteCsg = Math.min(brut, plafondCsg) * C.assietteCsg + Math.max(0, brut - plafondCsg);
    // La prévoyance cadre financée par l'employeur entre dans l'assiette de la CSG/CRDS.
    // La prévoyance patronale cadre entre dans l'assiette CSG/CRDS mais pas dans le net imposable
    // (déductible : CGI art. 83 1° quater, BOI-RSA-BASE-30-10-20) ; seule la part patronale santé y entre.
    // T1 suit le plafond proratisé du temps partiel (ANI du 17/11/2017, art. L242-8 CSS).
    if (cadre) assietteCsg += t1 * PREVOYANCE_CADRE_PATRONALE;
    tauxVieillesseHs = Math.min(
      TAUX_REDUCTION_SALARIALE_HS,
      C.vieillessePlafonnee + C.vieillesseDeplafonnee + C.agircArrcoT1 + C.cegT1
    );
  }

  add("csg-deductible", "CSG déductible", assietteCsg, C.csgDeductible);
  add("csg-non-deductible", "CSG non déductible", assietteCsg, C.csgNonDeductible, false);
  add("crds", "CRDS", assietteCsg, C.crds, false);

  const mutuelle = Math.max(0, input.mutuelleSalariale ?? 0);
  if (mutuelle > 0) lignes.push({ id: "mutuelle", label: "Mutuelle (part salariale)", base: mutuelle, taux: 1, montant: r2(mutuelle), deductible: true });

  const reductionHeuresSup = hs * tauxVieillesseHs;
  const total = lignes.reduce((sum, l) => sum + l.montant, 0) - reductionHeuresSup;
  const netAPayer = brut - total;
  const nonDeductible = lignes.filter((l) => !l.deductible).reduce((sum, l) => sum + l.montant, 0);

  // Heures sup exonérées d'impôt : le net imposable est celui de la rémunération hors heures sup
  // (sur les heures sup, la CSG/CRDS est entièrement non déductible et le reste est exonéré).
  let netImposable = netAPayer + nonDeductible;
  let heuresSupNetExonere = 0;
  if (hs > 0) {
    const horsHs = cotisationsSalariales({ ...input, brut: brut - hs, heuresSupBrut: 0 });
    netImposable = horsHs.netImposable;
    heuresSupNetExonere = netAPayer - horsHs.netAPayer;
  }

  return {
    lignes,
    total: r2(total),
    reductionHeuresSup: r2(reductionHeuresSup),
    netAPayer: r2(netAPayer),
    netImposable: r2(Math.max(0, netImposable)),
    netSocial: r2(netAPayer),
    heuresSupNetExonere: r2(Math.max(0, heuresSupNetExonere)),
  };
}
