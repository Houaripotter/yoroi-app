/**
 * Coach vocal des sprints guidés (app/seance/sprints.tsx), le pendant de useCoachVocal pour la musculation.
 * L'écran appelle annoncer(evenement) au début de chaque étape et à la fin ; le moteur (moteur.ts) choisit la
 * phrase selon ton réglage Coupé, Discret ou Motivant, le lecteur (lecteur.ts) la dit en baissant ta musique.
 * annoncer renvoie true si une voix part : l'écran ne joue alors pas son propre bip par dessus.
 *
 * Écran verrouillé : le JavaScript s'endort, la voix ne peut pas parler ; une étape commencée pendant
 * l'absence n'est jamais dite en retard au retour (l'écran n'appelle annoncer que pour une étape en direct).
 */
import { useCallback, useEffect, useRef } from 'react';
import { decider, etatInitial, type EvenementCoach } from './moteur';
import { useNiveauCoach } from './reglages';
import { dire, parle, peutDire, taire } from './lecteur';

export function useCoachIntervalles(): { annoncer: (ev: EvenementCoach) => boolean; reinitialiser: () => void } {
  const [niveau] = useNiveauCoach();
  // Premium plus tard, comme useCoachVocal
  const niveauRef = useRef(niveau);
  niveauRef.current = niveau;
  const etat = useRef(etatInitial());

  useEffect(() => {
    if (niveau === 'off') taire();
  }, [niveau]);

  // écran quitté : la phrase en cours s'arrête
  useEffect(() => () => taire(), []);

  const reinitialiser = useCallback(() => {
    etat.current = etatInitial();
  }, []);

  const annoncer = useCallback((ev: EvenementCoach): boolean => {
    try {
      const n = niveauRef.current;
      if (n === 'off') return false;
      const d = decider(etat.current, ev, { niveau: n }, Date.now());
      etat.current = d.etat;
      if (!d.phrase || !peutDire(d.phrase) || parle()) return false;
      void dire(d.phrase);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { annoncer, reinitialiser };
}
