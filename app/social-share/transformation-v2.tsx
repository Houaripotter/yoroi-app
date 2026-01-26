// ============================================
// YOROI - TRANSFORMATION V2 (PARTAGE SOCIAL)
// ============================================
// Carte Transformation Avant/Après pour réseaux sociaux

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Share2,
  Download,
  ChevronRight,
  Camera,
  RefreshCw,
  Smartphone,
  Square,
} from 'lucide-react-native';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { TransformationCardV2, TransformationStats } from '@/components/social-cards/TransformationCardV2';
import { Photo, getPhotosFromStorage } from '@/lib/storage';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

type Step = 'select_before' | 'select_after' | 'preview';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function TransformationV2Screen() {
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const [selectedBefore, setSelectedBefore] = useState<Photo | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<Photo | null>(null);
  const [step, setStep] = useState<Step>('select_before');
  const [format, setFormat] = useState<'stories' | 'square'>('stories');

  // ============================================
  // CHARGER LES PHOTOS
  // ============================================

  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedPhotos = await getPhotosFromStorage();
      setPhotos(fetchedPhotos);

      // Auto-sélectionner si assez de photos
      if (fetchedPhotos.length >= 2) {
        const sortedByDate = [...fetchedPhotos].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setSelectedBefore(sortedByDate[0]); // Plus ancienne
        setSelectedAfter(sortedByDate[sortedByDate.length - 1]); // Plus récente
        setStep('preview');
      }
    } catch (error) {
      logger.error('Erreur chargement photos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPhotos();
    }, [loadPhotos])
  );

  // ============================================
  // FORMATER DATES
  // ============================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      month: 'short',
      year: 'numeric',
    });
  };

  // ============================================
  // CALCULER STATS
  // ============================================

  const getTransformationStats = (): TransformationStats | null => {
    if (!selectedBefore || !selectedAfter) return null;

    const daysDifference = Math.abs(
      Math.floor(
        (new Date(selectedAfter.date).getTime() - new Date(selectedBefore.date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const weightDifference =
      selectedBefore.weight && selectedAfter.weight
        ? selectedAfter.weight - selectedBefore.weight
        : undefined;

    return {
      before: {
        uri: selectedBefore.file_uri,
        date: selectedBefore.date,
        weight: selectedBefore.weight,
      },
      after: {
        uri: selectedAfter.file_uri,
        date: selectedAfter.date,
        weight: selectedAfter.weight,
      },
      weightDifference,
      daysDifference,
    };
  };

  // ============================================
  // GESTION SÉLECTION
  // ============================================

  const handleSelectPhoto = (photo: Photo) => {
    if (step === 'select_before') {
      setSelectedBefore(photo);
      setStep('select_after');
      impactAsync(ImpactFeedbackStyle.Light);
    } else if (step === 'select_after') {
      if (photo.id !== selectedBefore?.id) {
        setSelectedAfter(photo);
        setStep('preview');
        impactAsync(ImpactFeedbackStyle.Medium);
      } else {
        showPopup('Photo identique', 'Choisis une photo différente pour la comparaison', [{ text: 'OK', style: 'primary' }]);
      }
    }
  };

  const resetSelection = () => {
    setSelectedBefore(null);
    setSelectedAfter(null);
    setStep('select_before');
    impactAsync(ImpactFeedbackStyle.Light);
  };

  // ============================================
  // CAPTURE & PARTAGE
  // ============================================

  const handleShare = async () => {
    try {
      setIsCapturing(true);
      impactAsync(ImpactFeedbackStyle.Medium);

      if (!cardRef.current) {
        showPopup('Erreur', 'Impossible de capturer la carte', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      if (await isAvailableAsync()) {
        await shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma transformation Yoroi',
        });
        notificationAsync(NotificationFeedbackType.Success);
      } else {
        showPopup('Erreur', 'Le partage n\'est pas disponible sur cet appareil', [{ text: 'OK', style: 'primary' }]);
      }
    } catch (error) {
      logger.error('Erreur partage:', error);
      showPopup('Erreur', 'Impossible de partager la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsCapturing(true);
      impactAsync(ImpactFeedbackStyle.Medium);

      const { status } = await requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'accéder à ta galerie pour sauvegarder l\'image.', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      if (!cardRef.current) {
        showPopup('Erreur', 'Impossible de capturer la carte', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      await saveToLibraryAsync(uri);

      notificationAsync(NotificationFeedbackType.Success);
      showPopup('Sauvegardé', 'Ta transformation a été ajoutée à ta galerie.', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsCapturing(false);
    }
  };

  // ============================================
  // RENDER - PAS ASSEZ DE PHOTOS
  // ============================================

  if (!isLoading && photos.length < 2) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Transformation
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.accent + '15' }]}>
            <Camera size={48} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Pas assez de photos
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ajoute au moins 2 photos dans ta galerie pour créer ta carte transformation !
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/photos')}
          >
            <Camera size={20} color={colors.textOnGold} />
            <Text style={[styles.emptyButtonText, { color: colors.textOnGold }]}>Ajouter mes photos</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // ============================================
  // RENDER - CHARGEMENT
  // ============================================

  if (isLoading) {
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

  // ============================================
  // RENDER - PRINCIPAL
  // ============================================

  const stats = getTransformationStats();

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
            Transformation
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Avant / Après
          </Text>
        </View>

        {step === 'preview' && (
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.card }]}
            onPress={resetSelection}
          >
            <RefreshCw size={20} color={colors.accent} />
          </TouchableOpacity>
        )}
        {step !== 'preview' && <View style={{ width: 44 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* MODE PREVIEW */}
        {step === 'preview' && stats && (
          <>
            {/* Compact Format Selector */}
            <View style={[styles.formatToolbar, { backgroundColor: colors.card }]}>
              <View style={[styles.formatSelector, { backgroundColor: colors.backgroundElevated || colors.background }]}>
                <TouchableOpacity
                  style={[
                    styles.formatButton,
                    format === 'stories' && { backgroundColor: colors.accent },
                  ]}
                  onPress={() => {
                    setFormat('stories');
                    impactAsync(ImpactFeedbackStyle.Light);
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
                    impactAsync(ImpactFeedbackStyle.Light);
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
                <TransformationCardV2 ref={cardRef} stats={stats} format={format} username="yoroiapp" />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.shareButton,
                  { backgroundColor: colors.accent },
                ]}
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
                style={[
                  styles.actionButton,
                  styles.saveButton,
                  { borderColor: colors.accent },
                ]}
                onPress={handleSave}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Download size={20} color={colors.accent} />
                    <Text style={[styles.saveButtonText, { color: isDark ? colors.accent : colors.textPrimary }]}>
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
                Partage ta transformation sur Instagram et inspire tes amis ! N'oublie pas le hashtag
                #YoroiWarrior pour rejoindre la communauté.
              </Text>
            </View>
          </>
        )}

        {/* MODE SÉLECTION AVANT */}
        {step === 'select_before' && (
          <View style={styles.selectionSection}>
            <View style={[styles.selectionBadge, { backgroundColor: '#EF444420' }]}>
              <Text style={[styles.selectionBadgeText, { color: '#EF4444' }]}>ÉTAPE 1/2</Text>
            </View>
            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              Choisis ta photo AVANT
            </Text>
            <Text style={[styles.selectionSubtitle, { color: colors.textSecondary }]}>
              Sélectionne ta photo de départ
            </Text>

            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.photoCard, { backgroundColor: colors.card }]}
                  onPress={() => handleSelectPhoto(photo)}
                >
                  <Image
                    source={{ uri: photo.file_uri }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoInfo}>
                    <Text style={[styles.photoDate, { color: colors.textSecondary }]}>
                      {formatDate(photo.date)}
                    </Text>
                    {photo.weight && (
                      <Text style={[styles.photoWeight, { color: colors.gold }]}>
                        {photo.weight.toFixed(1)} kg
                      </Text>
                    )}
                  </View>
                  <View style={styles.selectIndicator}>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* MODE SÉLECTION APRÈS */}
        {step === 'select_after' && selectedBefore && (
          <View style={styles.selectionSection}>
            {/* Preview sélection avant */}
            <View style={[styles.selectedPreview, { backgroundColor: colors.card }]}>
              <Image
                source={{ uri: selectedBefore.file_uri }}
                style={styles.selectedPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.selectedPreviewInfo}>
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>AVANT</Text>
                </View>
                <Text style={[styles.selectedDate, { color: colors.textSecondary }]}>
                  {formatDateShort(selectedBefore.date)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setStep('select_before');
                  setSelectedBefore(null);
                }}
              >
                <Text style={[styles.changeButtonText, { color: isDark ? colors.accent : colors.textPrimary }]}>Changer</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.selectionBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.selectionBadgeText, { color: '#10B981' }]}>ÉTAPE 2/2</Text>
            </View>
            <Text style={[styles.selectionTitle, { color: colors.textPrimary }]}>
              Choisis ta photo APRÈS
            </Text>
            <Text style={[styles.selectionSubtitle, { color: colors.textSecondary }]}>
              Sélectionne ta photo la plus récente
            </Text>

            <View style={styles.photoGrid}>
              {photos
                .filter((p) => p.id !== selectedBefore.id)
                .map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={[styles.photoCard, { backgroundColor: colors.card }]}
                    onPress={() => handleSelectPhoto(photo)}
                  >
                    <Image
                      source={{ uri: photo.file_uri }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoInfo}>
                      <Text style={[styles.photoDate, { color: colors.textSecondary }]}>
                        {formatDate(photo.date)}
                      </Text>
                      {photo.weight && (
                        <Text style={[styles.photoWeight, { color: colors.gold }]}>
                          {photo.weight.toFixed(1)} kg
                        </Text>
                      )}
                    </View>
                    <View style={styles.selectIndicator}>
                      <ChevronRight size={20} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}

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
  resetButton: {
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

  // Loading
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

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    // color dynamically set inline
  },

  // Format Toolbar
  formatToolbar: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
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
  shareButton: {},
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
    fontWeight: '600',
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

  // Selection
  selectionSection: {
    gap: 12,
  },
  selectionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 4,
  },
  selectionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  selectionSubtitle: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
  photoGrid: {
    gap: 14,
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    padding: 10,
    gap: 14,
  },
  photoImage: {
    width: 90,
    height: 110,
    borderRadius: 14,
  },
  photoInfo: {
    flex: 1,
    gap: 6,
  },
  photoDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  photoWeight: {
    fontSize: 20,
    fontWeight: '800',
  },
  selectIndicator: {
    paddingRight: 8,
  },

  // Selected Preview
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
    gap: 14,
  },
  selectedPreviewImage: {
    width: 70,
    height: 90,
    borderRadius: 12,
  },
  selectedPreviewInfo: {
    flex: 1,
    gap: 6,
  },
  selectedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  selectedDate: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  changeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  changeButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
