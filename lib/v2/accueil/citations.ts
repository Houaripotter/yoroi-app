/**
 * Citation du jour de l'accueil (16 octobre 2026). Houari : la ligne sous tes outils etait coupee
 * (« La motivation va et vient. La régularité, elle, construit ta progres… »).
 * Soixante phrases tres courtes, ecrites pour YOROI, sans attribution : 38 caracteres au plus pour tenir
 * en une ligne a 375 points sans coupure. Elles encouragent toujours : sport, discipline, esprit samourai.
 * Une par jour, la meme toute la journee. Le toucher ouvre toujours le conseil du jour complet (conseil.ts).
 * Aucun import React Native ici : tout se teste avec jest.
 */

export const LONGUEUR_MAX_CITATION = 38;

export const CITATIONS: readonly string[] = [
  'Un pas de plus que hier.',
  'La discipline forge le guerrier.',
  'Le dojo t’attend.',
  'Tombe sept fois, relève-toi huit.',
  'Chaque séance compte.',
  'La lame s’aiguise chaque jour.',
  'Petit effort, grand chemin.',
  'Ton corps se souvient de tout.',
  'Le guerrier revient toujours.',
  'Aujourd’hui, tu avances.',
  'La régularité bat le talent.',
  'Respire. Puis recommence.',
  'Le sabre suit l’esprit.',
  'Fais-le, même à moitié.',
  'Le chemin se fait en marchant.',
  'Un round de plus.',
  'La sueur d’aujourd’hui paie demain.',
  'Calme dehors, feu dedans.',
  'Ta seule rivale : hier.',
  'Le tatami ne ment pas.',
  'Garde ta garde haute.',
  'La force naît de la patience.',
  'Chaque goutte creuse la pierre.',
  'Tu es plus solide qu’hier.',
  'Le samouraï ne lâche rien.',
  'Commence. Le reste suivra.',
  'Le respect se gagne au travail.',
  'Ton armure se forge ici.',
  'Doucement, mais chaque jour.',
  'Le bambou plie, il ne casse pas.',
  'La victoire aime la préparation.',
  'Lève-toi, le dojo est ouvert.',
  'Un souffle, un geste, un pas.',
  'Ton effort parle pour toi.',
  'La ceinture se gagne au tapis.',
  'Le froid passe, le guerrier reste.',
  'Discipline aujourd’hui, fierté demain.',
  'Rien ne remplace la répétition.',
  'Le mental guide le corps.',
  'Avance comme la rivière.',
  'Tu as déjà fait le plus dur.',
  'Tiens bon, ça paie.',
  'Le guerrier s’entraîne sans bruit.',
  'Une habitude à la fois.',
  'La montagne se gravit pas à pas.',
  'L’esprit calme frappe juste.',
  'Ton meilleur toi t’attend.',
  'Le courage, c’est de revenir.',
  'Sois fier de chaque séance.',
  'Le progrès aime la patience.',
  'Honore ton engagement.',
  'Encore un round, tu peux.',
  'La force tranquille gagne.',
  'Le chemin compte plus que le but.',
  'Aiguise ton esprit comme ta lame.',
  'Ce que tu sèmes, tu le récoltes.',
  'Un vrai guerrier se repose aussi.',
  'Ta constance est ta force.',
  'Le premier pas est le plus beau.',
  'Bats-toi pour toi.',
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
