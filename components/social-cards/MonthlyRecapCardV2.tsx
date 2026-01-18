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
  backgroundType?: 'photo' | 'black' | 'white';
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
  ({ stats, format, backgroundImage, backgroundType = 'black', weeklyGoal = 4 }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Calculer l'objectif mensuel basé sur l'objectif hebdo (4 semaines)
    const monthlyGoal = weeklyGoal * 4;
    const progressPercent = Math.min((stats.totalTrainings / monthlyGoal) * 100, 100);

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
    const clubBubbleBg = isLightBackground ? 'rgba(0,0,0,0.06)' : 'rgba(212, 175, 55, 0.2)';
    const clubBubbleBorder = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(212, 175, 55, 0.5)';

    const content = (
      <View style={styles.contentContainer}>
        {/* HAUT: Titre mois (minimaliste) */}
        <View style={styles.topContent}>
          {/* TITRE MOIS */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Calendar size={20} color={goldColor} />
              <Text style={[styles.titleText, { color: goldColor }]}>{stats.monthName.toUpperCase()} {stats.year}</Text>
            </View>
          </View>

          {/* COMPTEUR PRINCIPAL */}
          <View style={styles.counterSection}>
            <Text style={[styles.counterNumber, { color: textPrimary }]}>{stats.totalTrainings}</Text>
            <Text style={[styles.counterLabel, { color: goldColor }]}>ENTRAÎNEMENTS</Text>
          </View>
        </View>

        {/* CENTRE: VIDE pour voir la photo! */}
        <View style={styles.centerSpace} />

        {/* BAS: Barre + Clubs + Stats + Logo */}
        <View style={styles.bottomContent}>
          {/* BARRE DE PROGRESSION */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: textSecondary }]}>Objectif {monthlyGoal} séances</Text>
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
                    <View style={[styles.clubBubbleLogoPlaceholder, { backgroundColor: clubBubbleBg, borderColor: clubBubbleBorder }]}>
                      <Text style={[styles.clubBubbleInitial, { color: goldColor }]}>{club.clubName.charAt(0)}</Text>
                    </View>
                  )}

                  {/* Nom du club */}
                  <Text style={[styles.clubBubbleName, { color: textPrimary }]} numberOfLines={2}>{club.clubName}</Text>
                  {/* Sport */}
                  <Text style={[styles.clubBubbleSport, { color: goldColor }]} numberOfLines={1}>
                    {club.sport ? getSportDisplayName(club.sport) : getSportName(club.clubName)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* STATS SECONDAIRES */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Flame size={14} color="#FF6B00" />
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.totalTrainings}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>ENTRAÎNEMENTS</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <Trophy size={16} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>S{stats.bestWeek?.weekNumber || '-'}</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>BEST WEEK</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.statItem}>
              <BarChart2 size={16} color={goldColor} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{Math.round((stats.activeDays / 30) * 100)}%</Text>
              <Text style={[styles.statLabel, { color: textMuted }]}>DU MOIS</Text>
            </View>
          </View>

          {/* FOOTER - YOROI */}
          <SocialCardFooter variant={brandingVariant} />
        </View>
      </View>
    );

    // Fond avec photo - Gradient SEULEMENT en bas pour les infos
    if (backgroundImage) {
      return (
        <View
          ref={ref}
          style={[styles.container, { width: CARD_WIDTH, height: cardHeight, backgroundColor: '#000000' }]}
          collapsable={false}
        >
          {/* Photo en contain pour voir toute l'image */}
          <Image
            source={{ uri: backgroundImage }}
            style={styles.backgroundImageContain}
            resizeMode="contain"
          />
          {/* Gradient: assombrit en haut (titre) et en bas (infos), transparent au centre (photo visible) */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.7)',     // 0% - Sombre pour le titre
              'rgba(0,0,0,0.4)',     // 15% - Transition
              'rgba(0,0,0,0)',       // 30% - Transparent
              'rgba(0,0,0,0)',       // 45% - Transparent (centre - photo bien visible)
              'rgba(0,0,0,0)',       // 55% - Transparent
              'rgba(0,0,0,0.5)',     // 65% - Commence à assombrir pour les infos
              'rgba(0,0,0,0.85)',    // 85% - Sombre pour les stats
              'rgba(0,0,0,0.95)',    // 100% - Très sombre pour le footer
            ]}
            locations={[0, 0.15, 0.3, 0.45, 0.55, 0.65, 0.85, 1]}
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
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  contentContainer: {
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
    backgroundColor: 'transparent', // Pas de fond blanc pour les logos
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
