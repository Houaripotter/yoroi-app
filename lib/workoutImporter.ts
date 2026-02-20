// ============================================
// YOROI - IMPORT GPX/TCX WORKOUTS
// ============================================
// Supports GPX (Strava export) and TCX (Garmin export)

import { XMLParser } from 'fast-xml-parser';
import { Training } from '@/lib/database';

// ============================================
// TYPES
// ============================================

export interface ParsedActivity {
  id: string;
  name: string;
  sportType: string;
  yoroiSportId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  avgHeartRate: number | null;
  selected: boolean;
}

export interface ParseResult {
  activities: ParsedActivity[];
  format: 'gpx' | 'tcx';
  errors: string[];
}

// ============================================
// SPORT TYPE MAPPING
// ============================================

const SPORT_MAP: Record<string, string> = {
  // Running
  'running': 'running',
  'run': 'running',
  'trail_running': 'trail',
  'trail running': 'trail',
  'treadmill': 'running',
  'treadmill_running': 'running',
  // Cycling
  'cycling': 'cycling',
  'biking': 'cycling',
  'virtual_ride': 'cycling',
  'ride': 'cycling',
  'mountain_biking': 'vtt',
  // Swimming
  'swimming': 'natation',
  'swim': 'natation',
  'open_water_swimming': 'natation',
  'lap_swimming': 'natation',
  // Walking / Hiking
  'walking': 'marche',
  'walk': 'marche',
  'hiking': 'randonnee',
  'hike': 'randonnee',
  // Strength / Fitness
  'weight_training': 'musculation',
  'strength_training': 'musculation',
  'strength': 'musculation',
  'workout': 'fitness',
  'training': 'fitness',
  'fitness_equipment': 'fitness',
  'elliptical': 'fitness',
  'stair_stepper': 'fitness',
  // CrossFit
  'crossfit': 'crossfit',
  // Yoga
  'yoga': 'yoga',
  'pilates': 'pilates',
  // Combat
  'boxing': 'boxe',
  'martial_arts': 'mma',
  // HIIT
  'hiit': 'hiit',
  'high_intensity_interval_training': 'hiit',
  // Rowing
  'rowing': 'rameur',
  'indoor_rowing': 'rameur',
  // Team sports
  'soccer': 'football',
  'basketball': 'basketball',
  'tennis': 'tennis',
  'badminton': 'badminton',
  // Others
  'skiing': 'ski',
  'snowboarding': 'ski',
  'surfing': 'surf',
  'rock_climbing': 'escalade',
  'climbing': 'climbing',
  'skating': 'patinage',
  'jump_rope': 'corde_a_sauter',
  'other': 'autre',
};

export function mapSportType(externalType: string): string {
  if (!externalType) return 'autre';
  const normalized = externalType.toLowerCase().trim().replace(/\s+/g, '_');
  return SPORT_MAP[normalized] || 'autre';
}

// ============================================
// HAVERSINE DISTANCE
// ============================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// XML PARSER CONFIG
// ============================================

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  trimValues: true,
};

// ============================================
// GPX PARSER
// ============================================

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function parseGPX(xmlContent: string): ParseResult {
  const parser = new XMLParser(parserOptions);
  const parsed = parser.parse(xmlContent);
  const errors: string[] = [];
  const activities: ParsedActivity[] = [];

  const gpx = parsed.gpx;
  if (!gpx) {
    return { activities: [], format: 'gpx', errors: ['Invalid GPX: missing <gpx> root element'] };
  }

  const tracks = ensureArray(gpx.trk);

  for (let i = 0; i < tracks.length; i++) {
    const trk = tracks[i];
    try {
      const name = trk.name || `Activity ${i + 1}`;
      const sportType = trk.type || gpx.metadata?.type || '';

      const segments = ensureArray(trk.trkseg);
      const allPoints: Array<{ lat: number; lon: number; time?: string; hr?: number }> = [];

      for (const seg of segments) {
        const points = ensureArray(seg.trkpt);
        for (const pt of points) {
          const lat = pt['@_lat'];
          const lon = pt['@_lon'];
          if (lat != null && lon != null) {
            let hr: number | undefined;
            if (pt.extensions) {
              // Garmin GPX extensions for HR
              const tpe = pt.extensions['gpxtpx:TrackPointExtension'] || pt.extensions['ns3:TrackPointExtension'];
              if (tpe) {
                hr = tpe['gpxtpx:hr'] || tpe['ns3:hr'];
              }
            }
            allPoints.push({ lat: Number(lat), lon: Number(lon), time: pt.time, hr });
          }
        }
      }

      if (allPoints.length < 2) {
        errors.push(`Track "${name}": not enough points`);
        continue;
      }

      // Calculate distance via Haversine
      let totalDistanceKm = 0;
      for (let j = 1; j < allPoints.length; j++) {
        totalDistanceKm += haversineDistance(
          allPoints[j - 1].lat, allPoints[j - 1].lon,
          allPoints[j].lat, allPoints[j].lon
        );
      }

      // Calculate duration from timestamps
      const firstTime = allPoints[0].time ? new Date(allPoints[0].time as string) : null;
      const lastTime = allPoints[allPoints.length - 1].time ? new Date(allPoints[allPoints.length - 1].time as string) : null;
      let durationMinutes = 0;
      if (firstTime && lastTime) {
        durationMinutes = Math.round((lastTime.getTime() - firstTime.getTime()) / 60000);
      }

      // Average HR
      const hrValues = allPoints.filter(p => p.hr).map(p => p.hr!);
      const avgHR = hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null;

      // Date & time
      const startDate = firstTime || new Date();
      const dateStr = startDate.toISOString().split('T')[0];
      const timeStr = startDate.toTimeString().slice(0, 5);

      activities.push({
        id: `gpx_${i}_${Date.now()}`,
        name,
        sportType: sportType || 'Running',
        yoroiSportId: mapSportType(sportType || 'running'),
        date: dateStr,
        startTime: timeStr,
        durationMinutes: Math.max(durationMinutes, 1),
        distanceKm: Math.round(totalDistanceKm * 100) / 100,
        calories: null,
        avgHeartRate: avgHR,
        selected: true,
      });
    } catch (e: any) {
      errors.push(`Track ${i + 1}: ${e.message}`);
    }
  }

  return { activities, format: 'gpx', errors };
}

// ============================================
// TCX PARSER
// ============================================

function parseTCX(xmlContent: string): ParseResult {
  const parser = new XMLParser(parserOptions);
  const parsed = parser.parse(xmlContent);
  const errors: string[] = [];
  const activities: ParsedActivity[] = [];

  const tcd = parsed.TrainingCenterDatabase;
  if (!tcd) {
    return { activities: [], format: 'tcx', errors: ['Invalid TCX: missing <TrainingCenterDatabase> root element'] };
  }

  const activityList = ensureArray(tcd.Activities?.Activity);

  for (let i = 0; i < activityList.length; i++) {
    const activity = activityList[i];
    try {
      const sportType = activity['@_Sport'] || '';
      const laps = ensureArray(activity.Lap);

      let totalDurationSec = 0;
      let totalDistanceM = 0;
      let totalCalories = 0;
      let hrSum = 0;
      let hrCount = 0;

      for (const lap of laps) {
        if (lap.TotalTimeSeconds) totalDurationSec += Number(lap.TotalTimeSeconds);
        if (lap.DistanceMeters) totalDistanceM += Number(lap.DistanceMeters);
        if (lap.Calories) totalCalories += Number(lap.Calories);
        if (lap.AverageHeartRateBpm?.Value) {
          hrSum += Number(lap.AverageHeartRateBpm.Value);
          hrCount++;
        }
      }

      const durationMinutes = Math.round(totalDurationSec / 60);
      const distanceKm = Math.round((totalDistanceM / 1000) * 100) / 100;
      const avgHR = hrCount > 0 ? Math.round(hrSum / hrCount) : null;

      // Start time from activity ID or first lap
      const startTimeStr = activity.Id || laps[0]?.['@_StartTime'];
      const startDate = startTimeStr ? new Date(startTimeStr) : new Date();
      const dateStr = startDate.toISOString().split('T')[0];
      const timeStr = startDate.toTimeString().slice(0, 5);

      // Activity name from Notes or sport type
      const name = activity.Notes || `${sportType || 'Workout'} - ${dateStr}`;

      activities.push({
        id: `tcx_${i}_${Date.now()}`,
        name,
        sportType: sportType || 'Other',
        yoroiSportId: mapSportType(sportType || 'other'),
        date: dateStr,
        startTime: timeStr,
        durationMinutes: Math.max(durationMinutes, 1),
        distanceKm: distanceKm > 0 ? distanceKm : null,
        calories: totalCalories > 0 ? totalCalories : null,
        avgHeartRate: avgHR,
        selected: true,
      });
    } catch (e: any) {
      errors.push(`Activity ${i + 1}: ${e.message}`);
    }
  }

  return { activities, format: 'tcx', errors };
}

// ============================================
// MAIN ENTRY POINT
// ============================================

export function parseWorkoutFile(content: string, fileName: string): ParseResult {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.gpx')) {
    return parseGPX(content);
  } else if (lowerName.endsWith('.tcx')) {
    return parseTCX(content);
  }

  // Try to auto-detect from content
  if (content.includes('<gpx')) {
    return parseGPX(content);
  } else if (content.includes('<TrainingCenterDatabase')) {
    return parseTCX(content);
  }

  return {
    activities: [],
    format: 'gpx',
    errors: ['Unsupported file format. Please use GPX or TCX files.'],
  };
}

// ============================================
// CONVERT TO TRAINING
// ============================================

export function activityToTraining(activity: ParsedActivity, sportOverride?: string): Training {
  return {
    sport: sportOverride || activity.yoroiSportId,
    date: activity.date,
    start_time: activity.startTime,
    duration_minutes: activity.durationMinutes,
    distance: activity.distanceKm ?? undefined,
    calories: activity.calories ?? undefined,
    heart_rate: activity.avgHeartRate ?? undefined,
    notes: `Imported from ${activity.sportType} (${activity.name})`,
  };
}
