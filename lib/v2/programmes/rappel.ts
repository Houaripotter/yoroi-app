/**
 * Rappel de seance d'un programme (26 octobre 2026) : calculs purs pour la carte « Rappel de séance »
 * (components/yoroi/v2/programmes/RappelSeance.tsx). La programmation reste celle des rappels de seance
 * (lib/notificationService.ts, training) : un seul reglage, jamais deux rappels le meme jour.
 * Le texte de chaque rappel dit la seance du jour (lib/v2/programmes/lancer.ts, messageDuJour).
 */

/** Les heures proposees en un tap */
export const HEURES_RAPPEL = ['07:00', '12:00', '18:00', '19:30'];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const heureRappelValide = (h: string | null | undefined): h is string => !!h && HHMM.test(h);

/** « 18 h », « 19 h 30 », « 7 h 05 » */
export function libelleHeureRappel(h: string): string {
  if (!heureRappelValide(h)) return h;
  const heures = Number(h.slice(0, 2));
  return h.endsWith(':00') ? `${heures} h` : `${heures} h ${h.slice(3, 5)}`;
}

/** Tes jours de programme (0 = lundi) en jours du rappel (Date.getDay(), 0 = dimanche), tries, sans doublon */
export function joursDuRappel(joursLundi: number[]): number[] {
  const js = joursLundi.filter((j) => Number.isInteger(j) && j >= 0 && j <= 6).map((j) => (j + 1) % 7);
  return Array.from(new Set(js)).sort((a, b) => a - b);
}

/** Le rappel suit deja ces jours (comparaison sans ordre) */
export function memesJours(a: number[] | undefined | null, b: number[]): boolean {
  const x = Array.from(new Set(a ?? [])).sort((m, n) => m - n);
  const y = Array.from(new Set(b)).sort((m, n) => m - n);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/** L'heure n'est pas une des puces : « Autre heure » est allumee */
export const estAutreHeure = (h: string) => heureRappelValide(h) && !HEURES_RAPPEL.includes(h);
