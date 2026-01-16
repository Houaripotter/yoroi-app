// ============================================
// YOROI - MODAL DES RANGS SAMOURAÏ
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { 
  X, 
  Check, 
  Lock, 
  Flame, 
  Target,
  Swords,
  Sword,
  Moon,
  GraduationCap,
  Crown,
  Castle,
  Shield,
  Star,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { RANKS, Rank, getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress } from '@/lib/ranks';
import { SPACING, RADIUS } from '@/constants/appTheme';

interface RanksModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  gender?: 'male' | 'female';
}

// Map des icônes pour les rangs
const RankIconMap: Record<string, any> = {
  'target': Target,
  'swords': Swords,
  'sword': Sword,
  'moon': Moon,
  'graduation-cap': GraduationCap,
  'crown': Crown,
  'castle': Castle,
  'shield': Shield,
  'star': Star,
};

export const RanksModal: React.FC<RanksModalProps> = ({
  visible,
  onClose,
  currentStreak,
  gender = 'male',
}) => {
  const { colors } = useTheme();
  const currentRank = getCurrentRank(currentStreak);
  const nextRank = getNextRank(currentStreak);
  const daysToNext = getDaysToNextRank(currentStreak);
  const progress = getRankProgress(currentStreak);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, progress]);

  const isRankUnlocked = (rank: Rank) => currentStreak >= rank.minDays;
  const isCurrentRank = (rank: Rank) => rank.id === currentRank.id;
  
  const getRankName = (rank: Rank) => gender === 'female' ? rank.nameFemale : rank.name;
  const getRankDescription = (rank: Rank) => gender === 'female' ? rank.descriptionFemale : rank.description;

  const CurrentRankIcon = RankIconMap[currentRank.icon] || Target;
  const NextRankIcon = nextRank ? (RankIconMap[nextRank.icon] || Target) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
          {/* Header avec décoration japonaise */}
          <View style={styles.header}>
            <View style={styles.headerDecor}>
              <Text style={styles.toriiLeft}>⛩️</Text>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Rangs Samouraï
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  武士道 - La Voie du Guerrier
                </Text>
              </View>
              <Text style={styles.toriiRight}>⛩️</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Current Streak Card */}
          <View style={[styles.streakCard, { backgroundColor: `${currentRank.color}15`, borderColor: currentRank.color }]}>
            <View style={styles.streakLeft}>
              <View style={[styles.currentRankIcon, { backgroundColor: currentRank.color }]}>
                <CurrentRankIcon size={28} color="#FFFFFF" />
              </View>
              <View style={styles.streakInfo}>
                <Text style={[styles.currentRankName, { color: currentRank.color }]}>
                  {getRankName(currentRank)}
                </Text>
                <Text style={[styles.currentRankJp, { color: colors.textMuted }]}>
                  {currentRank.nameJp}
                </Text>
              </View>
            </View>
            <View style={styles.streakRight}>
              <Flame size={18} color="#F97316" />
              <Text style={[styles.streakValue, { color: colors.textPrimary }]}>
                {currentStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textMuted }]}>jours</Text>
            </View>
          </View>

          {/* Progress to next rank */}
          {nextRank && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.progressLeft}>
                  <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                    Prochain rang
                  </Text>
                  <View style={styles.nextRankRow}>
                    {NextRankIcon && <NextRankIcon size={16} color={nextRank.color} />}
                    <Text style={[styles.nextRankName, { color: nextRank.color }]}>
                      {getRankName(nextRank)}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressRight}>
                  <Text style={[styles.progressDays, { color: colors.textPrimary }]}>
                    {daysToNext}
                  </Text>
                  <Text style={[styles.progressDaysLabel, { color: colors.textMuted }]}>
                    jours restants
                  </Text>
                </View>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { 
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: nextRank.color 
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressPercent, { color: colors.textMuted }]}>
                {Math.round(progress)}% complété
              </Text>
            </View>
          )}

          {/* Ranks List */}
          <Text style={[styles.listTitle, { color: colors.textMuted }]}>TOUS LES RANGS</Text>
          <ScrollView style={styles.ranksList} showsVerticalScrollIndicator={false}>
            {RANKS.map((rank, index) => {
              const unlocked = isRankUnlocked(rank);
              const current = isCurrentRank(rank);
              const RankIcon = RankIconMap[rank.icon] || Target;

              return (
                <View
                  key={rank.id}
                  style={[
                    styles.rankItem,
                    { backgroundColor: colors.background },
                    current && { 
                      backgroundColor: `${rank.color}10`, 
                      borderColor: rank.color, 
                      borderWidth: 2 
                    },
                    !unlocked && { opacity: 0.4 },
                  ]}
                >
                  {/* Rank Icon */}
                  <View style={[
                    styles.rankIconContainer, 
                    { backgroundColor: unlocked ? `${rank.color}25` : colors.border }
                  ]}>
                    {unlocked ? (
                      <RankIcon size={26} color={rank.color} />
                    ) : (
                      <Lock size={22} color={colors.textMuted} />
                    )}
                  </View>

                  {/* Rank Info */}
                  <View style={styles.rankInfo}>
                    <View style={styles.rankNameRow}>
                      <Text style={[
                        styles.rankName, 
                        { color: unlocked ? rank.color : colors.textMuted }
                      ]}>
                        {getRankName(rank)}
                      </Text>
                      {current && (
                        <View style={[styles.currentBadge, { backgroundColor: rank.color }]}>
                          <Text style={styles.currentBadgeText}>ACTUEL</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.rankNameJp, { color: colors.textMuted }]}>
                      {rank.nameJp}
                    </Text>
                    <Text style={[styles.rankDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                      {getRankDescription(rank)}
                    </Text>
                  </View>

                  {/* Days Required */}
                  <View style={styles.daysContainer}>
                    {unlocked ? (
                      <Check size={18} color={rank.color} />
                    ) : (
                      <>
                        <Text style={[styles.daysValue, { color: colors.textMuted }]}>
                          {rank.minDays}
                        </Text>
                        <Text style={[styles.daysLabel, { color: colors.textMuted }]}>
                          jours
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
            
            {/* Message motivation */}
            <View style={styles.motivationSection}>
              <Text style={styles.cherryBlossom}>🌸</Text>
              <Text style={[styles.motivationText, { color: colors.textMuted }]}>
                "La discipline est le pont entre les objectifs et l'accomplissement."
              </Text>
              <Text style={[styles.motivationAuthor, { color: colors.accent }]}>
                — Proverbe japonais
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toriiLeft: {
    fontSize: 24,
  },
  toriiRight: {
    fontSize: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentRankIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {},
  currentRankName: {
    fontSize: 18,
    fontWeight: '800',
  },
  currentRankJp: {
    fontSize: 12,
    marginTop: 2,
  },
  streakRight: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  streakLabel: {
    fontSize: 11,
    marginTop: -2,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressLeft: {},
  progressLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  nextRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextRankName: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressRight: {
    alignItems: 'flex-end',
  },
  progressDays: {
    fontSize: 24,
    fontWeight: '900',
  },
  progressDaysLabel: {
    fontSize: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  listTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  ranksList: {
    flex: 1,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  rankIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rankNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
  },
  rankNameJp: {
    fontSize: 11,
    marginTop: 1,
  },
  rankDescription: {
    fontSize: 12,
    marginTop: 3,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  daysContainer: {
    alignItems: 'center',
    minWidth: 45,
  },
  daysValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  daysLabel: {
    fontSize: 9,
  },
  motivationSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  cherryBlossom: {
    fontSize: 32,
    marginBottom: 12,
  },
  motivationText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  motivationAuthor: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
});

export default RanksModal;
