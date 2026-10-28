/**
 * Reprendre une saisie laissée en plan (28 octobre 2026, audit « ne jamais perdre de données ») : saisie après
 * coup ou modification d'une séance déjà enregistrée, gardée à chaque changement (useSauvegardeBrouillon,
 * model.ts sauverSaisie). À l'ouverture de l'écran, si une saisie de ce sport ou de cette séance est gardée,
 * on propose de la reprendre ; sinon l'écran part de `base`.
 */
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';
import { chargerSaisie, effacerSaisie } from './model';
import type { SeanceDraft } from './model';

/** Le contenu, sans les heures d'écriture : une modification ouverte puis laissée telle quelle n'est rien à reprendre */
function contenu(d: SeanceDraft): string {
  const { startedAt: _s, majMs: _m, savedAt: _v, ...reste } = d as SeanceDraft & { savedAt?: number };
  return JSON.stringify(reste);
}

/** Une saisie après coup où quelque chose a été noté */
export function saisieRemplie(d: SeanceDraft): boolean {
  if (d.kind === 'muscu') return d.exercises.length > 0 || !!d.notes.trim();
  if (d.kind === 'combat') return d.rounds.some((r) => !!(r.intensity || r.partner || r.result || r.method || r.notes)) || !!d.notes.trim() || !!d.theme.trim();
  return !!(d.distance.trim() || d.calories.trim() || d.heartRate.trim() || d.notes.trim());
}

export async function offrirSaisie<D extends SeanceDraft>(base: D, appliquer: (d: D) => void): Promise<void> {
  const g = await chargerSaisie(base.kind, base.editId).catch(() => null);
  const rien = !g || g.kind !== base.kind || (base.editId ?? null) !== (g.editId ?? null)
    || (base.editId ? contenu(g) === contenu(base) : !saisieRemplie(g));
  if (rien) {
    appliquer(base);
    return;
  }
  const edit = !!base.editId;
  appAlert(
    edit ? traduire('Tu modifiais cette séance') : traduire('Reprendre ta saisie ?'),
    edit ? traduire('Tes changements n’ont pas été enregistrés. Tu les reprends ?') : traduire('Tu avais commencé à noter une séance. Tu la reprends ?'),
    [
      {
        text: edit ? traduire('Repartir de la séance') : traduire('Nouvelle saisie'),
        style: 'destructive',
        onPress: () =>
          appAlert(traduire('Effacer la saisie gardée ?'), traduire('Elle ne sera pas enregistrée.'), [
            { text: traduire('Reprendre'), style: 'cancel', onPress: () => appliquer(g as D) },
            { text: traduire('Effacer'), style: 'destructive', onPress: () => { void effacerSaisie(base); appliquer(base); } },
          ], { cancelable: false }),
      },
      { text: traduire('Reprendre'), style: 'primary', onPress: () => appliquer(g as D) },
    ],
    { cancelable: false },
  );
}
