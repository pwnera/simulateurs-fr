/**
 * Indemnité de licenciement : légale et conventionnelle (estimation).
 *
 * Légale (art. L1234-9 et R1234-2 du Code du travail) :
 * - CDI, 8 mois d'ancienneté ininterrompue, hors faute grave ou lourde ;
 * - 1/4 de mois de salaire par année d'ancienneté jusqu'à 10 ans, 1/3 de mois au-delà ;
 * - années incomplètes : au prorata des mois complets ; pas de plafond ;
 * - salaire de référence (R1234-4) : le plus favorable entre la moyenne des 12 derniers mois
 *   et le tiers des 3 derniers mois (primes annuelles proratisées).
 *
 * Conventions (le salarié perçoit le montant le plus favorable entre légal et conventionnel) :
 * - Syntec (avenant 46, depuis le 1er mai 2023) : ETAM = légal ; ingénieurs et cadres à partir de
 *   2 ans d'ancienneté : 1/3 de mois par année, sans plafond.
 * - Métallurgie (CCN du 7 février 2022, art. 75, depuis 2024) : groupes A à E = légal ; groupes F à I
 *   avec au moins 8 ans d'ancienneté : 1/5 de mois par année jusqu'à 7 ans + 3/5 au-delà, plafond 18 mois
 *   (majorations selon l'âge non intégrées).
 */
import type { YearKey } from "../constants/plafonds.js";

export type ConventionLicenciement = "aucune" | "syntec" | "metallurgie" | "autre";
export type CategorieConvention = "non-cadre" | "cadre";

export interface LicenciementInput {
  dernierSalaireMensuelBrut?: number;
  dernierSalaireMensuelNet?: number;
  tauxCotisations?: number;
  /** Moyenne brute des 3 derniers mois (facultatif, retenue si plus favorable). */
  moyenne3DerniersMois?: number;
  ancienneteAnnees: number;
  ancienneteMois?: number;
  /** Conservé pour compatibilité des URL ; l'indemnité légale ne dépend pas du plafond de la Sécurité sociale. */
  anneeBarèmes?: YearKey;
  convention?: ConventionLicenciement | string;
  /** Syntec : cadre (IC) ou ETAM ; Métallurgie : groupes F à I (cadre) ou A à E. */
  categorie?: CategorieConvention;
  fauteGrave?: boolean;
  /** Rupture conventionnelle : pas de condition de 8 mois d'ancienneté. */
  ruptureConventionnelle?: boolean;
}

export interface TrancheIndemnite {
  label: string;
  montant: number;
}

export interface LicenciementResult {
  /** Montant retenu : le plus favorable entre légal et conventionnel. */
  indemniteEstimee: number;
  indemniteLegale: number;
  /** null si pas de convention modélisée. */
  indemniteConventionnelle: number | null;
  /** Origine du montant retenu. */
  base: "legale" | "conventionnelle";
  salaireReference: number;
  /** Ancienneté retenue en années (mois complets / 12). */
  anciennete: number;
  eligible: boolean;
  tranches: TrancheIndemnite[];
  /** Équivalent en mois de salaire. */
  moisDeSalaire: number;
  detail: string;
  notes: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function getBrutFromInput(input: LicenciementInput): number {
  if (input.dernierSalaireMensuelBrut != null && input.dernierSalaireMensuelBrut > 0) {
    return input.dernierSalaireMensuelBrut;
  }
  const net = input.dernierSalaireMensuelNet ?? 0;
  const taux = input.tauxCotisations ?? 0.22;
  if (net <= 0) return 0;
  return net / (1 - taux);
}

function formatAnnees(a: number): string {
  const ans = Math.floor(a);
  const mois = Math.round((a - ans) * 12);
  const parts = [];
  if (ans > 0) parts.push(`${ans} an${ans > 1 ? "s" : ""}`);
  if (mois > 0) parts.push(`${mois} mois`);
  return parts.join(" et ") || "0 mois";
}

/** Indemnité légale en mois de salaire pour une ancienneté en années. */
export function moisIndemniteLegale(anciennete: number): number {
  return Math.min(10, anciennete) / 4 + Math.max(0, anciennete - 10) / 3;
}

function conventionnelle(
  convention: string | undefined,
  categorie: CategorieConvention,
  anciennete: number,
  salaire: number
): { montant: number; tranches: TrancheIndemnite[]; note?: string } | null {
  if (convention === "syntec") {
    if (categorie === "cadre" && anciennete >= 2) {
      const m = anciennete / 3;
      return {
        montant: salaire * m,
        tranches: [{ label: `Syntec cadres : 1/3 de mois × ${formatAnnees(anciennete)}`, montant: r2(salaire * m) }],
        note: "Syntec (IDCC 1486) : 1/3 de mois par année pour les ingénieurs et cadres dès 2 ans d'ancienneté, sans plafond depuis le 1er mai 2023.",
      };
    }
    return {
      montant: salaire * moisIndemniteLegale(anciennete),
      tranches: [],
      note: categorie === "cadre"
        ? "Syntec : avant 2 ans d'ancienneté, l'indemnité des cadres suit le barème légal."
        : "Syntec (ETAM) : l'indemnité conventionnelle est alignée sur l'indemnité légale.",
    };
  }
  if (convention === "metallurgie") {
    if (categorie === "cadre" && anciennete >= 8) {
      const m = Math.min(18, Math.min(7, anciennete) / 5 + Math.max(0, anciennete - 7) * (3 / 5));
      const t1 = (salaire * Math.min(7, anciennete)) / 5;
      const t2 = salaire * Math.max(0, anciennete - 7) * (3 / 5);
      return {
        montant: salaire * m,
        tranches: [
          { label: "Métallurgie F à I : 1/5 de mois × 7 premières années", montant: r2(t1) },
          { label: `3/5 de mois × ${formatAnnees(Math.max(0, anciennete - 7))} au-delà`, montant: r2(t2) },
        ],
        note: "Métallurgie (IDCC 3248), groupes F à I : plafond de 18 mois. Une majoration selon l'âge (à partir de 50 ans) peut s'ajouter : vérifiez l'article 75 de la convention.",
      };
    }
    return {
      montant: salaire * moisIndemniteLegale(anciennete),
      tranches: [],
      note: categorie === "cadre"
        ? "Métallurgie, groupes F à I : le barème conventionnel s'applique à partir de 8 ans d'ancienneté ; avant, l'indemnité légale."
        : "Métallurgie, groupes A à E : l'indemnité conventionnelle est alignée sur l'indemnité légale.",
    };
  }
  return null;
}

export function indemniteLicenciement(input: LicenciementInput): LicenciementResult {
  const dernier = getBrutFromInput(input);
  const salaireReference = Math.max(dernier, input.moyenne3DerniersMois ?? 0);
  const moisTotal = Math.max(0, Math.floor(input.ancienneteAnnees * 12 + (input.ancienneteMois ?? 0)));
  const anciennete = moisTotal / 12;
  const notes: string[] = [];
  const empty = (detail: string, eligible = false): LicenciementResult => ({
    indemniteEstimee: 0,
    indemniteLegale: 0,
    indemniteConventionnelle: null,
    base: "legale",
    salaireReference: r2(salaireReference),
    anciennete,
    eligible,
    tranches: [],
    moisDeSalaire: 0,
    detail,
    notes,
  });

  if (salaireReference <= 0) return empty("Saisissez un salaire pour estimer l'indemnité.");
  if (input.fauteGrave && !input.ruptureConventionnelle) {
    return empty("Pas d'indemnité de licenciement en cas de faute grave ou lourde.");
  }
  if (!input.ruptureConventionnelle && moisTotal < 8) {
    return empty("Il faut au moins 8 mois d'ancienneté ininterrompue pour avoir droit à l'indemnité légale de licenciement.");
  }
  if (moisTotal <= 0) return empty("Ancienneté nulle : pas d'indemnité minimale.", true);

  const premieres = Math.min(10, anciennete);
  const auDela = Math.max(0, anciennete - 10);
  const tranches: TrancheIndemnite[] = [
    { label: `1/4 de mois × ${formatAnnees(premieres)}`, montant: r2((salaireReference * premieres) / 4) },
  ];
  if (auDela > 0) tranches.push({ label: `1/3 de mois × ${formatAnnees(auDela)} au-delà de 10 ans`, montant: r2((salaireReference * auDela) / 3) });
  const legale = salaireReference * moisIndemniteLegale(anciennete);

  const categorie = input.categorie ?? "non-cadre";
  const conv = conventionnelle(input.convention, categorie, anciennete, salaireReference);
  if (conv?.note) notes.push(conv.note);
  if (input.convention === "autre") {
    notes.push("Votre convention collective peut prévoir une indemnité plus favorable : comparez avec son barème (article « indemnité de licenciement »).");
  }
  const convMontant = conv ? conv.montant : null;
  const retenue = Math.max(legale, convMontant ?? 0);
  const base = convMontant != null && convMontant > legale + 0.005 ? "conventionnelle" : "legale";

  return {
    indemniteEstimee: r2(retenue),
    indemniteLegale: r2(legale),
    indemniteConventionnelle: convMontant != null ? r2(convMontant) : null,
    base,
    salaireReference: r2(salaireReference),
    anciennete,
    eligible: true,
    tranches: base === "conventionnelle" && conv ? conv.tranches : tranches,
    moisDeSalaire: Math.round((retenue / salaireReference) * 100) / 100,
    detail: `Basé sur ${formatAnnees(anciennete)} d'ancienneté et un salaire de référence de ${Math.round(salaireReference).toLocaleString("fr-FR")} € brut.`,
    notes,
  };
}
