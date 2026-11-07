/**
 * Les appuis « Série faite » et « +15 s » faits hors de l'écran de la séance : Dynamic Island et écran verrouillé
 * (lib/v2/widgets/synchro.ts), et depuis le 28 octobre 2026 l'Apple Watch (lib/v2/montre/synchro.ts).
 * L'écran de la séance ouvert les prend (il garde la séance en mémoire) ; fermé, ils vont au brouillon
 * enregistré, que l'écran relit à son ouverture. Déplacé ici depuis lib/v2/widgets/synchro.ts, sans changement.
 *
 * 7 novembre 2026 : écran fermé (séance réduite), le rappel de fin de repos programmé par l'écran reste en place.
 * Un « passer » de la montre (Passer, Arrêter) ou un « arme » (la montre sonne ce repos) le retire ici, sinon le
 * téléphone sonnerait quand même (lib/v2/seance/sonneurRepos.ts).
 *
 * 7 novembre 2026 : des appuis arrivés pendant que l'écran charge la séance sont aussi gardés pour lui
 * (retenirActionsHorsEcran) : il les rejoue une fois la séance chargée, aucun n'est écrasé.
 */
import { annulerMinuteurRepos } from '@/lib/v2/widgets/activiteSeance';
import { appliquerActionsIle, retenirActionsHorsEcran, transmettreActionsIle } from './actionsIle';
import type { ActionIle } from './actionsIle';
import { ecrireBrouillon, loadDraft } from './model';
import type { MuscuDraft } from './model';
import { retirerRappelsRepos } from './rappelRepos';
import { chargerReglageFinRepos, montreSonne, noterFinSurMontre } from './sonneurRepos';

/** Faut il retirer le rappel de fin de repos du téléphone après ces appuis (écran fermé) ? */
export function rappelARetirer(avant: MuscuDraft, apres: MuscuDraft, actions: ActionIle[], reglage: 'montre' | 'iphone'): boolean {
  if (!actions.some((a) => a.type === 'passer' || a.type === 'arme')) return false;
  // repos coupé
  if (avant.restEndsAt != null && apres.restEndsAt == null) return true;
  // la montre sonne ce repos
  return montreSonne(apres, reglage);
}

export async function appliquerActionsIleApp(actions: ActionIle[]): Promise<void> {
  if (actions.length === 0) return;
  annulerMinuteurRepos();
  if (transmettreActionsIle(actions)) return;
  // 7 novembre 2026 : l'écran qui charge la séance en ce moment les rejouera (lib/v2/seance/actionsIle.ts)
  retenirActionsHorsEcran(actions);
  const d = await loadDraft();
  // l'écran a fini de charger pendant la lecture : il les prend, le brouillon n'est pas réécrit par dessus lui
  if (transmettreActionsIle(actions)) return;
  if (!d || d.kind !== 'muscu' || d.form || d.editId) return;
  const apres = appliquerActionsIle(d, actions);
  await ecrireBrouillon(apres);
  const reglage = await chargerReglageFinRepos();
  if (rappelARetirer(d, apres, actions, reglage)) {
    noterFinSurMontre(montreSonne(apres, reglage) ? apres.restEndsAt : null);
    await retirerRappelsRepos().catch(() => {});
  }
}
