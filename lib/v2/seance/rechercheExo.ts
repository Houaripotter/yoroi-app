/**
 * Recherche d'exercice de musculation (16 octobre).
 * La bibliotheque de l'app melange noms francais et anglais : on affiche le nom francais quand il existe,
 * et la recherche trouve l'exercice par son nom francais, son nom anglais, les mots dits en salle
 * (developpe couche = bench press, souleve de terre = deadlift, tirage = pulldown...) et le muscle.
 * Sans accents ni majuscules, des la premiere lettre, meilleurs resultats d'abord. Donnees pures, testees
 * dans __tests__/unit/rechercheExo.test.ts.
 */
import { EXOS } from './lexique';
import { traduire, LANG } from '@/lib/i18n/tr';

/* ------------------------------------------------------------------ */
/* Noms francais des exercices nommes en anglais dans la bibliotheque   */
/* ------------------------------------------------------------------ */

/** cle : nom exact de constants/exerciseLibrary.ts ; ce qui n'est pas ici garde son nom */
export const NOMS_FR: Record<string, string> = {
  // 24 octobre 2026, Houari : « y a des exercices je sais pas c'est quoi » : un nom français clair, le nom de salle entre parenthèses
  'Farmer Walk': 'Marche du fermier (farmer walk)',
  'Dead Hang': 'Suspension à la barre (dead hang)',
  'Leg Extension': 'Extension des jambes (leg extension)',
  'Face Pull': 'Tirage vers le visage (face pull)',
  'Goblet Squat': 'Squat gobelet (goblet squat)',
  'Dead Bug': 'Gainage dos au sol (dead bug)',
  'Pallof Press': 'Gainage anti-rotation à la poulie (Pallof press)',
  'Pec Deck (Butterfly)': 'Écartés machine (pec deck)',
  // pectoraux
  'Chest Press (Machine)': 'Développé assis machine (chest press)',
  'Chest Press Incliné (Machine)': 'Développé incliné machine',
  'Landmine Press': 'Développé landmine',
  'Floor Press (Haltères)': 'Développé au sol (haltères)',
  'Pull Over (Haltère)': 'Pull-over (haltère)',
  'Bench Press Pause': 'Développé couché marqué (pause)',
  'Spoto Press': 'Développé Spoto',
  'Larsen Press': 'Développé Larsen',
  'Guillotine Press': 'Développé guillotine',
  'Svend Press': 'Développé Svend',
  'Hex Press': 'Développé hex (haltères serrés)',
  'Cable Crossover': 'Écartés vis-à-vis (poulies)',
  'Incline Cable Fly': 'Écartés incliné à la poulie',
  'Deficit Push-ups': 'Pompes en déficit',
  'Pike Push-ups': 'Pompes piquées (pike)',
  'Archer Push-ups': 'Pompes archer',
  // dos
  'Deadlift (Soulevé de terre)': 'Soulevé de terre (deadlift)',
  'Deadlift Roumain': 'Soulevé de terre roumain',
  'Deadlift Sumo': 'Soulevé de terre sumo',
  'Pull Over Poulie Haute': 'Pull-over poulie haute',
  'Low Row Machine': 'Tirage bas machine',
  'Seal Row': 'Rowing allongé (seal row)',
  'Meadows Row': 'Rowing Meadows',
  'Hyperextensions': 'Extensions lombaires (hyperextensions)',
  'Snatch Grip Deadlift': 'Soulevé de terre prise large',
  'Jefferson Deadlift': 'Soulevé de terre Jefferson',
  'Trap Bar Deadlift': 'Soulevé de terre trap bar',
  'Deficit Deadlift': 'Soulevé de terre en déficit',
  'Block Pull': 'Soulevé de terre sur blocs',
  'Rack Pull': 'Soulevé partiel au rack (rack pull)',
  'Kroc Row': 'Rowing Kroc',
  'Helms Row': 'Rowing Helms',
  'Chest Supported Row': 'Rowing poitrine appuyée',
  'Inverted Row': 'Tirage inversé (australien)',
  'Ring Row': 'Tirage aux anneaux',
  'Meadows Row (Landmine)': 'Rowing Meadows (landmine)',
  'Single Arm Lat Pulldown': 'Tirage vertical à un bras',
  'Straight Arm Pulldown': 'Tirage bras tendus',
  // epaules
  'Arnold Press': 'Développé Arnold',
  'Push Press': 'Développé poussé (push press)',
  'Shoulder Press Machine': 'Développé épaules machine',
  'Facepull Poulie': 'Face pull poulie',
  'Lu Raises': 'Élévations Lu',
  'Y Raises': 'Élévations en Y',
  'Cuban Press': 'Développé cubain',
  'Bradford Press': 'Développé Bradford',
  'Z-Press': 'Développé Z (assis au sol)',
  'Viking Press': 'Développé viking',
  'Landmine Press (Épaules)': 'Développé landmine (épaules)',
  'Cable Lateral Raise': 'Élévations latérales à la poulie',
  'Leaning Lateral Raise': 'Élévation latérale penchée',
  'Prone Y Raise': 'Élévations en Y allongé',
  'Prone T Raise': 'Élévations en T allongé',
  'Prone W Raise': 'Élévations en W allongé',
  'Behind Neck Press': 'Développé nuque',
  'Machine Lateral Raise': 'Élévations latérales machine',
  'Scott Press': 'Développé Scott',
  'Bus Driver': 'Volant (bus driver)',
  'Push Jerk': 'Jeté poussé (push jerk)',
  'Split Jerk': 'Jeté fendu (split jerk)',
  // bras
  'Drag Curl': 'Curl drag',
  'Reverse Curl (Avant-bras)': 'Curl inversé (avant-bras)',
  'Skullcrusher Haltères': 'Barre au front haltères',
  'Close Grip Bench Press': 'Développé couché prise serrée',
  'Triceps Machine': 'Machine à triceps',
  'Diamond Push-ups': 'Pompes diamant',
  'Overhead Extension Poulie': 'Extension triceps poulie au-dessus de la tête',
  'Spider Curl': 'Curl spider',
  'Cable Curl': 'Curl à la poulie',
  'Bayesian Curl': 'Curl bayésien (poulie)',
  'Cross Body Curl': 'Curl croisé',
  'Waiter Curl': 'Curl serveur',
  'Prone Incline Curl': 'Curl allongé incliné',
  'Overhead Triceps Extension': 'Extension triceps au-dessus de la tête',
  'Cable Overhead Extension': 'Extension triceps poulie au-dessus de la tête',
  'Single Arm Pushdown': 'Extension triceps poulie à un bras',
  'Reverse Grip Pushdown': 'Extension triceps poulie prise inversée',
  'Rolling Triceps Extension': 'Extension triceps roulée',
  'French Press': 'Extension nuque (french press)',
  'Gripper / Hand Grip': 'Pince de main (hand grip)',
  'Wrist Roller': 'Rouleau de poignets',
  // jambes
  'Front Squat': 'Squat avant (front squat)',
  'Pendulum Squat': 'Squat pendulaire',
  'Smith Machine Squat': 'Squat à la barre guidée (smith)',
  'Step Up (Haltères)': 'Montées sur banc (haltères)',
  'Box Squat': 'Squat sur box',
  'Safety Bar Squat': 'Squat safety bar',
  'Belt Squat': 'Squat à la ceinture',
  'Anderson Squat': 'Squat Anderson (départ bas)',
  'Pause Squat': 'Squat marqué (pause)',
  'Pin Squat': 'Squat sur goupilles',
  'Single Leg Press': 'Presse à une jambe',
  'Leg Press (Narrow)': 'Presse à cuisses pieds serrés',
  'Leg Press (Wide)': 'Presse à cuisses pieds écartés',
  'Split Squat': 'Squat fendu',
  'Cyclist Squat': 'Squat cycliste',
  'Spanish Squat': 'Squat espagnol',
  'Reverse Nordic': 'Nordic inversé',
  'Leg Extension (Single)': 'Leg extension à une jambe',
  'Air Squat': 'Squat au poids du corps',
  'Pistol Squat': 'Squat pistol',
  'Pistols': 'Squat pistol',
  'Shrimp Squat': 'Squat crevette',
  'Overhead Squat': 'Squat bras tendus (overhead squat)',
  'Front Squat (CrossFit)': 'Squat avant (CrossFit)',
  'Front Rack Lunge': 'Fentes barre devant',
  'Overhead Walking Lunge': 'Fentes marchées bras tendus',
  'Barbell Step-ups': 'Montées sur banc (barre)',
  // ischios
  'Romanian Deadlift (Haltères)': 'Soulevé de terre roumain (haltères)',
  'Single Leg Deadlift': 'Soulevé de terre sur une jambe',
  'Swiss Ball Leg Curl': 'Leg curl au swiss ball',
  'Slider Leg Curl': 'Leg curl glissé',
  'Seated Leg Curl': 'Leg curl assis',
  'Lying Leg Curl (Single)': 'Leg curl couché à une jambe',
  'Hip Hinge Machine': 'Machine charnière de hanche',
  'B-Stance RDL': 'Soulevé de terre roumain décalé',
  'Stiff Leg Deadlift': 'Soulevé de terre jambes tendues',
  // fessiers
  'Single Leg Hip Thrust': 'Hip thrust sur une jambe',
  'Glute Bridge': 'Pont fessier',
  'Clamshells': 'Ouverture de hanche (clamshell)',
  'Sumo Deadlift': 'Soulevé de terre sumo',
  'Cable Pull Through': 'Pull through à la poulie',
  'Banded Walks': 'Marche avec élastique',
  'Reverse Lunges': 'Fentes arrière',
  'Curtsy Lunges': 'Fentes croisées',
  'B-Stance Hip Thrust': 'Hip thrust décalé',
  'Kas Glute Bridge': 'Pont fessier Kas',
  'Cable Kickback': 'Kick-back à la poulie',
  'Standing Kickback': 'Kick-back debout',
  'Monster Walk': 'Marche monstre (élastique)',
  'Lateral Band Walk': 'Pas chassés avec élastique',
  'Smith Machine Hip Thrust': 'Hip thrust à la barre guidée',
  // mollets
  'Donkey Calf Raise': 'Mollets donkey',
  'Tibialis Raise': 'Relevés de tibias',
  'Standing Calf Raise': 'Mollets debout',
  'Single Leg Calf Raise': 'Mollets à une jambe',
  'Leg Press Calf Raise': 'Mollets à la presse',
  'Seated Calf Raise': 'Mollets assis',
  // abdos
  'Sit-ups': 'Redressements assis (sit-ups)',
  'Bicycle Crunches': 'Crunch vélo',
  'Windshield Wipers': 'Essuie-glaces',
  'Cable Crunch': 'Crunch à la poulie',
  'Decline Crunch': 'Crunch décliné',
  'Hanging Knee Raise': 'Relevé de genoux suspendu',
  'Captain Chair': 'Chaise romaine',
  'Ab Rollout': 'Roue abdominale (rollout)',
  'Ab Machine': 'Machine à abdos',
  'Landmine Rotation': 'Rotation landmine',
  'Side Bend': 'Flexion latérale',
  'GHD Sit-ups': 'Sit-ups au GHD',
  'GHD Hip Extensions': 'Extensions de hanche au GHD',
  // poids du corps, gymnastique
  'Bar Muscle Up': 'Muscle up à la barre',
  'Ring Muscle Up': 'Muscle up aux anneaux',
  'Muscle-ups (Ring)': 'Muscle up aux anneaux',
  'Muscle-ups (Bar)': 'Muscle up à la barre',
  'Strict Muscle Up': 'Muscle up strict',
  'Handstand Push-ups': 'Pompes en équilibre',
  'HSPU Wall': 'Pompes en équilibre au mur',
  'Handstand Push-ups (Strict)': 'Pompes en équilibre strictes',
  'Handstand Push-ups (Kipping)': 'Pompes en équilibre kipping',
  'Deficit HSPU': 'Pompes en équilibre en déficit',
  'One Arm Pull-up': 'Traction à un bras',
  'One Arm Push-up': 'Pompe à un bras',
  'Pull-ups (Kipping)': 'Tractions kipping',
  'L Pull-up': 'Tractions en L',
  'Chest to Bar': 'Tractions poitrine à la barre (chest to bar)',
  'Burpee Pull-ups': 'Burpees tractions',
  'Ring Dips': 'Dips aux anneaux',
  'Strict Ring Dip': 'Dips aux anneaux stricts',
  'Rope Climb': 'Montée de corde',
  'Rope Climb (Legless)': 'Montée de corde sans les jambes',
  'Legless Rope Climb': 'Montée de corde sans les jambes',
  // haltero, crossfit
  'Kettlebell Swings': 'Swing kettlebell',
  'Box Jumps': 'Sauts sur box',
  'Burpee Box Jumps': 'Burpees sauts sur box',
  'Double Unders': 'Double sauts à la corde',
  'Clean & Jerk': 'Épaulé-jeté',
  'Snatch': 'Arraché',
  'Power Clean': 'Épaulé en puissance (power clean)',
  'Hang Clean': 'Épaulé suspendu (hang clean)',
  'Power Snatch': 'Arraché en puissance',
  'Hang Snatch': 'Arraché suspendu',
  'Turkish Get-up': 'Relevé turc (turkish get-up)',
  'KB Snatch': 'Arraché kettlebell',
  'KB Clean': 'Épaulé kettlebell',
  'Dumbbell Snatch': 'Arraché haltère',
  'Dumbbell Clean & Jerk': 'Épaulé-jeté haltère',
  'Med Ball Clean': 'Épaulé médecine-ball',
  'Sumo Deadlift High Pull': 'Soulevé de terre sumo tirage haut',
  'Squat Clean': 'Épaulé en flexion (squat clean)',
  'Squat Snatch': 'Arraché en flexion (squat snatch)',
  'Hang Squat Clean': 'Épaulé suspendu en flexion',
  'Hang Squat Snatch': 'Arraché suspendu en flexion',
  'Clean Pull': 'Tirage d’épaulé',
  'Snatch Pull': 'Tirage d’arraché',
  'Clean High Pull': 'Tirage haut d’épaulé',
  'Snatch High Pull': 'Tirage haut d’arraché',
  'Snatch Grip Push Press': 'Développé poussé prise arraché',
  'Barbell Muscle Clean': 'Épaulé musculaire',
  'Barbell Muscle Snatch': 'Arraché musculaire',
  'Row (Cal)': 'Rameur (calories)',
};

/** nom affiche d'un exercice de la bibliotheque : le francais quand on l'a, sinon le nom tel quel */
export function nomFr(name: string): string {
  return NOMS_FR[name] ?? name;
}

/* ------------------------------------------------------------------ */
/* Pliage du texte et synonymes                                         */
/* ------------------------------------------------------------------ */

/** minuscules, sans accents, ponctuation en espaces */
export function plier(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** un mot sans son s ou x final : « pompes » trouve « pompe », « halteres » trouve « haltere » */
function racine(w: string): string {
  return w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w;
}

function mots(s: string): string[] {
  return plier(s).split(' ').filter(Boolean).map(racine);
}

const PETITS = new Set(['a', 'au', 'aux', 'la', 'le', 'les', 'de', 'des', 'du', 'd', 'l', 'en', 'et', 'the', 'avec', 'sur', 'un', 'une']);

/**
 * Groupes de mots qui se valent en salle. Quand un exercice contient l'une des formes,
 * il est aussi trouve par toutes les autres.
 */
const SYNONYMES: string[][] = [
  ['developpe couche', 'bench press', 'bench', 'banc plat'],
  ['developpe', 'press', 'presse epaule'],
  ['developpe militaire', 'military press', 'overhead press', 'ohp'],
  ['souleve de terre', 'deadlift', 'sdt', 'souleve'],
  ['roumain', 'romanian', 'rdl'],
  ['jambes tendues', 'stiff leg'],
  ['tirage vertical', 'tirage poitrine', 'lat pulldown', 'pulldown', 'pull down'],
  ['tirage', 'pulldown', 'row'],
  ['tirage horizontal', 'tirage assis', 'tirage bas', 'seated row', 'low row', 'rowing assis'],
  ['rowing', 'row'],
  ['rowing menton', 'tirage menton', 'upright row'],
  ['tractions', 'traction', 'pull up', 'pullup', 'chin up', 'barre fixe'],
  ['pompes', 'pompe', 'push up', 'pushup'],
  ['ecarte', 'ecartes', 'fly', 'crossover', 'cross over', 'pec deck', 'butterfly', 'vis a vis'],
  ['elevation', 'elevations', 'raise'],
  ['elevations laterales', 'lateral raise'],
  ['fentes', 'fente', 'lunge'],
  ['mollets', 'mollet', 'calf'],
  ['halteres', 'haltere', 'dumbbell', 'db'],
  ['barre', 'barbell'],
  ['poulie', 'cable'],
  ['fessiers', 'fessier', 'glute', 'glutes'],
  ['pont fessier', 'glute bridge', 'releve de bassin', 'hip thrust'],
  ['ischios', 'ischio', 'hamstring', 'leg curl', 'curl ischio'],
  ['leg extension', 'extension quadriceps', 'extension des jambes', 'chaise'],
  ['presse a cuisses', 'presse cuisses', 'leg press', 'presse'],
  ['abdos', 'abdo', 'abdominaux', 'abs', 'ab', 'sangle'],
  ['epaules', 'epaule', 'shoulder', 'deltoide', 'delt', 'deltoides'],
  ['pectoraux', 'pecto', 'pecs', 'pec', 'chest', 'poitrine', 'pectoral'],
  ['dos', 'back', 'lat', 'dorsaux', 'dorsal', 'grand dorsal'],
  ['cuisses', 'cuisse', 'quadriceps', 'quadri', 'quads', 'jambes', 'jambe', 'leg', 'legs'],
  ['trapezes', 'trapeze', 'shrugs', 'shrug', 'haussement d epaules'],
  ['oiseau', 'rear delt', 'reverse fly', 'reverse pec deck', 'arriere d epaules', 'elevations posterieures'],
  ['gainage', 'plank', 'planche'],
  ['assis', 'seated'],
  ['debout', 'standing'],
  ['incline', 'inclinee'],
  ['decline', 'declinee'],
  ['unilateral', 'unilaterale', 'single', 'one arm', 'single arm', 'single leg', 'un bras', 'une jambe'],
  ['serre', 'serree', 'close grip', 'narrow'],
  ['large', 'wide'],
  ['nuque', 'behind neck', 'overhead', 'au dessus de la tete'],
  ['roue abdominale', 'roue', 'rollout', 'ab wheel', 'roulette'],
  ['releve de jambes', 'releves de jambes', 'leg raise', 'knee raise', 'releve de genoux'],
  ['kettlebell', 'kb'],
  ['epaule jete', 'clean jerk'],
  ['arrache', 'snatch'],
  ['jete', 'jerk'],
  ['squat', 'flexion'],
  ['biceps', 'bicep'],
  ['triceps', 'tricep'],
  ['avant bras', 'forearm', 'poignet', 'poignets', 'wrist', 'grip'],
  ['curl marteau', 'marteau', 'hammer'],
  ['pupitre', 'larry scott', 'preacher', 'scott'],
  ['barre au front', 'skullcrusher', 'skull crusher'],
  ['extension triceps', 'pushdown', 'push down', 'triceps poulie'],
  ['dips', 'dip'],
  ['face pull', 'facepull', 'tirage visage'],
  ['smith', 'barre guidee', 'multipresse', 'smith machine'],
  ['poids du corps', 'bodyweight', 'pdc', 'air'],
  ['corde', 'rope'],
  ['anneaux', 'ring', 'rings'],
  ['sauts', 'saut', 'jump', 'jumps'],
  ['marche', 'walk', 'walking'],
  ['lombaires', 'lombaire', 'hyperextension', 'lower back'],
  ['hack squat', 'squat machine'],
  ['machine', 'appareil'],
];

/** formes de la dictee (lib/v2/seance/lexique.ts) : seulement les expressions de plusieurs mots, plus sures */
const GROUPES_DICTEE: string[][] = EXOS.map((e) => [e.label, ...e.aliases].filter((a) => plier(a).split(' ').length >= 2 && !/^poulie (haute|basse)$/.test(plier(a))));

type Groupe = { formes: string[][]; mots: string[] };

const GROUPES: Groupe[] = [...SYNONYMES, ...GROUPES_DICTEE]
  .filter((g) => g.length > 1)
  .map((g) => {
    const formes = g.map(mots).filter((f) => f.length > 0);
    return { formes, mots: Array.from(new Set(formes.flat())) };
  });

function contientForme(tokens: string[], forme: string[]): boolean {
  if (forme.length === 0 || forme.length > tokens.length) return false;
  for (let i = 0; i + forme.length <= tokens.length; i++) {
    let ok = true;
    for (let j = 0; j < forme.length; j++) {
      if (tokens[i + j] !== forme[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

/** tous les mots par lesquels on peut trouver ce texte, en plus des siens */
export function motsSynonymes(texte: string): string[] {
  const tokens = mots(texte);
  const out = new Set<string>();
  for (const g of GROUPES) {
    if (g.formes.some((f) => contientForme(tokens, f))) g.mots.forEach((m) => out.add(m));
  }
  return Array.from(out);
}

/* ------------------------------------------------------------------ */
/* Index et score                                                       */
/* ------------------------------------------------------------------ */

export type ExoCherchable = {
  /** nom affiche et enregistre */
  name: string;
  /** autre nom connu (le nom anglais de la bibliotheque) */
  autre?: string;
  muscle?: string;
  /** nombre de seances ou il a deja ete fait, pour departager */
  count?: number;
  /** place dans la bibliotheque : les exercices de base y sont en tete de chaque muscle */
  rang?: number;
};

type Index = { nom: string; autre: string; nomMots: string[]; autreMots: string[]; synMots: string[]; muscleMots: string[] };

const indexCache = new WeakMap<object, Index>();

function indexer(e: ExoCherchable): Index {
  const hit = indexCache.get(e);
  if (hit) return hit;
  const nomMots = mots(e.name);
  // 23 octobre 2026 : dans les autres langues, le nom et le muscle traduits se cherchent aussi
  const nomTr = LANG !== 'fr' ? traduire(e.name) : e.name;
  const autreTxt = [e.autre ?? '', nomTr !== e.name ? nomTr : ''].filter(Boolean).join(' ');
  const autreMots = autreTxt ? mots(autreTxt) : [];
  const synMots = motsSynonymes(`${e.name} ${e.autre ?? ''}`);
  const muscleTxt = e.muscle ?? '';
  const muscleTr = LANG !== 'fr' && muscleTxt ? traduire(muscleTxt) : '';
  const muscleMots = Array.from(new Set([...mots(muscleTxt), ...motsSynonymes(muscleTxt), ...(muscleTr && muscleTr !== muscleTxt ? mots(muscleTr) : [])]));
  const idx = { nom: plier(e.name), autre: e.autre ? plier(e.autre) : nomTr !== e.name ? plier(nomTr) : '', nomMots, autreMots, synMots, muscleMots };
  indexCache.set(e, idx);
  return idx;
}

function meilleur(w: string, liste: string[], exact: number, debut: number, dedans: number, minDedans: number): number {
  let best = 0;
  for (const t of liste) {
    if (t === w) return exact;
    if (t.startsWith(w)) best = Math.max(best, debut);
    else if (w.length >= minDedans && t.includes(w)) best = Math.max(best, dedans);
  }
  return best;
}

/** mots de la recherche, sans les petits mots quand il reste autre chose */
export function motsRecherche(query: string): string[] {
  const all = plier(query).split(' ').filter(Boolean);
  const utiles = all.filter((w) => !PETITS.has(w));
  return (utiles.length ? utiles : all).map(racine);
}

/** score d'un exercice pour une recherche, 0 s'il ne correspond pas */
export function scoreExo(e: ExoCherchable, query: string): number {
  const words = motsRecherche(query);
  if (words.length === 0) return 0;
  const idx = indexer(e);
  let total = 0;
  for (const w of words) {
    const s = Math.max(
      meilleur(w, idx.nomMots, 10, 8, 4, 3),
      meilleur(w, idx.autreMots, 8, 6, 3, 3),
      meilleur(w, idx.synMots, 6, 5, 2, 4),
      // le muscle tape en entier passe devant un nom qui lui ressemble (« epaules » et « epaule jete »)
      meilleur(w, idx.muscleMots, 11, 4, 0, 99),
    );
    if (s === 0) return 0;
    total += s;
  }
  const q = plier(query);
  if (idx.nom === q) total += 30;
  else if (idx.nom.startsWith(q)) total += 15;
  else if (idx.autre === q) total += 25;
  else if (idx.autre && idx.autre.startsWith(q)) total += 12;
  else if (` ${idx.nom} `.includes(` ${q}`)) total += 5;
  total += Math.min(e.count ?? 0, 10) * 0.3;
  return total;
}

/** exercices qui correspondent, du meilleur au moins bon ; toutes categories confondues */
export function chercherExos<T extends ExoCherchable>(liste: T[], query: string): T[] {
  if (!plier(query)) return liste;
  return liste
    .map((e) => ({ e, s: scoreExo(e, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.e.count ?? 0) - (a.e.count ?? 0) || (a.e.rang ?? 9999) - (b.e.rang ?? 9999) || a.e.name.localeCompare(b.e.name, 'fr'))
    .map((x) => x.e);
}

/* ------------------------------------------------------------------ */
/* Catalogue du choix d'exercice                                        */
/* ------------------------------------------------------------------ */

type Lib = { name: string; muscle: string; key: string };
type Hist = { name: string; muscle?: string; count: number };

export type ExoCatalogue<H extends Hist = Hist> = ExoCherchable & { key: string; muscle: string; history?: H };

/**
 * Bibliotheque + historique, sans doublon. Un exercice deja fait garde le nom sous lequel tu l'as
 * enregistre (pour ne pas couper son historique) ; les autres prennent leur nom francais.
 * `normKey` est la cle de l'historique (normName de lib/v2/seance/history.ts).
 */
export function construireCatalogue<H extends Hist>(lib: Lib[], history: Map<string, H>, normKey: (s: string) => string): ExoCatalogue<H>[] {
  const map = new Map<string, ExoCatalogue<H>>();
  lib.forEach((l, rang) => {
    const fr = nomFr(l.name);
    const frKey = normKey(fr);
    const h = history.get(l.key) ?? history.get(frKey);
    const name = h ? h.name : fr;
    const key = normKey(name);
    if (map.has(key)) return;
    const autre = plier(name) !== plier(l.name) ? l.name : fr !== name ? fr : undefined;
    map.set(key, { key, name, autre, muscle: l.muscle, history: h, count: h?.count ?? 0, rang });
  });
  const biblio = Array.from(map.values());
  history.forEach((h, key) => {
    if (map.has(key)) return;
    // exercice cree a la main sans muscle : celui de l'exercice de la bibliotheque qui lui ressemble le plus
    const muscle = h.muscle ?? chercherExos(biblio, h.name)[0]?.muscle ?? 'AUTRE';
    map.set(key, { key, name: h.name, muscle, history: h, count: h.count });
  });
  return Array.from(map.values());
}
