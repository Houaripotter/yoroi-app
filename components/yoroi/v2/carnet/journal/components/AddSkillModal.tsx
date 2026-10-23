/**
 * Nouvelle technique du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/AddSkillSheet.tsx et s'ouvre depuis le carnet.
 * Atteint directement comme page, ce fichier renvoie vers le carnet.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { AddSkillSheet } from '@/components/yoroi/v2/carnet/AddSkillSheet';

export { AddSkillSheet };

export default function AddSkillModal() {
  return <Redirect href={'/training-journal' as any} />;
}
