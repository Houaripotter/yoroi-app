/**
 * Fin du repos de musculation (30 octobre 2026, retour de Houari : « la notification dit juste Repos, et quand
 * je rouvre l'app, ca sonne alors que le repos est fini depuis longtemps »).
 * Avant : le minuteur a l'ecran (RestBar) sonnait des qu'il voyait 0, meme en revenant dans l'app longtemps
 * apres (son horloge etait arretee en arriere plan). Maintenant :
 * 1. app au premier plan a la fin : le son joue ;
 * 2. app en arriere plan ou telephone verrouille a la fin : rien a l'ecran, seule la notification
 *    « Repos terminé » (lib/v2/seance/rappelRepos.ts) previent ;
 * 3. retour dans l'app apres la fin : aucun son, un petit message « Repos terminé » qui part tout seul ;
 * 4. retour avant la fin : le minuteur continue et sonne a la fin, comme en 1 ;
 * 5. minuteur de repos coupe : rien du tout.
 * Donnees pures.
 */

/** au dela, la fin a ete vue en retard (retour dans l'app) : pas de son */
export const RETARD_SON_MS = 2500;
/** duree du petit message au retour */
export const DUREE_MESSAGE_MS = 3000;

export type FinRepos = 'son' | 'discret' | 'attendre' | 'rien';

export function decisionFinRepos(o: { finMs: number | null; maintenant: number; etatApp: string; sansRepos?: boolean }): FinRepos {
  if (o.sansRepos || o.finMs === null || !Number.isFinite(o.finMs)) return 'rien';
  if (o.maintenant < o.finMs) return 'attendre';
  // en arriere plan : la notification s'en charge, l'ecran attend ton retour
  if (o.etatApp !== 'active') return 'attendre';
  return o.maintenant - o.finMs <= RETARD_SON_MS ? 'son' : 'discret';
}

/**
 * Revue du 30 octobre 2026 : 1,5 s apres la fin du repos, la barre se retire. Si tu as valide la serie suivante
 * entre temps, un NOUVEAU repos a commence : il ne doit pas etre efface. Seul le repos qui vient de finir part.
 */
export function retirerReposFini<D extends { restEndsAt?: number | null }>(d: D, fin: number | null): D {
  if (d.restEndsAt == null || d.restEndsAt !== fin) return d;
  return { ...d, restEndsAt: null };
}
