/**
 * 1er novembre 2026 (audit de performance) : quand un ecran relit ses donnees (retour sur l'onglet, changement
 * ailleurs dans l'app) et qu'elles n'ont pas change, on garde le meme tableau. Les useMemo qui en dependent
 * (records, muscles de la semaine, historique groupe, frequence...) ne recalculent rien et l'ecran ne se redessine
 * pas pour rien. Si le contenu a change, le nouveau tableau est rendu, exactement comme avant.
 *
 * Comparaison par contenu (JSON) : les donnees relues de SQLite ou d'AsyncStorage sont des objets simples.
 */
export function memeContenu(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** A passer a un setState : setX((avant) => garderSiIdentique(avant, apres)) */
export function garderSiIdentique<T>(avant: T, apres: T): T {
  return memeContenu(avant, apres) ? avant : apres;
}
