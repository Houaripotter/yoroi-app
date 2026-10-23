/**
 * Lecture et ecriture de "Ton espace" depuis un ecran, avec mise a jour en direct
 * quand un autre ecran le modifie.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { DEFAULT_ESPACE, ESPACE_CHANGED_EVENT, getEspace, saveEspace } from '@/lib/v2/espace';
import type { Espace } from '@/lib/v2/espace';
import { calculerSilhouetteAuto } from '@/lib/v2/silhouette';

/**
 * Vague 26 : en mode automatique, la silhouette du personnage suit les pesees.
 * Recalcul au plus une fois par minute, ecrit seulement si elle change (ce qui met a jour tous les ecrans).
 */
let dernierCalcul = 0;
function rafraichirSilhouette(e: Espace): void {
  if (e.silhouette !== 'auto') return;
  const now = Date.now();
  if (now - dernierCalcul < 60000) return;
  dernierCalcul = now;
  calculerSilhouetteAuto(e.personnage === 'guerrier_f' ? 'f' : 'h')
    .then((s) => (s && s !== e.silhouetteAuto ? saveEspace({ silhouetteAuto: s }) : null))
    .catch(() => {});
}

export function useEspace(): { espace: Espace; ready: boolean; update: (patch: Partial<Espace>) => Promise<void> } {
  const [espace, setEspace] = useState<Espace>(DEFAULT_ESPACE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getEspace().then((e) => {
      if (!alive) return;
      setEspace(e);
      setReady(true);
      rafraichirSilhouette(e);
    });
    const sub = DeviceEventEmitter.addListener(ESPACE_CHANGED_EVENT, (next: Espace) => {
      if (alive && next) setEspace(next);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const update = useCallback(async (patch: Partial<Espace>) => {
    setEspace((prev) => ({ ...prev, ...patch }));
    await saveEspace(patch);
  }, []);

  return { espace, ready, update };
}
