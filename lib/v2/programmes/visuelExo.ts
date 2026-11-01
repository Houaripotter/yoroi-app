/**
 * Le visuel d'un exercice dans une liste ou une fiche (1er novembre 2026, Houari : « c'est possible de voir les
 * exercices, c'est quoi, avec une animation ? »). Jamais de case vide : on prend la première source qui a quelque
 * chose, dans l'ordre de ordreVisuels (une seule liste, lue par visuelExo, la vignette et la fiche).
 *
 * EN MODE CRÉATEUR (Houari, 1er novembre 2026 : « quand Gym visual n'a pas l'exercice, montre l'animation suivante
 * plutôt que le sticker ») :
 *  1. le GIF Gym visual (lib/v2/programmes/demosTest.ts), jamais en public : licence non achetée. Le mode créateur
 *     est passé par l'appelant, lu avec useCreatorMode (components/yoroi/v2/programmes/VignetteExo.tsx,
 *     useAnimationsTest) ;
 *  2. sinon notre animation maison validée, deux poses en fondu (lib/v2/programmes/demosMaison.ts) ;
 *  3. sinon l'illustration Everkinetic en deux poses, même fondu, si EVERKINETIC_ACTIF
 *     (lib/v2/programmes/everkinetic.ts) : `source` le signale, la fiche affiche alors le crédit CC BY-SA 4.0,
 *     mode créateur compris ;
 *  4. sinon l'illustration maison de sa machine (assets/exercices/machines, lib/v2/seance/machinesArt.ts), retrouvée
 *     par le nom de l'exercice ou par la liste d'exercices de la machine (lib/v2/seance/machines.ts) ;
 *  5. sinon le sticker de son groupe musculaire.
 * HORS MODE CRÉATEUR : la même liste sans Gym visual (maison, Everkinetic, machine, sticker).
 * Le cardio n'a que le sticker course. Données pures, aucun composant.
 */
import type { ImageSourcePropType } from 'react-native';
import { MACHINES } from '@/lib/v2/seance/machines';
import { machineArt } from '@/lib/v2/seance/machinesArt';
import { demoSlug, resoudreDemo } from './demos';
import { demoMaisonDe } from './demosMaison';
import { demoEverkineticDe } from './everkinetic';
import { demoEnLigne } from './demosTest';

/** Les stickers des groupes musculaires (components/yoroi/v2/stickers.ts) */
export type StickerMuscle = 'pecs' | 'abdos' | 'fessiers' | 'bras' | 'muscle' | 'force' | 'zones_corps' | 'course' | 'musculation';
export type TeinteMuscle = 'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche';

export type VisuelExo =
  | { type: 'animation'; images: ImageSourcePropType[]; source?: 'everkinetic' }
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

/** Les sources de visuel, de la préférée à la dernière */
export type SourceVisuel = 'gymvisual' | 'maison' | 'everkinetic' | 'machine' | 'sticker';

/** L'ordre de recherche : Gym visual en tête seulement en mode créateur, le sticker toujours en dernier */
export function ordreVisuels(modeCreateur: boolean): SourceVisuel[] {
  const suite: SourceVisuel[] = ['maison', 'everkinetic', 'machine', 'sticker'];
  return modeCreateur ? ['gymvisual', ...suite] : suite;
}

function depuis(src: SourceVisuel, nom: string): VisuelExo | null {
  if (src === 'gymvisual') {
    const gif = resoudreDemo(nom, demoEnLigne);
    return gif && gif.length ? { type: 'animation', images: gif } : null;
  }
  if (src === 'maison') {
    const maison = demoMaisonDe(nom);
    return maison && maison.length ? { type: 'animation', images: maison } : null;
  }
  if (src === 'everkinetic') {
    const ek = demoEverkineticDe(nom);
    return ek && ek.length ? { type: 'animation', images: ek, source: 'everkinetic' } : null;
  }
  if (src === 'machine') {
    const image = imageMachineDe(nom);
    return image ? { type: 'machine', image } : null;
  }
  return null;
}

/**
 * Le meilleur visuel autorisé de l'exercice, jamais rien. `animationsTest` : vrai seulement en mode créateur avec
 * Gym visual allumé dans le Studio (useAnimationsTest) ; faux par défaut, donc jamais de GIF Gym visual en public.
 * Quand Gym visual n'a pas l'exercice, la source suivante de ordreVisuels prend le relais, pas le sticker.
 */
export function visuelExo(nom: string, muscle?: string | null, cardio = false, animationsTest = false): VisuelExo {
  if (!cardio) {
    for (const src of ordreVisuels(animationsTest)) {
      const v = depuis(src, nom);
      if (v) return v;
    }
  }
  return { type: 'sticker', ...stickerMuscle(muscle, nom, cardio) };
}
