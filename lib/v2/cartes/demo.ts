/**
 * Donnees de demonstration des cartes, utilisees seulement avec ?demo=1 (copie web, planche des modeles).
 * Jamais montrees a un utilisateur avec ses vraies donnees.
 */
import type { CarteData, Exploit, PhotoCarte } from './types';
import { carteAvantApres } from './avantApres';
import { demoCarteBilan } from '@/lib/v2/bilan/demo';

export const DEMO_SEANCE_MUSCU: CarteData = {
  moment: 'seance',
  titre: 'Musculation',
  sousTitre: 'Mercredi 14 octobre',
  sport: 'musculation',
  famille: 'muscu',
  club: { nom: 'Basic-Fit Prado' },
  seance: { dureeMin: 72, rounds: 0, series: 18, tonnage: 12450, distanceKm: 0, fcMoy: 118, fcMax: 164, calories: 486, zones: null, records: [{ nom: 'Développé couché', texte: '100 kg pour 5 répétitions', poids: 100, reps: 5, avant: 95 }] },
  serieSemaines: 6,
  cle: 'seance:demo1',
};

export const DEMO_SEANCE_COMBAT: CarteData = {
  moment: 'seance',
  titre: 'Jiu-jitsu brésilien',
  sousTitre: 'Mardi 13 octobre',
  sport: 'jjb',
  famille: 'combat',
  seance: { dureeMin: 90, rounds: 6, series: 0, tonnage: 0, distanceKm: 0, fcMoy: 142, fcMax: 181, calories: 812, zones: [300, 1500, 1800, 1200, 600], records: [] },
  serieSemaines: 6,
  cle: 'seance:demo2',
};

export const DEMO_SEANCE_COURSE: CarteData = {
  moment: 'seance',
  titre: 'Course à pied',
  sousTitre: 'Dimanche 11 octobre',
  sport: 'running',
  famille: 'course',
  seance: { dureeMin: 53, rounds: 0, series: 0, tonnage: 0, distanceKm: 10.24, fcMoy: 156, fcMax: 178, calories: 702, zones: [120, 600, 1300, 900, 260], records: [] },
  serieSemaines: 6,
  cle: 'seance:demo3',
};

export const DEMO_PESEE: CarteData = {
  moment: 'pesee',
  titre: 'Sous les 85 kg',
  sousTitre: 'Mercredi 14 octobre',
  pesee: { poids: 84.6, precedent: 85.3, depart: 91.2, objectif: 80, raison: { type: 'palier', texte: 'Sous les 85 kg' } },
  serieSemaines: 6,
  cle: 'pesee:demo',
};

export const DEMO_SEMAINE: CarteData = {
  moment: 'semaine',
  titre: 'Ma semaine',
  sousTitre: 'Du 5 au 11 octobre',
  semaine: {
    debut: '2026-10-05',
    jours: [true, false, true, true, false, true, true],
    seances: 5,
    minutes: 342,
    sports: [{ nom: 'Musculation', n: 2 }, { nom: 'Jiu-jitsu brésilien', n: 2 }, { nom: 'Course à pied', n: 1 }],
    poidsFin: 84.6,
    poidsEcart: -0.8,
    objectif: 4,
    parJour: [
      { sports: ['Musculation'], club: { nom: 'Basic-Fit Prado' } },
      { sports: [] },
      { sports: ['Jiu-jitsu brésilien'], club: { nom: 'First Jiu-Jitsu Academy' } },
      { sports: ['Musculation'], club: { nom: 'Basic-Fit Prado' } },
      { sports: [] },
      { sports: ['Jiu-jitsu brésilien'], club: { nom: 'First Jiu-Jitsu Academy' } },
      { sports: ['Course à pied'] },
    ],
  },
  serieSemaines: 6,
  cle: 'semaine:demo',
};

export function demoPour(moment: string | undefined, sport?: string): CarteData {
  if (moment === 'pesee') return DEMO_PESEE;
  if (moment === 'semaine') return DEMO_SEMAINE;
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
  ex({ type: 'record_charge', date: '2026-10-14', surtitre: 'Nouveau record', hero: { value: '100', unit: 'kg' }, avant: { value: '95', unit: 'kg' }, accroche: 'Développé couché', detail: '5 répétitions, 5 kg de plus que ton ancien record', record: true, priorite: 10 }, 'Mercredi 14 octobre', 'musculation'),
  ex({ type: 'record_distance', date: '2026-10-11', surtitre: 'Record de distance', hero: { value: '21,1', unit: 'km' }, avant: { value: '15,4', unit: 'km' }, accroche: 'Ma plus longue sortie en course à pied', detail: '5,7 km de plus que ton ancien record', record: true, priorite: 11 }, 'Dimanche 11 octobre', 'running'),
  ex({ type: 'record_allure', date: '2026-10-11', surtitre: 'Record d’allure', hero: { value: '4\'52', unit: '/km' }, avant: { value: '5\'06', unit: '/km' }, accroche: 'Ma meilleure allure sur 10 km ou plus', detail: '14 secondes de mieux au kilomètre', record: true, priorite: 12 }, 'Dimanche 11 octobre', 'running'),
  ex({ type: 'record_rounds', date: '2026-10-13', surtitre: 'Record de rounds', hero: { value: '12', unit: 'rounds' }, avant: { value: '9', unit: 'rounds' }, accroche: 'Ma plus grosse séance de jiu-jitsu brésilien', detail: '3 rounds de plus que ton ancien record', record: true, priorite: 13 }, 'Mardi 13 octobre', 'jjb'),
  ex({ type: 'techniques', date: '2026-10-13', surtitre: 'Appris aujourd’hui', hero: { value: '3', unit: 'techniques' }, accroche: 'Jiu-jitsu brésilien', liste: ['Juji gatame', 'Triangle', 'Omoplata'], priorite: 40 }, 'Mardi 13 octobre', 'jjb'),
  ex({ type: 'compteur', date: '2026-10-14', surtitre: '2 séances aujourd’hui', hero: { value: '4', unit: 'e' }, accroche: 'séance de la semaine', cotes: [{ label: 'du mois', value: '12e' }, { label: 'de 2026', value: '178e' }], priorite: 70 }, 'Mercredi 14 octobre', 'jjb'),
  ex({ type: 'palier_total', date: '2026-10-14', surtitre: 'Cap franchi', hero: { value: '300', unit: 'séances' }, accroche: '300 séances. Et ce n’est qu’un début.', detail: 'Depuis le 3 février 2025', priorite: 20 }, 'Mercredi 14 octobre', 'musculation'),
  ex({ type: 'palier_mois', date: '2026-10-14', surtitre: 'En octobre', hero: { value: '20', unit: 'séances' }, accroche: 'Et le mois n’est pas fini', priorite: 30 }, 'Mercredi 14 octobre'),
  ex({ type: 'semaine_objectif', date: '2026-10-14', surtitre: 'Objectif de la semaine', hero: { value: '4/4', unit: '' }, accroche: 'Toutes mes séances prévues sont faites', priorite: 24 }, 'Mercredi 14 octobre'),
  ex({ type: 'serie_semaines', date: '2026-10-14', surtitre: 'Objectif tenu', hero: { value: '6', unit: 'semaines' }, accroche: 'd’affilée à 4 séances', priorite: 22 }, 'Mercredi 14 octobre'),
  ex({ type: 'annee_progression', date: '2026-10-14', surtitre: 'Objectif 2026', hero: { value: '178', unit: 'sur 208' }, accroche: '4 séances par semaine, toute l’année', barre: { fait: 178, total: 208, attendu: 163, legende: 'En avance de 15 séances sur ton rythme' }, priorite: 60 }, 'Mercredi 14 octobre'),
  ex({ type: 'annee_palier', date: '2026-07-02', surtitre: 'Objectif 2026', hero: { value: '50', unit: '%' }, accroche: 'La moitié du chemin est faite', detail: '104 séances sur 208', barre: { fait: 104, total: 208, attendu: 104, legende: 'Pile dans ton rythme' }, priorite: 21 }, 'Jeudi 2 juillet'),
  ex({ type: 'annee_atteinte', date: '2026-12-20', surtitre: 'Objectif 2026 atteint', hero: { value: '208', unit: 'séances' }, accroche: 'Tu as été rigoureux', barre: { fait: 208, total: 208, attendu: 202, legende: 'Objectif tenu' }, priorite: 15 }, 'Dimanche 20 décembre'),
  ex({ type: 'cumul_heures', date: '2026-10-14', surtitre: 'Depuis le début', hero: { value: '250', unit: 'heures' }, accroche: 'd’entraînement au compteur', priorite: 35 }, 'Mercredi 14 octobre', 'jjb'),
  ex({ type: 'cumul_tonnage', date: '2026-10-14', surtitre: 'Depuis le début', hero: { value: '500', unit: 'tonnes' }, accroche: 'soulevées, série après série', priorite: 35 }, 'Mercredi 14 octobre', 'musculation'),
  ex({ type: 'bilan_mois', date: '2026-09-01', surtitre: 'Mon premier mois complet', hero: { value: '18', unit: 'séances' }, accroche: 'Objectif tenu chaque semaine de septembre', cotes: [{ label: 'd’entraînement', value: '21h30' }, { label: 'jours actifs', value: '16' }, { label: 'parcourus', value: '64,2', unit: 'km' }], priorite: 50 }, 'Septembre 2026'),
  ex({ type: 'bilan_annee', date: '2026-12-31', surtitre: 'Mon année 2026', hero: { value: '212', unit: 'séances' }, accroche: 'Objectif tenu : 208 séances visées', cotes: [{ label: 'd’entraînement', value: '248', unit: 'h' }, { label: 'parcourus', value: '812', unit: 'km' }, { label: 'rounds', value: '940' }], barre: { fait: 212, total: 208, legende: 'Objectif de l’année tenu' }, priorite: 50 }, '2026'),
  ex({ type: 'poids_perdu', date: '2026-10-14', surtitre: 'Depuis le début', hero: { value: '−6,6', unit: 'kg' }, accroche: 'perdus, et je continue', cotes: [{ label: 'au départ', value: '91,2', unit: 'kg', poids: true }, { label: 'aujourd’hui', value: '84,6', unit: 'kg', poids: true }, { label: 'pesées', value: '38' }], masque: { ecart: null, pourcentage: { hero: { value: '−7,2', unit: '%' }, accroche: 'perdus depuis le début' } }, priorite: 28 }, 'Mercredi 14 octobre'),
  ex({ type: 'plus_bas', date: '2026-10-14', surtitre: 'Nouveau plus bas', hero: { value: '84,6', unit: 'kg' }, avant: { value: '85,1', unit: 'kg' }, accroche: 'Le plus léger depuis que je me pèse', detailPoids: true, masque: { ecart: { hero: { value: '−0,5', unit: 'kg' }, accroche: 'sous mon ancien plus bas' }, pourcentage: { hero: { value: '−0,6', unit: '%' }, accroche: 'sous mon ancien plus bas' } }, priorite: 26 }, 'Mercredi 14 octobre'),
  ex({ type: 'objectif_poids', date: '2026-12-02', surtitre: 'Objectif atteint', hero: { value: '80', unit: 'kg' }, accroche: 'Je l’ai fait', detail: 'Parti de 91,2 kg', detailPoids: true, cotes: [{ label: 'perdus depuis le début', value: '−11,2', unit: 'kg' }], masque: { ecart: { hero: { value: '−11,2', unit: 'kg' }, accroche: 'perdus depuis le début' }, pourcentage: { hero: { value: '−12,3', unit: '%' }, accroche: 'perdus depuis le début' } }, priorite: 14 }, 'Mercredi 2 décembre'),
];

export function demoExploit(type?: string): CarteData {
  if (type === 'bilan_corps' || type === 'bilan_seance') return demoCarteBilan(type === 'bilan_corps' ? 'corps' : 'seance');
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
