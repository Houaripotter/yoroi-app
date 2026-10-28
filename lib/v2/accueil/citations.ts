/**
 * Citation du jour de l'accueil (16 octobre 2026). Houari : la ligne sous tes outils etait coupee
 * (« La motivation va et vient. La régularité, elle, construit ta progres… »).
 * Soixante phrases tres courtes, ecrites pour YOROI, sans attribution : 38 caracteres au plus pour tenir
 * en une ligne a 375 points sans coupure. Elles encouragent toujours : sport, discipline, esprit samourai.
 * Une par jour, la meme toute la journee. Le toucher ouvre toujours le conseil du jour complet (conseil.ts).
 * Aucun import React Native ici : tout se teste avec jest.
 */

import { traduire } from '@/lib/i18n/tr';
export const LONGUEUR_MAX_CITATION = 38;

export const CITATIONS: readonly string[] = [
  traduire('Un pas de plus que hier.'),
  traduire('La discipline forge le guerrier.'),
  traduire('Le dojo t’attend.'),
  traduire('Sept fois à terre, huit fois debout.'),
  traduire('Chaque séance compte.'),
  traduire('La lame s’aiguise chaque jour.'),
  'Petit effort, grand chemin.',
  traduire('Ton corps se souvient de tout.'),
  traduire('Le guerrier revient toujours.'),
  traduire('Aujourd’hui, tu avances.'),
  traduire('La régularité bat le talent.'),
  'Respire. Puis recommence.',
  traduire('Le sabre suit l’esprit.'),
  traduire('Même à moitié, fais ta séance.'),
  traduire('Le chemin se fait en marchant.'),
  traduire('Un round de plus.'),
  traduire('La sueur d’aujourd’hui paie demain.'),
  'Calme dehors, feu dedans.',
  traduire('Ta seule rivale : hier.'),
  traduire('Le tatami ne ment pas.'),
  traduire('Garde ta garde haute.'),
  traduire('La force naît de la patience.'),
  traduire('Chaque goutte creuse la pierre.'),
  traduire('Tu es plus solide qu’hier.'),
  traduire('Le samouraï ne lâche rien.'),
  traduire('Commence. Le reste suivra.'),
  traduire('Le respect se gagne au travail.'),
  traduire('Ton armure se forge ici.'),
  traduire('Doucement, mais chaque jour.'),
  traduire('Le bambou plie, il ne casse pas.'),
  traduire('La victoire aime la préparation.'),
  traduire('Debout, le dojo est ouvert.'),
  traduire('Un souffle, un geste, un pas.'),
  traduire('Ton effort parle pour toi.'),
  traduire('La ceinture se gagne au tapis.'),
  traduire('Le froid passe, le guerrier reste.'),
  traduire('Discipline aujourd’hui, fierté demain.'),
  traduire('Rien ne remplace la répétition.'),
  traduire('Le mental guide le corps.'),
  traduire('Avance comme la rivière.'),
  traduire('Tu as déjà fait le plus dur.'),
  traduire('Tiens bon, ça paie.'),
  traduire('Le guerrier s’entraîne sans bruit.'),
  traduire('Une habitude à la fois.'),
  traduire('La montagne se gravit pas à pas.'),
  'L’esprit calme frappe juste.',
  traduire('Ton meilleur toi t’attend.'),
  traduire('Le courage, c’est de revenir.'),
  traduire('Sois fier de chaque séance.'),
  traduire('Le progrès aime la patience.'),
  traduire('Honore ton engagement.'),
  traduire('Encore un round, tu peux.'),
  traduire('La force tranquille gagne.'),
  traduire('Le chemin compte plus que le but.'),
  traduire('Aiguise ton esprit comme ta lame.'),
  traduire('Ce que tu sèmes, tu le récoltes.'),
  traduire('Un vrai guerrier se repose aussi.'),
  traduire('Ta constance est ta force.'),
  traduire('Le premier pas est le plus beau.'),
  traduire('Ton combat, c’est pour toi.'),
];

const DAY = 86400000;

/** Numero du jour local (minuit a minuit), stable toute la journee */
function jourLocal(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY);
}

/** La citation du jour : une par jour, dans l'ordre de la liste, jamais deux jours de suite la meme */
export function citationDuJour(now: Date = new Date()): string {
  const n = CITATIONS.length;
  return CITATIONS[((jourLocal(now) % n) + n) % n];
}
