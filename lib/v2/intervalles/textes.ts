/**
 * Sprints guidés : les textes (traduits) et la suite de phases du moteur des chronos
 * (lib/v2/carnet/useChronoEngine.ts), une phase par étape, dans le même ordre.
 */
import type { ChronoPhase } from '@/lib/v2/carnet/useChronoEngine';
import { humanSeconds } from '@/lib/v2/carnet/format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import type { ChoixSprint, EtapeIntervalle, ReglagesIntervalles } from './plan';

export function nomChoix(c: ChoixSprint): string {
  switch (c) {
    case 'debutant': return traduire('Débutant');
    case 'intermediaire': return traduire('Intermédiaire');
    case 'confirme': return traduire('Confirmé');
    case 'quatre_quatre': return traduire('4 fois 4 minutes');
    default: return traduire('Personnaliser');
  }
}

/** « Sprint 3 sur 6 », « Récupération », « Échauffement », « Retour au calme » */
export function titreEtape(e: EtapeIntervalle): string {
  if (e.type === 'sprint') return traduire('Sprint {0} sur {1}', e.numero, e.total);
  if (e.type === 'recup') return traduire('Récupération');
  if (e.type === 'echauffement') return traduire('Échauffement');
  return traduire('Retour au calme');
}

/** Ce qu'il faut faire, sous le titre */
export function consigneEtape(e: EtapeIntervalle): string {
  if (e.type === 'sprint') return e.dernier ? traduire('Le dernier, à fond') : traduire('À fond');
  if (e.type === 'recup') return traduire('Marche ou trottine, respire');
  if (e.type === 'echauffement') return traduire('Trottine doucement, monte progressivement');
  return traduire('Marche, laisse redescendre ton souffle');
}

/** Forme courte pour « Ensuite » */
export function courtEtape(e: EtapeIntervalle): string {
  if (e.type === 'sprint') return traduire('Sprint {0}, {1}', e.numero, humanSeconds(e.duree));
  if (e.type === 'recup') return traduire('Récupération {0}', humanSeconds(e.duree));
  if (e.type === 'echauffement') return traduire('Échauffement {0}', humanSeconds(e.duree));
  return traduire('Retour au calme {0}', humanSeconds(e.duree));
}

/** « 6 sprints de 15 s, 1 min 30 de récupération » */
export function resumeSprints(r: ReglagesIntervalles): string {
  const s = traduirePluriel(r.sprints, r.sprints > 1, '{0} sprint de {1}', '{0} sprints de {1}', r.sprints, humanSeconds(r.sprint));
  return r.sprints > 1 ? traduire('{0}, {1} de récupération', s, humanSeconds(r.recup)) : s;
}

/** « Échauffement 5 min, retour au calme 5 min » (vide sans les deux) */
export function resumeAutour(r: ReglagesIntervalles): string {
  const parts: string[] = [];
  if (r.echauffement > 0) parts.push(traduire('échauffement {0}', humanSeconds(r.echauffement)));
  if (r.retourCalme > 0) parts.push(traduire('retour au calme {0}', humanSeconds(r.retourCalme)));
  const t = parts.join(', ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/** Notes de la séance enregistrée */
export function notesSeance(choix: ChoixSprint, r: ReglagesIntervalles, faits: number): string {
  const base = traduire('Sprints guidés, {0} : {1}', nomChoix(choix), resumeSprints(r));
  const autour = resumeAutour(r);
  const fait = faits < r.sprints ? traduire('{0} sur {1} faits', faits, r.sprints) : '';
  return [base, autour, fait].filter(Boolean).join('. ');
}

/** Une phase du moteur des chronos par étape : échauffement en préparation, sprint en effort, le reste en repos */
export function versPhasesChrono(plan: readonly EtapeIntervalle[]): ChronoPhase[] {
  return plan.map((e) => ({
    kind: e.type === 'sprint' ? 'effort' : e.type === 'echauffement' ? 'prepa' : 'repos',
    duration: e.duree,
    title: titreEtape(e),
    short: courtEtape(e),
    sub: consigneEtape(e),
    cue: e.type === 'sprint' ? 'go' : e.type === 'retour_calme' ? 'bell' : 'beep',
    ...(e.type === 'sprint' || e.type === 'recup' ? { step: e.numero, steps: e.total } : {}),
  }));
}

/** Notification d'un changement d'étape, téléphone verrouillé */
export function alerteEtape(e: EtapeIntervalle | null): { titre: string; texte: string } {
  if (!e) return { titre: traduire('Séance terminée'), texte: traduire('Bravo, tes sprints sont faits.') };
  if (e.type === 'sprint') return { titre: titreEtape(e), texte: traduire('{0} à fond.', humanSeconds(e.duree)) };
  if (e.type === 'recup') return { titre: traduire('Récupération'), texte: traduire('{0} pour souffler.', humanSeconds(e.duree)) };
  if (e.type === 'retour_calme') return { titre: traduire('Retour au calme'), texte: traduire('Sprints terminés. {0} de marche.', humanSeconds(e.duree)) };
  return { titre: traduire('Échauffement'), texte: humanSeconds(e.duree) };
}
