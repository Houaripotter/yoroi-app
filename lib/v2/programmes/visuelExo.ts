/**
 * Le visuel d'un exercice dans une liste ou une fiche (1er novembre 2026, Houari : « c'est possible de voir les
 * exercices, c'est quoi, avec une animation ? »). Ordre de recherche :
 *  1. l'animation de test (GIF Gym visual), seulement en mode créateur : jamais en public, licence non achetée
 *     (lib/v2/programmes/demosTest.ts). Le mode créateur est passé par l'appelant, lu avec useCreatorMode comme dans
 *     le reste de l'app (components/yoroi/v2/programmes/VignetteExo.tsx, useAnimationsTest) ;
 *  2. notre animation maison, deux poses en fondu (lib/v2/programmes/demosMaison.ts), pour tout le monde ;
 *  3. l'illustration maison de sa machine (assets/exercices/machines, lib/v2/seance/machinesArt.ts), retrouvée par
 *     le nom de l'exercice ou par la liste d'exercices de la machine (lib/v2/seance/machines.ts) ;
 *  4. sinon le sticker de son groupe musculaire : jamais de case vide.
 * Données pures, aucun composant.
 */
import type { ImageSourcePropType } from 'react-native';
import { MACHINES } from '@/lib/v2/seance/machines';
import { machineArt } from '@/lib/v2/seance/machinesArt';
import { demoSlug, resoudreDemo } from './demos';
import { demoMaisonDe } from './demosMaison';
import { demoEnLigne } from './demosTest';

/** Les stickers des groupes musculaires (components/yoroi/v2/stickers.ts) */
export type StickerMuscle = 'pecs' | 'abdos' | 'fessiers' | 'bras' | 'muscle' | 'force' | 'zones_corps' | 'course' | 'musculation';
export type TeinteMuscle = 'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche';

export type VisuelExo =
  | { type: 'animation'; images: ImageSourcePropType[] }
  | { type: 'machine'; image: ImageSourcePropType }
  | { type: 'sticker'; sticker: StickerMuscle; teinte: TeinteMuscle };

// nom d'exercice (demoSlug) -> machine illustrée qui le fait
let parExercice: Map<string, string> | null = null;
function machineIllustree(cle: string): ImageSourcePropType | null {
  const direct = machineArt(cle);
  if (direct) return direct;
  if (!parExercice) {
    parExercice = new Map();
    for (const m of MACHINES) {
      if (!machineArt(m.id)) continue;
      for (const e of m.exercices) {
        const s = demoSlug(e);
        if (!parExercice.has(s)) parExercice.set(s, m.id);
      }
    }
  }
  const id = parExercice.get(cle);
  return id ? machineArt(id) ?? null : null;
}

/** L'illustration de la machine de cet exercice, ou null */
export function imageMachineDe(nom: string | null | undefined): ImageSourcePropType | null {
  if (!nom) return null;
  return resoudreDemo(nom, machineIllustree);
}

/** Le sticker du groupe musculaire (« PECTORAUX », « ÉPAULES »...) ; le nom aide pour le cardio */
export function stickerMuscle(muscle: string | null | undefined, nom = '', cardio = false): { sticker: StickerMuscle; teinte: TeinteMuscle } {
  const m = (muscle ?? '').toUpperCase();
  if (cardio || m.startsWith('CARDIO') || /marche|course|velo|vélo|rameur|elliptique/i.test(nom)) return { sticker: 'course', teinte: 'peche' };
  if (m.startsWith('PECTO')) return { sticker: 'pecs', teinte: 'bleu' };
  if (m.startsWith('ABDO')) return { sticker: 'abdos', teinte: 'creme' };
  if (m.startsWith('FESS')) return { sticker: 'fessiers', teinte: 'peche' };
  if (/BRAS|BICEPS|TRICEPS/.test(m)) return { sticker: 'bras', teinte: 'lilas' };
  if (/EPAUL|ÉPAUL/.test(m)) return { sticker: 'muscle', teinte: 'creme' };
  if (m.startsWith('DOS') || m.startsWith('LOMB') || m.startsWith('TRAP')) return { sticker: 'force', teinte: 'menthe' };
  if (/JAMBE|QUADRI|ISCHIO|MOLLET|CUISSE|ADDUC|ABDUC/.test(m)) return { sticker: 'zones_corps', teinte: 'menthe' };
  return { sticker: 'musculation', teinte: 'bleu' };
}

/**
 * Le meilleur visuel autorisé de l'exercice, jamais rien. `animationsTest` : vrai seulement en mode créateur avec
 * Gym visual allumé dans le Studio (useAnimationsTest) ; faux par défaut, donc jamais de GIF Gym visual en public.
 */
export function visuelExo(nom: string, muscle?: string | null, cardio = false, animationsTest = false): VisuelExo {
  const gif = cardio || !animationsTest ? null : resoudreDemo(nom, demoEnLigne);
  if (gif && gif.length) return { type: 'animation', images: gif };
  const maison = cardio ? null : demoMaisonDe(nom);
  if (maison && maison.length) return { type: 'animation', images: maison };
  const image = cardio ? null : imageMachineDe(nom);
  if (image) return { type: 'machine', image };
  return { type: 'sticker', ...stickerMuscle(muscle, nom, cardio) };
}
