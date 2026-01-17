// ============================================
// VICTORY SHARE MODAL - PRO Version
// Photo-First UX + Asset-Based Footer + Re-Share Support
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import {
  X,
  Camera,
  Share2,
  Download,
  Trophy,
  Flame,
  Clock,
  Target,
  Award,
  Image as ImageIcon,
  Gauge,
  Dumbbell,
  Timer,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import * as Haptics from 'expo-haptics';
import { calculatePace, formatDuration, formatDistance } from '@/lib/carnetService';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.4; // Taller for new footer

export interface VictorySessionData {
  exerciseName: string;
  category: string;
  performance: string; // e.g., "100 kg × 5"
  duration?: number; // minutes
  calories?: number;
  rpe?: number;
  date: string;
  isPR?: boolean;
  // Running specific
  distanceKm?: number;
  timeSeconds?: number; // For pace calculation
  // Force specific
  reps?: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
}

interface VictoryShareModalProps {
  visible: boolean;
  onClose: () => void;
  sessionData: VictorySessionData;
  clubName?: string;
}

export default function VictoryShareModal({
  visible,
  onClose,
  sessionData,
  clubName = '',
}: VictoryShareModalProps) {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const viewShotRef = useRef<ViewShot>(null);

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // TASK 1: Default to 'dark' - Skip the "Immortalise" screen
  const [selectedTemplate, setSelectedTemplate] = useState<'dark' | 'light' | 'photo'>('dark');

  // Detect activity type
  const isRunningActivity = ['running', 'trail', 'hyrox'].includes(sessionData.category.toLowerCase());
  const isForceActivity = sessionData.category.toLowerCase() === 'force';
  const isCombatActivity = ['jjb', 'jjb_garde', 'jjb_passage', 'jjb_soumission', 'combat', 'striking', 'lutte', 'boxe'].includes(sessionData.category.toLowerCase());

  // TASK 4: Calculate pace correctly for running (using timeSeconds, not duration)
  const pace = isRunningActivity && sessionData.timeSeconds && sessionData.distanceKm && sessionData.distanceKm > 0
    ? calculatePace(sessionData.timeSeconds, sessionData.distanceKm)
    : null;

  // Pick photo from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusée', 'Autorise l\'accès à tes photos pour ajouter une image.', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUserPhoto(result.assets[0].uri);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
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
      setUserPhoto(result.assets[0].uri);
    }
  };

  // Share the card
  const shareCard = async () => {
    if (!viewShotRef.current) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = await viewShotRef.current.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma performance',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showPopup('Erreur', 'Impossible de partager la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save to camera roll
  const saveToGallery = async () => {
    if (!viewShotRef.current) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = await viewShotRef.current.capture?.();
      if (uri) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Enregistrer la carte',
          });
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get category color
  const getCategoryColor = () => {
    switch (sessionData.category.toLowerCase()) {
      case 'force':
        return '#EF4444';
      case 'running':
        return '#3B82F6';
      case 'trail':
        return '#10B981';
      case 'hyrox':
        return '#F59E0B';
      case 'jjb':
      case 'jjb_garde':
      case 'jjb_passage':
      case 'jjb_soumission':
      case 'combat':
        return '#8B5CF6';
      case 'striking':
      case 'lutte':
      case 'boxe':
        return '#EC4899';
      default:
        return colors.accent;
    }
  };

  // Get text colors based on template
  const getTextColor = () => {
    switch (selectedTemplate) {
      case 'light':
        return '#1A1A2E';
      case 'dark':
      case 'photo':
      default:
        return '#FFFFFF';
    }
  };

  const getTextShadow = () => {
    if (selectedTemplate === 'light') {
      return {};
    }
    return {
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    };
  };

  const getSecondaryTextColor = () => {
    return selectedTemplate === 'light' ? '#4A4A6A' : 'rgba(255,255,255,0.85)';
  };

  // Get template background
  const getTemplateBackground = () => {
    switch (selectedTemplate) {
      case 'light':
        return '#F8F9FA';
      case 'dark':
        return '#0D0D0D';
      case 'photo':
      default:
        return '#0D0D0D';
    }
  };

  // TASK 4: Render Running-specific layout with CORRECT data
  const renderRunningStats = () => {
    const textColor = getTextColor();
    const textShadow = getTextShadow();
    const secondaryColor = getSecondaryTextColor();

    // TASK 4: Distance = distanceKm (NOT time!)
    const distanceDisplay = sessionData.distanceKm && sessionData.distanceKm > 0
      ? formatDistance(sessionData.distanceKm)
      : null;

    // TASK 4: Time = duration in minutes OR timeSeconds converted
    const timeDisplay = sessionData.duration && sessionData.duration > 0
      ? formatDuration(sessionData.duration)
      : sessionData.timeSeconds && sessionData.timeSeconds > 0
        ? formatDuration(Math.round(sessionData.timeSeconds / 60))
        : null;

    return (
      <View style={styles.runningStatsContainer}>
        {/* DISTANCE - Primary */}
        {distanceDisplay && (
          <View style={styles.runningStatBlock}>
            <Text style={[styles.runningStatLabel, { color: secondaryColor }, textShadow]}>
              DISTANCE
            </Text>
            <Text style={[styles.runningDistanceValue, { color: textColor }, textShadow]}>
              {distanceDisplay}
            </Text>
          </View>
        )}

        {/* PACE */}
        {pace && (
          <View style={styles.runningStatBlock}>
            <Text style={[styles.runningStatLabel, { color: secondaryColor }, textShadow]}>
              ALLURE
            </Text>
            <View style={styles.paceRow}>
              <Gauge size={20} color={getCategoryColor()} />
              <Text style={[styles.runningPaceValue, { color: textColor }, textShadow]}>
                {pace} /km
              </Text>
            </View>
          </View>
        )}

        {/* TIME */}
        {timeDisplay && (
          <View style={styles.runningStatBlock}>
            <Text style={[styles.runningStatLabel, { color: secondaryColor }, textShadow]}>
              TEMPS
            </Text>
            <View style={styles.paceRow}>
              <Clock size={18} color={getCategoryColor()} />
              <Text style={[styles.runningTimeValue, { color: textColor }, textShadow]}>
                {timeDisplay}
              </Text>
            </View>
          </View>
        )}

        {/* Calories */}
        {sessionData.calories && sessionData.calories > 0 && (
          <View style={styles.runningStatRow}>
            <Flame size={16} color="#EF4444" />
            <Text style={[styles.runningCaloriesText, { color: textColor }, textShadow]}>
              {sessionData.calories} kcal
            </Text>
          </View>
        )}
      </View>
    );
  };

  // TASK 4: Render Force-specific layout
  const renderForceStats = () => {
    const textColor = getTextColor();
    const textShadow = getTextShadow();
    const secondaryColor = getSecondaryTextColor();

    return (
      <>
        {/* Exercise Name */}
        <Text style={[styles.exerciseName, { color: textColor }, textShadow]}>
          {sessionData.exerciseName}
        </Text>

        {/* Performance: Weight × Reps */}
        <View style={styles.forcePerformanceRow}>
          <Dumbbell size={24} color={getCategoryColor()} />
          <Text style={[styles.performanceValue, { color: getCategoryColor() }, textShadow]}>
            {sessionData.performance}
          </Text>
        </View>

        {/* Duration + Calories */}
        <View style={styles.statsRow}>
          {sessionData.duration && sessionData.duration > 0 && (
            <View style={styles.statItem}>
              <Clock size={14} color={textColor} />
              <Text style={[styles.statValue, { color: textColor }, textShadow]}>
                {formatDuration(sessionData.duration)}
              </Text>
            </View>
          )}
          {sessionData.calories && sessionData.calories > 0 && (
            <View style={styles.statItem}>
              <Flame size={14} color="#EF4444" />
              <Text style={[styles.statValue, { color: textColor }, textShadow]}>
                {sessionData.calories} kcal
              </Text>
            </View>
          )}
        </View>
      </>
    );
  };

  // TASK 4: Render Combat/Other layout
  const renderCombatStats = () => {
    const textColor = getTextColor();
    const textShadow = getTextShadow();
    const secondaryColor = getSecondaryTextColor();

    return (
      <>
        {/* Exercise/Session Name */}
        <Text style={[styles.exerciseName, { color: textColor }, textShadow]}>
          {sessionData.exerciseName}
        </Text>

        {/* Performance or Duration as main stat */}
        {sessionData.performance && sessionData.performance !== '--' ? (
          <Text style={[styles.performanceValue, { color: getCategoryColor() }, textShadow]}>
            {sessionData.performance}
          </Text>
        ) : sessionData.duration && sessionData.duration > 0 ? (
          <View style={styles.combatDurationRow}>
            <Timer size={28} color={getCategoryColor()} />
            <Text style={[styles.combatDurationText, { color: getCategoryColor() }, textShadow]}>
              {formatDuration(sessionData.duration)}
            </Text>
          </View>
        ) : null}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {sessionData.duration && sessionData.duration > 0 && sessionData.performance && sessionData.performance !== '--' && (
            <View style={styles.statItem}>
              <Clock size={14} color={textColor} />
              <Text style={[styles.statValue, { color: textColor }, textShadow]}>
                {formatDuration(sessionData.duration)}
              </Text>
            </View>
          )}
          {sessionData.calories && sessionData.calories > 0 && (
            <View style={styles.statItem}>
              <Flame size={14} color="#EF4444" />
              <Text style={[styles.statValue, { color: textColor }, textShadow]}>
                {sessionData.calories} kcal
              </Text>
            </View>
          )}
          {sessionData.rpe && (
            <View style={styles.statItem}>
              <Target size={14} color="#F59E0B" />
              <Text style={[styles.statValue, { color: textColor }, textShadow]}>
                RPE {sessionData.rpe}
              </Text>
            </View>
          )}
        </View>
      </>
    );
  };

  // Choose correct renderer based on category
  const renderStats = () => {
    if (isRunningActivity) return renderRunningStats();
    if (isForceActivity) return renderForceStats();
    return renderCombatStats();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Trophy size={20} color="#F59E0B" />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Victoire !
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* TASK 1: Share Card Preview - Always visible (removed "Immortalise" screen) */}
        <>
            <View style={styles.cardContainer}>
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', quality: 1 }}
                style={styles.viewShot}
              >
                <View style={[styles.shareCard, { backgroundColor: getTemplateBackground() }]}>
                  {/* Background Photo (only for photo mode with user photo) */}
                  {selectedTemplate === 'photo' && userPhoto ? (
                    <>
                      <Image source={{ uri: userPhoto }} style={styles.cardBackground} />
                      <View style={styles.cardOverlay} />
                    </>
                  ) : null}

                  {/* Watermark Logo for Dark/Light modes (no user photo) */}
                  {(selectedTemplate === 'dark' || selectedTemplate === 'light' || (selectedTemplate === 'photo' && !userPhoto)) && (
                    <Image
                      source={require('@/assets/images/logo2010.png')}
                      style={styles.watermarkLogo}
                      resizeMode="contain"
                    />
                  )}

                  {/* TOP BANNER - Yoroi Branding */}
                  <View style={styles.topBanner}>
                    <View style={[
                      styles.topBannerLine,
                      selectedTemplate === 'light' && { backgroundColor: 'rgba(0,0,0,0.1)' }
                    ]} />
                    <View style={styles.topBannerContent}>
                      <Image
                        source={require('@/assets/images/logo2010.png')}
                        style={styles.topBannerLogo}
                        resizeMode="contain"
                      />
                      <Text style={[
                        styles.topBannerText,
                        selectedTemplate === 'light' && { color: '#1a1a1a' }
                      ]}>YOROI</Text>
                    </View>
                    <View style={[
                      styles.topBannerLine,
                      selectedTemplate === 'light' && { backgroundColor: 'rgba(0,0,0,0.1)' }
                    ]} />
                  </View>

                  {/* Club Name (Below banner) */}
                  {clubName && (
                    <View style={styles.clubBanner}>
                      <Text style={[
                        styles.clubName,
                        { color: getTextColor() },
                        getTextShadow()
                      ]}>
                        {clubName.toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Stats Overlay (Center-Bottom) */}
                  <View style={[
                    styles.statsOverlay,
                    selectedTemplate !== 'photo' && { backgroundColor: 'transparent' }
                  ]}>
                    {/* PR Badge */}
                    {sessionData.isPR && (
                      <View style={styles.prBanner}>
                        <Award size={16} color="#F59E0B" />
                        <Text style={styles.prText}>NOUVEAU RECORD</Text>
                      </View>
                    )}

                    {/* TASK 4: Conditional layout based on activity type */}
                    {renderStats()}

                    {/* Date */}
                    <Text style={[
                      styles.dateText,
                      { color: getSecondaryTextColor() },
                      getTextShadow()
                    ]}>
                      {new Date(sessionData.date).toLocaleDateString(locale, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </Text>
                  </View>

                  {/* Footer - Simplified and fits in card */}
                  <View style={styles.footerContainer}>
                    {/* Gradient - adapts to template (NO black for light mode!) */}
                    {selectedTemplate !== 'light' && (
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
                        style={styles.footerGradient}
                      />
                    )}
                    <View style={styles.proFooter}>
                      {/* Separator Line */}
                      <View style={[
                        styles.footerSeparator,
                        selectedTemplate === 'light' && { backgroundColor: 'rgba(0,0,0,0.15)' }
                      ]} />

                      {/* Brand Block */}
                      <View style={styles.footerBrandBlock}>
                        <Text style={[
                          styles.footerBrandName,
                          selectedTemplate === 'light' && { color: '#1a1a1a' }
                        ]}>YOROI</Text>
                        <Text style={[
                          styles.footerTagline,
                          selectedTemplate === 'light' && { color: '#1a1a1a' }
                        ]}>L'APP DES WARRIORS</Text>

                        {/* Instagram & App Store */}
                        <View style={styles.footerSocialRow}>
                          <View style={styles.footerSocialItem}>
                            <Image
                              source={require('@/assets/images/instagram.png')}
                              style={styles.footerSocialIcon}
                              resizeMode="contain"
                            />
                            <Text style={[
                              styles.footerSocialText,
                              selectedTemplate === 'light' && { color: 'rgba(0,0,0,0.6)' }
                            ]}>@yoroiapp</Text>
                          </View>
                          <Image
                            source={require('@/assets/images/appstore.png')}
                            style={styles.footerAppStoreIcon}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </ViewShot>
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

            {/* Photo Actions - Show picker when NO photo, show change buttons when photo exists */}
            {selectedTemplate === 'photo' && !userPhoto && (
              <View style={styles.photoPickerContainer}>
                <Text style={[styles.photoPickerTitle, { color: colors.textPrimary }]}>
                  Ajoute ta photo
                </Text>
                <View style={styles.photoPickerButtons}>
                  <TouchableOpacity
                    style={[styles.photoPickerBtn, { backgroundColor: getCategoryColor() }]}
                    onPress={takePhoto}
                  >
                    <Camera size={22} color="#FFFFFF" />
                    <Text style={styles.photoPickerBtnText}>Prendre une photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoPickerBtn, styles.photoPickerBtnSecondary, { borderColor: getCategoryColor() }]}
                    onPress={pickImage}
                  >
                    <ImageIcon size={22} color={getCategoryColor()} />
                    <Text style={[styles.photoPickerBtnText, { color: getCategoryColor() }]}>Galerie</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {selectedTemplate === 'photo' && userPhoto && (
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
                style={[styles.shareBtn, { backgroundColor: getCategoryColor() }]}
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
            <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
              <Text style={[styles.skipText, { color: colors.textMuted }]}>Fermer</Text>
            </TouchableOpacity>
        </>
        <PopupComponent />
      </View>
    </Modal>
  );
}

// ============================================
// HELPER: Create victory data from anywhere
// ============================================
export const createVictoryData = (
  exerciseName: string,
  category: string,
  performance: string,
  options?: {
    duration?: number;
    calories?: number;
    rpe?: number;
    distanceKm?: number;
    timeSeconds?: number;
    isPR?: boolean;
    reps?: number;
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
  }
): VictorySessionData => {
  return {
    exerciseName,
    category,
    performance,
    date: new Date().toISOString(),
    ...options,
  };
};

// ============================================
// TASK 2: Helper to create victory data from history entry
// ============================================
export const createVictoryFromEntry = (
  benchmarkName: string,
  category: string,
  entry: {
    value: number;
    reps?: number;
    duration?: number;
    calories?: number;
    date: string;
  },
  unit: string,
  isPR: boolean = false
): VictorySessionData => {
  const isRunning = ['running', 'trail', 'hyrox'].includes(category.toLowerCase());
  const isForce = category.toLowerCase() === 'force';

  let performance = '';
  if (isForce && (unit === 'kg' || unit === 'lbs')) {
    performance = entry.reps ? `${entry.value} ${unit} × ${entry.reps}` : `${entry.value} ${unit}`;
  } else if (isRunning && unit === 'km') {
    performance = `${entry.value} km`;
  } else {
    performance = `${entry.value} ${unit}`;
  }

  return {
    exerciseName: benchmarkName,
    category,
    performance,
    date: entry.date,
    duration: entry.duration,
    calories: entry.calories,
    isPR,
    distanceKm: isRunning ? entry.value : undefined,
    timeSeconds: isRunning && entry.duration ? entry.duration * 60 : undefined,
    reps: entry.reps,
    weight: isForce ? entry.value : undefined,
    weightUnit: isForce ? (unit as 'kg' | 'lbs') : undefined,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
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

  // ============================================
  // TASK 3: Photo-First UX Styles
  // ============================================
  photoFirstContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  photoFirstTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  photoFirstSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  photoFirstButtons: {
    width: '100%',
    gap: 16,
  },
  photoFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    gap: 12,
  },
  photoFirstBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  photoFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  skipPhotoBtn: {
    marginTop: 32,
    paddingVertical: 12,
  },
  skipPhotoText: {
    fontSize: 14,
  },

  // ============================================
  // Card Styles
  // ============================================
  cardContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  viewShot: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  shareCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackground: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  watermarkLogo: {
    position: 'absolute',
    width: 340,
    height: 340,
    top: '12%',
    left: '50%',
    marginLeft: -170,
    opacity: 0.3,
  },
  // TOP BANNER - Strava style
  topBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBannerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  topBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBannerLogo: {
    width: 22,
    height: 22,
  },
  topBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },
  clubBanner: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  clubName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 100, // Space for PRO footer with separator
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  prText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  forcePerformanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  combatDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  combatDurationText: {
    fontSize: 36,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },

  // ============================================
  // Running-Specific Styles
  // ============================================
  runningStatsContainer: {
    alignItems: 'flex-start',
    gap: 8,
  },
  runningStatBlock: {
    marginBottom: 4,
  },
  runningStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  runningDistanceValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  runningPaceValue: {
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 6,
  },
  runningTimeValue: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 6,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  runningStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  runningCaloriesText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ============================================
  // TASK 1: PRO Footer Styles with Assets
  // ============================================
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 95,
  },
  footerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  proFooter: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerSeparator: {
    width: '100%',
    height: 2,
    backgroundColor: '#D4AF37',
    marginBottom: 8,
    borderRadius: 1,
  },
  footerBrandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrandName: {
    color: '#D4AF37', // Gold
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  footerTagline: {
    color: '#D4AF37', // Gold
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 1,
    textAlign: 'center',
  },
  footerSocialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  footerSocialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerSocialIcon: {
    width: 16,
    height: 16,
  },
  footerAppStoreIcon: {
    width: 80,
    height: 24,
  },
  footerSocialText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },

  // ============================================
  // Template & Action Styles
  // ============================================
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
