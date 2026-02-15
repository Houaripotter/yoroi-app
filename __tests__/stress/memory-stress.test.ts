/**
 * STRESS TEST - Mémoire et Listes Massives
 * Simule des volumes de données extrêmes pour détecter
 * les fuites mémoire et problèmes de performance.
 */

describe('Memory Stress Tests', () => {
  // ============================================
  // Simulation de listes massives
  // ============================================
  describe('massive list simulation', () => {
    it('creates and processes 1000 measurement objects', () => {
      const start = Date.now();
      const measurements = Array.from({ length: 1000 }, (_, i) => ({
        id: `m_${i}`,
        date: new Date(2026, 0, (i % 365) + 1).toISOString().split('T')[0],
        weight: 60 + Math.random() * 40,
        body_fat: 5 + Math.random() * 30,
        muscle_mass: 25 + Math.random() * 20,
        water: 40 + Math.random() * 20,
        bone_mass: 2 + Math.random() * 3,
        visceral_fat: Math.floor(1 + Math.random() * 15),
        metabolic_age: Math.floor(15 + Math.random() * 50),
        bmr: Math.floor(1200 + Math.random() * 800),
        bmi: 18 + Math.random() * 15,
        created_at: new Date().toISOString(),
      }));
      const createTime = Date.now() - start;

      // Sort by date (comme getAllMeasurements)
      const sortStart = Date.now();
      measurements.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const sortTime = Date.now() - sortStart;

      // Filter last 30 days (comme getMeasurementsByPeriod)
      const filterStart = Date.now();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const recent = measurements.filter(m => new Date(m.date) >= cutoff);
      const filterTime = Date.now() - filterStart;

      console.log('\n  ===== STRESS LISTES MASSIVES =====');
      console.log(`  1000 mesures - Création: ${createTime}ms | Tri: ${sortTime}ms | Filtre 30j: ${filterTime}ms (${recent.length} résultats)`);

      expect(measurements).toHaveLength(1000);
      expect(sortTime).toBeLessThan(100); // Le tri devrait être < 100ms
    });

    it('creates and sorts 2000 workouts', () => {
      const workouts = Array.from({ length: 2000 }, (_, i) => ({
        id: `w_${i}`,
        date: new Date(2026, 0, (i % 365) + 1).toISOString().split('T')[0],
        type: ['musculation', 'jjb', 'running', 'autre', 'basic_fit', 'gracie_barra'][i % 6],
        created_at: new Date().toISOString(),
      }));

      const sortStart = Date.now();
      workouts.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const sortTime = Date.now() - sortStart;

      // Group by month
      const groupStart = Date.now();
      const byMonth: Record<string, typeof workouts> = {};
      workouts.forEach(w => {
        const month = w.date.substring(0, 7);
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(w);
      });
      const groupTime = Date.now() - groupStart;

      console.log(`  2000 workouts - Tri: ${sortTime}ms | Groupement par mois: ${groupTime}ms (${Object.keys(byMonth).length} mois)`);

      expect(workouts).toHaveLength(2000);
      expect(sortTime).toBeLessThan(300);
    });

    it('processes 5000 hydration entries', () => {
      const entries = Array.from({ length: 5000 }, (_, i) => ({
        id: `h_${i}`,
        date: new Date(2026, 0, (i % 365) + 1).toISOString().split('T')[0],
        amount: 100 + Math.floor(Math.random() * 500),
        timestamp: new Date().toISOString(),
      }));

      // Aggregate by date (comme getHydrationHistory)
      const aggStart = Date.now();
      const byDate: Record<string, number> = {};
      entries.forEach(e => {
        byDate[e.date] = (byDate[e.date] || 0) + e.amount;
      });
      const aggTime = Date.now() - aggStart;

      // Calculate average
      const avgStart = Date.now();
      const dates = Object.keys(byDate);
      const totalMl = dates.reduce((sum, d) => sum + byDate[d], 0);
      const avgMl = totalMl / dates.length;
      const avgTime = Date.now() - avgStart;

      console.log(`  5000 entrées hydratation - Agrégation: ${aggTime}ms | Moyenne: ${avgTime}ms (${Math.round(avgMl)}ml/jour)`);

      expect(entries).toHaveLength(5000);
      expect(aggTime).toBeLessThan(100);
    });
  });

  // ============================================
  // Simulation de gamification lourde
  // ============================================
  describe('gamification calculations at scale', () => {
    it('calculates points for heavy user (3 years of data)', async () => {
      const { calculateTotalPoints, getLevel, getLevelProgress } = require('@/lib/gamification');

      const start = Date.now();
      // 3 years: ~1000 weigh-ins, ~500 trainings, ~100 photos
      const total = await calculateTotalPoints(1000, 500, 100, 365, 200);
      const level = getLevel(total);
      const progress = getLevelProgress(total);
      const elapsed = Date.now() - start;

      console.log(`  Calcul gamification 3 ans : ${elapsed}ms | ${total} pts | Niveau: ${level.name} | Progression: ${progress.progress}%`);

      expect(total).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(50);
    });
  });

  // ============================================
  // Simulation de calcul nutritionnel massif
  // ============================================
  describe('nutrition calculations at scale', () => {
    it('calculates 100 nutrition plans in batch', () => {
      const { calculateNutritionPlan } = require('@/lib/nutrition');

      const profiles = Array.from({ length: 100 }, (_, i) => ({
        weight: 50 + (i % 60),
        height: 150 + (i % 40),
        age: 18 + (i % 50),
        gender: i % 2 === 0 ? 'male' as const : 'female' as const,
        activity: ['sedentary', 'light', 'moderate', 'active', 'extreme'][i % 5],
        goal: ['aggressive_loss', 'moderate_loss', 'maintain', 'slow_gain', 'moderate_gain'][i % 5],
        macro: ['balanced', 'high_protein', 'low_carb', 'keto', 'athlete'][i % 5],
      }));

      const start = Date.now();
      const plans = profiles.map(p =>
        calculateNutritionPlan(p.weight, p.height, p.age, p.gender, p.activity, p.goal, p.macro)
      );
      const elapsed = Date.now() - start;

      console.log(`  100 plans nutritionnels : ${elapsed}ms (${(elapsed / 100).toFixed(2)}ms/plan)`);

      expect(plans).toHaveLength(100);
      plans.forEach(plan => {
        expect(plan.bmr).toBeGreaterThan(0);
        expect(plan.tdee).toBeGreaterThan(0);
        expect(plan.goalCalories).toBeGreaterThanOrEqual(1200);
      });
      expect(elapsed).toBeLessThan(200);
    });
  });

  // ============================================
  // Validation en masse
  // ============================================
  describe('validation at scale', () => {
    it('validates 1000 objects in batch', () => {
      const { validateObject } = require('@/lib/validation');

      const objects = Array.from({ length: 1000 }, (_, i) => ({
        weight: 20 + (i % 330),
        notes: `Mesure ${i}`,
        age: 10 + (i % 110),
        bodyFat: 2 + (i % 58),
      }));

      const start = Date.now();
      let validCount = 0;
      let invalidCount = 0;

      objects.forEach(obj => {
        const result = validateObject(obj);
        if (result.valid) validCount++;
        else invalidCount++;
      });
      const elapsed = Date.now() - start;

      console.log(`  1000 validations : ${elapsed}ms | Valides: ${validCount} | Invalides: ${invalidCount}`);

      expect(validCount + invalidCount).toBe(1000);
      expect(elapsed).toBeLessThan(200);
    });
  });

  // ============================================
  // GC pressure test
  // ============================================
  describe('garbage collection pressure', () => {
    it('creates and discards 10000 temporary objects', () => {
      const start = Date.now();
      let lastRef: any = null;

      for (let i = 0; i < 10000; i++) {
        // Create large-ish temporary objects
        lastRef = {
          id: `temp_${i}`,
          data: Array.from({ length: 50 }, (_, j) => ({
            key: `k_${j}`,
            value: Math.random(),
          })),
          timestamp: new Date().toISOString(),
        };
      }
      const elapsed = Date.now() - start;

      console.log(`  10000 objets temporaires : ${elapsed}ms`);
      console.log('  ====================================\n');

      expect(lastRef).toBeDefined();
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
