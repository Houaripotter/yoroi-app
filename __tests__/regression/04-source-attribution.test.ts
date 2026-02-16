/**
 * REGRESSION TEST SUITE - Source Attribution (NEW FEATURE)
 * Vérifie le système d'attribution des sources de données santé
 * (Withings, Garmin, Polar, Whoop, etc.)
 */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { appOwnership: 'expo' },
}));

jest.mock('@kingstinct/react-native-healthkit', () => ({
  __esModule: true,
  default: null,
}));

jest.mock('@/lib/security/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: l, logger: l };
});

import {
  SOURCE_NAME_MAP,
  normalizeSourceName,
  SOURCE_PRIORITY,
} from '@/lib/healthConnect.ios';

describe('REGRESSION: Source Attribution System', () => {
  // ============================================
  // SOURCE_NAME_MAP completeness
  // ============================================
  describe('SOURCE_NAME_MAP', () => {
    it('maps Withings sources', () => {
      expect(SOURCE_NAME_MAP['Health Mate']).toBe('withings');
      expect(SOURCE_NAME_MAP['Withings']).toBe('withings');
    });

    it('maps Garmin sources', () => {
      expect(SOURCE_NAME_MAP['Garmin Connect']).toBe('garmin');
      expect(SOURCE_NAME_MAP['com.garmin.android.apps.connectmobile']).toBe('garmin');
    });

    it('maps Polar sources', () => {
      expect(SOURCE_NAME_MAP['Polar Flow']).toBe('polar');
      expect(SOURCE_NAME_MAP['com.polar.polarflow']).toBe('polar');
    });

    it('maps Whoop sources', () => {
      expect(SOURCE_NAME_MAP['WHOOP']).toBe('whoop');
      expect(SOURCE_NAME_MAP['com.whoop.android']).toBe('whoop');
    });

    it('maps Apple sources', () => {
      expect(SOURCE_NAME_MAP['Apple Watch']).toBe('apple_watch');
      expect(SOURCE_NAME_MAP['iPhone']).toBe('iphone');
    });

    it('maps Samsung sources', () => {
      expect(SOURCE_NAME_MAP['Samsung Health']).toBe('samsung');
    });

    it('maps Fitbit sources', () => {
      expect(SOURCE_NAME_MAP['Fitbit']).toBe('fitbit');
    });

    it('maps Xiaomi sources', () => {
      expect(SOURCE_NAME_MAP['Mi Fitness']).toBe('xiaomi');
      expect(SOURCE_NAME_MAP['Zepp Life']).toBe('xiaomi');
    });

    it('maps scale brands', () => {
      expect(SOURCE_NAME_MAP['Renpho']).toBe('renpho');
      expect(SOURCE_NAME_MAP['RENPHO']).toBe('renpho');
      expect(SOURCE_NAME_MAP['EufyLife']).toBe('eufy');
      expect(SOURCE_NAME_MAP['OMRON connect']).toBe('omron');
    });

    it('maps Yoroi as manual', () => {
      expect(SOURCE_NAME_MAP['Yoroi']).toBe('manual');
      expect(SOURCE_NAME_MAP['YOROI']).toBe('manual');
    });
  });

  // ============================================
  // normalizeSourceName
  // ============================================
  describe('normalizeSourceName', () => {
    it('normalizes exact matches', () => {
      expect(normalizeSourceName('Health Mate')).toBe('withings');
      expect(normalizeSourceName('Garmin Connect')).toBe('garmin');
      expect(normalizeSourceName('Polar Flow')).toBe('polar');
      expect(normalizeSourceName('WHOOP')).toBe('whoop');
    });

    it('normalizes partial matches (case-insensitive)', () => {
      expect(normalizeSourceName('Withings Health Mate App')).toBe('withings');
      expect(normalizeSourceName('garmin connect mobile')).toBe('garmin');
      expect(normalizeSourceName('My Fitbit App')).toBe('fitbit');
    });

    it('normalizes Apple Watch variants', () => {
      expect(normalizeSourceName('Apple Watch')).toBe('apple_watch');
      expect(normalizeSourceName("Houari's Apple Watch")).toBe('apple_watch');
      expect(normalizeSourceName('My Watch Series 8')).toBe('apple_watch');
    });

    it('normalizes iPhone variants', () => {
      expect(normalizeSourceName('iPhone')).toBe('iphone');
      expect(normalizeSourceName("Houari's iPhone 15")).toBe('iphone');
    });

    it('returns unknown for empty/null', () => {
      expect(normalizeSourceName('')).toBe('unknown');
    });

    it('returns raw source for truly unknown sources', () => {
      expect(normalizeSourceName('SomeRandomApp')).toBe('SomeRandomApp');
    });

    it('does not crash on special characters', () => {
      expect(() => normalizeSourceName('App™ v2.0')).not.toThrow();
      expect(() => normalizeSourceName('日本語アプリ')).not.toThrow();
    });
  });

  // ============================================
  // SOURCE_PRIORITY
  // ============================================
  describe('SOURCE_PRIORITY', () => {
    it('Withings has highest priority', () => {
      expect(SOURCE_PRIORITY['withings']).toBe(10);
    });

    it('dedicated devices > wearables > phones > manual', () => {
      expect(SOURCE_PRIORITY['withings']).toBeGreaterThan(SOURCE_PRIORITY['apple_watch']);
      expect(SOURCE_PRIORITY['apple_watch']).toBeGreaterThan(SOURCE_PRIORITY['iphone']);
      expect(SOURCE_PRIORITY['iphone']).toBeGreaterThan(SOURCE_PRIORITY['manual']);
      expect(SOURCE_PRIORITY['manual']).toBeGreaterThan(SOURCE_PRIORITY['apple_health']);
    });

    it('all supported brands have a priority', () => {
      const brands = ['withings', 'garmin', 'polar', 'whoop', 'apple_watch',
                      'samsung', 'fitbit', 'xiaomi', 'renpho', 'eufy', 'omron',
                      'iphone', 'manual', 'apple_health', 'unknown'];
      for (const brand of brands) {
        expect(SOURCE_PRIORITY[brand]).toBeDefined();
        expect(typeof SOURCE_PRIORITY[brand]).toBe('number');
      }
    });

    it('sports wearables are equal priority', () => {
      expect(SOURCE_PRIORITY['garmin']).toBe(SOURCE_PRIORITY['polar']);
      expect(SOURCE_PRIORITY['polar']).toBe(SOURCE_PRIORITY['whoop']);
    });

    it('scale brands are equal priority', () => {
      expect(SOURCE_PRIORITY['renpho']).toBe(SOURCE_PRIORITY['eufy']);
      expect(SOURCE_PRIORITY['eufy']).toBe(SOURCE_PRIORITY['omron']);
    });

    it('unknown has lowest priority (0)', () => {
      expect(SOURCE_PRIORITY['unknown']).toBe(0);
    });
  });

  // ============================================
  // Integration: source flow
  // ============================================
  describe('source flow integration', () => {
    it('normalizes and gets priority for common devices', () => {
      const devices = [
        { raw: 'Health Mate', expected: 'withings', priority: 10 },
        { raw: 'Garmin Connect', expected: 'garmin', priority: 9 },
        { raw: 'Apple Watch', expected: 'apple_watch', priority: 8 },
        { raw: 'iPhone', expected: 'iphone', priority: 5 },
        { raw: 'Yoroi', expected: 'manual', priority: 3 },
      ];

      for (const device of devices) {
        const normalized = normalizeSourceName(device.raw);
        expect(normalized).toBe(device.expected);
        expect(SOURCE_PRIORITY[normalized]).toBe(device.priority);
      }
    });

    it('selects highest priority source when multiple exist', () => {
      const sources = ['apple_health', 'iphone', 'withings', 'garmin'];
      const best = sources.reduce((a, b) =>
        (SOURCE_PRIORITY[a] || 0) > (SOURCE_PRIORITY[b] || 0) ? a : b
      );
      expect(best).toBe('withings');
    });
  });
});
