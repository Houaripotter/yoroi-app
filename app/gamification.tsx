/**
 * Ancienne route de la gamification. Le systeme est remplace par la Voie de l'Armure :
 * on renvoie vers l'ecran equivalent du Dojo (les anciens liens continuent de marcher).
 *  ?tab=rangs      : le chemin de l'armure
 *  ?tab=badges     : les sceaux
 *  ?tab=historique : le journal d'XP
 *  sinon (defis)   : le Dojo et son prochain objectif
 */
import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GamificationRedirect() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const href =
    tab === 'rangs' ? '/dojo/rangs' : tab === 'badges' ? '/dojo/sceaux' : tab === 'historique' ? '/dojo/journal' : '/(tabs)/dojo';
  return <Redirect href={href as any} />;
}
