// ============================================
// YOROI - CITATION + CARTE RANG
// Citation en haut, rang multi-pages avec avatar
// ============================================

import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, ChevronRight, Trophy, Target, Crown, Shield, Zap } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentRank, getNextRank, getRankProgress, getDaysToNextRank, RANKS } from '@/lib/ranks';
import { getDynamicTitle } from '@/lib/dynamicTitleService';
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const LEVEL_MAP: Record<string, number> = {
  ashigaru: 1, bushi: 2, samurai: 3, ronin: 4, shogun: 5,
};

const PAGES = 4;
const SCREEN_W = Dimensions.get('window').width;

interface RankCitationCardProps {
  streak: number;
  totalPoints: number;
  dailyQuote?: string | null;
  avatarUri?: string | null;
}

const RankCitationCard: React.FC<RankCitationCardProps> = memo(({ streak, totalPoints, dailyQuote, avatarUri }) => {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();

  const rawRank = useMemo(() => getCurrentRank(totalPoints), [totalPoints]);
  // Utiliser la couleur du theme au lieu de la couleur hardcodee du rang
  const rank = useMemo(() => ({ ...rawRank, color: colors.accent }), [rawRank, colors.accent]);
  const rawNextRank = useMemo(() => getNextRank(totalPoints), [totalPoints]);
  // Toujours utiliser la couleur du theme pour le prochain rang (coherence visuelle)
  const nextRank = useMemo(() => {
    if (!rawNextRank) return null;
    return { ...rawNextRank, color: colors.accent };
  }, [rawNextRank, colors.accent]);
  const progress = useMemo(() => getRankProgress(totalPoints), [totalPoints]);
  const pointsToNext = useMemo(() => getDaysToNextRank(totalPoints), [totalPoints]);
  const level = LEVEL_MAP[rank.id] || 1;

  // Titre dynamique calcule depuis streak + totalPoints (approxime les entraînements)
  const approxTrainings = Math.floor(totalPoints / 20); // 20 XP par entraînement en moyenne
  const dynamicTitle = useMemo(
    () => getDynamicTitle(streak, approxTrainings, 0),
    [streak, approxTrainings]
  );

  // Bonus weekend (samedi=6, dimanche=0)
  const isWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Card takes full width minus scrollContent padding (12*2)
  const pageWidth = SCREEN_W - 24;

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

  const handlePageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
    if (page >= 0 && page < PAGES) setCurrentPage(page);
  };

  const goToPage = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * pageWidth, animated: true });
    setCurrentPage(page);
  };

  const navigateToGamification = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push('/gamification');
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

      {/* CITATION DU JOUR - affichée uniquement via notification, pas dans l'UI */}

      {/* CARTE RANG - 4 pages */}
      <View style={[styles.card, styles.rankCard, { backgroundColor: colors.backgroundCard }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handlePageScroll}
          decelerationRate="fast"
        >
          {/* ═══ PAGE 1: Rang actuel ═══ */}
          <TouchableOpacity
            onPress={navigateToGamification}
            activeOpacity={0.9}
            style={[styles.page, { width: pageWidth }]}
          >
            <View style={styles.rankRow}>
              {/* Avatar + Niveau en dessous */}
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); impactAsync(ImpactFeedbackStyle.Light); router.push('/avatar-selection' as any); }}
                activeOpacity={0.8}
                style={styles.avatarCol}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#CCC" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Infos droite */}
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text style={[styles.rankName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {rank.name}
                  </Text>
                  <View style={[styles.streakChip, { backgroundColor: 'rgba(249,115,22,0.12)' }]}>
                    <Flame size={10} color="#F97316" fill="#F97316" />
                    <Text style={styles.streakChipText}>{streak}j</Text>
                  </View>
                </View>

                {/* Titre dynamique + badge weekend */}
                <View style={styles.titleRow}>
                  <View style={[styles.dynamicTitleChip, { backgroundColor: `${rank.color}14` }]}>
                    <Text style={[styles.dynamicTitleText, { color: rank.color }]}>
                      {dynamicTitle.title}
                    </Text>
                  </View>
                  {isWeekend && (
                    <View style={styles.weekendBadge}>
                      <Zap size={8} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.weekendBadgeText}>Week-end +50% XP</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.rankJp, { color: colors.textMuted }]}>{rank.nameJp}</Text>

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

                {nextRank ? (
                  <View style={styles.nextRow}>
                    <View style={[styles.nextDot, { backgroundColor: rank.color }]} />
                    <Text style={[styles.nextText, { color: colors.textMuted }]}>
                      <Text style={{ fontWeight: '800', color: rank.color }}>{nextRank.name}</Text>
                      {' '}{pointsToNext} XP restants
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.nextText, { color: rank.color, fontWeight: '800' }]}>Rang maximum atteint</Text>
                )}

                {/* Description + récompense du rang actuel */}
                {rank.description && (
                  <Text style={[styles.rankDescription, { color: colors.textMuted, marginTop: 5 }]} numberOfLines={2}>
                    {rank.description}
                  </Text>
                )}
{/* reward chip supprime : info non factuelle */}
              </View>

              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* ═══ PAGE 2: Stats Serie ═══ */}
          <TouchableOpacity
            onPress={navigateToGamification}
            activeOpacity={0.9}
            style={[styles.page, { width: pageWidth }]}
          >
            <View style={styles.pageInner}>
              <View style={styles.pageHeader}>
                <Flame size={16} color="#F97316" fill="#F97316" />
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Serie & Progression</Text>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.statValue, { color: '#F97316' }]}>{totalPoints}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>XP</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.statValue, { color: rank.color }]}>{Math.round(progress)}%</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Progression</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{level}/5</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rang</Text>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', height: 5 }]}>
                  <View style={[styles.progressFill, { width: `${(level / 5) * 100}%`, height: '100%' }]}>
                    <LinearGradient
                      colors={[rank.color, `${rank.color}BB`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* ═══ PAGE 3: Prochain rang ═══ */}
          <TouchableOpacity
            onPress={navigateToGamification}
            activeOpacity={0.9}
            style={[styles.page, { width: pageWidth }]}
          >
            <View style={styles.pageInner}>
              <View style={styles.pageHeader}>
                <Target size={16} color={nextRank?.color || rank.color} />
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                  {nextRank ? 'Prochain rang' : 'Rang maximum'}
                </Text>
              </View>

              {nextRank ? (
                <View style={styles.centeredContent}>
                  <View style={[styles.rankBadgeIcon, { backgroundColor: `${nextRank.color}15` }]}>
                    <Trophy size={22} color={nextRank.color} />
                  </View>
                  <Text style={[styles.bigRankName, { color: nextRank.color }]}>{nextRank.name}</Text>
                  <Text style={[styles.rankJpSmall, { color: colors.textMuted }]}>{nextRank.nameJp}</Text>
                  <View style={[styles.daysChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[styles.daysChipText, { color: colors.textSecondary }]}>
                      Encore <Text style={{ fontWeight: '800', color: nextRank.color }}>{pointsToNext} XP</Text>
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.centeredContent}>
                  <View style={[styles.rankBadgeIcon, { backgroundColor: `${rank.color}15` }]}>
                    <Crown size={22} color={rank.color} />
                  </View>
                  <Text style={[styles.bigRankName, { color: rank.color }]}>SHOGUN</Text>
                  <Text style={[styles.rankJpSmall, { color: colors.textMuted }]}>Rang maximum atteint</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* ═══ PAGE 4: Tous les rangs (scrollable) ═══ */}
          <View style={[styles.page, { width: pageWidth }]}>
            <View style={styles.pageHeader}>
              <Shield size={16} color={colors.textPrimary} />
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Tous les rangs</Text>
            </View>

            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.innerScroll}
            >
              <TouchableOpacity onPress={navigateToGamification} activeOpacity={0.9}>
                <View style={styles.allRanksList}>
                  {RANKS.map((r) => {
                    const isCurrent = r.id === rank.id;
                    const isUnlocked = totalPoints >= r.minPoints;
                    const displayColor = isCurrent ? colors.accent : r.color;
                    return (
                      <View key={r.id} style={[styles.allRanksRow, isCurrent && { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderRadius: 10, padding: 8, margin: -4 }]}>
                        <View style={[styles.allRanksDot, { backgroundColor: isUnlocked ? displayColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }]} />
                        <Text style={[styles.allRanksName, { color: isCurrent ? colors.accent : (isUnlocked ? colors.textPrimary : colors.textMuted), fontWeight: isCurrent ? '900' : '600' }]}>
                          {r.name}
                        </Text>
                        <Text style={[styles.allRanksDays, { color: colors.textMuted }]}>{r.minPoints} XP</Text>
                        {isCurrent && (
                          <View style={[styles.currentTag, { backgroundColor: `${colors.accent}20` }]}>
                            <Text style={[styles.currentTagText, { color: colors.accent }]}>Actuel</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>

        </ScrollView>

        {/* Dots */}
        <View style={styles.dots}>
          {Array.from({ length: PAGES }).map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToPage(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[
                styles.dot,
                {
                  width: currentPage === i ? 7 : 5,
                  height: currentPage === i ? 7 : 5,
                  backgroundColor: currentPage === i
                    ? colors.companion
                    : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                },
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 0,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  rankCard: {
    padding: 0,
    overflow: 'visible',
  },

  // Citation
  quoteCard: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  quoteLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  quoteText: { fontSize: 15.5, fontWeight: '500', fontStyle: 'italic', lineHeight: 23, letterSpacing: 0.2, textAlign: 'center' },

  // Pages - compact
  page: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16 },
  pageInner: { flex: 1 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  pageTitle: { fontSize: 13, fontWeight: '800' },

  // Rang row (Page 1)
  rankRow: { flexDirection: 'row', alignItems: 'center' },

  // Avatar column - image en haut, "Niveau X" en dessous
  avatarCol: { alignItems: 'center', marginRight: 12 },
  avatarImg: { width: 90, height: 90, resizeMode: 'contain' } as any,
  avatarPlaceholder: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 45 },
  levelBadge: {
    marginTop: 2,
    paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  levelText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  // Info column
  infoCol: { flex: 1, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rankName: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  streakChipText: { fontSize: 11, fontWeight: '800', color: '#F97316' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  dynamicTitleChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  dynamicTitleText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  weekendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(245,158,11,0.15)' },
  weekendBadgeText: { fontSize: 9, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.5 },
  rankJp: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Progress
  progressRow: { marginTop: 6, width: '100%' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

  // Next rank inline
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  nextDot: { width: 6, height: 6, borderRadius: 3 },
  nextText: { fontSize: 11, fontWeight: '500' },

  // Stats (Page 2)
  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  statValue: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '600', marginTop: 2 },

  // Centered content (Page 3, 5)
  centeredContent: { alignItems: 'center', gap: 5 },
  rankBadgeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  bigRankName: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  rankJpSmall: { fontSize: 11, fontWeight: '500' },
  daysChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, marginTop: 2 },
  daysChipText: { fontSize: 11, fontWeight: '600' },

  // Scrollable inner content
  innerScroll: { flex: 1 },

  // All ranks list (Page 4)
  allRanksList: { gap: 5 },
  allRanksRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  allRanksDot: { width: 7, height: 7, borderRadius: 4 },
  allRanksName: { fontSize: 12, flex: 1 },
  allRanksDays: { fontSize: 10, fontWeight: '600' },
  currentTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  currentTagText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },

  // Description (Page 5)
  rankDescription: { fontSize: 12, fontWeight: '500', lineHeight: 18, textAlign: 'center', marginTop: 2 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: 4 },
  rewardText: { fontSize: 10, fontWeight: '700' },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingBottom: 6, paddingTop: 0 },
  dot: { borderRadius: 4 },
});

export { RankCitationCard };
export default RankCitationCard;
