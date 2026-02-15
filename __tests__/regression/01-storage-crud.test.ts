/**
 * REGRESSION TEST SUITE - Storage CRUD Operations
 * Vérifie que toutes les opérations CRUD sur AsyncStorage et SecureStore
 * fonctionnent correctement après les modifications.
 */

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
  addHydrationEntry,
  getAllHydrationEntries,
  getHydrationByDate,
  deleteHydrationEntry,
  saveMood,
  getMoods,
  getTodayMood,
  getAllMeasurements,
  getLatestMeasurement,
  addMeasurement,
  updateMeasurement,
  deleteMeasurement,
  deleteAllMeasurements,
  getUserClubs,
  addUserClub,
  updateUserClub,
  deleteUserClub,
  getUserGear,
  addUserGear,
  updateUserGear,
  deleteUserGear,
  getSelectedLogo,
  saveSelectedLogo,
  calculateRecommendedHydration,
} from '@/lib/storage';

describe('REGRESSION: Storage CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  // ============================================
  // WORKOUTS - Full CRUD lifecycle
  // ============================================
  describe('workouts lifecycle', () => {
    it('creates, reads, and deletes a workout', async () => {
      // Create
      const workout = await addWorkout({ date: '2026-02-10', type: 'jjb' });
      expect(workout.id).toBeDefined();
      expect(workout.type).toBe('jjb');

      // Read - mock the saved data
      const savedCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(savedCall[1]);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const all = await getAllWorkouts();
      expect(all).toHaveLength(1);
      expect(all[0].date).toBe('2026-02-10');

      // Delete
      const deleted = await deleteWorkout(workout.id);
      expect(deleted).toBe(true);
    });

    it('handles multiple workout types', async () => {
      const types = ['jjb', 'musculation', 'course', 'boxe', 'yoga'];
      for (const type of types) {
        const w = await addWorkout({ date: '2026-02-10', type });
        expect(w.type).toBe(type);
      }
    });

    it('queries workouts by period (number of days)', async () => {
      const today = new Date().toISOString().split('T')[0];
      const data = [
        { id: '1', date: today, type: 'jjb', created_at: `${today}T00:00:00Z` },
        { id: '2', date: '2020-01-01', type: 'course', created_at: '2020-01-01T00:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

      const result = await getWorkoutsByPeriod(7);
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('jjb');
    });

    it('hasWorkoutOnDate edge cases', async () => {
      const data = [
        { id: '1', date: '2026-02-10', type: 'jjb', created_at: '2026-02-10T00:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

      expect(await hasWorkoutOnDate('2026-02-10')).toBe(true);
      expect(await hasWorkoutOnDate('2026-02-11')).toBe(false);
      expect(await hasWorkoutOnDate('')).toBe(false);
    });

    it('deleteAllWorkouts clears all data', async () => {
      await deleteAllWorkouts();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@yoroi_workouts', '[]');
    });
  });

  // ============================================
  // MEASUREMENTS - Full CRUD lifecycle
  // ============================================
  describe('measurements lifecycle', () => {
    it('creates, reads, updates, deletes a measurement', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      // Create
      const measurement = await addMeasurement({ date: '2026-02-10', weight: 75.5 });
      expect(measurement.id).toBeDefined();
      expect(measurement.weight).toBe(75.5);

      // Read latest
      const savedCall = (SecureStore.setItemAsync as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(savedCall[1]);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const latest = await getLatestMeasurement();
      expect(latest).not.toBeNull();

      // Update
      const updated = await updateMeasurement(measurement.id, { weight: 74.0 });
      expect(updated).toBe(true);

      // Delete
      const deleted = await deleteMeasurement(measurement.id);
      expect(deleted).toBe(true);
    });

    it('returns null for latest when empty', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const latest = await getLatestMeasurement();
      expect(latest).toBeNull();
    });

    it('deleteAllMeasurements works', async () => {
      const result = await deleteAllMeasurements();
      expect(result).toBe(true);
    });
  });

  // ============================================
  // BADGES - Unlock/check lifecycle
  // ============================================
  describe('badges lifecycle', () => {
    it('unlocks badge and checks correctly', async () => {
      // Unlock
      const result = await unlockBadge('first_weighing');
      expect(result).toBe(true);

      // Check
      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      expect(await isBadgeUnlocked('first_weighing')).toBe(true);
      expect(await isBadgeUnlocked('nonexistent')).toBe(false);
    });

    it('prevents duplicate badge unlock', async () => {
      const badges = [{ badge_id: 'streak_7', unlocked_at: '2026-01-01' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(badges));
      const result = await unlockBadge('streak_7');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // HOME LAYOUT
  // ============================================
  describe('home layout', () => {
    it('returns defaults when none saved', async () => {
      const layout = await getHomeLayout();
      expect(layout).toEqual(DEFAULT_HOME_SECTIONS);
      expect(layout.length).toBeGreaterThan(0);
    });

    it('preserves custom visibility settings', async () => {
      const saved = [{ id: 'hero', label: 'Poids actuel', visible: false }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(saved));

      const layout = await getHomeLayout();
      const hero = layout.find((s: any) => s.id === 'hero');
      expect(hero?.visible).toBe(false);
    });

    it('handles corrupted JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json');
      const layout = await getHomeLayout();
      expect(layout).toEqual(DEFAULT_HOME_SECTIONS);
    });
  });

  // ============================================
  // HYDRATION
  // ============================================
  describe('hydration', () => {
    it('adds and retrieves entries', async () => {
      const entry = await addHydrationEntry(250);
      expect(entry.amount).toBe(250);
      expect(entry.id).toBeDefined();
    });

    it('filters by date', async () => {
      const entries = [
        { id: '1', date: '2026-02-10', amount: 250, timestamp: '2026-02-10T10:00:00Z' },
        { id: '2', date: '2026-02-11', amount: 300, timestamp: '2026-02-11T10:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entries));

      const result = await getHydrationByDate('2026-02-10');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(250);
    });

    it('deletes an entry', async () => {
      const entries = [
        { id: '1', date: '2026-02-10', amount: 250, timestamp: '2026-02-10T10:00:00Z' },
        { id: '2', date: '2026-02-10', amount: 300, timestamp: '2026-02-10T12:00:00Z' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(entries));
      const result = await deleteHydrationEntry('1');
      expect(result).toBe(true);
    });

    it('calculates recommended hydration for various weights', () => {
      expect(calculateRecommendedHydration(70)).toBe(2.5);
      expect(calculateRecommendedHydration(100)).toBe(3.5);
      expect(calculateRecommendedHydration(0)).toBe(0);
      expect(calculateRecommendedHydration(60)).toBe(2);
    });
  });

  // ============================================
  // MOOD
  // ============================================
  describe('mood', () => {
    it('saves and retrieves mood', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await saveMood({
        date: '2026-02-10',
        mood: 'happy',
        energy: 4,
        timestamp: '2026-02-10T10:00:00Z',
      });
      expect(result).toBe(true);
    });

    it('returns null for today mood when none set', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const mood = await getTodayMood();
      expect(mood).toBeNull();
    });

    it('filters moods by days', async () => {
      const today = new Date().toISOString().split('T')[0];
      const oldDate = '2020-01-01';
      const data = [
        { id: '1', date: today, mood: 'happy', energy: 4, timestamp: `${today}T10:00:00Z` },
        { id: '2', date: oldDate, mood: 'sad', energy: 2, timestamp: `${oldDate}T10:00:00Z` },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(data));

      const moods = await getMoods(7);
      expect(moods).toHaveLength(1);
      expect(moods[0].mood).toBe('happy');
    });
  });

  // ============================================
  // USER SETTINGS
  // ============================================
  describe('user settings', () => {
    it('returns defaults when none saved', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const settings = await getUserSettings();
      expect(settings.weight_unit).toBe('kg');
      expect(settings.measurement_unit).toBe('cm');
    });

    it('saves partial settings', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ weight_unit: 'kg', measurement_unit: 'cm' })
      );
      const result = await saveUserSettings({ username: 'Houari' });
      expect(result).toBe(true);
    });
  });

  // ============================================
  // BODY STATUS
  // ============================================
  describe('body status', () => {
    it('returns empty when none saved', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const status = await getUserBodyStatus();
      expect(status).toEqual({});
    });

    it('saves body zone data', async () => {
      const result = await saveUserBodyStatus({
        left_knee: { status: 'warning', pain: 3 },
      });
      expect(result).toBe(true);
    });
  });

  // ============================================
  // CLUBS CRUD
  // ============================================
  describe('clubs lifecycle', () => {
    it('adds a club', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const club = await addUserClub({ name: 'Gracie Barra', sport: 'jjb' });
      expect(club).toHaveProperty('id');
      expect(club.name).toBe('Gracie Barra');
    });

    it('returns default clubs when none saved', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const clubs = await getUserClubs();
      // Returns default clubs (Ma Salle, Mon Dojo, Extérieur)
      expect(clubs.length).toBeGreaterThanOrEqual(3);
      expect(clubs[0]).toHaveProperty('name');
      expect(clubs[0]).toHaveProperty('id');
    });
  });

  // ============================================
  // GEAR CRUD
  // ============================================
  describe('gear lifecycle', () => {
    it('adds gear item', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const gear = await addUserGear({ name: 'Kimono Shoyoroll', category: 'gi' });
      expect(gear).toHaveProperty('id');
      expect(gear.name).toBe('Kimono Shoyoroll');
    });

    it('returns default gear when none saved', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const gear = await getUserGear();
      // Returns default gear (Kimono, Chaussures, Gants)
      expect(gear.length).toBeGreaterThanOrEqual(3);
      expect(gear[0]).toHaveProperty('name');
      expect(gear[0]).toHaveProperty('id');
    });
  });

  // ============================================
  // LOGO SELECTION
  // ============================================
  describe('logo selection', () => {
    it('returns default when none saved', async () => {
      const logo = await getSelectedLogo();
      expect(logo).toBe('default');
    });

    it('saves and returns selected logo', async () => {
      await saveSelectedLogo('logo2');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@yoroi_selected_logo', 'logo2');

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('logo2');
      const logo = await getSelectedLogo();
      expect(logo).toBe('logo2');
    });
  });

  // ============================================
  // CORRUPTED DATA RESILIENCE
  // ============================================
  describe('corrupted data resilience', () => {
    it('handles corrupted workout JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{{invalid');
      const workouts = await getAllWorkouts();
      expect(workouts).toEqual([]);
    });

    it('handles corrupted badge JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted!!!');
      const badges = await getUnlockedBadges();
      expect(badges).toEqual([]);
    });

    it('handles corrupted hydration JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');
      const entries = await getAllHydrationEntries();
      expect(entries).toEqual([]);
    });

    it('handles corrupted settings JSON', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('corrupt');
      const settings = await getUserSettings();
      // Should return defaults, not crash
      expect(settings).toBeDefined();
    });

    it('handles null AsyncStorage for all read ops', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      expect(await getAllWorkouts()).toEqual([]);
      expect(await getUnlockedBadges()).toEqual([]);
      expect(await getAllHydrationEntries()).toEqual([]);
    });

    it('handles AsyncStorage rejection', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
      const workouts = await getAllWorkouts();
      expect(workouts).toEqual([]);
    });
  });
});
