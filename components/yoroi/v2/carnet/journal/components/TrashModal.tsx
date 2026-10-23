/**
 * Corbeille du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/TrashSheet.tsx et s'ouvre depuis le carnet.
 * Atteint directement comme page, ce fichier renvoie vers le carnet.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { TrashSheet } from '@/components/yoroi/v2/carnet/TrashSheet';

export { TrashSheet };

export default function TrashModal() {
  return <Redirect href={'/training-journal' as any} />;
}
