// ============================================
// YOROI - YEAR COUNTER V2 (Design VictoryShareModal)
// ============================================
// Design identique au VictoryShareModal avec Photo/Sombre/Clair

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Trophy,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { YearCounterCardV2 } from '@/components/social-cards/YearCounterCardV2';
import { useYearStats } from '@/lib/social-cards/useYearStats';
import { getUserSettings } from '@/lib/storage';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function YearCounterV2Screen() {
  const { colors } = useTheme();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [format] = useState<'stories' | 'square'>('stories');
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<'dark' | 'light' | 'photo'>('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string | undefined>(undefined);

  const currentYear = new Date().getFullYear();
  const { stats, isLoading: statsLoading, error } = useYearStats(currentYear);

  // Charger le username
  useEffect(() => {
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
        aspect: [4, 5],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackgroundImage(result.assets[0].uri);
        setSelectedTemplate('photo');
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
        aspect: [4, 5],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setBackgroundImage(result.assets[0].uri);
        setSelectedTemplate('photo');
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
          dialogTitle: 'Partager mon Compteur Annuel',
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
            Calcul de tes stats...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

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

  if (stats.totalDays === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune donnée pour {currentYear}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Commence à tracker tes entraînements pour générer ton Compteur Annuel !
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/add-training')}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>
              Ajouter un entraînement
            </Text>
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
            <Trophy size={20} color="#F59E0B" />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Année {currentYear}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Card Preview */}
        <View style={styles.cardContainer}>
          <YearCounterCardV2
            ref={cardRef}
            stats={stats}
            format={format}
            backgroundImage={selectedTemplate === 'photo' ? backgroundImage : undefined}
            backgroundType={getBackgroundType()}
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
              }}
            >
              <Text style={[
                styles.templateBtnText,
                { color: selectedTemplate === key ? '#000000' : colors.textPrimary }
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
                <Camera size={22} color="#FFFFFF" />
                <Text style={styles.photoPickerBtnText}>Prendre une photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoPickerBtn, styles.photoPickerBtnSecondary, { borderColor: colors.accent }]}
                onPress={pickImage}
              >
                <ImageIcon size={22} color={colors.accent} />
                <Text style={[styles.photoPickerBtnText, { color: colors.accent }]}>Galerie</Text>
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
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
  photoPickerBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
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
