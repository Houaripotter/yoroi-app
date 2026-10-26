/**
 * Douleurs declarees (24 octobre 2026) : si tu as signale une zone dans l'infirmerie (blessure active ou en
 * guerison), les exercices qui la sollicitent beaucoup sont remplaces par une variante qui la menage, ou signales.
 * Ce n'est ni un diagnostic ni un soin : une table prudente ecrite a la main, et toujours le conseil de demander
 * l'avis d'un professionnel si la douleur dure. Meme moteur de remplacement que « Mon materiel » (./materiel.ts).
 * Donnees pures, testees dans __tests__/unit/blessures.test.ts.
 */
import { adapterExo, faisable, remplacantsDe, remplacerPar } from './materiel';
import type { Equipement, ExoAdapte, MachinesSalle } from './materiel';
import type { ExoProgramme, JourProgramme } from './types';

export type Region = 'epaule' | 'coude' | 'poignet' | 'dos_bas' | 'genou' | 'cheville' | 'ischios' | 'hanche' | 'cou' | 'mollet';

export const LIBELLE_REGION: Record<Region, string> = {
  epaule: 'l’épaule',
  coude: 'le coude',
  poignet: 'le poignet ou la main',
  dos_bas: 'le bas du dos',
  genou: 'le genou',
  cheville: 'la cheville ou le pied',
  ischios: 'l’arrière de la cuisse',
  hanche: 'la hanche ou l’aine',
  cou: 'le cou',
  mollet: 'le mollet',
};

/** Zone de l'infirmerie (constants/bodyZones.ts) vers region articulaire */
export function regionDeZone(zoneId: string): Region | null {
  const z = zoneId.replace(/_(l|r)$/, '').replace(/_back$/, '');
  const table: Record<string, Region> = {
    shoulder: 'epaule', scapula: 'epaule', arm: 'epaule',
    elbow: 'coude', forearm: 'coude',
    wrist: 'poignet', hand: 'poignet', fingers: 'poignet', thumb: 'poignet',
    spine_lower: 'dos_bas',
    knee: 'genou', thigh: 'genou',
    ankle: 'cheville', foot: 'cheville', heel: 'cheville', toes: 'cheville', shin: 'cheville',
    hamstring: 'ischios',
    glute: 'hanche', pubis: 'hanche',
    neck: 'cou',
    calf: 'mollet',
  };
  return table[z] ?? null;
}

const R = (...r: Region[]) => r;
const PRESSES = R('epaule', 'coude', 'poignet');
/** Les regions que chaque exercice sollicite fortement (exercices absents : aucune) */
const SOLLICITE: Record<string, Region[]> = {
  'Développé Couché (Barre)': PRESSES, 'Développé Couché (Haltères)': PRESSES, 'Développé Incliné (Haltères)': PRESSES,
  'Développé Incliné (Barre)': PRESSES, 'Chest Press (Machine)': R('epaule', 'coude'), 'Chest Press Incliné (Machine)': R('epaule', 'coude'),
  'Floor Press (Haltères)': R('coude', 'poignet'), 'Dips (Focus Pectoraux)': PRESSES, 'Pec Deck (Butterfly)': R('epaule'),
  'Écartés à la Poulie Haute': R('epaule'), 'Écartés Couché (Haltères)': R('epaule'), 'Pompes (Poids du corps)': PRESSES,
  'Pompes Déclinées': PRESSES, 'Pompes Diamant': PRESSES, 'Pike Push-ups': PRESSES, 'Pull Over (Haltère)': R('epaule'),
  'Pull Over Poulie Haute': R('epaule'), 'Développé Haltères Assis': PRESSES, 'Développé Militaire (Barre)': PRESSES,
  'Développé Militaire Assis': PRESSES, 'Push Press': R('epaule', 'coude', 'poignet', 'dos_bas'), 'Élévations Latérales (Haltères)': R('epaule'),
  'Élévations Latérales (Poulie)': R('epaule'), 'Tractions (Pronation)': R('epaule', 'coude'), 'Tractions Neutres': R('epaule', 'coude'),
  'Tractions (Supination)': R('epaule', 'coude'), 'Tirage Poitrine (Lat Pulldown)': R('epaule'), 'Tirage Serré (V-Bar)': R('epaule'),
  'Relevé de jambes Suspendu': R('epaule', 'poignet'), 'Dead Hang': R('epaule', 'poignet'), 'Overhead Extension Poulie': R('epaule', 'coude'),
  'Extension Haltère Nuque (2 mains)': R('epaule', 'coude'), 'Barre au front (Skullcrusher)': R('coude'), 'Extension Triceps Poulie (Corde)': R('coude'),
  'Dips Banc': R('epaule', 'coude', 'poignet'), 'Curl Barre EZ': R('coude', 'poignet'), 'Curl Haltères Alterné': R('coude'),
  'Curl Incliné (Haltères)': R('coude', 'epaule'), 'Curl Marteau (Hammer)': R('coude'), 'Curl Poulie Basse': R('coude'),
  'Gripper / Hand Grip': R('poignet'), 'Wrist Roller': R('poignet', 'coude'), 'Extension Poignets': R('poignet', 'coude'),
  'Farmer Walk': R('poignet'), 'Roulette Abdos (Abs Wheel)': R('dos_bas', 'epaule'), 'Shrugs Haltères (Trapèzes)': R('cou'),
  'Shrugs Barre (Trapèzes)': R('cou'), 'Landmine Rotation': R('dos_bas', 'epaule'), 'Russian Twist': R('dos_bas'),
  'Deadlift (Soulevé de terre)': R('dos_bas', 'ischios', 'poignet'), 'Trap Bar Deadlift': R('dos_bas', 'genou'), 'Deadlift Roumain': R('dos_bas', 'ischios'),
  'Romanian Deadlift (Haltères)': R('dos_bas', 'ischios'), 'Good Morning': R('dos_bas', 'ischios'), 'Rowing Barre (Bent Over)': R('dos_bas'),
  'Hyperextensions': R('dos_bas'), 'Kettlebell Swings': R('dos_bas', 'ischios'), 'Squat Barre Libre': R('genou', 'dos_bas', 'cou'),
  'Front Squat': R('genou', 'poignet'), 'Goblet Squat': R('genou'), 'Presse à Cuisses': R('genou'), 'Presse à Cuisses (Pieds Hauts)': R('genou', 'hanche'),
  'Leg Extension': R('genou'), 'Fentes Avant (Haltères)': R('genou', 'cheville'), 'Fentes Arrière': R('genou', 'cheville'), 'Fentes Marchées': R('genou', 'cheville'),
  'Fentes Bulgares': R('genou', 'cheville'), 'Split Squat': R('genou', 'cheville'), 'Squat Bulgare': R('genou', 'cheville'), 'Step Up (Haltères)': R('genou', 'cheville'),
  'Leg Curl Assis': R('ischios'), 'Nordic Curl': R('ischios', 'genou'), 'Abducteurs Machine': R('hanche'), 'Banded Walks': R('hanche'),
  'Cable Kickback': R('hanche'), 'Mollets Debout (Machine)': R('mollet', 'cheville'), 'Mollets Assis (Machine)': R('mollet', 'cheville'),
  'Mollets Haltères (Debout)': R('mollet', 'cheville'), 'Mollets Unilatéral': R('mollet', 'cheville'),
  'Copenhagen Plank': R('hanche'), 'Box Jumps': R('genou', 'cheville'), 'Single Leg Deadlift': R('ischios', 'cheville'),
  'Cou Isométrique (4 directions)': R('cou'), 'Cou Élastique (4 directions)': R('cou'), 'Rotation Externe (Élastique)': R('epaule'),
};

export const regionsDe = (nom: string): Region[] => SOLLICITE[nom] ?? [];
const touche = (nom: string, regions: readonly Region[]) => regionsDe(nom).some((r) => regions.includes(r));

export type ExoProtege = ExoAdapte & {
  /** la zone menagee quand l'exercice a ete remplace ou signale a cause d'une douleur declaree */
  zone?: Region;
};

/** Materiel puis douleurs : l'exercice tel que tu peux le faire sans charger une zone que tu as declaree */
export function proteger(exo: ExoProgramme, dispo: readonly Equipement[] | null, regions: readonly Region[], machines?: MachinesSalle): ExoProtege {
  const base: ExoAdapte = dispo ? adapterExo(exo, dispo, machines) : exo;
  if (!regions.length || !touche(base.nom, regions)) return base;
  const zone = regionsDe(base.nom).find((r) => regions.includes(r))!;
  const ok = (n: string) => (!dispo || faisable(n, dispo, machines)) && !touche(n, regions);
  const nom = remplacantsDe(exo.nom).find(ok);
  if (nom) return { ...remplacerPar(exo, nom), zone };
  return { ...base, impossible: true, zone };
}

export function protegerJour<J extends JourProgramme>(jour: J, dispo: readonly Equipement[] | null, regions: readonly Region[], machines?: MachinesSalle): Omit<J, 'exos'> & { exos: ExoProtege[] } {
  if (!dispo && !regions.length) return jour;
  return { ...jour, exos: jour.exos.map((e) => proteger(e, dispo, regions, machines)) };
}

/** Regions des blessures actives ou en guerison, sans doublon */
export function regionsDesBlessures(blessures: { zone_id: string; status?: string }[]): Region[] {
  const out = new Set<Region>();
  for (const b of blessures) {
    if (b.status && b.status !== 'active' && b.status !== 'healing') continue;
    const r = regionDeZone(b.zone_id);
    if (r) out.add(r);
  }
  return [...out];
}
