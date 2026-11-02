/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : l'analyse de ta photo (visages, silhouette, lumiere).
 *
 * Phase JavaScript : il n'y a pas encore de module photo natif (modules/yoroi-photo viendra en phase native,
 * Vision sur iPhone, ML Kit sur Android). analyserPhoto repond donc toujours la reponse vide de secours :
 * aucun visage, aucune silhouette, aucun masque. La carte se rabat sur la zone sure (zoneVisage.ts, protection.ts)
 * et sur ton recadrage au doigt dans le studio. Rien ne quitte le telephone, aucune photo n'est envoyee.
 *
 * A+ (le chiffre derriere ta silhouette detouree) reste eteint : APLUS_ACTIF est faux tant que la mesure Apple
 * n'a pas parle. Aucune composition A+ ne peut etre proposee ni dessinee (familles.ts, CarteMoteur.tsx).
 */
import { Image } from 'react-native';
import type { PhotoMesuree } from './protection';

/** A+ est desactive : la composition ne peut pas etre affichee */
export const APLUS_ACTIF = false as const;

/** Une boite en part de la photo, de 0 a 1, origine en haut a gauche */
export type BoitePart = { x: number; y: number; l: number; h: number };

export type AnalysePhoto = {
  visages: BoitePart[];
  /** la silhouette, en part de la photo, null sans detourage */
  corps: BoitePart | null;
  /** au moins un visage confirme de face, null si on ne sait pas */
  frontal: boolean | null;
  /** masque de la silhouette pour A+ : toujours null dans cette phase */
  masque: null;
  /** lumiere moyenne du bas de la photo, de 0 a 1, null si inconnue */
  lumiere: number | null;
};

/** La reponse vide de secours : rien de detecte */
export const ANALYSE_VIDE: AnalysePhoto = Object.freeze({ visages: [], corps: null, frontal: null, masque: null, lumiere: null }) as AnalysePhoto;

/**
 * Analyse une photo. Sans module natif : toujours la reponse vide de secours, jamais d'erreur, jamais d'attente.
 */
export async function analyserPhoto(_uri: string | null | undefined): Promise<AnalysePhoto> {
  return { ...ANALYSE_VIDE, visages: [] };
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
