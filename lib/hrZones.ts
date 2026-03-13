// ============================================
// YOROI - Zones de Fréquence Cardiaque
// ============================================
// Fonction centrale pour obtenir les zones FC effectives.
// Priorité :
//   1. Zones personnalisées de l'utilisateur (s.heartRateZones)
//   2. Calcul via FC max (si connue) : formule Karvonen standard (60/70/80/90%)
//   3. Calcul via âge : FCmax théorique = 220 - âge
//   4. Valeurs par défaut adulte moyen 30 ans (FCmax ≈ 190)
// ============================================

import { getUserSettings } from './storage';
import { getProfile } from './database';

export interface HRZoneThresholds {
  z1max: number; // seuil Z1/Z2
  z2max: number; // seuil Z2/Z3
  z3max: number; // seuil Z3/Z4
  z4max: number; // seuil Z4/Z5
  source: 'custom' | 'age' | 'default';
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

export const ZONE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444'] as const;
export const ZONE_NAMES  = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'] as const;
export const ZONE_LABELS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Max'] as const;

// Zones par défaut pour un adulte moyen sans données
// FCmax théorique 220-30 = 190, FCR=60, réserve=130
// Méthode Apple Santé : Karvonen 50/60/70/80% de réserve
const DEFAULT_ZONES: HRZoneThresholds = {
  z1max: 125, // 50% de 130 + 60
  z2max: 138, // 60%
  z3max: 151, // 70%
  z4max: 164, // 80%
  source: 'default',
};

/**
 * Calcule les seuils de zones à partir de la FC max et FC au repos.
 * Méthode Karvonen identique à Apple Santé : 50/60/70/80% de réserve.
 * seuil = FCR + (FCmax - FCR) × %
 */
export function calcZonesFromMaxHR(
  fcmax: number,
  fcrepos: number = 60
): HRZoneThresholds {
  const reserve = fcmax - fcrepos;
  return {
    z1max: Math.round(fcrepos + reserve * 0.50),
    z2max: Math.round(fcrepos + reserve * 0.60),
    z3max: Math.round(fcrepos + reserve * 0.70),
    z4max: Math.round(fcrepos + reserve * 0.80),
    source: 'age',
  };
}

/**
 * Retourne les zones FC effectives à utiliser dans toute l'app.
 * Ordre de priorité :
 *   1. Zones perso configurées par l'utilisateur
 *   2. Calculées via âge (220 - âge) avec FCR du profil si disponibles
 *   3. Valeurs par défaut (adulte ~30 ans)
 */
export async function getEffectiveHRZones(): Promise<HRZoneThresholds> {
  try {
    const settings = await getUserSettings();

    // 1. Zones personnalisées
    if (settings.heartRateZones) {
      return { ...settings.heartRateZones, source: 'custom' };
    }

    // 2. Calculer via le profil (âge + éventuellement FC repos)
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
        const fcmax = 220 - age;
        // FC repos : utiliser la dernière valeur HealthKit si disponible, sinon 60
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const restingHRRaw = await AsyncStorage.getItem('@yoroi_health_last_resting_hr');
        const fcrepos = restingHRRaw ? Math.round(parseFloat(restingHRRaw)) : 60;
        return calcZonesFromMaxHR(fcmax, fcrepos);
      }
    } catch {
      // Profil non disponible, continuer vers défaut
    }
  } catch {
    // getUserSettings échoué
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
  const zones = thresholdsToZones(thresholds);
  for (const z of zones) {
    if (bpm >= z.minBpm && bpm < z.maxBpm) return z.zone;
  }
  return 5;
}

/**
 * Calcule le temps passé dans chaque zone à partir des samples HR.
 * Retourne les 5 zones avec durationSeconds rempli.
 */
export function calcZoneDurations(
  hrSamples: { timestamp: string; bpm: number }[],
  thresholds: HRZoneThresholds
): (HRZone & { durationSeconds: number })[] {
  const zones = thresholdsToZones(thresholds).map(z => ({ ...z, durationSeconds: 0 }));

  if (!hrSamples || hrSamples.length < 2) return zones;

  for (let i = 0; i < hrSamples.length - 1; i++) {
    const bpm = hrSamples[i].bpm;
    const gap = (new Date(hrSamples[i + 1].timestamp).getTime() - new Date(hrSamples[i].timestamp).getTime()) / 1000;
    if (gap <= 0 || gap > 300) continue; // ignorer les gaps > 5 min (pause)
    for (const z of zones) {
      if (bpm >= z.minBpm && bpm < z.maxBpm) {
        z.durationSeconds += gap;
        break;
      }
    }
  }

  return zones;
}
