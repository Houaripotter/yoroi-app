/**
 * Les blocs de l'accueil en grand écran (1er novembre 2026, Houari sur son MacBook : « Sincèrement, sur le côté on
 * peut augmenter des choses ou rajouter des choses, non ? »). Sur Mac et iPad, l'accueil garde de la place : six
 * blocs en plus, faits de données qui existent déjà, rien d'inventé. Jamais sur iPhone.
 *   Ton programme        : la bande des 7 jours de ton programme en cours (A ou B, tampons)
 *   Ta semaine travaille : la carte rouge des muscles de ta semaine
 *   Forme du matin       : ton dernier score et tes 5 curseurs (seulement si tu as déjà répondu)
 *   Tes records récents  : tes 3 derniers records battus
 *   Ton poids sur 7 jours: ta moyenne de la semaine, l'écart avec la semaine d'avant, ta composition si ta balance la donne
 *   Tes cartes à partager: 3 vignettes de ta bibliothèque de cartes
 * Chaque bloc se cache dans Personnalise ton accueil, Tes blocs, partie « En grand écran ». Mémorisé à part de la
 * disposition de l'iPhone (yoroi.accueil.disposition.v36 inchangée) : l'iPhone ne bouge pas.
 * Calculs purs testés dans __tests__/unit/blocsGrandEcran.test.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Training, Weight } from '@/lib/database';
import { computeRecords, formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { traduire } from '@/lib/i18n/tr';

export type BlocGrandEcran = 'programme' | 'muscles' | 'forme_matin' | 'records' | 'poids7' | 'cartes';

export const BLOCS_GRAND_ECRAN: { id: BlocGrandEcran; titre: string; aide: string }[] = [
  { id: 'programme', titre: traduire('Ton programme'), aide: traduire('tes 7 jours, A ou B, les séances faites') },
  { id: 'muscles', titre: traduire('Ta semaine travaille'), aide: traduire('la carte de tes muscles de la semaine') },
  { id: 'forme_matin', titre: traduire('Ta forme du matin'), aide: traduire('ton score et tes 5 réponses, si tu as répondu') },
  { id: 'records', titre: traduire('Tes records récents'), aide: traduire('tes 3 derniers records battus') },
  { id: 'poids7', titre: traduire('Ton poids sur 7 jours'), aide: traduire('ta moyenne, l’écart avec la semaine d’avant, ta composition') },
  { id: 'cartes', titre: traduire('Tes cartes à partager'), aide: traduire('3 cartes de ta bibliothèque, prêtes à poster') },
];

const IDS = new Set<string>(BLOCS_GRAND_ECRAN.map((b) => b.id));
const CLE = 'yoroi.accueil.blocs_grand_ecran.v1';
const EVENEMENT = 'YOROI_ACCUEIL_BLOCS_GRAND_ECRAN';

/** Les blocs cachés, lus strictement (inconnus écartés, sans doublon) */
export function cachesPropres(v: unknown): BlocGrandEcran[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.filter((x): x is BlocGrandEcran => typeof x === 'string' && IDS.has(x))));
}

export function basculerBloc(caches: readonly BlocGrandEcran[], id: BlocGrandEcran): BlocGrandEcran[] {
  return caches.includes(id) ? caches.filter((x) => x !== id) : [...caches, id];
}

let memo: BlocGrandEcran[] | null = null;

export async function lireCachesGrandEcran(): Promise<BlocGrandEcran[]> {
  if (memo) return memo;
  try {
    const raw = await AsyncStorage.getItem(CLE);
    memo = cachesPropres(raw ? JSON.parse(raw) : []);
  } catch {
    memo = [];
  }
  return memo;
}

export async function ecrireCachesGrandEcran(caches: BlocGrandEcran[]): Promise<void> {
  memo = cachesPropres(caches);
  DeviceEventEmitter.emit(EVENEMENT, memo);
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(memo));
  } catch {
    // le choix reste valable pour la session
  }
}

/** Les blocs grand écran cachés, partagés entre l'accueil et Tes blocs */
export function useBlocsGrandEcran(): { caches: BlocGrandEcran[]; basculer: (id: BlocGrandEcran) => void } {
  const [caches, setCaches] = useState<BlocGrandEcran[]>(memo ?? []);
  useEffect(() => {
    let vivant = true;
    lireCachesGrandEcran().then((c) => vivant && setCaches(c));
    const sub = DeviceEventEmitter.addListener(EVENEMENT, (c: BlocGrandEcran[]) => setCaches(c));
    return () => {
      vivant = false;
      sub.remove();
    };
  }, []);
  const basculer = useCallback((id: BlocGrandEcran) => {
    setCaches((avant) => {
      const n = basculerBloc(avant, id);
      void ecrireCachesGrandEcran(n);
      return n;
    });
  }, []);
  return { caches, basculer };
}

/* ---------------------------------- Tes records récents ---------------------------------- */

export type RecordRecent = { cle: string; titre: string; valeur: string; date: string };

/** Tes `n` derniers records battus (records mineurs écartés), du plus récent au plus ancien, jamais dans le futur */
export function recordsRecents(trainings: Training[], aujourdhui: string, unite: UnitePoids = 'kg', n = 3): RecordRecent[] {
  let r: ReturnType<typeof computeRecords>;
  try {
    r = computeRecords(trainings);
  } catch {
    return [];
  }
  const out: RecordRecent[] = [];
  for (const x of r.recent) {
    if (out.length >= n) break;
    if (x.line.minor || x.point.date.slice(0, 10) > aujourdhui) continue;
    try {
      out.push({ cle: `${x.line.key}|${x.point.date}`, titre: recordShortTitle(x.line), valeur: formatRecordValue(x.line, x.point.value, unite).main, date: x.point.date.slice(0, 10) });
    } catch {
      // un record illisible est ignoré
    }
  }
  return out;
}

/* ---------------------------------- Ton poids sur 7 jours ---------------------------------- */

type Point = { date: string; value: number };

const jour = (s: string) => Math.round(new Date(`${s.slice(0, 10)}T12:00:00`).getTime() / 86400000);

export type PoidsSemaine = {
  /** moyenne de tes pesées des 7 derniers jours (aujourd'hui compris), en kg */
  moyenne: number;
  /** nombre de pesées de ces 7 jours */
  pesees: number;
  /** moyenne des 7 jours d'avant, null sans pesée */
  avant: number | null;
  /** ta dernière composition (30 jours au plus), si ta balance la donne */
  composition: { gras: number | null; muscle: number | null; eau: number | null; date: string } | null;
};

/** Ta moyenne de la semaine et celle d'avant ; null sans pesée ces 7 derniers jours */
export function poidsSemaine(series: readonly Point[], brutes: readonly Pick<Weight, 'date' | 'fat_percent' | 'muscle_percent' | 'water_percent'>[], aujourdhui: string): PoidsSemaine | null {
  const t = jour(aujourdhui);
  const ok = series.filter((p) => Number.isFinite(p.value) && p.value > 0 && jour(p.date) <= t);
  const semaine = ok.filter((p) => t - jour(p.date) < 7);
  if (!semaine.length) return null;
  const avantL = ok.filter((p) => t - jour(p.date) >= 7 && t - jour(p.date) < 14);
  const moy = (l: Point[]) => l.reduce((s, p) => s + p.value, 0) / l.length;
  const bon = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 100 ? Math.round(v * 10) / 10 : null);
  const avecCompo = brutes
    .filter((w) => w && w.date && jour(w.date) <= t && t - jour(w.date) <= 30 && (bon(w.fat_percent) !== null || bon(w.muscle_percent) !== null))
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return {
    moyenne: Math.round(moy(semaine) * 10) / 10,
    pesees: semaine.length,
    avant: avantL.length ? Math.round(moy(avantL) * 10) / 10 : null,
    composition: avecCompo ? { gras: bon(avecCompo.fat_percent), muscle: bon(avecCompo.muscle_percent), eau: bon(avecCompo.water_percent), date: avecCompo.date.slice(0, 10) } : null,
  };
}
