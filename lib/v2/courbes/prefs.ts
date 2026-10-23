/**
 * Reglages des courbes (vague 32), gardes dans le telephone (AsyncStorage) comme les autres preferences :
 *  - le style de la courbe de poids (1 le grand chiffre suit ton doigt, par defaut ; 2 une bulle ;
 *    3 une barre par pesee ; 4 ton chemin vers le cap) ;
 *  - l'interrupteur « Afficher mon cap et ma ligne » (active par defaut) : cap, torii et ligne directrice ;
 *  - vague 34 : le fond de la courbe de poids (« auto » : la scene de ton accueil, ou les rizieres si elle a deja
 *    un torii ; « aucun » : sans fond ; ou une scene choisie). Resolution dans components/yoroi/v2/charts/FondCourbe.tsx.
 *  - vague 45 : la couleur du trait de la courbe de poids (« degrade » bleu violet magenta par defaut, « indigo »,
 *    « encre » : noir en clair, blanc casse en sombre), lue par POIDS (components/yoroi/v2/charts/CourbePoids.tsx).
 * Un changement est diffuse a toutes les courbes ouvertes (evenement), sans recharger l'ecran.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SceneId } from '@/lib/v2/espace';
import { traduire } from '@/lib/i18n/tr';

export type StyleCourbe = 1 | 2 | 3 | 4;
/** Fond de la courbe de poids (vague 34) */
export type FondCourbe = 'auto' | 'aucun' | SceneId;
/** Couleur du trait de la courbe de poids (vague 45) */
export type CouleurCourbe = 'degrade' | 'indigo' | 'encre';
export type PrefsCourbes = { style: StyleCourbe; cap: boolean; fond: FondCourbe; couleur: CouleurCourbe };

export const COULEURS_COURBE: { id: CouleurCourbe; nom: string; phrase: string }[] = [
  { id: 'degrade', nom: traduire('Dégradé'), phrase: traduire('Du bleu au violet, par défaut') },
  { id: 'indigo', nom: 'Indigo', phrase: traduire('Un bleu indigo franc') },
  { id: 'encre', nom: 'Encre', phrase: traduire('Noir sur le papier, blanc cassé la nuit') },
];

export const STYLES_COURBE: { id: StyleCourbe; nom: string; phrase: string }[] = [
  { id: 1, nom: traduire('Le grand chiffre suit ton doigt'), phrase: traduire('Le chiffre en haut devient la pesée touchée') },
  { id: 2, nom: traduire('Une bulle au-dessus du doigt'), phrase: traduire('Le passé reste en couleur, la suite s’efface') },
  { id: 3, nom: traduire('Une barre par pesée'), phrase: traduire('Une barre par semaine sur 6 mois et 1 an') },
  { id: 4, nom: traduire('Ton chemin vers le cap'), phrase: traduire('La courbe continue en pointillés jusqu’au torii') },
];

// vague 41 (Houari : « on ne voit pas bien avec la photo derrière ») : sans fond par defaut, la scene reste au choix
export const DEFAULT_PREFS_COURBES: PrefsCourbes = { style: 1, cap: true, fond: 'aucun', couleur: 'degrade' };
export const COURBES_CHANGED_EVENT = 'YOROI_COURBES_CHANGED';
const KEY = 'yoroi_courbes_v1';
/** vague 42 : version des preferences (2 : l'ancien fond « auto » est passe une fois a « aucun ») */
const VERSION_PREFS = 2;

let cache: PrefsCourbes | null = null;

/** La couleur du trait en cours (lue au rendu par POIDS, comme le mode sombre) */
export function couleurCourbeActive(): CouleurCourbe {
  return cache?.couleur ?? DEFAULT_PREFS_COURBES.couleur;
}

function propre(v: unknown): PrefsCourbes {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<PrefsCourbes>;
  const style = o.style === 1 || o.style === 2 || o.style === 3 || o.style === 4 ? o.style : DEFAULT_PREFS_COURBES.style;
  // une scene inconnue (ancienne version) revient au fond automatique
  const fond = typeof o.fond === 'string' && o.fond.length > 0 && o.fond.length < 40 ? (o.fond as FondCourbe) : DEFAULT_PREFS_COURBES.fond;
  const couleur: CouleurCourbe = o.couleur === 'indigo' || o.couleur === 'encre' ? o.couleur : 'degrade';
  return { style, cap: typeof o.cap === 'boolean' ? o.cap : DEFAULT_PREFS_COURBES.cap, fond, couleur };
}

export async function getPrefsCourbes(): Promise<PrefsCourbes> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const lu = raw ? JSON.parse(raw) : null;
    cache = propre(lu);
    // vague 42 (Houari : « on ne comprend pas énormément les choses ») : une seule fois, l'ancien fond « auto »
    // (la scene de ton accueil derriere la courbe) passe a « sans fond » ; la scene reste un choix dans Reglages
    const v = lu && typeof lu === 'object' ? (lu as { v?: unknown }).v : undefined;
    if (lu && typeof lu === 'object' && !(typeof v === 'number' && v >= VERSION_PREFS)) {
      if (cache.fond === 'auto') cache = { ...cache, fond: 'aucun' };
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...cache, v: VERSION_PREFS })).catch(() => undefined);
    }
  } catch {
    cache = { ...DEFAULT_PREFS_COURBES };
  }
  return cache;
}

export async function savePrefsCourbes(patch: Partial<PrefsCourbes>): Promise<PrefsCourbes> {
  const next = propre({ ...(await getPrefsCourbes()), ...patch });
  cache = next;
  DeviceEventEmitter.emit(COURBES_CHANGED_EVENT, next);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...next, v: VERSION_PREFS }));
  } catch {
    // stockage indisponible : le choix reste en memoire pour cette session
  }
  return next;
}

/** Style et interrupteur, a jour dans toutes les courbes ouvertes */
export function usePrefsCourbes(): PrefsCourbes & { set: (p: Partial<PrefsCourbes>) => void } {
  const [p, setP] = useState<PrefsCourbes>(cache ?? DEFAULT_PREFS_COURBES);
  useEffect(() => {
    let alive = true;
    getPrefsCourbes().then((v) => alive && setP(v)).catch(() => {});
    const sub = DeviceEventEmitter.addListener(COURBES_CHANGED_EVENT, (v: PrefsCourbes) => setP(v));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return { ...p, set: (patch) => { savePrefsCourbes(patch).catch(() => {}); } };
}
