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
    it('returns Ashigaru for 0 XP', () => {
      expect(getCurrentRank(0).id).toBe('ashigaru');
    });

    it('returns Ashigaru for 499 XP', () => {
      expect(getCurrentRank(499).id).toBe('ashigaru');
    });

    it('returns Bushi for 500 XP', () => {
      expect(getCurrentRank(500).id).toBe('bushi');
    });

    it('returns Samourai for 2000 XP', () => {
      expect(getCurrentRank(2000).id).toBe('samurai');
    });

    it('returns Ronin for 5000 XP', () => {
      expect(getCurrentRank(5000).id).toBe('ronin');
    });

    it('returns Shogun for 10000 XP', () => {
      expect(getCurrentRank(10000).id).toBe('shogun');
    });

    it('returns Shogun for XP well above 10000', () => {
      expect(getCurrentRank(99999).id).toBe('shogun');
    });

    it('returns Ashigaru for negative XP', () => {
      expect(getCurrentRank(-5).id).toBe('ashigaru');
    });

    it('returns correct rank structure', () => {
      const rank = getCurrentRank(1000);
      expect(rank).toHaveProperty('id');
      expect(rank).toHaveProperty('name');
      expect(rank).toHaveProperty('nameFemale');
      expect(rank).toHaveProperty('nameJp');
      expect(rank).toHaveProperty('icon');
      expect(rank).toHaveProperty('minPoints');
      expect(rank).toHaveProperty('color');
      expect(rank).toHaveProperty('description');
    });
  });

  // ============================================
  // getNextRank
  // ============================================
  describe('getNextRank', () => {
    it('returns Bushi as next rank for 0 XP', () => {
      const next = getNextRank(0);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('bushi');
    });

    it('returns Samourai as next for 500 XP', () => {
      const next = getNextRank(500);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('samurai');
    });

    it('returns Ronin as next for 2000 XP', () => {
      const next = getNextRank(2000);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('ronin');
    });

    it('returns Shogun as next for 5000 XP', () => {
      const next = getNextRank(5000);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('shogun');
    });

    it('returns null at max rank (10000+ XP)', () => {
      expect(getNextRank(10000)).toBeNull();
      expect(getNextRank(99999)).toBeNull();
    });
  });

  // ============================================
  // getDaysToNextRank
  // ============================================
  describe('getDaysToNextRank', () => {
    it('returns 500 XP from 0', () => {
      expect(getDaysToNextRank(0)).toBe(500);
    });

    it('returns 200 XP from 300', () => {
      expect(getDaysToNextRank(300)).toBe(200);
    });

    it('returns 1500 XP from 500 (bushi -> samurai at 2000)', () => {
      expect(getDaysToNextRank(500)).toBe(1500);
    });

    it('returns 0 at max rank', () => {
      expect(getDaysToNextRank(10000)).toBe(0);
      expect(getDaysToNextRank(99999)).toBe(0);
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
      // First rank: 0-500, midpoint = 250
      const progress = getRankProgress(250);
      expect(progress).toBe(50);
    });

    it('returns 100 at max rank', () => {
      expect(getRankProgress(10000)).toBe(100);
    });

    it('returns 100 above max rank', () => {
      expect(getRankProgress(99999)).toBe(100);
    });

    it('is bounded between 0 and 100', () => {
      for (const xp of [-5, 0, 250, 1000, 3000, 7000, 15000]) {
        const progress = getRankProgress(xp);
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

    it('ranks are ordered by minPoints', () => {
      for (let i = 1; i < RANKS.length; i++) {
        expect(RANKS[i].minPoints).toBeGreaterThan(RANKS[i - 1].minPoints);
      }
    });

    it('first rank starts at 0 points', () => {
      expect(RANKS[0].minPoints).toBe(0);
    });
  });
});
