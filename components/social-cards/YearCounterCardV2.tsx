import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Flame, Calendar, BarChart2 } from 'lucide-react-native';
import { YearStats } from '@/lib/social-cards/useYearStats';
import { SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

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
  backgroundType?: 'photo' | 'black' | 'white';
  username?: string;
  weeklyGoal?: number;
  isLandscape?: boolean;
}

// Noms des sports
const getSportName = (clubName: string): string => {
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
  if (lowerName.includes('muscu') || lowerName.includes('fitness') || lowerName.includes('basic')) return 'Musculation';
  return 'Entraînement';
};

export const YearCounterCardV2 = forwardRef<View, YearCounterCardV2Props>(
  ({ stats, format, backgroundImage, backgroundType = 'black', weeklyGoal = 4, isLandscape = false }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Utiliser l'objectif annuel des stats s'il est disponible, sinon calculer
    const yearlyGoal = stats.yearlyGoal || weeklyGoal * 52;
    const progressPercent = Math.min((stats.totalDays / yearlyGoal) * 100, 100);

    // Déterminer les couleurs selon le type de fond
    const isLightBackground = backgroundType === 'white';
    const brandingVariant = isLightBackground ? 'light' : 'dark';

    // Couleurs dynamiques
    const textPrimary = isLightBackground ? '#1a1a1a' : '#FFFFFF';
    const textSecondary = isLightBackground ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
    const textMuted = isLightBackground ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
    const goldColor = '#D4AF37';
    const statsRowBg = isLightBackground ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    const statsRowBorder = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const dividerColor = isLightBackground ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
    const progressBarBgColor = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';

    const content = (
      <View style={styles.contentContainer}>
        {/* HAUT: Année + Compteur */}
        <View style={styles.topContent}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Trophy size={14} color={goldColor} />
              <Text style={[styles.titleText, { color: goldColor }]}>ANNÉE {stats.year}</Text>
            </View>
          </View>

          {/* COMPTEUR PRINCIPAL - Format X/365 */}
          <View style={styles.counterSection}>
            <View style={styles.counterRow}>
              <Text style={[styles.counterNumber, { color: textPrimary }]}>{stats.totalDays}</Text>
              <Text style={[styles.counterSlash, { color: textSecondary }]}>/</Text>
              <Text style={[styles.counterGoal, { color: goldColor }]}>365</Text>
            </View>
            <Text style={[styles.counterLabel, { color: goldColor }]}>JOURS D'ENTRAÎNEMENT</Text>
          </View>
        </View>

        {/* CENTRE: Espace pour l'avatar/photo */}
        <View style={styles.centerSpace} />

        {/* BAS: Tout le contenu */}
        <View style={styles.bottomContent}>
          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabelBold, { color: goldColor }]}>OBJECTIF {yearlyGoal} JOURS</Text>
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
            <Text style={[styles.progressText, { color: textSecondary }]}>
              {stats.totalDays}/{yearlyGoal} jours accomplis
            </Text>
          </View>

          {/* CLUBS EN BULLES */}
          {stats.activityBreakdown && stats.activityBreakdown.length > 0 && (
            <View style={styles.clubsBubblesContainer}>
              {stats.activityBreakdown.slice(0, 4).map((club, index) => (
                <View key={index} style={styles.clubBubble}>
                  <View style={styles.clubBubbleCount}>
                    <Text style={styles.clubBubbleCountText}>x{club.count}</Text>
                  </View>
                  {club.clubLogo ? (
                    <Image source={club.clubLogo} style={styles.clubBubbleLogo} resizeMode="cover" />
                  ) : (
                    <View style={[styles.clubBubbleLogoPlaceholder, { backgroundColor: isLightBackground ? 'rgba(212,175,55,0.15)' : 'rgba(212, 175, 55, 0.2)' }]}>
                      <Text style={styles.clubBubbleInitial}>{club.clubName.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={[styles.clubBubbleName, { color: textPrimary }]} numberOfLines={2}>{club.clubName}</Text>
                  <Text style={[styles.clubBubbleSport, { color: goldColor }]} numberOfLines={1}>{getSportName(club.clubName)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* STATS SECONDAIRES - Compact */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Flame size={14} color="#FF6B00" />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.totalDays}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>ENTRAÎNEMENTS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <Calendar size={14} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.busiestMonth.month.substring(0, 3)}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>TOP MOIS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <BarChart2 size={14} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.percentage.toFixed(0)}%</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>DE L'ANNÉE</Text>
            </View>
          </View>

          {/* FOOTER */}
          <SocialCardFooter variant={brandingVariant} />
        </View>
      </View>
    );

    // Fond avec photo - remplit tout le cadre avec effet flou + image entière intelligente
    if (backgroundImage) {
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
            style={styles.backgroundImageContain}
            resizeMode={isLandscape ? "contain" : "cover"}
          />
          
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.7)',     // 0% - Sombre pour le titre
              'rgba(0,0,0,0.4)',     // 15% - Transition
              'rgba(0,0,0,0)',       // 30% - Transparent
              'rgba(0,0,0,0)',       // 45% - Transparent
              'rgba(0,0,0,0.5)',     // 65% - Commence à assombrir pour les infos
              'rgba(0,0,0,0.85)',    // 85% - Sombre pour les stats
              'rgba(0,0,0,0.95)',    // 100% - Très sombre pour le footer
            ]}
            locations={[0, 0.15, 0.3, 0.5, 0.65, 0.85, 1]}
            style={StyleSheet.absoluteFill}
          />
          {content}
        </View>
      );
    }

    // Fond blanc
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

    // Fond noir (défaut)
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
  backgroundImageContain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  defaultBackground: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContent: {
    paddingTop: 16,
  },
  centerSpace: {
    flex: 1,
    minHeight: 80,
  },
  bottomContent: {
    gap: 8,
    paddingBottom: 0,
  },

  // Title - Plus petit
  titleSection: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Counter - Plus compact
  counterSection: {
    alignItems: 'center',
    marginTop: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  counterNumber: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
  counterSlash: {
    fontSize: 32,
    fontWeight: '300',
    marginHorizontal: 3,
  },
  counterGoal: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -2,
  },

  // Progress - Plus compact
  progressSection: {
    paddingHorizontal: 20,
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelBold: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 10,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Clubs Bubbles - Plus compact
  clubsBubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  clubBubble: {
    alignItems: 'center',
    width: 60,
    position: 'relative',
  },
  clubBubbleCount: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    zIndex: 1,
    minWidth: 24,
    alignItems: 'center',
  },
  clubBubbleCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
  },
  clubBubbleLogo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent', // Pas de fond blanc pour les logos
  },
  clubBubbleLogoPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  clubBubbleInitial: {
    fontSize: 15,
    fontWeight: '900',
    color: '#D4AF37',
  },
  clubBubbleName: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  clubBubbleSport: {
    fontSize: 7,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Stats Row - Plus compact
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 26,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default YearCounterCardV2;
