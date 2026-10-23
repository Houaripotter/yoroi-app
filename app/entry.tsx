/**
 * Ancienne saisie du poids (archivee dans _archive_ancien_design_2026-10-09/app/entry.tsx).
 * Redirige vers la pesee v2.
 */
import React from 'react';
import { Redirect } from 'expo-router';

export default function EntryRedirect() {
  return <Redirect href={'/pesee' as any} />;
}
