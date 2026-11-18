/**
 * Reprise complete depuis Hevy (18 novembre 2026), depuis l'onglet Seances (Importer) ou Ajouter.
 * Le parcours est dans components/yoroi/v2/import/RepriseHevy.tsx, le meme que dans l'onboarding.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { RepriseHevy } from '@/components/yoroi/v2/import/RepriseHevy';

export default function EcranRepriseHevy() {
  const router = useRouter();
  const fermer = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/seances' as never));
  // 18 novembre 2026 : « Lancer ma séance » sur Bienvenue : la seance du jour de ta routine, en direct
  return <RepriseHevy onFermer={fermer} onFini={() => router.replace('/(tabs)/seances' as never)} onLancer={(r) => router.replace(r as never)} />;
}
