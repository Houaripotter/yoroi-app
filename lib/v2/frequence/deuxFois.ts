/**
 * « Chaque muscle 2 fois par semaine » (30 octobre 2026). Houari : « Je veux savoir si chaque muscle a été travaillé
 * 2 fois cette semaine, le voir, et si non, que le coach me le rappelle. »
 *
 * La règle, calculée sur le téléphone, rien n'est envoyé :
 *  - la semaine calendaire, du lundi au dimanche (comme partout dans l'app, lib/v2/trainingWeek.ts) ;
 *  - pour chacun des 6 groupes de la carte « Muscles travaillés » (Pectoraux, Dos, Épaules, Bras, Jambes, Abdos),
 *    on compte les JOURS DIFFÉRENTS où ce muscle a fait au moins 2 séries de travail directes ;
 *  - série directe : le muscle principal de l'exercice (muscleOf, lib/v2/progres/strength.ts), échauffements exclus
 *    (workSetsOf, lib/v2/trainingWeek.ts). Un sport sans séries (« sollicité ») ne compte pas ;
 *  - toutes les séances enregistrées comptent : en direct, après coup ou importées, dès qu'elles ont des séries.
 * Deux séances le même jour comptent pour un seul jour (leurs séries s'additionnent).
 *
 * Les études (sources.ts) : travailler un muscle 2 fois par semaine donne plus de muscle qu'une fois
 * (Schoenfeld 2016) ; à volume égal sur la semaine, l'écart est petit (Schoenfeld 2019, Pelland 2026) : la clé, c'est
 * assez de séries par semaine, réparties sur 2 jours. ACSM 2026 et OMS 2020 : tous les grands muscles au moins
 * 2 jours par semaine.
 * Données pures, testées dans __tests__/unit/deuxFois.test.ts.
 */
import type { Training } from '@/lib/database';
import { muscleOf, MUSCLE_ORDER } from '@/lib/v2/progres/strength';
import type { MuscleName } from '@/lib/v2/progres/strength';
import { exercisesOf, mondayOf, workSetsOf } from '@/lib/v2/trainingWeek';

/** Le but : 2 jours par muscle et par semaine */
export const OBJECTIF_JOURS = 2;
/** Séries de travail directes qu'il faut dans la journée pour que le jour compte */
export const SERIES_MIN_JOUR = 2;
/** Le rappel ne parle qu'à quelqu'un qui fait de la musculation : une séance avec séries dans ces jours là */
export const JOURS_RECENTS = 14;
/** Jeudi (0 = lundi) : le coach en parle à partir de ce jour */
export const JOUR_COACH = 3;
/**
 * Les abdos restent sur la carte et dans le résumé, mais le coach et la notification n'en parlent pas : ils sont
 * souvent travaillés sans exercice dédié, mieux vaut ne pas insister.
 */
export const HORS_RAPPEL: readonly MuscleName[] = ['Abdos'];
const aRappeler = (m: MuscleName) => !HORS_RAPPEL.includes(m);

export type FrequenceMuscle = {
  muscle: MuscleName;
  /** jours différents de la semaine avec au moins 2 séries directes */
  jours: number;
  /** 0, 1 ou 2 points remplis */
  points: 0 | 1 | 2;
  /** au moins 2 jours */
  atteint: boolean;
  /** le muscle a déjà eu son jour aujourd'hui */
  aujourdhui: boolean;
};

const iso10 = (s: string | null | undefined) => String(s ?? '').slice(0, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** « 2026-10-30 » plus n jours (date locale, à midi pour éviter les changements d'heure) */
export function plusJoursIso(iso: string, n: number): string {
  const d = new Date(`${iso10(iso)}T12:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 0 = lundi ... 6 = dimanche */
export function indexJourIso(iso: string): number {
  return (new Date(`${iso10(iso)}T12:00:00`).getDay() + 6) % 7;
}

export function isoLocal(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Séries de travail directes par muscle, pour une séance */
export function seriesDirectes(t: Training): Partial<Record<MuscleName, number>> {
  const out: Partial<Record<MuscleName, number>> = {};
  for (const e of exercisesOf(t)) {
    if (!e || !e.name) continue;
    const m = muscleOf({ name: e.name, muscle_group: e.muscle_group });
    if (!m) continue;
    const n = workSetsOf(e).length;
    if (n > 0) out[m] = (out[m] ?? 0) + n;
  }
  return out;
}

/** Une séance de musculation : au moins une série de travail */
export function estSeanceMuscu(t: Training): boolean {
  return exercisesOf(t).some((e) => !!e && workSetsOf(e).length > 0);
}

/** Pour chaque muscle, combien de jours différents de la semaine (lundi à dimanche de `aujourdhui`) il a été travaillé */
export function frequenceSemaine(trainings: readonly Training[], aujourdhui: string): FrequenceMuscle[] {
  const lundi = mondayOf(aujourdhui);
  const dimanche = plusJoursIso(lundi, 6);
  const jour = iso10(aujourdhui);
  // séries par jour et par muscle
  const parJour = new Map<string, Partial<Record<MuscleName, number>>>();
  for (const t of trainings) {
    const d = iso10(t?.date);
    if (!ISO.test(d) || d < lundi || d > dimanche) continue;
    const s = seriesDirectes(t);
    const cumul = parJour.get(d) ?? {};
    for (const m of Object.keys(s) as MuscleName[]) cumul[m] = (cumul[m] ?? 0) + (s[m] ?? 0);
    parJour.set(d, cumul);
  }
  return MUSCLE_ORDER.map((muscle) => {
    let jours = 0;
    let auj = false;
    for (const [d, s] of parJour) {
      if ((s[muscle] ?? 0) >= SERIES_MIN_JOUR) {
        jours += 1;
        if (d === jour) auj = true;
      }
    }
    return { muscle, jours, points: (Math.min(jours, OBJECTIF_JOURS) as 0 | 1 | 2), atteint: jours >= OBJECTIF_JOURS, aujourdhui: auj };
  });
}

/** « 4 muscles sur 6 travaillés 2 fois » */
export function resumeFrequence(f: readonly FrequenceMuscle[]): { atteints: number; total: number } {
  return { atteints: f.filter((x) => x.atteint).length, total: f.length };
}

/** Libellé d'un muscle : « 1 fois sur 2 », « 2 fois » (gabarit français à traduire, et sa valeur) */
export function libelleFois(x: Pick<FrequenceMuscle, 'jours'>): { gabarit: string; valeur: number } {
  return x.jours >= OBJECTIF_JOURS ? { gabarit: '{0} fois', valeur: x.jours } : { gabarit: '{0} fois sur 2', valeur: x.jours };
}

/** Jours qu'il reste à ce muscle cette semaine, aujourd'hui compris s'il n'a pas encore eu son jour */
export function joursRestants(x: Pick<FrequenceMuscle, 'aujourdhui'>, aujourdhui: string): number {
  const apres = 6 - indexJourIso(aujourdhui);
  return apres + (x.aujourdhui ? 0 : 1);
}

/** Les muscles sous 2 jours qui peuvent encore y arriver cette semaine */
export function musclesEnRetard(f: readonly FrequenceMuscle[], aujourdhui: string): MuscleName[] {
  return f.filter((x) => !x.atteint && OBJECTIF_JOURS - x.jours <= joursRestants(x, aujourdhui)).map((x) => x.muscle);
}

/** Date (« 2026-10-30 ») de la dernière séance avec séries, ou null */
export function derniereSeanceMuscu(trainings: readonly Training[]): string | null {
  let best: string | null = null;
  for (const t of trainings) {
    const d = iso10(t?.date);
    if (!ISO.test(d) || !estSeanceMuscu(t)) continue;
    if (!best || d > best) best = d;
  }
  return best;
}

/** Une séance de musculation dans les 14 jours avant `reference` (compris) */
export function muscuRecente(trainings: readonly Training[], reference: string): boolean {
  const ref = iso10(reference);
  const debut = plusJoursIso(ref, -JOURS_RECENTS);
  return trainings.some((t) => {
    const d = iso10(t?.date);
    return ISO.test(d) && d >= debut && d <= ref && estSeanceMuscu(t);
  });
}

/**
 * La carte du coach (abdos exclus, HORS_RAPPEL) : à partir du jeudi, s'il fait de la musculation (14 derniers jours) et qu'au moins un muscle
 * est à 0 ou 1 jour avec encore assez de jours pour arriver à 2. Rend les muscles à rappeler, ou [] : pas de carte.
 */
export function rappelCoach(trainings: readonly Training[], aujourdhui: string): MuscleName[] {
  if (indexJourIso(aujourdhui) < JOUR_COACH) return [];
  if (!muscuRecente(trainings, aujourdhui)) return [];
  return musclesEnRetard(frequenceSemaine(trainings, aujourdhui), aujourdhui).filter(aRappeler);
}

/* ------------------------------------------------------------------------------------------------
 * La séance proposée
 * ---------------------------------------------------------------------------------------------- */

/** Groupes de lib/v2/programmes/semaineLibre.ts (groupesDeSeance) vers les muscles de la carte */
const DU_GROUPE: Record<string, MuscleName> = { pectoraux: 'Pectoraux', dos: 'Dos', epaules: 'Épaules', bras: 'Bras', jambes: 'Jambes', abdos: 'Abdos' };
export function musclesDesGroupes(groupes: readonly string[]): MuscleName[] {
  const out = new Set<MuscleName>();
  for (const g of groupes) if (DU_GROUPE[g]) out.add(DU_GROUPE[g]);
  return MUSCLE_ORDER.filter((m) => out.has(m));
}

export type SeancePrevue<T> = {
  /** date de la séance prévue dans ta semaine */
  date: string;
  muscles: readonly MuscleName[];
  donnee: T;
};

/**
 * La séance de ta semaine qui couvre le plus de muscles en retard, de aujourd'hui à dimanche ; à égalité, la plus
 * proche. null : aucune ne les travaille.
 */
export function seanceQuiCouvre<T>(retard: readonly MuscleName[], prevues: readonly SeancePrevue<T>[], aujourdhui: string): (SeancePrevue<T> & { couverts: MuscleName[] }) | null {
  const jour = iso10(aujourdhui);
  const dimanche = plusJoursIso(mondayOf(jour), 6);
  let best: (SeancePrevue<T> & { couverts: MuscleName[] }) | null = null;
  for (const p of prevues) {
    const d = iso10(p.date);
    if (d < jour || d > dimanche) continue;
    const couverts = retard.filter((m) => p.muscles.includes(m));
    if (!couverts.length) continue;
    if (!best || couverts.length > best.couverts.length || (couverts.length === best.couverts.length && d < iso10(best.date))) best = { ...p, couverts };
  }
  return best;
}

/** Les zones de la bibliothèque (lib/v2/programmes/zones.ts) pour chaque muscle */
const ZONE_DU_MUSCLE: Record<Exclude<MuscleName, 'Jambes'>, string> = {
  Pectoraux: 'pectoraux',
  Dos: 'dos',
  'Épaules': 'epaules',
  Bras: 'bras',
  Abdos: 'abdos',
};
const HAUT: MuscleName[] = ['Pectoraux', 'Dos', 'Épaules', 'Bras'];

/**
 * Sans séance de ta semaine qui les travaille : une séance de la bibliothèque (app/programmes/zones.tsx).
 * Un seul muscle : sa séance ; que le haut : « Haut du corps » ; que les jambes : « Bas du corps » ; sinon « Corps entier ».
 */
export function seanceBibliotheque(retard: readonly MuscleName[]): { preset: string } | { zone: string } | null {
  if (!retard.length) return null;
  const seul = retard.length === 1 ? retard[0] : null;
  if (seul === 'Jambes') return { preset: 'bas' };
  if (seul) return { zone: ZONE_DU_MUSCLE[seul] };
  if (retard.every((m) => HAUT.includes(m))) return { preset: 'haut' };
  return { preset: 'entier' };
}

/* ------------------------------------------------------------------------------------------------
 * La phrase du coach : « Tu n'as pas travaillé tes jambes 2 fois cette semaine. »
 * ---------------------------------------------------------------------------------------------- */
export const POSSESSIF: Record<MuscleName, string> = {
  Pectoraux: 'tes pectoraux',
  Dos: 'ton dos',
  'Épaules': 'tes épaules',
  Bras: 'tes bras',
  Jambes: 'tes jambes',
  Abdos: 'tes abdos',
};

/** « a », « a et b », « a, b et c » ; `et` : le mot « et » déjà traduit */
export function enListe(items: readonly string[], et = 'et'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${et} ${items[items.length - 1]}`;
}

/* ------------------------------------------------------------------------------------------------
 * La notification du vendredi 18 h
 * ---------------------------------------------------------------------------------------------- */
export const HEURE_NOTIF = 18;
/** Vendredi (0 = lundi) */
export const JOUR_NOTIF = 4;

/** Le vendredi 18 h (heure locale) de la semaine de `maintenant` */
export function vendrediDeLaSemaine(maintenant: Date): Date {
  const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), HEURE_NOTIF, 0, 0, 0);
  const idx = (maintenant.getDay() + 6) % 7;
  d.setDate(d.getDate() + (JOUR_NOTIF - idx));
  return d;
}

/** Le réglage « Rappel 2 fois par muscle » : allumé par défaut seulement si les rappels d'entraînement le sont */
export function rappelDeuxFoisActif(s: { training?: { enabled?: boolean } | null; deuxFois?: { enabled?: boolean } | null } | null | undefined): boolean {
  if (!s) return false;
  if (s.deuxFois && typeof s.deuxFois.enabled === 'boolean') return s.deuxFois.enabled;
  return s.training?.enabled === true;
}

/**
 * Quand programmer la notification de la semaine, ou null : pas de notification.
 * Une seule par semaine : le vendredi 18 h de cette semaine, seulement s'il est encore à venir, si au moins un muscle
 * est sous 2 jours (d'après les séances déjà enregistrées) et s'il y a une séance de musculation dans les 14 jours
 * avant ce vendredi. Rend aussi les muscles sous 2 jours, pour le texte.
 */
export function notifDeuxFois(trainings: readonly Training[], maintenant: Date): { date: Date; muscles: MuscleName[]; semaine: string } | null {
  const date = vendrediDeLaSemaine(maintenant);
  if (date.getTime() <= maintenant.getTime()) return null;
  const vendredi = isoLocal(date);
  if (!muscuRecente(trainings, vendredi)) return null;
  const muscles = frequenceSemaine(trainings, isoLocal(maintenant)).filter((x) => !x.atteint).map((x) => x.muscle).filter(aRappeler);
  if (!muscles.length) return null;
  return { date, muscles, semaine: mondayOf(vendredi) };
}
