/**
 * Préavis : durée selon le type de rupture et l'ancienneté (Code du travail).
 *
 * - Licenciement (art. L1234-1) : < 6 mois → pas de minimum légal (convention / usage) ;
 *   6 mois à < 2 ans → 1 mois ; ≥ 2 ans → 2 mois. Pas de préavis en cas de faute grave ou lourde.
 *   Travailleur handicapé (art. L5213-9) : durée doublée, dans la limite de 3 mois.
 * - Démission : aucune durée légale ; elle est fixée par la convention collective, un accord,
 *   le contrat ou les usages (souvent 1 mois non-cadre, 3 mois cadre).
 * - Départ ou mise à la retraite (art. L1237-6 et L1237-10) : mêmes durées que le licenciement.
 * - Rupture de la période d'essai (art. L1221-25 et L1221-26) : délai de prévenance.
 *
 * Quand une convention ou le contrat prévoit une durée plus longue (licenciement, retraite), c'est
 * la durée la plus favorable au salarié qui s'applique.
 */

export type PreavisType =
  | "demission"
  | "licenciement"
  | "depart-retraite"
  | "mise-retraite"
  | "essai-employeur"
  | "essai-salarie";

export interface PreavisInput {
  type: PreavisType;
  ancienneteAnnees: number;
  ancienneteMois?: number;
  cadre?: boolean;
  /** Licenciement pour faute grave ou lourde : pas de préavis. */
  fauteGrave?: boolean;
  /** Bénéficiaire de l'obligation d'emploi (travailleur handicapé). */
  travailleurHandicape?: boolean;
  /** Durée conventionnelle ou contractuelle connue, en mois (prioritaire si plus favorable). */
  dureeConventionnelleMois?: number;
  /** Présence dans l'entreprise en jours calendaires (rupture de période d'essai). */
  presenceJours?: number;
  /** Date de notification (point de départ du préavis), format AAAA-MM-JJ. */
  dateNotification?: string;
}

export type PreavisUnite = "mois" | "semaines" | "jours" | "heures";

export interface PreavisResult {
  /** Durée retenue dans son unité naturelle (ex. 2 mois, 2 semaines, 48 heures). */
  duree: number;
  unite: PreavisUnite;
  /** Équivalent approximatif en jours calendaires (pour comparaison). */
  dureeJours: number;
  /** Équivalent approximatif en mois. */
  dureeMois: number;
  /** Durée légale minimale (même unité) ; null quand la loi ne fixe pas de durée. */
  dureeLegale: number | null;
  /** Origine de la durée retenue. */
  origine: "legale" | "conventionnelle" | "usage" | "aucune";
  /** Date de fin estimée (AAAA-MM-JJ) si une date de notification est fournie. */
  dateFin?: string;
  /** Explication principale. */
  message: string;
  /** Remarques complémentaires. */
  notes: string[];
}

const JOURS_PAR_MOIS = 30;

function addToDate(iso: string, duree: number, unite: PreavisUnite): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return undefined;
  if (unite === "mois") {
    const whole = Math.floor(duree);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + whole);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    // Le préavis expire la veille du même quantième (ex. 15 mars + 1 mois → 14 avril inclus) ;
    // si ce quantième n'existe pas (31 janvier → février), il expire le dernier jour du mois.
    const clamped = day > lastDay;
    d.setUTCDate(Math.min(day, lastDay));
    const rest = duree - whole;
    if (rest > 0) d.setUTCDate(d.getUTCDate() + Math.round(rest * JOURS_PAR_MOIS));
    if (!clamped || rest > 0) d.setUTCDate(d.getUTCDate() - 1);
  } else if (unite === "semaines") {
    d.setUTCDate(d.getUTCDate() + duree * 7 - 1);
  } else if (unite === "jours") {
    d.setUTCDate(d.getUTCDate() + duree - 1);
  } else {
    d.setUTCHours(d.getUTCHours() + duree);
  }
  return d.toISOString().slice(0, 10);
}

/** Durée légale de préavis de licenciement / retraite, en mois (null si < 6 mois). */
export function preavisLegalLicenciementMois(ancienneteTotaleMois: number): number | null {
  if (ancienneteTotaleMois < 6) return null;
  if (ancienneteTotaleMois < 24) return 1;
  return 2;
}

function toResult(
  duree: number,
  unite: PreavisUnite,
  rest: Omit<PreavisResult, "duree" | "unite" | "dureeJours" | "dureeMois">,
  dateNotification?: string
): PreavisResult {
  const jours =
    unite === "mois" ? duree * JOURS_PAR_MOIS : unite === "semaines" ? duree * 7 : unite === "jours" ? duree : duree / 24;
  return {
    duree,
    unite,
    dureeJours: Math.round(jours * 10) / 10,
    dureeMois: Math.round((jours / JOURS_PAR_MOIS) * 10) / 10,
    ...rest,
    ...(dateNotification && duree > 0 ? { dateFin: addToDate(dateNotification, duree, unite) } : {}),
  };
}

export function preavis(input: PreavisInput): PreavisResult {
  const ancienneteMois = Math.max(0, Math.floor(input.ancienneteAnnees * 12 + (input.ancienneteMois ?? 0)));
  const conv = input.dureeConventionnelleMois != null && input.dureeConventionnelleMois > 0 ? input.dureeConventionnelleMois : null;
  const notes: string[] = [];
  const date = input.dateNotification;

  if (input.type === "essai-employeur" || input.type === "essai-salarie") {
    const presence = Math.max(0, input.presenceJours ?? ancienneteMois * JOURS_PAR_MOIS);
    if (input.type === "essai-salarie") {
      const h = presence < 8 ? 24 : 48;
      return toResult(h, "heures", {
        dureeLegale: h,
        origine: "legale",
        message: `Délai de prévenance de ${h} heures pour le salarié (${presence < 8 ? "moins de 8 jours" : "8 jours ou plus"} de présence).`,
        notes: ["Le délai de prévenance ne peut pas prolonger la période d'essai au-delà de sa durée maximale."],
      }, date);
    }
    if (presence < 8) {
      return toResult(24, "heures", { dureeLegale: 24, origine: "legale", message: "Délai de prévenance de 24 heures (moins de 8 jours de présence).", notes }, date);
    }
    if (presence < 30) {
      return toResult(48, "heures", { dureeLegale: 48, origine: "legale", message: "Délai de prévenance de 48 heures (entre 8 jours et 1 mois de présence).", notes }, date);
    }
    if (presence < 90) {
      return toResult(2, "semaines", { dureeLegale: 2, origine: "legale", message: "Délai de prévenance de 2 semaines (entre 1 et 3 mois de présence).", notes }, date);
    }
    return toResult(1, "mois", {
      dureeLegale: 1,
      origine: "legale",
      message: "Délai de prévenance de 1 mois (plus de 3 mois de présence).",
      notes: ["Si l'employeur ne respecte pas ce délai, il doit verser une indemnité compensatrice (sauf faute grave)."],
    }, date);
  }

  if (input.type === "demission") {
    if (conv != null) {
      return toResult(conv, "mois", {
        dureeLegale: null,
        origine: "conventionnelle",
        message: `Préavis de démission de ${formatMois(conv)} selon votre convention collective ou votre contrat.`,
        notes: ["Votre employeur peut vous dispenser d'effectuer tout ou partie du préavis (il reste alors payé s'il en prend l'initiative)."],
      }, date);
    }
    const usage = input.cadre ? 3 : 1;
    return toResult(usage, "mois", {
      dureeLegale: null,
      origine: "usage",
      message: `Le Code du travail ne fixe pas de durée de préavis de démission. La durée la plus courante est de ${formatMois(usage)} pour un ${input.cadre ? "cadre" : "non-cadre"}, mais c'est votre convention collective ou votre contrat qui fait foi.`,
      notes: [
        "Certaines conventions prévoient 2 mois pour les agents de maîtrise et techniciens.",
        "Votre employeur peut vous dispenser d'effectuer tout ou partie du préavis.",
      ],
    }, date);
  }

  // Licenciement, départ ou mise à la retraite
  if (input.type === "licenciement" && input.fauteGrave) {
    return toResult(0, "mois", {
      dureeLegale: 0,
      origine: "aucune",
      message: "Pas de préavis (ni d'indemnité compensatrice) en cas de licenciement pour faute grave ou lourde.",
      notes,
    });
  }

  const legal = preavisLegalLicenciementMois(ancienneteMois);
  let duree = legal ?? 0;
  let origine: PreavisResult["origine"] = legal != null ? "legale" : "aucune";
  if (conv != null && conv > duree) {
    duree = conv;
    origine = "conventionnelle";
  }
  if (input.travailleurHandicape && duree > 0 && duree < 3) {
    const doublee = Math.min(3, duree * 2);
    notes.push(`Travailleur handicapé : durée doublée (${formatMois(duree)} → ${formatMois(doublee)}), dans la limite de 3 mois.`);
    duree = doublee;
  }
  if (input.cadre && origine === "legale" && input.type === "licenciement") {
    notes.push("Pour les cadres, la plupart des conventions collectives prévoient 3 mois : vérifiez la vôtre.");
  }
  if (input.type === "depart-retraite") {
    notes.push("Départ volontaire à la retraite : mêmes durées que pour un licenciement (art. L1237-10).");
  }
  if (input.type === "mise-retraite") {
    notes.push("Mise à la retraite par l'employeur : mêmes durées que pour un licenciement (art. L1237-6).");
  }

  const label = input.type === "licenciement" ? "licenciement" : "retraite";
  let message: string;
  if (legal == null && origine === "aucune") {
    message = `Moins de 6 mois d'ancienneté : la loi ne fixe pas de durée minimale de préavis de ${label}. Appliquez la durée prévue par votre convention collective ou les usages.`;
  } else if (origine === "conventionnelle") {
    message = `Préavis de ${formatMois(duree)} : votre convention ou votre contrat est plus favorable que la loi${legal != null ? ` (${formatMois(legal)})` : ""}.`;
  } else {
    message = `Préavis légal de ${formatMois(duree)} (${ancienneteMois < 24 ? "entre 6 mois et 2 ans" : "2 ans ou plus"} d'ancienneté).`;
  }
  return toResult(duree, "mois", { dureeLegale: legal, origine, message, notes }, date);
}

function formatMois(m: number): string {
  if (Number.isInteger(m)) return `${m} mois`;
  return `${m.toLocaleString("fr-FR")} mois`;
}
