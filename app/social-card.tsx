// ============================================
// YOROI - SOCIAL CARD SCREEN
// ============================================
// Generate and share social media stats card

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { SocialStatsCard } from '@/components/SocialStatsCard';
import { getUserSettings } from '@/lib/storage';
import { getProfile, getTrainings, getLatestWeight, getWeights, calculateStreak } from '@/lib/database';
import { getCurrentRank } from '@/lib/ranks';

export default function SocialCardScreen() {
  const { colors } = useTheme();
  const [userName, setUserName] = useState('Guerrier');
  const [rank, setRank] = useState({ name: 'Aspirant', icon: '🥋' });
  const [stats, setStats] = useState({
    workouts: 0,
    streak: 0,
    weightLost: 0,
    clubs: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user settings
      const settings = await getUserSettings();
      const profile = await getProfile();
      setUserName(profile?.name || settings?.username || 'Guerrier');

      // Load stats
      const [trainings, latestWeight, weights, streak] = await Promise.all([
        getTrainings(),
        getLatestWeight(),
        getWeights(365),
        calculateStreak(),
      ]);

      // Calculate weight lost
      let weightLost = 0;
      if (weights.length > 0 && latestWeight) {
        const startWeight = weights[weights.length - 1]?.weight || 0;
        const currentWeight = latestWeight.weight || 0;
        weightLost = Math.max(0, startWeight - currentWeight);
      }

      // Get current rank
      const currentRank = getCurrentRank(streak);

      // Get clubs (from settings)
      const clubs: string[] = [];
      if (settings?.userClubs && settings.userClubs.length > 0) {
        clubs.push(...settings.userClubs.map((club) => club.name));
      }

      setRank(currentRank);
      setStats({
        workouts: trainings.length,
        streak,
        weightLost: Math.round(weightLost * 10) / 10,
        clubs: clubs.slice(0, 3), // Max 3 clubs
      });
    } catch (error) {
      console.error('[SocialCard] Error loading data:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.backgroundCard, borderBottomColor: colors.border }]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Partager mes stats
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.instructionsTitle, { color: colors.textPrimary }]}>
            📲 Partage ta progression
          </Text>
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            Partage ta carte de stats sur Instagram, Snapchat ou tes réseaux sociaux préférés.
            Le format 1:1 est parfait pour les posts et stories !
          </Text>
        </View>

        {/* Social Stats Card */}
        <View style={styles.cardContainer}>
          <SocialStatsCard
            userName={userName}
            rank={rank.name}
            rankIcon={rank.icon}
            stats={stats}
          />
        </View>

        {/* Tips */}
        <View style={[styles.tips, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>💡 Astuce</Text>
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            Inspire tes amis à se lancer dans leur transformation ! Tag @yoroi_app pour être mis en avant.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  instructions: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardContainer: {
    marginBottom: SPACING.lg,
  },
  tips: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
