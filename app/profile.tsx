import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Animated,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
  ChevronLeft,
  Target,
  Scale,
  Ruler,
  Calendar,
  Edit3,
  TrendingDown,
  TrendingUp,
  Minus,
  Award,
  X,
  Check,
  Trophy,
  Zap,
  Activity,
  Camera,
  ChevronRight,
  User,
  Sparkles,
  Star,
} from 'lucide-react-native';
import {
  getProfile,
  saveProfile,
  getWeightProgress,
  calculateStreak,
  Profile,
} from '@/lib/database';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress } from '@/lib/ranks';
import { getLevel } from '@/lib/gamification';
import { getUnlockedBadges } from '@/lib/badges';
import { getWeights, getTrainings } from '@/lib/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COLORS, SHADOWS, SPACING, RADIUS, TYPOGRAPHY } from '@/constants/design';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
// 🔒 SÉCURITÉ: Protection contre les screenshots
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { BlurView } from 'expo-blur';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// PROFIL - DESIGN V5 VIBRANT & ADDICTIVE
// ============================================

// Stat Badge Component
const StatBadge = ({
  icon: Icon,
  value,
  unit,
  label,
  color,
  bgColor,
  textColor,
  cardBgColor,
  borderColor
}: {
  icon: any;
  value: string;
  unit?: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  cardBgColor?: string;
  borderColor?: string;
}) => (
  <View style={[styles.statBadge, cardBgColor && { backgroundColor: cardBgColor }, borderColor && { borderColor }]}>
    <View style={[styles.statBadgeIcon, { backgroundColor: bgColor }]}>
      <Icon size={22} color={color} strokeWidth={2.5} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={[styles.statBadgeValue, { color: textColor }]}>{value}</Text>
      {unit && <Text style={[styles.statBadgeUnit, { color: textColor }]}>{unit}</Text>}
    </View>
    <Text style={[styles.statBadgeLabel, { color: textColor, opacity: 0.7 }]}>{label}</Text>
  </View>
);

// Progress Card Component
const ProgressCard = ({ weightProgress, t, colors }: { weightProgress: any; t: (key: string) => string; colors: any }) => {
  if (!weightProgress?.target) return null;

  const progress = Math.min(weightProgress.progress || 0, 100);

  return (
    <View style={[styles.progressCard, { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: colors?.border ?? '#333333' }]}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitleRow}>
          <Target size={18} color={colors?.accent ?? '#0ABAB5'} />
          <Text style={[styles.progressTitle, { color: colors?.textPrimary ?? '#FFFFFF' }]}>{t('profile.goal')}</Text>
        </View>
        <View style={[styles.progressPercentBadge, { backgroundColor: colors?.accentMuted ?? 'rgba(10,186,181,0.1)' }]}>
          <Text style={[styles.progressPercent, { color: colors?.accent ?? '#0ABAB5' }]}>{progress.toFixed(0)}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: colors?.backgroundElevated ?? '#242429' }]}>
          <LinearGradient
            colors={[colors?.accent ?? '#0ABAB5', colors?.accentDark || colors?.accent || '#089490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${progress}%` }]}
          />
        </View>
      </View>

      {/* Labels */}
      <View style={styles.progressLabels}>
        <View style={styles.progressLabelItem}>
          <Text style={[styles.progressLabelValue, { color: colors?.textPrimary ?? '#FFFFFF' }]}>{weightProgress.start}</Text>
          <Text style={[styles.progressLabelText, { color: colors?.textMuted ?? '#6B7280' }]}>{t('profile.start')}</Text>
        </View>
        <View style={[styles.progressLabelItem, { alignItems: 'center' }]}>
          <Text style={[styles.progressLabelValue, { color: colors?.accent ?? '#0ABAB5', fontSize: TYPOGRAPHY.size.xl }]}>
            {weightProgress.current}
          </Text>
          <Text style={[styles.progressLabelText, { color: colors?.textMuted ?? '#6B7280' }]}>{t('profile.current')}</Text>
        </View>
        <View style={[styles.progressLabelItem, { alignItems: 'flex-end' }]}>
          <Text style={[styles.progressLabelValue, { color: colors?.success ?? '#10B981' }]}>{weightProgress.target}</Text>
          <Text style={[styles.progressLabelText, { color: colors?.textMuted ?? '#6B7280' }]}>{t('profile.goal')}</Text>
        </View>
      </View>
    </View>
  );
};

// Info Row Component
const InfoRow = ({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  textColor,
  textSecondaryColor,
  successColor
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  bgColor: string;
  textColor: string;
  textSecondaryColor: string;
  successColor: string;
}) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: bgColor }]}>
      <Icon size={18} color={color} strokeWidth={2.5} />
    </View>
    <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: textColor }, value.includes('kg') && parseFloat(value) < 80 ? { color: successColor } : {}]}>
      {value}
    </Text>
  </View>
);

// Main Component
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // 🔒 SÉCURITÉ: Protection contre les screenshots
  const { isBlurred, screenshotDetected } = useSensitiveScreen();

  // Custom popup
  const { showPopup, PopupComponent } = useCustomPopup();

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [weightProgress, setWeightProgress] = useState<any>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [unlockedBadgesCount, setUnlockedBadgesCount] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [weightGoal, setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');

  // Protection anti-spam
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

  // Calcul automatique de l'âge à partir de la date de naissance
  const calculateAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    // Format attendu: DD/MM/YYYY ou YYYY-MM-DD
    let birthDateObj: Date;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      birthDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else if (dateStr.includes('-')) {
      birthDateObj = new Date(dateStr);
    } else {
      return null;
    }
    if (isNaN(birthDateObj.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age > 0 && age < 120 ? age : null;
  };

  const calculatedAge = calculateAge(birthDate);

  const loadData = useCallback(async () => {
    try {
      const profileData = await getProfile();
      setProfile(profileData);

      if (profileData) {
        setName(profileData.name || '');
        setHeightCm(profileData.height_cm?.toString() || '');
        setTargetWeight(profileData.target_weight?.toString() || '');
        setStartWeight(profileData.start_weight?.toString() || '');
        setProfilePhoto(profileData.profile_photo || null);
        setBirthDate(profileData.birth_date || '');
        setWeightGoal(profileData.weight_goal || 'lose');
      }

      const streakDays = await calculateStreak();
      setStreak(streakDays);

      const progress = await getWeightProgress();
      setWeightProgress(progress);

      // Charger les données de gamification
      const [weightsHistory, allTrainings, badges] = await Promise.all([
        getWeights(),
        getTrainings(),
        getUnlockedBadges(),
      ]);

      // Calculer les points totaux (même formule que dans index.tsx)
      const points = (weightsHistory?.length || 0) * 10 + (allTrainings?.length || 0) * 25 + (streakDays >= 7 ? 50 : 0);
      setTotalPoints(points);
      setUnlockedBadgesCount(badges?.length || 0);
    } catch (error) {
      logger.error('Error loading profile:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const rank = getCurrentRank(streak);
  const level = getLevel(totalPoints);

  const handleSave = async () => {
    // Protection anti-spam
    if (isSaving) return;

    if (!name.trim()) {
      showPopup('Erreur', 'Le nom est requis');
      return;
    }

    setIsSaving(true);
    try {
      await saveProfile({
        name: name.trim(),
        height_cm: heightCm ? parseInt(heightCm) : undefined,
        target_weight: targetWeight ? parseFloat(targetWeight) : undefined,
        start_weight: startWeight ? parseFloat(startWeight) : undefined,
        start_date: profile?.start_date || format(new Date(), 'yyyy-MM-dd'),
        avatar_gender: profile?.avatar_gender || 'homme',
        profile_photo: profilePhoto,
        birth_date: birthDate || undefined,
        weight_goal: weightGoal,
        age: calculatedAge || undefined,
      });

      await loadData();
      setIsEditing(false);
      showPopup('Profil mis a jour', 'Tes informations ont ete sauvegardees.');
    } catch (error) {
      logger.error('Save error:', error);
      showPopup('Erreur', 'Impossible de sauvegarder');
    } finally {
      setIsSaving(false);
    }
  };

  const takeProfilePhoto = async (withEditing: boolean = false) => {
    // Protection anti-spam
    if (isPickingPhoto) return;
    setIsPickingPhoto(true);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusée', 'Accès à la caméra requis pour prendre une photo.');
        setIsPickingPhoto(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: withEditing,
        aspect: withEditing ? [1, 1] : undefined,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setProfilePhoto(photoUri);
        const safeName = (profile?.name?.trim() || name?.trim() || 'Champion') || 'Champion';

        await saveProfile({
          name: safeName,
          height_cm: profile?.height_cm,
          target_weight: profile?.target_weight,
          start_weight: profile?.start_weight,
          start_date: profile?.start_date,
          avatar_gender: profile?.avatar_gender || 'homme',
          profile_photo: photoUri,
        });

        await loadData();
        showPopup('Photo mise à jour', 'Ta photo de profil a été changée avec succès.');
      }
    } catch (error) {
      logger.error('[Profile] Erreur prise de photo:', error);
      // Si erreur camera (simulateur), proposer galerie
      if (error && error.toString().includes('Camera not available')) {
        showPopup(
          'Caméra non disponible',
          'Utilise la galerie pour choisir une photo.',
          [{ text: 'Galerie', style: 'primary', onPress: () => pickProfilePhoto(withEditing) }]
        );
      } else {
        showPopup('Erreur', 'Impossible de prendre une photo. Réessaye plus tard.');
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const pickProfilePhoto = async (withEditing: boolean = true) => {
    // Protection anti-spam
    if (isPickingPhoto) return;
    setIsPickingPhoto(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusée', 'Accès à la galerie requis pour choisir une photo.');
        setIsPickingPhoto(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: withEditing,
        aspect: withEditing ? [1, 1] : undefined,
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setProfilePhoto(photoUri);
        const safeName = (profile?.name?.trim() || name?.trim() || 'Champion') || 'Champion';

        await saveProfile({
          name: safeName,
          height_cm: profile?.height_cm,
          target_weight: profile?.target_weight,
          start_weight: profile?.start_weight,
          start_date: profile?.start_date,
          avatar_gender: profile?.avatar_gender || 'homme',
          profile_photo: photoUri,
        });

        await loadData();
        showPopup('Photo mise à jour', 'Ta photo de profil a été changée avec succès.');
      }
    } catch (error) {
      logger.error('[Profile] Erreur sélection photo:', error);
      showPopup('Erreur', 'Impossible de charger la photo. Réessaye plus tard.');
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleChangePhoto = () => {
    showPopup(
      t('profile.profilePhoto') || 'Photo de profil',
      t('profile.howToAddPhoto') || 'Choisis comment ajouter ta photo',
      [
        {
          text: '📸 ' + (t('profile.takePhoto') || 'Prendre une photo'),
          style: 'primary',
          onPress: async () => {
            setTimeout(() => {
              takeProfilePhoto(true);
            }, 500);
          }
        },
        {
          text: '🖼️ ' + (t('profile.chooseFromGallery') || 'Choisir depuis la galerie'),
          style: 'default',
          onPress: async () => {
            setTimeout(() => {
              pickProfilePhoto(true);
            }, 500);
          }
        },
        { text: t('common.cancel') || 'Annuler', style: 'cancel' },
      ]
    );
  };

  const calculateBMI = () => {
    if (!weightProgress?.current || !profile?.height_cm) return null;
    const heightM = profile.height_cm / 100;
    return (weightProgress.current / (heightM * heightM)).toFixed(1);
  };

  const bmi = calculateBMI();

  const getBMIStatus = () => {
    if (!bmi) return { text: '-', color: colors?.textMuted ?? '#6B7280' };
    const value = parseFloat(bmi);
    if (value < 18.5) return { text: 'Insuffisant', color: colors?.warning ?? '#F59E0B' };
    if (value < 25) return { text: 'Normal', color: colors?.success ?? '#10B981' };
    if (value < 30) return { text: 'Surpoids', color: colors?.warning ?? '#F59E0B' };
    return { text: 'Obésité', color: colors?.error ?? '#EF4444' };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background ?? '#000000' }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors?.background ?? '#000000'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets?.top ?? 0 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: colors?.border ?? '#333333' }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color={colors?.textPrimary ?? '#FFFFFF'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors?.textPrimary ?? '#FFFFFF' }]}>{t('profile.title')}</Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: colors?.border ?? '#333333' }, isEditing && { borderColor: colors?.error ?? '#FF0000', backgroundColor: colors?.errorMuted ?? 'rgba(255,0,0,0.1)' }]}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X size={18} color={colors?.error ?? '#FF0000'} />
            ) : (
              <Edit3 size={18} color={colors?.accent ?? '#0ABAB5'} />
            )}
          </TouchableOpacity>
        </View>

        {/* 🔒 SÉCURITÉ: Avertissement screenshot détecté */}
        {screenshotDetected && (
          <View style={styles.screenshotWarning}>
            <Text style={styles.screenshotWarningText}>
              Screenshot détecté - Tes données sont sensibles
            </Text>
          </View>
        )}

        {/* Profile Hero Card - Photo centrée avec nom */}
        <View style={[styles.heroCard, { borderColor: colors?.border ?? '#333333' }]}>
          <LinearGradient
            colors={[colors?.card ?? '#1A1A1A', colors?.background ?? '#000000']}
            style={styles.heroGradient}
          >
            {/* Nom au-dessus */}
            {isEditing ? (
              <TextInput
                style={[styles.nameInput, { color: colors?.textPrimary ?? '#FFFFFF', marginBottom: 16, borderBottomColor: colors?.accent ?? '#0ABAB5' }]}
                value={name}
                onChangeText={setName}
                placeholder="Ton nom"
                placeholderTextColor={colors?.textMuted ?? '#6B7280'}
                textAlign="center"
                maxLength={50}
              />
            ) : (
              <Text style={[styles.profileName, { color: colors?.textPrimary ?? '#FFFFFF', marginTop: 0, marginBottom: 16 }]}>
                {profile?.name || 'Guerrier'}
              </Text>
            )}

            {/* Photo de profil centrée */}
            <Pressable
              onPress={handleChangePhoto}
              delayLongPress={0}
              style={({ pressed }) => [{ alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ position: 'relative' }}>
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: colors?.accent ?? '#0ABAB5' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.photoPlaceholderLarge, { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: colors?.accent ?? '#0ABAB5' }]}>
                    <User size={48} color={colors?.textMuted ?? '#6B7280'} />
                  </View>
                )}
                <View style={[styles.cameraButton, { bottom: 4, right: 4, backgroundColor: colors?.accent ?? '#0ABAB5' }]}>
                  <Camera size={16} color={colors?.textOnAccent ?? '#FFFFFF'} />
                </View>
              </View>
            </Pressable>

            {/* Date d'inscription */}
            {profile?.start_date && (
              <Text style={[styles.memberSince, { color: colors?.textMuted ?? '#6B7280' }]}>
                {t('profile.memberSince')} {format(new Date(profile.start_date), 'MMMM yyyy', { locale: fr })}
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBadge
            icon={weightGoal === 'gain' ? TrendingUp : TrendingDown}
            value={weightProgress?.lost > 0 ? (weightGoal === 'gain' ? `+${weightProgress.lost.toFixed(1)}` : `-${weightProgress.lost.toFixed(1)}`) : '0'}
            unit=" kg"
            label={weightGoal === 'gain' ? t('profile.gained') : t('profile.lost')}
            color={weightGoal === 'gain' ? colors?.warning ?? '#F59E0B' : colors?.success ?? '#10B981'}
            bgColor={weightGoal === 'gain' ? colors?.warningMuted ?? 'rgba(245,158,11,0.1)' : colors?.successMuted ?? 'rgba(16,185,129,0.1)'}
            textColor={colors?.textPrimary ?? '#FFFFFF'}
            cardBgColor={colors?.card ?? '#1A1A1A'}
            borderColor={colors?.border ?? '#333333'}
          />
          <StatBadge
            icon={Target}
            value={weightProgress?.target ? `${weightProgress.target}` : '-'}
            unit=" kg"
            label={t('profile.target')}
            color={colors?.accent ?? '#0ABAB5'}
            bgColor={colors?.accentMuted ?? 'rgba(10,186,181,0.1)'}
            textColor={colors?.textPrimary ?? '#FFFFFF'}
            cardBgColor={colors?.card ?? '#1A1A1A'}
            borderColor={colors?.border ?? '#333333'}
          />
          <StatBadge
            icon={Activity}
            value={weightProgress?.remaining > 0 ? weightProgress.remaining.toFixed(1) : '0'}
            unit=" kg"
            label={weightGoal === 'gain' ? t('profile.toGain') : weightGoal === 'maintain' ? t('profile.maintenance') : t('profile.toLoose')}
            color={weightGoal === 'gain' ? colors?.warning ?? '#F59E0B' : weightGoal === 'maintain' ? colors?.info ?? '#3B82F6' : colors?.success ?? '#10B981'}
            bgColor={weightGoal === 'gain' ? colors?.warningMuted ?? 'rgba(245,158,11,0.1)' : weightGoal === 'maintain' ? colors?.infoMuted ?? 'rgba(59,130,246,0.1)' : colors?.successMuted ?? 'rgba(16,185,129,0.1)'}
            textColor={colors?.textPrimary ?? '#FFFFFF'}
            cardBgColor={colors?.card ?? '#1A1A1A'}
            borderColor={colors?.border ?? '#333333'}
          />
        </View>

        {/* Section Dojo - XP, Niveau, Badges */}
        <TouchableOpacity
          style={[styles.dojoCard, { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: (colors?.gold ?? '#0ABAB5') + '40' }]}
          onPress={() => router.push('/gamification')}
          activeOpacity={0.8}
        >
          <View style={styles.dojoHeader}>
            <View style={[styles.dojoIconContainer, { backgroundColor: (colors?.gold ?? '#0ABAB5') + '20' }]}>
              <Sparkles size={20} color={colors?.gold ?? '#0ABAB5'} strokeWidth={2.5} />
            </View>
            <Text style={[styles.dojoTitle, { color: colors?.textPrimary ?? '#FFFFFF' }]}>{t('gamification.title')}</Text>
            <ChevronRight size={20} color={colors?.textMuted ?? '#6B7280'} />
          </View>

          <View style={styles.dojoStats}>
            {/* XP */}
            <View style={styles.dojoStatItem}>
              <Zap size={18} color={colors?.accent ?? '#0ABAB5'} strokeWidth={2.5} />
              <Text style={[styles.dojoStatValue, { color: colors?.accent ?? '#0ABAB5' }]}>{totalPoints}</Text>
              <Text style={[styles.dojoStatLabel, { color: colors?.textMuted ?? '#6B7280' }]}>XP</Text>
            </View>

            {/* Niveau */}
            <View style={styles.dojoStatItem}>
              <Star size={18} color={colors?.gold ?? '#0ABAB5'} strokeWidth={2.5} />
              <Text style={[styles.dojoStatValue, { color: colors?.gold ?? '#0ABAB5' }]}>{level.level}</Text>
              <Text style={[styles.dojoStatLabel, { color: colors?.textMuted ?? '#6B7280' }]}>{t('gamification.level')}</Text>
            </View>

            {/* Rang */}
            <View style={styles.dojoStatItem}>
              <Trophy size={18} color={rank?.color || colors?.gold || '#0ABAB5'} strokeWidth={2.5} />
              <Text style={[styles.dojoStatValue, { color: rank?.color || colors?.gold || '#0ABAB5' }]}>{rank?.name?.split(' ')[0] || '-'}</Text>
              <Text style={[styles.dojoStatLabel, { color: colors?.textMuted ?? '#6B7280' }]}>{t('gamification.rank')}</Text>
            </View>

            {/* Badges */}
            <View style={styles.dojoStatItem}>
              <Award size={18} color={colors?.success ?? '#10B981'} strokeWidth={2.5} />
              <Text style={[styles.dojoStatValue, { color: colors?.success ?? '#10B981' }]}>{unlockedBadgesCount}</Text>
              <Text style={[styles.dojoStatLabel, { color: colors?.textMuted ?? '#6B7280' }]}>{t('gamification.badges')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Progress to Goal */}
        <ProgressCard weightProgress={weightProgress} t={t} colors={colors} />

        {/* Personal Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: colors?.border ?? '#333333' }]}>
          <Text style={[styles.sectionTitle, { color: colors?.textPrimary ?? '#FFFFFF' }]}>{t('profile.informations')}</Text>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors?.textMuted ?? '#6B7280' }]}>{t('profile.height')} (cm)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors?.backgroundElevated ?? '#242429', color: colors?.textPrimary ?? '#FFFFFF', borderColor: colors?.border ?? '#333333' }]}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="175"
                    placeholderTextColor={colors?.textMuted ?? '#6B7280'}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors?.textMuted ?? '#6B7280' }]}>Date de naissance</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors?.backgroundElevated ?? '#242429', color: colors?.textPrimary ?? '#FFFFFF', borderColor: colors?.border ?? '#333333' }]}
                    value={birthDate}
                    onChangeText={setBirthDate}
                    placeholder="15/06/1995"
                    placeholderTextColor={colors?.textMuted ?? '#6B7280'}
                    keyboardType="default"
                    maxLength={10}
                  />
                  {calculatedAge && (
                    <Text style={{ fontSize: 11, color: colors?.textMuted ?? '#6B7280', marginTop: 4 }}>
                      → {calculatedAge} ans
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors?.textMuted ?? '#6B7280' }]}>{t('profile.startingWeight')} (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors?.backgroundElevated ?? '#242429', color: colors?.textPrimary ?? '#FFFFFF', borderColor: colors?.border ?? '#333333' }]}
                    value={startWeight}
                    onChangeText={setStartWeight}
                    placeholder="85.0"
                    placeholderTextColor={colors?.textMuted ?? '#6B7280'}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors?.textMuted ?? '#6B7280' }]}>{t('profile.target')} (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors?.backgroundElevated ?? '#242429', color: colors?.textPrimary ?? '#FFFFFF', borderColor: colors?.border ?? '#333333' }]}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="75.0"
                    placeholderTextColor={colors?.textMuted ?? '#6B7280'}
                    keyboardType="decimal-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Weight Goal Selector */}
              <Text style={[styles.inputLabel, { color: colors?.textMuted ?? '#6B7280' }]}>Mon objectif</Text>
              <View style={styles.goalSelector}>
                <TouchableOpacity
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: weightGoal === 'lose' ? colors?.success ?? '#10B981' : colors?.border ?? '#333333' },
                    weightGoal === 'lose' && { borderWidth: 2 }
                  ]}
                  onPress={() => setWeightGoal('lose')}
                >
                  <TrendingDown size={20} color={weightGoal === 'lose' ? colors?.success ?? '#10B981' : colors?.textMuted ?? '#6B7280'} />
                  <Text style={[styles.goalOptionText, { color: weightGoal === 'lose' ? colors?.success ?? '#10B981' : colors?.textPrimary ?? '#FFFFFF' }]}>Perte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: weightGoal === 'maintain' ? colors?.info ?? '#3B82F6' : colors?.border ?? '#333333' },
                    weightGoal === 'maintain' && { borderWidth: 2 }
                  ]}
                  onPress={() => setWeightGoal('maintain')}
                >
                  <Minus size={20} color={weightGoal === 'maintain' ? colors?.info ?? '#3B82F6' : colors?.textMuted ?? '#6B7280'} />
                  <Text style={[styles.goalOptionText, { color: weightGoal === 'maintain' ? colors?.info ?? '#3B82F6' : colors?.textPrimary ?? '#FFFFFF' }]}>Maintien</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors?.card ?? '#1A1A1A', borderColor: weightGoal === 'gain' ? colors?.warning ?? '#F59E0B' : colors?.border ?? '#333333' },
                    weightGoal === 'gain' && { borderWidth: 2 }
                  ]}
                  onPress={() => setWeightGoal('gain')}
                >
                  <TrendingUp size={20} color={weightGoal === 'gain' ? colors?.warning ?? '#F59E0B' : colors?.textMuted ?? '#6B7280'} />
                  <Text style={[styles.goalOptionText, { color: weightGoal === 'gain' ? colors?.warning ?? '#F59E0B' : colors?.textPrimary ?? '#FFFFFF' }]}>Prise</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={[colors?.accent ?? '#0ABAB5', colors?.accentDark ?? colors?.accent ?? '#089490']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Check size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoList}>
              <InfoRow
                icon={Ruler}
                label={t('profile.height')}
                value={profile?.height_cm ? `${profile.height_cm} cm` : '-'}
                color={colors?.info ?? '#3B82F6'}
                bgColor={colors?.infoMuted ?? 'rgba(59,130,246,0.1)'}
                textColor={colors?.textPrimary ?? '#FFFFFF'}
                textSecondaryColor={colors?.textSecondary ?? '#9CA3AF'}
                successColor={colors?.success ?? '#10B981'}
              />
              <InfoRow
                icon={Calendar}
                label={t('profile.age')}
                value={calculatedAge ? `${calculatedAge} ans` : (profile?.age ? `${profile.age} ans` : '-')}
                color={colors?.accent ?? '#0ABAB5'}
                bgColor={colors?.accentMuted ?? 'rgba(10,186,181,0.1)'}
                textColor={colors?.textPrimary ?? '#FFFFFF'}
                textSecondaryColor={colors?.textSecondary ?? '#9CA3AF'}
                successColor={colors?.success ?? '#10B981'}
              />
              <InfoRow
                icon={Scale}
                label={t('profile.startingWeight')}
                value={weightProgress?.start ? `${weightProgress.start} kg` : '-'}
                color={colors?.warning ?? '#F59E0B'}
                bgColor={colors?.warningMuted ?? 'rgba(245,158,11,0.1)'}
                textColor={colors?.textPrimary ?? '#FFFFFF'}
                textSecondaryColor={colors?.textSecondary ?? '#9CA3AF'}
                successColor={colors?.success ?? '#10B981'}
              />
              <InfoRow
                icon={Target}
                label={t('profile.target')}
                value={weightProgress?.target ? `${weightProgress.target} kg` : '-'}
                color={colors?.success ?? '#10B981'}
                bgColor={colors?.successMuted ?? 'rgba(16,185,129,0.1)'}
                textColor={colors?.textPrimary ?? '#FFFFFF'}
                textSecondaryColor={colors?.textSecondary ?? '#9CA3AF'}
                successColor={colors?.success ?? '#10B981'}
              />
              <InfoRow
                icon={profile?.weight_goal === 'lose' ? TrendingDown : profile?.weight_goal === 'gain' ? TrendingUp : Minus}
                label={t('profile.goalType')}
                value={profile?.weight_goal === 'lose' ? t('profile.weightLoss') : profile?.weight_goal === 'gain' ? t('profile.massGain') : t('profile.maintenance')}
                color={profile?.weight_goal === 'lose' ? colors?.success ?? '#10B981' : profile?.weight_goal === 'gain' ? colors?.warning ?? '#F59E0B' : colors?.info ?? '#3B82F6'}
                bgColor={profile?.weight_goal === 'lose' ? colors?.successMuted ?? 'rgba(16,185,129,0.1)' : profile?.weight_goal === 'gain' ? colors?.warningMuted ?? 'rgba(245,158,11,0.1)' : colors?.infoMuted ?? 'rgba(59,130,246,0.1)'}
                textColor={colors?.textPrimary ?? '#FFFFFF'}
                textSecondaryColor={colors?.textSecondary ?? '#9CA3AF'}
                successColor={colors?.success ?? '#10B981'}
              />
            </View>
          )}
        </View>


        {/* Motivational Quote */}
        <View style={[styles.quoteCard, { borderColor: colors?.accentMuted ?? 'rgba(10,186,181,0.1)' }]}>
          <LinearGradient
            colors={isDark ? ['rgba(0, 214, 143, 0.15)', 'rgba(0, 214, 143, 0.08)'] : [colors?.accentMuted ?? 'rgba(10,186,181,0.1)', colors?.background ?? '#000000']}
            style={styles.quoteGradient}
          >
            <Trophy size={24} color={colors?.accentText ?? '#0ABAB5'} />
            <Text style={[styles.quoteText, { color: colors?.textPrimary ?? '#FFFFFF' }]}>
              "La victoire appartient au plus persévérant"
            </Text>
            <Text style={[styles.quoteAuthor, { color: colors?.textPrimary ?? '#FFFFFF', fontWeight: '600' }]}>Napoléon Bonaparte</Text>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 🔒 SÉCURITÉ: Flou quand l'app est en background */}
      {isBlurred && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
        />
      )}

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES - V5 VIBRANT
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonActive: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorMuted,
  },

  // Hero Card
  heroCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  heroGradient: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  profileName: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  nameInput: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
    paddingBottom: SPACING.xs,
    minWidth: 150,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
  },
  rankName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.accent,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  streakValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.warning,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    marginLeft: 2,
  },

  // Next Rank Card
  nextRankCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  nextRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  nextRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nextRankTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
  },
  nextRankRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  nextRankIcon: {
    fontSize: 14,
  },
  nextRankName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.gold,
  },
  nextRankBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  nextRankBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  nextRankDays: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'right',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statBadge: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statBadgeValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  statBadgeUnit: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
  },
  statBadgeLabel: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Dojo Card
  dojoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: COLORS.goldMuted,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dojoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dojoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  dojoTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  dojoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dojoStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  dojoStatValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dojoStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Progress Card
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  progressPercentBadge: {
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  progressPercent: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.accent,
  },
  progressBarContainer: {
    marginBottom: SPACING.lg,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelItem: {},
  progressLabelValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  progressLabelText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    letterSpacing: -0.3,
  },
  infoList: {
    gap: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },

  // Edit Form
  editForm: {
    gap: SPACING.lg,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  inputGroup: {
    flex: 1,
    gap: SPACING.sm,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.text,
  },
  saveButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },

  // Quote Card
  quoteCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.accentMuted,
  },
  quoteGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  quoteEmoji: {
    fontSize: 32,
    marginBottom: SPACING.md,
  },
  quoteText: {
    fontSize: TYPOGRAPHY.size.md,
    fontStyle: 'italic',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },

  // 🔒 SÉCURITÉ: Styles pour l'avertissement screenshot
  screenshotWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  screenshotWarningText: {
    color: '#FF9500',
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Hero Top Row - Avatar Left, Photo Right
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  heroAvatarContainer: {
    position: 'relative',
  },
  rankMini: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  heroCenterContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  heroPhotoContainer: {
    position: 'relative',
  },
  photoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderLarge: {
    width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 4,
  },
  memberSince: {
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },

  // Goal Selector
  goalSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  goalOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  goalOptionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Competition Section
  competitionCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  competitionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  competitionIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  competitionContent: {
    flex: 1,
  },
  competitionLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: 2,
  },
  competitionSublabel: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  starButton: { padding: 4 },
  starsContainer: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginVertical: 12 },
  starsLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  starLabel: { fontSize: 12, fontWeight: '600' },
});