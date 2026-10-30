/**
 * « Partir d'un modèle » dans Ta semaine (30 octobre 2026, Houari : « je veux pouvoir partir d'un Push Pull
 * + Upper Lower, puis le modifier »). Un modèle remplit les sept jours avec les séances d'un programme qui
 * existe déjà dans le catalogue (catalogue.ts) : mêmes exercices, séries, répétitions et repos, rien d'inventé.
 * Tout reste modifiable ensuite dans l'écran (app/coach-construire.tsx).
 *
 * Les jours :
 *  - un programme à la semaine (une séance par jour d'entraînement) : le plan de départ de l'app
 *    (planJours.ts planParDefaut avec les jours conseillés de suivi.ts), le même qu'en commençant le programme ;
 *  - un programme en boucle (Séance A et Séance B sur trois jours) : les jours conseillés, les séances
 *    s'enchaînent dans l'ordre (A, B, A), comme le dit le programme.
 * Données pures, testées dans __tests__/unit/modelesSemaine.test.ts.
 */
import { programmeParId } from './catalogue';
import { estPlanFixe, planParDefaut } from './planJours';
import { joursConseilles } from './suivi';
import type { SeancePerso } from './monProgramme';
import type { JourProgramme, Programme } from './types';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

/** Les modèles proposés, dans l'ordre de l'écran : un id du catalogue et son sticker (aucune image nouvelle) */
export const MODELES_SEMAINE: { id: string; sticker: NomSticker }[] = [
  { id: 'ppl-3j', sticker: 'musculation' },
  { id: 'haut-bas-4j', sticker: 'corps' },
  { id: 'pp-ul-4j', sticker: 'muscle' },
  { id: 'ppl-ul-5j', sticker: 'force' },
  { id: 'ppl-6j', sticker: 'force_eclair' },
  { id: 'debutant-fullbody-3j', sticker: 'debuter' },
];

/** Un modèle utilisable : il existe et toutes ses séances sont des séances d'exercices */
export function modeleUtilisable(p: Programme | undefined | null): p is Programme {
  return !!p && p.jours.length > 0 && p.jours.every((j) => !j.rounds && !j.cardio && j.exos.length > 0);
}

/** Les modèles du catalogue, dans l'ordre, sans ceux qui manqueraient */
export function modelesDisponibles(): { programme: Programme; sticker: NomSticker }[] {
  return MODELES_SEMAINE.map((m) => ({ programme: programmeParId(m.id), sticker: m.sticker }))
    .filter((m): m is { programme: Programme; sticker: NomSticker } => modeleUtilisable(m.programme));
}

/** Une séance du programme, copiée pour ta semaine (comme « Garder comme mon programme », suivi.ts) */
export function seanceDepuisJour(j: JourProgramme): SeancePerso {
  return {
    titre: j.titre.slice(0, 40),
    exos: j.exos.map((e) => ({
      nom: e.nom,
      muscle: e.muscle,
      series: e.series,
      repsMin: e.repsMin,
      repsMax: e.repsMax,
      reposSec: e.reposSec,
      ...(e.conseil ? { conseil: e.conseil } : {}),
      ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}),
      ...(e.secondes ? { secondes: true } : {}),
    })),
  };
}

/** Les sept jours (lundi 0 à dimanche 6) remplis avec ce programme, null les jours de repos */
export function semaineDuModele(p: Programme): (SeancePerso | null)[] {
  const semaine: (SeancePerso | null)[] = [null, null, null, null, null, null, null];
  if (!modeleUtilisable(p)) return semaine;
  const plan = estPlanFixe(p) ? planParDefaut(p, null, joursConseilles) : null;
  if (plan) {
    plan.forEach((jour, i) => {
      if (jour >= 0 && jour <= 6) semaine[jour] = seanceDepuisJour(p.jours[i]);
    });
    return semaine;
  }
  joursConseilles(p.joursParSemaine).forEach((jour, k) => {
    if (jour >= 0 && jour <= 6) semaine[jour] = seanceDepuisJour(p.jours[k % p.jours.length]);
  });
  return semaine;
}

/** Le modèle choisi correspond encore à ta semaine (rien changé depuis) : sa carte reste marquée */
export function semaineEgaleAuModele(semaine: readonly (SeancePerso | null)[], p: Programme): boolean {
  const m = semaineDuModele(p);
  return semaine.length === 7 && semaine.every((s, d) => JSON.stringify(s && s.exos.length ? s : null) === JSON.stringify(m[d]));
}
