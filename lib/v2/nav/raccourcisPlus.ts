/**
 * Raccourcis du + (13 novembre 2026, barre en verre validee par Houari) : le + ouvre un eventail de bulles en arc.
 * 14 novembre 2026 (Houari : « quand je clique sur le +, ca m'ouvre la page Enregistrer ; sur l'image je voyais un
 * truc en arc de cercle ») : l'appui simple ouvre l'eventail, l'appui long avec glissement marche toujours, et une
 * 5e bulle « Tout » ouvre la page /ajouter, pour ne perdre aucune option.
 *
 * Ici, sans React Native : la place de chaque bulle (un quart de cercle regulier, du cote gauche jusqu'au dessus du +),
 * la bulle sous le doigt, et l'ecran de chaque raccourci (des routes qui existent deja).
 * Tests : __tests__/unit/raccourcisPlus.test.ts.
 */
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { seanceKindFor } from '@/lib/v2/seance/sportVisuals';

export type IdRaccourci = 'pesee' | 'muscu' | 'combat' | 'chrono' | 'tout';

/** Les bulles, de la plus a gauche (a hauteur du +) a celle juste au dessus du + */
export const ORDRE_RACCOURCIS: IdRaccourci[] = ['pesee', 'muscu', 'combat', 'chrono', 'tout'];

/** Taille d'une bulle (carre de verre aux coins de 26) */
export const TAILLE_BULLE = 72;
export const RAYON_COINS_BULLE = 26;
/** Le rayon de l'arc, du centre du + au centre des bulles */
export const RAYON_ARC = 230;
/** Air garde entre une bulle et le bord de l'ecran */
export const MARGE_ECRAN = 8;
/** Distance du centre du + au bord droit de l'ecran (rond de 62 a 14 du bord) */
export const PLUS_AU_BORD = 14 + 31;
/** Le doigt « est sur » une bulle a moins de 46 de son centre (zones separees, l'arc est serre) */
export const RAYON_PRISE = 46;

/** Le rayon de l'arc pour cette largeur d'ecran : 230, raccourci seulement si la bulle de gauche sortait de l'ecran */
export function rayonArc(largeurEcran: number): number {
  if (!Number.isFinite(largeurEcran) || largeurEcran <= 0) return RAYON_ARC;
  const place = largeurEcran - PLUS_AU_BORD - TAILLE_BULLE / 2 - MARGE_ECRAN;
  return Math.max(150, Math.min(RAYON_ARC, place));
}

/**
 * La place de chaque bulle : dx et dy, son centre par rapport au centre du + (dx negatif a gauche, dy negatif au
 * dessus). Un quart de cercle regulier : 180° (a gauche du +), puis tous les 22,5° jusqu'a 90° (juste au dessus).
 */
export function positionsBulles(largeurEcran: number): { id: IdRaccourci; dx: number; dy: number }[] {
  const r = rayonArc(largeurEcran);
  const n = ORDRE_RACCOURCIS.length;
  return ORDRE_RACCOURCIS.map((id, i) => {
    const a = Math.PI - (i * (Math.PI / 2)) / (n - 1);
    return { id, dx: Math.round(r * Math.cos(a) * 10) / 10, dy: Math.round(-r * Math.sin(a) * 10) / 10 };
  });
}

/** La bulle sous le doigt (decalage du doigt par rapport au centre du +), ou null */
export function bulleSousLeDoigt(dx: number, dy: number, largeurEcran = 390): IdRaccourci | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  let meilleure: IdRaccourci | null = null;
  let min = RAYON_PRISE;
  for (const b of positionsBulles(largeurEcran)) {
    const d = Math.hypot(dx - b.dx, dy - b.dy);
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
 * Chrono : le chrono de rounds (/timer en mode combat) ;
 * Tout : la page /ajouter, avec toutes les options.
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
    case 'tout':
      return { pathname: '/ajouter' };
  }
}
