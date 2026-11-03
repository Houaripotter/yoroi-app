/**
 * Changer d'exercice (31 octobre 2026, Houari : « quand tu me prescris mollets assis, dans ma salle au Mali c'est
 * une machine où on est debout. Quand j'appuie sur Changer, propose moi une autre machine, avec une recherche »).
 *
 * Trois choses, toutes tirees des vraies donnees de la base, rien d'invente :
 *  - equivalents : les exercices du meme groupe musculaire de constants/exerciseLibrary.ts (ou de tes machines),
 *    ranges en trois familles, les autres machines d'abord, puis les poids libres, puis le poids du corps.
 *    Dans chaque famille : tes machines, les remplacants ecrits a la main (lib/v2/programmes/materiel.ts), ceux qui
 *    ont le meme muscle principal (lib/v2/programmes/musclesExos.ts), ceux que tu as deja faits, puis l'ordre de la
 *    bibliotheque. Muscle inconnu : il est cherche par le nom de l'exercice.
 *  - chercherPourChanger : la recherche de lib/v2/seance/rechercheExo.ts (accents, pluriels, synonymes de salle,
 *    « calf », « mollet debout »), plus les fautes simples (une lettre de trop, en moins ou changee).
 *  - changerDansSeance : les series deja faites restent sur l'exercice d'origine (historique et records justes),
 *    les series restantes passent sur le nouvel exercice, a la meme place dans la seance (superset compris).
 * Donnees pures, testees dans __tests__/unit/changerExo.test.ts.
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { besoinDe, remplacantsDe } from '@/lib/v2/programmes/materiel';
import { musclesDeExo } from '@/lib/v2/programmes/musclesExos';
import { MACHINES } from '@/lib/v2/seance/machines';
import { chercherExos, motsSynonymes, nomFr, plier } from '@/lib/v2/seance/rechercheExo';
import type { ExoCherchable } from '@/lib/v2/seance/rechercheExo';
import { sansPrise } from '@/lib/v2/seance/prise';
import type { LiveExercise, LiveSet } from '@/lib/v2/seance/model';
import { machineDe } from './machinesPerso';
import type { MachinePerso } from './machinesPerso';

export type FamilleChange = 'machine' | 'libre' | 'corps';
export const ORDRE_FAMILLES: FamilleChange[] = ['machine', 'libre', 'corps'];
/** titres des familles (francais, traduits a l'affichage) */
export const TITRE_FAMILLE: Record<FamilleChange, string> = {
  machine: 'Sur une autre machine',
  libre: 'Avec des poids libres',
  corps: 'Au poids du corps',
};
export const MAX_PAR_FAMILLE = 5;

export type Equivalent = {
  /** nom enregistre : celui de la bibliotheque, ou de ta machine */
  nom: string;
  /** groupe de la bibliotheque (MOLLETS, ABDOS...) */
  muscle: string;
  famille: FamilleChange;
  /** une de tes machines */
  perso?: boolean;
  /** meme muscle principal que l'exercice d'origine */
  meme?: boolean;
};

const sansAccent = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const memeGroupe = (a: string | undefined, b: string | undefined) => !!a && !!b && sansAccent(a) === sansAccent(b);

/* ---------------------------------- la base ---------------------------------- */

/** Cle de doublon : « Mollets Debout (Machine) » et « Standing Calf Raise » (Mollets debout) sont le meme exercice */
export function cleDoublon(nom: string): string {
  return plier(nomFr(sansPrise(nom).base)).replace(/\bmachine\b/g, ' ').replace(/\s+/g, ' ').trim();
}

type Fiche = { nom: string; muscle: string; rang: number };
let biblio: Fiche[] | null = null;
/** Les exercices de musculation de la base (repetitions ou temps), sans doublon, dans l'ordre de la bibliotheque */
export function bibliothequeMuscu(): Fiche[] {
  if (biblio) return biblio;
  const vus = new Set<string>();
  biblio = [];
  EXERCISE_LIBRARY.forEach((e, rang) => {
    if (e.category !== 'musculation' || !e.muscle || (e.unit !== 'reps' && e.unit !== 'time')) return;
    const k = cleDoublon(e.name);
    if (vus.has(k)) return;
    vus.add(k);
    biblio!.push({ nom: e.name, muscle: e.muscle, rang });
  });
  return biblio;
}

/** Exercices permis par une vraie machine du catalogue (sans les stations a tout faire : cage, barre guidee) */
let parMachine: Set<string> | null = null;
function exerciceDeMachine(nom: string): boolean {
  if (!parMachine) {
    parMachine = new Set();
    // les bancs, la chaise romaine et les barres paralleles portent des exercices aux poids libres ou au poids du corps
    const pasUneMachine = /^banc_|^chaise_romaine$|^barres_paralleles$|^landmine$|^rowing_tbar$|^smith_machine$/;
    for (const m of MACHINES) if (m.groupe !== 'POLYVALENT' && !pasUneMachine.test(m.id)) m.exercices.forEach((x) => parMachine!.add(x));
  }
  return parMachine.has(nom);
}

const POIDS_LIBRES = ['halteres', 'barre', 'kettlebell', 'trap_bar', 'elastiques'];
const NOM_CORPS = /swiss ball|slider|poids du corps|bodyweight/i;
const NOM_MACHINE = /machine|presse|leg press|smith|pec deck|butterfly|hack|leg curl|leg extension|poulie|cable|câble|pulldown|seated row|low row|guidée/i;
const NOM_LIBRE = /halt[eè]re|dumbbell|kettlebell|\bkb\b|barre|barbell|\bez\b|trap bar|landmine|disque|lest[eé]|weighted|élastique|band|\bbench\b|\bpress\b|deadlift|\brdl\b|\bsdt\b/i;

/** La famille d'un exercice : sa fiche de materiel, le catalogue des machines, sinon les mots de son nom */
export function familleChange(nom: string, perso: readonly MachinePerso[] = []): FamilleChange {
  const base = sansPrise(nom ?? '').base;
  if (machineDe(perso, base)) return 'machine';
  const b = besoinDe(base);
  if (b && b[0]) {
    const c = b[0];
    if (c.includes('machines') || c.includes('poulie')) return 'machine';
    if (c.some((x) => POIDS_LIBRES.includes(x))) return 'libre';
    return 'corps';
  }
  if (NOM_CORPS.test(base)) return 'corps';
  if (exerciceDeMachine(base)) return 'machine';
  if (NOM_MACHINE.test(base)) return 'machine';
  if (NOM_LIBRE.test(base)) return 'libre';
  return 'corps';
}

/* ---------------------------------- le muscle ---------------------------------- */

const muscleBiblio = (nom: string): string | undefined => {
  const base = sansPrise(nom ?? '').base;
  const k = cleDoublon(base);
  return EXERCISE_LIBRARY.find((e) => e.category === 'musculation' && (e.name === base || cleDoublon(e.name) === k))?.muscle;
};

/** Les groupes de la bibliotheque (MOLLETS, ÉPAULES...), ecrits comme dans la bibliotheque */
export function groupesMuscu(): string[] {
  return Array.from(new Set(bibliothequeMuscu().map((f) => f.muscle)));
}

/** Un muscle venu d'ailleurs (« Mollets », « epaules ») ecrit comme dans la bibliotheque, sinon null */
export function groupeConnu(m: string | undefined | null): string | null {
  if (!m) return null;
  return groupesMuscu().find((g) => sansAccent(g) === sansAccent(m)) ?? null;
}

/**
 * Le groupe de l'exercice : la bibliotheque, tes machines, le muscle connu de la seance, et sinon (donnee qui
 * manque) l'exercice de la base dont le nom lui ressemble le plus.
 */
export function musclePour(nom: string, o: { muscle?: string | null; perso?: readonly MachinePerso[] } = {}): string | null {
  const base = sansPrise(nom ?? '').base;
  const lib = muscleBiblio(base);
  if (lib) return lib;
  const m = machineDe(o.perso ?? [], base);
  if (m) return groupeConnu(m.muscle) ?? m.muscle;
  const connu = groupeConnu(o.muscle);
  if (connu) return connu;
  // le nom entier, puis de moins en moins de mots : « Mollets debout chez moi » trouve les mollets debout
  const mots = plier(base).split(' ').filter(Boolean);
  for (let n = mots.length; n > 0; n--) {
    const trouve = chercherPourChanger(mots.slice(0, n).join(' '), { perso: o.perso })[0];
    if (trouve) return trouve.muscle;
  }
  return null;
}

/* ---------------------------------- les equivalents ---------------------------------- */

export function equivalents(
  nom: string,
  o: { muscle?: string | null; perso?: readonly MachinePerso[]; ecartes?: Iterable<string>; deja?: Iterable<string>; compte?: (nom: string) => number; max?: number } = {},
): Equivalent[] {
  const perso = o.perso ?? [];
  const base = sansPrise(nom ?? '').base;
  const muscle = musclePour(base, { muscle: o.muscle, perso });
  if (!muscle) return [];
  const exclus = new Set<string>([cleDoublon(base), ...Array.from(o.ecartes ?? [], cleDoublon), ...Array.from(o.deja ?? [], cleDoublon)]);
  const principal = musclesDeExo(base)?.principaux[0];
  const remplacants = remplacantsDe(base);
  const compte = o.compte ?? (() => 0);
  type Candidat = Equivalent & { rang: number; poids: number };
  const out: Candidat[] = [];
  const vus = new Set<string>();
  const ajouter = (c: Omit<Candidat, 'poids'>, poids: number) => {
    const k = cleDoublon(c.nom);
    if (exclus.has(k) || vus.has(k)) return;
    vus.add(k);
    out.push({ ...c, poids });
  };
  for (const m of perso) {
    if (memeGroupe(groupeConnu(m.muscle) ?? m.muscle, muscle)) ajouter({ nom: m.nom, muscle, famille: 'machine', perso: true, rang: -1 }, 0);
  }
  for (const f of bibliothequeMuscu()) {
    if (!memeGroupe(f.muscle, muscle)) continue;
    const meme = !!principal && musclesDeExo(f.nom)?.principaux[0] === principal;
    const r = remplacants.indexOf(f.nom);
    const poids = r >= 0 ? 1 + r / 100 : meme ? 2 : 3;
    ajouter({ nom: f.nom, muscle: f.muscle, famille: familleChange(f.nom, perso), ...(meme ? { meme: true } : {}), rang: f.rang }, poids);
  }
  const max = Math.max(1, o.max ?? MAX_PAR_FAMILLE);
  const res: Equivalent[] = [];
  for (const fam of ORDRE_FAMILLES) {
    out
      .filter((c) => c.famille === fam)
      .sort((a, b) => a.poids - b.poids || Math.min(compte(b.nom), 10) - Math.min(compte(a.nom), 10) || a.rang - b.rang)
      .slice(0, max)
      .forEach(({ rang: _r, poids: _p, ...e }) => res.push(e));
  }
  return res;
}

/* ---------------------------------- la recherche ---------------------------------- */

type Cherchable = ExoCherchable & { muscle: string; perso?: boolean };

function cherchables(perso: readonly MachinePerso[], compte?: (nom: string) => number): Cherchable[] {
  const out: Cherchable[] = perso.map((m) => ({ name: m.nom, muscle: groupeConnu(m.muscle) ?? m.muscle, perso: true, count: 10 }));
  for (const f of bibliothequeMuscu()) {
    const fr = nomFr(f.nom);
    out.push({ name: fr, autre: fr !== f.nom ? f.nom : undefined, muscle: f.muscle, rang: f.rang, count: compte ? compte(f.nom) : 0 });
  }
  return out;
}

/** distance d'edition (lettre en trop, en moins, changee), arretee des qu'elle depasse `max` */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let mini = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      mini = Math.min(mini, cur[j]);
    }
    if (mini > max) return max + 1;
    prec = cur;
  }
  return prec[b.length];
}

/** Les mots de la recherche corriges vers les mots connus les plus proches (fautes simples), sinon tels quels */
export function corrigerFautes(query: string, vocabulaire: ReadonlySet<string>): string {
  const mots = plier(query).split(' ').filter(Boolean);
  const voc = Array.from(vocabulaire);
  return mots
    .map((w) => {
      if (w.length < 4 || vocabulaire.has(w) || voc.some((v) => v.startsWith(w))) return w;
      const max = w.length >= 7 ? 2 : 1;
      let best = w;
      let bestD = max + 1;
      for (const v of voc) {
        if (v.length < 3) continue;
        // le debut d'un mot plus long compte aussi : « molet » trouve « mollets »
        const d = Math.min(distance(w, v, max), v.length > w.length ? distance(w, v.slice(0, w.length), max) : max + 1);
        if (d < bestD || (d === bestD && v.length < best.length)) {
          best = v;
          bestD = d;
        }
      }
      return bestD <= max ? best : w;
    })
    .join(' ');
}

let vocabCache: { n: number; mots: Set<string> } | null = null;
function vocabulaire(liste: readonly Cherchable[]): Set<string> {
  if (vocabCache && vocabCache.n === liste.length) return vocabCache.mots;
  const mots = new Set<string>();
  for (const e of liste) {
    for (const t of [e.name, e.autre ?? '', e.muscle]) plier(t).split(' ').filter(Boolean).forEach((w) => mots.add(w));
    motsSynonymes(`${e.name} ${e.autre ?? ''}`).forEach((w) => mots.add(w));
  }
  vocabCache = { n: liste.length, mots };
  return mots;
}

export type Trouve = Equivalent & { affiche: string };

/** Recherche par nom dans toute la base et tes machines ; fautes simples corrigees quand rien ne correspond */
export function chercherPourChanger(query: string, o: { perso?: readonly MachinePerso[]; compte?: (nom: string) => number; max?: number } = {}): Trouve[] {
  const q = (query ?? '').trim();
  if (!plier(q)) return [];
  const perso = o.perso ?? [];
  const liste = cherchables(perso, o.compte);
  let r = chercherExos(liste, q);
  if (r.length === 0) {
    const corrige = corrigerFautes(q, vocabulaire(liste));
    if (corrige !== plier(q)) r = chercherExos(liste, corrige);
  }
  return r.slice(0, Math.max(1, o.max ?? 30)).map((e) => {
    const nom = e.perso ? e.name : e.autre ?? e.name;
    return { nom, affiche: e.name, muscle: e.muscle, famille: familleChange(nom, perso), ...(e.perso ? { perso: true } : {}) };
  });
}

/* ---------------------------------- dans la seance ---------------------------------- */

/**
 * Remplace l'exercice `id` par `nouveau`. Les series deja faites restent sur l'exercice d'origine, a sa place,
 * bouclees : son historique et ses records ne bougent pas. Les series restantes (toutes, si aucune n'est faite)
 * deviennent celles du nouvel exercice (seriesNeuves les remplit avec ta derniere fois sur lui), juste apres.
 * Le cran de l'ancienne machine ne suit pas : le nouvel exercice montre le sien. Dans un superset, le nouvel
 * exercice prend la place de l'ancien dans le groupe.
 */
export function changerDansSeance(
  liste: readonly LiveExercise[],
  id: string,
  nouveau: { nom: string; muscle?: string | null },
  seriesNeuves: (aRemplacer: LiveSet[]) => LiveSet[],
  nouvelId: string,
): { exercises: LiveExercise[]; currentId: string } | null {
  const i = liste.findIndex((e) => e.id === id);
  if (i < 0) return null;
  const ex = liste[i];
  const faites = ex.sets.filter((s) => s.done);
  const restantes = ex.sets.filter((s) => !s.done);
  if (faites.length > 0 && restantes.length === 0) return null;
  // 3 novembre 2026 : l'unite de charge (kilos ou plaques) ne suit pas non plus, le nouvel exercice reprend la sienne
  const { cran: _c, notes: _n, orig: _o, laisse: _l, cardio: _ca, ajoutBloc: _a, plaques: _pl, ...garde } = ex;
  const neuf: LiveExercise = {
    ...garde,
    id: faites.length ? nouvelId : ex.id,
    name: nouveau.nom,
    muscle: nouveau.muscle ?? ex.muscle,
    sets: seriesNeuves(faites.length ? restantes : ex.sets),
    objectifSeries: faites.length ? restantes.length : ex.objectifSeries ?? ex.sets.length,
    remplaceEnSeance: ex.remplaceEnSeance ?? ex.name,
    ...(ex.cible ? { cible: { repsMin: ex.cible.repsMin, repsMax: ex.cible.repsMax, reposSec: ex.cible.reposSec, ...(ex.cible.secondes ? { secondes: true } : {}) } } : {}),
  };
  if (!faites.length) {
    const out = liste.slice();
    out[i] = neuf;
    return { exercises: out, currentId: neuf.id };
  }
  // l'exercice d'origine garde ses series faites ; dans un groupe, il y reste (il n'a plus rien a faire)
  const dansGroupe = !!ex.enchaine || (i > 0 && !!liste[i - 1].enchaine);
  const { enchaine: _e, ...origine } = ex;
  const ancien: LiveExercise = { ...origine, sets: faites, objectifSeries: faites.length, ...(dansGroupe ? { enchaine: true } : {}) };
  const out = [...liste.slice(0, i), ancien, neuf, ...liste.slice(i + 1)];
  return { exercises: out, currentId: neuf.id };
}
