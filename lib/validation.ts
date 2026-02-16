// ============================================
// 🔒 SYSTÈME DE VALIDATION DES ENTRÉES - YOROI
// ============================================
// Protège contre les données invalides et les injections

import { useState } from 'react';

export interface ValidationRule {
  type: 'number' | 'string' | 'email' | 'date';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
  errorMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  value?: any;
}

// ============================================
// RÈGLES DE VALIDATION POUR YOROI
// ============================================

export const VALIDATION_RULES: Record<string, ValidationRule> = {
  // ===== POIDS ET MESURES =====
  weight: {
    type: 'number',
    min: 20,
    max: 350,
    required: true,
    errorMessage: 'Poids entre 20 et 350 kg'
  },
  height: {
    type: 'number',
    min: 50,
    max: 280,
    required: false,
    errorMessage: 'Taille entre 50 et 280 cm'
  },
  height_cm: {
    type: 'number',
    min: 50,
    max: 280,
    required: false,
    errorMessage: 'Taille entre 50 et 280 cm'
  },

  // ===== COMPOSITION CORPORELLE =====
  bodyFat: {
    type: 'number',
    min: 2,
    max: 60,
    required: false,
    errorMessage: 'Masse grasse entre 2% et 60%'
  },
  body_fat: {
    type: 'number',
    min: 2,
    max: 60,
    required: false,
    errorMessage: 'Masse grasse entre 2% et 60%'
  },
  fat_percent: {
    type: 'number',
    min: 2,
    max: 60,
    required: false,
    errorMessage: 'Masse grasse entre 2% et 60%'
  },
  muscleMass: {
    type: 'number',
    min: 10,
    max: 70,
    required: false,
    errorMessage: 'Masse musculaire entre 10% et 70%'
  },
  muscle_mass: {
    type: 'number',
    min: 10,
    max: 70,
    required: false,
    errorMessage: 'Masse musculaire entre 10% et 70%'
  },
  muscle_percent: {
    type: 'number',
    min: 10,
    max: 70,
    required: false,
    errorMessage: 'Masse musculaire entre 10% et 70%'
  },
  water: {
    type: 'number',
    min: 30,
    max: 80,
    required: false,
    errorMessage: 'Hydratation entre 30% et 80%'
  },
  water_percent: {
    type: 'number',
    min: 30,
    max: 80,
    required: false,
    errorMessage: 'Hydratation entre 30% et 80%'
  },
  boneMass: {
    type: 'number',
    min: 1,
    max: 10,
    required: false,
    errorMessage: 'Masse osseuse entre 1 et 10 kg'
  },
  bone_mass: {
    type: 'number',
    min: 1,
    max: 10,
    required: false,
    errorMessage: 'Masse osseuse entre 1 et 10 kg'
  },
  visceralFat: {
    type: 'number',
    min: 1,
    max: 30,
    required: false,
    errorMessage: 'Graisse viscérale entre 1 et 30'
  },
  visceral_fat: {
    type: 'number',
    min: 1,
    max: 30,
    required: false,
    errorMessage: 'Graisse viscérale entre 1 et 30'
  },
  metabolicAge: {
    type: 'number',
    min: 12,
    max: 100,
    required: false,
    errorMessage: 'Âge métabolique entre 12 et 100 ans'
  },
  metabolic_age: {
    type: 'number',
    min: 12,
    max: 100,
    required: false,
    errorMessage: 'Âge métabolique entre 12 et 100 ans'
  },
  bmr: {
    type: 'number',
    min: 500,
    max: 5000,
    required: false,
    errorMessage: 'BMR entre 500 et 5000 kcal'
  },
  bmi: {
    type: 'number',
    min: 10,
    max: 60,
    required: false,
    errorMessage: 'BMI entre 10 et 60'
  },

  // ===== MENSURATIONS =====
  waist: {
    type: 'number',
    min: 40,
    max: 200,
    required: false,
    errorMessage: 'Tour de taille entre 40 et 200 cm'
  },
  hips: {
    type: 'number',
    min: 50,
    max: 200,
    required: false,
    errorMessage: 'Hanches entre 50 et 200 cm'
  },
  chest: {
    type: 'number',
    min: 50,
    max: 200,
    required: false,
    errorMessage: 'Poitrine entre 50 et 200 cm'
  },
  neck: {
    type: 'number',
    min: 20,
    max: 60,
    required: false,
    errorMessage: 'Cou entre 20 et 60 cm'
  },
  shoulder: {
    type: 'number',
    min: 40,
    max: 100,
    required: false,
    errorMessage: 'Épaules entre 40 et 100 cm'
  },
  shoulders: {
    type: 'number',
    min: 40,
    max: 100,
    required: false,
    errorMessage: 'Épaules entre 40 et 100 cm'
  },
  left_arm: {
    type: 'number',
    min: 15,
    max: 60,
    required: false,
    errorMessage: 'Bras gauche entre 15 et 60 cm'
  },
  right_arm: {
    type: 'number',
    min: 15,
    max: 60,
    required: false,
    errorMessage: 'Bras droit entre 15 et 60 cm'
  },
  left_thigh: {
    type: 'number',
    min: 30,
    max: 100,
    required: false,
    errorMessage: 'Cuisse gauche entre 30 et 100 cm'
  },
  right_thigh: {
    type: 'number',
    min: 30,
    max: 100,
    required: false,
    errorMessage: 'Cuisse droite entre 30 et 100 cm'
  },
  left_calf: {
    type: 'number',
    min: 20,
    max: 60,
    required: false,
    errorMessage: 'Mollet gauche entre 20 et 60 cm'
  },
  right_calf: {
    type: 'number',
    min: 20,
    max: 60,
    required: false,
    errorMessage: 'Mollet droit entre 20 et 60 cm'
  },
  navel: {
    type: 'number',
    min: 40,
    max: 200,
    required: false,
    errorMessage: 'Tour de nombril entre 40 et 200 cm'
  },

  // ===== UTILISATEUR =====
  name: {
    type: 'string',
    minLength: 1,
    maxLength: 50,
    required: false,
    errorMessage: 'Nom entre 1 et 50 caractères'
  },
  username: {
    type: 'string',
    minLength: 1,
    maxLength: 50,
    required: false,
    errorMessage: 'Pseudo entre 1 et 50 caractères'
  },
  email: {
    type: 'email',
    required: false,
    errorMessage: 'Email invalide'
  },
  age: {
    type: 'number',
    min: 10,
    max: 120,
    required: false,
    errorMessage: 'Âge entre 10 et 120 ans'
  },

  // ===== OBJECTIFS =====
  target_weight: {
    type: 'number',
    min: 30,
    max: 300,
    required: false,
    errorMessage: 'Objectif entre 30 et 300 kg'
  },
  weight_goal: {
    type: 'number',
    min: 30,
    max: 300,
    required: false,
    errorMessage: 'Objectif entre 30 et 300 kg'
  },
  goalWeight: {
    type: 'number',
    min: 30,
    max: 300,
    required: false,
    errorMessage: 'Objectif entre 30 et 300 kg'
  },
  targetWeight: {
    type: 'number',
    min: 30,
    max: 300,
    required: false,
    errorMessage: 'Objectif entre 30 et 300 kg'
  },
  start_weight: {
    type: 'number',
    min: 20,
    max: 350,
    required: false,
    errorMessage: 'Poids de départ entre 20 et 350 kg'
  },

  // ===== ACTIVITÉS =====
  duration: {
    type: 'number',
    min: 1,
    max: 600,
    required: false,
    errorMessage: 'Durée entre 1 et 600 minutes'
  },
  duration_minutes: {
    type: 'number',
    min: 1,
    max: 600,
    required: false,
    errorMessage: 'Durée entre 1 et 600 minutes'
  },
  rpe: {
    type: 'number',
    min: 1,
    max: 10,
    required: false,
    errorMessage: 'RPE entre 1 et 10'
  },
  calories: {
    type: 'number',
    min: 0,
    max: 10000,
    required: false,
    errorMessage: 'Calories entre 0 et 10000'
  },
  technique_rating: {
    type: 'number',
    min: 1,
    max: 5,
    required: false,
    errorMessage: 'Note technique entre 1 et 5'
  },

  // ===== TEXTES =====
  notes: {
    type: 'string',
    maxLength: 1000,
    required: false,
    errorMessage: 'Notes max 1000 caractères'
  },
  note: {
    type: 'string',
    maxLength: 1000,
    required: false,
    errorMessage: 'Note max 1000 caractères'
  },

  // ===== VITALITÉ =====
  sleepHours: {
    type: 'number',
    min: 0,
    max: 24,
    required: false,
    errorMessage: 'Sommeil entre 0 et 24h'
  },
  waterIntake: {
    type: 'number',
    min: 0,
    max: 10,
    required: false,
    errorMessage: 'Eau entre 0 et 10 litres'
  },
  energyLevel: {
    type: 'number',
    min: 1,
    max: 5,
    required: false,
    errorMessage: 'Énergie entre 1 et 5'
  },
  stressLevel: {
    type: 'number',
    min: 1,
    max: 5,
    required: false,
    errorMessage: 'Stress entre 1 et 5'
  },

  // ===== HYDRATATION =====
  amount: {
    type: 'number',
    min: 50,
    max: 2000,
    required: false,
    errorMessage: 'Quantité entre 50 et 2000 ml'
  },
  dailyGoal: {
    type: 'number',
    min: 0.5,
    max: 10,
    required: false,
    errorMessage: 'Objectif entre 0.5 et 10 litres'
  },

  // ===== SUIVI BLESSURES =====
  eva_score: {
    type: 'number',
    min: 0,
    max: 10,
    required: false,
    errorMessage: 'Échelle EVA entre 0 et 10'
  },
  pain: {
    type: 'number',
    min: 0,
    max: 10,
    required: false,
    errorMessage: 'Douleur entre 0 et 10'
  },
};

// ============================================
// FONCTION DE VALIDATION PRINCIPALE
// ============================================

export const validate = (field: string, value: any): ValidationResult => {
  const rules = VALIDATION_RULES[field];

  // Si pas de règles définies, accepter la valeur telle quelle
  if (!rules) {
    return { valid: true, value };
  }

  // Vérifier si le champ est requis
  if (rules.required && (value === null || value === undefined || value === '')) {
    return {
      valid: false,
      error: rules.errorMessage || `${field} est requis`
    };
  }

  // Si pas requis et vide, accepter
  if (!rules.required && (value === null || value === undefined || value === '')) {
    return { valid: true, value: null };
  }

  // Validation par type
  switch (rules.type) {
    case 'number':
      return validateNumber(value, rules);
    case 'string':
      return validateString(value, rules);
    case 'email':
      return validateEmail(value, rules);
    case 'date':
      return validateDate(value, rules);
    default:
      return { valid: true, value };
  }
};

// ============================================
// VALIDATEURS PAR TYPE
// ============================================

const validateNumber = (value: any, rules: ValidationRule): ValidationResult => {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return {
      valid: false,
      error: rules.errorMessage || 'Nombre invalide'
    };
  }

  if (rules.min !== undefined && num < rules.min) {
    return {
      valid: false,
      error: rules.errorMessage || `Minimum: ${rules.min}`
    };
  }

  if (rules.max !== undefined && num > rules.max) {
    return {
      valid: false,
      error: rules.errorMessage || `Maximum: ${rules.max}`
    };
  }

  // Vérifier le validateur personnalisé si présent
  if (rules.customValidator && !rules.customValidator(num)) {
    return {
      valid: false,
      error: rules.errorMessage || 'Valeur invalide'
    };
  }

  return { valid: true, value: num };
};

const validateString = (value: any, rules: ValidationRule): ValidationResult => {
  const str = String(value).trim();

  if (rules.minLength && str.length < rules.minLength) {
    return {
      valid: false,
      error: rules.errorMessage || `Minimum ${rules.minLength} caractères`
    };
  }

  if (rules.maxLength && str.length > rules.maxLength) {
    return {
      valid: false,
      error: rules.errorMessage || `Maximum ${rules.maxLength} caractères`
    };
  }

  if (rules.pattern && !rules.pattern.test(str)) {
    return {
      valid: false,
      error: rules.errorMessage || 'Format invalide'
    };
  }

  // 🔒 SÉCURITÉ: Supprimer les balises HTML/script pour éviter les injections
  const sanitized = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');

  return { valid: true, value: sanitized };
};

const validateEmail = (value: any, rules: ValidationRule): ValidationResult => {
  const email = String(value).trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return {
      valid: false,
      error: rules.errorMessage || 'Email invalide'
    };
  }

  return { valid: true, value: email };
};

const validateDate = (value: any, rules: ValidationRule): ValidationResult => {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return {
      valid: false,
      error: rules.errorMessage || 'Date invalide'
    };
  }

  return { valid: true, value: date.toISOString() };
};

// ============================================
// VALIDATION D'OBJETS COMPLETS
// ============================================

export const validateObject = <T extends Record<string, any>>(
  obj: T
): { valid: boolean; errors: Record<string, string>; sanitized?: T } => {
  const errors: Record<string, string> = {};
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const result = validate(key, value);
    if (!result.valid) {
      errors[key] = result.error!;
    } else {
      sanitized[key] = result.value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: Object.keys(errors).length === 0 ? sanitized : undefined,
  };
};

// ============================================
// HOOK REACT POUR LA VALIDATION
// ============================================

export const useValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: any): boolean => {
    const result = validate(field, value);

    if (!result.valid) {
      setErrors(prev => ({ ...prev, [field]: result.error! }));
      return false;
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  };

  const validateAll = (obj: Record<string, any>): boolean => {
    const result = validateObject(obj);
    setErrors(result.errors);
    return result.valid;
  };

  const clearErrors = () => setErrors({});

  const clearError = (field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return {
    errors,
    validateField,
    validateAll,
    clearErrors,
    clearError
  };
};

// ============================================
// EXPORTS
// ============================================

export default {
  validate,
  validateObject,
  useValidation,
  VALIDATION_RULES,
};
