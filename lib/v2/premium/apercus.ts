/**
 * Apercus du carrousel Premium (27 octobre 2026). Houari : « Au lieu des icones, mets des choses de l'app qui lui
 * donnent envie, comme une demo, des captures d'elements : si c'est les calories, mets un truc de calories. »
 * Donnees pures des petits apercus (components/yoroi/v2/premium/Apercus.tsx), testees dans
 * __tests__/unit/apercusPaywall.test.ts. Aucun chiffre invente :
 *  - nutrition : le vrai calcul de l'ecran Plan nutritionnel (lib/nutrition.ts, calculateNutritionPlan) avec TON
 *    poids, ta taille, ton age et ton genre ; s'il en manque un, les valeurs par defaut de ce meme ecran
 *    (app/nutrition-plan.tsx : 80 kg, 175 cm, 30 ans) et l'apercu est marque « Exemple » ;
 *  - rythme : tes seances par semaine, posees sur la semaine ;
 *  - progres : la courbe d'exemple de l'onglet Progres (lib/v2/progres/samples.ts, sampleLift), marquee « Exemple » ;
 *  - combat : le reglage par defaut du chrono de combat (app/combat-timer.tsx : 5 rounds de 5 min, 1 min de repos),
 *    marque « Exemple ».
 */
import { calculateNutritionPlan } from '@/lib/nutrition';
import { sensPoids } from './pourToi';
import type { ObjectifPour } from './pourToi';

/** Valeurs par defaut de l'ecran Plan nutritionnel quand une mesure manque (app/nutrition-plan.tsx) */
export const NUTRITION_DEFAUT = { poids: 80, taille: 175, age: 30, activite: 'moderate', profil: 'high_protein' } as const;

export type MacroApercu = { key: 'p' | 'g' | 'l'; label: 'Protéines' | 'Glucides' | 'Lipides'; grams: number; percent: number };
export type ApercuNutrition = { calories: number; macros: MacroApercu[]; exemple: boolean };

/** Ton objectif de poids vers un objectif de l'ecran Plan nutritionnel (lib/nutrition.ts, GOALS) */
export function objectifNutrition(objectifs: ObjectifPour[]): 'moderate_loss' | 'maintain' | 'slow_gain' {
  const sens = sensPoids(objectifs);
  if (sens === 'perdre') return 'moderate_loss';
  if (sens === 'prendre') return 'slow_gain';
  return 'maintain';
}

const valide = (v: number | null | undefined, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export function apercuNutrition(p: { poids: number | null; taille: number | null; age: number | null; genre: 'h' | 'f'; objectifs: ObjectifPour[] }): ApercuNutrition {
  const tien = valide(p.poids, 25, 350) && valide(p.taille, 100, 250) && valide(p.age, 14, 110);
  const poids = tien ? (p.poids as number) : NUTRITION_DEFAUT.poids;
  const taille = tien ? (p.taille as number) : NUTRITION_DEFAUT.taille;
  const age = tien ? Math.round(p.age as number) : NUTRITION_DEFAUT.age;
  // l'exemple garde le genre par defaut de l'ecran (homme) ; tes valeurs gardent le tien
  const genre = tien ? (p.genre === 'f' ? 'female' : 'male') : 'male';
  const plan = calculateNutritionPlan(poids, taille, age, genre, NUTRITION_DEFAUT.activite, objectifNutrition(p.objectifs), NUTRITION_DEFAUT.profil);
  return {
    calories: plan.goalCalories,
    macros: [
      { key: 'p', label: 'Protéines', grams: plan.macros.protein.grams, percent: plan.macros.protein.percentage },
      { key: 'g', label: 'Glucides', grams: plan.macros.carbs.grams, percent: plan.macros.carbs.percentage },
      { key: 'l', label: 'Lipides', grams: plan.macros.fat.grams, percent: plan.macros.fat.percentage },
    ],
    exemple: !tien,
  };
}

/** Tes seances posees sur la semaine (0 = lundi), reparties au mieux : 3 donne lundi, mercredi, vendredi */
export function joursPrevus(seances: number | null): number[] {
  const n = Math.max(0, Math.min(7, Math.round(seances ?? 0)));
  return Array.from({ length: n }, (_, i) => Math.floor((i * 7) / n));
}

/** Reglage par defaut du chrono de combat (app/combat-timer.tsx) */
export const CHRONO_COMBAT = { rounds: 5, roundSeconds: 300, restSeconds: 60 } as const;

/** « 05:00 » */
export function chrono(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
