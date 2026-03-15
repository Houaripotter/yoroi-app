import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import logger from '@/lib/security/logger';

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
};

/**
 * Initialise le SoundManager
 */
export const initSoundManager = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
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
export const playSound = async (soundName: 'fanfare_badge' | 'level_up' | 'recovery' | 'ring' | 'beep' | 'gong', volume: number = 0.7) => {
  try {
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
 * Joue le son de validation d'une séance
 */
export const playWorkoutCompleteSound = async () => {
  await playSound('fanfare_badge', 0.8);
};

/**
 * Joue le son de passage de niveau
 */
export const playLevelUpSound = async () => {
  await playSound('level_up', 0.9);
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
  } catch (error) {
    logger.error('Erreur préparation sons:', error);
  }
};
