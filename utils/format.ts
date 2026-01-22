YoroiWatch Watch AppUITests// ============================================
// YOROI - UTILITAIRES DE FORMATAGE
// ============================================
// Gestion de l'affichage du vide et formatage

import { useI18n } from '@/lib/I18nContext';

/**
 * Formater une valeur avec gestion du vide
 * Retourne "--" au lieu de null/undefined/""
 */
export const formatValue = (value: any, fallback: string = '--'): string => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
};

/**
 * Formater un nombre avec gestion du vide
 */
export const formatNumber = (value: number | null | undefined, decimals: number = 0, fallback: string = '--'): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toFixed(decimals);
};

/**
 * Formater un poids avec unité
 */
export const formatWeight = (weight: number | null | undefined, unit: 'kg' | 'lbs' = 'kg', fallback: string = '--'): string => {
  if (weight === null || weight === undefined || isNaN(weight)) {
    return fallback;
  }
  return `${weight.toFixed(1)} ${unit}`;
};

/**
 * Formater une taille avec unité
 */
export const formatHeight = (height: number | null | undefined, unit: 'cm' | 'inches' = 'cm', fallback: string = '--'): string => {
  if (height === null || height === undefined || isNaN(height)) {
    return fallback;
  }
  return `${Math.round(height)} ${unit}`;
};

/**
 * Formater un pourcentage
 */
export const formatPercent = (value: number | null | undefined, decimals: number = 1, fallback: string = '--'): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formater des calories
 */
export const formatCalories = (calories: number | null | undefined, fallback: string = '--'): string => {
  if (calories === null || calories === undefined || isNaN(calories)) {
    return fallback;
  }
  return `${Math.round(calories)} kcal`;
};

/**
 * Formater une durée (secondes → mm:ss)
 */
export const formatDuration = (seconds: number | null | undefined, fallback: string = '--'): string => {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return fallback;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Formater une date relative (aujourd'hui, hier, etc.)
 */
export const formatRelativeDate = (date: Date | string | null | undefined, fallback: string = '--'): string => {
  if (!date) return fallback;

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;

  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} ans`;
};

/**
 * Formater une date courte (JJ/MM/AAAA)
 */
export const formatShortDate = (date: Date | string | null | undefined, fallback: string = '--'): string => {
  if (!date) return fallback;

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Formater un IMC
 */
export const formatBMI = (bmi: number | null | undefined, fallback: string = '--'): string => {
  if (bmi === null || bmi === undefined || isNaN(bmi)) {
    return fallback;
  }
  return bmi.toFixed(1);
};

/**
 * Obtenir le statut IMC avec couleur
 */
export const getBMIStatus = (bmi: number | null | undefined): { label: string; color: string } => {
  if (bmi === null || bmi === undefined || isNaN(bmi)) {
    return { label: '--', color: '#8E8E93' };
  }

  if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: '#FF9500' };
  if (bmi < 25) return { label: 'Normal', color: '#34C759' };
  if (bmi < 30) return { label: 'Surpoids', color: '#FF9500' };
  return { label: 'Obésité', color: '#FF3B30' };
};

/**
 * Formater un nombre abrégé (1000 → 1k)
 */
export const formatAbbreviatedNumber = (value: number | null | undefined, fallback: string = '--'): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }

  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
};

/**
 * Vérifier si une valeur est vide
 */
export const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
};

/**
 * Obtenir une valeur avec fallback
 */
export const getOrFallback = <T>(value: T | null | undefined, fallback: T): T => {
  return value !== null && value !== undefined ? value : fallback;
};
