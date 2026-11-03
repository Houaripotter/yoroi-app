/**
 * « Ta semaine », en grand (3 novembre 2026, Houari : « la carte Cette semaine doit être cliquable »). Données pures,
 * lues par app/ta-semaine.tsx :
 *  - joursDeLaSemaine : les 7 jours de L à D. Un jour avec des séances est « fait » (toutes ses séances, dans
 *    l'ordre de la journée) ; un jour à venir (aujourd'hui compris) sans séance montre ce qui est prévu : la séance
 *    du programme, les créneaux de ton planning, ou tes jours d'entraînement choisis ; sinon c'est un jour de repos.
 *    Un jour passé sans séance est un repos : on ne réécrit jamais un planning d'avant ;
 *  - chiffresSemaine : les mêmes chiffres que « Tes chiffres de la semaine » (weekCompare), pour n'importe quelle
 *    semaine : la semaine en cours jusqu'à aujourd'hui, une semaine passée en entier, comparées à la semaine d'avant ;
 *  - la navigation d'une semaine à l'autre (bornesSemaines, decalerSemaine, titreSemaine, decalageDe).
 * Seulement les vraies données de l'app : rien n'est inventé.
 */
import type { Training, WeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { mondayOf } from '@/lib/v2/trainingWeek';
import { traduire, traduirePluriel, LANG, plageJours } from '@/lib/i18n/tr';
import { MONTHS_SHORT, addDaysISO, dateOf, daysFrom } from './sessionData';
import { weekCompare } from './weekCompare';
import type { WeekCompare } from './weekCompare';

/** Semaines à venir que l'on peut regarder (comme la page du programme) */
export const SEMAINES_A_VENIR = 3;

export type PrevuJour = {
  /** « Pull B », « JJB », « Jour d’entraînement » */
  titre: string;
  /** le sport, pour son sticker */
  sport?: string;
  /** « 19:00 » */
  heure?: string;
  minutes?: number;
  /** vient du programme en cours */
  programme?: boolean;
};

export type EtatJour = 'fait' | 'prevu' | 'repos';

export type JourSemaine = {
  iso: string;
  /** 0 = lundi */
  index: number;
  etat: EtatJour;
  aujourdhui: boolean;
  /** passé (avant aujourd'hui) */
  passe: boolean;
  /** les séances faites ce jour-là, dans l'ordre de la journée */
  seances: Training[];
  /** ce qui est prévu (jours à venir sans séance seulement) */
  prevus: PrevuJour[];
};

const jourDe = (t: Training): string => String(t.date ?? '').slice(0, 10);

function ordreJournee(a: Training, b: Training): number {
  const ha = a.start_time ?? '';
  const hb = b.start_time ?? '';
  if (ha !== hb) return ha.localeCompare(hb);
  return (Number(a.id) || 0) - (Number(b.id) || 0);
}

/** Les créneaux d'entraînement du planning pour ce jour de la semaine (0 = lundi) */
function creneauxDu(plan: readonly WeeklyPlan[], index: number, dejaProgramme: boolean): PrevuJour[] {
  return plan
    .filter((s) => s.day_of_week === index && !s.is_rest_day)
    // un créneau de musculation le jour d'une séance du programme : c'est la même séance
    .filter((s) => !(dejaProgramme && /muscu/i.test(s.sport ?? '')))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    .map((s) => ({ titre: (s.label ?? '').trim() || getSportName(s.sport), sport: s.sport, heure: s.time ? s.time.slice(0, 5) : undefined, minutes: s.duration_minutes || undefined }));
}

export function joursDeLaSemaine(o: {
  trainings: readonly Training[];
  /** le lundi de la semaine regardée */
  lundi: string;
  aujourdhui: string;
  plan?: readonly WeeklyPlan[];
  /** les séances du programme en cours, par date (« 2026-11-04 » : Pull B) */
  programme?: Readonly<Record<string, PrevuJour>>;
  /** tes jours d'entraînement choisis (0 = lundi), utilisés seulement sans planning ni programme */
  typeDays?: readonly number[];
}): JourSemaine[] {
  const lundi = mondayOf(o.lundi);
  const plan = o.plan ?? [];
  const sansPlanning = !plan.some((p) => !p.is_rest_day);
  const avecProgramme = !!o.programme && Object.keys(o.programme).length > 0;
  const out: JourSemaine[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDaysISO(lundi, i);
    const seances = o.trainings.filter((t) => jourDe(t) === iso).sort(ordreJournee);
    const passe = iso < o.aujourdhui;
    let prevus: PrevuJour[] = [];
    if (!seances.length && !passe) {
      const p = o.programme?.[iso];
      if (p) prevus.push({ ...p, programme: true });
      prevus = prevus.concat(creneauxDu(plan, i, !!p));
      if (!prevus.length && sansPlanning && !avecProgramme && (o.typeDays ?? []).includes(i)) prevus.push({ titre: traduire('Jour d’entraînement') });
    }
    const etat: EtatJour = seances.length ? 'fait' : prevus.length ? 'prevu' : 'repos';
    out.push({ iso, index: i, etat, aujourdhui: iso === o.aujourdhui, passe, seances, prevus });
  }
  return out;
}

/**
 * Les chiffres d'une semaine, au format de « Tes chiffres de la semaine » : la semaine en cours jusqu'à aujourd'hui
 * (comparée à la semaine passée au même jour), une semaine passée en entier (comparée à la semaine d'avant en
 * entier), une semaine à venir vide.
 */
export function chiffresSemaine(trainings: Training[], lundi: string, aujourdhui: string): WeekCompare {
  const l = mondayOf(lundi);
  const dimanche = addDaysISO(l, 6);
  // une semaine à venir s'arrête à son lundi : rien de fait (l'écran ne montre pas ses chiffres)
  const fin = aujourdhui < l ? l : aujourdhui > dimanche ? dimanche : aujourdhui;
  return weekCompare(trainings, fin);
}

/** Décalage en semaines entre la semaine d'aujourd'hui et celle de `lundi` (0 : cette semaine, -1 : la passée) */
export function decalageDe(lundi: string, aujourdhui: string): number {
  return Math.round(daysFrom(mondayOf(aujourdhui), mondayOf(lundi)) / 7);
}

/** Le lundi de la semaine `k` semaines plus loin (k négatif : en arrière) */
export function decalerSemaine(lundi: string, k: number): string {
  return addDaysISO(mondayOf(lundi), 7 * Math.round(k));
}

/** De la semaine de ta première séance à SEMAINES_A_VENIR semaines devant, en lundis */
export function bornesSemaines(trainings: readonly Training[], aujourdhui: string): { min: string; max: string } {
  const ici = mondayOf(aujourdhui);
  let premier = ici;
  for (const t of trainings) {
    const d = jourDe(t);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < premier) premier = d;
  }
  return { min: mondayOf(premier), max: decalerSemaine(ici, SEMAINES_A_VENIR) };
}

/** Garde un lundi demandé dans les bornes */
export function dansLesBornes(lundi: string, bornes: { min: string; max: string }): string {
  const l = mondayOf(lundi);
  if (l < bornes.min) return bornes.min;
  if (l > bornes.max) return bornes.max;
  return l;
}

/** « Cette semaine », « Semaine dernière », « Semaine prochaine », « Il y a 3 semaines », « Dans 2 semaines » */
export function titreSemaine(lundi: string, aujourdhui: string): string {
  const k = decalageDe(lundi, aujourdhui);
  if (k === 0) return traduire('Cette semaine');
  if (k === -1) return traduire('Semaine dernière');
  if (k === 1) return traduire('Semaine prochaine');
  return k > 0 ? traduire('Dans {0} semaines', k) : traduire('Il y a {0} semaines', -k);
}

/** « du 2 au 8 nov. », « du 27 oct. au 2 nov. » */
export function periodeSemaine(lundi: string): string {
  const l = mondayOf(lundi);
  const md = dateOf(l);
  const sd = dateOf(addDaysISO(l, 6));
  if (LANG !== 'fr') return plageJours(md, sd);
  return md.getMonth() === sd.getMonth()
    ? traduire('du {0} au {1} {2}', md.getDate(), sd.getDate(), MONTHS_SHORT[sd.getMonth()])
    : traduire('du {0} {1} au {2} {3}', md.getDate(), MONTHS_SHORT[md.getMonth()], sd.getDate(), MONTHS_SHORT[sd.getMonth()]);
}

export type ObjectifSemaine = { fait: number; total: number; tenu: boolean; phrase: string };

/**
 * Où tu en es de ton objectif : séances faites sur ton objectif, ou jours entraînés sur 7 sans objectif.
 * `passee` : la semaine est finie, la phrase dit ce qui a été fait.
 */
export function objectifSemaine(seances: number, jours: number, objectif: number, etat: 'passee' | 'en_cours' | 'a_venir'): ObjectifSemaine {
  if (objectif > 0) {
    const tenu = seances >= objectif;
    const reste = objectif - seances;
    const phrase = tenu
      ? traduire('Objectif tenu')
      : etat === 'passee'
        ? traduirePluriel(reste, reste > 1, 'Il a manqué {0} séance', 'Il a manqué {0} séances', reste)
        : etat === 'a_venir'
          ? traduirePluriel(objectif, objectif > 1, 'Objectif : {0} séance', 'Objectif : {0} séances', objectif)
          : seances === 0
            ? traduire('Ta semaine commence ici')
            : traduire('Encore {0} pour ton objectif', reste);
    return { fait: seances, total: objectif, tenu, phrase };
  }
  return { fait: jours, total: 7, tenu: false, phrase: traduirePluriel(jours, jours > 1, '{0} jour entraîné', '{0} jours entraînés', jours) };
}

/** Le jour à mettre en avant à l'ouverture : celui demandé s'il est dans la semaine, sinon aujourd'hui, sinon lundi */
export function jourCentre(jours: readonly JourSemaine[], demande?: string | null): number {
  if (demande) {
    const k = jours.findIndex((j) => j.iso === demande);
    if (k >= 0) return k;
  }
  const a = jours.findIndex((j) => j.aujourdhui);
  return a >= 0 ? a : 0;
}
