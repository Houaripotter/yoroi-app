/**
 * Mesures de santé lues par YOROI (refonte v2, espace Santé).
 * Chaque mesure : couleur par fonction, manière de cumuler, explication simple,
 * et repère seulement quand il est sourcé (aucun chiffre inventé).
 * ext : lue par getExtendedHistory (ajout du 9 octobre 2026), gardée en base sous « x_<clé> ».
 */
import { MORE_METRICS } from './metricsMore';
import type { NewMetricKey } from './metricsMore';
import { traduire } from '@/lib/i18n/tr';

export type Family = 'activite' | 'mobilite' | 'energie' | 'coeur' | 'souffle' | 'sommeil' | 'recuperation' | 'corps' | 'environnement' | 'nutrition';

export type MetricKey =
  | 'pas'
  | 'distance'
  | 'etages'
  | 'exercice'
  | 'debout'
  | 'lumiere-du-jour'
  | 'distance-velo'
  | 'distance-nage'
  | 'denivele'
  | 'vitesse'
  | 'puissance'
  | 'puissance-course'
  | 'cadence-velo'
  | 'cadence-pas'
  | 'effort'
  | 'energie-active'
  | 'energie-repos'
  | 'frequence-cardiaque'
  | 'fc-repos'
  | 'fc-marche'
  | 'recuperation-cardiaque'
  | 'vfc'
  | 'tension'
  | 'oxygene'
  | 'respiration'
  | 'perturbations-respiratoires'
  | 'vo2max'
  | 'sommeil'
  | 'temperature'
  | 'temperature-poignet'
  | 'electrodermale'
  | 'pleine-conscience'
  | 'poids'
  | 'masse-grasse'
  | 'masse-maigre'
  | 'masse-osseuse'
  | 'eau-corporelle'
  | 'tour-de-taille'
  | 'imc'
  | 'glycemie'
  | 'eau'
  | 'calories-mangees'
  | 'proteines'
  | 'glucides'
  | 'lipides'
  | 'cafeine'
  // Ajouts du 10 octobre 2026 (vague 12) : tout ce qu'Apple Santé et Health Connect savent donner
  | NewMetricKey;

/** sum : un total par jour (pas, calories). avg : une moyenne par jour (FC). latest : mesure ponctuelle (poids, VO2 max). */
export type Kind = 'sum' | 'avg' | 'latest';

export type Norm = { text: string; source: string };

export type MetricDef = {
  key: MetricKey;
  label: string;
  family: Family;
  unit: string;
  kind: Kind;
  digits: number;
  /** true si une hausse est plutôt bonne, false si une baisse est plutôt bonne, null si ça dépend */
  upIsGood: boolean | null;
  /** type de la table health_data (données déjà stockées sur le téléphone) */
  store?: string;
  /** lue par getExtendedHistory, gardée en base sous x_<clé> */
  ext?: boolean;
  /** lue uniquement sur iPhone (Apple Santé) */
  iosOnly?: boolean;
  /** lue uniquement sur Android (Health Connect) */
  androidOnly?: boolean;
  what: string;
  norm?: Norm;
  /** événement daté (chute, alerte, ECG) : liste d'événements au lieu d'une courbe */
  event?: boolean;
  /** la page de détail montre aussi la liste datée des saisies (humeur) */
  list?: boolean;
  /** à défaut de norme, comment lire sa courbe */
  howToRead?: string;
  /** appareils qui envoient le plus souvent cette mesure */
  devices: string;
  /** écran YOROI qui va plus loin */
  more?: { label: string; href: string };
};

export const FAMILY: Record<Family, { label: string; color: string; tint: string; kanji: string }> = {
  activite: { label: traduire('Activité'), color: '#2C4A84', tint: '#E4E9F3', kanji: '動' },
  energie: { label: traduire('Énergie'), color: '#A8832F', tint: '#F5ECD6', kanji: '気' },
  coeur: { label: traduire('Cœur'), color: '#7B3B63', tint: '#F0E1EA', kanji: '心' },
  souffle: { label: traduire('Respiration'), color: '#2F7A80', tint: '#DDEDEE', kanji: '息' },
  sommeil: { label: traduire('Sommeil'), color: '#5A4E96', tint: '#E7E4F1', kanji: '眠' },
  recuperation: { label: traduire('Récupération'), color: '#6E8C3A', tint: '#E8EEDC', kanji: '癒' },
  corps: { label: 'Corps', color: '#1D2029', tint: '#E8E5DE', kanji: '体' },
  mobilite: { label: traduire('Mobilité'), color: '#3D5D9E', tint: '#E2E8F2', kanji: '歩' },
  environnement: { label: traduire('Environnement'), color: '#5E6B3A', tint: '#E9ECDD', kanji: '環' },
  nutrition: { label: traduire('Nutrition'), color: '#9A5B2E', tint: '#F3E6DA', kanji: '食' },
};

export const FAMILY_ORDER: Family[] = ['activite', 'energie', 'mobilite', 'coeur', 'sommeil', 'recuperation', 'souffle', 'corps', 'environnement', 'nutrition'];

export const METRICS: MetricDef[] = [
  // ============ ACTIVITÉ ============
  {
    key: 'pas',
    label: traduire('Pas'),
    family: 'activite',
    unit: 'pas',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    store: 'steps',
    what: traduire('Le nombre de pas comptés par ton téléphone ou ta montre sur la journée.'),
    norm: {
      text: traduire("Chez l'adulte, le risque de décès baisse au fil des pas jusqu'à environ 8 000 à 10 000 pas par jour avant 60 ans, et 6 000 à 8 000 pas après 60 ans."),
      source: traduire('Paluch et al., The Lancet Public Health, 2022'),
    },
    devices: 'iPhone, Apple Watch, Fitbit, Garmin, Samsung, Oura, Polar, COROS',
  },
  {
    key: 'distance',
    label: 'Distance',
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 1,
    upIsGood: true,
    store: 'distance',
    what: traduire('La distance parcourue à pied et en courant dans la journée.'),
    devices: 'iPhone, Apple Watch, Garmin, Fitbit, Samsung, COROS',
  },
  {
    key: 'exercice',
    label: traduire("Minutes d'exercice"),
    family: 'activite',
    unit: 'min',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    // 17 octobre nuit : aussi lues dans la base (mode demo) ; en direct, la lecture de Sante reste prioritaire
    store: 'exercise_minutes',
    what: traduire('Les minutes passées à bouger au moins à allure de marche rapide.'),
    norm: {
      text: traduire("Pour un adulte : 150 à 300 minutes d'activité modérée par semaine, ou 75 à 150 minutes d'activité intense."),
      source: traduire('Organisation mondiale de la santé, recommandations 2020'),
    },
    devices: traduire('Apple Watch, séances Health Connect'),
  },
  {
    key: 'etages',
    label: traduire('Étages montés'),
    family: 'activite',
    unit: traduire('étages'),
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    store: 'floors_climbed',
    ext: true,
    what: traduire("Le nombre d'étages gravis, estimé par le baromètre de ton téléphone ou de ta montre."),
    devices: 'iPhone, Apple Watch, Garmin, Fitbit',
  },
  {
    key: 'debout',
    label: traduire('Heures debout'),
    family: 'activite',
    unit: 'h',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    iosOnly: true,
    what: traduire("Le nombre d'heures où tu t'es levé et as bougé au moins une minute."),
    devices: 'Apple Watch',
  },
  {
    key: 'lumiere-du-jour',
    label: traduire('Lumière du jour'),
    family: 'activite',
    unit: 'min',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Le temps passé dehors à la lumière du jour, mesuré par le capteur de lumière de ta montre.'),
    howToRead: traduire("La lumière, surtout le matin, aide à caler ton horloge interne et donc ton sommeil. Compare tes semaines entre elles."),
    devices: 'Apple Watch',
  },
  {
    key: 'distance-velo',
    label: traduire('Distance à vélo'),
    family: 'activite',
    unit: 'km',
    kind: 'sum',
    digits: 1,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les kilomètres parcourus à vélo dans la journée.'),
    devices: traduire('Apple Watch, COROS, compteurs vélo'),
  },
  {
    key: 'distance-nage',
    label: traduire('Distance de nage'),
    family: 'activite',
    unit: 'm',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('Les mètres nagés dans la journée.'),
    devices: 'Apple Watch, COROS',
  },
  {
    key: 'denivele',
    label: traduire('Dénivelé'),
    family: 'activite',
    unit: 'm',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    androidOnly: true,
    what: traduire('Les mètres de montée cumulés dans la journée.'),
    devices: 'Garmin, Google Fitbit',
  },
  {
    key: 'vitesse',
    label: traduire('Vitesse moyenne'),
    family: 'activite',
    unit: 'km/h',
    kind: 'avg',
    digits: 1,
    upIsGood: true,
    ext: true,
    what: traduire("Ta vitesse moyenne quand tu cours ou pendant tes séances enregistrées par la montre."),
    howToRead: traduire('Elle dépend du sport et du terrain. Compare des séances semblables entre elles.'),
    devices: 'Apple Watch, Garmin, Samsung, Polar, Google Fitbit',
  },
  {
    key: 'puissance',
    label: traduire('Puissance'),
    family: 'activite',
    unit: 'W',
    kind: 'avg',
    digits: 0,
    upIsGood: true,
    ext: true,
    what: traduire("La puissance moyenne que tu développes à l'effort, surtout à vélo."),
    howToRead: traduire('Plus elle monte pour le même ressenti, plus tu progresses.'),
    devices: traduire('Capteurs de puissance vélo, Samsung'),
  },
  {
    key: 'puissance-course',
    label: traduire('Puissance de course'),
    family: 'activite',
    unit: 'W',
    kind: 'avg',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire('La puissance moyenne estimée pendant tes courses.'),
    devices: 'Apple Watch',
  },
  {
    key: 'cadence-velo',
    label: traduire('Cadence de pédalage'),
    family: 'activite',
    unit: 'tr/min',
    kind: 'avg',
    digits: 0,
    upIsGood: null,
    ext: true,
    what: traduire('Le nombre de tours de pédale par minute.'),
    devices: traduire('Capteurs de cadence, Garmin'),
  },
  {
    key: 'cadence-pas',
    label: traduire('Cadence de pas'),
    family: 'activite',
    unit: 'pas/min',
    kind: 'avg',
    digits: 0,
    upIsGood: null,
    ext: true,
    androidOnly: true,
    what: traduire('Le nombre de pas par minute pendant la marche ou la course.'),
    devices: 'Google Fitbit, Pixel Watch',
  },
  {
    key: 'effort',
    label: traduire('Effort le plus intense'),
    family: 'activite',
    unit: 'MET',
    kind: 'avg',
    digits: 1,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("L'intensité de ton effort estimée par ta montre, en MET. 1 MET, c'est ton corps au repos."),
    norm: {
      text: traduire("Moins de 3 MET : effort léger. De 3 à 6 MET : effort modéré. Plus de 6 MET : effort intense."),
      source: traduire('Organisation mondiale de la santé, recommandations 2020'),
    },
    devices: 'Apple Watch',
  },
  // ============ ÉNERGIE ============
  {
    key: 'energie-active',
    label: traduire('Calories actives'),
    family: 'energie',
    unit: 'kcal',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    store: 'calories_active',
    what: traduire("L'énergie dépensée en bougeant, en plus de ce que ton corps brûle au repos."),
    devices: 'Apple Watch, Garmin, Fitbit, Samsung, Polar, WHOOP, Oura',
  },
  {
    key: 'energie-repos',
    label: traduire('Calories au repos'),
    family: 'energie',
    unit: 'kcal',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    store: 'calories_basal',
    what: traduire('Ce que ton corps brûle pour vivre : respirer, digérer, garder sa température.'),
    howToRead: traduire("Elle varie peu d'un jour à l'autre. Elle dépend surtout de ton poids et de ta masse musculaire."),
    devices: 'Apple Watch, Polar, Samsung',
  },
  // ============ CŒUR ============
  {
    key: 'frequence-cardiaque',
    label: traduire('Fréquence cardiaque'),
    family: 'coeur',
    unit: 'bpm',
    kind: 'avg',
    digits: 0,
    upIsGood: null,
    store: 'heart_rate',
    what: traduire('Le nombre de battements de ton cœur par minute, en moyenne sur la journée.'),
    howToRead: traduire("Elle monte à l'effort et redescend au repos. Regarde surtout ta fréquence au repos pour suivre ta forme."),
    devices: 'Apple Watch, Garmin, Fitbit, Samsung, Polar, WHOOP, Oura, Withings',
    more: { label: traduire('Mes zones cardiaques'), href: '/heart-zones-settings' },
  },
  {
    key: 'fc-repos',
    label: traduire('Fréquence au repos'),
    family: 'coeur',
    unit: 'bpm',
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    store: 'heart_rate_resting',
    what: traduire('Ton cœur quand tu ne fais rien. Elle baisse quand ton cardio progresse.'),
    norm: {
      text: traduire("Chez l'adulte, une fréquence au repos se situe en général entre 60 et 100 battements par minute. Les sportifs entraînés descendent souvent plus bas."),
      source: 'American Heart Association',
    },
    devices: 'Apple Watch, WHOOP, Polar (Android), Google Fitbit (Android)',
    more: { label: traduire('Mes zones cardiaques'), href: '/heart-zones-settings' },
  },
  {
    key: 'fc-marche',
    label: traduire('Fréquence en marchant'),
    family: 'coeur',
    unit: 'bpm',
    kind: 'avg',
    digits: 0,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('Ta fréquence cardiaque moyenne quand tu marches. Elle baisse quand ton cardio progresse.'),
    howToRead: traduire('Compare tes valeurs sur plusieurs semaines : une baisse régulière montre un cœur plus efficace.'),
    devices: 'Apple Watch',
  },
  {
    key: 'recuperation-cardiaque',
    label: traduire('Récupération cardiaque'),
    family: 'coeur',
    unit: 'bpm',
    kind: 'avg',
    digits: 0,
    upIsGood: true,
    ext: true,
    iosOnly: true,
    what: traduire("De combien de battements ton cœur ralentit dans la minute qui suit la fin d'une séance."),
    norm: {
      text: traduire("Une baisse de 12 battements ou moins en une minute après l'effort est associée à un risque cardiaque plus élevé."),
      source: traduire('Cole et al., New England Journal of Medicine, 1999'),
    },
    devices: 'Apple Watch',
  },
  {
    key: 'tension',
    label: traduire('Tension artérielle'),
    family: 'coeur',
    unit: traduire('mmHg'),
    kind: 'latest',
    digits: 0,
    upIsGood: false,
    store: 'blood_pressure_systolic',
    ext: true,
    what: traduire('La pression du sang dans tes artères : le chiffre haut quand le cœur se contracte, le bas entre deux battements.'),
    norm: {
      text: traduire('Une tension normale reste sous 120 pour le chiffre haut et sous 80 pour le chiffre bas.'),
      source: 'American Heart Association',
    },
    devices: traduire('Tensiomètres Withings et Omron, Samsung'),
  },
  // ============ SOMMEIL ============
  {
    key: 'sommeil',
    label: traduire('Sommeil'),
    family: 'sommeil',
    unit: 'min',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    store: 'sleep',
    what: traduire('Le temps dormi chaque nuit, avec les phases profond, paradoxal et léger quand ta montre les mesure.'),
    norm: {
      text: traduire('Entre 18 et 64 ans, il est recommandé de dormir 7 à 9 heures par nuit.'),
      source: 'National Sleep Foundation, 2015',
    },
    devices: 'Apple Watch, Garmin, Fitbit, Samsung, Oura, WHOOP, Polar, Withings',
    more: { label: traduire('Mon sommeil en détail'), href: '/sleep' },
  },
  // ============ RÉCUPÉRATION ============
  {
    key: 'vfc',
    label: traduire('Variabilité cardiaque'),
    family: 'recuperation',
    unit: 'ms',
    kind: 'avg',
    digits: 0,
    upIsGood: true,
    store: 'hrv',
    what: traduire("L'écart entre deux battements change sans cesse. Quand ces écarts varient beaucoup, ton corps est reposé."),
    howToRead: traduire("Pas de bonne valeur pour tout le monde : elle dépend de l'âge et de chacun. Compare tes valeurs entre elles. Une baisse nette sur plusieurs jours signale fatigue, stress ou maladie qui arrive."),
    devices: 'Apple Watch, Oura (Android), Google Fitbit (Android)',
  },
  {
    key: 'temperature-poignet',
    label: traduire('Température au poignet'),
    family: 'recuperation',
    unit: '°C',
    kind: 'avg',
    digits: 2,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire('La température de ta peau au poignet pendant la nuit.'),
    howToRead: traduire("Regarde l'écart à ta moyenne plutôt que le chiffre : une hausse de plusieurs dixièmes sur plusieurs nuits accompagne souvent une infection, un manque de récupération ou le cycle menstruel."),
    devices: traduire('Apple Watch Series 8, Ultra et plus récentes'),
  },
  {
    key: 'temperature',
    label: traduire('Température'),
    family: 'recuperation',
    unit: '°C',
    kind: 'avg',
    digits: 1,
    upIsGood: null,
    store: 'body_temp',
    what: traduire('La température de ton corps enregistrée dans Santé ou Health Connect.'),
    howToRead: traduire("Elle varie dans la journée et selon l'endroit de la mesure. Une hausse inhabituelle sur plusieurs jours peut annoncer une infection."),
    devices: traduire('Thermomètres connectés, Google Fitbit (Android)'),
  },
  {
    key: 'electrodermale',
    label: traduire('Activité électrodermale'),
    family: 'recuperation',
    unit: 'µS',
    kind: 'avg',
    digits: 2,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire("La conductance de ta peau, qui monte avec la transpiration et l'émotion."),
    howToRead: traduire('Peu d’appareils la mesurent. Elle varie beaucoup selon le moment : regarde la tendance.'),
    devices: traduire('Capteurs compatibles Apple Santé'),
  },
  {
    key: 'pleine-conscience',
    label: traduire('Pleine conscience'),
    family: 'recuperation',
    unit: 'min',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    store: 'mindful_minutes',
    ext: true,
    iosOnly: true,
    what: traduire('Les minutes de respiration guidée ou de méditation.'),
    devices: 'Apple Watch, Oura, Calm, Headspace',
  },
  // ============ RESPIRATION ============
  {
    key: 'oxygene',
    label: traduire('Oxygène dans le sang'),
    family: 'souffle',
    unit: '%',
    kind: 'avg',
    digits: 0,
    upIsGood: true,
    store: 'spo2',
    what: traduire("La part d'oxygène transportée par ton sang, mesurée par la lumière au poignet."),
    norm: {
      text: traduire('Une valeur normale se situe en général entre 95 et 100 %.'),
      source: 'Mayo Clinic',
    },
    devices: 'Apple Watch, WHOOP, Samsung, Polar (Android)',
  },
  {
    key: 'respiration',
    label: traduire('Fréquence respiratoire'),
    family: 'souffle',
    unit: 'resp/min',
    kind: 'avg',
    digits: 1,
    upIsGood: null,
    store: 'respiratory_rate',
    what: traduire('Le nombre de respirations par minute, mesuré pendant ton sommeil.'),
    norm: {
      text: traduire("Chez l'adulte au repos, la fréquence respiratoire se situe en général entre 12 et 20 respirations par minute."),
      source: 'Cleveland Clinic',
    },
    devices: 'Apple Watch, WHOOP, Oura, Google Fitbit (Android)',
  },
  {
    key: 'perturbations-respiratoires',
    label: traduire('Perturbations respiratoires'),
    family: 'souffle',
    unit: '/h',
    kind: 'avg',
    digits: 1,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('Les petites interruptions de ta respiration pendant la nuit, par heure de sommeil.'),
    howToRead: traduire("L'Apple Watch te prévient quand elles restent élevées plusieurs nuits. Seul un médecin peut parler d'apnée du sommeil."),
    devices: traduire('Apple Watch Series 9, Ultra 2 et plus récentes'),
  },
  {
    key: 'vo2max',
    label: traduire('VO2 max'),
    family: 'souffle',
    unit: 'ml/kg/min',
    kind: 'latest',
    digits: 1,
    upIsGood: true,
    store: 'vo2max',
    what: traduire("La quantité maximale d'oxygène que ton corps sait utiliser à l'effort. C'est la mesure de ton cardio."),
    howToRead: traduire("La bonne valeur dépend de ton âge et de ton sexe. Le plus utile est de la voir monter au fil des semaines d'entraînement."),
    devices: traduire('Apple Watch (marche et course dehors), Polar, Samsung, Google Fitbit (Android)'),
  },
  // ============ CORPS ============
  {
    key: 'poids',
    label: 'Poids',
    family: 'corps',
    unit: 'kg',
    kind: 'latest',
    digits: 1,
    upIsGood: null,
    what: traduire('Tes pesées, saisies dans YOROI ou envoyées par ta balance connectée.'),
    devices: 'Withings, Xiaomi, Renpho, Eufy, Omron',
    more: { label: traduire('Toutes tes pesées'), href: '/pesees' },
  },
  {
    key: 'masse-grasse',
    label: 'Masse grasse',
    family: 'corps',
    unit: '%',
    kind: 'latest',
    digits: 1,
    upIsGood: false,
    store: 'body_fat',
    ext: true,
    what: traduire('La part de graisse dans ton poids, estimée par ta balance.'),
    howToRead: traduire("Une balance donne une estimation. Suis la tendance plutôt que le chiffre d'un jour."),
    devices: 'Withings, Renpho, Eufy, Xiaomi, Garmin Index',
  },
  {
    key: 'masse-maigre',
    label: traduire('Masse maigre'),
    family: 'corps',
    unit: 'kg',
    kind: 'latest',
    digits: 1,
    upIsGood: true,
    store: 'lean_mass',
    ext: true,
    what: traduire("Tout ce qui n'est pas de la graisse : muscles, os, eau."),
    devices: 'Withings, Renpho, Eufy',
  },
  {
    key: 'masse-osseuse',
    label: 'Masse osseuse',
    family: 'corps',
    unit: 'kg',
    kind: 'latest',
    digits: 1,
    upIsGood: null,
    ext: true,
    androidOnly: true,
    what: traduire('Le poids de ton squelette, estimé par une balance à impédance.'),
    howToRead: traduire('Elle bouge très peu. Une estimation de balance, pas une mesure médicale.'),
    devices: traduire('Balances connectées sur Health Connect'),
  },
  {
    key: 'eau-corporelle',
    label: traduire('Eau corporelle'),
    family: 'corps',
    unit: 'kg',
    kind: 'latest',
    digits: 1,
    upIsGood: null,
    ext: true,
    androidOnly: true,
    what: traduire("La quantité d'eau dans ton corps, estimée par ta balance."),
    howToRead: traduire("Elle varie avec ce que tu bois et transpires. Monte sur la balance à la même heure pour comparer."),
    devices: traduire('Balances connectées sur Health Connect'),
  },
  {
    key: 'tour-de-taille',
    label: 'Tour de taille',
    family: 'corps',
    unit: 'cm',
    kind: 'latest',
    digits: 1,
    upIsGood: false,
    ext: true,
    iosOnly: true,
    what: traduire('Le tour de ta taille, au niveau du nombril.'),
    norm: {
      text: traduire('Le risque cardiovasculaire augmente quand il dépasse 94 cm chez l’homme et 80 cm chez la femme.'),
      source: traduire('Organisation mondiale de la santé, 2008'),
    },
    devices: traduire('Saisie dans Santé, rubans connectés'),
  },
  {
    key: 'imc',
    label: traduire('IMC'),
    family: 'corps',
    unit: '',
    kind: 'latest',
    digits: 1,
    upIsGood: null,
    ext: true,
    iosOnly: true,
    what: traduire('Ton poids divisé par ta taille au carré.'),
    norm: {
      text: traduire("Chez l'adulte, un IMC entre 18,5 et 24,9 correspond à un poids normal. Chez un sportif musclé, il surestime souvent la graisse."),
      source: traduire('Organisation mondiale de la santé'),
    },
    devices: traduire('Balances connectées, Santé'),
  },
  {
    key: 'glycemie',
    label: traduire('Glycémie'),
    family: 'corps',
    unit: 'mmol/L',
    kind: 'latest',
    digits: 1,
    upIsGood: null,
    store: 'blood_glucose',
    what: traduire('Le sucre dans ton sang, enregistré par un lecteur ou un capteur.'),
    norm: {
      text: traduire('À jeun, une glycémie sous 5,6 mmol/L (1 g/L) est considérée normale.'),
      source: 'American Diabetes Association',
    },
    devices: traduire('Lecteurs et capteurs de glycémie, Samsung, Google Fitbit (Android)'),
  },
  // ============ NUTRITION ============
  {
    key: 'eau',
    label: traduire('Eau bue'),
    family: 'nutrition',
    unit: 'ml',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    what: traduire("L'eau que tu as notée dans une app de nutrition ou d'hydratation."),
    norm: {
      text: traduire("Apport total recommandé, boissons et aliments compris : 2 litres par jour pour une femme, 2,5 litres pour un homme. Plus si tu transpires."),
      source: traduire('Autorité européenne de sécurité des aliments (EFSA), 2010'),
    },
    devices: traduire('Apps de nutrition, Google Fitbit (Android)'),
  },
  {
    key: 'calories-mangees',
    label: traduire('Calories mangées'),
    family: 'nutrition',
    unit: 'kcal',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    ext: true,
    what: traduire('Ce que tu as mangé, noté dans une app de nutrition.'),
    howToRead: traduire('Compare ces valeurs à tes calories actives et au repos pour voir si tu es en déficit ou en surplus.'),
    devices: 'MyFitnessPal, Yazio, Samsung, Google Fitbit',
  },
  {
    key: 'proteines',
    label: traduire('Protéines'),
    family: 'nutrition',
    unit: 'g',
    kind: 'sum',
    digits: 0,
    upIsGood: true,
    ext: true,
    what: traduire('Les protéines mangées dans la journée, notées dans une app de nutrition.'),
    norm: {
      text: traduire("Pour un sportif qui s'entraîne dur : 1,4 à 2 g de protéines par kilo de poids et par jour."),
      source: 'International Society of Sports Nutrition, 2017',
    },
    devices: 'MyFitnessPal, Yazio, Samsung, Google Fitbit',
  },
  {
    key: 'glucides',
    label: traduire('Glucides'),
    family: 'nutrition',
    unit: 'g',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    ext: true,
    what: traduire('Les glucides mangés dans la journée : le carburant de tes séances intenses.'),
    devices: 'MyFitnessPal, Yazio, Samsung, Google Fitbit',
  },
  {
    key: 'lipides',
    label: traduire('Lipides'),
    family: 'nutrition',
    unit: 'g',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    ext: true,
    what: traduire('Les graisses mangées dans la journée.'),
    devices: 'MyFitnessPal, Yazio, Samsung, Google Fitbit',
  },
  {
    key: 'cafeine',
    label: traduire('Caféine'),
    family: 'nutrition',
    unit: 'mg',
    kind: 'sum',
    digits: 0,
    upIsGood: null,
    ext: true,
    what: traduire('La caféine notée dans une app de nutrition : café, thé, boissons énergisantes.'),
    norm: {
      text: traduire("Jusqu'à 400 mg par jour ne pose pas de problème de sécurité chez l'adulte en bonne santé."),
      source: traduire('Autorité européenne de sécurité des aliments (EFSA), 2015'),
    },
    devices: traduire('Apps de nutrition'),
  },
  ...MORE_METRICS,
];

export const METRIC: Record<MetricKey, MetricDef> = METRICS.reduce((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {} as Record<MetricKey, MetricDef>);

export function isMetricKey(k: string | undefined | null): k is MetricKey {
  return !!k && k in METRIC;
}

export function metricColor(m: MetricDef): string {
  return FAMILY[m.family].color;
}

/** La mesure existe sur cette plateforme */
export function availableOn(m: MetricDef, android: boolean): boolean {
  if (android && m.iosOnly) return false;
  if (!android && m.androidOnly) return false;
  return true;
}

/** Sections du tableau de bord : familles regroupées, graphique vedette par ordre de préférence */
export type SectionKey = 'activite' | 'mobilite' | 'coeur' | 'sommeil' | 'recuperation' | 'souffle' | 'corps' | 'environnement' | 'nutrition';
export const SECTIONS: { key: SectionKey; families: Family[]; featured: MetricKey[] }[] = [
  { key: 'activite', families: ['activite', 'energie'], featured: ['pas', 'energie-active', 'distance'] },
  { key: 'mobilite', families: ['mobilite'], featured: ['vitesse-marche', 'longueur-pas', 'stabilite-marche'] },
  { key: 'coeur', families: ['coeur'], featured: ['fc-repos', 'frequence-cardiaque', 'tension'] },
  { key: 'sommeil', families: ['sommeil'], featured: ['sommeil'] },
  { key: 'recuperation', families: ['recuperation'], featured: ['vfc', 'temperature-poignet', 'temperature'] },
  { key: 'souffle', families: ['souffle'], featured: ['respiration', 'oxygene', 'vo2max'] },
  { key: 'corps', families: ['corps'], featured: ['poids', 'masse-grasse'] },
  { key: 'environnement', families: ['environnement'], featured: ['son-casque', 'son-ambiant', 'uv'] },
  { key: 'nutrition', families: ['nutrition'], featured: ['calories-mangees', 'eau', 'proteines'] },
];
