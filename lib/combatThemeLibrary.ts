// ============================================
// BIBLIOTHÈQUE DES THÈMES TECHNIQUES PAR SPORT DE COMBAT
// ============================================
//
// Chaque sport a sa bibliothèque spécifique pour refléter au mieux
// ce que les pratiquants voient réellement en cours.
//
// Ajouter des techniques ici est sans risque : l'écran d'ajout de séance
// les affichera automatiquement dans la bonne catégorie (add-combat-session.tsx).
//
import { traduire } from '@/lib/i18n/tr';

export interface ThemeCategory {
  label: string;
  color: string;
  themes: string[];
}

// ─────────────────────────────────────────────────────────────────────
// JIU JITSU BRÉSILIEN (JJB)
// Classement par FONCTION, avec les termes QU'ON UTILISE VRAIMENT EN FRANCE
// (mix japonais / anglais / français selon ce qui se dit dans les dojos)
// ─────────────────────────────────────────────────────────────────────
export const THEMES_JJB: ThemeCategory[] = [
  {
    label: 'Self-defense',
    color: '#0EA5E9',
    themes: [
      traduire('Défense saisie poignet'), traduire('Défense saisie col 1 main'), traduire('Défense saisie col 2 mains'),
      traduire('Défense étranglement de face'), traduire('Défense étranglement de dos'), traduire('Défense étranglement au sol'),
      traduire('Défense headlock debout'), traduire('Défense headlock au sol'),
      traduire('Défense ceinture avant (bear hug)'), traduire('Défense ceinture arrière'),
      traduire('Défense contre poing'), 'Cadre en garde contre coups',
      traduire('Défense guillotine debout'), traduire('Défense clinch debout'),
      traduire('Relevé technique (technical stand up)'), traduire('Clinch de survie'),
    ],
  },
  {
    label: 'Debout & takedowns',
    color: '#3B82F6',
    themes: [
      'Posture & base debout', traduire('Chute avant / arrière / latérale'),
      traduire('Amenée au sol'), 'Single leg', 'Double leg',
      traduire('Projection de hanche'), traduire('Projection d\'épaule'),
      'Uchi mata', 'Seoi nage', 'Ippon seoi nage',
      'Ouchi gari', 'Kouchi gari', 'Osoto gari', 'Tai otoshi', 'Harai goshi',
      'Fauchage', 'Ankle pick', 'Arm drag', 'Snap down',
      'Tir (shoot)', traduire('Corps à corps'), traduire('Entrée en jambes'),
      traduire('Défense takedown'), 'Sprawl',
      traduire('Tirage de garde (pull guard)'), 'Sit pull', 'Flying triangle',
    ],
  },
  {
    label: 'Gardes',
    color: '#8B5CF6',
    themes: [
      traduire('Garde fermée'), 'Garde ouverte',
      traduire('Ouvrir la garde debout'), traduire('Ouvrir la garde au sol'),
      'Demi-garde', 'Deep half',
      'Butterfly', 'Butterfly assis',
      'Spider guard', 'Lasso',
      traduire('De la Riva (DLR)'), traduire('Reverse De la Riva (RDLR)'),
      'X-guard', 'Single leg X (SLX / ashi garami)',
      '50/50', 'Saddle (411 / honey hole)',
      'Worm guard', 'Lapel guard', 'Rubber guard', 'Z-guard',
      'Garde assise', 'Col-manche', 'Knee shield',
      'Octopus guard', 'Tornado guard', traduire('Garde inversée (inverted)'),
      'Williams guard', 'Squid guard', 'Tarantula', 'Waiter', 'K-guard',
      traduire('Rétention de garde'), traduire('Transitions entre gardes'),
    ],
  },
  {
    label: 'Balayages (sweeps)',
    color: '#14B8A6',
    themes: [
      'Ciseau', 'Pendule', 'Hip bump',
      'Butterfly sweep', 'Hook sweep', 'Tripod sweep',
      'Renversement omoplata', 'Lumberjack',
      'X-guard sweep', 'Single leg X sweep',
      traduire('De la Riva sweep'), 'Reverse DLR sweep', 'Berimbolo',
      'Half guard plan B', 'Deep half sweep',
      'Spider sweep', 'Lasso sweep', 'Col-manche sweep',
      traduire('Arm drag depuis butterfly'),
    ],
  },
  {
    label: traduire('Passage de garde'),
    color: '#F97316',
    themes: [
      'Toreando', 'Knee slice', 'Knee cut',
      'Smash pass', 'Stack pass', 'Passage debout',
      'Over-under', 'Double underhook', 'Leg drag',
      'Cartwheel pass', 'Long step', 'Headquarters (HQ)',
      'Passage en pression', 'Folding pass', 'Body lock',
      'X-pass',
      'Cross grip', 'Crazy dog', 'Leg trap',
      'Duck under pass', 'Leg weave',
    ],
  },
  {
    label: traduire('Contrôle & positions'),
    color: '#22C55E',
    themes: [
      'Side control', 'Knee on belly',
      'Mount', 'Technical mount', 'S-mount',
      'Transition side → mount',
      'Back take', 'Back control', 'Body triangle',
      'North-south', 'Turtle', 'Crucifix',
      '411 / Saddle', 'Truck', 'Kesa gatame',
    ],
  },
  {
    label: traduire('Soumissions, bras/épaule'),
    color: '#EF4444',
    themes: [
      'Armbar (juji gatame)', traduire('Armbar depuis la garde'), traduire('Armbar depuis le mount'),
      'Kimura', traduire('Kimura depuis la garde'), 'Kimura trap',
      'Americana', traduire('Americana depuis le mount'),
      'Omoplata', 'Baratoplata', 'Monoplata',
      traduire('Clé de poignet'), 'Biceps slicer',
    ],
  },
  {
    label: 'Soumissions, cou',
    color: '#DC2626',
    themes: [
      'Triangle', traduire('Triangle depuis la garde'), traduire('Triangle depuis le mount'), traduire('Triangle inversé'),
      'Guillotine', 'High elbow guillotine', 'Arm-in guillotine',
      'Mata leão (RNC)', 'Cross choke', traduire('Cross choke depuis la garde'),
      traduire('Collar choke depuis le dos'), 'Bow and arrow',
      'Ezekiel', traduire('Ezekiel depuis le mount'),
      'Clock choke', "D'Arce", 'Anaconda',
      'North-south choke', 'Loop choke', 'Baseball choke',
      // ── Étranglements avec la lapelle / pan du gi ──
      traduire('Bread cutter (étrangleur de pain)'), 'Papercutter choke',
      traduire('Nogueira choke (pan dans le dos)'), 'Cariño choke',
      traduire('Étranglement avec pan adverse'), traduire('Étranglement lapelle'),
      'Collar drag choke', 'Gift wrap choke',
      'Shoelace choke', 'Spaghetti choke',
      'Napão choke (big head)', 'Reverse Ezekiel',
      'Sit-up Ezekiel', traduire('Gogoplata avec lapelle'),
      traduire('Étranglement depuis worm guard'), traduire('Étranglement depuis lapel guard'),
    ],
  },
  {
    label: 'Soumissions, jambes',
    color: '#B91C1C',
    themes: [
      traduire('Clé de cheville'), 'Heel hook', traduire('Heel hook inversé'),
      'Kneebar', traduire('Kimura de cheville (toe hold)'), 'Estima lock', traduire('Compression du mollet'),
    ],
  },
  {
    label: traduire('Défense & évasions'),
    color: '#64748B',
    themes: [
      traduire('Récupération de garde'), 'Hip escape (shrimp)', 'Upa (bridge & roll)',
      'Elbow escape (mount)', traduire('Sortie de side control'),
      traduire('Sortie de back control'), traduire('Sortie de rear mount'),
      'Ghost escape',
      traduire('Défense armbar'), traduire('Défense triangle'), traduire('Défense kimura'),
      traduire('Défense RNC / mata leão'), traduire('Défense heel hook'),
      'Cadres (frames)', traduire('Retour sur le ventre'), 'Contre-attaque',
    ],
  },
  {
    label: 'Drills & concepts',
    color: '#A855F7',
    themes: [
      traduire('Solo drills (shrimp, upa, relevé technique)'),
      'Flow rolling', 'Positional sparring',
      'Specific training (ex : 5 min side control)',
      'Timing & connexion', 'Placement & pression',
      'Grip fighting', traduire('Casser les grips'),
      'Base & posture', traduire('Respiration & gestion du cardio'),
      traduire('Enchaînements de soumissions'),
      traduire('Système de leg locks (SLX → heel hook → kneebar)'),
      'Back attack system', 'Counter flow rolling',
      traduire('Jiu-jitsu sans force'), 'Transitions invisibles',
    ],
  },
  {
    label: traduire('Tactique & compétition'),
    color: '#F43F5E',
    themes: [
      traduire('Stratégie de match (gi)'), traduire('Stratégie de match (no-gi)'),
      traduire('Gestion des points & avantages'), traduire('Gestion du chrono'),
      traduire('Pénalités & stalling'), traduire('Règles de compétition'),
      traduire('Pull guard en compète'), traduire('Takedowns en compète'),
      traduire('Sweep pour les 2 points'), traduire('Pass + monté = 4 pts'),
      traduire('Prise de dos sécurisée (4 pts)'), traduire('Jeu défensif'),
      traduire('Warm up compétition'), traduire('Gestion du stress'), traduire('Visualisation avant match'),
      traduire('Coupe de poids'), traduire('Hydratation & nutrition compète'),
      traduire('Drilling spécifique compète'), 'Match simulation',
      traduire('Cardio compète'), traduire('Récupération entre matchs'),
      traduire('Stratégie tournoi (bracket)'),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// JUDO
// ─────────────────────────────────────────────────────────────────────
export const THEMES_JUDO: ThemeCategory[] = [
  {
    label: 'Kumi-kata (saisies)',
    color: '#3B82F6',
    themes: [
      'Saisie classique', 'Saisie revers', 'Saisie manche', 'Saisie haute',
      traduire('Saisie croisée'), traduire('Casser les saisies'), traduire('Combat de saisies'),
    ],
  },
  {
    label: traduire('Te-waza (bras)'),
    color: '#8B5CF6',
    themes: [
      'Seoi nage', 'Ippon seoi nage', 'Morote seoi nage', 'Tai otoshi',
      'Kata guruma', 'Uki otoshi', 'Sukui nage', 'Obi otoshi', 'Sumi otoshi',
    ],
  },
  {
    label: 'Koshi-waza (hanches)',
    color: '#F97316',
    themes: [
      'O goshi', 'Uki goshi', 'Harai goshi', 'Tsuri goshi', 'Tsuri komi goshi',
      'Hane goshi', 'Utsuri goshi', 'Ushiro goshi', 'Koshi guruma',
    ],
  },
  {
    label: 'Ashi-waza (jambes)',
    color: '#22C55E',
    themes: [
      traduire('De ashi harai'), 'Hiza guruma', 'Sasae tsuri komi ashi', 'Okuri ashi harai',
      'Uchi mata', 'Ouchi gari', 'Kouchi gari', 'O soto gari', 'Ko soto gari',
      'Ashi guruma', 'Harai tsuri komi ashi',
    ],
  },
  {
    label: 'Sutemi-waza (sacrifice)',
    color: '#06B6D4',
    themes: [
      'Tomoe nage', 'Sumi gaeshi', 'Ura nage', 'Yoko tomoe nage',
      'Tani otoshi', 'Hane makikomi', 'Soto makikomi', 'Uchi makikomi',
    ],
  },
  {
    label: traduire('Ne-waza (sol)'),
    color: '#14B8A6',
    themes: [
      'Kesa gatame', 'Kuzure kesa gatame', 'Yoko shiho gatame', 'Kami shiho gatame',
      'Tate shiho gatame', 'Retournement', traduire('Sortie de contrôle'), traduire('Passage à ne-waza'),
    ],
  },
  {
    label: 'Soumissions',
    color: '#EF4444',
    themes: [
      'Juji gatame', 'Ude garami (kimura)', 'Ude gatame', 'Hadaka jime (RNC)',
      'Okuri eri jime', 'Kata ha jime', 'Gyaku juji jime', 'Nami juji jime', 'Sankaku jime',
    ],
  },
  {
    label: traduire('Défense & tactique'),
    color: '#64748B',
    themes: [
      'Esquive projection', 'Blocage hanches', 'Contre-attaque (kaeshi-waza)',
      traduire('Enchaînements (renzoku-waza)'), traduire('Fuites de saisie'), traduire('Gestion de fin de combat'),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// LUTTE (Wrestling)
// ─────────────────────────────────────────────────────────────────────
export const THEMES_LUTTE: ThemeCategory[] = [
  {
    label: 'Debout, attaques',
    color: '#3B82F6',
    themes: [
      'Single leg', 'Double leg', 'High crotch', 'Ankle pick', 'Low single',
      'Fireman carry', 'Duck under', 'Arm drag', 'Russian tie',
      'Snap down', 'Front head lock', 'Collar tie', 'Under hook',
    ],
  },
  {
    label: traduire('Gréco-romaine (debout)'),
    color: '#06B6D4',
    themes: [
      traduire('Suplex arrière'), traduire('Suplex avant'), 'Bodylock', 'Pummeling',
      'Throw-by', 'Gut wrench debout', 'Headlock toss',
    ],
  },
  {
    label: traduire('Finitions de takedown'),
    color: '#F97316',
    themes: [
      'Running the pipe', traduire('Finish single jambe en l\'air'), 'Dump',
      'Limp leg', 'Trip', 'Hip throw', 'Double leg finish',
    ],
  },
  {
    label: traduire('Défense & contres'),
    color: '#22C55E',
    themes: [
      'Sprawl', 'Whizzer', 'Crossface', 'Defensive hip heist', 'Re-shot',
      'Front head lock defense', 'Peekout', 'Spin behind',
    ],
  },
  {
    label: traduire('Au sol (par-terre)'),
    color: '#8B5CF6',
    themes: [
      'Gut wrench', 'Leg lace', 'Bar arm', 'Tilt', 'Turk', 'Cradle',
      'Half nelson', 'Three-quarter nelson', 'Near wrist ride',
    ],
  },
  {
    label: 'Escapes & reversals',
    color: '#64748B',
    themes: [
      'Stand up escape', 'Sit out', 'Switch', 'Hip heist', 'Granby roll',
      'Short sit', 'Peterson roll',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// GRAPPLING (No-Gi)
// ─────────────────────────────────────────────────────────────────────
export const THEMES_GRAPPLING: ThemeCategory[] = [
  {
    label: 'Debout',
    color: '#3B82F6',
    themes: [
      'Single leg', 'Double leg', 'High crotch', 'Ankle pick',
      'Arm drag', 'Snap down', 'Front head lock', 'Underhook',
      'Russian tie', 'Tir direct', traduire('Défense takedown'), 'Sprawl',
    ],
  },
  {
    label: 'Gardes no-gi',
    color: '#8B5CF6',
    themes: [
      'Butterfly guard', 'Half guard', 'Z-guard', 'Deep half',
      'Single leg X', 'X-guard', 'Ashi garami', '50/50', 'Saddle (411)',
      'Full guard', 'Quarter guard', 'Seated guard', 'K-guard',
    ],
  },
  {
    label: traduire('Passage de garde'),
    color: '#F97316',
    themes: [
      'Toreando', 'Knee slice', 'Smash pass', 'Over-under', 'Leg drag',
      'Body lock pass', 'Folding pass', 'Long step', 'Headquarters', 'Pressure pass',
    ],
  },
  {
    label: traduire('Contrôles dominants'),
    color: '#22C55E',
    themes: [
      'Side control', 'Knee on belly', 'Mount', 'Technical mount',
      'Back control', 'Body triangle', 'North-south', 'Crucifix', 'Turtle',
    ],
  },
  {
    label: 'Leg locks',
    color: '#B91C1C',
    themes: [
      'Straight ankle lock', 'Heel hook (inside/outside)', 'Kneebar',
      traduire('Kimura de cheville (toe hold)'), 'Estima lock', 'Calf slicer', 'Ashi garami entry',
      '50/50 entry', 'Saddle entry',
    ],
  },
  {
    label: traduire('Soumissions haut du corps'),
    color: '#EF4444',
    themes: [
      'RNC', 'Guillotine', 'Triangle', 'Arm triangle', "D'Arce", 'Anaconda',
      'Armbar', 'Kimura', 'Americana', 'Omoplata', 'North-south choke',
    ],
  },
  {
    label: traduire('Défense & évasions'),
    color: '#64748B',
    themes: [
      'Hip escape', 'Bridge & roll', 'Frames', traduire('Défense leg lock'),
      'Back escape', 'Reguard', 'Flow rolling',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// SAMBO
// ─────────────────────────────────────────────────────────────────────
export const THEMES_SAMBO: ThemeCategory[] = [
  {
    label: 'Projections',
    color: '#3B82F6',
    themes: [
      'Tomoe nage', 'Uchi mata', 'Harai goshi', 'Sumi gaeshi', 'Sacrifice',
      'Ippon seoi nage', 'Leg grab takedown (sambo)', 'Flying scissor',
    ],
  },
  {
    label: traduire('Contrôles au sol'),
    color: '#22C55E',
    themes: [
      'Side control', 'Mount', 'North-south', 'Back control',
      'Knee on belly', 'Scarf hold',
    ],
  },
  {
    label: traduire('Leg locks (spécialité sambo)'),
    color: '#B91C1C',
    themes: [
      'Straight ankle lock', traduire('Heel hook (Combat Sambo)'), 'Kneebar',
      traduire('Kimura de cheville (toe hold)'), 'Achille', 'Calf slicer', 'Hip lock',
    ],
  },
  {
    label: 'Armlocks & kimuras',
    color: '#EF4444',
    themes: [
      'Juji gatame', 'Kimura', 'Americana', 'Ude garami', 'Wristlock',
    ],
  },
  {
    label: traduire('Combat Sambo (striking)'),
    color: '#F97316',
    themes: [
      'Jab-cross', 'Low kick', 'Clinch', 'Genou', traduire('Défense striking'), 'Enchainement frappes-projection',
    ],
  },
  {
    label: traduire('Défense & évasions'),
    color: '#64748B',
    themes: [
      'Contre-projection', 'Sortie side control', traduire('Défense leg lock'),
      'Hip escape', 'Bridge & roll',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// CATCH WRESTLING
// ─────────────────────────────────────────────────────────────────────
export const THEMES_CATCH: ThemeCategory[] = [
  {
    label: 'Takedowns',
    color: '#3B82F6',
    themes: [
      'Double leg', 'Single leg', 'Headlock takedown', 'Snap down',
      'Arm drag', 'Duck under', 'Russian tie',
    ],
  },
  {
    label: traduire('Rides & contrôles'),
    color: '#22C55E',
    themes: [
      'Top ride', 'Wrist ride', 'Cross body ride', 'Leg ride',
      'Turk ride', 'Grapevines',
    ],
  },
  {
    label: 'Stretches & cranks',
    color: '#F97316',
    themes: [
      'Neck crank', 'Boston crab', 'Surfboard', 'Full nelson',
      'Body scissor', 'Stretch', 'Spladle',
    ],
  },
  {
    label: 'Submissions',
    color: '#EF4444',
    themes: [
      'Double wrist lock (Kimura)', 'Hammerlock', 'Short arm scissor',
      'Top wrist lock', 'Key lock', 'Neck crank', 'Head scissor',
      'Guillotine', traduire('Kimura de cheville (toe hold)'),
    ],
  },
  {
    label: 'Escapes & contres',
    color: '#64748B',
    themes: [
      'Stand up', 'Hip heist', 'Switch', 'Sit out', 'Granby', 'Contre-lock',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// MMA
// ─────────────────────────────────────────────────────────────────────
export const THEMES_MMA: ThemeCategory[] = [
  {
    label: 'Frappes debout',
    color: '#3B82F6',
    themes: [
      'Jab', 'Cross', 'Crochet', 'Uppercut', 'Overhand', 'Superman punch',
      'Low kick', 'Middle kick', 'High kick', 'Teep / push kick',
      traduire('Coup de genou'), traduire('Coup de coude'), 'Spinning back kick', 'Spinning back fist',
    ],
  },
  {
    label: 'Combinaisons',
    color: '#06B6D4',
    themes: [
      'Jab-cross', 'Jab-cross-crochet (1-2-3)', traduire('Corps-tête'), 'Head-body-head',
      traduire('Kick après main'), 'Kick-punch', 'Feinte + contre', 'Kick low-high',
    ],
  },
  {
    label: 'Takedowns',
    color: '#8B5CF6',
    themes: [
      'Double leg', 'Single leg', 'Ankle pick', 'Body lock', 'Cage wrestling',
      'Knee tap', 'Trip', 'Sprawl', 'Anti-takedown',
    ],
  },
  {
    label: 'Clinch & cage',
    color: '#EF4444',
    themes: [
      'Thai clinch', 'Plum', 'Underhook', 'Overhook', traduire('Coup de genou clinch'),
      'Coude clinch', 'Pummel', 'Cage control', 'Dirty boxing',
    ],
  },
  {
    label: 'Ground & Pound',
    color: '#F97316',
    themes: [
      'GnP en mount', 'GnP en side control', 'GnP en back control',
      'GnP en guard top', 'Postures & cadres', 'Stand up safe', traduire('Elbows du dessus'),
    ],
  },
  {
    label: 'Soumissions',
    color: '#DC2626',
    themes: [
      'RNC', 'Triangle', 'Armbar', 'Kimura', "D'Arce", 'Anaconda', 'Guillotine',
      'Heel hook', 'Kneebar', traduire('Kimura de cheville (toe hold)'), 'Americana',
    ],
  },
  {
    label: traduire('Défense (striking & sol)'),
    color: '#22C55E',
    themes: [
      'Slip', 'Parry', 'Couverture', 'Sortie angle', 'Footwork',
      'Sprawl', 'Sortie clinch', 'Hip escape', 'Back escape', 'Stand up',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// BOXE ANGLAISE
// ─────────────────────────────────────────────────────────────────────
export const THEMES_BOXE: ThemeCategory[] = [
  {
    label: traduire('Frappes de base'),
    color: '#3B82F6',
    themes: [
      'Jab', traduire('Cross (direct arrière)'), traduire('Crochet avant (lead hook)'),
      traduire('Crochet arrière (rear hook)'), traduire('Uppercut avant'), traduire('Uppercut arrière'),
      'Overhand', 'Check hook',
    ],
  },
  {
    label: 'Combinaisons',
    color: '#F97316',
    themes: [
      '1-2 (jab-cross)', '1-2-3', '1-1-2', '1-2-3-2', 'Double jab',
      'Jab-cross-uppercut', traduire('Body-tête'), traduire('Tête-corps-tête'), 'Feinte + 1-2',
      'Long-short combo',
    ],
  },
  {
    label: traduire('Frappes au corps'),
    color: '#EF4444',
    themes: [
      'Body jab', 'Body cross', 'Body hook', 'Liver shot',
      'Shovel hook', traduire('Uppercut au corps'),
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      traduire('Slip intérieur'), traduire('Slip extérieur'), 'Bob & weave', 'Roll',
      'Parry (jab/cross)', 'Block (garde haute)', 'Shoulder roll',
      'Pull counter', 'Couverture',
    ],
  },
  {
    label: 'Footwork & angles',
    color: '#8B5CF6',
    themes: [
      traduire('Pas glissé avant/arrière'), 'Pivot', 'Pivot angle', 'Side step',
      'L-step', 'Out-of-range', traduire('Gestion de distance'), 'Coupe-ring',
    ],
  },
  {
    label: 'Tactique & sparring',
    color: '#06B6D4',
    themes: [
      'Feintes', traduire('Drills de réaction'), traduire('Travail de pads'), 'Sac lourd',
      'Ombre', 'Sparring technique', traduire('Gestion des rounds'),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// MUAY THAI
// ─────────────────────────────────────────────────────────────────────
export const THEMES_MUAY_THAI: ThemeCategory[] = [
  {
    label: traduire('Poings (les 4 armes basiques)'),
    color: '#3B82F6',
    themes: [
      'Jab (mat trong)', 'Cross (mat lang)', 'Crochet (mat wiang san)',
      'Uppercut (mat seuy)', 'Overhand', 'Spinning back fist',
    ],
  },
  {
    label: 'Coudes (sok)',
    color: '#DC2626',
    themes: [
      'Coude horizontal (sok tat)', 'Coude descendant (sok ti)',
      'Coude remontant (sok ngat)', traduire('Coude retourné (sok klab)'),
      traduire('Coude sauté (sok kratood)'), 'Coude diagonal',
    ],
  },
  {
    label: 'Genoux (kao)',
    color: '#F97316',
    themes: [
      'Kao trong (droit)', 'Kao chiang (diagonal)', 'Kao kong (courbe)',
      'Kao tat (rotation)', traduire('Kao loi (sauté)'), 'Genou clinch',
    ],
  },
  {
    label: traduire('Pieds (te)'),
    color: '#8B5CF6',
    themes: [
      traduire('Low kick (te tat)'), 'Middle kick', 'High kick', 'Teep (push kick)',
      traduire('Teep arrière'), traduire('Te khao (rotation)'), 'Spinning back kick',
      'Cut kick', 'Question mark kick',
    ],
  },
  {
    label: 'Clinch Thai',
    color: '#EF4444',
    themes: [
      'Plum (double collar tie)', traduire('Pummel pour dominer'), 'Sweeps en clinch',
      'Genoux en clinch', 'Coudes en clinch', traduire('Sortie de clinch'),
      'Lock & break',
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Block low kick (check)', 'Block middle', 'Parry', traduire('Teep défense'),
      'Esquive', 'Catch kick', traduire('Sweep après catch'), 'Garde longue',
    ],
  },
  {
    label: 'Tactique & conditionnement',
    color: '#06B6D4',
    themes: [
      'Pads (Thai pads)', 'Sac lourd', 'Ombre', 'Conditionnement tibias',
      'Clinch drills', 'Sparring technique', 'Ram muay & wai khru',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// KICKBOXING
// ─────────────────────────────────────────────────────────────────────
export const THEMES_KICKBOXING: ThemeCategory[] = [
  {
    label: 'Poings',
    color: '#3B82F6',
    themes: [
      'Jab', 'Cross', 'Crochet', 'Uppercut', 'Overhand',
      'Spinning back fist', 'Body punches',
    ],
  },
  {
    label: traduire('Coups de pied'),
    color: '#8B5CF6',
    themes: [
      'Low kick', 'Middle kick', 'High kick', 'Front kick (push)',
      'Side kick', 'Back kick', 'Spinning back kick', 'Crescent kick',
      'Axe kick', 'Hook kick', 'Question mark kick',
    ],
  },
  {
    label: 'Combinaisons',
    color: '#F97316',
    themes: [
      'Jab-cross-kick', '1-2-low kick', 'Double jab + kick', 'Kick-punch',
      'Punch-kick-punch', 'Low-high', 'Feinte + kick', 'Switch kick',
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Check low kick', 'Block', 'Parry', 'Slip', 'Bob & weave',
      'Couverture', 'Esquive kick', 'Catch & counter',
    ],
  },
  {
    label: 'Footwork & angles',
    color: '#06B6D4',
    themes: [
      traduire('Pas glissé'), 'Pivot', 'Switch step', 'Side step', 'Coupe-ring',
      traduire('Distance management'), 'L-step',
    ],
  },
  {
    label: 'Tactique',
    color: '#64748B',
    themes: [
      'Feintes', 'Pads', 'Sac lourd', 'Ombre', traduire('Drills réactivité'),
      'Sparring technique',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// KARATÉ
// ─────────────────────────────────────────────────────────────────────
export const THEMES_KARATE: ThemeCategory[] = [
  {
    label: 'Kihon (bases)',
    color: '#3B82F6',
    themes: [
      'Gyaku zuki', 'Oi zuki', 'Kizami zuki', 'Uraken uchi',
      'Tettsui uchi', 'Shuto uchi', 'Empi uchi (coude)',
      'Postures (dachi)',
    ],
  },
  {
    label: traduire('Coups de pied (keri waza)'),
    color: '#8B5CF6',
    themes: [
      'Mae geri', 'Mawashi geri', 'Yoko geri', 'Ushiro geri',
      'Ura mawashi geri', 'Hiza geri (genou)', 'Fumikomi',
    ],
  },
  {
    label: 'Blocages (uke waza)',
    color: '#22C55E',
    themes: [
      'Gedan barai', 'Age uke', 'Soto uke', 'Uchi uke', 'Shuto uke',
      'Juji uke', 'Haiwan uke',
    ],
  },
  {
    label: 'Kata',
    color: '#F97316',
    themes: [
      'Heian shodan', 'Heian nidan', 'Heian sandan', 'Heian yondan', 'Heian godan',
      'Tekki shodan', 'Bassai dai', 'Kanku dai', 'Empi', 'Jion',
      'Application bunkai',
    ],
  },
  {
    label: traduire('Kumité'),
    color: '#EF4444',
    themes: [
      traduire('Kihon kumité'), traduire('Ippon kumité'), traduire('Sanbon kumité'), traduire('Jiyu kumité (libre)'),
      traduire('Timing & distance'), 'Feintes', 'Contre-attaque',
    ],
  },
  {
    label: 'Tactique & conditionnement',
    color: '#64748B',
    themes: [
      traduire('Maai (distance)'), 'Zanshin', traduire('Déplacements'), 'Makiwara',
      traduire('Travail cible'), 'Respiration',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// TAEKWONDO
// ─────────────────────────────────────────────────────────────────────
export const THEMES_TAEKWONDO: ThemeCategory[] = [
  {
    label: traduire('Coups de pied de base'),
    color: '#3B82F6',
    themes: [
      'Ap chagi (front kick)', 'Dollyo chagi (roundhouse)', 'Yop chagi (side kick)',
      'Dwit chagi (back kick)', 'Naeryeo chagi (axe kick)', 'Bandal chagi',
    ],
  },
  {
    label: traduire('Coups de pied sautés / rotatifs'),
    color: '#8B5CF6',
    themes: [
      'Tornado kick', 'Spinning back kick (dwi huryeo chagi)',
      '360 back kick', 'Scissor kick', 'Flying side kick',
      'Double kick', 'Triple kick',
    ],
  },
  {
    label: 'Poings & mains',
    color: '#F97316',
    themes: [
      'Jireugi (direct)', 'Jab', 'Cross', 'Uppercut', 'Hammer fist',
      'Knife hand', 'Backfist',
    ],
  },
  {
    label: 'Poomsae (formes)',
    color: '#06B6D4',
    themes: [
      traduire('Taegeuk il jang'), 'Taegeuk i jang', 'Taegeuk sam jang', 'Taegeuk sa jang',
      'Taegeuk o jang', 'Koryo', 'Keumgang',
    ],
  },
  {
    label: traduire('Kyorugi (combat)'),
    color: '#EF4444',
    themes: [
      'Step sparring', traduire('Combat libre'), traduire('Gestion distance'), 'Feintes',
      'Contres', 'Double kick counter', traduire('Attaque sur entrée'),
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Blocages poings', 'Esquive', 'Jam (casser rythme)',
      'Cutting kick', 'Contre-kick', traduire('Pivot défensif'),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// BOXE FRANÇAISE (SAVATE)
// ─────────────────────────────────────────────────────────────────────
export const THEMES_BOXE_FRANCAISE: ThemeCategory[] = [
  {
    label: 'Poings',
    color: '#3B82F6',
    themes: [
      'Direct', traduire('Direct du bras arrière'), 'Crochet', 'Uppercut',
      'Swing', 'Crochet bas',
    ],
  },
  {
    label: traduire('Pieds, techniques de base'),
    color: '#8B5CF6',
    themes: [
      traduire('Fouetté bas'), traduire('Fouetté médian'), traduire('Fouetté figure'),
      traduire('Chassé frontal'), traduire('Chassé latéral'), traduire('Chassé bas'),
      traduire('Revers (frontal, latéral, figure)'), traduire('Coup de pied bas (CPB)'),
    ],
  },
  {
    label: traduire('Pieds, techniques avancées'),
    color: '#F97316',
    themes: [
      traduire('Double fouetté'), traduire('Fouetté revers'), traduire('Chassé retourné'),
      traduire('Coup de pied sauté'), traduire('Enchaînement pieds-poings'),
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      traduire('Parade bloquée'), traduire('Parade chassée'), 'Parade opposition',
      'Esquive rotative', traduire('Esquive latérale'), traduire('Esquive sautée'),
      traduire('Déblayage'), 'Contre frappe',
    ],
  },
  {
    label: traduire('Déplacements & distance'),
    color: '#06B6D4',
    themes: [
      traduire('Pas de côté'), traduire('Pas croisé'), traduire('Pas chassé'), 'Rupture',
      'Glissade', 'Placement',
    ],
  },
  {
    label: 'Assauts & tactique',
    color: '#64748B',
    themes: [
      'Assaut technique', traduire('Pré-combat'), traduire('Combat'), 'Feintes',
      traduire('Gestion de la distance'), traduire('Touches de précision'),
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// KRAV MAGA
// ─────────────────────────────────────────────────────────────────────
export const THEMES_KRAV_MAGA: ThemeCategory[] = [
  {
    label: traduire('Frappes de base'),
    color: '#3B82F6',
    themes: [
      'Direct paume', 'Direct poing', 'Coude', 'Genou',
      traduire('Coup de pied bas'), 'Front kick', 'Round kick',
      'Hammer fist', traduire('Coup de tête'),
    ],
  },
  {
    label: traduire('Défense face à face'),
    color: '#22C55E',
    themes: [
      traduire('Défense contre poing direct'), traduire('Défense contre crochet'),
      traduire('Défense contre coup de pied'), traduire('Défense contre clinch'),
      traduire('Défense contre saisie cou'), traduire('Défense contre saisie de face'),
      traduire('Défense contre saisie dos'),
    ],
  },
  {
    label: traduire('Défense armes'),
    color: '#EF4444',
    themes: [
      traduire('Défense couteau (de face)'), traduire('Défense couteau (de dos)'),
      traduire('Défense pistolet (de face)'), traduire('Défense pistolet (de dos)'),
      traduire('Défense bâton (de haut)'), traduire('Défense bâton (latéral)'),
      traduire('Désarmement'),
    ],
  },
  {
    label: 'Situations tactiques',
    color: '#F97316',
    themes: [
      'Agresseur multiple', traduire('Agression au sol (ground)'),
      traduire('Voiture / espace confiné'), traduire('Défense 3e partie'),
      'Environnement obscur',
    ],
  },
  {
    label: 'Sol & ground',
    color: '#8B5CF6',
    themes: [
      'Get up safe', traduire('Kicks au sol'), traduire('Défense en monté'),
      traduire('Sortie de garde forcée'), traduire('Se relever en sécurité'),
    ],
  },
  {
    label: 'Conditionnement & mindset',
    color: '#64748B',
    themes: [
      'Stress drills', 'Conditionnement physique', 'Pads',
      'Visualisation', traduire('Sparring réaliste'), 'Gestion panique',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// MAPPING PAR SPORT + FALLBACK
// ─────────────────────────────────────────────────────────────────────
export const COMBAT_THEME_LIBRARY: Record<string, ThemeCategory[]> = {
  // Grappling
  jjb: THEMES_JJB,
  judo: THEMES_JUDO,
  lutte: THEMES_LUTTE,
  grappling: THEMES_GRAPPLING,
  sambo: THEMES_SAMBO,
  catch: THEMES_CATCH,
  // Striking
  mma: THEMES_MMA,
  boxe: THEMES_BOXE,
  muay_thai: THEMES_MUAY_THAI,
  kickboxing: THEMES_KICKBOXING,
  karate: THEMES_KARATE,
  taekwondo: THEMES_TAEKWONDO,
  boxe_francaise: THEMES_BOXE_FRANCAISE,
  krav_maga: THEMES_KRAV_MAGA,
};

/**
 * Retourne les catégories de thèmes pour un sport donné.
 * Fallback : MMA (couvre striking + grappling) si sport inconnu.
 */
export function getCombatThemesForSport(sportId: string): ThemeCategory[] {
  return COMBAT_THEME_LIBRARY[sportId] || THEMES_MMA;
}

/**
 * Retourne la liste plate des thèmes pour un sport (compat).
 */
export function getCombatThemeSuggestionsForSport(sportId: string): string[] {
  return getCombatThemesForSport(sportId).flatMap(c => c.themes);
}
