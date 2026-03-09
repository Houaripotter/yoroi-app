// ============================================
// SERVICE IMPORT/EXPORT CSV UNIVERSEL
// Un seul fichier CSV avec colonne TYPE
// ============================================

import { addWeight, addTraining, addMeasurementRecord } from '@/lib/database';
import { addSleepEntry } from '@/lib/sleepService';
import { addHydrationEntry } from '@/lib/storage';
import { saveMood } from '@/lib/storage';
import {
  validateDate,
  validateWeight,
  validateBodyFat,
  validateMuscleMass,
  validateWater,
  validateVisceralFat,
  validateMetabolicAge,
  validateHydrationEntry,
  validateTrainingDuration,
  validateBodyMeasurement,
  validateNumber,
  sanitizeString,
  VALIDATION_LIMITS,
} from '@/lib/security/validators';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export type CSVRowType = 'POIDS' | 'ENTRAÎNEMENT' | 'MENSURATION' | 'SOMMEIL' | 'HYDRATATION' | 'HUMEUR';

export const CSV_ROW_TYPES: CSVRowType[] = ['POIDS', 'ENTRAÎNEMENT', 'MENSURATION', 'SOMMEIL', 'HYDRATATION', 'HUMEUR'];

export interface ParsedCSVRow {
  lineNumber: number;
  type: CSVRowType;
  data: Record<string, string>;
  valid: boolean;
  error?: string;
}

export interface CSVParseResult {
  rows: ParsedCSVRow[];
  validCount: number;
  invalidCount: number;
  byType: Record<CSVRowType, ParsedCSVRow[]>;
}

export interface CSVImportResult {
  total: number;
  success: number;
  errors: Array<{ line: number; type: string; error: string }>;
}

// ============================================
// CSV HEADERS
// ============================================

const CSV_HEADERS = [
  'TYPE', 'date',
  // Poids / composition
  'weight', 'fat_percent', 'muscle_percent', 'water_percent', 'bone_mass',
  'visceral_fat', 'metabolic_age', 'bmr', 'note', 'source',
  // Entraînement
  'sport', 'start_time', 'duration_minutes', 'intensity', 'calories',
  'distance', 'rounds', 'round_duration', 'muscles', 'technique_rating',
  'is_outdoor', 'pente', 'speed', 'resistance', 'watts', 'cadence', 'notes',
  // Mensurations
  'chest', 'waist', 'navel', 'hips', 'left_arm', 'right_arm',
  'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'shoulders', 'neck',
  // Sommeil
  'bedTime', 'wakeTime', 'quality',
  // Hydratation
  'amount_ml',
  // Humeur
  'mood', 'energy',
];

// ============================================
// GENERATE CSV TEMPLATE
// ============================================

export function generateCSVTemplate(): string {
  const lines: string[] = [];

  // Comment header
  lines.push('# YOROI - Modele Import CSV');
  lines.push('# Remplissez les lignes ci-dessous puis importez dans l\'app');
  lines.push('# TYPE = POIDS | ENTRAÎNEMENT | MENSURATION | SOMMEIL | HYDRATATION | HUMEUR');
  lines.push('# Laissez vides les colonnes non pertinentes pour votre type');
  lines.push('# Dates au format YYYY-MM-DD, heures au format HH:MM');
  lines.push('#');

  // Headers
  lines.push(CSV_HEADERS.join(','));

  // Examples - POIDS
  lines.push('POIDS,2025-01-15,82.5,18.2,42.1,55.3,3.2,8,35,1850,Apres competition,csv,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
  lines.push('POIDS,2025-01-20,81.8,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');

  // Examples - ENTRAÎNEMENT
  lines.push('ENTRAÎNEMENT,2025-01-15,,,,,,,,,,jjb,18:30,90,8,650,,5,5,dos|epaules,,0,,,,,Bonne séance,,,,,,,,,,,,,,,,');
  lines.push('ENTRAÎNEMENT,2025-01-16,,,,,,,,,,running,07:00,45,6,380,8.5,,,,,,1,,12,,,Footing matinal,,,,,,,,,,,,,,,,');

  // Examples - MENSURATION
  lines.push('MENSURATION,2025-01-15,,,,,,,,,,,,,,,,,,,,,,,,,,,102,78,82,97,36,37,58,59,38,39,120,38,,,,,,');

  // Examples - SOMMEIL
  lines.push('SOMMEIL,2025-01-15,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,23:00,07:00,4,,,,');
  lines.push('SOMMEIL,2025-01-16,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,22:30,06:45,3,,,,');

  // Examples - HYDRATATION
  lines.push('HYDRATATION,2025-01-15,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,500,,');
  lines.push('HYDRATATION,2025-01-15,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,350,,');

  // Examples - HUMEUR
  lines.push('HUMEUR,2025-01-15,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,bien,4');

  return lines.join('\n');
}

// ============================================
// CSV PARSER
// ============================================

/**
 * Parse a single CSV line handling quoted fields with commas
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse full CSV content into validated rows grouped by type
 */
export function parseCSVContent(content: string): CSVParseResult {
  // Strip BOM
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);

  let headers: string[] = [];
  const rows: ParsedCSVRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // First non-comment line = headers
    if (headers.length === 0) {
      headers = parseCSVLine(line).map(h => h.replace(/^"|"$/g, ''));
      continue;
    }

    const fields = parseCSVLine(line);
    const data: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      data[headers[j]] = fields[j] || '';
    }

    const typeRaw = (data['TYPE'] || '').toUpperCase().trim();
    if (!CSV_ROW_TYPES.includes(typeRaw as CSVRowType)) {
      if (typeRaw) {
        rows.push({
          lineNumber: i + 1,
          type: typeRaw as CSVRowType,
          data,
          valid: false,
          error: `Type inconnu: "${typeRaw}". Types valides: ${CSV_ROW_TYPES.join(', ')}`,
        });
      }
      continue;
    }

    const type = typeRaw as CSVRowType;
    const validation = validateRow(type, data);

    rows.push({
      lineNumber: i + 1,
      type,
      data,
      valid: validation.valid,
      error: validation.error,
    });
  }

  // Group by type
  const byType: Record<CSVRowType, ParsedCSVRow[]> = {
    POIDS: [],
    ENTRAÎNEMENT: [],
    MENSURATION: [],
    SOMMEIL: [],
    HYDRATATION: [],
    HUMEUR: [],
  };

  for (const row of rows) {
    if (byType[row.type]) {
      byType[row.type].push(row);
    }
  }

  return {
    rows,
    validCount: rows.filter(r => r.valid).length,
    invalidCount: rows.filter(r => !r.valid).length,
    byType,
  };
}

// ============================================
// VALIDATION PER TYPE
// ============================================

function getOptionalFloat(data: Record<string, string>, key: string): number | undefined {
  const val = data[key];
  if (!val || val.trim() === '') return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
}

function getOptionalInt(data: Record<string, string>, key: string): number | undefined {
  const val = data[key];
  if (!val || val.trim() === '') return undefined;
  const num = parseInt(val, 10);
  return isNaN(num) ? undefined : num;
}

function getOptionalString(data: Record<string, string>, key: string): string | undefined {
  const val = data[key];
  if (!val || val.trim() === '') return undefined;
  return sanitizeString(val);
}

interface RowValidation {
  valid: boolean;
  error?: string;
}

export function validateRow(type: CSVRowType, data: Record<string, string>): RowValidation {
  const errors: string[] = [];

  // Date is required for all types
  const date = data['date']?.trim();
  if (!date) {
    return { valid: false, error: 'Date manquante' };
  }

  // Validate YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: `Format de date invalide: "${date}". Utiliser YYYY-MM-DD` };
  }

  const dateResult = validateDate(date);
  if (!dateResult.valid) {
    return { valid: false, error: dateResult.error };
  }

  switch (type) {
    case 'POIDS':
      return validatePoidsRow(data, errors);
    case 'ENTRAÎNEMENT':
      return validateEntrainementRow(data, errors);
    case 'MENSURATION':
      return validateMensurationRow(data, errors);
    case 'SOMMEIL':
      return validateSommeilRow(data, errors);
    case 'HYDRATATION':
      return validateHydratationRow(data, errors);
    case 'HUMEUR':
      return validateHumeurRow(data, errors);
    default:
      return { valid: false, error: `Type inconnu: ${type}` };
  }
}

function validatePoidsRow(data: Record<string, string>, errors: string[]): RowValidation {
  const weight = getOptionalFloat(data, 'weight');
  if (weight === undefined) {
    return { valid: false, error: 'Poids manquant' };
  }
  const wr = validateWeight(weight);
  if (!wr.valid) errors.push(wr.error!);

  const fat = getOptionalFloat(data, 'fat_percent');
  if (fat !== undefined) {
    const r = validateBodyFat(fat);
    if (!r.valid) errors.push(r.error!);
  }

  const muscle = getOptionalFloat(data, 'muscle_percent');
  if (muscle !== undefined) {
    const r = validateMuscleMass(muscle);
    if (!r.valid) errors.push(r.error!);
  }

  const water = getOptionalFloat(data, 'water_percent');
  if (water !== undefined) {
    const r = validateWater(water);
    if (!r.valid) errors.push(r.error!);
  }

  const visceral = getOptionalFloat(data, 'visceral_fat');
  if (visceral !== undefined) {
    const r = validateVisceralFat(visceral);
    if (!r.valid) errors.push(r.error!);
  }

  const metaAge = getOptionalFloat(data, 'metabolic_age');
  if (metaAge !== undefined) {
    const r = validateMetabolicAge(metaAge);
    if (!r.valid) errors.push(r.error!);
  }

  return errors.length > 0
    ? { valid: false, error: errors.join(', ') }
    : { valid: true };
}

function validateEntrainementRow(data: Record<string, string>, errors: string[]): RowValidation {
  const sport = getOptionalString(data, 'sport');
  if (!sport) {
    return { valid: false, error: 'Sport manquant' };
  }

  const duration = getOptionalFloat(data, 'duration_minutes');
  if (duration !== undefined) {
    const r = validateTrainingDuration(duration);
    if (!r.valid) errors.push(r.error!);
  }

  const intensity = getOptionalFloat(data, 'intensity');
  if (intensity !== undefined) {
    const r = validateNumber(intensity, 1, 10, 'Intensite');
    if (!r.valid) errors.push(r.error!);
  }

  const technique = getOptionalFloat(data, 'technique_rating');
  if (technique !== undefined) {
    const r = validateNumber(technique, 1, 5, 'Technique');
    if (!r.valid) errors.push(r.error!);
  }

  const calories = getOptionalFloat(data, 'calories');
  if (calories !== undefined) {
    const r = validateNumber(calories, 0, 5000, 'Calories');
    if (!r.valid) errors.push(r.error!);
  }

  return errors.length > 0
    ? { valid: false, error: errors.join(', ') }
    : { valid: true };
}

function validateMensurationRow(data: Record<string, string>, errors: string[]): RowValidation {
  const measureFields = [
    'chest', 'waist', 'navel', 'hips', 'left_arm', 'right_arm',
    'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'shoulders', 'neck',
  ];

  let hasAtLeastOne = false;
  for (const field of measureFields) {
    const val = getOptionalFloat(data, field);
    if (val !== undefined) {
      hasAtLeastOne = true;
      const r = validateBodyMeasurement(val, field);
      if (!r.valid) errors.push(r.error!);
    }
  }

  if (!hasAtLeastOne) {
    return { valid: false, error: 'Au moins une mensuration requise' };
  }

  return errors.length > 0
    ? { valid: false, error: errors.join(', ') }
    : { valid: true };
}

function validateSommeilRow(data: Record<string, string>, errors: string[]): RowValidation {
  const bedTime = getOptionalString(data, 'bedTime');
  const wakeTime = getOptionalString(data, 'wakeTime');

  if (!bedTime) return { valid: false, error: 'Heure de coucher manquante' };
  if (!wakeTime) return { valid: false, error: 'Heure de reveil manquante' };

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(bedTime)) errors.push(`Format heure coucher invalide: "${bedTime}". Utiliser HH:MM`);
  if (!timeRegex.test(wakeTime)) errors.push(`Format heure reveil invalide: "${wakeTime}". Utiliser HH:MM`);

  const quality = getOptionalFloat(data, 'quality');
  if (quality !== undefined) {
    const r = validateNumber(quality, 1, 5, 'Qualité sommeil');
    if (!r.valid) errors.push(r.error!);
  }

  return errors.length > 0
    ? { valid: false, error: errors.join(', ') }
    : { valid: true };
}

function validateHydratationRow(data: Record<string, string>, errors: string[]): RowValidation {
  const amount = getOptionalFloat(data, 'amount_ml');
  if (amount === undefined) {
    return { valid: false, error: 'Quantite (amount_ml) manquante' };
  }
  const r = validateHydrationEntry(amount);
  if (!r.valid) return { valid: false, error: r.error };
  return { valid: true };
}

function validateHumeurRow(data: Record<string, string>, errors: string[]): RowValidation {
  const mood = getOptionalString(data, 'mood');
  if (!mood) return { valid: false, error: 'Humeur (mood) manquante' };

  const energy = getOptionalFloat(data, 'energy');
  if (energy === undefined) return { valid: false, error: 'Énergie (energy) manquante' };

  const r = validateNumber(energy, 1, 5, 'Énergie');
  if (!r.valid) return { valid: false, error: r.error };

  return { valid: true };
}

// ============================================
// IMPORT INTO DATABASE
// ============================================

export async function importParsedRows(rows: ParsedCSVRow[]): Promise<CSVImportResult> {
  const validRows = rows.filter(r => r.valid);
  let success = 0;
  const importErrors: CSVImportResult['errors'] = [];

  for (const row of validRows) {
    try {
      switch (row.type) {
        case 'POIDS':
          await importPoidsRow(row.data);
          break;
        case 'ENTRAÎNEMENT':
          await importEntrainementRow(row.data);
          break;
        case 'MENSURATION':
          await importMensurationRow(row.data);
          break;
        case 'SOMMEIL':
          await importSommeilRow(row.data);
          break;
        case 'HYDRATATION':
          await importHydratationRow(row.data);
          break;
        case 'HUMEUR':
          await importHumeurRow(row.data);
          break;
      }
      success++;
    } catch (err: unknown) {
      logger.error(`CSV import error line ${row.lineNumber}:`, err);
      importErrors.push({
        line: row.lineNumber,
        type: row.type,
        error: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  return {
    total: validRows.length,
    success,
    errors: importErrors,
  };
}

async function importPoidsRow(data: Record<string, string>): Promise<void> {
  await addWeight({
    date: data['date'],
    weight: parseFloat(data['weight']),
    fat_percent: getOptionalFloat(data, 'fat_percent'),
    muscle_percent: getOptionalFloat(data, 'muscle_percent'),
    water_percent: getOptionalFloat(data, 'water_percent'),
    bone_mass: getOptionalFloat(data, 'bone_mass'),
    visceral_fat: getOptionalFloat(data, 'visceral_fat'),
    metabolic_age: getOptionalFloat(data, 'metabolic_age'),
    bmr: getOptionalFloat(data, 'bmr'),
    note: getOptionalString(data, 'note'),
    source: 'csv',
  });
}

async function importEntrainementRow(data: Record<string, string>): Promise<void> {
  const muscles = getOptionalString(data, 'muscles');
  const isOutdoor = data['is_outdoor']?.trim();

  await addTraining({
    date: data['date'],
    sport: data['sport'].trim(),
    start_time: getOptionalString(data, 'start_time'),
    duration_minutes: getOptionalFloat(data, 'duration_minutes'),
    intensity: getOptionalFloat(data, 'intensity'),
    calories: getOptionalFloat(data, 'calories'),
    distance: getOptionalFloat(data, 'distance'),
    rounds: getOptionalInt(data, 'rounds'),
    round_duration: getOptionalFloat(data, 'round_duration'),
    muscles: muscles ? JSON.stringify(muscles.split('|').map(m => m.trim())) : undefined,
    technique_rating: getOptionalFloat(data, 'technique_rating'),
    is_outdoor: isOutdoor === '1' || isOutdoor?.toLowerCase() === 'true',
    pente: getOptionalFloat(data, 'pente'),
    speed: getOptionalFloat(data, 'speed'),
    resistance: getOptionalFloat(data, 'resistance'),
    watts: getOptionalFloat(data, 'watts'),
    cadence: getOptionalFloat(data, 'cadence'),
    notes: getOptionalString(data, 'notes'),
  });
}

async function importMensurationRow(data: Record<string, string>): Promise<void> {
  await addMeasurementRecord({
    date: data['date'],
    chest: getOptionalFloat(data, 'chest'),
    waist: getOptionalFloat(data, 'waist'),
    navel: getOptionalFloat(data, 'navel'),
    hips: getOptionalFloat(data, 'hips'),
    left_arm: getOptionalFloat(data, 'left_arm'),
    right_arm: getOptionalFloat(data, 'right_arm'),
    left_thigh: getOptionalFloat(data, 'left_thigh'),
    right_thigh: getOptionalFloat(data, 'right_thigh'),
    left_calf: getOptionalFloat(data, 'left_calf'),
    right_calf: getOptionalFloat(data, 'right_calf'),
    shoulders: getOptionalFloat(data, 'shoulders'),
    neck: getOptionalFloat(data, 'neck'),
  });
}

async function importSommeilRow(data: Record<string, string>): Promise<void> {
  const quality = getOptionalFloat(data, 'quality') ?? 3;
  const notes = getOptionalString(data, 'notes') || getOptionalString(data, 'note');

  await addSleepEntry(
    data['bedTime'].trim(),
    data['wakeTime'].trim(),
    quality,
    notes,
    data['date'],
  );
}

async function importHydratationRow(data: Record<string, string>): Promise<void> {
  const amount = parseFloat(data['amount_ml']);
  await addHydrationEntry(amount, data['date']);
}

async function importHumeurRow(data: Record<string, string>): Promise<void> {
  await saveMood({
    date: data['date'],
    mood: data['mood'].trim(),
    energy: parseFloat(data['energy']),
    timestamp: new Date(data['date']).toISOString(),
  });
}

// ============================================
// SHARE TEMPLATE
// ============================================

export async function shareCSVTemplate(): Promise<boolean> {
  try {
    const template = generateCSVTemplate();
    const path = `${FileSystem.cacheDirectory}yoroi_import_template.csv`;
    await FileSystem.writeAsStringAsync(path, template);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      logger.warn('Sharing not available on this device');
      return false;
    }

    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Modele CSV Yoroi',
      UTI: 'public.comma-separated-values-text',
    });

    return true;
  } catch (err) {
    logger.error('Error sharing CSV template:', err);
    return false;
  }
}
