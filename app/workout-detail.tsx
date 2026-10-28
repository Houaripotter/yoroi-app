/**
 * Detail d'une seance v2 : resume, records, exercices et series, rounds de combat,
 * cardio (frequence cardiaque, zones, allure, intermediaires, trace GPS, meteo),
 * notes, et actions modifier, partager, supprimer.
 * Parametres : id (seance), demo=1 (exemple de course pour les captures).
 */
import { couleurNote, noteSeance } from '@/lib/v2/seance/note';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, Image, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { lienBilan } from '@/lib/v2/bilan/reglage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { MuscleWorked } from '@/components/yoroi/v2/seances/MuscleWorked';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { deleteTraining, getTrainingById, getTrainings, updateTrainingDetails } from '@/lib/database';
import type { CombatRound, Training } from '@/lib/database';
import type { HeartRateSample, WorkoutDetails } from '@/lib/healthConnect.ios';
import { healthConnect } from '@/lib/healthConnect';
import { calcZoneDurations, getEffectiveHRZones } from '@/lib/hrZones';
import type { HRZoneThresholds } from '@/lib/hrZones';
import { getUserSettings } from '@/lib/storage';
import { markAppleZonesNoticeShown, refreshTrainingAppleZones } from '@/lib/appleZonesSync';
import { shouldShowAppleNotice } from '@/lib/v2/seances/appleZonesSync';
import { SPORTS } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { accordSouleve, durationOf, formatDuration, setsCount, tonnage, tonnageParts } from '@/lib/v2/trainingWeek';
import { formatKg } from '@/lib/v2/weightStats';
import {
  endTime, estimatedMax, familyOf, formatClock, isCombat, longDate, parseExercises, parseRounds, sessionTitle, tileColor, workSets,
} from '@/lib/v2/seances/sessionData';
import { computeRecords, formatRecordValue, recordsOfTraining } from '@/lib/v2/seances/records';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { libelleUnite, versUnitePoids } from '@/lib/v2/unitePoids';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { HrChart } from '@/components/yoroi/v2/seances/HrChart';
import { RouteHero } from '@/components/yoroi/v2/seances/RouteHero';
import { appleDuration, applePace, hrStats, lowerBounds } from '@/lib/v2/seances/workoutMath';
import { appleTemperature, appleHumidity, clockOf, zoneClock, zoneRangeLabel } from '@/lib/v2/seances/appleExtras';
import { BackButton, BigButton, EmptyState, Glass, Hanko, RoundIcon, SectionTitle, Stat, tap } from '@/components/yoroi/v2/seances/ui';
import { EnregistrerSeance } from '@/components/yoroi/v2/seance/fin/EnregistrerSeance';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { INTENSITES } from '@/lib/v2/intensite';
import { P, blancA } from '@/components/yoroi/livePalette';
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { traduire, traduirePluriel, LANG, LOCALE, DECIMAL } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
// Vague 32 : zones sur l'echelle d'intensite commune (lib/v2/intensite.ts), plus de rouge
const ZONE_INK = INTENSITES.map((x) => x.fill);
const ZONE_LABEL = [traduire('Récupération'), traduire('Endurance'), traduire('Tempo'), traduire('Seuil'), traduire('Maximum')];

// Exemple de course, uniquement pour demo=1 (captures d'ecran). 14 octobre 2026 : reprend la course
// de Houari du 25 septembre a Bamako (valeurs Apple : 15:39, 2,26 km, 179 kcal, 12 m, 154 bpm).
function demoTraining(): Training {
  return {
    id: 0,
    sport: 'running',
    session_type: 'course',
    date: '2026-09-25',
    start_time: '16:48',
    duration_minutes: 16,
    distance: 2.26,
    calories: 179,
    heart_rate: 154,
    max_heart_rate: 167,
    intensity: 7,
    is_outdoor: true,
    source: 'apple_watch',
    notes: traduire('Exemple de séance, pour découvrir l’écran.'),
  };
}

function demoDetails(_t: Training, apple = false): WorkoutDetails {
  const start = Date.parse('2026-09-25T16:48:12');
  const durSec = 939.6;
  const samples: HeartRateSample[] = [];
  // courbe proche de la vraie : montee de 100 a 158 en 2 min 30, plateau 152 a 162, creux a 128 vers 16:57
  let seed = 11;
  for (let t = 2; t < durSec; t += 4 + (t % 3)) {
    seed = (seed * 16807) % 2147483647;
    const noise = ((seed % 7) - 3) * 0.6;
    let v = t < 150 ? 100 + (t / 150) * 58 : 157 + 4 * Math.sin(t / 55);
    if (t > 480 && t < 600) v -= 26 * Math.sin(((t - 480) / 120) * Math.PI);
    samples.push({ timestamp: new Date(start + t * 1000).toISOString(), bpm: Math.round(v + noise) });
  }
  // trace en huit autour d'un point de Bamako, depart et arrivee proches
  const c = { lat: 12.6392, lon: -8.0029 };
  const routePoints = Array.from({ length: 160 }, (_, i) => {
    const u = (i / 159) * Math.PI * 2;
    return { latitude: c.lat + 0.0021 * Math.sin(u) * Math.cos(u) * 1.6, longitude: c.lon + 0.0032 * Math.sin(u) + 0.0004 * (i / 159), timestamp: new Date(start + (i / 159) * durSec * 1000).toISOString() };
  });
  return {
    cacheVersion: 9,
    workoutStart: new Date(start).toISOString(),
    workoutEnd: new Date(start + durSec * 1000).toISOString(),
    durationSeconds: durSec,
    durationMinutes: durSec / 60,
    distanceMeters: 2263.4,
    distanceKm: 2.26,
    heartRateSamples: samples,
    avgHeartRate: 154,
    minHeartRate: 99,
    maxHeartRate: 167,
    activeCalories: 179,
    totalCalories: 210,
    avgPaceSecondsPerKm: 415,
    elevationAscended: 12,
    cadence: 150,
    avgPowerWatts: 238,
    isIndoor: false,
    weatherTemp: 29,
    weatherHumidity: 71,
    routePoints,
    startLatitude: routePoints[0].latitude,
    startLongitude: routePoints[0].longitude,
    city: 'Bamako',
    recoveryHR: { atEnd: 158, after1Min: 136, after2Min: 119 },
    splits: [
      { index: 1, distanceKm: 1, paceSecondsPerKm: 409, durationSeconds: 409, elevationGain: 0, avgHeartRate: 150, avgPowerWatts: 236 },
      { index: 2, distanceKm: 1, paceSecondsPerKm: 421, durationSeconds: 421, elevationGain: 0, avgHeartRate: 156, avgPowerWatts: 233 },
      { index: 3, distanceKm: 0.263, paceSecondsPerKm: 418, durationSeconds: 110, elevationGain: 0, avgHeartRate: 158, avgPowerWatts: 240 },
    ],
    groundContactMs: { avg: 295, min: 242, max: 346 },
    strideLengthM: { avg: 0.9, min: 0.7, max: 1.1 },
    verticalOscCm: { avg: 9.8, min: 9.1, max: 10.8 },
    effortScore: 5,
    effortEstimated: true,
    // demo=1&scen=apple : ce qu'affiche l'ecran quand iOS 27 donne les zones d'Apple
    appleZones: apple ? { source: 'system', lowers: [120, 136, 151, 170], seconds: [8, 43, 232, 726, 0] } : undefined,
  };
}

function effortLabel(v: number): string {
  if (v <= 2) return traduire('très léger');
  if (v <= 3) return traduire('léger');
  if (v <= 4) return 'facile';
  if (v <= 6) return traduire('modéré');
  if (v <= 7) return 'intense';
  if (v <= 8) return traduire('très intense');
  return traduire('extrême');
}


export default function WorkoutDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string; demo?: string; scen?: string }>();
  const { gender } = useSeancesData();
  // 18 octobre 2026 : charges et tonnage dans l'unite du reglage (kg ou lb), stockage en kilos
  const unite = useUnitePoids();
  const uL = libelleUnite(unite);
  const cv = (kg: number) => versUnitePoids(kg, unite);

  const [training, setTraining] = useState<Training | null>(null);
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userZones, setUserZones] = useState<HRZoneThresholds | null>(null);
  const [allTrainings, setAllTrainings] = useState<Training[]>([]);
  const [mapFull, setMapFull] = useState(false);
  // 14 octobre 2026 (ios27) : « Tes zones viennent d'Apple Santé », une seule fois
  const [appleNotice, setAppleNotice] = useState(false);
  useEffect(() => {
    getUserSettings().then((s) => setAppleNotice(shouldShowAppleNotice(s.heartRateZonesMeta))).catch(() => {});
  }, []);

  const loadDetailsFromHealth = useCallback(async (uuid: string, trainingId: number, fallbackStart?: string, fallbackDuration?: number) => {
    setDetailsLoading(true);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const hk = await healthConnect.getWorkoutDetailsByUUID(uuid, fallbackStart, fallbackDuration);
        if (hk) {
          setDetails(hk);
          try {
            const toStore = { ...hk };
            if (toStore.routePoints && toStore.routePoints.length > 800) {
              const step = Math.ceil(toStore.routePoints.length / 800);
              toStore.routePoints = toStore.routePoints.filter((_, i) => i % step === 0);
            }
            if (toStore.heartRateSamples && toStore.heartRateSamples.length > 3000) {
              const step = Math.ceil(toStore.heartRateSamples.length / 3000);
              toStore.heartRateSamples = toStore.heartRateSamples.filter((_, i) => i % step === 0);
            }
            await updateTrainingDetails(trainingId, JSON.stringify(toStore));
          } catch (e) {
            logger.warn('[Seance] Sauvegarde des détails impossible', e);
          }
          setDetailsLoading(false);
          return;
        }
      } catch (e) {
        logger.warn(`[Seance] Lecture santé ${attempt + 1}/${MAX_RETRIES}`, e);
      }
      if (attempt < MAX_RETRIES - 1) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
    setDetailsLoading(false);
  }, []);

  const load = useCallback(async () => {
    getEffectiveHRZones().then(setUserZones).catch(() => {});
    if (params.demo === '1') {
      const t = demoTraining();
      setTraining(t);
      setDetails(demoDetails(t, params.scen === 'apple'));
      setLoading(false);
      return;
    }
    try {
      const id = parseInt(params.id || '0', 10);
      if (!id) {
        setLoading(false);
        return;
      }
      let tr: Training | null = null;
      if (typeof getTrainingById === 'function') tr = await getTrainingById(id);
      else tr = (await getTrainings(1825)).find((x) => x.id === id) ?? null;
      setTraining(tr);
      setLoading(false);
      // records : memes seances dedoublonnees que l'onglet Seances (source unique lib/v2/seances/records)
      getTrainings().then((l) => setAllTrainings(dedupeTrainings(l ?? []))).catch(() => {});
      if (!tr) return;
      const fallbackStart = tr.date && tr.start_time ? `${tr.date}T${tr.start_time}:00` : tr.date ? `${tr.date}T12:00:00` : undefined;
      if (tr.workout_details_json) {
        try {
          const cached = JSON.parse(tr.workout_details_json);
          const stale = (cached.cacheVersion ?? 1) < 10; // v10 : zones Apple iOS 27, meteo tronquee, intermediaires par la distance
          const rich = cached.heartRateSamples?.length > 0 || cached.routePoints?.length > 0 || cached.heartRateZones?.length > 0 || cached.weatherTemp != null;
          if (rich && !stale) {
            setDetails(cached);
            // 14 octobre 2026 (ios27) : cache d'avant iOS 27 : on demande a Apple ses temps par zone, une fois
            if (tr.healthkit_uuid) {
              refreshTrainingAppleZones(id, tr.healthkit_uuid, cached)
                .then((m) => { if (m) setDetails(m as WorkoutDetails); })
                .catch(() => {});
            }
            if (tr.healthkit_uuid && (!cached.routePoints?.length || cached.airQualityIndex == null)) {
              loadDetailsFromHealth(tr.healthkit_uuid, id, fallbackStart, tr.duration_minutes);
            }
            return;
          }
        } catch {
          // cache illisible : on relit les donnees sante
        }
      }
      if (tr.healthkit_uuid || tr.source === 'apple_health' || tr.source === 'apple_watch' || tr.source === 'health_connect') {
        await loadDetailsFromHealth(tr.healthkit_uuid || 'fallback', id, fallbackStart, tr.duration_minutes);
      }
    } catch (error) {
      logger.error('[Seance] Chargement impossible', error);
      setLoading(false);
    }
  }, [params.id, params.demo, params.scen, loadDetailsFromHealth]);

  // Filet de sécurité : si la base ne répond pas, on n'affiche pas un chargement sans fin.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, () => {
      if (params.demo !== '1') load();
    });
    return () => sub.remove();
  }, [load, params.demo]);

  const exercises = useMemo(() => parseExercises(training), [training]);
  const rounds: CombatRound[] = useMemo(() => parseRounds(training), [training]);
  const records = useMemo(() => recordsOfTraining(computeRecords(allTrainings), training?.id), [allTrainings, training?.id]);
  const recordKeys = useMemo(() => new Set(records.map((r) => r.line.key)), [records]);

  // Intervalle exact de la seance (debut, fin, pauses) : celui d'Apple si on l'a, sinon l'heure saisie
  const span = useMemo(() => {
    if (details?.workoutStart && details?.workoutEnd) return { start: details.workoutStart, end: details.workoutEnd, pauses: details.pauses };
    const dur = training?.duration_minutes ?? details?.durationMinutes;
    if (training?.date && training?.start_time) {
      const s = new Date(`${training.date}T${training.start_time}:00`);
      if (!isNaN(s.getTime())) return { start: s.toISOString(), end: dur && dur > 0 ? new Date(s.getTime() + dur * 60000).toISOString() : undefined, pauses: undefined };
    }
    return { start: undefined, end: undefined, pauses: undefined };
  }, [details?.workoutStart, details?.workoutEnd, details?.pauses, details?.durationMinutes, training?.date, training?.start_time, training?.duration_minutes]);

  // 14 octobre 2026 (zones_apple) : sur iOS 27, les zones et les temps d'Apple tels quels, a la seconde
  const appleZones = details?.appleZones && details.appleZones.seconds.some((x) => x > 0) ? details.appleZones : null;
  const zoneBounds = appleZones ? appleZones.lowers : userZones ? lowerBounds(userZones) : null;
  const hrZones = useMemo(() => {
    if (appleZones) return appleZones.seconds.map((sec, i) => ({ zone: i + 1, durationSeconds: sec }));
    const samples = details?.heartRateSamples;
    // 14 octobre 2026 : toujours recalcule avec tes zones et la methode commune (bornes comme Apple)
    if (userZones && samples && samples.length > 1) return calcZoneDurations(samples, userZones, span.start, span.end, span.pauses);
    if (details?.heartRateZones && details.heartRateZones.length > 0) return details.heartRateZones;
    return null;
  }, [userZones, details, span, appleZones]);

  // FC moyenne, min, max : la statistique Apple de la seance ; a defaut, moyenne ponderee des mesures
  const hrSummary = useMemo(() => {
    const st = details?.heartRateSamples && details.heartRateSamples.length > 0 ? hrStats(details.heartRateSamples, { start: span.start, end: span.end, pauses: span.pauses }) : null;
    const pick = (a?: number | null, b?: number | null) => (a && a > 0 ? a : b && b > 0 ? b : undefined);
    return {
      avg: pick(details?.avgHeartRate, pick(training?.heart_rate, st?.avg)),
      min: pick(details?.minHeartRate, st?.min),
      max: pick(details?.maxHeartRate, pick(training?.max_heart_rate, st?.max)),
    };
  }, [details, span, training?.heart_rate, training?.max_heart_rate]);

  const onDelete = () => {
    if (!training?.id) return;
    appAlert(traduire('Supprimer cette séance ?'), traduire('Elle sera retirée de ton historique et de tes records.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTraining(training.id!);
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/seances' as any);
          } catch (e) {
            logger.error('[Seance] Suppression impossible', e);
            appAlert(traduire('Oups'), traduire('La séance n’a pas pu être supprimée. Réessaie.'));
          }
        },
      },
    ]);
  };

  const onEdit = () => {
    if (!training?.id) return;
    if (isCombat(training.sport)) router.push({ pathname: '/seance/combat', params: { sport: training.sport, editId: String(training.id) } } as any);
    else router.push((saisieDirecte(training.sport, { editId: String(training.id), date: training.date.slice(0, 10) }) ?? { pathname: '/seance', params: { editId: String(training.id), date: training.date.slice(0, 10) } }) as any);
  };

  const onBilan = () => {
    if (training?.id == null) return;
    router.push(lienBilan({ type: 'seance', id: training.id }) as never);
  };

  const onShare = () => {
    if (training?.id == null) return;
    router.push(`/carte?moment=seance&id=${training.id}` as any);
  };

  // 14 octobre 2026 (ios27) : message vu, on ne le remontre plus (avant tout return, regle des hooks)
  const zonesShown = !!(hrZones && hrZones.some((z) => (z.durationSeconds || 0) > 0));
  useEffect(() => {
    if (appleNotice && zonesShown) markAppleZonesNoticeShown();
  }, [appleNotice, zonesShown]);

  if (loading || !training) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingHorizontal: 22, gap: 16 }}>
        <BackButton />
        {loading ? (
          <View style={{ gap: 12 }}>
            {[180, 90, 140].map((h, i) => (
              <View key={i} style={{ height: h, borderRadius: 24, backgroundColor: c.fillSubtle, opacity: 0.6 }} />
            ))}
          </View>
        ) : (
          <EmptyState title={traduire("Séance introuvable")} text={traduire("Elle a sans doute été supprimée. Retrouve tes autres séances dans l’historique.")} action={traduire("Voir mes séances")} onAction={() => router.replace('/(tabs)/seances' as any)} />
        )}
      </View>
    );
  }

  const t = training;
  const fam = familyOf(t.sport);
  const duration = durationOf(t) || details?.durationMinutes || 0;
  const distance = details?.distanceKm && details.distanceKm > 0 ? details.distanceKm : t.distance && t.distance > 0 ? t.distance : null;
  const pace = details?.avgPaceSecondsPerKm && details.avgPaceSecondsPerKm > 0 ? details.avgPaceSecondsPerKm : distance && duration ? Math.round((duration * 60) / distance) : null;
  const SPEED_SPORTS = ['cycling', 'velo', 'rameur', 'spinning', 'natation', 'triathlon', 'kayak', 'ski_alpin', 'vtt'];
  const isSpeed = (t.sport ?? '').split(',').some((s) => SPEED_SPORTS.includes(s.trim()));
  const speed = details?.avgSpeedKmh && details.avgSpeedKmh > 0 ? details.avgSpeedKmh : t.speed && t.speed > 0 ? t.speed : distance && duration ? Math.round((distance / (duration / 60)) * 10) / 10 : null;
  const calories = details?.activeCalories ?? t.calories;
  const avgHR = hrSummary.avg;
  const maxHR = hrSummary.max;
  const durSec = details?.durationSeconds && details.durationSeconds > 0 ? details.durationSeconds : null;
  const cadence = details?.cadence && details.cadence > 0 ? details.cadence : t.cadence && t.cadence > 0 ? t.cadence : null;
  const watts = details?.avgPowerWatts && details.avgPowerWatts > 0 ? details.avgPowerWatts : t.watts && t.watts > 0 ? t.watts : null;
  const effort = details?.effortScore && details.effortScore > 0 ? details.effortScore : t.intensity ?? 0;
  const rawNotes = t.notes?.trim() ?? '';
  const isAutoNote = /^[a-zA-ZÀ-ÿ\s]+\(\d+\s*min\)$/i.test(rawNotes);
  const notes = isAutoNote ? '' : rawNotes;
  const tons = tonnage(t);
  const nSets = setsCount(t);
  const splits = details?.splits ?? [];
  const fastest = splits.length ? splits.reduce((m, s, i, a) => (s.paceSecondsPerKm < a[m].paceSecondsPerKm ? i : m), 0) : -1;
  const route = details?.routePoints;
  const city = t.location_name || details?.city || '';
  const pinLat = t.location_lat ?? details?.startLatitude;
  const pinLon = t.location_lon ?? details?.startLongitude;
  const hasPin = pinLat != null && pinLon != null && !isNaN(pinLat) && !isNaN(pinLon) && (pinLat !== 0 || pinLon !== 0);
  const hasRoute = !!route && route.length > 2;
  const sportObj = SPORTS.find((s) => (t.sport ?? '').split(',').map((x) => x.trim()).includes(s.id));
  const showMuscles = !!t.sport && !(sportObj && ['cardio', 'nature', 'aquatique', 'glisse', 'danse', 'raquettes', 'precision'].includes(sportObj.category) && !t.muscles);
  // Heures exactes de la montre, minutes tronquees comme Forme (17:57 a 18:22)
  const timeRange = details?.workoutStart && details?.workoutEnd
    ? traduire("{0} à {1}", clockOf(details.workoutStart), clockOf(details.workoutEnd))
    : t.start_time ? `${t.start_time}${endTime(t.start_time, duration) ? traduire(" à {0}", endTime(t.start_time, duration)) : ''}` : '';
  const zoneTotal = hrZones ? hrZones.reduce((s, z) => s + (z.durationSeconds || 0), 0) : 0;
  const cw = width - 44 - 32;

  // Chiffres du haut, selon le sport
  const big: { v: string; u: string; l: string }[] = [];
  // duree d'entrainement Apple a la seconde (15:39), sinon la duree saisie
  if (durSec) big.push({ v: appleDuration(durSec), u: '', l: traduire('durée') });
  else if (duration) big.push({ v: formatDuration(duration).replace(' min', ''), u: duration < 60 ? 'min' : '', l: traduire('durée') });
  // format unique du tonnage (lib/v2/trainingWeek)
  if (fam === 'muscu' && tons > 0) big.push({ v: tonnageParts(tons, unite).value, u: tonnageParts(tons, unite).unit, l: accordSouleve(tons, unite) });
  else if (distance) big.push({ v: formatKg(distance, 2), u: 'km', l: 'distance' });
  else if (rounds.length || t.rounds) big.push({ v: String(rounds.length || t.rounds), u: '', l: 'rounds' });
  else if (calories) big.push({ v: String(Math.round(calories)), u: 'kcal', l: 'dépensées' });
  if (fam === 'muscu' && nSets) big.push({ v: String(nSets), u: '', l: traduire('séries') });
  else if (pace && fam === 'cardio' && !isSpeed) big.push({ v: applePace(pace), u: '/km', l: 'allure' });
  else if (avgHR) big.push({ v: String(Math.round(avgHR)), u: 'bpm', l: 'cœur moyen' });

  const stats: { v: string; u?: string; l: string }[] = [];
  // 17 octobre 2026 : score des sports de match, dans ses colonnes (les seances d'avant l'ont dans la note, affichee telle quelle)
  if (t.score_for != null || t.score_against != null) stats.push({ v: traduire("{0} à {1}", t.score_for ?? 0, t.score_against ?? 0), l: traduire('Score') });
  if (calories && !big.some((b) => b.l === 'dépensées')) stats.push({ v: String(Math.round(calories)), u: 'kcal', l: traduire('Calories actives') });
  if (details?.totalCalories) stats.push({ v: String(Math.round(details.totalCalories)), u: 'kcal', l: traduire('Calories totales') });
  if (distance && !big.some((b) => b.l === 'distance')) stats.push({ v: formatKg(distance, 2), u: 'km', l: traduire('Distance') });
  if (isSpeed && speed) stats.push({ v: formatKg(speed), u: 'km/h', l: traduire('Vitesse') });
  // 14 octobre 2026 : pas d'allure pour le foot ou le combat (Forme ne l'affiche que pour la course, la marche...)
  if (!isSpeed && pace && fam === 'cardio' && !big.some((b) => b.l === 'allure')) stats.push({ v: applePace(pace), u: '/km', l: traduire('Allure') });
  if (avgHR && !big.some((b) => b.l === 'cœur moyen')) stats.push({ v: String(Math.round(avgHR)), u: 'bpm', l: traduire('Cœur moyen') });
  if (maxHR) stats.push({ v: String(Math.round(maxHR)), u: 'bpm', l: traduire('Cœur max') });
  if (details?.elevationAscended != null && details.elevationAscended > 0) stats.push({ v: String(Math.floor(details.elevationAscended)), u: 'm', l: traduire('Dénivelé') });
  if (watts) stats.push({ v: String(Math.round(watts)), u: 'W', l: traduire('Puissance moyenne') });
  if (cadence) stats.push({ v: String(Math.round(cadence)), u: isSpeed ? traduire('tr/min') : traduire('pas/min'), l: traduire('Cadence moyenne') });
  if (details?.stepsCount != null && details.stepsCount > 0) stats.push({ v: details.stepsCount.toLocaleString(LOCALE), l: traduire('Pas') });
  if (t.pente) stats.push({ v: String(t.pente), u: '%', l: traduire('Pente') });
  if (t.resistance) stats.push({ v: String(t.resistance), l: traduire('Résistance') });
  if ((t.rounds ?? 0) > 0 && (t.round_duration ?? 0) > 0) stats.push({ v: `${t.rounds} × ${String(t.round_duration).replace('.', DECIMAL)}`, u: 'min', l: traduire('Rounds') }); // virgule francaise (4,5 min)

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Haut de page : la carte du parcours s'il y a un GPS (comme Forme), sinon la scene du sport */}
        <View style={{ height: 300 + insets.top, backgroundColor: hasRoute ? '#1E2433' : tileColor(t.sport), overflow: 'hidden' }}>
          {hasRoute ? (
            <View style={{ position: 'absolute', left: 0, top: 0 }}>
              <RouteHero points={route!} width={width} height={300 + insets.top} clearTop={insets.top + 64} clearBottom={140} onPress={() => { tap(); setMapFull(true); }} />
            </View>
          ) : (
            <>
              <Glyph kind="sakura" size={210} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: -30, top: insets.top + 50 }} />
              <Image source={sportArt(t.sport, gender, 2)} style={{ position: 'absolute', right: -16, bottom: -36, width: 240, height: 320 }} resizeMode="contain" />
            </>
          )}
          <View pointerEvents="box-none" style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <BackButton />
            {params.demo === '1' ? null : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <RoundIcon name="share" label={traduire("Partager la séance")} onPress={onShare} />
                <RoundIcon name="edit" label={traduire("Modifier la séance")} onPress={onEdit} />
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, marginTop: -130, gap: 12 }}>
          <View style={{ borderRadius: 26, backgroundColor: blancA(0.92), borderWidth: 1, borderColor: P.white, padding: 18, gap: 14, shadowColor: c.ink, shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4 }}>
            <View style={{ gap: 3 }}>
              <Ink size={26} weight="black" tight>{sessionTitle(t)}</Ink>
              <Ink size={14} weight="bold" color={c.textSecondary}>
                {[longDate(t.date), timeRange, t.club_name].filter(Boolean).join(', ')}
              </Ink>
              {city ? <Ink size={13} color={c.textMuted}>{city}</Ink> : null}
            </View>
            {big.length ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {big.map((b) => (
                  <View key={b.l} style={{ flex: 1 }}>
                    <Ink size={big.length >= 3 ? 25 : 30} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                      {b.v}
                      {b.u ? <Ink size={14} weight="bold" color={c.textSecondary}>{` ${b.u}`}</Ink> : null}
                    </Ink>
                    <Ink size={12} weight="bold" color={c.textMuted}>{traduire(b.l)}</Ink>
                  </View>
                ))}
              </View>
            ) : null}
            {/* 16 octobre 2026 : Apple ne met l'info interieur ou exterieur que pour la course, la marche, le velo, la natation.
                17 octobre : sans elle, isIndoor reste vide (les anciens details gardent false : d'ou la condition du trace ou du cardio). */}
            {t.is_outdoor || (details?.isIndoor === false && (hasRoute || fam === 'cardio')) ? (
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: c.successTint }}>
                <Ink size={12} weight="extraBold" color={c.successText}>{traduire("En extérieur")}</Ink>
              </View>
            ) : null}
          </View>

          {/* Records battus */}
          {records.length > 0 ? (
            <Glass style={{ gap: 12, borderColor: c.accentTint }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Hanko size={30} rotate={-6} />
                <View style={{ flex: 1 }}>
                  <Ink size={17} weight="black" tight>{traduirePluriel(records.length, records.length > 1, "Record battu", "{0} records battus", records.length)}</Ink>
                  <Ink size={13} color={c.textSecondary}>{traduire("Tu as battu ta meilleure marque.")}</Ink>
                </View>
              </View>
              {records.map((r) => {
                const v = formatRecordValue(r.line, r.point.value, unite);
                return (
                  <Pressable key={r.line.key} onPress={() => { tap(); router.push({ pathname: '/records', params: { focus: r.line.key } } as any); }} accessibilityRole="button" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40, borderTopWidth: 1, borderColor: c.divider }}>
                    <Ink size={15} weight="bold" style={{ flex: 1 }} numberOfLines={1}>{traduire(r.line.name)}</Ink>
                    <Ink size={15} weight="black">{r.line.kind === 'force' ? traduire("{0} {1} estimé{2}s", Math.round(cv(r.point.value)), uL, LANG === 'fr' && unite === 'lb' ? 'e' : '') : v.main}</Ink>
                  </Pressable>
                );
              })}
            </Glass>
          ) : null}

          {stats.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {stats.map((s) => (
                <Stat key={s.l} value={s.v} unit={s.u} label={s.l} />
              ))}
            </View>
          ) : null}

          {/* Exercices */}
          {exercises.length > 0 ? (
            <>
              <SectionTitle title={traduire("Exercices")} sub={[nSets ? traduirePluriel(nSets, nSets > 1, "{0} série", "{0} séries", nSets) : '', tons >= 100 ? `${tonnageParts(tons, unite).value} ${tonnageParts(tons, unite).unit} ${accordSouleve(tons, unite)}` : ''].filter(Boolean).join(', ')} />
              {exercises.map((ex, idx) => {
                const sets = ex.setsData && ex.setsData.length > 0 ? ex.setsData : workSets(ex);
                const vol = sets.filter((s) => s.type !== 'warmup').reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
                const isRec = recordKeys.has(`force:${(ex.name ?? '').trim().toLowerCase()}`) || recordKeys.has(`reps:${(ex.name ?? '').trim().toLowerCase()}`);
                return (
                  <Glass key={`${ex.name}${idx}`} style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Ink size={17} weight="black" tight>{sansTiret(ex.name) || traduire('Exercice')}</Ink>
                        {ex.muscle_group ? <Ink size={12} weight="bold" color={c.textMuted}>{sansTiret(ex.muscle_group)}</Ink> : null}
                      </View>
                      {isRec ? <Hanko size={22} /> : null}
                    </View>
                    {sets.length > 0 && sets.some((s) => s.weight > 0 || s.reps > 0) ? (
                      <View style={{ gap: 6 }}>
                        {sets.map((s, si) => {
                          const m = estimatedMax(s.weight, s.reps);
                          return (
                            <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: s.type === 'warmup' ? c.goldTint : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                                <Ink size={12} weight="black" color={c.textSecondary}>{s.type === 'warmup' ? traduire('É') : String(si + 1)}</Ink>
                              </View>
                              <Ink size={16} weight="extraBold" style={{ flex: 1 }}>
                                {s.weight > 0 ? `${formatKg(cv(s.weight))} ${uL} × ${s.reps}` : traduire("{0} répétitions", s.reps)}
                                {s.type === 'dropset' ? <Ink size={12} weight="bold" color={c.textMuted}>{traduire('  dégressive')}</Ink> : s.type === 'superset' ? <Ink size={12} weight="bold" color={c.textMuted}>{'  superset'}</Ink> : null}
                              </Ink>
                              {m > 0 && s.type !== 'warmup' ? <Ink size={12} weight="bold" color={c.textMuted}>{traduire("max estimé {0}", Math.round(cv(m)))}</Ink> : null}
                            </View>
                          );
                        })}
                        {vol > 0 && sets.length > 1 ? <Ink size={12} weight="bold" color={c.textSecondary}>{`Volume : ${Math.round(cv(vol))} ${uL}`}</Ink> : null}
                      </View>
                    ) : null}
                    {(ex.distance ?? 0) > 0 || (ex.duration ?? 0) > 0 || ex.pace || (ex.calories ?? 0) > 0 || (ex.stairs ?? 0) > 0 ? (
                      <Ink size={14} weight="bold" color={c.textSecondary}>
                        {[(ex.distance ?? 0) > 0 ? `${formatKg(ex.distance!, 2)} km` : '', (ex.duration ?? 0) > 0 ? formatDuration(ex.duration!) : '', ex.pace ? traduire("allure {0}", ex.pace) : '', (ex.calories ?? 0) > 0 ? `${ex.calories} kcal` : '', (ex.stairs ?? 0) > 0 ? traduire("{0} étages", ex.stairs) : ''].filter(Boolean).join(', ')}
                      </Ink>
                    ) : null}
                    {ex.notes ? <Ink size={13} color={c.textSecondary}>{ex.notes}</Ink> : null}
                  </Glass>
                );
              })}
            </>
          ) : null}

          {/* Theme technique */}
          {t.technical_theme || (t.technique_rating ?? 0) > 0 ? (
            <Glass style={{ gap: 8 }}>
              {t.technical_theme ? (
                <>
                  <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Thème technique")}</Ink>
                  <Ink size={17} weight="extraBold">{sansTiret(t.technical_theme)}</Ink>
                </>
              ) : null}
              {(t.technique_rating ?? 0) > 0 ? (() => {
                // 16 octobre 2026 : la note dit ce qu'elle mesure selon le sport, en couleurs progressives
                const n = Math.max(1, Math.min(5, Math.round(t.technique_rating ?? 1)));
                const note = noteSeance(t.sport);
                return (
                  <View style={{ gap: 6 }} accessibilityLabel={traduire("{0} {1} sur 5, {2}", note.nom, n, note.mots[n - 1])}>
                    <Ink size={12} weight="bold" color={c.textSecondary}>{traduire(note.nom)}</Ink>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i === n ? couleurNote(i).fill : i < n ? couleurNote(i).tint : c.fillSubtle }} />
                      ))}
                    </View>
                    <Ink size={15} weight="extraBold" color={couleurNote(n).text}>{traduire("{0} sur 5, {1}", n, note.mots[n - 1].toLocaleLowerCase(LOCALE))}</Ink>
                  </View>
                );
              })() : null}
            </Glass>
          ) : null}

          {/* Rounds de combat */}
          {rounds.length > 0 ? (
            <>
              <SectionTitle
                title={traduire("Rounds")}
                sub={(() => {
                  const w = rounds.filter((r) => r.result === 'win').length;
                  const l = rounds.filter((r) => r.result === 'loss').length;
                  const d = rounds.filter((r) => r.result === 'draw').length;
                  return [w ? `${w} gagné${w > 1 ? 's' : ''}` : '', l ? `${l} perdu${l > 1 ? 's' : ''}` : '', d ? `${d} nul${d > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');
                })()}
              />
              {rounds.map((r, i) => {
                const res = r.result === 'win' ? { t: traduire('Gagné'), bg: c.successTint, fg: c.successText } : r.result === 'loss' ? { t: traduire('Perdu'), bg: c.accentTint, fg: c.accent } : r.result === 'draw' ? { t: traduire('Nul'), bg: c.goldTint, fg: c.goldDeep } : null;
                const analysis = [
                  { l: 'Game plan', v: r.gamePlan },
                  { l: 'Ce qui a marché', v: r.whatWorked },
                  { l: 'Ce qui n’a pas marché', v: r.whatDidntWork },
                  { l: 'Contré par', v: r.counteredBy },
                  { l: 'À travailler', v: r.improvement },
                ].filter((a) => !!a.v);
                return (
                  <Glass key={i} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={15} weight="black" color={c.background}>{String(r.number ?? i + 1)}</Ink>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Ink size={16} weight="extraBold" numberOfLines={1}>{r.partner ? traduire("Contre {0}", r.partner) : traduire("Round {0}", r.number ?? i + 1)}</Ink>
                        {r.roundIntensity ? <Ink size={12} color={c.textMuted}>{r.roundIntensity === 'guerre' ? traduire('à fond') : r.roundIntensity === 'technique' ? traduire('technique') : traduire('détendu')}</Ink> : null}
                      </View>
                      {res ? (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: res.bg }}>
                          <Ink size={12} weight="extraBold" color={res.fg}>{res.t}</Ink>
                        </View>
                      ) : null}
                    </View>
                    {(r.submissionsGiven ?? 0) > 0 || (r.submissionsTaken ?? 0) > 0 ? (
                      <Ink size={14} weight="bold" color={c.textSecondary}>
                        {[(r.submissionsGiven ?? 0) > 0 ? traduirePluriel(r.submissionsGiven ?? 0, (r.submissionsGiven ?? 0) > 1, "{0} soumission placée", "{0} soumissions placées", r.submissionsGiven) : '', (r.submissionsTaken ?? 0) > 0 ? traduirePluriel(r.submissionsTaken ?? 0, (r.submissionsTaken ?? 0) > 1, "{0} subie", "{0} subies", r.submissionsTaken) : ''].filter(Boolean).join(', ')}
                      </Ink>
                    ) : null}
                    {r.method && !r.methodsGiven?.length && !r.methodsTaken?.length ? <Ink size={14}>{`Finition : ${getMethodDisplayName(r.method)}`}</Ink> : null}
                    {r.methodsGiven?.length ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {r.methodsGiven.map((m, k) => (
                          <View key={`g${k}`} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: c.successTint }}>
                            <Ink size={12} weight="bold" color={c.successText}>{getMethodDisplayName(m)}</Ink>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {r.methodsTaken?.length ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {r.methodsTaken.map((m, k) => (
                          <View key={`t${k}`} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: c.accentTint }}>
                            <Ink size={12} weight="bold" color={c.accent}>{getMethodDisplayName(m)}</Ink>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {(r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0 ? <Ink size={14} weight="bold">{traduire("Points : {0} pour, {1} contre", r.pointsFor ?? 0, r.pointsAgainst ?? 0)}</Ink> : null}
                    {r.notes ? <Ink size={13} color={c.textSecondary}>{r.notes}</Ink> : null}
                    {analysis.map((a) => (
                      <View key={a.l} style={{ gap: 1 }}>
                        <Ink size={12} weight="bold" color={c.textMuted}>{traduire(a.l)}</Ink>
                        <Ink size={14}>{a.v}</Ink>
                      </View>
                    ))}
                    {r.partner ? (
                      <Pressable onPress={() => { tap(); router.push({ pathname: '/sparring-partners', params: { partnerName: r.partner } } as any); }} accessibilityRole="button" style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="users" size={16} color={c.indigo} />
                        <Ink size={13} weight="extraBold" color={c.indigo}>{traduire("Voir la fiche de {0}", r.partner)}</Ink>
                      </Pressable>
                    ) : null}
                  </Glass>
                );
              })}
            </>
          ) : null}

          {/* Bilan de seance (sports de combat) */}
          {t.game_plan || t.what_worked || t.what_didnt_work ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Ton bilan")}</Ink>
              {[{ l: 'Game plan', v: t.game_plan }, { l: 'Ce qui a marché', v: t.what_worked }, { l: 'Ce qui n’a pas marché', v: t.what_didnt_work }].filter((a) => !!a.v).map((a) => (
                <View key={a.l} style={{ gap: 1 }}>
                  <Ink size={12} weight="bold" color={c.textMuted}>{traduire(a.l)}</Ink>
                  <Ink size={14}>{a.v}</Ink>
                </View>
              ))}
            </Glass>
          ) : null}

          {/* Coeur */}
          {detailsLoading && !details ? <View style={{ height: 120, borderRadius: 22, backgroundColor: c.fillSubtle, opacity: 0.6 }} /> : null}
          {details?.heartRateSamples && details.heartRateSamples.length > 1 ? (
            <>
              <SectionTitle title={traduire("Ton cœur")} />
              <Glass style={{ gap: 12 }}>
                <Ink size={34} weight="black" tight>
                  {hrSummary.avg ? String(Math.round(hrSummary.avg)) : '--'}
                  <Ink size={14} weight="bold" color={c.textSecondary}> {traduire("bpm en moyenne")}</Ink>
                </Ink>
                <HrChart samples={details.heartRateSamples} width={cw} avg={hrSummary.avg} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[{ l: traduire('Min'), v: hrSummary.min }, { l: traduire('Moyenne'), v: hrSummary.avg }, { l: traduire('Max'), v: hrSummary.max }].map((x) => (
                    <View key={x.l} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: c.fillSoft }}>
                      <Ink size={11} weight="bold" color={c.textMuted}>{x.l}</Ink>
                      <Ink size={18} weight="black">{x.v ? String(Math.round(x.v)) : ''}</Ink>
                    </View>
                  ))}
                </View>
              </Glass>
            </>
          ) : null}

          {hrZones && hrZones.length > 0 && zoneTotal > 0 ? (
            <Glass style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={17} weight="black" tight>{traduire("Zones cardiaques")}</Ink>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: appleZones ? c.accentTint : c.fillSubtle }}>
                    <Ink size={11} weight="extraBold" color={appleZones ? c.accent : c.textMuted}>{appleZones ? traduire('Apple') : traduire('estimé')}</Ink>
                  </View>
                </View>
                <Pressable onPress={() => { tap(); router.push('/heart-zones-settings' as any); }} accessibilityRole="button" hitSlop={10} style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Ink size={13} weight="extraBold" color={c.accent}>{userZones?.source === 'custom' ? traduire('Modifier') : traduire('Personnaliser')}</Ink>
                </Pressable>
              </View>
              {hrZones.map((z, i) => {
                const pct = zoneTotal ? (z.durationSeconds || 0) / zoneTotal : 0;
                const zi = Math.max(0, Math.min(4, (z.zone ?? i + 1) - 1));
                return (
                  <View key={i} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <Ink size={13} weight="bold" style={{ flex: 1 }} numberOfLines={1}>{traduire("Zone {0}, {1}", zi + 1, ZONE_LABEL[zi].toLowerCase())}</Ink>
                      {zoneBounds ? <Ink size={11} weight="bold" color={c.textMuted}>{zoneRangeLabel(zi, zoneBounds)}</Ink> : null}
                      <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ minWidth: 44, textAlign: 'right' }}>{zoneClock(z.durationSeconds || 0)}</Ink>
                    </View>
                    <View style={{ height: 10, borderRadius: 5, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: ZONE_INK[zi] }} />
                    </View>
                  </View>
                );
              })}
              {appleZones ? (
                <Ink size={12} color={c.textMuted}>{traduire("Temps calculés par Apple, avec {0} de Santé.", appleZones.source === 'user' ? traduire('tes zones manuelles') : appleZones.source === 'app' ? traduire('les zones de l’app de séance') : traduire('tes zones automatiques'))}</Ink>
              ) : (
                <Ink size={12} color={c.textMuted}>{userZones?.origin === 'apple' && userZones?.source === 'custom' ? traduire('Temps estimés par Yoroi avec tes zones de l’app Santé de ton téléphone : elle n’a pas de temps par zone pour cette séance.') : userZones?.source === 'custom' ? (Platform.OS === 'ios' ? traduire('Temps estimés par Yoroi avec tes zones. Les chiffres exacts d’Apple arrivent avec iOS 27.') : traduire('Temps estimés par Yoroi avec tes zones.')) : traduire('Temps estimés. Règle tes zones comme sur ta montre (app Watch, Ma montre, Exercice, Zones de fréquence cardiaque) pour qu’ils collent au mieux.')}</Ink>
              )}
              {appleNotice ? <Ink size={12} weight="bold" color={c.accent}>{traduire("Tes zones viennent de l’app Santé de ton téléphone.")}</Ink> : null}
            </Glass>
          ) : details?.heartRateSamples && details.heartRateSamples.length > 0 && userZones?.source !== 'custom' ? (
            <Glass onPress={() => router.push('/heart-zones-settings' as any)} label={traduire("Configurer tes zones cardiaques")} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="heart" size={26} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">{traduire("Configure tes zones cardiaques")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("Pour voir le temps passé dans chaque zone.")}</Ink>
              </View>
              <Icon name="chevron" size={18} color={c.textMuted} />
            </Glass>
          ) : null}

          {/* 14 octobre 2026 (ios27) : zones de puissance velo calculees par Apple (iOS 27), seulement si Apple les donne */}
          {details?.applePowerZones && details.applePowerZones.zones.some((z) => z.seconds > 0) ? (() => {
            const pz = details.applePowerZones!.zones;
            const tot = pz.reduce((acc, z) => acc + z.seconds, 0) || 1;
            const w = (v?: number) => (v != null ? Math.round(v) : null);
            return (
              <Glass style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={17} weight="black" tight>{traduire("Zones de puissance")}</Ink>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: c.accentTint }}>
                    <Ink size={11} weight="extraBold" color={c.accent}>{traduire("Apple")}</Ink>
                  </View>
                </View>
                {pz.map((z, i) => {
                  const lo = w(z.min);
                  const hi = w(z.max);
                  const range = lo == null && hi != null ? traduire("moins de {0} W", hi) : hi == null && lo != null ? traduire("{0} W et plus", lo) : lo != null && hi != null ? traduire("{0} à {1} W", lo, Math.max(lo, hi - 1)) : '';
                  return (
                    <View key={i} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <Ink size={13} weight="bold" style={{ flex: 1 }}>{traduire("Zone {0}", i + 1)}</Ink>
                        {range ? <Ink size={11} weight="bold" color={c.textMuted}>{range}</Ink> : null}
                        <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ minWidth: 44, textAlign: 'right' }}>{zoneClock(z.seconds)}</Ink>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.round((z.seconds / tot) * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: c.detail }} />
                      </View>
                    </View>
                  );
                })}
              </Glass>
            );
          })() : null}

          {details?.recoveryHR ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Récupération")}</Ink>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[{ l: 'À la fin', v: details.recoveryHR.atEnd, d: 0 }, { l: 'Après 1 min', v: details.recoveryHR.after1Min, d: details.recoveryHR.after1Min != null ? details.recoveryHR.atEnd - details.recoveryHR.after1Min : 0 }, { l: 'Après 2 min', v: details.recoveryHR.after2Min, d: details.recoveryHR.after2Min != null ? details.recoveryHR.atEnd - details.recoveryHR.after2Min : 0 }]
                  .filter((x) => x.v != null)
                  .map((x) => (
                    <View key={x.l} style={{ flex: 1, padding: 10, borderRadius: 14, backgroundColor: c.fillSoft }}>
                      <Ink size={11} weight="bold" color={c.textMuted}>{traduire(x.l)}</Ink>
                      <Ink size={18} weight="black">{`${Math.round(x.v!)}`}</Ink>
                      {x.d > 0 ? <Ink size={11} weight="bold" color={c.successText}>{traduire("moins {0}", Math.round(x.d))}</Ink> : null}
                    </View>
                  ))}
              </View>
            </Glass>
          ) : null}

          {details?.vo2Max != null && details.vo2Max > 0 ? (
            <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="gauge" size={26} color={c.indigo} />
              <View style={{ flex: 1 }}>
                <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("VO2 max mesurée par ta montre")}</Ink>
                <Ink size={24} weight="black" tight>
                  {details.vo2Max.toFixed(1).replace('.', DECIMAL)}
                  <Ink size={13} weight="bold" color={c.textSecondary}> ml/kg/min</Ink>
                </Ink>
              </View>
            </Glass>
          ) : null}

          {/* Intermediaires, comme Forme : duree, allure, FC et puissance par kilometre */}
          {splits.length > 0 ? (
            <>
              <SectionTitle title={traduire("Intermédiaires")} />
              <Glass style={{ gap: 2, paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24 }}>
                  <View style={{ width: 20 }} />
                  {[traduire('Durée'), traduire('Allure'), 'FC', splits.some((x) => x.avgPowerWatts) ? traduire('Puissance') : ''].map((h, k) => (
                    <Ink key={k} size={11} weight="bold" color={c.textMuted} style={{ flex: 1, textAlign: k === 0 ? 'left' : 'right' }}>{h}</Ink>
                  ))}
                </View>
                {splits.map((s, i) => (
                  <View key={s.index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, borderTopWidth: 1, borderTopColor: c.divider }}>
                    <Ink size={13} weight="black" color={c.textMuted} style={{ width: 20 }}>{String(s.index)}</Ink>
                    <Ink size={14} weight="extraBold" style={{ flex: 1 }}>{zoneClock(s.durationSeconds)}</Ink>
                    <Ink size={14} weight={i === fastest ? 'black' : 'extraBold'} color={i === fastest ? c.accent : undefined} style={{ flex: 1, textAlign: 'right' }}>{applePace(s.paceSecondsPerKm)}</Ink>
                    <Ink size={14} weight="extraBold" style={{ flex: 1, textAlign: 'right' }}>{s.avgHeartRate ? String(Math.round(s.avgHeartRate)) : ''}</Ink>
                    <Ink size={14} weight="extraBold" style={{ flex: 1, textAlign: 'right' }}>{(s as { avgPowerWatts?: number }).avgPowerWatts ? `${(s as { avgPowerWatts?: number }).avgPowerWatts} W` : ''}</Ink>
                  </View>
                ))}
                <Ink size={11} color={c.textMuted} style={{ marginTop: 6 }}>{traduire("Par kilomètre{0}. FC en bpm, ton kilomètre le plus rapide en indigo.", splits[splits.length - 1].distanceKm < 1 ? traduire(", le dernier sur {0} km", formatKg(splits[splits.length - 1].distanceKm, 2)) : '')}</Ink>
              </Glass>
            </>
          ) : null}

          {/* Mesures de course de la montre, comme Forme (moyenne et plage) */}
          {details?.groundContactMs || details?.strideLengthM || details?.verticalOscCm ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Ta foulée")}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { l: 'Contact au sol', m: details.groundContactMs, u: 'ms', f: (x: number) => String(x) },
                  { l: 'Longueur de foulée', m: details.strideLengthM, u: 'm', f: (x: number) => formatKg(x, 1) },
                  { l: 'Oscillation verticale', m: details.verticalOscCm, u: 'cm', f: (x: number) => formatKg(x, 1) },
                ].filter((x) => !!x.m).map((x) => (
                  <View key={x.l} style={{ flexGrow: 1, flexBasis: '45%', padding: 10, borderRadius: 14, backgroundColor: c.fillSoft }}>
                    <Ink size={11} weight="bold" color={c.textMuted}>{traduire(x.l)}</Ink>
                    <Ink size={18} weight="black">{x.f(x.m!.avg)}<Ink size={12} weight="bold" color={c.textSecondary}>{` ${x.u}`}</Ink></Ink>
                    {x.m!.min != null && x.m!.max != null ? <Ink size={11} weight="bold" color={c.textMuted}>{traduire("de {0} à {1} {2}", x.f(x.m!.min), x.f(x.m!.max), x.u)}</Ink> : null}
                  </View>
                ))}
              </View>
            </Glass>
          ) : null}

          {/* Trace ou lieu : la carte du parcours est en haut de page, un appui l'ouvre en grand */}
          {hasRoute ? (
            <Modal visible={mapFull} animationType="fade" onRequestClose={() => setMapFull(false)}>
              <View style={{ flex: 1, backgroundColor: '#1E2433' }}>
                <RouteHero points={route!} width={width} height={screenH} interactive clearTop={insets.top + 70} clearBottom={insets.bottom + 110} />
                <View style={{ position: 'absolute', top: insets.top + 10, left: 16 }}>
                  <BackButton onPress={() => setMapFull(false)} />
                </View>
                <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, padding: 12, borderRadius: 16, backgroundColor: 'rgba(20,24,34,0.82)' }}>
                  <Ink size={13} weight="bold" color="#FFFFFF">{[city, details?.distanceKm ? `${formatKg(details.distanceKm, 2)} km` : '', details?.elevationAscended ? traduire("{0} m de montée", Math.floor(details.elevationAscended)) : ''].filter(Boolean).join(', ')}</Ink>
                  <Ink size={11} color="rgba(255,255,255,0.75)">{traduire("Départ en vert, arrivée en rouge. Jaune quand tu vas moins vite, vert quand tu accélères.")}</Ink>
                </View>
              </View>
            </Modal>
          ) : hasPin ? (
            <>
              <SectionTitle title={traduire("Lieu")} sub={sansTiret(t.location_name) || undefined} />
              <View style={{ height: 200, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: c.divider }}>
                <MapView provider={PROVIDER_DEFAULT} style={{ flex: 1 }} initialRegion={{ latitude: pinLat!, longitude: pinLon!, latitudeDelta: 0.006, longitudeDelta: 0.006 }} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}>
                  <Marker coordinate={{ latitude: pinLat!, longitude: pinLon! }} pinColor={c.accent} />
                </MapView>
                <View style={{ position: 'absolute', right: 10, top: 10 }}>
                  <RoundIcon name="map" label={traduire("Agrandir la carte")} onPress={() => setMapFull(true)} />
                </View>
              </View>
              <Modal visible={mapFull} animationType="fade" onRequestClose={() => setMapFull(false)}>
                <View style={{ flex: 1, backgroundColor: c.background }}>
                  <MapView provider={PROVIDER_DEFAULT} style={{ flex: 1 }} initialRegion={{ latitude: pinLat!, longitude: pinLon!, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
                    <Marker coordinate={{ latitude: pinLat!, longitude: pinLon! }} pinColor={c.accent} />
                  </MapView>
                  <View style={{ position: 'absolute', top: insets.top + 10, left: 16 }}>
                    <BackButton onPress={() => setMapFull(false)} />
                  </View>
                </View>
              </Modal>
            </>
          ) : null}

          {/* Conditions */}
          {details?.weatherTemp != null || details?.weatherHumidity != null || details?.weatherCondition || details?.airQualityIndex != null ? (
            <Glass style={{ gap: 10 }}>
              <Ink size={17} weight="black" tight>{traduire("Conditions")}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {details?.weatherTemp != null ? <Stat value={`${appleTemperature(details.weatherTemp)}°`} label={traduire("Température")} /> : null}
                {details?.weatherHumidity != null ? <Stat value={`${appleHumidity(details.weatherHumidity)}`} unit="%" label={traduire("Humidité")} /> : null}
                {details?.airQualityIndex != null ? <Stat value={String(details.airQualityIndex)} label={details.airQualityCategory ? `Air, ${traduire(details.airQualityCategory).toLowerCase()}` : traduire('Qualité de l’air')} /> : null}
              </View>
              {details?.weatherCondition ? <Ink size={14} color={c.textSecondary}>{details.weatherCondition}</Ink> : null}
            </Glass>
          ) : null}

          {/* Muscles travailles */}
          {showMuscles && params.demo !== '1' ? (
            <MuscleWorked
              sport={t.sport}
              customMuscles={t.muscles || undefined}
              trainingId={t.id}
              onMusclesUpdated={(muscles) => setTraining((prev) => (prev ? { ...prev, muscles } : prev))}
            />
          ) : null}

          {/* Effort et notes */}
          {effort > 0 || notes ? (
            <Glass style={{ gap: 12 }}>
              {effort > 0 ? (
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Ink size={17} weight="black" tight>{details?.effortEstimated ? traduire('Effort estimé') : traduire('Effort ressenti')}</Ink>
                    <Ink size={15} weight="black">{traduire("{0} sur 10, {1}", effort, effortLabel(effort))}</Ink>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <View key={i} style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: i < effort ? (effort >= 8 ? c.detail : effort >= 5 ? c.gold : c.success) : c.fillSubtle }} />
                    ))}
                  </View>
                </View>
              ) : null}
              {notes ? (
                <View style={{ gap: 4 }}>
                  <Ink size={17} weight="black" tight>Notes</Ink>
                  <Ink size={15} color={c.textSecondary}>{notes}</Ink>
                </View>
              ) : null}
            </Glass>
          ) : null}

          {t.session_rating ? (
            <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{traduire("Ta note de séance")}</Ink>
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Icon key={i} name="star" size={18} color={c.gold} fill={i <= (t.session_rating ?? 0) ? c.gold : undefined} />
                ))}
              </View>
            </Glass>
          ) : null}

          {/* 25 octobre 2026 : garder cette seance dans Mes séances, pour la refaire en un appui */}
          {params.demo === '1' || !t.id ? null : <EnregistrerSeance trainingId={t.id} marge={0} />}

          {params.demo === '1' ? null : (
            <View style={{ gap: 10, marginTop: 8 }}>
              <BigButton label={traduire("Voir le bilan")} icon="chart" tone="ink" onPress={onBilan} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <BigButton label={traduire("Modifier")} icon="edit" onPress={onEdit} style={{ flex: 1 }} />
                <BigButton label={traduire("Partager")} icon="share" tone="soft" onPress={onShare} style={{ flex: 1 }} />
              </View>
              <BigButton label={traduire("Supprimer la séance")} icon="trash" tone="danger" onPress={onDelete} />
            </View>
          )}
          {t.source && t.source !== 'manual' ? (
            <Ink size={12} color={c.textMuted} style={{ textAlign: 'center' }}>
              {traduire("Importée depuis {0}", ({ apple_watch: 'Apple Watch', apple_health: traduire('Apple Santé'), iphone: 'iPhone', strava: 'Strava', garmin: 'Garmin', polar: 'Polar', whoop: 'Whoop', suunto: 'Suunto', coros: 'Coros', wahoo: 'Wahoo', samsung: 'Samsung', fitbit: 'Fitbit', withings: 'Withings', health_connect: 'Health Connect' } as Record<string, string>)[t.source] ?? traduire('ta montre'))}
            </Ink>
          ) : null}
          {details?.durationMinutes && !duration ? <Ink size={12} color={c.textMuted}>{formatClock(details.durationMinutes * 60)}</Ink> : null}
        </View>
      </ScrollView>
    </View>
  );
}
