/**
 * Scenes animees de l'accueil (13 octobre 2026) : FICHIER GENERE, ne pas modifier a la main.
 * Source : _propositions/scenes_animees/catalogue.json, script generer_registre.py du meme dossier.
 * Une ligne par scene animee : la video muette en boucle (meme cadrage 1200 x 670 que l'image fixe),
 * l'ambiance et la musique conseillees (ids des listes plus bas, ou null).
 * SONS_DES_SCENES : les sons conseilles des scenes fixes sans video (choix « Selon la scène »).
 * Premium ou gratuit : la scene animee suit exactement la scene fixe correspondante (rien a declarer ici).
 */
import type { SceneId } from '@/lib/v2/espace';

export type SceneAnimee = { id: string; nom: string; scene: SceneId; video: number; ambiance: string | null; musique: string | null };
export type SonScene = { id: string; nom: string; source: number };

export const SCENES_ANIMEES: SceneAnimee[] = [
  { id: "machiya_nuit", nom: "Ruelle de nuit", scene: "machiya_nuit", video: require('@/assets/avatars/app/monde/anime/machiya_nuit.mp4'), ambiance: null, musique: "nuit_de_lanternes" },
  { id: "lanternes_pluie", nom: "Ruelle sous la pluie", scene: "lanternes_pluie", video: require('@/assets/avatars/app/monde/anime/lanternes_pluie.mp4'), ambiance: "pluie", musique: "nuit_de_lanternes" },
  { id: "lanternes_neige", nom: "Auberge sous la neige", scene: "lanternes_neige", video: require('@/assets/avatars/app/monde/anime/lanternes_neige.mp4'), ambiance: "neige", musique: "montee_du_guerrier" },
];

/** Sons conseilles d'une scene fixe qui n'a pas (encore) de video */
export const SONS_DES_SCENES: Partial<Record<SceneId, { ambiance: string | null; musique: string | null }>> = {
  nature_plage_jour: { ambiance: "mer", musique: "horizon_dore" },
  nature_plage_couchant: { ambiance: "mer", musique: "horizon_dore" },
  nature_foret: { ambiance: "foret", musique: "horizon_dore" },
  nature_cascade: { ambiance: "foret", musique: "horizon_dore" },
  nature_ville_jour: { ambiance: null, musique: "horizon_dore" },
  nature_desert_nuit: { ambiance: "desert", musique: "horizon_dore" },
  nature_mer_nuit: { ambiance: "mer", musique: "horizon_dore" },
  nature_ville_nuit: { ambiance: null, musique: "horizon_dore" },
  classique_desert_jour: { ambiance: "desert", musique: "horizon_dore" },
};

export const AMBIANCES: SonScene[] = [
  { id: "pluie", nom: "Pluie", source: require('@/assets/sounds/ambiance/ambiance_pluie.mp3') },
  { id: "neige", nom: "Neige et vent", source: require('@/assets/sounds/ambiance/ambiance_neige.mp3') },
  { id: "mer", nom: "Vagues", source: require('@/assets/sounds/ambiance/ambiance_mer.mp3') },
  { id: "desert", nom: "Vent du désert", source: require('@/assets/sounds/ambiance/ambiance_desert.mp3') },
  { id: "foret", nom: "Forêt et ruisseau", source: require('@/assets/sounds/ambiance/ambiance_foret.mp3') },
];

export const MUSIQUES: SonScene[] = [
  { id: "nuit_de_lanternes", nom: "Nuit de lanternes", source: require('@/assets/sounds/ambiance/musique_nuit_de_lanternes.mp3') },
  { id: "montee_du_guerrier", nom: "Montée du guerrier", source: require('@/assets/sounds/ambiance/musique_montee_du_guerrier.mp3') },
  { id: "horizon_dore", nom: "Horizon doré", source: require('@/assets/sounds/ambiance/musique_horizon_dore.mp3') },
];

/** La version animee d'une scene fixe, s'il y en a une */
export function sceneAnimee(scene: SceneId): SceneAnimee | null {
  return SCENES_ANIMEES.find((s) => s.scene === scene) ?? null;
}

export function aUneVersionAnimee(scene: SceneId): boolean {
  return SCENES_ANIMEES.some((s) => s.scene === scene);
}

/** L'ambiance conseillee d'une scene : celle de sa video, sinon celle de la scene fixe, sinon aucune */
export function ambianceConseillee(scene: SceneId): string | null {
  return sceneAnimee(scene)?.ambiance ?? SONS_DES_SCENES[scene]?.ambiance ?? null;
}
