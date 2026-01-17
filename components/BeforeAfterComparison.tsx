import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  Share,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { X, ArrowRight, ChevronLeft, ChevronRight, Columns, SlidersHorizontal, Share2, TrendingDown, Calendar, Trophy, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { successHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';

interface ProgressPhoto {
  id: string;
  photo_url?: string;
  file_uri?: string;
  date: string;
  weight?: number | null;
  notes?: string | null;
  created_at: string;
}

interface BeforeAfterComparisonProps {
  visible: boolean;
  onClose: () => void;
  photos: ProgressPhoto[];
}

const { width: screenWidth } = Dimensions.get('window');
const SLIDER_WIDTH = screenWidth - 40;

export function BeforeAfterComparison({ visible, onClose, photos }: BeforeAfterComparisonProps) {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [selectedBefore, setSelectedBefore] = useState<ProgressPhoto | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<ProgressPhoto | null>(null);
  const [step, setStep] = useState<'before' | 'after' | 'compare'>('before');
  const [viewMode, setViewMode] = useState<'sideBySide' | 'slider'>('slider');

  // Slider avec Animated et PanResponder
  const sliderAnim = useRef(new Animated.Value(0.5)).current;
  const startPos = useRef(0.5);
  const viewShotRef = useRef<ViewShot>(null);

  // PanResponder pour glisser le slider
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        sliderAnim.stopAnimation((value) => {
          startPos.current = value;
        });
      },
      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dx / SLIDER_WIDTH;
        const newVal = Math.max(0, Math.min(1, startPos.current + delta));
        sliderAnim.setValue(newVal);
      },
      onPanResponderRelease: () => {
        sliderAnim.stopAnimation((value) => {
          startPos.current = value;
        });
      },
    })
  ).current;

  // Interpolations pour le slider
  const clipWidth = sliderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDER_WIDTH],
  });

  const handleTranslateX = sliderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, SLIDER_WIDTH - 30],
  });

  const handleBeforeSelect = (photo: ProgressPhoto) => {
    setSelectedBefore(photo);
    setStep('after');
  };

  const handleAfterSelect = (photo: ProgressPhoto) => {
    setSelectedAfter(photo);
    setStep('compare');
    // Reset slider position
    sliderAnim.setValue(0.5);
    startPos.current = 0.5;
  };

  const reset = () => {
    setSelectedBefore(null);
    setSelectedAfter(null);
    setStep('before');
    sliderAnim.setValue(0.5);
    startPos.current = 0.5;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Statistiques
  const weightDifference = selectedBefore && selectedAfter && selectedBefore.weight && selectedAfter.weight
    ? selectedAfter.weight - selectedBefore.weight
    : null;

  const daysDifference = selectedBefore && selectedAfter
    ? Math.abs(
        Math.floor(
          (new Date(selectedAfter.date).getTime() - new Date(selectedBefore.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

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

  const getImageSource = (photo: ProgressPhoto) => {
    const uri = photo.file_uri || photo.photo_url || '';
    if (uri.startsWith('file://') || uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
      return { uri };
    }
    if (uri && !uri.startsWith('/')) {
      return { uri: `file://${uri}` };
    }
    return { uri };
  };

  // Capturer et partager
  const captureAndShare = async () => {
    try {
      if (!viewShotRef.current) return;
      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        showPopup('Erreur', 'Impossible de capturer l\'image', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      successHaptic();

      showPopup(
        'Partager',
        'Que veux-tu faire ?',
        [
          {
            text: 'Partager',
            style: 'primary',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
              } else {
                await Share.share({ url: uri });
              }
            },
          },
          {
            text: 'Sauvegarder',
            style: 'primary',
            onPress: async () => {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status === 'granted') {
                await MediaLibrary.saveToLibraryAsync(uri);
                showPopup('Sauvegarde', 'Image enregistree dans ta galerie', [{ text: 'OK', style: 'primary' }]);
              } else {
                showPopup('Permission refusee', 'Autorise l\'acces a la galerie', [{ text: 'OK', style: 'primary' }]);
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    } catch (error) {
      logger.error('Erreur capture:', error);
      showPopup('Erreur', 'Impossible de creer l\'image', [{ text: 'OK', style: 'primary' }]);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          {step === 'before' ? (
            <TouchableOpacity onPress={handleClose} style={[styles.closeButton, { backgroundColor: colors.card }]}>
              <X size={24} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                if (step === 'after') {
                  setStep('before');
                  setSelectedBefore(null);
                } else if (step === 'compare') {
                  setStep('after');
                  setSelectedAfter(null);
                }
              }}
              style={[styles.closeButton, { backgroundColor: colors.card }]}
            >
              <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <View style={styles.stepBadgeContainer}>
              <View style={[styles.stepBadge, { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}>
                <Text style={[styles.stepBadgeText, { color: colors.gold }]}>
                  {step === 'before' ? '1/3' : step === 'after' ? '2/3' : '3/3'}
                </Text>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {step === 'before' && 'Photo AVANT'}
              {step === 'after' && 'Photo APRÈS'}
              {step === 'compare' && 'Ta Transformation'}
            </Text>
          </View>
          {step === 'compare' ? (
            <TouchableOpacity onPress={captureAndShare} style={[styles.shareButton, { backgroundColor: colors.gold }]}>
              <Share2 size={20} color={colors.background} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : step !== 'before' ? (
            <TouchableOpacity onPress={reset} style={[styles.resetButton, { backgroundColor: colors.card }]}>
              <Text style={[styles.resetButtonText, { color: colors.gold }]}>Reset</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderButton} />
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 'compare' && selectedBefore && selectedAfter ? (
            <View style={styles.comparisonContainer}>
              {/* Mode Toggle */}
              <View style={[styles.modeToggle, { backgroundColor: colors.card }]}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    viewMode === 'slider' && { backgroundColor: colors.gold },
                  ]}
                  onPress={() => setViewMode('slider')}
                  activeOpacity={0.7}
                >
                  <SlidersHorizontal
                    size={18}
                    color={viewMode === 'slider' ? colors.background : colors.textSecondary}
                  />
                  <Text style={[
                    styles.modeButtonText,
                    { color: viewMode === 'slider' ? colors.background : colors.textSecondary }
                  ]}>
                    Slider
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    viewMode === 'sideBySide' && { backgroundColor: colors.gold },
                  ]}
                  onPress={() => setViewMode('sideBySide')}
                  activeOpacity={0.7}
                >
                  <Columns
                    size={18}
                    color={viewMode === 'sideBySide' ? colors.background : colors.textSecondary}
                  />
                  <Text style={[
                    styles.modeButtonText,
                    { color: viewMode === 'sideBySide' ? colors.background : colors.textSecondary }
                  ]}>
                    Côte à côte
                  </Text>
                </TouchableOpacity>
              </View>

              {/* SLIDER MODE */}
              {viewMode === 'slider' && (
                <ViewShot
                  ref={viewShotRef}
                  options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
                  style={[styles.sliderCaptureZone, { backgroundColor: colors.background }]}
                >
                  {/* Export Header */}
                  <View style={[styles.exportHeader, { backgroundColor: colors.background }]}>
                    <Text style={[styles.exportTitle, { color: colors.gold }]}>MA TRANSFORMATION</Text>
                    <Text style={[styles.exportSubtitle, { color: colors.textSecondary }]}>
                      {formatDateShort(selectedBefore.date)} → {formatDateShort(selectedAfter.date)}
                    </Text>
                  </View>

                  {/* Slider Container - Toute la zone est glissable */}
                  <View style={styles.sliderContainer} {...panResponder.panHandlers}>
                    {/* Image AVANT (en dessous) */}
                    <Image
                      source={getImageSource(selectedBefore)}
                      style={styles.sliderImage}
                      resizeMode="cover"
                    />

                    {/* Label AVANT */}
                    <View style={[styles.sliderLabel, styles.sliderLabelLeft]} pointerEvents="none">
                      <Text style={[styles.sliderLabelText, { color: colors.textPrimary }]}>AVANT</Text>
                    </View>

                    {/* Image APRÈS (clippée) */}
                    <Animated.View
                      style={[styles.afterContainer, { width: clipWidth }]}
                      pointerEvents="none"
                    >
                      <Image
                        source={getImageSource(selectedAfter)}
                        style={[styles.sliderImage, styles.afterImage]}
                        resizeMode="cover"
                      />
                      <View style={[styles.sliderLabel, styles.sliderLabelRight]}>
                        <Text style={[styles.sliderLabelText, { color: colors.textPrimary }]}>APRÈS</Text>
                      </View>
                    </Animated.View>

                    {/* Slider Handle */}
                    <Animated.View
                      style={[styles.sliderHandle, { transform: [{ translateX: handleTranslateX }] }]}
                      pointerEvents="none"
                    >
                      <View style={[styles.sliderLine, { backgroundColor: colors.textPrimary }]} />
                      <View style={[styles.handleButton, { backgroundColor: colors.accent }]}>
                        <ChevronLeft size={14} color={colors.background} style={{ marginRight: -6 }} />
                        <ChevronRight size={14} color={colors.background} style={{ marginLeft: -6 }} />
                      </View>
                    </Animated.View>

                    {/* Instructions */}
                    <View style={styles.instructionsContainer} pointerEvents="none">
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.instructionsGradient}
                      >
                        <Text style={styles.instructionsText}>← Glisse pour comparer →</Text>
                      </LinearGradient>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={[styles.sliderStats, { backgroundColor: colors.background }]}>
                    <View style={styles.sliderStatItem}>
                      <Text style={[styles.sliderStatDate, { color: colors.textSecondary }]}>
                        {formatDate(selectedBefore.date)}
                      </Text>
                      {selectedBefore.weight && (
                        <Text style={[styles.sliderStatWeight, { color: colors.textPrimary }]}>
                          {selectedBefore.weight.toFixed(1)} kg
                        </Text>
                      )}
                    </View>

                    {weightDifference !== null && (
                      <View style={styles.sliderStatDiff}>
                        <Text style={[
                          styles.sliderStatDiffValue,
                          { color: weightDifference <= 0 ? colors.success : colors.danger }
                        ]}>
                          {weightDifference <= 0 ? '' : '+'}{weightDifference.toFixed(1)} kg
                        </Text>
                        {weightDifference < 0 && <Text style={styles.sliderStatEmoji}></Text>}
                      </View>
                    )}

                    <View style={[styles.sliderStatItem, styles.sliderStatItemRight]}>
                      <Text style={[styles.sliderStatDate, { color: colors.textSecondary }]}>
                        {formatDate(selectedAfter.date)}
                      </Text>
                      {selectedAfter.weight && (
                        <Text style={[styles.sliderStatWeight, { color: colors.textPrimary }]}>
                          {selectedAfter.weight.toFixed(1)} kg
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Branding */}
                  <View style={[styles.exportBranding, { backgroundColor: colors.background }]}>
                    <Text style={[styles.brandingText, { color: colors.gold }]}>YOROI</Text>
                    <Text style={[styles.brandingSubtext, { color: colors.textMuted }]}>鎧</Text>
                  </View>
                </ViewShot>
              )}

              {/* SIDE BY SIDE MODE */}
              {viewMode === 'sideBySide' && (
                <View style={styles.sideBySideContainer}>
                  <View style={styles.sideBySideRow}>
                    {/* AVANT */}
                    <View style={[styles.sideBySideCard, { backgroundColor: colors.card }]}>
                      <View style={[styles.sideBySideLabelContainer, { backgroundColor: colors.danger }]}>
                        <Text style={[styles.sideBySideLabelText, { color: '#FFFFFF' }]}>AVANT</Text>
                      </View>
                      <Image
                        source={getImageSource(selectedBefore)}
                        style={styles.sideBySideImage}
                        resizeMode="cover"
                      />
                      <View style={styles.sideBySideInfo}>
                        <Text style={[styles.sideBySideDate, { color: colors.textSecondary }]}>
                          {formatDate(selectedBefore.date)}
                        </Text>
                        {selectedBefore.weight && (
                          <Text style={[styles.sideBySideWeight, { color: colors.textPrimary }]}>
                            {selectedBefore.weight.toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Flèche */}
                    <View style={styles.arrowContainer}>
                      <ArrowRight size={24} color={colors.gold} strokeWidth={2.5} />
                    </View>

                    {/* APRÈS */}
                    <View style={[styles.sideBySideCard, { backgroundColor: colors.card }]}>
                      <View style={[styles.sideBySideLabelContainer, { backgroundColor: colors.success }]}>
                        <Text style={[styles.sideBySideLabelText, { color: '#FFFFFF' }]}>APRÈS</Text>
                      </View>
                      <Image
                        source={getImageSource(selectedAfter)}
                        style={styles.sideBySideImage}
                        resizeMode="cover"
                      />
                      <View style={styles.sideBySideInfo}>
                        <Text style={[styles.sideBySideDate, { color: colors.textSecondary }]}>
                          {formatDate(selectedAfter.date)}
                        </Text>
                        {selectedAfter.weight && (
                          <Text style={[styles.sideBySideWeight, { color: colors.textPrimary }]}>
                            {selectedAfter.weight.toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Stats Card */}
              <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
                <View style={styles.statsHeader}>
                  <View style={[styles.statsIconContainer, { backgroundColor: colors.gold + '15' }]}>
                    <Trophy size={24} color={colors.gold} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>Progression</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItemEnhanced}>
                    <View style={[styles.statIconSmall, { backgroundColor: weightDifference !== null && weightDifference <= 0 ? '#10B98115' : '#EF444415' }]}>
                      <TrendingDown
                        size={18}
                        color={weightDifference !== null && weightDifference <= 0 ? '#10B981' : '#EF4444'}
                        strokeWidth={2.5}
                        style={weightDifference !== null && weightDifference > 0 ? { transform: [{ rotate: '180deg' }] } : {}}
                      />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids</Text>
                    {weightDifference !== null ? (
                      <Text style={[
                        styles.statValue,
                        { color: weightDifference <= 0 ? '#10B981' : '#EF4444' }
                      ]}>
                        {weightDifference > 0 ? '+' : ''}{weightDifference.toFixed(1)} kg
                      </Text>
                    ) : (
                      <Text style={[styles.statValue, { color: colors.textMuted }]}>—</Text>
                    )}
                  </View>

                  <View style={styles.statItemEnhanced}>
                    <View style={[styles.statIconSmall, { backgroundColor: colors.accent + '15' }]}>
                      <Calendar size={18} color={colors.accentText} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Durée</Text>
                    {daysDifference !== null ? (
                      <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {daysDifference === 0 ? 'Aujourd\'hui' : `${daysDifference} j`}
                      </Text>
                    ) : (
                      <Text style={[styles.statValue, { color: colors.textMuted }]}>—</Text>
                    )}
                  </View>
                </View>

                {weightDifference !== null && weightDifference < 0 && (
                  <View style={[styles.motivationCard, { backgroundColor: '#10B98115' }]}>
                    <Text style={[styles.motivationEmoji]}></Text>
                    <Text style={[styles.motivationText, { color: '#10B981' }]}>
                      Bravo Champion ! {Math.abs(weightDifference).toFixed(1)} kg en moins !
                    </Text>
                    {daysDifference && daysDifference > 0 && (
                      <Text style={[styles.motivationSubtext, { color: '#059669' }]}>
                        {(Math.abs(weightDifference) / daysDifference * 7).toFixed(2)} kg/semaine
                      </Text>
                    )}
                  </View>
                )}

                {weightDifference !== null && weightDifference > 0 && (
                  <View style={[styles.motivationCard, { backgroundColor: colors.accent + '15' }]}>
                    <Text style={[styles.motivationEmoji]}></Text>
                    <Text style={[styles.motivationText, { color: colors.accent }]}>
                      En prise de masse ! +{weightDifference.toFixed(1)} kg de muscle !
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* Grille de sélection */
            <View style={styles.selectionContainer}>
              {/* Instruction Card */}
              <View style={[styles.instructionCard, { backgroundColor: colors.card }]}>
                <View style={[styles.instructionIconContainer, { backgroundColor: colors.accent + '15' }]}>
                  <Zap size={24} color={colors.accentText} strokeWidth={2.5} />
                </View>
                <Text style={[styles.instructionTitle, { color: colors.textPrimary }]}>
                  {step === 'before' ? 'Choisis ta photo de départ' : 'Choisis ta photo actuelle'}
                </Text>
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                  {step === 'before'
                    ? 'Sélectionne la photo qui montre ton point de départ'
                    : 'Sélectionne ta photo la plus récente pour voir ta progression'}
                </Text>
              </View>

              <View style={styles.selectionGrid}>
                {photos
                  .filter((photo) => {
                    if (step === 'after' && selectedBefore) {
                      return photo.id !== selectedBefore.id;
                    }
                    return true;
                  })
                  .map((photo) => (
                    <TouchableOpacity
                      key={photo.id}
                      style={[styles.selectionCard, { backgroundColor: colors.card }]}
                      onPress={() => {
                        if (step === 'before') {
                          handleBeforeSelect(photo);
                        } else {
                          handleAfterSelect(photo);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={getImageSource(photo)}
                        style={styles.selectionImage}
                        resizeMode="cover"
                      />
                      {photo.weight && (
                        <View style={styles.selectionWeightBadge}>
                          <TrendingDown size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                      <View style={[styles.selectionInfo, { backgroundColor: colors.card }]}>
                        <Text style={[styles.selectionDate, { color: colors.textSecondary }]}>
                          {formatDate(photo.date)}
                        </Text>
                        {photo.weight && (
                          <Text style={[styles.selectionWeight, { color: colors.gold }]}>
                            {photo.weight.toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
        <PopupComponent />
      </View>
    </Modal>
  );
}

const selectionPhotoSize = (screenWidth - 64) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderButton: {
    width: 44,
    height: 44,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepBadgeContainer: {
    marginBottom: 4,
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  comparisonContainer: {
    gap: 20,
  },
  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // Slider Mode
  sliderCaptureZone: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  exportHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  exportSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sliderContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  afterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  afterImage: {
    width: SLIDER_WIDTH,
  },
  sliderLabel: {
    position: 'absolute',
    top: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sliderLabelLeft: {
    left: 16,
  },
  sliderLabelRight: {
    right: 16,
  },
  sliderLabelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sliderHandle: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sliderLine: {
    position: 'absolute',
    width: 4,
    height: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  handleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  instructionsGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  sliderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sliderStatItem: {
    flex: 1,
  },
  sliderStatItemRight: {
    alignItems: 'flex-end',
  },
  sliderStatDate: {
    fontSize: 13,
    marginBottom: 4,
  },
  sliderStatWeight: {
    fontSize: 20,
    fontWeight: '700',
  },
  sliderStatDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sliderStatDiffValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  sliderStatEmoji: {
    fontSize: 20,
  },
  exportBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  brandingText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
  },
  brandingSubtext: {
    fontSize: 14,
  },
  // Side by Side Mode
  sideBySideContainer: {
    gap: 16,
  },
  sideBySideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sideBySideCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sideBySideLabelContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  sideBySideLabelText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sideBySideImage: {
    width: '100%',
    height: 220,
  },
  sideBySideInfo: {
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  sideBySideDate: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sideBySideWeight: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  arrowContainer: {
    paddingHorizontal: 4,
  },
  // Stats
  statsCard: {
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statItemEnhanced: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  motivationCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  motivationEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  motivationSubtext: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  // Selection Grid
  selectionContainer: {
    gap: 20,
  },
  instructionCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  instructionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectionCard: {
    width: selectionPhotoSize,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  selectionImage: {
    width: '100%',
    height: 180,
  },
  selectionWeightBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#10B981',
    borderRadius: 10,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionInfo: {
    padding: 14,
    gap: 6,
  },
  selectionDate: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectionWeight: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
