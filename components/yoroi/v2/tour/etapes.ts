/**
 * Les etapes de la visite guidee (sorties de VisiteGuidee.tsx le 18 octobre 2026, pour les tester sans ecran).
 *
 * 27 octobre 2026 (Houari : « je t'ai dit de le faire dans l'ordre ») : nouveau parcours, dans l'ordre de l'app.
 * On commence par le bouton plus : le doigt appuie et on va DEDANS (les onglets Séance, Mensurations et Poids,
 * puis ce qu'il y a dans chacun). Puis chaque onglet, ouvert pour de vrai (Séances, Progrès, Dojo), avec ce qu'il
 * a d'important. Puis retour sur l'accueil : la tuile Coach, et a la fin le bouton Reglages.
 * Plus aucune etape ne fait defiler l'accueil vers le bas (le 26 octobre, « Ton objectif » descendait jusqu'aux
 * donnees de Sante et la visite semblait bloquee).
 *
 * voix : numero du fichier assets/sounds/tour/tour_fr_etape_NN.mp3 dont le texte est le meme (null : pas encore
 * enregistree ; la bulle s'affiche seule et la visite avance d'elle meme apres le temps de lecture).
 * Si un texte change, mettre voix a null jusqu'au nouvel enregistrement.
 * Textes a enregistrer : _propositions/visite_textes_2026-10-27.md
 */
import { traduire } from '@/lib/i18n/tr';
import type { OngletPlus } from '@/lib/v2/visite/ongletPlus';
export type Onglet = 'index' | 'seances' | 'progres' | 'dojo';

export type Etape = {
  titre: string;
  /** ce que dit la voix, et la bulle (meme texte) */
  texte: string;
  /** fichier de voix (tour_fr_etape_NN.mp3 ; 16 a 24 : voix du 27 octobre), null : pas de voix pour ce texte */
  voix: number | null;
  /** onglet ouvert avant l'etape */
  onglet?: Onglet;
  /** l'onglet de l'etape remonte en haut avant l'etape */
  haut?: boolean;
  /** element entoure (TourAnchor) ; plusieurs : le premier present a l'ecran */
  cible?: string | string[];
  /** une seconde ancre, entouree avec la premiere dans le meme cadre */
  avec?: string;
  /** l'ancre peut etre plus bas : l'accueil defile pour l'amener a l'ecran */
  defile?: boolean;
  /** carte haute : elle descend juste au-dessus de la barre d'onglets et la bulle se pose en haut de l'ecran */
  bulleHaut?: boolean;
  /** le doigt appuie (sinon il montre seulement) */
  appui?: boolean;
  /** apres l'appui, cet onglet s'ouvre (le cadre reste autour de l'onglet, sans voile) */
  ouvre?: Onglet;
  /** apres l'appui, le menu du bouton + s'ouvre */
  ouvreMenu?: boolean;
  /** le menu du bouton + reste montre pendant l'etape */
  menuPlus?: boolean;
  /** l'onglet du menu + montre (Séance par defaut) */
  ongletPlus?: OngletPlus;
  /** apres l'appui, le menu + passe a cet onglet */
  puisOngletPlus?: OngletPlus;
};

export const ETAPES: Etape[] = [
  { titre: traduire('Bienvenue dans YOROI'), texte: traduire('Salut, et bienvenue dans YOROI. Je te fais faire le tour en une minute. Regarde où je touche.'), voix: 1, onglet: 'index', haut: true },
  // le bouton plus, puis dedans
  { titre: traduire('Le bouton plus'), texte: traduire('On commence par le bouton plus : c’est ici que tu notes tout. Je l’ouvre pour toi.'), voix: 16, onglet: 'index', cible: 'onglet.plus', appui: true, ouvreMenu: true },
  { titre: traduire('Trois onglets'), texte: traduire('Dedans, trois onglets : Séance, Mensurations et Poids. Tu choisis ce que tu veux noter.'), voix: 17, onglet: 'index', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.onglets' },
  { titre: traduire('Noter une séance'), texte: traduire('Tu viens de t’entraîner ? Touche ici, choisis ton sport, et ta séance est notée en quelques secondes.'), voix: 6, onglet: 'index', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.seance', appui: true },
  { titre: traduire('Dicte ou en direct'), texte: traduire('Tu peux aussi dicter ta séance en une phrase, ou la faire en direct avec le chrono et le repos.'), voix: 18, onglet: 'index', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.facons' },
  { titre: traduire('Mensurations et poids'), texte: traduire('Dans Mensurations, ta taille, tes bras et tes cuisses. Dans Poids, ta pesée à la main ou en photo de ta balance.'), voix: 19, onglet: 'index', menuPlus: true, ongletPlus: 'mesures', puisOngletPlus: 'poids', cible: 'ajouter.onglets', avec: 'ajouter.detail', appui: true },
  // chaque onglet, ouvert pour de vrai
  { titre: traduire('Séances'), texte: traduire('L’onglet Séances garde tout ton historique, ta semaine et ta dernière séance.'), voix: 10, cible: 'onglet.seances', appui: true, ouvre: 'seances' },
  { titre: traduire('Ta semaine'), texte: traduire('En haut, ta semaine en un coup d’œil. Plus bas, ton prochain entraînement, ton programme et ton mois.'), voix: 20, onglet: 'seances', haut: true, cible: 'seances.semaine' },
  { titre: traduire('Progrès'), texte: traduire('Dans Progrès, tu retrouves tes courbes, ton corps, ta force et tes records.'), voix: 11, cible: 'onglet.progres', appui: true, ouvre: 'progres' },
  { titre: traduire('Ta vue d’ensemble'), texte: traduire('Chaque tuile, c’est une partie de ta progression. Touche une tuile pour voir le détail.'), voix: 21, onglet: 'progres', haut: true, cible: 'progres.ensemble' },
  { titre: traduire('Le Dojo'), texte: traduire('Le Dojo, c’est ton chemin de guerrier : ton rang, tes sceaux et tes récompenses.'), voix: 12, cible: 'onglet.dojo', appui: true, ouvre: 'dojo' },
  { titre: traduire('Ton rang'), texte: traduire('Chaque séance te donne de l’XP. Ton rang monte, et ta prochaine récompense se construit pièce par pièce.'), voix: 22, onglet: 'dojo', haut: true, cible: 'dojo.rang' },
  // retour sur l'accueil
  { titre: traduire('Ton coach'), texte: traduire('De retour sur l’accueil, la première tuile, c’est ton Coach : ton programme et tes questions.'), voix: 23, onglet: 'index', haut: true, cible: 'accueil.coach', appui: true },
  { titre: traduire('Tes réglages'), texte: traduire('Et pour finir, c’est ici, le bouton Réglages : touche ta photo. Dans l’aide, tu peux revoir cette visite.'), voix: 24, onglet: 'index', haut: true, cible: 'accueil.profil', appui: true },
  { titre: traduire('À toi de jouer'), texte: traduire('À toi de jouer. Commence par noter ton poids du jour avec le bouton plus.'), voix: 15, onglet: 'index', haut: true },
];

/** Titres des etapes, pour le Studio */
export const VISITE_TITRES = ETAPES.map((e) => e.titre);

/** Les ancres d'une etape, dans l'ordre d'essai */
export function ciblesDe(e: Etape): string[] {
  if (!e.cible) return [];
  return Array.isArray(e.cible) ? e.cible : [e.cible];
}

/** Temps de lecture d'une bulle sans voix enregistree (ms), avant de passer seul a la suivante */
export function tempsDeLecture(texte: string, vitesse = 1): number {
  const ms = 1800 + texte.length * 62;
  return Math.round(Math.max(4500, Math.min(12000, ms)) / Math.max(1, vitesse));
}
