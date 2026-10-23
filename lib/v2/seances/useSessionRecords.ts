/**
 * Records de seance pour les ecrans qui n'ont pas deja les seances (Carnet) :
 * memes seances dedoublonnees et meme calcul que l'onglet Seances (lib/v2/seances/records.ts).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getTrainings } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { dedupeTrainings } from './dedupe';
import { computeRecords } from './records';
import type { RecordsResult } from './records';

export function useSessionRecords(refreshKey?: number): { records: RecordsResult | null; loaded: boolean } {
  const [records, setRecords] = useState<RecordsResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      const t = await getTrainings();
      setRecords(computeRecords(dedupeTrainings(t ?? [])));
    } catch (err) {
      logger.warn('Records des séances indisponibles', err);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load, refreshKey]);
  return { records, loaded };
}
