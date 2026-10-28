/**
 * Hook partage du tirer pour actualiser (28 octobre 2026).
 *   const { refreshControl } = useTirerPourActualiser({ relire: load, sante: true });
 *   <ScrollView refreshControl={refreshControl}>...
 * Indicateur bleu nuit de l'app (#23358F), petit retour haptique au declenchement,
 * puis message discret « À jour » ou la vraie raison d'un echec.
 */
import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { actualiser } from './actualiser';
import type { EtapesActualiser } from './actualiser';
import { montrerToast } from './toast';

/** Couleur de l'indicateur, celle du bouton principal */
export const TEINTE_ACTUALISER = '#23358F';

export function useTirerPourActualiser(etapes: EtapesActualiser, options?: { actif?: boolean }) {
  const [enCours, setEnCours] = useState(false);
  const verrou = useRef(false);
  const derniere = useRef(etapes);
  derniere.current = etapes;
  const actif = options?.actif !== false;

  const onRefresh = useCallback(async () => {
    if (verrou.current) return;
    verrou.current = true;
    setEnCours(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      const r = await actualiser(derniere.current);
      montrerToast(r.message, r.ok ? 'ok' : 'erreur');
    } finally {
      verrou.current = false;
      setEnCours(false);
    }
  }, []);

  const refreshControl = (
    <RefreshControl
      refreshing={enCours}
      onRefresh={onRefresh}
      enabled={actif}
      tintColor={TEINTE_ACTUALISER}
      colors={[TEINTE_ACTUALISER]}
      progressBackgroundColor="#FFFFFF"
    />
  );

  return { enCours, onRefresh, refreshControl };
}
