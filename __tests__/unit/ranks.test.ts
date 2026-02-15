import {
  getCurrentRank,
  getNextRank,
  getDaysToNextRank,
  getRankProgress,
  getRankColor,
  RANKS,
} from '@/lib/ranks';

describe('ranks', () => {
  // ============================================
  // getCurrentRank
  // ============================================
  describe('getCurrentRank', () => {
    it('returns Ashigaru for 0 days', () => {
      expect(getCurrentRank(0).id).toBe('ashigaru');
    });

    it('returns Ashigaru for 14 days', () => {
      expect(getCurrentRank(14).id).toBe('ashigaru');
    });

    it('returns Bushi for 15 days', () => {
      expect(getCurrentRank(15).id).toBe('bushi');
    });

    it('returns Samouraï for 30 days', () => {
      expect(getCurrentRank(30).id).toBe('samurai');
    });

    it('returns Rōnin for 90 days', () => {
      expect(getCurrentRank(90).id).toBe('ronin');
    });

    it('returns Shōgun for 250 days', () => {
      expect(getCurrentRank(250).id).toBe('shogun');
    });

    it('returns Shōgun for days well above 250', () => {
      expect(getCurrentRank(1000).id).toBe('shogun');
    });

    it('returns Ashigaru for negative days', () => {
      expect(getCurrentRank(-5).id).toBe('ashigaru');
    });

    it('returns correct rank structure', () => {
      const rank = getCurrentRank(50);
      expect(rank).toHaveProperty('id');
      expect(rank).toHaveProperty('name');
      expect(rank).toHaveProperty('nameFemale');
      expect(rank).toHaveProperty('nameJp');
      expect(rank).toHaveProperty('icon');
      expect(rank).toHaveProperty('minDays');
      expect(rank).toHaveProperty('color');
      expect(rank).toHaveProperty('description');
    });
  });

  // ============================================
  // getNextRank
  // ============================================
  describe('getNextRank', () => {
    it('returns Bushi as next rank for 0 days', () => {
      const next = getNextRank(0);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('bushi');
    });

    it('returns Samouraï as next for 15 days', () => {
      const next = getNextRank(15);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('samurai');
    });

    it('returns Rōnin as next for 30 days', () => {
      const next = getNextRank(30);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('ronin');
    });

    it('returns Shōgun as next for 90 days', () => {
      const next = getNextRank(90);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('shogun');
    });

    it('returns null at max rank (250+ days)', () => {
      expect(getNextRank(250)).toBeNull();
      expect(getNextRank(999)).toBeNull();
    });
  });

  // ============================================
  // getDaysToNextRank
  // ============================================
  describe('getDaysToNextRank', () => {
    it('returns 15 days from 0', () => {
      expect(getDaysToNextRank(0)).toBe(15);
    });

    it('returns 5 days from 10', () => {
      expect(getDaysToNextRank(10)).toBe(5);
    });

    it('returns 15 days from 15 (bushi → samurai at 30)', () => {
      expect(getDaysToNextRank(15)).toBe(15);
    });

    it('returns 0 at max rank', () => {
      expect(getDaysToNextRank(250)).toBe(0);
      expect(getDaysToNextRank(500)).toBe(0);
    });
  });

  // ============================================
  // getRankProgress
  // ============================================
  describe('getRankProgress', () => {
    it('returns 0 at start of rank', () => {
      expect(getRankProgress(0)).toBe(0);
    });

    it('returns ~50% midway through first rank', () => {
      // First rank: 0-15, midpoint ~7.5
      const progress = getRankProgress(7);
      expect(progress).toBeGreaterThan(40);
      expect(progress).toBeLessThan(60);
    });

    it('returns 100 at max rank', () => {
      expect(getRankProgress(250)).toBe(100);
    });

    it('returns 100 above max rank', () => {
      expect(getRankProgress(999)).toBe(100);
    });

    it('is bounded between 0 and 100', () => {
      for (const days of [-5, 0, 10, 50, 100, 200, 300]) {
        const progress = getRankProgress(days);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      }
    });
  });

  // ============================================
  // getRankColor
  // ============================================
  describe('getRankColor', () => {
    it('returns correct color for ashigaru', () => {
      expect(getRankColor('ashigaru')).toBe('#60A5FA');
    });

    it('returns correct color for shogun', () => {
      expect(getRankColor('shogun')).toBe('#FFD700');
    });

    it('returns fallback color for unknown rank id', () => {
      expect(getRankColor('unknown')).toBe('#6B7280');
    });

    it('returns fallback for empty string', () => {
      expect(getRankColor('')).toBe('#6B7280');
    });

    it('returns valid hex color for all ranks', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const rank of RANKS) {
        expect(getRankColor(rank.id)).toMatch(hexRegex);
      }
    });
  });

  // ============================================
  // RANKS constant
  // ============================================
  describe('RANKS', () => {
    it('has 5 ranks', () => {
      expect(RANKS).toHaveLength(5);
    });

    it('ranks are ordered by minDays', () => {
      for (let i = 1; i < RANKS.length; i++) {
        expect(RANKS[i].minDays).toBeGreaterThan(RANKS[i - 1].minDays);
      }
    });

    it('first rank starts at 0 days', () => {
      expect(RANKS[0].minDays).toBe(0);
    });
  });
});
