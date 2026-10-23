/**
 * Photo du rond de profil (16 octobre 2026, Houari : « je ne trouve plus l'endroit pour ajouter un contour a ma photo »).
 * La meme logique que la photo du profil (app/profile.tsx) : copie redimensionnee a 800 px dans les documents de l'app,
 * enregistree dans le profil, et le rond de l'accueil et des Reglages la montre tout de suite (onPhotoChanged).
 * Sert a l'ecran Photo et contour (app/settings/photo.tsx).
 */
import { DeviceEventEmitter, Linking } from 'react-native';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getProfile, saveProfile } from '@/lib/database';
import { onPhotoChanged } from '@/components/yoroi/v2/espace/identite';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';

export type ResultatPhoto = 'ok' | 'annule' | 'refuse' | 'erreur';

async function garderPhoto(uri: string): Promise<string> {
  const cible = `${FileSystem.documentDirectory}profile_photo_${Date.now()}.jpg`;
  try {
    const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
    await FileSystem.copyAsync({ from: r.uri, to: cible });
    return cible;
  } catch {
    try {
      await FileSystem.copyAsync({ from: uri, to: cible });
      return cible;
    } catch {
      return uri;
    }
  }
}

function prevenir() {
  DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
}

/** Enregistre la photo choisie dans le profil ; le rond la montre aussitot */
export async function enregistrerPhoto(uri: string): Promise<string> {
  const gardee = await garderPhoto(uri);
  const base = await getProfile();
  await saveProfile({
    ...(base ?? {}),
    name: base?.name?.trim() || 'Guerrier',
    avatar_gender: base?.avatar_gender || 'homme',
    profile_photo: gardee,
  });
  await onPhotoChanged(gardee).catch(() => {});
  prevenir();
  return gardee;
}

/** Retire la photo : le rond revient au personnage (ou aux initiales sans personnage) */
export async function retirerPhoto(): Promise<void> {
  const base = await getProfile();
  if (!base) return;
  await saveProfile({ ...base, profile_photo: null });
  await onPhotoChanged(null).catch(() => {});
  prevenir();
}

/** Ouvre l'appareil photo ou la galerie (recadrage carre), puis enregistre */
export async function choisirPhoto(source: 'camera' | 'galerie'): Promise<ResultatPhoto> {
  try {
    if (source === 'camera') {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') return 'refuse';
      const r = await launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (r.canceled || !r.assets?.[0]) return 'annule';
      await enregistrerPhoto(r.assets[0].uri);
      return 'ok';
    }
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && (status as string) !== 'limited') return 'refuse';
    const r = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85, selectionLimit: 1 });
    if (r.canceled || !r.assets?.[0]) return 'annule';
    await enregistrerPhoto(r.assets[0].uri);
    return 'ok';
  } catch (err) {
    logger.error('[Photo et contour] photo', err);
    return 'erreur';
  }
}

export function ouvrirReglagesTelephone() {
  Linking.openSettings().catch(() => {});
}
