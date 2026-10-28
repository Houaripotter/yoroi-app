/**
 * Coach vocal (28 octobre 2026) : le moteur qui décide QUOI dire et QUAND. Pur, sans React ni audio,
 * testé dans __tests__/unit/coachVocal.test.ts.
 *
 * Il reçoit des évènements de séance (génériques : la musculation aujourd'hui, le sprint plus tard) et le
 * réglage, et renvoie l'identifiant de la phrase à dire, ou null.
 *
 * Niveaux :
 *  - off : rien ;
 *  - discret : l'utile seulement. Début de séance (tu sais que le coach est là), dix secondes avant la fin du
 *    repos, reprise, dernière série, record, charge validée, fin de séance, et les phases d'intervalles ;
 *  - motivant : en plus, début de chaque exercice, encouragement quand il reste une série, dernières
 *    répétitions, ton objectif à la moitié de la séance, et une fois au plus « concentre toi ».
 *
 * Garde fous :
 *  - jamais deux phrases à moins de 20 s, sauf les repères du repos et des intervalles (prioritaires) ;
 *  - jamais la même variante deux fois de suite ;
 *  - au plus 6 encouragements par séance (encouragement, dernières répétitions, objectif, concentration).
 */
import { variantes, type Moment } from './phrases';

export type NiveauCoach = 'off' | 'discret' | 'motivant';

/** Objectif de l'onboarding ramené à 4 familles, sans chiffre */
export type ObjectifCoach = 'perte' | 'muscle' | 'combat' | 'forme';

export type ReglagesCoach = { niveau: NiveauCoach; objectif?: ObjectifCoach | null };

export type PhaseIntervalle = 'echauffement' | 'sprint' | 'recup';

export type EvenementCoach =
  | { type: 'sessionStart' }
  | { type: 'exerciseStart' }
  /** série validée : index (à partir de 0) parmi total séries de l'exercice */
  | { type: 'setDone'; index: number; total: number }
  /** secondes de repos restantes */
  | { type: 'restTick'; remaining: number }
  /** fin du repos ; derniereSerie : la série qui vient est la dernière de l'exercice */
  | { type: 'restEnd'; derniereSerie?: boolean }
  /** dernières répétitions ou dernières secondes d'un effort (exercice tenu, sprint) */
  | { type: 'lastReps' }
  | { type: 'record' }
  /** la règle de progression des programmes est remplie : la charge monte la prochaine fois */
  | { type: 'progressionOk' }
  | { type: 'sessionHalf' }
  /** l'app revient sans série validée longtemps après la fin du repos */
  | { type: 'distraction' }
  | { type: 'sessionEnd' }
  | { type: 'intervalStart'; phase: PhaseIntervalle; dernier?: boolean }
  | { type: 'intervalsEnd' };

export type EtatCoach = {
  /** heure de la dernière phrase dite, en ms */
  dernierMs: number | null;
  /** dernière phrase dite */
  dernierId: string | null;
  /** dernière variante dite pour chaque moment */
  parMoment: Partial<Record<Moment, string>>;
  encouragements: number;
  concentrationFaite: boolean;
  objectifFait: boolean;
  debutFait: boolean;
  finFaite: boolean;
};

export const COOLDOWN_MS = 20_000;
export const MAX_ENCOURAGEMENTS = 6;
/** secondes restantes du repos pour le repère « dix secondes » */
export const REPERE_REPOS_S = 10;

export function etatInitial(): EtatCoach {
  return { dernierMs: null, dernierId: null, parMoment: {}, encouragements: 0, concentrationFaite: false, objectifFait: false, debutFait: false, finFaite: false };
}

type Choix = { moment: Moment; prioritaire?: boolean; encouragement?: boolean; marque?: 'concentration' | 'objectif' | 'debut' | 'fin' };

function momentObjectif(o: ObjectifCoach | null | undefined): Moment {
  switch (o) {
    case 'perte': return 'rappel_objectif_perte';
    case 'muscle': return 'rappel_objectif_muscle';
    case 'combat': return 'rappel_objectif_combat';
    case 'forme': return 'rappel_objectif_forme';
    // objectif inconnu : la moitié de la séance, sans parler d'objectif
    default: return 'mi_seance';
  }
}

/** Le moment visé par un évènement, selon le niveau, avant les garde fous */
export function momentPour(ev: EvenementCoach, r: ReglagesCoach): Choix | null {
  if (r.niveau === 'off') return null;
  const motivant = r.niveau === 'motivant';
  switch (ev.type) {
    case 'sessionStart':
      return { moment: 'debut_seance', marque: 'debut' };
    case 'exerciseStart':
      return motivant ? { moment: 'debut_exo' } : null;
    case 'setDone':
      // il reste une seule série sur l'exercice
      return motivant && ev.total >= 2 && ev.total - ev.index - 1 === 1 ? { moment: 'encouragement', encouragement: true } : null;
    case 'restTick':
      return ev.remaining === REPERE_REPOS_S ? { moment: 'fin_repos_10s', prioritaire: true } : null;
    case 'restEnd':
      return { moment: ev.derniereSerie ? 'derniere_serie' : 'reprise', prioritaire: true };
    case 'lastReps':
      return motivant ? { moment: 'derniere_rep', encouragement: true } : null;
    case 'record':
      return { moment: 'record_battu' };
    case 'progressionOk':
      return { moment: 'progression_validee' };
    case 'sessionHalf':
      return motivant ? { moment: momentObjectif(r.objectif), encouragement: true, marque: 'objectif' } : null;
    case 'distraction':
      return motivant ? { moment: 'concentration', encouragement: true, marque: 'concentration' } : null;
    case 'sessionEnd':
      return { moment: 'fin_seance', prioritaire: true, marque: 'fin' };
    case 'intervalStart':
      if (ev.phase === 'sprint') return { moment: ev.dernier ? 'dernier_sprint' : 'sprint', prioritaire: true };
      return { moment: ev.phase, prioritaire: true };
    case 'intervalsEnd':
      return { moment: 'fin_intervalles', prioritaire: true };
    default:
      return null;
  }
}

/** Une variante du moment, jamais la dernière dite pour ce moment ni la dernière phrase tout court */
export function choisirVariante(moment: Moment, etat: EtatCoach, hasard: () => number = Math.random): string {
  const toutes = variantes(moment);
  const exclues = new Set([etat.parMoment[moment], etat.dernierId].filter(Boolean) as string[]);
  const possibles = toutes.filter((v) => !exclues.has(v));
  const liste = possibles.length ? possibles : toutes;
  const i = Math.min(liste.length - 1, Math.max(0, Math.floor(hasard() * liste.length)));
  return liste[i];
}

export type Decision = { phrase: string | null; etat: EtatCoach };

/** Décide la phrase pour un évènement et renvoie le nouvel état (l'ancien n'est pas modifié) */
export function decider(etat: EtatCoach, ev: EvenementCoach, r: ReglagesCoach, maintenant: number, hasard: () => number = Math.random): Decision {
  const choix = momentPour(ev, r);
  if (!choix) return { phrase: null, etat };
  if (choix.marque === 'debut' && etat.debutFait) return { phrase: null, etat };
  if (choix.marque === 'fin' && etat.finFaite) return { phrase: null, etat };
  if (choix.marque === 'concentration' && etat.concentrationFaite) return { phrase: null, etat };
  if (choix.marque === 'objectif' && etat.objectifFait) return { phrase: null, etat };
  if (choix.encouragement && etat.encouragements >= MAX_ENCOURAGEMENTS) return { phrase: null, etat };
  if (!choix.prioritaire && etat.dernierMs !== null && maintenant - etat.dernierMs < COOLDOWN_MS) return { phrase: null, etat };

  const phrase = choisirVariante(choix.moment, etat, hasard);
  const suivant: EtatCoach = {
    ...etat,
    dernierMs: maintenant,
    dernierId: phrase,
    parMoment: { ...etat.parMoment, [choix.moment]: phrase },
    encouragements: etat.encouragements + (choix.encouragement ? 1 : 0),
    concentrationFaite: etat.concentrationFaite || choix.marque === 'concentration',
    objectifFait: etat.objectifFait || choix.marque === 'objectif',
    debutFait: etat.debutFait || choix.marque === 'debut',
    finFaite: etat.finFaite || choix.marque === 'fin',
  };
  return { phrase, etat: suivant };
}

/** Objectifs de l'onboarding (lose, gain, combat, maintain) vers la famille du coach ; le premier compte */
export function objectifDuProfil(objectifs: readonly string[] | null | undefined): ObjectifCoach | null {
  const o = (objectifs ?? [])[0];
  if (o === 'lose') return 'perte';
  if (o === 'gain') return 'muscle';
  if (o === 'combat') return 'combat';
  if (o === 'maintain') return 'forme';
  return null;
}
