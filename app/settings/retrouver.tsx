/**
 * Reglages, Donnees et sauvegardes, Retrouver une sauvegarde (7 novembre 2026).
 * La liste des copies trouvees dans ton iCloud (ou ton dossier relie sur Android), sans fouiller les dossiers :
 * components/yoroi/v2/sauvegarde/ListeSauvegardes.tsx. Apres une restauration reussie, l'app se recharge pour
 * relire toutes tes donnees (a defaut, retour a l'Accueil).
 */
import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { ListeSauvegardes } from '@/components/yoroi/v2/sauvegarde/ListeSauvegardes';

function recharger(): boolean {
  try {
    const expo = require('expo');
    if (typeof expo.reloadAppAsync === 'function') {
      void expo.reloadAppAsync('sauvegarde retrouvee');
      return true;
    }
  } catch {
    // pas de rechargement : retour a l'Accueil
  }
  return false;
}

export default function RetrouverUneSauvegarde() {
  const router = useRouter();
  return (
    <ListeSauvegardes
      onRestauree={() => {
        DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
        if (!recharger()) router.replace('/(tabs)' as any);
      }}
    />
  );
}
