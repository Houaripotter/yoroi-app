import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Flame, Calendar, BarChart2 } from 'lucide-react-native';
import { YearStats } from '@/lib/social-cards/useYearStats';
import { SocialCardTopBanner, SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

// ============================================
// YEAR COUNTER CARD V2 - Compteur Annuel
// Design épuré avec clubs complets + barre progression
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface YearCounterCardV2Props {
  stats: YearStats;
  format: 'stories' | 'square';
  backgroundImage?: string;
  backgroundType?: 'photo' | 'black' | 'white'; // Type de fond
  username?: string;
  weeklyGoal?: number; // Objectif hebdo (ex: 4 séances/semaine)
}

// Noms des sports
const getSportName = (clubName: string): string => {
  // Essayer de deviner le sport par le nom du club
  const lowerName = clubName.toLowerCase();
  if (lowerName.includes('gracie') || lowerName.includes('jjb') || lowerName.includes('jiu')) return 'Jiu-Jitsu Brésilien';
  if (lowerName.includes('box')) return 'Boxe';
  if (lowerName.includes('mma') || lowerName.includes('fight')) return 'MMA';
  if (lowerName.includes('muay') || lowerName.includes('thai')) return 'Muay Thai';
  if (lowerName.includes('wrestling') || lowerName.includes('lutte')) return 'Lutte';
  if (lowerName.includes('judo')) return 'Judo';
  if (lowerName.includes('karate')) return 'Karaté';
  if (lowerName.includes('grappling')) return 'Grappling';
  if (lowerName.includes('crossfit')) return 'CrossFit';
  if (lowerName.includes('muscu') || lowerName.includes('fitness')) return 'Musculation';
  return 'Entraînement';
};

export const YearCounterCardV2 = forwardRef<View, YearCounterCardV2Props>(
  ({ stats, format, backgroundImage, backgroundType = 'photo', weeklyGoal = 4 }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Utiliser l'objectif annuel des stats s'il est disponible, sinon calculer
    const yearlyGoal = stats.yearlyGoal || weeklyGoal * 52;
    const progressPercent = Math.min((stats.totalDays / yearlyGoal) * 100, 100);

    // Déterminer les couleurs selon le type de fond
    const isLightBackground = backgroundType === 'white';
    const isDarkBackground = backgroundType === 'black';
    const hasSolidBackground = backgroundType === 'black' || backgroundType === 'white';

    // Variant pour les composants de branding
    const brandingVariant = isLightBackground ? 'light' : 'dark';

    // Couleurs dynamiques selon le fond
    const textPrimary = isLightBackground ? '#1a1a1a' : '#FFFFFF';
    const textSecondary = isLightBackground ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const textMuted = isLightBackground ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
    const goldColor = '#D4AF37';
    const statsRowBg = isLightBackground ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    const statsRowBorder = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const dividerColor = isLightBackground ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
    const progressBarBgColor = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';

    const content = (
      <>
        <LinearGradient
          colors={isLightBackground
            ? ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.9)']
            : ['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        >
          {/* TOP BANNER - YOROI */}
          <SocialCardTopBanner variant={brandingVariant} />

          {/* TITRE ANNÉE */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Trophy size={20} color={goldColor} />
              <Text style={[styles.titleText, { color: goldColor }]}>ANNÉE {stats.year}</Text>
            </View>
          </View>

          {/* COMPTEUR PRINCIPAL - Format X/OBJECTIF en grand */}
          <View style={styles.counterSection}>
            <View style={styles.counterRow}>
              <Text style={[styles.counterNumber, { color: textPrimary }]}>{stats.totalDays}</Text>
              <Text style={[styles.counterSlash, { color: textSecondary }]}>/</Text>
              <Text style={[styles.counterGoal, { color: goldColor }]}>{yearlyGoal}</Text>
            </View>
            <Text style={[styles.counterLabel, { color: goldColor }]}>JOURS D'ENTRAÎNEMENT</Text>
          </View>

          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: textSecondary }]}>Objectif {yearlyGoal} jours</Text>
              <Text style={[styles.progressPercent, { color: goldColor }]}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: progressBarBgColor }]}>
              <LinearGradient
                colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={[styles.progressText, { color: isLightBackground ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}>
              {stats.totalDays}/{yearlyGoal} jours
            </Text>
          </View>

          {/* CLUBS EN BULLES */}
          {stats.activityBreakdown && stats.activityBreakdown.length > 0 && (
            <View style={styles.clubsBubblesContainer}>
              {stats.activityBreakdown.slice(0, 4).map((club, index) => (
                <View key={index} style={styles.clubBubble}>
                  {/* Badge compteur */}
                  <View style={styles.clubBubbleCount}>
                    <Text style={styles.clubBubbleCountText}>x{club.count}</Text>
                  </View>

                  {/* Logo circulaire */}
                  {club.clubLogo ? (
                    <Image source={club.clubLogo} style={styles.clubBubbleLogo} resizeMode="cover" />
                  ) : (
                    <View style={[styles.clubBubbleLogoPlaceholder, { backgroundColor: isLightBackground ? 'rgba(212,175,55,0.15)' : 'rgba(212, 175, 55, 0.2)' }]}>
                      <Text style={styles.clubBubbleInitial}>{club.clubName.charAt(0)}</Text>
                    </View>
                  )}

                  {/* Nom du club */}
                  <Text style={[styles.clubBubbleName, { color: textPrimary }]} numberOfLines={2}>{club.clubName}</Text>
                  {/* Sport */}
                  <Text style={[styles.clubBubbleSport, { color: goldColor }]} numberOfLines={1}>{getSportName(club.clubName)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* STATS SECONDAIRES */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Flame size={16} color="#FF6B00" />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.currentStreak || stats.bestStreak}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>{stats.currentStreak > 0 ? 'STREAK' : 'BEST'}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <Calendar size={16} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.busiestMonth.month.substring(0, 3)}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>TOP MOIS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <BarChart2 size={16} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.percentage.toFixed(0)}%</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>DE L'ANNÉE</Text>
            </View>
          </View>

          {/* FOOTER - YOROI */}
          <SocialCardFooter variant={brandingVariant} />
        </LinearGradient>
      </>
    );

    // Fond avec photo
    if (backgroundImage) {
      return (
        <View
          ref={ref}
          style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
          collapsable={false}
        >
          <ImageBackground
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            {content}
          </ImageBackground>
        </View>
      );
    }

    // Fond blanc avec logo samurai
    if (isLightBackground) {
      return (
        <View
          ref={ref}
          style={[styles.container, { width: CARD_WIDTH, height: cardHeight, backgroundColor: '#FFFFFF' }]}
          collapsable={false}
        >
          <SocialCardWatermark show={true} variant="light" />
          {content}
        </View>
      );
    }

    // Fond noir avec logo samurai (défaut)
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
          <SocialCardWatermark show={true} variant="dark" />
          {content}
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
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  defaultBackground: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Title
  titleSection: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#D4AF37',
  },

  // Counter
  counterSection: {
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  counterSlash: {
    fontSize: 48,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  counterGoal: {
    fontSize: 48,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#D4AF37',
    marginTop: 4,
  },

  // Progress
  progressSection: {
    paddingHorizontal: 24,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },

  // Clubs Bubbles
  clubsBubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  clubBubble: {
    alignItems: 'center',
    width: 70,
    position: 'relative',
  },
  clubBubbleCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
    minWidth: 28,
    alignItems: 'center',
  },
  clubBubbleCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000000',
  },
  clubBubbleLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  clubBubbleLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  clubBubbleInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D4AF37',
  },
  clubBubbleName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
  },
  clubBubbleSport: {
    fontSize: 7,
    fontWeight: '600',
    color: '#D4AF37',
    textAlign: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
  });

export default YearCounterCardV2;
