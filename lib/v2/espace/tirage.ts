/**
 * 14 octobre : le tirage de la scene qui change a chaque ouverture. Logique pure, sans stockage ni React
 * (testee dans __tests__/unit/tirageScene.test.ts).
 * Une scene du pack au hasard, jamais la meme que la precedente. Nouveau tirage a chaque ouverture a froid
 * de l'app ET quand l'app revient au premier plan apres au moins 30 minutes en arriere-plan
 * (sur iPhone l'app est rarement fermee pour de bon : sans ce retour, la scene ne changeait presque jamais).
 */

/** Temps passe en arriere-plan au-dela duquel le retour au premier plan compte comme une nouvelle ouverture */
export const DELAI_NOUVELLE_OUVERTURE_MS = 30 * 60 * 1000;

/**
 * Une scene de la liste au hasard, differente de la precedente quand c'est possible.
 * hasard : un nombre de 0 (inclus) a 1 (exclu), Math.random par defaut.
 */
export function tirerScene<T extends string>(liste: readonly T[], precedente: string | null | undefined, hasard: () => number = Math.random): T | null {
  const uniques = Array.from(new Set(liste));
  if (!uniques.length) return null;
  const choix = uniques.length > 1 ? uniques.filter((id) => id !== precedente) : uniques;
  const r = Math.min(0.999999, Math.max(0, hasard()));
  return choix[Math.floor(r * choix.length)] ?? choix[0];
}

/** Vrai si le retour au premier plan doit tirer une nouvelle scene */
export function retourCommeOuverture(arrierePlanDepuis: number | null | undefined, maintenant: number, delai: number = DELAI_NOUVELLE_OUVERTURE_MS): boolean {
  if (arrierePlanDepuis == null || !Number.isFinite(arrierePlanDepuis)) return false;
  return maintenant - arrierePlanDepuis >= delai;
}

/** Stockage de la derniere scene tiree (AsyncStorage dans l'app, une Map dans les tests) */
export type MemoireDerniere = { lire: () => Promise<string | null>; ecrire: (scene: string) => Promise<void> };

/**
 * Le tirage d'une ouverture de l'app : une scene par pack, la meme pour tous les ecrans tant que l'app reste ouverte,
 * et une nouvelle a la prochaine ouverture (a froid, ou retour au premier plan apres le delai).
 * etat() recoit les changements d'AppState ; il renvoie vrai quand une nouvelle ouverture commence
 * (la scene affichee doit alors etre relue).
 */
export function creerTirage(o: { memoire: MemoireDerniere; maintenant?: () => number; hasard?: () => number; delai?: number }) {
  const maintenant = o.maintenant ?? Date.now;
  let courant: { pack: string; scene: string } | null = null;
  let enCours: { pack: string; p: Promise<string> } | null = null;
  let arrierePlanDepuis: number | null = null;

  async function scene<T extends string>(pack: string, liste: readonly T[]): Promise<T> {
    if (courant && courant.pack === pack) return courant.scene as T;
    if (enCours && enCours.pack === pack) return (await enCours.p) as T;
    const p = (async () => {
      let derniere: string | null = null;
      try { derniere = await o.memoire.lire(); } catch { derniere = null; }
      const s = tirerScene(liste, derniere) ?? liste[0];
      courant = { pack, scene: s };
      try { await o.memoire.ecrire(s); } catch { /* sans stockage, un nouveau tirage a la prochaine ouverture */ }
      return s;
    })();
    enCours = { pack, p };
    try {
      return (await p) as T;
    } finally {
      if (enCours?.p === p) enCours = null;
    }
  }

  function etat(e: string): boolean {
    if (e !== 'active') {
      if (arrierePlanDepuis === null) arrierePlanDepuis = maintenant();
      return false;
    }
    const depuis = arrierePlanDepuis;
    arrierePlanDepuis = null;
    if (!courant || !retourCommeOuverture(depuis, maintenant(), o.delai)) return false;
    courant = null;
    return true;
  }

  return { scene, etat };
}
