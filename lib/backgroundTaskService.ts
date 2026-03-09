// backgroundTaskService.ts
// Demande à iOS du temps d'exécution en arrière-plan pour que le JS
// continue de tourner ~30s après le verrouillage de l'écran.
// Combiné avec la notification planifiée (qui elle fonctionne toujours),
// on couvre la quasi-totalité des cas pratiques.

import { NativeModules, Platform } from 'react-native';

const { BackgroundTaskModule } = NativeModules;
const isSupported = Platform.OS === 'ios' && !!BackgroundTaskModule;

export const backgroundTaskService = {
  /**
   * Démarrer la tâche d'arrière-plan.
   * Appeler quand le timer démarre.
   * iOS accorde ~30 secondes de JS supplémentaires après verrouillage.
   */
  begin: () => {
    if (isSupported) BackgroundTaskModule.beginTask();
  },

  /**
   * Libérer la tâche.
   * Appeler quand le timer est mis en pause, stoppé ou terminé.
   */
  end: () => {
    if (isSupported) BackgroundTaskModule.endTask();
  },

  /** Temps restant accordé par iOS (en secondes). -1 = illimité (app au premier plan) */
  remainingTime: async (): Promise<number> => {
    if (!isSupported) return -1;
    return BackgroundTaskModule.remainingTime();
  },
};

export default backgroundTaskService;
