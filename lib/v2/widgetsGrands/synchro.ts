/**
 * Grands widgets iPad et Mac (31 octobre 2026) : ecrit l'instantane dedie (instantane.ts) dans l'App Group
 * group.com.houari.yoroi, fichier FICHIER_GRANDS, a cote de l'instantane v1 des autres widgets (qui ne change pas),
 * puis demande a iOS de redessiner les widgets par le pont natif existant (rechargerWidgetsNatif, WidgetCenter).
 *
 * Ecriture : expo-file-system (Paths.appleSharedContainers, l'App Group declare dans les entitlements de l'app),
 * sans toucher au module natif YoroiWidgets. Le widget lit le meme fichier (ios/YoroiWidgets/Grands/ModeleGrands.swift).
 *
 * Memes moments que lib/v2/widgets/synchro.ts : au lancement, au retour au premier plan, en passant en arriere-plan,
 * et apres chaque changement de poids, de seance, d'eau, d'espace, de programme ou du Dojo (anti rebond de 3 s).
 * iOS seulement. Rien pendant la visite guidee avec l'exemple (ce ne sont pas tes donnees).
 */
import { AppState, DeviceEventEmitter, Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { vitrineActive } from '@/lib/v2/visite/vitrine';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT, localISO } from '@/lib/v2/accueil/hydration';
import { ESPACE_CHANGED_EVENT } from '@/lib/v2/espace';
import { ARMURE_CHANGED_EVENT } from '@/lib/v2/armure';
import { PROGRAMME_CHANGED_EVENT } from '@/lib/v2/programmes/suivi';
import { rechargerWidgetsNatif, widgetsDisponibles } from '@/lib/v2/widgets/natif';
import { construireInstantaneGrands, FICHIER_GRANDS } from './instantane';
import { lireSourcesGrands } from './sources';

export const APP_GROUP = 'group.com.houari.yoroi';
const ANTI_REBOND_MS = 3000;

let timer: ReturnType<typeof setTimeout> | null = null;
let derniere = '';
let enCours: Promise<boolean> | null = null;
let demarree = false;

/** Ecrit le texte dans le fichier de l'App Group ; false sans App Group (Expo Go, simulateur sans groupe, Android) */
export function ecrireFichierGroupe(nom: string, texte: string): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system') as typeof import('expo-file-system');
    const dossier = fs.Paths.appleSharedContainers?.[APP_GROUP];
    if (!dossier) return false;
    const f = new fs.File(dossier, nom);
    f.write(texte);
    return true;
  } catch (e) {
    logger.warn('[Grands widgets] fichier non ecrit', e);
    return false;
  }
}

/** Construit et ecrit l'instantane des grands widgets, puis redessine. force : meme s'il n'a pas change */
export async function ecrireGrandsWidgets(force = false, forcerSante = false): Promise<boolean> {
  if (Platform.OS !== 'ios' || !widgetsDisponibles()) return false;
  if (vitrineActive()) return false;
  if (enCours) await enCours.catch(() => false);
  enCours = (async () => {
    try {
      const inst = construireInstantaneGrands(await lireSourcesGrands({ forcerSante }));
      const { genere: _g, ...reste } = inst;
      // le jour compte : l'eau et la seance d'hier ne s'affichent pas aujourd'hui
      const empreinte = `${localISO()}|${JSON.stringify(reste)}`;
      if (!force && empreinte === derniere) return true;
      if (!ecrireFichierGroupe(FICHIER_GRANDS, JSON.stringify(inst))) return false;
      derniere = empreinte;
      await rechargerWidgetsNatif();
      return true;
    } catch (e) {
      logger.warn('[Grands widgets] instantane non ecrit', e);
      return false;
    }
  })();
  const r = await enCours;
  enCours = null;
  return r;
}

/** Ecriture groupee : plusieurs changements en 3 s ne font qu'une ecriture */
export function planifierGrandsWidgets(forcerSante = false): void {
  if (Platform.OS !== 'ios' || !widgetsDisponibles()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    ecrireGrandsWidgets(false, forcerSante).catch(() => undefined);
  }, ANTI_REBOND_MS);
}

const TORII_EVENT = 'YOROI_TORII_CHANGED';

/** A appeler une fois (SynchroGrands.tsx). Renvoie la fonction d'arret. */
export function demarrerSynchroGrands(): () => void {
  if (Platform.OS !== 'ios' || !widgetsDisponibles() || demarree) return () => undefined;
  demarree = true;
  planifierGrandsWidgets(true);
  const evts = [DATA_CHANGED_EVENT, HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT, ESPACE_CHANGED_EVENT, TORII_EVENT, ARMURE_CHANGED_EVENT, PROGRAMME_CHANGED_EVENT].map((e) =>
    DeviceEventEmitter.addListener(e, () => planifierGrandsWidgets()),
  );
  const app = AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      planifierGrandsWidgets(true);
    } else if (s === 'background' && timer) {
      clearTimeout(timer);
      timer = null;
      ecrireGrandsWidgets().catch(() => undefined);
    }
  });
  return () => {
    evts.forEach((x) => x.remove());
    app.remove();
    if (timer) clearTimeout(timer);
    timer = null;
    demarree = false;
  };
}
