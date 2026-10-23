/**
 * Personnaliser (16 octobre 2026, Houari : « les utilisateurs ne vont pas savoir comment régler les choses, changer
 * le style des courbes etc., c'est grave caché »). Les routes de chaque reglage d'apparence, au meme endroit, pour
 * l'ecran Personnaliser (app/settings/style.tsx) et les acces poses la ou on en a besoin : bouton « Style » de la
 * carte Poids, appui long sur la scene et sur le personnage de l'accueil, « Personnalise ton accueil » en bas de
 * l'accueil, entree en haut des Reglages, etape de la visite guidee.
 * Chaque route est directe (aucune ne passe par un relais de lib/v2/nav/direct.ts). Aucun import React Native :
 * tout se teste avec jest.
 */

export const ROUTES_PERSONNALISER = {
  /** l'ecran Personnaliser lui-meme (le fichier garde son nom historique) */
  personnaliser: '/settings/style',
  scene: '/settings/scene',
  personnage: '/settings/personnage',
  /** 16 octobre 2026 : ta photo, ce que montre le rond et son contour, avec apercu en direct */
  photo: '/settings/photo',
  accueil: '/espace/accueil',
  courbes: '/settings/courbes',
  /** la feuille « Style de la courbe » ouverte tout de suite, avec ses apercus */
  styleCourbe: '/settings/courbes?choix=style',
  widgets: '/settings/widgets',
  icone: '/logo-selection',
  affichage: '/settings/affichage',
} as const;

export type ChoixCourbes = 'style' | 'couleur' | 'fond';

/** /settings/courbes?choix=style : la feuille a ouvrir des l'arrivee (sinon aucune) */
export function choixCourbesInitial(param: unknown): ChoixCourbes | null {
  const v = Array.isArray(param) ? param[0] : param;
  return v === 'style' || v === 'couleur' || v === 'fond' ? v : null;
}

/** La petite ligne sous « Personnaliser » dans les Reglages : ce que tu as choisi, en quelques mots */
export function resumePersonnaliser(a: { theme: string; scene: string; personnage: string; styleCourbe: number }): string {
  const morceaux = [a.theme, a.scene, a.personnage.toLowerCase(), `courbe style ${a.styleCourbe}`].map((x) => String(x ?? '').trim()).filter(Boolean);
  return morceaux.join(', ');
}

/** Les blocs affiches de l'accueil, dans ton ordre (titres), pour l'apercu de la tuile Ton accueil */
export function blocsAffiches<T extends string>(ordre: T[], caches: T[], titres: { id: T; titre: string }[]): string[] {
  const nom = new Map(titres.map((b) => [b.id, b.titre]));
  return ordre.filter((id) => !caches.includes(id) && nom.has(id)).map((id) => nom.get(id) as string);
}
