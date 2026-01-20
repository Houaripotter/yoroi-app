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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { getTrainings, Training } from '@/lib/database';
import { SPORTS, getSportName, getSportIcon, getSportColor, getClubLogoSource } from '@/lib/sports';
import logger from '@/lib/security/logger';
import { useCustomPopup } from '@/components/CustomPopup';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';
import { shouldAskForReview } from '@/lib/reviewService';
import { useReviewModal } from '@/components/ReviewModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT_PORTRAIT = CARD_WIDTH * (16 / 9);  // Portrait 9:16
const CARD_HEIGHT_LANDSCAPE = CARD_WIDTH * (9 / 16); // Paysage 16:9
const GOLD_COLOR = '#D4AF37';

// ============================================
// COMPOSANT CARTE SÉANCE (format story)
// ============================================

interface SessionCardProps {
  training: Training;
  backgroundImage?: string;
  backgroundType: 'photo' | 'black' | 'white';
  customLocation?: string;
  isLandscape?: boolean;  // true si image paysage
}

const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ training, backgroundImage, backgroundType, customLocation, isLandscape = false }, ref) => {
    // Gestion robuste du nom du sport
    const getDisplayName = (s: string) => {
      if (!s) return 'Entraînement';
      // Utilisation d'une recherche plus simple pour éviter les erreurs de référence
      const sportList = require('@/lib/sports').SPORTS;
      const found = sportList.find((sp: any) => sp.id === s.toLowerCase());
      if (found) return found.name;
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const sportName = training.sport.includes(',') 
      ? training.sport.split(',').map(s => getDisplayName(s.trim())).join(' + ') 
      : getDisplayName(training.sport);

    const cardHeight = isLandscape ? CARD_HEIGHT_LANDSCAPE : CARD_HEIGHT_PORTRAIT;
    
    // Si multisport, prendre l'icone du premier
    const primarySportId = training.sport.split(',')[0].trim().toLowerCase();
    const sportList = require('@/lib/sports').SPORTS;
    const primarySport = sportList.find((s: any) => s.id === primarySportId);
    
    const sportIcon = primarySport?.icon || 'trophy';
    const sportColor = primarySport?.color || GOLD_COLOR;

    // Déterminer le lieu à afficher
    const displayLocation = customLocation || (training.is_outdoor ? 'Plein air' : 'Salle');

    // CALCULER L'ALLURE (PACE) pour les sports de distance
    const calculatePace = () => {
      if (!training.distance || !training.duration_minutes) return null;
      const totalSeconds = training.duration_minutes * 60;
      const secondsPerKm = totalSeconds / training.distance;
      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.round(secondsPerKm % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const pace = calculatePace();
    const hasDistance = !!training.distance;
    const hasRounds = !!training.rounds;

    // Logo du club si disponible
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    const hasClubLogo = !!clubLogoSource;

    const formattedDate = new Date(training.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const isLightBackground = backgroundType === 'white';
    const hasPhoto = !!backgroundImage;
    const brandingVariant = isLightBackground ? 'light' : 'dark';

    // Couleurs dynamiques
    const textPrimary = isLightBackground ? '#1a1a1a' : '#FFFFFF';
    const textSecondary = isLightBackground ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
    const statsRowBg = isLightBackground ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    const statsRowBorder = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    const content = (
      <View style={styles.contentContainer}>
        {/* HAUT: Label + Date */}
        <View style={styles.topContent}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Trophy size={14} color={GOLD_COLOR} />
              <Text style={[styles.titleText, { color: GOLD_COLOR }]}>SÉANCE TERMINÉE</Text>
            </View>
            <Text style={[styles.titleDateText, { color: textSecondary }]}>
              {formattedDate.toUpperCase()}
            </Text>
          </View>

          {/* ICÔNE SPORT ou LOGO CLUB */}
          <View style={[
            styles.sportIconContainer, 
            { 
              backgroundColor: '#FFFFFF', 
              borderWidth: 3, 
              borderColor: hasClubLogo ? GOLD_COLOR : sportColor 
            }
          ]}>
            {hasClubLogo ? (
              <Image
                source={clubLogoSource}
                style={styles.clubLogo}
                resizeMode="contain"
              />
            ) : (
              <MaterialCommunityIcons name={sportIcon as any} size={42} color={sportColor} />
            )}
          </View>

          {/* NOM DU SPORT */}
          <Text style={[styles.sportName, { color: textPrimary, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 4 }]}>
            {sportName}
          </Text>
        </View>

        {/* CENTRE: Espace pour l'avatar/photo */}
        <View style={styles.centerSpace} />

        {/* BAS: Stats + Footer */}
        <View style={styles.bottomContent}>
          {/* STATS PRINCIPALES (STYLE STRAVA / ATHLETE) */}
          <View style={styles.proStatsGrid}>
            {/* COLONNE 1: DISTANCE ou ROUNDS ou DURÉE */}
            <View style={styles.proStatBlock}>
              <Text style={[styles.proStatValue, { color: GOLD_COLOR }]}>
                {hasDistance 
                  ? training.distance?.toFixed(2) 
                  : (hasRounds ? training.rounds : training.duration_minutes)}
              </Text>
              <Text style={[styles.proStatLabel, { color: textSecondary }]}>
                {hasDistance ? 'KILOMÈTRES' : (hasRounds ? 'ROUNDS' : 'MINUTES')}
              </Text>
            </View>

            {/* COLONNE 2: ALLURE ou DURÉE ROUND ou CALORIES */}
            <View style={styles.proStatBlock}>
              <Text style={[styles.proStatValue, { color: '#FFFFFF' }]}>
                {pace 
                  ? pace 
                  : (hasRounds ? `${training.round_duration}m` : (training.calories || '---'))}
              </Text>
              <Text style={[styles.proStatLabel, { color: textSecondary }]}>
                {pace ? 'ALLURE (/KM)' : (hasRounds ? 'TEMPS/RD' : 'CALORIES')}
              </Text>
            </View>

            {/* COLONNE 3: DURÉE ou INTENSITÉ (RPE) */}
            <View style={styles.proStatBlock}>
              <Text style={[styles.proStatValue, { color: '#FFFFFF' }]}>
                {hasDistance 
                  ? training.duration_minutes 
                  : (training.intensity ? `${training.intensity}/10` : (training.technique_rating ? `${training.technique_rating}/5` : '---'))}
              </Text>
              <Text style={[styles.proStatLabel, { color: textSecondary }]}>
                {hasDistance ? 'DURÉE (MIN)' : (training.intensity ? 'INTENSITÉ' : 'TECHNIQUE')}
              </Text>
            </View>
          </View>

          {/* INFOS SECONDAIRES */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Clock size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {training.start_time || '--:--'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: statsRowBorder }]} />
            <View style={styles.statItem}>
              <Calendar size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {new Date(training.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: statsRowBorder }]} />
            <View style={styles.statItem}>
              <MapPin size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1}>
                {displayLocation}
              </Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={{ paddingBottom: 10 }}>
          <SocialCardFooter variant={brandingVariant} />
        </View>
      </View>
    );

    // Fond avec photo - remplit tout le cadre avec effet flou + image entière intelligente
    if (backgroundImage) {
      return (
        <View
          ref={ref}
          style={[styles.card, { backgroundColor: '#000000', height: CARD_HEIGHT_PORTRAIT }]}
          collapsable={false}
        >
          {/* 1. Fond flou pour remplir l'espace (Zoomé) */}
          <Image
            source={{ uri: backgroundImage }}
            style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
            blurRadius={15}
            resizeMode="cover"
          />
          
          {/* 2. Image principale - Toujours en contain pour voir toute la photo */}
          <Image
            source={{ uri: backgroundImage }}
            style={styles.backgroundImageContain}
            resizeMode="contain"
          />
          
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.2, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          {content}
        </View>
      );
    }

    // Fond blanc
    if (isLightBackground) {
      return (
        <View
          ref={ref}
          style={[styles.card, { backgroundColor: '#FFFFFF', height: cardHeight }]}
          collapsable={false}
        >
          {content}
        </View>
      );
    }

    // Fond noir (défaut)
    return (
      <View
        ref={ref}
        style={[styles.card, { height: cardHeight }]}
        collapsable={false}
      >
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#0f0f1a']}
          style={styles.defaultBackground}
        >
          {content}
        </LinearGradient>
      </View>
    );
  }
);

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function LastSessionScreen() {
  const { colors, isDark } = useTheme();
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

  // Load last training
  useEffect(() => {
    const loadLastTraining = async () => {
      try {
        const trainings = await getTrainings();
        if (trainings.length > 0) {
          // Si un ID est passé en paramètre, on cherche cet ID spécifique
          if (params.id) {
            const specific = trainings.find(t => t.id === parseInt(params.id!));
            if (specific) {
              setLastTraining(specific);
              setIsLoadingData(false);
              return;
            }
          }
          
          // Sinon fallback sur le premier (déjà trié par ID DESC dans la DB)
          setLastTraining(trainings[0]);
        }
      } catch (error) {
        logger.error('Error loading last training:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadLastTraining();
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
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Share2 size={20} color={colors.accent} />
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Partager ma séance
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Preview */}
          <View style={styles.cardContainer}>
            <SessionCard
              ref={cardRef}
              training={lastTraining}
              backgroundImage={backgroundImage}
              backgroundType={backgroundType}
              customLocation={customLocation}
              isLandscape={isLandscapeImage}
            />
          </View>

          {/* Style Selector */}
          <View style={styles.styleSection}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Style de fond</Text>
            <View style={styles.styleRow}>
              {/* Sombre */}
              <TouchableOpacity
                style={[
                  styles.styleBtn,
                  {
                    backgroundColor: backgroundType === 'black' ? colors.accent : colors.backgroundCard,
                    borderColor: backgroundType === 'black' ? colors.accent : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBackgroundType('black');
                  setBackgroundImage(undefined);
                }}
              >
                <Moon size={18} color={backgroundType === 'black' ? '#FFFFFF' : colors.textPrimary} />
                <Text style={[
                  styles.styleBtnText,
                  { color: backgroundType === 'black' ? colors.textOnAccent : colors.textPrimary }
                ]}>
                  Sombre
                </Text>
              </TouchableOpacity>

              {/* Clair */}
              <TouchableOpacity
                style={[
                  styles.styleBtn,
                  {
                    backgroundColor: backgroundType === 'white' ? colors.accent : colors.backgroundCard,
                    borderColor: backgroundType === 'white' ? colors.accent : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBackgroundType('white');
                  setBackgroundImage(undefined);
                }}
              >
                <Sun size={18} color={backgroundType === 'white' ? '#FFFFFF' : colors.textPrimary} />
                <Text style={[
                  styles.styleBtnText,
                  { color: backgroundType === 'white' ? colors.textOnAccent : colors.textPrimary }
                ]}>
                  Clair
                </Text>
              </TouchableOpacity>

              {/* Photo */}
              <TouchableOpacity
                style={[
                  styles.styleBtn,
                  {
                    backgroundColor: backgroundType === 'photo' ? colors.accent : colors.backgroundCard,
                    borderColor: backgroundType === 'photo' ? colors.accent : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setBackgroundType('photo');
                  // Scroll vers les boutons photo (en bas)
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              >
                <Camera size={18} color={backgroundType === 'photo' ? '#FFFFFF' : colors.textPrimary} />
                <Text style={[
                  styles.styleBtnText,
                  { color: backgroundType === 'photo' ? colors.textOnAccent : colors.textPrimary }
                ]}>
                  Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Actions */}
          {backgroundType === 'photo' && (
            <View style={styles.photoSection}>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.accent }]}
                onPress={takePhoto}
              >
                <Camera size={20} color={colors.textOnAccent} />
                <Text style={[styles.photoBtnText, { color: colors.textOnAccent }]}>Prendre une photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoBtn, { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border }]}
                onPress={pickImage}
              >
                <ImageIcon size={20} color={colors.textPrimary} />
                <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>Choisir dans la galerie</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Location Input */}
          <View style={styles.locationSection}>
            <View style={styles.locationHeader}>
              <MapPinned size={18} color={colors.accent} />
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                Lieu (optionnel)
              </Text>
            </View>
            <TextInput
              style={[
                styles.locationInput,
                {
                  backgroundColor: colors.backgroundCard,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                }
              ]}
              value={customLocation}
              onChangeText={setCustomLocation}
              placeholder="Ex: Paris, Salle de sport XYZ..."
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.accent }]}
              onPress={shareCard}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Share2 size={22} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Partager sur Instagram / TikTok</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
              onPress={saveToGallery}
              disabled={isLoading}
            >
              <Download size={20} color={colors.textPrimary} />
              <Text style={[styles.saveBtnText, { color: colors.textPrimary }]}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
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
});
