/**
 * Geometrie des decorations de saison posees au bout de la ligne de la citation (18 octobre 2026, v3).
 * Houari : aucun espace en plus, la mise en page de l'accueil reste exactement celle d'avant les saisons.
 * La citrouille et le kadomatsu sont en position absolue dans le bloc de tes outils, derriere eux.
 *
 * Les mesures de l'accueil reprises ici (verifiees contre le code par __tests__/unit/saisonsAccueil.test.ts) :
 *   app/(tabs)/index.tsx            : marge laterale 22, ecart entre les blocs 12
 *   accueil/Grille.tsx, LigneConseil : hauteur 20, remonte de 18, retrait 2 de chaque cote
 *   accueil/Citation.tsx             : trait de pinceau d'au moins 18, ecart de 9 avec le texte
 *   accueil/Raccourcis.tsx           : haut 4, ronds de 62, libelle a 6 sous le rond sur 2 lignes de 15, bas 2
 *
 * 19 octobre 2026 : la scene de l'accueil devient une fenetre (accueil/Scene.tsx), tes outils commencent
 * ECART_SOUS_SCENE (8) points sous elle. Tes outils, la ligne de la citation et Ton poids descendent ensemble, sans
 * rien changer entre eux : toutes les boites ci dessous, mesurees depuis le bas de tes outils ou le haut de la carte,
 * restent justes. Seuls les seuils de defilement de l'accueil ajoutent l'ecart. Sur la scene, les vols restent au
 * dessus du bandeau de ton salut (BAS_VOL, verifie par le test).
 *
 * Fichier pur.
 */

export const ACCUEIL = { marge: 22, ecart: 12 };
/** 19 octobre 2026 : l'ecart entre la fenetre de la scene et tes outils (accueil/Scene.tsx, ECART_SOUS_SCENE) */
export const SOUS_SCENE = 8;
/** Le bandeau de ton salut en bas de la scene : photo de 58, 14 au dessus du bord (accueil/Scene.tsx, BANDEAU) */
export const BANDEAU_SALUT = { photo: 58, bas: 14 };
export const LIGNE = { hauteur: 20, remonte: 18, retrait: 2, traitMin: 18, ecartTexte: 9 };
export const OUTILS = { haut: 4, rond: 62, ecartLibelle: 6, ligneLibelle: 15, lignesMax: 2, bas: 2 };

/** Le trait de pinceau, en points sous le bas du bloc de tes outils : 12 - 18 + 10 = 4 */
export const LIGNE_SOUS_OUTILS = ACCUEIL.ecart - LIGNE.remonte + LIGNE.hauteur / 2;

/** Bas des ronds de tes outils, en points au dessus du bas du bloc : 2 + 15 x 2 + 6 = 38 */
export const RONDS_AU_DESSUS = OUTILS.bas + OUTILS.ligneLibelle * OUTILS.lignesMax + OUTILS.ecartLibelle;

/**
 * Le calque deborde de BAS_CALQUE points sous tes outils, sur HAUT_CALQUE de haut.
 * v5 (18 octobre 2026) : 84 de haut, pour que le squelette et le bonhomme de neige montent au dessus de la tombe
 * et du kadomatsu, dans la colonne libre a gauche du premier rond.
 */
export const BAS_CALQUE = 16;
export const HAUT_CALQUE = 84;
/** Le bas de tes outils, dans le calque */
export const ORIGINE_OUTILS = HAUT_CALQUE - BAS_CALQUE;
/** Le sol dans le calque : le milieu du trait de pinceau (tombe, chat, kadomatsu y sont poses) */
export const SOL = ORIGINE_OUTILS + LIGNE_SOUS_OUTILS;
/** v3 et v4, gardes pour l'historique (plus utilises par le decor) : leur calque faisait 70 de haut, le sol a 61 */
const ORIGINE_V4 = 70 - BAS_CALQUE;
const SOL_V4 = ORIGINE_V4 + LIGNE_SOUS_OUTILS + 3;
/** La citrouille finit a 2 points du bord droit de l'ecran */
export const MARGE_DROITE = 2;

/** Taille de la citrouille (dessin 60 x 54) et du kadomatsu (dessin 40 x 60) */
export const CITROUILLE = { w: 46, h: (46 * 54) / 60 };
export const KADOMATSU = { w: 30, h: 45 };

/** Le texte de la citation finit au plus ici (largeur de l'ecran) : 22 + 2 + 18 + 9 = 51 avant le bord */
export function finTexteMax(largeur: number): number {
  return largeur - ACCUEIL.marge - LIGNE.retrait - LIGNE.traitMin - LIGNE.ecartTexte;
}

/** La citrouille dans le calque ; sousOutils : son haut, en points au dessus du bas de tes outils */
export function boiteCitrouille(largeur: number): { x: number; y: number; w: number; h: number; sousOutils: number } {
  const x = largeur - MARGE_DROITE - CITROUILLE.w;
  const y = SOL_V4 - CITROUILLE.h;
  return { x, y, w: CITROUILLE.w, h: CITROUILLE.h, sousOutils: ORIGINE_V4 - y };
}

/** Le kadomatsu, centre a la place de la citrouille */
export function boiteKadomatsu(largeur: number): { x: number; y: number; w: number; h: number; sousOutils: number } {
  const c = boiteCitrouille(largeur);
  const x = c.x + (CITROUILLE.w - KADOMATSU.w) / 2;
  const y = SOL_V4 - KADOMATSU.h;
  return { x, y, w: KADOMATSU.w, h: KADOMATSU.h, sousOutils: ORIGINE_V4 - y };
}

// ── Bout de la ligne de la citation (v4) ────────────────────────────────────
// Tout reste a droite de finTexteMax (le texte de la citation) : la tombe et son chat, ou le kadomatsu et ses
// cadeaux ; le squelette ou le bonhomme de neige sortent du sol juste a gauche, dans une fenetre qui commence
// a finTexteMax + 1.

/** Fenetre ou sort le squelette ou le bonhomme de neige : x de gauche, largeur ; le sol en bas */
export function fenetreCoucou(largeur: number): { x: number; w: number } {
  const x = finTexteMax(largeur) + 1;
  return { x, w: largeur - MARGE_DROITE - x };
}

export const TOMBE = { w: 32, h: 26 };
export const CHAT = { w: 20, h: 18 };
export const CADEAU = { petit: { w: 12, h: 10 }, grand: { w: 12, h: 12 } };

/** La tombe, au bord droit, posee sur le sol ; le chat assis dessus */
export function boiteTombe(largeur: number) {
  const x = largeur - MARGE_DROITE - TOMBE.w;
  const y = SOL_V4 - TOMBE.h;
  const chat = { x: x + TOMBE.w - CHAT.w - 2, y: y - CHAT.h + 3, w: CHAT.w, h: CHAT.h };
  return { x, y, w: TOMBE.w, h: TOMBE.h, chat, sousOutils: ORIGINE_V4 - chat.y };
}

/** Noel : le kadomatsu au bord droit, un grand cadeau a son pied a droite, un petit devant a gauche */
export function boiteKadomatsuCadeaux(largeur: number) {
  const k = { x: largeur - MARGE_DROITE - 6 - KADOMATSU.w, y: SOL_V4 - KADOMATSU.h, w: KADOMATSU.w, h: KADOMATSU.h };
  const grand = { x: largeur - MARGE_DROITE - CADEAU.grand.w, y: SOL_V4 - CADEAU.grand.h, ...CADEAU.grand };
  const petit = { x: k.x - 4, y: SOL_V4 - CADEAU.petit.h, ...CADEAU.petit };
  return { kadomatsu: k, grand, petit, sousOutils: ORIGINE_V4 - k.y };
}

// ── Carte « Ton poids » (v4) ────────────────────────────────────────────────
// Mesures de components/yoroi/v2/accueil/CartePoids.tsx (verifiees par le test) : marge interieure 18, haut 14,
// rangee « Ton poids » / « pesée du jour » de 20, puis 4, puis le grand chiffre (48, ligne de 62) centre ;
// la pastille de l'ecart commence 8 sous le chiffre.

export const CARTE = { marge: 18, haut: 14, rangee: 20, ecart: 4, ligneChiffre: 62, rayon: 22 };
/** Le grand chiffre : de y = 38 a y = 100 */
export const CHIFFRE = { y: CARTE.haut + CARTE.rangee + CARTE.ecart, h: CARTE.ligneChiffre };
/**
 * Largeur maximale du grand chiffre et de son unite (« 100,0 kg » en 48 chiffres tabulaires, environ 30 points par
 * chiffre, 12 pour la virgule, 23 pour « kg ») : 155, arrondie a 160 par prudence.
 */
export const CHIFFRE_MAX = 160;
/** Une citrouille ou un sapin de chaque cote du chiffre ; v5 : 48 points (Houari : plus grands) */
export const DECOR_CARTE = { w: 48, h: 48, bord: 8 };

export function boitesCarte(largeurCarte: number) {
  const y = CHIFFRE.y + CHIFFRE.h - 2 - DECOR_CARTE.h;
  return {
    gauche: { x: DECOR_CARTE.bord, y, w: DECOR_CARTE.w, h: DECOR_CARTE.h },
    droite: { x: largeurCarte - DECOR_CARTE.bord - DECOR_CARTE.w, y, w: DECOR_CARTE.w, h: DECOR_CARTE.h },
    chiffre: { x: (largeurCarte - CHIFFRE_MAX) / 2, y: CHIFFRE.y, w: CHIFFRE_MAX, h: CHIFFRE.h },
  };
}

/** Les toiles dans les coins du haut de la carte, et leurs araignees qui descendent le long du bord */
export const TOILE_CARTE = 20;
export const ARAIGNEE_CARTE = { taille: 12, x: 1, fil: 7, haut: 16, bas: 34 };
/** La guirlande de Noel le long du bord haut de la carte : fil a 1, ampoules jusqu'a 12 au plus */
export const GUIRLANDE_CARTE = { debut: 26, fil: 1, bas: 12, pas: 22 };

// ── Debut du trait de gauche (v5, 18 octobre 2026) ──────────────────────────
// Houari, sur iPhone 15 Pro Max : au bout de droite, la tombe et le chat touchaient « Records » et le bord de
// l'ecran. A droite, le dernier libelle visible (Records a 430, coupe a 390) ne laisse jamais la place. Tout passe
// donc au debut du trait de gauche, ou la place est la meme sur tous les ecrans (le premier outil est toujours
// au meme endroit) :
//   les ronds : le premier va de 16 + (80 - 62) / 2 = 25 a 87, son bas 38 au dessus du bas de tes outils ;
//   le libelle « Chrono » : centre a 16 + 40 = 56, 12,5 points en Archivo extra gras, 46,1 de large, donc il
//   commence a 33, de 32 a 17 au dessus du bas de tes outils (une ligne de 15, 6 sous le rond).
// Zones libres : a gauche de 25, sur toute la hauteur ; a gauche de 33, jusqu'a 38 au dessus ; sous les
// libelles (17 au dessus) et a gauche du texte de la citation (51), partout.

/** Le premier rond de tes outils : son bord gauche */
export const PREMIER_ROND = 16 + (80 - OUTILS.rond) / 2;
/** Le libelle du premier outil ne commence pas avant (il commence a 33, 1 point de marge) */
export const LIBELLE_GAUCHE = 32;
/** Le bas des libelles, en points au dessus du bas de tes outils */
export const LIBELLES_AU_DESSUS = OUTILS.bas + OUTILS.ligneLibelle;
/** Le texte de la citation commence au plus tot ici (22 + 2 + 18 + 9) */
export const DEBUT_TEXTE_MIN = ACCUEIL.marge + LIGNE.retrait + LIGNE.traitMin + LIGNE.ecartTexte;

export type Boite = { x: number; y: number; w: number; h: number };

/** Halloween : la tombe, le chat assis dessus (a droite), le squelette qui sort derriere (a gauche) */
export const TOMBE_V5 = { w: 24, h: 26, x: 5 };
/** Le chat d'INRO (26 x 30) a l'echelle 0,52 */
export const CHAT_V5 = { k: 0.52, w: 26 * 0.52, h: 30 * 0.52 };
/** Le squelette d'INRO (22 x 30) a 33 de haut */
export const SQUELETTE_V5 = { h: 33, w: (22 * 33) / 30 };
/** Noel : le kadomatsu de 40 de haut, ses deux cadeaux devant, le bonhomme de neige d'INRO (26 x 36) a 32 */
export const KADOMATSU_V5 = { h: 40, w: 25, x: 5 };
export const BONHOMME_V5 = { h: 32, w: (26 * 32) / 36 };
/** Ou le squelette et le bonhomme s'arretent : leur haut, en points au dessus du bas de tes outils */
export const HAUT_COUCOU = { squelette: 46, bonhomme: 52 };

export function decorGaucheHalloween() {
  const tombe: Boite = { x: TOMBE_V5.x, y: SOL - TOMBE_V5.h, w: TOMBE_V5.w, h: TOMBE_V5.h };
  // le chat sur le haut de la tombe, cote droit (le haut arrondi de la tombe est 1,5 sous le haut de sa boite)
  const chat: Boite = { x: tombe.x + tombe.w - CHAT_V5.w, y: tombe.y + 1.5 - CHAT_V5.h, w: CHAT_V5.w, h: CHAT_V5.h };
  const squelette: Boite = { x: 0, y: ORIGINE_OUTILS - HAUT_COUCOU.squelette, w: SQUELETTE_V5.w, h: SQUELETTE_V5.h };
  return { tombe, chat, squelette, fenetre: fenetreCoucouV5() };
}

export function decorGaucheNoel() {
  const kadomatsu: Boite = { x: KADOMATSU_V5.x, y: SOL - KADOMATSU_V5.h, w: KADOMATSU_V5.w, h: KADOMATSU_V5.h };
  const grand: Boite = { x: 0, y: SOL - 14, w: 14, h: 14 };
  const petit: Boite = { x: kadomatsu.x + kadomatsu.w - 3, y: SOL - 11, w: 11, h: 11 };
  const bonhomme: Boite = { x: 1, y: ORIGINE_OUTILS - HAUT_COUCOU.bonhomme, w: BONHOMME_V5.w, h: BONHOMME_V5.h };
  return { kadomatsu, grand, petit, bonhomme, fenetre: fenetreCoucouV5() };
}

/** La fenetre ou monte le coucou : du bord gauche a 34, du haut du calque au sol (il sort du sol) */
export function fenetreCoucouV5(): Boite {
  return { x: 0, y: 0, w: LIBELLE_GAUCHE + 1, h: SOL };
}

/** Le zombie d'INRO (26 x 30) a 23 de haut : les pieds sur le bas du trait, la tete sous les libelles */
export const ZOMBIE_V5 = { h: 23, w: (26 * 23) / 30, pieds: ORIGINE_OUTILS + LIGNE_SOUS_OUTILS + 2.5 };

/** Une boite du calque, en points au dessus du bas de tes outils (son haut) */
export function hautAuDessus(b: Boite): number {
  return ORIGINE_OUTILS - b.y;
}

// ── 27 octobre 2026 : refonte Pastel (maquette Pastel-Final-Accueil, choisie par Houari) ───────────────────
// En haut, sur le fond de la page : ta photo, la date et ton salut, la lanterne et la cloche dans des ronds blancs.
// Dessous, la scene dans une carte arrondie (16 points des bords, rayon 28, ombre douce), puis Ton poids, tes outils
// et Ta semaine, tous a 16 points des bords. Les vols de saison restent dans la carte de la scene, la carte Ton poids
// garde ses toiles, araignees, guirlande, et ses citrouilles ou sapins entre le chiffre et l'anneau.

/** L'accueil Pastel : marge laterale 16, ecart entre les blocs 12 (app/(tabs)/index.tsx) */
export const ACCUEIL_PASTEL = { marge: 16, ecart: 12 };
/** La rangee du haut : 8 points sous l'encoche, ta photo de 48, 12 points avant la carte de la scene */
export const ENTETE_PASTEL = { haut: 8, rangee: 48, ecart: 12 };
/** La carte de la scene : 168 de haut pour 358 de large (maquette), bornee entre 150 et 200 */
export const SCENE_CARTE = { rayon: 28, ratio: 168 / 358, hMin: 150, hMax: 200, solBas: 12 };

/** Hauteur de la carte de la scene pour une largeur de carte */
export function hauteurSceneCarte(largeurCarte: number): number {
  return Math.max(SCENE_CARTE.hMin, Math.min(SCENE_CARTE.hMax, Math.round(largeurCarte * SCENE_CARTE.ratio)));
}

/** Le haut de la carte de la scene, depuis le haut de l'ecran */
export function hautSceneCarte(top: number): number {
  return top + ENTETE_PASTEL.haut + ENTETE_PASTEL.rangee + ENTETE_PASTEL.ecart;
}

/**
 * Recadrage vertical de la scene dans la carte : l'image garde sa largeur, on la remonte au plus de (imgH - H) pour que
 * son sol arrive au plus SCENE_CARTE.solBas points au dessus du bas de la carte (le personnage reste pose dessus).
 */
export function remonteeScene(o: { H: number; imgH: number; sol: number }): number {
  const solY = o.sol * o.imgH;
  return Math.floor(Math.max(0, Math.min(o.imgH - o.H, solY - (o.H - SCENE_CARTE.solBas))));
}

/** Dans la carte, ni lanterne ni cloche : les vols commencent 14 points sous son haut (haut passe a zoneDeVol) */
export const HAUT_VOL_CARTE = 14 - 42;

/** Carte Ton poids Pastel : marge 16, haut 16, petit titre de 15, le chiffre de 40 (ligne de 44), l'anneau de 62 */
// 27 octobre 2026 nuit (Houari : « réduis la taille de ton poids ») : chiffre en 32, anneau de 50, haut 14
export const CARTE_PASTEL = { marge: 16, haut: 12, titre: 15, ecartTitre: 2, ligneChiffre: 31, anneau: 44, rayon: 28 };
/** « 100,0 » en 40 points (environ 24 par chiffre, 9 pour la virgule) et « kg » en 15 : 142, arrondi a 146 */
export const CHIFFRE_PASTEL_MAX = 104;
/** Une citrouille ou un sapin de 40, entre le chiffre et l'anneau */
export const DECOR_PASTEL = { w: 40, h: 40, ecart: 6 };

export function boitesCartePastel(largeurCarte: number): { chiffre: Boite; anneau: Boite; cotes: Boite[]; hauteur: number } {
  const c = CARTE_PASTEL;
  const chiffre: Boite = { x: c.marge, y: c.haut + c.titre + c.ecartTitre, w: CHIFFRE_PASTEL_MAX, h: c.ligneChiffre };
  const anneau: Boite = { x: largeurCarte - c.marge - c.anneau, y: c.haut, w: c.anneau, h: c.anneau };
  const debut = chiffre.x + chiffre.w + DECOR_PASTEL.ecart;
  const fin = anneau.x - DECOR_PASTEL.ecart;
  const place = fin - debut;
  const n = place >= 2 * DECOR_PASTEL.w + DECOR_PASTEL.ecart ? 2 : place >= DECOR_PASTEL.w ? 1 : 0;
  const total = n * DECOR_PASTEL.w + Math.max(0, n - 1) * DECOR_PASTEL.ecart;
  const x0 = debut + (place - total) / 2;
  const y = anneau.y + anneau.h - DECOR_PASTEL.h;
  const cotes: Boite[] = Array.from({ length: n }, (_, i) => ({ x: x0 + i * (DECOR_PASTEL.w + DECOR_PASTEL.ecart), y, w: DECOR_PASTEL.w, h: DECOR_PASTEL.h }));
  return { chiffre, anneau, cotes, hauteur: anneau.y + anneau.h + 2 };
}
