/**
 * Performance : fusionne dans Ton activite (/activity-detail), qui montre maintenant
 * la charge par semaine et les seances dures. Redirection pour les anciens liens.
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function PerformanceRedirect() {
  return <Redirect href={'/activity-detail' as any} />;
}
