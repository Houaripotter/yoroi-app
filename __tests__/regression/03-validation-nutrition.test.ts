/**
 * REGRESSION TEST SUITE - Validation & Nutrition
 * Vérifie les règles de validation des données et les calculs nutritionnels.
 */

import { validate, validateObject, VALIDATION_RULES } from '@/lib/validation';
import {
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
  getProteinRecommendation,
  calculateNutritionPlan,
  getMealCalories,
  ACTIVITY_LEVELS,
  GOALS,
  MACRO_PROFILES,
  MEAL_DISTRIBUTION,
} from '@/lib/nutrition';

describe('REGRESSION: Validation System', () => {
  // ============================================
  // WEIGHT VALIDATION
  // ============================================
  describe('weight validation', () => {
    it('accepts valid weights', () => {
      expect(validate('weight', 75).valid).toBe(true);
      expect(validate('weight', 20).valid).toBe(true);
      expect(validate('weight', 350).valid).toBe(true);
      expect(validate('weight', '80.5').valid).toBe(true);
    });

    it('rejects invalid weights', () => {
      expect(validate('weight', 19).valid).toBe(false);
      expect(validate('weight', 351).valid).toBe(false);
      expect(validate('weight', NaN).valid).toBe(false);
      expect(validate('weight', null).valid).toBe(false);
      expect(validate('weight', undefined).valid).toBe(false);
      expect(validate('weight', '').valid).toBe(false);
      expect(validate('weight', 'abc').valid).toBe(false);
      expect(validate('weight', -10).valid).toBe(false);
      expect(validate('weight', Infinity).valid).toBe(false);
    });

    it('returns error message on invalid', () => {
      const result = validate('weight', 500);
      expect(result.valid).toBe(false);
      expect(typeof result.error).toBe('string');
    });
  });

  // ============================================
  // NUMBER FIELD VALIDATIONS
  // ============================================
  describe('number field validations', () => {
    it('validates bodyFat (2-60)', () => {
      expect(validate('bodyFat', 15).valid).toBe(true);
      expect(validate('bodyFat', 1).valid).toBe(false);
      expect(validate('bodyFat', 61).valid).toBe(false);
    });

    it('validates age (10-120)', () => {
      expect(validate('age', 25).valid).toBe(true);
      expect(validate('age', 9).valid).toBe(false);
      expect(validate('age', 121).valid).toBe(false);
    });

    it('validates duration (1-600)', () => {
      expect(validate('duration', 60).valid).toBe(true);
      expect(validate('duration', 0).valid).toBe(false);
      expect(validate('duration', 601).valid).toBe(false);
    });

    it('validates rpe (1-10)', () => {
      expect(validate('rpe', 7).valid).toBe(true);
      expect(validate('rpe', 0).valid).toBe(false);
      expect(validate('rpe', 11).valid).toBe(false);
    });

    it('validates sleepHours (0-24)', () => {
      expect(validate('sleepHours', 8).valid).toBe(true);
      expect(validate('sleepHours', -1).valid).toBe(false);
      expect(validate('sleepHours', 25).valid).toBe(false);
    });

    it('validates height_cm', () => {
      expect(validate('height_cm', 175).valid).toBe(true);
      expect(validate('height_cm', 300).valid).toBe(false);
    });

    it('validates eva_score', () => {
      expect(validate('eva_score', 5).valid).toBe(true);
      expect(validate('eva_score', -1).valid).toBe(false);
      expect(validate('eva_score', 11).valid).toBe(false);
    });
  });

  // ============================================
  // STRING/EMAIL VALIDATION
  // ============================================
  describe('string validations', () => {
    it('validates email', () => {
      expect(validate('email', 'user@example.com').valid).toBe(true);
      expect(validate('email', 'User@Example.COM').value).toBe('user@example.com');
      expect(validate('email', 'userexample.com').valid).toBe(false);
      expect(validate('email', 'user@').valid).toBe(false);
      expect(validate('email', null).valid).toBe(true); // optional
    });

    it('validates and sanitizes notes', () => {
      const result = validate('notes', '<script>alert(1)</script>');
      expect(result.valid).toBe(true);
      expect(result.value).not.toContain('<script>');
      expect(result.value).not.toContain('alert');
    });

    it('trims whitespace in notes', () => {
      const result = validate('notes', '  hello  ');
      expect(result.value).toBe('hello');
    });

    it('rejects notes exceeding maxLength', () => {
      expect(validate('notes', 'a'.repeat(1001)).valid).toBe(false);
      expect(validate('notes', 'a'.repeat(1000)).valid).toBe(true);
    });

    it('accepts emojis in notes', () => {
      expect(validate('notes', 'Great! 💪🔥').valid).toBe(true);
    });

    it('validates name', () => {
      expect(validate('name', 'Houari').valid).toBe(true);
      expect(validate('name', 'a'.repeat(51)).valid).toBe(false);
    });
  });

  // ============================================
  // OBJECT VALIDATION
  // ============================================
  describe('validateObject', () => {
    it('validates complete valid object', () => {
      const result = validateObject({ weight: 75, notes: 'Good day' });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('reports multiple errors', () => {
      const result = validateObject({ weight: 500, age: 5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty('weight');
      expect(result.errors).toHaveProperty('age');
    });

    it('sanitizes HTML in string fields', () => {
      const result = validateObject({ notes: '<b>Bold</b> text' });
      expect(result.valid).toBe(true);
      expect(result.sanitized!.notes).toBe('Bold text');
    });

    it('handles empty object', () => {
      expect(validateObject({}).valid).toBe(true);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('edge cases', () => {
    it('handles MAX_SAFE_INTEGER', () => {
      expect(validate('weight', Number.MAX_SAFE_INTEGER).valid).toBe(false);
    });

    it('handles boolean as value', () => {
      expect(validate('weight', true).valid).toBe(false);
    });

    it('passes unknown fields through', () => {
      expect(validate('custom_field', 'anything').valid).toBe(true);
    });
  });
});

describe('REGRESSION: Nutrition Calculations', () => {
  // ============================================
  // BMR (Mifflin-St Jeor)
  // ============================================
  describe('BMR calculation', () => {
    it('calculates male BMR correctly', () => {
      // 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
      const bmr = calculateBMR(80, 180, 30, 'male');
      expect(bmr).toBe(1780);
    });

    it('calculates female BMR correctly', () => {
      // 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345
      const bmr = calculateBMR(60, 165, 25, 'female');
      expect(bmr).toBe(1345);
    });

    it('male BMR > female BMR for same params', () => {
      const male = calculateBMR(70, 170, 30, 'male');
      const female = calculateBMR(70, 170, 30, 'female');
      expect(male).toBeGreaterThan(female);
    });

    it('BMR decreases with age', () => {
      const young = calculateBMR(75, 175, 25, 'male');
      const old = calculateBMR(75, 175, 50, 'male');
      expect(young).toBeGreaterThan(old);
    });

    it('BMR increases with weight', () => {
      const light = calculateBMR(60, 175, 30, 'male');
      const heavy = calculateBMR(90, 175, 30, 'male');
      expect(heavy).toBeGreaterThan(light);
    });
  });

  // ============================================
  // TDEE
  // ============================================
  describe('TDEE calculation', () => {
    it('TDEE increases with activity level', () => {
      const bmr = 1700;
      const sedentary = calculateTDEE(bmr, 'sedentary');
      const active = calculateTDEE(bmr, 'active');
      const extreme = calculateTDEE(bmr, 'extreme');

      expect(sedentary).toBeLessThan(active);
      expect(active).toBeLessThan(extreme);
    });

    it('falls back to sedentary for unknown level', () => {
      const bmr = 1700;
      const result = calculateTDEE(bmr, 'unknown_level');
      expect(result).toBe(Math.round(bmr * 1.2));
    });

    it('TDEE is always > BMR', () => {
      const bmr = 1700;
      for (const level of ACTIVITY_LEVELS) {
        expect(calculateTDEE(bmr, level.id)).toBeGreaterThan(bmr);
      }
    });
  });

  // ============================================
  // GOAL CALORIES
  // ============================================
  describe('goal calories', () => {
    it('maintain goal equals TDEE', () => {
      const tdee = 2200;
      expect(calculateGoalCalories(tdee, 'maintain')).toBe(tdee);
    });

    it('loss goals are below TDEE', () => {
      const tdee = 2200;
      expect(calculateGoalCalories(tdee, 'moderate_loss')).toBeLessThan(tdee);
      expect(calculateGoalCalories(tdee, 'aggressive_loss')).toBeLessThan(tdee);
    });

    it('gain goals are above TDEE', () => {
      const tdee = 2200;
      expect(calculateGoalCalories(tdee, 'slow_gain')).toBeGreaterThan(tdee);
      expect(calculateGoalCalories(tdee, 'moderate_gain')).toBeGreaterThan(tdee);
    });

    it('never goes below 1200 kcal minimum', () => {
      const result = calculateGoalCalories(1000, 'aggressive_loss');
      expect(result).toBeGreaterThanOrEqual(1200);
    });
  });

  // ============================================
  // MACROS
  // ============================================
  describe('macro calculation', () => {
    it('macros sum to ~100%', () => {
      const result = calculateMacros(2000, 'balanced');
      const total = result.protein.percentage + result.carbs.percentage + result.fat.percentage;
      expect(total).toBe(100);
    });

    it('calculates grams correctly for balanced profile', () => {
      const result = calculateMacros(2000, 'balanced');
      // Protein: 30% of 2000 = 600 cal / 4 = 150g
      expect(result.protein.grams).toBe(150);
      // Carbs: 40% of 2000 = 800 cal / 4 = 200g
      expect(result.carbs.grams).toBe(200);
      // Fat: 30% of 2000 = 600 cal / 9 = 67g
      expect(result.fat.grams).toBe(67);
    });

    it('falls back to balanced for unknown profile', () => {
      const result = calculateMacros(2000, 'nonexistent');
      expect(result.protein.percentage).toBe(30);
    });

    it('all macro profiles sum to ~100%', () => {
      for (const profile of MACRO_PROFILES) {
        const result = calculateMacros(2000, profile.id);
        const total = result.protein.percentage + result.carbs.percentage + result.fat.percentage;
        expect(total).toBe(100);
      }
    });
  });

  // ============================================
  // PROTEIN RECOMMENDATION
  // ============================================
  describe('protein recommendation', () => {
    it('returns min < optimal < max', () => {
      const rec = getProteinRecommendation(80, 'maintain', 'moderate');
      expect(rec.min).toBeLessThan(rec.optimal);
      expect(rec.optimal).toBeLessThan(rec.max);
    });

    it('increases protein for loss goals', () => {
      const maintain = getProteinRecommendation(80, 'maintain', 'moderate');
      const loss = getProteinRecommendation(80, 'moderate_loss', 'moderate');
      expect(loss.min).toBeGreaterThan(maintain.min);
    });

    it('scales with body weight', () => {
      const light = getProteinRecommendation(60, 'maintain', 'moderate');
      const heavy = getProteinRecommendation(100, 'maintain', 'moderate');
      expect(heavy.optimal).toBeGreaterThan(light.optimal);
    });
  });

  // ============================================
  // FULL NUTRITION PLAN
  // ============================================
  describe('nutrition plan', () => {
    it('calculates a complete plan', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'maintain', 'balanced');
      expect(plan).toHaveProperty('bmr');
      expect(plan).toHaveProperty('tdee');
      expect(plan).toHaveProperty('goalCalories');
      expect(plan).toHaveProperty('macros');
      expect(plan).toHaveProperty('proteinRec');
      expect(plan).toHaveProperty('deficit');

      expect(plan.bmr).toBeGreaterThan(0);
      expect(plan.tdee).toBeGreaterThan(plan.bmr);
      expect(plan.goalCalories).toBe(plan.tdee); // maintain = tdee
      expect(plan.deficit).toBe(0); // maintain
    });

    it('plan for loss has positive deficit', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'moderate_loss', 'balanced');
      expect(plan.deficit).toBeGreaterThan(0);
      expect(plan.goalCalories).toBeLessThan(plan.tdee);
    });

    it('plan for gain has negative deficit', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'moderate_gain', 'balanced');
      expect(plan.deficit).toBeLessThan(0);
      expect(plan.goalCalories).toBeGreaterThan(plan.tdee);
    });
  });

  // ============================================
  // MEAL DISTRIBUTION
  // ============================================
  describe('meal distribution', () => {
    it('has 4 meals', () => {
      expect(MEAL_DISTRIBUTION).toHaveLength(4);
    });

    it('meal percentages sum to 100%', () => {
      const total = MEAL_DISTRIBUTION.reduce((sum, meal) => sum + meal.percentage, 0);
      expect(total).toBe(1.0);
    });

    it('getMealCalories distributes correctly', () => {
      const meals = getMealCalories(2000);
      expect(meals).toHaveLength(4);
      const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
      expect(totalCal).toBe(2000);
    });
  });

  // ============================================
  // CONSTANTS INTEGRITY
  // ============================================
  describe('constants integrity', () => {
    it('activity levels have 5 entries', () => {
      expect(ACTIVITY_LEVELS).toHaveLength(5);
    });

    it('activity multipliers are increasing', () => {
      for (let i = 1; i < ACTIVITY_LEVELS.length; i++) {
        expect(ACTIVITY_LEVELS[i].multiplier).toBeGreaterThan(ACTIVITY_LEVELS[i - 1].multiplier);
      }
    });

    it('goals include loss, maintain, and gain', () => {
      const ids = GOALS.map(g => g.id);
      expect(ids).toContain('maintain');
      expect(ids.some(id => id.includes('loss'))).toBe(true);
      expect(ids.some(id => id.includes('gain'))).toBe(true);
    });

    it('macro profiles all sum to 100%', () => {
      for (const p of MACRO_PROFILES) {
        const total = Math.round((p.protein + p.carbs + p.fat) * 100);
        expect(total).toBe(100);
      }
    });
  });
});
