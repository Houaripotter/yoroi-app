/**
 * « Partir d'un modèle » dans Ta semaine (30 octobre 2026, Houari : « je veux pouvoir partir d'un Push Pull
 * + Upper Lower, puis le modifier »). Un modèle pose des briques (briques.ts) sur des jours précis : Push, Pull,
 * Jambes, Haut, Bas, Corps entier, un muscle par jour, Cardio, Abdos. Les exercices de chaque brique viennent des
 * programmes du catalogue (catalogue.ts), rien d'inventé quand le programme existe.
 * Tout reste modifiable ensuite dans l'écran (app/coach-construire.tsx).
 *
 * 30 octobre 2026, maquette validée (_propositions/ta_semaine_2026-10-30) :
 *  - les jours de chaque modèle sont écrits ici, jour par jour (le PPL et Upper Lower : Push, Pull, Jambes, repos,
 *    Haut, Bas, repos, comme le dit le programme) ;
 *  - « PPL deux fois » pose deux fois la même brique Push, Pull et Jambes (une seule à changer pour les deux jours) ;
 *  - des titres courts, jamais coupés à l'écran.
 * Données pures, testées dans __tests__/unit/modelesSemaine.test.ts.
 */
import { briqueParId, seanceDeBrique } from './briques';
import type { SeancePerso } from './monProgramme';
import type { JourProgramme, Programme } from './types';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

export type ModeleSemaine = {
  id: string;
  /** titre court (traduit à l'affichage) */
  titre: string;
  sticker: NomSticker;
  /** du lundi (0) au dimanche (6) : la brique posée ce jour, null = repos */
  jours: (string | null)[];
};

const _ = null;

/** Les modèles proposés, dans l'ordre demandé par Houari (les 4 premiers sont montrés d'abord) */
export const MODELES_SEMAINE: ModeleSemaine[] = [
  { id: 'corps-2', titre: 'Corps entier, 2 jours', sticker: 'corps', jours: ['corps', _, _, 'corps', _, _, _] },
  { id: 'corps-3', titre: 'Corps entier, 3 jours', sticker: 'corps', jours: ['corps', _, 'corps', _, 'corps', _, _] },
  { id: 'ppl-3', titre: 'PPL, 3 jours', sticker: 'musculation', jours: ['push', _, 'pull', _, 'jambes', _, _] },
  { id: 'ppl-6', titre: 'PPL deux fois, 6 jours', sticker: 'force_eclair', jours: ['push', 'pull', 'jambes', 'push', 'pull', 'jambes', _] },
  { id: 'ul-4', titre: 'Upper Lower, 4 jours', sticker: 'muscle', jours: ['haut', 'bas', _, 'haut', 'bas', _, _] },
  { id: 'ppl-ul-5', titre: 'PPL et Upper Lower, 5 jours', sticker: 'force', jours: ['push', 'pull', 'jambes', _, 'haut', 'bas', _] },
  { id: 'pp-ul-4', titre: 'Push Pull et Upper Lower, 4 jours', sticker: 'grip', jours: ['push', 'pull', _, 'haut', 'bas', _, _] },
  { id: 'arnold-6', titre: 'Split Arnold, 6 jours', sticker: 'enclume', jours: ['pecs_dos', 'epaules_bras', 'jambes', 'pecs_dos', 'epaules_bras', 'jambes', _] },
  { id: 'muscle-5', titre: 'Un muscle par jour, 5 jours', sticker: 'barre', jours: ['pecs', 'dos', 'jambes', 'epaules', 'bras', _, _] },
  { id: 'corps-cardio', titre: 'Corps entier et cardio, 3 et 2 jours', sticker: 'cardio_zone2', jours: ['corps', 'cardio', 'corps', 'cardio', 'corps', _, _] },
  { id: 'cardio-3', titre: 'Juste cardio, 3 jours', sticker: 'cardio_zone2', jours: ['cardio', _, 'cardio', _, 'cardio', _, _] },
  { id: 'abdos-3', titre: 'Juste abdos, 3 jours', sticker: 'abdos', jours: ['abdos', _, 'abdos', _, 'abdos', _, _] },
];

/** Combien de modèles sont montrés avant « Voir tous les modèles » */
export const MODELES_VISIBLES = 4;

/** Un modèle utilisable : sept jours, au moins une brique, toutes connues */
export function modeleValide(m: ModeleSemaine): boolean {
  return m.jours.length === 7 && m.jours.some((c) => !!c) && m.jours.every((c) => c === null || !!briqueParId(c));
}

/** Les modèles, dans l'ordre, sans ceux qui manqueraient */
export function modelesDisponibles(): ModeleSemaine[] {
  return MODELES_SEMAINE.filter(modeleValide);
}

/** Les jours d'entraînement du modèle (0 = lundi) */
export function joursDuModele(m: ModeleSemaine): number[] {
  return m.jours.map((c, d) => (c ? d : -1)).filter((d) => d >= 0);
}

/** Les sept jours remplis avec les briques du modèle, null les jours de repos ; tes exercices écartés remplacés */
export function semaineDuModele(m: ModeleSemaine, ecartes: ReadonlySet<string> = new Set()): (SeancePerso | null)[] {
  return m.jours.slice(0, 7).map((c) => (c ? seanceDeBrique(c, ecartes) ?? null : null));
}

/** Le modèle choisi correspond encore à ta semaine (rien changé depuis) : sa carte reste marquée */
export function semaineEgaleAuModele(semaine: readonly (SeancePerso | null)[], m: ModeleSemaine, ecartes: ReadonlySet<string> = new Set()): boolean {
  const ref = semaineDuModele(m, ecartes);
  // l'identité de la séance (sid, monProgramme.ts) ne compte pas, seulement la brique et son contenu
  const sansSid = (s: SeancePerso | null) => { if (!s || !s.exos.length) return null; const { sid: _sid, ...reste } = s; return reste; };
  return semaine.length === 7 && semaine.every((s, d) => JSON.stringify(sansSid(s)) === JSON.stringify(sansSid(ref[d] ?? null)));
}

/* ---------------------------------- une séance d'un programme du catalogue ---------------------------------- */

/** Un programme dont toutes les séances sont des séances d'exercices (pas de rounds, pas de cardio) */
export function modeleUtilisable(p: Programme | undefined | null): p is Programme {
  return !!p && p.jours.length > 0 && p.jours.every((j) => !j.rounds && !j.cardio && j.exos.length > 0);
}

const NOMS_COURTS: Record<string, string> = { Legs: 'Jambes', Upper: 'Haut du corps', Lower: 'Bas du corps' };

/**
 * Le nom court d'une séance du catalogue : « Push : pectoraux, épaules, triceps » devient « Push »,
 * « Legs A, force » devient « Jambes A », « Upper : haut du corps » devient « Haut du corps ».
 */
export function nomCourt(titre: string): string {
  const avant = titre.split(' : ')[0].split(',')[0].trim();
  const [mot, ...reste] = avant.split(' ');
  const court = [NOMS_COURTS[mot] ?? mot, ...reste].join(' ').trim();
  return (court || titre).slice(0, 40);
}

/** Une séance d'un programme, copiée pour ta semaine (une séance d'un autre programme), avec son nom court */
export function seanceDepuisJour(j: JourProgramme): SeancePerso {
  return {
    titre: nomCourt(j.titre),
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
