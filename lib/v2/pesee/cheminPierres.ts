/**
 * Le chemin de pierres vers le torii : la source unique de ses couleurs, de ses mesures et de son decoupage en paliers
 * (28 octobre 2026). La carte Ton poids de l'accueil (components/yoroi/v2/accueil/CartePoids.tsx) et l'onglet Progres
 * dessinent tous deux le chemin avec components/yoroi/v2/charts/CheminPierres.tsx, qui lit tout ici : les deux
 * changent ensemble.
 * Couleurs C « de l'aube au soleil » (maquette Carte2-C, choisie par Houari) : bleu nuit doux, lilas, peche clair, or
 * lumineux, et le torii dore avec un halo a l'arrivee. Aucune arrivee rouge.
 * Ancienne palette (menthe, bleu, lilas, peche, torii vermillon) : _archive_ancien_design_2026-10-09/carte_poids_v3_2026-10-28.
 *
 * Fichier pur (les textes passent par traduire).
 */
import { traduire } from '@/lib/i18n/tr';
import { formatKg } from '@/lib/v2/weightStats';

/** Les paliers du chemin : 25, 50, 75 et 100 % (le dernier, ton objectif, porte le torii) */
export const PALIERS_CHEMIN = [0.25, 0.5, 0.75, 1] as const;

/**
 * Decoupage en paliers, pour l'affichage seulement : le poids de chaque palier entre ton debut et ton objectif,
 * s'il est franchi (ta part du chemin l'a atteint) et le prochain a franchir, avec ce qu'il reste jusqu'a lui.
 */
export function paliersDuChemin(depart: number, objectif: number, actuel: number, part: number): { part: number; kg: number; franchi: boolean }[] & { prochain?: { kg: number; encore: number; dernier: boolean } | null } {
  const l = PALIERS_CHEMIN.map((f) => ({ part: f, kg: Math.round((depart + (objectif - depart) * f) * 10) / 10, franchi: part >= f - 1e-6 }));
  const suivant = l.find((x) => !x.franchi);
  return Object.assign(l, { prochain: suivant ? { kg: suivant.kg, encore: Math.max(0, Math.round(Math.abs(actuel - suivant.kg) * 10) / 10), dernier: suivant.part === 1 } : null });
}

/**
 * Les 4 pierres, une par quart. plein : la pierre remplie ; pale : la pierre a venir (clair, sombre) ; texte : le chiffre
 * du palier franchi, la pastille « Prochain palier » et ton poids pendant l'etape (clair, sombre).
 */
export const PIERRES_CHEMIN = [
  { plein: '#8C9BDE', pale: '#DEE2F7', paleSombre: '#262C4A', texte: '#34449A', texteSombre: '#A7B3EE' },
  { plein: '#C3A8F0', pale: '#ECE3FB', paleSombre: '#33294A', texte: '#6A3FB0', texteSombre: '#CDB6F4' },
  { plein: '#F8BE98', pale: '#FDE9DC', paleSombre: '#43301F', texte: '#A8541A', texteSombre: '#F9C7A6' },
  { plein: '#F6C83A', pale: '#FDF0C2', paleSombre: '#3D3212', texte: '#855800', texteSombre: '#F6CF5C' },
] as const;

/** Le torii dore de l'arrivee : son or, le trait sombre de son toit, son contour et son halo une fois atteint */
export const TORII_CHEMIN = { or: '#F0B323', trait: '#7A4E00', contour: '#FFFFFF', halo: '#F6C83A' } as const;

/** Mesures de la barre : pierres de 11, jour de 14 autour de chaque lanterne, lanterne de 19 sur 27, torii de 26 */
export const BARRE_PIERRES = { hauteur: 30, pierre: 11, jour: 14, lanterneL: 19, lanterneH: 27, torii: 26, halo: 56, chiffres: 15, ecartChiffres: 2 } as const;

/**
 * L'apercu du chemin sans cap (28 octobre 2026) : des points ronds de 5 tous les 9 points, dans la couleur de chaque
 * pierre (a 55 % en clair, 45 % en sombre), et le torii gris doux (a 90 %). Meme hauteur que la barre (30) : rien ne bouge
 * quand tu fixes ton cap et que la vraie barre prend sa place.
 */
export const APERCU_CHEMIN = { point: 5, pas: 9, opacite: 0.55, opaciteSombre: 0.45, torii: 0.9 } as const;

/** L'etape en cours (0 a 3) pour une part du chemin : la pierre du prochain palier a franchir, la derniere une fois arrive */
export function pierreEnCours(part: number): number {
  return Math.max(0, Math.min(3, Math.floor(Math.max(0, part) / 0.25 + 1e-6)));
}

/** Melange de deux couleurs #RRGGBB */
export function melange(a: string, b: string, t: number): string {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + ca.map((x, k) => Math.round(x + (cb[k] - x) * t).toString(16).padStart(2, '0').toUpperCase()).join('');
}

/** La piste d'un arc de l'anneau : la pierre a venir, un peu plus soutenue pour rester visible sur le voile */
export function pisteAnneau(i: number, sombre: boolean): string {
  const p = PIERRES_CHEMIN[i];
  return sombre ? melange(p.paleSombre, p.plein, 0.25) : melange(p.pale, p.plein, 0.3);
}

/**
 * Ton poids dans la couleur de l'etape en cours (maquette C). L'or de la derniere etape (#855800) passe a #A87300,
 * l'or lumineux de la maquette. Sur le voile lilas de la carte (#E9E4FF) : 7,0 (bleu nuit), 5,8 (lilas), 4,3 (peche)
 * et 3,3 (or) a 1, au dessus du seuil AA de 3 a 1 du gros texte (le poids est en 30 gras). Un or plus sombre
 * (#946500, 4,1 a 1) tirait sur le kaki.
 */
export function couleurEtape(part: number, atteint: boolean, sombre: boolean): string {
  const p = PIERRES_CHEMIN[atteint ? 3 : pierreEnCours(part)];
  if (sombre) return p.texteSombre;
  return p.texte === '#855800' ? '#A87300' : p.texte;
}

// ============ les 3 etats d'une pierre (28 octobre 2026, Houari : « on ne sait pas si c'est atteint ou pas ») ============
// FAITE : pleine, couleur franche, reflet, lanterne de fin allumee avec une coche. EN COURS : la partie faite en couleur
// franche, le reste en contour pointille de sa couleur, et le marqueur « tu es ici » au poids actuel. A VENIR : vide,
// contour pointille gris bleu, lanterne eteinte, chiffre gris. Au tout debut, la premiere pierre est en cours.

export type EtatPierre = 'faite' | 'en_cours' | 'a_venir';

/** L'etat de chacune des 4 pierres pour une part du chemin ; torii atteint : les 4 faites */
export function etatsPierres(part: number, atteint: boolean): EtatPierre[] {
  if (atteint) return ['faite', 'faite', 'faite', 'faite'];
  const p = Math.max(0, Math.min(1, part));
  const enCours = pierreEnCours(p);
  return [0, 1, 2, 3].map((i) => {
    if (i < enCours) return 'faite';
    // la derniere pierre remplie a 100 % sans torii atteint (poids d'aujourd'hui sur l'objectif, tendance pas encore) : en cours
    if (i === enCours) return 'en_cours';
    return 'a_venir';
  });
}

/**
 * Les couleurs des etats. franc : la couleur franche (couleurs C un cran plus saturees) des pierres faites et de la part
 * faite de la pierre en cours ; contourEnCours : le pointille du reste de la pierre en cours ; aVenir : le pointille gris
 * bleu des pierres a venir ; toriiGris : le torii tant qu'il n'est pas atteint (corps, trait).
 */
export const ETATS_CHEMIN = {
  franc: ['#7488DA', '#AE8BEC', '#F5A36F', '#F4BB22'],
  aVenir: { clair: '#B7C1DC', sombre: '#4D5679' },
  pointille: { trait: 3, vide: 3, epaisseur: 1.6 },
  toriiGris: { clair: { or: '#C9CEDF', trait: '#8C93AE', contour: '#FFFFFF' }, sombre: { or: '#4F5678', trait: '#7C84A6', contour: '#1A1E29' } },
  marqueur: { taille: 13, bord: 3 },
  coche: 11,
  libelle: { taille: 10.5, largeur: 46 },
} as const;

/** Le poids ou tu en es sur le chemin, a partir de ta part (meme regle que la barre) */
export function poidsSurChemin(depart: number, objectif: number, part: number): number {
  return depart + (objectif - depart) * Math.max(0, Math.min(1, part));
}

/**
 * Ou poser « Tu es ici » dans la ligne des chiffres, sans toucher aucun chiffre : null s'il n'y a pas la place.
 * largeur : la largeur de la barre ; x : la position du marqueur ; chiffres : les intervalles occupes [debut, fin].
 */
export function placerTuEsIci(largeur: number, x: number, chiffres: [number, number][], l: number = ETATS_CHEMIN.libelle.largeur, marge = 4): number | null {
  const debut = Math.max(0, Math.min(largeur - l, x - l / 2));
  const fin = debut + l;
  if (debut < 0 || fin > largeur) return null;
  for (const [a, b] of chiffres) if (fin + marge > a && debut - marge < b) return null;
  return debut;
}

/** Largeur approximative d'un chiffre du chemin (11,5 points, chiffres tabulaires, environ 6,9 points par caractere) */
export function largeurChiffre(t: string): number {
  return Math.ceil(t.length * 6.9);
}

/**
 * Ce que dit le lecteur d'ecran du chemin : l'etat de chaque palier (« Palier 1 franchi, palier 2 en cours, encore
 * 1,2 kg, palier 3 a venir, ton objectif a venir »), ou « Les 4 paliers franchis, torii atteint ».
 */
export function texteEtatsChemin(depart: number, objectif: number, part: number, atteint: boolean): string {
  if (atteint) return traduire('Les 4 paliers franchis, torii atteint');
  const etats = etatsPierres(part, atteint);
  const actuel = poidsSurChemin(depart, objectif, part);
  const l = paliersDuChemin(depart, objectif, actuel, part);
  return etats
    .map((e, i) => {
      const n = i + 1;
      if (e === 'faite') return traduire('palier {0} franchi', n);
      if (e === 'en_cours') return traduire('palier {0} en cours, encore {1} kg', n, formatKg(Math.max(0, Math.round(Math.abs(actuel - l[i].kg) * 10) / 10)));
      return i === 3 ? traduire('ton objectif à venir') : traduire('palier {0} à venir', n);
    })
    .join(', ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Le torii au centre de l'anneau : sa largeur et son decalage vers le bas, en part de la taille de l'anneau. A 38 : 20 de
 * large (17,4 de haut), dont la diagonale (26,5) tient dans le rond interieur (2 x (0,39 - 0,055) x 38 = 25,5) parce que
 * les coins de l illustration sont vides ; une marge haute de 1 point le pose 0,5 point plus bas que le centre.
 */
export const TORII_ANNEAU = { largeur: 0.53, decalage: 0.026 } as const;
