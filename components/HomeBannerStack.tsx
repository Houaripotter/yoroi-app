// ============================================
// HOME BANNER STACK
// Limite l'affichage des banners de l'accueil à MAX_VISIBLE simultanés
// avec un système de priorité. Évite d'encombrer l'écran.
// ============================================

import React from 'react';
import { View } from 'react-native';
import { BackupAgeBanner } from './BackupAgeBanner';
import { CloudSyncPrompt } from './CloudSyncPrompt';

const MAX_VISIBLE = 3;

interface Props {
  slotsUsedBefore: number; // Combien de slots ont déjà été utilisés par d'autres banners (PeerSync, WatchStatus…)
}

/**
 * Affiche les banners de backup dans l'ordre de priorité :
 * 1. CloudSyncPrompt (action urgente : nouvelle data depuis un autre device)
 * 2. BackupAgeBanner (alerte si backup trop vieux)
 *
 * Chaque banner gère lui-même sa condition d'affichage (return null si inutile).
 * On limite à MAX_VISIBLE total en comptant ce qui a déjà été affiché avant.
 */
export const HomeBannerStack: React.FC<Props> = ({ slotsUsedBefore = 0 }) => {
  const available = Math.max(0, MAX_VISIBLE - slotsUsedBefore);

  if (available <= 0) return null;

  // Priorité : CloudSync > BackupAge
  // Les banners se masquent eux-mêmes s'ils n'ont rien à afficher,
  // donc même si on les rend tous, un seul apparaîtra souvent.
  return (
    <View>
      {available >= 1 && <CloudSyncPrompt />}
      {available >= 2 && <BackupAgeBanner />}
    </View>
  );
};
