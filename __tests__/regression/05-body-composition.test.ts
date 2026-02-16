/**
 * REGRESSION TEST SUITE - Body Composition
 * Vérifie les calculs de composition corporelle, analyse, et estimations.
 */

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

jest.mock('@/lib/healthConnect', () => ({
  healthConnect: {
    getBodyComposition: jest.fn(() => Promise.resolve(null)),
    writeBodyFat: jest.fn(() => Promise.resolve()),
    initialize: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/lib/security/secureStorage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve(true)),
    removeItem: jest.fn(() => Promise.resolve(true)),
  },
  secureStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve(true)),
    removeItem: jest.fn(() => Promise.resolve(true)),
  },
}));

import {
  analyzeBodyComposition,
  calculateChanges,
  estimateBodyFatFromMeasurements,
  calculateBMR,
  BodyComposition,
  BodyMeasurement,
} from '@/lib/bodyComposition';

describe('REGRESSION: Body Composition Analysis', () => {
  // ============================================
  // analyzeBodyComposition
  // ============================================
  describe('analyzeBodyComposition', () => {
    const baseData: BodyComposition = {
      id: 'bc_1',
      date: '2026-02-10',
      weight: 80,
      bodyFatPercent: 18,
      muscleMass: 35,
      boneMass: 3.2,
      waterPercent: 58,
      visceralFat: 8,
    };

    it('returns healthy status for normal male', () => {
      const analysis = analyzeBodyComposition(baseData, 'male', 30);
      expect(analysis.bodyFatStatus).toBe('healthy');
      expect(analysis.visceralFatStatus).toBe('healthy');
      expect(analysis.overallScore).toBeGreaterThanOrEqual(50);
    });

    it('detects low body fat', () => {
      const data = { ...baseData, bodyFatPercent: 4 };
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.bodyFatStatus).toBe('low');
    });

    it('detects high body fat for male', () => {
      const data = { ...baseData, bodyFatPercent: 28 };
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.bodyFatStatus).toBe('high');
    });

    it('detects very high body fat', () => {
      const data = { ...baseData, bodyFatPercent: 35 };
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.bodyFatStatus).toBe('very_high');
    });

    it('uses different thresholds for female', () => {
      const data = { ...baseData, bodyFatPercent: 28 };
      const maleAnalysis = analyzeBodyComposition(data, 'male', 30);
      const femaleAnalysis = analyzeBodyComposition(data, 'female', 30);
      // 28% is high for male but healthy for female
      expect(maleAnalysis.bodyFatStatus).toBe('high');
      expect(femaleAnalysis.bodyFatStatus).toBe('healthy');
    });

    it('detects low muscle mass', () => {
      const data = { ...baseData, muscleMass: 25 }; // ratio 25/80 = 0.31 < 0.35
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.muscleMassStatus).toBe('low');
    });

    it('detects high muscle mass', () => {
      const data = { ...baseData, muscleMass: 40 }; // ratio 40/80 = 0.50 > 0.45
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.muscleMassStatus).toBe('high');
    });

    it('detects low water percentage for male', () => {
      const data = { ...baseData, waterPercent: 50 };
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.waterStatus).toBe('low');
    });

    it('detects caution visceral fat', () => {
      const data = { ...baseData, visceralFat: 15 };
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.visceralFatStatus).toBe('caution');
    });

    it('detects high visceral fat', () => {
      const data = { ...baseData, visceralFat: 25 };
      const analysis = analyzeBodyComposition(data, 'male', 30);
      expect(analysis.visceralFatStatus).toBe('high');
    });

    it('overall score is bounded 0-100', () => {
      // Very bad data
      const worst = {
        ...baseData,
        bodyFatPercent: 45,
        muscleMass: 20,
        waterPercent: 40,
        visceralFat: 30,
      };
      const analysis = analyzeBodyComposition(worst, 'male', 30);
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
    });

    it('good data has higher score than bad data', () => {
      const good = analyzeBodyComposition(baseData, 'male', 30);
      const bad = analyzeBodyComposition({
        ...baseData,
        bodyFatPercent: 40,
        visceralFat: 25,
        muscleMass: 20,
      }, 'male', 30);
      expect(good.overallScore).toBeGreaterThan(bad.overallScore);
    });
  });

  // ============================================
  // calculateChanges
  // ============================================
  describe('calculateChanges', () => {
    const current: BodyComposition = {
      id: 'bc_2', date: '2026-02-10', weight: 78, bodyFatPercent: 16,
      muscleMass: 36, boneMass: 3.2, waterPercent: 59, visceralFat: 7,
      metabolicAge: 28, bmr: 1800,
    };
    const previous: BodyComposition = {
      id: 'bc_1', date: '2026-01-10', weight: 80, bodyFatPercent: 18,
      muscleMass: 34, boneMass: 3.1, waterPercent: 57, visceralFat: 9,
      metabolicAge: 30, bmr: 1750,
    };

    it('calculates weight change', () => {
      const changes = calculateChanges(current, previous);
      expect(changes.weight).toBe(-2); // 78 - 80
    });

    it('calculates body fat change', () => {
      const changes = calculateChanges(current, previous);
      expect(changes.bodyFatPercent).toBe(-2); // 16 - 18
    });

    it('calculates muscle mass change', () => {
      const changes = calculateChanges(current, previous);
      expect(changes.muscleMass).toBe(2); // 36 - 34
    });

    it('calculates visceral fat change', () => {
      const changes = calculateChanges(current, previous);
      expect(changes.visceralFat).toBe(-2); // 7 - 9
    });

    it('calculates metabolic age change', () => {
      const changes = calculateChanges(current, previous);
      expect(changes.metabolicAge).toBe(-2); // 28 - 30
    });

    it('calculates BMR change', () => {
      const changes = calculateChanges(current, previous);
      expect(changes.bmr).toBe(50); // 1800 - 1750
    });

    it('handles missing optional fields', () => {
      const noOptional: BodyComposition = {
        id: 'bc_3', date: '2026-02-10', weight: 78, bodyFatPercent: 16,
        muscleMass: 36, boneMass: 3.2, waterPercent: 59, visceralFat: 7,
      };
      const changes = calculateChanges(noOptional, previous);
      expect(changes.metabolicAge).toBe(-30); // 0 - 30
      expect(changes.bmr).toBe(-1750); // 0 - 1750
    });
  });

  // ============================================
  // estimateBodyFatFromMeasurements (Navy method)
  // ============================================
  describe('estimateBodyFatFromMeasurements', () => {
    it('estimates male body fat', () => {
      const measurement: BodyMeasurement = {
        id: 'm_1', date: '2026-02-10',
        waist: 85, neck: 38,
      };
      const result = estimateBodyFatFromMeasurements(measurement, 180, 'male');
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(5);
      expect(result!).toBeLessThan(40);
    });

    it('estimates female body fat (requires hips)', () => {
      const measurement: BodyMeasurement = {
        id: 'm_2', date: '2026-02-10',
        waist: 75, neck: 32, hips: 100,
      };
      const result = estimateBodyFatFromMeasurements(measurement, 165, 'female');
      expect(result).not.toBeNull();
      expect(result!).toBeGreaterThan(10);
      expect(result!).toBeLessThan(50);
    });

    it('returns null without waist', () => {
      const measurement: BodyMeasurement = { id: 'm_3', date: '2026-02-10', neck: 38 };
      expect(estimateBodyFatFromMeasurements(measurement, 180, 'male')).toBeNull();
    });

    it('returns null without neck', () => {
      const measurement: BodyMeasurement = { id: 'm_4', date: '2026-02-10', waist: 85 };
      expect(estimateBodyFatFromMeasurements(measurement, 180, 'male')).toBeNull();
    });

    it('returns null for female without hips', () => {
      const measurement: BodyMeasurement = {
        id: 'm_5', date: '2026-02-10',
        waist: 75, neck: 32,
      };
      expect(estimateBodyFatFromMeasurements(measurement, 165, 'female')).toBeNull();
    });

    it('clamps result between 0 and 60', () => {
      const measurement: BodyMeasurement = {
        id: 'm_6', date: '2026-02-10',
        waist: 85, neck: 38,
      };
      const result = estimateBodyFatFromMeasurements(measurement, 180, 'male');
      expect(result!).toBeGreaterThanOrEqual(0);
      expect(result!).toBeLessThanOrEqual(60);
    });
  });

  // ============================================
  // calculateBMR (bodyComposition version)
  // ============================================
  describe('calculateBMR', () => {
    it('calculates male BMR', () => {
      const bmr = calculateBMR(80, 180, 30, 'male');
      expect(bmr).toBe(1780); // 10*80 + 6.25*180 - 5*30 + 5
    });

    it('calculates female BMR', () => {
      const bmr = calculateBMR(60, 165, 25, 'female');
      expect(bmr).toBe(1345); // 10*60 + 6.25*165 - 5*25 - 161
    });

    it('BMR is always positive for reasonable inputs', () => {
      expect(calculateBMR(50, 150, 20, 'male')).toBeGreaterThan(0);
      expect(calculateBMR(50, 150, 20, 'female')).toBeGreaterThan(0);
    });
  });
});
