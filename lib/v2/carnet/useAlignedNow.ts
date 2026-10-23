/**
 * Horloge calee sur un instant de fin : elle se reveille juste apres chaque changement
 * de seconde restante (et non toutes les 250 ms au hasard), pour que chaque chiffre
 * reste affiche une seconde pile. Sans instant de fin, elle bat a la seconde.
 */
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useAlignedNow(endsAt: number | null, active = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      let wait = endsAt ? (endsAt - n) % 1000 : 1000 - (n % 1000);
      if (wait <= 0) wait += 1000;
      t = setTimeout(tick, Math.min(1000, wait + 6));
    };
    tick();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        if (t) clearTimeout(t);
        tick();
      }
    });
    return () => {
      if (t) clearTimeout(t);
      sub.remove();
    };
  }, [endsAt, active]);
  return now;
}
