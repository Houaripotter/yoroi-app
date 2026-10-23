/**
 * Ancien historique d'activite : les pas et les calories actives vivent maintenant
 * dans Sante (une courbe par mesure). Redirection pour les anciens liens.
 * Parametre facultatif : tab=steps|calories. Ancien ecran archive dans
 * _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ActivityHistoryRedirect() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return <Redirect href={(tab === 'calories' ? '/sante/energie-active' : '/sante/pas') as any} />;
}
