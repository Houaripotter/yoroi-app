/**
 * Exercise Parser Service
 *
 * Parse les notes d'entraînement en données structurées
 * Format supporté: • Exercice (stats)
 *
 * ✅ Améliorations vs ancien code:
 * - Gestion d'erreurs robuste
 * - Support de multiples formats
 * - Types stricts
 * - Tests unitaires faciles
 */

import { logger } from '@/lib/security/logger';

export interface ExerciseStats {
  label: string;
  weight?: string;
  reps?: string;
  distance?: string;
  duration?: string;
  speed?: string;
  pente?: string;
  calories?: string;
  watts?: string;
  resistance?: string;
  stairs?: string;
  cadence?: string;
  [key: string]: string | undefined; // Index signature pour flexibilité
}

// Patterns de parsing (ordre d'importance)
const PATTERNS = {
  // Poids et répétitions: "70kg x 10" ou "70 kg x 10"
  weight: /(\d+(?:[.,]\d+)?)\s*kg(?:\s*x\s*(\d+))?/i,

  // Distance: "5.2km" ou "5,2 km"
  distance: /(\d+(?:[.,]\d+)?)\s*km(?!\/h)/i,

  // Vitesse: "12.5km/h" ou "12,5 km/h"
  speed: /(\d+(?:[.,]\d+)?)\s*km\/h/i,

  // Calories: "350kcal" ou "350 kcal"
  calories: /(\d+)\s*kcal/i,

  // Étages: "20 étages"
  stairs: /(\d+)\s*étages?/i,

  // Durée: "45min" ou "45 min"
  duration: /(\d+)\s*min(?!utes)?/i,

  // Pente: "5%" ou "5 %"
  pente: /(\d+(?:[.,]\d+)?)\s*%/i,

  // Watts: "250W" ou "250 watts"
  watts: /(\d+)\s*(?:W|watts?)/i,

  // Résistance: "niveau 8" ou "résistance 8"
  resistance: /(?:niveau|résistance)\s*(\d+)/i,

  // Cadence: "85 rpm"
  cadence: /(\d+)\s*rpm/i,
};

/**
 * Parse une ligne d'exercice
 * Format attendu: • Exercice (stats)
 * Exemple: • Squat (100kg x 10)
 */
function parseExerciseLine(line: string): ExerciseStats | null {
  if (!line || !line.trim()) return null;

  // Extraire le nom de l'exercice et les stats
  const mainMatch = line.match(/^\s*[•\-*]\s*(.*?)\s*\((.*)\)$/);

  if (!mainMatch) {
    // Format alternatif sans parenthèses : • Exercice
    const simpleMatch = line.match(/^\s*[•\-*]\s*(.+)$/);
    if (simpleMatch) {
      return { label: simpleMatch[1].trim() };
    }
    return null;
  }

  const [, label, statsStr] = mainMatch;

  if (!label || !statsStr) return null;

  const exercise: ExerciseStats = {
    label: label.trim(),
  };

  // Parser chaque type de stat
  Object.entries(PATTERNS).forEach(([key, pattern]) => {
    const match = statsStr.match(pattern);
    if (match) {
      switch (key) {
        case 'weight':
          exercise.weight = match[1];
          if (match[2]) exercise.reps = match[2];
          break;
        case 'distance':
          exercise.distance = match[1];
          break;
        case 'speed':
          exercise.speed = match[1];
          break;
        case 'calories':
          exercise.calories = match[1];
          break;
        case 'stairs':
          exercise.stairs = match[1];
          break;
        case 'duration':
          exercise.duration = match[1];
          break;
        case 'pente':
          exercise.pente = match[1];
          break;
        case 'watts':
          exercise.watts = match[1];
          break;
        case 'resistance':
          exercise.resistance = match[1];
          break;
        case 'cadence':
          exercise.cadence = match[1];
          break;
      }
    }
  });

  return exercise;
}

/**
 * Parse les notes complètes d'un entraînement
 * @param notes - Notes au format texte
 * @returns Array d'exercices parsés
 */
export function parseExercisesFromNotes(notes: string | null | undefined): ExerciseStats[] {
  if (!notes || typeof notes !== 'string') return [];

  try {
    const lines = notes.split('\n');
    const exercises: ExerciseStats[] = [];

    for (const line of lines) {
      const exercise = parseExerciseLine(line);
      if (exercise) {
        exercises.push(exercise);
      }
    }

    return exercises;
  } catch (error) {
    logger.error('Erreur parsing exercices:', error);
    return [];
  }
}

/**
 * Formate les exercices en texte lisible
 * Utile pour l'affichage ou l'export
 */
export function formatExercisesToText(exercises: ExerciseStats[]): string {
  return exercises.map(ex => {
    const stats: string[] = [];

    if (ex.weight) stats.push(`${ex.weight}kg${ex.reps ? ` x ${ex.reps}` : ''}`);
    if (ex.distance) stats.push(`${ex.distance}km`);
    if (ex.speed) stats.push(`${ex.speed}km/h`);
    if (ex.calories) stats.push(`${ex.calories}kcal`);
    if (ex.stairs) stats.push(`${ex.stairs} étages`);
    if (ex.duration) stats.push(`${ex.duration}min`);
    if (ex.pente) stats.push(`${ex.pente}%`);
    if (ex.watts) stats.push(`${ex.watts}W`);
    if (ex.resistance) stats.push(`niveau ${ex.resistance}`);
    if (ex.cadence) stats.push(`${ex.cadence} rpm`);

    return stats.length > 0 ? `• ${ex.label} (${stats.join(', ')})` : `• ${ex.label}`;
  }).join('\n');
}

/**
 * Valide qu'une note est bien formatée
 * @returns true si le format est valide
 */
export function validateExerciseFormat(notes: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!notes || !notes.trim()) {
    return { valid: true, errors: [] }; // Les notes vides sont valides
  }

  const lines = notes.split('\n').filter(l => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Vérifier que la ligne commence par un bullet point
    if (!/^\s*[•\-*]/.test(line)) {
      errors.push(`Ligne ${i + 1}: Doit commencer par • ou - ou *`);
    }

    // Vérifier la présence de parenthèses si des stats sont attendues
    if (line.includes('(') && !line.includes(')')) {
      errors.push(`Ligne ${i + 1}: Parenthèse non fermée`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Exemple d'utilisation et tests
 */
export const EXERCISE_FORMAT_EXAMPLES = [
  '• Squat (100kg x 10)',
  '• Course (5km, 25min, 12km/h)',
  '• Vélo (45min, 250W, 85 rpm)',
  '• Rameur (2000m, 350kcal)',
  '• StairMaster (20 étages)',
  '• Tapis de course (5km, 30min, pente 5%)',
  '• Repos actif',
];
