/**
 * Outils du plan de l'onboarding : dates, courbe, progression de la barre du haut.
 * Vague 28 : la date d'arrivee est une fourchette honnete calculee par lib/v2/pesee/estimation.ts
 * (le meme calcul a l'accueil, dans Progres et dans Previsions).
 */
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function isoOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

/** « 3 février », avec l'annee si elle n'est pas celle d'aujourd'hui */
export function longDay(iso: string, today: string = isoOf(new Date())): string {
  const d = new Date(`${iso}T12:00:00`);
  const base = `${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
  return iso.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${d.getFullYear()}`;
}

/** Poids attendu sur le chemin, semaine par semaine (de 0 a weeks) */
export function pathPoints(start: number, target: number, weeks: number): number[] {
  const out: number[] = [];
  for (let w = 0; w <= weeks; w++) {
    const t = weeks === 0 ? 1 : w / weeks;
    out.push(start + (target - start) * t);
  }
  return out;
}

/**
 * Barre de progression : 50 % des que la premiere question (le prenom) a une reponse,
 * puis une avancee de plus en plus douce jusqu'a 100 % au dernier ecran avant Premium.
 * Toujours croissante avec l'ecran : seul le bouton retour la fait reculer.
 */
export function progressOf(page: number, firstAnswered: boolean, firstQuestion: number, lastBeforePaywall: number): number {
  if (page <= 0) return 0;
  if (page <= firstQuestion) return firstAnswered ? 0.5 : 0.05;
  if (page >= lastBeforePaywall) return 1;
  const t = (page - firstQuestion) / (lastBeforePaywall - firstQuestion);
  // pas de plus en plus courts : 1 - (1 - t)^2
  return 0.5 + 0.5 * (1 - (1 - t) * (1 - t));
}
