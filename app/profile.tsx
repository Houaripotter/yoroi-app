import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  User,
  Target,
  Scale,
  Ruler,
  Trophy,
  Flame,
  Calendar,
  Save,
  Edit3,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressionCard } from '@/components/ProgressionCard';
import { useTheme } from '@/lib/ThemeContext';
import {
  getProfile,
  saveProfile,
  getWeightProgress,
  calculateStreak,
  getTrainingStats,
  getUnlockedAchievements,
  Profile,
} from '@/lib/database';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress } from '@/lib/ranks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// PROFIL GUERRIER
// ============================================

export default function ProfileScreen() {
  const { colors, gradients } = useTheme();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [weightProgress, setWeightProgress] = useState<any>(null);
  const [trainingStats, setTrainingStats] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');

  const loadData = useCallback(async () => {
    try {
      const profileData = await getProfile();
      setProfile(profileData);

      if (profileData) {
        setName(profileData.name || '');
        setHeightCm(profileData.height_cm?.toString() || '');
        setTargetWeight(profileData.target_weight?.toString() || '');
        setStartWeight(profileData.start_weight?.toString() || '');
      }

      const streakDays = await calculateStreak();
      setStreak(streakDays);

      const progress = await getWeightProgress();
      setWeightProgress(progress);

      const stats = await getTrainingStats();
      setTrainingStats(stats);

      const unlockedBadges = await getUnlockedAchievements();
      setAchievements(unlockedBadges);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
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
      });

      await loadData();
      setIsEditing(false);
      Alert.alert('Succes', 'Profil mis a jour');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
    }
  };

  const totalTrainings = trainingStats.reduce((sum, s) => sum + s.count, 0);

  return (
    <ScreenWrapper noPadding>
      <Header
        title="Profil Guerrier"
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            style={styles.editButton}
          >
            <Edit3 size={20} color={colors.gold} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* AVATAR & RANG */}
        <Card variant="gold" style={styles.heroCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={gradients.gold}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarIcon}>{rank.icon}</Text>
            </LinearGradient>
          </View>

          <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.name || 'Guerrier'}</Text>

          <Badge
            label={rank.name}
            icon={rank.icon}
            color={rank.color}
            size="md"
          />

          <Text style={[styles.rankJp, { color: colors.textSecondary }]}>{rank.nameJp}</Text>

          {/* Streak */}
          <View style={[styles.streakContainer, { backgroundColor: colors.goldMuted }]}>
            <Flame size={20} color={colors.gold} />
            <Text style={[styles.streakValue, { color: colors.gold }]}>{streak}</Text>
            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>jours de suite</Text>
          </View>
        </Card>

        {/* PROGRESSION CARD - GAMIFICATION */}
        <ProgressionCard
          streak={streak}
          totalWorkouts={totalTrainings}
          totalMeasurements={weightProgress?.measurementsCount || 0}
          badgesUnlocked={achievements.length}
          totalBadges={12}
          weightLost={weightProgress?.lost > 0 ? weightProgress.lost : 0}
        />

        {/* INFOS PERSONNELLES */}
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Informations</Text>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ton nom de guerrier"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Taille (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="175"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids depart (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                    value={startWeight}
                    onChangeText={setStartWeight}
                    placeholder="85.0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Objectif (kg)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary, borderColor: colors.border }]}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="75.0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={gradients.gold}
                  style={styles.saveButtonGradient}
                >
                  <Save size={20} color={colors.background} />
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>Enregistrer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Ruler size={18} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Taille</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {profile?.height_cm ? `${profile.height_cm} cm` : '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Scale size={18} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Poids depart</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {weightProgress?.start ? `${weightProgress.start} kg` : '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Target size={18} color={colors.gold} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Objectif</Text>
                <Text style={[styles.infoValue, { color: colors.gold }]}>
                  {weightProgress?.target ? `${weightProgress.target} kg` : '-'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={18} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Debut</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {profile?.start_date
                    ? format(new Date(profile.start_date), 'd MMMM yyyy', { locale: fr })
                    : '-'}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* STATISTIQUES */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Statistiques</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {weightProgress?.lost > 0 ? weightProgress.lost.toFixed(1) : '0'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>kg conquis</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{totalTrainings}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>entrainements</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{achievements.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>badges</Text>
            </View>
          </View>

          {/* Progression */}
          {weightProgress && weightProgress.target && (
            <View style={[styles.progressSection, { borderTopColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progression vers l'objectif</Text>
                <Text style={[styles.progressPercent, { color: colors.gold }]}>
                  {weightProgress.progress.toFixed(0)}%
                </Text>
              </View>
              <ProgressBar progress={weightProgress.progress} height={10} />
              <Text style={[styles.progressRemaining, { color: colors.textMuted }]}>
                Reste {weightProgress.remaining > 0 ? weightProgress.remaining.toFixed(1) : '0'} kg
              </Text>
            </View>
          )}
        </Card>

        {/* ENTRAINEMENTS */}
        {trainingStats.length > 0 && (
          <Card style={styles.trainingsCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Entrainements</Text>
            <View style={styles.trainingsGrid}>
              {trainingStats.map((stat, index) => (
                <View key={index} style={styles.trainingItem}>
                  <View
                    style={[
                      styles.trainingIcon,
                      { backgroundColor: stat.club_color || colors.cardHover },
                    ]}
                  >
                    <Text style={styles.trainingEmoji}>
                      {stat.sport === 'jjb' ? '🥋' :
                       stat.sport === 'musculation' ? '💪' :
                       stat.sport === 'running' ? '🏃' :
                       stat.sport === 'mma' ? '🥊' : '🏋️'}
                    </Text>
                  </View>
                  <Text style={[styles.trainingSport, { color: colors.textSecondary }]}>{stat.sport.toUpperCase()}</Text>
                  <Text style={[styles.trainingCount, { color: colors.textPrimary }]}>{stat.count}x</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// Constantes non-thématiques
const RADIUS = { md: 12 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // HERO CARD
  heroCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 40,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  rankJp: {
    fontSize: 14,
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 14,
  },
  rankProgressContainer: {
    width: '100%',
    marginTop: 20,
  },
  rankProgressText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  rankProgressDays: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  // INFO CARD
  infoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoList: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },

  // EDIT FORM
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // STATS CARD
  statsCard: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressRemaining: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },

  // TRAININGS CARD
  trainingsCard: {
    marginBottom: 16,
  },
  trainingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trainingItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  trainingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingEmoji: {
    fontSize: 24,
  },
  trainingSport: {
    fontSize: 10,
    fontWeight: '700',
  },
  trainingCount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
