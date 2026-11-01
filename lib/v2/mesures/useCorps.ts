/**
 * Les donnees du corps ajoutees le 1er novembre 2026 (AT, AU), lues ensemble et relues a chaque retour sur l'ecran
 * et a chaque changement (YOROI_DATA_CHANGED) : pesees, contexte des pesees, sac des mesures, mensurations en plus,
 * forme du matin, biomarqueurs, plis, taille du profil et mensurations de la table measurements.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile, getWeights } from '@/lib/database';
import type { Profile, Weight } from '@/lib/database';
import { loadMeasures } from '@/lib/v2/progres/measures';
import type { MeasurePoint } from '@/lib/v2/progres/measures';
import { logger } from '@/lib/security/logger';
import { lireContextesPesees } from './contextePesee';
import type { ContextePesee } from './contextePesee';
import { lireMesuresBrutes } from './stockage';
import type { MesureBrute } from './sac';
import { lireMensurationsPlus } from './mensurationsPlus';
import type { MensurationPlus } from './mensurationsPlus';
import { lireFormes } from './formeMatin';
import type { FormeMatin } from './formeMatin';
import { lireBiomarqueurs } from './biomarqueurs';
import type { Biomarqueur } from './biomarqueurs';
import { lirePlis } from './plis';
import type { MesurePlis } from './plis';
import { EVENEMENT_CORPS } from './listeStockee';

export type DonneesCorps = {
  pesees: Weight[];
  contextes: ContextePesee[];
  brutes: MesureBrute[];
  plus: MensurationPlus[];
  formes: FormeMatin[];
  bio: Biomarqueur[];
  plis: MesurePlis[];
  mensurations: MeasurePoint[];
  profil: Profile | null;
};

export const CORPS_VIDE: DonneesCorps = { pesees: [], contextes: [], brutes: [], plus: [], formes: [], bio: [], plis: [], mensurations: [], profil: null };

const sur = async <T>(p: Promise<T>, def: T): Promise<T> => {
  try {
    return (await p) ?? def;
  } catch (e) {
    logger.warn('[Corps] lecture partielle', e);
    return def;
  }
};

export async function chargerCorps(): Promise<DonneesCorps> {
  const [pesees, contextes, brutes, plus, formes, bio, plis, mensurations, profil] = await Promise.all([
    sur(getWeights() as Promise<Weight[]>, []),
    sur(lireContextesPesees(), []),
    sur(lireMesuresBrutes(), []),
    sur(lireMensurationsPlus(), []),
    sur(lireFormes(), []),
    sur(lireBiomarqueurs(), []),
    sur(lirePlis(), []),
    sur(loadMeasures(), []),
    sur(getProfile() as Promise<Profile | null>, null),
  ]);
  return { pesees: (pesees ?? []).filter((w) => w && Number(w.weight) > 0), contextes, brutes, plus, formes, bio, plis, mensurations, profil };
}

export function useCorps(): DonneesCorps & { pret: boolean; relire: () => void } {
  const [d, setD] = useState<DonneesCorps>(CORPS_VIDE);
  const [pret, setPret] = useState(false);
  const vivant = useRef(true);
  const relire = useCallback(() => {
    chargerCorps()
      .then((x) => {
        if (vivant.current) {
          setD(x);
          setPret(true);
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    vivant.current = true;
    const s = DeviceEventEmitter.addListener(EVENEMENT_CORPS, relire);
    return () => {
      vivant.current = false;
      s.remove();
    };
  }, [relire]);
  useFocusEffect(
    useCallback(() => {
      relire();
    }, [relire]),
  );
  return { ...d, pret, relire };
}
