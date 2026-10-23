/**
 * Reglages de la scene animee et de son son (13 octobre 2026), page Reglages, Ta scene.
 * - anime : la video de la scene quand elle en a une (oui par defaut)
 * - ambiance : 'aucune' (par defaut), 'scene' (celle conseillee pour la scene), ou un id de AMBIANCES
 * - musique : 'aucune' (par defaut), ou un id de MUSIQUES
 * - volume : doux par defaut
 * - coupe : le petit bouton son de l'accueil coupe ou remet, sans toucher aux choix
 * Stockage : AsyncStorage, une seule cle. Partage en direct entre l'accueil et la page Ta scene.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SceneId } from '@/lib/v2/espace';
import { AMBIANCES, MUSIQUES, ambianceConseillee, type SonScene } from './scenesAnimees';
import { traduire } from '@/lib/i18n/tr';

export const SON_SCENE_KEY = 'yoroi_scene_son_v1';

export type ReglagesSonScene = {
  anime: boolean;
  ambiance: string;
  musique: string;
  volume: number;
  coupe: boolean;
};

export const VOLUMES: { key: number; label: string }[] = [
  { key: 0.2, label: traduire('Très doux') },
  { key: 0.35, label: 'Doux' },
  { key: 0.6, label: 'Normal' },
];

export const REGLAGES_SON_DEFAUT: ReglagesSonScene = { anime: true, ambiance: 'aucune', musique: 'aucune', volume: 0.35, coupe: false };

let courant: ReglagesSonScene = REGLAGES_SON_DEFAUT;
let charge = false;
const ecouteurs = new Set<(r: ReglagesSonScene) => void>();

function diffuser() {
  ecouteurs.forEach((l) => l(courant));
}

async function charger() {
  if (charge) return;
  charge = true;
  try {
    const brut = await AsyncStorage.getItem(SON_SCENE_KEY);
    if (brut) {
      const lu = JSON.parse(brut);
      courant = { ...REGLAGES_SON_DEFAUT, ...(lu && typeof lu === 'object' ? lu : {}) };
      diffuser();
    }
  } catch {
    // reglages par defaut
  }
}

export function setReglagesSon(patch: Partial<ReglagesSonScene>) {
  courant = { ...courant, ...patch };
  diffuser();
  AsyncStorage.setItem(SON_SCENE_KEY, JSON.stringify(courant)).catch(() => {});
}

export function useReglagesSon(): [ReglagesSonScene, (patch: Partial<ReglagesSonScene>) => void] {
  const [r, setR] = useState(courant);
  useEffect(() => {
    ecouteurs.add(setR);
    setR(courant);
    charger();
    return () => {
      ecouteurs.delete(setR);
    };
  }, []);
  return [r, setReglagesSon];
}

/** Les sons a jouer pour cette scene avec ces reglages (null : rien) */
export function sonsDeLaScene(scene: SceneId, r: ReglagesSonScene): { musique: SonScene | null; ambiance: SonScene | null } {
  // « Selon la scène » : l'ambiance de la video, sinon celle conseillee pour la scene fixe (14 octobre 2026)
  const idAmb = r.ambiance === 'scene' ? ambianceConseillee(scene) : r.ambiance;
  return {
    musique: MUSIQUES.find((m) => m.id === r.musique) ?? null,
    ambiance: AMBIANCES.find((a) => a.id === idAmb) ?? null,
  };
}

/** Un son est choisi (le petit bouton de l'accueil n'apparait qu'alors) */
export function unSonEstChoisi(r: ReglagesSonScene): boolean {
  return r.musique !== 'aucune' || r.ambiance !== 'aucune';
}
