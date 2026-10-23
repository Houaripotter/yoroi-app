/**
 * Detail d’un record du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/BenchmarkDetail.tsx et s'ouvre depuis le carnet.
 * Atteint directement comme page, ce fichier renvoie vers le carnet.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { BenchmarkDetail } from '@/components/yoroi/v2/carnet/BenchmarkDetail';

export { BenchmarkDetail };

export default function BenchmarkDetailModal() {
  return <Redirect href={'/training-journal' as any} />;
}
