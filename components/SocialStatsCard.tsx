// ============================================
// YOROI - CARTE STATS SOCIALE
// ============================================
// Carte de partage pour les réseaux sociaux

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, TrendingDown, Flame, Award } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { SPACING } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

interface SocialStatsCardProps {
  userName: string;
  avatarUrl?: string;
  rank: string;
  rankIcon: string;
  stats: {
    workouts: number;
    streak: number;
    weightLost?: number;
    club?: string;
    clubs?: string[];
  };
}

export function SocialStatsCard({
  userName,
  avatarUrl,
  rank,
  rankIcon,
  stats,
}: SocialStatsCardProps) {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const viewShotRef = useRef<ViewShot>(null);

  // Capturer et partager
  const handleShare = async () => {
    try {
      if (!viewShotRef.current) return;

      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        showPopup('Erreur', 'Impossible de créer l\'image', [{ text: 'OK', style: 'primary' }]);
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Partager mes stats YOROI',
        });
      } else {
        await Share.share({ url: uri });
      }
    } catch (error) {
      logger.error('[SocialStatsCard] Erreur partage:', error);
      showPopup('Erreur', 'Impossible de partager', [{ text: 'OK', style: 'primary' }]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Zone capturable */}
      <ViewShot
        ref={viewShotRef}
        options={{
          format: 'png',
          quality: 1,
          width: 1080,
          height: 1080,
        }}
      >
        <LinearGradient
          colors={['#0D0D0F', '#1A1A1C']}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            {/* Avatar samouraï */}
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarEmoji}>{rankIcon}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.rankBadge}>
                <Award size={14} color="#D4AF37" />
                <Text style={styles.rankText}>{rank}</Text>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Entraînements */}
            <View style={styles.statBox}>
              <View style={[styles.statIcon, { backgroundColor: '#FF6B6B' }]}>
                <Text style={styles.statIconEmoji}></Text>
              </View>
              <Text style={styles.statValue}>{stats.workouts}</Text>
              <Text style={styles.statLabel}>entraînements</Text>
              <Text style={styles.statSubtext}>en 2025</Text>
            </View>

            {/* Série */}
            <View style={styles.statBox}>
              <View style={[styles.statIcon, { backgroundColor: '#FFA500' }]}>
                <Flame size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>jours</Text>
              <Text style={styles.statSubtext}>de série</Text>
            </View>

            {/* Poids perdu */}
            {stats.weightLost !== undefined && stats.weightLost > 0 && (
              <View style={styles.statBox}>
                <View style={[styles.statIcon, { backgroundColor: '#4CAF50' }]}>
                  <TrendingDown size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statValue}>-{stats.weightLost}</Text>
                <Text style={styles.statLabel}>kg perdus</Text>
                <Text style={styles.statSubtext}>objectif atteint</Text>
              </View>
            )}
          </View>

          {/* Clubs */}
          {stats.clubs && stats.clubs.length > 0 && (
            <View style={styles.clubsSection}>
              <Text style={styles.clubsTitle}>Clubs & Coach</Text>
              <View style={styles.clubsList}>
                {stats.clubs.map((club, index) => (
                  <View key={index} style={styles.clubBadge}>
                    <Text style={styles.clubText}>{club}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Branding */}
          <View style={styles.branding}>
            <View style={styles.brandingLine} />
            <Text style={styles.brandingText}>YOROI</Text>
            <Text style={styles.brandingKanji}>鎧</Text>
            <View style={styles.brandingLine} />
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Deviens la meilleure version de toi-même
          </Text>
        </LinearGradient>
      </ViewShot>

      {/* Bouton Partager */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: colors.accent }]}
        onPress={handleShare}
        activeOpacity={0.8}
      >
        <Share2 size={20} color={colors.textOnAccent} />
        <Text style={[styles.shareButtonText, { color: colors.textOnAccent }]}>
          Partager mes stats
        </Text>
      </TouchableOpacity>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    padding: 40,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2A2C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#D4AF37',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D4AF37',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginVertical: 20,
  },
  statBox: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIconEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statSubtext: {
    fontSize: 11,
    color: '#6C6C70',
    marginTop: 2,
  },
  clubsSection: {
    marginVertical: 12,
  },
  clubsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  clubsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clubBadge: {
    backgroundColor: '#2A2A2C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  brandingLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4AF37',
    opacity: 0.3,
  },
  brandingText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#D4AF37',
  },
  brandingKanji: {
    fontSize: 20,
    color: '#D4AF37',
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C6C70',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
