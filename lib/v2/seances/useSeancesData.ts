/**
 * Donnees de l'espace Seances : seances, records, personnage, planning de la semaine.
 * Recharge a chaque retour sur l'ecran et apres chaque enregistrement (YOROI_DATA_CHANGED).
 */
import { useCallback, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getCompetitions, getProfile, getTrainings, getWeeklyPlan, getSlotOccurrences, ensureCurrentWeekOccurrences, nettoyerClubsOrphelins } from '@/lib/database';
import type { Competition, SlotOccurrence, Training, WeeklyPlan } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { computeRecords } from './records';
import { dedupeTrainings } from './dedupe';
import { slotWeekStart } from './sessionData';
import { garderSiIdentique } from '@/lib/v2/perf/garderSiIdentique';

export type Gender = 'homme' | 'femme';

/** Liens vers des clubs supprimes avant le 18/10/2026 : retires une fois par lancement de l'app */
let orphelinsNettoyes = false;

export function useSeancesData() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [plan, setPlan] = useState<WeeklyPlan[]>([]);
  const [occurrences, setOccurrences] = useState<SlotOccurrence[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [gender, setGender] = useState<Gender>('homme');
  // 0 tant que l'utilisateur n'a pas choisi son objectif
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [favoris, setFavoris] = useState<string[]>([]);
  // vague 28 : jours choisis a l'onboarding ou dans les Reglages (0 = lundi)
  const [typeDays, setTypeDays] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!orphelinsNettoyes) {
      orphelinsNettoyes = true;
      try {
        await nettoyerClubsOrphelins();
      } catch {
        // nettoyage facultatif
      }
    }
    try {
      const [t, p, esp] = await Promise.all([getTrainings(), getProfile().catch(() => null), getEspace().catch(() => null)]);
      // Une seance YOROI relue depuis Sante n'apparait qu'une fois
      // 1er novembre 2026 : rien de change, meme tableau, les records et les calculs de la semaine ne sont pas refaits
      const relues = dedupeTrainings(t ?? []);
      setTrainings((avant) => garderSiIdentique(avant, relues));
      const g = esp?.personnage?.startsWith('guerrier_f') ? 'femme' : p?.avatar_gender === 'femme' ? 'femme' : 'homme';
      setGender(g);
      setWeeklyGoal(objectifVise(esp));
      setFavoris((avant) => garderSiIdentique(avant, esp?.sportsFavoris ?? []));
      setTypeDays((avant) => garderSiIdentique(avant, esp?.joursSemaine ?? []));
    } catch (err) {
      logger.error('Chargement des séances impossible', err);
    }
    try {
      await ensureCurrentWeekOccurrences().catch(() => {});
      const [wp, occ, comps] = await Promise.all([getWeeklyPlan(), getSlotOccurrences(slotWeekStart()), getCompetitions().catch(() => [] as Competition[])]);
      setPlan((avant) => garderSiIdentique(avant, wp ?? []));
      setOccurrences((avant) => garderSiIdentique(avant, occ ?? []));
      setCompetitions((avant) => garderSiIdentique(avant, comps ?? []));
    } catch (err) {
      logger.error('Chargement du planning impossible', err);
    }
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
      return () => sub.remove();
    }, [load]),
  );

  const records = useMemo(() => computeRecords(trainings), [trainings]);

  return { trainings, plan, occurrences, competitions, gender, weeklyGoal, favoris, typeDays, records, loaded, reload: load };
}
