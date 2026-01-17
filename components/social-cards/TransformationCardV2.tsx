import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingDown, TrendingUp, Calendar, Zap } from 'lucide-react-native';
import { SocialCardTopBanner, SocialCardFooter } from './SocialCardBranding';
import { useI18n } from '@/lib/I18nContext';

// ============================================
// TRANSFORMATION CARD V2 - Avant/Après
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface TransformationStats {
  before: {
    uri: string;
    date: string;
    weight?: number;
  };
  after: {
    uri: string;
    date: string;
    weight?: number;
  };
  weightDifference?: number;
  daysDifference: number;
}

export interface TransformationCardV2Props {
  stats: TransformationStats;
  format: 'stories' | 'square';
  username?: string;
}

export const TransformationCardV2 = forwardRef<View, TransformationCardV2Props>(
  ({ stats, format, username }, ref) => {
    const { locale } = useI18n();
    const isStories = format === 'stories';

    // Dimensions adaptées au format
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;
    const photoHeight = cardHeight * 0.65; // 65% de la hauteur pour les photos

    // Formater les dates
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric',
      });
    };

    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        <LinearGradient
          colors={['#0F0F23', '#1A1A2E', '#16213E']}
          style={styles.background}
        >
          {/* TOP BANNER - Branding */}
          <SocialCardTopBanner variant="dark" />

          {/* HEADER */}
          <View style={styles.header}>
            <Zap size={16} color="#D4AF37" />
            <Text style={styles.subtitle}>TRANSFORMATION</Text>
            <Zap size={16} color="#D4AF37" />
          </View>

          {/* PHOTOS SPLIT SCREEN */}
          <View style={[styles.photosContainer, { height: photoHeight }]}>
            {/* Photo AVANT */}
            <View style={styles.photoSection}>
              <ImageBackground
                source={{ uri: stats.before.uri }}
                style={styles.photoBackground}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                  style={styles.photoOverlay}
                >
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>AVANT</Text>
                  </View>
                  <View style={styles.photoDateContainer}>
                    <Text style={styles.photoDate}>{formatDate(stats.before.date)}</Text>
                    {stats.before.weight && (
                      <Text style={styles.photoWeight}>{stats.before.weight.toFixed(1)} kg</Text>
                    )}
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>

            {/* Séparateur vertical avec foudre */}
            <View style={styles.separator}>
              <View style={styles.separatorIcon}>
                <Zap size={28} color="#FFD700" fill="#FFD700" />
              </View>
            </View>

            {/* Photo APRÈS */}
            <View style={styles.photoSection}>
              <ImageBackground
                source={{ uri: stats.after.uri }}
                style={styles.photoBackground}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                  style={styles.photoOverlay}
                >
                  <View style={[styles.photoBadge, styles.photoBadgeAfter]}>
                    <Text style={styles.photoBadgeText}>APRÈS</Text>
                  </View>
                  <View style={styles.photoDateContainer}>
                    <Text style={styles.photoDate}>{formatDate(stats.after.date)}</Text>
                    {stats.after.weight && (
                      <Text style={styles.photoWeight}>{stats.after.weight.toFixed(1)} kg</Text>
                    )}
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>
          </View>

          {/* STATS SECTION */}
          <View style={styles.statsSection}>
            {/* Evolution poids */}
            {stats.weightDifference !== undefined && stats.weightDifference !== 0 && (
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  {stats.weightDifference < 0 ? (
                    <TrendingDown size={24} color="#10B981" />
                  ) : (
                    <TrendingUp size={24} color="#EF4444" />
                  )}
                </View>
                <View style={styles.statContent}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: stats.weightDifference < 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {stats.weightDifference > 0 ? '+' : ''}
                    {stats.weightDifference.toFixed(1)} kg
                  </Text>
                  <Text style={styles.statLabel}>Évolution</Text>
                </View>
              </View>
            )}

            {/* Durée */}
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Calendar size={24} color="#FFD700" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.daysDifference} jours</Text>
                <Text style={styles.statLabel}>
                  {Math.floor(stats.daysDifference / 7)} semaines
                </Text>
              </View>
            </View>
          </View>

          {/* MESSAGE MOTIVATION */}
          {stats.weightDifference && stats.weightDifference < 0 && (
            <View style={styles.motivationContainer}>
              <Text style={styles.motivationText}>
                {Math.abs(stats.weightDifference).toFixed(1)} kg perdus en {stats.daysDifference} jours !
              </Text>
            </View>
          )}

          {/* FOOTER - Pro Style */}
          <SocialCardFooter variant="dark" />
        </LinearGradient>
      </View>
    );
  }
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  background: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Photos Container
  photosContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoSection: {
    flex: 1,
  },
  photoBackground: {
    flex: 1,
  },
  photoOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 12,
  },
  photoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  photoBadgeAfter: {
    backgroundColor: '#10B981',
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  photoDateContainer: {
    alignItems: 'flex-start',
  },
  photoDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  photoWeight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Separator
  separator: {
    width: 4,
    backgroundColor: '#FFD700',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F0F23',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Motivation
  motivationContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginTop: 12,
  },
  motivationText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  separator2: {
    width: '60%',
    height: 2,
    backgroundColor: 'rgba(255, 215, 0, 0.6)',
  },
  brandingContainer: {
    alignItems: 'center',
    gap: 6,
  },
  brandingTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandingSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  storeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  storeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  username: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default TransformationCardV2;
