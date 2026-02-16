/**
 * REGRESSION TEST SUITE - Inter-Module Interactions
 * Vérifie que les modules interagissent correctement entre eux.
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
}));

jest.mock('@kingstinct/react-native-healthkit', () => ({
  __esModule: true,
  default: null,
}));

jest.mock('@/lib/security/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: l, logger: l };
});

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  copyAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  addWorkout,
  getAllWorkouts,
  addMeasurement,
  getLatestMeasurement,
  unlockBadge,
  isBadgeUnlocked,
  addHydrationEntry,
  getUserSettings,
  saveUserSettings,
  calculateRecommendedHydration,
} from '@/lib/storage';

import {
  getLevel,
  getLevelProgress,
  calculateTotalPoints,
  POINTS_ACTIONS,
} from '@/lib/gamification';

import {
  getCurrentRank,
  getNextRank,
  getDaysToNextRank,
} from '@/lib/ranks';

import {
  calculateBMR,
  calculateTDEE,
  calculateNutritionPlan,
} from '@/lib/nutrition';

import {
  validate,
  validateObject,
} from '@/lib/validation';

import {
  normalizeSourceName,
  SOURCE_PRIORITY,
} from '@/lib/healthConnect.ios';

describe('REGRESSION: Inter-Module Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  // ============================================
  // Workout -> Gamification -> Rank
  // ============================================
  describe('workout -> gamification -> rank flow', () => {
    it('adding workouts increases gamification level', async () => {
      // Simulate adding workouts
      const numWorkouts = 20;
      const totalPoints = await calculateTotalPoints(0, numWorkouts, 0, 0, 0);

      // Points should increase with more workouts
      expect(totalPoints).toBe(numWorkouts * POINTS_ACTIONS.entrainement);
      expect(totalPoints).toBeGreaterThan(0);

      // Level should progress
      const level = getLevel(totalPoints);
      expect(level.name).toBeDefined();
    });

    it('streak days affect both gamification and rank', async () => {
      const streakDays = 30;

      // Gamification points
      const points = await calculateTotalPoints(0, 0, 0, streakDays, 0);
      expect(points).toBe(POINTS_ACTIONS.streak_30);

      // Rank progression
      const rank = getCurrentRank(streakDays);
      expect(rank.id).toBe('samurai'); // 30 days = Samouraï

      // Next rank
      const next = getNextRank(streakDays);
      expect(next?.id).toBe('ronin');
    });

    it('combined activities produce coherent progression', async () => {
      // Simulate 2 months of usage
      const weights = 8; // Weekly weighing
      const workouts = 40; // ~5/week
      const photos = 4; // bi-weekly
      const streak = 60;
      const hydration = 45; // ~75% compliance

      const totalPoints = await calculateTotalPoints(weights, workouts, photos, streak, hydration);
      const level = getLevel(totalPoints);
      const rank = getCurrentRank(streak);

      expect(totalPoints).toBeGreaterThan(0);
      expect(level).toBeDefined();
      expect(rank.id).toBe('samurai'); // 60 days > 30
    });
  });

  // ============================================
  // Measurement -> Validation -> Storage
  // ============================================
  describe('measurement -> validation -> storage flow', () => {
    it('validates weight before storage', async () => {
      const weightInput = 75.5;
      const validation = validate('weight', weightInput);
      expect(validation.valid).toBe(true);

      // If valid, store it
      if (validation.valid) {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
        const measurement = await addMeasurement({ date: '2026-02-10', weight: validation.value });
        expect(measurement.weight).toBe(75.5);
      }
    });

    it('rejects invalid weight before storage', () => {
      const validation = validate('weight', 500);
      expect(validation.valid).toBe(false);
      // Should NOT proceed to storage
    });

    it('validates and sanitizes notes before workout', async () => {
      const notesInput = '<script>alert("xss")</script> Great session';
      const validation = validate('notes', notesInput);
      expect(validation.valid).toBe(true);
      expect(validation.value).not.toContain('<script>');

      // Store with sanitized notes
      const workout = await addWorkout({
        date: '2026-02-10',
        type: 'jjb',
        notes: validation.value,
      });
      expect(workout.notes).not.toContain('<script>');
    });

    it('validates multiple fields at once', () => {
      const result = validateObject({
        weight: 75.5,
        bodyFat: 18,
        age: 30,
        notes: 'Good session',
      });
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  // ============================================
  // Measurement -> Nutrition Plan
  // ============================================
  describe('measurement -> nutrition plan flow', () => {
    it('uses validated measurement for nutrition plan', () => {
      const weight = 80;
      const height = 180;
      const age = 30;

      // Validate inputs
      expect(validate('weight', weight).valid).toBe(true);
      expect(validate('height_cm', height).valid).toBe(true);
      expect(validate('age', age).valid).toBe(true);

      // Generate nutrition plan
      const plan = calculateNutritionPlan(weight, height, age, 'male', 'moderate', 'maintain', 'balanced');
      expect(plan.bmr).toBeGreaterThan(0);
      expect(plan.tdee).toBeGreaterThan(plan.bmr);
      expect(plan.macros.protein.grams).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Hydration -> Weight -> Recommendation
  // ============================================
  describe('hydration -> weight -> recommendation flow', () => {
    it('calculates hydration recommendation from weight', async () => {
      // Get weight from measurements
      const weight = 75;

      // Calculate recommendation
      const recommended = calculateRecommendedHydration(weight);
      expect(recommended).toBeGreaterThan(0);

      // Add hydration entries
      const entry = await addHydrationEntry(250);
      expect(entry.amount).toBe(250);
    });
  });

  // ============================================
  // Source -> Priority Selection
  // ============================================
  describe('source priority selection across modules', () => {
    it('selects best source when multiple devices report', () => {
      // Simulate multiple sources for same data type
      const records = [
        { value: 75.0, source: normalizeSourceName('iPhone') },
        { value: 75.2, source: normalizeSourceName('Health Mate') },
        { value: 75.1, source: normalizeSourceName('Apple Watch') },
      ];

      // Pick the highest priority source
      const best = records.reduce((a, b) =>
        (SOURCE_PRIORITY[a.source] || 0) > (SOURCE_PRIORITY[b.source] || 0) ? a : b
      );

      expect(best.source).toBe('withings');
      expect(best.value).toBe(75.2);
    });
  });

  // ============================================
  // Settings -> Units Consistency
  // ============================================
  describe('settings units consistency', () => {
    it('default settings provide valid unit values', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const settings = await getUserSettings();

      expect(['kg', 'lbs']).toContain(settings.weight_unit);
      expect(['cm', 'in']).toContain(settings.measurement_unit);
    });

    it('saved settings persist correctly', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ weight_unit: 'lbs', measurement_unit: 'in' })
      );
      const settings = await getUserSettings();
      expect(settings.weight_unit).toBe('lbs');
      expect(settings.measurement_unit).toBe('in');
    });
  });

  // ============================================
  // Badge unlock conditions cross-module
  // ============================================
  describe('badge unlock conditions', () => {
    it('first weighing badge can be unlocked', async () => {
      const result = await unlockBadge('first_weighing');
      expect(result).toBe(true);
    });

    it('badge state persists correctly', async () => {
      // Unlock a badge
      await unlockBadge('streak_7');

      // Mock the saved data
      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      // Verify it's unlocked
      expect(await isBadgeUnlocked('streak_7')).toBe(true);
      expect(await isBadgeUnlocked('streak_30')).toBe(false);
    });
  });

  // ============================================
  // Full user scenario
  // ============================================
  describe('full user scenario', () => {
    it('simulates a complete day of app usage', async () => {
      // 1. Check settings
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const settings = await getUserSettings();
      expect(settings).toBeDefined();

      // 2. Log weight (validated)
      const weightValidation = validate('weight', 75.5);
      expect(weightValidation.valid).toBe(true);

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const measurement = await addMeasurement({
        date: '2026-02-10',
        weight: weightValidation.value,
      });
      expect(measurement).toBeDefined();

      // 3. Log workout
      const workout = await addWorkout({
        date: '2026-02-10',
        type: 'jjb',
        duration: 90,
      });
      expect(workout).toBeDefined();

      // 4. Hydration
      const hydration = await addHydrationEntry(500);
      expect(hydration).toBeDefined();

      // 5. Calculate points
      const points = await calculateTotalPoints(1, 1, 0, 0, 1);
      expect(points).toBeGreaterThan(0);

      // 6. Get level
      const level = getLevel(points);
      expect(level).toBeDefined();

      // 7. Nutrition plan
      const plan = calculateNutritionPlan(75.5, 175, 30, 'male', 'moderate', 'maintain', 'balanced');
      expect(plan.goalCalories).toBeGreaterThan(0);
    });
  });
});
