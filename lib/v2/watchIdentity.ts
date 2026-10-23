/**
 * Pont entre la v2 et la montre (et le widget) : la montre lit encore les anciennes cles
 * @yoroi_rank, @yoroi_level et @yoroi_avatar_config. On les recrit a partir du rang
 * d'armure actuel (getArmureState) et du personnage choisi dans Ton espace.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getArmureState } from '@/lib/v2/armure';
import type { ArmureState } from '@/lib/v2/armure';
import { getEspace } from '@/lib/v2/espace';

export const OLD_AVATAR_KEY = '@yoroi_avatar_config';
export const OLD_RANK_KEY = '@yoroi_rank';
export const OLD_LEVEL_KEY = '@yoroi_level';

type OldAvatar = { pack: string; packType: 'character' | 'collection'; gender: 'male' | 'female'; collectionCharacter?: string; personnage: string };

/** Personnage v2 vers le format attendu par l'ancienne app et la montre ({ pack, gender, collectionCharacter }) */
export function toOldAvatar(personnage: string, femme: boolean): OldAvatar {
  const gender: 'male' | 'female' = personnage === 'guerrier_f' ? 'female' : personnage === 'guerrier_h' ? 'male' : femme ? 'female' : 'male';
  const character = (pack: string): OldAvatar => ({ pack, packType: 'character', gender, personnage });
  const collection = (pack: string, c: string): OldAvatar => ({ pack, packType: 'collection', gender, collectionCharacter: c, personnage });
  switch (personnage) {
    case 'guerrier_h':
    case 'guerrier_f':
      return character('samurai');
    case 'oni':
      return character('oni');
    case 'moine':
      return character('ronin');
    case 'kunoichi':
      return collection('pack_femmes', 'kunoichi');
    case 'dragon':
      return collection('pack_monstres', 'dragon');
    case 'kitsune':
      return collection('pack_monstres', 'yokai');
    case 'boxe':
      return character('boxer');
    case 'mma':
      return character('mma');
    case 'jjb':
      return character('bjj');
    default:
      return character('samurai');
  }
}

/** Ecrit l'ancien format du personnage (appele a chaque choix de personnage) */
export async function writeOldAvatar(personnage: string): Promise<void> {
  try {
    const p = await getProfile().catch(() => null);
    await AsyncStorage.setItem(OLD_AVATAR_KEY, JSON.stringify(toOldAvatar(personnage, p?.avatar_gender === 'femme')));
  } catch (err) {
    logger.warn('Ancien format du personnage non ecrit', err);
  }
}

/** Remet a jour rang, niveau et personnage pour la montre. Ne bloque jamais. */
export async function refreshWatchIdentity(): Promise<ArmureState | null> {
  try {
    const [state, espace] = await Promise.all([getArmureState(), getEspace()]);
    await AsyncStorage.multiSet([
      [OLD_RANK_KEY, state.rank.name],
      // niveau 1 a 5 : un par rang d'armure
      [OLD_LEVEL_KEY, String(state.rank.index + 1)],
    ]);
    await writeOldAvatar(espace.personnage);
    return state;
  } catch (err) {
    logger.warn('Identite de la montre non mise a jour', err);
    return null;
  }
}
