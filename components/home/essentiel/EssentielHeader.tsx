import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Pressable } from 'react-native';
import { Sparkles, Flame, Zap, Trophy, ChevronRight } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ViewModeSwitch } from '@/components/home/ViewModeSwitch';
import { ViewMode } from '@/hooks/useViewMode';
import AvatarDisplay from '@/components/AvatarDisplay';
import { Profile, calculateStreak, getWeights, getTrainings } from '@/lib/database';
import { getCurrentRank } from '@/lib/ranks';
import { getLevel } from '@/lib/gamification';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { logger } from '@/lib/security/logger';

// Clés des citations motivantes (pour i18n)
const quoteKeys = [
  'home.quotes.quote1',
  'home.quotes.quote2',
  'home.quotes.quote3',
  'home.quotes.quote4',
  'home.quotes.quote5',
];

// Fonction pour obtenir la clé de salutation selon l'heure
const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'home.greetingMorning';
  if (hour < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
};

interface EssentielHeaderProps {
  userName?: string;
  viewMode?: ViewMode;
  onToggleMode?: () => void;
  profile?: Profile | null;
  refreshTrigger?: number;
}

export const EssentielHeader: React.FC<EssentielHeaderProps> = ({
  userName = 'Champion',
  viewMode = 'essentiel',
  onToggleMode,
  profile,
  refreshTrigger = 0,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [quoteKey, setQuoteKey] = useState(quoteKeys[0]);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Charger les données de gamification
  const loadGamificationData = useCallback(async () => {
    try {
      const [streakDays, weights, trainings] = await Promise.all([
        calculateStreak(),
        getWeights(365),
        getTrainings(),
      ]);
      setStreak(streakDays);
      const points = weights.length * 5 + trainings.length * 20 +
        (streakDays >= 100 ? 500 : streakDays >= 30 ? 200 : streakDays >= 7 ? 50 : 0);
      setTotalPoints(points);
    } catch (error) {
      logger.error('Erreur chargement gamification:', error);
    }
  }, []);

  useEffect(() => {
    const randomQuoteKey = quoteKeys[Math.floor(Math.random() * quoteKeys.length)];
    setQuoteKey(randomQuoteKey);
    loadGamificationData();
  }, [loadGamificationData]);

  const currentRank = getCurrentRank(streak);
  const currentLevel = getLevel(totalPoints);

  const handleGamificationPress = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push('/gamification');
  };

  return (
    <>
      {/* Avatar + Salutation + Photo profil */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.push('/avatar-selection')} activeOpacity={0.8}>
          <AvatarDisplay size="small" refreshTrigger={refreshTrigger} />
        </TouchableOpacity>

        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{t(getGreetingKey())}</Text>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{userName}</Text>
            {onToggleMode && (
              <ViewModeSwitch mode={viewMode} onToggle={onToggleMode} />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.profilePhotoContainer, { borderColor: colors.border }]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          {profile?.profile_photo ? (
            <Image
              source={{ uri: profile.profile_photo }}
              style={styles.profilePhotoImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={28} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Badges Rang & Niveau - Cliquables vers Gamification */}
      <Pressable
        style={({ pressed }) => [
          styles.gamificationBanner,
          pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
        onPress={handleGamificationPress}
      >
        <LinearGradient
          colors={isDark ? ['#1F1F3D', '#16213E'] : ['#F0F4FF', '#E8EEFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gamificationGradient}
        >
          {/* Rang */}
          <View style={styles.gamificationItem}>
            <View style={[styles.rankBadge, { backgroundColor: currentRank.color }]}>
              <Trophy size={14} color="#FFFFFF" />
            </View>
            <View style={styles.gamificationInfo}>
              <Text style={[styles.gamificationLabel, { color: colors.textMuted }]}>{t('home.rank')}</Text>
              <Text style={[styles.gamificationValue, { color: currentRank.color }]}>{currentRank.name}</Text>
            </View>
          </View>

          {/* Séparateur */}
          <View style={[styles.gamificationDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

          {/* Streak */}
          <View style={styles.gamificationItem}>
            <View style={[styles.streakBadge, { backgroundColor: '#F9731620' }]}>
              <Flame size={14} color="#F97316" />
            </View>
            <View style={styles.gamificationInfo}>
              <Text style={[styles.gamificationLabel, { color: colors.textMuted }]}>{t('home.streak')}</Text>
              <Text style={[styles.gamificationValue, { color: '#F97316' }]}>{streak} {t('common.days')}</Text>
            </View>
          </View>

          {/* Séparateur */}
          <View style={[styles.gamificationDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

          {/* Niveau XP - Affiche le nom du niveau (ex: Athlète) et les XP */}
          <View style={styles.gamificationItem}>
            <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
              <Zap size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View style={styles.gamificationInfo}>
              <Text style={[styles.gamificationLabel, { color: colors.textMuted }]}>XP</Text>
              <Text style={[styles.gamificationValue, { color: currentLevel.color }]}>{currentLevel.name}</Text>
            </View>
          </View>

          {/* Flèche pour indiquer que c'est cliquable */}
          <ChevronRight size={18} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </LinearGradient>
      </Pressable>

      {/* Citation */}
      <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
        <Sparkles size={18} color="#F59E0B" />
        <Text style={[styles.quote, { color: colors.textSecondary }]} numberOfLines={2}>"{t(quoteKey)}"</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  profilePhotoContainer: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhotoImage: {
    width: 85,
    height: 85,
  },

  // Gamification Banner
  gamificationBanner: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gamificationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  gamificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gamificationInfo: {
    flex: 1,
  },
  gamificationLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gamificationValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  gamificationDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // Citation
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  quote: {
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 22,
  },
});
