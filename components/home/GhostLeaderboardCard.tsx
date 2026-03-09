// ============================================
// YOROI - GHOST LEADERBOARD CARD
// Te fais concourir contre ta meilleure version
// Composant autonome - charge ses propres données
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Zap, TrendingUp, TrendingDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { getGhostData, updateCurrentWeek, GhostData } from '@/lib/ghostLeaderboardService';
import { getTrainings, getWeights } from '@/lib/database';

export const GhostLeaderboardCard: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [ghostData, setGhostData] = useState<GhostData | null>(null);
  const barAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allTrainings, allWeights] = await Promise.all([
          getTrainings(365),
          getWeights(365),
        ]);

        // Entraînements de cette semaine
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().split('T')[0];

        const trainingsThisWeek = allTrainings.filter((t: any) => t.date >= weekStartStr).length;
        const weightsThisWeek = allWeights.filter((w: any) => w.date >= weekStartStr).length;

        // Mettre a jour les stats de cette semaine
        await updateCurrentWeek(trainingsThisWeek, weightsThisWeek, 0);

        // Charger les données ghost
        const data = await getGhostData(trainingsThisWeek);
        setGhostData(data);
      } catch {
        // Silencieux
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!ghostData || hasAnimated.current) return;
    if (!ghostData.hasHistory) return;
    hasAnimated.current = true;
    Animated.timing(barAnim, {
      toValue: ghostData.progressPercent / 100,
      duration: 900,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ghostData]);

  // Ne pas afficher si pas d'historique et 0 entraînements cette semaine
  if (!ghostData) return null;
  if (!ghostData.hasHistory && ghostData.currentTrainings === 0) return null;

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isBeating = ghostData.isBeatingRecord;
  const accentColor = isBeating ? '#10B981' : colors.accent;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Light);
        router.push('/gamification');
      }}
      style={[styles.card, { backgroundColor: colors.backgroundCard }]}
    >
      <LinearGradient
        colors={isBeating
          ? ['rgba(16,185,129,0.08)', 'transparent']
          : [`${colors.accent}08`, 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBg, { backgroundColor: `${accentColor}18` }]}>
            <Trophy size={14} color={accentColor} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isBeating ? 'Nouveau record en vue !' : 'Ton ghost de la semaine'}
          </Text>
        </View>
        {isBeating
          ? <TrendingUp size={16} color="#10B981" />
          : <TrendingDown size={16} color={colors.textMuted} />
        }
      </View>

      {/* Comparaison */}
      <View style={styles.compareRow}>
        {/* Cette semaine */}
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: accentColor }]}>
            {ghostData.currentTrainings}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cette semaine</Text>
        </View>

        {/* VS */}
        <View style={[styles.vsBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          <Zap size={10} color={accentColor} />
          <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
        </View>

        {/* Meilleur record */}
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: colors.textMuted }]}>
            {ghostData.hasHistory ? ghostData.bestTrainings : '-'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {ghostData.hasHistory ? 'Ton record' : 'Pas encore de record'}
          </Text>
        </View>
      </View>

      {/* Barre de progression */}
      {ghostData.hasHistory && (
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }]}>
            <Animated.View style={[styles.progressFill, { width: barWidth, backgroundColor: accentColor }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            {ghostData.isBeatingRecord
              ? `+${ghostData.currentTrainings - ghostData.bestTrainings} vs ton record !`
              : `${ghostData.progressPercent}% du record`
            }
          </Text>
        </View>
      )}

      {!ghostData.hasHistory && ghostData.currentTrainings > 0 && (
        <Text style={[styles.noHistoryText, { color: colors.textMuted }]}>
          Continue, tu batis ton premier record cette semaine !
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 0,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vsText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressSection: {
    gap: 5,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  noHistoryText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GhostLeaderboardCard;
