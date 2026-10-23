/**
 * Synchro iPhone vers Apple Watch (contrat v1) : le contexte part au lancement, au retour au premier plan
 * et apres chaque changement de poids, de seance, d'eau ou de chrono (anti rebond de 2 s).
 * Les actions de la montre (transferUserInfo, sendMessage) sont gardees par le pont natif jusqu'a leur application.
 * iOS seulement : ailleurs, demarrerSynchroMontre ne fait rien.
 */
import { AppState, DeviceEventEmitter } from 'react-native';
import { vitrineActive } from '@/lib/v2/visite/vitrine';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT } from '@/lib/v2/accueil/hydration';
import { ESPACE_CHANGED_EVENT } from '@/lib/v2/espace';
import { construireContexte } from './contexte';
import { lireSourcesContexte } from './sources';
import { appliquerCharges } from './actions';
import { chargerIdsMontre } from './idsRecus';
import { activerSessionMontre, chargesEnAttente, ecouterChargesMontre, envoyerContexteNatif, pontMontreDisponible, retirerChargesEnAttente } from './pont';

/** emis par le chrono quand tes rounds changent */
export const CHRONOS_CHANGED_EVENT = 'YOROI_CHRONOS_CHANGED';
const TORII_EVENT = 'YOROI_TORII_CHANGED';
const ANTI_REBOND_MS = 2000;

let timer: ReturnType<typeof setTimeout> | null = null;
let dernierEnvoi = '';
let enCours: Promise<boolean> | null = null;
let demarree = false;

/** Construit et envoie le contexte. force : meme s'il n'a pas change depuis le dernier envoi */
export async function envoyerContexteMontre(force = false): Promise<boolean> {
  if (!pontMontreDisponible()) return false;
  // 18 octobre 2026 : pendant la visite guidee avec l'exemple, rien ne part (l'exemple n'est pas tes donnees)
  if (vitrineActive()) return false;
  if (enCours) await enCours.catch(() => false);
  enCours = (async () => {
    try {
      const ctx = construireContexte(await lireSourcesContexte());
      const { genere, ...reste } = ctx;
      const empreinte = JSON.stringify(reste);
      if (!force && empreinte === dernierEnvoi) return true;
      const ok = await envoyerContexteNatif(JSON.stringify(ctx));
      if (ok) dernierEnvoi = empreinte;
      return ok;
    } catch (e) {
      logger.warn('[Montre] contexte non envoye', e);
      return false;
    }
  })();
  const r = await enCours;
  enCours = null;
  return r;
}

/** Envoi groupe : plusieurs changements en 2 s ne font qu'un envoi */
export function planifierEnvoiMontre(): void {
  if (!pontMontreDisponible()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    envoyerContexteMontre().catch(() => undefined);
  }, ANTI_REBOND_MS);
}

let lecture: Promise<void> | null = null;

/** Applique les actions de la montre en attente dans le pont natif, puis renvoie le contexte */
export function recevoirActionsMontre(): Promise<void> {
  if (!pontMontreDisponible()) return Promise.resolve();
  // 18 octobre 2026 : pendant la visite guidee avec l'exemple, rien ne part (l'exemple n'est pas tes donnees)
  if (vitrineActive()) return Promise.resolve();
  if (lecture) return lecture;
  lecture = (async () => {
    try {
      const charges = await chargesEnAttente();
      if (charges.length === 0) return;
      const { appliquees, traitees } = await appliquerCharges(charges);
      await retirerChargesEnAttente(traitees);
      if (appliquees > 0) planifierEnvoiMontre();
    } catch (e) {
      logger.warn('[Montre] actions non lues', e);
    } finally {
      lecture = null;
    }
  })();
  return lecture;
}

/** A appeler une fois (app/_layout.tsx). Renvoie la fonction d'arret. */
export function demarrerSynchroMontre(): () => void {
  if (!pontMontreDisponible() || demarree) return () => undefined;
  demarree = true;
  chargerIdsMontre().catch(() => undefined);
  activerSessionMontre()
    .then(() => recevoirActionsMontre())
    .finally(() => planifierEnvoiMontre());
  const evts = [DATA_CHANGED_EVENT, HYDRATION_AMOUNT_EVENT, HYDRATION_GOAL_EVENT, ESPACE_CHANGED_EVENT, TORII_EVENT, CHRONOS_CHANGED_EVENT].map((e) =>
    DeviceEventEmitter.addListener(e, planifierEnvoiMontre),
  );
  const app = AppState.addEventListener('change', (s) => {
    if (s === 'active') {
      recevoirActionsMontre().finally(() => planifierEnvoiMontre());
    }
  });
  const stopNatif = ecouterChargesMontre(() => {
    recevoirActionsMontre().catch(() => undefined);
  });
  return () => {
    evts.forEach((s) => s.remove());
    app.remove();
    stopNatif();
    if (timer) clearTimeout(timer);
    timer = null;
    demarree = false;
  };
}
