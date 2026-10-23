/**
 * Ancien écran Historique : remplacé par l'onglet Séances (historique v2).
 * La route reste pour les liens existants et redirige.
 * L'ancien écran est archivé dans _archive_ancien_design_2026-10-09/vague5/app/history.tsx.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function HistoryRedirect() {
  return <Redirect href={'/(tabs)/seances' as any} />;
}
