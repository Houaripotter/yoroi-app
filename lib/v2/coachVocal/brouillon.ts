/**
 * Coach vocal (28 octobre 2026) : les évènements de la séance de musculation en direct, lus en comparant
 * deux états successifs du brouillon (lib/v2/seance/model.ts). Pur et testé : l'écran de séance n'a qu'un
 * appel à ajouter (useCoachVocal), aucun évènement à émettre à la main à chaque bouton.
 */
import type { LiveExercise, MuscuDraft } from '@/lib/v2/seance/model';
import { proposer, proposerLibre, type SerieFaite } from '@/lib/v2/programmes/progression';
import type { EvenementCoach } from './moteur';

/** Séries de travail faites d'un exercice (sans l'échauffement), comme l'historique les lira */
export function seriesFaites(ex: LiveExercise): SerieFaite[] {
  return ex.sets
    .filter((s) => s.done && s.type !== 'warmup' && ((Number(s.weight) || 0) > 0 || (Number(s.reps) || 0) > 0))
    .map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }));
}

/**
 * La règle de progression de l'app (lib/v2/programmes/progression.ts, ACSM 2009) sera remplie à la prochaine
 * séance : cette séance et la précédente ont atteint le haut, à la même charge. On rejoue exactement
 * proposer (programme) ou proposerLibre (hors programme) avec cette séance en tête.
 * `precedentes` : les séances passées sur l'exercice, de la plus récente à la plus ancienne.
 */
export function chargeVaMonter(ex: LiveExercise, precedentes: SerieFaite[][]): boolean {
  const cur = seriesFaites(ex);
  if (!cur.length) return false;
  const historique = [cur, ...precedentes];
  const c = ex.cible;
  if (c) {
    if (c.raison === 'legere') return false;
    const exo = { nom: ex.name, muscle: ex.muscle ?? '', series: ex.sets.length, repsMin: c.repsMin, repsMax: c.repsMax, reposSec: c.reposSec, secondes: c.secondes };
    return proposer(exo, historique).raison === 'monte';
  }
  return proposerLibre(historique)?.raison === 'monte';
}

function faites(ex: LiveExercise | undefined): number {
  return ex ? ex.sets.filter((s) => s.done).length : 0;
}

/** Séries prévues de la séance : faites, plus celles qui restent (un exercice laissé ne compte plus) */
export function seriesPrevuesSeance(d: MuscuDraft): { faites: number; prevues: number } {
  let f = 0;
  let p = 0;
  for (const e of d.exercises) {
    const n = faites(e);
    f += n;
    p += n + (e.laisse ? 0 : e.sets.length - n);
  }
  return { faites: f, prevues: p };
}

/** La séance est autour de sa moitié : entre 50 et 75 % des séries prévues, au moins 4 séries prévues */
export function autourDeLaMoitie(d: MuscuDraft): boolean {
  const { faites: f, prevues: p } = seriesPrevuesSeance(d);
  return p >= 4 && f * 2 >= p && f * 4 < p * 3;
}

/**
 * Évènements entre deux états du brouillon, par ordre de priorité (le moteur garde le premier qui parle,
 * le délai entre deux phrases fait taire les suivants) : record, charge validée, moitié, série, exercice.
 * `progression` : vrai si la charge montera la prochaine fois sur cet exercice (chargeVaMonter).
 */
export function evenementsEntre(avant: MuscuDraft | null, apres: MuscuDraft, progression?: (ex: LiveExercise) => boolean): EvenementCoach[] {
  if (!avant) return [];
  const out: EvenementCoach[] = [];
  const serie: EvenementCoach[] = [];
  let record = false;
  let monte = false;
  let nouvelleSerie = false;
  for (const ex of apres.exercises) {
    const ancien = avant.exercises.find((e) => e.id === ex.id);
    const dejaFaites = new Set((ancien?.sets ?? []).filter((s) => s.done).map((s) => s.id));
    const nouvelles = ex.sets.filter((s) => s.done && !dejaFaites.has(s.id));
    if (!nouvelles.length) continue;
    nouvelleSerie = true;
    if (nouvelles.some((s) => s.record)) record = true;
    const fini = ex.sets.length > 0 && ex.sets.every((s) => s.done);
    if (fini && progression) {
      try {
        if (progression(ex)) monte = true;
      } catch {
        // une erreur de calcul ne doit jamais gêner la séance
      }
    }
    serie.push({ type: 'setDone', index: faites(ex) - 1, total: ex.sets.length });
  }
  if (record) out.push({ type: 'record' });
  if (monte) out.push({ type: 'progressionOk' });
  if (nouvelleSerie && autourDeLaMoitie(apres)) out.push({ type: 'sessionHalf' });
  out.push(...serie);
  if (apres.currentId && apres.currentId !== avant.currentId) {
    const cur = apres.exercises.find((e) => e.id === apres.currentId);
    if (cur && faites(cur) === 0) out.push({ type: 'exerciseStart' });
  }
  return out;
}

/** À la fin du repos : la série qui vient est la dernière de l'exercice en cours */
export function prochaineEstDerniere(d: MuscuDraft): boolean {
  const cur = d.exercises.find((e) => e.id === d.currentId);
  if (!cur || cur.laisse) return false;
  const restantes = cur.sets.filter((s) => !s.done).length;
  return restantes === 1 && cur.sets.length >= 2;
}
