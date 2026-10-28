/**
 * Formules de l'espace Nutrition et Soins (refonte v2).
 * Calculs purs, sans interface, repris a l'identique des anciens ecrans
 * (memes coefficients, memes sources), avec quelques garde-fous de securite.
 */

import { traduire, DECIMAL } from '@/lib/i18n/tr';
import { selonGenre, type GenreFormule } from '@/lib/genreCalcul';
/** 28 octobre 2026 : 'neutral', la moyenne des formules homme et femme (lib/genreCalcul.ts) */
export type Gender = GenreFormule;

// ============================================
// SOURCES
// ============================================

export type Source = { label: string; ref: string; url?: string };

export const SOURCES = {
  imc: { label: traduire('Indice de masse corporelle'), ref: 'Organisation mondiale de la santé, classification de l’IMC chez l’adulte' },
  deurenberg: { label: traduire('Formule de Deurenberg (1991)'), ref: 'British Journal of Nutrition' },
  mifflin: { label: traduire('Formule Mifflin St Jeor (1990)'), ref: 'American Journal of Clinical Nutrition', url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/' },
  lorentz: { label: traduire('Formule de Lorentz (1929)'), ref: 'Formule historique, donnée à titre indicatif' },
  devine: { label: traduire('Formule de Devine (1974)'), ref: 'Formule pharmacologique, donnée à titre indicatif' },
  epley: { label: traduire('Formule d’Epley (1985)'), ref: 'Estimation de la charge maximale à partir des répétitions' },
  protein: { label: traduire('Position officielle de l’ISSN sur les protéines (2017)'), ref: 'Journal of the International Society of Sports Nutrition', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8' },
  carbs: { label: traduire('Burke et al. (2011)'), ref: 'Journal of Sports Sciences', url: 'https://www.tandfonline.com/doi/abs/10.1080/02640414.2011.585473' },
  hydration: { label: traduire('Sawka et al. (2007), position de l’ACSM'), ref: 'Adapter ses apports à sa transpiration, éviter de perdre plus de 2 % de son poids pendant l’effort. Article en anglais', url: 'https://pubmed.ncbi.nlm.nih.gov/17277604/' },
  timing: { label: traduire('Kerksick et al. (2017)'), ref: 'Position officielle de l’ISSN sur le moment des repas', url: 'https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0189-4' },
} satisfies Record<string, Source>;

// ============================================
// OUTILS
// ============================================

export const num = (s: string): number => {
  const v = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
};

export const round1 = (v: number) => Math.round(v * 10) / 10;

export function ageFromBirth(birth?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a > 0 && a < 120 ? a : null;
}

export const fmt = (v: number, d = 1) => v.toFixed(d).replace('.', DECIMAL);

// ============================================
// CALCULATEURS
// ============================================

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type CalcGoal = 'lose' | 'maintain' | 'gain';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; value: number; desc: string }> = {
  sedentary: { label: traduire('Sédentaire'), value: 1.2, desc: traduire('Peu ou pas d’exercice') },
  light: { label: traduire('Légèrement actif'), value: 1.375, desc: traduire('1 à 3 jours par semaine') },
  moderate: { label: traduire('Modérément actif'), value: 1.55, desc: traduire('3 à 5 jours par semaine') },
  active: { label: traduire('Très actif'), value: 1.725, desc: traduire('6 à 7 jours par semaine') },
  very_active: { label: traduire('Extrêmement actif'), value: 1.9, desc: traduire('Athlète, travail physique') },
};

export const MACROS_BY_GOAL: Record<CalcGoal, { protein: number; carbs: number; fat: number; label: string; note: string; delta: number }> = {
  lose: { protein: 40, carbs: 30, fat: 30, label: traduire('Perte de poids'), note: traduire('Déficit de 500 kcal, soit environ 0,5 kg par semaine'), delta: -500 },
  maintain: { protein: 30, carbs: 40, fat: 30, label: traduire('Maintien'), note: traduire('Équilibre pour garder ton poids actuel'), delta: 0 },
  gain: { protein: 35, carbs: 45, fat: 20, label: traduire('Prise de muscle'), note: traduire('Surplus de 300 kcal pour une prise de masse sèche'), delta: 300 },
};

export function imc(weight: number, heightCm: number): number {
  const h = heightCm / 100;
  return h > 0 ? weight / (h * h) : 0;
}

export type Level = { label: string; tone: 'indigo' | 'moss' | 'gold' | 'red' };

export function imcCategory(v: number): Level {
  if (v < 18.5) return { label: traduire('Insuffisance pondérale'), tone: 'indigo' };
  if (v < 25) return { label: traduire('Corpulence normale'), tone: 'moss' };
  if (v < 30) return { label: 'Surpoids', tone: 'gold' };
  return { label: 'Obésité', tone: 'red' };
}

/** IMG Deurenberg : 1,20 x IMC + 0,23 x age - 10,8 x sexe - 5,4 (sexe = 1 homme, 0 femme) */
export function img(weight: number, heightCm: number, age: number, gender: Gender): number {
  const i = imc(weight, heightCm);
  return 1.2 * i + 0.23 * age - selonGenre(gender, 10.8, 0) - 5.4;
}

export function imgCategory(v: number, gender: Gender): Level {
  // neutre : seuils moyens (14, 22,5, 28,5)
  if (gender === 'neutral') {
    if (v < 14) return { label: traduire('Très maigre'), tone: 'indigo' };
    if (v < 22.5) return { label: traduire('Athlète'), tone: 'moss' };
    if (v < 28.5) return { label: 'Normal', tone: 'moss' };
    return { label: 'Élevé', tone: 'gold' };
  }
  if (gender === 'male') {
    if (v < 10) return { label: traduire('Très maigre'), tone: 'indigo' };
    if (v < 20) return { label: traduire('Athlète'), tone: 'moss' };
    if (v < 25) return { label: 'Normal', tone: 'moss' };
    return { label: 'Élevé', tone: 'gold' };
  }
  if (v < 18) return { label: traduire('Très maigre'), tone: 'indigo' };
  if (v < 25) return { label: traduire('Athlète'), tone: 'moss' };
  if (v < 32) return { label: 'Normal', tone: 'moss' };
  return { label: 'Élevé', tone: 'gold' };
}

export const IMG_RANGES: Record<Gender, { range: string; label: string }[]> = {
  male: [
    { range: traduire('moins de 10 %'), label: traduire('Très maigre') },
    { range: traduire('10 à 20 %'), label: traduire('Athlète') },
    { range: traduire('20 à 25 %'), label: 'Normal' },
    { range: traduire('plus de 25 %'), label: 'Élevé' },
  ],
  female: [
    { range: traduire('moins de 18 %'), label: traduire('Très maigre') },
    { range: traduire('18 à 25 %'), label: traduire('Athlète') },
    { range: traduire('25 à 32 %'), label: 'Normal' },
    { range: traduire('plus de 32 %'), label: 'Élevé' },
  ],
  neutral: [
    { range: traduire('moins de 14 %'), label: traduire('Très maigre') },
    { range: traduire('14 à 22,5 %'), label: traduire('Athlète') },
    { range: traduire('22,5 à 28,5 %'), label: 'Normal' },
    { range: traduire('plus de 28,5 %'), label: 'Élevé' },
  ],
};

/** Mifflin-St Jeor : 10 x P + 6,25 x T - 5 x A + 5 (homme) ou - 161 (femme) */
export function bmr(weight: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weight + 6.25 * heightCm - 5 * age;
  return base + selonGenre(gender, 5, -161);
}

export function tdee(b: number, level: ActivityLevel): number {
  return b * ACTIVITY_MULTIPLIERS[level].value;
}

export function idealWeight(heightCm: number, gender: Gender) {
  const inches = heightCm / 2.54;
  const lorentz = selonGenre(gender, heightCm - 100 - (heightCm - 150) / 4, heightCm - 100 - (heightCm - 150) / 2.5);
  const devine = selonGenre(gender, 50 + 2.3 * (inches - 60), 45.5 + 2.3 * (inches - 60));
  const h = heightCm / 100;
  return {
    lorentz: round1(lorentz),
    devine: round1(devine),
    min: round1(18.5 * h * h),
    max: round1(24.9 * h * h),
  };
}

export function macrosFor(tdeeValue: number, goal: CalcGoal) {
  const m = MACROS_BY_GOAL[goal];
  const cal = tdeeValue + m.delta;
  return {
    calories: Math.round(cal),
    protein: Math.round((cal * m.protein) / 100 / 4),
    carbs: Math.round((cal * m.carbs) / 100 / 4),
    fat: Math.round((cal * m.fat) / 100 / 9),
    percentages: m,
  };
}

/** Eau : poids x 0,033 L, plus 0,5 L par heure d'exercice. Repere simple et courant, pas une recommandation de l'ACSM (Sawka 2007 conseille d'adapter a la transpiration). */
export function water(weight: number, exerciseHours: number) {
  const base = weight * 0.033;
  return { base: round1(base), withExercise: round1(base + exerciseHours * 0.5) };
}

export type ExerciseType = 'squat' | 'bench' | 'deadlift' | 'overhead' | 'row' | 'custom';

export const EXERCISES: Record<ExerciseType, { name: string; standards: { beginner: number; intermediate: number; advanced: number; elite: number } }> = {
  squat: { name: 'Squat', standards: { beginner: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.5 } },
  bench: { name: traduire('Développé couché'), standards: { beginner: 0.5, intermediate: 0.85, advanced: 1.25, elite: 1.75 } },
  deadlift: { name: traduire('Soulevé de terre'), standards: { beginner: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.75 } },
  overhead: { name: 'Développé militaire', standards: { beginner: 0.35, intermediate: 0.55, advanced: 0.8, elite: 1.1 } },
  row: { name: 'Rowing barre', standards: { beginner: 0.4, intermediate: 0.65, advanced: 0.95, elite: 1.3 } },
  custom: { name: 'Autre exercice', standards: { beginner: 0.5, intermediate: 1.0, advanced: 1.5, elite: 2.0 } },
};

/** Epley : 1RM = charge x (1 + reps / 30) */
export function oneRM(load: number, reps: number): number {
  if (reps <= 1) return load;
  return Math.round(load * (1 + reps / 30));
}

export function repRanges(max: number) {
  return [
    { reps: 1, weight: max, percent: 100, label: traduire('1 répétition max') },
    { reps: 3, weight: Math.round(max * 0.93), percent: 93, label: traduire('3 répétitions') },
    { reps: 5, weight: Math.round(max * 0.87), percent: 87, label: traduire('5 répétitions') },
    { reps: 8, weight: Math.round(max * 0.8), percent: 80, label: traduire('8 répétitions') },
    { reps: 10, weight: Math.round(max * 0.75), percent: 75, label: traduire('10 répétitions') },
    { reps: 12, weight: Math.round(max * 0.7), percent: 70, label: traduire('12 répétitions') },
    { reps: 15, weight: Math.round(max * 0.65), percent: 65, label: traduire('15 répétitions') },
  ];
}

export function strengthLevel(max: number, bodyweight: number, ex: ExerciseType): { label: string; tone: Level['tone'] | 'muted'; ratio: number } {
  const ratio = bodyweight > 0 ? max / bodyweight : 0;
  const s = EXERCISES[ex].standards;
  if (ratio >= s.elite) return { label: traduire('Élite'), tone: 'gold', ratio };
  if (ratio >= s.advanced) return { label: 'Avancé', tone: 'moss', ratio };
  if (ratio >= s.intermediate) return { label: 'Intermédiaire', tone: 'indigo', ratio };
  return { label: 'Débutant', tone: 'muted', ratio };
}

// ============================================
// NUTRITION RAPIDE
// ============================================

export type QuickActivity = 'low' | 'moderate' | 'high' | 'intense';

export const QUICK_ACTIVITY: Record<QuickActivity, { label: string; carbs: [number, number]; mult: number; phrase: string }> = {
  low: { label: traduire('Faible'), carbs: [3, 5], mult: 1.2, phrase: traduire('activité légère') },
  moderate: { label: traduire('Modérée'), carbs: [5, 7], mult: 1.55, phrase: traduire('activité modérée') },
  high: { label: traduire('Élevée'), carbs: [6, 10], mult: 1.725, phrase: traduire('activité élevée') },
  intense: { label: traduire('Intense'), carbs: [8, 12], mult: 1.9, phrase: traduire('activité intense') },
};

export function quickNeeds(weight: number, heightCm: number, act: QuickActivity, age = 30) {
  const w = weight > 0 ? weight : 75;
  const h = heightCm > 0 ? heightCm : 175;
  const r = QUICK_ACTIVITY[act];
  // Mifflin-St Jeor, version homme, age estime si inconnu (comme l'ancien ecran)
  const b = 10 * w + 6.25 * h - 5 * age + 5;
  return {
    protein: { min: Math.round(w * 1.6), max: Math.round(w * 2.2) },
    carbs: { min: Math.round(w * r.carbs[0]), max: Math.round(w * r.carbs[1]), perKg: traduire("{0} à {1}", r.carbs[0], r.carbs[1]) },
    water: { min: round1((w * 30) / 1000), max: round1((w * 35) / 1000) },
    bmr: Math.round(b),
    tdee: Math.round(b * r.mult),
  };
}

// ============================================
// COUPE DE POIDS
// ============================================

export type CutRisk = 'safe' | 'moderate' | 'risky' | 'dangerous';

export const SAFE_WEEKLY_CUT = 1; // kg par semaine au maximum en perte de graisse
export const WATER_CUT_MAX = 0.08; // 8 % du poids au maximum en perte d'eau
export const DANGEROUS_CUT = 0.1; // au dela de 10 % : dangereux

export type CutPhase = { name: string; days: number; targetWeight: number; method: string; tips: string[] };
export type HydrationDay = { daysOut: number; waterLiters: number; sodium: string; notes: string };

export type CutPlan = {
  totalToCut: number;
  percentToCut: number;
  daysAvailable: number;
  dailyCut: number;
  waterCutPossible: number;
  fatCutPossible: number;
  riskLevel: CutRisk;
  phases: CutPhase[];
  hydrationProtocol: HydrationDay[];
};

export function simulateCut(current: number, target: number, days: number): CutPlan | null {
  if (!current || !target || !days || target >= current || days <= 0) return null;
  const totalToCut = current - target;
  const percentToCut = (totalToCut / current) * 100;
  let riskLevel: CutRisk = 'safe';
  if (percentToCut > DANGEROUS_CUT * 100) riskLevel = 'dangerous';
  else if (percentToCut > WATER_CUT_MAX * 100) riskLevel = 'risky';
  else if (percentToCut > 5) riskLevel = 'moderate';

  const waterCutPossible = Math.min(current * WATER_CUT_MAX, totalToCut);
  const fatCutNeeded = totalToCut - waterCutPossible;
  const daysForFat = Math.ceil((fatCutNeeded / SAFE_WEEKLY_CUT) * 7);
  const phases: CutPhase[] = [];

  if (fatCutNeeded > 0.5 && days > 7) {
    const fatDays = Math.min(daysForFat, days - 5);
    const actualFatCut = Math.min(fatCutNeeded, (fatDays / 7) * SAFE_WEEKLY_CUT);
    phases.push({
      name: 'Déficit calorique',
      days: fatDays,
      targetWeight: current - actualFatCut,
      method: traduire('Déficit de 500 à 750 kcal par jour'),
      tips: [traduire('Garde tes protéines autour de 2 g par kg'), traduire('Baisse les glucides progressivement'), traduire('Continue ton entraînement normal')],
    });
  }
  if (days >= 5) {
    phases.push({
      name: 'Charge en eau',
      days: 4,
      targetWeight: current - (fatCutNeeded > 0 ? fatCutNeeded * 0.7 : 0),
      method: 'Hyperhydratation puis restriction',
      tips: [traduire('Entre 5 et 3 jours avant : beaucoup d’eau, sous contrôle'), traduire('Sel normal les premiers jours'), traduire('Baisse le sel progressivement')],
    });
  }
  phases.push({
    name: 'Dernière coupe d’eau',
    days: Math.min(2, days),
    targetWeight: target,
    method: traduire('Restriction hydrique et sudation'),
    tips: [traduire('Sauna ou bain chaud, jamais seul'), traduire('Vêtements de sudation'), traduire('Pas plus de 2 h de sauna par séance'), traduire('Surveille les signes de déshydratation')],
  });

  const hydrationProtocol: HydrationDay[] = [
    { daysOut: 7, waterLiters: 6, sodium: 'Normal', notes: 'Début de la charge en eau' },
    { daysOut: 6, waterLiters: 7, sodium: 'Normal', notes: 'Augmente l’eau' },
    { daysOut: 5, waterLiters: 8, sodium: 'Normal', notes: 'Pic d’hydratation' },
    { daysOut: 4, waterLiters: 6, sodium: 'Réduit', notes: 'Début de la baisse du sel' },
    { daysOut: 3, waterLiters: 4, sodium: 'Très faible', notes: 'Baisse de l’eau' },
    { daysOut: 2, waterLiters: 2, sodium: 'Zéro', notes: 'Eau au minimum' },
    { daysOut: 1, waterLiters: 0.5, sodium: 'Zéro', notes: 'Dernière coupe, sauna' },
    { daysOut: 0, waterLiters: 0, sodium: 'Zéro', notes: 'Pesée puis réhydratation' },
  ].filter((d) => d.daysOut <= days);

  return { totalToCut, percentToCut, daysAvailable: days, dailyCut: totalToCut / days, waterCutPossible, fatCutPossible: totalToCut - waterCutPossible, riskLevel, phases, hydrationProtocol };
}

export const RISK_LABEL: Record<CutRisk, string> = {
  safe: 'Coupe raisonnable',
  moderate: traduire('Coupe modérée'),
  risky: traduire('Coupe risquée'),
  dangerous: 'Coupe dangereuse',
};

/** Rehydratation apres la pesee : 1,5 L par kg perdu, un rappel toutes les 20 minutes */
export function rehydration(deltaKg: number, hours: number) {
  if (!deltaKg || !hours || deltaKg <= 0 || hours <= 0) return null;
  const totalMl = deltaKg * 1500;
  const slots = Math.floor((hours * 60) / 20);
  if (slots <= 0) return null;
  const mlPerSlot = Math.round(totalMl / slots);
  const steps = Array.from({ length: slots }).map((_, i) => {
    const min = i * 20;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return { minuteOffset: min, label: h > 0 ? `+${h} h${m > 0 ? ` ${m.toString().padStart(2, '0')}` : ''}` : `+${m} min`, ml: mlPerSlot };
  });
  return { totalMl, slots, mlPerSlot, steps, totalHours: hours };
}

/** Rythme quotidien d'un cut long : au dela de 0,5 kg par jour, danger */
export function cutDailyRisk(daily: number): 'safe' | 'moderate' | 'danger' {
  if (daily <= 0.3) return 'safe';
  if (daily <= 0.5) return 'moderate';
  return 'danger';
}

export const WEIGHT_CATEGORIES: Record<'mma' | 'jjb' | 'boxe', { name: string; maxKg: number | null }[]> = {
  mma: [
    { name: 'Paille', maxKg: 52.2 },
    { name: 'Mouche', maxKg: 56.7 },
    { name: 'Coq', maxKg: 61.2 },
    { name: 'Plume', maxKg: 65.8 },
    { name: 'Léger', maxKg: 70.3 },
    { name: 'Mi-moyen', maxKg: 77.1 },
    { name: 'Moyen', maxKg: 83.9 },
    { name: 'Mi-lourd', maxKg: 93 },
    { name: 'Lourd', maxKg: 120.2 },
  ],
  jjb: [
    { name: 'Galo', maxKg: 57.5 },
    { name: 'Pluma', maxKg: 64 },
    { name: 'Pena', maxKg: 70 },
    { name: 'Leve', maxKg: 76 },
    { name: 'Medio', maxKg: 82.3 },
    { name: 'Meio-Pesado', maxKg: 88.3 },
    { name: 'Pesado', maxKg: 94.3 },
    { name: 'Super-Pesado', maxKg: 100.5 },
    { name: 'Ultra-Pesado', maxKg: null },
  ],
  boxe: [
    { name: 'Mouche', maxKg: 50.8 },
    { name: 'Coq', maxKg: 53.5 },
    { name: 'Plume', maxKg: 57.2 },
    { name: 'Léger', maxKg: 61.2 },
    { name: 'Super-léger', maxKg: 63.5 },
    { name: 'Welter', maxKg: 66.7 },
    { name: 'Moyen', maxKg: 72.6 },
    { name: 'Lourd-léger', maxKg: 79.4 },
    { name: 'Lourd', maxKg: 90.7 },
  ],
};

// ============================================
// BLESSURES
// ============================================

/** Couleur de la douleur dans la palette v2 */
export function painColor(v: number): string {
  if (v === 0) return '#4F6B28';
  if (v <= 3) return '#6E8C3A';
  if (v <= 6) return '#A8832F';
  return '#B0282E';
}

export function painWord(v: number): string {
  if (v === 0) return traduire('Aucune douleur');
  if (v <= 2) return traduire('Douleur légère');
  if (v <= 4) return traduire('Douleur modérée');
  if (v <= 6) return traduire('Douleur nette');
  if (v <= 8) return traduire('Douleur forte');
  return traduire('Douleur intense');
}

export function suggestedRecoveryDays(eva: number): number {
  if (eva <= 3) return 7;
  if (eva <= 6) return 14;
  return 21;
}

export type ReturnWeek = { week: number; label: string; restrictions: string[] };
export type ReturnFamily = 'upper' | 'lower' | 'back';

const UPPER = ['shoulder', 'arm', 'elbow', 'forearm', 'wrist', 'hand', 'thumb', 'finger', 'scapula', 'epaule', 'bras', 'coude', 'poignet', 'main', 'doigt', 'pouce', 'omoplate'];
const LOWER = ['knee', 'thigh', 'shin', 'ankle', 'foot', 'toe', 'heel', 'calf', 'hamstring', 'glute', 'hip', 'pubis', 'genou', 'jambe', 'cheville', 'hanche', 'cuisse', 'mollet', 'pied', 'talon', 'tibia', 'ischio', 'fessier'];

/** Famille de protocole selon la zone (identifiants anglais et noms francais) */
export function returnFamily(zoneId: string, zoneName = ''): ReturnFamily {
  const z = `${zoneId} ${zoneName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (UPPER.some((k) => z.includes(k))) return 'upper';
  if (LOWER.some((k) => z.includes(k))) return 'lower';
  return 'back';
}

export const RETURN_PLANS: Record<ReturnFamily, ReturnWeek[]> = {
  upper: [
    { week: 1, label: traduire('Repos et mobilité douce'), restrictions: [traduire('Aucun effort avec les bras'), traduire('Technique des jambes uniquement'), traduire('Mouvements doux, amplitude réduite')] },
    { week: 2, label: traduire('Technique sans résistance'), restrictions: [traduire('Technique légère des bras'), traduire('Pas de grip ni de saisies'), traduire('Exercices de proprioception')] },
    { week: 3, label: traduire('Drilling léger'), restrictions: [traduire('Drilling technique, pas de sparring'), traduire('Résistance minimale du partenaire'), traduire('Stop si douleur')] },
    { week: 4, label: traduire('Roulage léger avec partenaires de confiance'), restrictions: [traduire('Rolling léger uniquement'), traduire('Partenaires de confiance'), 'Communication ouverte'] },
    { week: 5, label: traduire('Sparring progressif'), restrictions: [traduire('Du sparring technique vers plus intense'), traduire('Écoute ton corps'), traduire('Bilan avant toute compétition')] },
  ],
  lower: [
    { week: 1, label: traduire('Repos et glace'), restrictions: [traduire('Aucun appui si douleur'), traduire('Membre surélevé'), traduire('Mobilité passive uniquement')] },
    { week: 2, label: traduire('Marche et mobilité'), restrictions: [traduire('Marche sans douleur'), traduire('Renforcement des quadriceps assis'), traduire('Vélo d’appartement si toléré')] },
    { week: 3, label: traduire('Technique debout légère'), restrictions: [traduire('Travail debout sans projections'), traduire('Pas de genou au sol'), traduire('Renforcement de la chaîne arrière')] },
    { week: 4, label: traduire('Travail au sol progressif'), restrictions: [traduire('Drilling au sol sans pression sur la zone'), 'Rolling en position haute uniquement'] },
    { week: 5, label: traduire('Retour complet progressif'), restrictions: [traduire('Rolling léger puis normal'), traduire('Bande de soutien si besoin'), traduire('Bilan médical recommandé')] },
  ],
  back: [
    { week: 1, label: traduire('Repos relatif'), restrictions: [traduire('Pas de charge sur la colonne'), traduire('Étirements doux'), traduire('Chaleur ; médicaments seulement sur avis médical')] },
    { week: 2, label: traduire('Mobilité douce'), restrictions: [traduire('Étirements progressifs'), traduire('Gainage très doux'), traduire('Pas de projections')] },
    { week: 3, label: traduire('Renforcement progressif'), restrictions: ['Gainage statique', traduire('Technique debout sans chute'), traduire('Mobilité de la colonne')] },
    { week: 4, label: traduire('Technique légère'), restrictions: [traduire('Drilling debout et au sol, léger'), 'Rolling en position haute', traduire('Stop si douleur')] },
    { week: 5, label: traduire('Sparring progressif'), restrictions: [traduire('Rolling léger'), traduire('Communication avec ton partenaire'), traduire('Avis médical avant de monter en intensité')] },
  ],
};

/** Signes qui doivent faire consulter sans attendre (repères de premiers secours) */
export const RED_FLAGS = [
  traduire('Déformation visible, os ou articulation qui semble déplacé'),
  traduire('Impossible de poser le pied ou de bouger le membre'),
  traduire('Fourmillements, perte de force ou de sensibilité'),
  traduire('Gonflement important et rapide'),
  traduire('Choc à la tête avec maux de tête, vomissements ou confusion'),
];

// ============================================
// JEUNE
// ============================================

/** Reperes approximatifs pendant le jeune, variables selon chacun */
export const FAST_MARKERS: { hour: number; label: string; text: string }[] = [
  { hour: 0, label: traduire('Digestion'), text: traduire('Ton corps utilise le dernier repas.') },
  { hour: 4, label: traduire('Réserves'), text: traduire('Il puise dans ses réserves de sucre.') },
  { hour: 12, label: traduire('Bascule'), text: traduire('La part des graisses utilisées augmente.') },
  { hour: 18, label: traduire('Jeûne long'), text: traduire('Reste attentif aux signaux de ton corps.') },
];

export function hhmmValid(s: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const h = +m[1];
  const mi = +m[2];
  return h >= 0 && h < 24 && mi >= 0 && mi < 60;
}

export function durationBetween(start: string, end: string): string {
  if (!hhmmValid(start) || !hhmmValid(end)) return traduire('non calculable');
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let d = eh * 60 + em - (sh * 60 + sm);
  if (d < 0) d += 24 * 60;
  const h = Math.floor(d / 60);
  const mi = d % 60;
  return `${h} h${mi > 0 ? ` ${mi.toString().padStart(2, '0')}` : ''}`;
}
