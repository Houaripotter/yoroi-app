// ============================================
// YOROI - Zones de Fréquence Cardiaque
// ============================================
// Fonction centrale pour obtenir les zones FC effectives.
// Priorité :
//   1. Zones personnalisées de l'utilisateur (s.heartRateZones)
//   2. FCmax réelle Apple Watch lue depuis les métadonnées workout (@yoroi_health_max_hr)
//   3. Calcul via âge : FCmax théorique = 220 - âge
//   4. Valeurs par défaut adulte moyen 30 ans (FCmax = 190)
//
// Formule Apple Santé/Fitness (identique à ce qu'affiche Apple) :
//   Z1 < 63% FCmax | Z2 63–71% | Z3 71–79% | Z4 79–90% | Z5 > 90%
// ============================================

import { getUserSettings } from './storage';
import { getProfile } from './database';
import { INTENSITES } from './v2/intensite';
import { lowerBounds, zoneOf, zoneTimes } from './v2/seances/workoutMath';
import type { Interval } from './v2/seances/workoutMath';
import type { ZonesOrigin } from './v2/seances/appleZonesSync';

export interface HRZoneThresholds {
  z1max: number; // seuil Z1/Z2
  z2max: number; // seuil Z2/Z3
  z3max: number; // seuil Z3/Z4
  z4max: number; // seuil Z4/Z5
  source: 'custom' | 'age' | 'default';
  /** 14 octobre 2026 (ios27) : pour source custom, d'ou viennent tes zones (Apple Sante, a la main, estimees). */
  origin?: ZonesOrigin;
  // Bornes min indépendantes (optionnelles, rétrocompat)
  z1min?: number;
  z2min?: number;
  z3min?: number;
  z4min?: number;
  z5min?: number;
}

export interface HRZone {
  zone: number;      // 1 à 5
  name: string;
  label: string;
  minBpm: number;
  maxBpm: number;
  color: string;
  pct?: number;      // pourcentage de la FC de réserve (Karvonen)
}

// Vague 32 : couleurs de l'echelle d'intensite commune (lib/v2/intensite.ts), plus de rouge.
export const ZONE_COLORS = [INTENSITES[0].fill, INTENSITES[1].fill, INTENSITES[2].fill, INTENSITES[3].fill, INTENSITES[4].fill] as const;
export const ZONE_NAMES  = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'] as const;
export const ZONE_LABELS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Max'] as const;

// Zones par défaut pour un adulte moyen sans données
// FCmax théorique 220-30 = 190, formule Apple : 63/71/79/90%
const DEFAULT_ZONES: HRZoneThresholds = {
  z1max: Math.round(190 * 0.63), // 120
  z2max: Math.round(190 * 0.71), // 135
  z3max: Math.round(190 * 0.79), // 150
  z4max: Math.round(190 * 0.90), // 171
  source: 'default',
};

/**
 * Calcule les seuils de zones à partir de la FC max.
 * Formule Apple Santé/Fitness : 63/71/79/90% de FCmax.
 * Identique à ce qu'affiche Apple Watch et l'app Forme.
 */
export function calcZonesFromMaxHR(fcmax: number): HRZoneThresholds {
  return {
    z1max: Math.round(fcmax * 0.63),
    z2max: Math.round(fcmax * 0.71),
    z3max: Math.round(fcmax * 0.79),
    z4max: Math.round(fcmax * 0.90),
    source: 'age',
  };
}

/**
 * Retourne les zones FC effectives à utiliser dans toute l'app.
 * Ordre de priorité :
 *   1. Zones perso configurées par l'utilisateur
 *   2. FCmax réelle Apple Watch (@yoroi_health_max_hr) → formule Apple 63/71/79/90%
 *   3. FCmax calculée via âge (220 - âge) → même formule
 *   4. Valeurs par défaut (adulte ~30 ans, FCmax=190)
 */
export async function getEffectiveHRZones(): Promise<HRZoneThresholds> {
  try {
    const settings = await getUserSettings();

    // 1. Zones personnalisées (configurées manuellement dans l'app)
    if (settings.heartRateZones) {
      return { ...settings.heartRateZones, source: 'custom', origin: settings.heartRateZonesMeta?.origin ?? 'manual' };
    }
  } catch {
    // getUserSettings échoué, continuer
  }

  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  // 2. FCmax réelle lue depuis les métadonnées Apple Watch (la plus précise)
  try {
    const storedMaxHR = await AsyncStorage.getItem('@yoroi_health_max_hr');
    if (storedMaxHR) {
      const fcmax = Math.round(parseFloat(storedMaxHR));
      if (fcmax > 100 && fcmax < 250) {
        return calcZonesFromMaxHR(fcmax);
      }
    }
  } catch {
    // AsyncStorage indisponible
  }

  // 3. FCmax calculée via l'âge du profil
  try {
    const profile = await getProfile();
    let age = 0;

    if (profile?.birth_date) {
      const birth = new Date(profile.birth_date);
      age = new Date().getFullYear() - birth.getFullYear();
    } else if (profile?.age && profile.age > 0) {
      age = profile.age;
    }

    if (age >= 10 && age <= 100) {
      return calcZonesFromMaxHR(220 - age);
    }
  } catch {
    // Profil non disponible
  }

  return DEFAULT_ZONES;
}

/**
 * Convertit les seuils en tableau de 5 zones avec minBpm/maxBpm.
 */
export function thresholdsToZones(t: HRZoneThresholds): HRZone[] {
  return [
    { zone: 1, name: ZONE_NAMES[0], label: ZONE_LABELS[0], minBpm: t.z1min ?? 0,      maxBpm: t.z1max, color: ZONE_COLORS[0] },
    { zone: 2, name: ZONE_NAMES[1], label: ZONE_LABELS[1], minBpm: t.z2min ?? t.z1max, maxBpm: t.z2max, color: ZONE_COLORS[1] },
    { zone: 3, name: ZONE_NAMES[2], label: ZONE_LABELS[2], minBpm: t.z3min ?? t.z2max, maxBpm: t.z3max, color: ZONE_COLORS[2] },
    { zone: 4, name: ZONE_NAMES[3], label: ZONE_LABELS[3], minBpm: t.z4min ?? t.z3max, maxBpm: t.z4max, color: ZONE_COLORS[3] },
    { zone: 5, name: ZONE_NAMES[4], label: ZONE_LABELS[4], minBpm: t.z5min ?? t.z4max, maxBpm: 250,      color: ZONE_COLORS[4] },
  ];
}

/**
 * Détermine la zone d'une FC donnée.
 * Retourne 1-5, ou 0 si données insuffisantes.
 */
export function getZoneForBpm(bpm: number, thresholds: HRZoneThresholds): number {
  if (bpm <= 0) return 0;
  // 14 octobre 2026 : bornes basses inclusives comme Apple (151 a 169 en zone 4, 170 en zone 5)
  return zoneOf(bpm, lowerBounds(thresholds));
}

/**
 * Calcule le temps passé dans chaque zone à partir des samples HR.
 * Retourne les 5 zones avec durationSeconds rempli.
 */
export function calcZoneDurations(
  hrSamples: { timestamp: string; bpm: number }[],
  thresholds: HRZoneThresholds,
  workoutStartISO?: string,
  workoutEndISO?: string,
  pauses?: Interval[],
): (HRZone & { durationSeconds: number })[] {
  // 14 octobre 2026 : methode commune lib/v2/seances/workoutMath (chaque mesure compte jusqu'a la
  // suivante, plafonnee, limitee a la seance, pauses exclues, bornes basses inclusives comme Apple).
  // L'ancien calcul perdait les valeurs egales a la borne haute saisie (169 avec « 151 a 169 »).
  const zones = thresholdsToZones(thresholds).map(z => ({ ...z, durationSeconds: 0 }));
  if (!hrSamples || hrSamples.length < 1) return zones;
  // 14 octobre 2026 (zones_apple) : de la premiere a la derniere mesure, comme Forme (voir workoutMath edges)
  const t = zoneTimes(hrSamples, lowerBounds(thresholds), { start: workoutStartISO, end: workoutEndISO, pauses, edges: 'mesures' });
  t.forEach((sec, i) => { zones[i].durationSeconds = sec; });
  return zones;
}
