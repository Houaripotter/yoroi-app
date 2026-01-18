// ============================================
// YOROI SOUND MANAGER
// Gestion centralisée des sons du timer
// ============================================

import { Audio } from 'expo-av';
import logger from '@/lib/security/logger';

type SoundType = 'gong' | 'beep' | 'tick' | 'victory' | 'levelup' | 'wizz' | 'sonicring' | 'mariowin' | 'badgefanfare';

class SoundManager {
  private sounds: Map<SoundType, Audio.Sound> = new Map();
  private isInitialized = false;
  private isLoading = false;

  /**
   * Initialise le mode audio pour iOS (jouer meme en mode silencieux)
   * et charge tous les sons en memoire
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isLoading) return;

    this.isLoading = true;

    try {
      // Configuration audio importante pour iOS
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true, // Joue meme en mode silencieux !
        staysActiveInBackground: true, // Continue en arriere-plan
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Charger tous les sons
      await this.loadAllSounds();

      this.isInitialized = true;
      logger.info('[SoundManager] Initialise avec succes');
    } catch (error) {
      logger.error('[SoundManager] Erreur initialisation:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Charge tous les fichiers sons en memoire
   */
  private async loadAllSounds(): Promise<void> {
    const soundFiles: Record<SoundType, any> = {
      gong: require('../assets/sounds/gong.mp3'),
      beep: require('../assets/sounds/beep.mp3'),
      tick: require('../assets/sounds/beep.mp3'), // Utilise beep pour le tick (countdown)
      victory: require('../assets/sounds/gong.mp3'), // Fallback au gong
      levelup: require('../assets/sounds/pokemon-level-up-made-with-Voicemod.mp3'),
      // Nouveaux sons
      wizz: require('../assets/sounds/wizz-made-with-Voicemod.mp3'), // MSN notification
      sonicring: require('../assets/sounds/sonic-ring-sound-effect-made-with-Voicemod.mp3'), // XP/badge gain
      mariowin: require('../assets/sounds/super-mario-64-soundtrack-slider-made-with-Voicemod.mp3'), // Victoire
      badgefanfare: require('../assets/sounds/pokemon-heartgold-&-soulsilver-ost-fanfare-(badge-get)-made-with-Voicemod.mp3'), // Badge unlock
    };

    for (const [key, file] of Object.entries(soundFiles)) {
      try {
        const { sound } = await Audio.Sound.createAsync(file, {
          shouldPlay: false,
          volume: 1.0,
        });
        this.sounds.set(key as SoundType, sound);
        logger.info(`[SoundManager] Son charge: ${key}`);
      } catch (error) {
        logger.error(`[SoundManager] Erreur chargement ${key}:`, error);
      }
    }
  }

  /**
   * Joue un son specifique
   */
  async play(type: SoundType, volume: number = 1.0): Promise<void> {
    // S'assurer que le manager est initialise
    if (!this.isInitialized) {
      await this.initialize();
    }

    const sound = this.sounds.get(type);
    if (!sound) {
      logger.warn(`[SoundManager] Son non trouve: ${type}`);
      return;
    }

    try {
      // Remettre au debut et jouer
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
    } catch (error) {
      logger.error(`[SoundManager] Erreur lecture ${type}:`, error);
    }
  }

  /**
   * Joue le gong (debut/fin round)
   */
  async playGong(): Promise<void> {
    await this.play('gong');
  }

  /**
   * Joue le beep (avertissement)
   */
  async playBeep(): Promise<void> {
    await this.play('beep');
  }

  /**
   * Joue le tick pour countdown (10 dernieres secondes)
   * Volume plus faible que le gong
   */
  async playTick(): Promise<void> {
    await this.play('tick', 0.7);
  }

  /**
   * Joue le son de victoire (fin entrainement)
   */
  async playVictory(): Promise<void> {
    await this.play('victory');
  }

  /**
   * Joue le son de level up (progression)
   */
  async playLevelUp(): Promise<void> {
    await this.play('levelup');
  }

  /**
   * Joue le son MSN Wizz (notification importante)
   */
  async playWizz(): Promise<void> {
    await this.play('wizz');
  }

  /**
   * Joue le son Sonic Ring (gain XP/badge)
   */
  async playSonicRing(): Promise<void> {
    await this.play('sonicring');
  }

  /**
   * Joue le son Mario victoire (accomplissement)
   */
  async playMarioWin(): Promise<void> {
    await this.play('mariowin');
  }

  /**
   * Joue la fanfare de badge Pokemon (déverrouillage badge)
   */
  async playBadgeFanfare(): Promise<void> {
    await this.play('badgefanfare');
  }

  /**
   * Joue une sequence de countdown
   * Appele chaque seconde pendant les 10 dernieres secondes
   */
  async playCountdownTick(secondsRemaining: number): Promise<void> {
    if (secondsRemaining <= 0 || secondsRemaining > 10) return;

    // Tick plus fort pour les 3 dernieres secondes
    const volume = secondsRemaining <= 3 ? 1.0 : 0.6;
    await this.play('tick', volume);
  }

  /**
   * Joue le countdown 3-2-1 avec des beeps distincts
   * Pour les 3 dernieres secondes avant un changement de phase
   */
  async playFinalCountdown(secondsRemaining: number): Promise<void> {
    if (secondsRemaining === 3 || secondsRemaining === 2 || secondsRemaining === 1) {
      // Beep fort pour les 3 dernieres secondes
      await this.play('beep', 1.0);
    }
  }

  /**
   * Decharge tous les sons de la memoire
   */
  async cleanup(): Promise<void> {
    for (const [key, sound] of this.sounds.entries()) {
      try {
        await sound.unloadAsync();
        logger.info(`[SoundManager] Son decharge: ${key}`);
      } catch (error) {
        logger.error(`[SoundManager] Erreur dechargement ${key}:`, error);
      }
    }
    this.sounds.clear();
    this.isInitialized = false;
  }

  /**
   * Verifie si le manager est pret
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Instance singleton
export const soundManager = new SoundManager();

export default soundManager;
