/**
 * Conventions collectives courantes (liste indicative).
 * Une convention peut prévoir une indemnité de licenciement plus favorable que le minimum légal.
 */
export interface ConventionOption {
  id: string;
  label: string;
}

export const CONVENTIONS_OPTIONS: ConventionOption[] = [
  { id: "aucune", label: "Légale uniquement" },
  { id: "syntec", label: "Syntec (ingénierie, bureaux d'études)" },
  { id: "metallurgie", label: "Métallurgie" },
  { id: "autre", label: "Autre convention" },
];
