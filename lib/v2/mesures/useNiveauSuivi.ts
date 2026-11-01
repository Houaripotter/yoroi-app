/**
 * Ton niveau d'affichage du corps (lib/v2/mesures/niveauSuivi.ts), relu quand il change ailleurs dans l'app.
 * Le niveau par defaut vient de ton objectif de seances par semaine et de tes sports (combat : Sportif).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { COMBAT_SPORTS } from '@/lib/sports';
import { EVENEMENT_NIVEAU, lireNiveau, niveauParDefaut } from './niveauSuivi';
import type { EtatNiveau } from './niveauSuivi';

export async function niveauDefautDuProfil(): Promise<EtatNiveau['niveau']> {
  try {
    const e = await getEspace();
    return niveauParDefaut({ seancesParSemaine: objectifVise(e), sports: e.sportsFavoris, sportsDeCombat: COMBAT_SPORTS.map((s) => s.id) });
  } catch {
    return 'essentiel';
  }
}

export function useNiveauSuivi(): EtatNiveau & { pret: boolean; relire: () => void } {
  const [etat, setEtat] = useState<EtatNiveau>({ niveau: 'essentiel', choisi: false, propose: true });
  const [pret, setPret] = useState(false);
  const relire = useCallback(() => {
    (async () => {
      const e = await lireNiveau(await niveauDefautDuProfil());
      setEtat(e);
      setPret(true);
    })();
  }, []);
  useEffect(() => {
    relire();
    const s = DeviceEventEmitter.addListener(EVENEMENT_NIVEAU, relire);
    return () => s.remove();
  }, [relire]);
  return { ...etat, pret, relire };
}
