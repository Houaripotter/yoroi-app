/**
 * 2 novembre 2026 (studio unique) : les anciennes routes de partage (app/social-share/*, /wrapped, /fighter-card)
 * ouvrent le studio du nouveau moteur (/carte). Fonctions pures, testees dans __tests__/unit/studioUnique.test.ts.
 * Les ecrans d'avant sont archives dans _archive_ancien_design_2026-10-09/ancien_partage_2026-11-02/.
 */
import type { Training } from '@/lib/database';
import { lundiIso } from './exploits';
import { isoJour } from './moments';

export type AncienneRoute = 'last-session' | 'weekly-recap-v2' | 'monthly-recap-v2' | 'year-counter-v2' | 'duel-card' | 'wrapped' | 'fighter-card';

/** La derniere seance : la plus recente, et la plus recemment creee le meme jour */
export function derniereSeance(list: Pick<Training, 'id' | 'date'>[]): number | null {
  const tri = [...list].filter((t) => t.id != null).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
  return tri[0]?.id ?? null;
}

/**
 * Le lien du nouveau studio pour une ancienne route. Sans seance : Mes cartes.
 * La carte de duel et la carte de combattant n'ont pas de carte dans le nouveau moteur : la carte de duel ouvre Mes
 * cartes ; la carte de combattant ouvre ton annee (tes chiffres de combattant de l'annee).
 */
export function lienNouveauStudio(route: AncienneRoute, maintenant: Date, idDerniere: number | null = null): string {
  const auj = isoJour(maintenant);
  switch (route) {
    case 'last-session':
      return idDerniere != null ? `/carte?moment=seance&id=${idDerniere}` : '/mes-cartes';
    case 'weekly-recap-v2':
      return `/carte?moment=semaine&debut=${lundiIso(auj)}`;
    case 'monthly-recap-v2':
      return `/carte?moment=mois&ref=${auj.slice(0, 7)}`;
    case 'year-counter-v2':
    case 'wrapped':
    case 'fighter-card':
      return `/carte?moment=annee&ref=${auj.slice(0, 4)}`;
    case 'duel-card':
    default:
      return '/mes-cartes';
  }
}
