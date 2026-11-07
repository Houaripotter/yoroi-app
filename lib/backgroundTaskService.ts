// backgroundTaskService.ts
// Demande à iOS du temps d'exécution en arrière-plan pour que le JS
// continue de tourner ~30s après le verrouillage de l'écran.
// Combiné avec la notification planifiée (qui elle fonctionne toujours),
// on couvre la quasi-totalité des cas pratiques.

import { NativeModules, Platform } from 'react-native';

const { BackgroundTaskModule } = NativeModules;
const isSupported = Platform.OS === 'ios' && !!BackgroundTaskModule;

// 7 novembre 2026 : le module natif ne tient qu'une tache a la fois. La sauvegarde en quittant l'app
// (lib/v2/sauvegarde/declencheurs.ts) ne prend la tache que si personne ne l'a (minuteur), et ne libere
// que la sienne : le minuteur garde toujours son temps en arriere-plan.
let proprietaire: string | null = null;

export const backgroundTaskService = {
  /**
   * Démarrer la tâche d'arrière-plan.
   * Appeler quand le timer démarre.
   * iOS accorde ~30 secondes de JS supplémentaires après verrouillage.
   */
  begin: () => {
    proprietaire = 'minuteur';
    if (isSupported) BackgroundTaskModule.beginTask();
  },

  /**
   * Libérer la tâche.
   * Appeler quand le timer est mis en pause, stoppé ou terminé.
   */
  end: () => {
    proprietaire = null;
    if (isSupported) BackgroundTaskModule.endTask();
  },

  /** Prend la tache si elle est libre. Vrai si elle est a nous ; faux si non geree ou deja tenue (le travail tourne quand meme). */
  prendre: (nom: string): boolean => {
    if (!isSupported || proprietaire) return false;
    proprietaire = nom;
    try {
      BackgroundTaskModule.beginTask();
      return true;
    } catch {
      proprietaire = null;
      return false;
    }
  },

  /** Libere la tache seulement si c'est la notre */
  rendre: (nom: string): void => {
    if (proprietaire !== nom) return;
    proprietaire = null;
    try {
      if (isSupported) BackgroundTaskModule.endTask();
    } catch {
      // rien
    }
  },

  /** Temps restant accordé par iOS (en secondes). -1 = illimité (app au premier plan) */
  remainingTime: async (): Promise<number> => {
    if (!isSupported) return -1;
    return BackgroundTaskModule.remainingTime();
  },
};

export default backgroundTaskService;
