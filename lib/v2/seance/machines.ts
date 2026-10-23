/**
 * Catalogue des machines de salle (16 octobre) : « Trouve ta machine ».
 * Machines generiques que l'on croise dans les grandes chaines (Basic-Fit, Fitness Park, On Air, Keepcool...),
 * decrites sans aucune marque : nom en francais, noms dits en salle, muscles vises, exercice ajoute a la seance.
 * Les noms d'exercice reprennent ceux de constants/exerciseLibrary.ts pour retrouver l'historique.
 * Recherche tolerante (accents, pluriels, debuts de mots) et lecture du bloc « YOROI MACHINE v1 »
 * rendu par l'IA de l'utilisateur a partir d'une photo. YOROI n'envoie rien a aucune IA.
 * Code pur, teste dans __tests__/machines.test.ts. Illustrations : lib/v2/seance/machinesArt.ts.
 */

export type MachineGroupe = 'JAMBES' | 'ISCHIOS' | 'FESSIERS' | 'MOLLETS' | 'PECTORAUX' | 'DOS' | 'ÉPAULES' | 'BICEPS' | 'TRICEPS' | 'ABDOS' | 'POLYVALENT';

export type Machine = {
  id: string;
  /** nom affiche, sans marque */
  nom: string;
  /** noms dits en salle, anglais compris, sans marque */
  synonymes: string[];
  groupe: MachineGroupe;
  /** muscles vises, du principal au secondaire */
  muscles: string[];
  /** exercices ajoutes a la seance : un seul, ou un choix pour une station polyvalente */
  exercices: string[];
  /** description du dessin pour la consigne d'illustration (anglais, lu par le generateur d'images) */
  dessin: string;
};

export const GROUPES: { id: MachineGroupe; label: string }[] = [
  { id: 'JAMBES', label: 'Cuisses' },
  { id: 'ISCHIOS', label: 'Ischios' },
  { id: 'FESSIERS', label: 'Fessiers' },
  { id: 'MOLLETS', label: 'Mollets' },
  { id: 'PECTORAUX', label: 'Pectoraux' },
  { id: 'DOS', label: 'Dos' },
  { id: 'ÉPAULES', label: 'Épaules' },
  { id: 'BICEPS', label: 'Biceps' },
  { id: 'TRICEPS', label: 'Triceps' },
  { id: 'ABDOS', label: 'Abdos' },
  { id: 'POLYVALENT', label: 'Stations' },
];

export const MACHINES: Machine[] = [
  // cuisses
  { id: 'presse_cuisses', nom: 'Presse à cuisses inclinée', synonymes: ['presse', 'presse 45', 'presse a 45 degres', 'leg press', 'presse inclinee', 'presse a charger'], groupe: 'JAMBES', muscles: ['Quadriceps', 'Fessiers', 'Ischios'], exercices: ['Presse à Cuisses'], dessin: '45-degree incline leg press with a sliding sled, a reclined padded seat and a large foot platform; the figure lies back on the seat, feet on the platform, knees bent, pushing the platform up and away' },
  { id: 'presse_horizontale', nom: 'Presse horizontale assise', synonymes: ['presse assise', 'presse horizontale', 'seated leg press', 'presse a cuisses assise', 'presse a selecteur'], groupe: 'JAMBES', muscles: ['Quadriceps', 'Fessiers'], exercices: ['Presse à Cuisses'], dessin: 'seated horizontal leg press with an upright padded backrest, a vertical foot plate in front and a weight stack with a pin selector behind; the figure sits upright and pushes the foot plate forward with both legs' },
  { id: 'hack_squat', nom: 'Hack squat', synonymes: ['hack', 'hacksquat', 'squat machine', 'squat guide incline', 'presse hack'], groupe: 'JAMBES', muscles: ['Quadriceps', 'Fessiers'], exercices: ['Hack Squat'], dessin: 'hack squat machine with an angled back pad sliding on two inclined rails, shoulder pads and a tilted foot platform at the bottom; the figure stands with back against the pad, shoulders under the pads, in a deep squat' },
  { id: 'pendulum_squat', nom: 'Pendulum squat', synonymes: ['pendulum', 'squat pendule', 'squat balancier'], groupe: 'JAMBES', muscles: ['Quadriceps', 'Fessiers'], exercices: ['Pendulum Squat'], dessin: 'pendulum squat machine: a swinging back pad on a pivot arm above, shoulder pads and a fixed foot platform; the figure squats deeply, back on the pad, the pad arm swinging in an arc' },
  { id: 'belt_squat', nom: 'Squat à la ceinture', synonymes: ['belt squat', 'squat ceinture', 'machine a ceinture', 'v squat'], groupe: 'JAMBES', muscles: ['Quadriceps', 'Fessiers'], exercices: ['Belt Squat'], dessin: 'belt squat machine: a low standing platform, a hip belt attached by a strap to a lever arm, two handles in front; the figure stands on the platform wearing the belt and squats down without any bar on the shoulders' },
  { id: 'smith_machine', nom: 'Barre guidée (smith machine)', synonymes: ['smith', 'smith machine', 'multipresse', 'multi presse', 'barre guidee', 'cadre guide', 'squat guide', 'developpe guide'], groupe: 'JAMBES', muscles: ['Quadriceps', 'Fessiers', 'Pectoraux', 'Épaules'], exercices: ['Smith Machine Squat', 'Smith Machine Hip Thrust', 'Développé Couché (Barre)', 'Développé Militaire Assis'], dessin: 'smith machine: a tall rectangular frame with two vertical guide rails and a barbell fixed on the rails with plates on each end; the figure stands under the bar resting on the upper back, squatting halfway down' },
  { id: 'leg_extension', nom: 'Leg extension', synonymes: ['chaise a quadriceps', 'chaise quadriceps', 'extension des jambes', 'extension quadriceps', 'leg ext', 'chaise romaine quadriceps'], groupe: 'JAMBES', muscles: ['Quadriceps'], exercices: ['Leg Extension'], dessin: 'seated leg extension machine with a padded seat and backrest, a roller pad in front of the shins and a weight stack on the side; the figure sits and extends both legs straight forward, lifting the roller pad' },
  { id: 'adducteurs', nom: 'Machine à adducteurs', synonymes: ['adducteurs', 'adducteur', 'adductor', 'inner thigh', 'machine interieur cuisses', 'serrer les cuisses'], groupe: 'JAMBES', muscles: ['Adducteurs'], exercices: ['Adducteurs Machine'], dessin: 'seated hip adductor machine with two leg pads on pivoting arms on the inside of the knees; the figure sits upright, legs wide apart, pressing the knees together against the pads' },
  // ischios
  { id: 'leg_curl_assis', nom: 'Leg curl assis', synonymes: ['leg curl', 'curl ischios assis', 'ischios assis', 'seated leg curl', 'curl jambes assis', 'flexion des jambes assis'], groupe: 'ISCHIOS', muscles: ['Ischios', 'Mollets'], exercices: ['Leg Curl Assis'], dessin: 'seated leg curl machine with a padded seat, a thigh hold-down pad on top of the knees and a roller pad behind the lower legs; the figure sits and bends the knees, pulling the roller pad down and back under the seat' },
  { id: 'leg_curl_allonge', nom: 'Leg curl allongé', synonymes: ['leg curl couche', 'leg curl allonge', 'curl ischios couche', 'ischios allonge', 'lying leg curl', 'curl femoral'], groupe: 'ISCHIOS', muscles: ['Ischios', 'Mollets'], exercices: ['Leg Curl Couché'], dessin: 'lying leg curl machine: an angled padded bench, face down, with a roller pad behind the ankles and handles in front; the figure lies face down and curls the heels up toward the glutes' },
  { id: 'leg_curl_debout', nom: 'Leg curl debout', synonymes: ['leg curl debout', 'curl ischio debout', 'standing leg curl', 'leg curl unilateral'], groupe: 'ISCHIOS', muscles: ['Ischios'], exercices: ['Leg Curl Debout'], dessin: 'standing single leg curl machine with a knee pad, a chest pad with handles and a roller pad behind one ankle; the figure stands leaning on the chest pad and curls one heel up behind' },
  { id: 'ghd', nom: 'Banc ischios (GHD)', synonymes: ['ghd', 'glute ham', 'glute ham raise', 'banc ischios', 'nordic', 'nordic curl'], groupe: 'ISCHIOS', muscles: ['Ischios', 'Fessiers', 'Lombaires'], exercices: ['Glute Ham Raise', 'Nordic Curl'], dessin: 'glute ham developer bench: a rounded thigh pad, an adjustable foot plate with ankle rollers behind; the figure kneels with ankles locked, torso horizontal, lowering forward and curling back up' },
  // fessiers
  { id: 'abducteurs', nom: 'Machine à abducteurs', synonymes: ['abducteurs', 'abducteur', 'abductor', 'outer thigh', 'machine exterieur cuisses', 'ecarter les cuisses', 'machine fessiers ecartement'], groupe: 'FESSIERS', muscles: ['Moyen fessier', 'Fessiers'], exercices: ['Abducteurs Machine'], dessin: 'seated hip abductor machine with two leg pads on pivoting arms on the outside of the knees; the figure sits upright, pushing the knees apart against the pads' },
  { id: 'hip_thrust_machine', nom: 'Hip thrust machine', synonymes: ['hip thrust', 'machine hip thrust', 'glute drive', 'releve de bassin machine', 'pont fessier machine'], groupe: 'FESSIERS', muscles: ['Fessiers', 'Ischios'], exercices: ['Hip Thrust Machine'], dessin: 'hip thrust machine: a low back pad, a padded belt or lever across the hips and a foot platform; the figure sits on the floor area with upper back on the pad and drives the hips up to a bridge, knees at 90 degrees' },
  { id: 'kickback_machine', nom: 'Machine à fessiers (kickback)', synonymes: ['kickback', 'kick back', 'glute machine', 'machine a fessiers', 'extension de hanche', 'glute kickback'], groupe: 'FESSIERS', muscles: ['Grand fessier', 'Ischios'], exercices: ['Kick-back Machine'], dessin: 'glute kickback machine with a forearm and chest support, a knee pad and a foot plate on a lever arm behind; the figure leans forward on the support and pushes one leg back and up' },
  // mollets
  { id: 'mollets_debout', nom: 'Mollets debout', synonymes: ['mollets', 'calf', 'calf raise', 'standing calf', 'machine a mollets', 'extension mollets debout'], groupe: 'MOLLETS', muscles: ['Mollets'], exercices: ['Mollets Debout (Machine)'], dessin: 'standing calf raise machine with shoulder pads and a small step block under the forefoot; the figure stands upright under the pads and rises high onto the toes, heels lifted' },
  { id: 'mollets_assis', nom: 'Mollets assis', synonymes: ['mollets assis', 'seated calf', 'soleaire', 'calf assis'], groupe: 'MOLLETS', muscles: ['Mollets', 'Soléaire'], exercices: ['Mollets Assis (Machine)'], dessin: 'seated calf raise machine: a seat, a knee pad on top of the thighs and a step block under the forefoot; the figure sits and raises the heels, pushing the knee pad up' },
  // pectoraux
  { id: 'chest_press', nom: 'Développé assis machine', synonymes: ['chest press', 'presse pectoraux', 'developpe machine', 'developpe couche machine', 'presse a pecs', 'machine a pecs poussee'], groupe: 'PECTORAUX', muscles: ['Pectoraux', 'Triceps', 'Épaules'], exercices: ['Chest Press (Machine)'], dessin: 'seated chest press machine with an upright backrest, two horizontal handles at chest height on lever arms and a weight stack behind; the figure sits and pushes the handles straight forward, arms almost extended' },
  { id: 'chest_press_incline', nom: 'Développé incliné machine', synonymes: ['chest press incline', 'incline press machine', 'developpe incline machine', 'presse inclinee pectoraux'], groupe: 'PECTORAUX', muscles: ['Haut des pectoraux', 'Épaules', 'Triceps'], exercices: ['Chest Press Incliné (Machine)'], dessin: 'incline chest press machine, plate loaded, with a reclined seat and two converging lever arms; the figure pushes the handles up and forward at a 30-degree angle' },
  { id: 'pec_deck', nom: 'Pec deck (butterfly)', synonymes: ['pec deck', 'peck deck', 'butterfly', 'ecarte machine', 'machine a pecs', 'pec fly', 'papillon'], groupe: 'PECTORAUX', muscles: ['Pectoraux', 'Épaules avant'], exercices: ['Pec Deck (Butterfly)'], dessin: 'seated pec deck machine with an upright backrest and two long swinging arms with vertical handles at shoulder height; the figure sits, arms open wide, bringing the handles together in front of the chest in a hugging motion' },
  { id: 'poulie_vis_a_vis', nom: 'Poulies vis-à-vis', synonymes: ['vis a vis', 'poulie vis a vis', 'cable crossover', 'croisement poulies', 'ecarte poulie', 'double poulie', 'cross over'], groupe: 'PECTORAUX', muscles: ['Pectoraux', 'Épaules avant'], exercices: ['Écartés à la Poulie Haute', 'Écartés à la Poulie Basse', 'Cable Crossover'], dessin: 'cable crossover station: two tall towers facing each other, each with an adjustable pulley and a single handle, a connecting bar on top; the figure stands in the middle, one foot forward, bringing both handles down and together in front of the hips' },
  { id: 'banc_developpe', nom: 'Banc de développé couché', synonymes: ['banc plat', 'banc developpe', 'bench', 'bench press', 'banc couche', 'developpe couche'], groupe: 'PECTORAUX', muscles: ['Pectoraux', 'Triceps', 'Épaules'], exercices: ['Développé Couché (Barre)', 'Bench Press Pause'], dessin: 'flat bench press station: a flat padded bench with two upright bar holders and a loaded barbell; the figure lies on the bench and presses the barbell up above the chest' },
  { id: 'banc_incline', nom: 'Banc incliné à barre', synonymes: ['banc incline', 'incline bench', 'developpe incline', 'banc incline barre'], groupe: 'PECTORAUX', muscles: ['Haut des pectoraux', 'Épaules', 'Triceps'], exercices: ['Développé Incliné (Barre)'], dessin: 'incline bench press station: an inclined padded bench at 30 degrees with upright bar holders and a loaded barbell; the figure lies on the incline and presses the barbell up' },
  { id: 'dips_assistes', nom: 'Dips assistés', synonymes: ['dips assistes', 'machine dips', 'assisted dip', 'dips machine', 'dips avec contrepoids'], groupe: 'TRICEPS', muscles: ['Triceps', 'Pectoraux', 'Épaules'], exercices: ['Dips (Focus Triceps)', 'Dips (Focus Pectoraux)'], dessin: 'assisted dip machine: a tall frame with two parallel dip handles, a padded knee platform below connected to a counterweight stack; the figure kneels on the platform, gripping the handles, arms straight at the top of a dip' },
  // dos
  { id: 'tirage_vertical', nom: 'Tirage vertical à la poulie', synonymes: ['tirage vertical', 'tirage poitrine', 'tirage haut', 'poulie haute', 'lat pulldown', 'pulldown', 'tirage nuque', 'lat machine'], groupe: 'DOS', muscles: ['Grand dorsal', 'Biceps', 'Rhomboïdes'], exercices: ['Tirage Poitrine (Lat Pulldown)', 'Tirage Serré (V-Bar)', 'Tirage Nuque'], dessin: 'seated lat pulldown station: a seat with a thigh hold-down pad, a high pulley with a long wide bar on a cable; the figure sits and pulls the wide bar down to the upper chest, elbows down and back' },
  { id: 'tirage_convergent', nom: 'Tirage vertical convergent', synonymes: ['tirage convergent', 'pulldown convergent', 'iso lateral pulldown', 'tirage a charger', 'tirage unilateral machine'], groupe: 'DOS', muscles: ['Grand dorsal', 'Biceps'], exercices: ['Tirage Poitrine (Lat Pulldown)', 'Single Arm Lat Pulldown'], dessin: 'plate loaded converging pulldown machine: a seat, thigh pads and two separate high lever arms with handles that move in an arc; the figure pulls both handles down to the shoulders' },
  { id: 'tirage_horizontal', nom: 'Tirage horizontal à la poulie', synonymes: ['tirage horizontal', 'tirage assis', 'poulie basse', 'tirage poulie basse', 'seated row', 'rowing assis', 'rowing poulie', 'low row'], groupe: 'DOS', muscles: ['Grand dorsal', 'Rhomboïdes', 'Biceps'], exercices: ['Tirage Horizontal (Seated Row)', 'Tirage Horizontal Unilatéral'], dessin: 'seated cable row station: a long low bench, a foot plate and a low pulley with a narrow V handle; the figure sits upright, knees slightly bent, pulling the handle to the belly' },
  { id: 'rowing_machine', nom: 'Rowing assis machine', synonymes: ['rowing machine', 'low row machine', 'rowing appui poitrine', 'chest supported row', 'machine a dos', 'rowing a charger'], groupe: 'DOS', muscles: ['Dos', 'Rhomboïdes', 'Trapèzes', 'Biceps'], exercices: ['Low Row Machine', 'Chest Supported Row'], dessin: 'seated row machine with a vertical chest pad, a seat and two lever handles in front; the figure sits with the chest against the pad and rows the handles back, elbows behind the body' },
  { id: 'rowing_tbar', nom: 'Rowing T-bar', synonymes: ['t bar', 'tbar', 'rowing t', 'rowing t bar', 'rowing barre en t', 'landmine row machine'], groupe: 'DOS', muscles: ['Dos', 'Trapèzes', 'Biceps'], exercices: ['Rowing T-Bar'], dessin: 'T-bar row machine with an inclined chest support pad, foot platform and a lever arm loaded with plates ending in handles; the figure lies chest down on the pad and rows the handles up toward the chest' },
  { id: 'pull_over_machine', nom: 'Pull-over machine', synonymes: ['pull over', 'pullover', 'pull over machine', 'pullover assis'], groupe: 'DOS', muscles: ['Grand dorsal', 'Pectoraux'], exercices: ['Pull-over machine'], dessin: 'seated pullover machine: a seat with a belt, elbow pads on a rotating arm behind the head; the figure sits and drives the elbows down and forward in an arc from overhead to the belly' },
  { id: 'tractions_assistees', nom: 'Tractions assistées', synonymes: ['tractions assistees', 'traction assistee', 'assisted pull up', 'machine a tractions', 'tractions avec contrepoids'], groupe: 'DOS', muscles: ['Grand dorsal', 'Biceps'], exercices: ['Tractions (Pronation)', 'Tractions (Supination)', 'Tractions Neutres'], dessin: 'assisted pull-up machine: a tall frame with a high pull-up bar, a padded knee platform connected to a counterweight stack; the figure kneels on the platform and pulls up, chin above the bar' },
  { id: 'banc_lombaires', nom: 'Banc à lombaires', synonymes: ['lombaires', 'banc lombaires', 'banc a 45', 'hyperextensions', 'hyperextension', 'chaise romaine lombaires', 'extension du dos', 'back extension'], groupe: 'DOS', muscles: ['Lombaires', 'Fessiers', 'Ischios'], exercices: ['Banc à Lombaires', 'Hyperextensions'], dessin: '45-degree back extension bench: an inclined frame with a hip pad and ankle rollers on a foot plate; the figure is angled with hips on the pad, torso straight in line with the legs, arms crossed on the chest' },
  { id: 'lombaires_machine', nom: 'Extension lombaires machine', synonymes: ['lombaires machine', 'machine lombaires', 'lower back machine', 'extension dos assis'], groupe: 'DOS', muscles: ['Lombaires'], exercices: ['Extension lombaires (Machine)'], dessin: 'seated lower back extension machine with a seat, a foot plate and a padded back roller at shoulder blade height; the figure sits and pushes the torso back against the roller' },
  // epaules
  { id: 'shoulder_press', nom: 'Développé épaules machine', synonymes: ['shoulder press', 'presse epaules', 'developpe epaules machine', 'developpe militaire machine', 'machine a epaules'], groupe: 'ÉPAULES', muscles: ['Épaules', 'Triceps'], exercices: ['Shoulder Press Machine'], dessin: 'seated shoulder press machine with an upright backrest and two handles at shoulder height on lever arms; the figure sits and presses the handles straight overhead' },
  { id: 'elevations_laterales_machine', nom: 'Élévations latérales machine', synonymes: ['elevations laterales machine', 'lateral raise machine', 'machine laterales', 'deltoides machine'], groupe: 'ÉPAULES', muscles: ['Deltoïdes moyens'], exercices: ['Élévations Latérales (Machine)'], dessin: 'seated lateral raise machine with a chest pad and two arm pads on pivots at shoulder level; the figure sits facing the pad and raises both elbows out to the sides up to shoulder height' },
  { id: 'oiseau_machine', nom: 'Oiseau machine (pec deck inversé)', synonymes: ['oiseau machine', 'reverse pec deck', 'reverse fly', 'rear delt', 'butterfly inverse', 'pec deck inverse', 'deltoides posterieurs'], groupe: 'ÉPAULES', muscles: ['Deltoïdes arrière', 'Rhomboïdes'], exercices: ['Oiseau Machine (Reverse Pec Deck)'], dessin: 'reverse pec deck: the figure sits facing the backrest pad, chest against it, gripping two handles in front and opening the arms wide backward' },
  { id: 'shrug_machine', nom: 'Shrugs machine', synonymes: ['shrug', 'shrugs', 'trapezes machine', 'haussements d epaules machine'], groupe: 'ÉPAULES', muscles: ['Trapèzes'], exercices: ['Shrugs Barre (Trapèzes)'], dessin: 'standing shrug machine with two side handles on lever arms; the figure stands upright, arms straight down holding the handles, shoulders shrugged up toward the ears' },
  // bras
  { id: 'curl_machine', nom: 'Curl biceps machine', synonymes: ['curl machine', 'machine a biceps', 'pupitre machine', 'biceps machine', 'curl assis machine'], groupe: 'BICEPS', muscles: ['Biceps', 'Avant-bras'], exercices: ['Curl Machine'], dessin: 'seated biceps curl machine with an angled arm pad like a preacher bench and a handle on a rotating arm; the figure sits, upper arms on the pad, curling the handle up toward the shoulders' },
  { id: 'pupitre', nom: 'Banc pupitre (Larry Scott)', synonymes: ['pupitre', 'larry scott', 'preacher curl', 'banc a biceps', 'curl pupitre'], groupe: 'BICEPS', muscles: ['Biceps'], exercices: ['Curl Larry Scott (Pupitre)'], dessin: 'preacher curl bench: a seat and a sloped arm pad; the figure sits with upper arms on the pad and curls a short bent barbell up' },
  { id: 'triceps_machine', nom: 'Triceps machine', synonymes: ['triceps machine', 'machine a triceps', 'dips assis', 'extension triceps machine', 'seated dip'], groupe: 'TRICEPS', muscles: ['Triceps'], exercices: ['Triceps Machine'], dessin: 'seated triceps press machine: a seat with a backrest and two handles beside the hips on lever arms; the figure sits upright and pushes the handles down, arms straightening' },
  { id: 'poulie_haute_triceps', nom: 'Poulie haute (triceps)', synonymes: ['poulie triceps', 'triceps poulie', 'pushdown', 'push down', 'extension triceps poulie', 'corde triceps'], groupe: 'TRICEPS', muscles: ['Triceps'], exercices: ['Extension Triceps Poulie (Corde)', 'Extension Triceps Poulie (Barre)', 'Overhead Extension Poulie'], dessin: 'single cable tower with a high pulley and a rope attachment; the figure stands facing the tower, elbows tucked at the sides, pushing the rope down until the arms are straight' },
  // abdos
  { id: 'ab_crunch', nom: 'Crunch machine', synonymes: ['ab crunch', 'crunch machine', 'machine a abdos', 'abdos machine', 'abdominal machine'], groupe: 'ABDOS', muscles: ['Abdominaux'], exercices: ['Crunch Machine'], dessin: 'seated abdominal crunch machine with a seat, foot rollers and two handles near the chest on a pivoting arm; the figure sits and curls the torso forward and down' },
  { id: 'rotation_buste', nom: 'Rotation du buste machine', synonymes: ['rotary torso', 'rotation buste', 'machine obliques', 'obliques machine', 'torsion machine'], groupe: 'ABDOS', muscles: ['Obliques', 'Abdominaux'], exercices: ['Rotation du buste (Machine)'], dessin: 'seated rotary torso machine: a rotating seat, knee pads and a chest pad with handles; the figure sits upright and twists the torso to one side' },
  { id: 'chaise_romaine', nom: 'Chaise romaine', synonymes: ['chaise romaine', 'captain chair', 'power tower', 'releve de jambes', 'station dips tractions', 'tour multi'], groupe: 'ABDOS', muscles: ['Abdominaux', 'Fléchisseurs de hanche'], exercices: ['Relevé de jambes Suspendu', 'Hanging Knee Raise', 'Dips (Focus Triceps)'], dessin: 'captain chair power tower: a tall frame with a padded back, two forearm pads with handles and no seat; the figure rests on the forearms, back on the pad, raising both knees up to the chest' },
  { id: 'banc_abdos', nom: 'Banc à abdos', synonymes: ['banc abdos', 'banc decline abdos', 'decline bench', 'sit up bench', 'planche abdos'], groupe: 'ABDOS', muscles: ['Abdominaux'], exercices: ['Decline Crunch', 'Sit-ups'], dessin: 'decline sit-up bench with leg rollers at the high end; the figure lies head down on the decline and curls the torso halfway up' },
  // stations polyvalentes
  { id: 'cage', nom: 'Cage à squat (rack)', synonymes: ['cage', 'rack', 'power rack', 'cage a squat', 'squat rack', 'half rack', 'rack a squat'], groupe: 'POLYVALENT', muscles: ['Cuisses', 'Fessiers', 'Dos', 'Épaules'], exercices: ['Squat Barre Libre', 'Front Squat', 'Développé Militaire (Barre)', 'Rack Pull'], dessin: 'power rack: a cage of four tall uprights with safety bars, a pull-up bar on top and a barbell on hooks; the figure stands inside with the barbell on the upper back, squatting' },
  { id: 'banc_reglable', nom: 'Banc réglable et haltères', synonymes: ['banc reglable', 'banc halteres', 'banc incline halteres', 'adjustable bench', 'halteres'], groupe: 'POLYVALENT', muscles: ['Pectoraux', 'Épaules', 'Dos'], exercices: ['Développé Couché (Haltères)', 'Développé Incliné (Haltères)', 'Développé Haltères Assis', 'Rowing Haltère (One Arm)'], dessin: 'adjustable bench set at an incline with a pair of hexagonal dumbbells; the figure lies on the incline pressing two dumbbells up' },
  { id: 'poulie_reglable', nom: 'Station à poulies réglables', synonymes: ['poulie reglable', 'functional trainer', 'double poulie reglable', 'station poulies', 'poulie basse', 'cable'], groupe: 'POLYVALENT', muscles: ['Tout le corps'], exercices: ['Curl Poulie Basse', 'Facepull Poulie', 'Élévations Latérales (Poulie)', 'Woodchop Poulie', 'Cable Pull Through'], dessin: 'functional trainer: a compact frame with two adjustable pulley columns and two weight stacks; the figure stands sideways, pulling one handle across the body in a diagonal chop' },
  { id: 'landmine', nom: 'Landmine', synonymes: ['landmine', 'mine', 'barre pivot', 'barre a pivot'], groupe: 'POLYVALENT', muscles: ['Épaules', 'Pectoraux', 'Dos', 'Abdos'], exercices: ['Landmine Press', 'Meadows Row (Landmine)', 'Landmine Rotation'], dessin: 'landmine: a barbell with one end fixed in a floor pivot and plates on the other end; the figure stands in a split stance and presses the free end up and forward with one hand' },
  { id: 'barres_paralleles', nom: 'Barres parallèles (dips)', synonymes: ['barres paralleles', 'dips', 'station dips', 'barres dips'], groupe: 'POLYVALENT', muscles: ['Triceps', 'Pectoraux'], exercices: ['Dips (Focus Triceps)', 'Dips (Focus Pectoraux)'], dessin: 'dip station with two parallel bars at hip height; the figure supports the body on straight arms between the bars, legs bent behind' },
];

export const MACHINE_BY_ID = new Map(MACHINES.map((m) => [m.id, m]));

/* ------------------------------------------------------------------ */
/* Recherche                                                            */
/* ------------------------------------------------------------------ */

/** minuscules, sans accents, ponctuation et tirets en espaces */
export function plie(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** un mot sans son s ou x final : « adducteurs » trouve « adducteur » */
function racine(w: string): string {
  return w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w;
}

const PETITS = new Set(['a', 'au', 'aux', 'la', 'le', 'les', 'de', 'des', 'du', 'd', 'l', 'en', 'et', 'machine', 'the']);

function mots(s: string): string[] {
  return plie(s).split(' ').filter(Boolean);
}

/** score d'une machine pour une recherche, 0 si elle ne correspond pas */
export function scoreMachine(m: Machine, query: string): number {
  const q = plie(query);
  if (!q) return 0;
  const nom = plie(m.nom);
  const syns = m.synonymes.map(plie);
  if (nom === q || plie(m.id.replace(/_/g, ' ')) === q) return 100;
  if (syns.includes(q)) return 90;
  const qWords = mots(q).filter((w) => !PETITS.has(w));
  const words = qWords.length ? qWords : mots(q);
  const champs: { mots: string[]; poids: number }[] = [
    { mots: mots(m.nom), poids: 3 },
    { mots: syns.flatMap((s) => s.split(' ')), poids: 2 },
    { mots: m.exercices.flatMap(mots), poids: 1.5 },
    { mots: m.muscles.flatMap(mots), poids: 1 },
    { mots: mots(m.groupe), poids: 1 },
  ];
  let total = 0;
  for (const w of words) {
    const rw = racine(w);
    let best = 0;
    for (const ch of champs) {
      for (const t of ch.mots) {
        const rt = racine(t);
        if (rt === rw) best = Math.max(best, ch.poids * 2);
        else if (w.length >= 2 && (t.startsWith(w) || rt.startsWith(rw))) best = Math.max(best, ch.poids * 1.5);
        else if (w.length >= 4 && t.includes(w)) best = Math.max(best, ch.poids);
      }
    }
    if (best === 0) return 0;
    total += best;
  }
  if (nom.startsWith(q) || syns.some((s) => s.startsWith(q))) total += 10;
  return total;
}

/** machines qui correspondent, de la meilleure a la moins bonne ; groupe facultatif */
export function chercherMachines(query: string, groupe?: MachineGroupe | null, liste: Machine[] = MACHINES): Machine[] {
  const base = groupe ? liste.filter((m) => m.groupe === groupe || (groupe !== 'POLYVALENT' && m.muscles.some((x) => plie(x) === plie(GROUPES.find((g) => g.id === groupe)?.label ?? '')))) : liste;
  if (!plie(query)) return base;
  return base
    .map((m) => ({ m, s: scoreMachine(m, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.m.nom.localeCompare(b.m.nom, 'fr'))
    .map((x) => x.m);
}

/** une machine a partir d'un id, d'un nom ou d'un synonyme ecrit par l'IA */
export function trouverMachine(texte: string): Machine | undefined {
  const t = plie(texte);
  if (!t) return undefined;
  const id = t.replace(/ /g, '_');
  if (MACHINE_BY_ID.has(id)) return MACHINE_BY_ID.get(id);
  const exact = MACHINES.find((m) => plie(m.nom) === t || m.synonymes.some((s) => plie(s) === t));
  if (exact) return exact;
  const hits = chercherMachines(texte);
  return hits[0];
}

/* ------------------------------------------------------------------ */
/* Photo : consigne pour l'IA et bloc YOROI MACHINE v1                  */
/* ------------------------------------------------------------------ */

export const MACHINE_HEADER = 'YOROI MACHINE v1';

export function buildMachinePrompt(liste: Machine[] = MACHINES): string {
  const lignes = liste.map((m) => `${m.id} : ${m.nom} (${m.muscles.slice(0, 2).join(', ').toLowerCase()})`).join('\n');
  return `Je t'envoie la photo d'une machine de musculation prise dans ma salle, pour mon application YOROI. Dis-moi laquelle c'est dans la liste ci-dessous.

Règles :
1. Regarde la forme de la machine : siège, dossier, appuis, poignées, plateau, poulies, rails, position du corps prévue. Ignore la marque, le logo et la couleur.
2. Choisis une seule machine de la liste et recopie son identifiant exact (le mot avant les deux points).
3. Si tu hésites, mets ton premier choix dans machine et jusqu'à deux autres identifiants dans autres.
4. Si la machine n'est pas dans la liste, écris machine: inconnue et décris-la en quelques mots dans description.
5. Réponds uniquement avec le bloc, sans rien avant ni après.

Format :
${MACHINE_HEADER}
machine: identifiant
confiance: haute, moyenne ou faible
autres: identifiant, identifiant
description: ce que tu vois en quelques mots
FIN

Exemple :
${MACHINE_HEADER}
machine: leg_extension
confiance: haute
autres: leg_curl_assis
description: siège avec un boudin devant les tibias, on tend les jambes
FIN

La liste :
${lignes}`;
}

export type Confiance = 'haute' | 'moyenne' | 'faible';

export type MachineBlock = {
  /** un en-tete YOROI MACHINE a ete trouve */
  found: boolean;
  machine?: Machine;
  /** l'IA a repondu inconnue, ou un nom absent du catalogue */
  inconnue: boolean;
  /** ce que l'IA a ecrit dans machine, tel quel */
  ecrit?: string;
  confiance?: Confiance;
  autres: Machine[];
  description?: string;
};

function lireConfiance(raw: string): Confiance | undefined {
  const t = plie(raw);
  if (/^(haute|elevee|forte|high|sure)/.test(t)) return 'haute';
  if (/^(moyenne|medium|moyen)/.test(t)) return 'moyenne';
  if (/^(faible|basse|low|incertaine)/.test(t)) return 'faible';
  return undefined;
}

/** lit le premier bloc YOROI MACHINE v1 d'une reponse collee (markdown, gras et guillemets toleres) */
export function parseMachineBlock(text: string): MachineBlock {
  const empty: MachineBlock = { found: false, inconnue: false, autres: [] };
  if (!text) return empty;
  const lines = String(text).replace(/\r/g, '').split('\n').map((l) => l.replace(/[*`>#]/g, '').replace(/(^|\s)_+|_+(\s|$)/g, '$1$2').trim());
  const start = lines.findIndex((l) => /^yoroi\s*machine\b/i.test(l));
  if (start < 0) return empty;
  const out: MachineBlock = { found: true, inconnue: false, autres: [] };
  let ditInconnue = false;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^fin\b/i.test(l) || /^yoroi\s*machine\b/i.test(l)) break;
    const m = l.match(/^([a-zA-Zéèê\s]+?)\s*[:=]\s*(.*)$/);
    if (!m) continue;
    const key = plie(m[1]);
    const val = m[2].replace(/^["'«\s]+|["'»\s.]+$/g, '').trim();
    if (key === 'machine' || key === 'id' || key === 'identifiant') {
      out.ecrit = val;
      if (!val || /^(inconnue?|aucune|unknown|none|non)$/i.test(plie(val))) { out.inconnue = true; ditInconnue = true; }
      else {
        const found = trouverMachine(val);
        if (found) out.machine = found;
        else out.inconnue = true;
      }
    } else if (key === 'confiance' || key === 'confidence') {
      out.confiance = lireConfiance(val);
    } else if (key === 'autres' || key === 'autre' || key === 'alternatives') {
      const seen = new Set<string>();
      for (const part of val.split(/[,;/]| ou /)) {
        const mm = trouverMachine(part);
        if (mm && !seen.has(mm.id)) { seen.add(mm.id); out.autres.push(mm); }
      }
    } else if (key === 'description') {
      out.description = val || undefined;
    }
  }
  if (out.machine) out.autres = out.autres.filter((a) => a.id !== out.machine!.id).slice(0, 3);
  else if (out.autres.length && !ditInconnue) {
    // premier choix illisible : le suivant devient la proposition
    out.machine = out.autres.shift();
    out.inconnue = false;
  }
  return out;
}

/** la consigne de YOROI copiee elle-meme n'est pas une reponse de l'IA */
export function isOwnMachinePrompt(text: string): boolean {
  return /Je t'envoie la photo d'une machine de musculation/.test(text) && /La liste :/.test(text);
}
