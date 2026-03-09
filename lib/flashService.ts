// flashService.ts — contrôle du flash iPhone depuis JavaScript
import { NativeModules, Platform } from 'react-native';

const { TorchModule } = NativeModules;

const hasFlash = Platform.OS === 'ios' && !!TorchModule;

export const flashService = {
  /** Allume le flash */
  on: () => {
    if (hasFlash) TorchModule.setTorch(true);
  },

  /** Éteint le flash */
  off: () => {
    if (hasFlash) TorchModule.setTorch(false);
  },

  /**
   * Flash d'alarme : stroboscope pendant ~3 secondes puis éteint
   * count = nombre de clignotements, interval = secondes entre chaque
   */
  alarm: () => {
    if (hasFlash) TorchModule.strobe(6, 0.25); // 6 clignots, 0.25s interval
  },
};

export default flashService;
