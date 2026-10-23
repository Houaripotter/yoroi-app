/**
 * Guides par marque pour les écrans Appareils et Connexion santé.
 * Depuis le 9 octobre 2026, tout est tiré du catalogue vérifié lib/v2/sante/watches.ts
 * (pages d'aide officielles) : une seule source de vérité.
 * Aucune connexion directe n'existe : chaque marque écrit dans Apple Santé ou Health Connect, YOROI y lit.
 */
import { METRIC } from '@/lib/v2/sante/metrics';
import type { MetricKey } from '@/lib/v2/sante/metrics';
import { WATCHES } from '@/lib/v2/sante/watches';
import type { Watch } from '@/lib/v2/sante/watches';
import { traduire } from '@/lib/i18n/tr';

export interface BrandConfig {
  key: string;
  name: string;
  color: string;
  emoji: string;
  types: string[];
  introIOS?: string;
  introAndroid?: string;
  stepsIOS: string[];
  stepsAndroid: string[];
}

function intro(w: Watch, android: boolean): string {
  const p = android ? w.android : w.ios;
  const provider = android ? 'Health Connect' : 'Apple Santé';
  if (!p.ok) return p.note ?? traduire("{0} ne partage pas avec {1}.", w.name, provider);
  const base = traduire("{0} écrit ses mesures dans {1} depuis l’app {2}, et YOROI les lit là.", w.name.split(',')[0], provider, p.app);
  return p.note ? `${base} ${p.note}` : base;
}

function types(w: Watch): string[] {
  const keys = new Set<MetricKey>([...w.ios.keys, ...w.android.keys]);
  const labels = Array.from(keys).map((k) => METRIC[k]?.label).filter(Boolean) as string[];
  return labels.length ? labels.slice(0, 8) : [traduire('Selon la marque')];
}

function toConfig(w: Watch): BrandConfig {
  return {
    key: w.key,
    name: w.name,
    color: w.color,
    emoji: w.mark,
    types: types(w),
    introIOS: intro(w, false),
    introAndroid: intro(w, true),
    stepsIOS: w.ios.ok ? w.ios.steps : [],
    stepsAndroid: w.android.ok ? w.android.steps : [],
  };
}

const SCALES: BrandConfig = {
  key: 'scales',
  name: 'Balances connectées',
  color: '#6E5A8C',
  emoji: 'B',
  types: ['Poids', 'Masse grasse', traduire('Masse maigre')],
  introIOS: traduire('Ta balance écrit dans Apple Santé depuis son app (Renpho, Eufy, Omron, Xiaomi), et YOROI les lit là.'),
  introAndroid: traduire('Ta balance écrit dans Health Connect depuis son app (Renpho, Eufy, Omron), et YOROI les lit là.'),
  stepsIOS: [traduire('Ouvre l’app de ta balance.'), traduire('Cherche Santé ou Apple Santé dans ses réglages.'), traduire('Active le partage du poids et de la composition corporelle.'), traduire('Monte sur ta balance, puis tire vers le bas dans YOROI.')],
  stepsAndroid: [traduire('Ouvre l’app de ta balance.'), traduire('Cherche Health Connect dans ses réglages.'), traduire('Autorise le poids et la composition corporelle.'), traduire('Monte sur ta balance, puis tire vers le bas dans YOROI.')],
};

const OTHERS: BrandConfig = {
  key: 'others',
  name: 'Suunto et autres marques',
  color: '#454A58',
  emoji: '+',
  types: [traduire('Selon la marque')],
  introIOS: traduire('Toute montre, bague ou balance qui partage vers Apple Santé est compatible avec YOROI.'),
  introAndroid: traduire('Toute montre, bague ou balance qui partage vers Health Connect est compatible avec YOROI.'),
  stepsIOS: [traduire('Ouvre l’app officielle de ton appareil.'), traduire('Cherche Apple Santé dans ses réglages.'), traduire('Active le partage des données.'), traduire('Relie YOROI à Apple Santé.')],
  stepsAndroid: [traduire('Ouvre l’app officielle de ton appareil.'), traduire('Cherche Health Connect dans ses réglages.'), traduire('Active le partage des données.'), traduire('Relie YOROI à Health Connect.')],
};

const byKey = (k: string) => toConfig(WATCHES.find((w) => w.key === k)!);

/** Marques historiques des écrans (Withings, Garmin, Polar, WHOOP, Fitbit) et balances */
export const BRAND_CONFIGS: BrandConfig[] = [byKey('withings'), byKey('garmin'), byKey('polar'), byKey('whoop'), byKey('fitbit'), SCALES];

/** Apple Watch en premier, puis les autres marques vérifiées, puis « autres » en dernier */
export const EXTRA_BRANDS: BrandConfig[] = [
  byKey('apple_watch'),
  byKey('samsung'),
  byKey('huawei'),
  { ...byKey('fitbit'), key: 'pixel', name: 'Pixel Watch et Fitbit Air', emoji: 'Px' },
  byKey('oura'),
  byKey('coros'),
  byKey('xiaomi'),
  byKey('amazfit'),
  OTHERS,
];

export const SOURCE_DISPLAY: Record<string, { name: string; color: string; emoji: string }> = {
  ...WATCHES.reduce((acc, w) => {
    w.sources.forEach((s) => {
      acc[s] = { name: s === 'iphone' ? 'iPhone' : w.name.split(',')[0], color: s === 'iphone' ? '#666666' : w.color, emoji: s === 'iphone' ? 'iP' : w.mark };
    });
    return acc;
  }, {} as Record<string, { name: string; color: string; emoji: string }>),
  renpho: { name: 'Renpho', color: '#2563EB', emoji: 'R' },
  eufy: { name: 'Eufy', color: '#1D4ED8', emoji: 'E' },
  omron: { name: 'Omron', color: '#003DA5', emoji: 'O' },
  suunto: { name: 'Suunto', color: '#000000', emoji: 'Su' },
  wahoo: { name: 'Wahoo', color: '#1D2029', emoji: 'Wa' },
  strava: { name: 'Strava', color: '#FC4C02', emoji: 'St' },
  apple_health: { name: 'Apple Santé', color: '#2C4A84', emoji: 'AS' },
  health_connect: { name: 'Health Connect', color: '#2C4A84', emoji: 'HC' },
  manual: { name: 'Saisie manuelle', color: '#9CA3AF', emoji: 'M' },
};

export const DATA_TYPE_LABELS: Record<string, string> = {
  steps: traduire('Pas'),
  calories_active: traduire('Calories'),
  calories_basal: traduire('Calories repos'),
  heart_rate: traduire('Cœur'),
  heart_rate_resting: traduire('Cœur au repos'),
  hrv: traduire('Variabilité'),
  sleep: traduire('Sommeil'),
  distance: 'Distance',
  vo2max: traduire('VO2 max'),
  spo2: traduire('Oxygène'),
  body_fat: 'Masse grasse',
  lean_mass: traduire('Masse maigre'),
  weight: 'Poids',
  respiratory_rate: traduire('Respiration'),
  body_temp: traduire('Température'),
  blood_pressure_systolic: 'Tension',
  blood_glucose: traduire('Glycémie'),
  floors_climbed: traduire('Étages'),
  mindful_minutes: traduire('Pleine conscience'),
};

/** Type de la table health_data correspondant à une mesure, pour le tableau de compatibilité */
const STORE_OF: Partial<Record<MetricKey, string>> = {
  poids: 'weight',
  'masse-grasse': 'body_fat',
  'frequence-cardiaque': 'heart_rate',
  vfc: 'hrv',
  sommeil: 'sleep',
  pas: 'steps',
  'energie-active': 'calories_active',
  vo2max: 'vo2max',
  'fc-repos': 'heart_rate_resting',
  oxygene: 'spo2',
  distance: 'distance',
  'masse-maigre': 'lean_mass',
};

/** Ce que chaque marque envoie (iPhone et Android réunis, listes officielles seulement) */
export const DATA_MATRIX: Record<string, string[]> = WATCHES.reduce((acc, w) => {
  const set = new Set<string>();
  [...w.ios.keys, ...w.android.keys].forEach((k) => {
    const s = STORE_OF[k];
    if (s) set.add(s);
  });
  acc[w.key] = Array.from(set);
  return acc;
}, {} as Record<string, string[]>);
