import {
  getLevel,
  getNextLevel,
  getLevelProgress,
  calculateTotalPoints,
  LEVELS,
  POINTS_ACTIONS,
} from '@/lib/gamification';

describe('gamification', () => {
  // ============================================
  // getLevel
  // ============================================
  describe('getLevel', () => {
    it('returns Debutant for 0 points', () => {
      expect(getLevel(0).name).toBe('Debutant');
    });

    it('returns Debutant for 99 points', () => {
      expect(getLevel(99).name).toBe('Debutant');
    });

    it('returns Apprenti for 100 points', () => {
      expect(getLevel(100).name).toBe('Apprenti');
    });

    it('returns Athlète for 300 points', () => {
      expect(getLevel(300).name).toBe('Athlète');
    });

    it('returns Champion for 600 points', () => {
      expect(getLevel(600).name).toBe('Champion');
    });

    it('returns Legende for 1000 points', () => {
      expect(getLevel(1000).name).toBe('Legende');
    });

    it('returns Legende for points above 1000', () => {
      expect(getLevel(5000).name).toBe('Legende');
    });

    it('returns Debutant for negative points', () => {
      expect(getLevel(-10).name).toBe('Debutant');
    });

    it('returns correct level object structure', () => {
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
  // getNextLevel
  // ============================================
  describe('getNextLevel', () => {
    it('returns Apprenti as next level for 0 points', () => {
      const next = getNextLevel(0);
      expect(next).not.toBeNull();
      expect(next!.name).toBe('Apprenti');
    });

    it('returns Athlète as next level for 100 points', () => {
      const next = getNextLevel(100);
      expect(next).not.toBeNull();
      expect(next!.name).toBe('Athlète');
    });

    it('returns Champion as next level for 300 points', () => {
      const next = getNextLevel(300);
      expect(next).not.toBeNull();
      expect(next!.name).toBe('Champion');
    });

    it('returns Legende as next level for 600 points', () => {
      const next = getNextLevel(600);
      expect(next).not.toBeNull();
      expect(next!.name).toBe('Legende');
    });

    it('returns null at max level (1000+ points)', () => {
      expect(getNextLevel(1000)).toBeNull();
      expect(getNextLevel(9999)).toBeNull();
    });

    it('returns Apprenti for negative points', () => {
      const next = getNextLevel(-5);
      expect(next).not.toBeNull();
      expect(next!.name).toBe('Apprenti');
    });
  });

  // ============================================
  // getLevelProgress
  // ============================================
  describe('getLevelProgress', () => {
    it('returns 0% progress at start of a level', () => {
      const result = getLevelProgress(0);
      expect(result.progress).toBe(0);
    });

    it('returns 50% progress midway through level 1', () => {
      // Level 1: 0-100, midpoint = 50
      const result = getLevelProgress(50);
      expect(result.progress).toBe(50);
    });

    it('returns 100% progress at max level', () => {
      const result = getLevelProgress(1000);
      expect(result.progress).toBe(100);
      expect(result.pointsToNext).toBe(0);
    });

    it('returns 100% progress well above max', () => {
      const result = getLevelProgress(5000);
      expect(result.progress).toBe(100);
    });

    it('calculates pointsToNext correctly', () => {
      // At 50 points, next level is 100, so 50 points to next
      const result = getLevelProgress(50);
      expect(result.pointsToNext).toBe(50);
    });

    it('progress is bounded between 0 and 100', () => {
      const result = getLevelProgress(-100);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
    });

    it('returns correct currentLevelPoints and nextLevelPoints', () => {
      const result = getLevelProgress(150);
      expect(result.currentLevelPoints).toBe(100); // Apprenti starts at 100
      expect(result.nextLevelPoints).toBe(300);     // Athlète starts at 300
    });
  });

  // ============================================
  // calculateTotalPoints
  // ============================================
  describe('calculateTotalPoints', () => {
    it('returns 0 for no activities', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 0, 0);
      expect(total).toBe(0);
    });

    it('calculates weight entries correctly', async () => {
      const total = await calculateTotalPoints(10, 0, 0, 0, 0);
      expect(total).toBe(10 * POINTS_ACTIONS.peser);
    });

    it('calculates training entries correctly', async () => {
      const total = await calculateTotalPoints(0, 5, 0, 0, 0);
      expect(total).toBe(5 * POINTS_ACTIONS.entrainement);
    });

    it('calculates photo entries correctly', async () => {
      const total = await calculateTotalPoints(0, 0, 3, 0, 0);
      expect(total).toBe(3 * POINTS_ACTIONS.photo);
    });

    it('calculates hydration days correctly', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 0, 5);
      expect(total).toBe(5 * POINTS_ACTIONS.hydration_complete);
    });

    it('adds 7-day streak bonus', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 7, 0);
      expect(total).toBe(POINTS_ACTIONS.streak_7);
    });

    it('adds 30-day streak bonus (not 7-day)', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 30, 0);
      expect(total).toBe(POINTS_ACTIONS.streak_30);
    });

    it('adds 100-day streak bonus (not 30-day)', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 100, 0);
      expect(total).toBe(POINTS_ACTIONS.streak_100);
    });

    it('does not add streak bonus for streak < 7', async () => {
      const total = await calculateTotalPoints(0, 0, 0, 6, 0);
      expect(total).toBe(0);
    });

    it('calculates combined activities correctly', async () => {
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

  // ============================================
  // LEVELS constant
  // ============================================
  describe('LEVELS', () => {
    it('has 5 levels', () => {
      expect(LEVELS).toHaveLength(5);
    });

    it('levels are ordered by pointsRequired', () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].pointsRequired).toBeGreaterThan(LEVELS[i - 1].pointsRequired);
      }
    });

    it('first level starts at 0 points', () => {
      expect(LEVELS[0].pointsRequired).toBe(0);
    });
  });
});
