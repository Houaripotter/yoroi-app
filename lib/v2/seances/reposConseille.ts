/**
 * Repos conseille par exercice (17 novembre 2026, retour de Houari : « ce serait bien qu'il me donne lui-meme les
 * temps de repos qu'il me faut en fonction des exercices et de ce que je souhaite. La, je ne sais pas trop combien
 * je dois prendre »).
 *
 * Ordre de decision, pour chaque exercice de la seance :
 * 1. ton choix : tu as change le repos de cet exercice (boutons - et +), il est garde sur le telephone et repris
 *    les fois suivantes (AsyncStorage, aucune table touchee) ;
 * 2. le repos prevu par ton programme (lib/v2/programmes, ExoProgramme.reposSec) ;
 * 3. sinon, le repos conseille selon ton objectif et le type de mouvement, ci-dessous.
 *
 * Valeurs retenues (une seule par case, toutes dans les fourchettes des sources, multiples de 15 s pour les
 * boutons - et +) :
 *                     gros mouvement lourd   polyarticulaire   isolation
 *   force                  3 min                 2 min 30        1 min 30
 *   prise de muscle        2 min                 1 min 30        1 min 15
 *   endurance, perte       1 min                 1 min           45 s
 *
 * Sources :
 * - American College of Sports Medicine, « Progression models in resistance training for healthy adults »,
 *   position stand, Med Sci Sports Exerc 2009;41(3):687-708 : force, au moins 2 a 3 min sur les gros mouvements
 *   lourds, 1 a 2 min sur les mouvements d'assistance ; hypertrophie, 1 a 2 min ; endurance musculaire, 30 s a
 *   1 min pour 10 a 15 repetitions et plus.
 * - NSCA, Essentials of Strength Training and Conditioning (4e edition, 2016), chapitre « Program design for
 *   resistance training » : force 2 a 5 min, hypertrophie 30 s a 1 min 30, endurance 30 s ou moins.
 * - Schoenfeld et al., « Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained
 *   men », J Strength Cond Res 2016;30(7):1805-1812 : 3 min font mieux que 1 min sur les gros mouvements, pour la
 *   force et pour le muscle.
 * - Singer et al., « Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest
 *   interval duration on muscle hypertrophy », Front Sports Act Living 2024;6:1429789 : un petit avantage au-dela de
 *   60 s, aucun gain net au-dela de 90 s environ.
 * D'ou : force lourd 3 min (haut de la fourchette demandee, 2 min 30 a 3 min) ; muscle polyarticulaire 1 min 30 a
 * 2 min (2 min pour les gros mouvements lourds, Schoenfeld 2016) ; muscle isolation 1 min 15 (entre 60 et 90 s,
 * Singer 2024) ; endurance et perte de poids 45 s a 1 min (ACSM 2009).
 *
 * Fonctions pures testees dans __tests__/unit/reposConseille.test.ts, plus la memoire de tes choix (AsyncStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traduire } from '@/lib/i18n/tr';
import { niveauDe } from '@/lib/v2/programmes/ordre';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { cleExercice } from '@/lib/v2/seance/history';
import { nomBibliotheque } from '@/lib/v2/seance/rechercheExo';

export type ObjectifRepos = 'force' | 'muscle' | 'endurance';
export type TypeMouvement = 'lourd' | 'poly' | 'isolation';
export type RaisonRepos = 'toi' | 'programme' | `${ObjectifRepos}_${TypeMouvement}`;
export type ReposExo = { sec: number; raison: RaisonRepos };

export const REPOS_CONSEILLE: Record<ObjectifRepos, Record<TypeMouvement, number>> = {
  force: { lourd: 180, poly: 150, isolation: 90 },
  muscle: { lourd: 120, poly: 90, isolation: 75 },
  endurance: { lourd: 60, poly: 60, isolation: 45 },
};

/** bornes du minuteur de repos (comme les boutons - et + de la seance) */
export const REPOS_MIN = 15;
export const REPOS_MAX = 600;

export function reposValide(sec: unknown): sec is number {
  return typeof sec === 'number' && Number.isFinite(sec) && sec >= REPOS_MIN && sec <= REPOS_MAX;
}

const plier = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Gros mouvements lourds a la barre ou a la presse : squat, developpe couche, souleve de terre, rowing barre... */
const LOURD = /squat barre|back squat|front squat|box squat|pause squat|pin squat|safety bar squat|anderson squat|hack squat|belt squat|pendulum squat|smith machine squat|deadlift|souleve de terre|rack pull|developpe couche \(barre\)|developpe incline \(barre\)|developpe decline \(barre\)|bench press|developpe militaire|overhead press|push press|rowing barre|rowing pendlay|rowing t-bar|barbell row|presse a cuisses|leg press|hip thrust barre/;
/** isolation que la regle des programmes (niveauDe) ne voit pas */
const ISOLATION_EN_PLUS = /calf|mollet|lateral raise|fly\b|kickback|pushdown|leg curl|leg extension|crunch|gainage|planche|plank/;

/** Type de mouvement d'un exercice, d'apres son nom (et le nom de la bibliotheque du meme exercice) */
export function typeMouvement(nom: string, muscle?: string | null): TypeMouvement {
  const noms = [nom, nomBibliotheque(nom)].filter((x, i, l) => !!x && l.indexOf(x) === i);
  const groupe = (muscle ?? '').toUpperCase();
  const iso = groupe === 'ABDOS' || noms.some((n) => niveauDe({ nom: n, muscle: groupe } as ExoProgramme) > 0 || ISOLATION_EN_PLUS.test(plier(n)));
  if (iso) return 'isolation';
  if (noms.some((n) => LOURD.test(plier(n)))) return 'lourd';
  return 'poly';
}

/**
 * Ton objectif pour le repos : l'objectif du programme (celui de la seance, sinon ton programme en cours), puis
 * tes objectifs de l'onboarding. Prendre du muscle passe avant perdre du poids (recomposition : on garde le
 * muscle). Rien de connu : prise de muscle, le cas le plus courant en salle.
 */
export function objectifRepos(o: { programme?: string | null; onboarding?: readonly string[] | null }): ObjectifRepos {
  if (o.programme === 'force') return 'force';
  if (o.programme === 'muscle') return 'muscle';
  if (o.programme === 'course') return 'endurance';
  const g = o.onboarding ?? [];
  if (g.includes('gain')) return 'muscle';
  if (g.includes('lose')) return 'endurance';
  return 'muscle';
}

/** Repos de l'exercice : ton choix, puis le programme, puis le conseil */
export function reposConseille(o: { nom: string; muscle?: string | null; objectif: ObjectifRepos; reposProgramme?: number | null; reposRetenu?: number | null }): ReposExo {
  if (reposValide(o.reposRetenu)) return { sec: Math.round(o.reposRetenu), raison: 'toi' };
  if (reposValide(o.reposProgramme)) return { sec: Math.round(o.reposProgramme), raison: 'programme' };
  const t = typeMouvement(o.nom, o.muscle);
  return { sec: REPOS_CONSEILLE[o.objectif][t], raison: `${o.objectif}_${t}` };
}

/** « 45 s », « 1 min 30 », « 2 min » */
export function libelleDureeRepos(sec: number): string {
  const v = Math.max(0, Math.round(sec));
  if (v < 60) return traduire('{0} s', v);
  const m = Math.floor(v / 60);
  const s = v % 60;
  return s ? traduire('{0} min {1}', m, String(s).padStart(2, '0')) : traduire('{0} min', m);
}

/** « Repos conseillé 1 min 30 », ou « Ton repos 2 min » quand c'est ton choix */
export function titreRepos(r: ReposExo): string {
  return `${r.raison === 'toi' ? traduire('Ton repos') : traduire('Repos conseillé')} ${libelleDureeRepos(r.sec)}`;
}

/** La phrase courte du pourquoi */
export function raisonRepos(r: RaisonRepos): string {
  switch (r) {
    case 'toi': return traduire('Ton choix, gardé pour cet exercice');
    case 'programme': return traduire('Prévu par ton programme');
    case 'force_lourd': return traduire('Gros mouvement lourd, force');
    case 'force_poly': return traduire('Polyarticulaire, force');
    case 'force_isolation': return traduire('Isolation, force');
    case 'muscle_lourd': return traduire('Gros mouvement lourd, prise de muscle');
    case 'muscle_poly': return traduire('Polyarticulaire, prise de muscle');
    case 'muscle_isolation': return traduire('Isolation, prise de muscle');
    case 'endurance_lourd':
    case 'endurance_poly': return traduire('Polyarticulaire, endurance et perte de poids');
    case 'endurance_isolation': return traduire('Isolation, endurance et perte de poids');
    default: return '';
  }
}

// ---- Tes choix de repos, par exercice, gardes sur le telephone ----

export const CLE_REPOS_EXO = 'yoroi_repos_par_exercice_v1';
const MAX_RETENUS = 300;

export type ReposRetenus = Record<string, number>;

/** Lecture tolerante : une entree abimee est ecartee, jamais toute la liste */
export function lireRetenus(raw: string | null): ReposRetenus {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: ReposRetenus = {};
    for (const [k, x] of Object.entries(v)) if (k && reposValide(x)) out[k] = Math.round(x);
    return out;
  } catch {
    return {};
  }
}

export function reposRetenuDe(retenus: ReposRetenus | null | undefined, nom: string): number | null {
  if (!retenus || !nom) return null;
  const v = retenus[cleExercice(nom)];
  return reposValide(v) ? v : null;
}

/** Le choix ajoute (le plus recent en dernier), la liste bornee aux MAX_RETENUS derniers exercices */
export function avecRetenu(retenus: ReposRetenus, nom: string, sec: number): ReposRetenus {
  const k = cleExercice(nom);
  if (!k || !reposValide(sec)) return retenus;
  const { [k]: _ancien, ...reste } = retenus;
  const entrees = Object.entries({ ...reste, [k]: Math.round(sec) });
  return Object.fromEntries(entrees.slice(-MAX_RETENUS));
}

export async function chargerReposRetenus(): Promise<ReposRetenus> {
  try {
    return lireRetenus(await AsyncStorage.getItem(CLE_REPOS_EXO));
  } catch {
    return {};
  }
}

let file: Promise<unknown> = Promise.resolve();

/** Garde ton repos pour cet exercice. Ecritures une par une ; une liste illisible n'est pas remplacee. */
export function retenirReposExo(nom: string, sec: number): Promise<void> {
  const p = file.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(CLE_REPOS_EXO);
      if (raw) JSON.parse(raw);
      await AsyncStorage.setItem(CLE_REPOS_EXO, JSON.stringify(avecRetenu(lireRetenus(raw), nom, sec)));
    } catch {
      // stockage indisponible : le choix reste pour la seance en cours
    }
  });
  file = p.catch(() => undefined);
  return p;
}
