// ============================================
// YOROI - CITATION + CARTE RANG
// Citation en haut, rang compact avec avatar côté
// ============================================

import React, { useRef, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, ChevronRight } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentRank, getNextRank, getRankProgress, getDaysToNextRank } from '@/lib/ranks';
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const LEVEL_MAP: Record<string, number> = {
  ashigaru: 1, bushi: 2, samurai: 3, ronin: 4, shogun: 5,
};

interface RankCitationCardProps {
  streak: number;
  dailyQuote?: string | null;
  avatarUri?: string | null;
}

const RankCitationCard: React.FC<RankCitationCardProps> = memo(({ streak, dailyQuote, avatarUri }) => {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();

  const rank = useMemo(() => getCurrentRank(streak), [streak]);
  const nextRank = useMemo(() => getNextRank(streak), [streak]);
  const progress = useMemo(() => getRankProgress(streak), [streak]);
  const daysToNext = useMemo(() => getDaysToNextRank(streak), [streak]);
  const level = LEVEL_MAP[rank.id] || 1;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.timing(barProgress, { toValue: progress, duration: 1000, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress]);

  const barWidth = barProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

      {/* ═══ CITATION DU JOUR ═══ */}
      {dailyQuote ? (
        <View style={[styles.card, styles.quoteCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.quoteLabel, { color: colors.textMuted }]}>
            {t('home.quoteOfTheDay') || 'CITATION DU JOUR'}
          </Text>
          <Text style={[styles.quoteText, { color: colors.textPrimary }]} numberOfLines={4}>
            "{dailyQuote}"
          </Text>
        </View>
      ) : null}

      {/* ═══ CARTE RANG ═══ */}
      <TouchableOpacity
        onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/gamification'); }}
        activeOpacity={0.9}
      >
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.rankRow}>

            {/* Avatar gauche */}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); impactAsync(ImpactFeedbackStyle.Light); router.push('/avatar-selection' as any); }}
              activeOpacity={0.8}
              style={styles.avatarWrap}
            >
              <View style={[styles.avatarFrame, { borderColor: isDark ? '#FFFFFF' : '#000000', backgroundColor: '#FFFFFF' }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={32} color="#CCC" />
                  </View>
                )}
              </View>
              <View style={[styles.levelBadge, { backgroundColor: rank.color }]}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </TouchableOpacity>

            {/* Infos droite */}
            <View style={styles.infoCol}>
              {/* Ligne 1: Rang + badge streak */}
              <View style={styles.nameRow}>
                <Text style={[styles.rankName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {rank.name}
                </Text>
                <View style={[styles.streakChip, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                  <Flame size={10} color="#F97316" fill="#F97316" />
                  <Text style={styles.streakChipText}>{streak}j</Text>
                </View>
              </View>

              {/* Ligne 2: Japonais */}
              <Text style={[styles.rankJp, { color: colors.textMuted }]}>{rank.nameJp}</Text>

              {/* Ligne 3: Barre progression */}
              <View style={styles.progressRow}>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Animated.View style={[styles.progressFill, { width: barWidth }]}>
                    <LinearGradient
                      colors={[rank.color, `${rank.color}BB`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                </View>
              </View>

              {/* Ligne 4: Prochain rang */}
              {nextRank ? (
                <View style={styles.nextRow}>
                  <View style={[styles.nextDot, { backgroundColor: nextRank.color }]} />
                  <Text style={[styles.nextText, { color: colors.textMuted }]}>
                    <Text style={{ fontWeight: '800', color: nextRank.color }}>{nextRank.name}</Text>
                    {' '}dans {daysToNext} jours
                  </Text>
                </View>
              ) : (
                <Text style={[styles.nextText, { color: rank.color, fontWeight: '800' }]}>Rang maximum atteint</Text>
              )}
            </View>

            <ChevronRight size={16} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  // Citation
  quoteCard: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  quoteLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  quoteText: { fontSize: 13.5, fontWeight: '500', fontStyle: 'italic', lineHeight: 21, letterSpacing: 0.2, textAlign: 'center' },

  // Rang row
  rankRow: { flexDirection: 'row', alignItems: 'center' },

  // Avatar
  avatarWrap: { position: 'relative', marginRight: 12, marginVertical: -6 },
  avatarFrame: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2.5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: '92%', height: '92%', borderRadius: 50, resizeMode: 'contain' } as any,
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  levelBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
  },
  levelText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },

  // Info column
  infoCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankName: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  streakChipText: { fontSize: 11, fontWeight: '800', color: '#F97316' },
  rankJp: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Progress
  progressRow: { marginTop: 6 },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

  // Next rank
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  nextDot: { width: 6, height: 6, borderRadius: 3 },
  nextText: { fontSize: 11, fontWeight: '500' },
});

export { RankCitationCard };
export default RankCitationCard;
