/**
 * Le coach en direct pendant la séance de musculation (25 octobre 2026, demandé par Houari) : une phrase en haut
 * de l'écran, qui change à chaque moment de la séance. Début, repos (la prochaine série avec sa charge), dernière
 * série d'un exercice, moitié de la séance, dernière série de la séance. « Champion » ou « championne ».
 * Données pures (texte déjà traduit), testées dans __tests__/unit/coachSeance.test.ts.
 */
import { traduire } from '@/lib/i18n/tr';
import { champion } from '@/lib/v2/programmes/coach';
import type { MuscuDraft } from './model';

export type MomentCoach = 'debut' | 'repos' | 'derniere' | 'fin' | 'moitie' | 'effort';

export type CoachSeance = { moment: MomentCoach; texte: string };

const EFFORT = [
  'Priorité à la technique : chaque répétition propre compte, {0}.',
  'Contrôle la descente, pousse fort à la montée. Tu gères, {0}.',
  'Garde 1 à 2 répétitions en réserve : régulier, c’est comme ça qu’on progresse.',
  'Une série à la fois. Tu es là, tu le fais, {0}.',
];

const REPOS_SANS = [
  'Respire, récupère. La prochaine série va être bonne, {0}.',
  'Repos. Bois une gorgée, relâche les épaules, et on repart.',
];

/** charge : texte de la charge déjà formaté (« 80 kg », « 175 lb ») ou vide au poids du corps */
export function coachSeance(d: MuscuDraft, opts: { femme: boolean; maintenant: number; charge: (kg: number) => string; nom: (n: string) => string }): CoachSeance | null {
  const ex = d.exercises.find((e) => e.id === d.currentId) ?? d.exercises[0];
  if (!ex) return null;
  const ch = champion(opts.femme);
  const total = d.exercises.reduce((n, e) => n + e.sets.length, 0);
  const faites = d.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const reste = total - faites;
  const graine = faites;
  const pick = (l: string[]) => l[graine % l.length];
  const iProchaine = ex.sets.findIndex((s) => !s.done);
  const prochaine = iProchaine >= 0 ? ex.sets[iProchaine] : null;
  const nom = opts.nom(ex.name);

  if (faites === 0) return { moment: 'debut', texte: traduire('C’est parti, {0}. Première série : reste concentré et garde 2 répétitions en réserve.', ch) };

  if (d.restEndsAt != null && d.restEndsAt > opts.maintenant) {
    if (prochaine && prochaine.reps > 0) {
      const c = prochaine.weight > 0 ? opts.charge(prochaine.weight) : '';
      return {
        moment: 'repos',
        texte: c
          ? traduire('Respire. Prochaine série : {0}, {1} répétitions à {2}.', nom, prochaine.reps, c)
          : traduire('Respire. Prochaine série : {0}, {1} répétitions.', nom, prochaine.reps),
      };
    }
    return { moment: 'repos', texte: traduire(pick(REPOS_SANS), ch) };
  }

  if (reste === 1) return { moment: 'fin', texte: traduire('Dernière série de la séance. Termine fort, {0}.', ch) };
  if (prochaine && ex.sets.length > 1 && iProchaine === ex.sets.length - 1) return { moment: 'derniere', texte: traduire('Dernière série de {0}. Donne tout, {1}.', nom, ch) };
  if (total >= 6 && faites === Math.floor(total / 2)) return { moment: 'moitie', texte: traduire('La moitié est faite. Ne lâche rien, {0}.', ch) };
  return { moment: 'effort', texte: traduire(pick(EFFORT), ch) };
}
