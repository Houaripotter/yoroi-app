/**
 * Detail d’une technique du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/SkillDetail.tsx et s'ouvre depuis le carnet.
 * Atteint directement comme page, ce fichier renvoie vers le carnet.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { SkillDetail } from '@/components/yoroi/v2/carnet/SkillDetail';

export { SkillDetail };

export default function SkillDetailModal() {
  return <Redirect href={'/training-journal' as any} />;
}
