// ============================================
// YOROI - WEEKLY RECAP V2 (AVEC PHOTO)
// ============================================
// Carte Weekly Recap avec photo en fond comme Instagram Stories

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  X,
  Smartphone,
  Square,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { WeeklyRecapCardV2 } from '@/components/social-cards/WeeklyRecapCardV2';
import { useWeekStats } from '@/lib/social-cards/useWeekStats';
import logger from '@/lib/security/logger';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function WeeklyRecapV2Screen() {
  const { colors, isDark } = useTheme();
  const cardRef = useRef<View>(null);

  const [format, setFormat] = useState<'stories' | 'square'>('stories');
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [isCapturing, setIsCapturing] = useState(false);

  const { stats, isLoading } = useWeekStats();

  // ============================================
  // PHOTO PICKER
  // ============================================

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "Yoroi a besoin d'accéder à ton appareil photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      logger.error('Erreur photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Yoroi a besoin d\'accéder à ta galerie.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      logger.error('Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible de choisir l\'image');
    }
  };

  const removePhoto = () => {
    setBackgroundImage(undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // ============================================
  // CAPTURE & PARTAGE
  // ============================================

  const handleShare = async () => {
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!cardRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer la carte');
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma semaine Yoroi',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      logger.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager la carte');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Yoroi a besoin d\'accéder à ta galerie pour sauvegarder l\'image.'
        );
        return;
      }

      if (!cardRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer la carte');
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sauvegardé', 'Ta carte a été ajoutée à ta galerie.');
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la carte');
    } finally {
      setIsCapturing(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des stats...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!stats) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune donnée cette semaine
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Commence à t'entraîner pour générer ta carte !
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/add-training')}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>Ajouter un entraînement</Text>
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
            RÉCAP HEBDO
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {stats.weekLabel}
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
              onPress={() => {
                setFormat('stories');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
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
              onPress={() => {
                setFormat('square');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Square size={14} color={format === 'square' ? colors.textOnGold : colors.textSecondary} />
              <Text style={[styles.formatButtonText, { color: format === 'square' ? colors.textOnGold : colors.textSecondary }]}>
                Carré
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview Card */}
        <View style={styles.previewSection}>
          <View style={styles.cardWrapper}>
            <WeeklyRecapCardV2
              ref={cardRef}
              stats={stats}
              format={format}
              backgroundImage={backgroundImage}
              username="yoroiapp"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton, { backgroundColor: colors.accent }]}
            onPress={handleShare}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={colors.textOnGold} />
            ) : (
              <>
                <Share2 size={20} color={colors.textOnGold} />
                <Text style={[styles.actionButtonText, { color: colors.textOnGold }]}>Partager</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, { borderColor: colors.accent }]}
            onPress={handleSave}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Download size={20} color={colors.accent} />
                <Text style={[styles.saveButtonText, { color: colors.accent }]}>
                  Sauvegarder
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tipsTitle, { color: colors.gold || colors.accent }]}>
            Astuce
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            Prends-toi en photo dans une position de champion et affiche tes stats de la semaine comme
            un filtre Instagram Stories ! N'oublie pas #YoroiWarrior
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    // color dynamically set inline
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
    letterSpacing: 0.5,
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

  // Preview
  previewSection: {
    marginBottom: 16,
  },
  cardWrapper: {
    alignItems: 'center',
  },

  // Actions
  actionsSection: {
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareButton: {
    // backgroundColor set dynamically
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    // color dynamically set inline
  },
  saveButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Tips
  tipsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
