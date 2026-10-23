/**
 * Apercu force d'une saison depuis le Studio (Tests de l'appareil, Décorations de saison), pour voir Noël en octobre.
 * En memoire seulement : il disparait a la fermeture de l'app. « auto » : la date du jour.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { ChoixApercu } from './calendrier';

const EVENT = 'YOROI_APERCU_SAISON';
let apercu: ChoixApercu = 'auto';

export function getApercuSaison(): ChoixApercu {
  return apercu;
}

export function setApercuSaison(v: ChoixApercu): void {
  if (v === apercu) return;
  apercu = v;
  DeviceEventEmitter.emit(EVENT, v);
}

export function useApercuSaison(): ChoixApercu {
  const [v, setV] = useState<ChoixApercu>(apercu);
  useEffect(() => {
    setV(apercu);
    const sub = DeviceEventEmitter.addListener(EVENT, (x: ChoixApercu) => setV(x));
    return () => sub.remove();
  }, []);
  return v;
}
