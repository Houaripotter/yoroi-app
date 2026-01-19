// ============================================
// YOROI - FICHE COMBATTANT (FIGHTER CARD)
// ============================================
// Carte de stats style UFC pour partager sur Instagram
// Design premium avec stats et infos combattant

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Share,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import {
  ChevronLeft,
  Share2,
  Download,
  Trophy,
  Flame,
  Target,
  Swords,
  Calendar,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { getUserSettings, getLatestMeasurement } from '@/lib/storage';
import { getCurrentRank, RANKS } from '@/lib/ranks';
import { getTrainingStats, calculateStreak, getProfile } from '@/lib/database';
import { getGreeting, YOROI_VOCAB } from '@/lib/teamYoroi';
import { getAllGoalsProgress, getGlobalGoalStats, GoalProgress, GlobalGoalStats } from '@/lib/trainingGoalsService';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.6; // Ratio Instagram story friendly

interface FighterStats {
  name: string;
  nickname?: string;
  weight: number;
  targetWeight?: number;
  height: number;
  rank: string;
  rankLevel: number;
  xp: number;
  streak: number;
  totalTrainings: number;
  totalMinutes: number;
  discipline: string;
  joinDate: string;
  weightLost: number;
  badges: number;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function FighterCardScreen() {
  const { colors, isDark, gradients } = useTheme();
  const { locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const cardRef = useRef<View>(null);

  const [stats, setStats] = useState<FighterStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([]);
  const [globalGoalStats, setGlobalGoalStats] = useState<GlobalGoalStats | null>(null);

  // Charger les stats du combattant
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

      // Charger les objectifs
      const [goalsData, globalStats] = await Promise.all([
        getAllGoalsProgress(),
        getGlobalGoalStats(),
      ]);
      setGoalsProgress(goalsData);
      setGlobalGoalStats(globalStats);

      // Calculer stats
      const totalTrainings = trainingStats?.reduce((acc: number, s: any) => acc + (s.count || 0), 0) || 0;
      const totalMinutes = trainingStats?.reduce((acc: number, s: any) => acc + (s.total_duration || 0), 0) || 0;

      // Discipline principale
      const topDiscipline = trainingStats?.[0]?.sport || 'Guerrier';

      // Date d'inscription (simulee)
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
        targetWeight: settings.targetWeight || profile?.target_weight,
        height: settings.height || profile?.height_cm || 175,
        rank: rank.name,
        rankLevel: RANKS.findIndex(r => r.id === rank.id) + 1,
        xp: streakData || 0,
        streak: streakData || 0,
        totalTrainings,
        totalMinutes: Math.round(totalMinutes),
        discipline: topDiscipline,
        joinDate: joinDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
        weightLost: Math.round(weightLost * 10) / 10,
        badges: 0, // À récupérer depuis la base de données
      });
    } catch (error) {
      logger.error('Erreur chargement stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder la carte en image
  const saveCard = async () => {
    try {
      setIsSaving(true);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (!cardRef.current) {
        showPopup('Erreur', 'Impossible de capturer la carte', [
          { text: 'OK', style: 'primary' }
        ]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Demander permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showPopup('Permission requise', 'Autorisation necessaire pour sauvegarder l\'image', [
          { text: 'OK', style: 'primary' }
        ]);
        return;
      }

      // Sauvegarder dans la galerie
      await MediaLibrary.saveToLibraryAsync(uri);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showPopup('Sauvegarde!', 'Fiche Combattant enregistree dans ta galerie!', [
        { text: 'OK', style: 'primary' }
      ]);
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      showPopup('Erreur', 'Impossible de sauvegarder la carte', [
        { text: 'OK', style: 'primary' }
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  // Partager la carte
  const shareCard = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (!cardRef.current) {
        showPopup('Erreur', 'Impossible de capturer la carte', [
          { text: 'OK', style: 'primary' }
        ]);
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Verifier si le partage est disponible
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager ma Fiche Combattant',
        });
      } else {
        // Fallback vers Share API native
        await Share.share({
          title: 'Ma Fiche Combattant Yoroi',
          message: `Je suis ${stats?.rank} dans la Team Yoroi! Rejoins-moi!`,
          url: uri,
        });
      }
    } catch (error) {
      logger.error('Erreur partage:', error);
    }
  };

  if (isLoading || !stats) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement de ta fiche...
          </Text>
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

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          FICHE COMBATTANT
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Fighter Card */}
        <View
          ref={cardRef}
          style={[styles.card]}
          collapsable={false}
        >
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e', '#0f0f23'] : ['#1a1a2e', '#2d3561', '#1a1a2e']}
            style={styles.cardGradient}
          >
            {/* Top Banner */}
            <View style={styles.cardBanner}>
              <LinearGradient
                colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bannerGradient}
              >
                <Swords size={16} color="#1a1a2e" />
                <Text style={styles.bannerText}>TEAM Yoroi</Text>
                <Swords size={16} color="#1a1a2e" />
              </LinearGradient>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              {/* Avatar Circle */}
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                  style={styles.avatarBorder}
                >
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarEmoji}>
                      {stats.rank.includes('Shogun') || stats.rank.includes('Shōgun') ? '🏯' :
                       stats.rank.includes('Ronin') || stats.rank.includes('Rōnin') ? '' :
                       stats.rank.includes('Samurai') || stats.rank.includes('Samouraï') ? '' :
                       stats.rank.includes('Bushi') ? '🥷' : ''}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Name & Rank */}
              <Text style={styles.fighterName}>{stats.name.toUpperCase()}</Text>
              {stats.nickname && (
                <Text style={styles.fighterNickname}>"{stats.nickname}"</Text>
              )}
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{stats.rank.toUpperCase()}</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Row 1 */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Target size={16} color="#D4AF37" />
                  <Text style={styles.statValue}>{stats.weight} kg</Text>
                  <Text style={styles.statLabel}>Poids</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <TrendingUp size={16} color="#D4AF37" />
                  <Text style={styles.statValue}>{stats.height} cm</Text>
                  <Text style={styles.statLabel}>Taille</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Flame size={16} color="#EF4444" />
                  <Text style={styles.statValue}>{stats.streak}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>

              {/* Row 2 */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Swords size={16} color="#D4AF37" />
                  <Text style={styles.statValue}>{stats.totalTrainings}</Text>
                  <Text style={styles.statLabel}>Combats</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Zap size={16} color="#D4AF37" />
                  <Text style={styles.statValue}>{stats.xp}</Text>
                  <Text style={styles.statLabel}>XP</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Award size={16} color="#D4AF37" />
                  <Text style={styles.statValue}>{stats.badges}</Text>
                  <Text style={styles.statLabel}>Badges</Text>
                </View>
              </View>
            </View>

            {/* Discipline Badge */}
            <View style={styles.disciplineContainer}>
              <Text style={styles.disciplineLabel}>DISCIPLINE PRINCIPALE</Text>
              <View style={styles.disciplineBadge}>
                <Text style={styles.disciplineText}>{stats.discipline.toUpperCase()}</Text>
              </View>
            </View>

            {/* Weight Progress */}
            {stats.weightLost > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBadge}>
                  <TrendingUp size={14} color="#22C55E" />
                  <Text style={styles.progressText}>
                    -{stats.weightLost} kg depuis le debut
                  </Text>
                </View>
              </View>
            )}

            {/* Objectifs Section */}
            {globalGoalStats && globalGoalStats.activeGoals > 0 && (
              <View style={styles.goalsContainer}>
                <Text style={styles.goalsTitle}>OBJECTIFS HEBDO</Text>
                <View style={styles.goalsRow}>
                  <View style={styles.goalsStat}>
                    <Text style={styles.goalsValue}>
                      {globalGoalStats.totalWeeklyCompleted}/{globalGoalStats.totalWeeklyTarget}
                    </Text>
                    <Text style={styles.goalsLabel}>sessions</Text>
                  </View>
                  <View style={styles.goalsDivider} />
                  <View style={styles.goalsStat}>
                    <Text style={[styles.goalsValue, { color: '#22C55E' }]}>
                      {globalGoalStats.goalsOnTrack}
                    </Text>
                    <Text style={styles.goalsLabel}>on track</Text>
                  </View>
                  <View style={styles.goalsDivider} />
                  <View style={styles.goalsStat}>
                    <Text style={styles.goalsValue}>
                      {Math.round(globalGoalStats.overallWeekPercent)}%
                    </Text>
                    <Text style={styles.goalsLabel}>objectif</Text>
                  </View>
                </View>
                <View style={styles.goalsProgressBar}>
                  <View
                    style={[
                      styles.goalsProgressFill,
                      { width: `${Math.min(100, globalGoalStats.overallWeekPercent)}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.footerItem}>
                <Calendar size={12} color="#6B7280" />
                <Text style={styles.footerText}>Membre depuis {stats.joinDate}</Text>
              </View>
              <View style={styles.footerDot} />
              <Text style={styles.footerBrand}>Yoroi</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={saveCard}
            disabled={isSaving}
          >
            <Download size={20} color={colors.textPrimary} />
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              Sauvegarder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gold }]}
            onPress={shareCard}
          >
            <Share2 size={20} color={colors.background} />
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              Partager
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.tipTitle, { color: colors.gold }]}>
            Partage ta progression!
          </Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Publie ta Fiche Combattant sur Instagram et inspire la communaute avec ton parcours de champion.
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  cardGradient: {
    padding: 20,
    paddingTop: 0,
  },

  // Banner
  cardBanner: {
    marginHorizontal: -20,
    marginBottom: 20,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#1a1a2e',
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 42,
  },
  fighterName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  fighterNickname: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#D4AF37',
    marginTop: 4,
  },
  rankBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 2,
  },

  // Stats Grid
  statsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },

  // Discipline
  disciplineContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  disciplineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 2,
    marginBottom: 8,
  },
  disciplineBadge: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 25,
  },
  disciplineText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 1,
  },

  // Progress
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#6B7280',
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 2,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Tips
  tipCard: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Goals
  goalsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  goalsTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D4AF37',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
  },
  goalsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  goalsStat: {
    flex: 1,
    alignItems: 'center',
  },
  goalsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalsLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  goalsDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  goalsProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalsProgressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 3,
  },
});
