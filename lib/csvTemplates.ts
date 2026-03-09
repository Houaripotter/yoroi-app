// ============================================
// TEMPLATE CSV UNIFIE v3.0
// Un seul fichier avec poids + composition + mensurations
// Une ligne = une date avec toutes les données
//
// COMPATIBILITE:
//  - Accepte , et ; comme separateur
//  - Accepte . et , comme decimal
//  - Accepte JJ/MM/AAAA, AAAA-MM-JJ, DD/MM/YYYY, AAAA/MM/JJ
//  - Reconnaît les anciens noms de colonnes (v1.0)
//  - Ignore les lignes de commentaires (#)
//  - BOM UTF-8 géré
// ============================================

import { getWeights, getMeasurements, addWeight, addMeasurementRecord, openDatabase } from '@/lib/database';
import { getAllBodyCompositions } from '@/lib/bodyComposition';
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
// HEADERS v3 - Noms clairs + rétro-compat v1
// ============================================

// En-têtes officiels v3 (utilisés pour l'export)
const UNIFIED_HEADERS_V3 = [
  'Date',
  'Poids (kg)',
  'Masse grasse (%)',
  'Masse musculaire (%)',
  'Eau (%)',
  'Masse osseuse (kg)',
  'Graisse viscerale',
  'Age metabolique',
  'Metabolisme (kcal)',
  'Poitrine (cm)',
  'Tour de taille (cm)',
  'Nombril (cm)',
  'Tour de hanches (cm)',
  'Bras gauche (cm)',
  'Bras droit (cm)',
  'Cuisse gauche (cm)',
  'Cuisse droite (cm)',
  'Mollet gauche (cm)',
  'Mollet droit (cm)',
  'Epaules (cm)',
  'Cou (cm)',
  'Note',
];

// Mapping exhaustif : TOUS les noms possibles (v1, v2, v3, anglais) → clé interne
const HEADER_MAP: Record<string, string> = {
  // Date (toutes les variantes)
  'date': 'date',
  'Date': 'date',
  'DATE': 'date',

  // Poids
  'Poids (kg)': 'weight',
  'Poids': 'weight',
  'poids': 'weight',
  'weight': 'weight',
  'Weight': 'weight',
  'Weight (kg)': 'weight',
  'Poids(kg)': 'weight',

  // Masse grasse
  'Masse grasse (%)': 'fat_percent',
  'Graisse (%)': 'fat_percent',
  'Graisse': 'fat_percent',
  'graisse': 'fat_percent',
  'fat_percent': 'fat_percent',
  'fat': 'fat_percent',
  'Body Fat (%)': 'fat_percent',
  'Masse grasse': 'fat_percent',
  'MG (%)': 'fat_percent',

  // Masse musculaire
  'Masse musculaire (%)': 'muscle_percent',
  'Muscle (%)': 'muscle_percent',
  'Muscle': 'muscle_percent',
  'muscle': 'muscle_percent',
  'muscle_percent': 'muscle_percent',
  'Muscle Mass (%)': 'muscle_percent',
  'MM (%)': 'muscle_percent',

  // Eau
  'Eau (%)': 'water_percent',
  'Eau': 'water_percent',
  'eau': 'water_percent',
  'water_percent': 'water_percent',
  'Water (%)': 'water_percent',

  // Masse osseuse
  'Masse osseuse (kg)': 'bone_mass',
  'Masse osseuse': 'bone_mass',
  'os': 'bone_mass',
  'bone_mass': 'bone_mass',
  'Bone Mass (kg)': 'bone_mass',

  // Graisse viscérale
  'Graisse viscerale': 'visceral_fat',
  'Graisse viscérale': 'visceral_fat',
  'visceral_fat': 'visceral_fat',
  'Visceral Fat': 'visceral_fat',
  'GV': 'visceral_fat',

  // Age métabolique
  'Age metabolique': 'metabolic_age',
  'Age métabolique': 'metabolic_age',
  'metabolic_age': 'metabolic_age',
  'Metabolic Age': 'metabolic_age',
  'AM': 'metabolic_age',

  // Métabolisme basal
  'Metabolisme (kcal)': 'bmr',
  'Metabolisme basal (kcal)': 'bmr',
  'Metabolisme': 'bmr',
  'bmr': 'bmr',
  'BMR': 'bmr',
  'BMR (kcal)': 'bmr',

  // Mensurations — poitrine
  'Poitrine (cm)': 'chest',
  'Poitrine': 'chest',
  'chest': 'chest',
  'Chest (cm)': 'chest',

  // Tour de taille (waist)
  'Tour de taille (cm)': 'waist',
  'Tour de taille': 'waist',
  'Taille (cm)': 'waist',   // v1 — ambigu mais accepté
  'Taille': 'waist',
  'waist': 'waist',
  'Waist (cm)': 'waist',

  // Nombril
  'Nombril (cm)': 'navel',
  'Nombril': 'navel',
  'navel': 'navel',
  'Navel (cm)': 'navel',
  'Abdomen (cm)': 'navel',

  // Tour de hanches
  'Tour de hanches (cm)': 'hips',
  'Hanches (cm)': 'hips',   // v1
  'Hanches': 'hips',
  'hips': 'hips',
  'Hips (cm)': 'hips',

  // Bras
  'Bras gauche (cm)': 'left_arm',
  'Bras G (cm)': 'left_arm',   // v1
  'Bras G': 'left_arm',
  'left_arm': 'left_arm',
  'Left Arm (cm)': 'left_arm',

  'Bras droit (cm)': 'right_arm',
  'Bras D (cm)': 'right_arm',  // v1
  'Bras D': 'right_arm',
  'right_arm': 'right_arm',
  'Right Arm (cm)': 'right_arm',

  // Cuisses
  'Cuisse gauche (cm)': 'left_thigh',
  'Cuisse G (cm)': 'left_thigh',  // v1
  'Cuisse G': 'left_thigh',
  'left_thigh': 'left_thigh',
  'Left Thigh (cm)': 'left_thigh',

  'Cuisse droite (cm)': 'right_thigh',
  'Cuisse D (cm)': 'right_thigh', // v1
  'Cuisse D': 'right_thigh',
  'right_thigh': 'right_thigh',
  'Right Thigh (cm)': 'right_thigh',

  // Mollets
  'Mollet gauche (cm)': 'left_calf',
  'Mollet G (cm)': 'left_calf',  // v1
  'Mollet G': 'left_calf',
  'left_calf': 'left_calf',
  'Left Calf (cm)': 'left_calf',

  'Mollet droit (cm)': 'right_calf',
  'Mollet D (cm)': 'right_calf', // v1
  'Mollet D': 'right_calf',
  'right_calf': 'right_calf',
  'Right Calf (cm)': 'right_calf',

  // Épaules
  'Epaules (cm)': 'shoulders',
  'Épaules (cm)': 'shoulders',
  'Epaules': 'shoulders',
  'shoulders': 'shoulders',
  'Shoulders (cm)': 'shoulders',

  // Cou
  'Cou (cm)': 'neck',
  'Cou': 'neck',
  'neck': 'neck',
  'Neck (cm)': 'neck',

  // Colonnes v1 sans distinction G/D (mappe vers gauche par défaut)
  'Bras (cm)': 'left_arm',
  'Bras': 'left_arm',
  'arm': 'left_arm',
  'Arm (cm)': 'left_arm',
  'Cuisse (cm)': 'left_thigh',
  'Cuisse': 'left_thigh',
  'thigh': 'left_thigh',
  'Thigh (cm)': 'left_thigh',
  'Mollet (cm)': 'left_calf',
  'Mollet': 'left_calf',
  'calf': 'left_calf',
  'Calf (cm)': 'left_calf',

  // Note / Source
  'Note': 'note',
  'note': 'note',
  'Notes': 'note',
  'Commentaire': 'note',
  'Remarque': 'note',
  'Source': 'source',
  'source': 'source',
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
  // Accepte "," et "." comme décimale (Excel français utilise ",")
  const num = parseFloat(val.trim().replace(',', '.'));
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
  if (val.includes(';') || val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^"|"$/g, '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    // Normalise les caractères accentués
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');
}

/**
 * Détecte le séparateur utilisé dans le CSV (virgule ou point-virgule).
 * Excel FR utilise ";", Excel EN utilise ",".
 */
function detectSeparator(line: string): string {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

/**
 * Parse une ligne CSV avec le séparateur détecté.
 * Gère les champs entre guillemets.
 */
function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === sep && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Normalise une date vers ISO AAAA-MM-JJ.
 * Accepte :
 *   JJ/MM/AAAA, JJ-MM-AAAA (format français)
 *   AAAA-MM-JJ, AAAA/MM/JJ (format ISO)
 *   JJ.MM.AAAA (format allemand)
 */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, '');

  // AAAA-MM-JJ (ISO) — format natif, déjà bon
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // AAAA/MM/JJ ou AAAA.MM.JJ
  const iso2 = s.match(/^(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})$/);
  if (iso2) return `${iso2[1]}-${iso2[2].padStart(2,'0')}-${iso2[3].padStart(2,'0')}`;

  // JJ/MM/AAAA ou JJ-MM-AAAA ou JJ.MM.AAAA (format français/européen)
  const fr = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (fr) {
    const day   = fr[1].padStart(2, '0');
    const month = fr[2].padStart(2, '0');
    const year  = fr[3];
    // Validation basique : jour <= 31, mois <= 12
    if (parseInt(day) <= 31 && parseInt(month) <= 12) {
      return `${year}-${month}-${day}`;
    }
  }

  // MM/DD/YYYY (format américain — ambigu, on détecte si premier > 12)
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const first  = parseInt(us[1]);
    const second = parseInt(us[2]);
    if (first > 12) {
      // Premier chiffre > 12 → forcément JJ/MM/AAAA
      return `${us[3]}-${us[2].padStart(2,'0')}-${us[1].padStart(2,'0')}`;
    }
    if (second > 12) {
      // Deuxième > 12 → forcément MM/DD/YYYY
      return `${us[3]}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`;
    }
    // Ambiguïté : on suppose JJ/MM/AAAA (convention française)
    return `${us[3]}-${us[2].padStart(2,'0')}-${us[1].padStart(2,'0')}`;
  }

  // AAAAMMJJ (format compact sans séparateur)
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  return null;
}

// ============================================
// GENERATE TEMPLATE
// ============================================

export function generateUnifiedTemplate(): string {
  const SEP = ';';

  // Ligne d'en-tete
  const header = UNIFIED_HEADERS_V3.join(SEP);

  // Exemples — colonne Note indique clairement "SUPPRIMER CETTE LIGNE"
  const ex1 = ['15/01/2025','82.5','18.2','42.1','55.3','3.2','8','35','1850','102','78','82','97','36','37','58','59','38','39','120','38','EXEMPLE - supprimer cette ligne'].join(SEP);
  const ex2 = ['20/01/2025','81.8','','','','','','','','','','','','','','','','','','','','EXEMPLE - supprimer cette ligne'].join(SEP);
  const ex3 = ['25/01/2025','80.0','17.5','44.0','56.0','3.3','7','34','1870','100','77','81','96','35','36','57','58','37','38','','','EXEMPLE - supprimer cette ligne'].join(SEP);

  // Ligne vide pour que l'utilisateur commence a saisir ici
  const emptyRow = ['JJ/MM/AAAA','','','','','','','','','','','','','','','','','','','','',''].join(SEP);

  return [header, ex1, ex2, ex3, emptyRow].join('\n');
}

// ============================================
// PARSE CSV — Multi-format, rétro-compatible
// ============================================

export function parseUnifiedCSV(content: string): SimpleParseResult {
  // Nettoyer BOM UTF-8
  const cleaned = content.replace(/^\uFEFF/, '');
  const allLines = cleaned.split(/\r?\n/);
  const rows: SimpleParsedRow[] = [];

  // Détecter le séparateur sur la première ligne non-commentaire
  let sep = ',';
  for (const l of allLines) {
    const t = l.trim();
    if (t && !t.startsWith('#')) { sep = detectSeparator(t); break; }
  }

  let headers: string[] = [];

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    // Ignorer lignes vides et commentaires
    if (!line || line.startsWith('#')) continue;

    if (headers.length === 0) {
      // Première ligne non-commentaire = en-têtes
      headers = parseCSVLine(line, sep).map(normalizeHeader);
      continue;
    }

    const fields = parseCSVLine(line, sep);
    if (fields.every(f => !f.trim())) continue;

    // Construire le dict avec les clés internes
    const data: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = headers[j];
      // Cherche dans HEADER_MAP avec la valeur normalisée
      // Essaie aussi avec accents normalisés pour la rétro-compat
      const key = HEADER_MAP[raw]
        || HEADER_MAP[raw.normalize('NFC')]
        || HEADER_MAP[raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
        || raw.toLowerCase().replace(/\s+/g, '_');
      data[key] = fields[j] || '';
    }

    // Normaliser la date (accepte tous les formats)
    if (data['date']) {
      const normalized = normalizeDate(data['date']);
      if (normalized) data['date'] = normalized;
    }

    const validation = validateUnifiedRow(data);
    const weight = getOptionalFloat(data, 'weight');
    const fat = getOptionalFloat(data, 'fat_percent');
    const hasMeas = MEASUREMENT_FIELDS.some(f => getOptionalFloat(data, f) !== undefined);
    const hasComp = fat !== undefined
      && getOptionalFloat(data, 'muscle_percent') !== undefined
      && getOptionalFloat(data, 'bone_mass') !== undefined
      && getOptionalFloat(data, 'visceral_fat') !== undefined;

    // Résumé lisible de la ligne
    const parts: string[] = [];
    if (data['date']) {
      // Affiche en JJ/MM/AAAA pour la preview
      const d = data['date'].split('-');
      if (d.length === 3) parts.push(`${d[2]}/${d[1]}/${d[0]}`);
      else parts.push(data['date']);
    }
    if (weight !== undefined) parts.push(`${weight} kg`);
    if (fat !== undefined) parts.push(`${fat}% graisse`);
    if (hasMeas) parts.push('mensurations');

    rows.push({
      lineNumber: i + 1,
      data,
      valid: validation.valid,
      error: validation.error,
      preview: parts.join(' — '),
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

  // Au moins une donnée doit etre presente
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

  // ── Pré-charger toutes les dates existantes (anti-doublons) ──────────────
  const db = await openDatabase();

  // Poids : Map date → id du premier enregistrement trouvé
  const existingWeightRows = await db.getAllAsync<{ date: string; id: number }>(
    'SELECT date, id FROM weights ORDER BY id ASC'
  );
  const weightIdByDate = new Map<string, number>();
  for (const w of existingWeightRows) {
    if (!weightIdByDate.has(w.date)) weightIdByDate.set(w.date, w.id);
  }

  // Mensurations : Map date → id
  const existingMeasRows = await db.getAllAsync<{ date: string; id: number }>(
    'SELECT date, id FROM measurements ORDER BY id ASC'
  );
  const measIdByDate = new Map<string, number>();
  for (const m of existingMeasRows) {
    if (!measIdByDate.has(m.date)) measIdByDate.set(m.date, m.id);
  }

  // Compositions : tableau complet chargé une fois, modifié en mémoire
  const allCompositions = await getAllBodyCompositions();
  const compIdxByDate = new Map<string, number>();
  allCompositions.forEach((c: any, i: number) => {
    if (!compIdxByDate.has(c.date)) compIdxByDate.set(c.date, i);
  });

  // ── Boucle sur les lignes valides ────────────────────────────────────────
  for (const row of valid) {
    try {
      const date = row.data['date'];
      const weight = getOptionalFloat(row.data, 'weight');

      // 1. Poids — UPDATE si la date existe déjà, INSERT sinon
      if (weight !== undefined) {
        const existingId = weightIdByDate.get(date);
        if (existingId !== undefined) {
          // Mise à jour sans créer de doublon
          await db.runAsync(
            `UPDATE weights SET weight=?, fat_percent=?, muscle_percent=?, water_percent=?,
             bone_mass=?, visceral_fat=?, metabolic_age=?, bmr=?, note=?, source='csv'
             WHERE id=?`,
            [
              weight,
              getOptionalFloat(row.data, 'fat_percent') ?? null,
              getOptionalFloat(row.data, 'muscle_percent') ?? null,
              getOptionalFloat(row.data, 'water_percent') ?? null,
              getOptionalFloat(row.data, 'bone_mass') ?? null,
              getOptionalFloat(row.data, 'visceral_fat') ?? null,
              getOptionalFloat(row.data, 'metabolic_age') ?? null,
              getOptionalFloat(row.data, 'bmr') ?? null,
              getOptionalString(row.data, 'note') ?? null,
              existingId,
            ]
          );
        } else {
          // Nouvelle date — insertion
          const newId = await addWeight({
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
            source: 'csv',
          });
          weightIdByDate.set(date, newId); // évite doublon si même date répétée dans le CSV
        }
        weightCount++;
      }

      // 2. Mensurations — UPDATE si la date existe, INSERT sinon
      if (row.hasMeasurements) {
        const existingMId = measIdByDate.get(date);
        const vals = [
          getOptionalFloat(row.data, 'chest') ?? null,
          getOptionalFloat(row.data, 'waist') ?? null,
          getOptionalFloat(row.data, 'navel') ?? null,
          getOptionalFloat(row.data, 'hips') ?? null,
          getOptionalFloat(row.data, 'left_arm') ?? null,
          getOptionalFloat(row.data, 'right_arm') ?? null,
          getOptionalFloat(row.data, 'left_thigh') ?? null,
          getOptionalFloat(row.data, 'right_thigh') ?? null,
          getOptionalFloat(row.data, 'left_calf') ?? null,
          getOptionalFloat(row.data, 'right_calf') ?? null,
          getOptionalFloat(row.data, 'shoulders') ?? null,
          getOptionalFloat(row.data, 'neck') ?? null,
        ];
        if (existingMId !== undefined) {
          await db.runAsync(
            `UPDATE measurements SET chest=?,waist=?,navel=?,hips=?,left_arm=?,right_arm=?,
             left_thigh=?,right_thigh=?,left_calf=?,right_calf=?,shoulders=?,neck=? WHERE id=?`,
            [...vals, existingMId]
          );
        } else {
          const newMId = await addMeasurementRecord({
            date,
            chest: vals[0] ?? undefined, waist: vals[1] ?? undefined,
            navel: vals[2] ?? undefined, hips: vals[3] ?? undefined,
            left_arm: vals[4] ?? undefined, right_arm: vals[5] ?? undefined,
            left_thigh: vals[6] ?? undefined, right_thigh: vals[7] ?? undefined,
            left_calf: vals[8] ?? undefined, right_calf: vals[9] ?? undefined,
            shoulders: vals[10] ?? undefined, neck: vals[11] ?? undefined,
          });
          measIdByDate.set(date, newMId);
        }
        measurementCount++;
      }

      // 3. Composition corporelle — UPDATE en mémoire si date existe, INSERT sinon
      if (row.hasComposition) {
        const fat = getOptionalFloat(row.data, 'fat_percent')!;
        const muscle = getOptionalFloat(row.data, 'muscle_percent')!;
        const bone = getOptionalFloat(row.data, 'bone_mass')!;
        const visceral = getOptionalFloat(row.data, 'visceral_fat')!;
        const existingIdx = compIdxByDate.get(date);

        if (existingIdx !== undefined) {
          // Mise à jour en mémoire (sauvegardé en bloc à la fin)
          allCompositions[existingIdx] = {
            ...allCompositions[existingIdx],
            weight: weight ?? allCompositions[existingIdx].weight,
            bodyFatPercent: fat,
            muscleMass: muscle,
            waterPercent: getOptionalFloat(row.data, 'water_percent') ?? allCompositions[existingIdx].waterPercent,
            boneMass: bone,
            visceralFat: visceral,
            metabolicAge: getOptionalFloat(row.data, 'metabolic_age') ?? allCompositions[existingIdx].metabolicAge,
            bmr: getOptionalFloat(row.data, 'bmr') ?? allCompositions[existingIdx].bmr,
            source: 'csv',
          };
        } else {
          // Nouvelle date
          const newEntry = {
            id: `bc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            date,
            weight: weight!,
            bodyFatPercent: fat,
            muscleMass: muscle,
            waterPercent: getOptionalFloat(row.data, 'water_percent') ?? 0,
            boneMass: bone,
            visceralFat: visceral,
            metabolicAge: getOptionalFloat(row.data, 'metabolic_age'),
            bmr: getOptionalFloat(row.data, 'bmr'),
            source: 'csv',
          };
          allCompositions.push(newEntry);
          compIdxByDate.set(date, allCompositions.length - 1);
        }
        compositionCount++;
      }

      success++;
    } catch (err: unknown) {
      importErrors.push({ line: row.lineNumber, error: err instanceof Error ? err.message : 'Erreur inconnue' });
    }
  }

  // Sauvegarder les compositions en une seule opération (évite N écritures)
  if (compositionCount > 0) {
    try {
      const secureStorage = (await import('@/lib/security/secureStorage')).default;
      await secureStorage.setItem('@yoroi_body_composition', allCompositions);
    } catch (err) {
      logger.error('[CSV Import] Erreur sauvegarde compositions:', err);
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
// EXPORT - Toutes les données en CSV lisible
// ============================================

export async function exportUnifiedCSV(): Promise<string> {
  const SEP = ';'; // Séparateur ";" → Excel FR l'ouvre directement sans conversion

  // Charger toutes les données
  const [weights, measurements, compositions] = await Promise.all([
    getWeights(),
    getMeasurements(),
    getAllBodyCompositions(),
  ]);

  // Regrouper par date
  const byDate: Record<string, { weight?: any; measurement?: any; composition?: any }> = {};

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

  // Trier par date décroissante
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const now = new Date().toLocaleDateString('fr-FR');
  const lines: string[] = [
    `# YOROI - Export de données`,
    `# Date d'export : ${now}`,
    `# Format : ${dates.length} entree(s) — separateur ";" — decimales "."`,
    `# Compatible : Excel, Google Sheets, Numbers`,
    `# Pour reimporter : Import CSV dans Yoroi (accepte ce format directement)`,
    '#',
    UNIFIED_HEADERS_V3.join(SEP),
  ];

  for (const isoDate of dates) {
    const entry = byDate[isoDate];
    const w = entry.weight;
    const m = entry.measurement;
    const c = entry.composition;

    // Afficher la date en JJ/MM/AAAA (plus lisible)
    const d = isoDate.split('-');
    const displayDate = d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : isoDate;

    const weight   = w?.weight       ?? c?.weight;
    const fat      = w?.fat_percent  ?? c?.bodyFatPercent;
    const muscle   = w?.muscle_percent ?? c?.muscleMass;
    const water    = w?.water_percent ?? c?.waterPercent;
    const bone     = w?.bone_mass    ?? c?.boneMass;
    const visceral = w?.visceral_fat ?? c?.visceralFat;
    const metaAge  = w?.metabolic_age ?? c?.metabolicAge;
    const bmr      = w?.bmr          ?? c?.bmr;
    const note     = w?.note || '';

    lines.push([
      displayDate,
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
    ].join(SEP));
  }

  return lines.join('\n');
}

// ============================================
// SHARE
// ============================================

export async function shareTemplate(): Promise<boolean> {
  try {
    const content = generateUnifiedTemplate();
    const path = `${FileSystem.cacheDirectory}yoroi_modele_import.csv`;
    await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) { logger.warn('Sharing not available'); return false; }

    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Modele CSV Yoroi — ouvre dans Excel ou Google Sheets',
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
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const path = `${FileSystem.cacheDirectory}yoroi_donnees_${dateStr}.csv`;
    await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) { logger.warn('Sharing not available'); return false; }

    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Yoroi — Sauvegarde de tes données',
      UTI: 'public.comma-separated-values-text',
    });
    return true;
  } catch (err) {
    logger.error('Error sharing export CSV:', err);
    return false;
  }
}
