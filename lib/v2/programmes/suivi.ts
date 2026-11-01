/**
 * Ton programme en cours (24 octobre 2026) : lequel, depuis quand, quel jour vient ensuite.
 * Stocke sur le telephone (AsyncStorage), rien ne sort. Un seul programme a la fois.
 * Chaque changement previent les ecrans qui l'affichent (evenement PROGRAMME_CHANGED_EVENT).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { programmeParId } from './catalogue';
import { TOUT_LE_MATERIEL } from './materiel';
import type { Equipement } from './materiel';
import type { JourProgramme, Programme } from './types';
import { indexJour, joursValides } from './coach';
import { estPlanFixe, indicesGardes, joursDuPlan, memePlan, planParDefaut, planValide, REPOS } from './planJours';
import { appliquerRemplacements, avecChangementDate, avecRemplacement, cleCase, lireChangementsDates } from './perso';
import type { ChangementsDates, Remplacements } from './perso';
import { avecFrequences, estJourMuscu, finActive, joursRetires, lireFinSeance, retenirFinActive } from './finSeance';
import { hydraterChoix } from '@/lib/v2/seances/cardioJour';
import type { FinSeance } from './finSeance';
import { extrasDe, finDesModules, lireModules, modulesActifs, normaliserModules } from './modules';
import type { ModuleId } from './modules';
import { MACHINE_BY_ID } from '@/lib/v2/seance/machines';
import { estProgrammePerso } from './registrePerso';
import { CLE_PROGRAMMES_PERSO, archiverProgrammePerso, chargerProgrammesPerso, enregistrerProgrammePerso, idDuJourPerso, joursDuPerso, modifierProgrammePerso, nouveauProgrammePerso } from './monProgramme';
import type { ProgrammePerso, SeancePerso } from './monProgramme';
import { caseLe, casesDe, idAutre, jourDeRef, jourDuProgramme, lireDuree, lireSemaine, lundiIso, planDepuisSemaine, planProjete, seanceLe, semaineDepuisBoucle, semaineDepuisPlan, semaineUtile, semaineUtilisePerso } from './semaineLibre';
import type { CaseSemaine, SemaineLibre } from './semaineLibre';
import { LIBELLE_REGION } from './blessures';
import { estIso, lirePonctuel, ponctuelCouvre } from './mixte';
import type { MixtePonctuel } from './mixte';
import type { Region } from './blessures';

const CLE = 'yoroi_programme_actif_v1';
export const PROGRAMME_CHANGED_EVENT = 'YOROI_PROGRAMME_CHANGED';

export type JourFait = { date: string; jourId: string; trainingId?: number };

export type ProgrammeActif = {
  id: string;
  /** jour de depart, date locale "2026-10-24" */
  debut: string;
  /** index du prochain jour dans programme.jours */
  prochain: number;
  faits: JourFait[];
  /** semaine legere en cours : dernier jour inclus, date locale */
  legereJusquau?: string;
  /** debuts des semaines legeres deja faites */
  legeres?: string[];
  /** 25 octobre 2026 : tes jours d'entrainement, 0 = lundi (lib/v2/programmes/coach.ts) ; absents, les jours conseilles */
  jours?: number[];
  /** 26 octobre 2026 : tes exercices changes a la main, « jourId|index » -> nom (lib/v2/programmes/perso.ts) */
  remplacements?: Remplacements;
  /** 26 octobre 2026 : fin de seance, abdos et cardio ajoutes aux jours de musculation (lib/v2/programmes/finSeance.ts) */
  fin?: FinSeance;
  /**
   * 26 octobre 2026 : modules ajoutes par dessus le programme, force, grip, cou, mobilite (lib/v2/programmes/modules.ts).
   * Abdos et cardio restent dans `fin`, lisible par les anciennes versions. modulesActifs(a) rend les deux ensemble.
   */
  modules?: ModuleId[];
  /**
   * 27 octobre 2026 : le jour de chaque séance, dans l'ordre du programme (0 = lundi, -1 = sans jour), pour les
   * programmes à la semaine (planJours.ts). `jours` reste tenu à jour avec les jours du plan.
   * Absent : tes jours dans l'ordre s'ils sont aussi nombreux que les séances, sinon les séances s'enchaînent.
   */
  plan?: number[];
  /**
   * 27 octobre 2026 : « Tu as mal quelque part en ce moment ? » (le Guide du coach). Les zones à ménager pour ce
   * programme seulement : les exercices qui les chargent sont remplacés (blessures.ts), comme une douleur de
   * l'infirmerie. Rien n'est écrit dans l'infirmerie.
   */
  douleurs?: Region[];
  /**
   * 28 octobre 2026 : ta semaine libre (semaineLibre.ts) : sur chaque jour, une séance de ce programme, d'un autre
   * programme ou de tes séances, ou repos ; semaines A et B en option. Absente : la semaine vient de `plan`.
   * `plan` et `jours` restent écrits quand c'est possible, pour les anciennes versions de l'app.
   */
  semaine?: SemaineLibre;
  /** 28 octobre 2026 : durée choisie, 8 ou 12 semaines, 0 = sans fin. Absente : la durée du programme */
  duree?: number;
  /** 28 octobre 2026 : les points de régularité déjà vus (numéro du cycle, 1 le premier) */
  points?: number[];
  /**
   * 30 octobre 2026 : une semaine mixte ponctuelle (mixte.ts) posée par dessus ce programme, de `du` à `jusquau`
   * inclus. Pendant ces jours, la séance du jour, la suite, les rappels et ta semaine la suivent ; après, elle est
   * ignorée et ta semaine normale revient. Ton programme, sa semaine, tes séances faites ne sont pas touchés.
   */
  ponctuel?: MixtePonctuel;
  /**
   * 30 octobre 2026 : programme temporaire (semaine mixte lancée sans programme en cours) : après ce jour (date
   * locale, inclus), il n'y a plus de programme en cours. Rien n'est effacé.
   */
  jusquau?: string;
  /**
   * 1er novembre 2026 (Tes prochaines séances) : un exercice changé pour une seule séance à venir, à sa date
   * (« date|jourId|index » -> nom, perso.ts). Les dates passées tombent à la lecture.
   */
  changementsDates?: ChangementsDates;
};

/** Les zones du Guide, lues sans faire confiance au stockage */
export function lireDouleurs(v: unknown): Region[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = Array.from(new Set(v.filter((x): x is Region => typeof x === 'string' && x in LIBELLE_REGION)));
  return out.length ? out : undefined;
}

/** Le plan d'un programme construit par toi : le jour de chaque séance vient de son id (« perso-…-d3 » = jeudi) */
export function planDuProgrammePerso(p: Programme): number[] | null {
  if (!estProgrammePerso(p.id)) return null;
  // 28 octobre 2026 : les séances de ta semaine B (« -b3 ») n'ont pas de jour dans le plan, ta semaine les place
  // 30 octobre 2026 : le jour vient de la séance (jourPerso, ids stables) ; les programmes d'avant : de son id
  const plan = p.jours.map((j) => (j.jourPerso ? (j.jourPerso.b ? REPOS : j.jourPerso.d) : /-b\d$/.test(j.id) ? REPOS : Number(/-d(\d)$/.exec(j.id)?.[1] ?? -9)));
  const places = plan.filter((d) => d !== REPOS);
  return plan.every((d) => d === REPOS || (d >= 0 && d <= 6)) && places.length > 0 && new Set(places).size === places.length ? plan : null;
}

/**
 * Le prochain jour garde a partir de `index` (en tournant) : les seances de marche retirees par ta fin de
 * seance sont sautees. Jamais tous les jours retires (finSeance.ts, joursRetires).
 */
export function indexGarde(p: Programme, a: Pick<ProgrammeActif, 'fin'> | null, index: number): number {
  const n = p.jours.length;
  const i0 = ((Math.floor(index) % n) + n) % n;
  const retires = joursRetires(p, a?.fin);
  if (!retires.length) return i0;
  for (let k = 0; k < n; k++) {
    const i = (i0 + k) % n;
    if (!retires.includes(p.jours[i].id)) return i;
  }
  return i0;
}

function jourLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function prevenir() {
  try {
    DeviceEventEmitter.emit(PROGRAMME_CHANGED_EVENT);
  } catch {
    // rien a faire
  }
}

export async function chargerProgrammeActif(): Promise<ProgrammeActif | null> {
  try {
    // 31 octobre 2026 : ton choix de cardio par jour, pour annoncer le vrai cardio du jour (lib/v2/seances/cardioJour.ts)
    await hydraterChoix();
    const raw = await AsyncStorage.getItem(CLE);
    if (!raw) return null;
    const brut = JSON.parse(raw) as ProgrammeActif;
    // 30 octobre 2026 : un programme temporaire (semaine mixte) terminé : plus de programme en cours, rien n'est effacé
    const auj = jourLocal();
    const jusquau = brut && estIso(brut.jusquau) ? brut.jusquau : undefined;
    if (jusquau && jusquau < auj) {
      retenirFinActive(null);
      return null;
    }
    // ton programme construit : sa semaine est lue avant (programmeParId le trouve ensuite, registrePerso.ts)
    if (brut && estProgrammePerso(brut.id)) await chargerProgrammesPerso();
    const p = brut && programmeParId(brut.id);
    if (!p) {
      retenirFinActive(null);
      return null;
    }
    // fin de seance : absente dans les anciennes versions, illisible = ignoree
    const { fin: _f, modules: _m, plan: _p, douleurs: _d, semaine: _s, duree: _du, points: _pt, ponctuel: _pc, jusquau: _ju, changementsDates: _cd, ...reste } = brut;
    // 1er novembre 2026 : tes exercices changés pour une seule séance à venir, lus strictement (dates passées : tombées)
    const changementsDates = lireChangementsDates(brut.changementsDates, auj);
    const fin = lireFinSeance(brut.fin);
    // 28 octobre 2026 : ta semaine libre, lue strictement ; ton programme construit garde la semaine de sa page
    const semaine = estProgrammePerso(brut.id) ? null : lireSemaine(brut.semaine);
    if (semaine && semaineUtilisePerso(semaine)) await chargerProgrammesPerso();
    const duree = lireDuree(brut.duree);
    // 30 octobre 2026 : ta semaine mixte ponctuelle, lue strictement ; finie, elle est ignorée (ta semaine revient)
    const pc = lirePonctuel(brut.ponctuel);
    const ponctuel = pc && pc.jusquau >= auj ? pc : null;
    if (ponctuel && semaineUtilisePerso(ponctuel.semaine)) await chargerProgrammesPerso();
    const points = Array.isArray(brut.points) ? Array.from(new Set(brut.points.filter((x) => Number.isInteger(x) && x > 0))).slice(-50) : [];
    const modules = lireModules(brut.modules);
    const douleurs = lireDouleurs(brut.douleurs);
    // plan illisible ou d'une autre version du programme : ignoré, tes jours prennent le relais.
    // Ton programme construit : toujours la semaine que tu as construite (modifiée ou non depuis)
    const plan = planDuProgrammePerso(p) ?? planValide(p, brut.plan, fin);
    const a: ProgrammeActif = { ...reste, ...(fin ? { fin } : {}), ...(modules ? { modules } : {}), ...(douleurs ? { douleurs } : {}), ...(plan ? { plan, jours: joursDuPlan(plan) } : {}), ...(semaineUtile(semaine) ? { semaine } : {}), ...(duree !== undefined ? { duree } : {}), ...(points.length ? { points } : {}), ...(ponctuel ? { ponctuel } : {}), ...(jusquau ? { jusquau } : {}), ...(changementsDates ? { changementsDates } : {}), faits: Array.isArray(brut.faits) ? brut.faits : [], prochain: 0 };
    if (a.semaine) {
      const j = joursDeLaSemaine(a, p, new Date(), false);
      if (j.length) a.jours = j;
    }
    a.prochain = indexGarde(p, a, Math.min(Math.max(0, brut.prochain | 0), p.jours.length - 1));
    // 1er novembre 2026 : abdos et cardio 2 ou 3 fois par semaine, répartis dans ta semaine (finSeance.ts)
    if (a.fin) a.fin = finRepartie(a, p);
    retenirFinActive(a.id, a.fin, a.modules);
    return a;
  } catch {
    return null;
  }
}

/**
 * 1er novembre 2026 : les séances de musculation d'une semaine type de ton programme, dans l'ordre des jours
 * (ta semaine ou ton plan ; sans plan, les séances qui s'enchaînent sur tes jours), et les séances B vers leur A.
 */
export function semaineDeLaFin(a: ProgrammeActif, p: Programme, ref = new Date()): { semaine: string[]; soeurs: Record<string, string> } {
  const semaine: string[] = [];
  const lundi = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - ((ref.getDay() + 6) % 7), 12);
  try {
    const sansPonctuel = { ...a, ponctuel: undefined };
    for (let d = 0; d < 7; d++) {
      const j = seanceDuPlanLe(sansPonctuel, p, new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + d, 12));
      if (j && estJourMuscu(j)) semaine.push(j.id);
    }
  } catch {
    // semaine illisible : la rotation prend le relais
  }
  if (!semaine.length) {
    const retires = joursRetires(p, a.fin);
    const jours = p.jours.filter((j) => estJourMuscu(j) && !retires.includes(j.id) && !j.jourPerso?.b && j.variante !== 'B');
    const k = Math.max(1, Math.min(7, joursValides(a.jours)?.length ?? p.joursParSemaine ?? jours.length));
    for (let i = 0; jours.length && i < k; i++) semaine.push(jours[i % jours.length].id);
  }
  const soeurs: Record<string, string> = {};
  for (const j of p.jours) {
    if (!j.jourPerso?.b) continue;
    const sa = p.jours.find((x) => x.jourPerso && !x.jourPerso.b && x.jourPerso.d === j.jourPerso!.d);
    if (sa) soeurs[j.id] = sa.id;
  }
  return { semaine, soeurs };
}

/** La fin de séance avec ses séances choisies par fréquence, recalculée sur ta semaine */
export function finRepartie(a: ProgrammeActif, p: Programme): FinSeance | undefined {
  if (!a.fin) return a.fin;
  if (!a.fin.abdosParSemaine && !a.fin.cardioParSemaine) return avecFrequences(a.fin, []);
  const { semaine, soeurs } = semaineDeLaFin(a, p);
  return avecFrequences(a.fin, semaine, soeurs);
}

async function ecrire(a: ProgrammeActif | null): Promise<void> {
  if (a?.fin) {
    const p = programmeParId(a.id);
    if (p) a = { ...a, fin: finRepartie(a, p) };
  }
  retenirFinActive(a ? a.id : null, a?.fin, a?.modules);
  try {
    if (a) await AsyncStorage.setItem(CLE, JSON.stringify(a));
    else await AsyncStorage.removeItem(CLE);
  } catch {
    // stockage indisponible : rien n'est perdu cote seances
  }
  prevenir();
}

/**
 * `modules` (26 octobre 2026) : la liste complete choisie au depart (Questionnaire.tsx). Donnee, elle decide aussi
 * des abdos et du cardio ; `fin` garde alors la duree du cardio et les seances de marche.
 */
async function demarrerProgramme_(id: string, jours?: number[], fin?: FinSeance | null, modules?: readonly ModuleId[] | null, plan?: readonly number[] | null, options?: { douleurs?: readonly Region[] | null; semaine?: SemaineLibre | null; duree?: number | null; jusquau?: string | null }): Promise<ProgrammeActif | null> {
  if (estProgrammePerso(id)) await chargerProgrammesPerso();
  const p = programmeParId(id);
  if (!p) return null;
  const choisis = joursValides(jours);
  const f = modules ? finDesModules(modules, lireFinSeance(fin)) : lireFinSeance(fin);
  const extras = extrasDe(modules);
  const douleurs = lireDouleurs(options?.douleurs);
  const a: ProgrammeActif = { id, debut: jourLocal(), prochain: 0, faits: [], ...(choisis ? { jours: choisis } : {}), ...(f && (modules ? finActive(f) || f.sansMarche : true) ? { fin: f } : {}), ...(extras.length ? { modules: extras } : {}), ...(douleurs ? { douleurs } : {}) };
  // 27 octobre 2026 : tes jours séance par séance (Tes jours), choisis au départ ; ton programme construit : sa semaine
  const pl = planDuProgrammePerso(p) ?? planValide(p, plan, a.fin);
  if (pl) {
    a.plan = pl;
    a.jours = joursDuPlan(pl);
  }
  // 28 octobre 2026 : ta semaine libre, choisie avant de commencer (Tes jours)
  const sv = estProgrammePerso(id) ? null : lireSemaine(options?.semaine);
  if (semaineUtile(sv)) {
    if (semaineUtilisePerso(sv)) await chargerProgrammesPerso();
    a.semaine = sv;
    const pl2 = planDepuisSemaine(p, sv, a.fin);
    if (pl2) a.plan = pl2;
    else delete a.plan;
    const j = joursDeLaSemaine(a, p, new Date());
    if (j.length) a.jours = j;
  }
  const d = lireDuree(options?.duree);
  if (d !== undefined) a.duree = d;
  if (estIso(options?.jusquau)) a.jusquau = options!.jusquau!;
  a.prochain = indexGarde(p, a, 0);
  await ecrire(a);
  return a;
}

/** Ta fin de seance change (abdos, cardio, seances de marche gardees ou non) */
async function enregistrerFin_(fin: FinSeance): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  const f = lireFinSeance(fin);
  if (!a || !p || !f) return;
  const suite: ProgrammeActif = planSuitLaFin(p, a.fin, { ...a, fin: f });
  suite.prochain = indexGarde(p, suite, a.prochain);
  await ecrire(suite);
  // 1er novembre 2026 : un autre cardio prévu (type ou durée) : ton ancien choix séance par séance ne le cache plus
  if (a.fin?.cardioType !== f.cardioType || a.fin?.minutes !== f.minutes) await oublierCardioDuProgramme(a.id);
}

async function oublierCardioDuProgramme(id: string): Promise<void> {
  try {
    await (require('@/lib/v2/seances/cardioChoix') as typeof import('@/lib/v2/seances/cardioChoix')).oublierChoixDuProgramme(id); // eslint-disable-line @typescript-eslint/no-require-imports
  } catch {
    // le choix d'avant reste, tu le changes en séance
  }
}

/**
 * Tes modules changent (liste complete : force, grip, cou, abdos, cardio, mobilite). `minutes` et `sansMarche`
 * reglent la fin de seance ; absents, ceux du programme en cours restent.
 */
async function enregistrerModules_(modules: readonly ModuleId[], options?: { minutes?: number; sansMarche?: boolean }): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  const liste = normaliserModules(modules);
  // 1er novembre 2026 : tes fréquences, ton type de cardio et tes choix séance par séance restent
  const base = { ...(a.fin ?? {}), minutes: options?.minutes ?? a.fin?.minutes, sansMarche: options?.sansMarche ?? a.fin?.sansMarche };
  const fin = finDesModules(liste, base);
  const extras = extrasDe(liste);
  const { modules: _m, fin: _f, ...reste } = a;
  const suite: ProgrammeActif = planSuitLaFin(p, a.fin, { ...reste, fin, ...(extras.length ? { modules: extras } : {}) });
  suite.prochain = indexGarde(p, suite, a.prochain);
  await ecrire(suite);
}

/** Tous les modules du programme en cours (ceux de `modules` et ceux de la fin de seance) */
export function modulesDuProgramme(a: ProgrammeActif | null): ModuleId[] {
  return modulesActifs(a);
}

/**
 * Tes jours d'entrainement changent (0 = lundi), sans dire quelle seance va ou : le plan seance par seance est
 * oublie, tes jours dans l'ordre le remplacent (planEffectif)
 */
async function enregistrerJours_(jours: number[]): Promise<void> {
  const a = await chargerProgrammeActif();
  const choisis = joursValides(jours);
  if (!a || !choisis) return;
  const { plan: _p, semaine: _s, ...reste } = a;
  await ecrire({ ...reste, jours: choisis });
}

/**
 * 27 octobre 2026 : Tes jours, seance par seance (Push lundi, Pull mardi...). L'historique et la progression ne
 * bougent pas : seule la seance de chaque jour change, a partir d'aujourd'hui.
 */
async function enregistrerPlan_(plan: readonly number[]): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  const pl = planValide(p, plan, a.fin);
  if (!pl) return;
  const sv = lireSemaine(a.semaine);
  if (!sv && memePlan(pl, a.plan) && memePlan(joursDuPlan(pl), a.jours ?? null)) return;
  // une semaine libre déjà là : sa semaine A suit ce plan, ta semaine B ne bouge pas
  await ecrire({ ...a, plan: pl, jours: joursDuPlan(pl), ...(sv ? { semaine: { ...sv, a: semaineDepuisPlan(p, pl).a } } : {}) });
}

/**
 * 28 octobre 2026 : ta semaine libre (Tes jours). Chaque case est vérifiée : une séance introuvable, une semaine
 * sans aucune séance, rien n'est écrit. L'historique, la progression et tes séances faites ne bougent pas.
 */
async function enregistrerSemaine_(semaine: SemaineLibre): Promise<boolean> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p || estProgrammePerso(p.id)) return false;
  const s = lireSemaine(semaine);
  if (!semaineUtile(s)) return false;
  if (semaineUtilisePerso(s)) await chargerProgrammesPerso();
  const cases = [...s.a, ...(s.ab && s.b ? s.b : [])];
  if (cases.some((c) => !!c && !jourDeRef(c, p.id))) return false;
  const plan = planDepuisSemaine(p, s, a.fin);
  const { plan: _p, semaine: _s, ...reste } = a;
  const suite: ProgrammeActif = { ...reste, semaine: s, ...(plan ? { plan } : {}) };
  const j = joursDeLaSemaine(suite, p, new Date(), false);
  if (j.length) suite.jours = j;
  await ecrire(suite);
  return true;
}

/** 28 octobre 2026 : la durée, 8 ou 12 semaines, 0 = sans fin */
async function enregistrerDuree_(duree: number): Promise<void> {
  const a = await chargerProgrammeActif();
  const d = lireDuree(duree);
  if (!a || d === undefined || a.duree === d) return;
  await ecrire({ ...a, duree: d });
}

/** Le point de régularité de ce cycle est vu (« Continuer ») : il ne revient plus */
async function marquerPointVu_(cycle: number): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a || !Number.isInteger(cycle) || cycle < 1 || (a.points ?? []).includes(cycle)) return;
  await ecrire({ ...a, points: [...(a.points ?? []), cycle].slice(-50) });
}

/**
 * La semaine qui compte : la tienne (semaine libre), celle de ton programme construit, sinon celle du plan. null : en boucle.
 * 30 octobre 2026 : `avecPonctuel` (par défaut) : pendant une semaine mixte ponctuelle, un programme en boucle a aussi
 * une semaine (ses séances dans l'ordre sur tes jours), pour que chaque date ait sa séance ; la semaine mixte elle même
 * s'applique jour par jour (seanceDeLaSemaine). false : la semaine normale seule (Tes jours, Garder, enregistrement).
 */
export function semaineEffective(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin' | 'semaine' | 'ponctuel'> | null, p: Programme, avecPonctuel = true): SemaineLibre | null {
  if (!estProgrammePerso(p.id)) {
    const s = lireSemaine(a?.semaine);
    if (semaineUtile(s)) return s;
  }
  if (semaineUtile(p.semaineLibre)) return p.semaineLibre;
  const plan = planDeBase(a, p);
  if (plan) return semaineDepuisPlan(p, plan);
  const pc = avecPonctuel ? ponctuelDe(a) : null;
  if (pc && pc.jusquau >= jourLocal()) return semaineDepuisBoucle(p, joursValides(a?.jours) ?? joursConseilles(p.joursParSemaine), a?.fin);
  return null;
}

const ponctuelsLus = new WeakMap<object, MixtePonctuel | null>();
/** La semaine mixte ponctuelle d'un programme en cours, lue strictement (une fois par objet) */
function ponctuelDe(a: Pick<ProgrammeActif, 'ponctuel'> | null | undefined): MixtePonctuel | null {
  const v = a?.ponctuel;
  if (!v || typeof v !== 'object') return null;
  if (ponctuelsLus.has(v)) return ponctuelsLus.get(v)!;
  const pc = lirePonctuel(v);
  ponctuelsLus.set(v, pc);
  return pc;
}

/** La semaine mixte ponctuelle qui couvre cette date, sinon null */
export function ponctuelLe(a: Pick<ProgrammeActif, 'ponctuel'> | null | undefined, date: Date): MixtePonctuel | null {
  const pc = ponctuelDe(a);
  return pc && ponctuelCouvre(pc, jourLocal(date)) ? pc : null;
}

/**
 * La séance de ta semaine ce jour-là ; une marche retirée par ta fin de séance n'y est jamais.
 * 30 octobre 2026 : un jour couvert par ta semaine mixte ponctuelle prend sa séance à elle.
 */
function seanceDeLaSemaine(a: Pick<ProgrammeActif, 'fin' | 'ponctuel'> | null, p: Programme, s: SemaineLibre, d: Date, avecPonctuel = true): JourProgramme | null {
  const pc = avecPonctuel ? ponctuelLe(a, d) : null;
  const j = pc ? jourDeRef(caseLe(pc.semaine, d), p.id) : seanceLe(s, p, d);
  if (j && p.jours.includes(j) && joursRetires(p, a?.fin).includes(j.id)) return null;
  return j;
}

/**
 * Tes jours d'entraînement de la semaine de cette date (semaines A et B comprises), 0 = lundi.
 * `avecPonctuel` false : ceux de ta semaine normale (ce qui est enregistré ne dépend jamais de la semaine mixte).
 */
function joursDeLaSemaine(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin' | 'semaine' | 'ponctuel'>, p: Programme, date: Date, avecPonctuel = true): number[] {
  const s = semaineEffective(a, p, avecPonctuel);
  if (!s) return [];
  const lundi = ajouterJours(date, -indexJour(date));
  return [0, 1, 2, 3, 4, 5, 6].filter((k) => !!seanceDeLaSemaine(a, p, s, ajouterJours(lundi, k), avecPonctuel));
}

/** Le dernier jour prévu raté (comme coach.ts jourRate), quel que soit le jour de la semaine A ou B */
function jourRateLe(a: Pick<ProgrammeActif, 'debut' | 'faits'>, prevu: (d: Date) => boolean, aujourdhui: Date): Date | null {
  const auj = jourLocal(aujourdhui);
  for (let k = 1; k <= 7; k++) {
    const d = ajouterJours(aujourdhui, -k);
    const iso = jourLocal(d);
    if (iso < a.debut) return null;
    if (!prevu(d)) continue;
    return a.faits.some((f) => f.date >= iso && f.date <= auj) ? null : d;
  }
  return null;
}

/** Durée du programme en semaines ; null : sans fin */
export function semainesDuProgramme(a: Pick<ProgrammeActif, 'duree'> | null, p: Programme): number | null {
  const d = lireDuree(a?.duree);
  if (d === 0) return null;
  if (d) return d;
  return p.sansFin ? null : p.semaines;
}

/** « semaine 3 sur 8 », ou « semaine 14 » sans fin (texte traduit par l'appelant : gabarit et valeurs) */
export function libelleSemaine(a: ProgrammeActif, p: Programme, aujourdhui = new Date()): { gabarit: string; valeurs: number[] } {
  const n = semaineDuProgramme(a, aujourdhui);
  const total = semainesDuProgramme(a, p);
  return total && n <= total ? { gabarit: 'semaine {0} sur {1}', valeurs: [n, total] } : { gabarit: 'semaine {0}', valeurs: [n] };
}

/**
 * Le point de régularité (28 octobre 2026) : à la fin de chaque cycle (la durée choisie, sinon celle du programme),
 * une carte qui ne bloque rien. Que des vraies données : semaines avec au moins une séance faite, séances faites.
 * null : pas encore la fin d'un cycle, ou déjà vu.
 */
export function pointDeRegularite(a: ProgrammeActif, p: Programme, aujourdhui = new Date()): { cycle: number; semaines: number; faites: number } | null {
  const d = lireDuree(a.duree);
  const cycle = Math.max(1, d && d > 0 ? d : p.semaines || 8);
  const k = Math.floor((semaineDuProgramme(a, aujourdhui) - 1) / cycle);
  if (k < 1 || (a.points ?? []).includes(k)) return null;
  const faits = a.faits.filter((f) => f.date >= a.debut && /^\d{4}-\d{2}-\d{2}$/.test(f.date));
  const semaines = new Set(faits.map((f) => lundiIso(new Date(`${f.date}T12:00:00`)))).size;
  if (!semaines) return null;
  return { cycle: k, semaines, faites: faits.length };
}

/** « Garder comme mon programme » est possible : un programme du catalogue, que des séances d'exercices dans ta semaine */
export function peutGarder(a: ProgrammeActif | null, p: Programme | null | undefined): boolean {
  if (!a || !p || a.id !== p.id || estProgrammePerso(p.id)) return false;
  const s = semaineEffective(a, p, false) ?? semaineDepuisBoucle(p, joursDuProgramme(a, p), a.fin);
  const cases = [...s.a, ...(s.ab && s.b ? s.b : [])].filter((c): c is NonNullable<CaseSemaine> => !!c);
  return cases.length > 0 && cases.every((c) => {
    const j = jourDeRef(c, p.id);
    return !!j && !j.rounds && !j.cardio && j.exos.length > 0;
  });
}

/**
 * 28 octobre 2026 : « Garder comme mon programme ». Ton programme et ta semaine (A et B comprises), avec tes exercices
 * changés à la main, deviennent un programme à toi dans « Mes programmes » (monProgramme.ts), modifiable ensuite.
 * Toujours un nouveau programme : rien n'est écrasé. Il devient ton programme en cours sans rien perdre : même début,
 * mêmes séances faites, semaines légères, fin de séance et modules. Les charges progressent par nom d'exercice.
 */
async function garderCommeMonProgramme_(nom: string, duree?: number | null): Promise<ProgrammeActif | null> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p || !peutGarder(a, p)) return null;
  const s = semaineEffective(a, p, false) ?? semaineDepuisBoucle(p, joursDuProgramme(a, p), a.fin);
  const versSeance = (c: CaseSemaine): SeancePerso | null => {
    const j = jourDeRef(c, p.id);
    if (!j || !j.exos.length) return null;
    const r = appliquerRemplacements(j, a.remplacements);
    return {
      titre: j.titre.slice(0, 40),
      exos: r.exos.map((e) => ({ nom: e.nom, muscle: e.muscle, series: e.series, repsMin: e.repsMin, repsMax: e.repsMax, reposSec: e.reposSec, ...(e.conseil ? { conseil: e.conseil } : {}), ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}), ...(e.secondes ? { secondes: true } : {}) })),
    };
  };
  const d = lireDuree(duree);
  const base = nouveauProgrammePerso();
  const ab = !!s.ab && !!s.b;
  const pp: ProgrammePerso = {
    ...base,
    nom: nom.trim().slice(0, 40),
    semaine: casesDe(s, 'a').map(versSeance),
    ...(s.b ? { semaineB: s.b.map(versSeance) } : {}),
    ...(ab ? { ab: true, depuis: s.depuis } : s.depuis ? { depuis: s.depuis } : {}),
    origine: p.id,
    ...(d !== undefined ? { duree: d } : {}),
  };
  const enr = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => enregistrerProgrammePerso(pp));
  const q = programmeParId(enr.id);
  if (!q) return null;
  const plan = planDuProgrammePerso(q);
  // tes séances faites gardent leur jour : celle faite un jour qui garde sa séance prend le nouvel id
  const faits = a.faits.map((f) => {
    const dt = new Date(`${f.date}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return f;
    const k = indexJour(dt);
    const c = casesDe(s, 'a')[k];
    const avant = c ? (c.p === p.id ? c.s : idAutre(c)) : null;
    const nouvel = idDuJourPerso(enr, k);
    return avant && avant === f.jourId && nouvel ? { ...f, jourId: nouvel } : f;
  });
  const { plan: _p, semaine: _s, remplacements: _r, duree: _d, points: _pt, ...reste } = a;
  const suite: ProgrammeActif = { ...reste, id: enr.id, faits, ...(plan ? { plan, jours: joursDuPlan(plan) } : {}), ...(d !== undefined ? { duree: d } : a.duree !== undefined ? { duree: a.duree } : {}), ...(a.points?.length ? { points: a.points } : {}) };
  const j = joursDeLaSemaine(suite, q, new Date(), false);
  if (j.length) suite.jours = j;
  suite.prochain = indexGarde(q, suite, 0);
  await ecrire(suite);
  return suite;
}

/* ------------------------------------------------------------------------------------------------
 * 30 octobre 2026 : ton programme mixte (mixte.ts, app/programme-mixte.tsx)
 * ---------------------------------------------------------------------------------------------- */
/** Avant de remplacer ton programme en cours par un mixte, une copie telle quelle est gardée à part */
export const CLE_AVANT_MIXTE = 'yoroi_programme_actif_avant_mixte_v1';
async function garderAvantMixte(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CLE);
    if (raw) await AsyncStorage.setItem(CLE_AVANT_MIXTE, raw);
  } catch {
    // rien a faire : le programme en cours reste lisible tel quel
  }
}

/**
 * Ta semaine mixte en séances à toi (monProgramme.ts). Tes exercices changés à la main dans ton programme en cours
 * suivent. null : une case introuvable, ou une séance sans exercice (rounds, cardio) : rien n'est écrit.
 */
function mixteVersPerso(nom: string, s: SemaineLibre, a: ProgrammeActif | null, duree: number | undefined): ProgrammePerso | null {
  let ok = true;
  const versSeance = (c: CaseSemaine): SeancePerso | null => {
    if (!c) return null;
    const j = jourDeRef(c, a?.id ?? '');
    if (!j || !j.exos.length || j.rounds || j.cardio) {
      ok = false;
      return null;
    }
    const r = a ? appliquerRemplacements(j, a.remplacements) : j;
    return {
      titre: j.titre.slice(0, 40),
      exos: r.exos.map((e) => ({ nom: e.nom, muscle: e.muscle, series: e.series, repsMin: e.repsMin, repsMax: e.repsMax, reposSec: e.reposSec, ...(e.conseil ? { conseil: e.conseil } : {}), ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}), ...(e.secondes ? { secondes: true } : {}) })),
    };
  };
  const ab = !!s.ab && !!s.b;
  const pp: ProgrammePerso = {
    ...nouveauProgrammePerso(),
    nom: nom.trim().slice(0, 40),
    semaine: s.a.map(versSeance),
    ...(ab ? { semaineB: s.b!.map(versSeance), ab: true, depuis: s.depuis } : {}),
    ...(duree !== undefined ? { duree } : {}),
    origine: 'mixte',
  };
  return ok ? pp : null;
}

/**
 * « Habituel » : ta semaine mixte devient un programme à toi dans « Mes programmes » et ton programme en cours,
 * pour la durée choisie (0 = sans fin, par défaut). Ta fin de séance, tes modules et tes zones à ménager suivent.
 * L'historique et les charges (par nom d'exercice) continuent ; ton programme d'avant est gardé à part.
 */
async function creerMixteHabituel_(nom: string, semaine: SemaineLibre, duree?: number | null): Promise<ProgrammeActif | null> {
  const s = lireSemaine(semaine);
  if (!semaineUtile(s)) return null;
  if (semaineUtilisePerso(s)) await chargerProgrammesPerso();
  const a = await chargerProgrammeActif();
  const d = lireDuree(duree) ?? 0;
  const pp = mixteVersPerso(nom, s, a, d);
  if (!pp) return null;
  const enr = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => enregistrerProgrammePerso(pp));
  if (!programmeParId(enr.id)) return null;
  await garderAvantMixte();
  const modules = a ? modulesActifs(a) : [];
  return demarrerProgramme_(enr.id, joursDuPerso(enr), a?.fin ?? null, modules.length ? modules : null, null, { douleurs: a?.douleurs ?? null, duree: d });
}

/**
 * « Ponctuel » : ta semaine mixte d'aujourd'hui jusqu'à `jusquau` inclus. Avec un programme en cours, elle se pose
 * par dessus (ProgrammeActif.ponctuel) sans rien remplacer. Sans programme : un programme temporaire, archivé
 * d'office (il n'encombre pas « Mes programmes »), qui s'arrête tout seul après `jusquau`.
 */
async function lancerMixtePonctuel_(nom: string, semaine: SemaineLibre, jusquau: string, aujourdhui = new Date()): Promise<ProgrammeActif | null> {
  const s = lireSemaine(semaine);
  if (!semaineUtile(s)) return null;
  const pc = lirePonctuel({ semaine: s, du: jourLocal(aujourdhui), jusquau, nom });
  if (!pc) return null;
  if (semaineUtilisePerso(s)) await chargerProgrammesPerso();
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (a && p) {
    const cases = [...pc.semaine.a, ...(pc.semaine.ab && pc.semaine.b ? pc.semaine.b : [])];
    if (cases.some((c) => !!c && !jourDeRef(c, p.id))) return null;
    const suite: ProgrammeActif = { ...a, ponctuel: pc };
    await ecrire(suite);
    return suite;
  }
  const pp = mixteVersPerso(pc.nom ?? nom, pc.semaine, null, 0);
  if (!pp) return null;
  const enr = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => enregistrerProgrammePerso({ ...pp, archive: jourLocal(aujourdhui) }));
  if (!programmeParId(enr.id)) return null;
  return demarrerProgramme_(enr.id, joursDuPerso(enr), null, null, null, { duree: 0, jusquau: pc.jusquau });
}

/** « Annuler » : ta semaine mixte s'arrête, ta semaine normale revient ; un programme temporaire s'arrête */
async function annulerMixtePonctuel_(): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a) return;
  if (a.ponctuel) {
    const { ponctuel: _pc, ...reste } = a;
    await ecrire(reste);
    return;
  }
  if (a.jusquau) await ecrire(null);
}

/* ------------------------------------------------------------------------------------------------
 * 30 octobre 2026 : ta semaine d'un programme à toi (construit, gardé, mixte habituel ou semaine mixte temporaire),
 * changée dans Tes jours. Elle est écrite dans ton programme (monProgramme.ts : il la garde si tu le relances) ET
 * dans ton programme en cours. Tes séances faites, ton début, ta progression, tes autres réglages ne bougent pas.
 * ---------------------------------------------------------------------------------------------- */
type ChampsSemainePerso = Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'ab' | 'depuis'>;

/** Une place dans ta semaine : le jour (0 = lundi), dans ta semaine B ou non */
export type PlacePerso = { d: number; b: boolean };

/**
 * Ta semaine libre (cases) en séances à toi. Une case de ton programme reprend sa séance avec son id stable (sid) :
 * déplacée, elle reste la même séance (tes séances faites et tes progrès la retrouvent) ; posée une deuxième fois,
 * la copie est une séance nouvelle. Une séance d'un autre programme est copiée dans ton programme (séance nouvelle).
 * `places` : l'id d'avant de chaque séance vers ses places dans la nouvelle semaine (tes exercices changés à la main
 * les suivent). null : une case introuvable ou une séance sans exercice (rounds, cardio) : rien n'est écrit.
 */
export function semainePersoDepuisLibre(pp: ProgrammePerso, s: SemaineLibre): { champs: ChampsSemainePerso; places: Map<string, PlacePerso[]> } | null {
  let ok = true;
  const places = new Map<string, PlacePerso[]>();
  const pris = new Set<string>();
  // les séances de ton programme par id (A puis B)
  const siennes = new Map<string, SeancePerso>();
  for (const b of [false, true]) {
    (b ? pp.semaineB ?? [] : pp.semaine).forEach((x, d) => {
      const id = idDuJourPerso(pp, d, b);
      if (x && id && !siennes.has(id)) siennes.set(id, x);
    });
  }
  const versSeance = (c: CaseSemaine, place: PlacePerso): SeancePerso | null => {
    if (!c) return null;
    let seance: SeancePerso | null = null;
    let ancien: string;
    if (c.p === pp.id) {
      ancien = c.s;
      const src = siennes.get(c.s);
      if (src && src.exos.length) {
        // la première fois, la séance elle même (son sid) ; ensuite une copie, séance nouvelle
        const garde = !pris.has(c.s) && !!src.sid;
        pris.add(c.s);
        // 30 octobre 2026 : la séance garde sa brique (briques.ts), une seule à changer pour tous ses jours
        seance = { ...(src.titre ? { titre: src.titre } : {}), exos: src.exos.map((e) => ({ ...e })), ...(garde ? { sid: src.sid } : {}), ...(src.brique ? { brique: src.brique } : {}) };
      }
    } else {
      ancien = idAutre(c);
      const j = jourDeRef(c, pp.id);
      if (j && j.exos.length && !j.rounds && !j.cardio) {
        seance = {
          titre: j.titre.slice(0, 40),
          exos: j.exos.map((e) => ({ nom: e.nom, muscle: e.muscle, series: e.series, repsMin: e.repsMin, repsMax: e.repsMax, reposSec: e.reposSec, ...(e.conseil ? { conseil: e.conseil } : {}), ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}), ...(e.secondes ? { secondes: true } : {}) })),
        };
      }
    }
    if (!seance) {
      ok = false;
      return null;
    }
    places.set(ancien, [...(places.get(ancien) ?? []), place]);
    return seance;
  };
  const semaine = s.a.map((c, d) => versSeance(c, { d, b: false }));
  // ta semaine B : celle de Tes jours ; absente, celle d'avant est gardée telle quelle
  const semaineB = s.b ? s.b.map((c, d) => versSeance(c, { d, b: true })) : pp.semaineB;
  if (!ok || !semaine.some((x) => !!x)) return null;
  const ab = !!s.ab && !!s.b;
  const depuis = s.depuis ?? pp.depuis;
  return { champs: { semaine, semaineB, ab: ab || undefined, depuis }, places };
}

/** Tes exercices changés à la main suivent leur séance dans la nouvelle semaine ; ceux d'une séance retirée partent */
export function remplacementsRenommes(r: Remplacements | undefined, renommes: ReadonlyMap<string, readonly string[]>): Remplacements | undefined {
  if (!r) return undefined;
  const out: Remplacements = {};
  for (const [cle, nom] of Object.entries(r)) {
    const m = /^(.*)\|(\d+)$/.exec(cle);
    if (!m || typeof nom !== 'string') continue;
    for (const n of renommes.get(m[1]) ?? []) out[cleCase(n, Number(m[2]))] = nom;
  }
  return Object.keys(out).length ? out : undefined;
}

async function modifierSemainePerso_(semaine: SemaineLibre): Promise<boolean> {
  const a = await chargerProgrammeActif();
  if (!a || !estProgrammePerso(a.id)) return false;
  const s = lireSemaine(semaine);
  if (!semaineUtile(s)) return false;
  await chargerProgrammesPerso();
  const sortie: { places?: Map<string, PlacePerso[]> } = {};
  const enr = await enFileProgramme(CLE_PROGRAMMES_PERSO, () =>
    modifierProgrammePerso(a.id, (pp) => {
      const r = semainePersoDepuisLibre(pp, s);
      if (!r) return null;
      sortie.places = r.places;
      return { ...pp, ...r.champs };
    }),
  );
  if (!enr || !sortie.places) return false;
  // les ids de chaque séance une fois enregistrée (une séance nouvelle a reçu son sid à l'écriture)
  const renommes = new Map<string, string[]>();
  for (const [ancien, l] of sortie.places) renommes.set(ancien, l.map((x) => idDuJourPerso(enr, x.d, x.b)).filter((x): x is string => !!x));
  const q = programmeParId(enr.id);
  const plan = q ? planDuProgrammePerso(q) : null;
  if (!q || !plan) return false;
  const remplacements = remplacementsRenommes(a.remplacements, renommes);
  const { remplacements: _r, plan: _p, ...reste } = a;
  const suite: ProgrammeActif = { ...reste, plan, jours: joursDuPlan(plan), ...(remplacements ? { remplacements } : {}) };
  const j = joursDeLaSemaine(suite, q, new Date(), false);
  if (j.length) suite.jours = j;
  suite.prochain = indexGarde(q, suite, Math.min(a.prochain, q.jours.length - 1));
  await ecrire(suite);
  return true;
}

/**
 * « Garder comme mon programme » d'une semaine mixte temporaire : elle devient un vrai programme à toi, dans « Mes
 * programmes », toujours en cours, sans fin. Même début, mêmes séances faites, même semaine.
 */
async function garderTemporaire_(): Promise<ProgrammeActif | null> {
  const a = await chargerProgrammeActif();
  if (!a || !estProgrammePerso(a.id) || !estIso(a.jusquau)) return null;
  const enr = await enFileProgramme(CLE_PROGRAMMES_PERSO, () =>
    modifierProgrammePerso(a.id, (pp) => {
      const { archive: _x, ...reste } = pp;
      return { ...reste, duree: 0 };
    }),
  );
  if (!enr || enr.archive) return null;
  const { jusquau: _j, ...reste } = a;
  const suite: ProgrammeActif = { ...reste, duree: 0 };
  await ecrire(suite);
  return suite;
}

/** Ton programme en cours est une semaine mixte temporaire (lancée sans programme, archivée, avec une fin) */
export function estTemporaire(a: Pick<ProgrammeActif, 'id' | 'jusquau'> | null | undefined, aujourdhui = new Date()): boolean {
  return !!a && estProgrammePerso(a.id) && estIso(a.jusquau) && a.jusquau >= jourLocal(aujourdhui);
}

/** La semaine mixte en cours aujourd'hui (bandeau « Semaine mixte jusqu'à dimanche ») ; null : aucune */
export function mixteEnCours(a: ProgrammeActif | null, aujourdhui = new Date()): { jusquau: string; nom?: string; temporaire: boolean } | null {
  if (!a) return null;
  const pc = ponctuelLe(a, aujourdhui);
  if (pc) return { jusquau: pc.jusquau, ...(pc.nom ? { nom: pc.nom } : {}), temporaire: false };
  if (estIso(a.jusquau) && a.jusquau >= jourLocal(aujourdhui)) {
    const p = programmeParId(a.id);
    return { jusquau: a.jusquau, ...(p ? { nom: p.titre } : {}), temporaire: true };
  }
  return null;
}

/**
 * Le plan qui compte : celui que tu as fait, sinon tes jours dans l'ordre (ou les jours conseilles) s'ils sont
 * aussi nombreux que les seances. null : programme en boucle, ou tes jours ne collent pas au nombre de seances
 * (les seances s'enchainent alors dans l'ordre, comme avant).
 */
export function planEffectif(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin' | 'semaine'> | null, p: Programme): number[] | null {
  // 28 octobre 2026 : avec ta semaine libre, le plan d'avant quand il peut la dire, sinon où tombe chaque séance cette semaine
  const s = estProgrammePerso(p.id) ? null : lireSemaine(a?.semaine);
  if (semaineUtile(s)) return planDepuisSemaine(p, s, a?.fin) ?? planProjete(p, s, new Date());
  if (semaineUtile(p.semaineLibre)) return planProjete(p, p.semaineLibre, new Date());
  return planDeBase(a, p);
}

/** Le plan d'avant la semaine libre (27 octobre 2026) */
function planDeBase(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin'> | null, p: Programme): number[] | null {
  if (!estPlanFixe(p)) return null;
  const v = planValide(p, a?.plan, a?.fin);
  if (v) return v;
  const jours = joursValides(a?.jours);
  if (jours && jours.length !== indicesGardes(p, a?.fin).length) return null;
  return planParDefaut(p, jours, joursConseilles, a?.fin);
}

/** Ta fin de seance change les seances de marche gardees : le plan suit, les jours aussi */
function planSuitLaFin(p: Programme, avant: FinSeance | undefined, a: ProgrammeActif): ProgrammeActif {
  if (!a.plan) return a;
  const gardes = indicesGardes(p, a.fin);
  const retiresAvant = joursRetires(p, avant);
  // une marche remise : elle prend le premier jour libre parmi les jours conseilles, puis n'importe lequel
  const brut = p.jours.map((_, i) => (gardes.includes(i) ? (a.plan![i] ?? REPOS) : REPOS));
  const libres = [...joursConseilles(p.joursParSemaine), 0, 1, 2, 3, 4, 5, 6].filter((d) => !brut.includes(d));
  for (const i of gardes) if (retiresAvant.includes(p.jours[i].id) && brut[i] === REPOS) brut[i] = libres.shift() ?? REPOS;
  const pl = planValide(p, brut, a.fin);
  const { plan: _p, ...reste } = a;
  return pl ? { ...reste, plan: pl, jours: joursDuPlan(pl) } : reste;
}

/** Tes jours d'entrainement : ceux du plan, sinon ceux que tu as choisis, sinon les jours conseilles du programme */
export function joursDuProgramme(a: ProgrammeActif | null, p: Programme): number[] {
  if (a && a.id === p.id) {
    const j = joursDeLaSemaine(a, p, new Date());
    if (j.length) return j;
  }
  return joursValides(a?.jours) ?? joursConseilles(p.joursParSemaine);
}

const ajouterJours = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/**
 * La seance a faire selon ta semaine (semaine libre ou plan) : celle d'aujourd'hui si elle n'est pas faite ;
 * un jour de repos, celle d'un jour prevu rate (on rattrape) ; sinon la prochaine. null : programme en boucle.
 * 28 octobre 2026 : la seance peut venir d'un autre programme (Legs du PPL un mercredi).
 */
export function seanceAFaire(a: ProgrammeActif, p: Programme, aujourdhui = new Date()): JourProgramme | null {
  const s = semaineEffective(a, p);
  if (!s) return null;
  const le = (d: Date) => seanceDeLaSemaine(a, p, s, d);
  const iso = jourLocal(aujourdhui);
  const jAuj = le(aujourdhui);
  const faitAuj = a.faits.some((f) => f.date === iso);
  if (jAuj && !faitAuj) return jAuj;
  if (!jAuj && !faitAuj) {
    const rate = jourRateLe(a, (d) => !!le(d), aujourdhui);
    const jr = rate ? le(rate) : null;
    if (jr) return jr;
  }
  for (let k = 1; k <= 14; k++) {
    const j = le(ajouterJours(aujourdhui, k));
    if (j) return j;
  }
  return null;
}

/** Comme seanceAFaire, en index dans programme.jours (-1 : seance d'un autre programme) ; null sans plan */
export function indexDuPlan(a: ProgrammeActif, p: Programme, aujourdhui = new Date()): number | null {
  const j = seanceAFaire(a, p, aujourdhui);
  return j ? p.jours.indexOf(j) : null;
}

/** La seance prevue ce jour la par ta semaine (null : repos ce jour, ou programme sans plan) */
export function seanceDuPlanLe(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin' | 'semaine' | 'ponctuel'> | null, p: Programme, date: Date): JourProgramme | null {
  const s = semaineEffective(a, p);
  return s ? seanceDeLaSemaine(a, p, s, date) : null;
}

/**
 * « Changer » sur la page du programme : l'exercice de la case `index` du jour devient `nom`
 * (null, ou le nom d'origine : tu reviens a l'exercice du programme). Series, repetitions et repos ne bougent pas.
 */
async function remplacerExercice_(jourId: string, index: number, nom: string | null, original?: string): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  const jour = jourDuProgramme(p, jourId);
  if (!jour || index < 0 || index >= jour.exos.length) return;
  const remplacements = avecRemplacement(a.remplacements, cleCase(jourId, index), nom, original ?? jour.exos[index].nom);
  const { remplacements: _ancien, ...reste } = a;
  await ecrire(Object.keys(remplacements).length ? { ...reste, remplacements } : reste);
}

/**
 * 1er novembre 2026 (Tes prochaines séances) : « Changer d'exercice » pour une seule séance à venir, à sa date
 * (« Juste aujourd'hui » de la feuille). null, ou le nom d'origine : la séance reprend son exercice.
 */
async function changerExerciceLe_(date: string, jourId: string, index: number, nom: string | null, original?: string): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p || !estIso(date) || date < jourLocal()) return;
  const jour = jourDuProgramme(p, jourId);
  if (!jour || index < 0 || index >= jour.exos.length) return;
  const c = lireChangementsDates(avecChangementDate(a.changementsDates, date, jourId, index, nom, original ?? jour.exos[index].nom), jourLocal());
  const { changementsDates: _c, ...reste } = a;
  await ecrire(c ? { ...reste, changementsDates: c } : reste);
}

async function arreterProgramme_(): Promise<void> {
  await ecrire(null);
}

/* ------------------------------------------------------------------------------------------------
 * Ton programme construit (27 octobre 2026, « Je construis le mien », monProgramme.ts) : enregistré, il devient
 * ton programme en cours. Déjà en cours : il est mis à jour sans perdre ton début, tes séances faites ni ta
 * progression ; seuls les jours suivent ta nouvelle semaine.
 * ---------------------------------------------------------------------------------------------- */
async function suivreProgrammePerso_(pp: Pick<ProgrammePerso, 'id' | 'semaine' | 'fin'>): Promise<ProgrammeActif | null> {
  await chargerProgrammesPerso();
  const p = programmeParId(pp.id);
  if (!p) return null;
  const a = await chargerProgrammeActif();
  const plan = planDuProgrammePerso(p);
  if (!plan) return null;
  if (a && a.id === pp.id) {
    // tes exercices, tu les as changés toi même dans ta semaine : plus de remplacement à garder
    const { remplacements: _r, plan: _p, ...reste } = a;
    const suite: ProgrammeActif = { ...reste, plan, jours: joursDuPlan(plan) };
    // 1er novembre 2026 : abdos et cardio choisis dans « Je construis le mien » (ProgrammePerso.fin)
    const f = pp.fin !== undefined ? lireFinSeance(pp.fin) : undefined;
    if (f) {
      if (finActive(f)) suite.fin = f;
      else delete suite.fin;
    }
    suite.prochain = indexGarde(p, suite, Math.min(a.prochain, p.jours.length - 1));
    await ecrire(suite);
    if (f && (a.fin?.cardioType !== f.cardioType || a.fin?.minutes !== f.minutes)) await oublierCardioDuProgramme(a.id);
    return suite;
  }
  const f = lireFinSeance(pp.fin);
  return demarrerProgramme_(pp.id, joursDuPerso(pp), f && finActive(f) ? f : null, null, plan);
}

/**
 * Supprimer ton programme construit : il est archivé (monProgramme.ts), jamais effacé, et s'il était en cours il
 * s'arrête. Tes séances enregistrées (historique, charges, records) ne sont pas touchées.
 */
async function supprimerProgrammePerso_(id: string): Promise<void> {
  const a = await chargerProgrammeActif();
  await archiverProgrammePerso(id);
  if (a && a.id === id) await ecrire(null);
}

/** Choisir toi-meme le prochain jour (tu as saute une seance, tu veux faire les jambes aujourd'hui...) */
async function choisirProchainJour_(index: number): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  await ecrire({ ...a, prochain: indexGarde(p, a, Math.min(Math.max(0, index), p.jours.length - 1)) });
}

/** Une seance du programme est enregistree : le jour suivant devient le prochain */
async function marquerJourFait_(programmeId: string, jourId: string, trainingId?: number, date?: string): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p || a.id !== programmeId) return;
  // 28 octobre 2026 : une seance d'un autre programme posee dans ta semaine compte aussi
  const jourFait = jourDuProgramme(p, jourId);
  if (!jourFait) return;
  const idx = p.jours.indexOf(jourFait);
  // la date de la seance (saisie apres coup) compte, pas celle de l'enregistrement
  const jour = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : jourLocal();
  const faits = [...a.faits, { date: jour, jourId, ...(trainingId ? { trainingId } : {}) }].slice(-400);
  // 30 octobre 2026 : une séance faite pendant ta semaine mixte ponctuelle ne fait pas avancer ton programme
  const mixte = !!ponctuelLe(a, new Date(`${jour}T12:00:00`));
  await ecrire({ ...a, faits, prochain: idx >= 0 && !mixte ? indexGarde(p, a, idx + 1) : a.prochain });
}

/** Semaine du programme (1 la premiere semaine) */
export function semaineDuProgramme(a: ProgrammeActif, aujourdhui = new Date()): number {
  const d = new Date(a.debut + 'T12:00:00');
  const t = new Date(jourLocal(aujourdhui) + 'T12:00:00');
  const jours = Math.max(0, Math.round((t.getTime() - d.getTime()) / 86400000));
  return Math.floor(jours / 7) + 1;
}

/** Seances du programme faites cette semaine (du lundi au dimanche) */
export function faitsCetteSemaine(a: ProgrammeActif, aujourdhui = new Date()): number {
  const t = new Date(jourLocal(aujourdhui) + 'T12:00:00');
  const lundi = new Date(t.getTime() - ((t.getDay() + 6) % 7) * 86400000);
  const debut = jourLocal(lundi);
  return a.faits.filter((f) => f.date >= debut).length;
}

/** La seance a faire : selon ton plan s'il y en a un (27 octobre 2026), sinon la suivante dans l'ordre */
export function prochainJour(a: ProgrammeActif, aujourdhui = new Date()): { programme: Programme; jour: JourProgramme; index: number } | null {
  const p = programmeParId(a.id);
  if (!p) return null;
  const duPlan = seanceAFaire(a, p, aujourdhui);
  if (duPlan) return { programme: p, jour: duPlan, index: p.jours.indexOf(duPlan) };
  const index = indexGarde(p, a, Math.min(a.prochain, p.jours.length - 1));
  return { programme: p, jour: p.jours[index], index };
}

export function plusJours(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  return jourLocal(new Date(d.getTime() + n * 86400000));
}

/** Semaine legere en cours aujourd'hui */
export function estSemaineLegere(a: ProgrammeActif, aujourdhui = new Date()): boolean {
  return !!a.legereJusquau && jourLocal(aujourdhui) <= a.legereJusquau;
}

/**
 * Proposer une semaine legere : toutes les 4 a 8 semaines (Bell 2025). YOROI la propose a partir de la
 * 5e semaine du programme, puis 4 semaines apres la derniere semaine legere.
 */
export function proposerSemaineLegere(a: ProgrammeActif, aujourdhui = new Date()): boolean {
  if (estSemaineLegere(a, aujourdhui)) return false;
  const derniere = (a.legeres ?? []).slice(-1)[0] ?? a.debut;
  const jours = Math.round((new Date(jourLocal(aujourdhui) + 'T12:00:00').getTime() - new Date(derniere + 'T12:00:00').getTime()) / 86400000);
  return jours >= 28;
}

/** Sept jours plus legers a partir d'aujourd'hui */
async function activerSemaineLegere_(): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a) return;
  const auj = jourLocal();
  await ecrire({ ...a, legereJusquau: plusJours(auj, 6), legeres: [...(a.legeres ?? []), auj].slice(-50) });
}

async function arreterSemaineLegere_(): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a) return;
  const { legereJusquau: _fin, ...reste } = a;
  await ecrire(reste);
}

/* ------------------------------------------------------------------------------------------------
 * Mon materiel (24 octobre 2026) : ce que tu as, pour remplacer les exercices impossibles (./materiel.ts).
 * null : jamais renseigne, les programmes restent tels quels.
 * ---------------------------------------------------------------------------------------------- */
const CLE_MATERIEL = 'yoroi_materiel_v1';

export async function chargerMateriel(): Promise<Equipement[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE_MATERIEL);
    if (!raw) return null;
    const liste = JSON.parse(raw);
    if (!Array.isArray(liste)) return null;
    return liste.filter((e): e is Equipement => TOUT_LE_MATERIEL.includes(e));
  } catch {
    return null;
  }
}

async function enregistrerMateriel_(liste: Equipement[] | null): Promise<void> {
  try {
    if (liste) await AsyncStorage.setItem(CLE_MATERIEL, JSON.stringify(Array.from(new Set(liste))));
    else await AsyncStorage.removeItem(CLE_MATERIEL);
  } catch {
    // stockage indisponible : les programmes restent tels quels
  }
  prevenir();
}

/**
 * Ma salle (26 octobre 2026) : les machines precises de ta salle (ids de lib/v2/seance/machines.ts), a cote du
 * materiel. Cle a part : les anciennes versions lisent toujours la liste du materiel telle quelle.
 * null : pas de detail, « Machines guidees » vaut pour toutes les machines.
 */
const CLE_MACHINES = 'yoroi_salle_machines_v1';

export async function chargerMachines(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE_MACHINES);
    if (!raw) return null;
    const liste = JSON.parse(raw);
    if (!Array.isArray(liste)) return null;
    const ids = liste.filter((x): x is string => typeof x === 'string' && MACHINE_BY_ID.has(x));
    return ids.length ? ids : null;
  } catch {
    return null;
  }
}

/** Ton materiel et tes machines, enregistres ensemble (une seule mise a jour des ecrans) */
async function enregistrerSalle_(liste: Equipement[] | null, machines: string[] | null): Promise<void> {
  try {
    const ids = Array.from(new Set((machines ?? []).filter((x) => MACHINE_BY_ID.has(x))));
    if (ids.length) await AsyncStorage.setItem(CLE_MACHINES, JSON.stringify(ids));
    else await AsyncStorage.removeItem(CLE_MACHINES);
  } catch {
    // stockage indisponible : les programmes restent tels quels
  }
  await enregistrerMateriel_(liste);
}

/** Le materiel par defaut selon le lieu du questionnaire */
export function materielDuLieu(lieu: 'salle' | 'maison' | 'halteres'): Equipement[] {
  if (lieu === 'maison') return [];
  if (lieu === 'halteres') return ['halteres', 'banc'];
  return [...TOUT_LE_MATERIEL];
}

/* ------------------------------------------------------------------------------------------------
 * Le message du jour (24 octobre 2026) : « Aujourd'hui : Pectoraux... » a l'heure des rappels de seance.
 * Le texte vient du programme (lancer.ts, messageDuJour) ; la programmation reste celle des rappels de
 * seance (lib/notificationService.ts), sans doublon.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Les prochaines seances, dans l'ordre ou elles viennent. Avec un plan (27 octobre 2026) : la seance a faire,
 * puis celles des jours suivants du plan. Sans plan : le programme tourne dans l'ordre.
 */
export function seancesAVenir(a: ProgrammeActif, n: number, aujourdhui = new Date()): { programme: Programme; jour: JourProgramme; semaine: number }[] {
  const p = programmeParId(a.id);
  if (!p) return [];
  const out: { programme: Programme; jour: JourProgramme; semaine: number }[] = [];
  const sem = semaineEffective(a, p);
  const premier = sem ? seanceAFaire(a, p, aujourdhui) : null;
  if (sem && premier) {
    const le = (d: Date) => seanceDeLaSemaine(a, p, sem, d);
    out.push({ programme: p, jour: premier, semaine: semaineDuProgramme(a, aujourdhui) });
    // la suite : les jours de ta semaine apres le jour de cette seance (apres aujourd'hui si elle est rattrapee)
    const faitAuj = a.faits.some((f) => f.date === jourLocal(aujourdhui));
    const rattrapee = !le(aujourdhui) && !faitAuj && !!jourRateLe(a, (d) => !!le(d), aujourdhui);
    let ecart = 0;
    if (!rattrapee) {
      for (let k = faitAuj ? 1 : 0; k <= 14; k++) {
        if (le(ajouterJours(aujourdhui, k))?.id === premier.id) {
          ecart = k;
          break;
        }
      }
    }
    const base = ajouterJours(aujourdhui, ecart);
    for (let k = 1; out.length < n && k <= n * 14; k++) {
      const d = ajouterJours(base, k);
      const j = le(d);
      if (j) out.push({ programme: p, jour: j, semaine: semaineDuProgramme(a, d) });
    }
    return out;
  }
  // les seances de marche retirees par ta fin de seance ne sont pas annoncees
  let i = indexGarde(p, a, a.prochain);
  for (let k = 0; k < n; k++) {
    out.push({ programme: p, jour: p.jours[i], semaine: semaineDuProgramme(a) });
    i = indexGarde(p, a, i + 1);
  }
  return out;
}

/**
 * Pour les rappels dates : la seance de chaque date. Avec un plan, celle du jour (null un jour de repos) ;
 * sans plan, les seances dans l'ordre, une par date.
 */
export function seancesAuxDates(a: ProgrammeActif, dates: readonly Date[]): ({ programme: Programme; jour: JourProgramme; semaine: number } | null)[] {
  const p = programmeParId(a.id);
  if (!p) return dates.map(() => null);
  if (semaineEffective(a, p)) {
    return dates.map((d) => {
      const j = seanceDuPlanLe(a, p, d);
      return j ? { programme: p, jour: j, semaine: semaineDuProgramme(a, d) } : null;
    });
  }
  const suite = seancesAVenir(a, dates.length);
  return dates.map((_, k) => suite[k] ?? null);
}

/**
 * 30 octobre 2026 : les rappels de séance d'un programme à toi, ou d'une semaine qui alterne A et B, suivent ta
 * semaine du moment (semaine B comprise, et ta semaine mixte ponctuelle) : chaque date de séance a son rappel, un jour
 * de repos n'en a pas. `jours` (comme Date.getDay, 0 = dimanche) : les jours à essayer ; `seulementSeances` : ne garder
 * que les dates où seancesAuxDates trouve une séance. Sinon, les jours du réglage, comme avant.
 */
export function joursPourRappels(a: ProgrammeActif | null, joursReglage: readonly number[]): { jours: number[]; seulementSeances: boolean } {
  const p = a ? programmeParId(a.id) : null;
  const s = a && p ? semaineEffective(a, p) : null;
  if (a && p && s && (estProgrammePerso(p.id) || (s.ab && s.b))) return { jours: [0, 1, 2, 3, 4, 5, 6], seulementSeances: true };
  return { jours: [...joursReglage], seulementSeances: false };
}

/** Jours conseilles (0 = lundi) pour recevoir le message, selon les jours par semaine du programme */
export function joursConseilles(joursParSemaine: number): number[] {
  if (joursParSemaine <= 2) return [1, 3];
  if (joursParSemaine === 3) return [0, 2, 4];
  if (joursParSemaine === 4) return [0, 1, 3, 4];
  return [0, 1, 2, 3, 4, 5].slice(0, Math.min(6, joursParSemaine));
}

/* ------------------------------------------------------------------------------------------------
 * Tes programmes favoris (26 octobre 2026) : une etoile sur la page du programme et sur sa carte.
 * Stockes sur le telephone, en tete de la liste des programmes (« Tes favoris »).
 * ---------------------------------------------------------------------------------------------- */
const CLE_FAVORIS = 'yoroi_programmes_favoris_v1';

/** Ajoute ou retire un id (calcul pur, le dernier ajoute en premier) */
export function basculerDansFavoris(liste: string[], id: string): string[] {
  return liste.includes(id) ? liste.filter((x) => x !== id) : [id, ...liste];
}

export async function chargerFavoris(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CLE_FAVORIS);
    if (!raw) return [];
    const liste = JSON.parse(raw);
    if (!Array.isArray(liste)) return [];
    // un programme retire du catalogue disparait des favoris
    return Array.from(new Set(liste.filter((x): x is string => typeof x === 'string' && !!programmeParId(x))));
  } catch {
    return [];
  }
}

/** Etoile touchee : renvoie la nouvelle liste */
async function basculerFavori_(id: string): Promise<string[]> {
  const suite = basculerDansFavoris(await chargerFavoris(), id);
  try {
    await AsyncStorage.setItem(CLE_FAVORIS, JSON.stringify(suite));
  } catch {
    // stockage indisponible : l'etoile revient a son etat au prochain chargement
  }
  prevenir();
  return suite;
}

/* ------------------------------------------------------------------------------------------------
 * 28 octobre 2026 (audit « ne jamais perdre de donnees ») : chaque lecture modification ecriture passe dans
 * une file par cle. Avant, deux enregistrements rapproches (fin de seance qui marque le jour fait, et un
 * changement de jours ou de modules) lisaient le meme etat : le second ecrasait le premier, une seance faite
 * pouvait disparaitre de la progression. Les fonctions internes (nom_) ne passent pas par la file : elles
 * s'appellent entre elles sans s'attendre.
 * ---------------------------------------------------------------------------------------------- */
const files = new Map<string, Promise<unknown>>();
export function enFileProgramme<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  const avant = files.get(cle) ?? Promise.resolve();
  const p = avant.then(fn, fn);
  files.set(cle, p.catch(() => undefined));
  return p;
}
export function demarrerProgramme(...a: Parameters<typeof demarrerProgramme_>): ReturnType<typeof demarrerProgramme_> {
  return enFileProgramme(CLE, () => demarrerProgramme_(...a)) as ReturnType<typeof demarrerProgramme_>;
}
export function enregistrerFin(...a: Parameters<typeof enregistrerFin_>): ReturnType<typeof enregistrerFin_> {
  return enFileProgramme(CLE, () => enregistrerFin_(...a)) as ReturnType<typeof enregistrerFin_>;
}
export function enregistrerModules(...a: Parameters<typeof enregistrerModules_>): ReturnType<typeof enregistrerModules_> {
  return enFileProgramme(CLE, () => enregistrerModules_(...a)) as ReturnType<typeof enregistrerModules_>;
}
export function enregistrerJours(...a: Parameters<typeof enregistrerJours_>): ReturnType<typeof enregistrerJours_> {
  return enFileProgramme(CLE, () => enregistrerJours_(...a)) as ReturnType<typeof enregistrerJours_>;
}
export function enregistrerPlan(...a: Parameters<typeof enregistrerPlan_>): ReturnType<typeof enregistrerPlan_> {
  return enFileProgramme(CLE, () => enregistrerPlan_(...a)) as ReturnType<typeof enregistrerPlan_>;
}
export function enregistrerSemaine(...a: Parameters<typeof enregistrerSemaine_>): ReturnType<typeof enregistrerSemaine_> {
  return enFileProgramme(CLE, () => enregistrerSemaine_(...a)) as ReturnType<typeof enregistrerSemaine_>;
}
export function enregistrerDuree(...a: Parameters<typeof enregistrerDuree_>): ReturnType<typeof enregistrerDuree_> {
  return enFileProgramme(CLE, () => enregistrerDuree_(...a)) as ReturnType<typeof enregistrerDuree_>;
}
export function marquerPointVu(...a: Parameters<typeof marquerPointVu_>): ReturnType<typeof marquerPointVu_> {
  return enFileProgramme(CLE, () => marquerPointVu_(...a)) as ReturnType<typeof marquerPointVu_>;
}
export function garderCommeMonProgramme(...a: Parameters<typeof garderCommeMonProgramme_>): ReturnType<typeof garderCommeMonProgramme_> {
  return enFileProgramme(CLE, () => garderCommeMonProgramme_(...a)) as ReturnType<typeof garderCommeMonProgramme_>;
}
export function creerMixteHabituel(...a: Parameters<typeof creerMixteHabituel_>): ReturnType<typeof creerMixteHabituel_> {
  return enFileProgramme(CLE, () => creerMixteHabituel_(...a)) as ReturnType<typeof creerMixteHabituel_>;
}
export function lancerMixtePonctuel(...a: Parameters<typeof lancerMixtePonctuel_>): ReturnType<typeof lancerMixtePonctuel_> {
  return enFileProgramme(CLE, () => lancerMixtePonctuel_(...a)) as ReturnType<typeof lancerMixtePonctuel_>;
}
export function annulerMixtePonctuel(...a: Parameters<typeof annulerMixtePonctuel_>): ReturnType<typeof annulerMixtePonctuel_> {
  return enFileProgramme(CLE, () => annulerMixtePonctuel_(...a)) as ReturnType<typeof annulerMixtePonctuel_>;
}
export function modifierSemainePerso(...a: Parameters<typeof modifierSemainePerso_>): ReturnType<typeof modifierSemainePerso_> {
  return enFileProgramme(CLE, () => modifierSemainePerso_(...a)) as ReturnType<typeof modifierSemainePerso_>;
}
export function garderTemporaire(...a: Parameters<typeof garderTemporaire_>): ReturnType<typeof garderTemporaire_> {
  return enFileProgramme(CLE, () => garderTemporaire_(...a)) as ReturnType<typeof garderTemporaire_>;
}
export function remplacerExercice(...a: Parameters<typeof remplacerExercice_>): ReturnType<typeof remplacerExercice_> {
  return enFileProgramme(CLE, () => remplacerExercice_(...a)) as ReturnType<typeof remplacerExercice_>;
}
export function changerExerciceLe(...a: Parameters<typeof changerExerciceLe_>): ReturnType<typeof changerExerciceLe_> {
  return enFileProgramme(CLE, () => changerExerciceLe_(...a)) as ReturnType<typeof changerExerciceLe_>;
}
export function arreterProgramme(...a: Parameters<typeof arreterProgramme_>): ReturnType<typeof arreterProgramme_> {
  return enFileProgramme(CLE, () => arreterProgramme_(...a)) as ReturnType<typeof arreterProgramme_>;
}
export function suivreProgrammePerso(...a: Parameters<typeof suivreProgrammePerso_>): ReturnType<typeof suivreProgrammePerso_> {
  return enFileProgramme(CLE, () => suivreProgrammePerso_(...a)) as ReturnType<typeof suivreProgrammePerso_>;
}
export function supprimerProgrammePerso(...a: Parameters<typeof supprimerProgrammePerso_>): ReturnType<typeof supprimerProgrammePerso_> {
  return enFileProgramme(CLE, () => supprimerProgrammePerso_(...a)) as ReturnType<typeof supprimerProgrammePerso_>;
}
export function choisirProchainJour(...a: Parameters<typeof choisirProchainJour_>): ReturnType<typeof choisirProchainJour_> {
  return enFileProgramme(CLE, () => choisirProchainJour_(...a)) as ReturnType<typeof choisirProchainJour_>;
}
export function marquerJourFait(...a: Parameters<typeof marquerJourFait_>): ReturnType<typeof marquerJourFait_> {
  return enFileProgramme(CLE, () => marquerJourFait_(...a)) as ReturnType<typeof marquerJourFait_>;
}
export function activerSemaineLegere(...a: Parameters<typeof activerSemaineLegere_>): ReturnType<typeof activerSemaineLegere_> {
  return enFileProgramme(CLE, () => activerSemaineLegere_(...a)) as ReturnType<typeof activerSemaineLegere_>;
}
export function arreterSemaineLegere(...a: Parameters<typeof arreterSemaineLegere_>): ReturnType<typeof arreterSemaineLegere_> {
  return enFileProgramme(CLE, () => arreterSemaineLegere_(...a)) as ReturnType<typeof arreterSemaineLegere_>;
}
export function enregistrerSalle(...a: Parameters<typeof enregistrerSalle_>): ReturnType<typeof enregistrerSalle_> {
  return enFileProgramme(CLE_MATERIEL, () => enregistrerSalle_(...a)) as ReturnType<typeof enregistrerSalle_>;
}
export function enregistrerMateriel(...a: Parameters<typeof enregistrerMateriel_>): ReturnType<typeof enregistrerMateriel_> {
  return enFileProgramme(CLE_MATERIEL, () => enregistrerMateriel_(...a)) as ReturnType<typeof enregistrerMateriel_>;
}
export function basculerFavori(...a: Parameters<typeof basculerFavori_>): ReturnType<typeof basculerFavori_> {
  return enFileProgramme(CLE_FAVORIS, () => basculerFavori_(...a)) as ReturnType<typeof basculerFavori_>;
}
