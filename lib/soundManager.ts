import { Audio } from 'expo-av';
import logger from '@/lib/security/logger';

// ============================================
// SOUND DESIGN - SoundManager
// ============================================

let soundCache: { [key: string]: Audio.Sound } = {};

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
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    logger.info('SoundManager initialisé');
  } catch (error) {
    logger.error('Erreur initialisation SoundManager:', error);
  }
};

/**
 * Charge un son dans le cache
 */
const loadSound = async (soundName: string): Promise<Audio.Sound | null> => {
  try {
    // Si déjà chargé, retourner le son existant
    if (soundCache[soundName]) {
      return soundCache[soundName];
    }

    // Vérifier si le fichier son existe dans le mapping
    const soundModule = SOUND_FILES[soundName];
    if (!soundModule) {
      logger.info(`Fichier son ${soundName}.mp3 non trouvé (sera ajouté plus tard)`);
      return null;
    }

    const { sound } = await Audio.Sound.createAsync(
      soundModule,
      { shouldPlay: false }
    );

    soundCache[soundName] = sound;
    return sound;
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
    const sound = await loadSound(soundName);
    if (!sound) {
      logger.warn(`Son ${soundName} non disponible`);
      return;
    }

    // Réinitialiser la position si le son est déjà en cours
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(volume);
    await sound.playAsync();

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
export const cleanupSounds = async () => {
  try {
    for (const [name, sound] of Object.entries(soundCache)) {
      await sound.unloadAsync();
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
    loadSound('fanfare_badge').catch(() => {});
    loadSound('level_up').catch(() => {});
    loadSound('ring').catch(() => {});
    loadSound('gong').catch(() => {});
    loadSound('beep').catch(() => {});
  } catch (error) {
    logger.error('Erreur préparation sons:', error);
  }
};
