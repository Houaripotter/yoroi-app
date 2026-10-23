/**
 * Pesees recues par Apple Sante (ou Health Connect) : poids, masse grasse, masse maigre, IMC.
 * Reutilise uniquement les lectures existantes de lib/healthConnect, aucun module natif nouveau.
 * Dans Expo Go et sur le web, rien n'est lu : la pesee reste saisissable a la main.
 * Apple Sante ne transmet pas la masse musculaire, l'eau, l'os ni la graisse viscerale.
 */
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { getSanteSource } from '@/lib/v2/sante/data';
import type { SanteMode } from '@/lib/v2/sante/data';
import { traduire } from '@/lib/i18n/tr';

export type HealthDay = {
  date: string;
  weight?: number;
  fat?: number;
  lean?: number;
  bmi?: number;
  /** cle courte rangee dans weights.source (withings, renpho...) */
  sourceKey: string;
  /** ex. « balance Withings », absent si la source est inconnue */
  sourceLabel?: string;
};

export type HealthRead = {
  mode: SanteMode;
  provider: string;
  days: Record<string, HealthDay>;
};

const svc = healthConnect as unknown as Record<string, any>;

async function call<T>(name: string, ...args: unknown[]): Promise<T | null> {
  const fn = svc[name];
  if (typeof fn !== 'function') return null;
  try {
    return await Promise.race([
      Promise.resolve(fn.apply(healthConnect, args) as Promise<T>),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
    ]);
  } catch (e) {
    logger.warn(`[Pesee v2] lecture ${name} impossible`, e);
    return null;
  }
}

const BRANDS: Array<{ test: RegExp; key: string; label: string }> = [
  { test: /withings|health mate|nokia/i, key: 'withings', label: 'balance Withings' },
  { test: /renpho/i, key: 'renpho', label: 'balance Renpho' },
  { test: /eufy|anker/i, key: 'eufy', label: 'balance Eufy' },
  { test: /omron/i, key: 'omron', label: 'balance Omron' },
  { test: /xiaomi|mi fit|zepp|huami/i, key: 'xiaomi', label: 'balance Xiaomi' },
  { test: /garmin/i, key: 'garmin', label: 'Garmin' },
  { test: /fitbit|aria/i, key: 'fitbit', label: 'Fitbit' },
  { test: /tanita/i, key: 'tanita', label: 'balance Tanita' },
  { test: /huawei/i, key: 'huawei', label: 'balance Huawei' },
];

/** Nom lisible de la source, sans inventer : une source inconnue reste sans nom */
export function describeSource(raw: string | undefined, providerKey: string): { key: string; label?: string } {
  const s = String(raw ?? '').trim();
  for (const b of BRANDS) if (b.test.test(s)) return { key: b.key, label: b.label };
  return { key: providerKey };
}

const isOwn = (raw: string | undefined) => /yoroi/i.test(String(raw ?? ''));
const dayKey = (d: unknown) => (typeof d === 'string' ? d.slice(0, 10) : '');
/** Jour local d'une date ISO complète (une mesure à 7 h en France est à 5 h UTC) */
const localDay = (iso: unknown): string => {
  if (typeof iso !== 'string' || !iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Sans les écritures de YOROI, et la dernière valeur du jour (celle de la pesée), pas une moyenne */
const BODY_READ = { excludeOwn: true, latest: true };
const round1 = (v: number) => Math.round(v * 10) / 10;

type Row = { date: string; value: number; source?: string };

/** Lit les pesees des derniers jours, une par jour (la plus recente du jour) */
export async function readHealthWeighIns(days = 31): Promise<HealthRead> {
  const src = await getSanteSource();
  const out: HealthRead = { mode: src.mode, provider: src.provider, days: {} };
  if (src.mode !== 'live') return out;
  const providerKey = src.platform === 'android' ? 'health_connect' : 'apple_health';
  try {
    const [weights, fats, leans, bmis] = await Promise.all([
      call<Row[]>('getWeightHistory', days),
      call<Row[]>('getExtendedHistory', 'masse-grasse', days, BODY_READ),
      call<Row[]>('getExtendedHistory', 'masse-maigre', days, BODY_READ),
      call<Row[]>('getExtendedHistory', 'imc', days, BODY_READ),
    ]);
    for (const w of weights ?? []) {
      const d = dayKey(w?.date);
      const v = Number(w?.value);
      if (!d || !(v > 20 && v < 400) || isOwn(w.source)) continue;
      const s = describeSource(w.source, providerKey);
      // la derniere lecture du jour l'emporte (les lectures arrivent dans l'ordre)
      out.days[d] = { ...(out.days[d] ?? {}), date: d, weight: round1(v), sourceKey: s.key, sourceLabel: s.label };
    }
    const attach = (rows: Row[] | null, k: 'fat' | 'lean' | 'bmi', ok: (v: number) => boolean) => {
      for (const r of rows ?? []) {
        const d = dayKey(r?.date);
        const v = Number(r?.value);
        if (!d || !ok(v)) continue;
        const cur = out.days[d] ?? { date: d, sourceKey: providerKey };
        out.days[d] = { ...cur, [k]: round1(v) };
      }
    };
    attach(fats, 'fat', (v) => v > 2 && v < 70);
    attach(leans, 'lean', (v) => v > 10 && v < 200);
    attach(bmis, 'bmi', (v) => v > 10 && v < 80);

    // Repli masse grasse : derniere mesure connue (7 jours), rattachee seulement a la pesee
    // du jour meme de cette mesure et de la meme source
    const anyFat = Object.values(out.days).some((d) => d.fat);
    if (!anyFat) {
      const b = await call<{ bodyFatPercentage?: number; leanBodyMass?: number; date?: string; source?: string }>('getBodyComposition');
      const bDay = localDay(b?.date);
      const day = bDay ? out.days[bDay] : undefined;
      if (b && day && day.weight && describeSource(b.source, providerKey).key === day.sourceKey) {
        const f = Number(b.bodyFatPercentage);
        const l = Number(b.leanBodyMass);
        if (f > 2 && f < 70) day.fat = round1(f);
        if (!day.lean && l > 10 && l < 200) day.lean = round1(l);
      }
    }
  } catch (e) {
    logger.warn('[Pesee v2] lecture Apple Sante impossible', e);
  }
  return out;
}

/** Une pesee de meme jour et de meme valeur existe deja dans YOROI */
export function alreadyInYoroi(day: string, weight: number, rows: Array<{ date: string; weight: number }>): boolean {
  return rows.some((w) => String(w.date).slice(0, 10) === day && Math.abs(Number(w.weight) - weight) < 0.05);
}

/** La pesee de la balance la plus recente qui n'est pas encore dans YOROI */
export function pendingImport(read: HealthRead | null, rows: Array<{ date: string; weight: number }>): HealthDay | null {
  if (!read) return null;
  const list = Object.values(read.days)
    .filter((d) => d.weight && !alreadyInYoroi(d.date, d.weight, rows))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return list[0] ?? null;
}

/** « depuis Apple Santé, balance Withings » */
export function sourceText(provider: string, day?: Pick<HealthDay, 'sourceLabel'> | null): string {
  return day?.sourceLabel ? traduire("depuis {0}, {1}", provider, day.sourceLabel) : traduire("depuis {0}", provider);
}
