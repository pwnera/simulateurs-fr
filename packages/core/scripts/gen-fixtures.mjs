// Génère fixtures/*.json : des entrées variées passées au moteur TypeScript (compilé dans dist/),
// avec les résultats attendus. Le portage Python doit retrouver les mêmes valeurs (python/tests).
// Usage : npm run build -w packages/core && node packages/core/scripts/gen-fixtures.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import * as core from "../dist/index.js";

const OUT = new URL("../../../fixtures/", import.meta.url);

/** Produit cartésien : grid({ a: [1, 2], b: ["x"] }) → [{ a: 1, b: "x" }, { a: 2, b: "x" }]. Une valeur undefined omet le champ. */
function grid(axes) {
  return Object.entries(axes).reduce(
    (acc, [k, values]) => acc.flatMap((o) => values.map((v) => (v === undefined ? o : { ...o, [k]: v }))),
    [{}]
  );
}

const STATUTS = ["non-cadre", "cadre", "fonction-publique", "profession-liberale", "portage"];
const ACTIVITES_MICRO = ["vente", "services_bic", "services_bnc", "liberale_cipav"];
const PROFESSIONS_TNS = ["artisan", "commercant", "liberal", "liberal-cipav"];

/** Nom de la fonction → liste d'appels. Chaque appel est un tableau d'arguments. */
const CASES = {
  brutToNet: [
    ...grid({ brutMensuel: [0, 1823.03, 2500, 4000, 8000, 20000], statut: STATUTS }),
    ...grid({
      brutMensuel: [3000],
      statut: ["non-cadre", "cadre", "fonction-publique"],
      tempsTravailPercent: [undefined, 80],
      moisPrime: [undefined, 13],
      primesAnnuelle: [undefined, 3000],
      heuresSupMensuelles: [undefined, 10],
      mutuelleMensuelle: [undefined, 40],
      tauxPrelevementSource: [undefined, 7.5],
    }),
  ].map((i) => [i]),
  netToBrut: grid({ netMensuel: [0, 1400, 2500, 6000], statut: STATUTS, tempsTravailPercent: [undefined, 60], moisPrime: [undefined, 13] }).map((i) => [i]),
  brutToNetTauxEstime: grid({ brutMensuel: [1900, 3500, 9000], statut: STATUTS, moisPrime: [undefined, 14] }).map((i) => [i]),
  cotisationsSalariales: grid({
    brut: [1823.03, 3000, 5000, 15000],
    statut: ["non-cadre", "cadre", "fonction-publique", "portage"],
    heuresSupBrut: [undefined, 200],
    mutuelleSalariale: [undefined, 35],
    primesFonctionPublique: [undefined, 400],
  }).map((i) => [i]),
  cotisationsPatronales: grid({
    brut: [1823.03, 2500, 4500, 12000],
    cadre: [false, true],
    effectif50Plus: [undefined, true],
    effectif11Plus: [undefined, false],
    assuranceChomage: [undefined, false],
    tempsTravail: [undefined, 0.5],
  }).map((i) => [i]),
  brutDepuisCoutEmployeur: [2500, 5000, 9000].flatMap((c) => [[c], [c, { cadre: true, effectif50Plus: true }], [c, { assuranceChomage: false }]]),
  cotisationsTNS: [0, 5000, 25000, 60000, 150000].flatMap((r) => [[r], ...PROFESSIONS_TNS.map((p) => [r, p])]),
  calculImpotRevenu: grid({ revenuImposable: [0, 12000, 30000, 70000, 200000], nbParts: [undefined, 1.5, 2, 3], couple: [undefined, false, true] }).map((i) => [i]),
  estimerTauxPrelevementSource: [0, 15000, 30000, 60000, 150000].flatMap((n) => [[n], [n, 2], [n, 1, { appliquerAbattement10: true }], [n, 2.5, { appliquerAbattement10: true }]]),
  abattementFraisPro: [[0], [3000], [25000], [200000]],
  impotSocietes: [[0], [20000], [42500], [100000], [500000]],
  compareSalaireToBenchmarks: [[900], [1500], [2200], [3000], [5000]].map((a) => a),
  indemniteLicenciement: [
    ...grid({
      dernierSalaireMensuelBrut: [2000, 4500],
      ancienneteAnnees: [0, 1, 7, 15, 25],
      ancienneteMois: [undefined, 6],
      convention: [undefined, "syntec", "metallurgie"],
      categorie: ["non-cadre", "cadre"],
    }),
    ...grid({ dernierSalaireMensuelBrut: [3000], ancienneteAnnees: [5], fauteGrave: [true], ruptureConventionnelle: [undefined, true] }),
    ...grid({ dernierSalaireMensuelNet: [2300], ancienneteAnnees: [4], moyenne3DerniersMois: [undefined, 3500] }),
  ].map((i) => [i]),
  indemniteRuptureConventionnelle: grid({
    dernierSalaireMensuelBrut: [2200, 6000],
    ancienneteAnnees: [0, 2, 12],
    convention: [undefined, "syntec"],
    indemniteNegociee: [undefined, 20000, 120000],
    remunerationAnnuelleN1: [undefined, 90000],
  }).map((i) => [i]),
  sjrDepuisSalaire: [[0], [1800], [3000], [6000], [15000]],
  allocationChomage: grid({
    salaireJournalierReference: [0, 40, 100, 200, 450],
    trancheAge: [undefined, "moins-55", "55-56", "57-plus"],
    moisTravailles: [undefined, 8, 18],
    ruptureConventionnelle: [undefined, true],
  }).map((i) => [i]),
  simulationAPL: [
    ...grid({ loyerMensuel: [300, 650], revenusMensuels: [0, 900, 1800], zone: [1, 2, 3], couple: [false, true], nbEnfants: [0, 2] }),
    ...grid({ loyerMensuel: [450], revenusMensuels: [600], etudiant: [true], boursier: [false, true], colocation: [false, true] }),
    ...grid({ loyerMensuel: [500], revenusMensuels: [0], ressourcesAnnuelles: [8000], nbPersonnes: [3] }),
  ].map((i) => [i]),
  calculHeuresSup: grid({
    salaireMensuelBrut: [1900, 3500],
    heuresSup25: [0, 8, 20],
    heuresSup50: [0, 4],
    heuresContratHebdo: [undefined, 39],
    reductionSalariale: [undefined, false],
  })
    .concat(grid({ tauxHoraireBrut: [15], heuresSup25: [6], heuresSup50: [2], tauxMajoration1: [0.1], tauxMajoration2: [0.2], heuresComp10: [undefined, 3] }))
    .map((i) => [i]),
  calculHeuresSupSemaine: [
    [[{ debutMinutes: 540, finMinutes: 1080, pauseMinutes: 60 }, null, { debutMinutes: 480, finMinutes: 1200, pauseMinutes: 45 }, { debutMinutes: 540, finMinutes: 1140, pauseMinutes: 60 }, { debutMinutes: 540, finMinutes: 1110, pauseMinutes: 30 }, null, null], 35, "minute"],
    [Array(5).fill({ debutMinutes: 510, finMinutes: 1157, pauseMinutes: 60 }).concat([null, null]), 35, "quart"],
    [Array(6).fill({ debutMinutes: 480, finMinutes: 1110, pauseMinutes: 60 }).concat([null]), 39, "heure_commencee"],
  ],
  joursAcquis: grid({ decompte: ["ouvrables", "ouvres"], moisTravailles: [0, 3, 12], moisMaladie: [undefined, 6, 12] }).map((i) => [i]),
  indemniteConges: grid({
    decompte: ["ouvrables", "ouvres"],
    jours: [5, 25],
    joursAcquisPeriode: [25, 30],
    salaireBrutMensuel: [2000, 3500],
    remunerationReference: [undefined, 52000],
  }).map((i) => [i]),
  primeActivite: grid({
    revenusMensuels: [0, 800, 1500, 2500],
    couple: [false, true],
    nbEnfants: [0, 2],
    logement: [undefined, "locataire-aide", "proprietaire", "heberge"],
  })
    .concat(grid({ revenusMensuels: [1100], revenusConjoint: [700], couple: [true], autresRessources: [200], aideLogement: [150] }))
    .map((i) => [i]),
  indemnitesKilometriques: grid({
    typeVehicule: [undefined, "voiture", "moto", "cyclomoteur"],
    puissanceFiscale: [3, 5, 7],
    distanceAnnuelle: [3000, 12000, 25000],
    electrique: [undefined, true],
  })
    .concat(grid({ puissanceFiscale: [5], distanceAnnuelle: [9000], salairesNetsImposables: [35000], autresFraisReels: [undefined, 1500] }))
    .map((i) => [i]),
  preavis: grid({
    type: ["demission", "licenciement", "depart-retraite", "mise-retraite", "essai-employeur", "essai-salarie"],
    ancienneteAnnees: [0, 1, 3],
    ancienneteMois: [undefined, 4],
    cadre: [undefined, true],
  })
    .concat(grid({ type: ["licenciement"], ancienneteAnnees: [5], fauteGrave: [true] }))
    .concat(grid({ type: ["licenciement"], ancienneteAnnees: [1], travailleurHandicape: [true], dureeConventionnelleMois: [undefined, 3] }))
    .concat(grid({ type: ["essai-employeur", "essai-salarie"], ancienneteAnnees: [0], presenceJours: [5, 20, 60, 150] }))
    .concat(grid({ type: ["demission", "licenciement"], ancienneteAnnees: [2], dateNotification: ["2026-01-31", "2026-03-15", "2024-02-29"] }))
    .map((i) => [i]),
  soldeToutCompte: grid({
    salaireBrutMensuel: [2400],
    joursTravaillesDansLeMois: [10, 22],
    joursOuvresMois: [22],
    joursCongesNonPris: [0, 7.5],
    decompteConges: [undefined, "ouvrables"],
    preavisNonEffectueMois: [undefined, 2],
    moisPourTreizieme: [undefined, 7],
    remunerationTotaleCDD: [undefined, 14400],
    indemniteRupture: [undefined, 5000],
  }).map((i) => [i]),
  compareOffres: [
    [{ brutMensuel: 3000, statut: "non-cadre" }, { brutMensuel: 3200, statut: "cadre" }],
    [{ brutMensuel: 4000, statut: "cadre", primesAnnuelle: 5000, rttJours: 10 }, { brutMensuel: 4300, statut: "cadre" }],
    [{ brutMensuel: 2500, statut: "non-cadre" }, { brutMensuel: 2500, statut: "non-cadre" }],
  ],
  simulerFreelance: [
    ...grid({ tjm: [300, 600, 1000], joursParMois: [18], statut: ["micro", "portage", "sasu_is", "eurl_ir", "eurl_is"], chargesMensuelles: [undefined, 400] }),
    ...grid({ caMensuel: [6000], statut: ["micro"], activiteMicro: ACTIVITES_MICRO }),
    ...grid({ caMensuel: [9000], statut: ["eurl_ir", "eurl_is"], professionTNS: PROFESSIONS_TNS }),
    ...grid({ caMensuel: [12000], statut: ["sasu_is", "eurl_is"], partRemuneration: [0, 30, 100], capitalSocial: [undefined, 10000] }),
    ...grid({ caMensuel: [8000], statut: ["portage"], fraisPortagePercent: [5, 10], tauxPrelevementSource: [undefined, 12] }),
  ].map((i) => [i]),
  autoEntrepreneur: [
    ...grid({ caMensuel: [1000, 5000], activite: ACTIVITES_MICRO, acre: [undefined, "50", "25"], versementLiberatoire: [undefined, true] }),
    ...grid({ caAnnuel: [40000], activite: ["services_bic"], artisan: [true], beneficiaireAcre: [true], tauxPrelevementSource: [undefined, 5] }),
  ].map((i) => [i]),
  portageSalarial: [
    ...grid({ tjm: [400, 700], joursTravaillesParMois: [15, 20], fraisPortagePercent: [5, 10], fraisProfessionnels: [undefined, 500] }),
    ...grid({ caMensuel: [7000], tauxPrelevementSource: [undefined, 10] }),
  ].map((i) => [i]),
  caPourBrutPortage: [[2000, 5], [3500, 7], [6000, 10]],
  comparatifStatuts: grid({ mode: ["ca", "net"], revenuMensuelSouhaite: [3000, 8000], chargesMensuelles: [undefined, 500] }).map((i) => [i]),
  seuilsPlafondsMicro: [[]],
  positionSeuils: grid({
    activite: ACTIVITES_MICRO,
    caAnnuel: [20000, 40000, 80000, 200000],
    depassementAnneePrecedente: [undefined, true],
  }).map((i) => [i]),
  tvaFreelance: [
    ...grid({ caHTAnnuel: [30000, 45000, 100000], activite: ["vente", "prestations", "specifique"], optionTVA: [undefined, true] }),
    ...grid({ caHTAnnuel: [60000], activite: ["prestations"], tauxTVA: [10], depensesTTC: [6000], tauxTVADepenses: [20] }),
  ].map((i) => [i]),
  retraitePrevoyanceIndependants: [
    ...grid({ regime: ["micro"], revenusAnnuels: [5000, 30000, 70000], activiteMicro: ACTIVITES_MICRO }),
    ...grid({ regime: ["reel"], revenusAnnuels: [5000, 30000, 80000], profession: PROFESSIONS_TNS }),
  ].map((i) => [i]),
};

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [fn, calls] of Object.entries(CASES)) {
  if (typeof core[fn] !== "function") throw new Error(`Fonction absente du moteur : ${fn}`);
  const cases = calls.map((args) => ({ args, result: core[fn](...args) }));
  // JSON.stringify écrit Infinity et NaN en null : les tests Python en tiennent compte.
  writeFileSync(new URL(`${fn}.json`, OUT), JSON.stringify(cases, null, 1) + "\n");
  total += cases.length;
}
console.log(`${Object.keys(CASES).length} fonctions, ${total} cas`);
