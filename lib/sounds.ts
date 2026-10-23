// ============================================
// YOROI SOUND MANAGER
// Gestion centralisée des sons du timer
// Utilise expo-audio (SDK 55+), sons pré-chargés
// ============================================

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import logger from '@/lib/security/logger';

type SoundType = 'gong' | 'beep' | 'tick' | 'victory' | 'levelup' | 'wizz' | 'sonicring' | 'mariowin' | 'badgefanfare' | 'clap' | 'bell';

const SOUND_FILES: Record<string, number> = {
  gong: require('@/assets/sounds/gong.mp3'),
  beep: require('@/assets/sounds/beep.mp3'),
  victory: require('@/assets/sounds/victory.mp3'),
  wizz: require('@/assets/sounds/wizz.mp3'),
  levelup: require('@/assets/sounds/level-up.mp3'),
  ring: require('@/assets/sounds/ring.mp3'),
  recovery: require('@/assets/sounds/recovery.mp3'),
  fanfare: require('@/assets/sounds/fanfare-badge.mp3'),
  // Claquettes de bois des 10 dernieres secondes (son cree pour YOROI, libre de droits)
  clap: require('@/assets/sounds/clap10.mp3'),
  // Cloche de ring de fin de round, ding ding ding (son cree pour YOROI, libre de droits)
  bell: require('@/assets/sounds/bell_end.mp3'),
};

// Mapping des types vers les clés de fichier
const TYPE_TO_KEY: Record<string, string> = {
  badgefanfare: 'fanfare',
  sonicring: 'ring',
  mariowin: 'victory',
  tick: 'beep',
};

class SoundManager {
  private isInitialized = false;
  private players: Map<string, AudioPlayer> = new Map();
  // Nombre d'ecrans qui utilisent les sons : on ne libere qu'au depart du dernier
  // (le chrono de sparring s'ouvre par-dessus les chronos, il ne doit pas couper leurs sons)
  private users = 0;

  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    this.users += 1;
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          // se melange a la musique (Spotify, Musique) sans la couper ni la baisser
          interruptionMode: 'mixWithOthers',
        });
        // Pre-charger TOUS les sons en creant des players
        for (const [key, source] of Object.entries(SOUND_FILES)) {
          try {
            const player = createAudioPlayer(source);
            player.volume = 1.0;
            this.players.set(key, player);
          } catch (e) {
            logger.warn(`SoundManager: erreur pré-chargement "${key}"`, e);
          }
        }
        this.isInitialized = true;
      } catch (e) {
        logger.warn('SoundManager: erreur initialisation audio', e);
      } finally {
        this.initPromise = null;
      }
    })();
    return this.initPromise;
  }

  // Lecture instantanée, fire-and-forget, ne bloque JAMAIS le thread
  play(type: SoundType, volume: number = 1.0): void {
    const key = TYPE_TO_KEY[type] || type;
    const player = this.players.get(key);
    if (!player) return;
    try {
      player.volume = volume;
      player.seekTo(0);
      player.play();
    } catch {
      // Ignorer, ne jamais bloquer le timer
    }
  }

  playGong(): void { this.play('gong'); }
  playBeep(): void { this.play('beep'); }
  playTick(): void { this.play('beep', 0.3); }
  playVictory(): void { this.play('victory'); }
  playLevelUp(): void { this.play('levelup'); }
  playWizz(): void { this.play('wizz'); }
  playSonicRing(): void { this.play('sonicring'); }
  playMarioWin(): void { this.play('mariowin'); }
  playBadgeFanfare(): void { this.play('badgefanfare'); }
  /** Clac clac clac : il reste 10 secondes dans le round */
  playClap(): void { this.play('clap'); }
  /** Ding ding ding : fin du round */
  playBell(): void { this.play('bell'); }

  playCountdownTick(_secondsRemaining: number): void {
    this.play('beep', 0.4);
  }

  playFinalCountdown(_secondsRemaining: number): void {
    this.play('beep', 0.8);
  }

  async cleanup(): Promise<void> {
    this.users = Math.max(0, this.users - 1);
    if (this.users > 0) return;
    for (const [, player] of this.players) {
      try { player.release(); } catch { /* ignore */ }
    }
    this.players.clear();
    this.isInitialized = false;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Instance singleton
export const soundManager = new SoundManager();

export default soundManager;
