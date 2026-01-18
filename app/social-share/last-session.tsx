// ============================================
// YOROI - LAST SESSION SHARE (Design VictoryShareModal)
// ============================================
// Partage de la dernière séance d'entraînement

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Dumbbell,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.25;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function LastSessionScreen() {
  const { colors, isDark } = useTheme();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<'dark' | 'light' | 'photo'>('dark');
  const [isLoading, setIsLoading] = useState(false);
  const [lastTraining, setLastTraining] = useState<Training | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load last training
  useEffect(() => {
    const loadLastTraining = async () => {
      try {
        const trainings = await getTrainings();
        if (trainings.length > 0) {
          // Sort by date desc and take the first one
          const sorted = trainings.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setLastTraining(sorted[0]);
        }
      } catch (error) {
        logger.error('Error loading last training:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadLastTraining();
  }, []);

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
        allowsEditing: false,
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
        allowsEditing: false,
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
          dialogTitle: 'Partager ma séance',
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

  // ============================================
  // RENDER
  // ============================================

  if (isLoadingData) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (!lastTraining) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune séance enregistrée
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ajoute une séance d'entraînement pour pouvoir la partager !
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/add-training')}
          >
            <Text style={[styles.addButtonText, { color: colors.textOnGold }]}>Ajouter une séance</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  const sportName = getSportName(lastTraining.sport);
  const formattedDate = new Date(lastTraining.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const getCardBackground = (): [string, string] => {
    if (selectedTemplate === 'light') return ['#FFFFFF', '#F5F5F5'];
    return ['#1A1A1A', '#0A0A0A'];
  };

  const getTextColor = () => {
    return selectedTemplate === 'light' ? '#000000' : '#FFFFFF';
  };

  return (
    <ScreenWrapper>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header fixe */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Dumbbell size={20} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Partager ma séance
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

        {/* Card Preview */}
        <View style={styles.cardContainer}>
          <View
            ref={cardRef}
            style={[styles.card, { overflow: 'hidden' }]}
            collapsable={false}
          >
            {selectedTemplate === 'photo' && backgroundImage ? (
              <View style={styles.cardInner}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
                  <View style={[StyleSheet.absoluteFill, { opacity: 0.6, backgroundColor: '#000' }]} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardLabel, { color: '#FFFFFF99' }]}>SÉANCE TERMINÉE</Text>
                  <Text style={[styles.cardSport, { color: '#FFFFFF' }]}>{sportName}</Text>
                  <Text style={[styles.cardDuration, { color: colors.accent }]}>
                    {lastTraining.duration_minutes} min
                  </Text>
                  <Text style={[styles.cardDate, { color: '#FFFFFF99' }]}>{formattedDate}</Text>
                  <View style={styles.cardBranding}>
                    <Text style={[styles.brandingText, { color: '#FFFFFF66' }]}>@yoroiapp</Text>
                  </View>
                </View>
              </View>
            ) : (
              <LinearGradient
                colors={getCardBackground()}
                style={styles.cardInner}
              >
                <View style={styles.cardContent}>
                  <Text style={[styles.cardLabel, { color: getTextColor() + '99' }]}>SÉANCE TERMINÉE</Text>
                  <Text style={[styles.cardSport, { color: getTextColor() }]}>{sportName}</Text>
                  <Text style={[styles.cardDuration, { color: colors.accent }]}>
                    {lastTraining.duration_minutes} min
                  </Text>
                  <Text style={[styles.cardDate, { color: getTextColor() + '99' }]}>{formattedDate}</Text>
                  {lastTraining.notes && (
                    <Text style={[styles.cardNotes, { color: getTextColor() + '80' }]} numberOfLines={2}>
                      "{lastTraining.notes}"
                    </Text>
                  )}
                  <View style={styles.cardBranding}>
                    <Text style={[styles.brandingText, { color: getTextColor() + '66' }]}>@yoroiapp</Text>
                  </View>
                </View>
              </LinearGradient>
            )}
          </View>
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
                { color: selectedTemplate === key ? colors.textOnAccent : colors.textPrimary }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Actions */}
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

        {/* Bottom padding for safe area */}
        <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 40,
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
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardInner: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  cardSport: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDuration: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  cardNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  cardBranding: {
    position: 'absolute',
    bottom: 20,
  },
  brandingText: {
    fontSize: 12,
    fontWeight: '600',
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

  // Photo Picker
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
    fontSize: 14,
    fontWeight: '600',
  },

  // Photo Actions
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
