/**
 * Minuteur de repos (30 octobre 2026) : un interrupteur dans les reglages de la seance, active par defaut.
 * Coupe : aucun repos ne demarre apres une serie (ni dans l'ecran, ni par le bouton « Serie faite » de la
 * Dynamic Island), donc ni bip, ni voix, ni notification de fin de repos : elles partent toutes de la fin du
 * repos de la seance (restEndsAt), qui reste vide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLE_MINUTEUR_REPOS = 'yoroi_minuteur_repos_v1';

/** Active sauf si tu l'as coupe */
export async function chargerMinuteurRepos(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_MINUTEUR_REPOS)) !== '0';
  } catch {
    return true;
  }
}

export async function enregistrerMinuteurRepos(actif: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_MINUTEUR_REPOS, actif ? '1' : '0');
  } catch {
    // rien a faire : le reglage reste celui de la seance en cours
  }
}

/** Le repos lance apres une serie : rien quand le minuteur est coupe ou qu'il n'y a pas de repos prevu */
export function reposApresSerie(o: { sansRepos?: boolean; pasDeRepos?: boolean; secondes: number; maintenant: number }): { restEndsAt: number | null; restTotal: number } {
  if (o.sansRepos || o.pasDeRepos) return { restEndsAt: null, restTotal: 0 };
  return { restEndsAt: o.maintenant + o.secondes * 1000, restTotal: o.secondes };
}
