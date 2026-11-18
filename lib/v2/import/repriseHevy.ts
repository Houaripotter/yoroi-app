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
import { reposConseille } from '@/lib/v2/seances/reposConseille';

/* ---------------------------------- les exercices ---------------------------------- */

/** Le titre d'une seance, pour regrouper : « PUSH A FORCE », « Push A force » et « push  a  forcé » sont la meme */
export const cleTitre = (t: string | null | undefined): string => plierHevy(t ?? '');

/** Les groupes de la bibliotheque qu'on peut choisir pour un exercice a toi (constants/exerciseLibrary.ts) */
export const MUSCLES_CHOIX = ['PECTORAUX', 'DOS', 'ÉPAULES', 'BICEPS', 'TRICEPS', 'JAMBES', 'ISCHIOS', 'FESSIERS', 'MOLLETS', 'ABDOS', 'AVANT-BRAS', 'CARDIO'] as const;

/** Les mots du nom, dans l'ordre ou ils departagent (« leg curl » avant « curl », « triceps » avant « extension ») */
const MOTS_MUSCLE: [RegExp, string][] = [
  // 18 novembre 2026 : le cardio d'abord (« rameur », pas « rowing » qui est un exercice de dos)
  [/\b(velo|bike|cycling|spinning|biking|rameur|rower|rowing machine|row ergometer|concept ?2|ergometre|tapis|treadmill|elliptique|elliptical|stair ?master|stairs|escaliers?|corde a sauter|jump rope|skipping|running|run|course|marche|walking|walk|ski ?erg|assault|air bike|cardio|hiit)\b/, 'CARDIO'],
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

export type Reconnaitre = (nom: string) => { nom: string; sur: boolean; exact?: boolean; confiance?: number };

/**
 * Hevy d'abord (nom complet, materiel compris), puis le vocabulaire des salles fourni par l'appelant.
 * exact : le nom entier est connu (nom de Hevy, nom de la bibliotheque, expression du vocabulaire). Sinon la
 * correspondance n'est qu'une ressemblance (« Poulie triceps de Momo » ressemble a l'extension a la corde) : c'est
 * peut-etre un exercice cree dans Hevy, il garde son nom tant que l'utilisateur ne dit pas le contraire.
 */
export function reconnaitreHevy(nom: string, vocabulaire: Reconnaitre, biblio: readonly { name: string; autre?: string }[] = []): { nom: string; sur: boolean; exact: boolean; confiance: number } {
  const p = plierHevy(nom);
  // 18 novembre 2026 : une machine assistee (tractions, dips) : la charge notee est l'aide du contrepoids, pas une
  // charge ajoutee. YOROI n'a pas de format pour une charge negative : l'exercice reste le tien, jamais relie aux
  // tractions ou aux dips (ses records ne se melangent pas)
  if (/\bassist/.test(p)) return { nom, sur: false, exact: false, confiance: 0 };
  const h = nomHevyConnu(nom);
  if (h) return { nom: h, sur: true, exact: true, confiance: 1 };
  const b = biblio.find((e) => plierHevy(e.name) === p || (!!e.autre && plierHevy(e.autre) === p));
  if (b) return { nom: b.name, sur: true, exact: true, confiance: 1 };
  const v = VOCABULAIRE[p] ?? VOCABULAIRE[sansAccentsMinuscules(nom)];
  if (v) return { nom: v, sur: true, exact: true, confiance: 0.95 };
  const r = vocabulaire(nom);
  const exact = !!r.exact || (r.sur && plierHevy(r.nom) === p);
  return { nom: r.nom, sur: r.sur, exact, confiance: !r.sur ? 0 : exact ? 0.95 : 0.5 };
}

/** Une correspondance sure (nom connu en entier) est reliee d'office ; en dessous, YOROI demande « Est-ce bien ça ? » */
export const SEUIL_SUR = 0.9;

const sansAccentsMinuscules = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export type Correspondance = {
  /** le nom tel qu'il est dans Hevy, jamais change */
  saisi: string;
  /** le nom de la bibliotheque YOROI propose, null : exercice a toi */
  propose: string | null;
  /** le nom entier est connu ; sinon une ressemblance, refusee d'office (refusParDefaut) */
  exact: boolean;
  /** 18 novembre 2026 : confiance de la correspondance, 0 a 1 (1 : nom de Hevy ou de la bibliotheque ; 0,5 : ressemblance) */
  confiance: number;
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
      // 18 novembre 2026 : le groupe donne par l'app d'origine (categories de FitNotes) passe avant la devinette
      // une simple ressemblance ne decide pas du muscle quand l'app d'origine l'a donne
      const exact = !!propose && r.exact !== false;
      const lib = propose ? muscleBiblio(propose) : null;
      const muscle = (exact ? lib : null) || e.muscle || lib || muscleDevine(saisi);
      const confiance = propose ? r.confiance ?? (exact ? 1 : 0.5) : 0;
      vus.set(saisi, { saisi, propose, exact: exact && confiance >= SEUIL_SUR, confiance, fois: 1, muscle: muscle ?? null });
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

export type ExoRoutine = {
  nom: string;
  series: number;
  repsMin: number;
  repsMax: number;
  charge: number;
  poidsDuCorps: boolean;
  enchaine?: boolean;
  /** 18 novembre 2026 : exercice tenu (gainage, suspension) : repsMin et repsMax sont des secondes */
  secondes?: boolean;
  /** 18 novembre 2026 : cardio (velo, rameur, corde...) : sa duree en minutes ; supposee quand l'export n'a que la distance */
  minutes?: number;
  minutesSupposees?: boolean;
};
export type SeanceType = {
  /** la cle du regroupement : le titre plie, ou « g… » pour un groupe de seances sans vrai titre */
  cle: string;
  /** le titre tel qu'ecrit la derniere fois, ou un nom deduit des muscles (nomDeduit) */
  titre: string;
  /** 18 novembre 2026 : titre generique ou absent : nom deduit des muscles dominants (« Pecs et triceps »), a renommer */
  nomDeduit?: boolean;
  /** 18 novembre 2026 : les autres titres reunis dans cette seance (renommage : « Push day » devenu « Push ») */
  reunies?: string[];
  /** nombre de fois faite dans les 12 dernieres semaines */
  fois: number;
  /** date de la derniere fois */
  derniere: string;
  /** 18 novembre 2026 : le jour ou elle a ete faite le plus souvent (meme sans preuve), pour proposer Ta semaine */
  jourFrequent: number;
  /** jour habituel, 0 = lundi ; null : pas de jour net */
  jour: number | null;
  /** semaine A, semaine B, ou null : chaque semaine */
  semaine: 'A' | 'B' | null;
  exos: ExoRoutine[];
  /** 18 novembre 2026 : la derniere fois etait incomplete (moins de la moitie des series habituelles) : charges et repetitions de la fois d'avant */
  versionPrecedente?: boolean;
  /** 18 novembre 2026 : ton repos moyen reel entre deux series (secondes), quand la duree des seances le permet (45 s a 5 min) */
  reposReelSec?: number;
};
export type Rythme = 'ab' | 'semaine' | 'aucun';
export type Confiance = 'sur' | 'a_verifier';
export type Routine = {
  seances: SeanceType[];
  rythme: Rythme;
  /** lundi d'une semaine A (rythme 'ab') */
  depuis?: string;
  /** 18 novembre 2026 : semaine A et semaine B sures (alternance nette sur 6 semaines actives au moins) ou a verifier */
  confianceAB?: Confiance;
  /** semaines avec au moins une seance, sur les 12 dernieres */
  semaines: number;
  /** 18 novembre 2026 : seances par semaine, en moyenne sur les 8 dernieres semaines actives (vacances ignorees) */
  parSemaine: number;
  /** seances recentes qui ne reviennent pas (titre unique, contenu qui change) : gardees dans l'historique seulement */
  libres: number;
};

/** Fenetre regardee : les 12 dernieres semaines de l'export (pas d'aujourd'hui : un export peut dater) */
export const FENETRE_SEMAINES = 12;
/** 18 novembre 2026 : le rythme (jours, semaines A et B) se lit sur les 8 dernieres semaines ou tu t'es entraine */
export const SEMAINES_RYTHME = 8;
/** 18 novembre 2026 : la seance type se calcule sur ses 4 dernieres fois */
export const FOIS_SEANCE_TYPE = 4;
/** 18 novembre 2026 : deux seances sont « la meme » a partir de 60 % d'exercices en commun */
export const SEUIL_RESSEMBLANCE = 0.6;
const LUNDI_0 = Date.UTC(1970, 0, 5);
const JOUR_MS = 86400000;
const msDe = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const semaineDe = (iso: string): number => Math.floor((msDe(iso) - LUNDI_0) / (7 * JOUR_MS));
export const jourDe = (iso: string): number => (new Date(msDe(iso)).getUTCDay() + 6) % 7;
export function lundiDeSemaine(w: number): string {
  const d = new Date(LUNDI_0 + w * 7 * JOUR_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Les series de travail : sans les echauffements (gardes dans l'historique, avec leur type) */
const travail = (series: readonly SerieLue[]) => {
  const t = series.filter((x) => x.type !== 'warmup');
  return t.length ? t : series;
};
const seriesDeTravail = (s: SeanceLue) => s.exos.reduce((n, e) => n + e.series.filter((x) => x.type !== 'warmup').length, 0);

/** Un exercice d'une seance faite, vu comme un exercice de routine (charges et repetitions de cette fois-la) */
function exoDeLu(e: ExoLu): ExoRoutine {
  const t = travail(e.series);
  const reps = t.map((x) => x.reps).filter((r) => r > 0);
  const charge = Math.max(0, ...t.map((x) => x.weight || 0));
  const enTemps = t.every((x) => !!x.secondes || (!!x.distanceKm && !x.reps));
  const cardio = enTemps && (t.some((x) => !!x.distanceKm) || muscleDevine(e.nom) === 'CARDIO' || e.muscle === 'CARDIO');
  if (cardio) {
    const sec = t.reduce((n, x) => n + (x.secondes ?? 0), 0);
    return { nom: e.nom, series: 1, repsMin: 1, repsMax: 1, charge: 0, poidsDuCorps: true, minutes: sec > 0 ? Math.max(1, Math.round(sec / 60)) : 20, ...(sec > 0 ? {} : { minutesSupposees: true }) };
  }
  return {
    nom: e.nom,
    series: t.length,
    repsMin: reps.length ? Math.min(...reps) : 8,
    repsMax: reps.length ? Math.max(...reps) : 12,
    charge,
    poidsDuCorps: charge === 0,
    ...(enTemps ? { secondes: true } : {}),
  };
}

const nomsDe = (s: SeanceLue) => new Set(s.exos.filter((e) => e.series.length > 0).map((e) => plierHevy(e.nom)));
function jaccard(x: ReadonlySet<string>, y: ReadonlySet<string>): number {
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
/** la valeur la plus frequente ; a egalite, la plus recente (l est dans l'ordre du temps) */
function plusFrequent(l: number[]): number {
  const n = new Map<number, number>();
  for (const v of l) n.set(v, (n.get(v) ?? 0) + 1);
  let best = l[l.length - 1];
  for (let i = l.length - 1; i >= 0; i--) if ((n.get(l[i]) ?? 0) > (n.get(best) ?? 0)) best = l[i];
  return best;
}

/**
 * Un titre qui ne dit rien de la seance : vide, une date, ou le nom par defaut des apps (« Morning Workout »,
 * « Séance du soir », « Entraînement », « Workout 12 »).
 */
export function titreGenerique(t: string | null | undefined): boolean {
  const p = plierHevy(t ?? '');
  if (!p) return true;
  if (/^\d{1,4}(?: \d{1,2}){1,2}(?: \d{2,4})?$/.test(p)) return true;
  if (/^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: \d.*)?$/.test(p)) return true;
  return /^(?:(?:morning|afternoon|evening|night|midday|lunch|late night|early morning)\s+)?(?:workout|training|session|seance|entrainement|sport|muscu|musculation|gym|salle)(?:\s+(?:du|de|of the|in the)?\s*(?:matin|midi|soir|apres midi|nuit|morning|evening|afternoon))?(?:\s*\d+)?$/.test(p);
}

/** Les noms courts des groupes, pour nommer une seance sans titre (« Pecs et triceps ») ; textes francais, traduits a l'affichage */
const COURT: Record<string, string> = {
  PECTORAUX: 'Pecs', DOS: 'Dos', 'ÉPAULES': 'Épaules', EPAULES: 'Épaules', BICEPS: 'Biceps', TRICEPS: 'Triceps', JAMBES: 'Jambes', ISCHIOS: 'Ischios', FESSIERS: 'Fessiers', MOLLETS: 'Mollets', ABDOS: 'Abdos', 'AVANT-BRAS': 'Avant bras', CARDIO: 'Cardio',
};
/** « Pecs et triceps » : les deux groupes les plus travailles (series de travail), sinon « Ma séance » */
export function nomDesMuscles(seances: readonly SeanceLue[], muscleDe: (nom: string) => string | null | undefined): string {
  const n = new Map<string, number>();
  for (const s of seances) for (const e of s.exos) {
    const m = e.muscle || muscleDe(e.nom) || muscleDevine(e.nom);
    const c = m ? COURT[m.toUpperCase()] : undefined;
    if (c) n.set(c, (n.get(c) ?? 0) + travail(e.series).length);
  }
  const top = [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  if (!top.length) return 'Ma séance';
  return top.length === 1 ? top[0] : `${top[0]} et ${top[1].toLocaleLowerCase('fr')}`;
}

type Groupe = { cle: string; seances: SeanceLue[]; titres: string[]; deduit: boolean };

/** Les exercices presents dans au moins la moitie des dernieres fois du groupe */
function signature(l: readonly SeanceLue[]): Set<string> {
  const der = l.slice(-FOIS_SEANCE_TYPE);
  const n = new Map<string, number>();
  for (const s of der) for (const k of nomsDe(s)) n.set(k, (n.get(k) ?? 0) + 1);
  return new Set([...n.entries()].filter(([, c]) => c >= Math.ceil(der.length / 2)).map(([k]) => k));
}

/** Deux titres qui se succedent dans le temps (un renommage), et pas deux seances qui vivent ensemble (Push A et Push B) */
function seSuccedent(x: Groupe, y: Groupe): boolean {
  const lx = lettreDe(x.titres[x.titres.length - 1]);
  const ly = lettreDe(y.titres[y.titres.length - 1]);
  if (lx && ly && lx.lettre !== ly.lettre) return false;
  const [avant, apres] = x.seances[0].date <= y.seances[0].date ? [x, y] : [y, x];
  const debutApres = apres.seances[0].date;
  return avant.seances.filter((s) => s.date >= debutApres).length <= 1;
}

/** La seance type d'un groupe : ses 4 dernieres fois (exercices, ordre, series), charges et repetitions de la derniere */
function seanceType(g: Groupe): { exos: ExoRoutine[]; versionPrecedente: boolean; reposReelSec?: number } {
  const der = g.seances.slice(-FOIS_SEANCE_TYPE);
  const n = der.length;
  // la derniere fois incomplete (moins de la moitie des series habituelles) : la fois d'avant sert de reference
  const totaux = der.map(seriesDeTravail);
  const habituel = n > 1 ? mediane(totaux.slice(0, -1)) : totaux[0];
  const incomplete = n > 1 && totaux[n - 1] < habituel / 2;
  const ref = incomplete ? der[n - 2] : der[n - 1];
  // les exercices d'au moins la moitie des fois, a leur position mediane
  const presence = new Map<string, { positions: number[]; series: number[] }>();
  der.forEach((s) => {
    const vus = new Set<string>();
    s.exos.filter((e) => e.series.length > 0).forEach((e, i) => {
      const k = plierHevy(e.nom);
      if (vus.has(k)) return;
      vus.add(k);
      const p = presence.get(k) ?? { positions: [], series: [] };
      p.positions.push(i);
      p.series.push(travail(e.series).length);
      presence.set(k, p);
    });
  });
  const posRef = new Map(ref.exos.map((e, i) => [plierHevy(e.nom), i]));
  const gardes = [...presence.entries()]
    .filter(([, p]) => p.positions.length >= Math.ceil(n / 2))
    .sort((a, b) => mediane(a[1].positions) - mediane(b[1].positions) || (posRef.get(a[0]) ?? 99) - (posRef.get(b[0]) ?? 99));
  const exoRef = (k: string): ExoLu => ref.exos.find((x) => plierHevy(x.nom) === k && x.series.length > 0) ?? [...der].reverse().map((s) => s.exos.find((x) => plierHevy(x.nom) === k && x.series.length > 0)).find((x): x is ExoLu => !!x)!;
  const exos = gardes.map(([k, p], i) => {
    const lu = exoRef(k);
    const r = exoDeLu(lu);
    const suivant = gardes[i + 1] ? exoRef(gardes[i + 1][0]) : undefined;
    return {
      ...r,
      ...(r.minutes ? {} : { series: plusFrequent(p.series) }),
      ...(lu.superset && suivant && suivant.superset === lu.superset ? { enchaine: true } : {}),
    };
  });
  // ton repos reel : la duree de la seance partagee entre ses series (35 s d'effort par serie), sur les fois qui l'ont
  // (une seance baclee ne dit rien de ton rythme : elle ne compte pas)
  const repos = der
    .filter((s) => s.duree && s.duree > 0 && !(incomplete && s === der[n - 1]))
    .map((s) => {
      const k = s.exos.reduce((x, e) => x + e.series.length, 0);
      return k > 1 ? ((s.duree as number) * 60 - k * 35) / (k - 1) : 0;
    })
    .filter((x) => x > 0);
  const r = repos.length ? mediane(repos) : 0;
  return { exos, versionPrecedente: incomplete, ...(r >= 45 && r <= 300 ? { reposReelSec: Math.round(r / 15) * 15 } : {}) };
}

/**
 * Les seances types et le rythme. Regles, sans deviner :
 *  - regroupement : par titre ; deux titres qui se succedent avec 60 % d'exercices en commun sont reunis (un
 *    renommage) ; une seance au titre generique ou vide rejoint la seance qui lui ressemble a 60 %, sinon les seances
 *    sans titre se regroupent entre elles et prennent un nom deduit des muscles ;
 *  - une seance type revient au moins 2 fois dans les 12 dernieres semaines ; elle se calcule sur ses 4 dernieres
 *    fois (exercices d'au moins la moitie des fois, position mediane, series les plus frequentes, charges de la
 *    derniere fois, ou de la fois d'avant si la derniere etait incomplete) ;
 *  - le rythme se lit sur les 8 dernieres semaines ou tu t'es entraine (une semaine de vacances ne casse rien) :
 *    jour habituel (la moitie au moins des fois), semaine A et semaine B quand des seances reviennent une semaine
 *    active sur deux (75 % au moins, 3 fois au moins), avec un indice de confiance ;
 *  - un planning prouve seulement sans deux seances le meme jour ; sinon rythme 'aucun' (Ta semaine propose quand
 *    meme les jours les plus frequents, placementPropose).
 */
export function reconstruireRoutine(seances: readonly SeanceLue[], o: { muscleDe?: (nom: string) => string | null | undefined } = {}): Routine {
  const muscleDe = o.muscleDe ?? (() => null);
  const valides = seances.filter((s) => s.exos.some((e) => e.series.length > 0) && /^\d{4}-\d{2}-\d{2}$/.test(s.date));
  if (!valides.length) return { seances: [], rythme: 'aucun', semaines: 0, parSemaine: 0, libres: 0 };
  const derniere = valides.reduce((m, s) => (s.date > m ? s.date : m), valides[0].date);
  const fin = semaineDe(derniere);
  const debut = fin - (FENETRE_SEMAINES - 1);
  const recentes = valides.filter((s) => semaineDe(s.date) >= debut).sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));

  // 1. par titre
  const parTitre = new Map<string, Groupe>();
  const sansTitre: SeanceLue[] = [];
  for (const s of recentes) {
    if (titreGenerique(s.titre)) {
      sansTitre.push(s);
      continue;
    }
    const k = cleTitre(s.titre);
    const g = parTitre.get(k) ?? { cle: k, seances: [], titres: [], deduit: false };
    g.seances.push(s);
    g.titres.push((s.titre ?? '').trim());
    parTitre.set(k, g);
  }
  // 2. les titres renommes : reunis quand ils se succedent avec les memes exercices
  let groupes = [...parTitre.values()];
  for (let fusion = true; fusion;) {
    fusion = false;
    for (let i = 0; i < groupes.length && !fusion; i++) {
      for (let j = i + 1; j < groupes.length && !fusion; j++) {
        const x = groupes[i];
        const y = groupes[j];
        if (jaccard(signature(x.seances), signature(y.seances)) >= SEUIL_RESSEMBLANCE && seSuccedent(x, y)) {
          const tout = [...x.seances, ...y.seances].sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));
          const recent = tout[tout.length - 1];
          const g: Groupe = { cle: cleTitre(recent.titre), seances: tout, titres: tout.map((s) => (s.titre ?? '').trim()), deduit: false };
          groupes = [...groupes.filter((_, k) => k !== i && k !== j), g];
          fusion = true;
        }
      }
    }
  }
  // 3. les seances sans vrai titre : la seance qui leur ressemble, sinon entre elles
  const signatures = new Map(groupes.map((g) => [g, signature(g.seances)]));
  const amas: SeanceLue[][] = [];
  for (const s of sansTitre) {
    const n = nomsDe(s);
    let best: Groupe | null = null;
    let score = 0;
    for (const g of groupes) {
      const j = jaccard(n, signatures.get(g)!);
      if (j > score) [best, score] = [g, j];
    }
    if (best && score >= SEUIL_RESSEMBLANCE) {
      best.seances.push(s);
      continue;
    }
    const a = amas.find((l) => jaccard(n, nomsDe(l[l.length - 1])) >= SEUIL_RESSEMBLANCE);
    if (a) a.push(s);
    else amas.push([s]);
  }
  const prises = new Set(groupes.map((g) => g.cle));
  for (const l of amas) {
    const nom = nomDesMuscles(l, muscleDe);
    let cle = `g ${plierHevy(nom)}`;
    for (let k = 2; prises.has(cle); k++) cle = `g ${plierHevy(nom)} ${k}`;
    prises.add(cle);
    groupes.push({ cle, seances: l, titres: l.map(() => nom), deduit: true });
  }
  for (const g of groupes) g.seances.sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));

  // 4. le rythme : les 8 dernieres semaines actives
  const actives = [...new Set(recentes.map((s) => semaineDe(s.date)))].sort((a, b) => a - b);
  const huit = actives.slice(-SEMAINES_RYTHME);
  const rang = new Map(huit.map((w, i) => [w, i]));
  const debutRythme = huit[0];
  const dansHuit = recentes.filter((s) => semaineDe(s.date) >= debutRythme);
  const parSemaine = huit.length ? Math.round((dansHuit.length / huit.length) * 10) / 10 : 0;

  type Brut = { t: SeanceType; rangs: number[]; parite: 0 | 1 | null; part: number; premier: number };
  let libres = 0;
  const bruts: Brut[] = [];
  for (const g of groupes) {
    const l = g.seances;
    if (l.length < 2) {
      libres += l.length;
      continue;
    }
    const der = l[l.length - 1];
    // un groupe dont les seances ne se ressemblent pas n'est pas une seance type (comparees a ses exercices habituels :
    // une derniere seance baclee ne fait pas disparaitre la seance)
    const sig = signature(l);
    if (mediane(l.map((s) => jaccard(nomsDe(s), sig))) < 0.4) {
      libres += l.length;
      continue;
    }
    const recentesG = l.filter((s) => semaineDe(s.date) >= debutRythme);
    const pourJours = recentesG.length ? recentesG : l;
    const jours = new Map<number, number>();
    for (const s of pourJours) jours.set(jourDe(s.date), (jours.get(jourDe(s.date)) ?? 0) + 1);
    const tri = [...jours.entries()].sort((a, b) => b[1] - a[1]);
    const net = tri[0][1] / pourJours.length >= 0.5 && (tri.length < 2 || tri[1][1] < tri[0][1]);
    const rangs = [...new Set(recentesG.map((s) => rang.get(semaineDe(s.date))!))].sort((a, b) => a - b);
    const p0 = rangs.filter((r) => r % 2 === 0).length;
    const part = rangs.length ? Math.max(p0, rangs.length - p0) / rangs.length : 0;
    const parite: 0 | 1 | null = rangs.length >= 3 && part >= 0.75 ? (p0 >= rangs.length - p0 ? 0 : 1) : null;
    const st = seanceType(g);
    const autres = [...new Set(g.titres.filter((t) => cleTitre(t) !== cleTitre(der.titre)).map((t) => t.trim()))];
    bruts.push({
      t: {
        cle: g.cle,
        titre: g.deduit ? g.titres[0] : (der.titre ?? '').trim(),
        ...(g.deduit ? { nomDeduit: true } : {}),
        ...(!g.deduit && autres.length ? { reunies: [...new Map(autres.map((t) => [cleTitre(t), t])).values()] } : {}),
        fois: l.length,
        derniere: der.date,
        jourFrequent: tri[0][0],
        jour: net ? tri[0][0] : null,
        semaine: null,
        exos: st.exos,
        ...(st.versionPrecedente ? { versionPrecedente: true } : {}),
        ...(st.reposReelSec ? { reposReelSec: st.reposReelSec } : {}),
      },
      rangs,
      parite,
      part,
      premier: rangs[0] ?? 99,
    });
  }
  const nbSem = actives.length;
  if (!bruts.length) return { seances: [], rythme: 'aucun', semaines: nbSem, parSemaine, libres };

  const nbHuit = huit.length;
  const deRang = (p: number) => huit.filter((_, i) => i % 2 === p).length;
  const assezSouvent = (b: Brut, cote: number | null) => b.rangs.length >= Math.ceil(0.6 * (cote === null ? nbHuit : deRang(cote)));
  const sansCollision = (l: Brut[]) => l.every((b) => b.t.jour !== null) && new Set(l.map((b) => b.t.jour)).size === l.length;

  const cote0 = bruts.filter((b) => b.parite === 0);
  const cote1 = bruts.filter((b) => b.parite === 1);
  let rythme: Rythme = 'aucun';
  let depuis: string | undefined;
  let confianceAB: Confiance | undefined;
  if (cote0.length && cote1.length && nbHuit >= 4) {
    const cote = (b: Brut): number | null => b.parite ?? (b.rangs.length >= 2 && b.rangs.every((r) => r % 2 === b.rangs[0] % 2) ? b.rangs[0] % 2 : null);
    const a0 = bruts.filter((b) => cote(b) === 0);
    const a1 = bruts.filter((b) => cote(b) === 1);
    const chaque = bruts.filter((b) => cote(b) === null);
    const ditA = (l: Brut[]) => l.some((b) => lettreDe(b.t.titre)?.lettre === 'A');
    const ditB = (l: Brut[]) => l.some((b) => lettreDe(b.t.titre)?.lettre === 'B');
    const pA = ditA(a0) && !ditA(a1) ? 0 : ditA(a1) && !ditA(a0) ? 1 : ditB(a0) && !ditB(a1) ? 1 : ditB(a1) && !ditB(a0) ? 0 : Math.min(...a0.map((b) => b.premier)) <= Math.min(...a1.map((b) => b.premier)) ? 0 : 1;
    const ok = sansCollision([...a0, ...chaque]) && sansCollision([...a1, ...chaque]) && [...a0, ...a1].every((b) => assezSouvent(b, cote(b))) && chaque.every((b) => assezSouvent(b, null));
    if (ok) {
      rythme = 'ab';
      for (const b of bruts) {
        const c = cote(b);
        b.t.semaine = c === null ? null : c === pA ? 'A' : 'B';
      }
      // la suite de l'alternance : la derniere semaine active est-elle une A ? sinon la semaine d'apres en est une
      const derRang = huit.length - 1;
      const wDer = huit[derRang];
      depuis = lundiDeSemaine(derRang % 2 === pA ? wDer : wDer + 1);
      confianceAB = nbHuit >= 6 && [...a0, ...a1].every((b) => b.parite !== null && b.part >= 0.9) ? 'sur' : 'a_verifier';
    }
  } else if (nbHuit >= 3 && sansCollision(bruts) && bruts.every((b) => assezSouvent(b, null))) {
    rythme = 'semaine';
  }
  const ordre = (s: SeanceType) => (s.semaine === 'B' ? 1 : 0);
  const liste = bruts.map((b) => b.t);
  if (rythme === 'aucun') {
    for (const s of liste) s.semaine = null;
    liste.sort((a, b) => b.fois - a.fois || a.titre.localeCompare(b.titre));
  } else liste.sort((a, b) => ordre(a) - ordre(b) || (a.jour ?? 9) - (b.jour ?? 9) || a.titre.localeCompare(b.titre));
  return { seances: liste, rythme, ...(depuis ? { depuis } : {}), ...(confianceAB ? { confianceAB } : {}), semaines: nbSem, parSemaine, libres };
}

/* ---------------------------------- vers YOROI ---------------------------------- */

export const NOM_ROUTINE_HEVY = 'Ma routine Hevy';
export const ORIGINE_HEVY = 'hevy';
const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));
const jourLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Le repos conseille de YOROI pour cet exercice (reposConseille.ts), pour un programme de prise de muscle */
const conseille = (e: ExoRoutine, muscle: string | null | undefined) => reposConseille({ nom: e.nom, muscle: muscle ?? null, objectif: 'muscle' }).sec;

function versExoProgramme(e: ExoRoutine, muscle: string | null | undefined, enchaine: boolean, echelle = 1): ExoProgramme {
  const repsMin = borne(e.repsMin, 1, 100);
  return {
    nom: e.nom,
    muscle: muscle ?? '',
    series: borne(e.series, 1, 10),
    repsMin,
    repsMax: Math.max(repsMin, borne(e.repsMax, 1, 100)),
    // 18 novembre 2026 : les exports n'ont pas les temps de repos : le repos conseille de YOROI (reposConseille.ts),
    // selon le type de mouvement, pour un programme de prise de muscle (l'objectif des programmes perso)
    // ajuste a ton vrai rythme quand la duree de tes seances le dit (echelle, seanceType), multiple de 15 s, 45 s a 5 min
    reposSec: echelle === 1 ? conseille(e, muscle) : Math.min(300, Math.max(45, Math.round((conseille(e, muscle) * echelle) / 15) * 15)),
    ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}),
    ...(e.secondes ? { secondes: true } : {}),
    // la brique Cardio de YOROI : une duree en minutes (5 a 120), le chrono de la seance en direct
    ...(e.minutes ? { minutes: borne(e.minutes, 5, 120) } : {}),
    ...(enchaine ? { enchaine: true } : {}),
  };
}

/**
 * 18 novembre 2026 : ton repos reel (SeanceType.reposReelSec) devient une echelle sur le repos conseille : chaque
 * exercice garde sa difference (plus long sur les gros mouvements), la moyenne suit ton rythme.
 */
export function echelleRepos(t: Pick<SeanceType, 'exos' | 'reposReelSec'>, muscleDe: (nom: string) => string | null | undefined): number {
  const exos = t.exos.filter((e) => !e.minutes);
  if (!t.reposReelSec || !exos.length) return 1;
  const moyenne = exos.reduce((n, e) => n + conseille(e, muscleDe(e.nom)), 0) / exos.length;
  return moyenne > 0 ? t.reposReelSec / moyenne : 1;
}

function versSeancePerso(t: SeanceType, i: number, muscleDe: (nom: string) => string | null | undefined): SeancePerso {
  const exos = t.exos.slice(0, 15);
  const echelle = echelleRepos(t, muscleDe);
  const lettres = t.cle.replace(/[^a-z0-9]+/g, '_');
  return {
    titre: t.titre.slice(0, 40).trim() || undefined,
    brique: `h${i}_${lettres}`.slice(0, 32),
    exos: exos.map((e, k) => versExoProgramme(e, muscleDe(e.nom), !!e.enchaine && k < exos.length - 1, echelle)),
  };
}

/* ---------------------------------- Ta semaine ---------------------------------- */

/**
 * 18 novembre 2026 (Houari : « il faut qu'on puisse reprendre sa semaine d'entrainement directement ») : ou tombe
 * chaque seance, en semaine A (a) et en semaine B (b), jours 0 (lundi) a 6. Sans semaine A et B, b suit a.
 * Une seule seance par jour et par semaine (le format des programmes perso).
 */
export type Placement = { ab: boolean; jours: Record<string, { a: number[]; b: number[] }> };

/** Le premier jour libre a partir de d (d, d+1, ... en tournant) */
function jourLibre(pris: Set<number>, d: number): number | null {
  for (let k = 0; k < 7; k++) {
    const x = (d + k) % 7;
    if (!pris.has(x)) return x;
  }
  return null;
}

/**
 * La semaine proposee : les jours prouves, sinon le jour ou chaque seance a ete faite le plus souvent (la plus faite
 * choisit d'abord ; un jour deja pris passe au suivant libre). Semaine A et B quand YOROI les a reperees.
 */
export function placementPropose(r: Routine): Placement {
  const ab = r.rythme === 'ab';
  const jours: Placement['jours'] = {};
  const prisA = new Set<number>();
  const prisB = new Set<number>();
  const ordre = [...r.seances].sort((x, y) => (x.jour === null ? 1 : 0) - (y.jour === null ? 1 : 0) || y.fois - x.fois);
  for (const t of ordre) {
    const voulu = t.jour ?? t.jourFrequent;
    const enA = !ab || t.semaine !== 'B';
    const enB = ab && t.semaine !== 'A';
    const da = enA ? jourLibre(prisA, voulu) : null;
    const db = enB ? jourLibre(prisB, voulu) : null;
    if (da !== null) prisA.add(da);
    if (db !== null) prisB.add(db);
    const a = da === null ? [] : [da];
    jours[t.cle] = { a, b: ab ? (db === null ? [] : [db]) : [...a] };
  }
  return { ab, jours };
}

/** Un jour touche pour une seance : pose ou retire ; la seance qui l'occupait dans la meme semaine le libere */
export function placerJour(p: Placement, cle: string, ligne: 'a' | 'b', jour: number): Placement {
  if (jour < 0 || jour > 6) return p;
  const l = !p.ab ? 'a' : ligne;
  const jours: Placement['jours'] = {};
  const avait = (p.jours[cle]?.[l] ?? []).includes(jour);
  for (const [k, v] of Object.entries(p.jours)) {
    const liste = k === cle ? (avait ? v[l].filter((d) => d !== jour) : [...v[l], jour].sort((x, y) => x - y)) : v[l].filter((d) => d !== jour);
    jours[k] = l === 'a' ? { a: liste, b: p.ab ? [...v.b] : [...liste] } : { a: [...v.a], b: liste };
  }
  if (!jours[cle]) jours[cle] = l === 'a' ? { a: [jour], b: p.ab ? [] : [jour] } : { a: [], b: [jour] };
  return { ab: p.ab, jours };
}

/** Semaine A et B allumee ou eteinte : eteinte, la semaine A sert toutes les semaines ; allumee, B part de A */
export function avecSemainesAB(p: Placement, ab: boolean): Placement {
  if (p.ab === ab) return p;
  const jours: Placement['jours'] = {};
  for (const [k, v] of Object.entries(p.jours)) jours[k] = { a: [...v.a], b: [...v.a] };
  return { ab, jours };
}

/** Lundi local de la semaine d'une date, « 2026-11-16 » */
function lundiLocal(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12);
  return jourLocal(x);
}

/**
 * « Ma routine » : un programme perso comme ceux de « Je construis le mien », toujours avec un planning (Ta
 * semaine : celle proposee, ou celle ajustee par l'utilisateur). Semaine A et semaine B a toi (ab, depuis) quand
 * elles different ; sans fin (ta routine se repete). null : aucune seance gardee ou posee.
 */
export function versProgrammeHevy(r: Routine, o: { nom?: string; garder?: (cle: string) => boolean; maintenant?: Date; muscleDe?: (nom: string) => string | null | undefined; origine?: string; placement?: Placement } = {}): ProgrammePerso | null {
  const garder = o.garder ?? (() => true);
  const muscleDe = o.muscleDe ?? (() => null);
  const maintenant = o.maintenant ?? new Date();
  const pl = o.placement ?? placementPropose(r);
  const semaine: (SeancePerso | null)[] = [null, null, null, null, null, null, null];
  const semaineB: (SeancePerso | null)[] = [null, null, null, null, null, null, null];
  r.seances.forEach((t, i) => {
    if (!garder(t.cle) || !t.exos.length) return;
    const j = pl.jours[t.cle];
    if (!j) return;
    const s = versSeancePerso(t, i, muscleDe);
    const copie = () => ({ ...s, exos: s.exos.map((e) => ({ ...e })) });
    for (const d of j.a) if (d >= 0 && d <= 6 && !semaine[d]) semaine[d] = copie();
    if (pl.ab) for (const d of j.b) if (d >= 0 && d <= 6 && !semaineB[d]) semaineB[d] = copie();
  });
  if (!semaine.some((s) => s && s.exos.length)) return null;
  const ab = pl.ab && semaineB.some((s) => !!s) && semaineB.some((s, d) => (s?.brique ?? null) !== (semaine[d]?.brique ?? null));
  const jour = jourLocal(maintenant);
  const nom = (o.nom ?? NOM_ROUTINE_HEVY).trim().slice(0, 40) || NOM_ROUTINE_HEVY;
  return {
    id: `${PREFIXE_PERSO}${maintenant.getTime().toString(36)}`,
    nom,
    semaine,
    ...(ab ? { semaineB, ab: true, depuis: r.depuis ?? lundiLocal(maintenant) } : {}),
    creeLe: jour,
    modifieLe: jour,
    duree: 0,
    origine: o.origine ?? ORIGINE_HEVY,
  };
}

/**
 * La seance du jour, ou la prochaine, de la routine creee (pour l'ecran Bienvenue) : la meme regle que le suivi des
 * programmes perso (semaine A a partir de `depuis`, semaine B une semaine sur deux). dans : 0 aujourd'hui, 1 demain...
 */
export function prochaineSeanceRoutine(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'ab' | 'depuis'>, maintenant = new Date()): { dans: number; jour: number; b: boolean; seance: SeancePerso } | null {
  const ref = pp.depuis ? new Date(`${pp.depuis}T12:00:00`) : null;
  for (let k = 0; k < 14; k++) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + k, 12);
    const jour = (d.getDay() + 6) % 7;
    let b = false;
    if (pp.ab && pp.semaineB && ref) {
      const n = Math.round((new Date(lundiLocal(d) + 'T12:00:00').getTime() - new Date(lundiLocal(ref) + 'T12:00:00').getTime()) / (7 * 86400000));
      b = ((n % 2) + 2) % 2 === 1;
    }
    const s = (b ? pp.semaineB : pp.semaine)?.[jour];
    if (s && s.exos.length) return { dans: k, jour, b, seance: s };
  }
  return null;
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

/* ---------------------------------- ce qui n'a pas pu etre repris ---------------------------------- */

export type NonRepris = { quoi: string; raison: string; n?: number };

/**
 * 18 novembre 2026 (Houari : « liste ce qui n'a pas pu etre repris, sans rien taire ») : chaque limite, avec sa
 * raison (gabarits francais, traduits a l'affichage). Les series vides et les lignes illisibles viennent de la
 * lecture ; le reste, de la routine reconstruite (limites des programmes perso de YOROI).
 */
export function nonRepris(r: Routine, garder: (cle: string) => boolean = () => true, lecture: { incomprises?: readonly string[]; ignorees?: readonly { quoi: string; raison: string }[] } = {}): NonRepris[] {
  const out: NonRepris[] = [];
  for (const l of lecture.incomprises ?? []) out.push({ quoi: l, raison: 'ligne illisible : ni date, ni exercice' });
  for (const x of lecture.ignorees ?? []) out.push({ quoi: x.quoi, raison: x.raison });
  for (const s of r.seances) {
    if (!garder(s.cle)) continue;
    if (s.exos.length > 15) out.push({ quoi: s.titre, raison: 'plus de 15 exercices : la routine garde les 15 premiers, l’historique garde tout', n: s.exos.length - 15 });
    for (const e of s.exos.slice(0, 15)) {
      if (e.series > 10) out.push({ quoi: `${s.titre} : ${e.nom}`, raison: 'plus de 10 séries : la routine en garde 10' });
      if (e.secondes && e.repsMax > 100) out.push({ quoi: `${s.titre} : ${e.nom}`, raison: 'tenue de plus de 100 secondes : la routine vise 100 secondes, l’historique garde ta vraie durée' });
      if (e.minutesSupposees) out.push({ quoi: `${s.titre} : ${e.nom}`, raison: 'distance sans durée : 20 minutes proposées, à régler' });
      else if (e.minutes && (e.minutes < 5 || e.minutes > 120)) out.push({ quoi: `${s.titre} : ${e.nom}`, raison: 'le cardio de la routine va de 5 à 120 minutes' });
    }
  }
  return out;
}
