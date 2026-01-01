import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import {
  ChevronLeft,
  Target,
  Scale,
  Ruler,
  Flame,
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
  Heart,
  Activity,
  Camera,
  ChevronRight,
  Droplet,
  Swords,
  User,
} from 'lucide-react-native';
import { AvatarSolid } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import {
  getProfile,
  saveProfile,
  getWeightProgress,
  calculateStreak,
  Profile,
} from '@/lib/database';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress } from '@/lib/ranks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { COLORS, SHADOWS, SPACING, RADIUS, TYPOGRAPHY, GRADIENTS } from '@/constants/design';
import { useTheme } from '@/lib/ThemeContext';
// 🔒 SÉCURITÉ: Protection contre les screenshots
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { BlurView } from 'expo-blur';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// PROFIL - DESIGN V5 VIBRANT & ADDICTIVE
// ============================================

// Large Ring Progress Component
const LargeRingProgress = ({
  progress,
  size = 160,
  strokeWidth = 10,
  accentColor,
  children
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  accentColor: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="profileRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={accentColor} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.5" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.surfaceBorder}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#profileRingGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};

// Stat Badge Component
const StatBadge = ({
  icon: Icon,
  value,
  label,
  color,
  bgColor
}: {
  icon: any;
  value: string;
  label: string;
  color: string;
  bgColor: string;
}) => (
  <View style={styles.statBadge}>
    <View style={[styles.statBadgeIcon, { backgroundColor: bgColor }]}>
      <Icon size={22} color={color} strokeWidth={2.5} />
    </View>
    <Text style={styles.statBadgeValue}>{value}</Text>
    <Text style={styles.statBadgeLabel}>{label}</Text>
  </View>
);

// Progress Card Component
const ProgressCard = ({ weightProgress }: { weightProgress: any }) => {
  if (!weightProgress?.target) return null;

  const progress = Math.min(weightProgress.progress || 0, 100);

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitleRow}>
          <Target size={18} color={COLORS.accent} />
          <Text style={styles.progressTitle}>Objectif</Text>
        </View>
        <View style={styles.progressPercentBadge}>
          <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${progress}%` }]}
          />
        </View>
      </View>

      {/* Labels */}
      <View style={styles.progressLabels}>
        <View style={styles.progressLabelItem}>
          <Text style={styles.progressLabelValue}>{weightProgress.start}</Text>
          <Text style={styles.progressLabelText}>Départ</Text>
        </View>
        <View style={[styles.progressLabelItem, { alignItems: 'center' }]}>
          <Text style={[styles.progressLabelValue, { color: COLORS.accent, fontSize: TYPOGRAPHY.size.xl }]}>
            {weightProgress.current}
          </Text>
          <Text style={styles.progressLabelText}>Actuel</Text>
        </View>
        <View style={[styles.progressLabelItem, { alignItems: 'flex-end' }]}>
          <Text style={[styles.progressLabelValue, { color: COLORS.success }]}>{weightProgress.target}</Text>
          <Text style={styles.progressLabelText}>Objectif</Text>
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
  bgColor
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: bgColor }]}>
      <Icon size={18} color={color} strokeWidth={2.5} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, value.includes('kg') && parseFloat(value) < 80 ? { color: COLORS.success } : {}]}>
      {value}
    </Text>
  </View>
);

// Main Component
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // 🔒 SÉCURITÉ: Protection contre les screenshots
  const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [weightProgress, setWeightProgress] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [weightGoal, setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');
  const [userAge, setUserAge] = useState('');

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
        setUserAge(profileData.age?.toString() || '');
      }

      const streakDays = await calculateStreak();
      setStreak(streakDays);

      const progress = await getWeightProgress();
      setWeightProgress(progress);
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
  const nextRank = getNextRank(streak);
  const daysToNext = getDaysToNextRank(streak);
  const rankProgress = getRankProgress(streak);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }

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
        age: userAge ? parseInt(userAge) : undefined,
      });

      await loadData();
      setIsEditing(false);
      Alert.alert('Profil mis à jour');
    } catch (error) {
      logger.error('Save error:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'Accès à la caméra requis');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              const photoUri = result.assets[0].uri;
              setProfilePhoto(photoUri);

              // S'assurer que le nom n'est jamais null ou vide
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
            }
          },
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'Accès à la galerie requis');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });
            if (!result.canceled && result.assets[0]) {
              const photoUri = result.assets[0].uri;
              setProfilePhoto(photoUri);

              // S'assurer que le nom n'est jamais null ou vide
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
            }
          },
        },
        {
          text: 'Utiliser avatar du rang',
          onPress: async () => {
            setProfilePhoto(null);

            // S'assurer que le nom n'est jamais null
            const safeName = (profile?.name || name || 'Champion').trim() || 'Champion';

            await saveProfile({
              name: safeName,
              height_cm: profile?.height_cm,
              target_weight: profile?.target_weight,
              start_weight: profile?.start_weight,
              start_date: profile?.start_date,
              avatar_gender: profile?.avatar_gender || 'homme',
              profile_photo: null,
            });
            await loadData();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const calculateBMI = () => {
    if (!weightProgress?.current || !profile?.height_cm) return null;
    const heightM = profile.height_cm / 100;
    return (weightProgress.current / (heightM * heightM)).toFixed(1);
  };

  const bmi = calculateBMI();

  const getBMIStatus = () => {
    if (!bmi) return { text: '-', color: COLORS.textMuted };
    const value = parseFloat(bmi);
    if (value < 18.5) return { text: 'Insuffisant', color: COLORS.warning };
    if (value < 25) return { text: 'Normal', color: COLORS.success };
    if (value < 30) return { text: 'Surpoids', color: COLORS.warning };
    return { text: 'Obésité', color: COLORS.error };
  };

  const bmiStatus = getBMIStatus();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity
            style={[styles.editButton, isEditing && styles.editButtonActive]}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X size={18} color={COLORS.error} />
            ) : (
              <Edit3 size={18} color={COLORS.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* 🔒 SÉCURITÉ: Avertissement screenshot détecté */}
        {screenshotDetected && (
          <View style={styles.screenshotWarning}>
            <Text style={styles.screenshotWarningText}>
              ⚠️ Screenshot détecté - Tes données sont sensibles
            </Text>
          </View>
        )}

        {/* Profile Hero Card - Avatar Left, Photo Right */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={[COLORS.surface, COLORS.background]}
            style={styles.heroGradient}
          >
            {/* Top Row: Avatar + Name + Photo */}
            <View style={styles.heroTopRow}>
              {/* Left: Avatar du rang */}
              <View style={styles.heroAvatarContainer}>
                <AvatarSolid
                  source={null}
                  size="lg"
                  backgroundColor={COLORS.avatarBg}
                />
                <View style={[styles.rankMini, { backgroundColor: colors.accent }]}>
                  <Icon name={rank.icon as any} size={12} color="#FFF" />
                </View>
              </View>

              {/* Center: Name + Rank */}
              <View style={styles.heroCenterContent}>
                {isEditing ? (
                  <TextInput
                    style={[styles.nameInput, { color: colors.textPrimary }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ton nom"
                    placeholderTextColor={COLORS.textMuted}
                    textAlign="center"
                  />
                ) : (
                  <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profile?.name || 'Guerrier'}</Text>
                )}
                <View style={styles.rankBadge}>
                  <Icon name={rank.icon as any} size={16} color={colors.accent} />
                  <Text style={[styles.rankName, { color: colors.accent }]}>{rank.name}</Text>
                </View>
              </View>

              {/* Right: Photo de profil */}
              <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.8} style={styles.heroPhotoContainer}>
                <LargeRingProgress progress={rankProgress} size={80} strokeWidth={4} accentColor={colors.accent}>
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      style={{ width: 68, height: 68, borderRadius: 34 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: colors.card }]}>
                      <User size={28} color={colors.textMuted} />
                    </View>
                  )}
                </LargeRingProgress>
                <View style={styles.cameraButton}>
                  <Camera size={14} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Streak */}
            <View style={styles.streakBadge}>
              <Flame size={16} color={COLORS.warning} />
              <Text style={styles.streakValue}>{streak}</Text>
              <Text style={styles.streakLabel}>jours de streak</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Next Rank Progress */}
        {nextRank && (
          <View style={styles.nextRankCard}>
            <View style={styles.nextRankHeader}>
              <View style={styles.nextRankLeft}>
                <Trophy size={16} color={COLORS.gold} />
                <Text style={styles.nextRankTitle}>Prochain rang</Text>
              </View>
              <View style={styles.nextRankRight}>
                <Icon name={nextRank.icon as any} size={16} color={COLORS.gold} />
                <Text style={styles.nextRankName}>{nextRank.name}</Text>
              </View>
            </View>
            <View style={styles.nextRankBarBg}>
              <LinearGradient
                colors={GRADIENTS.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.nextRankBarFill, { width: `${rankProgress}%` }]}
              />
            </View>
            <Text style={styles.nextRankDays}>Encore {daysToNext} jours</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBadge
            icon={TrendingDown}
            value={weightProgress?.lost > 0 ? `-${weightProgress.lost.toFixed(1)} kg` : '0 kg'}
            label="Perdus"
            color={COLORS.success}
            bgColor={COLORS.successMuted}
          />
          <StatBadge
            icon={Target}
            value={weightProgress?.target ? `${weightProgress.target} kg` : '-'}
            label="Objectif"
            color={COLORS.accent}
            bgColor={COLORS.accentMuted}
          />
          <StatBadge
            icon={Activity}
            value={bmi || '-'}
            label={bmiStatus.text}
            color={bmiStatus.color}
            bgColor={`${bmiStatus.color}20`}
          />
        </View>

        {/* Progress to Goal */}
        <ProgressCard weightProgress={weightProgress} />

        {/* Personal Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Informations</Text>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Taille (cm)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="175"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Âge</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                    value={userAge}
                    onChangeText={setUserAge}
                    placeholder="28"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Poids départ (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                    value={startWeight}
                    onChangeText={setStartWeight}
                    placeholder="85.0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Objectif (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }]}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="75.0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Weight Goal Selector */}
              <Text style={styles.inputLabel}>Mon objectif</Text>
              <View style={styles.goalSelector}>
                <TouchableOpacity
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors.card, borderColor: weightGoal === 'lose' ? COLORS.success : colors.border },
                    weightGoal === 'lose' && { borderWidth: 2 }
                  ]}
                  onPress={() => setWeightGoal('lose')}
                >
                  <TrendingDown size={20} color={weightGoal === 'lose' ? COLORS.success : colors.textMuted} />
                  <Text style={[styles.goalOptionText, { color: weightGoal === 'lose' ? COLORS.success : colors.textPrimary }]}>Perte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors.card, borderColor: weightGoal === 'maintain' ? COLORS.info : colors.border },
                    weightGoal === 'maintain' && { borderWidth: 2 }
                  ]}
                  onPress={() => setWeightGoal('maintain')}
                >
                  <Minus size={20} color={weightGoal === 'maintain' ? COLORS.info : colors.textMuted} />
                  <Text style={[styles.goalOptionText, { color: weightGoal === 'maintain' ? COLORS.info : colors.textPrimary }]}>Maintien</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.goalOption,
                    { backgroundColor: colors.card, borderColor: weightGoal === 'gain' ? COLORS.warning : colors.border },
                    weightGoal === 'gain' && { borderWidth: 2 }
                  ]}
                  onPress={() => setWeightGoal('gain')}
                >
                  <TrendingUp size={20} color={weightGoal === 'gain' ? COLORS.warning : colors.textMuted} />
                  <Text style={[styles.goalOptionText, { color: weightGoal === 'gain' ? COLORS.warning : colors.textPrimary }]}>Prise</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Check size={20} color="#000" />
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoList}>
              <InfoRow
                icon={Ruler}
                label="Taille"
                value={profile?.height_cm ? `${profile.height_cm} cm` : '-'}
                color={COLORS.info}
                bgColor={COLORS.infoMuted}
              />
              <InfoRow
                icon={Calendar}
                label="Âge"
                value={profile?.age ? `${profile.age} ans` : '-'}
                color={COLORS.accent}
                bgColor={COLORS.accentMuted}
              />
              <InfoRow
                icon={Scale}
                label="Poids de départ"
                value={weightProgress?.start ? `${weightProgress.start} kg` : '-'}
                color={COLORS.warning}
                bgColor={COLORS.warningMuted}
              />
              <InfoRow
                icon={Target}
                label="Objectif"
                value={weightProgress?.target ? `${weightProgress.target} kg` : '-'}
                color={COLORS.success}
                bgColor={COLORS.successMuted}
              />
              <InfoRow
                icon={profile?.weight_goal === 'lose' ? TrendingDown : profile?.weight_goal === 'gain' ? TrendingUp : Minus}
                label="Type d'objectif"
                value={profile?.weight_goal === 'lose' ? 'Perte de poids' : profile?.weight_goal === 'gain' ? 'Prise de masse' : 'Maintien'}
                color={profile?.weight_goal === 'lose' ? COLORS.success : profile?.weight_goal === 'gain' ? COLORS.warning : COLORS.info}
                bgColor={profile?.weight_goal === 'lose' ? COLORS.successMuted : profile?.weight_goal === 'gain' ? COLORS.warningMuted : COLORS.infoMuted}
              />
            </View>
          )}
        </View>

        {/* Profil Compétiteur */}
        <View style={[styles.competitionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Espace Compétiteur</Text>

          <TouchableOpacity
            style={[styles.competitionItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/competitor-profile')}
          >
            <View style={[styles.competitionIcon, { backgroundColor: '#8B5CF620' }]}>
              <Swords size={20} color="#8B5CF6" />
            </View>
            <View style={styles.competitionContent}>
              <Text style={[styles.competitionLabel, { color: colors.textPrimary }]}>Profil Compétiteur</Text>
              <Text style={[styles.competitionSublabel, { color: colors.textMuted }]}>Catégorie, ceinture, sport</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.competitionItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/competitions')}
          >
            <View style={[styles.competitionIcon, { backgroundColor: '#06B6D420' }]}>
              <Calendar size={20} color="#06B6D4" />
            </View>
            <View style={styles.competitionContent}>
              <Text style={[styles.competitionLabel, { color: colors.textPrimary }]}>Compétitions</Text>
              <Text style={[styles.competitionSublabel, { color: colors.textMuted }]}>Gérer mes compétitions à venir</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.competitionItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/palmares')}
          >
            <View style={[styles.competitionIcon, { backgroundColor: '#F59E0B20' }]}>
              <Award size={20} color="#F59E0B" />
            </View>
            <View style={styles.competitionContent}>
              <Text style={[styles.competitionLabel, { color: colors.textPrimary }]}>Palmarès</Text>
              <Text style={[styles.competitionSublabel, { color: colors.textMuted }]}>Mes combats et statistiques</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.competitionItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/cut-mode')}
          >
            <View style={[styles.competitionIcon, { backgroundColor: '#EF444420' }]}>
              <TrendingDown size={20} color="#EF4444" />
            </View>
            <View style={styles.competitionContent}>
              <Text style={[styles.competitionLabel, { color: colors.textPrimary }]}>Mode Cut</Text>
              <Text style={[styles.competitionSublabel, { color: colors.textMuted }]}>Gestion du poids pour la pesée</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.competitionItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/hydration')}
          >
            <View style={[styles.competitionIcon, { backgroundColor: '#3B82F620' }]}>
              <Droplet size={20} color="#3B82F6" />
            </View>
            <View style={styles.competitionContent}>
              <Text style={[styles.competitionLabel, { color: colors.textPrimary }]}>Hydratation Cut</Text>
              <Text style={[styles.competitionSublabel, { color: colors.textMuted }]}>Protocole hydratation compétition</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Motivational Quote */}
        <View style={[styles.quoteCard, { borderColor: isDark ? 'rgba(0, 214, 143, 0.3)' : COLORS.accentMuted }]}>
          <LinearGradient
            colors={isDark ? ['rgba(0, 214, 143, 0.15)', 'rgba(0, 214, 143, 0.08)'] : ['rgba(0, 214, 143, 0.1)', 'rgba(0, 214, 143, 0.05)']}
            style={styles.quoteGradient}
          >
            <Trophy size={24} color={colors.accent} />
            <Text style={[styles.quoteText, { color: colors.textPrimary }]}>
              "La victoire appartient au plus persévérant"
            </Text>
            <Text style={[styles.quoteAuthor, { color: colors.accent }]}>Napoléon Bonaparte</Text>
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
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    letterSpacing: -0.5,
  },
  statBadgeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: '#000',
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
});
