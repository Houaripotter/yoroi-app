/**
 * Appareils et sources : fusionne dans Connexion sante (/health-connect), un seul ecran
 * pour relier, synchroniser, importer, diagnostiquer et voir les appareils detectes.
 * Redirection pour les anciens liens. Ancien ecran archive dans
 * _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function ConnectedDevicesRedirect() {
  return <Redirect href={'/health-connect' as any} />;
}
