/**
 * Partage en image des cartes YOROI : capture de la vue, partage, enregistrement dans la galerie,
 * choix d'une photo de fond (redimensionnee pour eviter les soucis des photos 12 Mpx).
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
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from './mesure';
import type { SourcePartage } from './mesure';
import { texteSigne } from './texte';
import { traduire } from '@/lib/i18n/tr';

export type CardPhoto = { uri: string; landscape: boolean };

/** Reduit l'image a 1200 px de large */
export async function resizeForCard(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
    return result.uri;
  } catch {
    return uri;
  }
}

/** Ouvre la galerie ou l'appareil photo et rend une photo prete pour la carte */
export async function pickCardPhoto(source: 'gallery' | 'camera', opts?: { square?: boolean }): Promise<CardPhoto | null> {
  try {
    if (source === 'camera') {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        appAlert(traduire('Appareil photo bloqué'), traduire('Autorise l’appareil photo dans les réglages de ton téléphone.'));
        return null;
      }
      const res = await launchCameraAsync({ allowsEditing: true, quality: 0.9, aspect: opts?.square ? [1, 1] : undefined });
      if (res.canceled || !res.assets?.[0]) return null;
      const a = res.assets[0];
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      return { uri: await resizeForCard(a.uri), landscape: (a.width || 0) > (a.height || 0) };
    }
    const { status } = await requestMediaLibraryPermissionsAsync();
    if ((status as string) !== 'granted' && (status as string) !== 'limited') {
      appAlert(traduire('Photos bloquées'), traduire('Autorise l’accès à tes photos dans les réglages de ton téléphone.'));
      return null;
    }
    const res = await launchImageLibraryAsync({ allowsEditing: !!opts?.square, aspect: opts?.square ? [1, 1] : undefined, quality: 0.9, selectionLimit: 1 });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    return { uri: await resizeForCard(a.uri), landscape: (a.width || 0) > (a.height || 0) };
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
