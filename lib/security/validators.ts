// ============================================
// 🔒 VALIDATEURS D'INPUT - YOROI
// ============================================
//
// Validation stricte de toutes les entrées utilisateur
// pour éviter les données absurdes et les injections.

import logger from './logger';

/**
 * Ouvre une URL de manière sécurisée via Linking
 */
import { Linking } from 'react-native';

// ============================================
// CONSTANTES DE VALIDATION
// ============================================

export const VALIDATION_LIMITS = {
  // Poids corporel
  WEIGHT_MIN: 30, // kg
  WEIGHT_MAX: 250, // kg

  // Taille
  HEIGHT_MIN: 100, // cm
  HEIGHT_MAX: 250, // cm

  // Composition corporelle
  BODY_FAT_MIN: 3, // %
  BODY_FAT_MAX: 60, // %
  MUSCLE_MASS_MIN: 20, // %
  MUSCLE_MASS_MAX: 70, // %
  WATER_MIN: 40, // %
  WATER_MAX: 80, // %
  VISCERAL_FAT_MIN: 0,
  VISCERAL_FAT_MAX: 30,

  // Âge
  AGE_MIN: 10,
  AGE_MAX: 120,
  METABOLIC_AGE_MIN: 18,
  METABOLIC_AGE_MAX: 90,

  // Hydratation
  HYDRATION_MIN: 0, // ml
  HYDRATION_MAX: 10000, // ml (10L par jour max)
  HYDRATION_ENTRY_MIN: 50, // ml
  HYDRATION_ENTRY_MAX: 2000, // ml

  // Mesures corporelles
  MEASUREMENT_MIN: 10, // cm
  MEASUREMENT_MAX: 200, // cm

  // Durée d'entraînement
  TRAINING_DURATION_MIN: 1, // minutes
  TRAINING_DURATION_MAX: 480, // minutes (8h max)

  // Sommeil
  SLEEP_MIN: 0, // heures
  SLEEP_MAX: 24, // heures

  // Longueur des chaînes
  STRING_MAX_LENGTH: 500,
  NAME_MAX_LENGTH: 100,
  NOTE_MAX_LENGTH: 1000,
};

// ============================================
// RÉSULTATS DE VALIDATION
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
}

// ============================================
// VALIDATEURS DE BASE
// ============================================

/**
 * Valide un nombre dans une plage
 */
export function validateNumber(
  value: any,
  min: number,
  max: number,
  fieldName: string = 'Valeur'
): ValidationResult {
  // Vérifier que c'est un nombre
  const num = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(num)) {
    return {
      valid: false,
      error: `${fieldName} doit être un nombre valide`,
    };
  }

  // Vérifier les limites
  if (num < min || num > max) {
    return {
      valid: false,
      error: `${fieldName} doit être entre ${min} et ${max}`,
    };
  }

  return {
    valid: true,
    sanitized: num,
  };
}

/**
 * Valide une chaîne de caractères
 */
export function validateString(
  value: any,
  maxLength: number = VALIDATION_LIMITS.STRING_MAX_LENGTH,
  fieldName: string = 'Texte'
): ValidationResult {
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} doit être une chaîne de caractères`,
    };
  }

  // Supprimer les espaces inutiles
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: `${fieldName} ne peut pas être vide`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} ne peut pas dépasser ${maxLength} caractères`,
    };
  }

  // Vérifier les caractères dangereux (XSS)
  if (containsDangerousCharacters(trimmed)) {
    return {
      valid: false,
      error: `${fieldName} contient des caractères invalides`,
    };
  }

  return {
    valid: true,
    sanitized: trimmed,
  };
}

/**
 * Détecte les caractères potentiellement dangereux
 */
function containsDangerousCharacters(value: string): boolean {
  // Patterns XSS communs
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize une chaîne de caractères
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/<.*?>/g, '')
    .replace(/javascript:/gi, '')
    .substring(0, VALIDATION_LIMITS.STRING_MAX_LENGTH);
}

/**
 * Valide une date
 */
export function validateDate(date: string | Date): ValidationResult {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return {
      valid: false,
      error: 'Format de date invalide',
    };
  }

  // Vérifier que la date n'est pas dans le futur
  const now = new Date();
  if (dateObj > now) {
    return {
      valid: false,
      error: 'La date ne peut pas être dans le futur',
    };
  }

  // Vérifier que la date n'est pas trop ancienne (10 ans max)
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(now.getFullYear() - 10);
  if (dateObj < tenYearsAgo) {
    return {
      valid: false,
      error: 'La date ne peut pas être plus ancienne que 10 ans',
    };
  }

  return {
    valid: true,
    sanitized: dateObj.toISOString(),
  };
}

// ============================================
// VALIDATEURS MÉTIER
// ============================================

/**
 * Valide un poids corporel
 */
export function validateWeight(weight: any): ValidationResult {
  return validateNumber(
    weight,
    VALIDATION_LIMITS.WEIGHT_MIN,
    VALIDATION_LIMITS.WEIGHT_MAX,
    'Poids'
  );
}

/**
 * Valide une taille
 */
export function validateHeight(height: any): ValidationResult {
  return validateNumber(
    height,
    VALIDATION_LIMITS.HEIGHT_MIN,
    VALIDATION_LIMITS.HEIGHT_MAX,
    'Taille'
  );
}

/**
 * Valide un pourcentage de graisse corporelle
 */
export function validateBodyFat(bodyFat: any): ValidationResult {
  return validateNumber(
    bodyFat,
    VALIDATION_LIMITS.BODY_FAT_MIN,
    VALIDATION_LIMITS.BODY_FAT_MAX,
    'Graisse corporelle'
  );
}

/**
 * Valide un pourcentage de masse musculaire
 */
export function validateMuscleMass(muscleMass: any): ValidationResult {
  return validateNumber(
    muscleMass,
    VALIDATION_LIMITS.MUSCLE_MASS_MIN,
    VALIDATION_LIMITS.MUSCLE_MASS_MAX,
    'Masse musculaire'
  );
}

/**
 * Valide un pourcentage d'eau
 */
export function validateWater(water: any): ValidationResult {
  return validateNumber(
    water,
    VALIDATION_LIMITS.WATER_MIN,
    VALIDATION_LIMITS.WATER_MAX,
    'Eau'
  );
}

/**
 * Valide une graisse viscérale
 */
export function validateVisceralFat(visceralFat: any): ValidationResult {
  return validateNumber(
    visceralFat,
    VALIDATION_LIMITS.VISCERAL_FAT_MIN,
    VALIDATION_LIMITS.VISCERAL_FAT_MAX,
    'Graisse viscérale'
  );
}

/**
 * Valide un âge métabolique
 */
export function validateMetabolicAge(metabolicAge: any): ValidationResult {
  return validateNumber(
    metabolicAge,
    VALIDATION_LIMITS.METABOLIC_AGE_MIN,
    VALIDATION_LIMITS.METABOLIC_AGE_MAX,
    'Âge métabolique'
  );
}

/**
 * Valide une entrée d'hydratation
 */
export function validateHydrationEntry(amount: any): ValidationResult {
  return validateNumber(
    amount,
    VALIDATION_LIMITS.HYDRATION_ENTRY_MIN,
    VALIDATION_LIMITS.HYDRATION_ENTRY_MAX,
    'Quantité d\'eau'
  );
}

/**
 * Valide une durée d'entraînement
 */
export function validateTrainingDuration(duration: any): ValidationResult {
  return validateNumber(
    duration,
    VALIDATION_LIMITS.TRAINING_DURATION_MIN,
    VALIDATION_LIMITS.TRAINING_DURATION_MAX,
    'Durée d\'entraînement'
  );
}

/**
 * Valide une mesure corporelle
 */
export function validateBodyMeasurement(measurement: any, fieldName: string): ValidationResult {
  return validateNumber(
    measurement,
    VALIDATION_LIMITS.MEASUREMENT_MIN,
    VALIDATION_LIMITS.MEASUREMENT_MAX,
    fieldName
  );
}

/**
 * Valide un objet de mesure complet
 */
export interface MeasurementData {
  weight: number;
  date: string;
  body_fat?: number;
  muscle_mass?: number;
  water?: number;
  visceral_fat?: number;
  metabolic_age?: number;
  notes?: string;
}

export function validateMeasurement(data: Partial<MeasurementData>): ValidationResult {
  const errors: string[] = [];

  // Poids obligatoire
  if (data.weight !== undefined) {
    const weightResult = validateWeight(data.weight);
    if (!weightResult.valid) errors.push(weightResult.error!);
  } else {
    errors.push('Le poids est obligatoire');
  }

  // Date obligatoire
  if (data.date) {
    const dateResult = validateDate(data.date);
    if (!dateResult.valid) errors.push(dateResult.error!);
  } else {
    errors.push('La date est obligatoire');
  }

  // Validations optionnelles
  if (data.body_fat !== undefined && data.body_fat !== null) {
    const result = validateBodyFat(data.body_fat);
    if (!result.valid) errors.push(result.error!);
  }

  if (data.muscle_mass !== undefined && data.muscle_mass !== null) {
    const result = validateMuscleMass(data.muscle_mass);
    if (!result.valid) errors.push(result.error!);
  }

  if (data.water !== undefined && data.water !== null) {
    const result = validateWater(data.water);
    if (!result.valid) errors.push(result.error!);
  }

  if (data.visceral_fat !== undefined && data.visceral_fat !== null) {
    const result = validateVisceralFat(data.visceral_fat);
    if (!result.valid) errors.push(result.error!);
  }

  if (data.metabolic_age !== undefined && data.metabolic_age !== null) {
    const result = validateMetabolicAge(data.metabolic_age);
    if (!result.valid) errors.push(result.error!);
  }

  if (data.notes) {
    const result = validateString(data.notes, VALIDATION_LIMITS.NOTE_MAX_LENGTH, 'Notes');
    if (!result.valid) errors.push(result.error!);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join(', '),
    };
  }

  return { valid: true };
}

/**
 * Valide un nom d'utilisateur
 */
export function validateUsername(username: any): ValidationResult {
  const result = validateString(username, VALIDATION_LIMITS.NAME_MAX_LENGTH, 'Nom');

  if (!result.valid) return result;

  // Vérifications supplémentaires pour les noms
  const name = result.sanitized as string;

  // Au moins 2 caractères
  if (name.length < 2) {
    return {
      valid: false,
      error: 'Le nom doit contenir au moins 2 caractères',
    };
  }

  // Que des lettres, espaces, tirets, apostrophes
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Le nom ne peut contenir que des lettres',
    };
  }

  return { valid: true, sanitized: name };
}

/**
 * Valide une URL
 */
export function validateURL(url: any): ValidationResult {
  if (typeof url !== 'string') {
    return { valid: false, error: 'L\'URL doit être une chaîne de caractères' };
  }

  try {
    const urlObj = new URL(url);

    // Autoriser uniquement http et https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'L\'URL doit commencer par http:// ou https://' };
    }

    return { valid: true, sanitized: url };
  } catch (error) {
    return { valid: false, error: 'Format d\'URL invalide' };
  }
}

/**
 * Schémas d'URL autorisés pour Linking.openURL
 */
const ALLOWED_URL_SCHEMES = [
  'http:',
  'https:',
  'mailto:',
  'tel:',
  'sms:',
  'x-apple-health:',
  'app-settings:',
  'app-prefs:',  // iOS Settings URLs (e.g., App-Prefs:HEALTH)
  'market:',
  'itms-apps:',
  'maps:',
  'geo:',
  'instagram:',
  'twitter:',
  'fb:',
];

/**
 * Valide une URL pour Linking.openURL avec des schémas autorisés
 */
export function validateLinkingURL(url: any): ValidationResult {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return { valid: false, error: 'L\'URL est invalide' };
  }

  const trimmedUrl = url.trim();

  // Vérifier les patterns dangereux
  if (/javascript:/i.test(trimmedUrl) || /data:/i.test(trimmedUrl)) {
    logger.warn('🚨 URL potentiellement dangereuse bloquée:', trimmedUrl);
    return { valid: false, error: 'URL dangereuse détectée' };
  }

  // Extraire le schéma
  const schemeMatch = trimmedUrl.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:)/);
  if (!schemeMatch) {
    return { valid: false, error: 'Schéma d\'URL manquant' };
  }

  const scheme = schemeMatch[1].toLowerCase();

  // Vérifier si le schéma est autorisé
  if (!ALLOWED_URL_SCHEMES.includes(scheme)) {
    logger.warn('🚨 Schéma d\'URL non autorisé:', scheme);
    return { valid: false, error: `Schéma d\'URL non autorisé: ${scheme}` };
  }

  return { valid: true, sanitized: trimmedUrl };
}

export async function safeOpenURL(url: string): Promise<boolean> {
  const validation = validateLinkingURL(url);

  if (!validation.valid) {
    if (__DEV__) {
      // URL rejetée pour raisons de sécurité
    }
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(validation.sanitized);
    if (canOpen) {
      await Linking.openURL(validation.sanitized);
      return true;
    } else {
      if (__DEV__) {
        // Impossible d'ouvrir l'URL
      }
      return false;
    }
  } catch (error) {
    if (__DEV__) {
      logger.error('safeOpenURL - Erreur:', error);
    }
    return false;
  }
}

/**
 * Ensemble de validateurs
 */
export const validators = {
  number: validateNumber,
  string: validateString,
  date: validateDate,
  weight: validateWeight,
  height: validateHeight,
  bodyFat: validateBodyFat,
  muscleMass: validateMuscleMass,
  water: validateWater,
  visceralFat: validateVisceralFat,
  metabolicAge: validateMetabolicAge,
  hydration: validateHydrationEntry,
  trainingDuration: validateTrainingDuration,
  bodyMeasurement: validateBodyMeasurement,
  measurement: validateMeasurement,
  username: validateUsername,
  url: validateURL,
  linkingUrl: validateLinkingURL,
  safeOpenURL,
};

export default validators;
