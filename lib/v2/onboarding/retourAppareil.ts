/**
 * Onboarding « retour » (28 octobre 2026) : les ports de lib/v2/onboarding/retour.ts branches sur l'appareil.
 * Lectures seulement au chargement ; les ecritures passent toutes par enregistrerRetour (champs modifies).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { format } from 'date-fns';
import { getLatestWeight, getProfile, saveProfile } from '@/lib/database';
import { getUserSettings, getUserSettingsStrict, saveUserSettings } from '@/lib/storage';
import { getUserWeightCategory, setUserMode, setUserSport, setUserWeightCategory } from '@/lib/fighterModeService';
import type { Sport } from '@/lib/fighterMode';
import { getEspace, saveEspace } from '@/lib/v2/espace';
import { choisirUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { getHabitudePesee, saveHabitudePesee } from '@/lib/v2/pesee/rappelHabitude';
import { appliquerChoixRappels } from '@/lib/v2/notifications/rappels';
import { ecrireIllustrations } from '@/components/yoroi/v2/stickers';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import type { PortsRetour, SourcesRetour } from './retour';
import { categorySportOf, combatSportOf } from './save';

/** Les vraies donnees, en lecture stricte pour le profil (une lecture ratee : on n'ouvre pas le mode retour) */
export async function chargerSourcesRetour(): Promise<SourcesRetour> {
  const profile = await getProfile();
  const [settings, espace, derniere, habitude, categorie] = await Promise.all([
    getUserSettings().catch(() => null),
    getEspace().catch(() => null),
    getLatestWeight().catch(() => null),
    getHabitudePesee().catch(() => null),
    getUserWeightCategory().catch(() => null),
  ]);
  return {
    settings: settings as SourcesRetour['settings'],
    profile: (profile ?? null) as SourcesRetour['profile'],
    espace: espace as SourcesRetour['espace'],
    derniere: derniere && typeof derniere.weight === 'number' ? { weight: derniere.weight } : null,
    habitude: habitude as SourcesRetour['habitude'],
    categorie,
  };
}

export const portsRetourAppareil = (): PortsRetour => ({
  getProfile: async () => (await getProfile()) ?? null,
  saveProfile: async (p) => {
    await saveProfile(p as never);
    DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
  },
  getSettingsStrict: () => getUserSettingsStrict(),
  saveSettings: (s) => saveUserSettings(s as never),
  saveEspace: (patch) => saveEspace(patch as never),
  choisirUnivers: (u, g) => choisirUnivers(u, g),
  setUserMode: (m) => setUserMode(m),
  setUserSport: (s) => setUserSport(s as Sport),
  setUserWeightCategory: (c) => setUserWeightCategory(c),
  saveHabitudePesee: (h) => saveHabitudePesee(h),
  appliquerRappels: (r, jours) => appliquerChoixRappels(r, { joursEntrainement: jours }),
  ecrireIllustrations: (s) => ecrireIllustrations(s),
  setItem: async (k, v) => {
    await AsyncStorage.setItem(k, v);
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  },
  sportDeCombat: (sports) => categorySportOf(sports) ?? combatSportOf(sports),
  today: () => format(new Date(), 'yyyy-MM-dd'),
});
