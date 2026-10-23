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
      'Défense saisie poignet', 'Défense saisie col 1 main', 'Défense saisie col 2 mains',
      'Défense étranglement de face', 'Défense étranglement de dos', 'Défense étranglement au sol',
      'Défense headlock debout', 'Défense headlock au sol',
      'Défense ceinture avant (bear hug)', 'Défense ceinture arrière',
      'Défense contre poing', 'Cadre en garde contre coups',
      'Défense guillotine debout', 'Défense clinch debout',
      'Relevé technique (technical stand up)', 'Clinch de survie',
    ],
  },
  {
    label: traduire('Debout & takedowns'),
    color: '#3B82F6',
    themes: [
      'Posture & base debout', 'Chute avant / arrière / latérale',
      'Amenée au sol', 'Single leg', 'Double leg',
      'Projection de hanche', 'Projection d\'épaule',
      'Uchi mata', 'Seoi nage', 'Ippon seoi nage',
      'Ouchi gari', 'Kouchi gari', 'Osoto gari', 'Tai otoshi', 'Harai goshi',
      'Fauchage', 'Ankle pick', 'Arm drag', 'Snap down',
      'Tir (shoot)', 'Corps à corps', 'Entrée en jambes',
      'Défense takedown', 'Sprawl',
      'Tirage de garde (pull guard)', 'Sit pull', 'Flying triangle',
    ],
  },
  {
    label: traduire('Gardes'),
    color: '#8B5CF6',
    themes: [
      'Garde fermée', 'Garde ouverte',
      'Ouvrir la garde debout', 'Ouvrir la garde au sol',
      'Demi-garde', 'Deep half',
      'Butterfly', 'Butterfly assis',
      'Spider guard', 'Lasso',
      'De la Riva (DLR)', 'Reverse De la Riva (RDLR)',
      'X-guard', 'Single leg X (SLX / ashi garami)',
      '50/50', 'Saddle (411 / honey hole)',
      'Worm guard', 'Lapel guard', 'Rubber guard', 'Z-guard',
      'Garde assise', 'Col-manche', 'Knee shield',
      'Octopus guard', 'Tornado guard', 'Garde inversée (inverted)',
      'Williams guard', 'Squid guard', 'Tarantula', 'Waiter', 'K-guard',
      'Rétention de garde', 'Transitions entre gardes',
    ],
  },
  {
    label: traduire('Balayages (sweeps)'),
    color: '#14B8A6',
    themes: [
      'Ciseau', 'Pendule', 'Hip bump',
      'Butterfly sweep', 'Hook sweep', 'Tripod sweep',
      'Renversement omoplata', 'Lumberjack',
      'X-guard sweep', 'Single leg X sweep',
      'De la Riva sweep', 'Reverse DLR sweep', 'Berimbolo',
      'Half guard plan B', 'Deep half sweep',
      'Spider sweep', 'Lasso sweep', 'Col-manche sweep',
      'Arm drag depuis butterfly',
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
      'Armbar (juji gatame)', 'Armbar depuis la garde', 'Armbar depuis le mount',
      'Kimura', 'Kimura depuis la garde', 'Kimura trap',
      'Americana', 'Americana depuis le mount',
      'Omoplata', 'Baratoplata', 'Monoplata',
      'Clé de poignet', 'Biceps slicer',
    ],
  },
  {
    label: traduire('Soumissions, cou'),
    color: '#DC2626',
    themes: [
      'Triangle', 'Triangle depuis la garde', 'Triangle depuis le mount', 'Triangle inversé',
      'Guillotine', 'High elbow guillotine', 'Arm-in guillotine',
      'Mata leão (RNC)', 'Cross choke', 'Cross choke depuis la garde',
      'Collar choke depuis le dos', 'Bow and arrow',
      'Ezekiel', 'Ezekiel depuis le mount',
      'Clock choke', "D'Arce", 'Anaconda',
      'North-south choke', 'Loop choke', 'Baseball choke',
      // ── Étranglements avec la lapelle / pan du gi ──
      'Bread cutter (étrangleur de pain)', 'Papercutter choke',
      'Nogueira choke (pan dans le dos)', 'Cariño choke',
      'Étranglement avec pan adverse', 'Étranglement lapelle',
      'Collar drag choke', 'Gift wrap choke',
      'Shoelace choke', 'Spaghetti choke',
      'Napão choke (big head)', 'Reverse Ezekiel',
      'Sit-up Ezekiel', 'Gogoplata avec lapelle',
      'Étranglement depuis worm guard', 'Étranglement depuis lapel guard',
    ],
  },
  {
    label: traduire('Soumissions, jambes'),
    color: '#B91C1C',
    themes: [
      'Clé de cheville', 'Heel hook', 'Heel hook inversé',
      'Kneebar', 'Kimura de cheville (toe hold)', 'Estima lock', 'Compression du mollet',
    ],
  },
  {
    label: traduire('Défense & évasions'),
    color: '#64748B',
    themes: [
      'Récupération de garde', 'Hip escape (shrimp)', 'Upa (bridge & roll)',
      'Elbow escape (mount)', 'Sortie de side control',
      'Sortie de back control', 'Sortie de rear mount',
      'Ghost escape',
      'Défense armbar', 'Défense triangle', 'Défense kimura',
      'Défense RNC / mata leão', 'Défense heel hook',
      'Cadres (frames)', 'Retour sur le ventre', 'Contre-attaque',
    ],
  },
  {
    label: traduire('Drills & concepts'),
    color: '#A855F7',
    themes: [
      'Solo drills (shrimp, upa, relevé technique)',
      'Flow rolling', 'Positional sparring',
      'Specific training (ex : 5 min side control)',
      'Timing & connexion', 'Placement & pression',
      'Grip fighting', 'Casser les grips',
      'Base & posture', 'Respiration & gestion du cardio',
      'Enchaînements de soumissions',
      'Système de leg locks (SLX → heel hook → kneebar)',
      'Back attack system', 'Counter flow rolling',
      'Jiu-jitsu sans force', 'Transitions invisibles',
    ],
  },
  {
    label: traduire('Tactique & compétition'),
    color: '#F43F5E',
    themes: [
      'Stratégie de match (gi)', 'Stratégie de match (no-gi)',
      'Gestion des points & avantages', 'Gestion du chrono',
      'Pénalités & stalling', 'Règles de compétition',
      'Pull guard en compète', 'Takedowns en compète',
      'Sweep pour les 2 points', 'Pass + monté = 4 pts',
      'Prise de dos sécurisée (4 pts)', 'Jeu défensif',
      'Warm up compétition', 'Gestion du stress', 'Visualisation avant match',
      'Coupe de poids', 'Hydratation & nutrition compète',
      'Drilling spécifique compète', 'Match simulation',
      'Cardio compète', 'Récupération entre matchs',
      'Stratégie tournoi (bracket)',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// JUDO
// ─────────────────────────────────────────────────────────────────────
export const THEMES_JUDO: ThemeCategory[] = [
  {
    label: traduire('Kumi-kata (saisies)'),
    color: '#3B82F6',
    themes: [
      'Saisie classique', 'Saisie revers', 'Saisie manche', 'Saisie haute',
      'Saisie croisée', 'Casser les saisies', 'Combat de saisies',
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
    label: traduire('Koshi-waza (hanches)'),
    color: '#F97316',
    themes: [
      'O goshi', 'Uki goshi', 'Harai goshi', 'Tsuri goshi', 'Tsuri komi goshi',
      'Hane goshi', 'Utsuri goshi', 'Ushiro goshi', 'Koshi guruma',
    ],
  },
  {
    label: traduire('Ashi-waza (jambes)'),
    color: '#22C55E',
    themes: [
      'De ashi harai', 'Hiza guruma', 'Sasae tsuri komi ashi', 'Okuri ashi harai',
      'Uchi mata', 'Ouchi gari', 'Kouchi gari', 'O soto gari', 'Ko soto gari',
      'Ashi guruma', 'Harai tsuri komi ashi',
    ],
  },
  {
    label: traduire('Sutemi-waza (sacrifice)'),
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
      'Tate shiho gatame', 'Retournement', 'Sortie de contrôle', 'Passage à ne-waza',
    ],
  },
  {
    label: traduire('Soumissions'),
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
      'Enchaînements (renzoku-waza)', 'Fuites de saisie', 'Gestion de fin de combat',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// LUTTE (Wrestling)
// ─────────────────────────────────────────────────────────────────────
export const THEMES_LUTTE: ThemeCategory[] = [
  {
    label: traduire('Debout, attaques'),
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
      'Suplex arrière', 'Suplex avant', 'Bodylock', 'Pummeling',
      'Throw-by', 'Gut wrench debout', 'Headlock toss',
    ],
  },
  {
    label: traduire('Finitions de takedown'),
    color: '#F97316',
    themes: [
      'Running the pipe', 'Finish single jambe en l\'air', 'Dump',
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
    label: traduire('Escapes & reversals'),
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
    label: traduire('Debout'),
    color: '#3B82F6',
    themes: [
      'Single leg', 'Double leg', 'High crotch', 'Ankle pick',
      'Arm drag', 'Snap down', 'Front head lock', 'Underhook',
      'Russian tie', 'Tir direct', 'Défense takedown', 'Sprawl',
    ],
  },
  {
    label: traduire('Gardes no-gi'),
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
    label: traduire('Leg locks'),
    color: '#B91C1C',
    themes: [
      'Straight ankle lock', 'Heel hook (inside/outside)', 'Kneebar',
      'Kimura de cheville (toe hold)', 'Estima lock', 'Calf slicer', 'Ashi garami entry',
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
      'Hip escape', 'Bridge & roll', 'Frames', 'Défense leg lock',
      'Back escape', 'Reguard', 'Flow rolling',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// SAMBO
// ─────────────────────────────────────────────────────────────────────
export const THEMES_SAMBO: ThemeCategory[] = [
  {
    label: traduire('Projections'),
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
      'Straight ankle lock', 'Heel hook (Combat Sambo)', 'Kneebar',
      'Kimura de cheville (toe hold)', 'Achille', 'Calf slicer', 'Hip lock',
    ],
  },
  {
    label: traduire('Armlocks & kimuras'),
    color: '#EF4444',
    themes: [
      'Juji gatame', 'Kimura', 'Americana', 'Ude garami', 'Wristlock',
    ],
  },
  {
    label: traduire('Combat Sambo (striking)'),
    color: '#F97316',
    themes: [
      'Jab-cross', 'Low kick', 'Clinch', 'Genou', 'Défense striking', 'Enchainement frappes-projection',
    ],
  },
  {
    label: traduire('Défense & évasions'),
    color: '#64748B',
    themes: [
      'Contre-projection', 'Sortie side control', 'Défense leg lock',
      'Hip escape', 'Bridge & roll',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// CATCH WRESTLING
// ─────────────────────────────────────────────────────────────────────
export const THEMES_CATCH: ThemeCategory[] = [
  {
    label: traduire('Takedowns'),
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
    label: traduire('Stretches & cranks'),
    color: '#F97316',
    themes: [
      'Neck crank', 'Boston crab', 'Surfboard', 'Full nelson',
      'Body scissor', 'Stretch', 'Spladle',
    ],
  },
  {
    label: traduire('Submissions'),
    color: '#EF4444',
    themes: [
      'Double wrist lock (Kimura)', 'Hammerlock', 'Short arm scissor',
      'Top wrist lock', 'Key lock', 'Neck crank', 'Head scissor',
      'Guillotine', 'Kimura de cheville (toe hold)',
    ],
  },
  {
    label: traduire('Escapes & contres'),
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
    label: traduire('Frappes debout'),
    color: '#3B82F6',
    themes: [
      'Jab', 'Cross', 'Crochet', 'Uppercut', 'Overhand', 'Superman punch',
      'Low kick', 'Middle kick', 'High kick', 'Teep / push kick',
      'Coup de genou', 'Coup de coude', 'Spinning back kick', 'Spinning back fist',
    ],
  },
  {
    label: traduire('Combinaisons'),
    color: '#06B6D4',
    themes: [
      'Jab-cross', 'Jab-cross-crochet (1-2-3)', 'Corps-tête', 'Head-body-head',
      'Kick après main', 'Kick-punch', 'Feinte + contre', 'Kick low-high',
    ],
  },
  {
    label: traduire('Takedowns'),
    color: '#8B5CF6',
    themes: [
      'Double leg', 'Single leg', 'Ankle pick', 'Body lock', 'Cage wrestling',
      'Knee tap', 'Trip', 'Sprawl', 'Anti-takedown',
    ],
  },
  {
    label: traduire('Clinch & cage'),
    color: '#EF4444',
    themes: [
      'Thai clinch', 'Plum', 'Underhook', 'Overhook', 'Coup de genou clinch',
      'Coude clinch', 'Pummel', 'Cage control', 'Dirty boxing',
    ],
  },
  {
    label: traduire('Ground & Pound'),
    color: '#F97316',
    themes: [
      'GnP en mount', 'GnP en side control', 'GnP en back control',
      'GnP en guard top', 'Postures & cadres', 'Stand up safe', 'Elbows du dessus',
    ],
  },
  {
    label: traduire('Soumissions'),
    color: '#DC2626',
    themes: [
      'RNC', 'Triangle', 'Armbar', 'Kimura', "D'Arce", 'Anaconda', 'Guillotine',
      'Heel hook', 'Kneebar', 'Kimura de cheville (toe hold)', 'Americana',
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
      'Jab', 'Cross (direct arrière)', 'Crochet avant (lead hook)',
      'Crochet arrière (rear hook)', 'Uppercut avant', 'Uppercut arrière',
      'Overhand', 'Check hook',
    ],
  },
  {
    label: traduire('Combinaisons'),
    color: '#F97316',
    themes: [
      '1-2 (jab-cross)', '1-2-3', '1-1-2', '1-2-3-2', 'Double jab',
      'Jab-cross-uppercut', 'Body-tête', 'Tête-corps-tête', 'Feinte + 1-2',
      'Long-short combo',
    ],
  },
  {
    label: traduire('Frappes au corps'),
    color: '#EF4444',
    themes: [
      'Body jab', 'Body cross', 'Body hook', 'Liver shot',
      'Shovel hook', 'Uppercut au corps',
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Slip intérieur', 'Slip extérieur', 'Bob & weave', 'Roll',
      'Parry (jab/cross)', 'Block (garde haute)', 'Shoulder roll',
      'Pull counter', 'Couverture',
    ],
  },
  {
    label: traduire('Footwork & angles'),
    color: '#8B5CF6',
    themes: [
      'Pas glissé avant/arrière', 'Pivot', 'Pivot angle', 'Side step',
      'L-step', 'Out-of-range', 'Gestion de distance', 'Coupe-ring',
    ],
  },
  {
    label: traduire('Tactique & sparring'),
    color: '#06B6D4',
    themes: [
      'Feintes', 'Drills de réaction', 'Travail de pads', 'Sac lourd',
      'Ombre', 'Sparring technique', 'Gestion des rounds',
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
    label: traduire('Coudes (sok)'),
    color: '#DC2626',
    themes: [
      'Coude horizontal (sok tat)', 'Coude descendant (sok ti)',
      'Coude remontant (sok ngat)', 'Coude retourné (sok klab)',
      'Coude sauté (sok kratood)', 'Coude diagonal',
    ],
  },
  {
    label: traduire('Genoux (kao)'),
    color: '#F97316',
    themes: [
      'Kao trong (droit)', 'Kao chiang (diagonal)', 'Kao kong (courbe)',
      'Kao tat (rotation)', 'Kao loi (sauté)', 'Genou clinch',
    ],
  },
  {
    label: traduire('Pieds (te)'),
    color: '#8B5CF6',
    themes: [
      'Low kick (te tat)', 'Middle kick', 'High kick', 'Teep (push kick)',
      'Teep arrière', 'Te khao (rotation)', 'Spinning back kick',
      'Cut kick', 'Question mark kick',
    ],
  },
  {
    label: traduire('Clinch Thai'),
    color: '#EF4444',
    themes: [
      'Plum (double collar tie)', 'Pummel pour dominer', 'Sweeps en clinch',
      'Genoux en clinch', 'Coudes en clinch', 'Sortie de clinch',
      'Lock & break',
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Block low kick (check)', 'Block middle', 'Parry', 'Teep défense',
      'Esquive', 'Catch kick', 'Sweep après catch', 'Garde longue',
    ],
  },
  {
    label: traduire('Tactique & conditionnement'),
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
    label: traduire('Poings'),
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
    label: traduire('Combinaisons'),
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
    label: traduire('Footwork & angles'),
    color: '#06B6D4',
    themes: [
      'Pas glissé', 'Pivot', 'Switch step', 'Side step', 'Coupe-ring',
      'Distance management', 'L-step',
    ],
  },
  {
    label: traduire('Tactique'),
    color: '#64748B',
    themes: [
      'Feintes', 'Pads', 'Sac lourd', 'Ombre', 'Drills réactivité',
      'Sparring technique',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// KARATÉ
// ─────────────────────────────────────────────────────────────────────
export const THEMES_KARATE: ThemeCategory[] = [
  {
    label: traduire('Kihon (bases)'),
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
    label: traduire('Blocages (uke waza)'),
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
      'Kihon kumité', 'Ippon kumité', 'Sanbon kumité', 'Jiyu kumité (libre)',
      'Timing & distance', 'Feintes', 'Contre-attaque',
    ],
  },
  {
    label: traduire('Tactique & conditionnement'),
    color: '#64748B',
    themes: [
      'Maai (distance)', 'Zanshin', 'Déplacements', 'Makiwara',
      'Travail cible', 'Respiration',
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
    label: traduire('Poings & mains'),
    color: '#F97316',
    themes: [
      'Jireugi (direct)', 'Jab', 'Cross', 'Uppercut', 'Hammer fist',
      'Knife hand', 'Backfist',
    ],
  },
  {
    label: traduire('Poomsae (formes)'),
    color: '#06B6D4',
    themes: [
      'Taegeuk il jang', 'Taegeuk i jang', 'Taegeuk sam jang', 'Taegeuk sa jang',
      'Taegeuk o jang', 'Koryo', 'Keumgang',
    ],
  },
  {
    label: traduire('Kyorugi (combat)'),
    color: '#EF4444',
    themes: [
      'Step sparring', 'Combat libre', 'Gestion distance', 'Feintes',
      'Contres', 'Double kick counter', 'Attaque sur entrée',
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Blocages poings', 'Esquive', 'Jam (casser rythme)',
      'Cutting kick', 'Contre-kick', 'Pivot défensif',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// BOXE FRANÇAISE (SAVATE)
// ─────────────────────────────────────────────────────────────────────
export const THEMES_BOXE_FRANCAISE: ThemeCategory[] = [
  {
    label: traduire('Poings'),
    color: '#3B82F6',
    themes: [
      'Direct', 'Direct du bras arrière', 'Crochet', 'Uppercut',
      'Swing', 'Crochet bas',
    ],
  },
  {
    label: traduire('Pieds, techniques de base'),
    color: '#8B5CF6',
    themes: [
      'Fouetté bas', 'Fouetté médian', 'Fouetté figure',
      'Chassé frontal', 'Chassé latéral', 'Chassé bas',
      'Revers (frontal, latéral, figure)', 'Coup de pied bas (CPB)',
    ],
  },
  {
    label: traduire('Pieds, techniques avancées'),
    color: '#F97316',
    themes: [
      'Double fouetté', 'Fouetté revers', 'Chassé retourné',
      'Coup de pied sauté', 'Enchaînement pieds-poings',
    ],
  },
  {
    label: traduire('Défense'),
    color: '#22C55E',
    themes: [
      'Parade bloquée', 'Parade chassée', 'Parade opposition',
      'Esquive rotative', 'Esquive latérale', 'Esquive sautée',
      'Déblayage', 'Contre frappe',
    ],
  },
  {
    label: traduire('Déplacements & distance'),
    color: '#06B6D4',
    themes: [
      'Pas de côté', 'Pas croisé', 'Pas chassé', 'Rupture',
      'Glissade', 'Placement',
    ],
  },
  {
    label: traduire('Assauts & tactique'),
    color: '#64748B',
    themes: [
      'Assaut technique', 'Pré-combat', 'Combat', 'Feintes',
      'Gestion de la distance', 'Touches de précision',
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
      'Coup de pied bas', 'Front kick', 'Round kick',
      'Hammer fist', 'Coup de tête',
    ],
  },
  {
    label: traduire('Défense face à face'),
    color: '#22C55E',
    themes: [
      'Défense contre poing direct', 'Défense contre crochet',
      'Défense contre coup de pied', 'Défense contre clinch',
      'Défense contre saisie cou', 'Défense contre saisie de face',
      'Défense contre saisie dos',
    ],
  },
  {
    label: traduire('Défense armes'),
    color: '#EF4444',
    themes: [
      'Défense couteau (de face)', 'Défense couteau (de dos)',
      'Défense pistolet (de face)', 'Défense pistolet (de dos)',
      'Défense bâton (de haut)', 'Défense bâton (latéral)',
      'Désarmement',
    ],
  },
  {
    label: traduire('Situations tactiques'),
    color: '#F97316',
    themes: [
      'Agresseur multiple', 'Agression au sol (ground)',
      'Voiture / espace confiné', 'Défense 3e partie',
      'Environnement obscur',
    ],
  },
  {
    label: traduire('Sol & ground'),
    color: '#8B5CF6',
    themes: [
      'Get up safe', 'Kicks au sol', 'Défense en monté',
      'Sortie de garde forcée', 'Se relever en sécurité',
    ],
  },
  {
    label: traduire('Conditionnement & mindset'),
    color: '#64748B',
    themes: [
      'Stress drills', 'Conditionnement physique', 'Pads',
      'Visualisation', 'Sparring réaliste', 'Gestion panique',
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
