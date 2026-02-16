import { calculateRecommendedHydration } from '@/lib/storage';

describe('storage-hydration', () => {
  // ============================================
  // calculateRecommendedHydration
  // ============================================
  describe('calculateRecommendedHydration', () => {
    it('returns 2.5L for 70kg person', () => {
      // 70 * 0.033 = 2.31 → rounded to nearest 0.5 = 2.5
      expect(calculateRecommendedHydration(70)).toBe(2.5);
    });

    it('returns 3.5L for 100kg person', () => {
      // 100 * 0.033 = 3.3 → rounded to nearest 0.5 = 3.5
      expect(calculateRecommendedHydration(100)).toBe(3.5);
    });

    it('returns 2L for 60kg person', () => {
      // 60 * 0.033 = 1.98 → rounded to nearest 0.5 = 2.0
      expect(calculateRecommendedHydration(60)).toBe(2);
    });

    it('returns 1.5L for 45kg person', () => {
      // 45 * 0.033 = 1.485 → rounded to nearest 0.5 = 1.5
      expect(calculateRecommendedHydration(45)).toBe(1.5);
    });

    it('returns 3L for 90kg person', () => {
      // 90 * 0.033 = 2.97 → rounded to nearest 0.5 = 3.0
      expect(calculateRecommendedHydration(90)).toBe(3);
    });

    it('returns 0 for 0 weight', () => {
      expect(calculateRecommendedHydration(0)).toBe(0);
    });

    it('result is always a multiple of 0.5', () => {
      for (const weight of [40, 55, 67, 73, 85, 95, 110, 130]) {
        const result = calculateRecommendedHydration(weight);
        expect(result % 0.5).toBe(0);
      }
    });

    it('increases with weight', () => {
      const light = calculateRecommendedHydration(50);
      const heavy = calculateRecommendedHydration(100);
      expect(heavy).toBeGreaterThan(light);
    });

    it('handles very large weight', () => {
      const result = calculateRecommendedHydration(200);
      // 200 * 0.033 = 6.6 → 6.5
      expect(result).toBe(6.5);
      expect(result).toBeGreaterThan(0);
    });

    it('handles very small positive weight', () => {
      const result = calculateRecommendedHydration(5);
      // 5 * 0.033 = 0.165 → 0
      expect(result).toBe(0);
    });
  });
});
