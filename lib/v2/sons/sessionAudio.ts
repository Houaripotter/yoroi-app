/**
 * Session audio des sons de seance (17 novembre 2026, retour de Houari : « les seances me coupent la musique,
 * ca me saoule »).
 *
 * Ce qui existait : les sons de seance (claquettes des 10 dernieres secondes, wizz de fin de repos, cloche, gong,
 * bips) passaient en mode mixWithOthers, regle une seule fois au premier son (lib/soundManager.ts). Mais le mode
 * audio est commun a toute l'app : le dernier qui le regle gagne. Le coach vocal, la visite guidee, l'enregistrement
 * de notes audio ou la scene animee de l'accueil le changent en route, et un reglage sans interruptionMode laisse
 * Android demander le focus audio complet (AUDIOFOCUS_GAIN_TRANSIENT : la musique se met en pause). Le son suivant de
 * la seance partait alors avec le reglage d'un autre ecran.
 *
 * Maintenant, chaque son de seance regle lui-meme le mode, juste avant de jouer, avec tous les champs :
 * - sons courts (claquettes, wizz, bip, cloche, sons de fete) : duckOthers. iOS : categorie playback avec duckOthers,
 *   ta musique baisse le temps du son ; Android : focus GAIN_TRANSIENT_MAY_DUCK, la musique baisse sans s'arreter ;
 * - sons longs (le gong resonne 54 s) : mixWithOthers, pour ne pas garder ta musique basse pendant une minute.
 * Des que le son finit, la main est rendue : le lecteur passe en pause, expo-audio desactive alors la session iOS avec
 * notifyOthersOnDeactivation (ta musique remonte) et rend le focus audio sur Android. Garde fou : au plus
 * DUREE_MAX_BAISSE_MS, meme si la fin du son n'arrive jamais.
 * Pas de setIsAudioActiveAsync(false) : il mettrait en pause tous les lecteurs de l'app (une phrase du coach en cours).
 */
import { setAudioModeAsync } from 'expo-audio';

export type GenreSon = 'court' | 'long';

const BASE = { playsInSilentMode: true, shouldPlayInBackground: true, allowsRecording: false, shouldRouteThroughEarpiece: false } as const;

/** Sons courts de seance : ta musique baisse le temps du son, puis remonte. Jamais coupee. */
export const MODE_SON_COURT = { ...BASE, interruptionMode: 'duckOthers' as const };
/** Sons longs : se melangent a ta musique sans la baisser */
export const MODE_SON_LONG = { ...BASE, interruptionMode: 'mixWithOthers' as const };

export function modePourSon(genre: GenreSon): typeof MODE_SON_COURT | typeof MODE_SON_LONG {
  return genre === 'long' ? MODE_SON_LONG : MODE_SON_COURT;
}

/** Au dela, la session est rendue quoi qu'il arrive (le plus long son court, la fanfare, dure 5,8 s) */
export const DUREE_MAX_BAISSE_MS = 7000;

/** Regle la session pour ce son. Jamais d'erreur : sans reglage, le son joue quand meme. */
export async function preparerSon(genre: GenreSon): Promise<void> {
  try {
    await setAudioModeAsync(modePourSon(genre));
  } catch {
    // rien : le son part avec le reglage en place
  }
}

/** Ce qu'il faut d'un lecteur expo-audio pour rendre la main a la fin du son */
export type LecteurRendable = {
  pause: () => void;
  addListener?: (evt: 'playbackStatusUpdate', f: (st: { didJustFinish?: boolean }) => void) => { remove: () => void };
};

const lectures = new WeakMap<object, number>();

/**
 * A appeler juste apres play() : a la fin du son (ou apres maxMs), le lecteur passe en pause, ce qui rend la session
 * audio (iOS) et le focus audio (Android). Si le meme lecteur repart entre temps, seule la derniere lecture compte.
 */
export function rendreLaMainApres(lecteur: LecteurRendable, maxMs: number = DUREE_MAX_BAISSE_MS): void {
  const n = (lectures.get(lecteur) ?? 0) + 1;
  lectures.set(lecteur, n);
  let fini = false;
  let abonnement: { remove: () => void } | null = null;
  const finir = () => {
    if (fini) return;
    fini = true;
    clearTimeout(garde);
    try {
      abonnement?.remove();
    } catch {
      // deja retire
    }
    if (lectures.get(lecteur) !== n) return;
    try {
      lecteur.pause();
    } catch {
      // lecteur libere : la session est deja rendue
    }
  };
  const garde = setTimeout(finir, Math.max(0, maxMs));
  try {
    abonnement = lecteur.addListener?.('playbackStatusUpdate', (st) => {
      if (st && st.didJustFinish) finir();
    }) ?? null;
  } catch {
    abonnement = null;
  }
}
