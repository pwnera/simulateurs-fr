/**
 * Seuils et plafonds de la micro-entreprise 2026 : plafonds de CA, franchise de TVA, versement
 * libératoire et validation des trimestres de retraite. Position d'un CA donné par rapport à ces seuils.
 */
import {
  CA_4_TRIMESTRES_2026,
  FRANCHISE_TVA_2026,
  PLAFONDS_CA_MICRO,
  VLF_PLAFOND_RFR_PAR_PART,
  type ActiviteMicro,
} from "../constants/micro-entreprise.js";

export interface SeuilsMicroResult {
  plafondCAVente: number;
  plafondCAServices: number;
  plafondCALiberale: number;
  seuilTVA: number;
  seuilTVAMajore: number;
  seuilTVAVente: number;
  seuilTVAVenteMajore: number;
  vlfPlafondRfrParPart: number;
  message: string;
}

export function seuilsPlafondsMicro(): SeuilsMicroResult {
  return {
    plafondCAVente: PLAFONDS_CA_MICRO.vente,
    plafondCAServices: PLAFONDS_CA_MICRO.services_bic,
    plafondCALiberale: PLAFONDS_CA_MICRO.services_bnc,
    seuilTVA: FRANCHISE_TVA_2026.services.seuil,
    seuilTVAMajore: FRANCHISE_TVA_2026.services.majore,
    seuilTVAVente: FRANCHISE_TVA_2026.vente.seuil,
    seuilTVAVenteMajore: FRANCHISE_TVA_2026.vente.majore,
    vlfPlafondRfrParPart: VLF_PLAFOND_RFR_PAR_PART,
    message:
      "Plafonds de CA valables de 2026 à 2028. Le régime micro est perdu après deux années consécutives de dépassement. La franchise de TVA est perdue dès le dépassement du seuil majoré.",
  };
}

export type ActiviteSeuils = ActiviteMicro | "mixte";

export interface PositionSeuilsInput {
  activite: ActiviteSeuils;
  /** CA annuel encaissé (HT). Pour une activité mixte : CA total. */
  caAnnuel: number;
  /** Activité mixte : part de prestations de services dans le CA. */
  caServicesMixte?: number;
  /** Plafond micro déjà dépassé l'année précédente ? */
  depassementAnneePrecedente?: boolean;
}

export interface JaugeSeuil {
  id: "plafond-micro" | "tva" | "retraite";
  label: string;
  seuil: number;
  seuilMajore?: number;
  valeur: number;
  ratio: number;
  statut: "ok" | "attention" | "depasse";
  explication: string;
}

export interface PositionSeuilsResult {
  jauges: JaugeSeuil[];
  /** Marge avant le premier seuil franchi (TVA ou plafond micro). */
  margeAvantTVA: number;
  margeAvantPlafond: number;
}

export function positionSeuils(input: PositionSeuilsInput): PositionSeuilsResult {
  const ca = Math.max(0, input.caAnnuel);
  const mixte = input.activite === "mixte";
  const services = mixte ? Math.min(ca, Math.max(0, input.caServicesMixte ?? 0)) : input.activite === "vente" ? 0 : ca;
  const plafond = mixte ? PLAFONDS_CA_MICRO.vente : PLAFONDS_CA_MICRO[input.activite as ActiviteMicro];
  const jauges: JaugeSeuil[] = [];

  // Plafond micro (mixte : 203 100 € au total dont 83 600 € de services)
  const depassePlafond = ca > plafond || (mixte && services > PLAFONDS_CA_MICRO.services_bic);
  jauges.push({
    id: "plafond-micro",
    label: "Plafond de la micro-entreprise",
    seuil: plafond,
    valeur: ca,
    ratio: plafond > 0 ? ca / plafond : 0,
    statut: depassePlafond ? "depasse" : ca > plafond * 0.85 ? "attention" : "ok",
    explication: depassePlafond
      ? input.depassementAnneePrecedente
        ? "Deuxième année de dépassement : vous passez au régime réel au 1er janvier de l'année suivante."
        : "Premier dépassement : vous restez en micro cette année ; un second dépassement l'année prochaine entraînera le passage au réel."
      : `Il vous reste ${Math.round(plafond - ca).toLocaleString("fr-FR")} € avant le plafond.`,
  });

  // Franchise de TVA
  const tvaVente = FRANCHISE_TVA_2026.vente;
  const tvaServices = FRANCHISE_TVA_2026.services;
  const tva = input.activite === "vente" || (mixte && services === 0) ? tvaVente : tvaServices;
  // Activité mixte : la franchise est perdue si le CA global dépasse le seuil vente ou si les services dépassent leur seuil.
  const depasseMajore = mixte ? ca > tvaVente.majore || services > tvaServices.majore : ca > tva.majore;
  const depasseSeuil = mixte ? ca > tvaVente.seuil || services > tvaServices.seuil : ca > tva.seuil;
  jauges.push({
    id: "tva",
    label: "Franchise en base de TVA",
    seuil: mixte ? tvaServices.seuil : tva.seuil,
    seuilMajore: mixte ? tvaServices.majore : tva.majore,
    valeur: mixte ? services : ca,
    ratio: tva.seuil > 0 ? (mixte ? Math.max(ca / tvaVente.seuil, services / tvaServices.seuil) : ca / tva.seuil) : 0,
    statut: depasseMajore ? "depasse" : depasseSeuil ? "attention" : "ok",
    explication: depasseMajore
      ? "Seuil majoré dépassé : vous devez facturer la TVA dès le jour du dépassement."
      : depasseSeuil
        ? "Seuil dépassé mais sous le seuil majoré : la franchise s'arrête au 1er janvier de l'année suivante."
        : "Vous facturez sans TVA (mention « TVA non applicable, art. 293 B du CGI »).",
  });

  // Retraite
  const activiteRetraite: ActiviteMicro = mixte ? "vente" : (input.activite as ActiviteMicro);
  const ca4 = CA_4_TRIMESTRES_2026[activiteRetraite];
  jauges.push({
    id: "retraite",
    label: "Validation de 4 trimestres de retraite",
    seuil: ca4,
    valeur: ca,
    ratio: ca4 > 0 ? ca / ca4 : 0,
    statut: ca >= ca4 ? "ok" : "attention",
    explication:
      ca >= ca4
        ? "Votre CA valide 4 trimestres de retraite de base."
        : `${Math.min(4, Math.floor((ca / ca4) * 4))} trimestre(s) validé(s) ; il faut ${ca4.toLocaleString("fr-FR")} € de CA pour en valider 4.`,
  });

  return {
    jauges,
    margeAvantTVA: Math.max(0, (mixte ? tvaVente.seuil : tva.seuil) - ca),
    margeAvantPlafond: Math.max(0, plafond - ca),
  };
}
