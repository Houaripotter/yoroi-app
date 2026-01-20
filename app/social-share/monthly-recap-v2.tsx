// ============================================
// YOROI - MONTHLY RECAP V2 (Design VictoryShareModal)
// ============================================
// Design identique au WeeklyRecapV2 avec Photo/Sombre/Clair

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { MonthlyRecapCardV2 } from '@/components/social-cards/MonthlyRecapCardV2';
import { useMonthStats } from '@/lib/social-cards/useMonthStats';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function MonthlyRecapV2Screen() {
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<'photo' | 'dark' | 'light'>('photo');
  const [backgroundType, setBackgroundType] = useState<'photo' | 'black' | 'white'>('black');
  const [isLandscapeImage, setIsLandscapeImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les stats du mois actuel
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const { stats, isLoading: statsLoading, error } = useMonthStats(currentYear, currentMonth);

  // ============================================
  // PHOTO PICKER
  // ============================================

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusée', 'Autorise l\'accès à la caméra pour prendre une photo.', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackgroundImage(asset.uri);
        setSelectedTemplate('photo');
        // Détecter si l'image est en paysage
        const isLandscape = (asset.width || 0) > (asset.height || 0);
        setIsLandscapeImage(isLandscape);
      }
    } catch (error) {
      logger.error('Erreur photo:', error);
      showPopup('Erreur', 'Impossible de prendre la photo', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusée', 'Autorise l\'accès à tes photos pour ajouter une image.', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackgroundImage(asset.uri);
        setSelectedTemplate('photo');
        // Détecter si l'image est en paysage
        const isLandscape = (asset.width || 0) > (asset.height || 0);
        setIsLandscapeImage(isLandscape);
      }
    } catch (error) {
      logger.error('Erreur galerie:', error);
      showPopup('Erreur', 'Impossible de choisir l\'image', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // ============================================
  // SHARE & SAVE
  // ============================================

  const shareCard = async () => {
    if (!cardRef.current) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager mon récap mensuel',
        });
      }
    } catch (error) {
      logger.error('Error sharing:', error);
      showPopup('Erreur', 'Impossible de partager la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToGallery = async () => {
    if (!cardRef.current) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Autorise l\'accès à ta galerie pour sauvegarder l\'image.', [{ text: 'OK', style: 'primary' }]);
        setIsLoading(false);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup('Sauvegardé', 'Ta carte a été ajoutée à ta galerie.', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      logger.error('Error saving:', error);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get background type for card component
  const getBackgroundType = (): 'photo' | 'black' | 'white' => {
    if (selectedTemplate === 'photo' && backgroundImage) return 'photo';
    if (selectedTemplate === 'light') return 'white';
    return 'black';
  };

  // ============================================
  // RENDER
  // ============================================

  if (statsLoading) {
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

  if (error || !stats) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {error || 'Impossible de charger les statistiques'}
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (stats.activeDays === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune donnée pour {stats.monthName} {stats.year}
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Calendar size={20} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Récap Mensuel
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View style={styles.cardContainer}>
            <MonthlyRecapCardV2
              ref={cardRef}
              stats={stats}
              format="stories"
              backgroundImage={selectedTemplate === 'photo' ? backgroundImage : undefined}
              backgroundType={getBackgroundType()}
              isLandscape={isLandscapeImage}
              username="yoroiapp"
            />
          </View>

          {/* Template Selector */}
          <View style={styles.templateRow}>
            <Text style={[styles.templateLabel, { color: colors.textMuted }]}>Style:</Text>
            {([
              { key: 'photo', label: 'Photo' },
              { key: 'dark', label: 'Sombre' },
              { key: 'light', label: 'Clair' },
            ] as const).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.templateBtn,
                  {
                    backgroundColor: selectedTemplate === key ? colors.accent : colors.backgroundCard,
                    borderColor: selectedTemplate === key ? colors.accent : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTemplate(key);
                  // Scroll auto si photo
                  if (key === 'photo') {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }
                }}
              >
                <Text style={[
                  styles.templateBtnText,
                  { color: selectedTemplate === key ? colors.textOnAccent : colors.textPrimary }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo Actions - Show picker when NO photo, show change buttons when photo exists */}
          {selectedTemplate === 'photo' && !backgroundImage && (
            <View style={styles.photoPickerContainer}>
              <Text style={[styles.photoPickerTitle, { color: colors.textPrimary }]}>
                Ajoute ta photo
              </Text>
              <View style={styles.photoPickerButtons}>
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { backgroundColor: colors.accent }]}
                  onPress={takePhoto}
                >
                  <Camera size={20} color={colors.textOnAccent} />
                  <Text style={[styles.photoPickerBtnText, { color: colors.textOnAccent }]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}
                  onPress={pickImage}
                >
                  <ImageIcon size={20} color={colors.textPrimary} />
                  <Text style={[styles.photoPickerBtnText, { color: colors.textPrimary }]}>Galerie</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {selectedTemplate === 'photo' && backgroundImage && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={pickImage}
              >
                <ImageIcon size={18} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>Changer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={takePhoto}
              >
                <Camera size={18} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>Nouvelle</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Share Actions */}
          <View style={styles.shareActions}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.accent }]}
              onPress={shareCard}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Share2 size={20} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Partager</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={saveToGallery}
              disabled={isLoading}
            >
              <Download size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Fermer</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <PopupComponent />
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },

  // Template Selector
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  templateLabel: {
    fontSize: 13,
    marginRight: 8,
  },
  templateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  templateBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Photo Picker (when no photo selected)
  photoPickerContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  photoPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  photoPickerButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  photoPickerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Photo Actions (when photo exists)
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
    justifyContent: 'center',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Share Actions
  shareActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
  },
});
