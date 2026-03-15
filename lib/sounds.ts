// ============================================
// YOROI SOUND MANAGER
// Gestion centralisée des sons du timer
// Sons désactivés (expo-av non installé)
// ============================================

type SoundType = 'gong' | 'beep' | 'tick' | 'victory' | 'levelup' | 'wizz' | 'sonicring' | 'mariowin' | 'badgefanfare';

class SoundManager {
  private isInitialized = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  async play(_type: SoundType, _volume: number = 1.0): Promise<void> {}

  async playGong(): Promise<void> {}
  async playBeep(): Promise<void> {}
  async playTick(): Promise<void> {}
  async playVictory(): Promise<void> {}
  async playLevelUp(): Promise<void> {}
  async playWizz(): Promise<void> {}
  async playSonicRing(): Promise<void> {}
  async playMarioWin(): Promise<void> {}
  async playBadgeFanfare(): Promise<void> {}
  async playCountdownTick(_secondsRemaining: number): Promise<void> {}
  async playFinalCountdown(_secondsRemaining: number): Promise<void> {}
  async cleanup(): Promise<void> { this.isInitialized = false; }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Instance singleton
export const soundManager = new SoundManager();

export default soundManager;
