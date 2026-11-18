/**
 * Reprise complete depuis Hevy (18 novembre 2026). Houari : « beaucoup d'utilisateurs me disent : j'ai mes
 * exercices et mes seances sur Hevy depuis des annees, ma routine, ma semaine A et ma semaine B, avec des
 * exercices que j'ai crees moi-meme. Je ne veux pas changer. Il faut que ton app reprenne tout. »
 *
 * Tout part de l'export CSV des seances de Hevy (carnet.ts, lireHevy) ; rien n'est envoye nulle part, aucune API.
 * Ce fichier est pur (aucun stockage, aucun React Native) et teste dans __tests__/unit/repriseHevy.test.ts :
 *  1. correspondances : chaque nom d'exercice de Hevy, relie a la bibliotheque YOROI quand il est reconnu
 *     (nomsHevy.ts puis vocabulaire.ts), sinon garde tel quel comme exercice a toi, avec son muscle devine ;
 *  2. appliquerChoix : les noms choisis par l'utilisateur (il peut refuser une correspondance et garder son nom) ;
 *  3. reconstruireRoutine : les seances types (meme titre, majuscules, accents et espaces ignores), la version la
 *     plus recente de chacune, et le rythme : jours habituels, semaine A et semaine B quand les seances reviennent
 *     une semaine sur deux. Sans preuve, aucun planning : la liste des seances seulement ;
 *  4. versProgrammeHevy : le programme perso « Ma routine Hevy » (monProgramme.ts), semaine A et semaine B a toi
 *     (alternance.ts, ProgrammePerso.ab) ; versMesSeances quand il n'y a pas de planning ;
 *  5. bilanReprise : les chiffres de l'ecran Bienvenue.
 *
 * Ce que l'export CSV de Hevy contient (colonnes) : title, start_time, end_time, description, exercise_title,
 * superset_id, exercise_notes, set_index, set_type, weight_kg (ou weight_lbs), reps, distance_km,
 * duration_seconds, rpe. Il ne contient pas : les routines elles-memes ni leurs dossiers, les temps de repos, le
 * muscle des exercices crees dans Hevy, le poids du corps. La routine est donc reconstruite a partir des seances
 * faites, et le repos vaut 90 secondes, a regler ensuite.
 */
import type { ExoLu, SeanceLue, SerieLue } from './carnet';
import { nomHevyConnu, plierHevy } from './nomsHevy';
import { VOCABULAIRE } from './vocabulaire';
import { lettreDe } from '@/lib/v2/programmes/alternance';
import { PREFIXE_PERSO } from '@/lib/v2/programmes/registrePerso';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import type { ProgrammePerso, SeancePerso } from '@/lib/v2/programmes/monProgramme';

/* ---------------------------------- les exercices ---------------------------------- */

/** Le titre d'une seance, pour regrouper : « PUSH A FORCE », « Push A force » et « push  a  forcé » sont la meme */
export const cleTitre = (t: string | null | undefined): string => plierHevy(t ?? '');

/** Les groupes de la bibliotheque qu'on peut choisir pour un exercice a toi (constants/exerciseLibrary.ts) */
export const MUSCLES_CHOIX = ['PECTORAUX', 'DOS', 'ÉPAULES', 'BICEPS', 'TRICEPS', 'JAMBES', 'ISCHIOS', 'FESSIERS', 'MOLLETS', 'ABDOS', 'AVANT-BRAS'] as const;

/** Les mots du nom, dans l'ordre ou ils departagent (« leg curl » avant « curl », « triceps » avant « extension ») */
const MOTS_MUSCLE: [RegExp, string][] = [
  [/\b(triceps?|pushdown|push down|skull ?crusher|barre au front|kick ?back triceps|dips? triceps|jm press|tate press|french press)\b/, 'TRICEPS'],
  [/\b(leg curl|ischio\w*|hamstrings?|nordic|rdl|romanian|roumain|jambes tendues|stiff leg|good morning)\b/, 'ISCHIOS'],
  [/\b(calf|calves|mollets?|tibialis)\b/, 'MOLLETS'],
  [/\b(hip thrust|glutes?|fessiers?|abduct\w*|kick ?back|pont fessier|bridge)\b/, 'FESSIERS'],
  [/\b(wrist|poignets?|forearms?|avant bras|grip|farmer)\b/, 'AVANT-BRAS'],
  [/\b(curl|biceps?|preacher|hammer|marteau|pupitre|larry scott)\b/, 'BICEPS'],
  [/\b(squat|leg press|presse a cuisses|presse inclinee|presse horizontale|lunges?|fentes?|leg extension|quadri\w*|quads?|adduct\w*|step up|sissy|cuisses?)\b/, 'JAMBES'],
  [/\b(crunch|abs?|abdos?|abdominaux|plank|planche|gainage|leg raise|knee raise|releve|twist|sit ?ups?|hollow|obliques?)\b/, 'ABDOS'],
  [/\b(lateral raise|front raise|elevations?|shoulders?|overhead press|military|militaire|delts?|deltoides?|oiseau|face ?pull|shrugs?|arnold|epaules?|trapezes?|upright row|tirage menton)\b/, 'ÉPAULES'],
  [/\b(bench|chest|pecs?|pectoraux|couche|incline|decline|fly|flyes|ecartes?|pec deck|butterfly|push ?ups?|pompes?|dips?)\b/, 'PECTORAUX'],
  [/\b(rows?|rowing|pulldown|pull ?downs?|tirage|pull ?ups?|tractions?|chin ?ups?|lats?|dorsaux|deadlift|souleve de terre|back extension|lombaires?|hyperextensions?|dos)\b/, 'DOS'],
];

/** Le muscle principal quand le nom le dit clairement (« Poulie triceps », « Curl pupitre »), sinon null : on demande */
export function muscleDevine(nom: string): string | null {
  const n = ` ${plierHevy(nom)} `;
  if (!n.trim()) return null;
  for (const [re, m] of MOTS_MUSCLE) if (re.test(n)) return m;
  return null;
}

export type Reconnaitre = (nom: string) => { nom: string; sur: boolean; exact?: boolean };

/**
 * Hevy d'abord (nom complet, materiel compris), puis le vocabulaire des salles fourni par l'appelant.
 * exact : le nom entier est connu (nom de Hevy, nom de la bibliotheque, expression du vocabulaire). Sinon la
 * correspondance n'est qu'une ressemblance (« Poulie triceps de Momo » ressemble a l'extension a la corde) : c'est
 * peut-etre un exercice cree dans Hevy, il garde son nom tant que l'utilisateur ne dit pas le contraire.
 */
export function reconnaitreHevy(nom: string, vocabulaire: Reconnaitre, biblio: readonly { name: string; autre?: string }[] = []): { nom: string; sur: boolean; exact: boolean } {
  const h = nomHevyConnu(nom);
  if (h) return { nom: h, sur: true, exact: true };
  const p = plierHevy(nom);
  const v = VOCABULAIRE[p] ?? VOCABULAIRE[sansAccentsMinuscules(nom)];
  if (v) return { nom: v, sur: true, exact: true };
  const b = biblio.find((e) => plierHevy(e.name) === p || (!!e.autre && plierHevy(e.autre) === p));
  if (b) return { nom: b.name, sur: true, exact: true };
  const r = vocabulaire(nom);
  return { nom: r.nom, sur: r.sur, exact: !!r.exact || (r.sur && plierHevy(r.nom) === p) };
}

const sansAccentsMinuscules = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export type Correspondance = {
  /** le nom tel qu'il est dans Hevy, jamais change */
  saisi: string;
  /** le nom de la bibliotheque YOROI propose, null : exercice a toi */
  propose: string | null;
  /** le nom entier est connu ; sinon une ressemblance, refusee d'office (refusParDefaut) */
  exact: boolean;
  /** nombre de seances ou il apparait */
  fois: number;
  /** le muscle : celui de la bibliotheque, ou devine d'apres le nom, sinon null (a demander) */
  muscle: string | null;
};

/** Chaque exercice different de l'export, le plus fait en premier */
export function correspondances(seances: readonly SeanceLue[], reconnaitre: Reconnaitre, muscleBiblio: (nom: string) => string | null | undefined): Correspondance[] {
  const vus = new Map<string, Correspondance>();
  for (const s of seances) {
    const dansSeance = new Set<string>();
    for (const e of s.exos) {
      const saisi = e.saisi ?? e.nom;
      if (dansSeance.has(saisi)) continue;
      dansSeance.add(saisi);
      const c = vus.get(saisi);
      if (c) {
        c.fois++;
        continue;
      }
      const r = reconnaitre(saisi);
      const propose = r.sur ? r.nom : null;
      const muscle = (propose ? muscleBiblio(propose) : null) || muscleDevine(saisi);
      vus.set(saisi, { saisi, propose, exact: !!propose && r.exact !== false, fois: 1, muscle: muscle ?? null });
    }
  }
  return [...vus.values()].sort((a, b) => b.fois - a.fois || a.saisi.localeCompare(b.saisi));
}

/** Les ressemblances (pas un nom connu en entier) : l'exercice garde son nom de Hevy tant que tu ne relies pas */
export function refusParDefaut(liste: readonly Correspondance[]): Set<string> {
  return new Set(liste.filter((c) => c.propose && !c.exact && c.propose !== c.saisi).map((c) => c.saisi));
}

/** Le nom gardé pour cet exercice : celui de YOROI, sauf si tu l'as refusé ou s'il n'est pas reconnu */
export const nomFinal = (c: Correspondance, refuses: ReadonlySet<string>): string => (c.propose && !refuses.has(c.saisi) ? c.propose : c.saisi);

/** Un exercice a toi : pas reconnu, ou correspondance refusee */
export const estAToi = (c: Correspondance, refuses: ReadonlySet<string>): boolean => !c.propose || refuses.has(c.saisi);

/** Les seances avec les noms choisis ; le nom de Hevy reste note (saisi) quand il change */
export function appliquerChoix(seances: readonly SeanceLue[], liste: readonly Correspondance[], refuses: ReadonlySet<string>): SeanceLue[] {
  const parSaisi = new Map(liste.map((c) => [c.saisi, c]));
  return seances.map((s) => ({
    ...s,
    exos: s.exos.map((e): ExoLu => {
      const saisi = e.saisi ?? e.nom;
      const c = parSaisi.get(saisi);
      const { saisi: _s, inconnu: _i, ...reste } = e;
      if (!c) return { ...reste, nom: saisi };
      const nom = nomFinal(c, refuses);
      return { ...reste, nom, ...(nom !== saisi ? { saisi } : {}), ...(estAToi(c, refuses) ? { inconnu: true } : {}) };
    }),
  }));
}

/* ---------------------------------- la routine ---------------------------------- */

export type ExoRoutine = { nom: string; series: number; repsMin: number; repsMax: number; charge: number; poidsDuCorps: boolean; enchaine?: boolean };
export type SeanceType = {
  /** titre plie : la cle du regroupement */
  cle: string;
  /** le titre tel qu'ecrit la derniere fois */
  titre: string;
  /** nombre de fois faite dans les 12 dernieres semaines */
  fois: number;
  /** date de la derniere fois */
  derniere: string;
  /** jour habituel, 0 = lundi ; null : pas de jour net */
  jour: number | null;
  /** semaine A, semaine B, ou null : chaque semaine */
  semaine: 'A' | 'B' | null;
  exos: ExoRoutine[];
};
export type Rythme = 'ab' | 'semaine' | 'aucun';
export type Routine = {
  seances: SeanceType[];
  rythme: Rythme;
  /** lundi d'une semaine A (rythme 'ab') */
  depuis?: string;
  /** semaines avec au moins une seance, sur les 12 dernieres */
  semaines: number;
  /** seances recentes qui ne reviennent pas (titre unique, contenu qui change) : gardees dans l'historique seulement */
  libres: number;
};

/** Fenetre regardee : les 12 dernieres semaines de l'export (pas d'aujourd'hui : un export peut dater) */
export const FENETRE_SEMAINES = 12;
const LUNDI_0 = Date.UTC(1970, 0, 5);
const JOUR_MS = 86400000;
const msDe = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const semaineDe = (iso: string): number => Math.floor((msDe(iso) - LUNDI_0) / (7 * JOUR_MS));
export const jourDe = (iso: string): number => (new Date(msDe(iso)).getUTCDay() + 6) % 7;
export function lundiDeSemaine(w: number): string {
  const d = new Date(LUNDI_0 + w * 7 * JOUR_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const travail = (series: readonly SerieLue[]) => {
  const t = series.filter((x) => x.type !== 'warmup');
  return t.length ? t : series;
};

function exosDeLaVersion(s: SeanceLue): ExoRoutine[] {
  return s.exos
    .filter((e) => e.series.length > 0)
    .map((e, i, l) => {
      const t = travail(e.series);
      const reps = t.map((x) => x.reps).filter((r) => r > 0);
      const charge = Math.max(0, ...t.map((x) => x.weight || 0));
      const suivant = l[i + 1];
      return {
        nom: e.nom,
        series: t.length,
        repsMin: reps.length ? Math.min(...reps) : 8,
        repsMax: reps.length ? Math.max(...reps) : 12,
        charge,
        poidsDuCorps: charge === 0,
        ...(e.superset && suivant && suivant.superset === e.superset ? { enchaine: true } : {}),
      };
    });
}

/** Les memes exercices ? 1 : tous pareils, 0 : aucun en commun */
function ressemblance(a: SeanceLue, b: SeanceLue): number {
  const x = new Set(a.exos.map((e) => plierHevy(e.nom)));
  const y = new Set(b.exos.map((e) => plierHevy(e.nom)));
  const commun = [...x].filter((n) => y.has(n)).length;
  const tous = new Set([...x, ...y]).size;
  return tous ? commun / tous : 0;
}

const mediane = (l: number[]) => {
  if (!l.length) return 1;
  const t = [...l].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
};

type Brut = { t: SeanceType; semaines: number[]; parite: 0 | 1 | null; premiere: number; titres: string[] };

/**
 * Les seances types et le rythme. Regles, sans deviner :
 *  - une seance type revient au moins 2 fois dans les 12 dernieres semaines, avec a peu pres les memes exercices ;
 *  - son jour : celui de la moitie au moins de ses fois ;
 *  - semaine A et semaine B : des seances qui reviennent chacune sur 3 semaines au moins, toujours (85 %) la meme
 *    semaine sur deux, et il y en a des deux cotes ;
 *  - un planning seulement si chaque seance a son jour, sans deux seances le meme jour, sur 3 semaines au moins
 *    (4 pour A et B), et revient assez souvent. Sinon rythme 'aucun' : la liste seulement.
 */
export function reconstruireRoutine(seances: readonly SeanceLue[]): Routine {
  const titrees = seances.filter((s) => s.titre && cleTitre(s.titre) && s.exos.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(s.date));
  if (!titrees.length) return { seances: [], rythme: 'aucun', semaines: 0, libres: 0 };
  const derniere = titrees.reduce((m, s) => (s.date > m ? s.date : m), titrees[0].date);
  const fin = semaineDe(derniere);
  const debut = fin - (FENETRE_SEMAINES - 1);
  const recentes = titrees.filter((s) => semaineDe(s.date) >= debut).sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));
  const semainesVues = new Set(recentes.map((s) => semaineDe(s.date)));
  const groupes = new Map<string, SeanceLue[]>();
  for (const s of recentes) {
    const k = cleTitre(s.titre);
    groupes.set(k, [...(groupes.get(k) ?? []), s]);
  }
  let libres = 0;
  const bruts: Brut[] = [];
  for (const [cle, l] of groupes) {
    if (l.length < 2) {
      libres += l.length;
      continue;
    }
    const der = l[l.length - 1];
    // un titre par defaut (« Morning Workout ») qui couvre des seances differentes n'est pas une seance type
    if (mediane(l.slice(0, -1).map((s) => ressemblance(s, der))) < 0.4) {
      libres += l.length;
      continue;
    }
    const jours = new Map<number, number>();
    for (const s of l) jours.set(jourDe(s.date), (jours.get(jourDe(s.date)) ?? 0) + 1);
    const tri = [...jours.entries()].sort((a, b) => b[1] - a[1]);
    const net = tri[0][1] / l.length >= 0.5 && (tri.length < 2 || tri[1][1] < tri[0][1]);
    const sem = [...new Set(l.map((s) => semaineDe(s.date)))].sort((a, b) => a - b);
    const p0 = sem.filter((w) => w % 2 === 0).length;
    const part = Math.max(p0, sem.length - p0) / sem.length;
    const parite: 0 | 1 | null = sem.length >= 3 && part >= 0.85 ? (p0 >= sem.length - p0 ? 0 : 1) : null;
    bruts.push({
      t: { cle, titre: (der.titre ?? '').trim(), fois: l.length, derniere: der.date, jour: net ? tri[0][0] : null, semaine: null, exos: exosDeLaVersion(der) },
      semaines: sem,
      parite,
      premiere: sem[0],
      titres: l.map((s) => s.titre ?? ''),
    });
  }
  if (!bruts.length) return { seances: [], rythme: 'aucun', semaines: semainesVues.size, libres };

  const nbSem = semainesVues.size;
  const pariteDe = (w: number) => ((w % 2) + 2) % 2;
  const semDeParite = (p: number) => [...semainesVues].filter((w) => pariteDe(w) === p).length;
  const assezSouvent = (b: Brut, cote: number | null) => b.semaines.length >= Math.ceil(0.6 * (cote === null ? nbSem : semDeParite(cote)));
  const sansCollision = (l: Brut[]) => l.every((b) => b.t.jour !== null) && new Set(l.map((b) => b.t.jour)).size === l.length;

  const cote0 = bruts.filter((b) => b.parite === 0);
  const cote1 = bruts.filter((b) => b.parite === 1);
  let rythme: Rythme = 'aucun';
  let depuis: string | undefined;
  if (cote0.length && cote1.length && nbSem >= 4) {
    // les seances faites trop peu pour prouver leur cote : le cote de toutes leurs semaines, sinon chaque semaine
    const cote = (b: Brut): number | null => b.parite ?? (b.semaines.every((w) => pariteDe(w) === pariteDe(b.semaines[0])) && b.semaines.length >= 2 ? pariteDe(b.semaines[0]) : null);
    const a0 = bruts.filter((b) => cote(b) === 0);
    const a1 = bruts.filter((b) => cote(b) === 1);
    const chaque = bruts.filter((b) => cote(b) === null);
    // la semaine A : celle dont les titres disent A, sinon celle qui vient en premier
    const ditA = (l: Brut[]) => l.some((b) => lettreDe(b.t.titre)?.lettre === 'A');
    const ditB = (l: Brut[]) => l.some((b) => lettreDe(b.t.titre)?.lettre === 'B');
    const pA = ditA(a0) && !ditA(a1) ? 0 : ditA(a1) && !ditA(a0) ? 1 : ditB(a0) && !ditB(a1) ? 1 : ditB(a1) && !ditB(a0) ? 0 : Math.min(...a0.map((b) => b.premiere)) <= Math.min(...a1.map((b) => b.premiere)) ? 0 : 1;
    const ok =
      sansCollision([...a0, ...chaque]) &&
      sansCollision([...a1, ...chaque]) &&
      [...a0, ...a1].every((b) => assezSouvent(b, cote(b))) &&
      chaque.every((b) => assezSouvent(b, null));
    if (ok) {
      rythme = 'ab';
      for (const b of bruts) {
        const c = cote(b);
        b.t.semaine = c === null ? null : c === pA ? 'A' : 'B';
      }
      let w = fin;
      while (pariteDe(w) !== pA) w--;
      depuis = lundiDeSemaine(w);
    }
  } else if (nbSem >= 3 && sansCollision(bruts) && bruts.every((b) => assezSouvent(b, null))) {
    rythme = 'semaine';
  }
  const ordre = (s: SeanceType) => (s.semaine === 'B' ? 1 : 0);
  const liste = bruts.map((b) => b.t);
  if (rythme === 'aucun') {
    for (const s of liste) s.semaine = null;
    liste.sort((a, b) => b.fois - a.fois || a.titre.localeCompare(b.titre));
  } else liste.sort((a, b) => ordre(a) - ordre(b) || (a.jour ?? 9) - (b.jour ?? 9) || a.titre.localeCompare(b.titre));
  return { seances: liste, rythme, ...(depuis ? { depuis } : {}), semaines: nbSem, libres };
}

/* ---------------------------------- vers YOROI ---------------------------------- */

export const NOM_ROUTINE_HEVY = 'Ma routine Hevy';
export const ORIGINE_HEVY = 'hevy';
const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));
const jourLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function versExoProgramme(e: ExoRoutine, muscle: string | null | undefined, enchaine: boolean): ExoProgramme {
  const repsMin = borne(e.repsMin, 1, 100);
  return {
    nom: e.nom,
    muscle: muscle ?? '',
    series: borne(e.series, 1, 10),
    repsMin,
    repsMax: Math.max(repsMin, borne(e.repsMax, 1, 100)),
    // l'export de Hevy n'a pas les temps de repos
    reposSec: 90,
    ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}),
    ...(enchaine ? { enchaine: true } : {}),
  };
}

function versSeancePerso(t: SeanceType, i: number, muscleDe: (nom: string) => string | null | undefined): SeancePerso {
  const exos = t.exos.slice(0, 15);
  return {
    titre: t.titre.slice(0, 40).trim() || undefined,
    brique: `h${i}_${t.cle.replace(/ /g, '_')}`.slice(0, 32),
    exos: exos.map((e, k) => versExoProgramme(e, muscleDe(e.nom), !!e.enchaine && k < exos.length - 1)),
  };
}

/**
 * « Ma routine Hevy » : un programme perso comme ceux de « Je construis le mien ». Semaine A et semaine B a toi
 * (ab, depuis) quand Hevy le montre, sinon une seule semaine ; sans fin (ta routine se repete). null : rien a
 * planifier (rythme 'aucun', ou toutes les seances decochees).
 */
export function versProgrammeHevy(r: Routine, o: { nom?: string; garder?: (cle: string) => boolean; maintenant?: Date; muscleDe?: (nom: string) => string | null | undefined } = {}): ProgrammePerso | null {
  if (r.rythme === 'aucun') return null;
  const garder = o.garder ?? (() => true);
  const muscleDe = o.muscleDe ?? (() => null);
  const kept = r.seances.map((t, i) => ({ t, i })).filter((x) => garder(x.t.cle) && x.t.jour !== null && x.t.exos.length > 0);
  if (!kept.length) return null;
  const maintenant = o.maintenant ?? new Date();
  const ab = r.rythme === 'ab' && kept.some((x) => x.t.semaine === 'A') && kept.some((x) => x.t.semaine === 'B');
  const semaine: (SeancePerso | null)[] = [null, null, null, null, null, null, null];
  const semaineB: (SeancePerso | null)[] = [null, null, null, null, null, null, null];
  for (const { t, i } of kept) {
    const s = versSeancePerso(t, i, muscleDe);
    const d = t.jour as number;
    if (!ab || t.semaine === null) {
      if (!semaine[d]) semaine[d] = s;
      if (ab && !semaineB[d]) semaineB[d] = { ...s, exos: s.exos.map((e) => ({ ...e })) };
    } else if (t.semaine === 'A') semaine[d] = s;
    else semaineB[d] = s;
  }
  if (!semaine.some((s) => s && s.exos.length)) return null;
  const jour = jourLocal(maintenant);
  const nom = (o.nom ?? NOM_ROUTINE_HEVY).trim().slice(0, 40) || NOM_ROUTINE_HEVY;
  return {
    id: `${PREFIXE_PERSO}${maintenant.getTime().toString(36)}`,
    nom,
    semaine,
    ...(ab ? { semaineB, ab: true, ...(r.depuis ? { depuis: r.depuis } : {}) } : {}),
    creeLe: jour,
    modifieLe: jour,
    duree: 0,
    origine: ORIGINE_HEVY,
  };
}

/** Sans planning : chaque seance type devient une de « Mes seances » (lib/v2/seance/mesSeances.ts) */
export function versMesSeances(r: Routine, garder: (cle: string) => boolean = () => true, muscleDe: (nom: string) => string | null | undefined = () => null): { nom: string; exos: { nom: string; muscle?: string; series: number; reps: number; poids: number }[] }[] {
  return r.seances
    .filter((t) => garder(t.cle) && t.exos.length)
    .map((t) => ({
      nom: t.titre,
      exos: t.exos.slice(0, 25).map((e) => {
        const m = muscleDe(e.nom);
        return { nom: e.nom, ...(m ? { muscle: m } : {}), series: borne(e.series, 1, 10), reps: borne(e.repsMax, 1, 100), poids: Math.max(0, e.charge) };
      }),
    }));
}

export type BilanReprise = { seances: number; exercices: number; aToi: number; records: number; premiere: string | null; derniere: string | null };

/**
 * Les chiffres de Bienvenue : seances, exercices differents, dont a toi, et records (exercices avec une meilleure
 * charge, le 1RM estime de l'ecran Records se calcule a partir des memes series).
 */
export function bilanReprise(seances: readonly SeanceLue[]): BilanReprise {
  const noms = new Set<string>();
  const aToi = new Set<string>();
  const avecRecord = new Set<string>();
  let premiere: string | null = null;
  let derniere: string | null = null;
  for (const s of seances) {
    if (!premiere || s.date < premiere) premiere = s.date;
    if (!derniere || s.date > derniere) derniere = s.date;
    for (const e of s.exos) {
      noms.add(e.nom);
      if (e.inconnu) aToi.add(e.nom);
      if (travail(e.series).some((x) => x.weight > 0 && x.reps > 0)) avecRecord.add(e.nom);
    }
  }
  return { seances: seances.length, exercices: noms.size, aToi: aToi.size, records: avecRecord.size, premiere, derniere };
}
