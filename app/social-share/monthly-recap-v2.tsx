// ============================================
// YOROI - MONTHLY RECAP V2
// ============================================
// Carte de partage avec photo en fond comme un filtre Instagram

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
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Share2, Download, Square, Smartphone, Camera, Image as ImageIcon } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { MonthlyRecapCardV2 } from '@/components/social-cards/MonthlyRecapCardV2';
import { useMonthStats } from '@/lib/social-cards/useMonthStats';
import { getUserSettings } from '@/lib/storage';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function MonthlyRecapV2Screen() {
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [format, setFormat] = useState<'stories' | 'square'>('stories');
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);

  // Charger les stats du mois actuel
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const { stats, isLoading, error } = useMonthStats(currentYear, currentMonth);

  // Charger le username
  React.useEffect(() => {
    loadUsername();
  }, []);

  const loadUsername = async () => {
    try {
      const settings = await getUserSettings();
      setUsername(settings.username);
    } catch (err) {
      logger.error('Erreur chargement username:', err);
    }
  };

  // Prendre une photo avec la caméra
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'accéder à la caméra', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'accéder à ta galerie', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      logger.error('Erreur sélection photo:', err);
      showPopup('Erreur', 'Impossible de sélectionner la photo', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // Supprimer la photo de fond
  const removePhoto = () => {
    setBackgroundImage(undefined);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Sauvegarder la carte en image
  const saveCard = async () => {
    try {
      setIsSaving(true);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Autorisation nécessaire pour sauvegarder l\'image', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      // Sauvegarder dans la galerie
      await MediaLibrary.saveToLibraryAsync(uri);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showPopup('Sauvegardé', 'Ton Récap Mensuel est dans ta galerie.', [{ text: 'OK', style: 'primary' }]);
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

      // Vérifier si le partage est disponible
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager mon Récap Mensuel Yoroi',
        });
      } else {
        showPopup('Erreur', 'Le partage n\'est pas disponible sur cet appareil', [{ text: 'OK', style: 'primary' }]);
      }
    } catch (err) {
      logger.error('Erreur partage:', err);
      showPopup('Erreur', 'Impossible de partager la carte', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // État de chargement
  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Calcul de tes stats...
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
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            {error || 'Impossible de charger les statistiques'}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // Pas de données
  if (stats.activeDays === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune donnée pour {stats.monthName} {stats.year}
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Commence à tracker tes entraînements pour générer ton Récap Mensuel !
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/add-training')}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>
              Ajouter un entraînement
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
            RÉCAP MENSUEL
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {stats.activeDays} jours actifs en {stats.monthName}
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

        {/* Carte Monthly Recap */}
        <View style={styles.cardContainer}>
          <MonthlyRecapCardV2
            ref={cardRef}
            stats={stats}
            format={format}
            backgroundImage={backgroundImage}
            username="yoroiapp"
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
            Fais une photo de ton calendrier d'entraînement, de ton tableau de progression ou simplement de toi après une séance ! Ton calendrier du mois s'affichera par-dessus avec style.
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
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyMessage: {
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
