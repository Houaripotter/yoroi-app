/**
 * Donnees de demonstration des cartes, utilisees seulement avec ?demo=1 (copie web, planche des modeles).
 * Jamais montrees a un utilisateur avec ses vraies donnees. 2 novembre 2026 : sans kcal, comme les vraies cartes (kcalPourCarte).
 */
import type { CarteData, DonneesSeance, Exploit, PhotoCarte } from './types';
import type { Bibliotheque } from './bibliotheque';
import { rangerExploits } from './periode';

/** 31 octobre 2026 : un parcours de demonstration (boucle irreguliere), ramene entre 0 et 1 comme un vrai trace */
function traceDemo(): NonNullable<DonneesSeance['trace']> {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = 0.36 + 0.06 * Math.sin(a * 5) + 0.035 * Math.cos(a * 9);
    pts.push([0.5 + r * Math.cos(a) * 1.05, 0.46 + r * Math.sin(a)]);
  }
  pts.push([0.42, 0.9], [0.34, 0.96]);
  return { points: pts.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000] as [number, number]), ratio: 0.95 };
}
import { carteAvantApres } from './avantApres';

/** 31 octobre 2026 (cartes v2) : 12 semaines de demonstration (motif regulier avec des jours de repos) */
export function grilleDemo(): boolean[][] {
  const motif = [1, 0, 1, 0, 1, 1, 0];
  return Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => (w === 11 && d > 2 ? false : motif[(d + w) % 7] === 1 || (w % 3 === 0 && d === 3))));
}

/** Une seance precedente de demonstration, chiffres fictifs */
function precedenteDemo(s: Partial<DonneesSeance>, date: string): NonNullable<CarteData['precedente']> {
  return { date, seance: { dureeMin: 0, rounds: 0, series: 0, tonnage: 0, distanceKm: 0, fcMoy: 0, fcMax: 0, calories: 0, zones: null, records: [], ...s } };
}
import { demoCarteBilan } from '@/lib/v2/bilan/demo';
import { traduire } from '@/lib/i18n/tr';

export const DEMO_SEANCE_MUSCU: CarteData = {
  moment: 'seance',
  titre: 'Musculation',
  sousTitre: traduire('Mercredi 14 octobre'),
  sport: 'musculation',
  famille: 'muscu',
  club: { nom: 'Salle de musculation' },
  seance: { dureeMin: 72, rounds: 0, series: 18, tonnage: 12450, distanceKm: 0, fcMoy: 118, fcMax: 164, calories: 0, zones: null, records: [{ nom: traduire('Développé couché'), texte: traduire('100 kg pour 5 répétitions'), poids: 100, reps: 5, avant: 95 }], repetitions: 142, meilleures: [{ nom: traduire('Développé couché'), poids: 100, reps: 5 }, { nom: traduire('Développé militaire'), poids: 60, reps: 6 }, { nom: 'Dips', poids: 25, reps: 8 }], barres: [600, 800, 900, 500, 600, 640, 640, 900, 960, 1000, 420, 480, 480, 360, 380, 400, 300, 320] },
  serieSemaines: 6,
  precedente: precedenteDemo({ dureeMin: 76, series: 17, tonnage: 11920, repetitions: 131 }, '2026-10-07'),
  grille: grilleDemo(),
  rangAnnee: 47,
  dateIso: '2026-10-14',
  heure: '18:40',
  cle: 'seance:demo1',
};

export const DEMO_SEANCE_COMBAT: CarteData = {
  moment: 'seance',
  titre: 'Jiu jitsu brésilien',
  sousTitre: traduire('Mardi 13 octobre'),
  sport: 'jjb',
  famille: 'combat',
  seance: { dureeMin: 90, rounds: 6, series: 0, tonnage: 0, distanceKm: 0, fcMoy: 142, fcMax: 181, calories: 0, zones: [300, 1500, 1800, 1200, 600], records: [], intensite: 8, techniques: [traduire('Passage de garde en torreando'), traduire('Balayage en araignée'), traduire('Triangle depuis la garde')], courbeFc: [96, 110, 128, 150, 166, 158, 132, 118, 140, 164, 176, 160, 128, 116, 142, 168, 178, 162, 130, 120, 146, 170, 181, 166, 134, 122, 150, 172, 176, 150] },
  serieSemaines: 6,
  precedente: precedenteDemo({ dureeMin: 90, rounds: 5, intensite: 7 }, '2026-10-06'),
  grille: grilleDemo(),
  rangAnnee: 46,
  dateIso: '2026-10-13',
  heure: '12:00',
  cle: 'seance:demo2',
};

export const DEMO_SEANCE_COURSE: CarteData = {
  moment: 'seance',
  titre: traduire('Course à pied'),
  sousTitre: traduire('Dimanche 11 octobre'),
  sport: 'running',
  famille: 'course',
  seance: { dureeMin: 53, rounds: 0, series: 0, tonnage: 0, distanceKm: 10.24, fcMoy: 156, fcMax: 178, calories: 0, zones: [120, 600, 1300, 900, 260], records: [], trace: traceDemo(), deniveleM: 86, splits: [{ km: 1, secondes: 322 }, { km: 2, secondes: 314 }, { km: 3, secondes: 311 }, { km: 4, secondes: 309 }, { km: 5, secondes: 312 }, { km: 6, secondes: 306 }, { km: 7, secondes: 310 }, { km: 8, secondes: 304 }, { km: 9, secondes: 301 }, { km: 10, secondes: 296 }] },
  serieSemaines: 6,
  precedente: precedenteDemo({ dureeMin: 49.5, distanceKm: 9.1 }, '2026-10-04'),
  grille: grilleDemo(),
  rangAnnee: 44,
  dateIso: '2026-10-11',
  heure: '07:12',
  cle: 'seance:demo3',
};

export const DEMO_PESEE: CarteData = {
  moment: 'pesee',
  titre: traduire('Sous les 85 kg'),
  sousTitre: traduire('Mercredi 14 octobre'),
  pesee: { poids: 84.6, precedent: 85.3, depart: 91.2, objectif: 80, raison: { type: 'palier', texte: traduire('Sous les 85 kg') } },
  serieSemaines: 6,
  cle: 'pesee:demo',
};

export const DEMO_SEMAINE: CarteData = {
  moment: 'semaine',
  titre: traduire('Ma semaine'),
  sousTitre: traduire('Du 5 au 11 octobre'),
  semaine: {
    debut: '2026-10-05',
    jours: [true, false, true, true, false, true, true],
    seances: 5,
    minutes: 342,
    sports: [{ nom: 'Musculation', n: 2 }, { nom: 'Jiu jitsu brésilien', n: 2 }, { nom: traduire('Course à pied'), n: 1 }],
    poidsFin: 84.6,
    poidsEcart: -0.8,
    objectif: 4,
    parJour: [
      { sports: ['Musculation'], club: { nom: 'Salle de musculation' } },
      { sports: [] },
      { sports: ['Jiu jitsu brésilien'], club: { nom: 'Club de JJB' } },
      { sports: ['Musculation'], club: { nom: 'Salle de musculation' } },
      { sports: [] },
      { sports: ['Jiu jitsu brésilien'], club: { nom: 'Club de JJB' } },
      { sports: [traduire('Course à pied')] },
    ],
  },
  serieSemaines: 6,
  cle: 'semaine:demo',
};

// ============================================
// BIBLIOTHEQUE DE DEMONSTRATION (31 octobre 2026) : ton mois, ton annee, tes objectifs et tes compteurs,
// memes formes que les vrais, chiffres fictifs coherents avec les seances et exploits ci-dessus
// ============================================

/** Une autre semaine de demonstration, plus calme */
export const DEMO_SEMAINE_2: CarteData = {
  ...DEMO_SEMAINE,
  sousTitre: traduire('Du 12 au 18 octobre'),
  semaine: { ...DEMO_SEMAINE.semaine!, debut: '2026-10-12', jours: [true, true, false, true, false, false, true], seances: 4, minutes: 296, poidsFin: 84.9, poidsEcart: -0.4, sports: [{ nom: 'Musculation', n: 2 }, { nom: 'Jiu jitsu brésilien', n: 1 }, { nom: traduire('Course à pied'), n: 1 }] },
  serieSemaines: 7,
  cle: 'semaine:demo2',
};

export const DEMO_MOIS: CarteData = {
  moment: 'mois',
  titre: traduire('Mon mois'),
  sousTitre: traduire('Octobre 2026'),
  sport: 'musculation',
  famille: 'muscu',
  periode: { type: 'mois', ref: '2026-10', debut: '2026-10-01', fin: '2026-10-31', enCours: false, seances: 19, minutes: 1410, joursActifs: 17, sports: [{ nom: 'Musculation', n: 8 }, { nom: 'Jiu jitsu brésilien', n: 7 }, { nom: traduire('Course à pied'), n: 4 }], distanceKm: 38.4, tonnage: 96400, rounds: 42, parSemaine: 4, semainesTenues: 4, semainesComptees: 4, objectifAnnee: null, precedent: 18 },
  serieSemaines: 6,
  grille: grilleDemo(),
  dateIso: '2026-10-31',
  cle: 'mois:demo',
};

export const DEMO_MOIS_SEPT: CarteData = {
  ...DEMO_MOIS,
  sousTitre: traduire('Septembre 2026'),
  sport: 'jjb',
  famille: 'combat',
  periode: { type: 'mois', ref: '2026-09', debut: '2026-09-01', fin: '2026-09-30', enCours: false, seances: 18, minutes: 1290, joursActifs: 16, sports: [{ nom: 'Jiu jitsu brésilien', n: 8 }, { nom: 'Musculation', n: 6 }, { nom: traduire('Course à pied'), n: 4 }], distanceKm: 64.2, tonnage: 71800, rounds: 54, parSemaine: 4, semainesTenues: 4, semainesComptees: 4, objectifAnnee: null, precedent: 15 },
  dateIso: '2026-09-30',
  cle: 'mois:demo2',
};

export const DEMO_ANNEE: CarteData = {
  moment: 'annee',
  titre: traduire('Mon année'),
  sousTitre: traduire('2026, jusqu’ici'),
  sport: 'musculation',
  famille: 'muscu',
  periode: { type: 'annee', ref: '2026', debut: '2026-01-01', fin: '2026-10-31', enCours: true, seances: 186, minutes: 14880, joursActifs: 168, sports: [{ nom: 'Musculation', n: 74 }, { nom: 'Jiu jitsu brésilien', n: 68 }, { nom: traduire('Course à pied'), n: 44 }], distanceKm: 690, tonnage: 812000, rounds: 880, parSemaine: 4, semainesTenues: 38, semainesComptees: 43, objectifAnnee: { fait: 186, total: 208, attendu: 172 }, precedent: 142 },
  serieSemaines: 6,
  grille: grilleDemo(),
  dateIso: '2026-10-31',
  cle: 'annee:demo',
};

export const DEMO_ANNEE_2025: CarteData = {
  ...DEMO_ANNEE,
  sousTitre: '2025',
  sport: 'jjb',
  famille: 'combat',
  periode: { type: 'annee', ref: '2025', debut: '2025-01-01', fin: '2025-12-31', enCours: false, seances: 142, minutes: 9960, joursActifs: 131, sports: [{ nom: 'Jiu jitsu brésilien', n: 61 }, { nom: 'Musculation', n: 52 }, { nom: traduire('Course à pied'), n: 29 }], distanceKm: 410, tonnage: 520000, rounds: 610, parSemaine: 3, semainesTenues: 41, semainesComptees: 52, objectifAnnee: { fait: 142, total: 156 }, precedent: 0 },
  serieSemaines: 0,
  dateIso: '2025-12-31',
  cle: 'annee:demo2',
};

function duMoment(e: Exploit, src: 'objectif' | 'compteur', sousTitre: string, plus: Partial<CarteData> = {}): CarteData {
  return { moment: 'exploit', titre: e.surtitre, sousTitre, exploit: e, sport: null, source: { type: src, ref: e.date }, dateIso: e.date, cle: `${src}:${e.type}`, ...plus };
}

const objectifDemo = (e: Exploit, sousTitre: string, plus?: Partial<CarteData>) => duMoment(e, 'objectif', sousTitre, plus);
const compteurDemo = (e: Exploit, sousTitre: string, plus?: Partial<CarteData>) => duMoment(e, 'compteur', sousTitre, plus);

export const DEMO_OBJECTIFS: CarteData[] = [
  objectifDemo({ type: 'semaine_objectif', date: '2026-10-31', surtitre: traduire('Objectif de la semaine'), hero: { value: '3/4', unit: '' }, accroche: traduire('Encore {0} séance cette semaine', 1), barre: { fait: 3, total: 4, legende: traduire('{0} sur {1} séances', 3, 4) }, cotes: [{ label: traduire('semaines d’affilée'), value: '6' }], priorite: 1 }, traduire('Cette semaine'), { serieSemaines: 6, grille: grilleDemo(), sport: 'jjb' }),
  objectifDemo({ type: 'annee_progression', date: '2026-10-31', surtitre: traduire('Objectif {0}', 2026), hero: { value: '186', unit: traduire('sur {0}', 208) }, accroche: traduire('{0} séances par semaine, toute l’année', 4), detail: traduire('En avance de 14 séances sur ton rythme'), barre: { fait: 186, total: 208, attendu: 172, legende: traduire('En avance de 14 séances sur ton rythme') }, cotes: [{ label: traduire('de l’objectif'), value: '89', unit: '%' }, { label: traduire('séances à faire'), value: '22' }], priorite: 2 }, traduire('Samedi 31 octobre'), { sport: 'musculation' }),
  objectifDemo({ type: 'chemin_poids', date: '2026-10-31', surtitre: traduire('Objectif de poids'), hero: { value: '59', unit: '%' }, accroche: traduire('du chemin vers mon objectif'), detail: traduire('Objectif : {0} kg, parti de {1} kg', '80', '91,2'), detailPoids: true, barre: { fait: 59, total: 100, legende: traduire('du chemin vers mon objectif') }, cotes: [{ label: traduire('perdus depuis le départ'), value: '−6,6', unit: 'kg' }, { label: traduire('avant l’objectif'), value: '4,6', unit: 'kg' }, { label: traduire('aujourd’hui'), value: '84,6', unit: 'kg', poids: true }], masque: { ecart: { hero: { value: '59', unit: '%' }, accroche: traduire('du chemin vers mon objectif') }, pourcentage: { hero: { value: '59', unit: '%' }, accroche: traduire('du chemin vers mon objectif') } }, priorite: 3 }, traduire('Aujourd’hui')),
];

export const DEMO_COMPTEURS: CarteData[] = [
  compteurDemo({ type: 'cumul_seances', date: '2026-10-31', surtitre: traduire('Depuis le début'), hero: { value: '328', unit: traduire('séances') }, accroche: traduire('depuis {0} {1}', traduire('février'), 2025), cotes: [{ label: traduire('d’entraînement'), value: '412', unit: 'h' }, { label: traduire('jours actifs'), value: '291' }], priorite: 1 }, traduire('Samedi 31 octobre'), { sport: 'jjb' }),
  compteurDemo({ type: 'cumul_heures', date: '2026-10-31', surtitre: traduire('En {0}', 2026), hero: { value: '248', unit: traduire('heures') }, accroche: traduire('d’entraînement cette année'), cotes: [{ label: traduire('séances'), value: '186' }], priorite: 2 }, traduire('Samedi 31 octobre'), { sport: 'musculation' }),
  compteurDemo({ type: 'cumul_km', date: '2026-10-31', surtitre: traduire('En {0}', 2026), hero: { value: '690', unit: 'km' }, accroche: traduire('parcourus cette année'), priorite: 3 }, traduire('Samedi 31 octobre'), { sport: 'running' }),
  compteurDemo({ type: 'cumul_tonnage', date: '2026-10-31', surtitre: traduire('En {0}', 2026), hero: { value: '812', unit: 'tonnes' }, accroche: traduire('soulevées cette année'), priorite: 4 }, traduire('Samedi 31 octobre'), { sport: 'musculation' }),
  compteurDemo({ type: 'cumul_rounds', date: '2026-10-31', surtitre: traduire('En {0}', 2026), hero: { value: '880', unit: 'rounds' }, accroche: traduire('sur le tapis ou sur le ring cette année'), priorite: 5 }, traduire('Samedi 31 octobre'), { sport: 'jjb' }),
];

export function demoPour(moment: string | undefined, sport?: string): CarteData {
  if (moment === 'pesee') return DEMO_PESEE;
  if (moment === 'semaine') return DEMO_SEMAINE;
  if (moment === 'mois') return sport === 'combat' ? DEMO_MOIS_SEPT : DEMO_MOIS;
  if (moment === 'annee') return sport === 'combat' ? DEMO_ANNEE_2025 : DEMO_ANNEE;
  if (sport === 'combat') return DEMO_SEANCE_COMBAT;
  if (sport === 'course') return DEMO_SEANCE_COURSE;
  return DEMO_SEANCE_MUSCU;
}

// ============================================
// EXPLOITS DE DEMONSTRATION (cartes 2) : memes formes que les vrais, chiffres fictifs
// ============================================

function ex(e: Exploit, sousTitre: string, sport?: string): CarteData {
  return { moment: 'exploit', titre: e.surtitre, sousTitre, exploit: e, sport: sport ?? null, cle: `exploit:demo:${e.type}`, source: { type: 'seance', ref: 'demo' } };
}

export const DEMO_EXPLOITS: CarteData[] = [
  ex({ type: 'record_charge', date: '2026-10-14', surtitre: traduire('Nouveau record'), hero: { value: '100', unit: 'kg' }, avant: { value: '95', unit: 'kg' }, accroche: traduire('Développé couché'), detail: traduire('5 répétitions, 5 kg de plus que ton ancien record'), record: true, priorite: 10 }, traduire('Mercredi 14 octobre'), 'musculation'),
  ex({ type: 'record_distance', date: '2026-10-11', surtitre: traduire('Record de distance'), hero: { value: '21,1', unit: 'km' }, avant: { value: '15,4', unit: 'km' }, accroche: traduire('Ma plus longue sortie en course à pied'), detail: traduire('5,7 km de plus que ton ancien record'), record: true, priorite: 11 }, traduire('Dimanche 11 octobre'), 'running'),
  ex({ type: 'record_allure', date: '2026-10-11', surtitre: 'Record d’allure', hero: { value: '4\'52', unit: '/km' }, avant: { value: '5\'06', unit: '/km' }, accroche: traduire('Ma meilleure allure sur 10 km ou plus'), detail: traduire('14 secondes de mieux au kilomètre'), record: true, priorite: 12 }, traduire('Dimanche 11 octobre'), 'running'),
  ex({ type: 'record_rounds', date: '2026-10-13', surtitre: traduire('Record de rounds'), hero: { value: '12', unit: 'rounds' }, avant: { value: '9', unit: 'rounds' }, accroche: traduire('Ma plus grosse séance de jiu jitsu brésilien'), detail: traduire('3 rounds de plus que ton ancien record'), record: true, priorite: 13 }, traduire('Mardi 13 octobre'), 'jjb'),
  ex({ type: 'techniques', date: '2026-10-13', surtitre: traduire('Appris aujourd’hui'), hero: { value: '3', unit: 'techniques' }, accroche: 'Jiu jitsu brésilien', liste: [traduire('Juji gatame'), 'Triangle', 'Omoplata'], priorite: 40 }, traduire('Mardi 13 octobre'), 'jjb'),
  ex({ type: 'compteur', date: '2026-10-14', surtitre: traduire('2 séances aujourd’hui'), hero: { value: '4', unit: 'e' }, accroche: traduire('séance de la semaine'), cotes: [{ label: traduire('du mois'), value: '12e' }, { label: traduire('de 2026'), value: '178e' }], priorite: 70 }, traduire('Mercredi 14 octobre'), 'jjb'),
  ex({ type: 'palier_total', date: '2026-10-14', surtitre: 'Cap franchi', hero: { value: '300', unit: traduire('séances') }, accroche: traduire('300 séances. Et ce n’est qu’un début.'), detail: traduire('Depuis le 3 février 2025'), priorite: 20 }, traduire('Mercredi 14 octobre'), 'musculation'),
  ex({ type: 'palier_mois', date: '2026-10-14', surtitre: traduire('En octobre'), hero: { value: '20', unit: traduire('séances') }, accroche: traduire('Et le mois n’est pas fini'), priorite: 30 }, traduire('Mercredi 14 octobre')),
  ex({ type: 'semaine_objectif', date: '2026-10-14', surtitre: traduire('Objectif de la semaine'), hero: { value: '4/4', unit: '' }, accroche: traduire('Toutes mes séances prévues sont faites'), priorite: 24 }, traduire('Mercredi 14 octobre')),
  ex({ type: 'serie_semaines', date: '2026-10-14', surtitre: traduire('Objectif tenu'), hero: { value: '6', unit: 'semaines' }, accroche: traduire('d’affilée à 4 séances'), priorite: 22 }, traduire('Mercredi 14 octobre')),
  ex({ type: 'annee_progression', date: '2026-10-14', surtitre: traduire('Objectif 2026'), hero: { value: '178', unit: traduire('sur 208') }, accroche: traduire('4 séances par semaine, toute l’année'), barre: { fait: 178, total: 208, attendu: 163, legende: traduire('En avance de 15 séances sur ton rythme') }, priorite: 60 }, traduire('Mercredi 14 octobre')),
  ex({ type: 'annee_palier', date: '2026-07-02', surtitre: traduire('Objectif 2026'), hero: { value: '50', unit: '%' }, accroche: traduire('La moitié du chemin est faite'), detail: traduire('104 séances sur 208'), barre: { fait: 104, total: 208, attendu: 104, legende: traduire('Pile dans ton rythme') }, priorite: 21 }, traduire('Jeudi 2 juillet')),
  ex({ type: 'annee_atteinte', date: '2026-12-20', surtitre: traduire('Objectif 2026 atteint'), hero: { value: '208', unit: traduire('séances') }, accroche: traduire('Tu as été rigoureux'), barre: { fait: 208, total: 208, attendu: 202, legende: traduire('Objectif tenu') }, priorite: 15 }, traduire('Dimanche 20 décembre')),
  ex({ type: 'cumul_heures', date: '2026-10-14', surtitre: traduire('Depuis le début'), hero: { value: '250', unit: traduire('heures') }, accroche: traduire('d’entraînement au compteur'), priorite: 35 }, traduire('Mercredi 14 octobre'), 'jjb'),
  ex({ type: 'cumul_tonnage', date: '2026-10-14', surtitre: traduire('Depuis le début'), hero: { value: '500', unit: 'tonnes' }, accroche: traduire('soulevées, série après série'), priorite: 35 }, traduire('Mercredi 14 octobre'), 'musculation'),
  ex({ type: 'bilan_mois', date: '2026-09-01', surtitre: traduire('Mon premier mois complet'), hero: { value: '18', unit: traduire('séances') }, accroche: traduire('Objectif tenu chaque semaine de septembre'), cotes: [{ label: traduire('d’entraînement'), value: '21h30' }, { label: traduire('jours actifs'), value: '16' }, { label: 'parcourus', value: '64,2', unit: 'km' }], priorite: 50 }, traduire('Septembre 2026')),
  ex({ type: 'bilan_annee', date: '2026-12-31', surtitre: traduire('Mon année 2026'), hero: { value: '212', unit: traduire('séances') }, accroche: traduire('Objectif tenu : 208 séances visées'), cotes: [{ label: traduire('d’entraînement'), value: '248', unit: 'h' }, { label: 'parcourus', value: '812', unit: 'km' }, { label: 'rounds', value: '940' }], barre: { fait: 212, total: 208, legende: traduire('Objectif de l’année tenu') }, priorite: 50 }, '2026'),
  ex({ type: 'poids_perdu', date: '2026-10-14', surtitre: traduire('Depuis le début'), hero: { value: '−6,6', unit: 'kg' }, accroche: traduire('perdus, et je continue'), cotes: [{ label: traduire('au départ'), value: '91,2', unit: 'kg', poids: true }, { label: traduire('aujourd’hui'), value: '84,6', unit: 'kg', poids: true }, { label: traduire('pesées'), value: '38' }], masque: { ecart: null, pourcentage: { hero: { value: '−7,2', unit: '%' }, accroche: traduire('perdus depuis le début') } }, priorite: 28 }, traduire('Mercredi 14 octobre')),
  ex({ type: 'plus_bas', date: '2026-10-14', surtitre: traduire('Nouveau plus bas'), hero: { value: '84,6', unit: 'kg' }, avant: { value: '85,1', unit: 'kg' }, accroche: traduire('Le plus léger depuis que je me pèse'), detailPoids: true, masque: { ecart: { hero: { value: '−0,5', unit: 'kg' }, accroche: traduire('sous mon ancien plus bas') }, pourcentage: { hero: { value: '−0,6', unit: '%' }, accroche: traduire('sous mon ancien plus bas') } }, priorite: 26 }, traduire('Mercredi 14 octobre')),
  ex({ type: 'objectif_poids', date: '2026-12-02', surtitre: traduire('Objectif atteint'), hero: { value: '80', unit: 'kg' }, accroche: 'Je l’ai fait', detail: traduire('Parti de 91,2 kg'), detailPoids: true, cotes: [{ label: traduire('perdus depuis le début'), value: '−11,2', unit: 'kg' }], masque: { ecart: { hero: { value: '−11,2', unit: 'kg' }, accroche: traduire('perdus depuis le début') }, pourcentage: { hero: { value: '−12,3', unit: '%' }, accroche: traduire('perdus depuis le début') } }, priorite: 14 }, traduire('Mercredi 2 décembre')),
];

export function demoExploit(type?: string, cle?: string): CarteData {
  if (type === 'bilan_corps' || type === 'bilan_seance') return demoCarteBilan(type === 'bilan_corps' ? 'corps' : 'seance');
  // bibliotheque : un objectif ou un compteur du moment, retrouve par sa cle
  const duMomentDemo = cle ? [...DEMO_OBJECTIFS, ...DEMO_COMPTEURS].find((c) => c.cle === cle) : undefined;
  if (duMomentDemo) return duMomentDemo;
  return DEMO_EXPLOITS.find((c) => c.exploit?.type === type) ?? DEMO_EXPLOITS[0];
}

// ============================================
// AVANT APRES DE DEMONSTRATION (17 octobre 2026) : les photos viennent de l'adresse (?photo=&photo2=...),
// sans adresse une case vide ; poids fictifs, une photo sans pesee proche (aucun poids)
// ============================================

export function demoPhotosAvantApres(uris: (string | undefined)[] = []): PhotoCarte[] {
  return [
    { id: 'demo1', uri: uris[0] ?? '', date: '2026-03-02', poids: 91.2 },
    { id: 'demo2', uri: uris[1] ?? uris[0] ?? '', date: '2026-05-18', poids: null },
    { id: 'demo3', uri: uris[2] ?? uris[1] ?? '', date: '2026-07-27', poids: 87.1 },
    { id: 'demo4', uri: uris[3] ?? uris[1] ?? '', date: '2026-10-14', poids: 84.6 },
  ];
}

export function demoAvantApres(uris: (string | undefined)[] = [], avantId?: string, apresId?: string): CarteData {
  return carteAvantApres(demoPhotosAvantApres(uris), avantId, apresId)!;
}

/** La bibliotheque de demonstration : pleine, chiffres fictifs (?demo=1) */
export function bibliothequeDemo(): Bibliotheque {
  const r = rangerExploits(DEMO_EXPLOITS);
  return {
    seances: [DEMO_SEANCE_MUSCU, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE],
    records: r.records,
    objectifs: [...DEMO_OBJECTIFS, ...r.objectifs.filter((c) => c.exploit?.type !== 'annee_progression' && c.exploit?.type !== 'annee_atteinte')],
    semaines: [DEMO_SEMAINE, DEMO_SEMAINE_2],
    mois: [DEMO_MOIS, DEMO_MOIS_SEPT],
    annees: [DEMO_ANNEE, DEMO_ANNEE_2025],
    compteurs: [...DEMO_COMPTEURS, ...r.compteurs.filter((c) => c.exploit?.type !== 'compteur')],
    pesees: [DEMO_PESEE, ...r.poids.filter((c) => c.exploit?.type !== 'objectif_poids')],
  };
}
