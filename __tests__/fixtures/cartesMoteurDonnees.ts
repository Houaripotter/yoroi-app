/**
 * Cartes v10 (2 novembre 2026) : les 10 familles avec les chiffres d'exemple des maquettes validees
 * (_propositions/cartes_v10_2026-11-02/html/fam.js). Pour les tests du moteur et le rendu reel compare aux maquettes.
 */
import type { CarteData, DonneesSeance } from '@/lib/v2/cartes/types';

const seance = (s: Partial<DonneesSeance>): DonneesSeance => ({ dureeMin: 0, rounds: 0, series: 0, tonnage: 0, distanceKm: 0, fcMoy: 0, fcMax: 0, calories: 0, records: [], ...s });

const pts: [number, number][] = [[170, 660], [190, 560], [250, 490], [270, 400], [250, 300], [310, 210], [410, 170], [500, 200], [580, 150], [690, 140], [770, 200], [800, 290], [780, 380], [830, 450], [830, 550], [760, 630], [660, 650], [590, 720], [480, 740], [400, 700], [310, 720], [230, 710], [170, 660]];
const TRACE = { points: pts.map(([x, y]) => [(x - 170) / 660, (y - 140) / 600] as [number, number]), ratio: 660 / 600 };

export const FAM_MUSCU: CarteData = {
  moment: 'seance', titre: 'Séance push', sousTitre: 'Mardi 27 octobre', sport: 'Musculation', famille: 'muscu', cle: 't:muscu',
  seance: seance({ dureeMin: 72, series: 18, tonnage: 12500, meilleures: [{ nom: 'a', poids: 1, reps: 1 }, { nom: 'b', poids: 1, reps: 1 }, { nom: 'c', poids: 1, reps: 1 }, { nom: 'd', poids: 1, reps: 1 }, { nom: 'e', poids: 1, reps: 1 }, { nom: 'f', poids: 1, reps: 1 }],
    barres: [500, 500, 500, 500, 680, 680, 680, 900, 900, 900, 750, 750, 750, 675, 675, 720, 720, 720],
    muscles: { zones: ['pectoraux', 'epaules', 'bras'], groupes: [{ nom: 'Pectoraux', series: 8 }, { nom: 'Épaules', series: 6 }, { nom: 'Bras', series: 4 }] } }),
};
export const FAM_COURSE: CarteData = { moment: 'seance', titre: 'Course à pied', sousTitre: '', sport: 'Course à pied', famille: 'course', cle: 't:course', seance: seance({ dureeMin: 52, distanceKm: 10.4, trace: TRACE }) };
export const FAM_JJB: CarteData = {
  moment: 'seance', titre: 'Jiu-jitsu brésilien', sousTitre: '', sport: 'Jiu-jitsu brésilien', famille: 'combat', cle: 't:jjb',
  seance: seance({ dureeMin: 90, rounds: 8 }), ceintureJjb: { ceinture: 'bleue', degres: 2 },
};
export const FAM_MARCHE: CarteData = {
  moment: 'seance', titre: 'Marche inclinée', sousTitre: '', sport: 'Marche inclinée', famille: 'course', cle: 't:marche',
  seance: seance({ dureeMin: 30, distanceKm: 2.75, penteCardio: 10, vitesseCardio: 5.5, enZone2: true }),
};
export const FAM_RECORD: CarteData = {
  moment: 'exploit', titre: 'Nouveau record', sousTitre: '', cle: 't:record',
  exploit: { type: 'record_charge', date: '2026-10-27', surtitre: 'Nouveau record', hero: { value: '100', unit: 'kg' }, avant: { value: '95', unit: 'kg' }, accroche: 'Développé couché', record: true, priorite: 10, cotes: [] },
};
export const FAM_TRANSFO: CarteData = {
  moment: 'avant_apres', titre: 'Avant et après', sousTitre: '', cle: 't:aa',
  avantApres: { avant: { id: 'a', uri: 'avant.jpg', date: '2026-04-29', poids: 88.1 }, apres: { id: 'b', uri: 'apres.jpg', date: '2026-10-28', poids: 75 }, jours: 182 },
};
export const FAM_SEMAINE: CarteData = {
  moment: 'semaine', titre: 'Ma semaine', sousTitre: 'Du 26 octobre au 1er novembre', cle: 't:semaine', serie: { jours: 21, recordJours: 34, recordSemaines: 6 },
  semaine: {
    debut: '2026-10-26', jours: [true, true, false, true, true, true, false], seances: 5, minutes: 395, sports: [], poidsFin: null, poidsEcart: null, objectif: 4, kilos: 31200,
    parJour: [
      { sports: ['Musculation'], minutes: 75, statut: 'seance' }, { sports: ['Course à pied'], minutes: 52, statut: 'seance' }, { sports: [], minutes: 0, statut: 'repos' },
      { sports: ['Musculation'], minutes: 72, statut: 'seance' }, { sports: ['Jiu-jitsu brésilien'], minutes: 90, statut: 'seance' }, { sports: ['Musculation'], minutes: 106, statut: 'seance' },
      { sports: [], minutes: 0, statut: 'repos' },
    ],
  },
};
export const FAM_SERIE: CarteData = { ...FAM_SEMAINE, cle: 't:serie', exploit: { type: 'serie_semaines', date: '2026-11-01', surtitre: 'Objectif tenu', hero: { value: '6' }, accroche: '', priorite: 1 }, moment: 'exploit' };
export const FAM_ANNEE: CarteData = {
  moment: 'annee', titre: 'Mon année 2026', sousTitre: '2026', cle: 't:annee',
  periode: { type: 'annee', ref: '2026', debut: '2026-01-01', fin: '2026-11-01', enCours: true, seances: 222, minutes: 236 * 60, joursActifs: 200, sports: [], distanceKm: 486, tonnage: 1240000, rounds: 0, parSemaine: 4, semainesTenues: 0, semainesComptees: 0, precedent: 0, records: 14 },
};

/** Les 10 familles : nom, donnees, famille du moteur */
export const DIX_FAMILLES = [
  { nom: 'muscu', d: FAM_MUSCU, famille: 'muscu' },
  { nom: 'record', d: FAM_RECORD, famille: 'record' },
  { nom: 'course', d: FAM_COURSE, famille: 'course' },
  { nom: 'jjb', d: FAM_JJB, famille: 'jjb' },
  { nom: 'marche', d: FAM_MARCHE, famille: 'marche' },
  { nom: 'transfo', d: FAM_TRANSFO, famille: 'transfo' },
  { nom: 'muscles', d: FAM_MUSCU, famille: 'muscles' },
  { nom: 'semaine', d: FAM_SEMAINE, famille: 'semaine' },
  { nom: 'serie', d: FAM_SERIE, famille: 'serie' },
  { nom: 'annee', d: FAM_ANNEE, famille: 'annee' },
] as const;
