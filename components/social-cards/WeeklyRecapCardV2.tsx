import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Flame, Award, BarChart2 } from 'lucide-react-native';
import { WeekStats } from '@/lib/social-cards/useWeekStats';
import { SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

// ============================================
// WEEKLY RECAP CARD V2 - Récap Hebdomadaire
// Design épuré avec clubs complets + barre progression
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface WeeklyRecapCardV2Props {
  stats: WeekStats;
  format: 'stories' | 'square';
  backgroundImage?: string;
  backgroundType?: 'photo' | 'black' | 'white';
  username?: string;
  weeklyGoal?: number;
  isLandscape?: boolean;
}

// Noms des sports complets
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

export const WeeklyRecapCardV2 = forwardRef<View, WeeklyRecapCardV2Props>(
  ({ stats, format, backgroundImage, backgroundType = 'black', weeklyGoal = 4, isLandscape = false }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Calculer la progression
    const progressPercent = Math.min((stats.totalSessions / weeklyGoal) * 100, 100);

    // Déterminer les couleurs selon le type de fond
    const isLightBackground = backgroundType === 'white';
    const hasPhoto = !!backgroundImage;
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
    const dayDotBg = isLightBackground ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)';
    const dayDotBorder = isLightBackground ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';
    const dayDotInactiveText = isLightBackground ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';

    const content = (
      <View style={styles.contentContainer}>
        {/* ... reste du contenu ... */}
        {/* HAUT: Titre semaine */}
        <View style={styles.topContent}>
          <View style={styles.titleSection}>
            {(() => {
              const parts = stats.weekLabel.split('•');
              const weekNumber = parts[0]?.trim() || stats.weekLabel;
              const dateRange = parts[1]?.trim() || '';
              const currentYear = new Date().getFullYear();
              return (
                <>
                  <View style={styles.titleRow}>
                    <Calendar size={14} color={goldColor} />
                    <Text style={[styles.titleText, { color: goldColor }]}>{weekNumber.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.titleDateText, { color: textSecondary }]}>
                    {dateRange ? `${dateRange.toUpperCase()} ${currentYear}` : currentYear.toString()}
                  </Text>
                </>
              );
            })()}
          </View>

          {/* COMPTEUR PRINCIPAL */}
          <View style={styles.counterSection}>
            <Text style={[styles.counterNumber, { color: textPrimary }]}>{stats.totalSessions}</Text>
            <Text style={[styles.counterLabel, { color: goldColor }]}>ENTRAÎNEMENTS</Text>
          </View>
        </View>

        {/* CENTRE: Espace pour l'avatar/photo */}
        <View style={styles.centerSpace} />

        {/* BAS: Tout le contenu */}
        <View style={styles.bottomContent}>
          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: textSecondary }]}>Objectif {weeklyGoal} séances</Text>
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
              {stats.totalSessions}/{weeklyGoal} séances
            </Text>
          </View>

          {/* CALENDRIER SEMAINE */}
          <View style={styles.weekCalendar}>
            {stats.calendar.map((day, index) => (
              <View key={index} style={styles.dayColumn}>
                <Text style={[styles.dayName, { color: goldColor }]}>{day.dayName}</Text>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: dayDotBg, borderColor: dayDotBorder },
                    day.isActive && styles.dayDotActive,
                    day.isToday && styles.dayDotToday,
                  ]}
                >
                  {day.sessions > 0 && (
                    <Text style={[
                      styles.dayDotText,
                      { color: dayDotInactiveText },
                      day.isActive && styles.dayDotTextActive
                    ]}>
                      {day.sessions}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* CLUBS EN BULLES */}
          {stats.clubs && stats.clubs.length > 0 && (
            <View style={styles.clubsBubblesContainer}>
              {stats.clubs.slice(0, 4).map((club, index) => (
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

          {/* STATS SECONDAIRES */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Flame size={14} color="#FF6B00" />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.totalSessions}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>ENTRAÎNEMENTS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <Award size={16} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.bestDay?.dayName || '-'}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>BEST DAY</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <BarChart2 size={16} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{Math.round((stats.activeDays / 7) * 100)}%</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>DE LA SEMAINE</Text>
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
    gap: 12,
    paddingBottom: 0,
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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
  titleDateText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Counter
  counterSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  counterNumber: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: -4,
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
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Week Calendar
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '800',
  },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: '#00D9FF',
  },
  dayDotText: {
    fontSize: 14,
    fontWeight: '900',
  },
  dayDotTextActive: {
    color: '#000000',
  },

  // Clubs Bubbles
  clubsBubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
  },
  clubBubble: {
    alignItems: 'center',
    width: 72,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent', // Pas de fond blanc pour les logos
  },
  clubBubbleLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  clubBubbleSport: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default WeeklyRecapCardV2;
