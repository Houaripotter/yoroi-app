/**
 * Muscles travailles par exercice (25 octobre 2026, Houari : « dis ce que ca travaille comme muscle »).
 * principaux : les muscles qui font le mouvement. aussi : ceux qui aident ou stabilisent.
 * Repere d'anatomie classique (ExRx, manuels NSCA), pas un avis medical.
 * Un exercice absent de la liste affiche seulement son groupe (champ muscle du programme).
 */

export type MusclesExo = { principaux: string[]; aussi: string[] };

const m = (principaux: string[], aussi: string[] = []): MusclesExo => ({ principaux, aussi });

// libelles (tous traduits dans lib/i18n/dict)
const PEC = 'Pectoraux';
const PEC_HAUT = 'Haut des pectoraux';
const EP_AV = 'Épaules avant';
const EP_COTE = 'Épaules côté';
const EP_AR = 'Arrière d’épaule';
const COIFFE = 'Coiffe des rotateurs';
const TRAP = 'Trapèzes';
const DORS = 'Dorsaux';
const MIL_DOS = 'Milieu du dos';
const LOMB = 'Lombaires';
const BIC = 'Biceps';
const TRI = 'Triceps';
const AVB = 'Avant-bras';
const GRIP = 'Grip';
const ABDOS = 'Abdos';
const OBL = 'Obliques';
const GAINAGE = 'Gainage';
const QUAD = 'Quadriceps';
const FESS = 'Fessiers';
const MOY_FESS = 'Moyen fessier';
const ISCH = 'Ischios';
const ADD = 'Adducteurs';
const MOLL = 'Mollets';
const FLECH = 'Fléchisseurs de hanche';
const COU = 'Cou';

export const MUSCLES_EXOS: Record<string, MusclesExo> = {
  // Pectoraux
  'Développé Couché (Barre)': m([PEC], [EP_AV, TRI]),
  'Développé Couché (Haltères)': m([PEC], [EP_AV, TRI]),
  'Développé Incliné (Barre)': m([PEC_HAUT], [EP_AV, TRI]),
  'Développé Incliné (Haltères)': m([PEC_HAUT], [EP_AV, TRI]),
  'Floor Press (Haltères)': m([PEC, TRI], [EP_AV]),
  'Chest Press (Machine)': m([PEC], [EP_AV, TRI]),
  'Close Grip Bench Press': m([TRI, PEC], [EP_AV]),
  'Dips (Focus Pectoraux)': m([PEC, TRI], [EP_AV]),
  'Pompes (Poids du corps)': m([PEC], [EP_AV, TRI, GAINAGE]),
  'Pompes Diamant': m([TRI, PEC], [EP_AV, GAINAGE]),
  'Pompes Déclinées': m([PEC_HAUT], [EP_AV, TRI, GAINAGE]),
  'Écartés à la Poulie Haute': m([PEC], [EP_AV]),
  'Écartés Couché (Haltères)': m([PEC], [EP_AV]),
  'Écartés Incliné (Haltères)': m([PEC_HAUT], [EP_AV]),
  'Pec Deck (Butterfly)': m([PEC], [EP_AV]),
  'Pull Over (Haltère)': m([DORS, PEC], [TRI]),
  'Pull Over Poulie Haute': m([DORS], [TRI]),

  // Epaules
  'Développé Militaire (Barre)': m([EP_AV], [EP_COTE, TRI, TRAP, GAINAGE]),
  'Développé Militaire Assis': m([EP_AV], [EP_COTE, TRI, TRAP]),
  'Développé Haltères Assis': m([EP_AV], [EP_COTE, TRI, TRAP]),
  'Développé Haltères Debout': m([EP_AV], [EP_COTE, TRI, TRAP, GAINAGE]),
  'Arnold Press': m([EP_AV, EP_COTE], [TRI, TRAP]),
  'Shoulder Press Machine': m([EP_AV], [EP_COTE, TRI]),
  'Push Press': m([EP_AV, TRI], [QUAD, FESS, TRAP, GAINAGE]),
  'Pike Push-ups': m([EP_AV], [TRI, PEC_HAUT, GAINAGE]),
  'Élévations Latérales (Haltères)': m([EP_COTE], [TRAP]),
  'Élévations Latérales (Machine)': m([EP_COTE], [TRAP]),
  'Élévations Latérales (Poulie)': m([EP_COTE], [TRAP]),
  'Élévations Frontales (Haltères)': m([EP_AV], [PEC_HAUT]),
  'Oiseau Haltères (Rear Delts)': m([EP_AR], [MIL_DOS, TRAP]),
  'Oiseau Machine (Reverse Pec Deck)': m([EP_AR], [MIL_DOS, TRAP]),
  'Face Pull': m([EP_AR, COIFFE], [MIL_DOS, TRAP]),
  'Y Raises': m([TRAP, EP_AR], [COIFFE]),
  'Rotation Externe (Élastique)': m([COIFFE], [EP_AR]),
  'Tirage Menton (Upright Row)': m([EP_COTE, TRAP], [BIC]),
  'Shrugs Haltères (Trapèzes)': m([TRAP], [GRIP]),

  // Dos
  'Tractions (Pronation)': m([DORS], [BIC, MIL_DOS, AVB]),
  'Tractions (Supination)': m([DORS, BIC], [MIL_DOS, AVB]),
  'Tractions Neutres': m([DORS], [BIC, AVB, MIL_DOS]),
  'Tractions Serviette': m([DORS, GRIP], [BIC, AVB]),
  'Tirage Poitrine (Lat Pulldown)': m([DORS], [BIC, MIL_DOS]),
  'Tirage Serré (V-Bar)': m([DORS], [BIC, MIL_DOS]),
  'Straight Arm Pulldown': m([DORS], [TRI]),
  'Tirage Horizontal (Seated Row)': m([MIL_DOS, DORS], [EP_AR, BIC]),
  'Tirage Horizontal Unilatéral': m([MIL_DOS, DORS], [EP_AR, BIC, OBL]),
  'Low Row Machine': m([MIL_DOS, DORS], [EP_AR, BIC]),
  'Rowing Barre (Bent Over)': m([MIL_DOS, DORS], [EP_AR, BIC, LOMB]),
  'Rowing Haltère (One Arm)': m([DORS, MIL_DOS], [EP_AR, BIC]),
  'Rowing T-Bar': m([MIL_DOS, DORS], [EP_AR, BIC, LOMB]),
  'Chest Supported Row': m([MIL_DOS, DORS], [EP_AR, BIC]),
  'Inverted Row': m([MIL_DOS, DORS], [BIC, EP_AR, GAINAGE]),
  'Hyperextensions': m([LOMB, FESS], [ISCH]),
  'Good Morning': m([ISCH, LOMB], [FESS]),
  'Deadlift (Soulevé de terre)': m([FESS, ISCH, LOMB], [QUAD, TRAP, GRIP]),
  'Trap Bar Deadlift': m([QUAD, FESS], [ISCH, LOMB, TRAP, GRIP]),
  'Sumo Deadlift': m([FESS, QUAD, ADD], [ISCH, LOMB, GRIP]),
  'Tirage Manches (Kumi Kata)': m([GRIP, DORS], [BIC, AVB]),

  // Bras
  'Curl Barre Droite': m([BIC], [AVB]),
  'Curl Barre EZ': m([BIC], [AVB]),
  'Curl Haltères Alterné': m([BIC], [AVB]),
  'Curl Haltères Simultané': m([BIC], [AVB]),
  'Curl Incliné (Haltères)': m([BIC], [AVB]),
  'Curl Concentré': m([BIC], [AVB]),
  'Curl Larry Scott (Pupitre)': m([BIC], [AVB]),
  'Curl Machine': m([BIC], [AVB]),
  'Curl Poulie Basse': m([BIC], [AVB]),
  'Curl Marteau (Hammer)': m([BIC, AVB], []),
  'Curl Disque': m([BIC, GRIP], [AVB]),
  'Barre au front (Skullcrusher)': m([TRI]),
  'Skullcrusher Haltères': m([TRI]),
  'Extension Triceps Poulie (Corde)': m([TRI]),
  'Extension Triceps Poulie (Barre)': m([TRI]),
  'Overhead Extension Poulie': m([TRI]),
  'Extension Haltère Nuque (2 mains)': m([TRI]),
  'Kickback Triceps (Haltère)': m([TRI], [EP_AR]),
  'Dips Banc': m([TRI], [EP_AV, PEC]),

  // Grip et avant-bras
  'Extension Poignets': m([AVB]),
  'Wrist Roller': m([AVB, GRIP], [EP_AV]),
  'Gripper / Hand Grip': m([GRIP]),
  'Plate Pinch': m([GRIP], [AVB]),
  'Pince Haltère (par la tête)': m([GRIP], [AVB, TRAP]),
  'Traversée de Disques (Pince)': m([GRIP], [AVB]),
  'Dead Hang': m([GRIP], [AVB, DORS]),
  'Suspension Serviette': m([GRIP], [AVB, DORS]),
  'Farmer Walk': m([GRIP, TRAP], [AVB, GAINAGE, FESS]),
  'Tenue Trap Bar': m([GRIP], [AVB, TRAP]),

  // Jambes
  'Squat Barre Libre': m([QUAD, FESS], [ADD, ISCH, LOMB, GAINAGE]),
  'Front Squat': m([QUAD], [FESS, GAINAGE, MIL_DOS]),
  'Box Squat': m([FESS, QUAD], [ISCH, ADD, LOMB]),
  'Goblet Squat': m([QUAD, FESS], [ADD, GAINAGE]),
  'Smith Machine Squat': m([QUAD, FESS], [ADD]),
  'Hack Squat': m([QUAD], [FESS, ADD]),
  'Presse à Cuisses': m([QUAD, FESS], [ADD]),
  'Presse à Cuisses (Pieds Hauts)': m([FESS, ISCH], [QUAD, ADD]),
  'Leg Extension': m([QUAD]),
  'Squat Bulgare': m([QUAD, FESS], [ADD, MOY_FESS]),
  'Fentes Bulgares': m([QUAD, FESS], [ADD, MOY_FESS]),
  'Split Squat': m([QUAD, FESS], [ADD]),
  'Fentes Avant (Haltères)': m([QUAD, FESS], [ADD, GRIP]),
  'Fentes Arrière': m([FESS, QUAD], [ISCH, ADD]),
  'Reverse Lunges': m([FESS, QUAD], [ISCH, ADD]),
  'Fentes Marchées': m([QUAD, FESS], [ADD, MOY_FESS]),
  'Step Up (Haltères)': m([QUAD, FESS], [MOY_FESS]),
  'Deadlift Roumain': m([ISCH, FESS], [LOMB, GRIP]),
  'Romanian Deadlift (Haltères)': m([ISCH, FESS], [LOMB, GRIP]),
  'Single Leg Deadlift': m([ISCH, FESS], [MOY_FESS, LOMB]),
  'Leg Curl Assis': m([ISCH]),
  'Leg Curl Couché': m([ISCH], [MOLL]),
  'Leg Curl Debout': m([ISCH], [MOLL]),
  'Nordic Curl': m([ISCH], [FESS]),
  'Hip Thrust Barre': m([FESS], [ISCH, QUAD]),
  'Hip Thrust Machine': m([FESS], [ISCH]),
  'Hip Thrust (Poids Corps)': m([FESS], [ISCH]),
  'Single Leg Hip Thrust': m([FESS], [ISCH, MOY_FESS]),
  'Glute Bridge': m([FESS], [ISCH]),
  'Kettlebell Swings': m([FESS, ISCH], [LOMB, GAINAGE, GRIP]),
  'Cable Kickback': m([FESS]),
  'Kick-back Poulie': m([FESS]),
  'Donkey Kicks': m([FESS], [GAINAGE]),
  'Abducteurs Machine': m([MOY_FESS]),
  'Banded Walks': m([MOY_FESS], [FESS]),
  'Clamshells': m([MOY_FESS]),
  'Copenhagen Plank': m([ADD], [OBL, GAINAGE]),
  'Box Jumps': m([QUAD, FESS], [MOLL]),
  'Mollets Debout (Machine)': m([MOLL]),
  'Mollets Assis (Machine)': m([MOLL]),
  'Mollets Haltères (Debout)': m([MOLL], [GRIP]),
  'Mollets Unilatéral': m([MOLL]),

  // Abdos et gainage
  'Crunch Abdominal': m([ABDOS]),
  'Crunch Inversé': m([ABDOS], [FLECH]),
  'Crunch Poulie Haute': m([ABDOS], [OBL]),
  'Cable Crunch': m([ABDOS], [OBL]),
  'Sit-ups': m([ABDOS], [FLECH]),
  'Relevé de jambes Suspendu': m([ABDOS, FLECH], [GRIP, OBL]),
  'Relevé de jambes (Sol)': m([ABDOS, FLECH]),
  'Hanging Knee Raise': m([ABDOS, FLECH], [GRIP]),
  'Roulette Abdos (Abs Wheel)': m([ABDOS], [DORS, EP_AV, GAINAGE]),
  'Gainage Planche': m([GAINAGE, ABDOS], [EP_AV]),
  'Gainage Latéral': m([OBL], [GAINAGE, MOY_FESS]),
  'Dead Bug': m([GAINAGE, ABDOS]),
  'Bird Dog': m([GAINAGE, LOMB], [FESS]),
  'Pallof Press': m([OBL, GAINAGE]),
  'Landmine Rotation': m([OBL], [EP_AV, GAINAGE]),
  'Mountain Climbers': m([GAINAGE, FLECH], [EP_AV]),

  // Cou
  'Cou Isométrique (4 directions)': m([COU], [TRAP]),
  'Cou Élastique (4 directions)': m([COU], [TRAP]),
};

export function musclesDeExo(nom: string): MusclesExo | undefined {
  return MUSCLES_EXOS[nom];
}

/** Precision qui s'affiche toujours avec l'exercice (25 octobre 2026, Houari : « beaucoup vont le faire sur le banc ») */
export const PRECISION_EXO: Record<string, string> = {
  'Floor Press (Haltères)': 'Au sol, pas sur un banc : le sol arrête tes coudes à hauteur du buste et protège ton épaule.',
};
