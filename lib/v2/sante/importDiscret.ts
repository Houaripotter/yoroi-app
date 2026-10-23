/**
 * Import santé « discret » (16 octobre 2026).
 * Au lancement, YOROI relit l'historique Apple Santé ou Health Connect au plus une fois par 24 h,
 * en filet de sécurité (les séances arrivent déjà en direct par l'observateur).
 * Ce filet ne montre plus le bandeau « Import santé » hérité des versions 1 et 2 :
 * seul un import que tu demandes (onboarding, connexion, réglages) l'affiche.
 * L'état partagé (importEtat.ts) reste publié : les écrans qui attendent la fin de l'import marchent pareil.
 */
let enCours = 0;

/** Vrai pendant un import lancé en discret : le bandeau ne s'affiche pas */
export function importDiscretEnCours(): boolean {
  return enCours > 0;
}

/** Lance l'import sans bandeau. Le marqueur est posé avant l'appel : l'événement de début est couvert. */
export async function lancerImportDiscret<T>(fn: () => Promise<T>): Promise<T> {
  enCours += 1;
  try {
    return await fn();
  } finally {
    enCours = Math.max(0, enCours - 1);
  }
}
