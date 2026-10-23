/**
 * Mes objectifs : fusionne dans Tes objectifs (/training-goals), onglet A cocher.
 * Meme stockage (@yoroi_user_goals). Redirection pour les anciens liens.
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function GoalsRedirect() {
  return <Redirect href={'/training-goals?tab=liste' as any} />;
}
