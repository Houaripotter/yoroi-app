/**
 * Vague 45 : l'univers du personnage, au choix de l'utilisateur (onboarding et Reglages, Ton personnage).
 *  'japon'     : le Guerrier, les rangs Ashigaru a Shogun, l'armure qui se construit (par defaut, aussi pour les anciens)
 *  'classique' : des sportifs modernes, les rangs Debutant a Champion, la tenue qui se construit
 * Le choix « Sans personnage » se range dans l'univers classique, avec la cle de personnage 'aucun'.
 * Seul l'affichage change : l'XP, le rang et le journal d'XP restent les memes, quel que soit l'univers.
 * L'univers actif est garde en memoire (universCourant), comme la silhouette, pour que tous les ecrans
 * appliquent la meme regle sans relire le stockage.
 */
export type Univers = 'japon' | 'classique';

/** Cle de personnage du choix « Sans personnage » : la scene seule, sans figure */
export const SANS_PERSONNAGE = 'aucun';

let courant: Univers = 'japon';

export function setUniversCourant(u: Univers | undefined | null): void {
  courant = u === 'classique' ? 'classique' : 'japon';
}

export function universCourant(): Univers {
  return courant;
}

export function isUnivers(v: unknown): v is Univers {
  return v === 'japon' || v === 'classique';
}

/** Noms des 5 rangs dans chaque univers, du premier au dernier */
export const RANG_NOMS: Record<Univers, [string, string, string, string, string]> = {
  japon: ['Ashigaru', 'Bushi', 'Samouraï', 'Rōnin', 'Shōgun'],
  classique: ['Débutant', 'Régulier', 'Confirmé', 'Expert', 'Champion'],
};

/** Ce que porte le personnage a chaque rang */
export const RANG_TENUES: Record<Univers, [string, string, string, string, string]> = {
  japon: ['Tenue d’entraînement et bandeau', 'Kimono indigo et plastron', 'Armure complète', 'Cape et chapeau de paille', 'Armure d’apparat noir et or'],
  classique: ['T-shirt et short', 'Veste d’entraînement', 'Tenue technique', 'Coupe-vent et sac de sport', 'Tenue de champion bleu nuit et or'],
};

/** Nom du rang affiche (0 a 4), dans l'univers donne ou l'univers actif */
export function rangNom(index: number, u: Univers = courant): string {
  const i = Math.max(0, Math.min(4, Math.round(Number(index) || 0)));
  return RANG_NOMS[u][i];
}

export function rangTenue(index: number, u: Univers = courant): string {
  const i = Math.max(0, Math.min(4, Math.round(Number(index) || 0)));
  return RANG_TENUES[u][i];
}

/** « Samouraï, 2e dan » ou « Champion, 2e dan » */
export function rangTitre(index: number, dan = 0, u: Univers = courant): string {
  const nom = rangNom(index, u);
  if (!dan) return nom;
  return `${nom}, ${dan === 1 ? '1er' : `${dan}e`} dan`;
}

/** Ce que construit le personnage entre deux rangs : « Ton armure se construit » ou « Ta tenue se construit » */
export function libelleConstruction(u: Univers = courant): string {
  return u === 'classique' ? 'Ta tenue se construit' : 'Ton armure se construit';
}

/** « Le chemin de l'armure » ou « Le chemin du champion » */
export function libelleChemin(u: Univers = courant): string {
  return u === 'classique' ? 'Le chemin du champion' : 'Le chemin de l’armure';
}

export const UNIVERS_CHOIX: { id: 'japon' | 'classique' | 'aucun'; nom: string; phrase: string }[] = [
  { id: 'japon', nom: 'Japon', phrase: 'Un guerrier qui gagne son armure, des scènes du Japon ancien' },
  { id: 'classique', nom: 'Classique', phrase: 'Un sportif d’aujourd’hui, des scènes de salle, de parc et de ville' },
  { id: 'aucun', nom: 'Sans personnage', phrase: 'Juste ta scène, sans figure' },
];
