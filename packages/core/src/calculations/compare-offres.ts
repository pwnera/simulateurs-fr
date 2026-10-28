/**
 * Comparateur d'offres - deux offres en net.
 */
import { brutToNet } from "./salaire.js";

export interface Offre {
  brutMensuel: number;
  statut: "non-cadre" | "cadre";
  primesAnnuelle?: number;
  rttJours?: number;
}

export interface DetailOffre {
  netMensuel: number;
  /** Net annuel des primes (net annuel − 12 × net mensuel). */
  netPrimes: number;
  valeurRtt: number;
}

export interface CompareOffresResult {
  netA: number;
  netB: number;
  ecart: number;
  meilleure: "A" | "B" | "egal";
  detailA: DetailOffre;
  detailB: DetailOffre;
}

/** Jours ouvrés par mois (approximation pour valoriser les RTT). */
const JOURS_OUVRES_MENSUELS = 22;

function detail(r: ReturnType<typeof brutToNet>, valeurRtt: number): DetailOffre {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { netMensuel: r.netMensuel, netPrimes: r2(r.netAnnuel - r.netMensuel * 12), valeurRtt: r2(valeurRtt) };
}

export function compareOffres(offreA: Offre, offreB: Offre): CompareOffresResult {
  // Les primes passent par le moteur de cotisations (plafond annuel de la Sécurité sociale compris).
  const resultA = brutToNet({
    brutMensuel: offreA.brutMensuel,
    statut: offreA.statut,
    primesAnnuelle: offreA.primesAnnuelle ?? 0,
  });
  const resultB = brutToNet({
    brutMensuel: offreB.brutMensuel,
    statut: offreB.statut,
    primesAnnuelle: offreB.primesAnnuelle ?? 0,
  });
  // Les jours de RTT sont valorisés au salaire net journalier (hors primes).
  const netJournalierA = resultA.netMensuel / JOURS_OUVRES_MENSUELS;
  const netJournalierB = resultB.netMensuel / JOURS_OUVRES_MENSUELS;
  const valeurRttA = netJournalierA * (offreA.rttJours ?? 0);
  const valeurRttB = netJournalierB * (offreB.rttJours ?? 0);
  const netA = resultA.netAnnuel + valeurRttA;
  const netB = resultB.netAnnuel + valeurRttB;
  const ecart = netA - netB;
  let meilleure: "A" | "B" | "egal" = "egal";
  if (Math.abs(ecart) >= 0.5) meilleure = ecart > 0 ? "A" : "B";
  return {
    netA: Math.round(netA * 100) / 100,
    netB: Math.round(netB * 100) / 100,
    ecart: Math.round(Math.abs(ecart) * 100) / 100,
    meilleure,
    detailA: detail(resultA, valeurRttA),
    detailB: detail(resultB, valeurRttB),
  };
}
