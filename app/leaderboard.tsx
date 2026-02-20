import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, Crown, Medal, Star, Lock } from 'lucide-react-native';

// ============================================
// LEADERBOARD - CLASSEMENT
// ============================================

export default function LeaderboardScreen() {
  const { colors, isDark } = useTheme();

  // Données de démo
  const leaderboard = [
    { rank: 1, name: 'ShadowNinja', xp: 15420, avatar: 'Shogun' },
    { rank: 2, name: 'DragonFire', xp: 12850, avatar: 'Samurai' },
    { rank: 3, name: 'IronWill', xp: 11200, avatar: 'Ronin' },
    { rank: 4, name: 'ThunderStrike', xp: 9800, avatar: 'Ashigaru' },
    { rank: 5, name: 'PhoenixRise', xp: 8650, avatar: 'Ninja' },
    { rank: 6, name: 'StormBreaker', xp: 7420, avatar: 'Samurai' },
    { rank: 7, name: 'NightHawk', xp: 6890, avatar: 'Ronin' },
    { rank: 8, name: 'BlazeMaster', xp: 5540, avatar: 'Ashigaru' },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown size={20} color="#FFD700" fill="#FFD700" />;
      case 2: return <Medal size={20} color="#C0C0C0" />;
      case 3: return <Medal size={20} color="#CD7F32" />;
      default: return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Classement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.backgroundCard }]}>
          <Crown size={36} color="#FFD700" />
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>
            Top Players
          </Text>
          <Text style={[styles.introText, { color: colors.textMuted }]}>
            Les guerriers les plus actifs de la communauté YOROI
          </Text>
        </View>

        {/* Coming Soon Banner */}
        <View style={[styles.comingSoon, { backgroundColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(255,215,0,0.08)' }]}>
          <Lock size={20} color="#FFD700" />
          <Text style={[styles.comingSoonText, { color: '#FFD700' }]}>
            Fonctionnalité bientôt disponible
          </Text>
        </View>

        {/* Podium */}
        <View style={styles.podium}>
          {/* 2ème place */}
          <View style={[styles.podiumItem, styles.podiumSecond]}>
            <View style={[styles.podiumAvatar, { backgroundColor: '#C0C0C020', borderColor: '#C0C0C0' }]}>
              <Medal size={24} color="#C0C0C0" />
            </View>
            <Text style={[styles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>
              {leaderboard[1].name}
            </Text>
            <Text style={[styles.podiumXP, { color: '#C0C0C0' }]}>
              {leaderboard[1].xp.toLocaleString()} XP
            </Text>
            <View style={[styles.podiumBase, { backgroundColor: '#C0C0C0', height: 60 }]}>
              <Text style={styles.podiumRank}>2</Text>
            </View>
          </View>

          {/* 1ère place */}
          <View style={[styles.podiumItem, styles.podiumFirst]}>
            <View style={[styles.podiumAvatar, styles.podiumAvatarFirst, { backgroundColor: '#FFD70020', borderColor: '#FFD700' }]}>
              <Crown size={28} color="#FFD700" fill="#FFD700" />
            </View>
            <Text style={[styles.podiumName, styles.podiumNameFirst, { color: colors.textPrimary }]} numberOfLines={1}>
              {leaderboard[0].name}
            </Text>
            <Text style={[styles.podiumXP, { color: '#FFD700' }]}>
              {leaderboard[0].xp.toLocaleString()} XP
            </Text>
            <View style={[styles.podiumBase, { backgroundColor: '#FFD700', height: 80 }]}>
              <Text style={styles.podiumRank}>1</Text>
            </View>
          </View>

          {/* 3ème place */}
          <View style={[styles.podiumItem, styles.podiumThird]}>
            <View style={[styles.podiumAvatar, { backgroundColor: '#CD7F3220', borderColor: '#CD7F32' }]}>
              <Medal size={24} color="#CD7F32" />
            </View>
            <Text style={[styles.podiumName, { color: colors.textPrimary }]} numberOfLines={1}>
              {leaderboard[2].name}
            </Text>
            <Text style={[styles.podiumXP, { color: '#CD7F32' }]}>
              {leaderboard[2].xp.toLocaleString()} XP
            </Text>
            <View style={[styles.podiumBase, { backgroundColor: '#CD7F32', height: 45 }]}>
              <Text style={styles.podiumRank}>3</Text>
            </View>
          </View>
        </View>

        {/* Liste des autres joueurs */}
        <View style={styles.rankingList}>
          {leaderboard.slice(3).map((player) => (
            <View
              key={player.rank}
              style={[styles.rankItem, { backgroundColor: colors.backgroundCard }]}
            >
              <Text style={[styles.rankNumber, { color: colors.textMuted }]}>
                {player.rank}
              </Text>
              <View style={[styles.rankAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Star size={16} color={colors.textMuted} />
              </View>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankName, { color: colors.textPrimary }]}>
                  {player.name}
                </Text>
                <Text style={[styles.rankClass, { color: colors.textMuted }]}>
                  {player.avatar}
                </Text>
              </View>
              <Text style={[styles.rankXP, { color: colors.accent }]}>
                {player.xp.toLocaleString()} XP
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  introCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  introTitle: { fontSize: 20, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  introText: { fontSize: 14, textAlign: 'center' },
  comingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  comingSoonText: { fontSize: 14, fontWeight: '700' },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: { marginHorizontal: 8 },
  podiumSecond: {},
  podiumThird: {},
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  podiumAvatarFirst: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
  },
  podiumName: { fontSize: 12, fontWeight: '700', marginBottom: 2, maxWidth: 80 },
  podiumNameFirst: { fontSize: 14 },
  podiumXP: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  podiumBase: {
    width: '90%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  rankingList: { gap: 10 },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
  },
  rankNumber: { fontSize: 16, fontWeight: '800', width: 30 },
  rankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: '700' },
  rankClass: { fontSize: 12, marginTop: 2 },
  rankXP: { fontSize: 14, fontWeight: '700' },
});
