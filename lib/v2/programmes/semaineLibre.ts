/**
 * Ta semaine libre (28 octobre 2026). Houari : « Sur chaque jour, je choisis ce que je fais : une séance du programme,
 * une séance d'un autre programme, ou repos. Je retire un jour, je mets deux fois la même séance, je remplace. »
 *
 * Le modèle :
 *  - Une semaine, ce sont sept cases (0 = lundi). Chaque case pointe vers une séance d'un programme (RefSeance :
 *    id du programme, id de la séance), ou null pour un jour de repos. La séance peut venir du programme suivi,
 *    d'un autre programme du catalogue (Legs du PPL, Full body...) ou d'un programme que tu as construit.
 *  - « Semaines A et B » (éteint par défaut) : deux semaines qui alternent. `depuis` est le lundi d'une semaine A.
 *  - Une séance d'un autre programme prend l'id « @programme/séance » dans ton programme : l'historique (faits),
 *    les exercices changés à la main (perso.ts) et la séance en cours la retrouvent. Les charges progressent par
 *    nom d'exercice (progression.ts), quelle que soit la séance : rien ne repart de zéro.
 *  - Sans semaine libre enregistrée, la semaine vient du plan d'avant (planJours.ts, ProgrammeActif.plan) : même
 *    résultat qu'avant, sans rien réécrire. La première modification l'enregistre (suivi.ts, enregistrerSemaine).
 * Données pures, testées dans __tests__/unit/semaineLibre.test.ts.
 */
import { programmeParId } from './catalogue';
import { indexJour } from './coach';
import { estJourMuscu, joursRetires, retenirJourAutre } from './finSeance';
import type { FinSeance } from './finSeance';
import { GROUPES_PROGRAMMES } from './modules';
import { musclesDeExo } from './musclesExos';
import { estPlanFixe, indicesGardes, planValide, REPOS } from './planJours';
import { estProgrammePerso } from './registrePerso';
import type { JourProgramme, Programme } from './types';

export type RefSeance = { p: string; s: string };
export type CaseSemaine = RefSeance | null;
export type SemaineLibre = {
  /** sept cases, 0 = lundi ; null : repos */
  a: CaseSemaine[];
  /** la semaine B, gardée même quand « Semaines A et B » est éteint */
  b?: CaseSemaine[];
  /** vrai : les semaines A et B alternent */
  ab?: boolean;
  /** lundi (date locale « 2026-10-26 ») d'une semaine A */
  depuis?: string;
};
export type LigneSemaine = 'a' | 'b';

/** 28 octobre 2026 : durées proposées, en semaines ; 0 = sans fin (la semaine se répète) */
export const DUREES = [8, 12, 0] as const;
export function lireDuree(v: unknown): number | undefined {
  return v === 0 || v === 8 || v === 12 ? v : undefined;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------------------------------------------------------------------------
 * Lecture stricte : rien de ce qui vient du stockage n'est cru sur parole
 * ---------------------------------------------------------------------------------------------- */
function lireRef(v: unknown): CaseSemaine {
  if (!v || typeof v !== 'object') return null;
  const { p, s } = v as { p?: unknown; s?: unknown };
  if (typeof p !== 'string' || typeof s !== 'string' || !p || !s || p.length > 120 || s.length > 160) return null;
  return { p, s };
}

function lireLigne(v: unknown): CaseSemaine[] | null {
  if (!Array.isArray(v) || v.length !== 7) return null;
  return v.map(lireRef);
}

export function lireSemaine(v: unknown): SemaineLibre | null {
  if (!v || typeof v !== 'object') return null;
  const x = v as Record<string, unknown>;
  const a = lireLigne(x.a);
  if (!a) return null;
  const b = lireLigne(x.b);
  const depuis = typeof x.depuis === 'string' && ISO.test(x.depuis) ? x.depuis : undefined;
  return { a, ...(b ? { b } : {}), ...(b && x.ab === true && depuis ? { ab: true } : {}), ...(depuis ? { depuis } : {}) };
}

/** Au moins une séance dans la semaine (dans A et dans B quand elles alternent) */
export function semaineUtile(s: SemaineLibre | null | undefined): s is SemaineLibre {
  if (!s) return false;
  const pleine = (l: readonly CaseSemaine[]) => l.some((c) => !!c);
  return pleine(s.a) && (!s.ab || !s.b || pleine(s.b));
}

/* ------------------------------------------------------------------------------------------------
 * D'une case à la séance
 * ---------------------------------------------------------------------------------------------- */
export const idAutre = (r: RefSeance): string => `@${r.p}/${r.s}`;

export function lireIdAutre(id: string | null | undefined): RefSeance | null {
  const m = typeof id === 'string' ? /^@([^/]+)\/(.+)$/.exec(id) : null;
  return m ? { p: m[1], s: m[2] } : null;
}

/** Une séance d'un programme que tu as construit : ses programmes doivent être lus avant (monProgramme.ts) */
export function besoinDesPerso(jourId: string | null | undefined): boolean {
  const r = lireIdAutre(jourId);
  return !!r && estProgrammePerso(r.p);
}

export function semaineUtilisePerso(s: SemaineLibre | null | undefined): boolean {
  if (!s) return false;
  return [...s.a, ...(s.b ?? [])].some((c) => !!c && estProgrammePerso(c.p));
}

const cache = new Map<string, { src: JourProgramme; jour: JourProgramme }>();

/**
 * La séance d'une case, vue depuis le programme `baseId` : la sienne telle quelle, celle d'un autre programme avec
 * l'id « @programme/séance » (toujours le même objet, la fin de séance du programme suivi s'y applique). null : introuvable.
 */
export function jourDeRef(r: RefSeance | null | undefined, baseId: string): JourProgramme | null {
  if (!r) return null;
  const src = programmeParId(r.p)?.jours.find((j) => j.id === r.s);
  if (!src) return null;
  if (r.p === baseId) return src;
  const id = idAutre(r);
  const c = cache.get(id);
  if (c && c.src === src) return c.jour;
  const jour: JourProgramme = { ...src, id };
  cache.set(id, { src, jour });
  retenirJourAutre(jour);
  return jour;
}

/** Une séance de ton programme par son id : la sienne, ou une séance d'un autre programme posée dans ta semaine */
export function jourDuProgramme(p: Programme, jourId: string | null | undefined): JourProgramme | null {
  if (!jourId) return null;
  const propre = p.jours.find((j) => j.id === jourId);
  if (propre) return propre;
  const r = lireIdAutre(jourId);
  return r && r.p !== p.id ? jourDeRef(r, p.id) : null;
}

/** La case qui désigne cette séance de ton programme */
export function refDuJour(p: Programme, jour: Pick<JourProgramme, 'id'>): RefSeance {
  return lireIdAutre(jour.id) ?? { p: p.id, s: jour.id };
}

export const memeRef = (x: CaseSemaine | undefined, y: CaseSemaine | undefined): boolean => (!x && !y) || (!!x && !!y && x.p === y.p && x.s === y.s);

/* ------------------------------------------------------------------------------------------------
 * Semaines A et B
 * ---------------------------------------------------------------------------------------------- */
const jourLocal = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const lundiDe = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() - indexJour(d), 12);

/** Le lundi de la semaine de cette date, en date locale */
export const lundiIso = (d: Date): string => jourLocal(lundiDe(d));

/** Cette date tombe une semaine B */
export function estSemaineB(s: SemaineLibre, date: Date): boolean {
  if (!s.ab || !s.b || !s.depuis) return false;
  const ref = new Date(`${s.depuis}T12:00:00`);
  if (Number.isNaN(ref.getTime())) return false;
  const n = Math.round((lundiDe(date).getTime() - lundiDe(ref).getTime()) / (7 * 86400000));
  return ((n % 2) + 2) % 2 === 1;
}

export function ligneLe(s: SemaineLibre, date: Date): LigneSemaine {
  return estSemaineB(s, date) ? 'b' : 'a';
}

export function casesDe(s: SemaineLibre, ligne: LigneSemaine): CaseSemaine[] {
  return (ligne === 'b' ? s.b : null) ?? s.a;
}

/** La case de ce jour-là (null : repos) */
export function caseLe(s: SemaineLibre, date: Date): CaseSemaine {
  return casesDe(s, ligneLe(s, date))[indexJour(date)] ?? null;
}

/** La séance prévue ce jour-là, vue depuis le programme suivi (null : repos, ou séance introuvable) */
export function seanceLe(s: SemaineLibre, base: Programme, date: Date): JourProgramme | null {
  return jourDeRef(caseLe(s, date), base.id);
}

/** Les sept séances d'une ligne (null : repos) */
export function seancesDeLaLigne(s: SemaineLibre, base: Programme, ligne: LigneSemaine): (JourProgramme | null)[] {
  return casesDe(s, ligne).map((c) => jourDeRef(c, base.id));
}

/** Les jours d'entraînement d'une ligne (0 = lundi), triés */
export function joursDeLaLigne(s: SemaineLibre, base: Programme, ligne: LigneSemaine): number[] {
  return seancesDeLaLigne(s, base, ligne)
    .map((j, d) => (j ? d : -1))
    .filter((d) => d >= 0);
}

/* ------------------------------------------------------------------------------------------------
 * D'avant à maintenant, et retour (anciennes versions de l'app)
 * ---------------------------------------------------------------------------------------------- */
const vide = (): CaseSemaine[] => [null, null, null, null, null, null, null];

/** Le plan d'avant (le jour de chaque séance) devient une semaine, sans rien perdre */
export function semaineDepuisPlan(p: Programme, plan: readonly number[]): SemaineLibre {
  const a = vide();
  plan.forEach((d, i) => {
    if (Number.isInteger(d) && d >= 0 && d <= 6 && p.jours[i] && !a[d]) a[d] = { p: p.id, s: p.jours[i].id };
  });
  return { a };
}

/** Un programme en boucle (Séance A, Séance B sur 3 jours) : ses séances posées dans l'ordre sur tes jours, pour démarrer */
export function semaineDepuisBoucle(p: Programme, jours: readonly number[], fin?: FinSeance | null): SemaineLibre {
  const a = vide();
  const gardes = indicesGardes(p, fin);
  const tri = Array.from(new Set(jours.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((x, y) => x - y);
  tri.forEach((d, k) => {
    const i = gardes[k % gardes.length];
    if (p.jours[i]) a[d] = { p: p.id, s: p.jours[i].id };
  });
  return { a };
}

/**
 * La semaine dite comme un plan d'avant, quand c'est possible : seulement les séances du programme, chacune une fois
 * au plus, sans semaines A et B. Sinon null (les anciennes versions enchaînent alors tes séances sur tes jours).
 */
export function planDepuisSemaine(p: Programme, s: SemaineLibre, fin?: FinSeance | null): number[] | null {
  if (!estPlanFixe(p) || s.ab) return null;
  const gardes = indicesGardes(p, fin);
  const plan = p.jours.map(() => REPOS);
  for (let d = 0; d < 7; d++) {
    const c = s.a[d];
    if (!c) continue;
    if (c.p !== p.id) return null;
    const i = p.jours.findIndex((j) => j.id === c.s);
    if (i < 0 || plan[i] !== REPOS || !gardes.includes(i)) return null;
    plan[i] = d;
  }
  return planValide(p, plan, fin);
}

/** Pour ce qui lit encore un plan : le premier jour de chaque séance du programme dans la ligne de cette date */
export function planProjete(p: Programme, s: SemaineLibre, date: Date): number[] {
  const cases = casesDe(s, ligneLe(s, date));
  return p.jours.map((j) => cases.findIndex((c) => !!c && c.p === p.id && c.s === j.id));
}

/* ------------------------------------------------------------------------------------------------
 * Modifier sa semaine (calcul pur, enregistré par suivi.ts)
 * ---------------------------------------------------------------------------------------------- */
/** Ce jour reçoit cette séance (null : repos). Rien d'autre ne bouge : la même séance peut revenir deux fois */
export function avecCase(s: SemaineLibre, ligne: LigneSemaine, jour: number, c: CaseSemaine): SemaineLibre {
  if (!Number.isInteger(jour) || jour < 0 || jour > 6) return s;
  const cases = [...casesDe(s, ligne)];
  cases[jour] = c ? { p: c.p, s: c.s } : null;
  return ligne === 'b' ? { ...s, b: cases } : { ...s, a: cases };
}

/**
 * « Semaines A et B ». Allumé : la semaine B part d'une copie de A (ou de ta B d'avant), cette semaine est une A.
 * Éteint : seule A compte, ta semaine B est gardée pour la prochaine fois.
 */
export function avecAB(s: SemaineLibre, on: boolean, aujourdhui = new Date()): SemaineLibre {
  const { ab: _ab, ...reste } = s;
  if (!on) return reste;
  return { ...reste, b: s.b ? [...s.b] : [...s.a], ab: true, depuis: s.depuis && s.ab ? s.depuis : lundiIso(aujourdhui) };
}

/* ------------------------------------------------------------------------------------------------
 * Ce que ta semaine travaille : une ligne honnête par groupe, rien de bloqué
 * ---------------------------------------------------------------------------------------------- */
export type GroupeMuscle = 'pectoraux' | 'dos' | 'epaules' | 'bras' | 'jambes';
export const GROUPES_MUSCLES: GroupeMuscle[] = ['pectoraux', 'dos', 'epaules', 'bras', 'jambes'];

// muscles principaux de musclesExos.ts (MUSCLES_EXOS)
const GROUPE_DU_MUSCLE: Record<string, GroupeMuscle> = {
  Pectoraux: 'pectoraux',
  'Haut des pectoraux': 'pectoraux',
  Dorsaux: 'dos',
  'Milieu du dos': 'dos',
  'Épaules avant': 'epaules',
  'Épaules côté': 'epaules',
  'Arrière d’épaule': 'epaules',
  Biceps: 'bras',
  Triceps: 'bras',
  Quadriceps: 'jambes',
  Fessiers: 'jambes',
  'Moyen fessier': 'jambes',
  Ischios: 'jambes',
  Adducteurs: 'jambes',
  Mollets: 'jambes',
};
// groupe de la bibliothèque, pour un exercice absent de musclesExos.ts
const GROUPE_DU_POSTE: Record<string, GroupeMuscle> = {
  PECTORAUX: 'pectoraux',
  DOS: 'dos',
  'ÉPAULES': 'epaules',
  BICEPS: 'bras',
  TRICEPS: 'bras',
  JAMBES: 'jambes',
  ISCHIOS: 'jambes',
  FESSIERS: 'jambes',
  MOLLETS: 'jambes',
};

/** Les groupes qu'une séance de musculation fait travailler en premier (muscles principaux de ses exercices) */
export function groupesDeSeance(j: JourProgramme): GroupeMuscle[] {
  if (!estJourMuscu(j)) return [];
  const out = new Set<GroupeMuscle>();
  for (const e of j.exos) {
    const m = musclesDeExo(e.nom);
    const groupes = m ? m.principaux.map((x) => GROUPE_DU_MUSCLE[x]) : [GROUPE_DU_POSTE[e.muscle]];
    for (const g of groupes) if (g) out.add(g);
  }
  return GROUPES_MUSCLES.filter((g) => out.has(g));
}

/** Combien de jours de la semaine travaillent chaque groupe */
export function couverture(seances: readonly (JourProgramme | null)[]): { groupe: GroupeMuscle; fois: number }[] {
  const n = new Map<GroupeMuscle, number>();
  for (const j of seances) if (j) for (const g of groupesDeSeance(j)) n.set(g, (n.get(g) ?? 0) + 1);
  return GROUPES_MUSCLES.map((groupe) => ({ groupe, fois: n.get(groupe) ?? 0 }));
}

/** La semaine n'a aucune séance de musculation (sac, course) : pas de ligne par muscle */
export const aDeLaMuscu = (seances: readonly (JourProgramme | null)[]): boolean => seances.some((j) => !!j && estJourMuscu(j));

const GRANDS_MUSCLES = ['pectoraux', 'dos', 'jambes', 'fessiers'];

/**
 * Deux séances de musculation qui travaillent un même grand muscle sur deux jours qui se suivent (dimanche puis lundi
 * compris), même deux fois la même séance. Rien n'est bloqué, YOROI le dit seulement (comme planJours.ts).
 */
export function seancesTropProches(seances: readonly (JourProgramme | null)[]): { jour: number; suivant: number; muscle: string }[] {
  const out: { jour: number; suivant: number; muscle: string }[] = [];
  for (let d = 0; d < 7; d++) {
    const ja = seances[d];
    const jb = seances[(d + 1) % 7];
    if (!ja || !jb || !estJourMuscu(ja) || !estJourMuscu(jb)) continue;
    const m = GRANDS_MUSCLES.find((x) => ja.muscles.includes(x) && jb.muscles.includes(x));
    if (m) out.push({ jour: d, suivant: (d + 1) % 7, muscle: m });
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Les séances que tu peux poser sur un jour
 * ---------------------------------------------------------------------------------------------- */
export type FamilleSeance = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'fullbody' | 'perso';
export const FAMILLES_SEANCES: { id: FamilleSeance; label: string }[] = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' },
  { id: 'fullbody', label: 'Full body' },
  { id: 'perso', label: 'Mes séances' },
];

export type SeanceProposee = { ref: RefSeance; jour: JourProgramme; programme: Programme };

const FULL_BODY = new Set(GROUPES_PROGRAMMES.find((g) => g.id === 'full-body')?.ids ?? []);

/** La famille d'une séance de musculation du catalogue, d'après son nom (« Push A, force », « Lower : ... ») */
export function familleDeSeance(p: Programme, j: JourProgramme): FamilleSeance | null {
  if (!estJourMuscu(j)) return null;
  if (estProgrammePerso(p.id)) return 'perso';
  const t = j.titre.trim();
  if (/^Push\b/.test(t)) return 'push';
  if (/^Pull\b/.test(t)) return 'pull';
  if (/^Legs\b/.test(t)) return 'legs';
  if (/^Upper\b/.test(t)) return 'upper';
  if (/^Lower\b/.test(t)) return 'lower';
  if (FULL_BODY.has(p.id)) return 'fullbody';
  return null;
}

const signature = (j: JourProgramme): string => j.exos.map((e) => `${e.nom}:${e.series}:${e.repsMin}:${e.repsMax}`).join('|');

/**
 * « Ce programme » (ses séances, sans les marches retirées) et « Autres séances », rangées par famille. Une séance
 * identique à une autre déjà proposée n'apparaît qu'une fois. `persos` : tes programmes construits (non archivés).
 */
export function seancesProposees(
  base: Programme,
  catalogue: readonly Programme[],
  persos: readonly Programme[] = [],
  fin?: FinSeance | null,
): { ceProgramme: SeanceProposee[]; autres: { famille: FamilleSeance; label: string; seances: SeanceProposee[] }[] } {
  const retires = joursRetires(base, fin);
  const ceProgramme = base.jours.filter((j) => !retires.includes(j.id)).map((jour) => ({ ref: { p: base.id, s: jour.id }, jour, programme: base }));
  const vues = new Set(ceProgramme.map((x) => signature(x.jour)));
  const parFamille = new Map<FamilleSeance, SeanceProposee[]>();
  for (const p of [...catalogue, ...persos]) {
    if (p.id === base.id) continue;
    for (const jour of p.jours) {
      const f = familleDeSeance(p, jour);
      if (!f) continue;
      const sig = `${f === 'perso' ? p.id : ''}${signature(jour)}`;
      if (vues.has(sig)) continue;
      vues.add(sig);
      parFamille.set(f, [...(parFamille.get(f) ?? []), { ref: { p: p.id, s: jour.id }, jour, programme: p }]);
    }
  }
  const autres = FAMILLES_SEANCES.filter((f) => parFamille.has(f.id)).map((f) => ({ famille: f.id, label: f.label, seances: parFamille.get(f.id)! }));
  return { ceProgramme, autres };
}
