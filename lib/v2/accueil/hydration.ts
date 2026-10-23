/**
 * Hydratation partagee entre l'accueil et l'ecran Hydratation.
 * Reprend exactement les cles et synchronisations de l'ancien ecran
 * (accueil, montre, badges, widgets, Sante).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '@/lib/security/logger';
import secureStorage from '@/lib/security/secureStorage';
import { ecrireDeltaEauSante, type EauVersSante } from '@/lib/v2/sante/eauSante';
import { devNow } from '@/lib/v2/creator/devClock';
import { DECIMAL } from '@/lib/i18n/tr';

const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL_KEY = '@yoroi_hydration_goal';
const HYDRATION_HISTORY_KEY = '@yoroi_hydration_history';

export const HYDRATION_AMOUNT_EVENT = 'HYDRATION_AMOUNT_CHANGED';
export const HYDRATION_GOAL_EVENT = 'HYDRATION_GOAL_CHANGED';
/** un verre = 250 ml */
export const GLASS_L = 0.25;

export type HydrationDay = { date: string; amount: number; goal: number };
export type HydrationState = { amount: number; goal: number; history: HydrationDay[] };

/** Jour local ; par defaut l'horloge du Studio (l'heure reelle hors mode createur) */
export function localISO(d: Date = devNow()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format du journal '@yoroi_hydration_log' de la 2.4.2 : une ligne par prise, en ml ; le total du jour est la somme */
export type HydrationLogEntry = { id: string; date: string; amount: number; timestamp: string; [k: string]: unknown };

/** Lignes ecrites par l'Accueil et l'ecran Hydratation de la 3.0 (les seules qu'on ajuste a la baisse) */
const OWN_PREFIX = /^hydration_(screen|home)_/;

/**
 * Met le journal au total du jour (ml) sans compter deux fois.
 * Avant, le total remplacait la premiere prise du jour : les autres prises s'ajoutaient en plus.
 * - total plus haut que la somme du jour : une prise est ajoutee pour la difference ;
 * - total plus bas : on retire la difference sur les lignes ecrites par la 3.0, les plus recentes d'abord
 *   (les prises notees ailleurs ne sont jamais touchees) ;
 * - meme total : rien ne change (la meme liste est rendue).
 */
export function applyDayTotalToLog(entries: HydrationLogEntry[], dateISO: string, totalMl: number, now: Date): HydrationLogEntry[] {
  const target = Math.max(0, Math.round(totalMl));
  const sum = entries.reduce((acc, e) => acc + (e && e.date === dateISO ? Number(e.amount) || 0 : 0), 0);
  const delta = target - sum;
  if (delta === 0) return entries;
  if (delta > 0) {
    return [...entries, { id: `hydration_home_${now.getTime()}`, date: dateISO, amount: delta, timestamp: now.toISOString() }];
  }
  let toRemove = -delta;
  const out = entries.map((e) => ({ ...e }));
  for (let i = out.length - 1; i >= 0 && toRemove > 0; i--) {
    const e = out[i];
    if (!e || e.date !== dateISO || typeof e.id !== 'string' || !OWN_PREFIX.test(e.id)) continue;
    const a = Number(e.amount) || 0;
    const take = Math.min(a, toRemove);
    e.amount = a - take;
    toRemove -= take;
  }
  return out.filter((e) => !(e && e.date === dateISO && typeof e.id === 'string' && OWN_PREFIX.test(e.id) && (Number(e.amount) || 0) <= 0));
}

/** Litres bus aujourd'hui, objectif en litres et historique (30 jours) */
export async function loadHydration(): Promise<HydrationState> {
  const todayISO = localISO();
  let amount = 0;
  let goal = 2.5;
  let history: HydrationDay[] = [];
  try {
    const [amountStr, homeKeyStr, goalStr, historyStr] = await Promise.all([
      AsyncStorage.getItem(HYDRATION_KEY),
      AsyncStorage.getItem(`${HYDRATION_KEY}_${todayISO}`),
      AsyncStorage.getItem(HYDRATION_GOAL_KEY),
      AsyncStorage.getItem(HYDRATION_HISTORY_KEY),
    ]);
    let fromScreen = 0;
    if (amountStr) {
      try {
        const data = JSON.parse(amountStr);
        if (data?.date === new Date().toDateString()) fromScreen = Number(data.amount) || 0;
      } catch {
        // donnee illisible, ignoree
      }
    }
    let fromHome = 0;
    if (homeKeyStr) {
      const ml = parseInt(homeKeyStr, 10);
      if (!isNaN(ml) && ml > 0) fromHome = ml / 1000;
    }
    amount = Math.max(fromScreen, fromHome);
    if (goalStr) {
      let g = parseFloat(goalStr);
      if (g >= 20) g = g / 1000;
      if (Number.isFinite(g) && g > 0) goal = g;
    }
    if (historyStr) {
      try {
        const h = JSON.parse(historyStr);
        if (Array.isArray(h)) history = h;
      } catch {
        // historique illisible, ignore
      }
    }
  } catch (err) {
    logger.error('Lecture de l’hydratation impossible', err);
  }
  return { amount, goal, history };
}

let fileEau: Promise<unknown> = Promise.resolve();

/**
 * Enregistre le total du jour (en litres) partout ou l'app le lit.
 * watchSync : synchronisation montre optionnelle (fournie par l'ecran qui a acces au contexte montre).
 * sante : Apple Sante recoit seulement la difference avec le total d'avant (avant, le total entier etait
 * reecrit a chaque verre) ; { id, date } pour une action de la montre ou d'un widget (id garde en
 * HKMetadataKeyExternalUUID) ; false si la montre l'a deja ecrit (dansSante).
 * Les enregistrements passent un par un : deux appuis rapproches ne lisent pas le meme total d'avant.
 */
export function saveHydrationAmount(
  amount: number,
  goal: number,
  watchSync?: (ml: number) => Promise<void>,
  sante: EauVersSante = {},
): Promise<HydrationDay[]> {
  const run = () => enregistrerEau(amount, goal, watchSync, sante);
  const p = fileEau.then(run, run);
  fileEau = p.catch(() => undefined);
  return p;
}

async function enregistrerEau(
  amount: number,
  goal: number,
  watchSync: ((ml: number) => Promise<void>) | undefined,
  sante: EauVersSante,
): Promise<HydrationDay[]> {
  const todayISO = localISO();
  const amountMl = Math.round(amount * 1000);
  const avantMl = Math.round((await loadHydration()).amount * 1000);
  let newHistory: HydrationDay[] = [];
  try {
    await AsyncStorage.setItem(HYDRATION_KEY, JSON.stringify({ date: new Date().toDateString(), amount }));
    await AsyncStorage.setItem(`${HYDRATION_KEY}_${todayISO}`, amountMl.toString());
    await AsyncStorage.setItem('@yoroi_daily_hydration', JSON.stringify({ date: todayISO, amount }));
    await AsyncStorage.setItem('waterIntake', amountMl.toString());
    try {
      await secureStorage.setItem('@yoroi_water_intake', amountMl.toString());
    } catch {
      // non bloquant
    }
    try {
      const logData = await AsyncStorage.getItem('@yoroi_hydration_log');
      const parsed = logData ? JSON.parse(logData) : [];
      const logEntries: HydrationLogEntry[] = Array.isArray(parsed) ? parsed : [];
      const next = applyDayTotalToLog(logEntries, todayISO, amountMl, new Date());
      if (next !== logEntries) await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify(next));
    } catch {
      // non bloquant
    }
    const histStr = await AsyncStorage.getItem(HYDRATION_HISTORY_KEY);
    let history: HydrationDay[] = [];
    try {
      const h = histStr ? JSON.parse(histStr) : [];
      if (Array.isArray(h)) history = h;
    } catch {
      history = [];
    }
    newHistory = [{ date: todayISO, amount, goal }, ...history.filter((d) => d.date !== todayISO)].slice(0, 30);
    await AsyncStorage.setItem(HYDRATION_HISTORY_KEY, JSON.stringify(newHistory));

    if (watchSync) watchSync(amountMl).catch(() => {});
    const deltaMl = amountMl - avantMl;
    if (sante !== false && deltaMl !== 0) {
      try {
        await ecrireDeltaEauSante(deltaMl, sante);
      } catch {
        // non bloquant
      }
    }

    DeviceEventEmitter.emit(HYDRATION_AMOUNT_EVENT, { amountMl });
    DeviceEventEmitter.emit('YOROI_DATA_CHANGED');

    try {
      const { updateWidgetWater } = await import('@/lib/widgetData');
      await updateWidgetWater(Math.round(amount / GLASS_L), Math.round(goal / GLASS_L));
    } catch {
      // non bloquant
    }
  } catch (err) {
    logger.error('Enregistrement de l’hydratation impossible', err);
  }
  return newHistory;
}

export async function saveHydrationGoal(goal: number): Promise<boolean> {
  if (!Number.isFinite(goal) || goal < 0.5 || goal > 10) return false;
  try {
    await AsyncStorage.setItem(HYDRATION_GOAL_KEY, goal.toString());
    DeviceEventEmitter.emit(HYDRATION_GOAL_EVENT, { goalLiters: goal });
    return true;
  } catch (err) {
    logger.error('Enregistrement de l’objectif d’hydratation impossible', err);
    return false;
  }
}

export function formatLiters(l: number): string {
  const v = Math.round(l * 100) / 100;
  return String(v).replace('.', DECIMAL);
}
