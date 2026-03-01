import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Image,
  Pressable,
  Keyboard,
  DeviceEventEmitter,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync } from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
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
  Swords,
  Image as ImageIcon,
} from 'lucide-react-native';
import {
  getProfile,
  saveProfile,
  getWeightProgress,
  calculateStreak,
  Profile,
  getWeights,
  getTrainings,
} from '@/lib/database';
import { getCurrentRank } from '@/lib/ranks';
import { getLevel, calculateAndStoreUnifiedPoints } from '@/lib/gamification';
import { getUnlockedBadges } from '@/lib/badges';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import logger from '@/lib/security/logger';
import { ContextualTip } from '@/components/ContextualTip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// PROFIL TAB - GAMING STYLE
// ============================================

export default function ProfileTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, screenBackground, screenText, screenTextMuted } = useTheme();
  const { t } = useI18n();
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

  const [isSaving, setIsSaving] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);

  const calculateAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
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

      const [weightsHistory, allTrainings, badges] = await Promise.all([
        getWeights(),
        getTrainings(),
        getUnlockedBadges(),
      ]);

      const points = await calculateAndStoreUnifiedPoints(weightsHistory?.length || 0, allTrainings?.length || 0, streakDays);
      setTotalPoints(points);
      setUnlockedBadgesCount(badges?.length || 0);
    } catch (error) {
      logger.error('Error loading profile:', error);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const rank = getCurrentRank(streak);
  const level = getLevel(totalPoints);

  const handleSave = async () => {
    Keyboard.dismiss();
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
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
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
    if (isPickingPhoto) return;
    setIsPickingPhoto(true);
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusee', 'Acces a la camera requis pour prendre une photo.');
        setIsPickingPhoto(false);
        return;
      }
      const result = await launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: withEditing,
        aspect: withEditing ? [1, 1] : undefined,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
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
        DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      }
    } catch (error) {
      logger.error('[Profile] Erreur prise de photo:', error);
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const pickProfilePhoto = async (withEditing: boolean = true) => {
    if (isPickingPhoto) return;
    setIsPickingPhoto(true);
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission refusee', 'Acces a la galerie requis.');
        setIsPickingPhoto(false);
        return;
      }
      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: withEditing,
        aspect: withEditing ? [1, 1] : undefined,
        quality: 0.8,
        selectionLimit: 1,
      });
      if (!result.canceled && result.assets?.[0]) {
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
        DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      }
    } catch (error) {
      logger.error('[Profile] Erreur selection photo:', error);
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
          text: t('profile.takePhoto') || 'Prendre une photo',
          style: 'primary',
          onPress: () => setTimeout(() => takeProfilePhoto(true), 500),
        },
        {
          text: t('profile.chooseFromGallery') || 'Choisir depuis la galerie',
          style: 'default',
          onPress: () => setTimeout(() => pickProfilePhoto(true), 500),
        },
        { text: t('common.cancel') || 'Annuler', style: 'cancel' },
      ]
    );
  };

  // Quick nav items
  const quickLinks = [
    { label: t('menu.badges') || 'Badges', icon: Award, color: '#FBBF24', route: '/badges' },
    { label: t('menu.ranks') || 'Rangs', icon: Trophy, color: '#10B981', route: '/gamification' },
    { label: t('menu.avatars') || 'Avatar', icon: Sparkles, color: '#8B5CF6', route: '/avatar-selection' },
    { label: t('menu.transformation') || 'Photos', icon: Camera, color: '#F472B6', route: '/photos' },
    { label: t('menu.competitorSpace') || 'Compet', icon: Swords, color: '#EF4444', route: '/competitor-space' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: screenText }]}>{t('profile.title')}</Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.card, borderColor: colors.border }, isEditing && { borderColor: colors.error }]}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X size={18} color={colors.error} />
            ) : (
              <Edit3 size={18} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { borderColor: colors.border }]}>
          <LinearGradient
            colors={[colors.card, colors.background]}
            style={styles.heroGradient}
          >
            {/* Photo */}
            <Pressable onPress={handleChangePhoto} style={({ pressed }) => [{ alignItems: 'center', opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ position: 'relative' }}>
                {profilePhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.accent }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.photoPlaceholder, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                    <User size={40} color={colors.textMuted} />
                  </View>
                )}
                <View style={[styles.cameraBtn, { backgroundColor: colors.accent }]}>
                  <Camera size={14} color={colors.textOnAccent} />
                </View>
              </View>
            </Pressable>

            {/* Nom */}
            {isEditing ? (
              <TextInput
                style={[styles.nameInput, { color: colors.textPrimary, borderBottomColor: colors.accent }]}
                value={name}
                onChangeText={setName}
                placeholder="Ton nom"
                placeholderTextColor={colors.textMuted}
                textAlign="center"
                maxLength={50}
              />
            ) : (
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profile?.name || 'Guerrier'}</Text>
            )}

            {/* Rang Badge */}
            <View style={[styles.rankBadge, { backgroundColor: (rank?.color || colors.accent) + '20' }]}>
              <Trophy size={14} color={rank?.color || colors.accent} strokeWidth={2.5} />
              <Text style={[styles.rankName, { color: rank?.color || colors.accent }]}>{rank?.name || 'Debutant'}</Text>
            </View>

            {/* Date d'inscription */}
            {profile?.start_date && (
              <Text style={[styles.memberSince, { color: colors.textMuted }]}>
                {t('profile.memberSince')} {format(new Date(profile.start_date), 'MMMM yyyy', { locale: fr })}
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* Stats Row - XP, Niveau, Streak, Badges */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Zap size={16} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: colors.accent }]}>{totalPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>XP</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Star size={16} color={colors.gold || colors.accent} strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: colors.gold || colors.accent }]}>{level.level}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('gamification.level')}</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Activity size={16} color="#F59E0B" strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Award size={16} color="#10B981" strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: '#10B981' }]}>{unlockedBadgesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('gamification.badges')}</Text>
          </View>
        </View>

        {/* Poids rapide */}
        {weightProgress?.current && (
          <View style={[styles.weightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.weightRow}>
              <View style={styles.weightItem}>
                <Text style={[styles.weightLabel, { color: colors.textMuted }]}>{t('profile.startingWeight')}</Text>
                <Text style={[styles.weightValue, { color: colors.textPrimary }]}>{weightProgress.start || '-'} kg</Text>
              </View>
              <View style={[styles.weightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.weightItem}>
                <Text style={[styles.weightLabel, { color: colors.textMuted }]}>{t('profile.current')}</Text>
                <Text style={[styles.weightValue, { color: colors.accent }]}>{weightProgress.current} kg</Text>
              </View>
              <View style={[styles.weightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.weightItem}>
                <Text style={[styles.weightLabel, { color: colors.textMuted }]}>{t('profile.goal')}</Text>
                <Text style={[styles.weightValue, { color: colors.success || '#10B981' }]}>{weightProgress.target || '-'} kg</Text>
              </View>
            </View>
          </View>
        )}

        {/* Edit Form */}
        {isEditing && (
          <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('profile.informations')}</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('profile.height')} (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={heightCm}
                  onChangeText={(text) => setHeightCm(text.replace(',', '.'))}
                  placeholder="175"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Date de naissance</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="15/06/1995"
                  placeholderTextColor={colors.textMuted}
                  maxLength={10}
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('profile.startingWeight')} (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={startWeight}
                  onChangeText={(text) => setStartWeight(text.replace(',', '.'))}
                  placeholder="85.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>{t('profile.target')} (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={targetWeight}
                  onChangeText={(text) => setTargetWeight(text.replace(',', '.'))}
                  placeholder="75.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* Goal type */}
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Mon objectif</Text>
            <View style={styles.goalSelector}>
              {[
                { key: 'lose' as const, label: 'Perte', icon: TrendingDown, color: colors.success || '#10B981' },
                { key: 'maintain' as const, label: 'Maintien', icon: Minus, color: colors.info || '#3B82F6' },
                { key: 'gain' as const, label: 'Prise', icon: TrendingUp, color: colors.warning || '#F59E0B' },
              ].map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.goalOption, { backgroundColor: colors.card, borderColor: weightGoal === g.key ? g.color : colors.border }, weightGoal === g.key && { borderWidth: 2 }]}
                  onPress={() => setWeightGoal(g.key)}
                >
                  <g.icon size={18} color={weightGoal === g.key ? g.color : colors.textMuted} />
                  <Text style={[styles.goalText, { color: weightGoal === g.key ? g.color : colors.textPrimary }]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={[colors.accent, colors.accentDark || colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.saveText}>{t('common.save')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Links Grid */}
        <View style={[styles.linksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mon espace</Text>
          <View style={styles.linksGrid}>
            {quickLinks.map((link) => (
              <TouchableOpacity
                key={link.label}
                style={styles.linkItem}
                onPress={() => router.push(link.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.linkIcon, { backgroundColor: link.color + '15' }]}>
                  <link.icon size={20} color={link.color} strokeWidth={2} />
                </View>
                <Text style={[styles.linkLabel, { color: colors.textPrimary }]} numberOfLines={1}>{link.label}</Text>
                <ChevronRight size={14} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <PopupComponent />

      {/* Tip contextuel */}
      <ContextualTip tipId="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  editButton: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Hero Card
  heroCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 16, borderWidth: 1 },
  heroGradient: { paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 24, fontWeight: '800', marginTop: 12, letterSpacing: -0.5 },
  nameInput: { fontSize: 24, fontWeight: '800', marginTop: 12, borderBottomWidth: 2, paddingBottom: 4, minWidth: 150 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 8,
  },
  rankName: { fontSize: 13, fontWeight: '700' },
  memberSince: { fontSize: 13, marginTop: 12, textAlign: 'center' },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1, gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Weight Card
  weightCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  weightRow: { flexDirection: 'row', alignItems: 'center' },
  weightItem: { flex: 1, alignItems: 'center' },
  weightLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  weightValue: { fontSize: 16, fontWeight: '800' },
  weightDivider: { width: 1, height: 32 },

  // Edit Card
  editCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16, letterSpacing: -0.3 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  goalSelector: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 8 },
  goalOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  goalText: { fontSize: 13, fontWeight: '600' },
  saveButton: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Links Card
  linksCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  linksGrid: { gap: 4 },
  linkItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12,
  },
  linkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
});
