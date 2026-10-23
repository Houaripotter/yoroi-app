/**
 * 14 octobre 2026 : la presentation de la galerie Reglages, Ta scene. Logique pure, sans React
 * (testee dans __tests__/unit/presentationScenes.test.ts).
 * Tout vient des registres existants, aucune liste en dur :
 * - nom, phrase et image : components/yoroi/v2/espace/assets.ts, sinon le pack (nature.ts), sinon THEMES et accueil/images.ts
 * - Animee : SCENES_ANIMEES (scenesAnimees.ts, fichier genere)
 * - Son : l'ambiance ou la musique conseillee (video, sinon SONS_DES_SCENES)
 * - Premium, annuel, offerte : THEMES (lib/v2/dojo/personnages.ts), le verrou reel reste isSceneLocked
 * - Nouveau : le pack le plus recent de NEW_SCENES (sa premiere scene donne le pack), pour que le badge garde un sens
 * - Packs et sections : GROUPES et scenesDuGroupe (groupes.ts), scenes qui tournent : scenesDuPack (espace.ts)
 */
import type { ImageSourcePropType } from 'react-native';
import { TOUTES_LES_SCENES, scenesDuPack, type SceneId, type SceneRotation } from '@/lib/v2/espace';
import { GROUPES, groupeDe, scenesDuGroupe, type GroupeScenes } from '@/lib/v2/espace/groupes';
import { SCENES_NATURE } from '@/lib/v2/espace/nature';
import { SCENES_VOYAGES, estSceneVoyage } from '@/lib/v2/espace/voyages';
import { AMBIANCES, MUSIQUES, SONS_DES_SCENES, aUneVersionAnimee, ambianceConseillee, sceneAnimee, type SonScene } from '@/lib/v2/espace/scenesAnimees';
import { NEW_SCENES, themeById } from '@/lib/v2/dojo/personnages';
import { SCENES as CATALOGUE } from '@/components/yoroi/v2/espace/assets';
import { SCENES as IMAGES } from '@/components/yoroi/v2/accueil/images';
import { imageMiroir } from '@/lib/v2/espace/miroir';

export type FicheScene = {
  id: SceneId;
  nom: string;
  phrase: string;
  image: ImageSourcePropType;
  /** a une video (badge Animee) */
  animee: boolean;
  /** a une ambiance ou une musique conseillee (badge Son) */
  son: boolean;
  /** offerte a tous (filtre Gratuites) */
  offerte: boolean;
  /** offerte avec l'abonnement annuel seulement */
  annuel: boolean;
  /** du pack le plus recent (badge Nouveau) */
  nouveau: boolean;
  groupe: GroupeScenes;
};

/** Les scenes du pack le plus recent : NEW_SCENES commence par les dernieres arrivees */
export const NOUVEAUTES: SceneId[] = (() => {
  const premiere = NEW_SCENES[0];
  if (!premiere) return [];
  const g = groupeDe(premiere);
  if (g === 'toutes') return [premiere];
  return scenesDuGroupe(g, []).filter((id) => NEW_SCENES.includes(id));
})();

/** Les sons conseilles d'une scene (ceux de sa video, sinon ceux de la scene fixe) */
export function sonConseille(id: SceneId): { ambiance: SonScene | null; musique: SonScene | null } {
  const idAmb = ambianceConseillee(id);
  const idMus = sceneAnimee(id)?.musique ?? SONS_DES_SCENES[id]?.musique ?? null;
  return {
    ambiance: AMBIANCES.find((a) => a.id === idAmb) ?? null,
    musique: MUSIQUES.find((m) => m.id === idMus) ?? null,
  };
}

export function ficheScene(id: SceneId): FicheScene {
  const cat = CATALOGUE.find((s) => s.id === id);
  const nat = SCENES_NATURE.find((s) => s.id === id) ?? SCENES_VOYAGES.find((s) => s.id === id);
  const t = themeById(id);
  const sons = sonConseille(id);
  return {
    id,
    nom: cat?.nom ?? nat?.nom ?? (t.id === id ? t.name : id),
    phrase: cat?.phrase ?? nat?.phrase ?? (t.id === id ? t.description : ''),
    // 16 octobre : la vignette montre la scene comme sur ton accueil, retournee pour les scenes en miroir (miroir.ts)
    image: imageMiroir(id) ?? cat?.image ?? nat?.image ?? IMAGES[id] ?? IMAGES.dojo,
    // 18 octobre : les scenes Voyages sont animees en code (SceneAnimee), sans video
    animee: aUneVersionAnimee(id) || estSceneVoyage(id),
    son: !!(sons.ambiance || sons.musique),
    offerte: t.id === id ? !t.premium : false,
    annuel: t.id === id ? !!t.annual : false,
    nouveau: NOUVEAUTES.includes(id),
    groupe: groupeDe(id),
  };
}

export type PackGalerie = Exclude<GroupeScenes, 'toutes'>;
export type FiltreGalerie = 'toutes' | 'animees' | 'gratuites' | PackGalerie;

/** Titres des sections : ceux des onglets, avec le Japon nomme pour les scenes rangees par moment */
const TITRES: Partial<Record<PackGalerie, string>> = {
  jour: 'Japon, le jour',
  saisons: 'Japon, les saisons',
  soir: 'Japon, le soir et la nuit',
};

const PHRASES: Record<PackGalerie, string> = {
  voyages: 'Tokyo, Paris, désert, neige et ciel étoilé, animés',
  vie: 'Caserne, chantier, stade, château et station spatiale',
  classique: 'Salle, parc, ville, mer et désert, sans le Japon',
  nature: 'Plage, forêt, cascade, désert et buildings',
  samourai: 'Katanas, armures et châteaux',
  lanternes: 'Ruelles, auberges et ports à la nuit tombée',
  jour: 'Dojo, jardins et temples en pleine lumière',
  saisons: 'Cerisiers, érables et neige',
  soir: 'Couchants, lanternes et lune',
};

export const PACKS_GALERIE: { key: PackGalerie; titre: string; phrase: string }[] = GROUPES.filter((g) => g.key !== 'toutes').map((g) => {
  const key = g.key as PackGalerie;
  return { key, titre: TITRES[key] ?? g.label, phrase: PHRASES[key] };
});

export type SectionGalerie = { key: PackGalerie; titre: string; phrase: string; scenes: SceneId[] };

function garde(f: FiltreGalerie, id: SceneId): boolean {
  if (f === 'animees') return aUneVersionAnimee(id) || estSceneVoyage(id);
  if (f === 'gratuites') return ficheScene(id).offerte;
  return true;
}

/** Les sections de la galerie pour un filtre : un pack seul, ou tous les packs filtres (sections vides retirees) */
export function sectionsGalerie(f: FiltreGalerie): SectionGalerie[] {
  const packs = f === 'toutes' || f === 'animees' || f === 'gratuites' ? PACKS_GALERIE : PACKS_GALERIE.filter((p) => p.key === f);
  return packs
    .map((p) => ({ ...p, scenes: scenesDuGroupe(p.key, TOUTES_LES_SCENES).filter((id) => garde(f, id)) }))
    .filter((s) => s.scenes.length > 0);
}

/** Les filtres rapides puis les packs, avec le nombre de scenes */
export function filtresGalerie(): { key: FiltreGalerie; label: string; nombre: number }[] {
  const n = (f: FiltreGalerie) => sectionsGalerie(f).reduce((t, s) => t + s.scenes.length, 0);
  return [
    { key: 'toutes', label: 'Toutes', nombre: n('toutes') },
    { key: 'animees', label: 'Animées', nombre: n('animees') },
    { key: 'gratuites', label: 'Gratuites', nombre: n('gratuites') },
    ...PACKS_GALERIE.map((p) => ({ key: p.key as FiltreGalerie, label: p.titre, nombre: n(p.key) })),
  ];
}

/** Le pack qui tourne correspond a une section de la galerie (Toutes : aucune) */
export function sectionDuPack(pack: SceneRotation | undefined): PackGalerie | null {
  if (pack === 'classique' || pack === 'nature' || pack === 'samourai' || pack === 'lanternes' || pack === 'voyages') return pack;
  return null;
}

/** Les scenes d'un pack qui tourne, pour les montrer sous son choix */
export function scenesQuiTournent(pack: SceneRotation): SceneId[] {
  return scenesDuPack(pack);
}

/**
 * La seule vignette dont la video joue (batterie) : aucune si l'apercu du haut joue deja la sienne
 * ou si « Reduire les animations » est actif ; sinon la scene selectionnee si elle est animee et visible,
 * sinon la premiere scene animee visible.
 */
export function vignetteQuiJoue(o: { focus: SceneId; visibles: SceneId[]; apercuJoue: boolean; reduire: boolean }): SceneId | null {
  if (o.reduire || o.apercuJoue) return null;
  const animees = o.visibles.filter((id) => aUneVersionAnimee(id));
  if (animees.includes(o.focus)) return o.focus;
  return animees[0] ?? null;
}
