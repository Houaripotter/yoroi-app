import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Flame, Trophy, BarChart2 } from 'lucide-react-native';
import { MonthStats } from '@/lib/social-cards/useMonthStats';
import { SocialCardTopBanner, SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

// ============================================
// MONTHLY RECAP CARD V2 - Récap Mensuel
// Design épuré avec clubs complets + barre progression
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface MonthlyRecapCardV2Props {
  stats: MonthStats;
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

// Noms des sports par ID
const getSportDisplayName = (sportId: string): string => {
  const sportNames: Record<string, string> = {
    'jjb': 'Jiu-Jitsu Brésilien',
    'mma': 'MMA',
    'boxe': 'Boxe Anglaise',
    'kickboxing': 'Kickboxing',
    'muay_thai': 'Muay Thai',
    'karate': 'Karaté',
    'judo': 'Judo',
    'lutte': 'Lutte',
    'grappling': 'Grappling',
    'sambo': 'Sambo',
    'taekwondo': 'Taekwondo',
    'boxe_francaise': 'Boxe Française',
    'kung_fu': 'Kung Fu',
    'krav_maga': 'Krav Maga',
    'musculation': 'Musculation',
    'fitness': 'Fitness',
    'crossfit': 'CrossFit',
    'running': 'Course à pied',
    'natation': 'Natation',
    'yoga': 'Yoga',
  };
  return sportNames[sportId] || sportId.charAt(0).toUpperCase() + sportId.slice(1);
};

export const MonthlyRecapCardV2 = forwardRef<View, MonthlyRecapCardV2Props>(
  ({ stats, format, backgroundImage, weeklyGoal = 4 }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Calculer l'objectif mensuel basé sur l'objectif hebdo (4 semaines)
    const monthlyGoal = weeklyGoal * 4;
    const progressPercent = Math.min((stats.totalTrainings / monthlyGoal) * 100, 100);

    const content = (
      <>
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          style={styles.overlay}
        >
          {/* HAUT: Titre mois (minimaliste) */}
          <View style={styles.topContent}>
          {/* TITRE MOIS */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Calendar size={20} color="#D4AF37" />
              <Text style={styles.titleText}>{stats.monthName.toUpperCase()} {stats.year}</Text>
            </View>
          </View>

          {/* COMPTEUR PRINCIPAL */}
          <View style={styles.counterSection}>
            <Text style={styles.counterNumber}>{stats.totalTrainings}</Text>
            <Text style={styles.counterLabel}>ENTRAÎNEMENTS</Text>
          </View>
          </View>

          {/* CENTRE: VIDE pour voir la photo! */}
          <View style={styles.centerSpace} />

          {/* BAS: Barre + Clubs + Stats + Logo */}
          <View style={styles.bottomContent}>
          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Objectif {monthlyGoal} séances</Text>
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
              {stats.totalTrainings}/{monthlyGoal} séances
            </Text>
          </View>

          {/* CLUBS EN BULLES */}
          {stats.clubTrainings && stats.clubTrainings.length > 0 && (
            <View style={styles.clubsBubblesContainer}>
              {stats.clubTrainings.slice(0, 4).map((club, index) => (
                <View key={index} style={styles.clubBubble}>
                  {/* Badge compteur */}
                  <View style={styles.clubBubbleCount}>
                    <Text style={styles.clubBubbleCountText}>x{club.count}</Text>
                  </View>

                  {/* Logo circulaire */}
                  {club.clubLogo ? (
                    <Image source={{ uri: club.clubLogo }} style={styles.clubBubbleLogo} resizeMode="cover" />
                  ) : (
                    <View style={styles.clubBubbleLogoPlaceholder}>
                      <Text style={styles.clubBubbleInitial}>{club.clubName.charAt(0)}</Text>
                    </View>
                  )}

                  {/* Nom du club */}
                  <Text style={styles.clubBubbleName} numberOfLines={2}>{club.clubName}</Text>
                  {/* Sport */}
                  <Text style={styles.clubBubbleSport} numberOfLines={1}>
                    {club.sport ? getSportDisplayName(club.sport) : getSportName(club.clubName)}
                  </Text>
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
              <Trophy size={16} color="#D4AF37" />
              <Text style={styles.statValue}>S{stats.bestWeek?.weekNumber || '-'}</Text>
              <Text style={styles.statLabel}>BEST WEEK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <BarChart2 size={16} color="#D4AF37" />
              <Text style={styles.statValue}>{Math.round((stats.activeDays / 30) * 100)}%</Text>
              <Text style={styles.statLabel}>DU MOIS</Text>
            </View>
          </View>

          {/* FOOTER - YOROI (uniquement en bas maintenant) */}
          <SocialCardFooter variant="dark" />
          </View>
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

MonthlyRecapCardV2.displayName = 'MonthlyRecapCardV2';

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
  topContent: {
    paddingTop: 12,
  },
  centerSpace: {
    flex: 1,
  },
  bottomContent: {
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#D4AF37',
  },

  // Counter
  counterSection: {
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 56,
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

  // Clubs
  clubsSection: {
    paddingHorizontal: 16,
    gap: 8,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  clubCount: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  clubCountText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  clubLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  clubLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  clubInitial: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D4AF37',
  },
  clubInfo: {
    flex: 1,
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

  // Club Bubbles (nouvelle présentation)
  clubsBubblesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  clubBubble: {
    alignItems: 'center',
    width: 70,
    gap: 4,
  },
  clubBubbleCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 10,
    minWidth: 24,
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
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  clubBubbleInitial: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D4AF37',
  },
  clubBubbleName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 11,
  },
  clubBubbleSport: {
    fontSize: 8,
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

export default MonthlyRecapCardV2;
