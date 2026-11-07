/**
 * Le cardio fait avec l'app Exercice de l'Apple Watch, recupere dans la seance en direct (7 novembre 2026, demande
 * de Houari : il lance souvent sa « Marche inclinée sur tapis » sur la montre, pas dans YOROI, et il appuie parfois
 * sur « Commencer » 20 minutes apres avoir vraiment commence).
 *
 * Rien n'est estime : seulement ce qu'Apple Sante renvoie (duree, kcal actives, distance, FC moyenne). Les kcal
 * suivent les regles de lib/v2/seance/sourceKcal.ts : gardees seulement si elles sont mesurees ('appareil' ou
 * 'sante'), jamais si elles ont ete tapees a la main dans Sante.
 * Donnees pures, testees dans __tests__/unit/montreCardio.test.ts. La lecture est dans ./lectureMontre.ts.
 */
import { traduire } from '@/lib/i18n/tr';
import type { ChronoCardio, TypeCardio } from '@/lib/v2/seances/cardioFin';
import { champsKcalMesurees, kcalPositives, normaliserSourceKcal } from './sourceKcal';
import type { ChampsSourceKcal } from './sourceKcal';

/** Une seance d'Apple Sante telle que lib/healthConnect.ios.ts la rend (mapRawWorkouts) */
export type SeanceSanteBrute = {
  id?: string;
  hkUUID?: string;
  activityType?: string | number;
  startDate?: string;
  endDate?: string;
  /** duree en secondes, pauses retirees, quand Apple la donne */
  dureeSec?: number;
  distance?: number;
  calories?: number;
  averageHeartRate?: number;
  source?: string;
  calories_source?: unknown;
  calories_appareil?: string | null;
  calories_mesurees?: number | null;
};

/** Les familles d'activite d'Apple que la seance sait relier a un cardio */
export type ActiviteMontre = 'marche' | 'randonnee' | 'course' | 'velo' | 'rameur' | 'elliptique' | 'escalier' | 'corde' | 'cardio';

/** Un entrainement de la montre, lu et verifie */
export type EntrainementMontre = {
  id: string;
  /** null : pas un cardio (musculation, yoga...) ; sert seulement a l'heure de debut */
  activite: ActiviteMontre | null;
  debutMs: number;
  finMs: number;
  dureeSec: number;
  /** kcal actives mesurees, absentes si Sante n'en a pas ou si elles ont ete tapees a la main */
  kcal?: number;
  kcalSource?: 'appareil' | 'sante';
  /** « Apple Watch », « Garmin »... ou null (Sante, sans appareil connu) */
  appareil: string | null;
  distanceKm?: number;
  fcMoy?: number;
};

/** Ce que le cardio garde de l'entrainement repris (avec le chrono, dans le brouillon puis le JSON des exercices) */
export type MontreCardio = {
  id: string;
  activite: ActiviteMontre;
  appareil: string | null;
  kcal?: number;
  kcalSource?: 'appareil' | 'sante';
};

/** Fenetre de recherche : 30 minutes avant le debut de la seance */
export const AVANT_SEANCE_MS = 30 * 60_000;
/** Un entrainement de moins d'une minute n'est pas propose */
export const DUREE_MIN_SEC = 60;

// HKWorkoutActivityType (valeurs d'Apple) -> famille
const PAR_NUMERO: Record<number, ActiviteMontre> = {
  52: 'marche', 70: 'marche', 24: 'randonnee', 37: 'course', 71: 'course', 13: 'velo', 74: 'velo', 35: 'rameur',
  16: 'elliptique', 44: 'escalier', 68: 'escalier', 69: 'escalier', 64: 'corde', 73: 'cardio', 30: 'cardio', 63: 'cardio', 11: 'cardio',
};
const PAR_NOM: Record<string, ActiviteMontre> = {
  walking: 'marche', wheelchairwalkpace: 'marche', hiking: 'randonnee', running: 'course', wheelchairrunpace: 'course',
  cycling: 'velo', handcycling: 'velo', rowing: 'rameur', elliptical: 'elliptique', stairclimbing: 'escalier', stairs: 'escalier',
  steptraining: 'escalier', jumprope: 'corde', mixedcardio: 'cardio', mixedmetaboliccardiotraining: 'cardio',
  highintensityintervaltraining: 'cardio', crosstraining: 'cardio',
};

/** La famille d'une activite d'Apple (nombre ou nom), null si ce n'est pas un cardio connu */
export function activiteDe(brut: unknown): ActiviteMontre | null {
  if (typeof brut === 'number') return PAR_NUMERO[brut] ?? null;
  if (typeof brut !== 'string' || !brut.trim()) return null;
  const t = brut.trim();
  if (/^\d+$/.test(t)) return PAR_NUMERO[Number(t)] ?? null;
  return PAR_NOM[t.replace(/^HKWorkoutActivityType/i, '').toLowerCase()] ?? null;
}

/** Les activites d'Apple acceptees pour chaque cardio de la seance */
const COMPATIBLES: Record<TypeCardio, readonly ActiviteMontre[]> = {
  marche_inclinee: ['marche', 'randonnee'],
  tapis_course: ['course'],
  velo: ['velo'],
  rameur: ['rameur'],
  elliptique: ['elliptique'],
  escalier: ['escalier'],
  corde: ['corde'],
  autre: ['marche', 'randonnee', 'course', 'velo', 'rameur', 'elliptique', 'escalier', 'corde', 'cardio'],
};

export const activiteCompatible = (type: TypeCardio, a: ActiviteMontre | null): boolean => !!a && (COMPATIBLES[type] ?? []).includes(a);

const date = (v: unknown): number | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

/** Lit une seance de Sante ; null si ses dates ou sa duree ne tiennent pas */
export function lireEntrainement(s: SeanceSanteBrute | null | undefined): EntrainementMontre | null {
  if (!s) return null;
  const id = String(s.hkUUID ?? s.id ?? '').trim();
  const debutMs = date(s.startDate);
  const finMs = date(s.endDate);
  if (!id || debutMs === null || finMs === null || finMs <= debutMs) return null;
  const fenetreSec = (finMs - debutMs) / 1000;
  // la duree d'Apple (pauses retirees) si elle tient dans la fenetre, sinon la fenetre
  const d = typeof s.dureeSec === 'number' && s.dureeSec > 0 && s.dureeSec <= fenetreSec + 5 ? s.dureeSec : fenetreSec;
  const dureeSec = Math.round(d);
  if (dureeSec < DUREE_MIN_SEC) return null;
  const source = normaliserSourceKcal(s.calories_source);
  const kcalLues = kcalPositives(s.calories_mesurees);
  const out: EntrainementMontre = { id, activite: activiteDe(s.activityType), debutMs, finMs, dureeSec, appareil: null };
  // seulement des kcal mesurees (jamais tapees a la main dans Sante)
  if ((source === 'appareil' || source === 'sante') && kcalLues != null) {
    out.kcal = Math.round(kcalLues);
    out.kcalSource = source;
    out.appareil = typeof s.calories_appareil === 'string' && s.calories_appareil.trim() ? s.calories_appareil.trim() : null;
  } else if (source === 'appareil') {
    out.appareil = typeof s.calories_appareil === 'string' && s.calories_appareil.trim() ? s.calories_appareil.trim() : null;
  }
  if (typeof s.distance === 'number' && Number.isFinite(s.distance) && s.distance > 0) out.distanceKm = Math.round(s.distance * 100) / 100;
  if (typeof s.averageHeartRate === 'number' && s.averageHeartRate >= 40 && s.averageHeartRate <= 230) out.fcMoy = Math.round(s.averageHeartRate);
  return out;
}

/**
 * Les entrainements qui vont avec ce cardio : meme famille d'activite, termines, et qui chevauchent la seance
 * (de 30 minutes avant son debut jusqu'a maintenant). Ceux deja repris par un autre exercice sont ecartes.
 * Le plus recent d'abord.
 */
export function entrainementsPourCardio(
  liste: readonly EntrainementMontre[],
  type: TypeCardio,
  debutSeanceMs: number,
  maintenant: number,
  dejaPris: Iterable<string> = [],
): EntrainementMontre[] {
  const pris = new Set(dejaPris);
  const depuis = debutSeanceMs - AVANT_SEANCE_MS;
  return liste
    .filter((w) => activiteCompatible(type, w.activite) && !pris.has(w.id))
    .filter((w) => w.finMs > depuis && w.debutMs < maintenant && w.finMs <= maintenant + 60_000)
    .sort((a, b) => b.finMs - a.finMs);
}

/** Les ids des entrainements deja repris dans la seance */
export function idsDejaPris(exos: readonly { cardio?: Pick<ChronoCardio, 'montre'> | null }[]): string[] {
  return exos.map((e) => e.cardio?.montre?.id).filter((x): x is string => !!x);
}

/**
 * L'exercice cardio rempli avec l'entrainement : duree, distance et FC moyenne d'Apple, exercice fait (une seule
 * serie, duree en secondes dans les repetitions, comme a « Terminer »). Une valeur absente chez Apple n'efface pas
 * la distance que tu avais notee ; la FC d'avant est retiree (elle venait d'une autre fenetre).
 */
export function remplirCardio<E extends { cardio?: ChronoCardio; sets: { reps: number; done: boolean }[] }>(e: E, w: EntrainementMontre): E {
  if (!e.cardio || !w.activite) return e;
  const { fcMoy: _ancienne, manuelMin: _m, ...reste } = e.cardio;
  const montre: MontreCardio = { id: w.id, activite: w.activite, appareil: w.appareil };
  if (w.kcal !== undefined && w.kcalSource) {
    montre.kcal = w.kcal;
    montre.kcalSource = w.kcalSource;
  }
  const cardio: ChronoCardio = {
    ...reste,
    debutMs: null,
    cumulMs: w.dureeSec * 1000,
    premierDebutMs: w.debutMs,
    finMs: w.finMs,
    signale: true,
    choisi: true,
    montre,
    ...(w.distanceKm !== undefined ? { distanceKm: w.distanceKm } : {}),
    ...(w.fcMoy !== undefined ? { fcMoy: w.fcMoy } : {}),
  };
  return { ...e, cardio, sets: e.sets.map((s, i) => (i === 0 ? { ...s, reps: w.dureeSec, done: true } : s)) };
}

/**
 * Les kcal de la seance tirees des cardios repris de la montre (les seules kcal mesurees d'une seance de
 * musculation en direct) : leur somme, avec la source. Une seule source : gardee ; melangees : 'sante', sans appareil.
 * null sans kcal mesurees.
 */
export function kcalDesCardiosMontre(
  exos: readonly { cardio?: Pick<ChronoCardio, 'montre'> | null; sets: { done: boolean }[] }[],
): ({ calories: number } & ChampsSourceKcal) | null {
  const avec = exos.map((e) => (e.sets.some((s) => s.done) ? e.cardio?.montre : null)).filter((m): m is MontreCardio => !!m && !!m.kcal && m.kcal > 0 && !!m.kcalSource);
  if (!avec.length) return null;
  const total = Math.round(avec.reduce((a, m) => a + (m.kcal ?? 0), 0));
  const memeSource = avec.every((m) => m.kcalSource === avec[0].kcalSource && m.appareil === avec[0].appareil);
  const champs = memeSource ? champsKcalMesurees(total, avec[0].kcalSource as 'appareil' | 'sante', avec[0].appareil) : champsKcalMesurees(total, 'sante', null);
  return champs.calories_source ? { calories: total, ...champs } : null;
}

export const minutesDe = (sec: number): number => Math.max(1, Math.round(sec / 60));

/** « Ta marche de 22 min est sur ta montre. La récupérer ? » (le vrai type de l'entrainement, jamais celui prevu) */
export function phraseBanniere(a: ActiviteMontre, dureeSec: number): string {
  const m = minutesDe(dureeSec);
  switch (a) {
    case 'marche': return traduire('Ta marche de {0} min est sur ta montre. La récupérer ?', m);
    case 'randonnee': return traduire('Ta randonnée de {0} min est sur ta montre. La récupérer ?', m);
    case 'course': return traduire('Ta course de {0} min est sur ta montre. La récupérer ?', m);
    case 'velo': return traduire('Ton vélo de {0} min est sur ta montre. Le récupérer ?', m);
    case 'rameur': return traduire('Ton rameur de {0} min est sur ta montre. Le récupérer ?', m);
    case 'elliptique': return traduire('Ton elliptique de {0} min est sur ta montre. Le récupérer ?', m);
    case 'escalier': return traduire('Tes escaliers de {0} min sont sur ta montre. Les récupérer ?', m);
    case 'corde': return traduire('Ta corde à sauter de {0} min est sur ta montre. La récupérer ?', m);
    default: return traduire('Ton cardio de {0} min est sur ta montre. Le récupérer ?', m);
  }
}

/** Le nom de l'activite, pour le choix entre plusieurs entrainements */
export function nomActivite(a: ActiviteMontre | null): string {
  switch (a) {
    case 'marche': return traduire('Marche');
    case 'randonnee': return traduire('Randonnée');
    case 'course': return traduire('Course');
    case 'velo': return traduire('Vélo');
    case 'rameur': return traduire('Rameur');
    case 'elliptique': return traduire('Elliptique');
    case 'escalier': return traduire('Escaliers');
    case 'corde': return traduire('Corde à sauter');
    case 'cardio': return traduire('Cardio');
    default: return traduire('Entraînement');
  }
}

/** Le message quand la montre n'a rien qui va avec ce cardio */
export const messageAucun = (): string => traduire('Aucun entraînement trouvé. Termine-le sur ta montre puis réessaie.');

/** Apres l'appui sur « Récupérer depuis ta montre » : rien, un seul (rempli tout de suite), ou un choix */
export type IssueRecherche = { type: 'aucun'; message: string } | { type: 'un'; w: EntrainementMontre } | { type: 'choix'; liste: EntrainementMontre[] };
export function issueRecherche(liste: readonly EntrainementMontre[]): IssueRecherche {
  if (liste.length === 0) return { type: 'aucun', message: messageAucun() };
  if (liste.length === 1) return { type: 'un', w: liste[0] };
  return { type: 'choix', liste: [...liste] };
}

// ============================================
// « J'AI COMMENCÉ PLUS TÔT »
// ============================================

/** On peut reculer le debut de la seance de 3 heures au plus */
export const RECUL_MAX_MS = 3 * 3600_000;

/** Les bornes de l'heure de debut : de 3 heures avant maintenant a maintenant, a la minute */
export function bornesDebut(maintenant: number): { min: number; max: number } {
  const max = Math.floor(maintenant / 60_000) * 60_000;
  return { min: Math.ceil((maintenant - RECUL_MAX_MS) / 60_000) * 60_000, max };
}

/** Une heure de debut tenue dans les bornes, a la minute */
export function debutBorne(ms: number, maintenant: number): number {
  const { min, max } = bornesDebut(maintenant);
  const m = Math.round(ms / 60_000) * 60_000;
  return Math.min(max, Math.max(min, m));
}

/** La seance avec sa nouvelle heure de debut : la duree et toutes les heures qui en dependent suivent */
export function avecDebut<D extends { startedAt: number }>(d: D, ms: number, maintenant: number): D {
  const debut = debutBorne(ms, maintenant);
  return debut === d.startedAt ? d : { ...d, startedAt: debut };
}

const memeJour = (a: number, b: number): boolean => {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

/**
 * L'heure de debut proposee d'apres la montre : un entrainement (de n'importe quel type) commence aujourd'hui,
 * avant la seance et dans les 3 dernieres heures, qui vient de finir ou chevauche la seance (fini au plus
 * 30 minutes avant son debut). Le plus ancien d'abord ; deux au plus.
 */
export function suggestionsDebut(liste: readonly EntrainementMontre[], debutSeanceMs: number, maintenant: number): EntrainementMontre[] {
  const { min } = bornesDebut(maintenant);
  return liste
    .filter((w) => memeJour(w.debutMs, maintenant) && w.debutMs >= min && w.debutMs < debutSeanceMs - 60_000 && w.finMs >= debutSeanceMs - AVANT_SEANCE_MS)
    .sort((a, b) => a.debutMs - b.debutMs)
    .slice(0, 2);
}

/** « 16 h 10 » */
export function heureCourte(ms: number): string {
  const d = new Date(ms);
  return traduire('{0} h {1}', d.getHours(), String(d.getMinutes()).padStart(2, '0'));
}
