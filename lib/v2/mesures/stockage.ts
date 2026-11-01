/**
 * Stockage du sac des mesures brutes (./sac.ts) : une liste dans AsyncStorage, cle yoroi_mesures_brutes_v1.
 * - lecture sure avant ecriture (lib/v2/sauvegarde/lectureSure.ts) : une valeur illisible n'est jamais ecrasee ;
 * - une ecriture a la fois (avecVerrou) ;
 * - synchronisee entre tes appareils par element (lib/v2/synchro/cles.ts, idChamp id) ;
 * - sauvegardee avec toutes les cles de l'app (lib/v2/sauvegarde/fusion.ts, collectAllStorage) et fusionnee
 *   par id a la restauration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { avecVerrou, lireListePourEcriture } from '@/lib/v2/sauvegarde/lectureSure';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';
import { estMesureBrute, fusionnerBrutes } from './sac';
import type { MesureBrute } from './sac';

export const CLE_MESURES_BRUTES = 'yoroi_mesures_brutes_v1';

/** Toutes les mesures gardees (liste vide si rien, ou si la valeur est illisible : elle n'est pas touchee) */
export async function lireMesuresBrutes(): Promise<MesureBrute[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_MESURES_BRUTES);
    if (!brut) return [];
    const l = JSON.parse(brut) as unknown;
    return Array.isArray(l) ? l.filter(estMesureBrute) : [];
  } catch (e) {
    logger.warn('[Mesures brutes] lecture impossible', e);
    return [];
  }
}

/** Ajoute des mesures sans doublon ; le nombre ajoute. Ne lance jamais : un echec est seulement journalise. */
export async function ajouterMesuresBrutes(nouvelles: MesureBrute[]): Promise<number> {
  if (!nouvelles.length) return 0;
  try {
    const n = await avecVerrou(CLE_MESURES_BRUTES, async () => {
      const avant = await lireListePourEcriture<MesureBrute>(CLE_MESURES_BRUTES);
      const { liste, ajoutees } = fusionnerBrutes(avant, nouvelles);
      if (ajoutees) await AsyncStorage.setItem(CLE_MESURES_BRUTES, JSON.stringify(liste));
      return ajoutees;
    });
    if (n) signalerASynchroniser();
    return n;
  } catch (e) {
    logger.warn('[Mesures brutes] enregistrement impossible', e);
    return 0;
  }
}
