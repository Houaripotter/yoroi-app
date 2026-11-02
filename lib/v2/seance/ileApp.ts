/**
 * Les appuis « Série faite » et « +15 s » faits hors de l'écran de la séance : Dynamic Island et écran verrouillé
 * (lib/v2/widgets/synchro.ts), et depuis le 28 octobre 2026 l'Apple Watch (lib/v2/montre/synchro.ts).
 * L'écran de la séance ouvert les prend (il garde la séance en mémoire) ; fermé, ils vont au brouillon
 * enregistré, que l'écran relit à son ouverture. Déplacé ici depuis lib/v2/widgets/synchro.ts, sans changement.
 */
import { annulerMinuteurRepos } from '@/lib/v2/widgets/activiteSeance';
import { appliquerActionsIle, transmettreActionsIle } from './actionsIle';
import type { ActionIle } from './actionsIle';
import { ecrireBrouillon, loadDraft } from './model';

export async function appliquerActionsIleApp(actions: ActionIle[]): Promise<void> {
  if (actions.length === 0) return;
  annulerMinuteurRepos();
  if (transmettreActionsIle(actions)) return;
  const d = await loadDraft();
  if (!d || d.kind !== 'muscu' || d.form || d.editId) return;
  await ecrireBrouillon(appliquerActionsIle(d, actions));
}
