/**
 * Mise en forme du carnet technique et des chronos (refonte v2) : temps, allures, dates courtes.
 */

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/** 90 -> 01:30 */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(r)}`;
  return `${pad2(m)}:${pad2(r)}`;
}

/** 90 -> 1 min 30 */
export function humanSeconds(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r > 0 ? `${m} min ${pad2(r)}` : `${m} min`;
}

/** minutes -> 1 h 05 ou 45 min */
export function humanMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} h ${pad2(r)}` : `${h} h`;
}

/** allure en secondes par km -> 5:12 */
export function pace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '--';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${pad2(s)}`;
}

/**
 * Date d'une seance : un jour seul (AAAA-MM-JJ) est lu en heure locale, a midi.
 * new Date('2026-10-18') le lirait en UTC : la veille aux Antilles ou au Quebec.
 */
export function dayDate(iso: string): Date {
  const s = String(iso ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T12:00:00') : new Date(s);
}

export function shortDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return dayDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
  } catch {
    return '';
  }
}

export function longDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return dayDate(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return '';
  }
}

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/** "aujourd'hui", "hier", "il y a 3 jours", "il y a 2 semaines" */
export function relative(iso?: string | null): string {
  const d = daysSince(iso);
  if (d === null) return '';
  if (d === 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} jours`;
  if (d < 30) {
    const w = Math.floor(d / 7);
    return `il y a ${w} semaine${w > 1 ? 's' : ''}`;
  }
  const mo = Math.floor(d / 30);
  return `il y a ${mo} mois`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/** 1250 -> 1,3 k */
export function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} k`;
  return String(Math.round(n));
}

export function monthLabel(key: string): string {
  try {
    return new Date(`${key}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  } catch {
    return key;
  }
}

/** Les n derniers mois sous forme de cle AAAA-MM, du plus ancien au plus recent */
export function lastMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }
  return out;
}
