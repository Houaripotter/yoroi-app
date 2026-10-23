/**
 * Les etapes de la visite guidee (sorties de VisiteGuidee.tsx le 18 octobre 2026, pour les tester sans ecran).
 *
 * 18 octobre (Houari : « la visite saute dans le desordre ») : un seul parcours, dans l'ordre des onglets, sans
 * aller-retour : l'accueil de haut en bas (scene, outils, poids, objectif, ta journee, ton mois, personnaliser),
 * puis le bouton plus, puis Seances, Progres et le Dojo, puis tes reglages et la fin, de retour sur l'accueil.
 * Audit du meme jour : « Clair ou sombre » est retiree (la visite reste courte) ; « Ton objectif » est ajoutee (carte
 * Ton poids, ligne Ton objectif avec Changer) ; « L'eau » devient « Ta journee » (le tableau du jour de l'accueil C,
 * avec anneaux, sommeil et eau ; sinon la tuile Eau des accueils A et B).
 *
 * voix : numero du fichier assets/sounds/tour/tour_fr_etape_NN.mp3 dont le texte est le meme (null : pas encore
 * enregistree, on avance avec « Suivant »). Si un texte change, mettre voix a null jusqu'au nouvel enregistrement.
 */
import { traduire } from '@/lib/i18n/tr';
export type Onglet = 'index' | 'seances' | 'progres' | 'dojo';

export type Etape = {
  titre: string;
  /** ce que dit la voix, et la bulle (meme texte) */
  texte: string;
  /** fichier de voix (1 a 15), null : pas de voix pour ce texte */
  voix: number | null;
  /** onglet ouvert avant l'etape */
  onglet?: Onglet;
  /** l'accueil remonte en haut avant l'etape */
  haut?: boolean;
  /** element entoure (TourAnchor) ; plusieurs : le premier present a l'ecran */
  cible?: string | string[];
  /** l'ancre peut etre plus bas : l'accueil defile pour l'amener a l'ecran */
  defile?: boolean;
  /** carte haute : elle descend juste au-dessus de la barre d'onglets et la bulle se pose en haut de l'ecran */
  bulleHaut?: boolean;
  /** le doigt appuie (sinon il montre seulement) */
  appui?: boolean;
  /** apres l'appui, cet onglet s'ouvre (le cadre reste autour de l'onglet, sans voile) */
  ouvre?: Onglet;
  /** le menu du bouton + reste montre pendant l'etape */
  menuPlus?: boolean;
};

export const ETAPES: Etape[] = [
  { titre: traduire('Bienvenue dans YOROI'), texte: traduire('Salut, et bienvenue dans YOROI. Je te fais faire le tour en une minute. Regarde où je touche.'), voix: 1, onglet: 'index', haut: true },
  { titre: traduire('Ta scène'), texte: traduire('En haut, c’est ta scène. Touche-la quand tu veux pour choisir un autre décor.'), voix: 2, onglet: 'index', haut: true, cible: 'accueil.scene', appui: true },
  { titre: traduire('Tes outils'), texte: traduire('Juste sous ta scène, tes outils : le chrono, tes cartes à partager, tes objectifs, ton carnet et tes records.'), voix: 7, onglet: 'index', haut: true, cible: 'accueil.outils' },
  { titre: traduire('Ton poids'), texte: traduire('Voici ton poids et ta courbe. Le torii, c’est ton objectif, avec la date où tu l’atteins à ce rythme.'), voix: 4, onglet: 'index', haut: true, cible: 'accueil.poids' },
  { titre: traduire('Ton objectif'), texte: traduire('Sous ta courbe, ton objectif. Touche Changer pour modifier ton poids de départ, ton objectif ou ta date.'), voix: null, onglet: 'index', cible: 'accueil.objectif', defile: true, appui: true },
  { titre: traduire('Ta journée'), texte: traduire('Ici, ta journée : tes anneaux, ton sommeil et ton eau. Touche l’eau pour ajouter un verre.'), voix: null, onglet: 'index', cible: ['accueil.jour', 'accueil.eau'], defile: true, appui: true },
  { titre: traduire('Ton mois'), texte: traduire('Ton mois te montre tous les jours où tu t’es entraîné, et tes prochaines séances prévues.'), voix: 9, onglet: 'index', cible: 'accueil.mois', defile: true, bulleHaut: true },
  { titre: traduire('Personnalise'), texte: traduire('Pour changer ta scène, ton personnage, le style de tes courbes, tes widgets ou ton icône, touche Personnaliser, ici en bas de l’accueil ou en haut de tes réglages.'), voix: 13, onglet: 'index', cible: 'accueil.personnaliser', defile: true, bulleHaut: true },
  { titre: traduire('Le bouton plus'), texte: traduire('Le bouton plus sert à tout noter : ton poids, tes mensurations, ta balance connectée ou une séance.'), voix: 5, onglet: 'index', cible: 'onglet.plus', appui: true },
  { titre: traduire('Noter une séance'), texte: traduire('Tu viens de t’entraîner ? Touche ici, choisis ton sport, et ta séance est notée en quelques secondes.'), voix: 6, onglet: 'index', menuPlus: true, cible: 'ajouter.seance', appui: true },
  { titre: traduire('Séances'), texte: traduire('L’onglet Séances garde tout ton historique, ta semaine et ta dernière séance.'), voix: 10, cible: 'onglet.seances', appui: true, ouvre: 'seances' },
  { titre: traduire('Progrès'), texte: traduire('Dans Progrès, tu retrouves tes courbes, ton corps, ta force et tes records.'), voix: 11, cible: 'onglet.progres', appui: true, ouvre: 'progres' },
  { titre: traduire('Le Dojo'), texte: traduire('Le Dojo, c’est ton chemin de guerrier : ton rang, tes sceaux et tes récompenses.'), voix: 12, cible: 'onglet.dojo', appui: true, ouvre: 'dojo' },
  { titre: traduire('Tes réglages'), texte: traduire('Touche ta photo pour ouvrir tes réglages. Dans l’aide, tu peux revoir cette visite.'), voix: 14, onglet: 'index', haut: true, cible: 'accueil.profil', appui: true },
  { titre: traduire('À toi de jouer'), texte: traduire('À toi de jouer. Commence par noter ton poids du jour avec le bouton plus.'), voix: 15, onglet: 'index', haut: true },
];

/** Titres des etapes, pour le Studio */
export const VISITE_TITRES = ETAPES.map((e) => e.titre);

/** Les ancres d'une etape, dans l'ordre d'essai */
export function ciblesDe(e: Etape): string[] {
  if (!e.cible) return [];
  return Array.isArray(e.cible) ? e.cible : [e.cible];
}
