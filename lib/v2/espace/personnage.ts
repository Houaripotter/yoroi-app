/**
 * Choix du personnage : ecrit dans l'espace et garde le genre du profil en accord
 * (l'accueil lit encore profile.avatar_gender). Ecrit aussi l'ancienne cle @yoroi_avatar_config
 * que la montre lit encore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { getProfile, saveProfile } from '@/lib/database';
import { saveEspace } from '@/lib/v2/espace';
import { logger } from '@/lib/security/logger';
import { OLD_AVATAR_KEY, writeOldAvatar } from '@/lib/v2/watchIdentity';
import { getOwnedPacks, isPackUnlocked, parsePersonnage } from '@/lib/v2/dojo/personnages';

export async function choisirPersonnage(personnage: string): Promise<void> {
  await saveEspace({ personnage });
  if (personnage !== 'guerrier_h' && personnage !== 'guerrier_f') {
    await writeOldAvatar(personnage);
    return;
  }
  const genre = personnage === 'guerrier_f' ? 'femme' : 'homme';
  try {
    const p = await getProfile();
    if (p && p.avatar_gender !== genre) {
      await saveProfile({ ...p, avatar_gender: genre });
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
    }
  } catch (err) {
    logger.error('Mise à jour du genre du personnage impossible', err);
  }
  await writeOldAvatar(personnage);
}

// ============================================================
// Reprise du personnage de l'ancienne app (une seule fois, par la reprise de l'armure)
// ============================================================

type OldSelection = { pack?: string; gender?: string; collectionCharacter?: string; personnage?: string };

/** Ancien pack vers la cle v2 (genre h ou f). */
function fromOldAvatar(old: OldSelection, g: 'h' | 'f'): string {
  const pack = old.pack ?? '';
  const ch = old.collectionCharacter ?? '';
  switch (pack) {
    case 'ronin':
    case 'ghost':
      return `ronin_errant_${g}`;
    case 'ninja':
    case 'ninja_alt':
      return `ninja_${g}`;
    case 'bjj':
    case 'judoka':
    case 'wrestler':
      return `jjb_${g}`;
    case 'boxer':
      return `boxe_${g}`;
    case 'mma':
      return `mma_${g}`;
    case 'oni':
      return 'oni';
    case 'pack_femmes':
      return ch === 'kunoichi' ? 'kunoichi' : ch === 'boxer_woman' ? 'boxe_f' : ch === 'mma_woman' ? 'mma_f' : `guerrier_${g}`;
    case 'pack_monstres':
      return ch === 'dragon' ? 'dragon' : ch === 'yokai' ? 'kitsune' : ch === 'oni_blue' ? 'oni' : `guerrier_${g}`;
    default:
      return `guerrier_${g}`;
  }
}

/**
 * Reprend le personnage de l'ancienne app (@yoroi_avatar_config) si l'utilisateur n'a pas
 * encore choisi de personnage dans la v2. Le personnage n'est repris que s'il est debloque
 * (rang atteint, Premium ou pack possede) ; sinon on garde au moins le genre.
 * Renvoie la cle retenue, ou null si rien n'a ete repris.
 */
export async function reprendreAncienAvatar(rankIndex: number): Promise<{ personnage: string; exact: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(OLD_AVATAR_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as OldSelection;
    if (!old || typeof old !== 'object') return null;
    // l'ancienne cle peut deja avoir ete ecrite par la v2 (champ personnage) : rien a reprendre
    if (old.personnage) return null;
    const g: 'h' | 'f' = old.gender === 'female' ? 'f' : 'h';
    let key = fromOldAvatar(old, g);
    const parsed = parsePersonnage(key);
    let exact = true;
    if (parsed.kind === 'pack') {
      const [owned, premiumRaw] = await Promise.all([getOwnedPacks(), AsyncStorage.getItem('@yoroi_is_premium').catch(() => null)]);
      if (!isPackUnlocked(parsed.pack, owned, rankIndex, premiumRaw === 'true')) {
        key = `guerrier_${g}`;
        exact = false;
      }
    }
    await choisirPersonnage(key);
    return { personnage: key, exact };
  } catch (err) {
    logger.warn('Reprise de l’ancien personnage impossible', err);
    return null;
  }
}
