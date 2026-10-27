import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import logger from '@/lib/security/logger';
import { sonsActifs } from '@/lib/v2/sons/reglage';

// ============================================
// SOUND DESIGN - SoundManager
// ============================================

let soundCache: { [key: string]: AudioPlayer } = {};

// Mapping statique des fichiers sons (requis par React Native bundler)
const SOUND_FILES: { [key: string]: any } = {
  'fanfare_badge': require('../assets/sounds/fanfare-badge.mp3'),
  'level_up': require('../assets/sounds/level-up.mp3'),
  'recovery': require('../assets/sounds/recovery.mp3'),
  'ring': require('../assets/sounds/ring.mp3'),
  'beep': require('../assets/sounds/beep.mp3'),
  'gong': require('../assets/sounds/gong.mp3'),
  'clap': require('../assets/sounds/clap10.mp3'),
  'bell': require('../assets/sounds/bell_end.mp3'),
};

/**
 * Initialise le SoundManager
 */
export const initSoundManager = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      // se melange a la musique sans la couper
      interruptionMode: 'mixWithOthers',
    });
    logger.info('SoundManager initialisé');
  } catch (error) {
    logger.error('Erreur initialisation SoundManager:', error);
  }
};

/**
 * Charge un son dans le cache
 */
const loadSound = (soundName: string): AudioPlayer | null => {
  try {
    if (soundCache[soundName]) {
      return soundCache[soundName];
    }

    const soundModule = SOUND_FILES[soundName];
    if (!soundModule) {
      logger.info(`Fichier son ${soundName}.mp3 non trouvé (sera ajouté plus tard)`);
      return null;
    }

    const player = createAudioPlayer(soundModule);
    soundCache[soundName] = player;
    return player;
  } catch (error) {
    logger.error(`Erreur chargement son ${soundName}:`, error);
    return null;
  }
};

/**
 * Joue un son
 */
// 26 octobre 2026 (retour d'un utilisateur : « quand ca sonne, ca arrete ma musique ») : le bip de fin de repos
// partait sans que le mode audio soit regle. iOS gardait alors sa categorie par defaut (solo, qui coupe Spotify)
// et Android prenait le focus audio (la musique se met en pause). Le mode « se melange a la musique » est
// maintenant regle avant le premier son, partout.
let modePret: Promise<void> | null = null;
const assurerMode = (): Promise<void> => {
  if (!modePret) modePret = initSoundManager().catch(() => { modePret = null; });
  return modePret;
};

type NomSon = 'fanfare_badge' | 'level_up' | 'recovery' | 'ring' | 'beep' | 'gong' | 'clap' | 'bell';

export const playSound = async (soundName: NomSon, volume: number = 0.7) => {
  try {
    // 27 octobre 2026 : rien ne joue quand les sons sont coupes dans les Reglages
    if (!sonsActifs()) return;
    await assurerMode();
    const player = loadSound(soundName);
    if (!player) {
      logger.warn(`Son ${soundName} non disponible`);
      return;
    }

    await player.seekTo(0);
    player.volume = volume;
    player.play();

    logger.info(`Son ${soundName} joué`);
  } catch (error) {
    logger.error(`Erreur lecture son ${soundName}:`, error);
  }
};

/**
 * 27 octobre 2026 : les sons de fete (badge, rang, plaque d'armure) ne se chevauchent jamais. Si une fete sonne
 * encore, la suivante attend sa fin ; au dela de quelques secondes d'attente, elle ne joue pas (jamais d'empilement).
 */
const DUREE_MS: Partial<Record<NomSon, number>> = { fanfare_badge: 5760, level_up: 1368, ring: 888, recovery: 4248 };
let feteJusqua = 0;
export const playCelebrationSound = (soundName: NomSon, volume: number): Promise<void> => {
  if (!sonsActifs()) return Promise.resolve();
  const now = Date.now();
  const attente = Math.max(0, feteJusqua - now);
  if (attente > 7000) return Promise.resolve();
  feteJusqua = now + attente + (DUREE_MS[soundName] ?? 1500);
  if (attente === 0) return playSound(soundName, volume);
  return new Promise((resolve) => {
    setTimeout(() => { playSound(soundName, volume).finally(() => resolve()); }, attente + 150);
  });
};

/** Pour les tests : oublie la fete en cours */
export const _resetCelebrationSound = () => { feteJusqua = 0; };

/**
 * Joue le son de validation d'une séance (la fanfare du badge, a garder telle quelle)
 */
export const playWorkoutCompleteSound = async () => {
  await playCelebrationSound('fanfare_badge', 0.8);
};

/**
 * Joue le son de passage de niveau (passage de rang ou de dan)
 */
export const playLevelUpSound = async () => {
  await playCelebrationSound('level_up', 0.9);
};

/**
 * Sceaux gagnes, recapitules dans le Dojo : le meme son de badge que la fin de seance
 */
export const playBadgeSound = async () => {
  await playCelebrationSound('fanfare_badge', 0.8);
};

/**
 * Nouvelle etape d'une piece d'armure (plaque) dans le Dojo : le petit son de succes
 */
export const playPlaqueSound = async () => {
  await playCelebrationSound('ring', 0.6);
};

/**
 * Joue le son de succès (enregistrement mesure, etc.)
 */
export const playSuccessSound = async () => {
  await playSound('ring', 0.6);
};

/**
 * Joue le son du gong
 */
export const playGongSound = async () => {
  await playSound('gong', 0.7);
};

/**
 * Joue un petit son de bip
 */
export const playBeepSound = async () => {
  await playSound('beep', 0.5);
};

/**
 * Claquettes de bois : il reste 10 secondes dans le round
 */
export const playClapSound = async () => {
  await playSound('clap', 1.0);
};

/**
 * Cloche de ring : fin du round
 */
export const playBellSound = async () => {
  await playSound('bell', 1.0);
};

/**
 * Libère les ressources audio
 */
export const cleanupSounds = () => {
  try {
    for (const [name, player] of Object.entries(soundCache)) {
      player.remove();
      delete soundCache[name];
    }
    logger.info('Sons libérés');
  } catch (error) {
    logger.error('Erreur libération sons:', error);
  }
};

/**
 * Prépare les sons (appeler au démarrage de l'app)
 */
export const prepareSounds = async () => {
  try {
    await initSoundManager();
    // Précharger les sons en arrière-plan
    loadSound('fanfare_badge');
    loadSound('level_up');
    loadSound('ring');
    loadSound('gong');
    loadSound('beep');
    loadSound('clap');
    loadSound('bell');
  } catch (error) {
    logger.error('Erreur préparation sons:', error);
  }
};
