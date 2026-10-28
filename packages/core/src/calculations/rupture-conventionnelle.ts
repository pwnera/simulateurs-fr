/**
 * Rupture conventionnelle (CDI) : indemnité spécifique minimale et régime de l'indemnité négociée.
 *
 * - Minimum (art. L1237-13) : indemnité légale de licenciement, ou conventionnelle si plus favorable
 *   (employeurs couverts par l'ANI de 2008). Due sans condition d'ancienneté minimale (prorata).
 * - Régime fiscal (art. 80 duodecies CGI) : exonération d'impôt du plus élevé entre le montant
 *   légal/conventionnel et 2 × la rémunération brute annuelle N-1 ou 50 % de l'indemnité, dans la
 *   limite de 6 PASS.
 * - Cotisations : exonération dans la limite de la part non imposable et de 2 PASS ; CSG/CRDS (9,7 %)
 *   sur la part qui dépasse le montant légal ou conventionnel.
 * - Employeur : contribution spécifique de 40 % sur la part exonérée de cotisations (depuis 2026).
 * - Chômage : différé spécifique = part supra-légale ÷ 111,8 (150 jours max) ; durée maximale
 *   d'indemnisation réduite pour une fin de contrat à partir du 1er septembre 2026 (loi 2026-470).
 */
import { indemniteLicenciement, type LicenciementInput, type LicenciementResult } from "./licenciement.js";
import { PASS_2026, type YearKey } from "../constants/plafonds.js";

export const CONTRIBUTION_PATRONALE_RC = 0.4;
export const DIVISEUR_DIFFERE_SPECIFIQUE = 111.8;
export const DIFFERE_SPECIFIQUE_MAX_JOURS = 150;
export const TAUX_CSG_CRDS_INDEMNITE = 0.097;

export interface RuptureConvInput {
  dernierSalaireMensuelBrut?: number;
  dernierSalaireMensuelNet?: number;
  tauxCotisations?: number;
  moyenne3DerniersMois?: number;
  ancienneteAnnees: number;
  ancienneteMois?: number;
  anneeBarèmes?: YearKey;
  convention?: string;
  categorie?: LicenciementInput["categorie"];
  /** Montant brut négocié (facultatif). */
  indemniteNegociee?: number;
  /** Rémunération brute de l'année civile précédente (défaut : salaire de référence × 12). */
  remunerationAnnuelleN1?: number;
}

export interface IndemniteNegocieeDetail {
  montant: number;
  /** Part au-delà du minimum légal ou conventionnel. */
  supraLegale: number;
  exonereImpot: number;
  imposable: number;
  exonereCotisations: number;
  soumisCotisations: number;
  csgCrds: number;
  cotisationsEstimees: number;
  netEstime: number;
  differeJours: number;
  contributionPatronale: number;
  /** Coût total pour l'employeur (indemnité + contribution spécifique). */
  coutEmployeur: number;
}

export interface RuptureConvResult {
  /** Minimum légal ou conventionnel (le plus favorable). */
  indemniteLegaleMin: number;
  licenciement: LicenciementResult;
  negociee: IndemniteNegocieeDetail | null;
  message: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function regimeIndemniteNegociee(
  montant: number,
  minimum: number,
  remunerationAnnuelle: number,
  tauxCotisations = 0.22
): IndemniteNegocieeDetail {
  const I = Math.max(0, montant);
  const supra = Math.max(0, I - minimum);
  const exonereImpot = Math.min(I, Math.max(minimum, Math.min(6 * PASS_2026, Math.max(2 * remunerationAnnuelle, 0.5 * I))));
  const exonereCotisations = I > 10 * PASS_2026 ? 0 : Math.min(exonereImpot, 2 * PASS_2026);
  const soumisCotisations = I - exonereCotisations;
  // CSG/CRDS : dues sur la part qui dépasse le montant légal ou conventionnel (sans abattement de 1,75 %).
  const csgCrds = supra * TAUX_CSG_CRDS_INDEMNITE;
  // Les cotisations salariales (hors CSG/CRDS) ne portent que sur la part non exonérée.
  const cotisations = soumisCotisations * Math.max(0, tauxCotisations - TAUX_CSG_CRDS_INDEMNITE * 0.9825);
  const differe = Math.min(DIFFERE_SPECIFIQUE_MAX_JOURS, Math.floor(supra / DIVISEUR_DIFFERE_SPECIFIQUE));
  const contribution = exonereCotisations * CONTRIBUTION_PATRONALE_RC;
  return {
    montant: r2(I),
    supraLegale: r2(supra),
    exonereImpot: r2(exonereImpot),
    imposable: r2(I - exonereImpot),
    exonereCotisations: r2(exonereCotisations),
    soumisCotisations: r2(soumisCotisations),
    csgCrds: r2(csgCrds),
    cotisationsEstimees: r2(cotisations),
    netEstime: r2(I - csgCrds - cotisations),
    differeJours: differe,
    contributionPatronale: r2(contribution),
    coutEmployeur: r2(I + contribution),
  };
}

export function indemniteRuptureConventionnelle(input: RuptureConvInput): RuptureConvResult {
  const licenciement = indemniteLicenciement({
    ...input,
    ruptureConventionnelle: true,
  });
  const minimum = licenciement.indemniteEstimee;
  const negociee =
    input.indemniteNegociee != null && input.indemniteNegociee > 0
      ? regimeIndemniteNegociee(
          input.indemniteNegociee,
          minimum,
          input.remunerationAnnuelleN1 ?? licenciement.salaireReference * 12,
          input.tauxCotisations ?? 0.22
        )
      : null;
  return {
    indemniteLegaleMin: minimum,
    licenciement,
    negociee,
    message:
      "L'indemnité de rupture conventionnelle ne peut être inférieure à l'indemnité légale de licenciement (ou conventionnelle si elle est plus favorable). Tout montant au-delà se négocie.",
  };
}
