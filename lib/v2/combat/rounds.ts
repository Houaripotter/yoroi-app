/**
 * Outils communs de l'espace Combat (refonte v2) : lecture robuste des rounds,
 * resultats, ceintures, comptages et dates.
 */
import type { CombatRound, Training } from '@/lib/database';
import { traduire } from '@/lib/i18n/tr';

export type Result = 'win' | 'loss' | 'draw';
export type Letter = 'V' | 'D' | 'N';

/** Couleurs de resultat (palette graphique validee) */
export const RESULT_COLOR: Record<Result, string> = {
  win: '#3D5D9E',
  loss: '#B0282E',
  draw: '#A8832F',
};
export const RESULT_LABEL: Record<Result, string> = { win: traduire('Victoire'), loss: traduire('Défaite'), draw: traduire('Nul') };
export const RESULT_LETTER: Record<Result, Letter> = { win: 'V', loss: 'D', draw: 'N' };

/**
 * combat_rounds peut arriver en tableau, en texte JSON, ou meme en texte JSON
 * encode deux fois (ancien bug). On gere tous les cas sans jamais planter.
 */
export function parseRounds(raw: unknown): CombatRound[] {
  let v: unknown = raw;
  for (let i = 0; i < 3 && typeof v === 'string'; i++) {
    const s = v.trim();
    if (!s) return [];
    try {
      v = JSON.parse(s);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  return v.filter((r): r is CombatRound => !!r && typeof r === 'object').map((r, i) => ({ ...r, number: typeof r.number === 'number' ? r.number : i + 1 }));
}

export function roundsOf(t: Training): CombatRound[] {
  return parseRounds((t as { combat_rounds?: unknown }).combat_rounds);
}

export function sameName(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Meme regle que l'ancien ecran : le nom du round contient le nom du partenaire */
export function roundMatchesPartner(r: CombatRound, name: string): boolean {
  const n = name.toLowerCase().trim();
  return !!r.partner && !!n && r.partner.toLowerCase().includes(n);
}

export function letterOf(r?: Result | null): Letter | null {
  return r ? RESULT_LETTER[r] : null;
}

export function countResults(rounds: CombatRound[]): { wins: number; losses: number; draws: number; total: number } {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const r of rounds) {
    if (r.result === 'win') wins++;
    else if (r.result === 'loss') losses++;
    else if (r.result === 'draw') draws++;
  }
  return { wins, losses, draws, total: wins + losses + draws };
}

/** Decoupe un champ texte libre en elements (virgules, points-virgules, retours) */
export function tokenize(text?: string | null, minLen = 3): string[] {
  if (!text) return [];
  return text
    .split(/[,;.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= minLen && s.length <= 80);
}

/** Comptage insensible a la casse, trie du plus frequent au moins frequent */
export function countFreq(items: string[]): { label: string; count: number }[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const it of items) {
    const label = it.trim();
    if (!label) continue;
    const k = label.toLowerCase();
    const cur = map.get(k);
    if (cur) cur.count += 1;
    else map.set(k, { label, count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export const BELTS: { key: string; label: string; color: string; edge: string }[] = [
  { key: 'blanche', label: traduire('Blanche'), color: '#FFFFFF', edge: '#D5D2CA' },
  { key: 'grise', label: traduire('Grise'), color: '#8B8D96', edge: '#6F717A' },
  { key: 'jaune', label: traduire('Jaune'), color: '#E3C47B', edge: '#C59D45' },
  { key: 'orange', label: traduire('Orange'), color: '#D08A3C', edge: '#A96B26' },
  { key: 'verte', label: traduire('Verte'), color: '#6E8C3A', edge: '#4F6B28' },
  { key: 'bleue', label: traduire('Bleue'), color: '#2C4A84', edge: '#1D3463' },
  { key: 'violette', label: traduire('Violette'), color: '#5E3C7E', edge: '#45295E' },
  { key: 'marron', label: traduire('Marron'), color: '#6B4426', edge: '#4E301A' },
  { key: 'noire', label: traduire('Noire'), color: '#1D2029', edge: '#000000' },
  { key: 'rouge', label: traduire('Rouge'), color: '#B0282E', edge: '#8C1E23' },
];

export function beltOf(belt?: string | null): { key: string; label: string; color: string; edge: string } | null {
  if (!belt) return null;
  const k = belt.trim().toLowerCase();
  return BELTS.find((b) => b.key === k || k.startsWith(b.key.slice(0, 4))) ?? null;
}

const MONTHS_SHORT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const MONTHS_LONG = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

export function parseDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function shortDate(iso: string, withYear = false): string {
  const d = parseDate(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

export function monthShort(m: number): string {
  return MONTHS_SHORT[((m % 12) + 12) % 12];
}

export function monthLong(m: number): string {
  return MONTHS_LONG[((m % 12) + 12) % 12];
}

export function daysAgo(iso?: string): number | null {
  if (!iso) return null;
  const d = parseDate(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((a - b) / 86400000));
}

export function agoText(iso?: string): string {
  const n = daysAgo(iso);
  if (n == null) return '';
  if (n === 0) return "aujourd'hui";
  if (n === 1) return 'hier';
  if (n < 30) return traduire("il y a {0} jours", n);
  const m = Math.round(n / 30);
  return m <= 1 ? traduire('il y a un mois') : traduire("il y a {0} mois", m);
}

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n > 1 ? many ?? `${one}s` : one}`;
}

export const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
