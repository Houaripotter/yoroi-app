/**
 * Les noms d'exercices de Hevy vers la bibliotheque YOROI (18 novembre 2026, « reprise complete depuis Hevy »).
 * Hevy ecrit ses exercices avec le materiel entre parentheses (« Bench Press (Dumbbell) », « Lateral Raise
 * (Cable) ») et les traduit dans la langue du telephone (« Élévation Latérale (Haltère) »). Le vocabulaire des
 * salles (vocabulaire.ts) prend l'expression la plus longue, sans le materiel : « Bench Press (Dumbbell) »
 * devenait le developpe couche a la barre. Ici, le nom complet, materiel compris, d'abord.
 *
 * Prudence : ces noms sont ceux vus dans des exports et des partages de Hevy, en anglais et en francais. Hevy peut
 * les changer. Un nom absent d'ici passe ensuite par reconnaitreExo (vocabulaire.ts), et dans tous les cas
 * l'utilisateur voit la correspondance et peut la refuser pour garder son nom (app/reprise-hevy.tsx).
 * Chaque nom vise existe dans constants/exerciseLibrary.ts : verifie par __tests__/unit/repriseHevy.test.ts.
 */

/** minuscules, sans accents, la ponctuation devient un espace */
export function plierHevy(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** nom Hevy plie -> nom exact de la bibliotheque */
export const NOMS_HEVY: Record<string, string> = {
  // pectoraux
  'bench press barbell': 'Développé Couché (Barre)',
  'bench press dumbbell': 'Développé Couché (Haltères)',
  'incline bench press barbell': 'Développé Incliné (Barre)',
  'incline bench press dumbbell': 'Développé Incliné (Haltères)',
  'decline bench press barbell': 'Développé Décliné (Barre)',
  'decline bench press dumbbell': 'Développé Décliné (Haltères)',
  'chest fly dumbbell': 'Écartés Couché (Haltères)',
  'incline chest fly dumbbell': 'Écartés Incliné (Haltères)',
  'chest press machine': 'Chest Press (Machine)',
  'incline chest press machine': 'Chest Press Incliné (Machine)',
  'butterfly pec deck': 'Pec Deck (Butterfly)',
  'cable fly crossovers': 'Cable Crossover',
  'chest dip': 'Dips (Focus Pectoraux)',
  'triceps dip': 'Dips (Focus Triceps)',
  'push up': 'Pompes (Poids du corps)',
  'diamond push up': 'Pompes Diamant',
  'close grip bench press': 'Close Grip Bench Press',
  'developpe couche haltere': 'Développé Couché (Haltères)',
  'developpe couche halteres': 'Développé Couché (Haltères)',
  'developpe couche incline barre': 'Développé Incliné (Barre)',
  'developpe couche incline haltere': 'Développé Incliné (Haltères)',
  'developpe incline haltere': 'Développé Incliné (Haltères)',
  'dips triceps': 'Dips (Focus Triceps)',
  // dos
  'pull up': 'Tractions (Pronation)',
  // 18 novembre 2026 : le poids du corps leste (la charge notee est le lest ajoute)
  'pull up weighted': 'Tractions Lestées',
  'weighted pull up': 'Tractions Lestées',
  'chin up': 'Tractions (Supination)',
  'lat pulldown cable': 'Tirage Poitrine (Lat Pulldown)',
  'lat pulldown machine': 'Tirage Poitrine (Lat Pulldown)',
  'seated cable row v grip cable': 'Tirage Serré (V-Bar)',
  'seated row machine': 'Low Row Machine',
  'bent over row barbell': 'Rowing Barre (Bent Over)',
  'dumbbell row': 'Rowing Haltère (One Arm)',
  't bar row': 'Rowing T-Bar',
  'pendlay row barbell': 'Rowing Pendlay',
  'deadlift barbell': 'Deadlift (Soulevé de terre)',
  'romanian deadlift barbell': 'Deadlift Roumain',
  'romanian deadlift dumbbell': 'Romanian Deadlift (Haltères)',
  'sumo deadlift': 'Deadlift Sumo',
  'trap bar deadlift': 'Trap Bar Deadlift',
  'face pull': 'Face Pull',
  'straight arm lat pulldown cable': 'Straight Arm Pulldown',
  'back extension hyperextension': 'Hyperextensions',
  'good morning barbell': 'Good Morning',
  'souleve de terre barre': 'Deadlift (Soulevé de terre)',
  'souleve de terre roumain barre': 'Deadlift Roumain',
  'tirage vertical cable': 'Tirage Poitrine (Lat Pulldown)',
  // epaules
  'overhead press barbell': 'Développé Militaire (Barre)',
  'shoulder press dumbbell': 'Développé Haltères Assis',
  'seated overhead press dumbbell': 'Développé Haltères Assis',
  'shoulder press machine': 'Shoulder Press Machine',
  'arnold press dumbbell': 'Arnold Press',
  'lateral raise dumbbell': 'Élévations Latérales (Haltères)',
  'lateral raise cable': 'Élévations Latérales (Poulie)',
  'lateral raise machine': 'Élévations Latérales (Machine)',
  'front raise dumbbell': 'Élévations Frontales (Haltères)',
  'front raise barbell': 'Élévations Frontales (Barre)',
  'rear delt reverse fly dumbbell': 'Oiseau Haltères (Rear Delts)',
  'rear delt reverse fly machine': 'Oiseau Machine (Reverse Pec Deck)',
  'shrug dumbbell': 'Shrugs Haltères (Trapèzes)',
  'shrug barbell': 'Shrugs Barre (Trapèzes)',
  'upright row barbell': 'Tirage Menton (Upright Row)',
  'elevation laterale haltere': 'Élévations Latérales (Haltères)',
  'elevation laterale cable': 'Élévations Latérales (Poulie)',
  'developpe militaire haltere': 'Développé Haltères Assis',
  // bras
  'bicep curl barbell': 'Curl Barre Droite',
  'bicep curl dumbbell': 'Curl Haltères Simultané',
  'bicep curl cable': 'Cable Curl',
  'ez bar biceps curl': 'Curl Barre EZ',
  'hammer curl dumbbell': 'Curl Marteau (Hammer)',
  'preacher curl barbell': 'Curl Larry Scott (Pupitre)',
  'concentration curl': 'Curl Concentré',
  'triceps pushdown': 'Extension Triceps Poulie (Barre)',
  'triceps rope pushdown': 'Extension Triceps Poulie (Corde)',
  'skullcrusher barbell': 'Barre au front (Skullcrusher)',
  'skullcrusher dumbbell': 'Skullcrusher Haltères',
  'triceps extension dumbbell': 'Extension Haltère Nuque',
  'overhead triceps extension cable': 'Cable Overhead Extension',
  'triceps kickback dumbbell': 'Kickback Triceps (Haltère)',
  'extension triceps corde': 'Extension Triceps Poulie (Corde)',
  'curl biceps haltere': 'Curl Haltères Simultané',
  'curl marteau haltere': 'Curl Marteau (Hammer)',
  // jambes
  'squat barbell': 'Squat Barre Libre',
  'front squat': 'Front Squat',
  'goblet squat': 'Goblet Squat',
  'bulgarian split squat': 'Squat Bulgare',
  'hack squat machine': 'Hack Squat',
  'squat smith machine': 'Smith Machine Squat',
  'leg press machine': 'Presse à Cuisses',
  'leg press horizontal machine': 'Presse à Cuisses',
  'leg extension machine': 'Leg Extension',
  'lying leg curl machine': 'Leg Curl Couché',
  'seated leg curl machine': 'Leg Curl Assis',
  'hip thrust barbell': 'Hip Thrust Barre',
  'hip thrust machine': 'Hip Thrust Machine',
  'glute bridge': 'Glute Bridge',
  'lunge dumbbell': 'Fentes Avant (Haltères)',
  'walking lunge dumbbell': 'Fentes Marchées',
  'hip abduction machine': 'Abducteurs Machine',
  'hip adduction machine': 'Adducteurs Machine',
  'standing calf raise machine': 'Mollets Debout (Machine)',
  'seated calf raise': 'Mollets Assis (Machine)',
  'calf press machine': 'Mollets à la Presse',
  'squat barre': 'Squat Barre Libre',
  'presse a cuisses machine': 'Presse à Cuisses',
  'leg curl allonge machine': 'Leg Curl Couché',
  'leg curl assis machine': 'Leg Curl Assis',
  // abdos, prise
  'crunch': 'Crunch Abdominal',
  'cable crunch': 'Crunch Poulie Haute',
  'hanging leg raise': 'Relevé de jambes Suspendu',
  'hanging knee raise': 'Hanging Knee Raise',
  'plank': 'Gainage Planche',
  'russian twist weighted': 'Russian Twist (Lesté)',
  'russian twist bodyweight': 'Russian Twist',
  'ab wheel': 'Roulette Abdos (Abs Wheel)',
  'farmers walk': 'Farmer Walk',
  'dead hang': 'Dead Hang',
};

/** Le nom de la bibliotheque pour ce nom de Hevy, sinon null (le vocabulaire des salles prend le relais) */
export function nomHevyConnu(nom: string): string | null {
  return NOMS_HEVY[plierHevy(nom)] ?? null;
}
