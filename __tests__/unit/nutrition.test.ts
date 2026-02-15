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

describe('nutrition', () => {
  // ============================================
  // calculateBMR - Mifflin-St Jeor
  // ============================================
  describe('calculateBMR', () => {
    it('calculates BMR for a male (80kg, 180cm, 30yo)', () => {
      // Formula: (10 * 80) + (6.25 * 180) - (5 * 30) + 5 = 800 + 1125 - 150 + 5 = 1780
      expect(calculateBMR(80, 180, 30, 'male')).toBe(1780);
    });

    it('calculates BMR for a female (60kg, 165cm, 25yo)', () => {
      // Formula: (10 * 60) + (6.25 * 165) - (5 * 25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 → 1345
      expect(calculateBMR(60, 165, 25, 'female')).toBe(1345);
    });

    it('male BMR is higher than female for same stats', () => {
      const maleBMR = calculateBMR(70, 175, 30, 'male');
      const femaleBMR = calculateBMR(70, 175, 30, 'female');
      // Difference should be 5 - (-161) = 166
      expect(maleBMR - femaleBMR).toBe(166);
    });

    it('returns a rounded integer', () => {
      const bmr = calculateBMR(75, 170, 28, 'male');
      expect(Number.isInteger(bmr)).toBe(true);
    });

    it('increases with weight', () => {
      const bmr60 = calculateBMR(60, 175, 30, 'male');
      const bmr80 = calculateBMR(80, 175, 30, 'male');
      expect(bmr80).toBeGreaterThan(bmr60);
    });

    it('decreases with age', () => {
      const bmr20 = calculateBMR(70, 175, 20, 'male');
      const bmr40 = calculateBMR(70, 175, 40, 'male');
      expect(bmr20).toBeGreaterThan(bmr40);
    });
  });

  // ============================================
  // calculateTDEE
  // ============================================
  describe('calculateTDEE', () => {
    const baseBMR = 1780;

    it('applies sedentary multiplier (1.2)', () => {
      expect(calculateTDEE(baseBMR, 'sedentary')).toBe(Math.round(baseBMR * 1.2));
    });

    it('applies light multiplier (1.375)', () => {
      expect(calculateTDEE(baseBMR, 'light')).toBe(Math.round(baseBMR * 1.375));
    });

    it('applies moderate multiplier (1.55)', () => {
      expect(calculateTDEE(baseBMR, 'moderate')).toBe(Math.round(baseBMR * 1.55));
    });

    it('applies active multiplier (1.725)', () => {
      expect(calculateTDEE(baseBMR, 'active')).toBe(Math.round(baseBMR * 1.725));
    });

    it('applies extreme multiplier (1.9)', () => {
      expect(calculateTDEE(baseBMR, 'extreme')).toBe(Math.round(baseBMR * 1.9));
    });

    it('falls back to sedentary for unknown activity level', () => {
      expect(calculateTDEE(baseBMR, 'nonexistent')).toBe(Math.round(baseBMR * 1.2));
    });

    it('returns a rounded integer', () => {
      const tdee = calculateTDEE(1780, 'moderate');
      expect(Number.isInteger(tdee)).toBe(true);
    });
  });

  // ============================================
  // calculateGoalCalories
  // ============================================
  describe('calculateGoalCalories', () => {
    const baseTDEE = 2500;

    it('maintains calories for maintain goal', () => {
      expect(calculateGoalCalories(baseTDEE, 'maintain')).toBe(2500);
    });

    it('subtracts 500 for moderate loss', () => {
      expect(calculateGoalCalories(baseTDEE, 'moderate_loss')).toBe(2000);
    });

    it('subtracts 750 for aggressive loss', () => {
      expect(calculateGoalCalories(baseTDEE, 'aggressive_loss')).toBe(1750);
    });

    it('subtracts 250 for slow loss', () => {
      expect(calculateGoalCalories(baseTDEE, 'slow_loss')).toBe(2250);
    });

    it('adds 250 for slow gain', () => {
      expect(calculateGoalCalories(baseTDEE, 'slow_gain')).toBe(2750);
    });

    it('adds 500 for moderate gain', () => {
      expect(calculateGoalCalories(baseTDEE, 'moderate_gain')).toBe(3000);
    });

    it('enforces minimum 1200 calories', () => {
      // Very low TDEE with aggressive loss
      expect(calculateGoalCalories(1500, 'aggressive_loss')).toBe(1200);
    });

    it('returns 1200 when result would be below minimum', () => {
      expect(calculateGoalCalories(1000, 'aggressive_loss')).toBe(1200);
    });

    it('returns TDEE for unknown goal (no adjustment)', () => {
      expect(calculateGoalCalories(baseTDEE, 'unknown')).toBe(baseTDEE);
    });
  });

  // ============================================
  // calculateMacros
  // ============================================
  describe('calculateMacros', () => {
    it('calculates balanced profile correctly', () => {
      const macros = calculateMacros(2000, 'balanced');
      // Balanced: 30% protein, 40% carbs, 30% fat
      expect(macros.protein.percentage).toBe(30);
      expect(macros.carbs.percentage).toBe(40);
      expect(macros.fat.percentage).toBe(30);
    });

    it('macro percentages sum to 100%', () => {
      for (const profile of MACRO_PROFILES) {
        const macros = calculateMacros(2000, profile.id);
        const sum = macros.protein.percentage + macros.carbs.percentage + macros.fat.percentage;
        expect(sum).toBe(100);
      }
    });

    it('calculates protein grams correctly (4 kcal/g)', () => {
      const macros = calculateMacros(2000, 'balanced');
      // 30% of 2000 = 600 kcal / 4 = 150g
      expect(macros.protein.grams).toBe(150);
      expect(macros.protein.calories).toBe(600);
    });

    it('calculates carbs grams correctly (4 kcal/g)', () => {
      const macros = calculateMacros(2000, 'balanced');
      // 40% of 2000 = 800 kcal / 4 = 200g
      expect(macros.carbs.grams).toBe(200);
      expect(macros.carbs.calories).toBe(800);
    });

    it('calculates fat grams correctly (9 kcal/g)', () => {
      const macros = calculateMacros(2000, 'balanced');
      // 30% of 2000 = 600 kcal / 9 = 66.67 → 67g
      expect(macros.fat.grams).toBe(67);
      expect(macros.fat.calories).toBe(600);
    });

    it('includes total calories in result', () => {
      const macros = calculateMacros(2000, 'balanced');
      expect(macros.calories).toBe(2000);
    });

    it('falls back to balanced profile for unknown id', () => {
      const macros = calculateMacros(2000, 'nonexistent');
      expect(macros.protein.percentage).toBe(30);
    });

    it('handles keto profile correctly', () => {
      const macros = calculateMacros(2000, 'keto');
      expect(macros.protein.percentage).toBe(25);
      expect(macros.carbs.percentage).toBe(5);
      expect(macros.fat.percentage).toBe(70);
    });
  });

  // ============================================
  // getProteinRecommendation
  // ============================================
  describe('getProteinRecommendation', () => {
    it('returns sedentary range for sedentary + maintain', () => {
      const rec = getProteinRecommendation(70, 'maintain', 'sedentary');
      // Sedentary: 0.8-1.2 g/kg, 70kg → min=56, max=84
      expect(rec.min).toBe(56);
      expect(rec.max).toBe(84);
    });

    it('returns higher range for moderate activity', () => {
      const rec = getProteinRecommendation(70, 'maintain', 'moderate');
      // Moderate: 1.4-2.0 g/kg, 70kg → min=98, max=140
      expect(rec.min).toBe(98);
      expect(rec.max).toBe(140);
    });

    it('returns higher range for extreme activity', () => {
      const rec = getProteinRecommendation(70, 'maintain', 'extreme');
      // Extreme: 1.6-2.2 g/kg, 70kg → min=112, max=154
      expect(rec.min).toBe(112);
      expect(rec.max).toBe(154);
    });

    it('increases protein for loss goals', () => {
      const maintain = getProteinRecommendation(70, 'maintain', 'moderate');
      const loss = getProteinRecommendation(70, 'moderate_loss', 'moderate');
      expect(loss.min).toBeGreaterThan(maintain.min);
      expect(loss.max).toBeGreaterThan(maintain.max);
    });

    it('optimal is average of min and max', () => {
      const rec = getProteinRecommendation(70, 'maintain', 'sedentary');
      expect(rec.optimal).toBe(Math.round(70 * ((0.8 + 1.2) / 2)));
    });

    it('returns integers', () => {
      const rec = getProteinRecommendation(73, 'maintain', 'active');
      expect(Number.isInteger(rec.min)).toBe(true);
      expect(Number.isInteger(rec.max)).toBe(true);
      expect(Number.isInteger(rec.optimal)).toBe(true);
    });
  });

  // ============================================
  // calculateNutritionPlan
  // ============================================
  describe('calculateNutritionPlan', () => {
    it('returns a complete plan with all fields', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'maintain', 'balanced');
      expect(plan).toHaveProperty('bmr');
      expect(plan).toHaveProperty('tdee');
      expect(plan).toHaveProperty('goalCalories');
      expect(plan).toHaveProperty('macros');
      expect(plan).toHaveProperty('proteinRec');
      expect(plan).toHaveProperty('deficit');
    });

    it('deficit is tdee - goalCalories', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'moderate_loss', 'balanced');
      expect(plan.deficit).toBe(plan.tdee - plan.goalCalories);
    });

    it('deficit is 0 for maintain', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'maintain', 'balanced');
      expect(plan.deficit).toBe(0);
    });

    it('deficit is negative for gain goals', () => {
      const plan = calculateNutritionPlan(80, 180, 30, 'male', 'moderate', 'slow_gain', 'balanced');
      expect(plan.deficit).toBeLessThan(0);
    });

    it('all values are positive numbers', () => {
      const plan = calculateNutritionPlan(70, 170, 25, 'female', 'light', 'slow_loss', 'high_protein');
      expect(plan.bmr).toBeGreaterThan(0);
      expect(plan.tdee).toBeGreaterThan(0);
      expect(plan.goalCalories).toBeGreaterThan(0);
      expect(plan.macros.protein.grams).toBeGreaterThan(0);
    });
  });

  // ============================================
  // getMealCalories
  // ============================================
  describe('getMealCalories', () => {
    it('returns 4 meals', () => {
      const meals = getMealCalories(2000);
      expect(meals).toHaveLength(4);
    });

    it('meal calories sum to total calories', () => {
      const meals = getMealCalories(2000);
      const total = meals.reduce((sum, m) => sum + m.calories, 0);
      expect(total).toBe(2000);
    });

    it('each meal has name, time, calories, example', () => {
      const meals = getMealCalories(2000);
      for (const meal of meals) {
        expect(meal).toHaveProperty('name');
        expect(meal).toHaveProperty('time');
        expect(meal).toHaveProperty('calories');
        expect(meal).toHaveProperty('example');
        expect(typeof meal.calories).toBe('number');
      }
    });

    it('lunch is the biggest meal (35%)', () => {
      const meals = getMealCalories(2000);
      const lunch = meals.find(m => m.name === 'Déjeuner');
      expect(lunch).toBeDefined();
      expect(lunch!.calories).toBe(700); // 35% of 2000
    });

    it('collation is the smallest meal (10%)', () => {
      const meals = getMealCalories(2000);
      const snack = meals.find(m => m.name === 'Collation');
      expect(snack).toBeDefined();
      expect(snack!.calories).toBe(200); // 10% of 2000
    });
  });

  // ============================================
  // MEAL_DISTRIBUTION percentages
  // ============================================
  describe('MEAL_DISTRIBUTION', () => {
    it('percentages sum to 100%', () => {
      const total = MEAL_DISTRIBUTION.reduce((sum, m) => sum + m.percentage, 0);
      expect(total).toBe(1.0);
    });
  });

  // ============================================
  // Constants integrity
  // ============================================
  describe('constants', () => {
    it('ACTIVITY_LEVELS has 5 entries', () => {
      expect(ACTIVITY_LEVELS).toHaveLength(5);
    });

    it('GOALS has 6 entries', () => {
      expect(GOALS).toHaveLength(6);
    });

    it('MACRO_PROFILES has 5 entries', () => {
      expect(MACRO_PROFILES).toHaveLength(5);
    });

    it('all macro profiles sum to 100%', () => {
      for (const profile of MACRO_PROFILES) {
        const sum = profile.protein + profile.carbs + profile.fat;
        expect(sum).toBeCloseTo(1.0, 5);
      }
    });
  });
});
