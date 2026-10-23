/**
 * Les scenes a gagner (gamification, 18 octobre 2026). Le pack Voyages est Premium, mais :
 *  - trois scenes se gagnent avec la serie de jours du Dojo : 7, 30 et 100 jours d'affilee. Une fois gagnee,
 *    la scene reste a toi pour toujours, meme si la serie casse ensuite (comme le journal d'XP, ca ne baisse jamais) ;
 *  - le grand coffre (tous les 7 jours de serie) fait essayer une scene Voyages pendant 24 h aux comptes gratuits.
 *    A la fin de l'essai, si tu l'avais mise, ta scene d'avant revient toute seule.
 *
 * Lecture synchrone depuis un cache en memoire (isThemeUnlocked, lib/v2/dojo/personnages.ts, est synchrone),
 * charge au lancement (FinPremiumGuard) et a chaque ouverture du Dojo. Stockage : @yoroi_scenes_gagnees_v1.
 * Aucune dependance vers personnages.ts ni espace.ts au chargement (pas d'import circulaire).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { VOYAGE_SCENE_IDS, type VoyageSceneId } from '@/lib/v2/espace/voyages';

const KEY = '@yoroi_scenes_gagnees_v1';
export const SCENES_GAGNEES_EVENT = 'yoroi:scenes_gagnees';
export const DUREE_ESSAI_MS = 24 * 3600 * 1000;

/** Les paliers de la serie et la scene qu'ils offrent */
export const PALIERS_SCENES: { jours: number; scene: VoyageSceneId }[] = [
  { jours: 7, scene: 'voyage_rue_tokyo' },
  { jours: 30, scene: 'voyage_voie_lactee_cote' },
  { jours: 100, scene: 'voyage_voie_lactee_nuages' },
];

export type EssaiScene = { id: VoyageSceneId; fin: number; /** ta scene avant l'essai, si tu l'as mise */ avant?: string };
type Etat = { gagnees: string[]; essai: EssaiScene | null; /** scenes deja essayees, pour varier */ essayees: string[] };

let cache: Etat = { gagnees: [], essai: null, essayees: [] };
let charge = false;

function lire(raw: string | null): Etat {
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object') return { gagnees: [], essai: null, essayees: [] };
    const ids = VOYAGE_SCENE_IDS as readonly string[];
    const gagnees = Array.isArray(v.gagnees) ? v.gagnees.filter((x: unknown) => typeof x === 'string' && ids.includes(x)) : [];
    const essayees = Array.isArray(v.essayees) ? v.essayees.filter((x: unknown) => typeof x === 'string' && ids.includes(x)) : [];
    const e = v.essai;
    const essai = e && typeof e === 'object' && ids.includes(e.id) && typeof e.fin === 'number' ? (e as EssaiScene) : null;
    return { gagnees, essai, essayees };
  } catch {
    return { gagnees: [], essai: null, essayees: [] };
  }
}

async function ecrire(e: Etat): Promise<void> {
  cache = e;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    // sans stockage : la recompense vaut pour cette session
  }
  DeviceEventEmitter.emit(SCENES_GAGNEES_EVENT, e);
}

/** Charge le cache (au lancement, a l'ouverture du Dojo) */
export async function chargerScenesGagnees(): Promise<void> {
  try {
    // fusion avec le cache : une ecriture qui n'a pas abouti (stockage plein, indisponible) ne fait rien perdre
    const lu = lire(await AsyncStorage.getItem(KEY));
    cache = {
      gagnees: Array.from(new Set([...lu.gagnees, ...cache.gagnees])),
      essayees: Array.from(new Set([...lu.essayees, ...cache.essayees])),
      essai: lu.essai ?? cache.essai,
    };
  } catch {
    // on garde le cache
  }
  if (!charge) {
    charge = true;
    DeviceEventEmitter.emit(SCENES_GAGNEES_EVENT, cache);
  }
}

/** Pour les tests */
export function _resetScenesGagnees(): void {
  cache = { gagnees: [], essai: null, essayees: [] };
  charge = false;
}

/** Vrai si la scene est gagnee pour toujours avec la serie */
export function sceneGagnee(id: string): boolean {
  return cache.gagnees.includes(id);
}

/** L'essai en cours (non expire), ou null */
export function essaiEnCours(now = Date.now()): EssaiScene | null {
  return cache.essai && cache.essai.fin > now ? cache.essai : null;
}

/** Vrai si la scene est ouverte par une recompense : gagnee, ou en essai */
export function sceneOuverteParRecompense(id: string, now = Date.now()): boolean {
  return sceneGagnee(id) || essaiEnCours(now)?.id === id;
}

/** Le palier de serie qui offre cette scene, ou null */
export function palierDeScene(id: string): number | null {
  return PALIERS_SCENES.find((p) => p.scene === id)?.jours ?? null;
}

/** Le prochain palier a atteindre (pour « Encore 4 jours pour gagner la scene Rue de Tokyo ») */
export function prochainPalier(jours: number): { jours: number; scene: VoyageSceneId; reste: number } | null {
  const p = PALIERS_SCENES.find((x) => !sceneGagnee(x.scene) && x.jours > jours) ?? null;
  return p ? { ...p, reste: p.jours - jours } : null;
}

/**
 * Note les scenes gagnees avec la serie (ta serie actuelle ou ton record).
 * Renvoie les scenes nouvellement gagnees, pour les feter.
 */
export async function verifierPaliersSerie(jours: number, record = 0): Promise<VoyageSceneId[]> {
  await chargerScenesGagnees();
  const meilleur = Math.max(jours, record);
  const nouvelles = PALIERS_SCENES.filter((p) => meilleur >= p.jours && !cache.gagnees.includes(p.scene)).map((p) => p.scene);
  if (nouvelles.length) await ecrire({ ...cache, gagnees: [...cache.gagnees, ...nouvelles] });
  return nouvelles;
}

/**
 * Le cadeau du grand coffre pour un compte gratuit : 24 h d'essai d'une scene Voyages encore fermee.
 * verrouillee(id) dit si la scene est fermee pour toi (sans Premium). Renvoie l'essai, ou null si tout est ouvert.
 */
export async function donnerEssaiGrandCoffre(verrouillee: (id: VoyageSceneId) => boolean, now = Date.now()): Promise<EssaiScene | null> {
  await chargerScenesGagnees();
  const candidates = VOYAGE_SCENE_IDS.filter((id) => !cache.gagnees.includes(id) && verrouillee(id));
  if (!candidates.length) return null;
  const jamais = candidates.filter((id) => !cache.essayees.includes(id));
  const liste = jamais.length ? jamais : candidates;
  // tirage stable dans la journee (un seul grand coffre par jour)
  const jour = Math.floor(now / 86400000);
  const id = liste[jour % liste.length];
  const essai: EssaiScene = { id, fin: now + DUREE_ESSAI_MS };
  await ecrire({ ...cache, essai, essayees: jamais.length ? [...cache.essayees, id] : [id] });
  return essai;
}

/** Note la scene d'avant quand tu mets la scene en essai (elle revient a la fin de l'essai) */
export async function noterSceneAvantEssai(avant: string): Promise<void> {
  if (!cache.essai) return;
  await ecrire({ ...cache, essai: { ...cache.essai, avant } });
}

/**
 * Fin de l'essai : si la scene en essai est encore ta scene, ta scene d'avant revient.
 * scene : ta scene choisie ; remettre(id) l'enregistre. Renvoie vrai si la scene a change.
 */
export async function terminerEssaiSiFini(scene: string, remettre: (id: string) => Promise<void>, now = Date.now()): Promise<boolean> {
  await chargerScenesGagnees();
  const e = cache.essai;
  if (!e || e.fin > now) return false;
  await ecrire({ ...cache, essai: null });
  if (scene !== e.id || sceneGagnee(e.id)) return false;
  await remettre(e.avant ?? 'dojo');
  return true;
}
