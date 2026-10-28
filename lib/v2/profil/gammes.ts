/**
 * Ceintures et grades par sport (28 octobre 2026, nouvelle page Ton profil).
 * Seuls les sports ou la ceinture de couleur est l'usage courant ont une gamme :
 * jiu jitsu bresilien, judo, karate, taekwondo. Les autres (musculation, course, boxe, MMA, lutte, sambo,
 * aikido, kung fu, krav maga, hapkido...) apparaissent avec leur club, sans ceinture : leurs grades
 * changent trop d'une ecole a l'autre (ou n'existent pas) pour qu'une gamme unique soit juste.
 * Aucun nom de federation : ce sont les gammes simples, les plus repandues.
 *
 * Grades :
 * - jiu jitsu bresilien : degres sur la barrette, 0 a 4 sur les ceintures de couleur, 0 a 6 sur la noire
 *   (barrette rouge, comme le veut l'usage) ;
 * - judo, karate : ceinture noire du 1er au 10e dan ; taekwondo : du 1er au 9e dan ;
 *   aucun degre sur les ceintures de couleur.
 * Code pur, teste dans __tests__/unit/pratiquesProfil.test.ts.
 */
import { traduire } from '@/lib/i18n/tr';

export type CeintureId = 'blanche' | 'jaune' | 'orange' | 'verte' | 'bleue' | 'violette' | 'marron' | 'rouge' | 'noire';

/** Teintes du dessin (degrade, bord, surpiqures) : celles de la maquette validee */
export type Teinte = { base: string; light: string; dark: string; edge: string; stitch: string };

export const TEINTES: Record<CeintureId, Teinte> = {
  blanche: { base: '#F6F3EA', light: '#FFFFFF', dark: '#DCD5C4', edge: '#BDB4A0', stitch: '#CEC6B3' },
  jaune: { base: '#E8C33A', light: '#F5DA6A', dark: '#C9A21E', edge: '#9C7C12', stitch: '#F8E79A' },
  orange: { base: '#E58A2B', light: '#F2A657', dark: '#C26E18', edge: '#94520F', stitch: '#F6C48E' },
  verte: { base: '#3E8E4A', light: '#5CAE67', dark: '#2C6E36', edge: '#1E5026', stitch: '#8CCB94' },
  bleue: { base: '#2C4A84', light: '#4467A8', dark: '#1D3462', edge: '#152647', stitch: '#6A86BF' },
  violette: { base: '#6A3E8E', light: '#8A5DAE', dark: '#4C2A69', edge: '#381E4E', stitch: '#A47DC4' },
  marron: { base: '#6B4428', light: '#8A5E3C', dark: '#4C2F1B', edge: '#382213', stitch: '#A27B5A' },
  rouge: { base: '#C2333A', light: '#DB565C', dark: '#9A2228', edge: '#6E161B', stitch: '#EB8D91' },
  noire: { base: '#23262F', light: '#3B3F4B', dark: '#121419', edge: '#08090C', stitch: '#4E5361' },
};

export type RegleGrade = { type: 'degres' | 'dan'; min: number; max: number };

export type Gamme = {
  sport: string;
  /** nom court, pour « 5 ceintures en JJB » */
  court: string;
  ceintures: CeintureId[];
  /** grades possibles par ceinture ; absent : pas de grade sur cette ceinture */
  grades: Partial<Record<CeintureId, RegleGrade>>;
  /** barrette de grade au bout du pan (jiu jitsu bresilien) */
  barrette: boolean;
};

const DEG4: RegleGrade = { type: 'degres', min: 0, max: 4 };

export const GAMMES: Record<string, Gamme> = {
  jjb: {
    sport: 'jjb',
    court: 'JJB',
    ceintures: ['blanche', 'bleue', 'violette', 'marron', 'noire'],
    grades: { blanche: DEG4, bleue: DEG4, violette: DEG4, marron: DEG4, noire: { type: 'degres', min: 0, max: 6 } },
    barrette: true,
  },
  judo: {
    sport: 'judo',
    court: 'Judo',
    ceintures: ['blanche', 'jaune', 'orange', 'verte', 'bleue', 'marron', 'noire'],
    grades: { noire: { type: 'dan', min: 1, max: 10 } },
    barrette: false,
  },
  karate: {
    sport: 'karate',
    court: 'Karaté',
    ceintures: ['blanche', 'jaune', 'orange', 'verte', 'bleue', 'marron', 'noire'],
    grades: { noire: { type: 'dan', min: 1, max: 10 } },
    barrette: false,
  },
  taekwondo: {
    sport: 'taekwondo',
    court: 'Taekwondo',
    ceintures: ['blanche', 'jaune', 'verte', 'bleue', 'rouge', 'noire'],
    grades: { noire: { type: 'dan', min: 1, max: 9 } },
    barrette: false,
  },
};

/** La gamme d'un sport, ou null pour un sport sans ceinture */
export function gammeDe(sport: string | null | undefined): Gamme | null {
  const id = String(sport ?? '').split(',')[0].trim().toLowerCase();
  return GAMMES[id] ?? null;
}

export function aDesCeintures(sport: string | null | undefined): boolean {
  return !!gammeDe(sport);
}

/** Anciennes valeurs possibles de @yoroi_belt (ids anglais d'un ancien profil de competiteur compris) */
const ALIAS: Record<string, CeintureId> = {
  white: 'blanche', yellow: 'jaune', green: 'verte', blue: 'bleue', purple: 'violette', brown: 'marron', red: 'rouge', black: 'noire',
};

export function ceintureValide(v: unknown): CeintureId | null {
  if (typeof v !== 'string') return null;
  const k = v.trim().toLowerCase();
  if (k in TEINTES) return k as CeintureId;
  return ALIAS[k] ?? null;
}

/** La regle de grade de cette ceinture dans ce sport, ou null */
export function regleGrade(sport: string | null | undefined, ceinture: CeintureId | null | undefined): RegleGrade | null {
  if (!ceinture) return null;
  return gammeDe(sport)?.grades[ceinture] ?? null;
}

/** Ramene un grade dans les bornes de la ceinture (0 quand la ceinture n'a pas de grade) */
export function gradePropre(sport: string | null | undefined, ceinture: CeintureId | null | undefined, n: unknown): number {
  const r = regleGrade(sport, ceinture);
  if (!r) return 0;
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : r.min;
  return Math.max(r.min, Math.min(r.max, v));
}

/** Nom de la couleur, avec sa majuscule : « Bleue » */
export function nomCeinture(id: CeintureId): string {
  switch (id) {
    case 'blanche': return traduire('Blanche');
    case 'jaune': return traduire('Jaune');
    case 'orange': return traduire('Orange');
    case 'verte': return traduire('Verte');
    case 'bleue': return traduire('Bleue');
    case 'violette': return traduire('Violette');
    case 'marron': return traduire('Marron');
    case 'rouge': return traduire('Rouge');
    case 'noire': return traduire('Noire');
  }
}

/** « Ceinture bleue » (une phrase par couleur : chaque langue accorde a sa facon) */
export function titreCeinture(id: CeintureId): string {
  switch (id) {
    case 'blanche': return traduire('Ceinture blanche');
    case 'jaune': return traduire('Ceinture jaune');
    case 'orange': return traduire('Ceinture orange');
    case 'verte': return traduire('Ceinture verte');
    case 'bleue': return traduire('Ceinture bleue');
    case 'violette': return traduire('Ceinture violette');
    case 'marron': return traduire('Ceinture marron');
    case 'rouge': return traduire('Ceinture rouge');
    case 'noire': return traduire('Ceinture noire');
  }
}

/** « 2 degrés », « 1 degré », « Aucun degré », « 1er dan », « 3e dan » ; null sans grade */
export function texteGrade(sport: string | null | undefined, ceinture: CeintureId | null | undefined, n: number): string | null {
  const r = regleGrade(sport, ceinture);
  if (!r) return null;
  const v = gradePropre(sport, ceinture, n);
  if (r.type === 'dan') return v === 1 ? traduire('1er dan') : traduire('{0}e dan', v);
  if (v === 0) return traduire('Aucun degré');
  return v === 1 ? traduire('1 degré') : traduire('{0} degrés', v);
}

/** « Ceinture bleue, 2 degrés » (carte de Reglages) */
export function resumeGrade(sport: string | null | undefined, ceinture: CeintureId, n: number): string {
  const g = texteGrade(sport, ceinture, n);
  const v = gradePropre(sport, ceinture, n);
  return g && !(regleGrade(sport, ceinture)?.type === 'degres' && v === 0) ? `${titreCeinture(ceinture)}, ${g.charAt(0).toLowerCase()}${g.slice(1)}` : titreCeinture(ceinture);
}
