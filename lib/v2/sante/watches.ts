/**
 * Ce que chaque marque envoie vraiment à Apple Santé (iPhone) et à Health Connect (Android),
 * donc ce que YOROI peut lire. Recherche du 9 octobre 2026 sur les pages d'aide officielles
 * (détail et liens : document projet claude/2026-10-09-sante-connectee-yoroi.md).
 * Rien n'est deviné : quand une marque ne publie pas sa liste, list vaut 'unknown'.
 */
import type { MetricKey } from './metrics';

export type WatchPath = {
  /** le partage existe sur cette plateforme */
  ok: boolean;
  /** app à ouvrir */
  app: string;
  steps: string[];
  /** mesures de YOROI que la marque écrit */
  keys: MetricKey[];
  /** éléments hors mesures (séances, tracés) */
  extra?: string[];
  /** mesures que la marque mesure mais n'écrit pas ici */
  missing?: MetricKey[];
  /** complete : liste officielle ; partial : liste officielle incomplète ; unknown : pas de liste publiée */
  list: 'complete' | 'partial' | 'unknown';
  note?: string;
};

export type Watch = {
  key: string;
  name: string;
  /** lettres de la pastille */
  mark: string;
  color: string;
  kind: string;
  /** clés de source normalisées (lib/healthConnect SOURCE_NAME_MAP) */
  sources: string[];
  /** scores maison qui restent dans l'app de la marque */
  keeps: string[];
  ios: WatchPath;
  android: WatchPath;
  /** d'où vient l'info, en clair */
  from: string;
};

const NONE = (app: string, note: string): WatchPath => ({ ok: false, app, steps: [], keys: [], list: 'unknown', note });

export const WATCHES: Watch[] = [
  {
    key: 'apple_watch',
    name: 'Apple Watch',
    mark: 'AW',
    color: '#1D2029',
    kind: 'Montre',
    sources: ['apple_watch', 'iphone'],
    keeps: [],
    ios: {
      ok: true,
      app: 'Santé',
      steps: ['Porte ta montre : elle remplit Apple Santé toute seule.', 'Dans YOROI, touche Connecter Apple Santé.', 'Sur la fenêtre d’Apple, touche Tout activer, puis Autoriser.'],
      keys: [
        'pas', 'distance', 'etages', 'exercice', 'debout', 'energie-active', 'energie-repos',
        'frequence-cardiaque', 'fc-repos', 'fc-marche', 'recuperation-cardiaque', 'vfc', 'vo2max', 'oxygene',
        'respiration', 'perturbations-respiratoires', 'sommeil', 'temperature-poignet', 'lumiere-du-jour',
        'pleine-conscience', 'effort', 'distance-velo', 'distance-nage', 'puissance-course', 'vitesse',
        // Ajouts du 10 octobre 2026 : types écrits par la montre et l'iPhone eux-mêmes
        'temps-mouvement', 'foulee', 'oscillation', 'contact-sol', 'mouvements-nage', 'profondeur', 'temperature-eau',
        'distance-ski', 'poussees-fauteuil', 'distance-fauteuil', 'effort-seance', 'effort-estime',
        'vitesse-marche', 'longueur-pas', 'asymetrie-marche', 'double-appui', 'stabilite-marche', 'vitesse-montee',
        'vitesse-descente', 'marche-6-min', 'chutes', 'alerte-stabilite',
        'fc-haute', 'fc-basse', 'rythme-irregulier', 'ecg', 'fibrillation', 'cardio-faible', 'apnees', 'humeur',
        'son-casque', 'son-ambiant', 'alerte-son-casque', 'alerte-son-ambiant',
      ],
      extra: ['Séances et tracés GPS', 'Phases de sommeil'],
      list: 'complete',
    },
    android: NONE('', 'L’Apple Watch ne fonctionne qu’avec un iPhone.'),
    from: 'Apple, types HealthKit',
  },
  {
    key: 'whoop',
    name: 'WHOOP',
    mark: 'WH',
    color: '#1A1A1A',
    kind: 'Bracelet',
    sources: ['whoop'],
    keeps: ['Récupération', 'Effort (strain)', 'Performance de sommeil'],
    ios: {
      ok: true,
      app: 'WHOOP',
      steps: ['Ouvre l’app WHOOP.', 'Va dans Profil, puis Apps et appareils.', 'Choisis Apple Santé et active toutes les catégories.', 'Laisse WHOOP ouvert quelques minutes, puis tire vers le bas dans YOROI.'],
      keys: ['frequence-cardiaque', 'fc-repos', 'sommeil', 'respiration', 'oxygene', 'energie-active', 'pas'],
      extra: ['Séances détectées'],
      missing: ['vfc'],
      list: 'complete',
      note: 'Pas de variabilité cardiaque : WHOOP la calcule en rMSSD alors qu’Apple Santé attend une autre méthode. Les pas ne passent que si tu les actives.',
    },
    android: {
      ok: true,
      app: 'WHOOP',
      steps: ['Ouvre l’app WHOOP.', 'Va dans Profil, puis Apps et appareils.', 'Choisis Health Connect et autorise toutes les données.', 'Laisse WHOOP ouvert quelques minutes, puis tire vers le bas dans YOROI.'],
      keys: [],
      list: 'unknown',
      note: 'WHOOP annonce un échange dans les deux sens mais ne publie pas la liste de ce qu’il écrit. YOROI affiche tout ce qui arrive.',
    },
    from: 'Aide WHOOP (avril 2026), DC Rainmaker',
  },
  {
    key: 'fitbit',
    name: 'Fitbit, Pixel Watch, Fitbit Air',
    mark: 'F',
    color: '#00A3AD',
    kind: 'Montre ou bracelet',
    sources: ['fitbit'],
    keeps: ['Score de préparation', 'Score de sommeil'],
    ios: {
      ok: true,
      app: 'Google Health',
      steps: ['Mets à jour l’app Google Health (l’ancienne app Fitbit), version 5.05 ou plus récente.', 'Touche Connexions, puis Apps et services.', 'Ajoute Apple Santé et autorise les catégories.', 'Reviens dans YOROI et tire vers le bas.'],
      keys: ['pas', 'distance', 'frequence-cardiaque', 'sommeil'],
      extra: ['Séances', 'D’autres mesures selon la version'],
      missing: ['vfc'],
      list: 'partial',
      note: 'Nouveau depuis août 2026 : avant, Fitbit n’écrivait rien dans Apple Santé. La variabilité ne passe pas encore selon les premiers retours.',
    },
    android: {
      ok: true,
      app: 'Google Health',
      steps: ['Ouvre l’app Google Health (l’ancienne app Fitbit).', 'Touche Connexions, puis Apps partenaires.', 'Touche Synchroniser tes apps santé, puis Configurer.', 'Choisis les données, puis autorise l’historique et l’arrière-plan.'],
      keys: ['pas', 'vitesse', 'cadence-pas', 'vo2max', 'etages', 'distance', 'denivele', 'temperature', 'sommeil', 'glycemie', 'frequence-cardiaque', 'vfc', 'respiration', 'fc-repos', 'poids', 'masse-grasse', 'eau', 'calories-mangees', 'proteines', 'glucides', 'lipides'],
      extra: ['Séances et tracés GPS', 'Calories totales', 'Température de la peau'],
      missing: ['oxygene'],
      list: 'complete',
      note: 'L’oxygène reste dans Google Health : il n’est pas écrit dans Health Connect. La température de la peau arrive dans Health Connect mais YOROI ne sait pas encore la lire.',
    },
    from: 'Aide Google Health, MacRumors (août 2026)',
  },
  {
    key: 'garmin',
    name: 'Garmin',
    mark: 'G',
    color: '#007CC3',
    kind: 'Montre',
    sources: ['garmin'],
    keeps: ['Body Battery', 'Stress', 'Training Readiness', 'Statut de variabilité', 'Score de sommeil', 'Charge d’entraînement', 'Minutes d’intensité'],
    ios: {
      ok: true,
      app: 'Garmin Connect',
      steps: ['Ouvre Garmin Connect.', 'Va dans Paramètres, puis Applications connectées, puis Apple Santé.', 'Active toutes les catégories.', 'Garde Garmin Connect ouvert pendant la synchro : Garmin n’écrit dans Santé que quand l’app est à l’écran.'],
      keys: ['frequence-cardiaque', 'sommeil', 'energie-active', 'pas'],
      extra: ['Séances'],
      missing: ['fc-repos', 'vfc', 'respiration', 'oxygene'],
      list: 'complete',
      note: 'Sur iPhone, Garmin partage peu. Sur Android, il en envoie plus.',
    },
    android: {
      ok: true,
      app: 'Garmin Connect',
      steps: ['Mets à jour Garmin Connect (Android 14 ou plus récent).', 'Ouvre Paramètres, puis Health Connect.', 'Autorise les données à partager.', 'Synchronise ta montre, puis tire vers le bas dans YOROI.'],
      keys: ['energie-active', 'cadence-velo', 'distance', 'denivele', 'frequence-cardiaque', 'vitesse', 'pas', 'masse-grasse', 'etages', 'sommeil', 'poids'],
      extra: ['Séances', 'Calories totales', 'Mouvements de nage'],
      missing: ['vfc', 'fc-repos', 'oxygene', 'respiration'],
      list: 'complete',
    },
    from: 'Garmin via Tom’s Guide (juillet 2025), Sensai (août 2026)',
  },
  {
    key: 'oura',
    name: 'Oura',
    mark: 'O',
    color: '#A8832F',
    kind: 'Bague',
    sources: ['oura'],
    keeps: ['Readiness', 'Score de sommeil', 'Score d’activité', 'Écart de température'],
    ios: {
      ok: true,
      app: 'Oura',
      steps: ['Ouvre l’app Oura.', 'Menu en haut à gauche, puis Réglages, puis Apple Santé.', 'Active Connecter à Santé et Enregistrer les minutes de pleine conscience.', 'Dans Santé, Profil, Apps, Oura : active aussi Pas.'],
      keys: ['energie-active', 'frequence-cardiaque', 'pleine-conscience', 'respiration', 'sommeil', 'pas', 'poids'],
      extra: ['Phases de sommeil', 'Séances et tracés', 'Taille'],
      missing: ['fc-repos', 'vfc', 'oxygene', 'temperature'],
      list: 'complete',
      note: 'Bague Gen2, ou Gen3 et suivantes avec abonnement actif.',
    },
    android: {
      ok: true,
      app: 'Oura',
      steps: ['Ouvre l’app Oura.', 'Menu en haut à gauche, puis Réglages.', 'Sous Partage des données, choisis Health Connect.', 'Active les données à partager.'],
      keys: ['energie-active', 'distance', 'pas', 'poids', 'sommeil', 'frequence-cardiaque', 'vfc'],
      extra: ['Séances', 'Taille'],
      missing: ['oxygene', 'temperature'],
      list: 'complete',
      note: 'Sur Android, Oura envoie aussi la variabilité cardiaque.',
    },
    from: 'Aide Oura (juillet 2026)',
  },
  {
    key: 'samsung',
    name: 'Samsung Galaxy Watch',
    mark: 'S',
    color: '#1428A0',
    kind: 'Montre',
    sources: ['samsung'],
    keeps: ['Score d’énergie', 'Stress', 'Indice antioxydant', 'Composition corporelle détaillée'],
    ios: NONE('', 'Les Galaxy Watch récentes ne s’associent qu’à un téléphone Android, et Samsung Health n’existe pas sur iPhone.'),
    android: {
      ok: true,
      app: 'Samsung Health',
      steps: ['Mets à jour Samsung Health.', 'Ouvre Samsung Health, Réglages, Health Connect.', 'Touche Commencer, puis autorise la lecture et l’écriture.', 'Active Réglages, Synchro avec Samsung Cloud.'],
      keys: ['pas', 'glycemie', 'oxygene', 'tension', 'distance', 'frequence-cardiaque', 'puissance', 'vitesse', 'vo2max', 'calories-mangees', 'proteines', 'glucides', 'lipides', 'sommeil', 'poids', 'masse-grasse', 'energie-repos'],
      extra: ['Séances', 'Calories de séance', 'Phases de sommeil', 'Taille'],
      list: 'complete',
      note: 'La fréquence cardiaque continue de la montre arrive avec du retard, pour économiser la batterie. Les scores maison ne figurent pas dans la liste de Samsung.',
    },
    from: 'Samsung Developers',
  },
  {
    key: 'polar',
    name: 'Polar',
    mark: 'P',
    color: '#D10027',
    kind: 'Montre',
    sources: ['polar'],
    keeps: ['Nightly Recharge', 'Charge cardio'],
    ios: {
      ok: true,
      app: 'Polar Flow',
      steps: ['Ouvre Polar Flow.', 'Touche Plus, puis Réglages généraux.', 'Active Apple Santé et choisis les catégories.', 'Touche Autoriser.'],
      keys: ['energie-active', 'energie-repos', 'sommeil', 'pas', 'poids', 'frequence-cardiaque'],
      extra: ['Séances avec distance'],
      missing: ['vfc', 'fc-repos'],
      list: 'complete',
      note: 'La fréquence cardiaque part seulement pendant les séances, pas en continu.',
    },
    android: {
      ok: true,
      app: 'Polar Flow',
      steps: ['Ouvre Polar Flow.', 'Va dans Réglages généraux et active Health Connect.', 'Choisis les données et touche Autoriser.'],
      keys: ['energie-active', 'distance', 'frequence-cardiaque', 'oxygene', 'fc-repos', 'poids', 'vo2max', 'sommeil', 'vitesse', 'pas'],
      extra: ['Séances et tracés', 'Calories totales', 'Phases de sommeil', 'Taille'],
      list: 'complete',
    },
    from: 'Aide Polar',
  },
  {
    key: 'coros',
    name: 'COROS',
    mark: 'C',
    color: '#3D5D9E',
    kind: 'Montre',
    sources: ['coros'],
    keeps: [],
    ios: {
      ok: true,
      app: 'COROS',
      steps: ['Ouvre l’app COROS.', 'Profil, Réglages, Apps tierces, Synchro des données.', 'Choisis Apple Santé et les types de données.'],
      keys: ['distance-velo', 'frequence-cardiaque', 'sommeil', 'pas', 'distance-nage', 'distance'],
      list: 'complete',
    },
    android: {
      ok: true,
      app: 'COROS',
      steps: ['Ouvre l’app COROS.', 'Profil, Réglages, Apps tierces, Synchro des données.', 'Choisis Health Connect et les types de données.'],
      keys: [],
      list: 'unknown',
      note: 'COROS propose Health Connect mais ne publie pas la liste. YOROI affiche tout ce qui arrive.',
    },
    from: 'Aide COROS, HeiaHeia',
  },
  {
    key: 'withings',
    name: 'Withings',
    mark: 'W',
    color: '#00A7A0',
    kind: 'Balance ou montre',
    sources: ['withings'],
    keeps: [],
    ios: {
      ok: true,
      app: 'Withings',
      steps: ['Ouvre l’app Withings.', 'Va dans Profil, puis Réglages, puis Apple Santé.', 'Choisis les données et touche Autoriser.', 'Monte sur ta balance ou synchronise ta montre.'],
      keys: ['poids', 'pas', 'sommeil', 'frequence-cardiaque'],
      list: 'partial',
      note: 'Withings ne publie pas de liste complète. Masse grasse, eau, os et tension passent selon le modèle et la version.',
    },
    android: {
      ok: true,
      app: 'Withings',
      steps: ['Ouvre l’app Withings.', 'Va dans Profil, puis Réglages, puis Health Connect.', 'Choisis les données et autorise.', 'Monte sur ta balance ou synchronise ta montre.'],
      keys: ['poids', 'pas', 'sommeil', 'frequence-cardiaque'],
      list: 'partial',
      note: 'Withings ne publie pas de liste complète. Masse grasse, eau, os et tension passent selon le modèle et la version.',
    },
    from: 'Aide Withings, Fitmesh',
  },
  {
    key: 'xiaomi',
    name: 'Xiaomi',
    mark: 'X',
    color: '#FF6900',
    kind: 'Bracelet, montre ou balance',
    sources: ['xiaomi'],
    keeps: [],
    ios: {
      ok: true,
      app: 'Mi Fitness',
      steps: ['Ouvre Mi Fitness.', 'Profil, Données tierces, Santé.', 'Choisis les données à partager.', 'Dans Santé : Profil, Confidentialité, Apps, Mi Fitness, active les types.'],
      keys: ['pas', 'sommeil', 'poids'],
      list: 'partial',
      note: 'Xiaomi ne publie pas de liste complète.',
    },
    android: NONE('Mi Fitness', 'Xiaomi ne documente pas de partage vers Health Connect.'),
    from: 'Aide Xiaomi',
  },
  {
    key: 'amazfit',
    name: 'Amazfit',
    mark: 'A',
    color: '#4A4E5A',
    kind: 'Montre',
    sources: ['amazfit'],
    keeps: [],
    ios: {
      ok: true,
      app: 'Zepp',
      steps: ['Ouvre l’app Zepp.', 'Dans Profil, cherche les comptes liés, puis Santé.', 'Autorise les données.'],
      keys: [],
      list: 'unknown',
      note: 'Zepp propose Apple Santé mais ne publie pas la liste. YOROI affiche tout ce qui arrive.',
    },
    android: {
      ok: true,
      app: 'Zepp',
      steps: ['Ouvre l’app Zepp.', 'Dans Profil, cherche les comptes liés, puis Health Connect.', 'Autorise les données.'],
      keys: ['frequence-cardiaque', 'energie-active', 'sommeil'],
      extra: ['26 types au total selon Zepp'],
      list: 'partial',
      note: 'Zepp écrit dans Health Connect mais ne lit rien.',
    },
    from: 'Gadgets and Wearables (janvier 2025)',
  },
  {
    key: 'huawei',
    name: 'Huawei',
    mark: 'H',
    color: '#C7000B',
    kind: 'Montre',
    sources: ['huawei'],
    keeps: [],
    ios: {
      ok: true,
      app: 'Huawei Santé',
      steps: ['Ouvre Huawei Santé.', 'Moi, Réglages, Partage de données, Santé.', 'Active les catégories.'],
      keys: [],
      list: 'unknown',
      note: 'Huawei propose le partage vers Santé mais ne publie pas la liste. YOROI affiche tout ce qui arrive.',
    },
    android: NONE('Huawei Santé', 'Huawei Santé ne partage pas avec Health Connect : aucun chemin officiel.'),
    from: 'Fitmesh (vérifié en septembre 2026)',
  },
];

export const WATCH: Record<string, Watch> = WATCHES.reduce((acc, w) => {
  acc[w.key] = w;
  return acc;
}, {} as Record<string, Watch>);

/** Marque d'une source normalisée (garmin, whoop...) */
export function watchForSource(source: string | null | undefined): Watch | null {
  if (!source) return null;
  const s = source.toLowerCase();
  return WATCHES.find((w) => w.sources.includes(s)) ?? null;
}

export function pathFor(w: Watch, android: boolean): WatchPath {
  return android ? w.android : w.ios;
}

/** Marques qui envoient une mesure sur la plateforme */
export function watchesFor(key: MetricKey, android: boolean): Watch[] {
  return WATCHES.filter((w) => {
    const p = pathFor(w, android);
    return p.ok && p.keys.includes(key);
  });
}
