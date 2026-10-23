/**
 * Mode demo (profil Heny du Studio) : vrai quand la demo est chargee. Meme cle que DEMO_ACTIVE_KEY de
 * lib/demoDataService.ts. Pendant la demo, Sante et Health Connect ne sont jamais lus ni importes :
 * les captures ne montrent que les donnees de Heny, et rien de reel ne se mele a la demo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLE_DEMO_ACTIVE = '@yoroi_demo_data_active';

export async function demoActive(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_DEMO_ACTIVE)) === 'true';
  } catch {
    return false;
  }
}
