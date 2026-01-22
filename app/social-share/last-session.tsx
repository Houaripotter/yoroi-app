// ============================================
// YOROI - LAST SESSION SHARE (Format Story 9:16)
// ============================================
// Partage de la dernière séance d'entraînement
// Style identique aux cartes hebdo/mensuel/annuel

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Image,
  TextInput,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Share2,
  Download,
  Camera,
  Image as ImageIcon,
  Dumbbell,
  Clock,
  Calendar,
  MapPin,
  Trophy,
  Moon,
  Sun,
  MapPinned,
  ArrowRight,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, Training, getClubs, getProfile, calculateStreak } from '@/lib/database';
import { SPORTS, getSportName, getSportIcon, getSportColor, getClubLogoSource } from '@/lib/sports';
import { getAvatarConfig, getAvatarImage } from '@/lib/avatarSystem';
import { getCurrentRank } from '@/lib/ranks';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';
import { shouldAskForReview } from '@/lib/reviewService';
import { useReviewModal } from '@/components/ReviewModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionCard } from '@/components/social-cards/SessionCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT_PORTRAIT = CARD_WIDTH * (16 / 9);  // Portrait 9:16
const CARD_HEIGHT_LANDSCAPE = CARD_WIDTH * (9 / 16); // Paysage 16:9
const GOLD_COLOR = '#D4AF37';

export default function LastSessionScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const cardRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const photoSectionRef = useRef<View>(null);
  const { showPopup, PopupComponent } = useCustomPopup();
  const { showReviewModal, ReviewModalComponent } = useReviewModal();

  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined);
  const [backgroundType, setBackgroundType] = useState<'photo' | 'black' | 'white'>('black');
  const [isLandscapeImage, setIsLandscapeImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTraining, setLastTraining] = useState<Training | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [customLocation, setCustomLocation] = useState<string>('');
  const [userName, setUserName] = useState<string>('Champion');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>('Ashigaru');
  const [optionDetails, setOptionDetails] = useState<any[]>([]);

  // Toggles
  const [showDate, setShowDate] = useState(true);
  const [showYearlyCount, setShowYearlyCount] = useState(true);
  const [showMonthlyCount, setShowMonthlyCount] = useState(true);
  const [showWeeklyCount, setShowWeeklyCount] = useState(true);
  const [showClub, setShowClub] = useState(true);
  const [showLieu, setShowLieu] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [showGoalProgress, setShowGoalProgress] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [yearlyCount, setYearlyCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [yearlyObjective, setYearlyObjective] = useState(0);

  // Fonction pour extraire les exercices et leurs stats depuis les notes
  const parseExercisesFromNotes = (notes: string) => {
    const details: any[] = [];
    if (!notes) return details;
    const lines = notes.split('\n');
    lines.forEach(line => {
      const match = line.match(/(?:•\s*)?(.*?)\s*\((\d+)?kg\s*x\s*(\d+)?\)/i);
      if (match) {
        let label = match[1].trim();
        label = label.replace(/^.*:\s*/, '');
        details.push({
          label: label,
          weight: match[2] || '0',
          reps: match[3] || '0'
        });
      }
    });
    return details;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [trainings, clubs, profile, avatarConfig, streak] = await Promise.all([
          getTrainings(),
          getClubs(),
          getProfile(),
          getAvatarConfig(),
          calculateStreak(),
        ]);

        if (profile) {
          setUserName(profile.name || 'Champion');
          if (profile.profile_photo) setUserPhoto(profile.profile_photo);
        }

        // Charger l'avatar
        if (avatarConfig) {
          const image = getAvatarImage(
            avatarConfig.pack,
            avatarConfig.state,
            avatarConfig.collectionCharacter,
            avatarConfig.gender
          );
          setUserAvatar(image);
        }

        // Charger le rang
        const rank = getCurrentRank(streak);
        setUserRank(rank.name);

        let currentTraining: Training | null = null;
        if (trainings.length > 0) {
          if (params.id) {
            currentTraining = trainings.find(t => t.id === parseInt(params.id!)) || null;
          } else {
            currentTraining = trainings[0];
          }
          setLastTraining(currentTraining);

          if (currentTraining && currentTraining.notes) {
            const parsed = parseExercisesFromNotes(currentTraining.notes);
            setOptionDetails(parsed);
          }
        }

        // Calculer l'objectif si un club est associé
        if (currentTraining && currentTraining.club_id) {
          const club = clubs.find(c => c.id === currentTraining?.club_id);
          if (club) {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const weeksPassed = Math.max(1, Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24 * 7)));
            setYearlyObjective((club.sessions_per_week || 3) * weeksPassed);
          }
        }

        // Calculer les compteurs
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const thisYear = trainings.filter(t => new Date(t.date).getFullYear() === currentYear);
        const thisMonth = trainings.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        const thisWeek = trainings.filter(t => new Date(t.date) >= startOfWeek);

        setYearlyCount(thisYear.length);
        setMonthlyCount(thisMonth.length);
        setWeeklyCount(thisWeek.length);

      } catch (error) {
        logger.error('Error loading data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [params.id]);

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
        setBackgroundType('photo');
        // Détecter si l'image est en paysage (largeur > hauteur)
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
        setBackgroundType('photo');
        // Détecter si l'image est en paysage (largeur > hauteur)
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
          dialogTitle: 'Partager ma séance',
        });

        // Nettoyer le flag pending review
        await AsyncStorage.removeItem('@yoroi_pending_review');

        // Après partage, vérifier si on doit demander une review (avec délai)
        setTimeout(async () => {
          const shouldShowReview = await shouldAskForReview();
          if (shouldShowReview) {
            showReviewModal();
          }
        }, 1000);
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

      // Nettoyer le flag pending review
      await AsyncStorage.removeItem('@yoroi_pending_review');

      // Après sauvegarde, vérifier si on doit demander une review
      const shouldShowReview = await shouldAskForReview();
      if (shouldShowReview) {
        showPopup('Sauvegardé !', 'Ta carte a été ajoutée à ta galerie.', [{
          text: 'OK',
          style: 'primary',
          onPress: () => {
            setTimeout(() => showReviewModal(), 500);
          }
        }]);
      } else {
        showPopup('Sauvegardé !', 'Ta carte a été ajoutée à ta galerie.', [{ text: 'OK', style: 'primary' }]);
      }
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
          <Dumbbell size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune séance
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Ajoute une séance pour pouvoir la partager !
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

  return (
    <ScreenWrapper noPadding noContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        
        {/* HEADER ÉTAPE 3 - SOMMET ABSOLU */}
        <View style={{ 
          backgroundColor: '#F2F2F7', 
          borderBottomWidth: 1, 
          borderBottomColor: colors.border,
          zIndex: 999
        }}>
          <View style={{ paddingBottom: 10, paddingTop: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
              {/* BOUTON RETOUR */}
              <TouchableOpacity 
                style={{ position: 'absolute', left: 16, padding: 8 }}
                onPress={() => router.back()}
              >
                <MaterialCommunityIcons name="arrow-left" size={28} color="#000000" />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: colors.accent, letterSpacing: 3, marginBottom: 8 }}>ÉTAPE 3 SUR 4</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  {/* Etape 1 & 2 (Passées - Gold) */}
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
                  <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
                  <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />
                  
                  {/* Etape 3 (Actuelle - Big Gold) */}
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 5 }} />
                  
                  {/* Futur (Noir & Blanc Cassé) */}
                  <View style={{ width: 30, height: 2, backgroundColor: '#000000' }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D1D6' }} />
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#000000', letterSpacing: 1, textAlign: 'center' }}>PARTAGE & PERSONNALISATION</Text>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 20, paddingBottom: 150 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. SÉLECTEUR DE FOND - EN HAUT POUR CHARGER PHOTO DIRECT */}
          <View style={[styles.styleSection, { marginBottom: 30 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: 'left', marginBottom: 12 }]}>STYLE DE LA CARTE</Text>
            <View style={styles.styleRow}>
              {[
                { key: 'photo', label: 'PHOTO PERSO', icon: Camera },
                { key: 'black', label: 'SOMBRE', icon: Moon },
                { key: 'white', label: 'CLAIR', icon: Sun },
              ].map((style) => (
                <TouchableOpacity
                  key={style.key}
                  style={[
                    styles.styleBtn,
                    {
                      backgroundColor: backgroundType === style.key ? colors.accent : colors.backgroundCard,
                      borderColor: backgroundType === style.key ? colors.accent : colors.border,
                      flex: 1,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBackgroundType(style.key as any);
                    if (style.key === 'photo') pickImage();
                    else setBackgroundImage(undefined);
                  }}
                >
                  <style.icon size={18} color={backgroundType === style.key ? colors.textOnAccent : colors.textPrimary} />
                  <Text style={[styles.styleBtnText, { color: backgroundType === style.key ? colors.textOnAccent : colors.textPrimary }]}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. APERÇU DE LA CARTE (Format Story 9:16) */}
          <View style={styles.cardContainer}>
            <SessionCard
              ref={cardRef}
              training={lastTraining}
              backgroundImage={backgroundImage}
              backgroundType={backgroundType}
              customLocation={customLocation}
              isLandscape={isLandscapeImage}
              userAvatar={userAvatar}
              profilePhoto={userPhoto}
              userName={userName}
              rank={userRank}
              options={optionDetails}
              yearlyCount={yearlyCount}
              monthlyCount={monthlyCount}
              weeklyCount={weeklyCount}
              yearlyObjective={yearlyObjective}
              showDate={showDate}
              showYearlyCount={showYearlyCount}
              showMonthlyCount={showMonthlyCount}
              showWeeklyCount={showWeeklyCount}
              showGoalProgress={showGoalProgress}
              showClub={showClub}
              showLieu={showLieu}
              showExercises={showExercises}
              showStats={showStats}
              width={CARD_WIDTH}
            />
          </View>

          {/* 3. ACTIONS FINALES */}
          <View style={{ gap: 15, marginTop: 20 }}>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.accent, paddingVertical: 20 }]} onPress={shareCard}>
              <Share2 size={24} color={colors.textOnAccent} />
              <Text style={[styles.shareBtnText, { fontSize: 18, color: colors.textOnAccent }]}>PARTAGER SUR INSTAGRAM</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.shareBtn, { backgroundColor: colors.backgroundElevated, paddingVertical: 18, borderWidth: 1, borderColor: colors.border }]} 
              onPress={() => router.push('/social-share/backup-step')}
            >
              <Text style={[styles.shareBtnText, { color: colors.textPrimary }]}>ÉTAPE SUIVANTE : SAUVEGARDE</Text>
              <ArrowRight size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      <PopupComponent />
      <ReviewModalComponent />
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
    paddingTop: 8,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
    marginTop: 8,
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
    paddingVertical: 12,
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
    fontSize: 17,
    fontWeight: '700',
  },

  // Card
  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  defaultBackground: {
    flex: 1,
  },
  backgroundImageContain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContent: {
    paddingTop: 24,
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
  titleDateText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  sportIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clubLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  sportName: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  centerSpace: {
    flex: 3, // Augmenté pour pousser le contenu vers le bas
    minHeight: 60,
  },
  bottomContent: {
    gap: 12, // Légèrement réduit pour être plus compact en bas
    paddingBottom: 0,
  },
  durationSection: {
    alignItems: 'center',
  },
  durationNumber: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: -8,
  },
  proStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  proStatBlock: {
    alignItems: 'center',
    flex: 1,
  },
  proStatValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  proStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  notesContainer: {
    paddingHorizontal: 24,
  },
  notesText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Style Selector
  styleSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  styleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  styleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  styleBtnIcon: {
    fontSize: 16,
  },
  styleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Photo Section
  photoSection: {
    gap: 10,
    marginBottom: 16,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Location Section
  locationSection: {
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  locationInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  // Action Buttons
  actionSection: {
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
