/**
 * Coach vocal : joue la phrase dans les écouteurs, avec expo-audio (la même bibliothèque que la visite guidée,
 * components/yoroi/v2/tour/VisiteGuidee.tsx).
 *
 * Ta musique (Spotify, Musique) baisse le temps de la phrase puis remonte :
 *  - avant la phrase, le mode audio passe en duckOthers (iOS : catégorie playback avec duckOthers ;
 *    Android : focus audio GAIN_TRANSIENT_MAY_DUCK) ;
 *  - à la fin, expo-audio rend la main lui même (iOS : session désactivée avec notifyOthersOnDeactivation ;
 *    Android : focus audio rendu), et le mode revient à mixWithOthers, celui des autres sons de l'app
 *    (lib/sounds.ts) : un bip de chrono ne baisse jamais ta musique.
 * Une phrase à la fois : si une phrase est déjà en cours, la nouvelle est ignorée.
 * Voix en français seulement pour l'instant : dans une autre langue, le coach se tait.
 * Tout est protégé : une erreur audio ne casse jamais la séance.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { LANG } from '@/lib/i18n/tr';
import { fichierPhrase } from './sons';

const MODE_PAROLE = { playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'duckOthers' as const };
const MODE_NORMAL = { playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' as const };
/** au delà, la phrase est coupée et la musique remonte quoi qu'il arrive */
const DUREE_MAX_MS = 9000;

let enCours: AudioPlayer | null = null;
let garde: ReturnType<typeof setTimeout> | null = null;

/** La voix existe pour cette phrase, dans la langue de l'app */
export function peutDire(id: string): boolean {
  return LANG === 'fr' && fichierPhrase(id) !== null;
}

export function parle(): boolean {
  return enCours !== null;
}

function finir(p: AudioPlayer | null): void {
  if (garde) {
    clearTimeout(garde);
    garde = null;
  }
  if (p && enCours === p) enCours = null;
  try {
    p?.remove();
  } catch {
    // deja libere
  }
  setAudioModeAsync(MODE_NORMAL).catch(() => undefined);
}

/** Dit la phrase. Sans fichier (ou hors français) : rien, en silence */
export async function dire(id: string | null | undefined): Promise<void> {
  if (!id || enCours) return;
  if (LANG !== 'fr') return;
  const fichier = fichierPhrase(id);
  // pas de voix du téléphone en secours : expo-speech n'est pas installé dans l'app
  if (fichier === null) return;
  let p: AudioPlayer | null = null;
  try {
    await setAudioModeAsync(MODE_PAROLE).catch(() => undefined);
    p = createAudioPlayer(fichier);
    enCours = p;
    const lecteur = p;
    lecteur.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) finir(lecteur);
    });
    garde = setTimeout(() => finir(lecteur), DUREE_MAX_MS);
    lecteur.volume = 1;
    lecteur.play();
  } catch {
    finir(p);
  }
}

/** Coupe la phrase en cours (séance fermée, coach coupé) */
export function taire(): void {
  if (!enCours) return;
  const p = enCours;
  try {
    p.pause();
  } catch {
    // rien
  }
  finir(p);
}
