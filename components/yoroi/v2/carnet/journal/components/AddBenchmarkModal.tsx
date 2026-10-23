/**
 * Nouveau record du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/RecordPicker.tsx et s'ouvre depuis le carnet.
 * Atteint directement comme page, ce fichier renvoie vers le carnet.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { RecordPicker } from '@/components/yoroi/v2/carnet/RecordPicker';

export { RecordPicker };

export default function AddBenchmarkModal() {
  return <Redirect href={'/training-journal' as any} />;
}
