/**
 * Point d'entree d'expo-router pour les liens venus du systeme (widgets, Centre de controle, raccourcis).
 * Un lien de widget (yoroi://w/... ou ancienne URL yoroi://poids-detail...) est mis en attente et ouvert
 * par lib/v2/widgets/LiensWidgets.tsx une fois l'app prete ; les autres liens passent comme avant.
 */
import { recevoirUrl } from '@/lib/v2/widgets/liens';

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    if (recevoirUrl(path)) return initial ? '/' : null;
  } catch {
    // lien illisible : le routeur le traite comme avant
  }
  return path;
}
