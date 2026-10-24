/**
 * Disques et echauffement (24 octobre 2026) : deux outils pratiques de la seance de musculation.
 * Ce sont des aides de calcul, pas des recommandations scientifiques.
 *  - disques : quels disques mettre de chaque cote de la barre pour la charge voulue ;
 *  - echauffement : quelques series de montee avant la premiere serie de travail (choix pratique courant).
 * Tout est dans l'unite de l'utilisateur (kg ou lb). Donnees pures, testees dans __tests__/unit/disques.test.ts.
 */

export type Unite = 'kg' | 'lb';

const DISQUES: Record<Unite, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const BARRE: Record<Unite, number> = { kg: 20, lb: 45 };

/** Disques de CHAQUE cote, du plus lourd au plus leger. null si la charge est plus legere que la barre ou impossible. */
export function disquesParCote(total: number, unite: Unite = 'kg', barre = BARRE[unite]): { cote: number[]; reste: number } | null {
  if (!(total > barre)) return null;
  let parCote = Math.round(((total - barre) / 2) * 1000) / 1000;
  const cote: number[] = [];
  for (const d of DISQUES[unite]) {
    while (parCote + 1e-9 >= d) {
      cote.push(d);
      parCote = Math.round((parCote - d) * 1000) / 1000;
    }
  }
  return { cote, reste: Math.round(parCote * 2 * 100) / 100 };
}

/** Le plus petit saut possible avec ces disques (deux disques les plus legers) */
export const plusPetitSaut = (unite: Unite = 'kg') => DISQUES[unite][DISQUES[unite].length - 1] * 2;

/**
 * Echauffement avant une premiere serie lourde : barre a vide, puis environ 40 %, 60 % et 80 % de la charge,
 * avec de moins en moins de repetitions. Arrondi au saut possible avec les disques. Rien si la charge est legere.
 */
export function echauffement(charge: number, unite: Unite = 'kg'): { charge: number; reps: number }[] {
  const barre = BARRE[unite];
  if (!(charge >= barre * 2)) return [];
  const pas = plusPetitSaut(unite);
  const arr = (x: number) => Math.max(barre, Math.round(x / pas) * pas);
  const etapes = [
    { charge: barre, reps: 10 },
    { charge: arr(charge * 0.4), reps: 8 },
    { charge: arr(charge * 0.6), reps: 5 },
    { charge: arr(charge * 0.8), reps: 3 },
  ];
  // pas deux etapes a la meme charge, et jamais la charge de travail elle meme
  return etapes.filter((e, i) => e.charge < charge && (i === 0 || e.charge > etapes[i - 1].charge));
}
