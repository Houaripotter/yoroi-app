/**
 * Historique des anneaux pour l'ecran « Tes anneaux » (app/sante/anneaux.tsx), 19 octobre 2026.
 * Lit les pas, l'exercice et les calories actives sur n jours (Apple Sante sur iPhone, Health Connect sur Android,
 * ce qui est deja garde sur le telephone en mode demo ou sans Sante), une seule fois grace au cache de
 * lib/v2/sante/anneauxJours.ts ; les series deja lues par l'accueil s'affichent tout de suite et priment.
 * Tes seances YOROI comptent dans l'exercice, comme sur l'accueil. Objectifs : ceux de l'ecran Sante.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { demoActive } from '@/lib/v2/demo/garde';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { logger } from '@/lib/security/logger';
import { DEFAULT_GOALS, getRingGoals, getSanteSource, loadSeries } from './data';
import type { RingGoals } from './data';
import { fusionnerSeries, lireAnneauxCache, seriesDeLAccueil, viderCacheAnneaux } from './anneauxJours';
import type { SeriesJour } from './anneauxJours';

export type HistoriqueAnneaux = {
  series: SeriesJour;
  trainings: Training[];
  goals: RingGoals;
  /** Sante (ou Health Connect) est reliee et lue en direct */
  direct: boolean;
  chargement: boolean;
  actualiser: () => Promise<void>;
};

export function useAnneauxHistorique(jours: number): HistoriqueAnneaux {
  const [series, setSeries] = useState<SeriesJour>(() => fusionnerSeries(null, seriesDeLAccueil()));
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [goals, setGoals] = useState<RingGoals>(DEFAULT_GOALS);
  const [direct, setDirect] = useState(false);
  const [chargement, setChargement] = useState(true);
  const vivant = useRef(true);

  const lireSeances = useCallback(async () => {
    try {
      const l = await getTrainings(Math.min(400, jours + 7));
      if (vivant.current) setTrainings(dedupeTrainings(l ?? []));
    } catch (e) {
      logger.warn('[Anneaux] seances indisponibles', e);
    }
  }, [jours]);

  const lire = useCallback(async () => {
    try {
      const source = await getSanteSource();
      const demo = await demoActive().catch(() => false);
      const isLive = source.mode === 'live' && !demo;
      const hist = await lireAnneauxCache({
        jours,
        source: `${isLive ? 'direct' : 'local'}:${Platform.OS}`,
        lire: (cle, n) => loadSeries(cle, n, isLive),
      });
      if (!vivant.current) return;
      setDirect(isLive);
      setSeries(fusionnerSeries(hist, seriesDeLAccueil()));
    } catch (e) {
      logger.warn('[Anneaux] historique indisponible', e);
    } finally {
      if (vivant.current) setChargement(false);
    }
  }, [jours]);

  useEffect(() => {
    vivant.current = true;
    getRingGoals()
      .then((g) => vivant.current && setGoals(g))
      .catch(() => {});
    void lire();
    void lireSeances();
    // une seance notee ou supprimee change l'exercice : on relit les seances (Sante reste en cache)
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, () => void lireSeances());
    return () => {
      vivant.current = false;
      sub.remove();
    };
  }, [lire, lireSeances]);

  const actualiser = useCallback(async () => {
    viderCacheAnneaux();
    setChargement(true);
    await Promise.all([lire(), lireSeances()]);
  }, [lire, lireSeances]);

  return { series, trainings, goals, direct, chargement, actualiser };
}
