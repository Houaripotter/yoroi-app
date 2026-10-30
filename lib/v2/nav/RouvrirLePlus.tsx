/**
 * 30 octobre 2026 : sur iPhone, iPad et Mac, une page normale ouverte depuis le + remplace la feuille
 * (voir lib/v2/nav/depuisLePlus.ts). Quand tu reviens sur les onglets, le + se rouvre la ou tu l'avais laisse :
 * le retour ramene bien au +. Pose une seule fois dans app/(tabs)/_layout.tsx.
 */
import { useEffect } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import { ongletsAuPremierPlan, prendreRetourAuPlus } from '@/lib/v2/nav/depuisLePlus';

export function RouvrirLePlus() {
  const router = useRouter();
  const etat = useRootNavigationState();
  useEffect(() => {
    if (!ongletsAuPremierPlan(etat as any)) return;
    const r = prendreRetourAuPlus();
    if (r) router.push({ pathname: '/ajouter', params: { onglet: r.onglet } } as any);
  }, [etat, router]);
  return null;
}
