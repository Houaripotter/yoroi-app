/**
 * Lexique de la dictee de seance (nuit du 14 octobre) : les mots de la salle et du tapis tels qu'on
 * les dit, avec l'argot, les descriptions de mouvement et les fautes de la reconnaissance vocale.
 * Donnees pures, lues par lib/v2/seance/dictee.ts. Tout est ecrit en minuscules sans accents (comme
 * la phrase normalisee) ; les tirets de « juji-gatame » deviennent des espaces.
 */

/* ------------------------------------------------------------------ */
/* Musculation                                                          */
/* ------------------------------------------------------------------ */

import { traduire } from '@/lib/i18n/tr';
export type ExoDef = {
  id: string;
  /** nom affiche et enregistre */
  label: string;
  /** pour la question « Tu as fait ..., c'est ca ? » */
  dit: string;
  /** formes dites ; le s du pluriel est accepte tout seul */
  aliases: string[];
  /** poids du corps par defaut : la charge ne manque pas */
  pdc?: boolean;
  /** proposes quand l'app devine */
  proches?: string[];
};

export const EXOS: ExoDef[] = [
  // poussee
  { id: 'dev_couche', label: 'Développé couché', dit: traduire('du développé couché'), aliases: ['developpe couche', 'developper couche', 'developpe couche barre', 'dev couche', 'devlope couche', 'developpe allonge', 'bench press', 'bench', 'banc plat'], proches: ['dev_incline', 'dev_halteres'] },
  { id: 'dev_incline', label: 'Développé incliné', dit: traduire('du développé incliné'), aliases: ['developpe couche incline', 'developpe incline', 'dev incline', 'incline barre', 'incline halteres', 'banc incline', 'incline bench'], proches: ['dev_couche', 'dev_decline'] },
  { id: 'dev_decline', label: 'Développé décliné', dit: traduire('du développé décliné'), aliases: ['developpe couche decline', 'developpe decline', 'dev decline', 'banc decline'], proches: ['dev_couche', 'dips'] },
  { id: 'dev_halteres', label: 'Développé haltères', dit: traduire('du développé aux haltères'), aliases: ['developpe halteres', 'developpe aux halteres', 'developpe couche halteres', 'developpe couche aux halteres', 'dumbbell press'], proches: ['dev_couche', 'ecarte_halteres'] },
  { id: 'dev_militaire', label: 'Développé militaire', dit: traduire('du développé militaire'), aliases: ['developpe militaire', 'dev militaire', 'militaire debout', 'overhead press', 'ohp', 'developpe nuque', 'developpe debout', 'military press'], proches: ['dev_epaules', 'dev_arnold'] },
  { id: 'dev_epaules', label: 'Développé épaules', dit: traduire('du développé épaules'), aliases: ['developpe epaules', 'developpe epaule', 'developpe assis', 'shoulder press', 'presse epaules', 'developpe epaules halteres'], proches: ['dev_militaire', 'dev_arnold'] },
  { id: 'dev_arnold', label: 'Développé Arnold', dit: traduire('du développé Arnold'), aliases: ['developpe arnold', 'arnold press'], proches: ['dev_epaules', 'dev_militaire'] },
  { id: 'ecarte_poulie', label: 'Écarté à la poulie (vis-à-vis)', dit: traduire('des écartés à la poulie (vis-à-vis)'), aliases: ['vis a vis', 'poulie vis a vis', 'ecarte vis a vis', 'ecartes vis a vis', 'ecarte poulie', 'ecartes poulie', 'ecarte a la poulie', 'ecartes a la poulie', 'ecarte aux poulies', 'ecartes aux poulies', 'cable fly', 'cables fly', 'cable crossover', 'crossover', 'cross over', 'croise poulie', 'croises poulie', 'pec fly poulie', 'fly poulie', 'fly a la poulie'], proches: ['pec_deck', 'ecarte_halteres'] },
  { id: 'pec_deck', label: 'Pec deck (butterfly)', dit: traduire('du pec deck (butterfly)'), aliases: ['pec deck', 'peck deck', 'pec dec', 'pecdeck', 'butterfly', 'machine a pecs', 'machine pecs', 'ecarte machine', 'ecartes machine', 'ecarte a la machine', 'ecartes a la machine', 'pec fly'], proches: ['ecarte_poulie', 'ecarte_halteres'] },
  { id: 'ecarte_halteres', label: 'Écarté haltères', dit: traduire('des écartés aux haltères'), aliases: ['ecarte halteres', 'ecartes halteres', 'ecarte aux halteres', 'ecartes aux halteres', 'ecarte couche', 'ecartes couche', 'dumbbell fly', 'fly halteres'], proches: ['ecarte_poulie', 'pec_deck'] },
  { id: 'pullover', label: 'Pull-over', dit: traduire('du pull-over'), aliases: ['pull over', 'pullover', 'pull hover'], proches: ['ecarte_halteres', 'tirage_vertical'] },
  { id: 'pompes', label: 'Pompes', dit: traduire('des pompes'), aliases: ['pompes', 'pompe', 'push ups', 'push up', 'pushups', 'pompes diamant', 'pompes declinees', 'pompes inclinees', 'pompes claquees'], pdc: true, proches: ['dips', 'dev_couche'] },
  { id: 'dips', label: 'Dips', dit: traduire('des dips'), aliases: ['dips', 'dip', 'barres paralleles', 'dips aux barres', 'dips entre deux bancs', 'dips banc'], pdc: true, proches: ['pompes', 'triceps_poulie'] },
  // jambes
  { id: 'squat', label: 'Squat', dit: traduire('du squat'), aliases: ['squats', 'squat', 'squat barre', 'back squat', 'squat arriere', 'squate', 'squatte', 'skwat', 'flexions de jambes', 'flexion de jambes'], proches: ['squat_avant', 'presse'] },
  { id: 'squat_avant', label: 'Squat avant', dit: traduire('du squat avant'), aliases: ['squat avant', 'front squat', 'squat devant'], proches: ['squat', 'squat_goblet'] },
  { id: 'squat_bulgare', label: 'Squat bulgare', dit: traduire('du squat bulgare'), aliases: ['squat bulgare', 'squats bulgares', 'fentes bulgares', 'fente bulgare', 'bulgarian split squat', 'split squat', 'bulgare'], proches: ['fentes', 'squat'] },
  { id: 'squat_goblet', label: 'Goblet squat', dit: traduire('du goblet squat'), aliases: ['goblet squat', 'squat goblet', 'gobelet squat', 'squat gobelet'], proches: ['squat', 'squat_avant'] },
  { id: 'hack_squat', label: 'Hack squat', dit: traduire('du hack squat'), aliases: ['hack squat', 'hacksquat', 'squat machine', 'squat a la machine'], proches: ['presse', 'squat'] },
  { id: 'sdt', label: 'Soulevé de terre', dit: traduire('du soulevé de terre'), aliases: ['souleve de terre', 'soulever de terre', 'souleve terre', 'deadlift', 'dead lift', 'sdt'], proches: ['sdt_roumain', 'sdt_sumo'] },
  { id: 'sdt_roumain', label: 'Soulevé de terre roumain', dit: traduire('du soulevé de terre roumain'), aliases: ['souleve de terre roumain', 'souleve roumain', 'roumain', 'rdl', 'romanian deadlift', 'souleve jambes tendues', 'jambes tendues', 'stiff leg', 'souleve de terre jambes tendues'], proches: ['sdt', 'good_morning'] },
  { id: 'sdt_sumo', label: 'Soulevé de terre sumo', dit: traduire('du soulevé de terre sumo'), aliases: ['souleve de terre sumo', 'sumo deadlift', 'souleve sumo', 'sumo'], proches: ['sdt', 'squat'] },
  { id: 'good_morning', label: 'Good morning', dit: traduire('du good morning'), aliases: ['good morning', 'good mornings'], proches: ['sdt_roumain', 'sdt'] },
  { id: 'hip_thrust', label: 'Hip thrust', dit: traduire('du hip thrust'), aliases: ['hip thrust', 'hip trust', 'hipthrust', 'hip thrusts', 'hip trust barre', 'releve de bassin', 'releves de bassin'], proches: ['pont_fessier', 'sdt_roumain'] },
  { id: 'pont_fessier', label: 'Pont fessier', dit: traduire('du pont fessier'), aliases: ['pont fessier', 'ponts fessiers', 'glute bridge'], pdc: true, proches: ['hip_thrust'] },
  { id: 'fentes', label: 'Fentes', dit: traduire('des fentes'), aliases: ['fentes', 'fente', 'lunges', 'lunge', 'fentes marchees', 'fentes avant', 'fentes arriere', 'fentes halteres', 'walking lunges'], proches: ['squat_bulgare', 'squat'] },
  { id: 'presse', label: 'Presse à cuisses', dit: traduire('de la presse à cuisses'), aliases: ['presse a cuisses', 'presse a cuisse', 'presse cuisses', 'presse', 'leg press', 'presse inclinee', 'presse horizontale'], proches: ['hack_squat', 'squat'] },
  { id: 'leg_extension', label: 'Leg extension', dit: traduire('du leg extension'), aliases: ['leg extension', 'leg extensions', 'leg ext', 'extension des jambes', 'extensions des jambes', 'extension jambes', 'extension quadriceps', 'extensions quadriceps', 'extension quadri', 'extension des quadriceps', 'chaise a quadriceps'], proches: ['leg_curl', 'presse'] },
  { id: 'leg_curl', label: 'Leg curl', dit: traduire('du leg curl'), aliases: ['leg curl', 'leg curls', 'curl ischios', 'curl ischio', 'curl jambes', 'curl des jambes', 'curl femoral', 'ischios machine', 'leg curl allonge', 'leg curl assis'], proches: ['leg_extension', 'sdt_roumain'] },
  { id: 'mollets', label: 'Mollets', dit: traduire('des mollets'), aliases: ['mollets', 'mollet', 'extension mollets', 'extensions mollets', 'extension des mollets', 'extensions des mollets', 'calf raises', 'calf raise', 'mollets debout', 'mollets assis', 'releves de mollets', 'releve de mollets', 'mollets a la presse', 'extensions de mollets'], proches: ['presse', 'squat'] },
  { id: 'adducteurs', label: 'Adducteurs machine', dit: traduire('des adducteurs à la machine'), aliases: ['adducteurs', 'adducteur', 'machine adducteurs', 'machine a adducteurs'], proches: ['abducteurs'] },
  { id: 'abducteurs', label: 'Abducteurs machine', dit: traduire('des abducteurs à la machine'), aliases: ['abducteurs', 'abducteur', 'machine abducteurs', 'machine a abducteurs'], proches: ['adducteurs'] },
  // tirage
  { id: 'tractions', label: 'Tractions', dit: traduire('des tractions'), aliases: ['tractions', 'traction', 'pull ups', 'pull up', 'pullups', 'pullup', 'chin ups', 'chin up', 'tractions supination', 'tractions pronation', 'tractions prise large', 'tractions lestees', 'barre fixe', 'tractions australiennes'], pdc: true, proches: ['tirage_vertical', 'rowing'] },
  { id: 'tirage_vertical', label: 'Tirage vertical', dit: traduire('du tirage vertical'), aliases: ['tirage vertical', 'tirage poitrine', 'tirage nuque', 'tirage devant', 'tirage haut', 'tirage poulie haute', 'tirage a la poulie haute', 'poulie haute', 'lat pulldown', 'lat pull down', 'pulldown', 'pull down', 'tirage dorsaux', 'tirage prise serree', 'tirage prise large', 'tirage vertical machine'], proches: ['tractions', 'tirage_horizontal'] },
  { id: 'tirage_horizontal', label: 'Tirage horizontal', dit: traduire('du tirage horizontal'), aliases: ['tirage horizontal', 'tirage assis', 'tirage bas', 'tirage poulie basse', 'tirage a la poulie basse', 'poulie basse', 'rowing assis', 'rowing poulie', 'rowing a la poulie', 'seated row', 'tirage horizontal machine'], proches: ['rowing_barre', 'tirage_vertical'] },
  { id: 'rowing_barre', label: 'Rowing barre', dit: traduire('du rowing barre'), aliases: ['rowing barre', 'rowing buste penche', 'rowing penche', 'barbell row', 'rowing barre buste penche', 'tirage buste penche', 'rowing yates', 'rowing t bar', 't bar', 'tbar'], proches: ['rowing_haltere', 'tirage_horizontal'] },
  { id: 'rowing_haltere', label: 'Rowing haltère', dit: traduire('du rowing haltère'), aliases: ['rowing haltere', 'rowing halteres', 'rowing un bras', 'rowing unilateral', 'dumbbell row', 'rowing a un bras'], proches: ['rowing_barre', 'tirage_horizontal'] },
  { id: 'rowing', label: 'Rowing', dit: traduire('du rowing'), aliases: ['rowing'], proches: ['rowing_barre', 'tirage_horizontal'] },
  { id: 'rowing_menton', label: 'Rowing menton', dit: traduire('du rowing menton'), aliases: ['rowing menton', 'tirage menton', 'upright row', 'tirage au menton', 'rowing vertical'], proches: ['elevations_laterales', 'shrugs'] },
  { id: 'face_pull', label: 'Face pull', dit: traduire('du face pull'), aliases: ['face pull', 'face pulls', 'facepull', 'face poule', 'tirage visage', 'tirage au visage'], proches: ['oiseau', 'rowing_menton'] },
  { id: 'shrugs', label: 'Shrugs', dit: traduire('des shrugs'), aliases: ['shrugs', 'shrug', 'haussements d\'epaules', 'haussement d\'epaules', 'haussements epaules', 'trapezes', 'shrug halteres', 'shrug barre'], proches: ['rowing_menton', 'face_pull'] },
  // bras
  { id: 'curl_biceps', label: 'Curl biceps', dit: traduire('du curl biceps'), aliases: ['curl biceps', 'curls biceps', 'curl', 'curls', 'curl barre', 'curl halteres', 'curl barre ez', 'curl ez', 'curl alterne', 'curl debout', 'curl incline', 'curl poulie', 'biceps curl'], proches: ['curl_marteau', 'curl_pupitre'] },
  { id: 'curl_marteau', label: 'Curl marteau', dit: traduire('du curl marteau'), aliases: ['curl marteau', 'curls marteau', 'marteau', 'hammer curl', 'hammer curls', 'hammer'], proches: ['curl_biceps', 'curl_pupitre'] },
  { id: 'curl_pupitre', label: 'Curl pupitre', dit: traduire('du curl au pupitre'), aliases: ['curl pupitre', 'curl au pupitre', 'pupitre', 'larry scott', 'preacher curl'], proches: ['curl_biceps', 'curl_concentre'] },
  { id: 'curl_concentre', label: 'Curl concentré', dit: traduire('du curl concentré'), aliases: ['curl concentre', 'curl concentration', 'curls concentres'], proches: ['curl_biceps', 'curl_pupitre'] },
  { id: 'triceps_poulie', label: 'Triceps à la poulie', dit: traduire('des extensions triceps à la poulie'), aliases: ['triceps poulie', 'triceps a la poulie', 'extension triceps poulie', 'extensions triceps poulie', 'extension triceps a la poulie', 'extensions a la poulie', 'extension a la poulie', 'pushdown', 'push down', 'triceps corde', 'triceps a la corde', 'extension corde', 'extensions corde', 'poulie triceps', 'pushdown corde'], proches: ['barre_front', 'extension_triceps'] },
  { id: 'barre_front', label: 'Barre au front', dit: traduire('de la barre au front'), aliases: ['barre au front', 'barre front', 'barre aux fronts', 'skull crusher', 'skull crushers', 'skullcrusher', 'extension triceps couche', 'extensions triceps couche', 'barre au front halteres'], proches: ['triceps_poulie', 'extension_triceps'] },
  { id: 'extension_triceps', label: 'Extension triceps', dit: traduire('des extensions triceps'), aliases: ['extension triceps', 'extensions triceps', 'extension nuque', 'extensions nuque', 'extension au dessus de la tete', 'french press', 'extension triceps haltere', 'extension verticale'], proches: ['triceps_poulie', 'barre_front'] },
  { id: 'kickback', label: 'Kickback triceps', dit: traduire('des kickbacks triceps'), aliases: ['kickback', 'kick back', 'kickbacks', 'kickback triceps', 'extension triceps buste penche'], proches: ['triceps_poulie', 'extension_triceps'] },
  // epaules
  { id: 'elevations_laterales', label: 'Élévations latérales', dit: traduire('des élévations latérales'), aliases: ['elevations laterales', 'elevation laterale', 'elevations laterale', 'laterales', 'lateral raise', 'lateral raises', 'elevations laterales halteres', 'elevations laterales poulie', 'oiseaux lateraux'], proches: ['oiseau', 'elevations_frontales'] },
  { id: 'elevations_frontales', label: 'Élévations frontales', dit: traduire('des élévations frontales'), aliases: ['elevations frontales', 'elevation frontale', 'frontales', 'front raise', 'front raises', 'elevations avant'], proches: ['elevations_laterales', 'dev_militaire'] },
  { id: 'oiseau', label: 'Oiseau', dit: traduire('de l’oiseau'), aliases: ['oiseau', 'oiseaux', 'l\'oiseau', 'elevations posterieures', 'elevation posterieure', 'reverse fly', 'reverse pec deck', 'rear delt', 'deltoides posterieurs', 'oiseau machine', 'oiseau buste penche', 'butterfly inverse'], proches: ['face_pull', 'elevations_laterales'] },
  // tronc
  { id: 'gainage', label: 'Gainage', dit: traduire('du gainage'), aliases: ['gainage', 'gainages', 'planche', 'plank', 'gainage lateral', 'gainage ventral', 'gainage frontal', 'planche laterale'], pdc: true, proches: ['crunch', 'roue_abdos'] },
  { id: 'crunch', label: 'Crunchs', dit: traduire('des crunchs'), aliases: ['crunchs', 'crunch', 'crunches', 'crunch poulie', 'crunchs a la poulie', 'crunch machine'], pdc: true, proches: ['releves_jambes', 'abdos'] },
  { id: 'abdos', label: 'Abdos', dit: traduire('des abdos'), aliases: ['abdos', 'abdominaux', 'sit ups', 'sit up', 'situps'], pdc: true, proches: ['crunch', 'gainage'] },
  { id: 'releves_jambes', label: 'Relevés de jambes', dit: traduire('des relevés de jambes'), aliases: ['releve de jambes', 'releves de jambes', 'releve jambes', 'releves jambes', 'releve de genoux', 'releves de genoux', 'leg raises', 'leg raise', 'releve de jambes suspendu', 'releves de jambes suspendu', 'hanging leg raise', 'releves de jambe'], pdc: true, proches: ['crunch', 'gainage'] },
  { id: 'russian_twist', label: 'Russian twist', dit: traduire('du russian twist'), aliases: ['russian twist', 'russian twists', 'rotations du buste'], pdc: true, proches: ['crunch', 'gainage'] },
  { id: 'roue_abdos', label: 'Roue abdominale', dit: traduire('de la roue abdominale'), aliases: ['roue abdominale', 'roue abdo', 'roue a abdos', 'roulette abdos', 'roulette', 'ab wheel'], pdc: true, proches: ['gainage', 'crunch'] },
  { id: 'mountain_climbers', label: 'Mountain climbers', dit: traduire('des mountain climbers'), aliases: ['mountain climbers', 'mountain climber', 'montain climbers', 'grimpeurs'], pdc: true, proches: ['burpees', 'gainage'] },
  // fonctionnel, halterophilie
  { id: 'kb_swing', label: 'Kettlebell swing', dit: traduire('des kettlebell swings'), aliases: ['kettlebell swing', 'kettlebell swings', 'kettle bell swing', 'swings kettlebell', 'swings', 'swing', 'swing russe', 'swing americain'], proches: ['sdt', 'hip_thrust'] },
  { id: 'thrusters', label: 'Thrusters', dit: traduire('des thrusters'), aliases: ['thrusters', 'thruster'], proches: ['squat_avant', 'dev_militaire'] },
  { id: 'burpees', label: 'Burpees', dit: traduire('des burpees'), aliases: ['burpees', 'burpee', 'burpies', 'burpy'], pdc: true, proches: ['mountain_climbers', 'pompes'] },
  { id: 'epaule_jete', label: 'Épaulé-jeté', dit: traduire('de l’épaulé-jeté'), aliases: ['epaule jete', 'epaules jetes', 'clean and jerk', 'clean jerk'], proches: ['epaule', 'arrache'] },
  { id: 'epaule', label: 'Épaulé', dit: traduire('de l’épaulé'), aliases: ['power clean', 'hang clean'], proches: ['epaule_jete', 'sdt'] },
  { id: 'arrache', label: 'Arraché', dit: traduire('de l’arraché'), aliases: ['arrache', 'arraches', 'snatch', 'power snatch'], proches: ['epaule_jete'] },
  { id: 'muscle_up', label: 'Muscle up', dit: traduire('des muscle up'), aliases: ['muscle ups', 'muscle up', 'muscleup'], pdc: true, proches: ['tractions', 'dips'] },
  { id: 'wall_ball', label: 'Wall ball', dit: traduire('des wall balls'), aliases: ['wall balls', 'wall ball', 'wallball'], proches: ['thrusters', 'squat'] },
  { id: 'box_jump', label: 'Box jump', dit: traduire('des box jumps'), aliases: ['box jumps', 'box jump', 'sauts sur caisse', 'saut sur box', 'sauts sur box'], pdc: true, proches: ['burpees', 'squat'] },
  { id: 'farmer_walk', label: 'Farmer walk', dit: traduire('du farmer walk'), aliases: ['farmer walk', 'farmers walk', 'marche du fermier'], proches: ['shrugs', 'sdt'] },
];

export const EXO_BY_ID = new Map(EXOS.map((e) => [e.id, e]));

/**
 * Mots vagues : ils lancent un exercice, mais l'app demande lequel. defaut : la proposition mise en
 * avant (« c'est ca ? »), sinon une simple question avec les choix.
 */
export const EXO_VAGUES: { re: string; defaut?: string; choix: string[]; dit: string }[] = [
  { re: 'poulies?|cables?', choix: ['ecarte_poulie', 'triceps_poulie', 'tirage_vertical'], dit: 'Poulie' },
  { re: 'developpes?|dev', defaut: 'dev_couche', choix: ['dev_militaire', 'dev_incline'], dit: 'Développé' },
  { re: 'tirages?', defaut: 'tirage_vertical', choix: ['tirage_horizontal', 'rowing_menton'], dit: 'Tirage' },
  { re: 'ecartes?|ecartees?|flys?', defaut: 'ecarte_halteres', choix: ['ecarte_poulie', 'pec_deck'], dit: 'Écartés' },
  { re: 'biceps', defaut: 'curl_biceps', choix: ['curl_marteau', 'curl_pupitre'], dit: 'Biceps' },
  { re: 'triceps', defaut: 'triceps_poulie', choix: ['barre_front', 'dips'], dit: 'Triceps' },
  { re: 'elevations?', defaut: 'elevations_laterales', choix: ['elevations_frontales', 'oiseau'], dit: 'Élévations' },
  { re: 'extensions?', choix: ['leg_extension', 'triceps_poulie', 'mollets'], dit: 'Extensions' },
];

/**
 * Descriptions de mouvement (« les machins quand t'ecartes les poulies et que tu les resserres
 * devant »). Lu dans l'ordre : le premier qui colle gagne. avec : il faut aussi ce mot dans le bloc.
 */
export const EXO_DESCRIPTIONS: { id: string; re: RegExp; avec?: RegExp; choix: string[] }[] = [
  { id: 'oiseau', re: /(?:penche|buste penche|plie en avant|en avant).{0,40}(?:ecart|ouvr|leve|monte)\w* (?:les )?bras|(?:ecart|ouvr)\w* (?:les )?bras.{0,30}(?:penche|en arriere)/, choix: ['face_pull', 'elevations_laterales'] },
  { id: 'ecarte_poulie', re: /(?:ecart|ouvr|ouvert|ecarte)\w*.{0,50}(?:resserr|ramen|ferm|croise|rejoin|rapproch|ramene|serre)|(?:resserr|rapproch|ramen)\w*.{0,30}devant/, avec: /poulies?|cables?|vis a vis/, choix: ['pec_deck', 'ecarte_halteres'] },
  { id: 'pec_deck', re: /(?:ecart|ouvr)\w*.{0,50}(?:resserr|ramen|ferm|croise|rejoin|rapproch|serre)|(?:resserr|rapproch|ramen)\w*.{0,30}devant/, avec: /machine|assis|pec/, choix: ['ecarte_poulie', 'ecarte_halteres'] },
  { id: 'ecarte_halteres', re: /(?:ecart|ouvr)\w*.{0,50}(?:resserr|ramen|ferm|croise|rejoin|rapproch|serre)|(?:allonge|couche).{0,30}(?:ecart|ouvr)\w* (?:les )?bras/, choix: ['ecarte_poulie', 'pec_deck'] },
  { id: 'face_pull', re: /tir\w* (?:la |les )?(?:corde|poulie|cordes).{0,30}(?:vers|au niveau|jusqu'?au|devant) (?:du |le |la |les )?(?:visage|front|tete|yeux|nez)/, choix: ['rowing_menton', 'oiseau'] },
  { id: 'rowing_menton', re: /(?:tir|mont|remont|lev)\w* .{0,30}(?:vers|jusqu'?au|au niveau du|sous|sous le|au) (?:le )?menton/, choix: ['shrugs', 'elevations_laterales'] },
  { id: 'tirage_vertical', re: /(?:tir|ramen|descend)\w* .{0,35}(?:vers|jusqu'?a|devant|sur|a) (?:la |le |les )?(?:poitrine|clavicules?|torse|pecs)|tir\w* .{0,20}(?:d'en haut|du haut|vers le bas)|tir\w* (?:la )?(?:barre|poulie) (?:haute|du haut)/, choix: ['tractions', 'tirage_horizontal'] },
  { id: 'tirage_horizontal', re: /(?:tir|ramen)\w* .{0,35}(?:vers|jusqu'?au|au|contre) (?:le |la )?(?:ventre|nombril|bide|abdos)|assis.{0,30}tir\w*/, choix: ['rowing_barre', 'rowing_haltere'] },
  { id: 'tractions', re: /(?:me |se |te )?hiss\w*|(?:monte|passe)\w* (?:le )?menton .{0,20}(?:au dessus|barre)|suspendu.{0,30}(?:monte|tire)\w* (?:mon |le )?(?:corps|menton)/, choix: ['tirage_vertical', 'muscle_up'] },
  { id: 'elevations_laterales', re: /(?:lev|mont|remont)\w* (?:les )?(?:bras|halteres|poids) (?:sur les cotes|sur le cote|de chaque cote|en croix|lateralement|a l'horizontale|sur les cotes|sur le cote)/, choix: ['elevations_frontales', 'oiseau'] },
  { id: 'elevations_frontales', re: /(?:lev|mont)\w* (?:les )?(?:bras|halteres|poids) (?:devant|droit devant|en avant)/, choix: ['elevations_laterales', 'dev_militaire'] },
  { id: 'triceps_poulie', re: /(?:pouss|appuy|tir|descend)\w* .{0,25}(?:vers le bas|en bas|jusqu'aux cuisses).{0,25}(?:corde|poulie|barre|triceps)?|(?:corde|poulie).{0,25}(?:pouss|appuy)\w* .{0,15}(?:bas)/, avec: /poulies?|cordes?|triceps|cables?/, choix: ['barre_front', 'extension_triceps'] },
  { id: 'barre_front', re: /(?:descend|ramen)\w* (?:la )?barre .{0,20}(?:vers|sur|au|jusqu'au) (?:le |la )?(?:front|tete|visage)/, choix: ['extension_triceps', 'triceps_poulie'] },
  { id: 'curl_biceps', re: /(?:pli|monte|remont|ramen|ramene)\w* (?:les )?(?:bras|avant bras|coudes|halteres|la barre|poids) .{0,25}(?:vers|jusqu'aux?|aux?|contre) (?:les |la |le )?(?:epaules?|poitrine|menton)/, choix: ['curl_marteau', 'curl_pupitre'] },
  { id: 'shrugs', re: /(?:hauss|monte|remont|lev)\w* (?:les )?epaules|(?:epaules?) .{0,15}(?:vers les |aux )oreilles/, choix: ['rowing_menton', 'face_pull'] },
  { id: 'hip_thrust', re: /(?:monte|pouss|leve|remont)\w* (?:le |les )?(?:bassin|hanches|fesses).{0,40}(?:banc|barre|dos)|(?:dos|epaules) (?:sur|contre) (?:le |un )banc.{0,40}(?:bassin|hanches|fesses)/, choix: ['pont_fessier', 'sdt_roumain'] },
  { id: 'pont_fessier', re: /(?:allonge|au sol|par terre).{0,30}(?:monte|leve|pouss)\w* (?:le |les )?(?:bassin|hanches|fesses)/, choix: ['hip_thrust'] },
  { id: 'leg_curl', re: /(?:pli|ramen|repli|ramene)\w* (?:les )?jambes|talons? (?:vers|aux|contre) (?:les )?fesses/, choix: ['leg_extension', 'sdt_roumain'] },
  { id: 'leg_extension', re: /(?:assis|machine).{0,35}(?:tend|lev|monte|deplie)\w* (?:les )?jambes|(?:tend|deplie)\w* (?:les )?jambes.{0,30}(?:assis|machine)/, choix: ['leg_curl', 'presse'] },
  { id: 'mollets', re: /(?:sur |monte\w* sur )(?:la |les )?pointes? (?:des |de |du )?pieds?|(?:lev|monte)\w* (?:les )?talons/, choix: ['presse', 'squat'] },
  { id: 'releves_jambes', re: /(?:suspendu|accroche|pendu).{0,40}(?:monte|leve|remonte|ramene)\w* (?:les )?(?:jambes|genoux)|(?:monte|leve|remonte|ramene)\w* (?:les )?(?:jambes|genoux).{0,30}(?:suspendu|accroche|barre)/, choix: ['crunch', 'gainage'] },
  { id: 'dips', re: /(?:entre|sur) (?:les |deux |2 )?(?:barres?|bancs?) (?:paralleles )?.{0,30}(?:descend|monte|pouss)|(?:descend|pouss)\w* .{0,20}(?:entre|sur) (?:les |deux |2 )(?:barres|bancs)/, choix: ['pompes', 'triceps_poulie'] },
  { id: 'sdt', re: /(?:soulev|ramass|leve|remont|tir)\w* (?:la )?barre (?:du |depuis le |au |par terre|a partir du )(?:sol)?/, choix: ['sdt_roumain', 'sdt_sumo'] },
  { id: 'dev_couche', re: /(?:allonge|couche|sur le banc).{0,40}pouss\w* (?:la )?barre|pouss\w* (?:la )?barre .{0,30}(?:allonge|couche|sur le banc)/, choix: ['dev_incline', 'dev_halteres'] },
  { id: 'dev_militaire', re: /pouss\w* .{0,30}(?:au dessus de (?:la |ma )?tete|vers le plafond|au dessus de moi)/, choix: ['dev_epaules', 'dev_arnold'] },
  { id: 'presse', re: /pouss\w* .{0,25}(?:avec )?(?:les |mes )?(?:jambes|pieds).{0,30}(?:plateau|machine|charge|plaque)|(?:plateau|plaque).{0,30}(?:pouss)\w* (?:avec )?(?:les )?(?:jambes|pieds)/, choix: ['hack_squat', 'squat'] },
  { id: 'squat', re: /(?:descend|flechi|plie)\w* .{0,20}(?:les )?(?:jambes|genoux|cuisses).{0,30}(?:barre|dos|epaules|nuque)|barre (?:sur|derriere) (?:les |la )?(?:epaules|nuque|dos).{0,30}(?:descend|flechi|plie)/, choix: ['squat_avant', 'presse'] },
  { id: 'kb_swing', re: /balanc\w* .{0,30}(?:kettlebell|kettle|boule|poids)/, choix: ['sdt', 'hip_thrust'] },
  { id: 'gainage', re: /(?:tenir|tiens|tenu|reste|rester|restes|restee)\w* .{0,25}(?:sur les coudes|en planche|position de planche|gaine)/, choix: ['crunch', 'roue_abdos'] },
  { id: 'pompes', re: /(?:au sol|par terre).{0,30}(?:pouss|descend|monte)\w* .{0,20}(?:bras|corps|poitrine)/, choix: ['dips', 'dev_couche'] },
];

/** charge dite : poids du corps, leste, machine, halteres, barre, poulie, elastique */
export type Charge = 'pdc' | 'leste' | 'machine' | 'halteres' | 'barre' | 'poulie' | 'kettlebell' | 'elastique';
export const CHARGE_LABEL: Record<Charge, string> = {
  pdc: 'poids du corps',
  leste: 'lesté',
  machine: 'à la machine',
  halteres: 'avec haltères',
  barre: 'à la barre',
  poulie: 'à la poulie',
  kettlebell: 'au kettlebell',
  elastique: 'à l’élastique',
};
export const CHARGE_RE: [Charge, RegExp][] = [
  ['pdc', /(?:^| )(?:pas lestee?s?|non lestee?s?|sans lest|sans charge|sans poids|a vide|au poids du corps|poids du corps|poids de corps|pdc|bodyweight|au pdc)(?= |$)/],
  ['leste', /(?:^| )(?:lestee?s?|avec (?:un |une |du )?lest|avec une ceinture|ceinture de lest|gilet leste|avec un gilet)(?= |$)/],
  ['machine', /(?:^| )(?:a la machine|sur la machine|sur machine|en machine|machine guidee|a la smith|smith machine|cadre guide|guidee?)(?= |$)/],
  ['halteres', /(?:^| )(?:avec (?:des |les |deux |2 )?halteres?|aux halteres|halteres|haltere|a l'haltere|dumbbells?)(?= |$)/],
  ['kettlebell', /(?:^| )(?:au kettlebell|avec (?:un |une |des )?kettlebells?|kettlebells?)(?= |$)/],
  ['elastique', /(?:^| )(?:avec (?:un |des |les )?elastiques?|a l'elastique|elastiques?|bandes? elastiques?)(?= |$)/],
  ['poulie', /(?:^| )(?:a la poulie|aux poulies|sur la poulie|poulie)(?= |$)/],
  ['barre', /(?:^| )(?:a la barre|avec la barre|barre olympique|a la barre ez|barre ez)(?= |$)/],
];

/* ------------------------------------------------------------------ */
/* Sports de combat                                                     */
/* ------------------------------------------------------------------ */

export type TermKind = 'soumission' | 'garde' | 'position' | 'passage' | 'renversement' | 'dos' | 'sortie' | 'projection' | 'immobilisation' | 'frappe' | 'pied' | 'defense' | 'kata' | 'exercice' | 'score';

export type CombatTerm = {
  id: string;
  label: string;
  /** precision affichee : « clé de bras » pour juji gatame */
  note?: string;
  kind: TermKind;
  aliases: string[];
  /** sport devine quand il n'est pas dit */
  devine?: string;
  /** mot trop courant : lu seulement si le sport est dans cette famille */
  famille?: 'sol' | 'frappe' | 'judo' | 'karate';
  /** id de la finition dans la bibliotheque des soumissions (cartes de sparring) */
  sub?: string;
};

const BJJ = 'jjb';

export const COMBAT_TERMS: CombatTerm[] = [
  // soumissions
  { id: 'juji_gatame', label: 'Juji gatame', note: 'clé de bras', kind: 'soumission', sub: 'armbar', devine: BJJ, aliases: ['juji gatame', 'jujigatame', 'juji gatami', 'juji gatamee', 'ju ji gatame', 'jiu ji gatame', 'juji katame', 'jugi gatame', 'judji gatame', 'juji gatam', 'jiji gatame', 'jouji gatame', 'juji ga tame', 'juji gata me', 'ude hishigi juji gatame'] },
  { id: 'armbar', label: 'Clé de bras', kind: 'soumission', sub: 'armbar', devine: BJJ, aliases: ['cle de bras', 'clef de bras', 'cles de bras', 'clefs de bras', 'armbar', 'arm bar', 'armlock', 'arm lock', 'arme bar', 'hyper extension du coude'] },
  { id: 'arm_triangle', label: 'Triangle de bras', kind: 'soumission', sub: 'armtri', devine: BJJ, aliases: ['triangle de bras', 'arm triangle', 'arm triangles', 'kata gatame', 'katagatame', 'head and arm'] },
  { id: 'triangle_inverse', label: 'Triangle inversé', kind: 'soumission', sub: 'triangleinv', devine: BJJ, aliases: ['triangle inverse', 'triangles inverses', 'reverse triangle'] },
  { id: 'triangle', label: 'Triangle', kind: 'soumission', sub: 'triangle', devine: BJJ, aliases: ['triangle', 'sankaku', 'sankaku jime', 'sankaku jime', 'triangle de jambes', 'triangle choke', 'triangles de jambes', 'trianglee', 'tri angle'] },
  { id: 'omoplata', label: 'Omoplata', kind: 'soumission', sub: 'omoplata', devine: BJJ, aliases: ['omoplata', 'omo plata', 'omoplatta', 'omoplatte', 'homoplata', 'omo platta', 'ommoplata', 'homo plata', 'omoplatha', 'omo plata', 'omoplatas'] },
  { id: 'kimura', label: 'Kimura', kind: 'soumission', sub: 'kimura', devine: BJJ, aliases: ['kimura', 'kimoura', 'kimora', 'kimurra', 'ki mura', 'double wristlock'] },
  { id: 'ude_garami', label: 'Ude garami', note: 'clé d’épaule', kind: 'soumission', sub: 'americana', devine: BJJ, aliases: ['ude garami', 'udegarami', 'oude garami', 'ude gatame', 'ude garame'] },
  { id: 'americana', label: 'Américaine', kind: 'soumission', sub: 'americana', devine: BJJ, aliases: ['americana', 'americaine', 'keylock', 'key lock', 'americanna', 'americana lock'] },
  { id: 'heel_hook', label: 'Heel hook', note: 'clé de talon', kind: 'soumission', sub: 'Heel hook', devine: BJJ, aliases: ['heel hook', 'heelhook', 'hill hook', 'heal hook', 'heel hooks', 'cle de talon', 'inside heel hook', 'outside heel hook'] },
  { id: 'kneebar', label: 'Clé de genou', note: 'kneebar', kind: 'soumission', sub: 'kneebar', devine: BJJ, aliases: ['kneebar', 'knee bar', 'nee bar', 'cle de genou', 'cles de genou', 'clef de genou'] },
  { id: 'cle_cheville', label: 'Clé de cheville', kind: 'soumission', sub: 'anklelock', devine: BJJ, aliases: ['cle de cheville', 'cles de cheville', 'clef de cheville', 'ankle lock', 'straight ankle lock', 'footlock', 'foot lock', 'ashi kansetsu'] },
  { id: 'toe_hold', label: 'Clé de pied', note: 'toe hold', kind: 'soumission', sub: 'toehold', devine: BJJ, aliases: ['toe hold', 'toehold', 'cle de pied', 'cles de pied'] },
  { id: 'calf_slicer', label: 'Calf slicer', kind: 'soumission', sub: 'calfslicer', devine: BJJ, aliases: ['calf slicer', 'calf slicers', 'ecrasement du mollet'] },
  { id: 'wristlock', label: 'Clé de poignet', kind: 'soumission', sub: 'wristlock', devine: BJJ, aliases: ['cle de poignet', 'cles de poignet', 'wristlock', 'wrist lock'] },
  { id: 'guillotine', label: 'Guillotine', kind: 'soumission', sub: 'guillotine', devine: BJJ, aliases: ['guillotine', 'guiyotine', 'gillotine', 'guillotinne', 'high elbow guillotine', 'arm in guillotine', 'mae hadaka jime'] },
  { id: 'rnc', label: 'Étranglement arrière', note: 'mata leão', kind: 'soumission', sub: 'rnc', devine: BJJ, aliases: ['etranglement arriere', 'etranglements arrieres', 'etranglement par derriere', 'etranglement dans le dos', 'mata leao', 'mata leon', 'mata lao', 'matalao', 'mata leo', 'rear naked', 'rear naked choke', 'rear naked chokes', 'rnc', 'sangle arriere', 'hadaka jime', 'hadakajime', 'etranglement sanguin'] },
  { id: 'ezekiel', label: 'Ezekiel', kind: 'soumission', sub: 'ezekiel', devine: BJJ, aliases: ['ezekiel', 'ezequiel', 'ezechiel', 'ezekyel', 'sode guruma jime', 'sode guruma'] },
  { id: 'bow_arrow', label: 'Bow and arrow', kind: 'soumission', sub: 'bowarrow', devine: BJJ, aliases: ['bow and arrow', 'bow arrow', 'bow and arrows', 'arc et fleche', 'arc et la fleche', 'bo and arrow'] },
  { id: 'cross_collar', label: 'Étranglement croisé au col', note: 'cross collar', kind: 'soumission', sub: 'lapelchoke', devine: BJJ, aliases: ['cross collar', 'cross collar choke', 'etranglement croise', 'etranglement au col', 'col croise', 'juji jime', 'nami juji jime', 'gyaku juji jime', 'kata juji jime', 'okuri eri jime', 'lapel choke', 'baseball choke', 'clock choke', 'loop choke'] },
  { id: 'darce', label: 'D’Arce', kind: 'soumission', sub: 'darce', devine: BJJ, aliases: ['d\'arce', 'darce', 'd arce', 'darse', 'd\'arse', 'brabo', 'brabo choke', 'darce choke'] },
  { id: 'anaconda', label: 'Anaconda', kind: 'soumission', sub: 'anaconda', devine: BJJ, aliases: ['anaconda', 'anakonda', 'anaconda choke'] },
  { id: 'gogoplata', label: 'Gogoplata', kind: 'soumission', sub: 'gogoplata', devine: BJJ, aliases: ['gogoplata', 'gogo plata'] },
  { id: 'north_south', label: 'Étranglement nord-sud', kind: 'soumission', sub: 'northsouth', devine: BJJ, aliases: ['north south choke', 'etranglement nord sud'] },
  { id: 'paper_cutter', label: 'Paper cutter', kind: 'soumission', devine: BJJ, aliases: ['paper cutter', 'papercutter'] },
  // gardes
  { id: 'garde_fermee', label: 'Garde fermée', kind: 'garde', devine: BJJ, aliases: ['garde fermee', 'gardes fermees', 'closed guard', 'full guard', 'garde fermer'] },
  { id: 'demi_garde', label: 'Demi-garde', kind: 'garde', devine: BJJ, aliases: ['demi garde', 'demie garde', 'demi gardes', 'half guard', 'deep half', 'deep half guard', 'z guard', 'knee shield', 'demi garde profonde'] },
  { id: 'garde_ouverte', label: 'Garde ouverte', kind: 'garde', devine: BJJ, aliases: ['garde ouverte', 'open guard', 'gardes ouvertes'] },
  { id: 'garde_araignee', label: 'Garde araignée', kind: 'garde', devine: BJJ, aliases: ['garde araignee', 'spider guard', 'spider', 'garde spider', 'aranha'] },
  { id: 'de_la_riva', label: 'De la Riva', kind: 'garde', devine: BJJ, aliases: ['de la riva', 'delariva', 'de la rive', 'garde de la riva', 'dlr', 'de la reva', 'de la rivas'] },
  { id: 'reverse_dlr', label: 'Reverse De la Riva', kind: 'garde', devine: BJJ, aliases: ['reverse de la riva', 'rdlr', 'de la riva inverse'] },
  { id: 'x_guard', label: 'Garde X', kind: 'garde', devine: BJJ, aliases: ['x guard', 'garde x', 'x garde', 'ix guard', 'single leg x', 'slx', 'ashi garami', 'ashi', 'garde x simple'] },
  { id: 'butterfly', label: 'Garde papillon', note: 'butterfly', kind: 'garde', devine: BJJ, famille: 'sol', aliases: ['garde papillon', 'butterfly guard', 'butterfly', 'garde butterfly', 'garde butter fly'] },
  { id: 'lasso', label: 'Garde lasso', kind: 'garde', devine: BJJ, aliases: ['garde lasso', 'lasso guard', 'lasso'] },
  { id: 'worm', label: 'Worm guard', kind: 'garde', devine: BJJ, aliases: ['worm guard', 'garde worm', 'lapel guard', 'garde revers'] },
  { id: 'cinquante', label: 'Garde 50/50', kind: 'garde', devine: BJJ, aliases: ['50 50', 'fifty fifty', 'garde 50 50'] },
  { id: 'garde_k', label: 'Garde K', kind: 'garde', devine: BJJ, aliases: ['garde k', 'k guard'] },
  // positions et controle
  { id: 'montada', label: 'Montada', note: 'position montée', kind: 'position', devine: BJJ, aliases: ['montada', 'montade', 'montadas', 'mount', 'full mount', 'position montee', 'monte complete', 'tate shiho gatame'] },
  { id: 'cent_kilos', label: 'Cent kilos', note: 'side control', kind: 'position', devine: BJJ, aliases: ['cent kilos', 'cent quilos', '100 kilos', '100 quilos', '100 kg', 'cem quilos', 'side control', 'controle lateral', 'yoko shiho gatame'] },
  { id: 'knee_on_belly', label: 'Genou sur le ventre', note: 'knee on belly', kind: 'position', devine: BJJ, aliases: ['knee on belly', 'knee on the belly', 'genou sur le ventre', 'genou ventre', 'joelho na barriga', 'kob', 'knee ride'] },
  { id: 'nord_sud', label: 'Nord-sud', kind: 'position', devine: BJJ, aliases: ['nord sud', 'north south', 'kami shiho gatame', 'kamishiho gatame'] },
  { id: 'tortue', label: 'Tortue', kind: 'position', devine: BJJ, famille: 'sol', aliases: ['tortue', 'turtle', 'position tortue'] },
  { id: 'dos', label: 'Prise de dos', note: 'back take', kind: 'dos', devine: BJJ, aliases: ['back take', 'back takes', 'prise de dos', 'prises de dos', 'prendre le dos', 'pris le dos', 'prends le dos', 'back control', 'controle du dos', 'crochets dans le dos', 'body triangle', 'seat belt', 'seatbelt'] },
  { id: 'front_headlock', label: 'Front headlock', kind: 'position', devine: BJJ, aliases: ['front headlock', 'front head lock', 'cravate avant', 'cravate'] },
  // passages
  { id: 'passage', label: 'Passage de garde', kind: 'passage', devine: BJJ, aliases: ['passage de garde', 'passages de garde', 'passer la garde', 'passe de garde', 'passer les jambes', 'guard pass', 'guard passing'] },
  { id: 'toreando', label: 'Toreando', kind: 'passage', devine: BJJ, aliases: ['toreando', 'torreando', 'toriando', 'toreador', 'bullfighter'] },
  { id: 'knee_slice', label: 'Knee slice', note: 'genou traversant', kind: 'passage', devine: BJJ, aliases: ['knee slice', 'knee cut', 'knee slide', 'genou traversant', 'knee slice pass', 'nee slice'] },
  { id: 'leg_drag', label: 'Leg drag', kind: 'passage', devine: BJJ, aliases: ['leg drag', 'leg drags'] },
  { id: 'over_under', label: 'Over under', kind: 'passage', devine: BJJ, aliases: ['over under', 'over under pass'] },
  { id: 'stack_pass', label: 'Stack pass', kind: 'passage', devine: BJJ, aliases: ['stack pass', 'double under', 'passage en pile'] },
  { id: 'smash_pass', label: 'Smash pass', kind: 'passage', devine: BJJ, aliases: ['smash pass', 'body lock pass', 'bodylock pass', 'body lock'] },
  { id: 'long_step', label: 'Long step', kind: 'passage', devine: BJJ, aliases: ['long step', 'x pass'] },
  // renversements
  { id: 'renversement', label: 'Renversement', note: 'raspagem, sweep', kind: 'renversement', devine: BJJ, aliases: ['renversement', 'renversements', 'raspagem', 'raspa', 'raspage', 'sweep', 'sweeps', 'swip', 'balayage au sol'] },
  { id: 'ciseaux', label: 'Renversement ciseaux', note: 'scissor sweep', kind: 'renversement', devine: BJJ, aliases: ['scissor sweep', 'renversement ciseaux', 'renversement en ciseaux', 'ciseaux'] },
  { id: 'pendule', label: 'Renversement pendule', note: 'flower sweep', kind: 'renversement', devine: BJJ, aliases: ['flower sweep', 'pendulum sweep', 'pendule', 'renversement pendule'] },
  { id: 'hip_bump', label: 'Hip bump', kind: 'renversement', devine: BJJ, aliases: ['hip bump', 'hip bump sweep', 'renversement hanche'] },
  { id: 'berimbolo', label: 'Berimbolo', kind: 'renversement', devine: BJJ, aliases: ['berimbolo', 'berimbollo', 'berimbolos', 'beribolo', 'berim bolo', 'berimbo lo'] },
  { id: 'kiss_dragon', label: 'Kiss of the dragon', kind: 'renversement', devine: BJJ, aliases: ['kiss of the dragon', 'kiss of dragon'] },
  // sorties et defenses au sol
  { id: 'sortie', label: 'Sortie de position', kind: 'sortie', devine: BJJ, aliases: ['sortie de montada', 'sortie de cent kilos', 'sortie de 100 kilos', 'sortie de side', 'sortie de dos', 'sorties de montada', 'escape', 'escapes', 'sorties', 'upa', 'crevette', 'crevettes', 'shrimp', 'hip escape', 'echappement'] },
  // lutte et projections
  { id: 'double_leg', label: 'Double leg', kind: 'projection', aliases: ['double leg', 'double legs', 'double jambe', 'ramassement des deux jambes'] },
  { id: 'single_leg', label: 'Single leg', kind: 'projection', aliases: ['single leg', 'single legs', 'simple jambe', 'ramassement d\'une jambe'] },
  { id: 'takedown', label: 'Amenée au sol', note: 'takedown', kind: 'projection', aliases: ['takedown', 'takedowns', 'take down', 'amenee au sol', 'amenees au sol', 'mise au sol'] },
  { id: 'sprawl', label: 'Sprawl', kind: 'defense', aliases: ['sprawl', 'sprawls', 'spraoul'] },
  { id: 'souplesse', label: 'Souplesse', note: 'suplex', kind: 'projection', aliases: ['souplesse', 'souplesses', 'suplex', 'supplex'] },
  { id: 'ankle_pick', label: 'Ankle pick', kind: 'projection', aliases: ['ankle pick', 'ankle picks', 'ramassement de cheville'] },
  { id: 'arm_drag', label: 'Arm drag', kind: 'projection', aliases: ['arm drag', 'arm drags', 'armdrag'] },
  { id: 'duck_under', label: 'Duck under', kind: 'projection', aliases: ['duck under', 'duck unders'] },
  { id: 'snap_down', label: 'Snap down', kind: 'projection', aliases: ['snap down', 'snapdown'] },
  { id: 'bras_roule', label: 'Bras roulé', kind: 'projection', aliases: ['bras roule', 'bras roules', 'fireman', 'fireman carry', 'fireman\'s carry'] },
  { id: 'ceinture', label: 'Ceinture avant', kind: 'projection', aliases: ['ceinture avant', 'ceinture arriere', 'tour de hanche'] },
  // judo
  { id: 'o_soto_gari', label: 'O soto gari', kind: 'projection', devine: 'judo', aliases: ['o soto gari', 'osoto gari', 'osotogari', 'o soto', 'osoto', 'o soto gake', 'osoto gake'] },
  { id: 'o_uchi_gari', label: 'O uchi gari', kind: 'projection', devine: 'judo', aliases: ['o uchi gari', 'ouchi gari', 'o uchi', 'ouchigari'] },
  { id: 'ko_uchi_gari', label: 'Ko uchi gari', kind: 'projection', devine: 'judo', aliases: ['ko uchi gari', 'kouchi gari', 'ko uchi', 'kouchigari'] },
  { id: 'ko_soto_gari', label: 'Ko soto gari', kind: 'projection', devine: 'judo', aliases: ['ko soto gari', 'kosoto gari', 'ko soto gake'] },
  { id: 'de_ashi_barai', label: 'De ashi barai', kind: 'projection', devine: 'judo', aliases: ['de ashi barai', 'de ashi harai', 'deashi barai', 'okuri ashi barai', 'ashi barai', 'balayage de pied'] },
  { id: 'seoi_nage', label: 'Seoi nage', kind: 'projection', devine: 'judo', aliases: ['seoi nage', 'seoinage', 'seoi nague', 'ippon seoi nage', 'morote seoi nage', 'seoi otoshi', 'seo nage', 'seoi'] },
  { id: 'uchi_mata', label: 'Uchi mata', kind: 'projection', devine: 'judo', aliases: ['uchi mata', 'uchimata', 'ouchi mata', 'uchi matta', 'uchi mata sukashi'] },
  { id: 'harai_goshi', label: 'Harai goshi', kind: 'projection', devine: 'judo', aliases: ['harai goshi', 'haraigoshi', 'harai goshi', 'harai gochi'] },
  { id: 'tai_otoshi', label: 'Tai otoshi', kind: 'projection', devine: 'judo', aliases: ['tai otoshi', 'taiotoshi', 'tai otochi'] },
  { id: 'o_goshi', label: 'O goshi', kind: 'projection', devine: 'judo', aliases: ['o goshi', 'ogoshi', 'koshi guruma', 'tsuri goshi', 'sode tsuri komi goshi', 'tsuri komi goshi', 'hane goshi', 'utsuri goshi', 'ushiro goshi'] },
  { id: 'tomoe_nage', label: 'Tomoe nage', kind: 'projection', devine: 'judo', aliases: ['tomoe nage', 'tomoenage', 'tomoe nague', 'sumi gaeshi', 'sumigaeshi', 'tani otoshi', 'yoko tomoe nage'] },
  { id: 'ura_nage', label: 'Ura nage', kind: 'projection', devine: 'judo', aliases: ['ura nage', 'uranage', 'sukui nage', 'kata guruma', 'morote gari', 'kuchiki taoshi'] },
  { id: 'kesa_gatame', label: 'Kesa gatame', note: 'immobilisation', kind: 'immobilisation', devine: 'judo', aliases: ['kesa gatame', 'kesagatame', 'kuzure kesa gatame', 'hon kesa gatame', 'kesa'] },
  { id: 'osaekomi', label: 'Osaekomi', note: 'immobilisation', kind: 'immobilisation', devine: 'judo', aliases: ['osaekomi', 'osae komi', 'osaekomi waza', 'immobilisation', 'immobilisations'] },
  { id: 'ippon', label: 'Ippon', kind: 'score', devine: 'judo', aliases: ['ippon', 'ipon'] },
  { id: 'waza_ari', label: 'Waza ari', kind: 'score', devine: 'judo', aliases: ['waza ari', 'wazari', 'waza hari', 'yuko'] },
  { id: 'randori', label: 'Randori', kind: 'exercice', devine: 'judo', aliases: ['randori', 'randoris', 'randoris debout', 'randori au sol'] },
  { id: 'uchi_komi', label: 'Uchi komi', note: 'répétitions sans chute', kind: 'exercice', devine: 'judo', aliases: ['uchi komi', 'uchikomi', 'uchi komis', 'ouchi komi', 'uchikomis'] },
  { id: 'nage_komi', label: 'Nage komi', note: 'répétitions avec chute', kind: 'exercice', devine: 'judo', aliases: ['nage komi', 'nagekomi', 'nage komis', 'nague komi'] },
  { id: 'ne_waza', label: 'Ne waza', note: 'travail au sol', kind: 'exercice', devine: 'judo', aliases: ['ne waza', 'newaza', 'ne waza randori', 'kansetsu waza', 'shime waza', 'katame waza'] },
  { id: 'tachi_waza', label: 'Tachi waza', note: 'travail debout', kind: 'exercice', devine: 'judo', aliases: ['tachi waza', 'tachiwaza', 'nage waza'] },
  { id: 'ukemi', label: 'Ukemi', note: 'brise-chutes', kind: 'exercice', devine: 'judo', aliases: ['ukemi', 'ukemis', 'brise chute', 'brise chutes', 'chutes avant', 'chutes arriere'] },
  // karate
  { id: 'kata', label: 'Kata', kind: 'kata', devine: 'karate', famille: 'karate', aliases: ['kata', 'katas', 'heian shodan', 'heian nidan', 'heian sandan', 'heian yondan', 'heian godan', 'bassai dai', 'kanku dai', 'tekki shodan', 'jion', 'enpi', 'empi', 'pinan', 'nage no kata', 'katame no kata'] },
  { id: 'kumite', label: 'Kumite', kind: 'exercice', devine: 'karate', aliases: ['kumite', 'kumites', 'koumite', 'jiyu kumite', 'ippon kumite'] },
  { id: 'kihon', label: 'Kihon', kind: 'exercice', devine: 'karate', aliases: ['kihon', 'kion', 'kihons'] },
  { id: 'mae_geri', label: 'Mae geri', kind: 'pied', devine: 'karate', aliases: ['mae geri', 'maegeri', 'mae gueri', 'mai geri'] },
  { id: 'mawashi_geri', label: 'Mawashi geri', kind: 'pied', devine: 'karate', aliases: ['mawashi geri', 'mawashigeri', 'mawashi gueri', 'mawachi geri', 'mawashi'] },
  { id: 'ura_mawashi', label: 'Ura mawashi geri', kind: 'pied', devine: 'karate', aliases: ['ura mawashi geri', 'ura mawashi', 'uramawashi', 'oura mawashi'] },
  { id: 'yoko_geri', label: 'Yoko geri', kind: 'pied', devine: 'karate', aliases: ['yoko geri', 'yokogeri', 'yoko geri kekomi', 'yoko geri keage'] },
  { id: 'ushiro_geri', label: 'Ushiro geri', kind: 'pied', devine: 'karate', aliases: ['ushiro geri', 'oushiro geri', 'ushiro mawashi geri'] },
  { id: 'gyaku_zuki', label: 'Gyaku zuki', kind: 'frappe', devine: 'karate', aliases: ['gyaku zuki', 'gyakuzuki', 'gyaku tsuki', 'gyaku zouki', 'giaku zuki'] },
  { id: 'oi_zuki', label: 'Oi zuki', kind: 'frappe', devine: 'karate', aliases: ['oi zuki', 'oizuki', 'oi tsuki', 'oi zouki', 'kizami zuki', 'kizami tsuki', 'choku zuki', 'uraken'] },
  { id: 'uke', label: 'Blocages', note: 'uke', kind: 'defense', devine: 'karate', aliases: ['age uke', 'gedan barai', 'soto uke', 'uchi uke', 'shuto uke', 'gedan bara', 'jodan uke'] },
  // boxe et frappes
  { id: 'jab', label: 'Jab', kind: 'frappe', devine: 'boxe', aliases: ['jab', 'jabs', 'djab', 'jab double'] },
  { id: 'direct', label: 'Direct', kind: 'frappe', famille: 'frappe', aliases: ['direct', 'directs', 'direct du droit', 'direct du gauche', 'cross', 'directs du droit'] },
  { id: 'crochet', label: 'Crochet', kind: 'frappe', famille: 'frappe', aliases: ['crochet', 'crochets', 'crochet du gauche', 'crochet du droit', 'hook', 'hooks'] },
  { id: 'uppercut', label: 'Uppercut', kind: 'frappe', devine: 'boxe', aliases: ['uppercut', 'uppercuts', 'upercut', 'uppercute', 'upper cut'] },
  { id: 'swing', label: 'Swing', kind: 'frappe', famille: 'frappe', aliases: ['swing', 'swings'] },
  { id: 'esquive', label: 'Esquives', kind: 'defense', famille: 'frappe', aliases: ['esquive', 'esquives', 'esquiver', 'rotation', 'rotations', 'retrait', 'retraits', 'slip', 'rolls sous les coups'] },
  { id: 'parade', label: 'Parades', kind: 'defense', famille: 'frappe', aliases: ['parade', 'parades', 'blocage', 'blocages', 'garde haute', 'remise', 'remises', 'contre attaque', 'contres'] },
  { id: 'enchainement', label: 'Enchaînements', kind: 'exercice', famille: 'frappe', aliases: ['enchainement', 'enchainements', 'combinaison', 'combinaisons', 'combos', 'combo'] },
  { id: 'shadow', label: 'Shadow boxing', kind: 'exercice', famille: 'frappe', aliases: ['shadow', 'shadow boxing', 'boxe dans le vide'] },
  { id: 'sac', label: 'Sac de frappe', kind: 'exercice', famille: 'frappe', aliases: ['sac de frappe', 'travail au sac', 'au sac', 'heavy bag'] },
  { id: 'pattes', label: 'Pattes d’ours', kind: 'exercice', famille: 'frappe', aliases: ['pattes d\'ours', 'patte d\'ours', 'paos', 'pao', 'pads', 'mitts'] },
  { id: 'corde', label: 'Corde à sauter', kind: 'exercice', famille: 'frappe', aliases: ['corde a sauter', 'corde'] },
  // muay thai, kick boxing
  { id: 'teep', label: 'Teep', note: 'front kick', kind: 'pied', devine: 'muay_thai', aliases: ['teep', 'teeps', 'thip', 'tipe', 'push kick', 'front kick', 'chasse frontal'] },
  { id: 'low_kick', label: 'Low kick', kind: 'pied', devine: 'muay_thai', aliases: ['low kick', 'low kicks', 'lowkick', 'lo kick', 'low', 'lows', 'calf kick'] },
  { id: 'middle_kick', label: 'Middle kick', kind: 'pied', devine: 'muay_thai', aliases: ['middle kick', 'middle kicks', 'middle', 'middles', 'midle kick'] },
  { id: 'high_kick', label: 'High kick', kind: 'pied', devine: 'muay_thai', aliases: ['high kick', 'high kicks', 'highkick', 'high', 'head kick'] },
  { id: 'coude', label: 'Coups de coude', kind: 'frappe', famille: 'frappe', aliases: ['coude', 'coudes', 'coup de coude', 'coups de coude', 'sok', 'elbow', 'elbows'] },
  { id: 'genou', label: 'Coups de genou', kind: 'frappe', famille: 'frappe', aliases: ['genou', 'genoux', 'coup de genou', 'coups de genou', 'khao', 'knee', 'knees'] },
  { id: 'clinch', label: 'Clinch', kind: 'position', devine: 'muay_thai', aliases: ['clinch', 'clinchs', 'clinch thai', 'plum', 'corps a corps'] },
  { id: 'side_kick', label: 'Side kick', kind: 'pied', devine: 'kickboxing', aliases: ['side kick', 'sidekick', 'back kick', 'spinning back kick', 'retourne', 'coup de pied retourne', 'crescent kick'] },
  { id: 'superman', label: 'Superman punch', kind: 'frappe', devine: 'kickboxing', aliases: ['superman punch', 'superman', 'spinning back fist', 'back fist', 'backfist'] },
  { id: 'balayage', label: 'Balayage', kind: 'projection', famille: 'frappe', aliases: ['balayage', 'balayages', 'sweep debout'] },
  // mma
  { id: 'gnp', label: 'Ground and pound', kind: 'frappe', devine: 'mma', aliases: ['ground and pound', 'ground n pound', 'gnp', 'ground pound', 'frappes au sol'] },
  { id: 'cage', label: 'Travail contre la cage', kind: 'position', devine: 'mma', aliases: ['travail contre la cage', 'contre la cage', 'wall walk', 'wall walks', 'cage work', 'dirty boxing'] },
];

/** mots qui disent qu'on a appris ou repete, pas place en sparring */
export const APPRIS_RE = /(?:^| )(?:on a appris|j'ai appris|appris|appri|on nous a appris|on a vu|on a revu|j'ai vu|j'ai revu|le prof (?:nous )?a montre|il nous a montre|elle nous a montre|on nous a montre|nous a montre|m'a montre|on a decouvert|on a etudie|nous a explique|technique du jour|theme du jour|travail du|travail de la|travail des|travail de|travail sur|on a fait du|on a fait des|on a fait de la technique|cours technique|on a travaille|j'ai travaille|on a bosse|j'ai bosse|on a perfectionne|on a drille|drille|on a drill|drill|drills|drilling|on a repete|repete|en boucle|uchi komi|uchikomi|nage komi|nagekomi|kihon)(?= |$)/;
export const DRILL_RE = /(?:^| )(?:drille|drill|drills|drilling|repete|repetitions?|en boucle|uchi komi|uchikomi|nage komi|nagekomi|kihon|a la chaine)(?= |$)/;
export const TRAVAIL_RE = /(?:^| )(?:travaille|bosse|perfectionne|revu|on a revu|travail|on a fait)(?= |$)/;

/** types de seance de combat : id de la fiche (lib/v2/seance/combat) et libelle dit quand il precise */
export const SESSION_WORDS: { id: string; label?: string; re: RegExp }[] = [
  { id: 'competition', re: /(?:^| )(?:competition|competitions|compet|tournoi|championnat|open de|interclub|interclubs)(?= |$)/ },
  { id: 'openmat', re: /(?:^| )(?:open mat|openmat|open mats|open matte|opene mat|open match|tapis libre)(?= |$)/ },
  { id: 'entrainement', label: 'Stage', re: /(?:^| )(?:stage|stages)(?= |$)/ },
  { id: 'entrainement', label: 'Séminaire', re: /(?:^| )(?:seminaire|seminaires|master class|masterclass)(?= |$)/ },
  { id: 'entrainement', label: 'Cours particulier', re: /(?:^| )(?:cours particulier|cours prive|private|cours perso)(?= |$)/ },
  { id: 'technique', label: 'Positionnel', re: /(?:^| )(?:positionnel|positionnels|sparring positionnel|travail positionnel|situationnel|situations?|travail specifique|specifique|specifiques|positional)(?= |$)/ },
  { id: 'guerre', re: /(?:^| )(?:sparring|sparrings|spar|randori|randoris|rolls?|mises? de gants|j'ai roule|on a roule|rondes?|rounds?|kumite|combat libre)(?= |$)/ },
  { id: 'technique', re: /(?:^| )(?:technique|drill|drills|drilling|drille|uchi komi|uchikomi|nage komi|kihon|kata|katas)(?= |$)/ },
  { id: 'entrainement', re: /(?:^| )(?:cours|entrainement|classe)(?= |$)/ },
];

/** ceintures et grades */
export const BELTS = ['blanche', 'grise', 'jaune', 'orange', 'verte', 'bleue', 'violette', 'marron', 'noire', 'rouge', 'corail'];
