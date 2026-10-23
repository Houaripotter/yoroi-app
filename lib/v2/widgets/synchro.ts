/**
 * Widgets iPhone, iPad et Android : l'instantane des widgets est le meme JSON v1 que celui de la montre
 * (construireContexte de lib/v2/montre/contexte.ts, une seule source de chiffres). Il est ecrit au lancement,
 * au retour au premier plan, en passant en arriere-plan et apres chaque changement de poids, de seance,
 * d'eau, d'espace ou de chrono (memes evenements que lib/v2/montre/synchro.ts, anti rebond de 2 s).
 * Les actions faites depuis un widget (+ 1 verre, retrait) attendent dans le natif avec un id ;
 * l'app les applique par lib/v2/montre/actions.ts (dedoublonnees par id), vide la file, reecrit l'instantane.
 * Sans module natif (web, Expo Go), rien ne se passe.
 * Styles des widgets (13 octobre) : la scene sert aussi de fond au style A ; ton personnage (meme image que
 * l'Accueil, sans rang ni XP) est copie pour le style C ; le style choisi (lib/v2/widgets/style.ts) est repasse
 * au natif une fois par lancement.
 * Saisons (18 octobre 2026) : la saison du jour (Halloween, Noel) part au widget avec la scene, vide si le reglage
 * « Décorations de saison » est coupe (lib/v2/widgets/saison.ts) ; changer le reglage relance l'ecriture.
 */
import { AppState, DeviceEventEmitter, Image } from 'react-native';
import { vitrineActive } from '@/lib/v2/visite/vitrine';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT, localISO } from '@/lib/v2/accueil/hydration';
import { ESPACE_CHANGED_EVENT, getEspace } from '@/lib/v2/espace';
import { construireContexte } from '@/lib/v2/montre/contexte';
import { lireSourcesContexte } from '@/lib/v2/montre/sources';
import { appliquerCharges } from '@/lib/v2/montre/actions';
import { CHRONOS_CHANGED_EVENT } from '@/lib/v2/montre/synchro';
import { personnageImage, sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { ARMURE_CHANGED_EVENT, getArmureState } from '@/lib/v2/armure';
import { DECORATIONS_SAISON_EVENT } from '@/lib/v2/saisons/reglage';
import { getStyleWidgets } from './style';
import { majSaisonWidgets } from './saison';
import {
  actionsEnAttenteNatif,
  ecrireInstantaneNatif,
  ecrirePersonnageNatif,
  ecrireSceneNatif,
  ecrireStyleNatif,
  rechargerWidgetsNatif,
  retirerActionsNatif,
  widgetsDisponibles,
} from './natif';

const TORII_EVENT = 'YOROI_TORII_CHANGED';
const ANTI_REBOND_MS = 2000;

let timer: ReturnType<typeof setTimeout> | null = null;
let dernierInstantane = '';
let derniereScene = '';
let dernierPerso = '';
let styleEnvoye = false;
let enCours: Promise<boolean> | null = null;
let lecture: Promise<void> | null = null;
let demarree = false;

/** La scene d'Accueil choisie (celle du moment pour le dojo), copiee reduite par le natif si elle a change */
async function majScene(): Promise<void> {
  try {
    const e = await getEspace();
    const r = Image.resolveAssetSource(sceneForNow(e.scene));
    const uri = r?.uri ?? '';
    if (!uri || uri === derniereScene) return;
    if (await ecrireSceneNatif(uri)) derniereScene = uri;
  } catch (e) {
    logger.warn('[Widgets] scene non copiee', e);
  }
}

/** Ton personnage au rang de l'Accueil (style C), copie par le natif s'il a change ; rien si « Sans personnage » */
async function majPersonnage(): Promise<void> {
  try {
    const e = await getEspace();
    let uri = '';
    if (aUnPersonnage(e.personnage)) {
      const a = await getArmureState().catch(() => null);
      const rang = Math.max(0, Math.min(4, a?.rank.index ?? 0));
      uri = Image.resolveAssetSource(personnageImage(e.personnage, rang))?.uri ?? '';
    }
    const cle = uri || 'aucun';
    if (cle === dernierPerso) return;
    if (await ecrirePersonnageNatif(uri)) dernierPerso = cle;
  } catch (e) {
    logger.warn('[Widgets] personnage non copie', e);
  }
}

/** Le style choisi dans l'app, repasse au natif une fois par lancement (A par defaut) */
async function majStyle(): Promise<void> {
  if (styleEnvoye) return;
  try {
    if (await ecrireStyleNatif(await getStyleWidgets())) styleEnvoye = true;
  } catch (e) {
    logger.warn('[Widgets] style non ecrit', e);
  }
}

/** La saison du jour (ou rien si les decorations sont coupees), passee au natif si elle a change ; le natif redessine */
async function majSaison(): Promise<void> {
  try {
    await majSaisonWidgets();
  } catch (e) {
    logger.warn('[Widgets] saison non ecrite', e);
  }
}

/** Construit et ecrit l'instantane, puis redessine les widgets. force : meme s'il n'a pas change */
export async function ecrireWidgets(force = false): Promise<boolean> {
  if (!widgetsDisponibles()) return false;
  // 18 octobre 2026 : pendant la visite guidee avec l'exemple, rien ne part (l'exemple n'est pas tes donnees)
  if (vitrineActive()) return false;
  if (enCours) await enCours.catch(() => false);
  enCours = (async () => {
    try {
      const ctx = construireContexte(await lireSourcesContexte());
      const { genere, ...reste } = ctx;
      // le jour compte : l'eau d'un instantane d'hier ne s'affiche pas aujourd'hui
      const empreinte = `${localISO()}|${JSON.stringify(reste)}`;
      const styleNeuf = !styleEnvoye;
      await majStyle();
      if (force || styleNeuf || empreinte !== dernierInstantane) {
        if (await ecrireInstantaneNatif(JSON.stringify(ctx))) {
          dernierInstantane = empreinte;
          await rechargerWidgetsNatif();
        }
      }
      await majScene();
      await majPersonnage();
      await majSaison();
      return true;
    } catch (e) {
      logger.warn('[Widgets] instantane non ecrit', e);
      return false;
    }
  })();
  const r = await enCours;
  enCours = null;
  return r;
}

/** Ecriture groupee : plusieurs changements en 2 s ne font qu'une ecriture */
export function planifierWidgets(): void {
  if (!widgetsDisponibles()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    ecrireWidgets().catch(() => undefined);
  }, ANTI_REBOND_MS);
}

const idDe = (a: unknown): string | null => {
  const id = a && typeof a === 'object' ? (a as { id?: unknown }).id : null;
  return typeof id === 'string' && id ? id : null;
};

/** Applique les actions faites depuis un widget, vide la file, puis reecrit l'instantane */
export function recevoirActionsWidgets(): Promise<void> {
  if (!widgetsDisponibles()) return Promise.resolve();
  // 18 octobre 2026 : pendant la visite guidee avec l'exemple, rien ne part (l'exemple n'est pas tes donnees)
  if (vitrineActive()) return Promise.resolve();
  if (lecture) return lecture;
  lecture = (async () => {
    try {
      const liste = await actionsEnAttenteNatif();
      if (liste.length === 0) return;
      const { appliquees, traitees } = await appliquerCharges(liste);
      const ids = liste.slice(0, traitees).map(idDe).filter((x): x is string => !!x);
      // la file d'abord, l'instantane ensuite : un verre n'est jamais compte deux fois par le widget
      await retirerActionsNatif(ids);
      if (appliquees > 0 || ids.length > 0) await ecrireWidgets(true);
    } catch (e) {
      logger.warn('[Widgets] actions non lues', e);
    } finally {
      lecture = null;
    }
  })();
  return lecture;
}

/** A appeler une fois (lib/v2/montre/SynchroMontre.tsx). Renvoie la fonction d'arret. */
export function demarrerSynchroWidgets(): () => void {
  if (!widgetsDisponibles() || demarree) return () => undefined;
  demarree = true;
  recevoirActionsWidgets().finally(() => planifierWidgets());
  const evts = [DATA_CHANGED_EVENT, HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT, ESPACE_CHANGED_EVENT, TORII_EVENT, CHRONOS_CHANGED_EVENT, ARMURE_CHANGED_EVENT, DECORATIONS_SAISON_EVENT].map((e) =>
    DeviceEventEmitter.addListener(e, planifierWidgets),
  );
  const app = AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      recevoirActionsWidgets().finally(() => planifierWidgets());
    } else if (s === 'background' && timer) {
      // un changement encore en attente part tout de suite
      clearTimeout(timer);
      timer = null;
      ecrireWidgets().catch(() => undefined);
    }
  });
  return () => {
    evts.forEach((s) => s.remove());
    app.remove();
    if (timer) clearTimeout(timer);
    timer = null;
    demarree = false;
  };
}
