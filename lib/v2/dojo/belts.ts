/**
 * Niveaux de pratique par sport (anciennement « ceintures ») : calcules a partir du
 * nombre de seances dans chaque sport. Rien n'est stocke, tout vient de l'historique.
 * Ce ne sont pas des grades : un pratiquant de JJB ou de judo garde son vrai grade
 * dans son profil. Les identifiants (couleurs) restent les memes pour ne rien casser.
 */

import { traduire } from '@/lib/i18n/tr';
export type BeltId = 'blanche' | 'jaune' | 'orange' | 'verte' | 'verte_bleue' | 'bleue' | 'bleue_marron' | 'marron' | 'marron_noire' | 'noire';

/** name : nom du niveau, affiche partout (« niveau Solide »). Vague 47 : aucun nom commun avec les rangs (Regulier, Confirme, Expert sont des rangs Classique). */
export type Belt = { id: BeltId; name: string; min: number; color: string; edge: string };

export const BELTS: Belt[] = [
  { id: 'blanche', name: 'Novice', min: 0, color: '#FFFFFF', edge: '#D9D3CA' },
  { id: 'jaune', name: 'Initié', min: 10, color: '#E8C33A', edge: '#C9A62A' },
  { id: 'orange', name: 'Motivé', min: 25, color: '#E58A2B', edge: '#C4701C' },
  { id: 'verte', name: 'Solide', min: 50, color: '#3E8E4A', edge: '#2F7039' },
  { id: 'verte_bleue', name: 'Assidu', min: 75, color: '#2F7A7A', edge: '#235E5E' },
  { id: 'bleue', name: 'Aguerri', min: 100, color: '#2F5DA8', edge: '#244A87' },
  { id: 'bleue_marron', name: 'Chevronné', min: 150, color: '#4E4F8A', edge: '#3B3C6B' },
  { id: 'marron', name: 'Redoutable', min: 200, color: '#7A4B2A', edge: '#5E391F' },
  { id: 'marron_noire', name: 'Vétéran', min: 275, color: '#4A3326', edge: '#2E1F17' },
  { id: 'noire', name: 'Maître', min: 365, color: '#1D2029', edge: '#000000' },
];

export type BeltProgress = {
  belt: Belt;
  next: Belt | null;
  remaining: number;
  /** progression de 0 a 1 vers le niveau suivant */
  progress: number;
};

export function beltFor(count: number): BeltProgress {
  let i = 0;
  BELTS.forEach((bl, k) => {
    if (count >= bl.min) i = k;
  });
  const belt = BELTS[i];
  const next = BELTS[i + 1] ?? null;
  if (!next) return { belt, next: null, remaining: 0, progress: 1 };
  const span = next.min - belt.min;
  return { belt, next, remaining: next.min - count, progress: Math.max(0, Math.min(1, (count - belt.min) / span)) };
}

export function seancesWord(n: number): string {
  return n > 1 ? traduire("{0} séances", n) : traduire("{0} séance", n);
}
