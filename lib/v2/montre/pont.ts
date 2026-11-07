/**
 * Acces au pont natif WatchConnectivity (ios/Yoroi/WatchConnectivity). Sur Android, sur le web,
 * dans Expo Go ou sans le module natif, tout renvoie une valeur vide : rien ne plante.
 */
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type Pont = {
  activateSession?: () => Promise<boolean>;
  ping?: () => Promise<{ supported?: boolean; paired?: boolean; installed?: boolean; reachable?: boolean; state?: string }>;
  updateApplicationContext?: (ctx: Record<string, unknown>) => Promise<boolean>;
  sendMessageToWatch?: (msg: Record<string, unknown>) => Promise<unknown>;
  getPendingPayloads?: () => Promise<string[]>;
  clearPendingPayloads?: (count: number) => Promise<boolean>;
  addListener?: (e: string) => void;
  removeListeners?: (n: number) => void;
};

const mod: Pont | null = Platform.OS === 'ios' ? ((NativeModules as Record<string, unknown>).WatchConnectivityBridge as Pont | undefined) ?? null : null;
let emitter: NativeEventEmitter | null = null;

export const pontMontreDisponible = (): boolean => !!mod;

export type EtatMontre = { jumelee: boolean; installee: boolean; joignable: boolean };

export async function activerSessionMontre(): Promise<void> {
  try {
    await mod?.activateSession?.();
  } catch {
    // WatchConnectivity non pris en charge (iPad)
  }
}

export async function etatMontre(): Promise<EtatMontre | null> {
  if (!mod?.ping) return null;
  try {
    const p = await mod.ping();
    return { jumelee: !!p?.paired, installee: !!p?.installed, joignable: !!p?.reachable };
  } catch {
    return null;
  }
}

/** updateApplicationContext({ yoroi: JSON }) ; false si la montre n'est pas la ou si l'envoi echoue */
export async function envoyerContexteNatif(json: string): Promise<boolean> {
  if (!mod?.updateApplicationContext) return false;
  try {
    return !!(await mod.updateApplicationContext({ yoroi: json }));
  } catch {
    return false;
  }
}

/**
 * 7 novembre 2026 : sendMessage({ yoroi: JSON }), livre tout de suite quand la montre est joignable (app ouverte
 * ou gardee vivante par la seance). false si elle ne l'est pas : le contexte d'application suit son chemin.
 * La montre le lit comme un contexte (ios/YoroiWatch/Services/Synchro.swift, didReceiveMessage).
 */
export async function envoyerMessageNatif(json: string): Promise<boolean> {
  if (!mod?.sendMessageToWatch) return false;
  try {
    await mod.sendMessageToWatch({ yoroi: json });
    return true;
  } catch {
    return false;
  }
}

export async function chargesEnAttente(): Promise<string[]> {
  if (!mod?.getPendingPayloads) return [];
  try {
    const l = await mod.getPendingPayloads();
    return Array.isArray(l) ? l.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function retirerChargesEnAttente(n: number): Promise<void> {
  if (!mod?.clearPendingPayloads || n <= 0) return;
  try {
    await mod.clearPendingPayloads(n);
  } catch {
    // reessaye au prochain passage (dedoublonne par id)
  }
}

/** Ecoute les charges « yoroi » arrivees de la montre ; renvoie la fonction pour arreter */
export function ecouterChargesMontre(cb: () => void): () => void {
  if (!mod) return () => undefined;
  try {
    if (!emitter) emitter = new NativeEventEmitter(mod as never);
    const subs = [emitter.addListener('onYoroiPayload', cb), emitter.addListener('onWatchActivationCompleted', cb)];
    return () => subs.forEach((s) => s.remove());
  } catch {
    return () => undefined;
  }
}
