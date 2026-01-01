import { RefObject } from 'react';
import { View, Alert, Platform, Linking } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import logger from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';

// ============================================
// SOCIAL CARD HELPERS
// ============================================
// Fonctions réutilisables pour capture/partage/sauvegarde

/**
 * Capture une vue et la partage via le sheet natif
 */
export const captureAndShare = async (
  viewRef: RefObject<View>,
  options?: {
    dialogTitle?: string;
    enableHaptics?: boolean;
  }
): Promise<string | null> => {
  try {
    if (options?.enableHaptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!viewRef.current) {
      Alert.alert('Erreur', 'Impossible de capturer la carte');
      return null;
    }

    const uri = await captureRef(viewRef.current, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    // Vérifier si le partage est disponible
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: options?.dialogTitle || 'Partager ma carte Yoroi',
      });

      return uri;
    } else {
      Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      return null;
    }
  } catch (error) {
    logger.error('Erreur partage:', error);
    Alert.alert('Erreur', 'Impossible de partager la carte');
    return null;
  }
};

/**
 * Capture une vue et la sauvegarde dans la galerie
 */
export const captureAndSave = async (
  viewRef: RefObject<View>,
  options?: {
    successMessage?: string;
    enableHaptics?: boolean;
  }
): Promise<string | null> => {
  try {
    if (options?.enableHaptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!viewRef.current) {
      Alert.alert('Erreur', 'Impossible de capturer la carte');
      return null;
    }

    const uri = await captureRef(viewRef.current, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    // Demander permission
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Yoroi a besoin d\'accéder à ta galerie pour sauvegarder la carte.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ouvrir Réglages',
            onPress: () => {
              if (Platform.OS === 'ios') {
                safeOpenURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return null;
    }

    // Sauvegarder dans la galerie
    await MediaLibrary.saveToLibraryAsync(uri);

    if (options?.enableHaptics && Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert('Sauvegardé !', options?.successMessage || 'Carte enregistrée dans ta galerie !');

    return uri;
  } catch (error) {
    logger.error('Erreur sauvegarde:', error);

    // Gestion d'erreur spécifique pour permissions
    if ((error as any).message?.includes('PERMISSION')) {
      Alert.alert(
        'Permission requise',
        'Yoroi a besoin d\'accéder à ta galerie.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ouvrir Réglages', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      Alert.alert('Erreur', 'Impossible de sauvegarder la carte');
    }

    return null;
  }
};

/**
 * Génère les hashtags automatiques pour une carte
 */
export const generateHashtags = (
  cardType: 'year-counter' | 'monthly-recap',
  stats?: {
    percentage?: number;
    totalDays?: number;
    year?: number;
  }
): string => {
  const common = ['#YoroiWarrior', '#YoroiApp'];

  let specific: string[] = [];

  if (cardType === 'year-counter') {
    specific = ['#365Challenge', '#YearInReview2025'];

    // Hashtags dynamiques selon stats
    if (stats?.percentage && stats.percentage >= 50) {
      specific.push('#HalfwayThere');
    }
    if (stats?.totalDays && stats.totalDays >= 100) {
      specific.push('#100DaysChallenge');
    }
    if (stats?.totalDays && stats.totalDays >= 200) {
      specific.push('#200DaysStrong');
    }
  } else if (cardType === 'monthly-recap') {
    specific = ['#MonthlyRecap', '#ConsistencyIsKey'];
  }

  return [...common, ...specific].join(' ');
};

/**
 * Copie les hashtags dans le presse-papier
 */
export const copyHashtagsToClipboard = async (hashtags: string): Promise<void> => {
  try {
    // Note: Clipboard API nécessite expo-clipboard
    // Pour l'instant, on peut juste retourner les hashtags
    // await Clipboard.setStringAsync(hashtags);
    logger.info('Hashtags:', hashtags);
  } catch (error) {
    logger.error('Erreur copie hashtags:', error);
  }
};
