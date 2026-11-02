/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : l'analyse de ta photo (visages, silhouette, lumiere).
 *
 * Phase native (proposition) : le module photo (modules/yoroi-photo) fait le travail sur l'appareil.
 * iPhone, iPad, Mac : Apple Vision. Android : Google ML Kit, modeles dans l'app. Rien ne quitte l'appareil.
 * Le critere A+ (critereAplus.ts) est le meme code JavaScript partout : A+, A ou Secours, avec la raison.
 *
 * Sans module (Expo Go, tests, build sans le module) ou en cas d'echec : la reponse vide de secours, comme avant.
 * La carte se rabat sur la zone sure (zoneVisage.ts, protection.ts) et sur ton recadrage au doigt dans le studio.
 *
 * A+ (le chiffre derriere ta silhouette detouree) reste eteint tant que APLUS_ACTIF est faux : le niveau est mesure,
 * mais aucune composition A+ n'est proposee ni dessinee (familles.ts, CarteMoteur.tsx).
 */
import { Image } from 'react-native';
import { analyserPhoto as analyserNatif, decoderPixels } from '@/modules/yoroi-photo';
import type { ReponseNative } from '@/modules/yoroi-photo';
import type { PhotoMesuree } from './protection';
import { boiteCorps, critereAplus, visagesFiables } from './critereAplus';
import type { MasqueGris, NiveauCarte } from './critereAplus';

/** A+ est desactive : la composition ne peut pas etre affichee (decision a part, apres le banc) */
export const APLUS_ACTIF = false as const;

/**
 * Interrupteur du module photo. Faux : analyserPhoto rend toujours la reponse vide, sans appeler le natif,
 * et la carte retombe sur la zone sure et ton recadrage au doigt, comme avant la phase native. Retour arriere sans build natif.
 */
export const MODULE_PHOTO_ACTIF: boolean = true;

/** Une boite en part de la photo, de 0 a 1, origine en haut a gauche */
export type BoitePart = { x: number; y: number; l: number; h: number };

/** Le masque de la silhouette, pour dessiner A+ : PNG gris dans cacheDirectory/cartes_tmp/masques/ */
export type MasquePhoto = { uri: string; largeur: number; hauteur: number; personnes: number | null };

export type AnalysePhoto = {
  visages: BoitePart[];
  /** la silhouette, en part de la photo, null sans detourage */
  corps: BoitePart | null;
  /** au moins un visage confirme de face, null si on ne sait pas */
  frontal: boolean | null;
  /** masque de la silhouette pour A+, null sans detourage */
  masque: MasquePhoto | null;
  /** lumiere moyenne du bas de la photo, de 0 a 1, null si inconnue */
  lumiere: number | null;
  /** le niveau mesure par le critere A+, et pourquoi */
  niveau: NiveauCarte;
  raisons: string[];
  /** d'ou vient la mesure, null sans module */
  source: { plateforme: string; moteur: string; versionModele: string } | null;
};

/** La reponse vide de secours : rien de detecte */
export const ANALYSE_VIDE: AnalysePhoto = Object.freeze({
  visages: [],
  corps: null,
  frontal: null,
  masque: null,
  lumiere: null,
  niveau: 'Secours',
  raisons: [],
  source: null,
}) as AnalysePhoto;

/** Un visage est de face si sa tete tourne de moins de 30 degres, ou si yeux, nez et bouche sont bien places */
export const LACET_MAX_DE_FACE = 30;

function reperesPlausibles(v: ReponseNative['visages'][number]): boolean {
  const r = v.reperes;
  if (!r || !r.oeilGauche || !r.oeilDroit || !r.nez || !(r.boucheBas || (r.boucheGauche && r.boucheDroite))) return false;
  const yeux = Math.max(r.oeilGauche.y, r.oeilDroit.y);
  const bouche = r.boucheBas ? r.boucheBas.y : (r.boucheGauche.y + r.boucheDroite.y) / 2;
  const ecart = Math.abs(r.oeilDroit.x - r.oeilGauche.x) / Math.max(v.w, 1e-6);
  // la meme regle que frontal.py (v10) : yeux au-dessus du nez, nez au-dessus de la bouche, yeux assez ecartes
  return yeux < r.nez.y && r.nez.y < bouche && ecart >= 0.25 && ecart <= 0.7;
}

function deFace(visages: ReponseNative['visages']): boolean | null {
  if (!visages.length) return null;
  let sait = false;
  for (const v of visages) {
    if (typeof v.lacet === 'number') {
      sait = true;
      if (Math.abs(v.lacet) <= LACET_MAX_DE_FACE) return true;
    }
    if (v.reperes) {
      sait = true;
      if (reperesPlausibles(v)) return true;
    }
  }
  return sait ? false : null;
}

/** La reponse du module vers l'analyse de la carte. Fonction pure : testee sans telephone */
export function depuisReponse(r: ReponseNative): AnalysePhoto {
  const retenus = visagesFiables(r.visages);
  const pixels = decoderPixels(r.masque);
  const masqueGris: MasqueGris | null = r.masque && pixels ? { largeur: r.masque.largeur, hauteur: r.masque.hauteur, donnees: pixels } : null;
  const rapport = r.largeurPhoto > 0 && r.hauteurPhoto > 0 ? r.hauteurPhoto / r.largeurPhoto : r.largeur > 0 ? r.hauteur / r.largeur : undefined;
  const critere = critereAplus(masqueGris, retenus, rapport);
  // sans fichier PNG, A+ ne peut pas etre dessine : on repasse sur A
  const sansFichier = critere.niveau === 'A+' && !(r.masque && r.masque.uri);
  return {
    visages: retenus.map((v) => ({ x: v.x, y: v.y, l: v.w, h: v.h })),
    corps: boiteCorps(masqueGris),
    frontal: deFace(retenus),
    masque: r.masque && pixels && r.masque.uri ? { uri: r.masque.uri, largeur: r.masque.largeur, hauteur: r.masque.hauteur, personnes: r.masque.personnes } : null,
    lumiere: r.lumiere,
    niveau: sansFichier ? 'A' : critere.niveau,
    raisons: sansFichier ? [...critere.raisons, 'masque non enregistré'] : critere.raisons,
    source: r.moteur ? { plateforme: r.plateforme ?? '', moteur: r.moteur, versionModele: r.versionModele } : null,
  };
}

/**
 * Analyse une photo. Jamais d'erreur, jamais d'attente sans fin : la reponse vide de secours si le module manque ou echoue.
 */
export async function analyserPhoto(uri: string | null | undefined): Promise<AnalysePhoto> {
  try {
    if (!uri || !MODULE_PHOTO_ACTIF) return { ...ANALYSE_VIDE, visages: [], raisons: [] };
    const r = await analyserNatif(uri);
    if (!r.moteur) return { ...ANALYSE_VIDE, visages: [], raisons: [] };
    return depuisReponse(r);
  } catch {
    return { ...ANALYSE_VIDE, visages: [], raisons: [] };
  }
}

/** Le niveau de carte a montrer : A+ seulement si A+ est active ET mesure ; sinon A avec un visage, sinon Secours */
export function niveauAffiche(a: AnalysePhoto | null | undefined): NiveauCarte {
  if (!a || !a.visages.length) return 'Secours';
  return APLUS_ACTIF && a.niveau === 'A+' ? 'A+' : 'A';
}

/** La taille de la photo en pixels (pour le cadrage), null si elle ne se lit pas */
export function taillePhoto(uri: string): Promise<{ w: number; h: number } | null> {
  return new Promise((ok) => {
    try {
      Image.getSize(uri, (w, h) => ok(w > 0 && h > 0 ? { w, h } : null), () => ok(null));
    } catch {
      ok(null);
    }
  });
}

/** L'analyse ramenee en pixels de la photo, pour protection.ts */
export function photoMesuree(a: AnalysePhoto | null | undefined, w: number, h: number): PhotoMesuree {
  const x = a ?? ANALYSE_VIDE;
  return {
    w,
    h,
    visages: x.visages.map((v) => [v.x * w, v.y * h, v.l * w, v.h * h] as [number, number, number, number]),
    corps: x.corps ? [x.corps.x * w, x.corps.y * h, (x.corps.x + x.corps.l) * w, (x.corps.y + x.corps.h) * h] : null,
    frontal: x.frontal,
  };
}
