// ============================================
// TEMPLATE CSV UNIFIE
// Un seul fichier avec poids + composition + mensurations
// Une ligne = une date avec toutes les donnees
// ============================================

import { getWeights, getMeasurements, addWeight, addMeasurementRecord } from '@/lib/database';
import { getAllBodyCompositions, addBodyComposition } from '@/lib/bodyComposition';
import {
  validateDate,
  validateWeight,
  validateBodyFat,
  validateMuscleMass,
  validateWater,
  validateVisceralFat,
  validateMetabolicAge,
  validateBodyMeasurement,
  sanitizeString,
} from '@/lib/security/validators';
import { parseCSVLine } from '@/lib/csvImportExportService';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface SimpleParseResult {
  rows: SimpleParsedRow[];
  validCount: number;
  invalidCount: number;
  summary: {
    weights: number;
    measurements: number;
    compositions: number;
  };
}

export interface SimpleParsedRow {
  lineNumber: number;
  data: Record<string, string>;
  valid: boolean;
  error?: string;
  preview?: string;
  // Ce qui sera importe pour cette ligne
  hasWeight: boolean;
  hasMeasurements: boolean;
  hasComposition: boolean;
}

export interface SimpleImportResult {
  total: number;
  success: number;
  details: {
    weights: number;
    measurements: number;
    compositions: number;
  };
  errors: Array<{ line: number; error: string }>;
}

// ============================================
// HEADERS - Toutes les colonnes en un seul fichier
// ============================================

const UNIFIED_HEADERS = [
  // Date
  'Date',
  // Poids + Composition corporelle
  'Poids (kg)',
  'Graisse (%)',
  'Muscle (%)',
  'Eau (%)',
  'Masse osseuse (kg)',
  'Graisse viscerale',
  'Age metabolique',
  'Metabolisme basal (kcal)',
  // Mensurations
  'Poitrine (cm)',
  'Taille (cm)',
  'Nombril (cm)',
  'Hanches (cm)',
  'Bras G (cm)',
  'Bras D (cm)',
  'Cuisse G (cm)',
  'Cuisse D (cm)',
  'Mollet G (cm)',
  'Mollet D (cm)',
  'Epaules (cm)',
  'Cou (cm)',
  // Extras
  'Note',
  'Source',
];

const HEADER_MAP: Record<string, string> = {
  'Date': 'date',
  'Poids (kg)': 'weight',
  'Graisse (%)': 'fat_percent',
  'Muscle (%)': 'muscle_percent',
  'Eau (%)': 'water_percent',
  'Masse osseuse (kg)': 'bone_mass',
  'Graisse viscerale': 'visceral_fat',
  'Age metabolique': 'metabolic_age',
  'Metabolisme basal (kcal)': 'bmr',
  'Poitrine (cm)': 'chest',
  'Taille (cm)': 'waist',
  'Nombril (cm)': 'navel',
  'Hanches (cm)': 'hips',
  'Bras G (cm)': 'left_arm',
  'Bras D (cm)': 'right_arm',
  'Cuisse G (cm)': 'left_thigh',
  'Cuisse D (cm)': 'right_thigh',
  'Mollet G (cm)': 'left_calf',
  'Mollet D (cm)': 'right_calf',
  'Epaules (cm)': 'shoulders',
  'Cou (cm)': 'neck',
  'Note': 'note',
  'Source': 'source',
};

const MEASUREMENT_FIELDS = [
  'chest', 'waist', 'navel', 'hips',
  'left_arm', 'right_arm',
  'left_thigh', 'right_thigh',
  'left_calf', 'right_calf',
  'shoulders', 'neck',
];

// ============================================
// HELPERS
// ============================================

function getOptionalFloat(data: Record<string, string>, key: string): number | undefined {
  const val = data[key];
  if (!val || val.trim() === '') return undefined;
  const num = parseFloat(val.replace(',', '.'));
  return isNaN(num) ? undefined : num;
}

function getOptionalString(data: Record<string, string>, key: string): string | undefined {
  const val = data[key];
  if (!val || val.trim() === '') return undefined;
  return sanitizeString(val);
}

function formatFloat(val: number | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val);
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^"|"$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// ============================================
// GENERATE TEMPLATE
// ============================================

export function generateUnifiedTemplate(): string {
  const lines: string[] = [];
  lines.push(UNIFIED_HEADERS.join(','));
  // Exemple 1 : tout rempli
  lines.push('2026-01-15,82.5,18.2,42.1,55.3,3.2,8,35,1850,102,78,82,97,36,37,58,59,38,39,120,38,Apres competition,balance');
  // Exemple 2 : juste le poids
  lines.push('2026-01-18,81.8,,,,,,,,,,,,,,,,,,,,Jour de repos,');
  // Exemple 3 : poids + mensurations (pas de composition)
  lines.push('2026-01-20,82.0,,,,,,,,103,79,,98,37,38,,,,,,,,');
  // Exemple 4 : juste les mensurations
  lines.push('2026-01-22,,,,,,,,,,104,78,83,97,,,,,,,,,,');
  return lines.join('\n');
}

// ============================================
// PARSE CSV
// ============================================

export function parseUnifiedCSV(content: string): SimpleParseResult {
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);
  const rows: SimpleParsedRow[] = [];
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (headers.length === 0) {
      headers = parseCSVLine(line);
      continue;
    }

    const fields = parseCSVLine(line);
    if (fields.every(f => !f.trim())) continue;

    const data: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const normalized = normalizeHeader(headers[j]);
      const key = HEADER_MAP[normalized] || normalized;
      data[key] = fields[j] || '';
    }

    const validation = validateUnifiedRow(data);
    const weight = getOptionalFloat(data, 'weight');
    const fat = getOptionalFloat(data, 'fat_percent');
    const hasMeas = MEASUREMENT_FIELDS.some(f => getOptionalFloat(data, f) !== undefined);
    const hasComp = weight !== undefined && fat !== undefined
      && getOptionalFloat(data, 'muscle_percent') !== undefined
      && getOptionalFloat(data, 'bone_mass') !== undefined
      && getOptionalFloat(data, 'visceral_fat') !== undefined;

    // Build preview
    const parts: string[] = [];
    if (data['date']) parts.push(data['date']);
    if (weight !== undefined) parts.push(`${weight} kg`);
    if (fat !== undefined) parts.push(`${fat}% graisse`);
    if (hasMeas) parts.push('mensurations');

    rows.push({
      lineNumber: i + 1,
      data,
      valid: validation.valid,
      error: validation.error,
      preview: parts.join(' - '),
      hasWeight: weight !== undefined,
      hasMeasurements: hasMeas,
      hasComposition: hasComp,
    });
  }

  return {
    rows,
    validCount: rows.filter(r => r.valid).length,
    invalidCount: rows.filter(r => !r.valid).length,
    summary: {
      weights: rows.filter(r => r.valid && r.hasWeight).length,
      measurements: rows.filter(r => r.valid && r.hasMeasurements).length,
      compositions: rows.filter(r => r.valid && r.hasComposition).length,
    },
  };
}

// ============================================
// VALIDATION
// ============================================

function validateUnifiedRow(data: Record<string, string>): { valid: boolean; error?: string } {
  const errors: string[] = [];

  // Date obligatoire
  const date = data['date']?.trim();
  if (!date) return { valid: false, error: 'Date manquante' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valid: false, error: `Format date invalide: "${date}". Utiliser AAAA-MM-JJ` };
  const dr = validateDate(date);
  if (!dr.valid) return { valid: false, error: dr.error };

  // Au moins une donnee doit etre presente
  const weight = getOptionalFloat(data, 'weight');
  const hasMeas = MEASUREMENT_FIELDS.some(f => getOptionalFloat(data, f) !== undefined);

  if (weight === undefined && !hasMeas) {
    return { valid: false, error: 'Au moins un poids ou une mensuration requis' };
  }

  // Valider poids si present
  if (weight !== undefined) {
    const wr = validateWeight(weight);
    if (!wr.valid) errors.push(wr.error!);
  }

  // Valider composition si presente
  const fat = getOptionalFloat(data, 'fat_percent');
  if (fat !== undefined) { const r = validateBodyFat(fat); if (!r.valid) errors.push(r.error!); }

  const muscle = getOptionalFloat(data, 'muscle_percent');
  if (muscle !== undefined) { const r = validateMuscleMass(muscle); if (!r.valid) errors.push(r.error!); }

  const water = getOptionalFloat(data, 'water_percent');
  if (water !== undefined) { const r = validateWater(water); if (!r.valid) errors.push(r.error!); }

  const visceral = getOptionalFloat(data, 'visceral_fat');
  if (visceral !== undefined) { const r = validateVisceralFat(visceral); if (!r.valid) errors.push(r.error!); }

  const metaAge = getOptionalFloat(data, 'metabolic_age');
  if (metaAge !== undefined) { const r = validateMetabolicAge(metaAge); if (!r.valid) errors.push(r.error!); }

  // Valider mensurations si presentes
  for (const field of MEASUREMENT_FIELDS) {
    const val = getOptionalFloat(data, field);
    if (val !== undefined) {
      const r = validateBodyMeasurement(val, field);
      if (!r.valid) errors.push(r.error!);
    }
  }

  return errors.length > 0 ? { valid: false, error: errors.join(', ') } : { valid: true };
}

// ============================================
// IMPORT
// ============================================

export async function importUnifiedRows(rows: SimpleParsedRow[]): Promise<SimpleImportResult> {
  const valid = rows.filter(r => r.valid);
  let success = 0;
  let weightCount = 0;
  let measurementCount = 0;
  let compositionCount = 0;
  const importErrors: SimpleImportResult['errors'] = [];

  for (const row of valid) {
    try {
      const date = row.data['date'];
      const weight = getOptionalFloat(row.data, 'weight');

      // 1. Sauvegarder le poids si present
      if (weight !== undefined) {
        await addWeight({
          date,
          weight,
          fat_percent: getOptionalFloat(row.data, 'fat_percent'),
          muscle_percent: getOptionalFloat(row.data, 'muscle_percent'),
          water_percent: getOptionalFloat(row.data, 'water_percent'),
          bone_mass: getOptionalFloat(row.data, 'bone_mass'),
          visceral_fat: getOptionalFloat(row.data, 'visceral_fat'),
          metabolic_age: getOptionalFloat(row.data, 'metabolic_age'),
          bmr: getOptionalFloat(row.data, 'bmr'),
          note: getOptionalString(row.data, 'note'),
          source: getOptionalString(row.data, 'source') || 'csv',
        });
        weightCount++;
      }

      // 2. Sauvegarder les mensurations si presentes
      if (row.hasMeasurements) {
        await addMeasurementRecord({
          date,
          chest: getOptionalFloat(row.data, 'chest'),
          waist: getOptionalFloat(row.data, 'waist'),
          navel: getOptionalFloat(row.data, 'navel'),
          hips: getOptionalFloat(row.data, 'hips'),
          left_arm: getOptionalFloat(row.data, 'left_arm'),
          right_arm: getOptionalFloat(row.data, 'right_arm'),
          left_thigh: getOptionalFloat(row.data, 'left_thigh'),
          right_thigh: getOptionalFloat(row.data, 'right_thigh'),
          left_calf: getOptionalFloat(row.data, 'left_calf'),
          right_calf: getOptionalFloat(row.data, 'right_calf'),
          shoulders: getOptionalFloat(row.data, 'shoulders'),
          neck: getOptionalFloat(row.data, 'neck'),
        });
        measurementCount++;
      }

      // 3. Sauvegarder la composition corporelle si complete
      if (row.hasComposition) {
        const fat = getOptionalFloat(row.data, 'fat_percent')!;
        const muscle = getOptionalFloat(row.data, 'muscle_percent')!;
        const bone = getOptionalFloat(row.data, 'bone_mass')!;
        const visceral = getOptionalFloat(row.data, 'visceral_fat')!;

        await addBodyComposition({
          date,
          weight: weight!,
          bodyFatPercent: fat,
          muscleMass: muscle,
          waterPercent: getOptionalFloat(row.data, 'water_percent') ?? 0,
          boneMass: bone,
          visceralFat: visceral,
          metabolicAge: getOptionalFloat(row.data, 'metabolic_age'),
          bmr: getOptionalFloat(row.data, 'bmr'),
          source: getOptionalString(row.data, 'source') || 'csv',
        });
        compositionCount++;
      }

      success++;
    } catch (err: unknown) {
      importErrors.push({ line: row.lineNumber, error: err instanceof Error ? err.message : 'Erreur inconnue' });
    }
  }

  return {
    total: valid.length,
    success,
    details: {
      weights: weightCount,
      measurements: measurementCount,
      compositions: compositionCount,
    },
    errors: importErrors,
  };
}

// ============================================
// EXPORT - Toutes les donnees en un seul CSV
// ============================================

export async function exportUnifiedCSV(): Promise<string> {
  // Charger toutes les donnees
  const [weights, measurements, compositions] = await Promise.all([
    getWeights(),
    getMeasurements(),
    getAllBodyCompositions(),
  ]);

  // Regrouper par date
  const byDate: Record<string, {
    weight?: any;
    measurement?: any;
    composition?: any;
  }> = {};

  for (const w of weights) {
    if (!byDate[w.date]) byDate[w.date] = {};
    byDate[w.date].weight = w;
  }

  for (const m of measurements) {
    if (!byDate[m.date]) byDate[m.date] = {};
    byDate[m.date].measurement = m;
  }

  for (const c of compositions) {
    if (!byDate[c.date]) byDate[c.date] = {};
    byDate[c.date].composition = c;
  }

  // Trier par date
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const lines: string[] = [UNIFIED_HEADERS.join(',')];

  for (const date of dates) {
    const entry = byDate[date];
    const w = entry.weight;
    const m = entry.measurement;
    const c = entry.composition;

    // Poids : priorise composition si elle a le poids
    const weight = w?.weight ?? c?.weight;
    const fat = w?.fat_percent ?? c?.bodyFatPercent;
    const muscle = w?.muscle_percent ?? c?.muscleMass;
    const water = w?.water_percent ?? c?.waterPercent;
    const bone = w?.bone_mass ?? c?.boneMass;
    const visceral = w?.visceral_fat ?? c?.visceralFat;
    const metaAge = w?.metabolic_age ?? c?.metabolicAge;
    const bmr = w?.bmr ?? c?.bmr;
    const note = w?.note || '';
    const source = w?.source ?? c?.source ?? '';

    lines.push([
      date,
      formatFloat(weight),
      formatFloat(fat),
      formatFloat(muscle),
      formatFloat(water),
      formatFloat(bone),
      formatFloat(visceral),
      formatFloat(metaAge),
      formatFloat(bmr),
      formatFloat(m?.chest),
      formatFloat(m?.waist),
      formatFloat(m?.navel),
      formatFloat(m?.hips),
      formatFloat(m?.left_arm),
      formatFloat(m?.right_arm),
      formatFloat(m?.left_thigh),
      formatFloat(m?.right_thigh),
      formatFloat(m?.left_calf),
      formatFloat(m?.right_calf),
      formatFloat(m?.shoulders),
      formatFloat(m?.neck),
      note ? escapeCSV(note) : '',
      source ? escapeCSV(source) : '',
    ].join(','));
  }

  return lines.join('\n');
}

// ============================================
// SHARE
// ============================================

export async function shareTemplate(): Promise<boolean> {
  try {
    const content = generateUnifiedTemplate();
    const path = `${FileSystem.cacheDirectory}yoroi_modele.csv`;
    await FileSystem.writeAsStringAsync(path, content);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      logger.warn('Sharing not available');
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

export async function shareExportCSV(): Promise<boolean> {
  try {
    const content = await exportUnifiedCSV();
    const path = `${FileSystem.cacheDirectory}yoroi_export.csv`;
    await FileSystem.writeAsStringAsync(path, content);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      logger.warn('Sharing not available');
      return false;
    }

    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Yoroi',
      UTI: 'public.comma-separated-values-text',
    });

    return true;
  } catch (err) {
    logger.error('Error sharing export CSV:', err);
    return false;
  }
}
