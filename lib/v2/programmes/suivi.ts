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
import { indexJour, jourRate, joursValides } from './coach';
import { estPlanFixe, indicesGardes, joursDuPlan, memePlan, planParDefaut, planValide, REPOS } from './planJours';
import { avecRemplacement, cleCase } from './perso';
import type { Remplacements } from './perso';
import { joursRetires, lireFinSeance, retenirFinActive } from './finSeance';
import type { FinSeance } from './finSeance';
import { extrasDe, finDesModules, lireModules, modulesActifs, normaliserModules } from './modules';
import type { ModuleId } from './modules';
import { MACHINE_BY_ID } from '@/lib/v2/seance/machines';
import { estProgrammePerso } from './registrePerso';
import { archiverProgrammePerso, chargerProgrammesPerso, joursDuPerso } from './monProgramme';
import type { ProgrammePerso } from './monProgramme';
import { LIBELLE_REGION } from './blessures';
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
  const plan = p.jours.map((j) => Number(/-d(\d)$/.exec(j.id)?.[1] ?? -1));
  return plan.every((d) => d >= 0 && d <= 6) && new Set(plan).size === plan.length && plan.length ? plan : null;
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
    const raw = await AsyncStorage.getItem(CLE);
    if (!raw) return null;
    const brut = JSON.parse(raw) as ProgrammeActif;
    // ton programme construit : sa semaine est lue avant (programmeParId le trouve ensuite, registrePerso.ts)
    if (brut && estProgrammePerso(brut.id)) await chargerProgrammesPerso();
    const p = brut && programmeParId(brut.id);
    if (!p) {
      retenirFinActive(null);
      return null;
    }
    // fin de seance : absente dans les anciennes versions, illisible = ignoree
    const { fin: _f, modules: _m, plan: _p, douleurs: _d, ...reste } = brut;
    const fin = lireFinSeance(brut.fin);
    const modules = lireModules(brut.modules);
    const douleurs = lireDouleurs(brut.douleurs);
    // plan illisible ou d'une autre version du programme : ignoré, tes jours prennent le relais.
    // Ton programme construit : toujours la semaine que tu as construite (modifiée ou non depuis)
    const plan = planDuProgrammePerso(p) ?? planValide(p, brut.plan, fin);
    const a: ProgrammeActif = { ...reste, ...(fin ? { fin } : {}), ...(modules ? { modules } : {}), ...(douleurs ? { douleurs } : {}), ...(plan ? { plan, jours: joursDuPlan(plan) } : {}), faits: Array.isArray(brut.faits) ? brut.faits : [], prochain: 0 };
    a.prochain = indexGarde(p, a, Math.min(Math.max(0, brut.prochain | 0), p.jours.length - 1));
    retenirFinActive(a.id, a.fin, a.modules);
    return a;
  } catch {
    return null;
  }
}

async function ecrire(a: ProgrammeActif | null): Promise<void> {
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
export async function demarrerProgramme(id: string, jours?: number[], fin?: FinSeance | null, modules?: readonly ModuleId[] | null, plan?: readonly number[] | null, options?: { douleurs?: readonly Region[] | null }): Promise<ProgrammeActif | null> {
  if (estProgrammePerso(id)) await chargerProgrammesPerso();
  const p = programmeParId(id);
  if (!p) return null;
  const choisis = joursValides(jours);
  const f = modules ? finDesModules(modules, lireFinSeance(fin)) : lireFinSeance(fin);
  const extras = extrasDe(modules);
  const douleurs = lireDouleurs(options?.douleurs);
  const a: ProgrammeActif = { id, debut: jourLocal(), prochain: 0, faits: [], ...(choisis ? { jours: choisis } : {}), ...(f && (modules ? f.choix !== 'rien' || f.sansMarche : true) ? { fin: f } : {}), ...(extras.length ? { modules: extras } : {}), ...(douleurs ? { douleurs } : {}) };
  // 27 octobre 2026 : tes jours séance par séance (Tes jours), choisis au départ ; ton programme construit : sa semaine
  const pl = planDuProgrammePerso(p) ?? planValide(p, plan, a.fin);
  if (pl) {
    a.plan = pl;
    a.jours = joursDuPlan(pl);
  }
  a.prochain = indexGarde(p, a, 0);
  await ecrire(a);
  return a;
}

/** Ta fin de seance change (abdos, cardio, seances de marche gardees ou non) */
export async function enregistrerFin(fin: FinSeance): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  const f = lireFinSeance(fin);
  if (!a || !p || !f) return;
  const suite: ProgrammeActif = planSuitLaFin(p, a.fin, { ...a, fin: f });
  suite.prochain = indexGarde(p, suite, a.prochain);
  await ecrire(suite);
}

/**
 * Tes modules changent (liste complete : force, grip, cou, abdos, cardio, mobilite). `minutes` et `sansMarche`
 * reglent la fin de seance ; absents, ceux du programme en cours restent.
 */
export async function enregistrerModules(modules: readonly ModuleId[], options?: { minutes?: number; sansMarche?: boolean }): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  const liste = normaliserModules(modules);
  const base = { minutes: options?.minutes ?? a.fin?.minutes, sansMarche: options?.sansMarche ?? a.fin?.sansMarche };
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
export async function enregistrerJours(jours: number[]): Promise<void> {
  const a = await chargerProgrammeActif();
  const choisis = joursValides(jours);
  if (!a || !choisis) return;
  const { plan: _p, ...reste } = a;
  await ecrire({ ...reste, jours: choisis });
}

/**
 * 27 octobre 2026 : Tes jours, seance par seance (Push lundi, Pull mardi...). L'historique et la progression ne
 * bougent pas : seule la seance de chaque jour change, a partir d'aujourd'hui.
 */
export async function enregistrerPlan(plan: readonly number[]): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  const pl = planValide(p, plan, a.fin);
  if (!pl) return;
  if (memePlan(pl, a.plan) && memePlan(joursDuPlan(pl), a.jours ?? null)) return;
  await ecrire({ ...a, plan: pl, jours: joursDuPlan(pl) });
}

/**
 * Le plan qui compte : celui que tu as fait, sinon tes jours dans l'ordre (ou les jours conseilles) s'ils sont
 * aussi nombreux que les seances. null : programme en boucle, ou tes jours ne collent pas au nombre de seances
 * (les seances s'enchainent alors dans l'ordre, comme avant).
 */
export function planEffectif(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin'> | null, p: Programme): number[] | null {
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
  const plan = a && a.id === p.id ? planEffectif(a, p) : null;
  if (plan) return joursDuPlan(plan);
  return joursValides(a?.jours) ?? joursConseilles(p.joursParSemaine);
}

const ajouterJours = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/**
 * La seance a faire selon ton plan (programme a la semaine) : celle d'aujourd'hui si elle n'est pas faite ;
 * un jour de repos, celle d'un jour prevu rate (on rattrape) ; sinon la prochaine de la semaine. null sans plan.
 */
export function indexDuPlan(a: ProgrammeActif, p: Programme, aujourdhui = new Date()): number | null {
  const plan = planEffectif(a, p);
  if (!plan) return null;
  const iso = jourLocal(aujourdhui);
  const iAuj = plan.indexOf(indexJour(aujourdhui));
  const faitAuj = a.faits.some((f) => f.date === iso);
  if (iAuj >= 0 && !faitAuj) return iAuj;
  if (iAuj < 0 && !faitAuj) {
    const rate = jourRate(a, joursDuPlan(plan), aujourdhui);
    const iRate = rate ? plan.indexOf(indexJour(rate)) : -1;
    if (iRate >= 0) return iRate;
  }
  for (let k = 1; k <= 7; k++) {
    const i = plan.indexOf(indexJour(ajouterJours(aujourdhui, k)));
    if (i >= 0) return i;
  }
  return null;
}

/** La seance prevue ce jour la par ton plan (null : repos ce jour, ou programme sans plan) */
export function seanceDuPlanLe(a: Pick<ProgrammeActif, 'plan' | 'jours' | 'fin'> | null, p: Programme, date: Date): JourProgramme | null {
  const plan = planEffectif(a, p);
  if (!plan) return null;
  const i = plan.indexOf(indexJour(date));
  return i >= 0 ? p.jours[i] : null;
}

/**
 * « Changer » sur la page du programme : l'exercice de la case `index` du jour devient `nom`
 * (null, ou le nom d'origine : tu reviens a l'exercice du programme). Series, repetitions et repos ne bougent pas.
 */
export async function remplacerExercice(jourId: string, index: number, nom: string | null, original?: string): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  const jour = p.jours.find((j) => j.id === jourId);
  if (!jour || index < 0 || index >= jour.exos.length) return;
  const remplacements = avecRemplacement(a.remplacements, cleCase(jourId, index), nom, original ?? jour.exos[index].nom);
  const { remplacements: _ancien, ...reste } = a;
  await ecrire(Object.keys(remplacements).length ? { ...reste, remplacements } : reste);
}

export async function arreterProgramme(): Promise<void> {
  await ecrire(null);
}

/* ------------------------------------------------------------------------------------------------
 * Ton programme construit (27 octobre 2026, « Je construis le mien », monProgramme.ts) : enregistré, il devient
 * ton programme en cours. Déjà en cours : il est mis à jour sans perdre ton début, tes séances faites ni ta
 * progression ; seuls les jours suivent ta nouvelle semaine.
 * ---------------------------------------------------------------------------------------------- */
export async function suivreProgrammePerso(pp: Pick<ProgrammePerso, 'id' | 'semaine'>): Promise<ProgrammeActif | null> {
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
    suite.prochain = indexGarde(p, suite, Math.min(a.prochain, p.jours.length - 1));
    await ecrire(suite);
    return suite;
  }
  return demarrerProgramme(pp.id, joursDuPerso(pp), null, null, plan);
}

/**
 * Supprimer ton programme construit : il est archivé (monProgramme.ts), jamais effacé, et s'il était en cours il
 * s'arrête. Tes séances enregistrées (historique, charges, records) ne sont pas touchées.
 */
export async function supprimerProgrammePerso(id: string): Promise<void> {
  const a = await chargerProgrammeActif();
  await archiverProgrammePerso(id);
  if (a && a.id === id) await ecrire(null);
}

/** Choisir toi-meme le prochain jour (tu as saute une seance, tu veux faire les jambes aujourd'hui...) */
export async function choisirProchainJour(index: number): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  await ecrire({ ...a, prochain: indexGarde(p, a, Math.min(Math.max(0, index), p.jours.length - 1)) });
}

/** Une seance du programme est enregistree : le jour suivant devient le prochain */
export async function marquerJourFait(programmeId: string, jourId: string, trainingId?: number, date?: string): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p || a.id !== programmeId) return;
  const idx = p.jours.findIndex((j) => j.id === jourId);
  if (idx < 0) return;
  // la date de la seance (saisie apres coup) compte, pas celle de l'enregistrement
  const jour = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : jourLocal();
  const faits = [...a.faits, { date: jour, jourId, ...(trainingId ? { trainingId } : {}) }].slice(-400);
  await ecrire({ ...a, faits, prochain: indexGarde(p, a, idx + 1) });
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
  const duPlan = indexDuPlan(a, p, aujourdhui);
  const index = duPlan ?? indexGarde(p, a, Math.min(a.prochain, p.jours.length - 1));
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
export async function activerSemaineLegere(): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a) return;
  const auj = jourLocal();
  await ecrire({ ...a, legereJusquau: plusJours(auj, 6), legeres: [...(a.legeres ?? []), auj].slice(-50) });
}

export async function arreterSemaineLegere(): Promise<void> {
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

export async function enregistrerMateriel(liste: Equipement[] | null): Promise<void> {
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
export async function enregistrerSalle(liste: Equipement[] | null, machines: string[] | null): Promise<void> {
  try {
    const ids = Array.from(new Set((machines ?? []).filter((x) => MACHINE_BY_ID.has(x))));
    if (ids.length) await AsyncStorage.setItem(CLE_MACHINES, JSON.stringify(ids));
    else await AsyncStorage.removeItem(CLE_MACHINES);
  } catch {
    // stockage indisponible : les programmes restent tels quels
  }
  await enregistrerMateriel(liste);
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
  const plan = planEffectif(a, p);
  const premier = plan ? indexDuPlan(a, p, aujourdhui) : null;
  if (plan && premier !== null) {
    out.push({ programme: p, jour: p.jours[premier], semaine: semaineDuProgramme(a, aujourdhui) });
    // la suite : les jours du plan apres le jour de cette seance (apres aujourd'hui si elle est rattrapee)
    const faitAuj = a.faits.some((f) => f.date === jourLocal(aujourdhui));
    const rattrapee = plan.indexOf(indexJour(aujourdhui)) < 0 && !faitAuj && !!jourRate(a, joursDuPlan(plan), aujourdhui);
    let ecart = 0;
    if (!rattrapee) {
      for (let k = faitAuj ? 1 : 0; k <= 7; k++) {
        if (plan.indexOf(indexJour(ajouterJours(aujourdhui, k))) === premier) {
          ecart = k;
          break;
        }
      }
    }
    const base = ajouterJours(aujourdhui, ecart);
    for (let k = 1; out.length < n && k <= n * 7; k++) {
      const d = ajouterJours(base, k);
      const i = plan.indexOf(indexJour(d));
      if (i >= 0) out.push({ programme: p, jour: p.jours[i], semaine: semaineDuProgramme(a, d) });
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
  if (planEffectif(a, p)) {
    return dates.map((d) => {
      const j = seanceDuPlanLe(a, p, d);
      return j ? { programme: p, jour: j, semaine: semaineDuProgramme(a, d) } : null;
    });
  }
  const suite = seancesAVenir(a, dates.length);
  return dates.map((_, k) => suite[k] ?? null);
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
export async function basculerFavori(id: string): Promise<string[]> {
  const suite = basculerDansFavoris(await chargerFavoris(), id);
  try {
    await AsyncStorage.setItem(CLE_FAVORIS, JSON.stringify(suite));
  } catch {
    // stockage indisponible : l'etoile revient a son etat au prochain chargement
  }
  prevenir();
  return suite;
}
