/**
 * La saison a afficher maintenant (halloween, noel ou null), selon la date locale (horloge du Studio comprise),
 * le reglage « Décorations de saison » et l'apercu force du Studio.
 * Relue au retour de l'app au premier plan et quand l'horloge du Studio bouge : le 2 novembre au matin,
 * les citrouilles s'en vont sans relancer l'app.
 */
import { useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { DEV_CLOCK_CHANGED, devNow } from '@/lib/v2/creator/devClock';
import { saisonAffichee, type SaisonId } from './calendrier';
import { useDecorationsSaison } from './reglage';
import { useApercuSaison } from './apercu';

export function useSaison(): SaisonId | null {
  const { active } = useDecorationsSaison();
  const apercu = useApercuSaison();
  const [jour, setJour] = useState(() => devNow().toDateString());
  useEffect(() => {
    const relire = () => setJour(devNow().toDateString());
    const a = AppState.addEventListener('change', (s) => s === 'active' && relire());
    const b = DeviceEventEmitter.addListener(DEV_CLOCK_CHANGED, relire);
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  // jour sert de cle : la saison est recalculee au changement de date
  void jour;
  return saisonAffichee({ date: devNow(), active, apercu });
}
