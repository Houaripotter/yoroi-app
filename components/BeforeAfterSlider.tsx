import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Share2 } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import { saveToLibraryAsync, requestPermissionsAsync } from 'expo-media-library';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { successHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';

// Gesture Handler & Reanimated pour slider fluide
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

// ============================================
// BEFORE/AFTER SLIDER - ULTRA FLUIDE
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoData {
  uri: string;
  date: string;
  weight?: number;
}

interface BeforeAfterSliderProps {
  before: PhotoData;
  after: PhotoData;
  height?: number;
  showStats?: boolean;
  showShareButton?: boolean;
  style?: any;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  before,
  after,
  height = 400,
  showStats = true,
  showShareButton = true,
  style,
}) => {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const viewShotRef = useRef<ViewShot>(null);

  // Largeur du slider (avec padding)
  const sliderWidth = SCREEN_WIDTH - 40;

  // Position du slider en valeur animée (0 à sliderWidth)
  const sliderX = useSharedValue(sliderWidth / 2);
  const startX = useSharedValue(0);

  // Gesture Pan - ULTRA FLUIDE sans limite
  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      // Commencer depuis la position du touch
      startX.value = sliderX.value;
    })
    .onUpdate((event) => {
      // Calculer la nouvelle position (0 à sliderWidth, sans limite !)
      const newX = startX.value + event.translationX;
      // Permettre d'aller de 0 à 100% de la largeur
      sliderX.value = Math.max(0, Math.min(sliderWidth, newX));
    })
    .onEnd(() => {
      // Animation de rebond légère si on est aux extrêmes
      if (sliderX.value < 10) {
        sliderX.value = withSpring(10, { damping: 20, stiffness: 300 });
      } else if (sliderX.value > sliderWidth - 10) {
        sliderX.value = withSpring(sliderWidth - 10, { damping: 20, stiffness: 300 });
      }
    });

  // Gesture Tap - pour cliquer directement à une position
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      sliderX.value = withSpring(event.x, { damping: 15, stiffness: 200 });
    });

  // Combiner les deux gestes
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Style animé pour le clip de l'image APRÈS
  const clipStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }));

  // Style animé pour la ligne du slider
  const lineStyle = useAnimatedStyle(() => ({
    left: sliderX.value - 2,
  }));

  // Style animé pour le handle
  const handleStyle = useAnimatedStyle(() => ({
    left: sliderX.value - 20,
  }));

  // Formater la date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Calculer la différence de poids
  const weightDiff = before.weight && after.weight
    ? after.weight - before.weight
    : null;

  // Capturer et partager l'image
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
              if (await isAvailableAsync()) {
                await shareAsync(uri);
              } else {
                await Share.share({ url: uri });
              }
            },
          },
          {
            text: 'Sauvegarder',
            style: 'primary',
            onPress: async () => {
              const { status } = await requestPermissionsAsync();
              if (status === 'granted') {
                await saveToLibraryAsync(uri);
                showPopup('Sauvegardé !', 'Image enregistrée dans ta galerie', [{ text: 'OK', style: 'primary' }]);
              } else {
                showPopup('Permission refusée', 'Autorise l\'accès à la galerie', [{ text: 'OK', style: 'primary' }]);
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    } catch (error) {
      logger.error('Erreur capture:', error);
      showPopup('Erreur', 'Impossible de créer l\'image', [{ text: 'OK', style: 'primary' }]);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Zone capturable pour partage */}
      <ViewShot
        ref={viewShotRef}
        options={{
          format: 'png',
          quality: 1,
          width: 1080,
          height: 1920,
        }}
        style={styles.captureZone}
      >
        {/* Header pour export */}
        <View style={[styles.exportHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.exportTitle, { color: colors.gold }]}>MA TRANSFORMATION</Text>
          <Text style={[styles.exportSubtitle, { color: colors.textSecondary }]}>
            {formatDate(before.date)} → {formatDate(after.date)}
          </Text>
        </View>

        {/* Slider container - Gesture sur toute la zone */}
        <GestureDetector gesture={composedGesture}>
          <View style={[styles.sliderContainer, { height }]}>
            {/* Image AVANT (fond) */}
            <Image
              source={{ uri: before.uri }}
              style={[styles.image, { height }]}
              resizeMode="cover"
            />

            {/* Label AVANT */}
            <View style={[styles.labelContainer, styles.labelLeft]}>
              <Text style={styles.labelText}>AVANT</Text>
            </View>

            {/* Image APRÈS (clippée avec animation) */}
            <Animated.View
              style={[
                styles.afterContainer,
                { height },
                clipStyle,
              ]}
            >
              <Image
                source={{ uri: after.uri }}
                style={[styles.image, styles.afterImage, { height, width: sliderWidth }]}
                resizeMode="cover"
              />
              {/* Label APRÈS */}
              <View style={[styles.labelContainer, styles.labelRight]}>
                <Text style={styles.labelText}>APRÈS</Text>
              </View>
            </Animated.View>

            {/* Ligne verticale du slider */}
            <Animated.View style={[styles.sliderLine, lineStyle]} />

            {/* Handle du slider (bouton rond) */}
            <Animated.View style={[styles.sliderHandle, handleStyle]}>
              <View style={styles.sliderHandleInner}>
                <View style={styles.sliderArrows}>
                  <Text style={styles.sliderArrowText}>◀</Text>
                  <Text style={styles.sliderArrowText}>▶</Text>
                </View>
              </View>
            </Animated.View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.instructionsGradient}
              >
                <Text style={styles.instructionsText}>← Glisse pour comparer →</Text>
              </LinearGradient>
            </View>
          </View>
        </GestureDetector>

        {/* Stats */}
        {showStats && (
          <View style={[styles.statsContainer, { backgroundColor: colors.background }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statDate, { color: colors.textSecondary }]}>
                {formatDate(before.date)}
              </Text>
              {before.weight ? (
                <Text style={[styles.statWeight, { color: colors.textPrimary }]}>
                  {before.weight.toFixed(1)} kg
                </Text>
              ) : (
                <Text style={[styles.statWeightMissing, { color: colors.textMuted }]}>
                  Poids non renseigné
                </Text>
              )}
            </View>

            {weightDiff !== null && (
              <View style={styles.statDiff}>
                <Text style={[
                  styles.statDiffValue,
                  { color: weightDiff <= 0 ? colors.success : colors.danger }
                ]}>
                  {weightDiff <= 0 ? '' : '+'}{weightDiff.toFixed(1)} kg
                </Text>
                {weightDiff < 0 && <Text style={styles.statDiffEmoji}>🎉</Text>}
              </View>
            )}

            <View style={[styles.statItem, styles.statItemRight]}>
              <Text style={[styles.statDate, { color: colors.textSecondary }]}>
                {formatDate(after.date)}
              </Text>
              {after.weight ? (
                <Text style={[styles.statWeight, { color: colors.textPrimary }]}>
                  {after.weight.toFixed(1)} kg
                </Text>
              ) : (
                <Text style={[styles.statWeightMissing, { color: colors.textMuted }]}>
                  Poids non renseigné
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Branding pour export */}
        <View style={[styles.exportBranding, { backgroundColor: colors.background }]}>
          <Text style={[styles.brandingText, { color: colors.gold }]}>YOROI</Text>
          <Text style={[styles.brandingSubtext, { color: colors.textMuted }]}>鎧</Text>
        </View>
      </ViewShot>

      {/* Bouton Partager */}
      {showShareButton && (
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: colors.gold }]}
          onPress={captureAndShare}
          activeOpacity={0.8}
        >
          <Share2 size={20} color={colors.background} />
          <Text style={[styles.shareButtonText, { color: colors.background }]}>
            Partager ma transformation
          </Text>
        </TouchableOpacity>
      )}
      <PopupComponent />
    </View>
  );
};

// Version compacte pour preview
export const BeforeAfterPreview: React.FC<{
  before: PhotoData;
  after: PhotoData;
  onPress?: () => void;
}> = ({ before, after, onPress }) => {
  const { colors } = useTheme();
  const { locale } = useI18n();

  const weightDiff = before.weight && after.weight
    ? after.weight - before.weight
    : null;

  return (
    <TouchableOpacity
      style={[styles.previewContainer, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.previewImages}>
        <View style={styles.previewImageContainer}>
          <Image
            source={{ uri: before.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={[styles.previewLabel, { backgroundColor: colors.danger }]}>
            <Text style={styles.previewLabelText}>AVANT</Text>
          </View>
        </View>

        <View style={styles.previewArrow}>
          <ChevronRight size={24} color={colors.gold} />
        </View>

        <View style={styles.previewImageContainer}>
          <Image
            source={{ uri: after.uri }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={[styles.previewLabel, { backgroundColor: colors.success }]}>
            <Text style={styles.previewLabelText}>APRÈS</Text>
          </View>
        </View>
      </View>

      {weightDiff !== null && (
        <View style={[styles.previewStats, { borderTopColor: colors.border }]}>
          <Text style={[
            styles.previewStatsText,
            { color: weightDiff <= 0 ? colors.success : colors.danger }
          ]}>
            {weightDiff <= 0 ? '' : '+'}{weightDiff.toFixed(1)} kg
            {weightDiff < 0 && ' 🎉'}
          </Text>
          <Text style={[styles.previewHint, { color: colors.textMuted }]}>
            Tape pour comparer →
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  captureZone: {
    backgroundColor: '#000000',
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
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  afterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  afterImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sliderLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderHandle: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderHandleInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  sliderArrows: {
    flexDirection: 'row',
    gap: 4,
  },
  sliderArrowText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '700',
  },
  labelContainer: {
    position: 'absolute',
    top: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  labelLeft: {
    left: 16,
  },
  labelRight: {
    right: 16,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  instructionsGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statDate: {
    fontSize: 13,
    marginBottom: 4,
  },
  statWeight: {
    fontSize: 20,
    fontWeight: '700',
  },
  statWeightMissing: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  statDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  statDiffValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statDiffEmoji: {
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 16,
    gap: 10,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Preview styles
  previewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImages: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  previewImageContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  previewLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  previewArrow: {
    paddingHorizontal: 8,
  },
  previewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  previewStatsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewHint: {
    fontSize: 12,
  },
});

export default BeforeAfterSlider;
