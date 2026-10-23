/**
 * Ancien écran Statistiques : remplacé par l'onglet Progrès (et Ta santé pour la santé).
 * La route reste pour les liens existants et redirige en gardant l'intention :
 * stats?tab=sante (ou santé) mène à Ta santé, avec la mesure si section la désigne ;
 * tout le reste mène à Progrès.
 * L'ancien écran est archivé dans _archive_ancien_design_2026-10-09/vague5/app/stats.tsx.
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { isMetricKey } from '@/lib/v2/sante/metrics';

export default function StatsRedirect() {
  const params = useLocalSearchParams<{ tab?: string; section?: string }>();
  const tab = (params.tab ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (tab === 'sante') {
    const section = params.section ?? '';
    if (isMetricKey(section)) return <Redirect href={`/sante/${section}` as any} />;
    return <Redirect href={'/sante' as any} />;
  }
  return <Redirect href={'/(tabs)/progres' as any} />;
}
