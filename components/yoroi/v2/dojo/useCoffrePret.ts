/**
 * 2 novembre 2026 : vrai quand le coffre du jour est pret et pas encore ouvert. Lu par la barre des onglets (un
 * petit point d'or sur l'onglet Dojo) : la premiere victoire d'un nouvel utilisateur (sa pesee de l'onboarding
 * ouvre deja son premier coffre), puis la raison de passer au Dojo chaque jour. Aucun chiffre, aucune XP hors du
 * Dojo. Rien pendant la visite guidee avec l'exemple (le coffre de l'exemple n'est pas le tien).
 */
import { useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { ARMURE_CHANGED_EVENT, getArmureState } from '@/lib/v2/armure';
import type { ArmureState } from '@/lib/v2/armure';
import { vitrineActive } from '@/lib/v2/visite/vitrine';

export const coffreEstPret = (s: Pick<ArmureState, 'coffre'> | null | undefined): boolean => s?.coffre?.etat === 'pret';

export function useCoffrePret(): boolean {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    let vivant = true;
    const poser = (s: ArmureState | null | undefined) => {
      if (vivant) setPret(!vitrineActive() && coffreEstPret(s));
    };
    const lire = () => {
      getArmureState().then(poser).catch(() => undefined);
    };
    lire();
    const sub = DeviceEventEmitter.addListener(ARMURE_CHANGED_EVENT, (s: ArmureState) => poser(s));
    // un nouveau jour : le coffre du jour d'apres
    const app = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') lire();
    });
    return () => {
      vivant = false;
      sub.remove();
      app.remove();
    };
  }, []);
  return pret;
}
