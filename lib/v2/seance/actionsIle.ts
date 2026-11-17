/**
 * Boutons de la séance dans la Dynamic Island et sur l'écran verrouillé (25 octobre 2026, idée de Lyesse).
 *
 * « Série faite » : tu appuies sans ouvrir l'app, la série est validée et le repos démarre.
 * Quand toutes les séries d'un exercice sont faites, la séance passe à l'exercice suivant.
 * « +15 s » : le repos en cours dure 15 secondes de plus.
 *
 * Le natif (ios/YoroiWidgets/Partage/SeanceIle.swift) avance tout seul l'affichage à partir du plan envoyé
 * ici (planIle), puis range l'appui dans la file partagée (App Group, la même que le « + 1 verre » des widgets).
 * L'app applique la file au retour (appliquerActionsIle) : le brouillon de la séance avance comme si tu avais
 * appuyé sur Valider dans l'écran. Données pures, testées dans __tests__/unit/actionsIle.test.ts.
 * Rien ne sort du téléphone.
 */
import type { LiveExercise, MuscuDraft } from './model';
import { reposApresSerie } from '@/lib/v2/seances/minuteurRepos';
import { TOLERANCE_FIN_MS, accuseValable } from './sonneurRepos';
import { reporterSerie } from '@/lib/v2/seances/seriesSaisie';

/** Un exercice tel que le natif le voit */
export type ExoIle = { id: string; nom: string; faites: number; total: number; repos: number };

/** Textes déjà traduits, avec {0} {1} {2} remplacés par le natif */
export type TextesIle = {
  /** « {0}, série {1} sur {2} » */
  serie: string;
  /** « Ensuite : {0}, série {1} » */
  ensuite: string;
  /** « Ensuite : {0} » */
  ensuiteExo: string;
  /** « Séance bouclée » */
  fini: string;
  /** « Série faite » */
  bouton: string;
  /** « +15 s » */
  plus15: string;
  /** « Repos terminé » (notification de fin de repos) */
  reposFini: string;
};

/** rappel : le natif peut programmer la notification de fin de repos (mêmes règles que lib/v2/seance/rappelRepos.ts) */
export type PlanIle = { exos: ExoIle[]; cur: number; debutMs: number; t: TextesIle; rappel?: boolean; maj?: number };

/**
 * Le repos prévu après une série de cet exercice (même règle que la validation dans l'écran).
 * 17 novembre 2026 : le repos de l'exercice d'abord (ton choix, le programme ou le conseil, reposConseille.ts) ;
 * une séance commencée avant garde l'ancienne règle.
 */
export function reposDe(d: MuscuDraft, ex: LiveExercise): number {
  if (ex.repos && ex.repos.sec > 0) return ex.repos.sec;
  return d.reposManuel ? d.restSec : ex.cible?.reposSec ?? d.restSec;
}

/** Le plan envoyé au natif avec la Live Activity de la séance */
export function planIle(d: MuscuDraft, t: TextesIle, nomDe: (e: LiveExercise) => string, rappel = false): PlanIle {
  const exos = d.exercises.map((e) => ({
    id: e.id,
    // la Live Activity est limitée à 4 Ko : noms courts
    nom: nomDe(e).slice(0, 28),
    faites: e.sets.filter((s) => s.done).length,
    total: e.sets.length,
    repos: Math.max(15, Math.round(reposDe(d, e))),
  }));
  const i = d.exercises.findIndex((e) => e.id === d.currentId);
  // maj : le natif ignore un plan plus ancien que son dernier appui (ios/Yoroi/Widgets/YoroiWidgetsModule.swift)
  // minuteur de repos coupe : le natif ne programme aucune notification de fin de repos
  return { exos, cur: i >= 0 ? i : 0, debutMs: d.startedAt, t, rappel: rappel && !d.sansRepos, maj: d.ile?.maj ?? 0 };
}

/**
 * Une action rangée par le natif dans la file partagée.
 * 7 novembre 2026, depuis l'Apple Watch (ios/YoroiWatch/Services/Synchro.swift) :
 * « repos » : un minuteur de la montre lancé pendant la séance devient le repos (secondes, fin exacte si connue) ;
 * « passer » : le repos de fin `fin` est coupé (Passer, ou Arrêter sur la sonnerie de la montre) ;
 * « arme » : la montre a armé sa sonnerie pour la fin `fin`, le téléphone se tait (lib/v2/seance/sonneurRepos.ts).
 */
export type TypeActionIle = 'serie' | 'repos15' | 'repos' | 'passer' | 'arme';
export type ActionIle = { id: string; type: TypeActionIle; exo?: string; at: number; secondes?: number; fin?: number };

const TYPES: readonly string[] = ['serie', 'repos15', 'repos', 'passer', 'arme'];

const estObjet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object';

/** Vrai pour les actions des boutons de la séance (les autres vont aux widgets et à la montre) */
export function estActionIle(x: unknown): boolean {
  return estObjet(x) && typeof x.type === 'string' && TYPES.includes(x.type);
}

const nombre = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** L'action lisible, ou null (id manquant, date folle) */
export function lireActionIle(x: unknown): ActionIle | null {
  if (!estObjet(x) || !estActionIle(x)) return null;
  const id = typeof x.id === 'string' && x.id ? x.id : null;
  const at = typeof x.at === 'number' && Number.isFinite(x.at) ? x.at : null;
  if (!id || at === null) return null;
  const exo = typeof x.exo === 'string' && x.exo ? x.exo : undefined;
  if (x.type === 'serie' && !exo) return null;
  const type = x.type as TypeActionIle;
  const secondes = nombre(x.secondes);
  const fin = nombre(x.fin);
  // un repos sans durée lisible (entre 1 s et 99 min), un accusé sans fin : ignorés
  if (type === 'repos' && (secondes === undefined || secondes < 1 || secondes > 99 * 60)) return null;
  if (type === 'arme' && fin === undefined) return null;
  const a: ActionIle = { id, type, exo, at };
  if (secondes !== undefined && type === 'repos') a.secondes = Math.round(secondes);
  if (fin !== undefined && type !== 'serie' && type !== 'repos15') a.fin = fin;
  return a;
}

/** Prochain exercice avec une série à faire, après l'index i (puis depuis le début) */
function suivant(exos: LiveExercise[], i: number): LiveExercise | null {
  for (let k = 1; k <= exos.length; k++) {
    const e = exos[(i + k) % exos.length];
    if (e && !e.laisse && e.sets.some((s) => !s.done)) return e;
  }
  return null;
}

/**
 * Applique les appuis à la séance, dans l'ordre. Une série validée garde les valeurs déjà remplies
 * (charge et répétitions pré-remplies depuis la dernière fois) ; sans répétitions, elle prend le bas
 * de la fourchette du programme, sinon les répétitions de la dernière fois, sinon 10.
 * Les records ne sont pas tamponnés ici : la validation dans l'écran garde ce rôle.
 */
export function appliquerActionsIle(d: MuscuDraft, actions: ActionIle[]): MuscuDraft {
  let r = d;
  for (const a of [...actions].sort((x, y) => x.at - y.at)) {
    // chaque appui une seule fois, même si la file n'a pas pu être vidée
    if (r.ile?.ids.includes(a.id)) continue;
    r = { ...r, ile: { maj: Math.max(r.ile?.maj ?? 0, a.at), ids: [...(r.ile?.ids ?? []), a.id].slice(-50) } };
    if (a.type === 'repos15') {
      if (r.restEndsAt != null && r.restEndsAt > a.at) r = { ...r, restEndsAt: r.restEndsAt + 15000, restTotal: r.restTotal + 15 };
      continue;
    }
    if (a.type === 'repos') {
      // minuteur de la montre pendant la séance : il devient le repos (un repos en cours est prolongé ou raccourci)
      const s = a.secondes ?? 0;
      const fin = a.fin !== undefined && Math.abs(a.fin - (a.at + s * 1000)) < 5000 ? a.fin : a.at + s * 1000;
      if (fin <= a.at) continue;
      const enCours = r.restEndsAt != null && r.restEndsAt > a.at;
      const total = enCours ? Math.max(1, Math.round(r.restTotal + (fin - (r.restEndsAt as number)) / 1000)) : s;
      r = { ...r, restEndsAt: fin, restTotal: total };
      continue;
    }
    if (a.type === 'passer') {
      // seul le repos visé est coupé : un repos relancé entre temps sur le téléphone reste
      if (r.restEndsAt != null && (a.fin === undefined || Math.abs(a.fin - r.restEndsAt) <= TOLERANCE_FIN_MS)) {
        r = { ...r, restEndsAt: null, reposSurMontre: null };
      }
      continue;
    }
    if (a.type === 'arme') {
      const ok = a.fin !== undefined ? accuseValable(r, a.fin, a.at) : null;
      if (ok) r = { ...r, reposSurMontre: ok };
      continue;
    }
    const i = r.exercises.findIndex((e) => e.id === a.exo);
    const ex = r.exercises[i];
    if (!ex) continue;
    const k = ex.sets.findIndex((s) => !s.done);
    if (k < 0) continue;
    const s = ex.sets[k];
    const reps = s.reps > 0 ? s.reps : ex.cible?.repsMin ?? s.prevReps ?? 10;
    // 17 novembre 2026 : les séries suivantes reprennent les valeurs de celle-ci, même règle que l'écran (seriesSaisie.ts)
    const sets = reporterSerie(ex.sets.map((x, j) => (j === k ? { ...x, reps, done: true } : x)), k);
    const exercises = r.exercises.map((e, j) => (j === i ? { ...e, sets } : e));
    const fait = sets.every((x) => x.done);
    const apres = fait ? suivant(exercises, i) : null;
    // repos : même valeur que l'île (15 s minimum) ; séance bouclée, plus de repos (comme l'île)
    const repos = Math.max(15, Math.round(reposDe(r, ex)));
    const boucle = fait && !apres;
    r = {
      ...r,
      exercises,
      currentId: fait && apres ? apres.id : ex.id,
      // 30 octobre 2026 : minuteur de repos coupe, pas de repos (lib/v2/seances/minuteurRepos.ts)
      // un exercice cardio n'a pas de repos apres
      ...reposApresSerie({ sansRepos: r.sansRepos, pasDeRepos: boucle || !!ex.cardio, secondes: repos, maintenant: a.at }),
    };
  }
  return r;
}

// L'écran de la séance ouvert s'abonne : il applique lui-même les appuis à son état en mémoire.
// Écran fermé : la synchro des widgets les applique au brouillon enregistré (lib/v2/widgets/synchro.ts).
/** renvoie false si l'écran ne peut pas les prendre (séance pas encore chargée, saisie après coup) */
type Ecouteur = (actions: ActionIle[]) => boolean;
let ecouteur: Ecouteur | null = null;

export function ecouterActionsIle(f: Ecouteur): () => void {
  ecouteur = f;
  return () => {
    if (ecouteur === f) ecouteur = null;
  };
}

/** Vrai si l'écran de la séance a pris les actions */
export function transmettreActionsIle(actions: ActionIle[]): boolean {
  if (!ecouteur || actions.length === 0) return false;
  return ecouteur(actions);
}

/*
 * 7 novembre 2026 : les séries validées sur la montre téléphone verrouillé ou hors de portée arrivent toutes au
 * retour, souvent au lancement de l'app, pendant que l'écran de la séance lit encore le brouillon. Elles partaient
 * au brouillon enregistré, puis l'écran écrivait par dessus la version qu'il venait de lire : séries perdues.
 * Elles sont maintenant gardées ici un moment, et l'écran les rejoue une fois la séance chargée (sans doublon :
 * chaque appui a son id, gardé dans la séance). 30 au plus, sous les 50 ids gardés par la séance.
 */
const HORS_ECRAN_MAX = 30;
let horsEcran: ActionIle[] = [];

/** Des appuis que l'écran n'a pas pu prendre (séance pas encore chargée) */
export function retenirActionsHorsEcran(actions: ActionIle[]): void {
  const ids = new Set(horsEcran.map((x) => x.id));
  const neuves = actions.filter((a) => (ids.has(a.id) ? false : (ids.add(a.id), true)));
  if (neuves.length) horsEcran = [...horsEcran, ...neuves].slice(-HORS_ECRAN_MAX);
}

/** Les appuis gardés faits pendant cette séance, pour l'écran qui vient de la charger ; la liste est vidée */
export function prendreActionsHorsEcran(debutSeanceMs: number): ActionIle[] {
  const l = horsEcran.filter((a) => a.at >= debutSeanceMs);
  horsEcran = [];
  return l;
}
