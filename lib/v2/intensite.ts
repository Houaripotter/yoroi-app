/**
 * Echelle d'intensite commune a toute l'app (vague 32) : charge d'entrainement, effort ressenti (RPE),
 * zones cardio, intensite des rounds, douleur, forme et recuperation. Une seule progression, du calme
 * vers l'intense. Depuis le 28 octobre 2026, ce sont les couleurs des zones cardiaques
 * (lib/v2/zones/couleursZones.ts) : bleu ciel, menthe, jaune soleil, orange corail, rose rouge vif.
 * Toujours un libelle a cote de la couleur.
 *
 * Contrastes verifies dans couleursZones.ts : texte AA sur blanc et sur sa teinte, onFill AA sur la couleur pleine.
 */

import { paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';
import { ZONES_CLAIR, ZONES_SOMBRE } from '@/lib/v2/zones/couleursZones';

export type NiveauIntensite = 1 | 2 | 3 | 4 | 5;

export type Intensite = {
  niveau: NiveauIntensite;
  id: 'calme' | 'leger' | 'soutenu' | 'intense' | 'maximal';
  /** nom generique du niveau, chaque ecran garde ses propres mots */
  nom: string;
  /** couleur pleine : barres, bandes, points, jauges */
  fill: string;
  /** texte et icones sur fond clair (blanc, papier, teinte) */
  text: string;
  /** fond clair d'une pastille */
  tint: string;
  /** texte pose sur fill */
  onFill: string;
};

// 28 octobre 2026 : memes couleurs que les zones cardiaques, partout (lib/v2/zones/couleursZones.ts)
const BASE: readonly { niveau: NiveauIntensite; id: Intensite['id']; nom: string }[] = [
  { niveau: 1, id: 'calme', nom: traduire('Calme') },
  { niveau: 2, id: 'leger', nom: traduire('Léger') },
  { niveau: 3, id: 'soutenu', nom: 'Soutenu' },
  { niveau: 4, id: 'intense', nom: traduire('Intense') },
  { niveau: 5, id: 'maximal', nom: 'Maximal' },
];

export const INTENSITES: readonly Intensite[] = BASE.map((b, i) => ({
  ...b,
  fill: ZONES_CLAIR[i].plein,
  text: ZONES_CLAIR[i].texte,
  tint: ZONES_CLAIR[i].doux,
  onFill: ZONES_CLAIR[i].surPlein,
}));

/** Audit 43 : en sombre, le texte s'eclaircit et la pastille fonce (memes teintes, lisibles sur l'encre de nuit) */
const NUIT: readonly { fill: string; text: string; tint: string }[] = ZONES_SOMBRE.map((z) => ({ fill: z.plein, text: z.texte, tint: z.doux }));

export function intensite(niveau: number): Intensite {
  const n = Math.max(1, Math.min(5, Math.round(niveau || 1)));
  const base = INTENSITES[n - 1];
  return paletteSombre() ? { ...base, ...NUIT[n - 1] } : base;
}

/** Effort ressenti sur 10 : 1-2 calme, 3-4 leger, 5-6 soutenu, 7-8 intense, 9-10 maximal */
export function niveauRpe(rpe: number): NiveauIntensite {
  return Math.max(1, Math.min(5, Math.ceil((rpe || 1) / 2))) as NiveauIntensite;
}

/** Douleur sur 10 (EVA) : jamais « calme » ; legere en or, moderee en orange, severe en braise */
export function niveauDouleur(eva: number): NiveauIntensite {
  return eva >= 7 ? 5 : eva >= 4 ? 4 : 3;
}

/**
 * Forme et recuperation (plus c'est haut, mieux c'est) : la meme palette lue a l'envers.
 * Bonne forme en vert, moyenne en or, basse en orange, tres basse en braise.
 */
export function niveauForme(score: number): NiveauIntensite {
  return score >= 65 ? 2 : score >= 50 ? 3 : score >= 35 ? 4 : 5;
}
