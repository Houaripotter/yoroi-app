/**
 * Pesees par source : fusionne dans Tes pesees (/pesees), qui filtre maintenant par source
 * et supprime toutes les pesees d'une source. Redirection pour les anciens liens.
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function WeightManagerRedirect() {
  return <Redirect href={'/pesees' as any} />;
}
