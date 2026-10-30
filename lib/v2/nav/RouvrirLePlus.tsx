/**
 * 30 octobre 2026 : sur iPhone, iPad et Mac, une page normale ouverte depuis le + remplace la feuille
 * (voir lib/v2/nav/depuisLePlus.ts). Quand tu reviens sur les onglets, le + se rouvre la ou tu l'avais laisse :
 * le retour ramene bien au +. Pose une seule fois dans app/(tabs)/_layout.tsx.
 * Apres un enregistrement reussi dans cette page, le + ne se rouvre pas (YOROI_DATA_CHANGED, voir depuisLePlus.ts).
 */
import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { finirPageDepuisLePlus, ongletsAuPremierPlan, prendreRetourAuPlus, signalerEnregistrement } from '@/lib/v2/nav/depuisLePlus';

export function RouvrirLePlus() {
  const router = useRouter();
  const etat = useRootNavigationState();
  useEffect(() => {
    const abo = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', signalerEnregistrement);
    return () => abo.remove();
  }, []);
  useEffect(() => {
    if (!ongletsAuPremierPlan(etat as any)) return;
    const r = prendreRetourAuPlus();
    finirPageDepuisLePlus();
    if (r) router.push({ pathname: '/ajouter', params: { onglet: r.onglet } } as any);
  }, [etat, router]);
  return null;
}
