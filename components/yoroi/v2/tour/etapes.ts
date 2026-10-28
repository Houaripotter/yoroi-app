/**
 * Les etapes de la visite guidee (sorties de VisiteGuidee.tsx le 18 octobre 2026, pour les tester sans ecran).
 *
 * 28 octobre 2026 (Houari : « on a change la tab bar, la presentation ne s'adapte pas ; page par page, dans l'ordre :
 * Accueil, Seances, plus, Progres, Dojo ») : nouveau parcours, dans l'ordre de la barre. L'accueil d'abord, de haut
 * en bas (ta photo, ta scene, ton personnage, ton poids et ses paliers, ta courbe, tes outils, le Coach, ta semaine,
 * personnaliser), puis la barre, puis chaque onglet ouvert pour de vrai avec tout ce qu'il montre.
 * Version du 27 octobre (le bouton plus en premier) : _archive_ancien_design_2026-10-09/visite_2026-10-28.
 *
 * voix : numero du fichier assets/sounds/tour/tour_fr_etape_NN.mp3 dont le texte est EXACTEMENT le meme (null : pas
 * encore enregistree ; la bulle s'affiche seule et la visite avance d'elle meme apres le temps de lecture).
 * Si un texte change, mettre voix a null jusqu'au nouvel enregistrement.
 * Textes a enregistrer : _propositions/visite_textes_2026-10-28.md
 */
import { traduire } from '@/lib/i18n/tr';
import type { OngletPlus } from '@/lib/v2/visite/ongletPlus';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
export type Onglet = 'index' | 'seances' | 'progres' | 'dojo';
/** la partie de l'app montree, ecrite en petites capitales dans la bulle */
export type Partie = 'accueil' | 'barre' | 'seances' | 'plus' | 'progres' | 'dojo' | 'fin';

export type Etape = {
  partie: Partie;
  titre: string;
  /** ce que dit la voix, et la bulle (meme texte) */
  texte: string;
  /** fichier de voix (tour_fr_etape_NN.mp3), null : pas de voix pour ce texte */
  voix: number | null;
  /** le sticker de la bulle (ou l'illustration d'avant, selon le reglage Illustrations) */
  sticker?: NomSticker;
  /** onglet ouvert avant l'etape */
  onglet?: Onglet;
  /** l'onglet de l'etape remonte en haut avant l'etape */
  haut?: boolean;
  /** element entoure (TourAnchor) ; plusieurs : le premier present a l'ecran */
  cible?: string | string[];
  /** d'autres ancres, entourees avec la premiere dans le meme cadre (celles qui sont presentes) */
  avec?: string | string[];
  /** le cadre reste dans cette ancre (le personnage, coupe par la carte de la scene) */
  dans?: string;
  /** ou le doigt appuie dans l'element, en fraction de sa largeur et de sa hauteur (le centre sinon) */
  doigt?: { x: number; y: number };
  /** la page de la carte Ton poids montree (0 : ton poids et ses paliers, 1 : ta courbe) */
  pagePoids?: 0 | 1;
  /** pas de doigt (la barre entiere : le doigt cacherait un onglet) */
  sansDoigt?: boolean;
  /** le doigt appuie (sinon il montre seulement) */
  appui?: boolean;
  /** apres l'appui, cet onglet s'ouvre (le cadre suit l'onglet, qui grandit, sans voile) */
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
  // ── Accueil, de haut en bas ──
  { partie: 'accueil', titre: traduire('Bienvenue dans YOROI'), texte: traduire('Salut, et bienvenue dans YOROI. Je te fais faire le tour de l’app, écran par écran. Regarde où je touche.'), voix: null, sticker: 'kabuto', onglet: 'index', haut: true },
  { partie: 'accueil', titre: traduire('Tes réglages'), texte: traduire('Touche ta photo pour ouvrir tes réglages. Dans l’aide, tu peux revoir cette visite.'), voix: 14, sticker: 'aide', onglet: 'index', haut: true, cible: 'accueil.profil', appui: true },
  { partie: 'accueil', titre: traduire('Ta scène'), texte: traduire('Voici ta scène. Touche le décor pour ouvrir Ta scène et en choisir un autre.'), voix: null, sticker: 'fuji', onglet: 'index', cible: 'accueil.scene', doigt: { x: 0.3, y: 0.45 }, appui: true },
  { partie: 'accueil', titre: traduire('Ton personnage'), texte: traduire('Et touche ton personnage pour ouvrir Ton personnage et le changer quand tu veux.'), voix: null, sticker: 'kimono', onglet: 'index', cible: ['accueil.personnage', 'accueil.scene'], dans: 'accueil.scene', doigt: { x: 0.5, y: 0.45 }, appui: true },
  { partie: 'accueil', titre: traduire('Ton poids'), texte: traduire('Ton poids du jour, et ton chemin vers ton objectif en quatre paliers. Chaque palier franchi se coche, jusqu’au torii.'), voix: null, sticker: 'balance', onglet: 'index', cible: 'accueil.poids', pagePoids: 0 },
  { partie: 'accueil', titre: traduire('Ta courbe'), texte: traduire('Glisse la carte pour voir ta courbe. Choisis ta période, et garde le doigt appuyé sur la courbe pour lire chaque pesée.'), voix: null, sticker: 'torii_courbe', onglet: 'index', cible: 'accueil.poids', pagePoids: 1 },
  { partie: 'accueil', titre: traduire('Tes outils'), texte: traduire('Sous ton poids, tes outils : le Coach, le chrono, tes cartes à partager, tes objectifs, ton carnet, tes records et le combat. Glisse pour tous les voir.'), voix: null, sticker: 'chrono', onglet: 'index', cible: 'accueil.outils' },
  { partie: 'accueil', titre: traduire('Ton coach'), texte: traduire('Le premier, c’est ton Coach, encore en bêta : ton programme, ta séance du jour et tes questions.'), voix: null, sticker: 'coach', onglet: 'index', cible: 'accueil.coach', appui: true },
  { partie: 'accueil', titre: traduire('Ta semaine'), texte: traduire('Ta semaine, jour par jour : dehors ton exercice, dedans tes pas. Touche la carte pour ouvrir tes séances.'), voix: null, sticker: 'calendrier', onglet: 'index', cible: 'accueil.semaine' },
  { partie: 'accueil', titre: traduire('Personnalise ton accueil'), texte: traduire('Tout en bas, personnalise ton accueil : Tes blocs, pour montrer, cacher et ranger ce que tu vois, et Tout personnaliser, pour ta scène, tes courbes, tes widgets et ton icône.'), voix: null, sticker: 'eventail', onglet: 'index', cible: 'accueil.personnaliser' },
  // ── la barre, dans l'ordre de la visite ──
  { partie: 'barre', titre: traduire('Ta barre'), texte: traduire('En bas, ta barre : Accueil, Séances, le bouton plus, Progrès et Dojo. On les visite dans cet ordre.'), voix: null, sticker: 'lanterne_plan', onglet: 'index', haut: true, cible: 'onglet.barre', sansDoigt: true },
  // ── Séances ──
  { partie: 'seances', titre: traduire('Séances'), texte: traduire('L’onglet Séances garde tout ton historique, ta semaine et ta dernière séance.'), voix: 10, sticker: 'musculation', cible: 'onglet.seances', appui: true, ouvre: 'seances' },
  { partie: 'seances', titre: traduire('Ta semaine'), texte: traduire('En haut, ta semaine en un coup d’œil. Plus bas, ton prochain entraînement, ton programme et ton mois.'), voix: 20, sticker: 'objectif_semaine', onglet: 'seances', haut: true, cible: 'seances.semaine' },
  { partie: 'seances', titre: traduire('Ton prochain entraînement'), texte: traduire('Dessous, ton prochain entraînement prévu et ton programme en cours. Touche pour ouvrir ton planning ou tes programmes.'), voix: null, sticker: 'calendrier', onglet: 'seances', cible: ['seances.prochain', 'seances.programme'], avec: 'seances.programme' },
  { partie: 'seances', titre: traduire('Ta dernière séance'), texte: traduire('Ta dernière séance en détail : durée, charges et exercices. Touche la carte pour tout revoir.'), voix: null, sticker: 'repeter', onglet: 'seances', cible: 'seances.derniere' },
  { partie: 'seances', titre: traduire('Ton mois'), texte: traduire('Ton mois en calendrier, avec le logo de ton club sur chaque jour d’entraînement.'), voix: null, sticker: 'lanterne_papier', onglet: 'seances', cible: 'seances.mois' },
  { partie: 'seances', titre: traduire('Ton historique'), texte: traduire('Tout en bas, ton historique, par semaine ou par mois, avec la recherche et un filtre par sport.'), voix: null, sticker: 'carnet', onglet: 'seances', cible: 'seances.historique', avec: 'seances.filtres' },
  // ── le bouton plus, puis dedans ──
  { partie: 'plus', titre: traduire('Le bouton plus'), texte: traduire('Au centre de ta barre, le bouton plus : c’est ici que tu notes tout. Je l’ouvre pour toi.'), voix: null, sticker: 'noter', cible: 'onglet.plus', appui: true, ouvreMenu: true },
  { partie: 'plus', titre: traduire('Ta séance du jour'), texte: traduire('En haut, ta séance du jour : ton programme ou ton créneau prévu. Pas encore de programme ? Tu en choisis un ici.'), voix: null, sticker: 'coach', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.jour' },
  { partie: 'plus', titre: traduire('Trois onglets'), texte: traduire('Dessous, trois onglets : Séance, Poids et Mensurations. Tu choisis ce que tu veux noter.'), voix: null, sticker: 'balance', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.onglets' },
  { partie: 'plus', titre: traduire('Noter une séance'), texte: traduire('Tu viens de t’entraîner ? Touche ici, choisis ton sport, et ta séance est notée en quelques secondes.'), voix: 6, sticker: 'musculation', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.seance', appui: true },
  { partie: 'plus', titre: traduire('Dicte ou en direct'), texte: traduire('Tu peux aussi dicter ta séance en une phrase, ou la faire en direct avec le chrono et le repos.'), voix: 18, sticker: 'chrono', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.facons' },
  { partie: 'plus', titre: traduire('Autres façons'), texte: traduire('Plus bas, d’autres façons : refaire ta dernière séance, une séance passée, un import, ou YOROI qui te dit quoi faire.'), voix: null, sticker: 'repeter', menuPlus: true, ongletPlus: 'seance', cible: 'ajouter.autres' },
  { partie: 'plus', titre: traduire('Poids et mensurations'), texte: traduire('Dans Poids, ta pesée à la main, en photo de ta balance, ou ta composition. Dans Mensurations, ta taille, tes bras et tes cuisses au ruban.'), voix: null, sticker: 'metre_ruban', menuPlus: true, ongletPlus: 'poids', puisOngletPlus: 'mesures', cible: 'ajouter.onglets', avec: 'ajouter.detail', appui: true },
  // ── Progrès ──
  { partie: 'progres', titre: traduire('Progrès'), texte: traduire('Dans Progrès, tu retrouves tes courbes, ton corps, ta force et tes records.'), voix: 11, sticker: 'records', cible: 'onglet.progres', appui: true, ouvre: 'progres' },
  { partie: 'progres', titre: traduire('Ta vue d’ensemble'), texte: traduire('Chaque tuile, c’est une partie de ta progression. Touche une tuile pour voir le détail.'), voix: 21, sticker: 'bilan', onglet: 'progres', haut: true, cible: 'progres.ensemble' },
  { partie: 'progres', titre: traduire('Tes bilans et tes records'), texte: traduire('Tes bilans de la semaine et du mois, puis tes records, tes meilleures marques du moment.'), voix: null, sticker: 'trophee', onglet: 'progres', cible: ['progres.bilans', 'progres.records'], avec: 'progres.records' },
  { partie: 'progres', titre: traduire('Cinq onglets'), texte: traduire('Plus bas, cinq onglets : Corps, Force, Cardio, Santé et Photos, chacun avec ses courbes et son détail.'), voix: null, sticker: 'corps', onglet: 'progres', cible: 'progres.onglets' },
  // ── Dojo ──
  { partie: 'dojo', titre: traduire('Le Dojo'), texte: traduire('Le Dojo, c’est ton chemin de guerrier : ton rang, tes sceaux et tes récompenses.'), voix: 12, sticker: 'torii', cible: 'onglet.dojo', appui: true, ouvre: 'dojo' },
  { partie: 'dojo', titre: traduire('Ton rang'), texte: traduire('Ton personnage et ton rang. Touche la scène pour voir tout ton chemin, rang après rang.'), voix: null, sticker: 'kabuto', onglet: 'dojo', haut: true, cible: 'dojo.rang' },
  { partie: 'dojo', titre: traduire('Ta série et ton coffre'), texte: traduire('Chaque jour, un petit geste fait grandir ta série. Ton geste fait, ouvre ton coffre du jour.'), voix: null, sticker: 'coffre_ferme', onglet: 'dojo', cible: 'dojo.aujourdhui' },
  { partie: 'dojo', titre: traduire('Ta prochaine récompense'), texte: traduire('Chaque séance te donne de l’XP. Ton rang monte, et ta prochaine récompense se construit pièce par pièce.'), voix: 22, sticker: 'medaille_or', onglet: 'dojo', cible: 'dojo.recompense' },
  { partie: 'dojo', titre: traduire('La visite du Dojo'), texte: traduire('Le Dojo a sa propre visite, avec sa voix : touche le point d’interrogation, en haut, quand tu veux.'), voix: null, sticker: 'aide', onglet: 'dojo', haut: true, cible: 'dojo.aide' },
  // ── la fin ──
  { partie: 'fin', titre: traduire('À toi de jouer'), texte: traduire('À toi de jouer. Commence par noter ton poids du jour avec le bouton plus.'), voix: 15, sticker: 'gong', onglet: 'index', haut: true },
];

/** Titres des etapes, pour le Studio */
export const VISITE_TITRES = ETAPES.map((e) => e.titre);

/** Les ancres d'une etape, dans l'ordre d'essai */
export function ciblesDe(e: Etape): string[] {
  if (!e.cible) return [];
  return Array.isArray(e.cible) ? e.cible : [e.cible];
}

/** Les ancres entourees avec la premiere */
export function avecDe(e: Etape): string[] {
  if (!e.avec) return [];
  return Array.isArray(e.avec) ? e.avec : [e.avec];
}

/** Le numero de l'etape dans sa partie et le nombre d'etapes de la partie (« Accueil, 3 sur 10 ») */
export function rangDansPartie(i: number): { n: number; sur: number } {
  const p = ETAPES[i]?.partie;
  const memes = ETAPES.map((e, k) => (e.partie === p ? k : -1)).filter((k) => k >= 0);
  return { n: memes.indexOf(i) + 1, sur: memes.length };
}

/** Temps de lecture d'une bulle sans voix enregistree (ms), avant de passer seul a la suivante */
export function tempsDeLecture(texte: string, vitesse = 1): number {
  const ms = 1800 + texte.length * 62;
  return Math.round(Math.max(4500, Math.min(12000, ms)) / Math.max(1, vitesse));
}
