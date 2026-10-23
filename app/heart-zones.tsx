/**
 * Zones cardiaques : un seul ecran, /heart-zones-settings. Le calcul avec ton coeur
 * au repos (Karvonen) y est devenu une methode. Redirection pour les anciens liens.
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function HeartZonesRedirect() {
  return <Redirect href={'/heart-zones-settings?mode=repos' as any} />;
}
