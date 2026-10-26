/**
 * Partage en image des cartes YOROI : capture de la vue, partage, enregistrement dans la galerie,
 * choix d'une photo de fond (reduite a 1440 px au plus grand cote, sans conversion du fichier d'origine).
 */
import type { RefObject } from 'react';
import { Share } from 'react-native';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import type { UIImagePickerPreferredAssetRepresentationMode } from 'expo-image-picker';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from './mesure';
import type { SourcePartage } from './mesure';
import { texteSigne } from './texte';
import { traduire } from '@/lib/i18n/tr';

export type CardPhoto = { uri: string; landscape: boolean };

/** Plus grand cote d'une photo de carte : assez pour une story nette, leger a decoder et a capturer */
export const COTE_MAX_CARTE = 1440;

/**
 * Reduit l'image pour que son plus grand cote fasse au plus 1440 px. Rien n'est refait si elle est
 * deja assez petite (dimensions connues). Une seule passe : redimensionnement et JPEG, pas de base64.
 */
export async function resizeForCard(uri: string, largeur?: number, hauteur?: number): Promise<string> {
  const w = largeur || 0;
  const h = hauteur || 0;
  if (w > 0 && h > 0 && Math.max(w, h) <= COTE_MAX_CARTE) return uri;
  const resize = w > 0 && h > 0 && h > w ? { height: COTE_MAX_CARTE } : { width: COTE_MAX_CARTE };
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
    return result.uri;
  } catch {
    return uri;
  }
}

/**
 * Ouvre la galerie ou l'appareil photo et rend une photo prete pour la carte.
 * onPreparation(true) tombe quand la photo est choisie et que sa reduction commence, onPreparation(false) a la fin.
 *
 * 26 octobre 2026 (photo tres lente a arriver) : la galerie etait ouverte avec quality 0.9. Sur iOS,
 * toute qualite sous 1 force le selecteur a decoder la photo en pleine taille (12 a 48 Mpx) puis a la
 * reencoder en JPEG, et le mode de representation automatique convertit en plus le HEIC en JPEG. Ensuite
 * la reduction a 1200 px redecodait la photo entiere une seconde fois. Maintenant : fichier d'origine
 * sans conversion (quality 1, representation Current, sans EXIF), une seule reduction a 1440 px.
 * Une photo restee sur iCloud doit d'abord etre telechargee par iOS : cette attente reste hors de l'app.
 */
export async function pickCardPhoto(source: 'gallery' | 'camera', opts?: { square?: boolean; onPreparation?: (enCours: boolean) => void }): Promise<CardPhoto | null> {
  const preparer = async (a: { uri: string; width?: number; height?: number }): Promise<CardPhoto> => {
    opts?.onPreparation?.(true);
    try {
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      return { uri: await resizeForCard(a.uri, a.width, a.height), landscape: (a.width || 0) > (a.height || 0) };
    } finally {
      opts?.onPreparation?.(false);
    }
  };
  try {
    if (source === 'camera') {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        appAlert(traduire('Appareil photo bloqué'), traduire('Autorise l’appareil photo dans les réglages de ton téléphone.'));
        return null;
      }
      const res = await launchCameraAsync({ allowsEditing: true, quality: 0.9, exif: false, aspect: opts?.square ? [1, 1] : undefined });
      if (res.canceled || !res.assets?.[0]) return null;
      return await preparer(res.assets[0]);
    }
    const { status } = await requestMediaLibraryPermissionsAsync();
    if ((status as string) !== 'granted' && (status as string) !== 'limited') {
      appAlert(traduire('Photos bloquées'), traduire('Autorise l’accès à tes photos dans les réglages de ton téléphone.'));
      return null;
    }
    const res = await launchImageLibraryAsync({
      allowsEditing: !!opts?.square,
      aspect: opts?.square ? [1, 1] : undefined,
      quality: 1,
      exif: false,
      base64: false,
      // valeur de l'enum Current, ecrite en clair (les maquettes de test n'exportent pas l'enum)
      preferredAssetRepresentationMode: 'current' as UIImagePickerPreferredAssetRepresentationMode,
      selectionLimit: 1,
    });
    if (res.canceled || !res.assets?.[0]) return null;
    return await preparer(res.assets[0]);
  } catch (e) {
    logger.error('[partage] photo', e);
    appAlert(traduire('Oups'), traduire('Impossible de récupérer la photo.'));
    return null;
  }
}

async function capture(ref: RefObject<View | null>): Promise<string | null> {
  if (!ref.current) return null;
  return captureRef(ref.current, { format: 'png', quality: 1, result: 'tmpfile' });
}

/**
 * Partage la carte en image. Si le partage est indisponible, l'image part dans la galerie.
 * La carte porte deja la marque et la ligne d'adresse (SignatureCarte). Quand on passe par le partage
 * de React Native (qui accepte un texte avec l'image), la signature texte accompagne l'image.
 * source : appelle noterPartage au toucher, puis a la confirmation d'envoi quand le systeme la donne.
 */
export async function shareCard(ref: RefObject<View | null>, dialogTitle = traduire('Partager ma carte YOROI'), fallbackMessage?: string, source?: SourcePartage): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  if (source) noterPartage(source);
  try {
    const uri = await capture(ref);
    if (!uri) {
      appAlert(traduire('Oups'), traduire('La carte n’est pas encore prête.'));
      return false;
    }
    if (await isAvailableAsync()) {
      // expo-sharing ne transmet que le fichier et ne dit pas si l'envoi a eu lieu
      await shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
      return true;
    }
    const { status } = await requestPermissionsAsync();
    if (status === 'granted') {
      await saveToLibraryAsync(uri);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      appAlert(traduire('Image enregistrée'), traduire('Le partage n’est pas disponible ici, ta carte est dans ta galerie.'));
      return true;
    }
    const res = await Share.share({ message: fallbackMessage ? texteSigne(fallbackMessage) : signaturePartage(), url: uri });
    if (res.action === Share.sharedAction && source) noterPartage(source, true);
    return true;
  } catch (e) {
    logger.error('[partage] share', e);
    appAlert(traduire('Oups'), traduire('Impossible de partager la carte.'));
    return false;
  }
}

/** Enregistre la carte dans la galerie */
export async function saveCard(ref: RefObject<View | null>): Promise<boolean> {
  impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  try {
    const { status } = await requestPermissionsAsync();
    if ((status as string) !== 'granted' && (status as string) !== 'limited') {
      appAlert(traduire('Galerie bloquée'), traduire('Autorise l’accès à ta galerie pour enregistrer l’image.'));
      return false;
    }
    const uri = await capture(ref);
    if (!uri) return false;
    await saveToLibraryAsync(uri);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    appAlert(traduire('Enregistrée'), traduire('Ta carte est dans ta galerie.'));
    return true;
  } catch (e) {
    logger.error('[partage] save', e);
    appAlert(traduire('Oups'), traduire('Impossible d’enregistrer la carte.'));
    return false;
  }
}
