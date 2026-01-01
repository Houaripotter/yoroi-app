import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Flame, Award, BarChart2 } from 'lucide-react-native';
import { WeekStats } from '@/lib/social-cards/useWeekStats';
import { SocialCardTopBanner, SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

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
  username?: string;
  weeklyGoal?: number; // Objectif hebdo (ex: 4 séances/semaine)
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
  if (lowerName.includes('muscu') || lowerName.includes('fitness')) return 'Musculation';
  return 'Entraînement';
};

export const WeeklyRecapCardV2 = forwardRef<View, WeeklyRecapCardV2Props>(
  ({ stats, format, backgroundImage, weeklyGoal = 4 }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Calculer la progression
    const progressPercent = Math.min((stats.totalSessions / weeklyGoal) * 100, 100);

    const content = (
      <>
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        >
          {/* TOP BANNER - YOROI */}
          <SocialCardTopBanner variant="dark" />

          {/* TITRE SEMAINE - Sur 2 lignes */}
          <View style={styles.titleSection}>
            {(() => {
              // Séparer "Semaine X • Dates" en deux lignes
              const parts = stats.weekLabel.split('•');
              const weekNumber = parts[0]?.trim() || stats.weekLabel;
              const dateRange = parts[1]?.trim() || '';
              return (
                <>
                  <View style={styles.titleRow}>
                    <Calendar size={18} color="#D4AF37" />
                    <Text style={styles.titleText}>{weekNumber.toUpperCase()}</Text>
                  </View>
                  {dateRange && (
                    <Text style={styles.titleDateText}>{dateRange.toUpperCase()}</Text>
                  )}
                </>
              );
            })()}
          </View>

          {/* COMPTEUR PRINCIPAL */}
          <View style={styles.counterSection}>
            <Text style={styles.counterNumber}>{stats.totalSessions}</Text>
            <Text style={styles.counterLabel}>ENTRAÎNEMENTS</Text>
          </View>

          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Objectif {weeklyGoal} séances</Text>
              <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.totalSessions}/{weeklyGoal} séances
            </Text>
          </View>

          {/* CALENDRIER SEMAINE */}
          <View style={styles.weekCalendar}>
            {stats.calendar.map((day, index) => (
              <View key={index} style={styles.dayColumn}>
                <Text style={styles.dayName}>{day.dayName}</Text>
                <View
                  style={[
                    styles.dayDot,
                    day.isActive && styles.dayDotActive,
                    day.isToday && styles.dayDotToday,
                  ]}
                >
                  {day.sessions > 0 && (
                    <Text style={[styles.dayDotText, day.isActive && styles.dayDotTextActive]}>
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
                  {/* Badge compteur */}
                  <View style={styles.clubBubbleCount}>
                    <Text style={styles.clubBubbleCountText}>x{club.count}</Text>
                  </View>

                  {/* Logo circulaire */}
                  {club.clubLogo ? (
                    <Image source={club.clubLogo} style={styles.clubBubbleLogo} resizeMode="cover" />
                  ) : (
                    <View style={styles.clubBubbleLogoPlaceholder}>
                      <Text style={styles.clubBubbleInitial}>{club.clubName.charAt(0)}</Text>
                    </View>
                  )}

                  {/* Nom du club */}
                  <Text style={styles.clubBubbleName} numberOfLines={2}>{club.clubName}</Text>
                  {/* Sport */}
                  <Text style={styles.clubBubbleSport} numberOfLines={1}>{getSportName(club.clubName)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* STATS SECONDAIRES */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Flame size={16} color="#FF6B00" />
              <Text style={styles.statValue}>{stats.activeDays}</Text>
              <Text style={styles.statLabel}>JOURS ACTIFS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Award size={16} color="#D4AF37" />
              <Text style={styles.statValue}>{stats.bestDay?.dayName || '-'}</Text>
              <Text style={styles.statLabel}>BEST DAY</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <BarChart2 size={16} color="#D4AF37" />
              <Text style={styles.statValue}>{Math.round((stats.activeDays / 7) * 100)}%</Text>
              <Text style={styles.statLabel}>DE LA SEMAINE</Text>
            </View>
          </View>

          {/* FOOTER - YOROI */}
          <SocialCardFooter variant="dark" />
        </LinearGradient>
      </>
    );

    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        {backgroundImage ? (
          <ImageBackground
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            {content}
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={['#0a0a0a', '#1a1a2e', '#0f0f1a']}
            style={styles.defaultBackground}
          >
            <SocialCardWatermark show={!backgroundImage} />
            {content}
          </LinearGradient>
        )}
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
    letterSpacing: 2,
    color: '#D4AF37',
  },
  titleDateText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },

  // Counter
  counterSection: {
    alignItems: 'center',
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
  counterLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#D4AF37',
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

  // Week Calendar
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4AF37',
  },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: 'rgba(255, 255, 255, 0.5)',
  },
  dayDotTextActive: {
    color: '#000000',
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
  clubName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clubSport: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D4AF37',
    marginTop: 1,
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

export default WeeklyRecapCardV2;
