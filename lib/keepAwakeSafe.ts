// Garde l'écran allumé sans jamais faire planter l'app.
// expo-keep-awake rejette sa promesse quand on désactive un verrou jamais activé
// (ou sur le web) : on avale l'erreur, ce n'est pas grave pour l'utilisateur.
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export function keepAwakeOn(tag?: string): void {
  try {
    Promise.resolve(activateKeepAwakeAsync(tag)).catch(() => {});
  } catch {
    // rien à faire
  }
}

export function keepAwakeOff(tag?: string): void {
  try {
    Promise.resolve(deactivateKeepAwake(tag) as unknown).catch(() => {});
  } catch {
    // rien à faire
  }
}
