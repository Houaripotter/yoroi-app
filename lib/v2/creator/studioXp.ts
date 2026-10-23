/**
 * XP du Studio : donner, retirer ou fixer l'XP, UNIQUEMENT quand un profil demo est charge.
 * Le registre (yoroi_xp_ledger_v1) fait partie des cles de la demo : il est mis de cote avant
 * la demo et restitue par restoreRealData. Les vraies XP ne sont donc jamais touchees.
 *
 * Le registre ne garde que des lignes positives. Pour retirer : les lignes du Studio partent
 * d'abord, puis les autres sont reduites (jamais supprimees, sinon le recalcul les recreerait).
 * Plancher : 1 XP par ligne venue des donnees de la demo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { isDemoDataActive } from '@/lib/demoDataService';
import { ARMURE_CHANGED_EVENT, RANKS, syncArmure, todayIso } from '@/lib/v2/armure';

const LEDGER_KEY = 'yoroi_xp_ledger_v1';
const STUDIO_PREFIX = 'studio:';

type Row = { k: string; d: string; s: string; a: number; t: string; l: string };

export class DemoRequiredError extends Error {
  constructor() {
    super('Charge un profil démo pour modifier les XP.');
  }
}

async function readRows(): Promise<Row[]> {
  const raw = await AsyncStorage.getItem(LEDGER_KEY);
  if (!raw) return [];
  const list = JSON.parse(raw) as unknown;
  return Array.isArray(list) ? (list as Row[]).filter((r) => r && typeof r.k === 'string' && r.a > 0) : [];
}

const total = (rows: Row[]) => rows.reduce((s, r) => s + r.a, 0);
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

async function guard(): Promise<void> {
  if (!(await isDemoDataActive())) throw new DemoRequiredError();
  // le recalcul en cours se termine avant qu'on ecrive
  await syncArmure(true).catch(() => undefined);
}

async function commit(rows: Row[]): Promise<number> {
  await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(rows));
  const snap = await syncArmure(true);
  DeviceEventEmitter.emit(ARMURE_CHANGED_EVENT, snap.state);
  return snap.state.xp;
}

function withDelta(rows: Row[], delta: number): Row[] {
  const out = rows.map((r) => ({ ...r }));
  if (delta > 0) {
    out.push({ k: `${STUDIO_PREFIX}${Date.now()}`, d: todayIso(), s: 'reprise', a: Math.round(delta), t: stamp(), l: 'Ajout du Studio (démo)' });
    return out;
  }
  let left = Math.round(-delta);
  // 1. les lignes du Studio, les plus recentes d'abord
  for (let i = out.length - 1; i >= 0 && left > 0; i -= 1) {
    if (!out[i].k.startsWith(STUDIO_PREFIX)) continue;
    const take = Math.min(out[i].a, left);
    out[i].a -= take;
    left -= take;
  }
  // 2. les autres lignes, reduites jusqu'a 1 XP
  for (let i = out.length - 1; i >= 0 && left > 0; i -= 1) {
    if (out[i].k.startsWith(STUDIO_PREFIX)) continue;
    const take = Math.min(out[i].a - 1, left);
    if (take <= 0) continue;
    out[i].a -= take;
    left -= take;
  }
  return out.filter((r) => r.a > 0);
}

/** Ajoute (positif) ou retire (negatif) des XP. Renvoie l'XP totale apres coup. */
export async function adjustDemoXp(delta: number): Promise<number> {
  await guard();
  const rows = await readRows();
  return commit(withDelta(rows, delta));
}

/** Fixe l'XP au plus pres d'une valeur (le plancher est d'1 XP par ligne de la demo). */
export async function setDemoXp(target: number): Promise<number> {
  await guard();
  const rows = await readRows();
  return commit(withDelta(rows, Math.max(0, Math.round(target)) - total(rows)));
}

/** Place la demo au debut d'un rang (0 Ashigaru a 4 Shogun). */
export async function setDemoRank(index: number): Promise<number> {
  const r = RANKS[Math.max(0, Math.min(RANKS.length - 1, index))];
  return setDemoXp(r.minXp);
}
