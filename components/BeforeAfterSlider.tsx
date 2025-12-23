import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/lib/ThemeContext';
import { successHaptic } from '@/lib/haptics';

// ============================================
// BEFORE/AFTER SLIDER - COMPARAISON PHOTOS
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
  const viewShotRef = useRef<ViewShot>(null);
  const sliderWidth = SCREEN_WIDTH - 40; // Padding de chaque côté

  // Position du slider (0 = tout avant, 1 = tout après)
  const sliderPosition = useRef(new Animated.Value(0.5)).current;
  const [currentPosition, setCurrentPosition] = useState(0.5);

  // PanResponder pour le glissement
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Petit feedback haptique au début du glissement
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculer la nouvelle position basée sur le mouvement
        const newPosition = Math.max(0.05, Math.min(0.95,
          currentPosition + (gestureState.dx / sliderWidth)
        ));
        sliderPosition.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Mettre à jour la position actuelle
        const newPosition = Math.max(0.05, Math.min(0.95,
          currentPosition + (gestureState.dx / sliderWidth)
        ));
        setCurrentPosition(newPosition);
        sliderPosition.setValue(newPosition);
      },
    })
  ).current;

  // Formater la date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
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

      // Capturer l'image
      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        Alert.alert('Erreur', 'Impossible de capturer l\'image');
        return;
      }

      successHaptic();

      // Options de partage
      Alert.alert(
        'Partager',
        'Que veux-tu faire ?',
        [
          {
            text: 'Partager',
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
            onPress: async () => {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status === 'granted') {
                await MediaLibrary.saveToLibraryAsync(uri);
                Alert.alert('Sauvegardé !', 'Image enregistrée dans ta galerie');
              } else {
                Alert.alert('Permission refusée', 'Autorise l\'accès à la galerie');
              }
            },
          },
          { text: 'Annuler', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Erreur capture:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'image');
    }
  };

  // Interpolation pour la largeur de clip
  const clipWidth = sliderPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth],
  });

  // Position du handle du slider
  const handlePosition = sliderPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth],
  });

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

        {/* Slider container */}
        <View style={[styles.sliderContainer, { height }]}>
          {/* Image AVANT (en dessous) */}
          <Image
            source={{ uri: before.uri }}
            style={[styles.image, { height }]}
            resizeMode="cover"
          />

          {/* Label AVANT */}
          <View style={[styles.labelContainer, styles.labelLeft]}>
            <Text style={styles.labelText}>AVANT</Text>
          </View>

          {/* Image APRÈS (par-dessus, clippée) */}
          <Animated.View
            style={[
              styles.afterContainer,
              {
                width: clipWidth,
                height,
              },
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

          {/* Slider Handle */}
          <Animated.View
            style={[
              styles.sliderHandle,
              {
                transform: [{ translateX: Animated.subtract(handlePosition, 2) }],
                height,
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Ligne verticale */}
            <View style={styles.sliderLine} />

            {/* Handle central */}
            <View style={styles.handleButton}>
              <ChevronLeft size={16} color="#FFFFFF" style={{ marginRight: -4 }} />
              <ChevronRight size={16} color="#FFFFFF" style={{ marginLeft: -4 }} />
            </View>
          </Animated.View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.instructionsGradient}
            >
              <Text style={styles.instructionsText}>← Glisse pour comparer →</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Stats */}
        {showStats && (before.weight || after.weight) && (
          <View style={[styles.statsContainer, { backgroundColor: colors.background }]}>
            {/* Date & Poids AVANT */}
            <View style={styles.statItem}>
              <Text style={[styles.statDate, { color: colors.textSecondary }]}>
                {formatDate(before.date)}
              </Text>
              {before.weight && (
                <Text style={[styles.statWeight, { color: colors.textPrimary }]}>
                  {before.weight} kg
                </Text>
              )}
            </View>

            {/* Différence */}
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

            {/* Date & Poids APRÈS */}
            <View style={[styles.statItem, styles.statItemRight]}>
              <Text style={[styles.statDate, { color: colors.textSecondary }]}>
                {formatDate(after.date)}
              </Text>
              {after.weight && (
                <Text style={[styles.statWeight, { color: colors.textPrimary }]}>
                  {after.weight} kg
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
    </View>
  );
};

// Version compacte pour la card du dashboard
export const BeforeAfterPreview: React.FC<{
  before: PhotoData;
  after: PhotoData;
  onPress?: () => void;
}> = ({ before, after, onPress }) => {
  const { colors } = useTheme();

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
        {/* Avant */}
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

        {/* Arrow */}
        <View style={styles.previewArrow}>
          <ChevronRight size={24} color={colors.gold} />
        </View>

        {/* Après */}
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

      {/* Stats */}
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
  sliderHandle: {
    position: 'absolute',
    top: 0,
    width: 44,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
