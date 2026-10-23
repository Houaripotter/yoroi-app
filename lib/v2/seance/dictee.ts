/**
 * Dictee de seance (vague 39, refaite la nuit du 14 octobre) : une phrase, dite au micro du clavier
 * ou tapee, devient une seance. Code pur, sans IA en ligne, sans React ni base : rien ne quitte le
 * telephone, et tout se teste a part (__tests__/unit/dictee.test.ts).
 *
 * Etapes :
 * 1. la phrase est decoupee en mots (positions d'origine gardees), les hesitations sont retirees
 *    (« je, j'ai », « des et des », « euh »), les nombres en lettres deviennent des chiffres
 *    (« quatre » 4, « vingt et un » 21, « le premier » 1e) ;
 * 2. chaque lecteur cherche ce qu'il sait lire et « prend » les mots lus, pour qu'un meme chiffre
 *    ne soit pas relu comme autre chose : heure, rounds, fractionne, exercices, distance, duree,
 *    allure, frequence cardiaque, calories, match, partenaires et soumissions, ressenti ;
 * 3. chaque champ garde les morceaux de phrase d'ou il vient (spans) : l'ecran les surligne.
 *
 * Rien n'est invente : ce qui n'est pas dit reste vide. La seule deduction est la duree quand elle
 * n'est pas dite (4 rounds de 5 min font 20 min, 5 km a 5:30 du km font 27 min 30), et l'ecran
 * l'annonce comme deduite. La phrase entiere reste dans la note, rien n'est perdu.
 */
import { SPORTS } from '@/lib/sports';
import { APPRIS_RE, BELTS, CHARGE_LABEL, CHARGE_RE, COMBAT_TERMS, DRILL_RE, EXOS, EXO_BY_ID, EXO_DESCRIPTIONS, EXO_VAGUES, SESSION_WORDS, TRAVAIL_RE } from './lexique';
import type { Charge, CombatTerm, TermKind } from './lexique';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export type { Charge } from './lexique';
export { CHARGE_LABEL } from './lexique';

/** morceau de la phrase d'origine (indices dans le texte tape) */
export type Span = { start: number; end: number };

export type DicteeExercise = {
  name: string;
  sets: number;
  /** 0 avec max = true : « 3 series max » */
  reps: number;
  weight: number;
  max?: boolean;
  /** fractionne : distance d'une repetition en km, ou duree en minutes */
  distance?: number;
  duration?: number;
  /** charge dite : « pas leste », « a la machine », « avec halteres » */
  load?: Charge;
  /** ce qui n'est pas dit : une case a completer, pas une erreur */
  missing?: ('sets' | 'reps' | 'weight')[];
};

/** l'app a devine un exercice : elle le dit et propose d'autres choix */
export type DicteeGuess = {
  /** index de l'exercice dans exercises */
  index: number;
  /** le morceau de phrase d'ou vient la devinette */
  said: string;
  question: string;
  /** proposition mise en avant (« c'est ca ? ») ; absente : simple question */
  guess?: string;
  options: string[];
};

/** technique apprise, repetee en drill ou travaillee (pas une finition de sparring) */
export type DicteeLearned = { id: string; label: string; note?: string; kind: TermKind; mode: 'appris' | 'drill' | 'travaille' | 'reussi' };

export type DicteeTechnique = { id: string; label: string; count?: number };

export type RoundResult = 'win' | 'loss' | 'draw';

export type DicteeRound = {
  number: number;
  partner?: string;
  result?: RoundResult;
  methodsGiven?: string[];
  methodsTaken?: string[];
  submissionsGiven?: number;
  submissionsTaken?: number;
  usedTechniques?: { label: string; pts: number; count: number }[];
};

/** une carte par partenaire (ou par groupe de rounds sans nom) */
export type DicteePartner = {
  name: string;
  /** professeur, coach... tel que dit */
  role?: string;
  rounds: number[];
  result?: RoundResult;
  given: DicteeTechnique[];
  taken: DicteeTechnique[];
  src: Span[];
};

/** rounds de travail qui ne sont pas du sparring (sac, pattes d'ours, shadow) */
export type DicteeBloc = { label: string; rounds: number; roundMin?: number };

/** sports collectifs : ce que la fiche de seance n'a pas en colonne va dans la note */
export type DicteeTeam = {
  match?: boolean;
  goals?: number;
  assists?: number;
  points?: number;
  tries?: number;
  position?: string;
  scoreFor?: number;
  scoreAgainst?: number;
  result?: RoundResult;
  /** « foot a 5 », « futsal » */
  format?: string;
  /** « entre amis », « club », « competition » */
  cadre?: string;
};

export type SessionMood = 'fire' | 'solid' | 'ok' | 'hard' | 'crushed';

export type DicteeResult = {
  sport?: string;
  /** jour AAAA-MM-JJ, seulement s'il est dit */
  date?: string;
  /** heure de debut HH:MM, seulement si elle est dite */
  time?: string;
  /** moment de la journee dit sans heure precise : 'matin' | 'midi' | 'apres-midi' | 'soir' */
  moment?: string;
  duration?: number;
  /** duree pas dite, deduite : « 4 x 5 min » */
  durationFrom?: string;
  /** temps de course exact en secondes (28 min 30) */
  durationSec?: number;
  intensity?: number;
  /** note de seance 1 a 5 et ressenti, deduits des mots (« super sympa ») */
  rating?: number;
  mood?: SessionMood;
  rounds?: number;
  roundMin?: number;
  distance?: number;
  /** allure en secondes par km (course, marche) ou par 100 m (natation) */
  paceSec?: number;
  paceUnit?: 'km' | '100m';
  /** allure dite (true) ou calculee (false) */
  paceSaid?: boolean;
  speed?: number;
  heartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  outdoor?: boolean;
  sessionType?: string;
  /** type de seance dit plus precis que la fiche : « Positionnel », « Stage », « Séminaire » */
  sessionLabel?: string;
  technicalTheme?: string;
  /** techniques apprises ou travaillees (pas les finitions de sparring) */
  learned: DicteeLearned[];
  /** exercices devines, a confirmer d'un geste */
  guesses: DicteeGuess[];
  /** grade dit (« Ceinture bleue, 2 barrettes ») et passage de grade */
  grade?: string;
  gradeEvent?: boolean;
  club?: string;
  coach?: string;
  exercises: DicteeExercise[];
  partners: DicteePartner[];
  combatRounds: DicteeRound[];
  blocs: DicteeBloc[];
  team?: DicteeTeam;
  /** faits sans colonne dans la fiche (longueurs, denivele, sac) : recopies dans la note */
  extraNotes: string[];
  /** ce que la phrase a permis de remplir, dans l'ordre de l'ecran */
  found: string[];
  /** d'ou vient chaque champ : cle du champ vers ses morceaux de phrase */
  spans: Record<string, Span[]>;
};

/* ------------------------------------------------------------------ */
/* Texte : minuscules sans accents, meme longueur que l'original        */
/* ------------------------------------------------------------------ */

export function fold(text: string): string {
  let out = '';
  for (const ch of text) {
    const base = ch.normalize('NFD')[0] ?? ch;
    const low = base.toLowerCase();
    const one = ch === 'œ' || ch === 'Œ' ? 'o' : ch === 'æ' || ch === 'Æ' ? 'a' : low.length === ch.length ? low : ch.length === 1 ? (low[0] ?? ch) : ch;
    out += one;
  }
  return out.replace(/[’`ʼ‘]/g, "'");
}

type Tok = { t: string; s: number; e: number; cap: boolean; n0: number; n1: number };

const UNITS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
};
const TENS: Record<string, number> = { vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60 };
const ORDINALS: Record<string, number> = {
  premier: 1, premiere: 1, premiers: 1, deuxieme: 2, second: 2, seconde: 2, troisieme: 3, quatrieme: 4, cinquieme: 5,
  sixieme: 6, septieme: 7, huitieme: 8, neuvieme: 9, dixieme: 10, onzieme: 11, douzieme: 12,
};
const FILLER_WORDS = new Set(['euh', 'heu', 'hum', 'hmm', 'bah', 'euhh', 'heuu', 'mmh', 'hein']);
const SHORT_REPEAT = new Set(['des', 'de', 'le', 'la', 'les', 'un', 'une', 'du', 'au', 'aux', 'je', "j'ai", 'il', 'on', 'et', 'a', 'en']);

/** nombre en lettres a partir du mot i : valeur et nombre de mots lus */
function readNumberWords(w: string[], i: number): { v: number; len: number } | null {
  const below20 = (j: number): { v: number; len: number } | null => {
    const a = w[j];
    if (a === undefined) return null;
    if (a === 'dix' && ['sept', 'huit', 'neuf'].includes(w[j + 1] ?? '')) return { v: 10 + UNITS[w[j + 1]], len: 2 };
    if (UNITS[a] !== undefined) return { v: UNITS[a], len: 1 };
    return null;
  };
  const below100 = (j: number): { v: number; len: number } | null => {
    const a = w[j];
    if (a === undefined) return null;
    if (a === 'quatre' && (w[j + 1] === 'vingt' || w[j + 1] === 'vingts')) {
      let v = 80;
      let len = 2;
      const r = below20(j + 2);
      if (r && r.v > 0) {
        v += r.v;
        len += r.len;
      }
      return { v, len };
    }
    if (TENS[a] !== undefined) {
      let v = TENS[a];
      let len = 1;
      if (w[j + 1] === 'et' && (w[j + 2] === 'un' || w[j + 2] === 'une' || w[j + 2] === 'onze')) {
        v += w[j + 2] === 'onze' ? 11 : 1;
        len += 2;
      } else if (v === 60) {
        const r = below20(j + 1);
        if (r && r.v > 0) {
          v += r.v;
          len += r.len;
        }
      } else {
        const u = UNITS[w[j + 1] ?? ''];
        if (u !== undefined && u >= 1 && u <= 9) {
          v += u;
          len += 1;
        }
      }
      return { v, len };
    }
    return below20(j);
  };
  const first = w[i];
  if (first === 'cent' || first === 'cents') {
    const r = below100(i + 1);
    return { v: 100 + (r?.v ?? 0), len: 1 + (r?.len ?? 0) };
  }
  const r = below100(i);
  if (!r) return null;
  if (w[i + r.len] === 'cent' || w[i + r.len] === 'cents') {
    const r2 = below100(i + r.len + 1);
    return { v: r.v * 100 + (r2?.v ?? 0), len: r.len + 1 + (r2?.len ?? 0) };
  }
  return r;
}

type Norm = { toks: Tok[]; norm: string };

/** mots, hesitations retirees, nombres en chiffres ; chaque mot garde sa position d'origine */
function normalize(original: string): Norm {
  const folded = fold(original);
  const raw: { t: string; s: number; e: number; cap: boolean }[] = [];
  const re = /\d+(?:[.,]\d+)?|[a-z]+(?:'[a-z]+)*'?|[.,;:!?]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded))) {
    const c = original[m.index] ?? '';
    raw.push({ t: m[0], s: m.index, e: m.index + m[0].length, cap: c !== c.toLowerCase() && c === c.toUpperCase() });
  }
  // « 2eme », « 1er » : chiffre colle a son suffixe
  const merged: typeof raw = [];
  for (let i = 0; i < raw.length; i += 1) {
    const a = raw[i];
    const b = raw[i + 1];
    if (/^\d+$/.test(a.t) && b && b.s === a.e && /^(?:e|er|ere|eme|ieme|nd|nde|ers|eres)$/.test(b.t)) {
      merged.push({ t: `${a.t}e`, s: a.s, e: b.e, cap: false });
      i += 1;
      continue;
    }
    merged.push(a);
  }
  // hesitations
  const keep: typeof raw = [];
  for (let i = 0; i < merged.length; i += 1) {
    const a = merged[i];
    const next = merged[i + 1];
    const next2 = merged[i + 2];
    if (FILLER_WORDS.has(a.t)) continue;
    // « je, j'ai » / « je j'ai »
    if (a.t === 'je' && next && (next.t.startsWith("j'") || (next.t === ',' && next2?.t.startsWith("j'")))) {
      if (next.t === ',') i += 1;
      continue;
    }
    // « des des », « le le », « j'ai j'ai »
    if (next && next.t === a.t && /[a-z]/.test(a.t)) continue;
    // « des et des », « de, de »
    if (SHORT_REPEAT.has(a.t) && next && (next.t === 'et' || next.t === ',') && next2 && next2.t === a.t) {
      i += 1;
      continue;
    }
    keep.push(a);
  }
  // nombres et ordinaux en lettres
  const words = keep.map((k) => k.t);
  const toks: Tok[] = [];
  for (let i = 0; i < keep.length; i += 1) {
    const k = keep[i];
    if (ORDINALS[k.t] !== undefined) {
      toks.push({ ...k, t: `${ORDINALS[k.t]}e`, n0: 0, n1: 0 });
      continue;
    }
    const nw = readNumberWords(words, i);
    if (nw) {
      const last = keep[i + nw.len - 1];
      toks.push({ t: String(nw.v), s: k.s, e: last.e, cap: false, n0: 0, n1: 0 });
      i += nw.len - 1;
      continue;
    }
    toks.push({ ...k, n0: 0, n1: 0 });
  }
  let norm = '';
  for (const t of toks) {
    if (norm) norm += ' ';
    t.n0 = norm.length;
    norm += t.t;
    t.n1 = norm.length;
  }
  return { toks, norm };
}

/* ------------------------------------------------------------------ */
/* Lecture : les mots lus sont pris, les spans gardes                    */
/* ------------------------------------------------------------------ */

class Reader {
  toks: Tok[];
  norm: string;
  used: boolean[];
  spans: Record<string, Span[]> = {};
  original: string;
  constructor(original: string) {
    this.original = original;
    const n = normalize(original);
    this.toks = n.toks;
    this.norm = n.norm;
    this.used = n.toks.map(() => false);
  }
  /** la phrase normalisee, les mots deja pris remplaces par des _ (memes positions) */
  free(): string {
    let s = '';
    this.toks.forEach((t, i) => {
      if (s) s += ' ';
      s += this.used[i] ? '_'.repeat(t.t.length) : t.t;
    });
    return s;
  }
  tokensIn(a: number, b: number): number[] {
    const out: number[] = [];
    this.toks.forEach((t, i) => {
      if (t.n1 > a && t.n0 < b) out.push(i);
    });
    return out;
  }
  spanOf(a: number, b: number): Span | null {
    const ids = this.tokensIn(a, b).filter((i) => /[a-z0-9]/.test(this.toks[i].t));
    if (!ids.length) return null;
    return { start: this.toks[ids[0]].s, end: this.toks[ids[ids.length - 1]].e };
  }
  mark(key: string, a: number, b: number, take = true): void {
    const sp = this.spanOf(a, b);
    if (sp) {
      const list = (this.spans[key] ??= []);
      if (!list.some((x) => x.start === sp.start && x.end === sp.end)) list.push(sp);
    }
    if (take) for (const i of this.tokensIn(a, b)) this.used[i] = true;
  }
  markM(key: string, m: RegExpExecArray, take = true, offset = 0): void {
    this.mark(key, offset + m.index + (m[0].startsWith(' ') ? 1 : 0), offset + m.index + m[0].length, take);
  }
  /** cherche dans ce qui n'est pas encore pris */
  exec(re: RegExp): RegExpExecArray | null {
    const g = new RegExp(re.source, re.flags.replace('g', ''));
    return g.exec(this.free());
  }
  all(re: RegExp): RegExpExecArray[] {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const s = this.free();
    const out: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = g.exec(s))) {
      out.push(m);
      if (m[0].length === 0) g.lastIndex += 1;
    }
    return out;
  }
  /** texte d'origine d'un intervalle de la phrase normalisee */
  orig(a: number, b: number): string {
    const sp = this.spanOf(a, b);
    return sp ? this.original.slice(sp.start, sp.end) : '';
  }
}

const num = (s: string | undefined): number => (s ? Number(s.replace(',', '.')) : NaN);
const I = '(\\d{1,3})';
const MIN = '(?:min|mn|minutes?|mins)';
const HOUR = '(?:h|heures?)';

/* ------------------------------------------------------------------ */
/* Sport                                                                */
/* ------------------------------------------------------------------ */

/** mots dits (sans accents, apres normalisation) vers l'id du sport ; le premier dit gagne */
const SPORT_ALIASES: [string, string][] = [
  ['brazilian jiu jitsu', 'jjb'], ['jiu jitsu bresilien', 'jjb'], ['ju jitsu bresilien', 'jjb'], ['jujitsu bresilien', 'jjb'], ['jiujitsu bresilien', 'jjb'],
  ['jiu jitsu', 'jjb'], ['jiujitsu', 'jjb'], ['ju jitsu', 'jjb'], ['jujitsu', 'jjb'], ['jui jitsu', 'jjb'], ['jjb', 'jjb'], ['j j b', 'jjb'], ['bjj', 'jjb'],
  ['no gi', 'grappling'], ['nogi', 'grappling'], ['grappling', 'grappling'],
  ['mma', 'mma'], ['m m a', 'mma'], ['free fight', 'mma'], ['arts martiaux mixtes', 'mma'],
  ['boxe francaise', 'boxe_francaise'], ['savate', 'boxe_francaise'],
  ['boxe thai', 'muay_thai'], ['boxe thailandaise', 'muay_thai'], ['muay thai', 'muay_thai'], ['muaythai', 'muay_thai'], ['thai', 'muay_thai'],
  ['kick boxing', 'kickboxing'], ['kickboxing', 'kickboxing'], ['k 1', 'kickboxing'],
  ['boxe anglaise', 'boxe'], ['boxe', 'boxe'], ['boxing', 'boxe'],
  ['karate', 'karate'], ['taekwondo', 'taekwondo'], ['judo', 'judo'], ['lutte', 'lutte'], ['wrestling', 'lutte'],
  ['sambo', 'sambo'], ['krav maga', 'krav_maga'], ['krav', 'krav_maga'], ['aikido', 'aikido'], ['capoeira', 'capoeira'],
  ['self defense', 'self_defense'],
  ['musculation', 'musculation'], ['muscu', 'musculation'], ['renforcement', 'musculation'], ['renfo', 'musculation'], ['salle de sport', 'musculation'],
  ['powerlifting', 'powerlifting'], ['street workout', 'street_workout'], ['callisthenie', 'calisthenics'], ['calisthenics', 'calisthenics'],
  ['crossfit', 'crossfit'], ['cross fit', 'crossfit'], ['wod', 'crossfit'], ['hiit', 'hiit'], ['hyrox', 'hyrox'],
  ['yoga', 'yoga'], ['pilates', 'pilates'], ['etirements', 'stretching'], ['stretching', 'stretching'], ['mobilite', 'mobilite'],
  ['course a pied', 'running'], ['footing', 'running'], ['jogging', 'running'], ['running', 'running'], ['fractionne', 'running'], ['course', 'running'], ['run', 'running'], ['couru', 'running'],
  ['ultra trail', 'ultra_trail'], ['trail', 'trail'], ['semi marathon', 'running'], ['marathon', 'marathon'], ['triathlon', 'triathlon'],
  ['vtt', 'vtt'], ['spinning', 'spinning'], ['rpm', 'spinning'], ['cyclisme', 'cycling'], ['velo de route', 'velo_route'], ['velo', 'velo'],
  ['natation', 'natation'], ['piscine', 'natation'], ['nage', 'natation'], ['nager', 'natation'], ['nage', 'natation'],
  ['randonnee', 'randonnee'], ['rando', 'randonnee'], ['marche nordique', 'marche_nordique'], ['marche', 'marche'],
  ['rameur', 'rameur'], ['aviron', 'aviron'], ['corde a sauter', 'corde_a_sauter'],
  ['escalade', 'escalade'], ['grimpe', 'escalade'],
  ['futsal', 'futsal'], ['football', 'football'], ['foot', 'football'], ['five', 'football'], ['basket', 'basketball'], ['basketball', 'basketball'], ['rugby', 'rugby'],
  ['handball', 'handball'], ['hand', 'handball'], ['volley', 'volleyball'], ['padel', 'padel'], ['tennis', 'tennis'], ['badminton', 'badminton'],
  ['elliptique', 'elliptique'], ['zumba', 'zumba'], ['danse', 'danse'],
];

const KNOWN = new Set(SPORTS.map((s) => s.id));

function esc(w: string): string {
  return w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
function wordRe(word: string): RegExp {
  return new RegExp(`(?:^| )(${esc(word)})(?= |$)`);
}

function findSport(r: Reader): string | undefined {
  let best: { at: number; len: number; id: string } | null = null;
  const consider = (alias: string, id: string) => {
    if (!KNOWN.has(id) || !alias) return;
    const m = wordRe(alias).exec(r.norm);
    if (!m) return;
    const at = m.index + m[0].indexOf(m[1]);
    if (!best || at < best.at || (at === best.at && alias.length > best.len)) best = { at, len: alias.length, id };
  };
  for (const [alias, id] of SPORT_ALIASES) consider(alias, id);
  for (const sp of SPORTS) if (sp.name.length > 3) consider(normalize(sp.name).norm, sp.id);
  const b = best as { at: number; len: number; id: string } | null;
  if (b) r.mark('sport', b.at, b.at + b.len, false);
  if (!b) {
    // « j'ai fait un 5 », « on a joue un 7 » : du foot a 5 ou a 7
    const f = /(?:^| )((?:j'ai|on a|on s'est|je me suis) (?:fait|joue|refait|tape|organise) (?:1 )?(?:petit |bon )?(5|7|8))(?= |$)(?! (?:km|kilometres?|bornes|kilos?|kg|min|minutes?|mn|h|heures?|m|metres?|series?|x|fois|rounds?|reps?|tours?|longueurs?|sets?)(?= |$))/.exec(r.norm);
    if (f) {
      const st = f.index + f[0].indexOf(f[1]);
      r.mark('sport', st, st + f[1].length);
      return 'football';
    }
  }
  return b?.id;
}

const COMBAT_SPORTS = new Set(['jjb', 'grappling', 'mma', 'boxe', 'boxe_francaise', 'muay_thai', 'kickboxing', 'karate', 'taekwondo', 'judo', 'lutte', 'sambo', 'krav_maga', 'self_defense', 'savate', 'boxe_thai', 'boxe_olympique', 'lutte_olympique']);
const MUSCU = new Set(['musculation', 'powerlifting', 'street_workout', 'calisthenics', 'crossfit', 'hiit', 'hyrox', 'fitness', 'halterophilie', 'kettlebell', 'functional_training', 'circuit_training', 'strongman', 'bootcamp']);
const PACE_KM = new Set(['running', 'trail', 'ultra_trail', 'marathon', 'marche', 'randonnee', 'marche_nordique', 'sprint']);
const SPEED = new Set(['velo', 'vtt', 'cycling', 'velo_route', 'spinning', 'gravel', 'velo_electrique']);
const SWIM = new Set(['natation', 'nage_eau_libre']);
export const TEAM_SPORTS = new Set(['football', 'futsal', 'basketball', 'rugby', 'handball', 'volleyball', 'water_polo', 'hockey_glace', 'hockey_gazon', 'football_americain']);

/* ------------------------------------------------------------------ */
/* Jour et heure                                                        */
/* ------------------------------------------------------------------ */

function isoOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  x.setDate(x.getDate() + n);
  return x;
}
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

function findDate(r: Reader, now: Date): { date?: string; moment?: string } {
  const out: { date?: string; moment?: string } = {};
  const s = r.norm;
  const mom = /(?:^| )((?:ce |hier |avant hier |lundi |mardi |mercredi |jeudi |vendredi |samedi |dimanche |cet |en fin d'|en fin de |dans l'|dans la |tot le |tot ce |le )(matin|midi|apres midi|aprem|soir|soiree|nuit|journee)|a l'aube|pause dej|a la pause dej|entre midi et 2)(?= |$)/.exec(s);
  if (mom) {
    const w = mom[2] ?? mom[1];
    out.moment = /aube|matin/.test(w) ? 'matin' : /apres|aprem/.test(w) ? 'apres-midi' : /midi|dej/.test(w) ? 'midi' : /soir|nuit/.test(w) ? 'soir' : /journee/.test(w) && /fin/.test(mom[1]) ? 'soir' : undefined;
    if (out.moment) r.markM('debut', mom, false);
  }
  const day = (re: RegExp, offset: number): boolean => {
    const m = re.exec(s);
    if (!m) return false;
    out.date = isoOf(addDays(now, offset));
    r.markM('jour', m, false);
    return true;
  };
  if (day(/(?:^| )(avant hier)(?= |$)/, -2)) return out;
  if (day(/(?:^| )(hier)(?= |$)/, -1)) return out;
  if (day(/(?:^| )(aujourd'hui|ce matin|ce midi|cet apres midi|cet aprem|ce soir|tout a l'heure|tantot)(?= |$)/, 0)) return out;
  const dm = /(?:^| )((?:le )?(\d{1,2})e? (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre))(?= |$)/.exec(s);
  if (dm) {
    const d0 = parseInt(dm[2], 10);
    const month = MONTHS.indexOf(dm[3]);
    let d = new Date(now.getFullYear(), month, d0, 12);
    if (d.getMonth() === month && d0 >= 1) {
      if (d.getTime() > now.getTime() + 12 * 3600e3) d = new Date(now.getFullYear() - 1, month, d0, 12);
      out.date = isoOf(d);
      r.markM('jour', dm);
      return out;
    }
  }
  for (let i = 0; i < 7; i += 1) {
    const m = wordRe(WEEKDAYS[i]).exec(s);
    if (m) {
      const back = (now.getDay() - i + 7) % 7;
      const last = s.slice(m.index + m[0].length).startsWith(' dernier') && back === 0 ? 7 : back;
      out.date = isoOf(addDays(now, -last));
      r.markM('jour', m, false);
      break;
    }
  }
  return out;
}

function hhmm(h: number, m: number): string | undefined {
  if (!(h >= 0 && h <= 23 && m >= 0 && m <= 59)) return undefined;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** apres midi et soir : « a 7 h » devient 19 h */
function shift(h: number, moment: string | undefined, tail: string): number {
  if (/^ (?:du|de l') ?(?:soir|apres midi|aprem)/.test(tail) && h < 12) return h + 12;
  if ((moment === 'soir' || moment === 'apres-midi') && h >= 1 && h <= 11) return h + 12;
  return h;
}

function findTimes(r: Reader, moment: string | undefined): { time?: string; duration?: number } {
  const out: { time?: string; duration?: number } = {};
  const H = `(\\d{1,2}) ${HOUR}(?: (\\d{1,2}))?`;
  const range = r.exec(new RegExp(`(?:^| )(?:de|entre) ${H} (?:a|et|jusqu'a) ${H}`));
  if (range) {
    const h1 = shift(+range[1], moment, '');
    const m1 = +(range[2] ?? 0);
    const h2 = shift(+range[3], moment, '');
    const m2 = +(range[4] ?? 0);
    const span = h2 * 60 + m2 - (h1 * 60 + m1);
    if (hhmm(h1, m1) && hhmm(h2, m2) && span > 0 && span <= 600) {
      out.time = hhmm(h1, m1);
      out.duration = span;
      r.markM('debut', range);
      r.markM('duree', range, false);
      return out;
    }
  }
  const at = r.exec(new RegExp(`(?:^| )(?:a|vers|des|depuis|aux alentours de|pour) ${H}(?= |$)`));
  if (at) {
    const tail = r.free().slice(at.index + at[0].length, at.index + at[0].length + 16);
    const h = shift(+at[1], moment, tail);
    const t = hhmm(h, +(at[2] ?? 0));
    if (t) {
      out.time = t;
      r.markM('debut', at);
      const du = /^ (?:du|de l') ?(?:matin|soir|apres midi|aprem)/.exec(tail);
      if (du) r.mark('debut', at.index + at[0].length, at.index + at[0].length + du[0].length);
      return out;
    }
  }
  const noon = r.exec(/(?:^| )a (midi|minuit)(?= |$)/);
  if (noon) {
    out.time = noon[1] === 'midi' ? '12:00' : '00:00';
    r.markM('debut', noon);
    return out;
  }
  // « 18 h 30 » seul : une heure de 6 h ou plus sans « pendant » ni « en » est une heure de debut
  const bare = r.exec(new RegExp(`(?:^| )(?<!pendant |en |durant |sur )(\\d{1,2}) ${HOUR}(?: (\\d{2}))?(?= |$)`));
  if (bare && +bare[1] >= 6 && +bare[1] <= 23) {
    const t = hhmm(shift(+bare[1], moment, ''), +(bare[2] ?? 0));
    if (t) {
      out.time = t;
      r.markM('debut', bare);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Rounds, blocs de frappe, fractionne                                  */
/* ------------------------------------------------------------------ */

const ROUND_WORDS = '(?:rounds?|rondes?|reprises?|rolls?|randoris?|combats?|assauts?|manches?|sparrings?)';
const BLOC_KINDS: [RegExp, string][] = [
  [/^(?:de |au |a la |aux |sur le )?(?:sacs?)(?: de frappe)?/, 'Sac'],
  [/^(?:de |aux |au )?(?:pattes? d'ours|paos?|pads)/, 'Pattes d’ours'],
  [/^(?:de |en )?(?:shadow boxing|shadow|boxe dans le vide)/, 'Shadow'],
  [/^(?:de |a la )?corde/, 'Corde'],
  [/^(?:de |en )?(?:sparrings?|spar|mises? de gants|assauts?|randoris?|rolls?|combat)/, 'Sparring'],
];

function findRounds(r: Reader, combat: boolean): { rounds?: number; roundMin?: number; blocs: DicteeBloc[]; sparring?: number } {
  const blocs: DicteeBloc[] = [];
  let rounds: number | undefined;
  let roundMin: number | undefined;
  let sparring: number | undefined;
  const PER = `(?: (?:de|d'|a|chacun de|chacune de) ${I} ?${MIN}?| de ${I}(?= |$))?`;
  const TAIL = "((?: (?:de |au |aux |a la |en |sur le )?[a-z']+){0,3})";
  const list: { n: number; per?: number; tail: string; a: number; b: number }[] = [];
  // « 6 x 3 min », « 6 fois 3 minutes » (en combat, ou suivi d'un mot de frappe)
  for (const m of r.all(new RegExp(`(?:^| )(\\d{1,2}) (?:x|fois) ${I} ${MIN}${TAIL}`))) {
    if (!combat && !BLOC_KINDS.some(([re]) => re.test(m[3].trim()))) continue;
    list.push({ n: +m[1], per: +m[2], tail: m[3].trim(), a: m.index + (m[0].startsWith(' ') ? 1 : 0), b: m.index + m[0].length - m[3].length });
  }
  for (const m of r.all(new RegExp(`(?:^| )(\\d{1,2}) ${ROUND_WORDS}${PER}${TAIL}`))) {
    const per = m[2] ? +m[2] : m[3] ? +m[3] : undefined;
    list.push({ n: +m[1], per: per && per <= 15 ? per : undefined, tail: m[4].trim(), a: m.index + (m[0].startsWith(' ') ? 1 : 0), b: m.index + m[0].length - m[4].length });
  }
  list.sort((x, y) => x.a - y.a);
  const s = r.free();
  for (const it of list) {
    if (!(it.n >= 1 && it.n <= 40)) continue;
    // « 2 rounds avec Paul » parmi d'autres : c'est la part de Paul, lue avec les partenaires
    const after = s.slice(it.b, it.b + 40);
    if (/^ (?:avec|contre|face a) [a-z]/.test(after) && !/^ (?:avec|contre) (?:le|la|les|des|un|une) /.test(after) && list.length > 1) continue;
    const kind = BLOC_KINDS.find(([re]) => re.test(it.tail));
    let b = it.b;
    if (kind) {
      const km = kind[0].exec(it.tail);
      if (km) b = it.b + 1 + km[0].length;
    }
    const label = kind?.[1];
    if (kind && !it.per) {
      const pm = new RegExp(`^ (?:de|d') ${I} ?${MIN}?(?= |$)`).exec(s.slice(b));
      if (pm && +pm[1] <= 15) {
        it.per = +pm[1];
        b += pm[0].length;
      }
    }
    if (label && label !== 'Sparring') {
      blocs.push({ label, rounds: it.n, roundMin: it.per });
      r.mark('blocs', it.a, b);
      continue;
    }
    if (label === 'Sparring') sparring = (sparring ?? 0) + it.n;
    rounds = (rounds ?? 0) + it.n;
    if (it.per && !roundMin) roundMin = it.per;
    r.mark('rounds', it.a, b);
  }
  // « rounds de 5 minutes » sans nombre
  if (!roundMin) {
    const m = r.exec(new RegExp(`(?:^| )(?:des |les |chaque )?${ROUND_WORDS} (?:de|d') ${I} ?${MIN}?`));
    if (m && +m[1] <= 15) {
      roundMin = +m[1];
      r.markM('rounds', m);
    }
  }
  return { rounds, roundMin, blocs, sparring };
}

function findIntervals(r: Reader, sport: string | undefined): DicteeExercise[] {
  const out: DicteeExercise[] = [];
  const name = (what: string) => (sport && SWIM.has(sport) ? `Séries de ${what}` : !sport || PACE_KM.has(sport) ? `Fractionné ${what}` : `Intervalles ${what}`);
  const push = (e: DicteeExercise, m: RegExpExecArray) => {
    const before = r.free().slice(Math.max(0, m.index - 32), m.index + 1).split(/[,.;!?]/).pop() ?? '';
    if (new RegExp(EXO_RE.source).test(before.trim())) return;
    out.push(e);
    r.markM(`exercice:${out.length - 1}`, m);
  };
  for (const m of r.all(/(?:^| )(\d{1,2}) (?:x|fois|series? de|repetitions? de) (\d{2,4}) ?(?:m|metres?)(?= |$)/)) {
    const d = +m[2];
    if (d < 25 || d > 5000) continue;
    push({ name: name(`${d} m`), sets: +m[1], reps: 1, weight: 0, distance: d / 1000 }, m);
  }
  for (const m of r.all(/(?:^| )(\d{1,2}) (?:x|fois) (\d{1,2}(?:[.,]\d)?) ?(?:km|kilometres?|bornes)(?= |$)/)) {
    const d = num(m[2]);
    push({ name: name(`${String(d).replace('.', DECIMAL)} km`), sets: +m[1], reps: 1, weight: 0, distance: d }, m);
  }
  const cardio = !sport || PACE_KM.has(sport) || SPEED.has(sport) || SWIM.has(sport) || sport === 'rameur';
  if (cardio) {
    for (const m of r.all(new RegExp(`(?:^| )(\\d{1,2}) (?:x|fois) (\\d{1,2}) ${MIN}(?= |$)`))) {
      push({ name: name(`${m[2]} min`), sets: +m[1], reps: 1, weight: 0, duration: +m[2] }, m);
    }
    for (const m of r.all(/(?:^| )(\d{1,2}) (?:x|fois) (\d{2,3}) ?(?:s|sec|secondes?)(?= |$)/)) {
      push({ name: name(`${m[2]} s`), sets: +m[1], reps: 1, weight: 0, duration: Math.round((+m[2] / 60) * 100) / 100 }, m);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Musculation                                                          */
/* ------------------------------------------------------------------ */

/** forme dite d'un alias du lexique : minuscules sans accents, tirets en espaces */
export function aliasForm(a: string): string {
  return fold(a).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** alias (et son pluriel) vers l'id ; alternance triee du plus long au plus court */
function aliasTable<T>(items: T[], aliases: (x: T) => string[], idOf: (x: T) => string): { map: Map<string, string>; alt: string } {
  const map = new Map<string, string>();
  for (const it of items) {
    for (const raw of aliases(it)) {
      const a = aliasForm(raw);
      if (!a) continue;
      if (!map.has(a)) map.set(a, idOf(it));
      if (!/[sx]$/.test(a) && !map.has(`${a}s`)) map.set(`${a}s`, idOf(it));
    }
  }
  const alt = Array.from(map.keys()).sort((x, y) => y.length - x.length).map(esc).join('|');
  return { map, alt };
}

const EXO_TABLE = aliasTable(EXOS, (e) => e.aliases, (e) => e.id);
const EX_ALT = EXO_TABLE.alt;
const EXO_RE = new RegExp(`(?:^| )(?:l'|d')?(${EX_ALT})(?= |$)`, 'g');
const VAGUE_RE = new RegExp(`(?:^| )(${EXO_VAGUES.map((v) => `(?:${v.re})`).join('|')})(?= |$)`, 'g');
const NAME_STOP = new Set(['et', 'puis', 'ensuite', 'apres', 'avec', 'du', 'de', 'des', "d'", 'le', 'la', 'les', 'au', 'aux', 'en', 'un', 'une', 'fait', "j'ai", 'sur', 'on', 'a', 'pour', 'mon', 'ma', 'mes', 'ai', 'fais', 'fini', 'commence', 'par', 'termine', 'je', 'suis', 'reps', 'repetitions', 'series', 'serie', 'kilos', 'kg', 'kilo', 'fois', 'x', 'max', 'enchaine', 'enchainer', "c'etait", 'seance', 'aujourd\'hui', 'hier', 'ce', 'matin', 'soir', '_']);

function exoLabel(id: string): string {
  return EXO_BY_ID.get(id)?.label ?? id;
}

function canonicalExercise(words: string): string | undefined {
  const m = new RegExp(EXO_RE.source).exec(words);
  if (!m) return undefined;
  const id = EXO_TABLE.map.get(m[1]);
  return id ? exoLabel(id) : undefined;
}

function cleanExerciseName(r: Reader, a: number, b: number): string {
  const raw = r.free().slice(a, b).replace(/[.,;:!?]/g, ' ').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const canon = canonicalExercise(raw);
  if (canon) return canon;
  let words = raw.split(' ').filter(Boolean);
  const sportWords = SPORT_ALIASES.map(([x]) => x).sort((x, y) => y.length - x.length);
  for (const w of sportWords) if ((words.join(' ') + ' ').startsWith(w + ' ')) {
    words = words.slice(w.split(' ').length);
    break;
  }
  while (words.length && NAME_STOP.has(words[0])) words.shift();
  while (words.length && NAME_STOP.has(words[words.length - 1])) words.pop();
  if (!words.length || words.length > 5 || words.some((w) => /^\d/.test(w))) return '';
  const first = r.norm.indexOf(words[0], a);
  const lastW = words[words.length - 1];
  const lastAt = r.norm.lastIndexOf(lastW, b);
  const txt = first >= 0 && lastAt >= first ? r.orig(first, lastAt + lastW.length) : words.join(' ');
  const n = txt.replace(/\s+/g, ' ').trim();
  if (n.length < 3 || n.length > 40) return '';
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/** un exercice cite dans un morceau de phrase : par son nom, par un mot vague ou par une description */
type Mention = { key: string; id?: string; vague?: number; desc?: number; a: number; b: number };

function mentionsIn(s: string, a: number, b: number, allowVague: boolean): Mention[] {
  const seg = s.slice(a, b);
  const out: Mention[] = [];
  const g = new RegExp(EXO_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = g.exec(seg))) {
    const id = EXO_TABLE.map.get(m[1]);
    const st = a + m.index + m[0].length - m[1].length;
    if (id) out.push({ key: id, id, a: st, b: st + m[1].length });
  }
  if (out.length || !allowVague) return out;
  const v = new RegExp(VAGUE_RE.source, 'g');
  while ((m = v.exec(seg))) {
    const st = a + m.index + (m[0].startsWith(' ') ? 1 : 0);
    // « a la poulie », « avec des halteres » : une charge, pas un exercice
    if (/(?:^| )(?:a la|aux|au|sur la|avec la|avec les|avec des|avec)$/.test(s.slice(Math.max(0, st - 14), st - 1))) continue;
    const vi = EXO_VAGUES.findIndex((x) => new RegExp(`^(?:${x.re})$`).test(m![1]));
    if (vi >= 0) out.push({ key: `v${vi}`, vague: vi, a: st, b: st + m[1].length });
  }
  return out;
}

function descIn(seg: string, block: string): number {
  return EXO_DESCRIPTIONS.findIndex((d) => d.re.test(seg) && (!d.avec || d.avec.test(block)));
}

const W = '(\\d{1,3}(?:[.,]\\d{1,2})?)';
const KG_AFTER = new RegExp(`^(?: (?:a|avec|de|@|en))? ${W} ?(?:kg|kilos?|kilogrammes?)(?= |$)|^ (?:a|avec) ${W}(?= |$)`);
const KG_ANY = new RegExp(`(?:^| )(?:(?:a|avec|@|leste a|leste de|lestee a|lestees a|lestes a) )?${W} ?(?:kg|kilos?)(?= |$)`);
const NOT_UNIT = '(?! ?(?:min|mn|minutes?|m|metres?|km|s|sec|kg|kilos?|h|heures?)(?= |$))';

/** ce qu'un bloc de phrase dit d'un exercice : series, repetitions, charge */
type Numbers = { sets: number; reps: number; max: boolean; weight: number; duration?: number; load?: Charge; marks: [number, number][] };

function readNumbers(r: Reader, ranges: [number, number][], mentions: Mention[]): Numbers {
  const s = r.free();
  const out: Numbers = { sets: 0, reps: 0, max: false, weight: 0, marks: [] };
  let coreEnd = -1;
  for (const [a, b] of ranges) {
    const seg = s.slice(a, b);
    const at = (m: RegExpExecArray) => a + m.index + (m[0].startsWith(' ') ? 1 : 0);
    if (!out.sets) {
      const timed = new RegExp(`(?:^| )(\\d{1,2}) (?:x|fois|series? de|series? d') ?(\\d{1,3}) ?(${MIN}|s|sec|secondes?)(?= |$)`).exec(seg);
      if (timed && +timed[1] >= 1 && +timed[1] <= 20) {
        out.sets = +timed[1];
        const v = +timed[2];
        out.duration = /^(?:s|sec|secondes?)$/.test(timed[3]) ? Math.round((v / 60) * 100) / 100 : v;
        out.marks.push([at(timed), a + timed.index + timed[0].length]);
        coreEnd = a + timed.index + timed[0].length;
      }
    }
    if (!out.sets) {
      const core = new RegExp(`(?:^| )(\\d{1,2}) (?:series? (?:de |d'|a )?|x |fois |sets? de )(\\d{1,3}|max|maximum|echec)(?: (?:reps?|repetitions?))?(?= |$)${NOT_UNIT}`).exec(seg)
        ?? /(?:^| )(\d{1,2}) series?(?: (?:au |a |jusqu'a l'))? ?(max|maximum|echec)(?= |$)/.exec(seg);
      if (core && +core[1] >= 1 && +core[1] <= 20) {
        out.sets = +core[1];
        out.max = /^(?:max|maximum|echec)$/.test(core[2]);
        out.reps = out.max ? 0 : +core[2];
        out.marks.push([at(core), a + core.index + core[0].length]);
        coreEnd = a + core.index + core[0].length;
      } else {
        const so = /(?:^| )(\d{1,2}) (?:series?|sets?|tours?)(?= |$)/.exec(seg);
        if (so && +so[1] >= 1 && +so[1] <= 20) {
          out.sets = +so[1];
          out.marks.push([at(so), a + so.index + so[0].length]);
          coreEnd = a + so.index + so[0].length;
          const de = /^ (?:de |d')(\d{1,3})(?: (?:reps?|repetitions?))?(?= |$)/.exec(seg.slice(so.index + so[0].length));
          if (de && !NOT_UNIT_TEST(seg.slice(so.index + so[0].length + de[0].length))) {
            out.reps = +de[1];
            coreEnd += de[0].length;
            out.marks.push([at(so), coreEnd]);
          }
        }
      }
    }
    if (!out.reps && !out.max && !out.duration) {
      const rp = new RegExp(`(?:^| )(\\d{1,3}) (?:reps?|repetitions?|fois)(?= |$)(?! \\d)`).exec(seg);
      if (rp && +rp[1] >= 1 && +rp[1] <= 300) {
        out.reps = +rp[1];
        out.marks.push([at(rp), a + rp.index + rp[0].length]);
      } else {
        // « 100 pompes », « pompes 100 »
        for (const mt of mentions) {
          if (mt.a < a || mt.b > b) continue;
          const before = /(?:^| )(\d{1,3}) $/.exec(s.slice(Math.max(a, mt.a - 5), mt.a));
          const after = new RegExp(`^ (\\d{1,3})(?: (?:reps?|repetitions?|fois))?(?= |$)${NOT_UNIT}`).exec(s.slice(mt.b, b));
          if (before && !/(?:^| )\d{1,3} (?:x|fois|series?) $/.test(s.slice(Math.max(a, mt.a - 14), mt.a))) {
            out.reps = +before[1];
            out.marks.push([mt.a - before[1].length - 1, mt.a]);
            break;
          }
          if (after && +after[1] <= 300) {
            out.reps = +after[1];
            out.marks.push([mt.b, mt.b + after[0].length]);
            break;
          }
        }
      }
    }
    if (!out.weight) {
      const kg = KG_ANY.exec(seg);
      if (kg) {
        const v = num(kg[1]);
        if (Number.isFinite(v) && v > 0 && v <= 500) {
          out.weight = v;
          out.marks.push([at(kg), a + kg.index + kg[0].length]);
        }
      } else {
        // « squat 5 fois 5 a 100 », « developpe couche a 80 »
        const from = [coreEnd, ...mentions.map((x) => x.b)].filter((x) => x >= a && x <= b);
        for (const f of from) {
          const k2 = KG_AFTER.exec(s.slice(f, b));
          if (k2) {
            const v = num(k2[1] ?? k2[2]);
            if (Number.isFinite(v) && v > 0 && v <= 500) {
              out.weight = v;
              out.marks.push([f, f + k2[0].length]);
              break;
            }
          }
        }
      }
    }
    if (!out.load) {
      for (const [c, re] of CHARGE_RE) {
        const lm = re.exec(seg);
        if (lm) {
          out.load = c;
          out.marks.push([at(lm), a + lm.index + lm[0].length]);
          break;
        }
      }
    }
  }
  return out;
}

function NOT_UNIT_TEST(rest: string): boolean {
  return /^ ?(?:min|mn|minutes?|m|metres?|km|s|sec|kg|kilos?)(?= |$)/.test(rest);
}

/** la charge dite est-elle deja dans le nom (« Triceps a la poulie ») ? */
function loadInName(load: Charge, label: string): boolean {
  const l = fold(label);
  return (load === 'poulie' && /poulie/.test(l)) || (load === 'halteres' && /haltere/.test(l)) || (load === 'machine' && /machine|pec deck|presse|leg /.test(l)) || (load === 'barre' && /barre/.test(l));
}

function finishExercise(e: DicteeExercise, id: string | undefined): DicteeExercise {
  const pdc = (id && EXO_BY_ID.get(id)?.pdc) || e.load === 'pdc' || e.load === 'elastique';
  if (!e.sets && (e.reps || e.max)) e.sets = 1;
  const missing: ('sets' | 'reps' | 'weight')[] = [];
  if (!e.sets) missing.push('sets');
  if (!e.reps && !e.max && !e.duration) missing.push('reps');
  if (!e.weight && !pdc) missing.push('weight');
  if (e.load && loadInName(e.load, e.name)) delete e.load;
  if (missing.length) e.missing = missing;
  return e;
}

function findExercises(r: Reader, sport: string | undefined, offset: number): { list: DicteeExercise[]; guesses: DicteeGuess[] } {
  const out: DicteeExercise[] = [];
  const guesses: DicteeGuess[] = [];
  const muscu = !sport || MUSCU.has(sport);
  const s = r.free();
  // morceaux : virgules, points, « puis », « ensuite », « et » devant un chiffre ou un exercice
  const cuts: [number, number][] = [];
  const sep = new RegExp(`[,.;!?]|(?:^| )(?:puis|ensuite|apres ca|et apres|et ensuite|enfin|pour finir)(?= )|(?: et)(?= \\d| (?:${EX_ALT}) )`, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = sep.exec(s))) {
    if (m.index > last) cuts.push([last, m.index]);
    last = m.index + m[0].length;
  }
  if (last < s.length) cuts.push([last, s.length]);

  // blocs : un exercice cite et les morceaux qui le suivent sans en citer d'autre
  type Block = { key: string; mentions: Mention[]; ranges: [number, number][]; desc: number; descAt?: [number, number] };
  const blocks: Block[] = [];
  const orphans: [number, number][] = [];
  const hasNumbers = (x: Block) => x.ranges.some(([a, b]) => /\d/.test(s.slice(a, b)));
  for (const [a, b] of cuts) {
    let ms = mentionsIn(s, a, b, muscu);
    const cur = blocks[blocks.length - 1];
    const seg = s.slice(a, b);
    // plusieurs exercices dans un meme morceau : on coupe devant chacun
    if (ms.length > 1) {
      const distinct: Mention[] = [];
      for (const x of ms) if (!distinct.some((d) => d.key === x.key)) distinct.push(x);
      if (distinct.length > 1) {
        distinct.forEach((x, i) => {
          const end = i + 1 < distinct.length ? distinct[i + 1].a - 1 : b;
          const start = i === 0 ? a : x.a;
          blocks.push({ key: x.key, mentions: ms.filter((y) => y.a >= start && y.b <= end), ranges: [[start, end]], desc: -1 });
        });
        continue;
      }
      ms = distinct;
    }
    if (ms.length === 1) {
      const x = ms[0];
      if (cur && cur.key === x.key && cur.ranges[cur.ranges.length - 1][1] <= a) {
        cur.mentions.push(x);
        cur.ranges.push([a, b]);
      } else blocks.push({ key: x.key, mentions: [x], ranges: [[a, b]], desc: -1 });
      continue;
    }
    // une description de mouvement, sans nom
    const di = muscu ? descIn(seg, cur ? cur.ranges.map(([x, y]) => s.slice(x, y)).join(' ') + ' ' + seg : seg) : -1;
    if (di >= 0) {
      const sameAsCur = cur && (cur.mentions.some((x) => x.vague !== undefined) || cur.key === EXO_DESCRIPTIONS[di].id || !hasNumbers(cur));
      if (cur && sameAsCur) {
        cur.ranges.push([a, b]);
        if (cur.desc < 0) {
          cur.desc = di;
          cur.descAt = [a, b];
        }
      } else blocks.push({ key: `d${di}`, mentions: [], ranges: [[a, b]], desc: di, descAt: [a, b] });
      continue;
    }
    if (cur) {
      // un morceau avec ses propres series apres un exercice deja chiffre : un autre exercice sans nom connu
      if (hasNumbers(cur) && /(?:^| )\d{1,2} (?:series? (?:de |d'|a )?|x |fois |sets? de )(?:\d{1,3}|max)/.test(seg)) {
        orphans.push([a, b]);
        continue;
      }
      cur.ranges.push([a, b]);
    } else orphans.push([a, b]);
  }

  type Item = { at: number; ex: DicteeExercise; marks: [number, number][]; guess?: Omit<DicteeGuess, 'index'> };
  const items: Item[] = [];
  for (const bl of blocks) {
    const text = bl.ranges.map(([a, b]) => s.slice(a, b)).join(' ');
    const nb = readNumbers(r, bl.ranges, bl.mentions);
    const said = nb.sets || nb.reps || nb.max || nb.weight || nb.duration;
    const specific = bl.mentions.find((x) => x.id);
    // hors musculation, seulement un exercice connu et chiffre (« 50 pompes » apres le JJB)
    if (!muscu && !(specific && said)) continue;
    let id: string | undefined;
    let guess: Omit<DicteeGuess, 'index'> | undefined;
    let name = '';
    const descI = bl.desc >= 0 ? bl.desc : specific ? -1 : descIn(text, text);
    const saidTxt = (a: number, b: number) => r.orig(a, b);
    if (specific) {
      id = specific.id;
      name = exoLabel(id as string);
    } else if (descI >= 0) {
      const d = EXO_DESCRIPTIONS[descI];
      id = d.id;
      name = exoLabel(id);
      const from = bl.mentions[0]?.a ?? bl.descAt?.[0] ?? bl.ranges[0][0];
      let to = bl.descAt?.[1] ?? bl.ranges[bl.ranges.length - 1][1];
      if (!bl.descAt) {
        for (let k = 0; k < bl.ranges.length; k += 1) {
          if (d.re.test(bl.ranges.slice(0, k + 1).map(([x, y]) => s.slice(x, y)).join(' '))) {
            to = bl.ranges[k][1];
            break;
          }
        }
      }
      guess = { said: saidTxt(from, to), question: traduire("Tu as fait {0}, c’est ça ?", EXO_BY_ID.get(id)?.dit ?? name.toLowerCase()), guess: name, options: d.choix.map(exoLabel) };
    } else if (bl.mentions[0]?.vague !== undefined) {
      if (!said) continue;
      const v = EXO_VAGUES[bl.mentions[0].vague];
      const mt = bl.mentions[0];
      if (v.defaut) {
        id = v.defaut;
        name = exoLabel(id);
        guess = { said: saidTxt(mt.a, mt.b), question: traduire("Tu as fait {0}, c’est ça ?", EXO_BY_ID.get(id)?.dit ?? name.toLowerCase()), guess: name, options: v.choix.map(exoLabel) };
      } else {
        name = v.dit;
        guess = { said: saidTxt(mt.a, mt.b), question: traduire("{0} : c’était quel exercice ?", v.dit), options: v.choix.map(exoLabel) };
      }
    } else continue;
    // sans chiffre, un exercice seulement s'il est bien nomme (« developpe couche, tractions ») en musculation
    if (!said && !(muscu && (specific || descI >= 0))) continue;
    const ex = finishExercise({ name, sets: nb.sets, reps: nb.reps, weight: nb.weight, ...(nb.max ? { max: true } : {}), ...(nb.duration ? { duration: nb.duration } : {}), ...(nb.load ? { load: nb.load } : {}) }, id);
    const marks: [number, number][] = [...nb.marks, ...bl.mentions.map((x) => [x.a, x.b] as [number, number])];
    if (bl.descAt) marks.push(bl.descAt);
    items.push({ at: bl.ranges[0][0], ex, marks, guess });
  }

  // morceaux sans exercice connu : « 4 series de 10 au rowing T », nom libre (musculation seulement)
  for (const [a, b] of orphans) {
    if (!muscu) continue;
    const seg = s.slice(a, b);
    if (!/\d/.test(seg)) continue;
    const core = /(?:^| )(\d{1,2}) (?:series? (?:de |d'|a )?|x |fois |sets? de )(\d{1,3}|max|maximum|echec)(?: (?:reps?|repetitions?))?(?= |$)/.exec(seg)
      ?? /(?:^| )(\d{1,2}) series?(?: (?:au |a |jusqu'a l'))? ?(max|maximum|echec)(?= |$)/.exec(seg);
    if (!core) continue;
    const sets = +core[1];
    const isMax = /^(?:max|maximum|echec)$/.test(core[2]);
    const reps = isMax ? 0 : +core[2];
    if (!(sets >= 1 && sets <= 20) || reps > 300) continue;
    const coreA = core.index + (core[0].startsWith(' ') ? 1 : 0);
    const coreB = core.index + core[0].length;
    if (/^ ?(?:min|mn|minutes?|m|metres?|km|s|sec)(?= |$)/.test(seg.slice(coreB))) continue;
    let nameA = -1;
    let nameB = -1;
    if (seg.slice(0, coreA).replace(/_+/g, ' ').trim() && cleanExerciseName(r, a, a + coreA)) {
      nameA = a;
      nameB = a + coreA;
    } else {
      const na = /^(?: (?:au|a la|aux|de|d'|du|en|sur|a))? ((?:(?!a \d|avec \d|a la \d)[a-z][a-z']*(?: |$)){1,5})/.exec(seg.slice(coreB));
      if (na) {
        nameA = a + coreB + na[0].indexOf(na[1]);
        nameB = nameA + na[1].trimEnd().length;
        const cut = /(?: a| avec| de| en)$/.exec(s.slice(nameA, nameB));
        if (cut) nameB -= cut[0].length;
      }
    }
    const name = nameA >= 0 ? cleanExerciseName(r, nameA, nameB) : '';
    if (!name) continue;
    const nb = readNumbers(r, [[a + coreB, b]], []);
    const ex = finishExercise({ name, sets, reps, weight: nb.weight, ...(isMax ? { max: true } : {}), ...(nb.load ? { load: nb.load } : {}) }, undefined);
    items.push({ at: a, ex, marks: [[a + coreA, a + coreB], [nameA, nameB], ...nb.marks] });
  }

  items.sort((x, y) => x.at - y.at);
  for (const it of items.slice(0, 20)) {
    const idx = offset + out.length;
    out.push(it.ex);
    for (const [x, y] of it.marks) r.mark(`exercice:${idx}`, x, y);
    if (it.guess) guesses.push({ index: idx, ...it.guess });
  }
  return { list: out, guesses };
}

/* ------------------------------------------------------------------ */
/* Distance, duree, allure, cardio                                      */
/* ------------------------------------------------------------------ */

function findSpeed(r: Reader): number | undefined {
  const m = r.exec(/(?:^| )(?:a |en )?(\d{1,2}(?:[.,]\d)?) (?:km h|km heure|kilometres? heure|kilometres? par heure|km par heure|de moyenne)(?: de moyenne)?(?= |$)/);
  if (!m) return undefined;
  const v = num(m[1]);
  if (!(v > 0 && v < 80)) return undefined;
  r.markM('vitesse', m);
  return v;
}

function findDistance(r: Reader, sport: string | undefined): { distance?: number; note?: string } {
  const km = r.exec(/(?:^| )(\d{1,3}(?:[.,]\d{1,3})?) ?(?:km|kilometres?|kilometre|bornes|kilos?)(?= |$)/);
  // « kilos » : seulement pour la course (« 10 kilos » en muscu, c'est une charge)
  if (km && !(/kilos?$/.test(km[0]) && !(sport && (PACE_KM.has(sport) || SPEED.has(sport))))) {
    const v = num(km[1]);
    if (v > 0 && v <= 400) {
      r.markM('distance', km);
      return { distance: v };
    }
  }
  const m = r.exec(/(?:^| )(\d{2,5}) ?(?:m|metres?)(?! (?:de denivele|d\+|de d\+))(?= |$)/);
  if (m && +m[1] >= 100) {
    r.markM('distance', m);
    return { distance: +m[1] / 1000 };
  }
  const semi = r.exec(/(?:^| )(?:un |le |mon )(semi marathon|semi|marathon)(?= |$)/);
  if (semi && (!sport || PACE_KM.has(sport))) {
    r.markM('distance', semi, false);
    return { distance: semi[1] === 'marathon' ? 42.195 : 21.1 };
  }
  const lg = r.exec(/(?:^| )(\d{1,3}) longueurs?(?: (?:de|en|dans un bassin de|bassin de) (\d{2}) ?(?:m|metres?)?)?/);
  if (lg) {
    const b = /(?:bassin|piscine) de (\d{2})/.exec(r.norm);
    const pool = lg[2] ? +lg[2] : b ? +b[1] : 0;
    r.markM('distance', lg);
    if (pool === 25 || pool === 50 || pool === 33) return { distance: (+lg[1] * pool) / 1000 };
    return { note: `${lg[1]} longueurs` };
  }
  return {};
}

function findDuration(r: Reader): { duration?: number; durationSec?: number } {
  const P = '(?:pendant |en |durant |sur )?';
  const words: [RegExp, (m: RegExpExecArray) => number][] = [
    [new RegExp(`(?:^| )${P}(\\d) ${HOUR} et (?:demie?|demi)(?= |$)`), (m) => +m[1] * 60 + 30],
    [new RegExp(`(?:^| )${P}(\\d) ${HOUR} et quart(?= |$)`), (m) => +m[1] * 60 + 15],
    [new RegExp(`(?:^| )${P}(\\d) ${HOUR} moins (?:le )?quart(?= |$)`), (m) => +m[1] * 60 - 15],
    [new RegExp(`(?:^| )${P}(\\d) ${HOUR} (\\d) quarts?(?= |$)`), (m) => +m[1] * 60 + +m[2] * 15],
    [new RegExp(`(?:^| )${P}(?:1 )?demi ?heure(?= |$)`), () => 30],
    [new RegExp(`(?:^| )${P}(\\d) quarts? d'heure(?= |$)`), (m) => +m[1] * 15],
    [new RegExp(`(?:^| )${P}quart d'heure(?= |$)`), () => 15],
  ];
  for (const [re, f] of words) {
    const m = r.exec(re);
    if (m) {
      r.markM('duree', m);
      return { duration: f(m) };
    }
  }
  // « en 28 minutes 30 », « en 1 h 05 », « en 28 min 30 s »
  const run = r.exec(new RegExp(`(?:^| )en (?:(\\d) ${HOUR} ?(\\d{1,2})?|(\\d{1,3}) ${MIN}(?: (?:et )?(\\d{1,2})(?: ?(?:s|sec|secondes?))?)?)(?= |$)`));
  if (run) {
    const sec = run[1] ? (+run[1] * 60 + +(run[2] ?? 0)) * 60 : +run[3] * 60 + +(run[4] ?? 0);
    if (sec >= 60 && sec <= 600 * 60) {
      r.markM('duree', run);
      return { duration: Math.round(sec / 60), durationSec: sec };
    }
  }
  const hm = r.exec(new RegExp(`(?:^| )(?:pendant |durant |sur |en )?(\\d) ${HOUR}(?: ?(\\d{1,2}))?(?= |$)`));
  if (hm && +hm[1] <= 5 && +(hm[2] ?? 0) < 60) {
    r.markM('duree', hm);
    return { duration: +hm[1] * 60 + +(hm[2] ?? 0) };
  }
  // « 45 min », « 90 minutes » ; « au total » ou « en tout » d'abord
  const all = r.all(new RegExp(`(?:^| )(?:pendant |durant |sur )?(\\d{1,3}) ${MIN}(?: (?:au total|en tout))?`));
  const total = all.find((m) => /(?:au total|en tout)$/.test(m[0]));
  const pick = total ?? all.find((m) => +m[1] >= 5 && +m[1] <= 600);
  if (pick) {
    r.markM('duree', pick);
    return { duration: +pick[1] };
  }
  return {};
}

/** « un quart d'heure d'echauffement », « 20 minutes de technique » : morceaux d'une seance */
const PORTIONS = "echauffement|technique|drill|drilling|cardio|gainage|stretching|etirements|retour au calme|sac|shadow|corde|mobilite|abdos|sparring|randori|randoris|rolls|tapis|velo|course|footing|natation|yoga|meditation|renfo|renforcement|musculation|muscu|jeu|match|travail technique|situation|situations|opposition";
const DUR = `(?:\\d ${HOUR} et (?:demie?|quart)|\\d ${HOUR}(?: \\d{1,2})?|(?:1 )?demi ?heure|\\d quarts? d'heure|quart d'heure|\\d{1,3} ${MIN})`;

function minutesOf(t: string): number | undefined {
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^(\\d) ${HOUR} et (demie?|quart)$`).exec(t))) return +m[1] * 60 + (m[2] === 'quart' ? 15 : 30);
  if ((m = new RegExp(`^(\\d) ${HOUR}(?: (\\d{1,2}))?$`).exec(t))) return +m[1] * 60 + +(m[2] ?? 0);
  if (/demi ?heure$/.test(t)) return 30;
  if ((m = /^(\d) quarts? d'heure$/.exec(t))) return +m[1] * 15;
  if (/^quart d'heure$/.test(t)) return 15;
  if ((m = new RegExp(`^(\\d{1,3}) ${MIN}$`).exec(t))) return +m[1];
  return undefined;
}

function findPortions(r: Reader, sport: string | undefined, otherPieces: number): { label: string; min: number }[] {
  const found = r.all(new RegExp(`(?:^| )(${DUR}) (?:d'|de |du |de la )(${PORTIONS})(?= |$)`));
  const list = found
    .map((m) => ({ m, min: minutesOf(m[1]), word: m[2] }))
    .filter((x) => x.min !== undefined && !(sport && SPORT_ALIASES.some(([a, id]) => a === x.word && id === sport)));
  if (!list.length || list.length + otherPieces < 2) return [];
  return list.map((x) => {
    const st = x.m.index + x.m[0].lastIndexOf(x.word);
    const label = r.orig(st, st + x.word.length).replace(/^d['’]/i, '');
    r.markM('duree', x.m);
    return { label: label.charAt(0).toUpperCase() + label.slice(1), min: x.min as number };
  });
}

function findPace(r: Reader): number | undefined {
  const m = r.exec(/(?:^| )(?:a |en |allure (?:de |moyenne (?:de )?)?|une allure de )?(\d{1,2})(?: (?:min|minutes?))?(?: (\d{2}))? (?:au|du|par) (?:km|kilometre|kilo)(?= |$)/)
    ?? r.exec(/(?:^| )allure (?:de |moyenne (?:de )?)?(\d{1,2})(?: (?:min|minutes?))?(?: (\d{2}))?(?= |$)/);
  if (!m) return undefined;
  const sec = +m[1] * 60 + +(m[2] ?? 0);
  if (sec < 120 || sec > 20 * 60) return undefined;
  r.markM('allure', m);
  return sec;
}

function findCardio(r: Reader): { heartRate?: number; maxHeartRate?: number; calories?: number } {
  const out: { heartRate?: number; maxHeartRate?: number; calories?: number } = {};
  const max = r.exec(/(?:^| )(?:fc|frequence cardiaque|cardio|pouls) (?:max|maximum|maxi)(?: a| de)? (\d{2,3})(?: ?bpm| pulsations)?/);
  if (max && +max[1] >= 80 && +max[1] <= 230) {
    out.maxHeartRate = +max[1];
    r.markM('fc', max);
  }
  const hr = r.exec(/(?:^| )(?:(?:fc|frequence cardiaque|cardio|pouls)(?: moyenne?| moyen)?(?: a| de| autour de)? (\d{2,3})(?: ?bpm| pulsations)?|(\d{2,3}) ?(?:bpm|pulsations?)(?: de moyenne| en moyenne)?)(?= |$)/);
  if (hr) {
    const v = +(hr[1] ?? hr[2]);
    if (v >= 50 && v <= 220) {
      out.heartRate = v;
      r.markM('fc', hr);
    }
  }
  const cal = r.exec(/(?:^| )(\d{2,4}) ?(?:calories|kcal|cal|kilocalories)(?= |$)/);
  if (cal && +cal[1] >= 20 && +cal[1] <= 6000) {
    out.calories = +cal[1];
    r.markM('calories', cal);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ressenti et intensite                                                */
/* ------------------------------------------------------------------ */

function findFeeling(r: Reader): { intensity?: number; rating?: number; mood?: SessionMood } {
  const s = r.norm;
  const out: { intensity?: number; rating?: number; mood?: SessionMood } = {};
  const negated = (at: number) => /(?:^| )(?:pas|plus|jamais)(?: tres| trop| si| vraiment| du tout)? $/.test(s.slice(Math.max(0, at - 18), at));
  const hit = (re: RegExp, skip?: (m: RegExpExecArray) => boolean): RegExpExecArray | null => {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(s))) {
      const a = m.index + (m[0].startsWith(' ') ? 1 : 0);
      if (!negated(a) && !(skip && skip(m))) return m;
      g.lastIndex = m.index + 1;
    }
    return null;
  };
  const STRONG = /(?:^| )(?:(?:super|trop|vraiment|tres|hyper|grave|tellement|carrement) (?:sympa|bien|cool|top|bon|bonne|agreable|chouette|kiffant|content|contente|satisfait|fier|fiere)|super (?:seance|sortie|entrainement|match|cours|session|journee|ambiance)|genial|geniale|excellent|excellente|incroyable|parfait|parfaite|enorme|de ouf|en feu|au top|magnifique|j'ai adore|adore)(?= |$)/;
  const GOOD = /(?:^| )(?:sympa|cool|top|chouette|agreable|bien passe|bonne seance|bon entrainement|bonne sortie|bon match|kiffe|kiff|plaisir|content|contente|satisfait|satisfaite|fier|fiere|productif|productive|efficace|en forme|bonnes sensations|bonne sensation|bonnes jambes)(?= |$)/;
  const BAD = /(?:^| )(?:nul|nulle|pas terrible|bof|mauvais|mauvaise|ratee|galere|pas en forme|pas top|decu|decue|frustrant|frustrante|sans plus|mal au|mal aux|douleur|blesse|blessee|pas la forme|pas de jus|jambes lourdes)(?= |$)/;
  const EXHAUSTED = /(?:^| )(?:creve|crevee|epuise|epuisee|rince|rincee|mort|morte|detruit|detruite|lessive|lessivee|vide|cuit|cuite|a plat|dead|explose|eclate|eclatee|plus de jambes|crame|cramee|defonce|ko)(?= |$)/;
  // « je l'ai eclate », « il m'a detruit », « mis ko » : c'est un resultat, pas de la fatigue
  const notTired = (m: RegExpExecArray) => /(?:l'ai|les ai|t'ai|on l'a|m'a|il a|mis|met|mets|par|l'a) $/.test(s.slice(Math.max(0, m.index - 9), m.index + 1));
  const strong = hit(STRONG);
  const good = strong ? null : hit(GOOD);
  const bad = hit(BAD);
  const tired = hit(EXHAUSTED, notTired);
  if (strong) {
    out.rating = 5;
    out.mood = 'fire';
    r.markM('ressenti', strong, false);
  } else if (good) {
    out.rating = 4;
    out.mood = 'solid';
    r.markM('ressenti', good, false);
  }
  if (bad && !strong && !good) {
    out.rating = 2;
    out.mood = 'hard';
    r.markM('ressenti', bad, false);
  }
  if (tired) {
    r.markM('ressenti', tired, false);
    if (!out.mood) out.mood = 'crushed';
  }
  // intensite (echelle 1 a 10 de l'app)
  const levels: [number, RegExp][] = [
    [9, /(?:^| )(?:tres dur|tres dure|tres intense|super intense|super dur|super dure|hyper dur|hyper intense|a fond|a bloc|au max|epuisant|epuisante|brutal|brutale|mortel|mortelle|la guerre|infernal|infernale|violent|violente)(?= |$)/],
    [7, /(?:^| )(?:intense|dur|dure|difficile|costaud|costaude|soutenu|soutenue|hard|exigeant|exigeante|physique|engage|engagee|ca piquait|ca pique)(?= |$)/],
    [5, /(?:^| )(?:modere|moderee|moyen|moyenne|normal|normale|correct|correcte)(?= |$)/],
    [3, /(?:^| )(?:leger|legere|facile|tranquille|tranquillou|detendu|detendue|doux|douce|recup|recuperation|easy|calme|pepere|peinard)(?= |$)/],
  ];
  for (const [v, re] of levels) {
    // « allure moyenne », « fc moyenne » : pas une intensite
    const m = hit(re, (x) => /(?:allure|fc|frequence cardiaque|vitesse|cardio|de) $/.test(s.slice(Math.max(0, x.index - 20), x.index + 1)));
    if (m) {
      out.intensity = v;
      r.markM('intensite', m, false);
      break;
    }
  }
  if (!out.intensity && tired) out.intensity = 9;
  if (!out.mood && out.intensity === 9) out.mood = 'hard';
  return out;
}

function findSessionType(r: Reader): { id?: string; label?: string } {
  for (const t of SESSION_WORDS) {
    const m = t.re.exec(r.norm);
    if (m) {
      r.markM('type', m, false);
      return { id: t.id, label: t.label };
    }
  }
  return {};
}

function findTheme(r: Reader): string | undefined {
  const m = /(?:^| )(?:on a (?:travaille|bosse|vu|revu)|j'ai (?:travaille|bosse|revu)|theme|thematique|axe sur|on s'est concentre sur|travail (?:de|des|du|sur))(?: :)? ((?:les? |la |l'|des |du |de la |sur )?[a-z' ]{3,40}?)(?= ?[,.;!?]| et (?:apres|ensuite|puis)| puis| ensuite|$)/.exec(r.norm);
  if (!m) return undefined;
  const a = m.index + m[0].indexOf(m[1]);
  const txt = r.orig(a, a + m[1].length).replace(/^(?:les?|la|l'|des|du|de la|sur)\s+/i, '').trim();
  if (txt.length < 3) return undefined;
  r.markM('theme', m, false);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/* ------------------------------------------------------------------ */
/* Sports collectifs                                                    */
/* ------------------------------------------------------------------ */

const POSITIONS: [string, string][] = [
  ['avant centre|pointe|numero 9', 'Avant-centre'], ['ailier droit', 'Ailier droit'], ['ailier gauche', 'Ailier gauche'], ['ailiers?|ailiere', 'Ailier'],
  ['attaquante?', 'Attaquant'], ['meneur de jeu|numero 10', 'Meneur de jeu'], ['milieu defensif|sentinelle|numero 6', 'Milieu défensif'], ['milieu offensif', 'Milieu offensif'],
  ['milieu de terrain|milieu', 'Milieu'], ['defenseur central|defense centrale|stoppeur', 'Défenseur central'], ['lateral droit|arriere droit', 'Latéral droit'],
  ['lateral gauche|arriere gauche', 'Latéral gauche'], ['laterale?|piston', 'Latéral'], ['defenseure?|defense', 'Défenseur'], ['gardien de but|gardienne|gardien|goal|keeper', 'Gardien'],
  ['meneuse|meneur', 'Meneur'], ['pivot', 'Pivot'], ['demi de melee', 'Demi de mêlée'], ['ouvreur|demi d\'ouverture', 'Ouvreur'], ['arriere', 'Arrière'],
  ['pilier', 'Pilier'], ['talonneur', 'Talonneur'], ['3e ligne', 'Troisième ligne'], ['2e ligne', 'Deuxième ligne'], ['centre', 'Centre'],
  ['libero', 'Libéro'], ['passeuse|passeur', 'Passeur'], ['demi centre', 'Demi-centre'],
];

function findTeam(r: Reader, sport: string | undefined): DicteeTeam | undefined {
  if (sport && !TEAM_SPORTS.has(sport)) return undefined;
  const t: DicteeTeam = {};
  const dbl = r.exec(/(?:^| )(?:j'ai (?:mis|marque|fait|claque|plante) )?(?:un |mon )?(double|doublet|triple|coup du chapeau|hat trick|quadruple)(?= |$)/);
  if (dbl) {
    t.goals = dbl[1] === 'double' || dbl[1] === 'doublet' ? 2 : dbl[1] === 'quadruple' ? 4 : 3;
    r.markM('buts', dbl);
  }
  if (t.goals === undefined) {
    const g = r.exec(/(?:^| )(?:j'ai |il a |on a )?(?:marque |mis |plante |inscrit |claque |mis au fond )?(\d{1,2}) (?:buts?|pions?|goals?|patates?)(?= |$)/);
    if (g) {
      t.goals = +g[1];
      r.markM('buts', g);
    } else {
      const g1 = r.exec(/(?:^| )j'ai (?:marque|mis|plante|inscrit|claque) (?:le|un|mon|1) but(?= |$)/);
      if (g1) {
        t.goals = 1;
        r.markM('buts', g1);
      }
    }
  }
  const a = r.exec(/(?:^| )(?:j'ai (?:fait |donne |delivre |mis |offert )?)?(\d{1,2}) (?:passes? (?:decisives?|de but|dec|d)|assists?|caviars?|offrandes?)(?= |$)/);
  if (a) {
    t.assists = +a[1];
    r.markM('passes', a);
  }
  if (sport === 'basketball') {
    const pts = r.exec(/(?:^| )(?:j'ai (?:mis|marque|fait|inscrit) )?(\d{1,3}) points?(?= |$)/);
    if (pts) {
      t.points = +pts[1];
      r.markM('points', pts);
    }
  }
  const tr = r.exec(/(?:^| )(?:j'ai (?:marque|mis|aplati) )?(\d{1,2}) essais?(?= |$)/);
  if (tr) {
    t.tries = +tr[1];
    r.markM('essais', tr);
  }
  const posM = /(?:^| )(?:au poste (?:d'|de )|en position (?:d'|de )|en tant qu'|en tant que |comme |j'ai joue |je jouais |j'etais |poste :? ?)(?:en |au |a l'|a la |le |la |l')?([a-z'0-9]+(?: [a-z'0-9]+){0,3})/.exec(r.norm);
  const bareAlt = POSITIONS.filter(([, l]) => /Gardien|Ailier|Attaquant|Avant-centre|Défenseur|Latéral|Milieu|Pivot|Meneur|Ouvreur|Pilier|Talonneur|Libéro|Passeur/.test(l)).map(([re]) => re).join('|');
  const bare = posM ? null : new RegExp(`(?:^|, |j'etais |poste |en |au |a l')((?:${bareAlt})(?: [a-z']+){0,3})`).exec(r.norm);
  const posHit = posM ?? bare;
  if (posHit) {
    const tail = posHit[1];
    const posM2 = posHit;
    for (const [re, label] of POSITIONS) {
      const pm = new RegExp(`^(?:${re})(?= |$)`).exec(tail);
      if (pm) {
        t.position = label;
        r.mark('poste', posM2.index + (posM2[0].startsWith(' ') || posM2[0].startsWith(', ') ? posM2[0].search(/\S/) : 0), posM2.index + posM2[0].indexOf(tail) + pm[0].length);
        break;
      }
    }
  }
  const sc = r.exec(/(?:^| )(?:on a |nous avons |j'ai |ils ont )?(gagne|perdu|victoire|defaite|fait match nul|match nul|nul|egalite|score)(?: (?:sur le score de|par|de|le match|:))?(?: le match)? (\d{1,2}) (?:a|buts? a|contre) (\d{1,2})(?= |$)/);
  if (sc) {
    const x = +sc[2];
    const y = +sc[3];
    const lost = /perdu|defaite/.test(sc[1]);
    t.scoreFor = lost ? Math.min(x, y) : Math.max(x, y);
    t.scoreAgainst = lost ? Math.max(x, y) : Math.min(x, y);
    t.result = /nul|egalite/.test(sc[1]) || x === y ? 'draw' : t.scoreFor > t.scoreAgainst ? 'win' : 'loss';
    r.markM('score', sc);
  } else {
    const pt = r.exec(/(?:^| )(\d{1,2}) partout(?= |$)/);
    if (pt) {
      t.scoreFor = +pt[1];
      t.scoreAgainst = +pt[1];
      t.result = 'draw';
      r.markM('score', pt);
    } else if (sport && TEAM_SPORTS.has(sport)) {
      const res = r.exec(/(?:^| )(?:on a (gagne|perdu)|(victoire|defaite|match nul))(?= |$)/);
      if (res) {
        const w = res[1] ?? res[2];
        t.result = /gagne|victoire/.test(w) ? 'win' : /perdu|defaite/.test(w) ? 'loss' : 'draw';
        r.markM('score', res);
      }
    }
  }
  if (sport === 'football' || sport === 'futsal') {
    const fm = /(?:^| )(?:(?:foot|football|match|partie|five|terrain) (?:a |de )?|(?:j'ai|on a|on s'est|je me suis) (?:fait|joue|refait|tape|organise) (?:1 )?(?:petit |bon )?(?:foot )?(?:a )?)(5|7|8|11)(?= |$)/.exec(r.norm);
    const fw = /(?:^| )(futsal|five|le five|urban soccer|soccer five|foot en salle|foot salle)(?= |$)/.exec(r.norm);
    if (fm) {
      t.format = `Foot à ${fm[1]}`;
      r.markM('format', fm, false);
    } else if (fw) {
      t.format = /futsal|salle/.test(fw[1]) ? 'Futsal' : 'Foot à 5';
      r.markM('format', fw, false);
    } else if (sport === 'futsal') t.format = 'Futsal';
  }
  if (sport && TEAM_SPORTS.has(sport)) {
    const cadres: [string, RegExp][] = [
      ['Compétition', /(?:^| )(?:championnat|match officiel|coupe|tournoi|en compet|competition|en ligue)(?= |$)/],
      ['Club', /(?:^| )(?:avec (?:mon |le |l')?(?:club|equipe)|en club|au club|entrainement du club|avec mon equipe|avec l'equipe|a l'entrainement)(?= |$)/],
      ['Entre amis', /(?:^| )(?:avec (?:mes |des |les |quelques |deux |trois )?(?:amis|potes|copains|copines|collegues|freres|cousins|gars|voisins)|avec la famille|entre (?:amis|potes|copains|collegues|nous)|pour le fun|loisir|en loisir|petit match entre)(?= |$)/],
    ];
    for (const [label, re] of cadres) {
      const cm = re.exec(r.norm);
      if (cm) {
        t.cadre = label;
        r.markM('cadre', cm, false);
        break;
      }
    }
  }
  if (Object.keys(t).length === 0 && !(sport && TEAM_SPORTS.has(sport))) return undefined;
  const mt = /(?:^| )(match|matchs|rencontre|tournoi|plateau)(?= |$)/.exec(r.norm);
  if (mt) {
    t.match = true;
    r.markM('match', mt, false);
  }
  return Object.keys(t).length ? t : undefined;
}

/* ------------------------------------------------------------------ */
/* Combat : partenaires, rounds, resultats, soumissions                 */
/* ------------------------------------------------------------------ */

/** finitions dites vers l'id de la bibliotheque (components/BJJBodyMap) ou un libelle libre */
const TECHNIQUES: [string, string, string][] = [
  ['cles? de bras|clefs? de bras|armbars?|arm bars?|armlocks?|arm locks?|juji gatame|jujigatame|juji gatami|ju ji gatame|jiu ji gatame|juji katame|jugi gatame', 'armbar', traduire('Clé de bras')],
  ['triangles? de bras|arm triangles?|kata gatame', 'armtri', traduire('Triangle de bras')],
  ['triangles? inverses?', 'triangleinv', traduire('Triangle inversé')],
  ['triangles?|sankaku(?: jime)?', 'triangle', 'Triangle'],
  ['etranglements? arrieres?|etranglements? par derriere|etranglements? dans le dos|mata leao|mata leon|matalao|hadaka jime|rnc|rear naked chokes?|rear naked|sangles? arrieres?|etranglements? sanguins?', 'rnc', traduire('Étranglement arrière')],
  ['kimuras?|kimouras?|kimoras?', 'kimura', 'Kimura'],
  ['americaines?|americanas?|ude garami|keylocks?|key locks?', 'americana', traduire('Américaine')],
  ['omoplatas?|omo platas?|omoplattes?|homoplatas?|omoplattas?', 'omoplata', 'Omoplata'],
  ['guillotines?|guiyotines?|gillotines?', 'guillotine', 'Guillotine'],
  ["d'arces?|darces?|d arce|darses?|d'arses?|brabos?", 'darce', "D'Arce"],
  ['anacondas?', 'anaconda', 'Anaconda'],
  ['ezekiels?|ezequiels?|ezechiels?', 'ezekiel', 'Ezekiel'],
  ['bow and arrows?', 'bowarrow', 'Bow and arrow'],
  ['nord sud|north south', 'northsouth', 'Nord-Sud'],
  ['gogoplatas?', 'gogoplata', 'Gogoplata'],
  ['loop chokes?', 'loop', 'Loop choke'],
  ['cles? de genou|kneebars?|knee bars?', 'kneebar', traduire('Clé de genou')],
  ['cles? de cheville|ankle locks?|foot locks?|footlocks?', 'anklelock', traduire('Clé de cheville')],
  ['toe holds?|cles? de pied', 'toehold', traduire('Clé de pied')],
  ['heel hooks?|heelhooks?|hill hooks?|cles? de talon', 'Heel hook', 'Heel hook'],
  ['cles? de poignet|wrist locks?|wristlocks?', 'wristlock', traduire('Clé de poignet')],
  ["cles? d'epaule", 'shoulder', traduire("Clé d'épaule")],
  ['calf slicers?', 'calfslicer', 'Calf slicer'],
  ['etranglements? au col|etranglements? croises?|col croise|cross collars?', 'lapelchoke', traduire('Étranglement au col')],
  ['etranglements?|chokes?', 'Étranglement', traduire('Étranglement')],
  ['ko|k o|knock out|knockout', 'KO', 'KO'],
];
/** pas des finitions : techniques utilisees (frappe, lutte) */
const MOVES: [string, string][] = [
  ['passages? de garde', 'Passage de garde'], ['renversements?|sweeps?|balayages?', 'Renversement'], ['prises? de dos', 'Prise de dos'],
  ['takedowns?|amenees? au sol|double legs?|single legs?|projections?', 'Amenée au sol'],
  ['crochets?', 'Crochet'], ['uppercuts?', 'Uppercut'], ['jabs?', 'Jab'], ['low kicks?', 'Low kick'],
  ['middle kicks?', 'Middle kick'], ['high kicks?', 'High kick'], ['coups? de genou', 'Coup de genou'], ['coups? de coude', 'Coup de coude'],
];
const TECH_ALT = TECHNIQUES.map((t) => `(?:${t[0]})`).join('|');
const SUB_RE = new RegExp(`(?:^| )(?:(\\d{1,2}) |que des |des |en |par |sur |le |la |les |mon |ma |sa |son |avec des |avec )?(${TECH_ALT})(?= |$)`, 'g');
const TAKEN_RE = /m'a (?:pris|mis|chope|choppe|eu|fini|soumis|attrape|place|rentre|fait taper|eu)|je me suis fait (?:prendre|avoir|soumettre|finir|attraper|choper|chopper)|j'ai (?:subi|tape)|m'a fait taper/;
const WIN_RE = /(?:^| )(?:gagne|gagnee|gagner|gagnes|gagnes|l'ai eu|les ai eus?|l'ai soumis|l'ai fini|l'ai eclate|l'ai explose|l'ai domine|l'ai bouge|l'ai battu|j'ai battu|l'ai mis ko|l'ai mis k o|victoire|remporte|il a tape|elle a tape|l'ai fait taper|les ai fait taper|j'ai soumis|j'ai fini [a-z]+ (?:en|par|sur|avec)|j'ai domine|l'ai defonce|l'ai demonte|l'ai detruit)(?= |$)/;
const LOSS_RE = /(?:^| )(?:perdu|perdus|perdue|m'a eu|m'a soumis|m'a battu|m'a domine|m'a fini|m'a eclate|m'a explose|m'a pris|m'a chope|m'a choppe|m'a defonce|je me suis fait (?:soumettre|eclater|defoncer|demonter|bouger|dominer|avoir|finir)|j'ai tape|defaite|j'ai subi)(?= |$)/;
const DRAW_RE = /(?:^| )(?:nul|match nul|egalite|ex aequo|personne n'a gagne|personne n'a soumis|0 a 0|0 partout)(?= |$)/;
const NAME_STOPWORDS = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'lui', 'moi', 'eux', 'elle', 'il', 'tout', 'tous', 'toutes', 'ce', 'cet', 'cette', 'ces', 'qui', 'que', "quelqu'un", 'personne', 'gants', 'sac', 'barre', 'poids', 'charge', 'kilos', 'kg', 'et', 'je', "j'ai", 'mais', 'puis', 'ensuite', 'a', 'au', 'aux', 'en', 'de', "d'", 'pour', 'par', 'sur', 'dans', 'avec', 'contre', 'autres', 'autre', 'gars', 'mec', 'partenaire', 'partenaires', 'groupe', 'club', 'equipe', 'copains', 'potes', 'amis', 'difficulte', 'facilite', 'succes', 'plaisir', 'envie', 'intensite', 'motivation', 'force', 'vitesse']);
const ROLE_WORDS = "professeur|prof|coach|maitre|instructeur|sensei|mestre|entraineur|pote|ami|amie|copain|copine|frere|soeur|cousin|cousine|collegue|partenaire|ceinture (?:blanche|bleue|violette|marron|noire)";
const NOT_NAME = /^(?:triangles?|kimuras?|guillotines?|omoplatas?|cles?|armbars?|etranglements?|sac|pattes?|shadow|rounds?|rondes?|sparring|technique|drilling|cours|entrainement|\d.*)$/;

type PartnerHit = { name: string; role?: string; b: number; markerA: number; mention?: boolean };

function readName(r: Reader, startTok: number, needCap: boolean): { name: string; last: number } | null {
  const words: number[] = [];
  for (let i = startTok; i < r.toks.length && words.length < 2; i += 1) {
    const tk = r.toks[i];
    if (!/^[a-z][a-z'-]*$/.test(tk.t) || NAME_STOPWORDS.has(tk.t) || NOT_NAME.test(tk.t)) break;
    if (needCap && !tk.cap && words.length === 0) return null;
    if (words.length > 0 && !tk.cap) break;
    words.push(i);
  }
  if (!words.length) return null;
  const a = r.toks[words[0]];
  const b = r.toks[words[words.length - 1]];
  let name = r.original.slice(a.s, b.e).trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);
  if (name.length < 2) return null;
  return { name, last: words[words.length - 1] };
}

function findPartners(r: Reader): PartnerHit[] {
  const out: PartnerHit[] = [];
  const re = new RegExp(`(?:^| )(avec|contre|face a|vs|versus|et)(?: (?:mon|ma|le|la|l'|notre))?(?: (${ROLE_WORDS}))?(?= )`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(r.norm))) {
    const markerA = m.index + (m[0].startsWith(' ') ? 1 : 0);
    const endPos = m.index + m[0].length + 1;
    const ti = r.toks.findIndex((t) => t.n0 === endPos);
    re.lastIndex = m.index + m[0].length;
    if (ti < 0) continue;
    // « et Marc » : seulement juste apres un partenaire deja lu
    if (m[1] === 'et') {
      const prev = out[out.length - 1];
      if (!prev || markerA - prev.b > 2 || m[2]) continue;
    }
    const role = m[2];
    if (role && /prof|coach|maitre|instructeur|sensei|mestre|entraineur/.test(role) && /(?:^| )(?:cours|stage|seminaire|seance|entrainement|technique) $/.test(r.norm.slice(Math.max(0, markerA - 16), markerA))) continue;
    const nm = readName(r, ti, !role);
    if (!nm) {
      // « avec le prof » sans nom : le role sert de nom
      if (role && /prof|coach|maitre|instructeur|sensei|mestre|entraineur/.test(role)) {
        const roleA = m.index + m[0].lastIndexOf(role);
        out.push({ name: role === 'prof' || role === 'professeur' ? 'Le prof' : role === 'coach' ? 'Le coach' : `Le ${role}`, role, b: roleA + role.length, markerA });
      }
      continue;
    }
    out.push({ name: nm.name, role, b: r.toks[nm.last].n1, markerA });
  }
  // « Paul m'a soumis » : un nom deja dit, repris plus loin sans « avec »
  const names = Array.from(new Set(out.map((h) => fold(h.name).toLowerCase())));
  const mentions: PartnerHit[] = [];
  r.toks.forEach((tk, i) => {
    if (!tk.cap || !names.includes(tk.t)) return;
    if (out.some((h) => h.markerA <= tk.n0 && tk.n0 < h.b + 1)) return;
    const h = out.find((x) => fold(x.name).toLowerCase() === tk.t);
    if (!h || h.markerA > tk.n0) return;
    void i;
    mentions.push({ name: h.name, role: h.role, b: tk.n1, markerA: tk.n0, mention: true });
  });
  return [...out, ...mentions].sort((x, y) => x.markerA - y.markerA);
}

type Part = { a: number; b: number; partner?: PartnerHit; with?: PartnerHit[] };

function techniquesIn(r: Reader, a: number, b: number, takenCtx: (pos: number) => boolean, masked: string): { given: DicteeTechnique[]; taken: DicteeTechnique[]; moves: { label: string; count: number }[] } {
  // les techniques apprises (zones masquees) ne sont pas des finitions de sparring
  const seg = masked.slice(a, b);
  const given: DicteeTechnique[] = [];
  const taken: DicteeTechnique[] = [];
  const moves: { label: string; count: number }[] = [];
  const add = (list: DicteeTechnique[], id: string, label: string, count?: number) => {
    const cur = list.find((x) => x.id === id);
    if (cur) {
      if (count !== undefined) cur.count = (cur.count ?? 0) + count;
    } else list.push({ id, label, ...(count !== undefined ? { count } : {}) });
  };
  const g = new RegExp(SUB_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = g.exec(seg))) {
    const word = m[2];
    const def = TECHNIQUES.find((t) => new RegExp(`^(?:${t[0]})$`).test(word));
    if (!def) continue;
    const lead = m[0].trim().split(' ')[0];
    const count = m[1] ? +m[1] : /^(?:le|la|mon|ma|sa|son|en|par|sur)$/.test(lead) && !/s$/.test(word) ? 1 : undefined;
    const pos = a + m.index + (m[0].startsWith(' ') ? 1 : 0);
    add(takenCtx(pos) ? taken : given, def[1], def[2], count);
    r.mark('techniques', pos, a + m.index + m[0].length, true);
  }
  for (const [pat, label] of MOVES) {
    const re2 = new RegExp(`(?:^| )(?:(\\d{1,2}) )?(?:${pat})(?= |$)`, 'g');
    let k: RegExpExecArray | null;
    while ((k = re2.exec(seg))) {
      const cur = moves.find((x) => x.label === label);
      const c = k[1] ? +k[1] : 1;
      if (cur) cur.count += c;
      else moves.push({ label, count: c });
      r.markM('techniques', k, false, a);
    }
  }
  return { given, taken, moves };
}

type RefHit = { kind: 'nth' | 'first' | 'last' | 'rest' | 'next' | 'all' | 'list'; n?: number; list?: number[]; at: number; end: number };

function range(x: number, y: number): number[] {
  const out: number[] = [];
  for (let i = x; i <= y; i += 1) out.push(i);
  return out;
}

function roundRefs(r: Reader, a: number, b: number): RefHit[] {
  const seg = r.free().slice(a, b);
  const out: RefHit[] = [];
  const R = `(?: ${ROUND_WORDS})?`;
  const scan = (re: RegExp, f: (m: RegExpExecArray) => Omit<RefHit, 'at' | 'end'> | null) => {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(seg))) {
      const h = f(m);
      const st = m.index + (m[0].startsWith(' ') ? 1 : 0);
      if (h) out.push({ ...h, at: a + st, end: a + m.index + m[0].length });
    }
  };
  scan(new RegExp(`(?:^| )(?:les|mes) (\\d{1,2}) (?:premiers?|premieres?|1e)${R}`), (m) => ({ kind: 'first', n: +m[1] }));
  scan(new RegExp(`(?:^| )(?:les|mes) (\\d{1,2}) (?:derniers?|dernieres?)${R}`), (m) => ({ kind: 'last', n: +m[1] }));
  scan(new RegExp(`(?:^| )(?:le|la|au|du|sur le|pour le) (?:dernier|derniere)${R}`), () => ({ kind: 'last', n: 1 }));
  scan(new RegExp(`(?:^| )(?:les|mes|aux|des)(?: (\\d{1,2}))? autres?${R}`), (m) => ({ kind: 'rest', n: m[1] ? +m[1] : undefined }));
  scan(new RegExp(`(?:^| )(?:(?:le|la|au|du|lors du|pendant le|sur le|pour le|mon|ma) )?(\\d{1,2})e${R}`), (m) => ({ kind: 'nth', n: +m[1] }));
  scan(new RegExp(`(?:^| )(?:le|la|les|au) ${ROUND_WORDS} (\\d{1,2})(?: (et|a) (\\d{1,2}))?`), (m) => (m[3] ? { kind: 'list', list: m[2] === 'a' ? range(+m[1], +m[3]) : [+m[1], +m[3]] } : { kind: 'nth', n: +m[1] }));
  scan(new RegExp(`(?:^| )(?:tous les|tout les|toutes les) ${ROUND_WORDS}`), () => ({ kind: 'all' }));
  scan(new RegExp(`(?:^| )(\\d{1,2}) ${ROUND_WORDS}`), (m) => ({ kind: 'next', n: +m[1] }));
  scan(/(?:^| )(\d{1,2}) (?=avec |contre )/, (m) => ({ kind: 'next', n: +m[1] }));
  out.sort((x, y) => x.at - y.at || y.end - x.end);
  const clean: RefHit[] = [];
  for (const h of out) if (!clean.some((c) => h.at < c.end && c.at < h.end)) clean.push(h);
  return clean;
}

function resultsIn(seg: string): { res: RoundResult; at: number; len: number }[] {
  const out: { res: RoundResult; at: number; len: number }[] = [];
  const scan = (re: RegExp, res: RoundResult) => {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(seg))) {
      const at = m.index + (m[0].startsWith(' ') ? 1 : 0);
      const before = seg.slice(Math.max(0, at - 12), at);
      g.lastIndex = m.index + 1;
      if (/(?:^| )(?:pas|jamais)(?: vraiment)? $/.test(before) || /n'ai pas $/.test(before)) continue;
      out.push({ res, at, len: m.index + m[0].length - at });
    }
  };
  scan(LOSS_RE, 'loss');
  scan(WIN_RE, 'win');
  scan(DRAW_RE, 'draw');
  out.sort((x, y) => x.at - y.at);
  const clean: { res: RoundResult; at: number; len: number }[] = [];
  // « il m'a eu » : la defaite lue la premiere au meme endroit l'emporte
  for (const o of out) if (!clean.some((c) => Math.abs(c.at - o.at) < 7)) clean.push(o);
  return clean;
}

/** indices de sparring : sans eux, des techniques citees seules sont du travail, pas des finitions */
const SPAR_CUE = /(?:^| )(?:j'ai place|place|placee|fini|finie|soumis|soumise|m'a pris|m'a eu|pris|tape|taper|attrape|chope|choppe|rentre|reussi|reussie|sparring|spar|rolls?|roule|randoris?|combat|combats|gagne|perdu|eu)(?= |$)/;

function readCombat(r: Reader, totalSaid: number | undefined, masked: string = r.norm): { partners: DicteePartner[]; rounds: DicteeRound[]; total?: number } {
  const hits = findPartners(r);
  // phrases et « ensuite », « puis » ; les virgules ne coupent pas (« je l'ai eclate, je l'ai gagne »)
  const segs: [number, number][] = [];
  const sep = /[.;!?]|(?:^| )(?:ensuite|puis|apres ca|et apres|apres|et ensuite|enfin|pour finir|pour terminer|au final)(?= )/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = sep.exec(r.norm))) {
    if (m.index > last) segs.push([last, m.index]);
    last = m.index + m[0].length;
  }
  segs.push([last, r.norm.length]);
  const parts: Part[] = [];
  for (const [a, b] of segs) {
    const inSeg = hits.filter((h) => h.markerA >= a && h.markerA < b);
    if (!inSeg.length) {
      parts.push({ a, b });
      continue;
    }
    let start = a;
    let k = 0;
    while (k < inSeg.length) {
      const h = inSeg[k];
      // « avec Paul et Marc » : un meme groupe
      const group = [h];
      while (inSeg[k + group.length] && r.norm.slice(inSeg[k + group.length].markerA, inSeg[k + group.length].markerA + 3) === 'et ' && inSeg[k + group.length].markerA - group[group.length - 1].b <= 2) group.push(inSeg[k + group.length]);
      const next = inSeg[k + group.length];
      let end = b;
      if (next) {
        const lastH = group[group.length - 1];
        const between = r.norm.slice(lastH.b, next.markerA);
        const cut = Math.max(between.lastIndexOf(','), between.lastIndexOf(' et '));
        end = cut >= 0 ? lastH.b + cut : next.markerA;
      }
      parts.push({ a: start, b: end, partner: h, with: group.slice(1) });
      start = end;
      k += group.length;
    }
  }
  // une partie sans partenaire ni round : rattachee a la precedente
  const merged: Part[] = [];
  for (const p of parts) {
    const prev = merged[merged.length - 1];
    if (!p.partner && prev && roundRefs(r, p.a, p.b).length === 0) {
      prev.b = p.b;
      continue;
    }
    merged.push({ ...p });
  }
  const hasSub = (p: Part) => new RegExp(SUB_RE.source).test(masked.slice(p.a, p.b)) && SPAR_CUE.test(r.norm.slice(p.a, p.b));
  const interesting = merged.filter((p) => p.partner || roundRefs(r, p.a, p.b).length || (merged.length === 1 && (resultsIn(r.norm.slice(p.a, p.b)).length || hasSub(p))));
  if (!interesting.length) return { partners: [], rounds: [] };

  let total = totalSaid;
  const assigned = new Set<number>();
  const takeNext = (k: number): number[] => {
    const out: number[] = [];
    for (let i = 1; out.length < k && i <= 60; i += 1) if (!assigned.has(i)) out.push(i);
    return out;
  };
  const partnerParts = interesting.filter((p) => p.partner);
  type Detail = { part: Part; rounds: number[]; result?: RoundResult; name: string; role?: string; given: DicteeTechnique[]; taken: DicteeTechnique[]; moves: { label: string; count: number }[] };
  const details: Detail[] = [];

  for (const p of interesting) {
    const seg = r.norm.slice(p.a, p.b);
    const refs = roundRefs(r, p.a, p.b);
    const results = resultsIn(seg).map((x) => ({ ...x, at: x.at + p.a }));
    const takenCtx = (pos: number) => {
      const before = r.norm.slice(p.a, pos);
      const cut = Math.max(before.lastIndexOf(','), before.lastIndexOf(' mais '), before.lastIndexOf(' par contre '));
      const clause = before.slice(cut + 1);
      if (TAKEN_RE.test(clause)) return true;
      return /(?:perdu|tape) (?:sur|par|en|a cause d'|a cause de|avec)(?: un| une| des| le| la)? ?$/.test(clause.slice(-34));
    };
    const tech = techniquesIn(r, p.a, p.b, takenCtx, masked);
    const resolve = (h: RefHit): number[] => {
      switch (h.kind) {
        case 'nth':
          return h.n ? [h.n] : [];
        case 'list':
          return h.list ?? [];
        case 'first':
          return range(1, h.n ?? 1);
        case 'last':
          return total ? range(Math.max(1, total - (h.n ?? 1) + 1), total) : takeNext(h.n ?? 1);
        case 'all':
          return total ? range(1, total) : [];
        case 'rest':
          if (total) return range(1, total).filter((i) => !assigned.has(i));
          return takeNext(h.n ?? 1);
        default:
          return takeNext(h.n ?? 1);
      }
    };
    let groups: { rounds: number[]; result?: RoundResult; at: number }[];
    if (refs.length) {
      groups = [];
      for (const h of refs) {
        const rounds = resolve(h);
        groups.push({ rounds, at: h.at });
        rounds.forEach((n) => assigned.add(n));
        r.mark('combat', h.at, h.end, false);
      }
      if (groups.length === 1) groups[0].result = results[0]?.res;
      else {
        // chaque resultat va a la reference la plus proche (avant elle de preference : « gagne les 3 premiers »)
        for (const res of results) {
          let best = -1;
          let bestD = Infinity;
          groups.forEach((g, gi) => {
            if (g.result !== undefined) return;
            const d = g.at >= res.at ? g.at - res.at : (res.at - g.at) * 1.5;
            if (d < bestD) {
              bestD = d;
              best = gi;
            }
          });
          if (best >= 0) groups[best].result = res.res;
        }
      }
    } else if (p.partner?.mention && details.some((d) => d.name === p.partner?.name)) {
      const rounds = details.filter((d) => d.name === p.partner?.name).flatMap((d) => d.rounds);
      groups = [{ rounds: [rounds[0]], result: results[0]?.res, at: p.a }];
    } else {
      const named = new Set(partnerParts.map((x) => x.partner?.name));
      const only = named.size === 1 && !(p.with && p.with.length);
      const rounds = only && total ? range(1, total) : takeNext(1);
      rounds.forEach((n) => assigned.add(n));
      groups = [{ rounds, result: results[0]?.res, at: p.a }];
    }
    for (const res of results) r.mark('combat', res.at, res.at + res.len, false);
    const people = p.partner ? [p.partner, ...(p.with ?? [])] : [undefined];
    for (const g of groups) {
      if (!g.rounds.length) continue;
      const maxN = Math.max(...g.rounds);
      if (!totalSaid && (total ?? 0) < maxN) total = maxN;
      // « avec Paul et Marc » sans detail : un round chacun, a la suite
      if (people.length > 1 && g.rounds.length === 1) {
        people.forEach((who, wi) => {
          const n = wi === 0 ? g.rounds : takeNext(1);
          n.forEach((x) => assigned.add(x));
          if (!totalSaid && (total ?? 0) < Math.max(...n)) total = Math.max(...n);
          details.push({ part: p, rounds: n, result: g.result, name: who?.name ?? '', role: who?.role, given: wi === 0 ? tech.given : [], taken: wi === 0 ? tech.taken : [], moves: wi === 0 ? tech.moves : [] });
        });
        continue;
      }
      details.push({ part: p, rounds: g.rounds, result: g.result, name: p.partner?.name ?? '', role: p.partner?.role, given: tech.given, taken: tech.taken, moves: tech.moves });
    }
    if (p.partner) for (const who of people) if (who) r.mark('partenaire', who.markerA, who.b);
  }

  const roundMap = new Map<number, DicteeRound>();
  const getRound = (n: number) => {
    let x = roundMap.get(n);
    if (!x) {
      x = { number: n };
      roundMap.set(n, x);
    }
    return x;
  };
  // une carte par partenaire ; les techniques d'une partie sont reparties sur ses rounds
  const cards: DicteePartner[] = [];
  const techDone = new Set<Part>();
  for (const d of details) {
    for (const n of d.rounds) {
      const rd = getRound(n);
      if (d.name) rd.partner = d.name;
      if (d.result) rd.result = d.result;
    }
  }
  for (const d of details) {
    const partRounds = details.filter((x) => x.part === d.part && x.name === d.name).flatMap((x) => x.rounds);
    if (!techDone.has(d.part) && (d.given.length || d.taken.length || d.moves.length)) {
      techDone.add(d.part);
      const won = partRounds.filter((n) => getRound(n).result === 'win');
      const lost = partRounds.filter((n) => getRound(n).result === 'loss');
      const spread = (techs: DicteeTechnique[], field: 'methodsGiven' | 'methodsTaken', countField: 'submissionsGiven' | 'submissionsTaken', pref: number[]) => {
        const target = pref.length ? pref : partRounds;
        for (const t of techs) {
          if (t.count !== undefined) {
            for (let k = 0; k < t.count; k += 1) {
              const rd = getRound(target[k % target.length]);
              (rd[field] ??= []).push(t.id);
              rd[countField] = (rd[countField] ?? 0) + 1;
            }
          } else {
            for (const n of target) {
              const rd = getRound(n);
              if (!(rd[field] ?? []).includes(t.id)) (rd[field] ??= []).push(t.id);
            }
          }
        }
      };
      spread(d.given, 'methodsGiven', 'submissionsGiven', won);
      spread(d.taken, 'methodsTaken', 'submissionsTaken', lost);
      for (const mv of d.moves) (getRound(partRounds[0]).usedTechniques ??= []).push({ label: mv.label, pts: 0, count: mv.count });
    }
    const key = d.name.toLowerCase();
    const whole = r.spanOf(d.part.a, d.part.b);
    // ce qui parle de ce partenaire dans sa partie de phrase : son nom, ses rounds, le resultat, les finitions
    const pieces = whole
      ? ['partenaire', 'combat', 'techniques'].flatMap((k) => r.spans[k] ?? []).filter((x) => x.start >= whole.start && x.end <= whole.end).sort((x, y) => x.start - y.start)
      : [];
    const existing = cards.find((c) => (key ? c.name.toLowerCase() === key : !c.name && c.result === d.result));
    if (existing) {
      existing.rounds = Array.from(new Set([...existing.rounds, ...d.rounds])).sort((x, y) => x - y);
      const several = details.filter((x) => x.part === d.part).length > 1;
      if (!(several && d.result === 'loss')) for (const g of d.given) if (!existing.given.some((x) => x.id === g.id)) existing.given.push({ ...g });
      if (!(several && d.result === 'win')) for (const g of d.taken) if (!existing.taken.some((x) => x.id === g.id)) existing.taken.push({ ...g });
      for (const x of pieces) if (!existing.src.some((y) => y.start === x.start)) existing.src.push(x);
      continue;
    }
    const several = details.filter((x) => x.part === d.part).length > 1;
    const given = several && d.result === 'loss' ? [] : d.given;
    const taken = several && d.result === 'win' ? [] : d.taken;
    cards.push({ name: d.name, role: d.role, rounds: [...d.rounds].sort((x, y) => x - y), given: given.map((g) => ({ ...g })), taken: taken.map((g) => ({ ...g })), src: pieces });
  }
  for (const c of cards) {
    const res = new Set(c.rounds.map((n) => getRound(n).result));
    c.result = res.size === 1 ? (Array.from(res)[0] as RoundResult | undefined) : undefined;
  }
  const n = total ?? Math.max(0, ...Array.from(roundMap.keys()));
  const rounds: DicteeRound[] = [];
  for (let i = 1; i <= n; i += 1) rounds.push(roundMap.get(i) ?? { number: i });
  return { partners: cards, rounds, total: n || undefined };
}

/* ------------------------------------------------------------------ */
/* Combat : techniques apprises, grade, club, professeur                */
/* ------------------------------------------------------------------ */

const TERM_TABLE = aliasTable(COMBAT_TERMS, (t) => t.aliases, (t) => t.id);
const TERM_RE = new RegExp(`(?:^| )(?:l'|d')?(${TERM_TABLE.alt})(?= |$)`, 'g');
const TERM_BY_ID = new Map(COMBAT_TERMS.map((t) => [t.id, t]));
const GRAPPLING = new Set(['jjb', 'grappling', 'mma', 'judo', 'lutte', 'sambo', 'lutte_olympique', 'self_defense', 'krav_maga']);
const STRIKING = new Set(['boxe', 'boxe_francaise', 'muay_thai', 'kickboxing', 'karate', 'taekwondo', 'mma', 'krav_maga', 'self_defense', 'savate', 'boxe_thai', 'boxe_olympique']);

function termAllowed(t: CombatTerm, sport: string | undefined): boolean {
  if (!t.famille) return true;
  if (!sport) return false;
  if (t.famille === 'frappe') return STRIKING.has(sport);
  if (t.famille === 'sol') return GRAPPLING.has(sport);
  if (t.famille === 'karate') return ['karate', 'judo', 'taekwondo', 'aikido'].includes(sport);
  return sport === 'judo';
}

type TermHit = { term: CombatTerm; a: number; b: number };

function findTerms(r: Reader, sport: string | undefined): TermHit[] {
  const out: TermHit[] = [];
  const g = new RegExp(TERM_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = g.exec(r.norm))) {
    const id = TERM_TABLE.map.get(m[1]);
    const term = id ? TERM_BY_ID.get(id) : undefined;
    const a = m.index + m[0].length - m[1].length;
    g.lastIndex = a + m[1].length;
    if (!term || !termAllowed(term, sport)) continue;
    out.push({ term, a, b: a + m[1].length });
  }
  return out;
}

/** sport devine par les mots du tapis (« juji gatame », « uchi mata », « teep ») */
function sportFromTerms(r: Reader): string | undefined {
  const votes = new Map<string, number>();
  for (const h of findTerms(r, undefined)) if (h.term.devine) votes.set(h.term.devine, (votes.get(h.term.devine) ?? 0) + 1);
  if (/(?:^| )(?:open mat|openmat|kimono|garde fermee)(?= |$)/.test(r.norm)) votes.set('jjb', (votes.get('jjb') ?? 0) + 1);
  const best = Array.from(votes.entries()).sort((x, y) => y[1] - x[1])[0];
  return best && KNOWN.has(best[0]) ? best[0] : undefined;
}

/** zones « on a appris », « en drill » : un morceau de phrase avec un mot d'apprentissage, prolonge sur
 * les morceaux qui suivent apres une virgule tant qu'ils ne parlent pas de sparring */
function learnZones(r: Reader): { a: number; b: number; mode: DicteeLearned['mode'] }[] {
  const zones: { a: number; b: number; mode: DicteeLearned['mode'] }[] = [];
  const sep = /[.;!?]|(?:^| )(?:ensuite|puis|apres ca|et apres|apres|et ensuite|enfin|pour finir|pour terminer|au final)(?= )|,/g;
  const segs: { a: number; b: number; hard: boolean }[] = [];
  let last = 0;
  let hardPrev = true;
  let m: RegExpExecArray | null;
  while ((m = sep.exec(r.norm))) {
    if (m.index > last) segs.push({ a: last, b: m.index, hard: hardPrev });
    hardPrev = m[0] !== ',';
    last = m.index + m[0].length;
  }
  if (last < r.norm.length) segs.push({ a: last, b: r.norm.length, hard: hardPrev });
  const sparring = /(?:^| )(?:j'ai place|je l'ai fini|l'ai fini|m'a pris|l'ai soumis|m'a soumis|j'ai tape|il a tape|elle a tape|sparring|en sparring|randori|randoris|rolls?|roule|kumite|combat|combats|rounds?|rondes?|mises? de gants|j'ai marque|j'ai reussi|j'ai mis)(?= |$)/;
  let open: { a: number; b: number; mode: DicteeLearned['mode'] } | null = null;
  for (const sg of segs) {
    const seg = r.norm.slice(sg.a, sg.b);
    if (sparring.test(seg)) {
      open = null;
      continue;
    }
    if (APPRIS_RE.test(seg)) {
      let start = sg.a;
      // les morceaux d'avant, apres une virgule, sans sparring : « double leg, single leg en drill »
      for (let k = segs.indexOf(sg); k > 0 && !segs[k].hard; k -= 1) {
        const prev = segs[k - 1];
        if (sparring.test(r.norm.slice(prev.a, prev.b)) || zones.some((z) => z.b >= prev.b)) break;
        start = prev.a;
      }
      open = { a: start, b: sg.b, mode: DRILL_RE.test(seg) ? 'drill' : TRAVAIL_RE.test(seg) ? 'travaille' : 'appris' };
      zones.push(open);
      continue;
    }
    if (open && !sg.hard) open.b = sg.b;
    else open = null;
  }
  return zones;
}

/** « j'ai place », « j'ai marque ippon en », « je l'ai fini en » : reussi en sparring */
const REUSSI_RE = /(?:^| )(?:j'ai place|j'ai bien place|j'ai reussi|j'ai reussi a placer|j'ai passe|j'ai marque|j'ai mis|j'ai fait tomber|j'ai projete|je l'ai fini|l'ai fini|l'ai eu|j'ai rentre|j'ai fait taper|il a tape sur|ca a marche)(?= |$)/;

function maskZones(norm: string, zones: { a: number; b: number }[]): string {
  let out = norm;
  for (const z of zones) out = out.slice(0, z.a) + norm.slice(z.a, z.b).replace(/[a-z0-9']/g, '_') + out.slice(z.b);
  return out;
}

function findLearned(r: Reader, sport: string | undefined, zones: { a: number; b: number; mode: DicteeLearned['mode'] }[]): DicteeLearned[] {
  const out: DicteeLearned[] = [];
  const taken = ['techniques', 'blocs', 'rounds', 'type'].flatMap((k) => r.spans[k] ?? []);
  for (const h of findTerms(r, sport)) {
    const zone = zones.find((z) => h.a >= z.a && h.b <= z.b);
    let mode: DicteeLearned['mode'] = zone?.mode ?? 'travaille';
    if (!zone) {
      // hors zone : seulement si ce n'est pas deja une finition, un bloc ou le type de seance
      const sp = r.spanOf(h.a, h.b);
      if (!sp || taken.some((x) => sp.start < x.end && x.start < sp.end)) continue;
      const clause = r.norm.slice(0, h.a).split(/[.;!?,]| puis | ensuite | et /).pop() ?? '';
      if (REUSSI_RE.test(clause)) mode = 'reussi';
    }
    if (out.some((x) => x.id === h.term.id)) continue;
    out.push({ id: h.term.id, label: h.term.label, ...(h.term.note ? { note: h.term.note } : {}), kind: h.term.kind, mode });
    r.mark('appris', h.a, h.b, false);
  }
  for (const z of zones) {
    const v = APPRIS_RE.exec(r.norm.slice(z.a, z.b));
    if (v && out.length) r.mark('appris', z.a + v.index + (v[0].startsWith(' ') ? 1 : 0), z.a + v.index + v[0].length, false);
  }
  return out;
}

/** « ceinture bleue 2 barrettes », « j'ai eu ma ceinture violette », « 1er dan » */
function findGrade(r: Reader): { grade?: string; event?: boolean } {
  const s = r.norm;
  const belt = new RegExp(`(?:^| )((?:(?:je suis|j'ai eu|j'ai obtenu|j'ai recu|je suis passe|je suis passee|passe|passee|passage|ma nouvelle|ma|mon|nouvelle) )?(?:a la |en )?ceinture (${BELTS.join('|')})(?: (\\d{1,2})e? (?:barrettes?|degres?|stripes?|galons?))?)(?= |$)`, 'g');
  let m: RegExpExecArray | null;
  while ((m = belt.exec(s))) {
    const at = m.index + (m[0].startsWith(' ') ? 1 : 0);
    // « avec une ceinture noire » : c'est un partenaire
    if (/(?:^| )(?:avec|contre|face a)(?: (?:une|un|la|le|des|les|deux|2|3))?(?: \w+)? $/.test(s.slice(Math.max(0, at - 22), at)) || /(?:^| )(?:une|des|les|un|deux|2|3) $/.test(s.slice(Math.max(0, at - 6), at))) continue;
    const label = `Ceinture ${m[2]}${m[3] ? `, ${m[3]} barrette${+m[3] > 1 ? 's' : ''}` : ''}`;
    r.mark('grade', at, m.index + m[0].length, false);
    const around = s.slice(Math.max(0, at - 40), m.index + m[0].length);
    return { grade: label, event: /(?:^| )(?:j'ai eu|j'ai obtenu|j'ai recu|je suis passe|je suis passee|passe|passee|passage de grade|passage|ma nouvelle|nouvelle|remise)(?= |$)/.test(around) };
  }
  const dan = /(?:^| )((?:j'ai eu |j'ai obtenu |je suis passe |passage |mon |ma )?(\d{1,2})e? (dan|kyu|barrettes?|degres?|stripes?))(?= |$)/.exec(s);
  if (dan) {
    r.markM('grade', dan, false);
    const unit = /^barrette/.test(dan[3]) ? 'barrette' : /^degre/.test(dan[3]) ? 'degré' : dan[3];
    return { grade: `${dan[2] === '1' ? '1er' : `${dan[2]}e`} ${unit}`, event: /^(?:j'ai eu|j'ai obtenu|je suis passe|passage)/.test(dan[1]) };
  }
  const ev = /(?:^| )(passage de grade|passage de ceinture|remise des ceintures|remise de ceinture|j'ai eu ma ceinture|gradation)(?= |$)/.exec(s);
  if (ev) {
    r.markM('grade', ev, false);
    return { event: true };
  }
  return {};
}

/** suite de mots en majuscule a partir d'un mot (noms de club) */
function readCaps(r: Reader, startTok: number, max: number): string {
  const ids: number[] = [];
  for (let i = startTok; i < r.toks.length && ids.length < max; i += 1) {
    const tk = r.toks[i];
    if (!/^[a-z0-9][a-z0-9'-]*$/.test(tk.t) || (!tk.cap && !/^\d/.test(tk.t))) break;
    ids.push(i);
  }
  if (!ids.length) return '';
  return r.original.slice(r.toks[ids[0]].s, r.toks[ids[ids.length - 1]].e).trim();
}

const CLUB_NAMES = /(?:^| )(gracie barra|checkmat|check mat|alliance|atos|carlson gracie|nova uniao|gf team|ribeiro|cicero costha|fight club|team quest|american top team|tristar|evolve)(?= |$)/;

function findClubCoach(r: Reader): { club?: string; coach?: string } {
  const out: { club?: string; coach?: string } = {};
  const tokAt = (pos: number) => r.toks.findIndex((t) => t.n0 === pos);
  const c = /(?:^| )(?:au club|au dojo|a la salle|a l'academie|a la team|club|dojo|academie|team|salle)(?: de| du| d')? (?=[a-z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = c.exec(r.norm))) {
    const ti = tokAt(m.index + m[0].length);
    if (ti < 0) continue;
    const name = readCaps(r, ti, 3);
    if (name && !/^(?:JJB|MMA|BJJ|K1)$/i.test(name) && !SPORT_ALIASES.some(([alias]) => alias === fold(name).toLowerCase())) {
      out.club = name;
      r.mark('club', m.index + (m[0].startsWith(' ') ? 1 : 0), r.toks[ti].n0 + fold(name).length, false);
      break;
    }
  }
  if (!out.club) {
    const k = CLUB_NAMES.exec(r.norm);
    if (k) {
      const ti = tokAt(k.index + (k[0].startsWith(' ') ? 1 : 0));
      const longer = ti >= 0 ? readCaps(r, ti, 3) : '';
      const txt = longer && fold(longer).toLowerCase().startsWith(k[1]) ? longer : r.orig(k.index, k.index + k[0].length);
      out.club = txt.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      r.markM('club', k, false);
    }
  }
  const p = /(?:^| )(?:le |la |mon |ma |notre )?(?:prof|professeur|professeure|coach|maitre|sensei|mestre|instructeur|instructrice|entraineur|entraineuse)(?: (?:c'etait|etait|aujourd'hui))? (?=[a-z])/g;
  while ((m = p.exec(r.norm))) {
    const ti = tokAt(m.index + m[0].length);
    if (ti < 0) continue;
    const nm = readName(r, ti, true);
    if (nm) {
      out.coach = nm.name;
      r.mark('prof', m.index + (m[0].startsWith(' ') ? 1 : 0), r.toks[nm.last].n1, false);
      break;
    }
  }
  if (!out.coach) {
    const q = /(?:^| )(?:cours|seance|stage|seminaire) (?:de|avec|du prof|avec le prof) (?=[a-z])/.exec(r.norm);
    const ti = q ? tokAt(q.index + q[0].length) : -1;
    const nm = ti >= 0 ? readName(r, ti, true) : null;
    if (q && nm) {
      out.coach = nm.name;
      r.mark('prof', q.index + (q[0].startsWith(' ') ? 1 : 0), r.toks[nm.last].n1, false);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Analyse complete                                                     */
/* ------------------------------------------------------------------ */

function guessSport(r: Reader, res: DicteeResult): string | undefined {
  const s = r.norm;
  if (res.exercises.some((e) => !e.distance && !e.duration)) return 'musculation';
  if (/(?:^| )(?:buts?|passes? decisives?|corner|penalty|coup franc)(?= |$)/.test(s)) return 'football';
  if (/(?:^| )(?:longueurs?|crawl|brasse|papillon|bassin)(?= |$)/.test(s)) return 'natation';
  if (/(?:^| )(?:pattes? d'ours|sac de frappe|uppercut|crochets?|jab)(?= |$)/.test(s)) return 'boxe';
  if (new RegExp(`(?:^| )(?:${TECH_ALT}|kimono|garde fermee)(?= |$)`).test(s) && !/(?:^| )(?:ko|k o)(?= |$)/.test(s)) return sportFromTerms(r) ?? 'jjb';
  const fromTerms = sportFromTerms(r);
  if (fromTerms) return fromTerms;
  if (/(?:^| )(?:j'ai couru|courir|couru|sortie longue|vma)(?= |$)/.test(s) || (res.distance && res.paceSec) || res.exercises.some((e) => e.distance)) return 'running';
  if (/(?:^| )(?:pedale|pedaler|sortie velo)(?= |$)/.test(s)) return 'velo';
  return undefined;
}

export function parseDictee(text: string, now = new Date()): DicteeResult {
  const original = text.slice(0, 1500);
  const r = new Reader(original);
  const res: DicteeResult = { exercises: [], partners: [], combatRounds: [], blocs: [], learned: [], guesses: [], extraNotes: [], found: [], spans: {} };

  res.sport = findSport(r);
  const day = findDate(r, now);
  res.date = day.date;
  res.moment = day.moment;

  const t1 = findTimes(r, res.moment);
  res.time = t1.time;
  if (t1.duration) res.duration = t1.duration;

  const combatish = !res.sport || COMBAT_SPORTS.has(res.sport);
  const rd = findRounds(r, combatish);
  res.roundMin = rd.roundMin;
  res.blocs = rd.blocs;

  const intervals = findIntervals(r, res.sport);
  const ex = findExercises(r, res.sport, intervals.length);
  res.exercises = [...intervals, ...ex.list];
  res.guesses = ex.guesses;

  res.speed = findSpeed(r);
  const dist = findDistance(r, res.sport);
  res.distance = dist.distance;
  if (dist.note) res.extraNotes.push(dist.note);
  const elev = /(?:^| )(\d{2,4}) ?(?:m|metres?)? (?:de denivele|de d\+|d\+)/.exec(r.norm);
  if (elev) res.extraNotes.push(`${elev[1]} m de dénivelé`);

  const portions = findPortions(r, res.sport, (rd.rounds ? 1 : 0) + rd.blocs.length + (res.exercises.length ? 1 : 0));
  if (portions.length) res.extraNotes.push(portions.map((x) => `${x.label} ${fmtMinutesShort(x.min)}`).join(', '));
  if (!res.duration) {
    const d = findDuration(r);
    res.duration = d.duration;
    res.durationSec = d.durationSec;
  }
  const pace = findPace(r);
  Object.assign(res, findCardio(r));

  if (!res.sport) res.sport = guessSport(r, res);
  res.team = findTeam(r, res.sport);

  const feel = findFeeling(r);
  res.intensity = feel.intensity;
  res.rating = feel.rating;
  res.mood = feel.mood;

  // combat : partenaires, rounds, resultats, finitions
  const blocRounds = res.blocs.reduce((a, b) => a + b.rounds, 0);
  let fightRounds = rd.rounds;
  const isCombat = !res.sport || COMBAT_SPORTS.has(res.sport);
  if (isCombat) {
    const zones = learnZones(r);
    const c = readCombat(r, rd.sparring ?? rd.rounds, maskZones(r.norm, zones));
    if (c.partners.length) {
      res.partners = c.partners;
      res.combatRounds = c.rounds;
      if (!fightRounds && c.total) fightRounds = c.total;
      if (!res.sport) res.sport = 'jjb';
    }
    if (res.sport && COMBAT_SPORTS.has(res.sport)) {
      const st = findSessionType(r);
      res.sessionType = st.id;
      res.sessionLabel = st.label;
      res.learned = findLearned(r, res.sport, zones);
      if (!res.learned.length || !zones.length) res.technicalTheme = findTheme(r);
      const g = findGrade(r);
      res.grade = g.grade;
      if (g.event) res.gradeEvent = true;
      Object.assign(res, findClubCoach(r));
      if (!res.club) delete res.club;
      if (!res.coach) delete res.coach;
      if (!res.grade) delete res.grade;
      if (!res.sessionLabel) delete res.sessionLabel;
    }
  }
  if (fightRounds || blocRounds) res.rounds = (fightRounds ?? 0) + blocRounds;

  const outside = /(?:^| )(dehors|en exterieur|a l'exterieur|en plein air|au parc|sur la plage|en foret|en nature|sur piste|en montagne)(?= |$)/.exec(r.norm);
  if (outside) {
    res.outdoor = true;
    r.markM('lieu', outside, false);
  }

  // allure : dite, sinon calculee ; la duree se deduit quand elle n'est pas dite
  if (!res.duration) {
    const parts: string[] = portions.map((x) => `${fmtMinutesShort(x.min)} ${x.label.toLowerCase()}`);
    let total = portions.reduce((a, x) => a + x.min, 0);
    if (fightRounds && res.roundMin) {
      total += fightRounds * res.roundMin;
      parts.push(`${fightRounds} x ${res.roundMin} min`);
    }
    for (const b of res.blocs) {
      const per = b.roundMin ?? res.roundMin;
      if (per) {
        total += b.rounds * per;
        parts.push(`${b.rounds} x ${per} min`);
      }
    }
    if (total > 0) {
      res.duration = total;
      res.durationFrom = parts.join(' + ');
    } else if (res.distance && pace) {
      res.durationSec = Math.round(res.distance * pace);
      res.duration = Math.round(res.durationSec / 60);
      res.durationFrom = traduire('distance et allure');
    }
  }
  const sec = res.durationSec ?? (res.duration ? res.duration * 60 : undefined);
  if (res.sport && SWIM.has(res.sport)) {
    res.paceUnit = '100m';
    if (sec && res.distance) res.paceSec = Math.round(sec / (res.distance * 10));
  } else if (res.sport && SPEED.has(res.sport)) {
    if (!res.speed && sec && res.distance) res.speed = Math.round((res.distance / (sec / 3600)) * 10) / 10;
  } else if (!res.sport || PACE_KM.has(res.sport) || pace) {
    res.paceUnit = 'km';
    if (pace) {
      res.paceSec = pace;
      res.paceSaid = true;
    } else if (sec && res.distance) res.paceSec = Math.round(sec / res.distance);
  }
  if (res.paceSec === undefined) res.paceUnit = undefined;
  if (res.blocs.length) res.extraNotes.unshift(res.blocs.map((b) => `${b.label} ${b.rounds} x ${b.roundMin ?? res.roundMin ?? '?'} min`).join(', '));

  res.spans = r.spans;
  if (res.sport) res.found.push('sport');
  if (res.date) res.found.push('jour');
  if (res.time) res.found.push('heure');
  if (res.duration) res.found.push('durée');
  if (res.rating || res.mood) res.found.push('ressenti');
  if (res.intensity) res.found.push('intensité');
  if (res.distance) res.found.push('distance');
  if (res.paceSec || res.speed) res.found.push('allure');
  if (res.rounds) res.found.push('rounds');
  if (res.partners.length) res.found.push('partenaires');
  if (res.sessionType) res.found.push('type');
  if (res.learned.length) res.found.push('techniques');
  if (res.grade || res.gradeEvent || res.club || res.coach) res.found.push('contexte');
  if (res.exercises.length) res.found.push('exercices');
  if (res.team) res.found.push('match');
  if (res.heartRate || res.calories) res.found.push('cardio');
  return res;
}

/* ------------------------------------------------------------------ */
/* Textes pour l'ecran et la note                                       */
/* ------------------------------------------------------------------ */

function fmtMinutesShort(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** « 5:36 » */
export function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** « 3 clés de bras », « triangles » */
export function techniqueText(t: DicteeTechnique): string {
  const plural = (w: string) =>
    w
      .replace(/^Clé /, 'Clés ')
      .replace(/^(Triangle|Guillotine|Kimura|Omoplata|Américaine|Étranglement|Anaconda|Ezekiel|Gogoplata)\b/, '$1s')
      .replace(/^Heel hook$/, 'Heel hooks');
  const low = (w: string) => (/^(?:KO|D'Arce|Nord-Sud)/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1));
  if (t.count === undefined) return low(plural(t.label));
  if (t.count === 1) return `1 ${low(t.label)}`;
  return `${t.count} ${low(plural(t.label))}`;
}

/** les rounds en texte : « round 1 », « rounds 2 à 4 », « rounds 1, 3 et 5 » */
export function roundsText(list: number[]): string {
  if (!list.length) return '';
  if (list.length === 1) return `round ${list[0]}`;
  const contiguous = list.every((n, i) => i === 0 || n === list[i - 1] + 1);
  if (contiguous) return traduire("rounds {0} à {1}", list[0], list[list.length - 1]);
  return traduire("rounds {0} et {1}", list.slice(0, -1).join(', '), list[list.length - 1]);
}

export const TEAM_POSITIONS = POSITIONS.map(([, label]) => label).filter((v, i, a) => a.indexOf(v) === i);

/** la ligne du match pour la note de seance (la fiche n'a pas de colonne buts ni passes) */
export function teamLine(t: DicteeTeam): string {
  const bits: string[] = [];
  if (t.scoreFor !== undefined && t.scoreAgainst !== undefined) bits.push(`${t.result === 'win' ? 'Victoire' : t.result === 'loss' ? 'Défaite' : 'Nul'} ${t.scoreFor} à ${t.scoreAgainst}`);
  else if (t.result) bits.push(t.result === 'win' ? 'Victoire' : t.result === 'loss' ? 'Défaite' : 'Nul');
  if (t.goals !== undefined) bits.push(`${t.goals} but${t.goals > 1 ? 's' : ''}`);
  if (t.assists !== undefined) bits.push(t.assists > 1 ? `${t.assists} passes décisives` : `${t.assists} passe décisive`);
  if (t.points !== undefined) bits.push(`${t.points} points`);
  if (t.tries !== undefined) bits.push(t.tries > 1 ? `${t.tries} essais` : `${t.tries} essai`);
  if (t.position) bits.push(`poste : ${t.position.toLowerCase()}`);
  if (t.format) bits.push(t.format.charAt(0).toLowerCase() + t.format.slice(1));
  if (t.cadre) bits.push(t.cadre.toLowerCase());
  if (!bits.length) return '';
  return `${t.match ? 'Match' : 'Séance'} : ${bits.join(', ')}`;
}

/** carte de sparring telle que l'ecran la modifie */
export type RoundCard = { name: string; rounds: number[]; result?: RoundResult | null; given: DicteeTechnique[]; taken: DicteeTechnique[] };

/**
 * Les rounds a enregistrer a partir des cartes (apres correction a l'ecran) : partenaire, resultat,
 * finitions donnees (un compte dit est etale round par round) et subies. Meme regle que l'analyse.
 */
export function cardsToRounds(total: number, cards: RoundCard[]): DicteeRound[] {
  const n = Math.max(total, ...cards.flatMap((c) => c.rounds), 0);
  const out: DicteeRound[] = [];
  for (let i = 1; i <= n; i += 1) out.push({ number: i });
  for (const c of cards) {
    const target = c.rounds.filter((x) => x >= 1 && x <= n);
    if (!target.length) continue;
    for (const x of target) {
      const rd = out[x - 1];
      if (c.name.trim()) rd.partner = c.name.trim();
      if (c.result) rd.result = c.result;
    }
    const spread = (techs: DicteeTechnique[], field: 'methodsGiven' | 'methodsTaken', countField: 'submissionsGiven' | 'submissionsTaken') => {
      for (const t of techs) {
        if (t.count !== undefined) {
          for (let k = 0; k < t.count; k += 1) {
            const rd = out[target[k % target.length] - 1];
            (rd[field] ??= []).push(t.id);
            rd[countField] = (rd[countField] ?? 0) + 1;
          }
        } else {
          for (const x of target) {
            const rd = out[x - 1];
            if (!(rd[field] ?? []).includes(t.id)) (rd[field] ??= []).push(t.id);
          }
        }
      }
    };
    spread(c.given, 'methodsGiven', 'submissionsGiven');
    spread(c.taken, 'methodsTaken', 'submissionsTaken');
  }
  return out;
}

/** finitions proposees sur une carte, dans l'ordre ou on les dit le plus */
export const QUICK_TECHNIQUES: DicteeTechnique[] = [
  { id: 'armbar', label: traduire('Clé de bras') },
  { id: 'triangle', label: 'Triangle' },
  { id: 'rnc', label: traduire('Étranglement arrière') },
  { id: 'kimura', label: 'Kimura' },
  { id: 'guillotine', label: 'Guillotine' },
  { id: 'omoplata', label: 'Omoplata' },
  { id: 'americana', label: traduire('Américaine') },
  { id: 'darce', label: "D'Arce" },
  { id: 'Étranglement', label: traduire('Étranglement') },
  { id: 'kneebar', label: traduire('Clé de genou') },
  { id: 'anklelock', label: traduire('Clé de cheville') },
  { id: 'KO', label: 'KO' },
];

/** « Appris : juji gatame (clé de bras), triangle ; en drill : uchi komi » pour la note */
export function learnedLine(list: DicteeLearned[]): string {
  const part = (mode: DicteeLearned['mode'], head: string) => {
    const xs = list.filter((x) => x.mode === mode).map((x) => `${x.label.charAt(0).toLowerCase()}${x.label.slice(1)}${x.note ? ` (${x.note})` : ''}`);
    return xs.length ? `${head} : ${xs.join(', ')}` : '';
  };
  const bits = [part('appris', 'Appris'), part('drill', 'En drill'), part('travaille', 'Travaillé'), part('reussi', 'Réussi en combat')].filter(Boolean);
  return bits.join(' ; ');
}

/** grade, club et professeur pour la note */
export function contextLine(c: { grade?: string; gradeEvent?: boolean; club?: string; coach?: string }): string {
  const bits: string[] = [];
  if (c.grade) bits.push(`${c.grade}${c.gradeEvent ? ' (passage de grade)' : ''}`);
  else if (c.gradeEvent) bits.push('Passage de grade');
  if (c.coach) bits.push(`professeur : ${c.coach}`);
  if (c.club) bits.push(`club : ${c.club}`);
  const s = bits.join(', ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
