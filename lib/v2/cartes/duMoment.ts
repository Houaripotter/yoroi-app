/**
 * Cartes du moment (15 octobre 2026) : la feuille « Partager » de l'Accueil.
 * Houari : « il faut un endroit sur l'Accueil pour les partager rapidement ».
 * Le raccourci Partager ouvre tes cartes pretes : ta derniere seance, ton record ou ton palier tout frais,
 * ton compteur de l'annee, ta semaine, ta pesee qui progresse. Tout vient des vraies donnees (charger.ts).
 * Une petite pastille sur le raccourci quand une carte vient d'etre debloquee (record, palier, objectif),
 * jusqu'a ce que tu ouvres la feuille.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainings } from '@/lib/database';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { logger } from '@/lib/security/logger';
import { chargerExploitsPesee, chargerExploitsSeance, chargerSeance, chargerSemaine } from './charger';
import { isoJour, lundiDe } from './moments';
import type { CarteData, TypeExploit } from './types';

/** Ce qui merite la pastille : un record, un palier franchi, un objectif tenu */
export const TYPES_NOUVEAUTE: TypeExploit[] = [
  'record_charge',
  'record_distance',
  'record_allure',
  'record_rounds',
  'palier_total',
  'palier_mois',
  'semaine_objectif',
  'serie_semaines',
  'annee_palier',
  'annee_atteinte',
  'plus_bas',
  'palier_poids',
  'objectif_poids',
];

/** Une carte reste « nouvelle » pendant 3 jours */
export const JOURS_NOUVEAUTE = 3;
/** Au plus 6 cartes dans la feuille */
export const MAX_DU_MOMENT = 6;

const VUS_KEY = 'yoroi_cartes_raccourci_vus_v1';

function rang(c: CarteData): number {
  if (c.moment === 'seance') return 0;
  const e = c.exploit;
  if (!e) return c.moment === 'semaine' ? 40 : 50;
  if (e.record) return 10;
  if (e.type === 'palier_total' || e.type === 'palier_mois' || e.type === 'annee_palier' || e.type === 'annee_atteinte' || e.type === 'objectif_poids' || e.type === 'palier_poids') return 20;
  if (e.type === 'annee_progression' || e.type === 'compteur') return 30;
  if (e.type === 'semaine_objectif' || e.type === 'serie_semaines') return 35;
  return 45;
}

/**
 * Les cartes du moment, dans l'ordre de la feuille : la derniere seance, puis les records, les paliers,
 * le compteur de l'annee, la semaine, le reste. Sans doublon, au plus MAX_DU_MOMENT.
 */
export function ordonnerDuMoment(o: { seance: CarteData | null; semaine: CarteData | null; exploits: CarteData[] }): CarteData[] {
  const tout = [o.seance, ...o.exploits, o.semaine].filter((c): c is CarteData => !!c);
  const vus = new Set<string>();
  const uniques = tout.filter((c) => (vus.has(c.cle) ? false : (vus.add(c.cle), true)));
  return uniques
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rang(a.c) - rang(b.c) || (a.c.exploit?.priorite ?? 0) - (b.c.exploit?.priorite ?? 0) || a.i - b.i)
    .map((x) => x.c)
    .slice(0, MAX_DU_MOMENT);
}

function joursEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** Les cles des cartes tout juste debloquees (moins de 3 jours) que tu n'as pas encore vues dans la feuille */
export function nouveautes(cartes: CarteData[], vus: string[], aujourdhui: string): string[] {
  return cartes
    .filter((c) => {
      const e = c.exploit;
      if (!e || !TYPES_NOUVEAUTE.includes(e.type)) return false;
      const j = joursEntre(e.date.slice(0, 10), aujourdhui);
      return j >= 0 && j < JOURS_NOUVEAUTE && !vus.includes(c.cle);
    })
    .map((c) => c.cle);
}

export async function lireVusRaccourci(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(VUS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Retient les cartes vues (on garde les 60 dernieres) */
export async function marquerVusRaccourci(cles: string[]): Promise<void> {
  if (!cles.length) return;
  try {
    const avant = await lireVusRaccourci();
    const tout = [...avant.filter((c) => !cles.includes(c)), ...cles].slice(-60);
    await AsyncStorage.setItem(VUS_KEY, JSON.stringify(tout));
  } catch {
    // au pire la pastille reviendrait une fois
  }
}

/** Une lecture qui traine ne bloque jamais la feuille : au bout de `ms`, la valeur de repli */
function auPlus<T>(p: Promise<T>, repli: T, ms = 6000): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(repli), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(repli);
      },
    );
  });
}

/** Lit tes vraies donnees : la derniere seance et ses exploits, ta derniere pesee, ta semaine (ou la precedente) */
export async function chargerDuMoment(now: Date = new Date()): Promise<CarteData[]> {
  try {
    const trainings = dedupeTrainings((await auPlus(getTrainings(400), [])) ?? []).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
    const derniere = trainings.find((t) => !!t.id);
    const [seance, exploitsSeance, exploitsPesee] = await Promise.all([
      derniere?.id ? auPlus(chargerSeance(derniere.id), null) : Promise.resolve(null),
      derniere?.id ? auPlus(chargerExploitsSeance(derniere.id), [] as CarteData[]) : Promise.resolve([] as CarteData[]),
      auPlus(chargerExploitsPesee(), [] as CarteData[]),
    ]);
    // la pesee ne compte que si elle est recente (moins de 7 jours)
    const auj = isoJour(now);
    const pesee = exploitsPesee.filter((c) => !c.exploit || joursEntre(c.exploit.date.slice(0, 10), auj) <= 7);
    let semaine = await auPlus(chargerSemaine(lundiDe(now), { trainings }), null);
    if (!semaine) semaine = await auPlus(chargerSemaine(lundiDe(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12)), { trainings }), null);
    return ordonnerDuMoment({ seance, semaine, exploits: [...exploitsSeance, ...pesee] });
  } catch (e) {
    logger.warn('[cartes] du moment', e);
    return [];
  }
}
