/**
 * L'app apprend tes habitudes de fin de séance (1er novembre 2026, Houari : « vérifie que l'application regarde ce
 * que j'ai l'habitude de faire »). À partir de tes vraies séances des 4 dernières semaines :
 *  - ton cardio habituel (type, durée, pente, vitesse ou niveau les plus fréquents) et tes abdos habituels (avec
 *    leurs supersets, crunch puis roue) servent de départ quand ton programme ne dit rien de plus précis ;
 *  - une suggestion douce, jamais appliquée sans ton accord : « Tu fais souvent 30 min de marche inclinée après ta
 *    séance, l'ajouter à ton programme ? », « Tu passes souvent les abdos, les mettre 2 fois par semaine ? ».
 *    « Non merci » : on ne redemande pas avant DELAI_REDEMANDE_JOURS jours.
 * Seuil prudent : au moins SEUIL_HABITUDE fois sur les 4 dernières semaines. Rien n'est inventé : tout vient de tes
 * séances enregistrées. Données pures plus lecture et écriture des refus, testées dans __tests__/unit/habitudesFin.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';
import { cardioFait, estCardioEnregistre, retenirHabitudeCardio } from './cardioJour';
import type { HabitudeCardio } from './cardioJour';
import type { TypeCardio } from './cardioFin';
import { avecAbdos, avecCardio, caseCochee, choixDuJour, estJourMuscu, exosAbdosFin, retenirAbdosHabituels } from '@/lib/v2/programmes/finSeance';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import type { ExoProgramme, JourProgramme } from '@/lib/v2/programmes/types';

export const SEUIL_HABITUDE = 3;
export const FENETRE_JOURS = 28;
export const DELAI_REDEMANDE_JOURS = 21;

/* ------------------------------------------------------------------------------------------------
 * Lecture des séances
 * ---------------------------------------------------------------------------------------------- */

type ExoLu = { name?: unknown; muscle_group?: unknown; sets?: unknown; reps?: unknown; weight?: unknown; setsData?: unknown; enchaine?: unknown; cardio?: unknown; duration?: unknown };
export type SeanceLue = { id?: number; date: string; exercises?: unknown };

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const GROUPES_ABDOS = new Set(['ABDOS', 'ABDOMINAUX', 'CORE', 'OBLIQUES', 'SANGLE ABDOMINALE']);

function exosDe(t: SeanceLue): ExoLu[] {
  const raw = t.exercises;
  if (Array.isArray(raw)) return raw as ExoLu[];
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Un exercice d'abdos enregistré (groupe ABDOS, CORE, OBLIQUES) */
export const estAbdos = (e: ExoLu | null | undefined): boolean => !!e && typeof e.muscle_group === 'string' && GROUPES_ABDOS.has(sansAccent(e.muscle_group));

/** Une séance de musculation : au moins un exercice qui n'est ni du cardio ni des abdos */
export const estSeanceMuscu = (t: SeanceLue): boolean => exosDe(t).some((e) => !estCardioEnregistre(e) && !estAbdos(e) && typeof e.name === 'string');

const jourIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Les séances de musculation des 4 dernières semaines (aujourd'hui compris) */
export function seancesRecentes<T extends SeanceLue>(trainings: readonly T[] | null | undefined, maintenant = new Date()): T[] {
  const debut = jourIso(new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - (FENETRE_JOURS - 1), 12));
  const fin = jourIso(maintenant);
  return (trainings ?? []).filter((t) => t && typeof t.date === 'string' && t.date.slice(0, 10) >= debut && t.date.slice(0, 10) <= fin && estSeanceMuscu(t));
}

/** La valeur la plus fréquente (à égalité : la plus récente, les séances sont lues de la plus récente à la plus ancienne) */
function plusFrequent<V>(valeurs: readonly V[], cle: (v: V) => string = (v) => String(v)): { v: V; n: number } | null {
  const compte = new Map<string, { v: V; n: number; ordre: number }>();
  valeurs.forEach((v, i) => {
    const k = cle(v);
    const c = compte.get(k);
    if (c) c.n++;
    else compte.set(k, { v, n: 1, ordre: i });
  });
  let best: { v: V; n: number; ordre: number } | null = null;
  for (const c of compte.values()) if (!best || c.n > best.n || (c.n === best.n && c.ordre < best.ordre)) best = c;
  return best ? { v: best.v, n: best.n } : null;
}

const recentesDabord = <T extends SeanceLue>(l: readonly T[]) => [...l].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));

/* ------------------------------------------------------------------------------------------------
 * Le cardio habituel
 * ---------------------------------------------------------------------------------------------- */

const arrondi5 = (m: number) => Math.max(5, Math.round(m / 5) * 5);

/**
 * Ton cardio habituel : le type fait au moins 3 fois sur 4 semaines, sa durée la plus fréquente (au pas de 5 min),
 * sa pente, sa vitesse ou son niveau les plus fréquents. null sinon.
 */
export function cardioHabituel(trainings: readonly SeanceLue[] | null | undefined, maintenant = new Date()): (HabitudeCardio & { fois: number }) | null {
  const faits: { type: TypeCardio; minutes: number; pente?: number; vitesse?: number; niveau?: number }[] = [];
  for (const t of recentesDabord(seancesRecentes(trainings, maintenant))) {
    const exos = exosDe(t);
    const c = cardioFait(exos);
    if (!c) continue;
    const r = (exos.find((e) => estCardioEnregistre(e))?.cardio ?? null) as { penteMoy?: unknown; vitesseMoy?: unknown; niveauMoy?: unknown } | null;
    faits.push({
      type: c.type,
      minutes: arrondi5(c.minutes),
      ...(typeof r?.penteMoy === 'number' ? { pente: Math.round(r.penteMoy * 2) / 2 } : {}),
      ...(typeof r?.vitesseMoy === 'number' ? { vitesse: Math.round(r.vitesseMoy * 10) / 10 } : {}),
      ...(typeof r?.niveauMoy === 'number' ? { niveau: Math.round(r.niveauMoy) } : {}),
    });
  }
  const type = plusFrequent(faits.map((f) => f.type));
  if (!type || type.n < SEUIL_HABITUDE) return null;
  const memes = faits.filter((f) => f.type === type.v);
  const minutes = plusFrequent(memes.map((f) => f.minutes))!.v;
  const out: HabitudeCardio & { fois: number } = { type: type.v, minutes, fois: type.n };
  const pente = plusFrequent(memes.filter((f) => f.pente !== undefined).map((f) => f.pente!));
  const vitesse = plusFrequent(memes.filter((f) => f.vitesse !== undefined).map((f) => f.vitesse!));
  const niveau = plusFrequent(memes.filter((f) => f.niveau !== undefined).map((f) => f.niveau!));
  if (pente) out.pente = pente.v;
  if (vitesse) out.vitesse = vitesse.v;
  if (niveau) out.niveau = niveau.v;
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Les abdos habituels, supersets compris
 * ---------------------------------------------------------------------------------------------- */

const mediane = (l: number[]): number => {
  const s = [...l].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
};

/** Les tenues en secondes (planche, gainage) : leur « répétition » est un temps */
const EN_SECONDES = /gainage|planche|plank|hollow|chaise/i;

/**
 * Tes abdos habituels : les exercices d'abdos faits au moins 3 fois sur 4 semaines, dans ton ordre habituel, avec
 * tes séries et tes répétitions les plus courantes. `liens` : un exercice lié au suivant (superset) dans tes
 * séances ou dans tes supersets gardés (enchainements.ts). null : pas d'habitude, la planche et le crunch restent.
 */
export function abdosHabituels(trainings: readonly SeanceLue[] | null | undefined, maintenant = new Date(), liens: ReadonlyMap<string, string> = new Map()): ExoProgramme[] | null {
  const parNom = new Map<string, { nom: string; seances: number; places: number[]; series: number[]; reps: number[]; charge: boolean; lie: number }>();
  for (const t of seancesRecentes(trainings, maintenant)) {
    const exos = exosDe(t);
    const abdos = exos.map((e, i) => ({ e, i })).filter((x) => estAbdos(x.e) && typeof x.e.name === 'string' && x.e.name.trim());
    if (!abdos.length) continue;
    const vus = new Set<string>();
    abdos.forEach(({ e, i }, k) => {
      const nom = (e.name as string).trim();
      if (vus.has(nom)) return;
      vus.add(nom);
      const x = parNom.get(nom) ?? { nom, seances: 0, places: [], series: [], reps: [], charge: false, lie: 0 };
      x.seances++;
      x.places.push(abdos.length > 1 ? k / (abdos.length - 1) : 0);
      const sd = Array.isArray(e.setsData) ? (e.setsData as { reps?: unknown; weight?: unknown }[]) : [];
      x.series.push(sd.length || Math.max(1, Number(e.sets) || 1));
      const r = sd.length ? mediane(sd.map((s) => Number(s.reps) || 0).filter((n) => n > 0)) : Number(e.reps) || 0;
      if (r > 0) x.reps.push(r);
      if (sd.some((s) => Number(s.weight) > 0) || Number(e.weight) > 0) x.charge = true;
      const suivant = exos[i + 1];
      if (e.enchaine === true && suivant && estAbdos(suivant)) x.lie++;
      parNom.set(nom, x);
    });
  }
  const gardes = [...parNom.values()].filter((x) => x.seances >= SEUIL_HABITUDE).sort((a, b) => mediane(a.places) - mediane(b.places) || b.seances - a.seances).slice(0, 4);
  if (!gardes.length) return null;
  const defauts = new Map([...exosAbdosFin('salle'), ...exosAbdosFin('maison')].map((e) => [e.nom, e]));
  return gardes.map((x, i) => {
    const d = defauts.get(x.nom);
    const reps = x.reps.length ? Math.max(1, Math.round(mediane(x.reps))) : d?.repsMin ?? 12;
    const secondes = d?.secondes ?? EN_SECONDES.test(x.nom);
    const suivant = gardes[i + 1];
    const lie = !!suivant && (x.lie * 2 >= x.seances || liens.get(x.nom) === suivant.nom);
    return {
      nom: x.nom,
      muscle: 'ABDOS',
      series: Math.min(6, Math.max(1, Math.round(mediane(x.series)))),
      repsMin: reps,
      repsMax: reps,
      reposSec: d?.reposSec ?? 60,
      ...(d?.conseil ? { conseil: d.conseil } : {}),
      ...(secondes ? { secondes: true } : {}),
      ...(!x.charge ? { poidsDuCorps: true } : {}),
      ...(lie ? { enchaine: true } : {}),
    };
  });
}

/** Les supersets gardés (enchainements.ts, toutes séances) : exercice -> exercice ajouté juste après */
export function liensGardes(blocs: Readonly<Record<string, { ajouts: { apres: string; exo: { nom: string } }[] }>> | null | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const b of Object.values(blocs ?? {})) for (const a of b.ajouts ?? []) if (!m.has(a.apres)) m.set(a.apres, a.exo.nom);
  return m;
}

/**
 * Retient tes habitudes pour les écrans qui annoncent la séance (cardioJour.ts, finSeance.ts). Appelé quand tes
 * séances sont lues (séance en direct, page du programme, Tes prochaines séances).
 */
export function retenirHabitudes(trainings: readonly SeanceLue[] | null | undefined, maintenant = new Date(), liens?: ReadonlyMap<string, string>): void {
  const c = cardioHabituel(trainings, maintenant);
  retenirHabitudeCardio(c ? { type: c.type, minutes: c.minutes, ...(c.pente !== undefined ? { pente: c.pente } : {}), ...(c.vitesse !== undefined ? { vitesse: c.vitesse } : {}), ...(c.niveau !== undefined ? { niveau: c.niveau } : {}) } : null);
  retenirAbdosHabituels(abdosHabituels(trainings, maintenant, liens));
}

/* ------------------------------------------------------------------------------------------------
 * La suggestion douce
 * ---------------------------------------------------------------------------------------------- */

export type GenreSuggestion = 'ajouter_cardio' | 'ajouter_abdos' | 'moins_abdos' | 'moins_cardio';

export type Suggestion =
  | { genre: 'ajouter_cardio'; type: TypeCardio; minutes: number; parSemaine?: number; fois: number }
  | { genre: 'ajouter_abdos'; parSemaine?: number; fois: number }
  | { genre: 'moins_abdos'; parSemaine?: number; passes: number }
  | { genre: 'moins_cardio'; parSemaine?: number; passes: number };

/** Une séance du programme faite : ce qui était prévu à la fin, ce qui a été fait */
export type SeanceSuivie = { abdosPrevus: boolean; cardioPrevu: boolean; abdosFaits: boolean; cardioFait: boolean };

/** Les séances faites de ton programme des 4 dernières semaines, avec ce qui était prévu (d'après ta fin de séance) */
export function seancesSuivies(
  faits: readonly { date: string; jourId: string; trainingId?: number }[] | null | undefined,
  trainings: readonly SeanceLue[],
  jourDe: (id: string) => Pick<JourProgramme, 'exos' | 'rounds' | 'cardio'> | null | undefined,
  fin: FinSeance | null | undefined,
  maintenant = new Date(),
): SeanceSuivie[] {
  const recentes = new Map(seancesRecentes(trainings, maintenant).filter((t) => typeof t.id === 'number').map((t) => [t.id as number, t]));
  const out: SeanceSuivie[] = [];
  for (const f of faits ?? []) {
    const t = typeof f.trainingId === 'number' ? recentes.get(f.trainingId) : undefined;
    const j = jourDe(f.jourId);
    if (!t || !j || !estJourMuscu(j)) continue;
    const ch = choixDuJour(fin, f.jourId);
    const exos = exosDe(t);
    out.push({
      abdosPrevus: caseCochee(ch, 'abdos') && !j.exos.some((e) => e.muscle === 'ABDOS'),
      cardioPrevu: caseCochee(ch, 'cardio') && !j.cardio,
      abdosFaits: exos.some(estAbdos),
      cardioFait: cardioFait(exos) !== null,
    });
  }
  return out;
}

/** Une fréquence par semaine tirée de ce que tu fais sur 4 semaines (au moins 1) ; undefined : à chaque séance */
export function frequenceDepuis(fois: number, seancesParSemaine: number): number | undefined {
  const n = Math.max(1, Math.round(fois / 4));
  return seancesParSemaine > 0 && n >= seancesParSemaine ? undefined : n;
}

export type Refus = Partial<Record<GenreSuggestion, string>>;

/** Encore en pause après un « Non merci » */
export function enPause(refus: Refus | null | undefined, genre: GenreSuggestion, maintenant = new Date()): boolean {
  const d = refus?.[genre];
  if (!d) return false;
  const t = new Date(`${d.slice(0, 10)}T12:00:00`).getTime();
  return Number.isFinite(t) && maintenant.getTime() - t < DELAI_REDEMANDE_JOURS * 86400000;
}

/**
 * La suggestion du moment, une seule, ou null. Ordre : cardio fait sans être prévu, abdos faits sans être prévus,
 * abdos prévus et passés, cardio prévu et passé. Au moins 3 fois sur les 4 dernières semaines.
 * `seancesParSemaine` : les séances de musculation de ta semaine (pour « à chaque séance »).
 */
export function suggestionDuMoment(c: {
  fin: FinSeance | null | undefined;
  trainings: readonly SeanceLue[];
  suivies: readonly SeanceSuivie[];
  seancesParSemaine: number;
  refus?: Refus | null;
  maintenant?: Date;
}): Suggestion | null {
  const maintenant = c.maintenant ?? new Date();
  const recentes = seancesRecentes(c.trainings, maintenant);
  const libre = (g: GenreSuggestion) => !enPause(c.refus, g, maintenant);
  const aCardio = avecCardio(c.fin) || Object.values({ ...(c.fin?.parJour ?? {}) }).some((x) => caseCochee(x, 'cardio'));
  const aAbdos = avecAbdos(c.fin) || Object.values({ ...(c.fin?.parJour ?? {}) }).some((x) => caseCochee(x, 'abdos'));

  if (!aCardio && libre('ajouter_cardio')) {
    const h = cardioHabituel(c.trainings, maintenant);
    if (h) return { genre: 'ajouter_cardio', type: h.type, minutes: h.minutes, fois: h.fois, ...(frequenceDepuis(h.fois, c.seancesParSemaine) ? { parSemaine: frequenceDepuis(h.fois, c.seancesParSemaine) } : {}) };
  }
  if (!aAbdos && libre('ajouter_abdos')) {
    const fois = recentes.filter((t) => exosDe(t).some(estAbdos)).length;
    if (fois >= SEUIL_HABITUDE) {
      const n = frequenceDepuis(fois, c.seancesParSemaine);
      return { genre: 'ajouter_abdos', fois, ...(n ? { parSemaine: Math.max(2, Math.min(3, n)) } : {}) };
    }
  }
  if (aAbdos && libre('moins_abdos')) {
    const passes = c.suivies.filter((s) => s.abdosPrevus && !s.abdosFaits).length;
    if (passes >= SEUIL_HABITUDE) {
      const actuel = c.fin?.abdosParSemaine;
      // à chaque séance ou 3 fois : 2 fois par semaine ; déjà 2 fois : les retirer
      return { genre: 'moins_abdos', passes, ...(actuel === undefined || actuel > 2 ? { parSemaine: 2 } : {}) };
    }
  }
  if (aCardio && libre('moins_cardio')) {
    const passes = c.suivies.filter((s) => s.cardioPrevu && !s.cardioFait).length;
    if (passes >= SEUIL_HABITUDE) {
      const actuel = c.fin?.cardioParSemaine;
      const n = actuel === undefined ? Math.max(1, Math.min(2, c.seancesParSemaine - 1)) : actuel - 1;
      return { genre: 'moins_cardio', passes, ...(n >= 1 ? { parSemaine: n } : {}) };
    }
  }
  return null;
}

/**
 * La fin de séance après « Oui » : seul ce que la suggestion propose change. Ton choix séance par séance reste.
 * `moins_*` sans fréquence : l'ajout est retiré.
 */
export function finAvecSuggestion(f: FinSeance | null | undefined, s: Suggestion): FinSeance {
  const base: FinSeance = f ? { ...f } : { choix: 'rien', minutes: 30 };
  const { parFrequence: _pf, ...reste } = base;
  const abdos = avecAbdos(reste);
  const cardio = avecCardio(reste);
  const choix = (a: boolean, c: boolean) => (a && c ? 'les_deux' : a ? 'abdos' : c ? 'cardio' : 'rien') as FinSeance['choix'];
  const sans = <K extends keyof FinSeance>(o: FinSeance, k: K): FinSeance => {
    const { [k]: _x, ...r } = o;
    return r as FinSeance;
  };
  switch (s.genre) {
    case 'ajouter_cardio': {
      const o: FinSeance = { ...reste, choix: choix(abdos, true), minutes: s.minutes, cardioType: s.type };
      return s.parSemaine ? { ...o, cardioParSemaine: s.parSemaine } : sans(o, 'cardioParSemaine');
    }
    case 'ajouter_abdos': {
      const o: FinSeance = { ...reste, choix: choix(true, cardio) };
      return s.parSemaine ? { ...o, abdosParSemaine: s.parSemaine } : sans(o, 'abdosParSemaine');
    }
    case 'moins_abdos':
      return s.parSemaine ? { ...reste, abdosParSemaine: s.parSemaine } : sans({ ...reste, choix: choix(false, cardio) }, 'abdosParSemaine');
    case 'moins_cardio':
      return s.parSemaine ? { ...reste, cardioParSemaine: s.parSemaine } : sans({ ...reste, choix: choix(abdos, false) }, 'cardioParSemaine');
  }
}

/* ------------------------------------------------------------------------------------------------
 * Les « Non merci », gardés et partagés avec tes appareils
 * ---------------------------------------------------------------------------------------------- */

export const CLE_HABITUDES_FIN = 'yoroi_habitudes_fin_v1';

export function nettoyerRefus(x: unknown): Refus {
  const out: Refus = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const g of ['ajouter_cardio', 'ajouter_abdos', 'moins_abdos', 'moins_cardio'] as GenreSuggestion[]) {
    const v = (x as Record<string, unknown>)[g];
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) out[g] = v.slice(0, 10);
  }
  return out;
}

export async function chargerRefus(): Promise<Refus> {
  try {
    const raw = await AsyncStorage.getItem(CLE_HABITUDES_FIN);
    return raw ? nettoyerRefus(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** « Non merci » (et « Oui » : la même suggestion ne revient pas tout de suite) */
export async function noterReponse(genre: GenreSuggestion, maintenant = new Date()): Promise<Refus> {
  const r = { ...(await chargerRefus()), [genre]: jourIso(maintenant) };
  try {
    await AsyncStorage.setItem(CLE_HABITUDES_FIN, JSON.stringify(r));
    signalerASynchroniser();
  } catch {
    // la suggestion reviendra, rien n'est appliqué sans toi
  }
  return r;
}

