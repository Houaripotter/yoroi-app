/**
 * Acces au module natif YoroiWidgets (iOS : ios/Yoroi/Widgets/YoroiWidgetsModule.swift ; Android : meme nom,
 * memes fonctions). Sur le web, dans Expo Go ou sans le module, tout renvoie une valeur vide : rien ne plante.
 *  - setSnapshot(json) : l'instantane v1 (le meme JSON que la montre, lib/v2/montre/contexte.ts)
 *  - setSceneImage(uri) : la scene d'Accueil, reduite par le natif (fond du style A, fenetre du style B, Tableau du jour)
 *  - setPersonnageImage(uri) : ton personnage, la meme image que l'Accueil, sans rang ni XP (style C) ; uri vide : le retire
 *  - setStyle(style) : style des widgets, "A" Nuit de lanternes (par defaut), "B" Rouleau et encre, "C" Armure laquee
 *  - setSeason(saison) : decoration de saison des widgets, "halloween", "noel" ou "" (lib/v2/widgets/saison.ts ; iOS)
 *  - getPendingActions() : JSON tableau des actions faites depuis un widget (+ 1 verre, retrait)
 *  - clearPendingActions(ids) : retire les actions appliquees
 *  - reload() : redessine les widgets
 *  - getPendingLink() : lien laisse par iOS (demarrage a froid, Centre de controle), lu puis efface (lib/v2/widgets/liens.ts)
 *  - startChrono, updateChrono, stopChrono : Live Activity du chrono rounds (iOS seulement)
 */
import { NativeModules, Platform } from 'react-native';

type ModuleWidgets = {
  setSnapshot?: (json: string) => Promise<boolean>;
  setSceneImage?: (uri: string) => Promise<boolean>;
  setPersonnageImage?: (uri: string) => Promise<boolean>;
  setStyle?: (style: string) => Promise<boolean>;
  setSeason?: (saison: string) => Promise<boolean>;
  getPendingActions?: () => Promise<string | unknown[]>;
  clearPendingActions?: (ids: string[]) => Promise<boolean>;
  reload?: () => Promise<boolean>;
  getPendingLink?: () => Promise<string | null>;
  startChrono?: (json: string) => Promise<boolean>;
  updateChrono?: (json: string) => Promise<boolean>;
  stopChrono?: () => Promise<boolean>;
};

function mod(): ModuleWidgets | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  try {
    const m = (NativeModules as Record<string, unknown>).YoroiWidgets;
    return m && typeof m === 'object' ? (m as ModuleWidgets) : null;
  } catch {
    return null;
  }
}

/** Vrai si l'app a ses widgets (module natif present) */
export const widgetsDisponibles = (): boolean => typeof mod()?.setSnapshot === 'function';

export async function ecrireInstantaneNatif(json: string): Promise<boolean> {
  const m = mod();
  if (!m?.setSnapshot) return false;
  try {
    return !!(await m.setSnapshot(json));
  } catch {
    return false;
  }
}

export async function ecrireSceneNatif(uri: string): Promise<boolean> {
  const m = mod();
  if (!m?.setSceneImage) return false;
  try {
    return !!(await m.setSceneImage(uri));
  } catch {
    return false;
  }
}

export async function ecrirePersonnageNatif(uri: string): Promise<boolean> {
  const m = mod();
  if (!m?.setPersonnageImage) return false;
  try {
    return !!(await m.setPersonnageImage(uri));
  } catch {
    return false;
  }
}

/** Le style des widgets ("A", "B" ou "C") dans l'App Group (iOS) ou les SharedPreferences (Android) */
export async function ecrireStyleNatif(style: string): Promise<boolean> {
  const m = mod();
  if (!m?.setStyle) return false;
  try {
    return !!(await m.setStyle(style));
  } catch {
    return false;
  }
}

/**
 * La saison des widgets ("halloween", "noel" ou "" : aucune) dans l'App Group. Un build qui n'a pas encore
 * setSeason (ancien build, Android) renvoie false sans planter.
 */
export async function ecrireSaisonNatif(saison: string): Promise<boolean> {
  const m = mod();
  if (typeof m?.setSeason !== 'function') return false;
  try {
    return !!(await m.setSeason(saison));
  } catch {
    return false;
  }
}

/** Les actions des widgets en attente (objets du contrat v1 des actions montre, source « widget ») */
export async function actionsEnAttenteNatif(): Promise<unknown[]> {
  const m = mod();
  if (!m?.getPendingActions) return [];
  try {
    const r = await m.getPendingActions();
    const l = typeof r === 'string' ? JSON.parse(r || '[]') : r;
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}

export async function retirerActionsNatif(ids: string[]): Promise<void> {
  const m = mod();
  if (!m?.clearPendingActions || ids.length === 0) return;
  try {
    await m.clearPendingActions(ids);
  } catch {
    // reessaye au prochain passage (dedoublonne par id)
  }
}

export async function rechargerWidgetsNatif(): Promise<void> {
  const m = mod();
  if (!m?.reload) return;
  try {
    await m.reload();
  } catch {
    // le systeme redessinera de lui-meme
  }
}

/** Le lien de widget laisse par le natif (lu une seule fois), ou null */
export async function lienEnAttenteNatif(): Promise<string | null> {
  const m = mod();
  if (!m?.getPendingLink) return null;
  try {
    const r = await m.getPendingLink();
    return typeof r === 'string' && r ? r : null;
  } catch {
    return null;
  }
}

// ─── Live Activity du chrono (iOS) ───────────────────────────────────────────

/** Vrai si la Live Activity du chrono peut etre lancee (iOS avec le module natif) */
export const activiteChronoDisponible = (): boolean => Platform.OS === 'ios' && typeof mod()?.startChrono === 'function';

// les appels passent un par un : une mise a jour n'arrive jamais avant le demarrage
let file: Promise<unknown> = Promise.resolve();
function enFile(appel: () => Promise<unknown> | undefined): void {
  file = file.then(appel).catch(() => undefined);
}

/**
 * 26 octobre 2026 : la seance de musculation et le chrono seul partagent la meme Live Activity et le meme lien
 * (yoroi://w/chrono-en-cours). On retient qui l'a lancee, pour que le toucher ouvre le bon ecran.
 */
export type ProprioActivite = 'seance' | 'chrono';
const CLE_PROPRIO = 'yoroi_activite_proprio_v1';
let proprio: ProprioActivite | null = null;

export function demarrerActiviteNatif(json: string, qui: ProprioActivite = 'chrono'): void {
  proprio = qui;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage').default.setItem(CLE_PROPRIO, qui).catch(() => {});
  } catch {
    // stockage indisponible : la memoire suffit tant que l'app vit
  }
  enFile(() => mod()?.startChrono?.(json));
}

/** Qui a lance la Live Activity en cours (null si inconnu) */
export async function proprioActivite(): Promise<ProprioActivite | null> {
  if (proprio) return proprio;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const v = await require('@react-native-async-storage/async-storage').default.getItem(CLE_PROPRIO);
    return v === 'seance' || v === 'chrono' ? v : null;
  } catch {
    return null;
  }
}

export function majActiviteNatif(json: string): void {
  enFile(() => mod()?.updateChrono?.(json));
}

export function arreterActiviteNatif(): void {
  enFile(() => mod()?.stopChrono?.());
}
