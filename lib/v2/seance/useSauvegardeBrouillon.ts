/**
 * Sauvegarde de la seance en cours (26 octobre 2026, audit « l'utilisateur sort de l'app, tout s'efface »).
 *
 * Avant : le brouillon etait ecrit 300 a 400 ms apres chaque changement, et l'ecriture en attente etait
 * ANNULEE si l'ecran se fermait ou si l'app passait en arriere plan pendant ce delai : la serie que tu
 * venais de valider avant d'ouvrir WhatsApp pouvait ne jamais etre ecrite. Et iOS peut fermer l'app
 * pendant ton repos.
 *
 * Maintenant :
 * 1. chaque changement est ecrit tout de suite, dans l'ordre (une seule ecriture a la fois, la derniere gagne) ;
 * 2. au passage en arriere plan et a la fermeture de l'ecran, la derniere version est ecrite sans attendre.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { ecrireBrouillon } from './model';
import type { SeanceDraft } from './model';

export function useSauvegardeBrouillon(draft: SeanceDraft | null, finished: { current: boolean }): void {
  const dernier = useRef(draft);
  dernier.current = draft;

  useEffect(() => {
    if (!draft || finished.current) return;
    void ecrireBrouillon(draft);
  }, [draft, finished]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && dernier.current && !finished.current) void ecrireBrouillon(dernier.current);
    });
    return () => {
      sub.remove();
      if (dernier.current && !finished.current) void ecrireBrouillon(dernier.current);
    };
  }, [finished]);
}
