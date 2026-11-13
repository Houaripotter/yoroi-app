/**
 * Raccourcis du + (13 novembre 2026, barre en verre validee par Houari) : un appui long sur le + ouvre 4 bulles en
 * arc (Pesee, Muscu, Combat, Chrono). Tu glisses le doigt jusqu'a une bulle et tu lâches : c'est lance.
 *
 * Ici, sans React Native : la place de chaque bulle (prise sur la maquette mixte.html), la bulle sous le doigt, et
 * l'ecran que chaque raccourci ouvre (des routes qui existent deja). Tests : lib/v2/nav/__tests__/raccourcisPlus.test.ts.
 */
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { seanceKindFor } from '@/lib/v2/seance/sportVisuals';

export type IdRaccourci = 'pesee' | 'muscu' | 'combat' | 'chrono';

/**
 * Les bulles, de la plus basse a la plus haute. dx et dy : le centre de la bulle par rapport au centre du +
 * (dx negatif a gauche, dy negatif au dessus). Maquette : + de 62 a 14 du bord droit, bulles de 72.
 */
export const RACCOURCIS: { id: IdRaccourci; dx: number; dy: number }[] = [
  { id: 'pesee', dx: -195, dy: -35 },
  { id: 'muscu', dx: -160, dy: -130 },
  { id: 'combat', dx: -90, dy: -200 },
  { id: 'chrono', dx: 0, dy: -225 },
];

/** Taille d'une bulle (carre arrondi de verre) */
export const TAILLE_BULLE = 72;
/** Le doigt « est sur » une bulle a moins de 56 de son centre (la bulle et un peu d'air autour) */
export const RAYON_PRISE = 56;

/**
 * L'arc tient sur les petits ecrans : sur un telephone plus etroit que 390, les bulles se rapprochent du + dans la
 * meme proportion (jamais moins de 80 %).
 */
export function echelleArc(largeurEcran: number): number {
  if (!Number.isFinite(largeurEcran) || largeurEcran <= 0) return 1;
  return Math.max(0.8, Math.min(1, largeurEcran / 390));
}

/** La bulle sous le doigt (decalage du doigt par rapport au centre du +), ou null */
export function bulleSousLeDoigt(dx: number, dy: number, echelle = 1): IdRaccourci | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  let meilleure: IdRaccourci | null = null;
  let min = RAYON_PRISE;
  for (const b of RACCOURCIS) {
    const d = Math.hypot(dx - b.dx * echelle, dy - b.dy * echelle);
    if (d < min) {
      min = d;
      meilleure = b.id;
    }
  }
  return meilleure;
}

/** Le sport de combat de la bulle Combat : ton premier sport favori de combat, sinon le JJB */
export function sportDeCombat(favoris: readonly string[] | null | undefined): string {
  for (const s of favoris ?? []) {
    if (s && seanceKindFor(s) === 'combat') return s;
  }
  return 'jjb';
}

/**
 * L'ecran de chaque raccourci, parmi les routes existantes :
 * Pesee : /pesee (la pesee rapide, comme « Poids » dans le +) ;
 * Muscu : la seance de musculation en direct (/seance/muscu) ;
 * Combat : la seance de combat en direct (/seance/combat) avec ton sport de combat ;
 * Chrono : le chrono de rounds (/timer en mode combat).
 */
export function routeRaccourci(id: IdRaccourci, favoris?: readonly string[] | null): { pathname: string; params?: Record<string, string> } {
  switch (id) {
    case 'pesee':
      return { pathname: '/pesee' };
    case 'muscu':
      return saisieDirecte('musculation') ?? { pathname: '/seance/muscu', params: { sport: 'musculation' } };
    case 'combat': {
      const sport = sportDeCombat(favoris);
      return saisieDirecte(sport) ?? { pathname: '/seance/combat', params: { sport } };
    }
    case 'chrono':
      return { pathname: '/timer', params: { mode: 'combat' } };
  }
}
