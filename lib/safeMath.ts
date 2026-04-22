// ============================================
// SAFE MATH
// Helpers pour éviter les "Maximum call stack size exceeded" quand on utilise
// Math.min(...arr) ou Math.max(...arr) avec de grandes arrays (>1000 items).
// Le spread operator passe tous les items en arguments, ce qui dépasse la stack
// sur iOS/Android à partir de ~5000 éléments selon le device.
// ============================================

export const safeMin = (arr: number[], fallback: number = 0): number => {
  if (!arr || arr.length === 0) return fallback;
  let min = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
  }
  return min;
};

export const safeMax = (arr: number[], fallback: number = 0): number => {
  if (!arr || arr.length === 0) return fallback;
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const v = arr[i];
    if (v > max) max = v;
  }
  return max;
};

/** Renvoie { min, max } en un seul passage (plus efficace). */
export const safeMinMax = (arr: number[], fallback: number = 0): { min: number; max: number } => {
  if (!arr || arr.length === 0) return { min: fallback, max: fallback };
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    const v = arr[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
};

/** Somme sûre (pas de spread) */
export const safeSum = (arr: number[]): number => {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum;
};
