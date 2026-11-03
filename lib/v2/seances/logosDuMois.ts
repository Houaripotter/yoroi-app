/**
 * « Ton mois », onglet Séances (3 novembre 2026, demande de Houari) : chaque sport du mois avec le logo de son club.
 *  - le logo vient de tes clubs (table SQLite clubs, colonne logo_uri), lu avec chaque séance (club_logo) ;
 *  - pour un sport, le logo de la séance la plus récente de ce sport qui en a un, même d'un mois passé ;
 *  - un logo que l'app fournit (une marque) n'est jamais montré : logoValable le refuse, la carte montre alors
 *    le sticker du sport. Aucune image ici : la fonction dit seulement quel logo garder, testable sans téléphone.
 */
import type { Training } from '@/lib/database';
import { firstSport } from './sessionData';

export type SportDuMois = {
  /** le premier sport de la séance (« jjb », « running ») */
  sport: string;
  /** séances de ce sport dans le mois */
  nombre: number;
  /** le logo de ton club pour ce sport, null : le sticker du sport */
  logo: string | null;
  /** une séance dehors (le sticker peut en dépendre) */
  dehors: boolean;
};

const jourDe = (t: Training) => String(t.date ?? '').slice(0, 10);
const recentes = (a: Training, b: Training) =>
  jourDe(b).localeCompare(jourDe(a)) || String(b.start_time ?? '').localeCompare(String(a.start_time ?? '')) || (Number(b.id) || 0) - (Number(a.id) || 0);

/** Le logo de ton club pour chaque sport : celui de ta séance la plus récente de ce sport qui en porte un */
export function logosParSport(trainings: Training[], logoValable: (logo: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  [...trainings].sort(recentes).forEach((t) => {
    const s = firstSport(t.sport);
    const logo = typeof t.club_logo === 'string' ? t.club_logo.trim() : '';
    if (!s || !logo || out.has(s) || !logoValable(logo)) return;
    out.set(s, logo);
  });
  return out;
}

/** Les sports du mois, du plus pratiqué au moins pratiqué, chacun avec le logo de son club s'il y en a un */
export function sportsDuMois(trainings: Training[], annee: number, mois: number, logoValable: (logo: string) => boolean): SportDuMois[] {
  const prefixe = `${annee}-${String(mois + 1).padStart(2, '0')}-`;
  const logos = logosParSport(trainings, logoValable);
  const parSport = new Map<string, { nombre: number; dehors: boolean; dernier: string }>();
  trainings.forEach((t) => {
    if (!jourDe(t).startsWith(prefixe)) return;
    const s = firstSport(t.sport);
    if (!s) return;
    const e = parSport.get(s) ?? { nombre: 0, dehors: false, dernier: '' };
    e.nombre += 1;
    e.dehors = e.dehors || !!t.is_outdoor;
    if (jourDe(t) > e.dernier) e.dernier = jourDe(t);
    parSport.set(s, e);
  });
  return [...parSport.entries()]
    .sort((a, b) => b[1].nombre - a[1].nombre || b[1].dernier.localeCompare(a[1].dernier) || a[0].localeCompare(b[0]))
    .map(([sport, e]) => ({ sport, nombre: e.nombre, logo: logos.get(sport) ?? null, dehors: e.dehors }));
}

/** Les sports d'un jour, sans doublon, dans l'ordre des séances */
export function sportsDuJour(list: Training[]): string[] {
  const out: string[] = [];
  list.forEach((t) => {
    const s = firstSport(t.sport);
    if (s && !out.includes(s)) out.push(s);
  });
  return out;
}
