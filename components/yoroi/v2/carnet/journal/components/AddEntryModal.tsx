/**
 * Ajout d’une perf du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/EntrySheet.tsx et s'ouvre depuis le carnet.
 * Atteint directement comme page, ce fichier renvoie vers le carnet.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { EntrySheet } from '@/components/yoroi/v2/carnet/EntrySheet';

export { EntrySheet };

export default function AddEntryModal() {
  return <Redirect href={'/training-journal' as any} />;
}
