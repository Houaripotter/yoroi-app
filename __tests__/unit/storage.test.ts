// Mock expo modules needed by storage
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

// Import storage functions (after mocks are set up)
import {
  getAllMeasurements,
  getLatestMeasurement,
  addMeasurement,
  updateMeasurement,
  deleteMeasurement,
  deleteAllMeasurements,
  getAllWorkouts,
  addWorkout,
  deleteWorkout,
  deleteAllWorkouts,
  getWorkoutsByPeriod,
  hasWorkoutOnDate,
  getUnlockedBadges,
  unlockBadge,
  isBadgeUnlocked,
  getUserSettings,
  saveUserSettings,
  getUserBodyStatus,
  saveUserBodyStatus,
  getHomeLayout,
  saveHomeLayout,
  DEFAULT_HOME_SECTIONS,
  getSelectedLogo,
  saveSelectedLogo,
  addHydrationEntry,
  getAllHydrationEntries,
  getHydrationByDate,
  deleteHydrationEntry,
  calculateRecommendedHydration,
  saveMood,
  getMoods,
  getTodayMood,
} from '@/lib/storage';

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  // ============================================
  // Workouts CRUD (via AsyncStorage)
  // ============================================
  describe('workouts', () => {
    it('returns empty array when no workouts exist', async () => {
      const workouts = await getAllWorkouts();
      expect(workouts).toEqual([]);
    });

    it('adds a workout and returns it with id and created_at', async () => {
      const workout = await addWorkout({
        date: '2026-01-15',
        type: 'jjb',
      });
      expect(workout).toHaveProperty('id');
      expect(workout).toHaveProperty('created_at');
      expect(workout.type).toBe('jjb');
      expect(workout.date).toBe('2026-01-15');
    });

    it('persists workout to AsyncStorage', async () => {
      await addWorkout({ date: '2026-01-15', type: 'musculation' });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@yoroi_workouts',
        expect.any(String)
      );
    });

    it('returns workouts sorted by date descending', async () => {
      const workoutsData = [
        { id: '1', date: '2026-01-10', type: 'jjb', created_at: '2026-01-10T00:00:00Z' },
        { id: '2', date: '2026-01-15', type: 'musculation', created_at: '2026-01-15T00:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(workoutsData));

      const workouts = await getAllWorkouts();
      expect(workouts[0].date).toBe('2026-01-15');
      expect(workouts[1].date).toBe('2026-01-10');
    });

    it('deletes a workout by id', async () => {
      const workoutsData = [
        { id: '1', date: '2026-01-10', type: 'jjb', created_at: '2026-01-10T00:00:00Z' },
        { id: '2', date: '2026-01-15', type: 'musculation', created_at: '2026-01-15T00:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(workoutsData));

      const result = await deleteWorkout('1');
      expect(result).toBe(true);
      // Check what was saved
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('2');
    });

    it('deletes all workouts', async () => {
      const result = await deleteAllWorkouts();
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@yoroi_workouts',
        '[]'
      );
    });
  });

  // ============================================
  // Badges
  // ============================================
  describe('badges', () => {
    it('returns empty array when no badges unlocked', async () => {
      const badges = await getUnlockedBadges();
      expect(badges).toEqual([]);
    });

    it('unlocks a badge', async () => {
      const result = await unlockBadge('first_weighing');
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@yoroi_user_badges',
        expect.stringContaining('first_weighing')
      );
    });

    it('prevents duplicate badge unlocking', async () => {
      const existingBadges = [{ badge_id: 'first_weighing', unlocked_at: '2026-01-01' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBadges));

      const result = await unlockBadge('first_weighing');
      expect(result).toBe(false);
    });

    it('checks if badge is unlocked', async () => {
      const existingBadges = [{ badge_id: 'streak_7', unlocked_at: '2026-01-01' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingBadges));

      expect(await isBadgeUnlocked('streak_7')).toBe(true);
      expect(await isBadgeUnlocked('nonexistent')).toBe(false);
    });
  });

  // ============================================
  // Home layout
  // ============================================
  describe('home layout', () => {
    it('returns default sections when no layout saved', async () => {
      const layout = await getHomeLayout();
      expect(layout).toEqual(DEFAULT_HOME_SECTIONS);
    });

    it('saves and loads custom layout', async () => {
      const customSections = [
        { id: 'hero' as const, label: 'Poids actuel', visible: true },
        { id: 'shortcuts' as const, label: 'Accès rapide', visible: false },
      ];
      await saveHomeLayout(customSections);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@yoroi_home_layout',
        JSON.stringify(customSections)
      );
    });

    it('merges saved layout with new default sections', async () => {
      // Saved layout missing some default sections
      const saved = [
        { id: 'hero', label: 'Poids actuel', visible: false },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(saved));

      const layout = await getHomeLayout();
      // Should have all default sections
      expect(layout.length).toBe(DEFAULT_HOME_SECTIONS.length);
      // Hero should keep saved state (visible: false)
      const hero = layout.find(s => s.id === 'hero');
      expect(hero!.visible).toBe(false);
    });

    it('handles corrupted JSON gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json{{{');
      const layout = await getHomeLayout();
      expect(layout).toEqual(DEFAULT_HOME_SECTIONS);
    });
  });

  // ============================================
  // Hydration entries
  // ============================================
  describe('hydration', () => {
    it('returns empty array when no entries', async () => {
      const entries = await getAllHydrationEntries();
      expect(entries).toEqual([]);
    });

    it('adds a hydration entry', async () => {
      const entry = await addHydrationEntry(250);
      expect(entry).toHaveProperty('id');
      expect(entry.amount).toBe(250);
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('timestamp');
    });

    it('adds entry with custom date', async () => {
      const entry = await addHydrationEntry(500, '2026-01-15');
      expect(entry.date).toBe('2026-01-15');
    });

    it('persists entries to AsyncStorage', async () => {
      await addHydrationEntry(300);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@yoroi_hydration_log',
        expect.any(String)
      );
    });

    it('deletes a hydration entry', async () => {
      const entries = [
        { id: '1', date: '2026-01-15', amount: 250, timestamp: '2026-01-15T10:00:00Z' },
        { id: '2', date: '2026-01-15', amount: 300, timestamp: '2026-01-15T12:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entries));

      const result = await deleteHydrationEntry('1');
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Mood
  // ============================================
  describe('mood', () => {
    it('saves a mood entry', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await saveMood({
        date: '2026-01-15',
        mood: 'happy',
        energy: 4,
        timestamp: '2026-01-15T10:00:00Z',
      });
      expect(result).toBe(true);
    });

    it('gets moods (empty when none saved)', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const moods = await getMoods();
      expect(moods).toEqual([]);
    });

    it('gets moods filtered by days', async () => {
      const today = new Date().toISOString().split('T')[0];
      const oldDate = '2020-01-01';
      const moodData = [
        { id: '1', date: today, mood: 'happy', energy: 4, timestamp: `${today}T10:00:00Z` },
        { id: '2', date: oldDate, mood: 'sad', energy: 2, timestamp: `${oldDate}T10:00:00Z` },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(moodData));

      const moods = await getMoods(7);
      expect(moods).toHaveLength(1);
      expect(moods[0].mood).toBe('happy');
    });

    it('getTodayMood returns null when no mood today', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const mood = await getTodayMood();
      expect(mood).toBeNull();
    });

    it('getTodayMood returns mood for today', async () => {
      const today = new Date().toISOString().split('T')[0];
      const moodData = [
        { id: '1', date: today, mood: 'energetic', energy: 5, timestamp: `${today}T08:00:00Z` },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(moodData));

      const mood = await getTodayMood();
      expect(mood).not.toBeNull();
      expect(mood!.mood).toBe('energetic');
    });
  });

  // ============================================
  // Corrupted data fallbacks
  // ============================================
  describe('corrupted data', () => {
    it('returns empty array for corrupted workout data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json!!!');
      const workouts = await getAllWorkouts();
      expect(workouts).toEqual([]);
    });

    it('returns empty array for corrupted badge data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted');
      const badges = await getUnlockedBadges();
      expect(badges).toEqual([]);
    });

    it('returns empty array for corrupted hydration data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{invalid');
      const entries = await getAllHydrationEntries();
      expect(entries).toEqual([]);
    });
  });

  // ============================================
  // Measurements (via SecureStore)
  // ============================================
  describe('measurements', () => {
    it('returns empty array when no measurements exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const measurements = await getAllMeasurements();
      expect(measurements).toEqual([]);
    });

    it('adds a measurement and returns it with id and created_at', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const measurement = await addMeasurement({
        date: '2026-01-15',
        weight: 75.5,
      });
      expect(measurement).toHaveProperty('id');
      expect(measurement).toHaveProperty('created_at');
      expect(measurement.weight).toBe(75.5);
      expect(measurement.date).toBe('2026-01-15');
    });

    it('returns latest measurement', async () => {
      const data = [
        { id: '1', date: '2026-01-10', weight: 76, created_at: '2026-01-10T00:00:00Z' },
        { id: '2', date: '2026-01-15', weight: 75, created_at: '2026-01-15T00:00:00Z' },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(data));

      const latest = await getLatestMeasurement();
      expect(latest).not.toBeNull();
      expect(latest!.date).toBe('2026-01-15');
    });

    it('returns null for latest when no measurements', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const latest = await getLatestMeasurement();
      expect(latest).toBeNull();
    });

    it('updates a measurement', async () => {
      const data = [
        { id: '1', date: '2026-01-15', weight: 75, created_at: '2026-01-15T00:00:00Z' },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(data));

      const result = await updateMeasurement('1', { weight: 74.5 });
      expect(result).toBe(true);
    });

    it('returns false when updating non-existent measurement', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('[]');
      const result = await updateMeasurement('nonexistent', { weight: 74 });
      expect(result).toBe(false);
    });

    it('deletes a measurement', async () => {
      const data = [
        { id: '1', date: '2026-01-15', weight: 75, created_at: '2026-01-15T00:00:00Z' },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(data));

      const result = await deleteMeasurement('1');
      expect(result).toBe(true);
    });

    it('deletes all measurements', async () => {
      const result = await deleteAllMeasurements();
      expect(result).toBe(true);
    });
  });

  // ============================================
  // User settings
  // ============================================
  describe('user settings', () => {
    it('returns default settings when none saved', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const settings = await getUserSettings();
      expect(settings.weight_unit).toBe('kg');
      expect(settings.measurement_unit).toBe('cm');
    });

    it('saves partial settings merged with current', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ weight_unit: 'kg', measurement_unit: 'cm' })
      );
      const result = await saveUserSettings({ username: 'Houari' });
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Body status
  // ============================================
  describe('body status', () => {
    it('returns empty object when no status saved', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const status = await getUserBodyStatus();
      expect(status).toEqual({});
    });

    it('saves body status', async () => {
      const result = await saveUserBodyStatus({
        left_knee: { status: 'warning', pain: 3 },
      });
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Workout period/date queries
  // ============================================
  describe('workout queries', () => {
    it('hasWorkoutOnDate returns true for matching date', async () => {
      const data = [
        { id: '1', date: '2026-01-15', type: 'jjb', created_at: '2026-01-15T00:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));
      expect(await hasWorkoutOnDate('2026-01-15')).toBe(true);
    });

    it('hasWorkoutOnDate returns false for non-matching date', async () => {
      const data = [
        { id: '1', date: '2026-01-15', type: 'jjb', created_at: '2026-01-15T00:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));
      expect(await hasWorkoutOnDate('2026-01-16')).toBe(false);
    });
  });

  // ============================================
  // Logo selection
  // ============================================
  describe('logo selection', () => {
    it('returns default logo when none saved', async () => {
      const logo = await getSelectedLogo();
      expect(logo).toBe('default');
    });

    it('saves selected logo', async () => {
      await saveSelectedLogo('logo1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@yoroi_selected_logo',
        'logo1'
      );
    });

    it('returns saved logo', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('logo3');
      const logo = await getSelectedLogo();
      expect(logo).toBe('logo3');
    });
  });

  // ============================================
  // Hydration by date
  // ============================================
  describe('hydration by date', () => {
    it('filters entries by date', async () => {
      const entries = [
        { id: '1', date: '2026-01-15', amount: 250, timestamp: '2026-01-15T10:00:00Z' },
        { id: '2', date: '2026-01-15', amount: 300, timestamp: '2026-01-15T12:00:00Z' },
        { id: '3', date: '2026-01-16', amount: 200, timestamp: '2026-01-16T08:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entries));

      const result = await getHydrationByDate('2026-01-15');
      expect(result).toHaveLength(2);
    });
  });

  // ============================================
  // calculateRecommendedHydration
  // ============================================
  describe('calculateRecommendedHydration', () => {
    it('calculates 2.5L for 70kg', () => {
      expect(calculateRecommendedHydration(70)).toBe(2.5);
    });

    it('calculates 3.5L for 100kg', () => {
      expect(calculateRecommendedHydration(100)).toBe(3.5);
    });

    it('calculates for 60kg', () => {
      expect(calculateRecommendedHydration(60)).toBe(2);
    });

    it('handles 0 weight', () => {
      expect(calculateRecommendedHydration(0)).toBe(0);
    });

    it('rounds to nearest 0.5L', () => {
      const result = calculateRecommendedHydration(80);
      expect(result % 0.5).toBe(0);
    });
  });
});
