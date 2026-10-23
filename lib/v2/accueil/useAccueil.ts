/**
 * Chargement de toutes les donnees de l'accueil, rechargees au retour sur l'ecran
 * et a chaque changement ailleurs dans l'app (pesee, seance, armure, espace, eau).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile, getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getSleepEntries, getSleepGoal } from '@/lib/sleepService';
import type { SleepEntry } from '@/lib/sleepService';
import { getDailyQuote } from '@/lib/citations';
import { logger } from '@/lib/security/logger';
import { ARMURE_CHANGED_EVENT, getArmureState } from '@/lib/v2/armure';
import type { ArmureState } from '@/lib/v2/armure';
import { DEFAULT_ESPACE, ESPACE_CHANGED_EVENT, getEspace } from '@/lib/v2/espace';
import type { Espace } from '@/lib/v2/espace';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { safeComputeForme } from './forme';
import type { FormeResult } from './forme';
import { HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT, loadHydration, localISO } from './hydration';
import type { HydrationState } from './hydration';
import { findLastRecord, getNextCompetition, getNextSession } from './home';
import type { LastRecord, NextCompetition, NextSession } from './home';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';

export type AccueilData = {
  espace: Espace;
  armure: ArmureState | null;
  name: string | null;
  femme: boolean;
  /** poids vise dans le profil, null si aucun objectif */
  targetWeight: number | null;
  /** poids de depart du profil, null s'il n'est pas renseigne (la carte Poids prend alors la premiere pesee) */
  startWeight: number | null;
  photo: string | null;
  trainings: Training[];
  next: NextSession | null;
  forme: FormeResult | null;
  sleep: { entries: SleepEntry[]; goal: number };
  hydration: HydrationState;
  quote: string | null;
  record: LastRecord | null;
  competition: NextCompetition | null;
  ready: boolean;
};

const EMPTY: AccueilData = {
  espace: DEFAULT_ESPACE,
  armure: null,
  name: null,
  femme: false,
  targetWeight: null,
  startWeight: null,
  photo: null,
  trainings: [],
  next: null,
  forme: null,
  sleep: { entries: [], goal: 480 },
  hydration: { amount: 0, goal: 2.5, history: [] },
  quote: null,
  record: null,
  competition: null,
  ready: false,
};

/** Une source qui ne repond pas ne bloque jamais tout l'accueil : au bout de 6 secondes, sa valeur par defaut */
const SOURCE_TIMEOUT_MS = 6000;

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const late = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        logger.warn('Accueil : une donnée met trop de temps à charger, valeur par défaut');
        resolve(fallback);
      }, SOURCE_TIMEOUT_MS);
    });
    return await Promise.race([p, late]);
  } catch (err) {
    logger.warn('Accueil : une donnée n’a pas pu être chargée', err);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Un calcul qui echoue (donnee mal formee) ne doit jamais vider tout l'accueil */
function safeSync<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    logger.warn('Accueil : un calcul n’a pas pu être fait', err);
    return fallback;
  }
}

export function useAccueil() {
  const [data, setData] = useState<AccueilData>(EMPTY);
  const busy = useRef(false);
  // 14 octobre : un changement arrive pendant un chargement (la nouvelle scene tiree au retour au premier plan)
  // n'est plus perdu : on recharge une fois de plus a la fin
  const encore = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    if (busy.current) {
      encore.current = true;
      return;
    }
    busy.current = true;
    encore.current = false;
    try {
      const [espace, armure, profile, trainings, forme, entries, goal, hydration, quote, competition] = await Promise.all([
        safe(getEspace(), DEFAULT_ESPACE),
        safe(getArmureState(), null as ArmureState | null),
        safe(getProfile(), null),
        safe(getTrainings().then((l) => dedupeTrainings(l ?? [])), [] as Training[]),
        safe(safeComputeForme(), null as FormeResult | null),
        safe(getSleepEntries(), [] as SleepEntry[]),
        safe(getSleepGoal(), 480),
        safe(loadHydration(), EMPTY.hydration),
        safe(getDailyQuote().then((q) => q?.text ?? null), null as string | null),
        safe(getNextCompetition(), null),
      ]);
      const list = trainings ?? [];
      const today = localISO();
      const next = await safe(getNextSession(list.some((t) => t.date.slice(0, 10) === today)), null);
      setData({
        espace,
        armure,
        name: profile?.name?.trim().split(' ')[0] || null,
        femme: profile?.avatar_gender === 'femme',
        targetWeight: profile?.target_weight && profile.target_weight > 0 ? profile.target_weight : null,
        startWeight: profile?.start_weight && profile.start_weight > 0 ? profile.start_weight : null,
        photo: profile?.profile_photo || null,
        trainings: list,
        next,
        forme,
        sleep: { entries: [...(entries ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)), goal: goal || 480 },
        hydration,
        quote,
        record: safeSync(() => findLastRecord(list), null),
        competition,
        ready: true,
      });
    } finally {
      busy.current = false;
    }
    if (encore.current) {
      encore.current = false;
      await load();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const subs = [DATA_CHANGED_EVENT, ARMURE_CHANGED_EVENT, ESPACE_CHANGED_EVENT, HYDRATION_GOAL_EVENT].map((e) => DeviceEventEmitter.addListener(e, load));
    const water = DeviceEventEmitter.addListener(HYDRATION_AMOUNT_EVENT, (p?: { amountMl?: number }) => {
      if (p && typeof p.amountMl === 'number') setData((d) => ({ ...d, hydration: { ...d.hydration, amount: (p.amountMl as number) / 1000 } }));
    });
    return () => {
      subs.forEach((s) => s.remove());
      water.remove();
    };
  }, [load]);

  return { data, reload: load, setData };
}
