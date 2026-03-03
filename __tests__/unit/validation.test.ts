import { validate, validateObject, VALIDATION_RULES } from '@/lib/validation';

describe('validation', () => {
  // ============================================
  // validate('weight', ...)
  // ============================================
  describe('validate weight', () => {
    it('accepts valid weight 75', () => {
      const result = validate('weight', 75);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(75);
    });

    it('accepts minimum weight 20', () => {
      expect(validate('weight', 20).valid).toBe(true);
    });

    it('accepts maximum weight 350', () => {
      expect(validate('weight', 350).valid).toBe(true);
    });

    it('rejects weight below minimum', () => {
      expect(validate('weight', 19).valid).toBe(false);
    });

    it('rejects weight above maximum', () => {
      expect(validate('weight', 351).valid).toBe(false);
    });

    it('rejects NaN', () => {
      expect(validate('weight', NaN).valid).toBe(false);
    });

    it('rejects null (required field)', () => {
      expect(validate('weight', null).valid).toBe(false);
    });

    it('rejects undefined (required field)', () => {
      expect(validate('weight', undefined).valid).toBe(false);
    });

    it('rejects empty string (required field)', () => {
      expect(validate('weight', '').valid).toBe(false);
    });

    it('rejects non-numeric string', () => {
      expect(validate('weight', 'abc').valid).toBe(false);
    });

    it('accepts numeric string', () => {
      const result = validate('weight', '75.5');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(75.5);
    });

    it('rejects negative weight', () => {
      expect(validate('weight', -10).valid).toBe(false);
    });

    it('returns error message on failure', () => {
      const result = validate('weight', 500);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  // ============================================
  // validate('email', ...)
  // ============================================
  describe('validate email', () => {
    it('accepts valid email', () => {
      const result = validate('email', 'user@example.com');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('converts to lowercase', () => {
      const result = validate('email', 'User@Example.COM');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('user@example.com');
    });

    it('rejects email without @', () => {
      expect(validate('email', 'userexample.com').valid).toBe(false);
    });

    it('rejects email without domain', () => {
      expect(validate('email', 'user@').valid).toBe(false);
    });

    it('rejects email without TLD', () => {
      expect(validate('email', 'user@example').valid).toBe(false);
    });

    it('rejects email with spaces', () => {
      expect(validate('email', 'user @example.com').valid).toBe(false);
    });

    it('accepts null for optional email field', () => {
      const result = validate('email', null);
      expect(result.valid).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  // ============================================
  // validate('notes', ...) - string + XSS
  // ============================================
  describe('validate notes', () => {
    it('accepts valid notes', () => {
      const result = validate('notes', 'Good training today');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Good training today');
    });

    it('sanitizes HTML tags', () => {
      const result = validate('notes', 'Hello <b>world</b>');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Hello world');
    });

    it('sanitizes script injection', () => {
      const result = validate('notes', '<script>alert(1)</script>');
      expect(result.valid).toBe(true);
      expect(result.value).not.toContain('<script>');
      expect(result.value).not.toContain('alert');
    });

    it('rejects notes exceeding maxLength', () => {
      const longString = 'a'.repeat(1001);
      const result = validate('notes', longString);
      expect(result.valid).toBe(false);
    });

    it('accepts notes at maxLength', () => {
      const maxString = 'a'.repeat(1000);
      const result = validate('notes', maxString);
      expect(result.valid).toBe(true);
    });

    it('accepts null for optional notes', () => {
      const result = validate('notes', null);
      expect(result.valid).toBe(true);
    });

    it('accepts emojis in notes', () => {
      const result = validate('notes', 'Great workout! 💪🔥');
      expect(result.valid).toBe(true);
    });

    it('trims whitespace', () => {
      const result = validate('notes', '  hello  ');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('hello');
    });
  });

  // ============================================
  // validate unknown field
  // ============================================
  describe('validate unknown field', () => {
    it('accepts any value for unknown field', () => {
      const result = validate('nonexistent_field', 'anything');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('anything');
    });
  });

  // ============================================
  // validate number fields (various)
  // ============================================
  describe('validate other number fields', () => {
    it('validates bodyFat range (2-60)', () => {
      expect(validate('bodyFat', 15).valid).toBe(true);
      expect(validate('bodyFat', 1).valid).toBe(false);
      expect(validate('bodyFat', 61).valid).toBe(false);
    });

    it('validates age range (10-120)', () => {
      expect(validate('age', 25).valid).toBe(true);
      expect(validate('age', 9).valid).toBe(false);
      expect(validate('age', 121).valid).toBe(false);
    });

    it('validates duration range (1-600)', () => {
      expect(validate('duration', 60).valid).toBe(true);
      expect(validate('duration', 0).valid).toBe(false);
      expect(validate('duration', 601).valid).toBe(false);
    });

    it('validates rpe range (1-10)', () => {
      expect(validate('rpe', 7).valid).toBe(true);
      expect(validate('rpe', 0).valid).toBe(false);
      expect(validate('rpe', 11).valid).toBe(false);
    });

    it('validates sleepHours range (0-24)', () => {
      expect(validate('sleepHours', 8).valid).toBe(true);
      expect(validate('sleepHours', -1).valid).toBe(false);
      expect(validate('sleepHours', 25).valid).toBe(false);
    });
  });

  // ============================================
  // validateObject
  // ============================================
  describe('validateObject', () => {
    it('validates a complete valid object', () => {
      const result = validateObject({
        weight: 75,
        notes: 'Good day',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.sanitized).toBeDefined();
    });

    it('returns errors for invalid fields', () => {
      const result = validateObject({
        weight: 500, // too high
        age: 5,       // too low
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('weight');
      expect(result.errors).toHaveProperty('age');
    });

    it('returns partial errors (some valid, some invalid)', () => {
      const result = validateObject({
        weight: 75,   // valid
        age: 5,       // invalid
      });
      expect(result.valid).toBe(false);
      expect(result.errors).not.toHaveProperty('weight');
      expect(result.errors).toHaveProperty('age');
      expect(result.sanitized).toBeUndefined();
    });

    it('sanitizes HTML in string fields', () => {
      const result = validateObject({
        notes: '<b>Bold</b> text',
      });
      expect(result.valid).toBe(true);
      expect(result.sanitized!.notes).toBe('Bold text');
    });

    it('handles empty object', () => {
      const result = validateObject({});
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('handles unknown fields passthrough', () => {
      const result = validateObject({
        custom_field: 'value',
      });
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // validate name (string with minLength)
  // ============================================
  describe('validate name', () => {
    it('accepts valid name', () => {
      const result = validate('name', 'Houari');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Houari');
    });

    it('rejects name exceeding maxLength', () => {
      const longName = 'a'.repeat(51);
      expect(validate('name', longName).valid).toBe(false);
    });

    it('accepts null for optional name', () => {
      expect(validate('name', null).valid).toBe(true);
    });
  });

  // ============================================
  // validate date type (used by custom rules)
  // ============================================
  describe('validate date type', () => {
    it('accepts valid ISO date string', () => {
      // Use a custom rule with date type to test validateDate
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      // Temporarily add a date rule
      rules['test_date'] = { type: 'date', required: true };
      const result = validateFn('test_date', '2026-01-15');
      expect(result.valid).toBe(true);
      expect(result.value).toContain('2026-01-15');
      delete rules['test_date'];
    });

    it('rejects invalid date string', () => {
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      rules['test_date'] = { type: 'date', required: true };
      const result = validateFn('test_date', 'not-a-date');
      expect(result.valid).toBe(false);
      delete rules['test_date'];
    });

    it('rejects impossible date', () => {
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      rules['test_date'] = { type: 'date', required: true };
      const result = validateFn('test_date', '9999-99-99');
      expect(result.valid).toBe(false);
      delete rules['test_date'];
    });
  });

  // ============================================
  // validate with customValidator
  // ============================================
  describe('validate with customValidator', () => {
    it('passes when customValidator returns true', () => {
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      rules['test_custom'] = {
        type: 'number',
        min: 0,
        max: 100,
        customValidator: (v: number) => v % 2 === 0,
      };
      expect(validateFn('test_custom', 4).valid).toBe(true);
      delete rules['test_custom'];
    });

    it('fails when customValidator returns false', () => {
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      rules['test_custom'] = {
        type: 'number',
        min: 0,
        max: 100,
        customValidator: (v: number) => v % 2 === 0,
      };
      expect(validateFn('test_custom', 3).valid).toBe(false);
      delete rules['test_custom'];
    });
  });

  // ============================================
  // validate with pattern
  // ============================================
  describe('validate with pattern', () => {
    it('fails when pattern does not match', () => {
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      rules['test_pattern'] = {
        type: 'string',
        pattern: /^[A-Z]+$/,
      };
      expect(validateFn('test_pattern', 'lowercase').valid).toBe(false);
      delete rules['test_pattern'];
    });

    it('passes when pattern matches', () => {
      const { validate: validateFn, VALIDATION_RULES: rules } = require('@/lib/validation');
      rules['test_pattern'] = {
        type: 'string',
        pattern: /^[A-Z]+$/,
      };
      expect(validateFn('test_pattern', 'UPPERCASE').valid).toBe(true);
      delete rules['test_pattern'];
    });
  });

  // ============================================
  // Edge cases
  // ============================================
  describe('edge cases', () => {
    it('handles Number.MAX_SAFE_INTEGER', () => {
      const result = validate('weight', Number.MAX_SAFE_INTEGER);
      expect(result.valid).toBe(false);
    });

    it('handles Infinity', () => {
      const result = validate('weight', Infinity);
      expect(result.valid).toBe(false);
    });

    it('handles boolean as value', () => {
      const result = validate('weight', true);
      expect(result.valid).toBe(false);
    });

    it('validates height_cm correctly', () => {
      expect(validate('height_cm', 175).valid).toBe(true);
      expect(validate('height_cm', 300).valid).toBe(false);
    });

    it('validates eva_score range', () => {
      expect(validate('eva_score', 5).valid).toBe(true);
      expect(validate('eva_score', -1).valid).toBe(false);
      expect(validate('eva_score', 11).valid).toBe(false);
    });
  });
});
