import {
  allocationChomage,
  autoEntrepreneur,
  brutToNet,
  calculHeuresSup,
  comparatifStatuts,
  compareOffres,
  indemniteConges,
  indemniteLicenciement,
  indemniteRuptureConventionnelle,
  indemnitesKilometriques,
  joursAcquis,
  netToBrut,
  portageSalarial,
  positionSeuils,
  preavis,
  primeActivite,
  retraitePrevoyanceIndependants,
  simulationAPL,
  simulerFreelance,
  sjrDepuisSalaire,
  soldeToutCompte,
  tvaFreelance,
  type AcquisitionInput,
  type APLInput,
  type AREInput,
  type AutoEntrepreneurInput,
  type ComparatifStatutsInput,
  type FreelanceInput,
  type HeuresSupInput,
  type IndemniteCongesInput,
  type IndemnitesKMInput,
  type LicenciementInput,
  type Offre,
  type PortageInput,
  type PositionSeuilsInput,
  type PreavisInput,
  type PrimeActiviteInput,
  type RetraiteIndependantsInput,
  type RuptureConvInput,
  type SalaireInput,
  type SalaireNetInput,
  type SoldeToutCompteInput,
  type TVAFreelanceInput,
} from "@calculsalairebrutnet/core";

export const SITE_URL = "https://www.calculsalairebrutnet.fr";

/** Entrée de chaque outil MCP. Les schémas JSON sont générés depuis ce type (scripts/gen-schemas.mjs). */
export interface ToolInputs {
  salaire_brut_en_net: SalaireInput;
  salaire_net_en_brut: SalaireNetInput;
  indemnite_licenciement: LicenciementInput;
  rupture_conventionnelle: RuptureConvInput;
  allocation_chomage: Omit<AREInput, "salaireJournalierReference"> & {
    /** Salaire brut mensuel moyen sur la période de référence (primes comprises). */
    salaireBrutMensuelMoyen: number;
  };
  simulation_apl: APLInput;
  heures_supplementaires: HeuresSupInput;
  conges_payes_jours_acquis: AcquisitionInput;
  conges_payes_indemnite: IndemniteCongesInput;
  prime_activite: PrimeActiviteInput;
  indemnites_kilometriques: IndemnitesKMInput;
  preavis: PreavisInput;
  solde_tout_compte: SoldeToutCompteInput;
  compare_offres: { offreA: Offre; offreB: Offre };
  freelance_tjm_ca_net: FreelanceInput;
  auto_entrepreneur: AutoEntrepreneurInput;
  portage_salarial: PortageInput;
  comparatif_statuts: ComparatifStatutsInput;
  seuils_micro_entreprise: PositionSeuilsInput;
  tva_freelance: TVAFreelanceInput;
  retraite_prevoyance_independants: RetraiteIndependantsInput;
}

export type ToolName = keyof ToolInputs;

export interface ToolDefinition<K extends ToolName> {
  title: string;
  description: string;
  /** Page du simulateur sur calculsalairebrutnet.fr, renvoyée comme source à citer. */
  page: string;
  run: (input: ToolInputs[K]) => object;
}

export const TOOLS: { [K in ToolName]: ToolDefinition<K> } = {
  salaire_brut_en_net: {
    title: "Salaire brut en net",
    description:
      "Convertit un salaire brut mensuel en net avant et après impôt (prélèvement à la source), mensuel, annuel et horaire, avec le détail des cotisations salariales 2026. Statuts : non-cadre, cadre, fonction publique, profession libérale.",
    page: "/outils/salaire-brut-net",
    run: brutToNet,
  },
  salaire_net_en_brut: {
    title: "Salaire net en brut",
    description:
      "Retrouve le salaire brut mensuel correspondant à un net mensuel avant impôt, avec le même détail que salaire_brut_en_net.",
    page: "/outils/salaire-brut-net",
    run: netToBrut,
  },
  indemnite_licenciement: {
    title: "Indemnité de licenciement",
    description:
      "Calcule l'indemnité légale de licenciement (et conventionnelle pour Syntec ou la Métallurgie) selon le salaire de référence et l'ancienneté.",
    page: "/outils/indemnite-licenciement",
    run: indemniteLicenciement,
  },
  rupture_conventionnelle: {
    title: "Rupture conventionnelle",
    description:
      "Calcule l'indemnité minimale de rupture conventionnelle et, si un montant négocié est donné, sa part soumise à cotisations, CSG et impôt.",
    page: "/outils/rupture-conventionnelle",
    run: indemniteRuptureConventionnelle,
  },
  allocation_chomage: {
    title: "Allocation chômage (ARE)",
    description:
      "Estime l'allocation chômage (ARE) journalière et mensuelle et la durée d'indemnisation à partir du salaire brut mensuel moyen.",
    page: "/outils/allocation-chomage",
    run: ({ salaireBrutMensuelMoyen, ...rest }) =>
      allocationChomage({ ...rest, salaireJournalierReference: sjrDepuisSalaire(salaireBrutMensuelMoyen) }),
  },
  simulation_apl: {
    title: "Simulation APL",
    description:
      "Estime l'aide personnalisée au logement (APL) selon le loyer, les revenus, la composition du foyer et la zone.",
    page: "/outils/simulation-apl",
    run: simulationAPL,
  },
  heures_supplementaires: {
    title: "Heures supplémentaires",
    description:
      "Calcule la rémunération des heures supplémentaires (majorations 25 % et 50 %), la réduction de cotisations et la part exonérée d'impôt.",
    page: "/outils/heures-supplementaires",
    run: calculHeuresSup,
  },
  conges_payes_jours_acquis: {
    title: "Congés payés : jours acquis",
    description:
      "Calcule les jours de congés payés acquis sur la période de référence, arrêts maladie compris (règles 2024).",
    page: "/outils/conges-payes",
    run: joursAcquis,
  },
  conges_payes_indemnite: {
    title: "Congés payés : indemnité",
    description:
      "Calcule l'indemnité de congés payés en comparant le maintien de salaire et la règle du dixième, et retient la plus favorable.",
    page: "/outils/conges-payes",
    run: indemniteConges,
  },
  prime_activite: {
    title: "Prime d'activité",
    description: "Estime la prime d'activité mensuelle selon les revenus d'activité et la composition du foyer.",
    page: "/outils/prime-activite",
    run: primeActivite,
  },
  indemnites_kilometriques: {
    title: "Indemnités kilométriques",
    description:
      "Calcule les indemnités kilométriques selon le barème fiscal (voiture, moto, cyclomoteur), la puissance fiscale et la distance annuelle.",
    page: "/outils/indemnites-kilometriques",
    run: indemnitesKilometriques,
  },
  preavis: {
    title: "Préavis",
    description:
      "Calcule la durée du préavis (démission, licenciement, rupture de période d'essai) et sa date de fin à partir de la date de notification.",
    page: "/outils/preavis",
    run: preavis,
  },
  solde_tout_compte: {
    title: "Solde de tout compte",
    description:
      "Estime le solde de tout compte : salaire du dernier mois, indemnité de congés non pris, préavis, 13e mois, prime de précarité et indemnité de rupture.",
    page: "/outils/solde-tout-compte",
    run: soldeToutCompte,
  },
  compare_offres: {
    title: "Comparateur d'offres",
    description: "Compare deux offres d'emploi en net mensuel, primes et valeur des RTT, et indique la meilleure.",
    page: "/outils/compare-offres",
    run: ({ offreA, offreB }) => compareOffres(offreA, offreB),
  },
  freelance_tjm_ca_net: {
    title: "TJM / CA en net (freelance)",
    description:
      "Convertit un TJM ou un chiffre d'affaires mensuel en revenu net pour un freelance : micro-entreprise, portage salarial, SASU à l'IS, EURL à l'IR ou à l'IS.",
    page: "/freelances/tjm-ca-net",
    run: simulerFreelance,
  },
  auto_entrepreneur: {
    title: "Auto-entrepreneur",
    description:
      "Calcule les cotisations URSSAF, l'impôt (versement libératoire ou barème) et le revenu net d'un auto-entrepreneur, ACRE comprise.",
    page: "/freelances/auto-entrepreneur",
    run: autoEntrepreneur,
  },
  portage_salarial: {
    title: "Portage salarial",
    description:
      "Calcule le salaire net en portage salarial à partir du chiffre d'affaires, des frais de gestion et des frais professionnels.",
    page: "/freelances/portage-salarial",
    run: portageSalarial,
  },
  comparatif_statuts: {
    title: "Comparatif des statuts",
    description:
      "Compare salarié, micro-entreprise, portage, SASU (salaire ou dividendes) et EURL à l'IR. Mode « ca » : net après impôt obtenu pour un CA mensuel HT. Mode « net » : CA nécessaire pour un net après impôt visé.",
    page: "/freelances/comparatif-statuts",
    run: comparatifStatuts,
  },
  seuils_micro_entreprise: {
    title: "Seuils et plafonds micro-entreprise",
    description:
      "Situe un chiffre d'affaires par rapport aux plafonds de la micro-entreprise et aux seuils de franchise de TVA 2026.",
    page: "/freelances/seuils-plafonds-micro",
    run: positionSeuils,
  },
  tva_freelance: {
    title: "TVA freelance",
    description:
      "Calcule la TVA à facturer et à reverser, ou indique la franchise en base, selon l'activité et le chiffre d'affaires.",
    page: "/freelances/tva-freelance",
    run: tvaFreelance,
  },
  retraite_prevoyance_independants: {
    title: "Retraite et prévoyance des indépendants",
    description:
      "Estime les cotisations retraite (base et complémentaire) et prévoyance d'un indépendant, les trimestres validés et l'indemnité journalière maladie selon son revenu annuel.",
    page: "/freelances/retraite-prevoyance-independants",
    run: retraitePrevoyanceIndependants,
  },
};
