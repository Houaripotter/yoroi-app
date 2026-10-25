/**
 * Mon matériel (24 octobre 2026) : tu coches ce que tu as, chez toi ou à ta salle, et chaque exercice
 * que tu ne peux pas faire est remplacé par le plus proche que tu peux faire (même muscle, même geste
 * autant que possible). Table écrite à la main, pas de devinette : chaque remplaçant existe dans
 * constants/exerciseLibrary.ts (vérifié par __tests__/unit/programmes.test.ts).
 * Données pures, aucun import React Native.
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { traduire } from '@/lib/i18n/tr';
import type { ExoProgramme, JourProgramme } from './types';

export type Equipement =
  | 'halteres'
  | 'banc'
  | 'barre'
  | 'kettlebell'
  | 'traction'
  | 'poulie'
  | 'machines'
  | 'trap_bar'
  | 'elastiques'
  | 'accessoires';

export const EQUIPEMENTS: { id: Equipement; label: string; detail: string }[] = [
  { id: 'halteres', label: 'Haltères', detail: 'Une paire, réglable ou fixe' },
  { id: 'banc', label: 'Banc', detail: 'Plat ou inclinable' },
  { id: 'barre', label: 'Barre et disques', detail: 'Avec un rack pour le squat' },
  { id: 'kettlebell', label: 'Kettlebell', detail: 'Au moins une' },
  { id: 'traction', label: 'Barre de traction', detail: 'Ou une station de dips' },
  { id: 'poulie', label: 'Poulie', detail: 'Câbles, vis à vis' },
  { id: 'machines', label: 'Machines guidées', detail: 'Presse, leg curl, pec deck...' },
  { id: 'trap_bar', label: 'Trap bar', detail: 'La barre hexagonale' },
  { id: 'elastiques', label: 'Élastiques', detail: 'Bandes de résistance' },
  { id: 'accessoires', label: 'Petit matériel', detail: 'Roulette abdos, gripper, wrist roller' },
];

export const TOUT_LE_MATERIEL: Equipement[] = EQUIPEMENTS.map((e) => e.id);

/** Ce qu'il faut pour un exercice : une des combinaisons suffit ([[]] = rien du tout) */
type Besoin = Equipement[][];

type Remplacant = string | { nom: string; repsMin: number; repsMax: number; secondes?: boolean };

type Fiche = { besoin: Besoin; remplacants: Remplacant[] };

const RIEN: Besoin = [[]];
const GAINAGE: Remplacant = { nom: 'Gainage Planche', repsMin: 30, repsMax: 45, secondes: true };
const FERMIER: Remplacant = { nom: 'Farmer Walk', repsMin: 30, repsMax: 45, secondes: true };

/** Le matériel de chaque exercice qu'utilisent les programmes, et de leurs remplaçants */
const FICHES: Record<string, Fiche> = {
  // PECTORAUX
  'Développé Couché (Barre)': { besoin: [['barre', 'banc']], remplacants: ['Développé Couché (Haltères)', 'Chest Press (Machine)', 'Floor Press (Haltères)', 'Pompes (Poids du corps)'] },
  'Développé Couché (Haltères)': { besoin: [['halteres', 'banc']], remplacants: ['Développé Couché (Barre)', 'Chest Press (Machine)', 'Floor Press (Haltères)', 'Pompes (Poids du corps)'] },
  'Développé Incliné (Haltères)': { besoin: [['halteres', 'banc']], remplacants: ['Développé Incliné (Barre)', 'Chest Press Incliné (Machine)', 'Pompes Déclinées'] },
  'Développé Incliné (Barre)': { besoin: [['barre', 'banc']], remplacants: [] },
  'Chest Press (Machine)': { besoin: [['machines']], remplacants: [] },
  'Chest Press Incliné (Machine)': { besoin: [['machines']], remplacants: [] },
  'Floor Press (Haltères)': { besoin: [['halteres']], remplacants: ['Développé Couché (Haltères)', 'Pompes (Poids du corps)'] },
  'Dips (Focus Pectoraux)': { besoin: [['traction']], remplacants: ['Développé Couché (Haltères)', 'Pompes Déclinées'] },
  'Pec Deck (Butterfly)': { besoin: [['machines']], remplacants: ['Écartés à la Poulie Haute', 'Écartés Couché (Haltères)', 'Pompes (Poids du corps)'] },
  'Écartés à la Poulie Haute': { besoin: [['poulie']], remplacants: ['Pec Deck (Butterfly)', 'Écartés Couché (Haltères)', 'Pompes (Poids du corps)'] },
  'Écartés Couché (Haltères)': { besoin: [['halteres', 'banc']], remplacants: ['Écartés à la Poulie Haute', 'Pec Deck (Butterfly)', 'Pompes (Poids du corps)'] },
  'Pompes (Poids du corps)': { besoin: RIEN, remplacants: [] },
  'Pompes Déclinées': { besoin: RIEN, remplacants: [] },
  'Pompes Diamant': { besoin: RIEN, remplacants: [] },
  'Pike Push-ups': { besoin: RIEN, remplacants: [] },
  'Pull Over (Haltère)': { besoin: [['halteres', 'banc']], remplacants: [] },
  // DOS
  'Deadlift (Soulevé de terre)': { besoin: [['barre']], remplacants: ['Trap Bar Deadlift', 'Romanian Deadlift (Haltères)', 'Glute Bridge'] },
  'Trap Bar Deadlift': { besoin: [['trap_bar']], remplacants: ['Deadlift (Soulevé de terre)', 'Romanian Deadlift (Haltères)', 'Glute Bridge'] },
  'Deadlift Roumain': { besoin: [['barre']], remplacants: ['Romanian Deadlift (Haltères)', 'Glute Bridge'] },
  'Face Pull': { besoin: [['poulie'], ['elastiques']], remplacants: ['Oiseau Haltères (Rear Delts)', 'Oiseau Machine (Reverse Pec Deck)', 'Inverted Row'] },
  'Hyperextensions': { besoin: [['machines']], remplacants: ['Deadlift Roumain', 'Romanian Deadlift (Haltères)', 'Glute Bridge'] },
  'Inverted Row': { besoin: RIEN, remplacants: [] },
  'Pull Over Poulie Haute': { besoin: [['poulie']], remplacants: ['Pull Over (Haltère)', 'Tractions (Pronation)', 'Inverted Row'] },
  'Rowing Barre (Bent Over)': { besoin: [['barre']], remplacants: ['Rowing Haltère (One Arm)', 'Tirage Horizontal (Seated Row)', 'Inverted Row'] },
  'Rowing Haltère (One Arm)': { besoin: [['halteres'], ['kettlebell']], remplacants: ['Rowing Barre (Bent Over)', 'Tirage Horizontal (Seated Row)', 'Inverted Row'] },
  'Tirage Horizontal (Seated Row)': { besoin: [['poulie']], remplacants: ['Rowing Haltère (One Arm)', 'Rowing Barre (Bent Over)', 'Inverted Row'] },
  'Tirage Poitrine (Lat Pulldown)': { besoin: [['poulie']], remplacants: ['Tractions (Pronation)', 'Rowing Haltère (One Arm)', 'Inverted Row'] },
  'Tirage Serré (V-Bar)': { besoin: [['poulie']], remplacants: ['Tractions Neutres', 'Rowing Haltère (One Arm)', 'Inverted Row'] },
  'Tractions (Pronation)': { besoin: [['traction']], remplacants: ['Tirage Poitrine (Lat Pulldown)', 'Inverted Row'] },
  'Tractions Neutres': { besoin: [['traction']], remplacants: ['Tirage Serré (V-Bar)', 'Inverted Row'] },
  'Tractions (Supination)': { besoin: [['traction']], remplacants: [] },
  // ÉPAULES
  'Développé Haltères Assis': { besoin: [['halteres']], remplacants: ['Développé Militaire Assis', 'Pike Push-ups'] },
  'Développé Militaire (Barre)': { besoin: [['barre']], remplacants: ['Développé Haltères Assis', 'Pike Push-ups'] },
  'Développé Militaire Assis': { besoin: [['barre', 'banc']], remplacants: ['Développé Haltères Assis', 'Pike Push-ups'] },
  'Push Press': { besoin: [['barre']], remplacants: ['Développé Haltères Assis', 'Pike Push-ups'] },
  'Oiseau Haltères (Rear Delts)': { besoin: [['halteres']], remplacants: ['Face Pull', 'Oiseau Machine (Reverse Pec Deck)', 'Inverted Row'] },
  'Oiseau Machine (Reverse Pec Deck)': { besoin: [['machines']], remplacants: ['Oiseau Haltères (Rear Delts)', 'Face Pull', 'Inverted Row'] },
  'Shrugs Haltères (Trapèzes)': { besoin: [['halteres']], remplacants: ['Shrugs Barre (Trapèzes)', FERMIER] },
  'Shrugs Barre (Trapèzes)': { besoin: [['barre']], remplacants: [] },
  'Élévations Latérales (Haltères)': { besoin: [['halteres']], remplacants: ['Élévations Latérales (Poulie)', 'Pike Push-ups'] },
  'Élévations Latérales (Poulie)': { besoin: [['poulie']], remplacants: ['Élévations Latérales (Haltères)', 'Pike Push-ups'] },
  // BICEPS
  'Curl Barre EZ': { besoin: [['barre']], remplacants: ['Curl Haltères Alterné', 'Curl Poulie Basse', 'Tractions (Supination)', 'Inverted Row'] },
  'Curl Haltères Alterné': { besoin: [['halteres']], remplacants: ['Curl Barre EZ', 'Curl Poulie Basse', 'Tractions (Supination)', 'Inverted Row'] },
  'Curl Larry Scott (Pupitre)': { besoin: [['halteres', 'banc'], ['barre', 'banc'], ['machines']], remplacants: ['Curl Haltères Alterné', 'Curl Barre EZ', 'Curl Poulie Basse', 'Tractions (Supination)'] },
  'Curl Incliné (Haltères)': { besoin: [['halteres', 'banc']], remplacants: ['Curl Haltères Alterné', 'Curl Poulie Basse', 'Curl Barre EZ', 'Tractions (Supination)', 'Inverted Row'] },
  'Curl Marteau (Hammer)': { besoin: [['halteres'], ['kettlebell']], remplacants: ['Curl Barre EZ', 'Curl Poulie Basse', 'Tractions Neutres', 'Inverted Row'] },
  'Curl Poulie Basse': { besoin: [['poulie'], ['elastiques']], remplacants: [] },
  // TRICEPS
  'Barre au front (Skullcrusher)': { besoin: [['barre', 'banc']], remplacants: ['Extension Haltère Nuque (2 mains)', 'Extension Triceps Poulie (Corde)', 'Pompes Diamant'] },
  'Dips Banc': { besoin: RIEN, remplacants: [] },
  'Extension Haltère Nuque (2 mains)': { besoin: [['halteres'], ['kettlebell']], remplacants: ['Overhead Extension Poulie', 'Pompes Diamant'] },
  'Extension Triceps Poulie (Corde)': { besoin: [['poulie'], ['elastiques']], remplacants: ['Extension Haltère Nuque (2 mains)', 'Barre au front (Skullcrusher)', 'Pompes Diamant'] },
  'Overhead Extension Poulie': { besoin: [['poulie'], ['elastiques']], remplacants: ['Extension Haltère Nuque (2 mains)', 'Pompes Diamant'] },
  // JAMBES
  'Squat Barre Libre': { besoin: [['barre']], remplacants: ['Presse à Cuisses', 'Goblet Squat', 'Squat Bulgare'] },
  'Front Squat': { besoin: [['barre']], remplacants: ['Goblet Squat', 'Presse à Cuisses', 'Squat Bulgare'] },
  'Goblet Squat': { besoin: [['halteres'], ['kettlebell']], remplacants: ['Squat Bulgare'] },
  'Presse à Cuisses': { besoin: [['machines']], remplacants: ['Squat Barre Libre', 'Goblet Squat', 'Squat Bulgare'] },
  'Presse à Cuisses (Pieds Hauts)': { besoin: [['machines']], remplacants: ['Squat Barre Libre', 'Goblet Squat', 'Squat Bulgare'] },
  'Leg Extension': { besoin: [['machines']], remplacants: ['Goblet Squat', 'Split Squat'] },
  'Fentes Avant (Haltères)': { besoin: [['halteres'], ['kettlebell']], remplacants: ['Fentes Arrière'] },
  'Step Up (Haltères)': { besoin: [['halteres']], remplacants: ['Squat Bulgare'] },
  'Fentes Arrière': { besoin: RIEN, remplacants: [] },
  'Fentes Bulgares': { besoin: RIEN, remplacants: [] },
  'Fentes Marchées': { besoin: RIEN, remplacants: [] },
  'Split Squat': { besoin: RIEN, remplacants: [] },
  'Squat Bulgare': { besoin: RIEN, remplacants: [] },
  // ISCHIOS
  'Leg Curl Assis': { besoin: [['machines']], remplacants: ['Romanian Deadlift (Haltères)', 'Deadlift Roumain', 'Nordic Curl'] },
  // 25 octobre 2026, nuit : les nouveaux exercices animés de « Quoi faire ? »
  'Leg Curl Couché': { besoin: [['machines']], remplacants: ['Leg Curl Assis', 'Romanian Deadlift (Haltères)', 'Nordic Curl'] },
  'Hack Squat': { besoin: [['machines']], remplacants: ['Presse à Cuisses', 'Goblet Squat', 'Squat Bulgare'] },
  'Shoulder Press Machine': { besoin: [['machines']], remplacants: ['Développé Haltères Assis', 'Développé Militaire Assis', 'Pike Push-ups'] },
  'Élévations Frontales (Haltères)': { besoin: [['halteres']], remplacants: ['Développé Haltères Assis', 'Pike Push-ups'] },
  'Extension Triceps Poulie (Barre)': { besoin: [['poulie']], remplacants: ['Extension Triceps Poulie (Corde)', 'Extension Haltère Nuque (2 mains)', 'Pompes Diamant'] },
  'Curl Concentré': { besoin: [['halteres', 'banc'], ['halteres']], remplacants: ['Curl Haltères Alterné', 'Curl Marteau (Hammer)', 'Curl Poulie Basse'] },
  'Curl Machine': { besoin: [['machines']], remplacants: ['Curl Larry Scott (Pupitre)', 'Curl Haltères Alterné', 'Curl Poulie Basse'] },
  'Arnold Press': { besoin: [['halteres', 'banc'], ['halteres']], remplacants: ['Développé Haltères Assis', 'Développé Haltères Debout', 'Pike Push-ups'] },
  'Écartés Incliné (Haltères)': { besoin: [['halteres', 'banc']], remplacants: ['Écartés Couché (Haltères)', 'Pec Deck (Butterfly)', 'Pompes (Poids du corps)'] },
  'Good Morning': { besoin: [['barre']], remplacants: ['Romanian Deadlift (Haltères)', 'Hyperextensions', 'Kettlebell Swings'] },
  'Reverse Lunges': { besoin: [[]], remplacants: [] },
  'Kick-back Poulie': { besoin: [['poulie']], remplacants: ['Cable Kickback', 'Hip Thrust (Poids Corps)', 'Glute Bridge'] },
  'Curl Barre Droite': { besoin: [['barre']], remplacants: ['Curl Barre EZ', 'Curl Haltères Alterné', 'Curl Poulie Basse'] },
  'Skullcrusher Haltères': { besoin: [['halteres', 'banc']], remplacants: ['Extension Haltère Nuque (2 mains)', 'Extension Triceps Poulie (Corde)', 'Dips Banc'] },
  'Hanging Knee Raise': { besoin: [['traction']], remplacants: ['Relevé de jambes (Sol)', 'Crunch Abdominal', 'Dead Bug'] },
  'Développé Haltères Debout': { besoin: [['halteres']], remplacants: ['Développé Haltères Assis', 'Shoulder Press Machine', 'Pike Push-ups'] },
  'Rowing T-Bar': { besoin: [['barre']], remplacants: ['Rowing Barre (Bent Over)', 'Rowing Haltère (One Arm)', 'Tirage Horizontal (Seated Row)'] },
  'Cable Crunch': { besoin: [['poulie']], remplacants: ['Crunch Abdominal', 'Relevé de jambes (Sol)', 'Dead Bug'] },
  'Close Grip Bench Press': { besoin: [['barre', 'banc']], remplacants: ['Dips Banc', 'Pompes Diamant', 'Extension Triceps Poulie (Barre)'] },
  'Sumo Deadlift': { besoin: [['barre']], remplacants: ['Goblet Squat', 'Romanian Deadlift (Haltères)', 'Kettlebell Swings'] },
  'Tirage Menton (Upright Row)': { besoin: [['barre'], ['halteres']], remplacants: ['Élévations Latérales (Haltères)', 'Élévations Latérales (Poulie)', 'Shrugs Haltères (Trapèzes)'] },
  'Straight Arm Pulldown': { besoin: [['poulie']], remplacants: ['Pull Over Poulie Haute', 'Tirage Poitrine (Lat Pulldown)', 'Rowing Haltère (One Arm)'] },
  'Chest Supported Row': { besoin: [['halteres', 'banc']], remplacants: ['Rowing Haltère (One Arm)', 'Tirage Horizontal (Seated Row)', 'Inverted Row'] },
  'Mountain Climbers': { besoin: RIEN, remplacants: [] },
  'Donkey Kicks': { besoin: RIEN, remplacants: [] },
  'Sit-ups': { besoin: RIEN, remplacants: [] },
  'Romanian Deadlift (Haltères)': { besoin: [['halteres'], ['kettlebell']], remplacants: ['Deadlift Roumain', 'Nordic Curl'] },
  'Nordic Curl': { besoin: RIEN, remplacants: [] },
  // FESSIERS
  'Abducteurs Machine': { besoin: [['machines']], remplacants: ['Banded Walks', 'Fentes Arrière'] },
  'Banded Walks': { besoin: [['elastiques']], remplacants: [] },
  'Cable Kickback': { besoin: [['poulie']], remplacants: ['Single Leg Hip Thrust'] },
  'Hip Thrust Barre': { besoin: [['barre', 'banc']], remplacants: ['Hip Thrust Machine', 'Single Leg Hip Thrust', 'Hip Thrust (Poids Corps)'] },
  'Hip Thrust Machine': { besoin: [['machines']], remplacants: ['Hip Thrust Barre', 'Single Leg Hip Thrust'] },
  'Hip Thrust (Poids Corps)': { besoin: RIEN, remplacants: [] },
  'Single Leg Hip Thrust': { besoin: RIEN, remplacants: [] },
  'Glute Bridge': { besoin: RIEN, remplacants: [] },
  // MOLLETS
  'Mollets Debout (Machine)': { besoin: [['machines']], remplacants: ['Mollets Haltères (Debout)', 'Mollets Unilatéral'] },
  'Mollets Assis (Machine)': { besoin: [['machines']], remplacants: ['Mollets Haltères (Debout)', 'Mollets Unilatéral'] },
  'Mollets Haltères (Debout)': { besoin: [['halteres']], remplacants: [] },
  'Mollets Unilatéral': { besoin: RIEN, remplacants: [] },
  // ABDOS
  'Crunch Poulie Haute': { besoin: [['poulie']], remplacants: ['Crunch Abdominal'] },
  'Crunch Abdominal': { besoin: RIEN, remplacants: [] },
  'Dead Bug': { besoin: RIEN, remplacants: [] },
  'Landmine Rotation': { besoin: [['barre']], remplacants: ['Pallof Press', 'Russian Twist'] },
  'Russian Twist': { besoin: RIEN, remplacants: [] },
  'Pallof Press': { besoin: [['poulie'], ['elastiques']], remplacants: ['Dead Bug'] },
  'Relevé de jambes (Sol)': { besoin: RIEN, remplacants: [] },
  'Relevé de jambes Suspendu': { besoin: [['traction']], remplacants: ['Relevé de jambes (Sol)'] },
  'Roulette Abdos (Abs Wheel)': { besoin: [['accessoires']], remplacants: [GAINAGE] },
  'Gainage Planche': { besoin: RIEN, remplacants: [] },
  'Gainage Latéral': { besoin: RIEN, remplacants: [] },
  'Bird Dog': { besoin: RIEN, remplacants: [] },
  'Copenhagen Plank': { besoin: RIEN, remplacants: [] },
  'Box Jumps': { besoin: RIEN, remplacants: [] },
  'Single Leg Deadlift': { besoin: RIEN, remplacants: [] },
  'Cou Isométrique (4 directions)': { besoin: RIEN, remplacants: [] },
  'Cou Élastique (4 directions)': { besoin: [['elastiques']], remplacants: [{ nom: 'Cou Isométrique (4 directions)', repsMin: 10, repsMax: 20, secondes: true }] },
  'Rotation Externe (Élastique)': { besoin: [['elastiques'], ['poulie']], remplacants: [] },
  // AVANT-BRAS
  'Dead Hang': { besoin: [['traction']], remplacants: [FERMIER] },
  'Farmer Walk': { besoin: [['halteres'], ['kettlebell'], ['trap_bar']], remplacants: [] },
  'Extension Poignets': { besoin: [['halteres']], remplacants: [] },
  'Gripper / Hand Grip': { besoin: [['accessoires']], remplacants: [FERMIER] },
  'Wrist Roller': { besoin: [['accessoires']], remplacants: ['Extension Poignets'] },
  // CHAÎNE POSTÉRIEURE
  'Kettlebell Swings': { besoin: [['kettlebell']], remplacants: ['Romanian Deadlift (Haltères)', 'Hip Thrust (Poids Corps)'] },
};

export const nomsAvecFiche = (): string[] => Object.keys(FICHES);
export const remplacantsDe = (nom: string): string[] =>
  (FICHES[nom]?.remplacants ?? []).map((r) => (typeof r === 'string' ? r : r.nom));

/** Faisable avec ce matériel ? Un exercice sans fiche est considéré faisable (on ne retire rien par erreur). */
export function faisable(nom: string, dispo: readonly Equipement[]): boolean {
  const f = FICHES[nom];
  if (!f) return true;
  return f.besoin.some((combo) => combo.every((e) => dispo.includes(e)));
}

const sansMateriel = (nom: string): boolean => (FICHES[nom]?.besoin ?? []).some((c) => c.length === 0);

const muscleDe = (nom: string): string | undefined => EXERCISE_LIBRARY.find((e) => e.name === nom)?.muscle;

export type ExoAdapte = ExoProgramme & {
  /** nom de l'exercice prévu par le programme, quand il a été remplacé */
  remplace?: string;
  /** aucun remplaçant possible avec ce matériel : l'exercice reste affiché tel quel */
  impossible?: boolean;
};

/** L'exercice prevu, remplace par `nom` (un de ses remplacants) : meme series et repos, fourchette adaptee */
export function remplacerPar(exo: ExoProgramme, nom: string): ExoAdapte {
  const r = (FICHES[exo.nom]?.remplacants ?? []).find((x) => (typeof x === 'string' ? x : x.nom) === nom) ?? nom;
  const adapte: ExoAdapte = {
    ...exo,
    nom,
    muscle: muscleDe(nom) ?? exo.muscle,
    remplace: exo.nom,
    poidsDuCorps: sansMateriel(nom) || undefined,
    secondes: undefined,
  };
  if (typeof r !== 'string') {
    adapte.repsMin = r.repsMin;
    adapte.repsMax = r.repsMax;
    adapte.secondes = r.secondes || undefined;
  } else if (exo.secondes) {
    // un exercice tenu remplace par un exercice en repetitions : une fourchette classique
    adapte.repsMin = 8;
    adapte.repsMax = 12;
  }
  return adapte;
}

/** L'exercice tel que tu peux le faire avec ce matériel */
export function adapterExo(exo: ExoProgramme, dispo: readonly Equipement[]): ExoAdapte {
  if (faisable(exo.nom, dispo)) return exo;
  const nom = remplacantsDe(exo.nom).find((n) => faisable(n, dispo));
  return nom ? remplacerPar(exo, nom) : { ...exo, impossible: true };
}

/** Le jour du programme avec ton matériel (null : matériel non renseigné, rien ne change) */
export function adapterJour<J extends JourProgramme>(jour: J, dispo: readonly Equipement[] | null): Omit<J, 'exos'> & { exos: ExoAdapte[] } {
  if (!dispo) return jour;
  return { ...jour, exos: jour.exos.map((e) => adapterExo(e, dispo)) };
}

/** Ce qui manque pour l'exercice prévu, en clair : « Sans banc », « Sans poulie ni élastiques » */
export function raisonRemplacement(nomPrevu: string, dispo: readonly Equipement[]): string {
  const f = FICHES[nomPrevu];
  if (!f) return '';
  const manques = f.besoin.map((c) => c.filter((e) => !dispo.includes(e)));
  const plusCourt = manques.sort((a, b) => a.length - b.length)[0] ?? [];
  const tous = f.besoin.length > 1 ? Array.from(new Set(manques.flat())) : plusCourt;
  // deja traduit : « Sans barre et disques », « Without barbell and plates » (en francais, le materiel en minuscules)
  const noms = tous.map((id) => {
    const fr = EQUIPEMENTS.find((e) => e.id === id)?.label ?? id;
    const t = traduire(fr);
    return t === fr ? fr.toLowerCase() : t;
  });
  if (!noms.length) return '';
  if (noms.length === 1) return traduire('Sans {0}', noms[0]);
  if (noms.length === 2) return traduire('Sans {0} ni {1}', noms[0], noms[1]);
  return traduire('Sans {0}', noms.join(', '));
}

/** Barre olympique de 20 kg (calcul des disques) : exercices dont toute fiche demande la barre, hors barre EZ et landmine */
const PAS_OLYMPIQUE = new Set(['Curl Barre EZ', 'Barre au front (Skullcrusher)', 'Landmine Rotation']);
export function barreOlympique(nom: string): boolean {
  if (PAS_OLYMPIQUE.has(nom)) return false;
  const f = FICHES[nom];
  if (f) return f.besoin.every((combo) => combo.includes('barre'));
  return /\(Barre\)/.test(nom);
}
