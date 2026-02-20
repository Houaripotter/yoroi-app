// ============================================
// YOROI - WEIGHT PROGRESS CARD
// ============================================
// Carte de partage evolution poids

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync, MediaTypeOptions } from 'expo-image-picker';
import { ChevronLeft, Share2, Download, Square, Smartphone, Camera, Image as ImageIcon } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { WeightProgressCard } from '@/components/social-cards/WeightProgressCard';
import { useWeightProgress } from '@/lib/social-cards/useWeightProgress';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function WeightProgressScreen() {
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [format, setFormat] = useState<'stories' | 'square'>('stories');
  const [isSaving, setIsSaving] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);

  // Charger les stats de poids
  const { stats, isLoading, error } = useWeightProgress();

  // Prendre une photo avec la camera
  const takePhoto = async () => {
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'acceder a la camera', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await launchCameraAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        if (Platform.OS !== 'web') {
          notificationAsync(NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      logger.error('Erreur prise de photo:', err);
      showPopup('Erreur', 'Impossible de prendre la photo', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // Choisir une photo depuis la galerie
  const pickImage = async () => {
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'acceder a ta galerie', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        if (Platform.OS !== 'web') {
          notificationAsync(NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      logger.error('Erreur selection photo:', err);
      showPopup('Erreur', 'Impossible de selectionner la photo', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // Supprimer la photo de fond
  const removePhoto = () => {
    setBackgroundImage(undefined);
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  // Sauvegarder la carte en image
  const saveCard = async () => {
    try {
      setIsSaving(true);

      if (Platform.OS !== 'web') {
        impactAsync(ImpactFeedbackStyle.Medium);
      }

      if (!cardRef.current) {
        showPopup('Erreur', 'Impossible de capturer la carte', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Demander permission
      const { status } = await requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Autorisation necessaire pour sauvegarder l\'image', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      // Sauvegarder dans la galerie
      await saveToLibraryAsync(uri);

      if (Platform.OS !== 'web') {
        notificationAsync(NotificationFeedbackType.Success);
      }

      showPopup('Sauvegarde', 'Ta carte poids est dans ta galerie !', [{ text: 'OK', style: 'primary' }]);
    } catch (err) {
      logger.error('Erreur sauvegarde:', err);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSaving(false);
    }
  };

  // Partager la carte
  const shareCard = async () => {
    try {
      if (Platform.OS !== 'web') {
        impactAsync(ImpactFeedbackStyle.Medium);
      }

      if (!cardRef.current) {
        showPopup('Erreur', 'Impossible de capturer la carte', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      if (await isAvailableAsync()) {
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma progression poids Yoroi',
        });
      } else {
        showPopup('Erreur', 'Le partage n\'est pas disponible sur cet appareil', [{ text: 'OK', style: 'primary' }]);
      }
    } catch (err) {
      logger.error('Erreur partage:', err);
      showPopup('Erreur', 'Impossible de partager la carte', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // Etat de chargement
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Calcul de ta progression...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Erreur
  if (error || !stats) {
    return (
      <ScreenWrapper>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Pas encore de donnees
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error || 'Enregistre tes pesees pour voir ta progression !'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/add')}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Ajouter une pesee
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            PROGRESSION POIDS
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {stats.totalLost > 0 ? `-${stats.totalLost} kg` : stats.totalLost < 0 ? `+${Math.abs(stats.totalLost)} kg` : 'Stable'} depuis le debut
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Toolbar compact */}
        <View style={[styles.toolbar, { backgroundColor: colors.card }]}>
          {/* Photo buttons */}
          <View style={styles.toolbarSection}>
            <TouchableOpacity
              style={[styles.toolbarButton, { backgroundColor: colors.accent }]}
              onPress={takePhoto}
            >
              <Camera size={16} color={colors.textOnGold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolbarButton, { backgroundColor: colors.backgroundElevated || colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={pickImage}
            >
              <ImageIcon size={16} color={colors.textPrimary} />
            </TouchableOpacity>
            {backgroundImage && (
              <TouchableOpacity
                style={[styles.toolbarButtonText, { backgroundColor: '#EF444420' }]}
                onPress={removePhoto}
              >
                <Text style={[styles.removeText, { color: '#EF4444' }]}>Retirer</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Format selector */}
          <View style={[styles.formatSelector, { backgroundColor: colors.backgroundElevated || colors.background }]}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                format === 'stories' && { backgroundColor: colors.accent },
              ]}
              onPress={() => setFormat('stories')}
            >
              <Smartphone size={14} color={format === 'stories' ? colors.textOnGold : colors.textSecondary} />
              <Text style={[styles.formatButtonText, { color: format === 'stories' ? colors.textOnGold : colors.textSecondary }]}>
                Story
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formatButton,
                format === 'square' && { backgroundColor: colors.accent },
              ]}
              onPress={() => setFormat('square')}
            >
              <Square size={14} color={format === 'square' ? colors.textOnGold : colors.textSecondary} />
              <Text style={[styles.formatButtonText, { color: format === 'square' ? colors.textOnGold : colors.textSecondary }]}>
                Carré
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Carte Weight Progress */}
        <View style={styles.cardContainer}>
          <WeightProgressCard
            ref={cardRef}
            stats={stats}
            format={format}
            backgroundImage={backgroundImage}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={saveCard}
            disabled={isSaving}
          >
            <Download size={20} color={colors.textPrimary} />
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              Sauvegarder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gold || colors.accent }]}
            onPress={shareCard}
          >
            <Share2 size={20} color={colors.textOnGold} />
            <Text style={[styles.actionButtonText, { color: colors.textOnGold }]}>
              Partager
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.tipTitle, { color: colors.gold || colors.accent }]}>
            Astuce
          </Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Partage ta progression avec tes amis pour les motiver ! Ta courbe de poids et tes achievements seront visibles.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <PopupComponent />
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Toolbar compact
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  toolbarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarButton: {
    width: 42,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonText: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Format Selector
  formatSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Button
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Tips
  tipCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
