/**
 * Live Activity du chrono (ecran verrouille et Dynamic Island, iOS) : demarree au lancement du chrono,
 * mise a jour a chaque phase, pause ou ajustement, arretee a la fin, a la remise a zero ou en quittant l'ecran.
 * Le compte a rebours tourne seul cote iOS (Text(timerInterval:)) : aucun envoi chaque seconde.
 * Sans module natif (Android, web, Expo Go), ne fait rien.
 */
import { useEffect, useRef } from 'react';
import type { ChronoEngine } from '@/lib/v2/carnet/useChronoEngine';
import { activiteChronoDisponible, arreterActiviteNatif, demarrerActiviteNatif, majActiviteNatif } from './natif';

export function useActiviteChrono(engine: ChronoEngine, titre: string): void {
  const actif = useRef(false);
  const { status, index, phase, remaining } = engine;
  const fin = status === 'running' ? engine.phaseEndsAt() : null;
  // a la seconde pres : un ajustement (+ ou - du temps) relance la mise a jour, pas chaque image
  const finS = fin == null ? null : Math.round(fin / 1000);

  useEffect(() => {
    if (!activiteChronoDisponible()) return;
    if (!phase || status === 'idle' || status === 'finished') {
      if (actif.current) {
        actif.current = false;
        arreterActiviteNatif();
      }
      return;
    }
    const maintenant = Date.now();
    const finMs = fin ?? maintenant + remaining * 1000;
    const debutMs = finMs - phase.duration * 1000;
    const monte = !!phase.countUp;
    const etat = JSON.stringify({
      titre,
      phase: phase.kind,
      libelle: phase.title,
      round: phase.steps ? (phase.step ?? 0) : 0,
      rounds: phase.steps ?? 0,
      debutMs,
      finMs,
      figeS: monte ? Math.max(0, phase.duration - remaining) : remaining,
      enPause: status !== 'running',
      monte,
    });
    if (!actif.current) {
      actif.current = true;
      demarrerActiviteNatif(etat);
    } else {
      majActiviteNatif(etat);
    }
  }, [status, index, phase, finS, titre]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (actif.current) {
        actif.current = false;
        arreterActiviteNatif();
      }
    },
    [],
  );
}
