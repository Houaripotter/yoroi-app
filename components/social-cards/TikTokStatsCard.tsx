import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame,
  Trophy,
  Calendar,
  TrendingUp,
  Award,
  Dumbbell,
  Clock,
} from 'lucide-react-native';
import { SocialCardFooter } from './SocialCardBranding';

// ============================================
// TIKTOK STATS CARD - Carte transparente
// Fond transparent pour superposer sur video/photo
// Stats selectionnables
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface TikTokStatsData {
  // Stats entrainements
  totalTrainings?: number;
  weekTrainings?: number;
  monthTrainings?: number;
  yearTrainings?: number;

  // Records
  bestWeek?: number;
  totalMinutes?: number;

  // Club/Sport
  mainClub?: string;
  mainClubLogo?: string;
  mainSport?: string;

  // Rang
  rank?: string;
}

export type StatType =
  | 'totalTrainings'
  | 'weekTrainings'
  | 'monthTrainings'
  | 'yearTrainings'
  | 'bestWeek'
  | 'totalMinutes'
  | 'rank';

export interface TikTokStatsCardProps {
  stats: TikTokStatsData;
  selectedStats: StatType[];
  format: 'stories' | 'square';
  backgroundImage?: string;
  backgroundType?: 'transparent' | 'gradient' | 'photo';
  showBranding?: boolean;
  isLandscape?: boolean;
}

// ... reste du code ...

export const TikTokStatsCard = forwardRef<View, TikTokStatsCardProps>(
  ({ stats, selectedStats, format, backgroundImage, backgroundType = 'transparent', showBranding = true, isLandscape = false }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    const isTransparent = backgroundType === 'transparent';
    const hasPhoto = backgroundType === 'photo' && !!backgroundImage;

    // Filtrer les stats selectionnees (max 4)
    const displayStats = selectedStats.filter(statKey => {
      return STAT_CONFIG[statKey] !== undefined;
    }).slice(0, 4);

    const content = (
      <View style={styles.contentContainer}>
        {/* Header - Logo club si disponible */}
        {stats.mainClub && stats.mainClubLogo && (
          <View style={styles.headerSection}>
            <Image
              source={{ uri: stats.mainClubLogo }}
              style={styles.clubLogo}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {displayStats.map((statKey) => {
            const config = STAT_CONFIG[statKey];
            const value = stats[statKey as keyof TikTokStatsData];
            const IconComponent = config.icon;

            return (
              <View
                key={statKey}
                style={[
                  styles.statCard,
                  { backgroundColor: isTransparent ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.08)' }
                ]}
              >
                <IconComponent size={24} color={config.iconColor} />
                <Text style={styles.statValue}>{config.format(value)}</Text>
                <Text style={styles.statLabel}>{config.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Sport badge si disponible */}
        {stats.mainSport && (
          <View style={styles.sportBadge}>
            <Text style={styles.sportText}>{stats.mainSport.toUpperCase()}</Text>
          </View>
        )}

        {/* Footer */}
        {showBranding && (
          <View style={styles.footerContainer}>
            <SocialCardFooter variant="dark" />
          </View>
        )}
      </View>
    );

    // Version transparente - fond semi-transparent
    if (isTransparent) {
      return (
        <View
          ref={ref}
          style={[styles.container, { width: CARD_WIDTH, height: cardHeight, backgroundColor: 'rgba(0,0,0,0.3)' }]}
          collapsable={false}
        >
          {content}
        </View>
      );
    }

    // Version avec photo - remplit tout le cadre avec effet flou + image entière intelligente
    if (hasPhoto) {
      return (
        <View
          ref={ref}
          style={[styles.container, { width: CARD_WIDTH, height: cardHeight, backgroundColor: '#000000' }]}
          collapsable={false}
        >
          {/* 1. Fond flou pour remplir l'espace (Zoomé) */}
          <Image
            source={{ uri: backgroundImage }}
            style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
            blurRadius={15}
            resizeMode="cover"
          />
          
          {/* 2. Image principale entière (Non coupée) */}
          <Image
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode={isLandscape ? "contain" : "cover"}
          />
          
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.3)',
              'rgba(0,0,0,0.1)',
              'rgba(0,0,0,0.1)',
              'rgba(0,0,0,0.5)',
              'rgba(0,0,0,0.8)',
            ]}
            locations={[0, 0.2, 0.5, 0.8, 1]}
            style={StyleSheet.absoluteFill}
          />
          {content}
        </View>
      );
    }

    // Version gradient par defaut
    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        <LinearGradient
          colors={['#0a0a0a', '#1a1a2e', '#0f0f1a']}
          style={styles.defaultBackground}
        >
          {content}
        </LinearGradient>
      </View>
    );
  }
);

TikTokStatsCard.displayName = 'TikTokStatsCard';

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  defaultBackground: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  clubLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (CARD_WIDTH - 60) / 2,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sportBadge: {
    backgroundColor: 'rgba(212,175,55,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4AF37',
    marginBottom: 16,
  },
  sportText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 1,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
});

export default TikTokStatsCard;
