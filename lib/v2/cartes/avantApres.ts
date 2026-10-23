/**
 * Carte Avant apres (17 octobre 2026) : tes deux photos de corps, leurs dates, le temps ecoule
 * et, seulement si une pesee existe a 3 jours pres de chaque photo, les deux poids et l'ecart.
 * Rien n'est estime : sans pesee proche, aucun poids sur la carte.
 * Proposee seulement avec au moins 2 photos. Par defaut la premiere et la derniere.
 */
import type { Photo } from '@/lib/storage';
import { daysDiff, num } from '@/lib/v2/progres/format';
import { dateComplete, dureeTexte } from '@/lib/v2/photos/outils';
import type { CarteData, Masque, PhotoCarte } from './types';
import { traduire } from '@/lib/i18n/tr';

/** Ecart maximal, en jours, entre une photo et la pesee qui donne son poids */
export const TOLERANCE_POIDS = 3;

export type PeseeSimple = { date: string; weight: number };

/** La pesee la plus proche de la date, a 3 jours pres ; a egalite, celle d'avant la photo */
export function poidsProche(pesees: PeseeSimple[], date: string, tolerance = TOLERANCE_POIDS): number | null {
  const jour = date.slice(0, 10);
  let best: { d: number; avant: boolean; w: number } | null = null;
  for (const p of pesees) {
    if (!p || !p.date || !(p.weight > 0)) continue;
    const ecart = daysDiff(jour, p.date.slice(0, 10));
    const d = Math.abs(ecart);
    if (d > tolerance) continue;
    const avant = ecart <= 0;
    if (!best || d < best.d || (d === best.d && avant && !best.avant)) best = { d, avant, w: p.weight };
  }
  return best ? best.w : null;
}

/** Tes photos, de la plus ancienne a la plus recente, avec le poids de la pesee la plus proche */
export function photosCarte(photos: Photo[], pesees: PeseeSimple[]): PhotoCarte[] {
  return photos
    .filter((p) => p && p.file_uri && p.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1))
    .map((p) => ({ id: p.id, uri: p.file_uri, date: p.date.slice(0, 10), poids: poidsProche(pesees, p.date) }));
}

/** La carte est proposee seulement avec au moins 2 photos */
export function avantApresPossible(liste: PhotoCarte[]): boolean {
  return liste.length >= 2;
}

/** La carte pour la paire choisie (par defaut la premiere et la derniere) ; l'avant est toujours la plus ancienne */
export function carteAvantApres(liste: PhotoCarte[], avantId?: string | null, apresId?: string | null): CarteData | null {
  if (!avantApresPossible(liste)) return null;
  let a = liste.find((p) => p.id === avantId) ?? liste[0];
  let b = liste.find((p) => p.id === apresId) ?? liste[liste.length - 1];
  if (a.id === b.id) {
    // deux fois la meme photo : on garde ton choix et on prend l'autre bout
    b = a.id === liste[liste.length - 1].id ? liste[0] : liste[liste.length - 1];
  }
  if (a.date > b.date) [a, b] = [b, a];
  const jours = Math.abs(daysDiff(a.date, b.date));
  return {
    moment: 'avant_apres',
    titre: traduire('Avant, après'),
    sousTitre: jours > 0 ? `En ${dureeTexte(jours)}` : traduire('Le même jour'),
    avantApres: { avant: a, apres: b, jours },
    cle: `avant_apres:${a.id}:${b.id}`,
  };
}

export type LignesPoids = {
  /** poids de chaque photo, caches avec le masquage */
  avant: string | null;
  apres: string | null;
  /** l'ecart entre les deux, en kg ou en %, selon le masquage */
  ecart: string | null;
};

function signe(v: number): string {
  return Math.abs(v) < 0.05 ? '' : v > 0 ? '+' : '−';
}

/** Les poids montres : rien sans les deux pesees ; « Ecart seulement » et « En % » cachent les poids */
export function lignesPoids(d: CarteData, masque: Masque = 'aucun'): LignesPoids {
  const x = d.avantApres;
  const pa = x?.avant.poids ?? null;
  const pb = x?.apres.poids ?? null;
  if (!x || pa === null || pb === null) return { avant: null, apres: null, ecart: null };
  const diff = pb - pa;
  if (masque === 'pourcentage') {
    const pct = (diff / pa) * 100;
    return { avant: null, apres: null, ecart: `${signe(pct)}${num(Math.abs(pct), 1, false)} %` };
  }
  const ecart = `${signe(diff)}${num(Math.abs(diff), 1, false)} kg`;
  if (masque === 'ecart') return { avant: null, apres: null, ecart };
  return { avant: `${num(pa, 1, false)} kg`, apres: `${num(pb, 1, false)} kg`, ecart };
}

/** « 3 mars 2026 » */
export function dateAvantApres(iso: string): string {
  return dateComplete(iso);
}

/** Le temps ecoule, en clair : « 7 mois », « 12 jours », « le même jour » */
export function tempsEcoule(d: CarteData): string | null {
  const x = d.avantApres;
  if (!x) return null;
  return dureeTexte(x.jours);
}
