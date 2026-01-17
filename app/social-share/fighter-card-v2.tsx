// ============================================
// YOROI - FIGHTER CARD V2 (AVEC PHOTO)
// ============================================
// Fiche combattant avec photo en fond comme Instagram Stories

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { FighterCardV2, FighterStats, CombatClub } from '@/components/social-cards/FighterCardV2';
import { getUserSettings, getLatestMeasurement } from '@/lib/storage';
import { getCurrentRank, RANKS } from '@/lib/ranks';
import { getTrainingStats, calculateStreak, getProfile, getTrainings, getClubs } from '@/lib/database';
import { getClubLogoSource, SPORTS } from '@/lib/sports';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function FighterCardV2Screen() {
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const cardRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();

  const [stats, setStats] = useState<FighterStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const [format, setFormat] = useState<'stories' | 'square'>('stories');
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);

  // ============================================
  // CHARGER LES STATS
  // ============================================

  useEffect(() => {
    loadFighterStats();
  }, []);

  const loadFighterStats = async () => {
    try {
      setIsLoading(true);

      const settings = await getUserSettings();
      const profile = await getProfile();
      const latestMeasurement = await getLatestMeasurement();
      const trainingStats = await getTrainingStats();
      const streakData = await calculateStreak();
      const rank = getCurrentRank(streakData || 0);

      // Calculer stats
      const totalTrainings =
        trainingStats?.reduce((acc: number, s: any) => acc + (s.count || 0), 0) || 0;

      // Club principal (club avec le plus de trainings)
      const allTrainings = await getTrainings();
      const clubCounts = new Map<string, { count: number; logo?: string }>();

      allTrainings.forEach(t => {
        const clubName = t.club_name || 'Sans club';
        const existing = clubCounts.get(clubName);
        clubCounts.set(clubName, {
          count: (existing?.count || 0) + 1,
          logo: t.club_logo || existing?.logo,
        });
      });

      const topClubEntry = Array.from(clubCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)[0];

      const topClubName = topClubEntry?.[0] || 'Guerrier';
      const topClubLogo = topClubEntry?.[1]?.logo
        ? getClubLogoSource(topClubEntry?.[1]?.logo)
        : null;

      // =========================================
      // CLUBS DE COMBAT (sports de combat uniquement)
      // =========================================
      const combatSportIds = SPORTS
        .filter(s => s.category === 'combat_striking' || s.category === 'combat_grappling')
        .map(s => s.id);

      const allClubs = await getClubs();
      const combatClubs: CombatClub[] = allClubs
        .filter(club => combatSportIds.includes(club.sport))
        .map(club => ({
          name: club.name,
          logo: club.logo_uri ? getClubLogoSource(club.logo_uri) : undefined,
          sport: club.sport,
        }));

      // Date d'inscription (simulée)
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 3);

      // Poids perdu
      const startWeight = profile?.start_weight || latestMeasurement?.weight || 75;
      const currentWeight = latestMeasurement?.weight || 75;
      const weightLost = Math.max(0, startWeight - currentWeight);

      setStats({
        name: profile?.name || settings.username || 'Guerrier Yoroi',
        nickname: undefined,
        weight: currentWeight,
        height: settings.height || profile?.height_cm || 175,
        rank: rank.name,
        xp: streakData || 0,
        streak: streakData || 0,
        totalTrainings,
        clubName: topClubName,
        clubLogo: topClubLogo,
        joinDate: joinDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
        weightLost: Math.round(weightLost * 10) / 10,
        badges: 0,
        // Nouveaux champs
        profilePhoto: profile?.profile_photo || undefined,
        combatClubs: combatClubs.length > 0 ? combatClubs : undefined,
      });
    } catch (error) {
      logger.error('Erreur chargement stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PHOTO PICKER
  // ============================================

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'accéder à ton appareil photo.', [{ text: 'OK', style: 'primary' }]);
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
      showPopup('Erreur', 'Impossible de prendre la photo', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Yoroi a besoin d\'accéder à ta galerie.', [{ text: 'OK', style: 'primary' }]);
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
      showPopup('Erreur', 'Impossible de choisir l\'image', [{ text: 'OK', style: 'primary' }]);
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
        showPopup('Erreur', 'Impossible de capturer la carte', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma Fiche Combattant Yoroi',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await MediaLibrary.requestPermissionsAsync();
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

      await MediaLibrary.saveToLibraryAsync(uri);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showPopup('Sauvegardé', 'Ta Fiche Combattant a été ajoutée à ta galerie.', [{ text: 'OK', style: 'primary' }]);
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [{ text: 'OK', style: 'primary' }]);
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
            Chargement de ta fiche...
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
            Erreur de chargement
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Impossible de charger tes stats
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={loadFighterStats}
          >
            <Text style={[styles.retryButtonText, { color: colors.textOnGold }]}>Réessayer</Text>
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
            Fiche Combattant
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Ta carte de champion
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Picker */}
        <View style={styles.photoSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Photo de fond (optionnel)
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Prends-toi en photo et affiche tes stats de champion !
          </Text>

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[
                styles.photoButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={takePhoto}
            >
              <Camera size={20} color={colors.accent} />
              <Text style={[styles.photoButtonText, { color: colors.textPrimary }]}>
                Prendre une photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.photoButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={pickImage}
            >
              <ImageIcon size={20} color={colors.accent} />
              <Text style={[styles.photoButtonText, { color: colors.textPrimary }]}>
                Choisir
              </Text>
            </TouchableOpacity>

            {backgroundImage && (
              <TouchableOpacity
                style={[styles.photoButton, styles.removeButton, { borderColor: '#EF4444' }]}
                onPress={removePhoto}
              >
                <X size={20} color="#EF4444" />
                <Text style={[styles.photoButtonText, { color: '#EF4444' }]}>Retirer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Format Selector */}
        <View style={styles.formatSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Format</Text>
          <View style={styles.formatButtons}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                { borderColor: colors.border },
                format === 'stories' && [
                  styles.formatButtonActive,
                  { backgroundColor: colors.accent },
                ],
              ]}
              onPress={() => {
                setFormat('stories');
                setBackgroundImage(undefined);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  { color: format === 'stories' ? colors.textOnGold : colors.textPrimary },
                ]}
              >
                Story
              </Text>
              <Text
                style={[
                  styles.formatRatio,
                  { color: format === 'stories' ? colors.textOnGold : colors.textMuted },
                ]}
              >
                9:16
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatButton,
                { borderColor: colors.border },
                format === 'square' && [
                  styles.formatButtonActive,
                  { backgroundColor: colors.accent },
                ],
              ]}
              onPress={() => {
                setFormat('square');
                setBackgroundImage(undefined);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  { color: format === 'square' ? colors.textOnGold : colors.textPrimary },
                ]}
              >
                Carré
              </Text>
              <Text
                style={[
                  styles.formatRatio,
                  { color: format === 'square' ? colors.textOnGold : colors.textMuted },
                ]}
              >
                1:1
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview Card */}
        <View style={styles.previewSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Aperçu</Text>
          <View style={styles.cardWrapper}>
            <FighterCardV2
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
        <View
          style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.tipsTitle, { color: colors.gold || colors.accent }]}>
            Astuce
          </Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            Prends-toi en photo dans une position de combattant et affiche tes stats comme un
            vrai champion ! Parfait pour Instagram Stories avec #YoroiWarrior
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
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
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
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Photo Section
  photoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  photoButton: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeButton: {
    flex: 0,
    minWidth: 120,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Format
  formatSection: {
    marginBottom: 24,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    gap: 3,
  },
  formatButtonActive: {
    borderColor: 'transparent',
  },
  formatButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formatButtonTextActive: {
    // color dynamically set inline via textOnGold
  },
  formatRatio: {
    fontSize: 10,
    fontWeight: '600',
  },
  formatRatioActive: {
    // color dynamically set inline via textOnGold
  },

  // Preview
  previewSection: {
    marginBottom: 24,
  },
  cardWrapper: {
    alignItems: 'center',
    marginTop: 12,
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
});
