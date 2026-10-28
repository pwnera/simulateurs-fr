/**
 * Comparatif des statuts pour un même chiffre d'affaires (ou un même net visé) :
 * salarié, micro-entreprise, portage salarial, SASU, EURL (2026).
 *
 * - Mode « ca » : net après impôt obtenu dans chaque statut pour un CA mensuel HT. Pour le salarié,
 *   le CA est assimilé au coût employeur total (ce que l'entreprise dépense pour vous).
 * - Mode « net » : CA (ou coût employeur) nécessaire pour atteindre un net après impôt visé.
 */
import { simulerFreelance, type StatutFreelance } from "./freelance.js";
import { brutToNet } from "./salaire.js";
import { brutDepuisCoutEmployeur, cotisationsPatronales } from "./cotisations-patronales.js";

export type StatutCompare = "salarie" | "micro" | "portage" | "sasu" | "sasu_dividendes" | "eurl_ir";

export const STATUTS_COMPARES: { id: StatutCompare; label: string }[] = [
  { id: "salarie", label: "Salarié (CDI)" },
  { id: "micro", label: "Micro-entreprise (BNC)" },
  { id: "portage", label: "Portage salarial" },
  { id: "sasu", label: "SASU (salaire)" },
  { id: "sasu_dividendes", label: "SASU (dividendes)" },
  { id: "eurl_ir", label: "EURL / EI au réel" },
];

export interface ComparatifStatutsInput {
  /** Mode « ca » : CA mensuel HT. Mode « net » : net mensuel après impôt visé. */
  revenuMensuelSouhaite: number;
  mode: "net" | "ca";
  /** Charges professionnelles mensuelles (hors salarié). */
  chargesMensuelles?: number;
}

export interface LigneComparatif {
  id: StatutCompare;
  label: string;
  caMensuel: number;
  netAvantImpot: number;
  netApresImpot: number;
  /** Prélèvements totaux (cotisations + impôts) en % du CA. */
  tauxPrelevements: number;
}

export interface ComparatifStatutsResult {
  lignes: LigneComparatif[];
  meilleur: StatutCompare;
  /** Compatibilité avec l'ancienne API. */
  salarie: { brutMensuel: number; netMensuel: number };
  auto: { caMensuel: number; netMensuel: number };
  portage: { caMensuel: number; netMensuel: number };
  sasu: { caMensuel: number; netMensuel: number };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const OPTIONS_SALARIE = { cadre: true, effectif50Plus: false, tauxAtmp: 0.009 };

function netPour(id: StatutCompare, ca: number, charges: number): { avant: number; apres: number } {
  if (id === "salarie") {
    const brut = brutDepuisCoutEmployeur(ca, OPTIONS_SALARIE);
    const sansImpot = brutToNet({ brutMensuel: brut, statut: "cadre" });
    const r = brutToNet({ brutMensuel: brut, statut: "cadre", tauxPrelevementSource: sansImpot.tauxPASEstime });
    return { avant: r.netMensuel, apres: r.netMensuelApresImpots };
  }
  const statut: StatutFreelance =
    id === "micro" ? "micro" : id === "portage" ? "portage" : id === "eurl_ir" ? "eurl_ir" : "sasu_is";
  const r = simulerFreelance({
    caMensuel: ca,
    chargesMensuelles: charges,
    statut,
    activiteMicro: "services_bnc",
    partRemuneration: id === "sasu_dividendes" ? 0 : 100,
  });
  return { avant: r.netAvantImpotMensuel, apres: r.netApresImpotMensuel };
}

function caPourNet(id: StatutCompare, netVise: number, charges: number): number {
  let lo = 0;
  let hi = Math.max(1000, netVise * 4 + charges * 2);
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (netPour(id, mid, charges).apres < netVise) lo = mid;
    else hi = mid;
  }
  return hi;
}

export function comparatifStatuts(input: ComparatifStatutsInput): ComparatifStatutsResult {
  const valeur = Math.max(0, input.revenuMensuelSouhaite);
  const charges = Math.max(0, input.chargesMensuelles ?? 0);
  const lignes: LigneComparatif[] = STATUTS_COMPARES.map(({ id, label }) => {
    const chargesStatut = id === "salarie" ? 0 : charges;
    const ca = input.mode === "ca" ? valeur : caPourNet(id, valeur, chargesStatut);
    const n = netPour(id, ca, chargesStatut);
    return {
      id,
      label,
      caMensuel: r2(ca),
      netAvantImpot: r2(n.avant),
      netApresImpot: r2(n.apres),
      tauxPrelevements: ca > 0 ? Math.max(0, (ca - chargesStatut - n.apres) / ca) : 0,
    };
  });
  const meilleur = (
    input.mode === "ca"
      ? lignes.reduce((a, b) => (b.netApresImpot > a.netApresImpot ? b : a))
      : lignes.reduce((a, b) => (b.caMensuel < a.caMensuel ? b : a))
  ).id;
  const get = (id: StatutCompare) => lignes.find((l) => l.id === id)!;
  const salarie = get("salarie");
  return {
    lignes,
    meilleur,
    salarie: {
      brutMensuel: r2(brutDepuisCoutEmployeur(salarie.caMensuel, OPTIONS_SALARIE)),
      netMensuel: salarie.netAvantImpot,
    },
    auto: { caMensuel: get("micro").caMensuel, netMensuel: get("micro").netAvantImpot },
    portage: { caMensuel: get("portage").caMensuel, netMensuel: get("portage").netAvantImpot },
    sasu: { caMensuel: get("sasu").caMensuel, netMensuel: get("sasu").netAvantImpot },
  };
}

/** Coût employeur → brut (exposé pour l'affichage). */
export function brutSalarieDepuisCout(cout: number): { brut: number; patronales: number } {
  const brut = brutDepuisCoutEmployeur(cout, OPTIONS_SALARIE);
  return { brut, patronales: cotisationsPatronales({ ...OPTIONS_SALARIE, brut }).total };
}
