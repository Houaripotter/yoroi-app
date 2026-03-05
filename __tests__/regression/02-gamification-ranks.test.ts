/**
 * REGRESSION TEST SUITE - Gamification & Ranks
 * Vérifie les systèmes de points, niveaux, rangs samouraï.
 */

import {
  getLevel,
  getNextLevel,
  getLevelProgress,
  calculateTotalPoints,
  LEVELS,
  POINTS_ACTIONS,
} from '@/lib/gamification';

import {
  getCurrentRank,
  getNextRank,
  getDaysToNextRank,
  getAvatarForRank,
  getRankProgress,
  getRankColor,
  RANKS,
} from '@/lib/ranks';

describe('REGRESSION: Gamification System', () => {
  // ============================================
  // LEVELS - Progression
  // ============================================
  describe('levels', () => {
    it('has exactly 5 levels in ascending order', () => {
      expect(LEVELS).toHaveLength(5);
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].pointsRequired).toBeGreaterThan(LEVELS[i - 1].pointsRequired);
      }
    });

    it('first level starts at 0', () => {
      expect(LEVELS[0].pointsRequired).toBe(0);
    });

    it('getLevel returns correct levels at boundaries', () => {
      expect(getLevel(0).name).toBe('Debutant');
      expect(getLevel(99).name).toBe('Debutant');
      expect(getLevel(100).name).toBe('Apprenti');
      expect(getLevel(299).name).toBe('Apprenti');
      expect(getLevel(300).name).toBe('Athlète');
      expect(getLevel(599).name).toBe('Athlète');
      expect(getLevel(600).name).toBe('Champion');
      expect(getLevel(999).name).toBe('Champion');
      expect(getLevel(1000).name).toBe('Legende');
    });

    it('getLevel handles edge cases', () => {
      expect(getLevel(-100).name).toBe('Debutant');
      expect(getLevel(0).name).toBe('Debutant');
      expect(getLevel(999999).name).toBe('Legende');
    });

    it('level objects have required properties', () => {
      const level = getLevel(150);
      expect(level).toHaveProperty('level');
      expect(level).toHaveProperty('name');
      expect(level).toHaveProperty('nameJp');
      expect(level).toHaveProperty('pointsRequired');
      expect(level).toHaveProperty('icon');
      expect(level).toHaveProperty('color');
      expect(level).toHaveProperty('description');
    });
  });

  // ============================================
  // NEXT LEVEL
  // ============================================
  describe('next level', () => {
    it('returns correct next level', () => {
      expect(getNextLevel(0)?.name).toBe('Apprenti');
      expect(getNextLevel(100)?.name).toBe('Athlète');
      expect(getNextLevel(300)?.name).toBe('Champion');
      expect(getNextLevel(600)?.name).toBe('Legende');
    });

    it('returns null at max level', () => {
      expect(getNextLevel(1000)).toBeNull();
      expect(getNextLevel(9999)).toBeNull();
    });
  });

  // ============================================
  // LEVEL PROGRESS
  // ============================================
  describe('level progress', () => {
    it('returns 0% at level start', () => {
      expect(getLevelProgress(0).progress).toBe(0);
    });

    it('returns 100% at max level', () => {
      const result = getLevelProgress(1000);
      expect(result.progress).toBe(100);
      expect(result.pointsToNext).toBe(0);
    });

    it('calculates mid-level progress correctly', () => {
      const result = getLevelProgress(50);
      expect(result.progress).toBe(50);
      expect(result.pointsToNext).toBe(50);
    });

    it('progress is always between 0 and 100', () => {
      for (const pts of [-50, 0, 50, 100, 250, 500, 800, 1000, 5000]) {
        const result = getLevelProgress(pts);
        expect(result.progress).toBeGreaterThanOrEqual(0);
        expect(result.progress).toBeLessThanOrEqual(100);
      }
    });
  });

  // ============================================
  // POINTS CALCULATION
  // ============================================
  describe('points calculation', () => {
    it('returns 0 for no activities', async () => {
      expect(await calculateTotalPoints(0, 0, 0, 0, 0)).toBe(0);
    });

    it('counts weight entries', async () => {
      const total = await calculateTotalPoints(5, 0, 0, 0, 0);
      expect(total).toBe(5 * POINTS_ACTIONS.peser);
    });

    it('counts training entries', async () => {
      const total = await calculateTotalPoints(0, 10, 0, 0, 0);
      expect(total).toBe(10 * POINTS_ACTIONS.entrainement);
    });

    it('counts photo entries', async () => {
      const total = await calculateTotalPoints(0, 0, 3, 0, 0);
      expect(total).toBe(3 * POINTS_ACTIONS.photo);
    });

    it('counts hydration days', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 0, 7);
      expect(total).toBe(7 * POINTS_ACTIONS.hydration_complete);
    });

    it('awards 7-day streak bonus', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 7, 0);
      expect(total).toBe(POINTS_ACTIONS.streak_7);
    });

    it('awards 30-day streak bonus (not 7-day)', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 30, 0);
      expect(total).toBe(POINTS_ACTIONS.streak_30);
    });

    it('awards 100-day streak bonus', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 100, 0);
      expect(total).toBe(POINTS_ACTIONS.streak_100);
    });

    it('does not award streak for < 7 days', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 6, 0);
      expect(total).toBe(0);
    });

    it('combines all activities correctly', async () => {
      const total = await calculateTotalPoints(2, 3, 1, 7, 2);
      const expected =
        2 * POINTS_ACTIONS.peser +
        3 * POINTS_ACTIONS.entrainement +
        1 * POINTS_ACTIONS.photo +
        2 * POINTS_ACTIONS.hydration_complete +
        POINTS_ACTIONS.streak_7;
      expect(total).toBe(expected);
    });
  });
});

describe('REGRESSION: Rank System', () => {
  // ============================================
  // RANKS - Samurai progression
  // ============================================
  describe('ranks structure', () => {
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
      expect(RANKS[0].id).toBe('ashigaru');
    });

    it('each rank has required properties', () => {
      for (const rank of RANKS) {
        expect(rank).toHaveProperty('id');
        expect(rank).toHaveProperty('name');
        expect(rank).toHaveProperty('nameFemale');
        expect(rank).toHaveProperty('nameJp');
        expect(rank).toHaveProperty('icon');
        expect(rank).toHaveProperty('minPoints');
        expect(rank).toHaveProperty('color');
        expect(rank).toHaveProperty('description');
        expect(rank).toHaveProperty('descriptionFemale');
      }
    });
  });

  // ============================================
  // getCurrentRank
  // ============================================
  describe('getCurrentRank', () => {
    it('returns Ashigaru for 0 XP', () => {
      expect(getCurrentRank(0).id).toBe('ashigaru');
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
  });

  // ============================================
  // getNextRank
  // ============================================
  describe('getNextRank', () => {
    it('returns Bushi as next for 0 XP', () => {
      expect(getNextRank(0)?.id).toBe('bushi');
    });

    it('returns Samourai as next for 500 XP', () => {
      expect(getNextRank(500)?.id).toBe('samurai');
    });

    it('returns null at max rank', () => {
      expect(getNextRank(10000)).toBeNull();
      expect(getNextRank(99999)).toBeNull();
    });
  });

  // ============================================
  // getDaysToNextRank
  // ============================================
  describe('getDaysToNextRank', () => {
    it('returns XP to Bushi from 0', () => {
      expect(getDaysToNextRank(0)).toBe(500);
    });

    it('returns XP to Samourai from 1000', () => {
      expect(getDaysToNextRank(1000)).toBe(1000); // 2000 - 1000
    });

    it('returns 0 at max rank', () => {
      expect(getDaysToNextRank(10000)).toBe(0);
    });
  });

  // ============================================
  // getRankProgress
  // ============================================
  describe('getRankProgress', () => {
    it('returns 0 at start of Ashigaru', () => {
      expect(getRankProgress(0)).toBe(0);
    });

    it('returns 100 at max rank', () => {
      expect(getRankProgress(10000)).toBe(100);
    });

    it('returns percentage between 0 and 100', () => {
      for (const xp of [0, 100, 500, 1500, 3000, 7000, 10000]) {
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
    it('returns correct colors for each rank', () => {
      expect(getRankColor('ashigaru')).toBe('#60A5FA');
      expect(getRankColor('bushi')).toBe('#34D399');
      expect(getRankColor('samurai')).toBe('#D4AF37');
      expect(getRankColor('ronin')).toBe('#A855F7');
      expect(getRankColor('shogun')).toBe('#FFD700');
    });

    it('returns fallback for unknown rank', () => {
      expect(getRankColor('unknown_rank')).toBe('#6B7280');
    });
  });

  // ============================================
  // getAvatarForRank
  // ============================================
  describe('getAvatarForRank', () => {
    it('returns null (temporarily disabled)', () => {
      expect(getAvatarForRank('ashigaru')).toBeNull();
      expect(getAvatarForRank('shogun')).toBeNull();
    });
  });
});
