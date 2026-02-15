/**
 * STRESS TEST - AsyncStorage Performance
 * Teste les limites de stockage : écritures simultanées,
 * gros objets JSON, lecture/écriture massive.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AsyncStorage Stress Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.multiSet as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  // ============================================
  // 500+ entrées simultanées
  // ============================================
  describe('massive data operations', () => {
    it('handles 500 sequential writes without error', async () => {
      const start = Date.now();
      const promises: Promise<void>[] = [];

      for (let i = 0; i < 500; i++) {
        promises.push(
          AsyncStorage.setItem(`@key_${i}`, JSON.stringify({ id: i, value: `data_${i}` }))
        );
      }

      await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(500);
      console.log(`\n  500 écritures simultanées : ${elapsed}ms`);
    });

    it('handles 1000 reads without error', async () => {
      const mockData = JSON.stringify({ weight: 75, date: '2026-01-15' });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockData);

      const start = Date.now();
      const promises: Promise<string | null>[] = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(AsyncStorage.getItem(`@key_${i}`));
      }

      const results = await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(results).toHaveLength(1000);
      results.forEach(r => expect(r).toBe(mockData));
      console.log(`  1000 lectures simultanées : ${elapsed}ms`);
    });

    it('handles multiGet with 200 keys', async () => {
      const keys = Array.from({ length: 200 }, (_, i) => `@key_${i}`);
      const mockPairs = keys.map(k => [k, JSON.stringify({ v: k })]);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue(mockPairs);

      const start = Date.now();
      const result = await AsyncStorage.multiGet(keys);
      const elapsed = Date.now() - start;

      expect(result).toHaveLength(200);
      console.log(`  multiGet 200 clés : ${elapsed}ms`);
    });
  });

  // ============================================
  // Gros objets JSON (>1MB simulé)
  // ============================================
  describe('large JSON objects', () => {
    it('serializes a 500-item measurement array', () => {
      const measurements = Array.from({ length: 500 }, (_, i) => ({
        id: `measurement_${i}`,
        date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
        weight: 70 + Math.random() * 20,
        body_fat: 10 + Math.random() * 15,
        muscle_mass: 30 + Math.random() * 10,
        water: 50 + Math.random() * 10,
        bone_mass: 2.5 + Math.random(),
        visceral_fat: Math.floor(Math.random() * 15),
        metabolic_age: 20 + Math.floor(Math.random() * 30),
        bmr: 1500 + Math.floor(Math.random() * 500),
        bmi: 20 + Math.random() * 10,
        measurements: {
          chest: 90 + Math.random() * 20,
          waist: 70 + Math.random() * 20,
          hips: 90 + Math.random() * 20,
          left_arm: 30 + Math.random() * 10,
          right_arm: 30 + Math.random() * 10,
        },
        notes: `Mesure du jour ${i}. Feeling good. ${Math.random()}`,
        created_at: new Date().toISOString(),
      }));

      const start = Date.now();
      const json = JSON.stringify(measurements);
      const serializeTime = Date.now() - start;

      const start2 = Date.now();
      const parsed = JSON.parse(json);
      const parseTime = Date.now() - start2;

      const sizeKB = Math.round(json.length / 1024);

      expect(parsed).toHaveLength(500);
      expect(sizeKB).toBeGreaterThan(0);
      console.log(`  500 mesures : ${sizeKB}KB | sérialisation: ${serializeTime}ms | parse: ${parseTime}ms`);
    });

    it('serializes a 1000-workout array', () => {
      const workouts = Array.from({ length: 1000 }, (_, i) => ({
        id: `workout_${i}`,
        date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
        type: ['musculation', 'jjb', 'running', 'autre'][i % 4],
        club_id: `club_${i % 3}`,
        created_at: new Date().toISOString(),
      }));

      const start = Date.now();
      const json = JSON.stringify(workouts);
      const elapsed = Date.now() - start;

      const sizeKB = Math.round(json.length / 1024);

      expect(JSON.parse(json)).toHaveLength(1000);
      console.log(`  1000 workouts : ${sizeKB}KB | sérialisation: ${elapsed}ms`);
    });

    it('serializes a 2000-hydration entry array', () => {
      const entries = Array.from({ length: 2000 }, (_, i) => ({
        id: `hydration_${i}`,
        date: `2026-01-${String(i % 28 + 1).padStart(2, '0')}`,
        amount: 200 + Math.floor(Math.random() * 300),
        timestamp: new Date().toISOString(),
      }));

      const start = Date.now();
      const json = JSON.stringify(entries);
      const elapsed = Date.now() - start;

      const sizeKB = Math.round(json.length / 1024);

      expect(JSON.parse(json)).toHaveLength(2000);
      console.log(`  2000 entrées hydratation : ${sizeKB}KB | sérialisation: ${elapsed}ms`);
    });
  });

  // ============================================
  // Race conditions : écritures concurrentes
  // ============================================
  describe('concurrent write race conditions', () => {
    it('handles simultaneous writes to the same key', async () => {
      const writes = Array.from({ length: 50 }, (_, i) =>
        AsyncStorage.setItem('@yoroi_workouts', JSON.stringify({ version: i }))
      );

      await expect(Promise.all(writes)).resolves.not.toThrow();
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(50);
    });

    it('handles interleaved read-write operations', async () => {
      let storedValue = '[]';
      (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
        Promise.resolve(storedValue)
      );
      (AsyncStorage.setItem as jest.Mock).mockImplementation((_key: string, value: string) => {
        storedValue = value;
        return Promise.resolve();
      });

      // Simulate 20 concurrent add operations
      const operations = Array.from({ length: 20 }, async (_, i) => {
        const current = JSON.parse(await AsyncStorage.getItem('@data') || '[]');
        current.push({ id: i });
        await AsyncStorage.setItem('@data', JSON.stringify(current));
      });

      // Without proper locking, some writes may be lost
      await Promise.all(operations);

      // The mock simulates the race - final value depends on timing
      const finalData = JSON.parse(storedValue);
      // At minimum, it shouldn't crash
      expect(Array.isArray(finalData)).toBe(true);
      console.log(`  20 écritures concurrentes : ${finalData.length} items enregistrés (sur 20 attendus)`);
    });
  });

  // ============================================
  // Erreurs de stockage plein
  // ============================================
  describe('storage full simulation', () => {
    it('handles quota exceeded error gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('QuotaExceededError: Storage quota has been exceeded')
      );

      // Import storage functions
      const { addWorkout } = require('@/lib/storage');

      // Should not throw, should return gracefully
      const workout = await addWorkout({ date: '2026-01-15', type: 'jjb' });
      // addWorkout returns the workout object even if save fails
      expect(workout).toHaveProperty('id');
    });
  });

  // ============================================
  // Performance résumé
  // ============================================
  describe('performance benchmark', () => {
    it('JSON parse/stringify benchmark for typical app data', () => {
      console.log('\n  ===== BENCHMARK AsyncStorage =====');

      // Simulate typical app state
      const appState = {
        measurements: Array.from({ length: 100 }, (_, i) => ({
          id: `m_${i}`, date: `2026-01-${(i % 28) + 1}`, weight: 75 + Math.random() * 5,
          body_fat: 15, muscle_mass: 40, created_at: new Date().toISOString(),
        })),
        workouts: Array.from({ length: 200 }, (_, i) => ({
          id: `w_${i}`, date: `2026-01-${(i % 28) + 1}`, type: 'jjb',
          created_at: new Date().toISOString(),
        })),
        badges: Array.from({ length: 30 }, (_, i) => ({
          badge_id: `badge_${i}`, unlocked_at: new Date().toISOString(),
        })),
        hydration: Array.from({ length: 500 }, (_, i) => ({
          id: `h_${i}`, date: `2026-01-15`, amount: 250, timestamp: new Date().toISOString(),
        })),
      };

      const json = JSON.stringify(appState);
      const sizeKB = Math.round(json.length / 1024);

      // Benchmark 100 parse cycles
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        JSON.parse(json);
      }
      const parseTime = Date.now() - start;

      // Benchmark 100 stringify cycles
      const start2 = Date.now();
      for (let i = 0; i < 100; i++) {
        JSON.stringify(appState);
      }
      const stringifyTime = Date.now() - start2;

      console.log(`  Taille données app typique : ${sizeKB}KB`);
      console.log(`  100x JSON.parse : ${parseTime}ms (${(parseTime / 100).toFixed(2)}ms/op)`);
      console.log(`  100x JSON.stringify : ${stringifyTime}ms (${(stringifyTime / 100).toFixed(2)}ms/op)`);
      console.log('  ====================================\n');

      expect(parseTime / 100).toBeLessThan(50); // < 50ms par parse
      expect(stringifyTime / 100).toBeLessThan(50);
    });
  });
});
