// ============================================
// SESSION CARD COMPONENT
// ============================================
// Carte partagée réutilisable (Last Session + Modal Validation)

import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Trophy, Clock, Calendar, MapPin } from 'lucide-react-native';
import { Training } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Adapter la largeur si utilisé dans un modal (souvent plus petit que l'écran)
const DEFAULT_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

interface SessionCardProps {
  training: Partial<Training>; // Partial car dans le modal on n'a pas encore tout l'objet DB
  backgroundImage?: string | null;
  backgroundType?: 'photo' | 'black' | 'white';
  customLocation?: string;
  isLandscape?: boolean;
  width?: number; // Largeur personnalisable
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ training, backgroundImage, backgroundType = 'black', customLocation, isLandscape = false, width = DEFAULT_WIDTH }, ref) => {
    // Calculs de dimensions
    const CARD_HEIGHT_PORTRAIT = width * (16 / 9);
    const CARD_HEIGHT_LANDSCAPE = width * (9 / 16);
    const cardHeight = isLandscape ? CARD_HEIGHT_LANDSCAPE : CARD_HEIGHT_PORTRAIT;

    // Gestion du nom du sport
    const getDisplayName = (s: string) => {
      if (!s) return 'Entraînement';
      try {
        const sportList = require('@/lib/sports').SPORTS;
        const found = sportList.find((sp: any) => sp.id === s.toLowerCase());
        if (found) return found.name;
      } catch (e) {}
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const sportString = training.sport || 'training';
    const sportName = sportString.includes(',') 
      ? sportString.split(',').map(s => getDisplayName(s.trim())).join(' + ') 
      : getDisplayName(sportString);

    // Icone et Couleur
    let sportIcon = 'trophy';
    let sportColor = GOLD_COLOR;
    try {
      const primarySportId = sportString.split(',')[0].trim().toLowerCase();
      const sportList = require('@/lib/sports').SPORTS;
      const primarySport = sportList.find((s: any) => s.id === primarySportId);
      if (primarySport) {
        sportIcon = primarySport.icon;
        sportColor = primarySport.color;
      }
    } catch (e) {}

    // Lieu
    const displayLocation = customLocation || (training.is_outdoor ? 'Plein air' : 'Salle');

    // Allure (Pace)
    const calculatePace = () => {
      if (!training.distance || !training.duration_minutes) return null;
      const totalSeconds = training.duration_minutes * 60;
      const secondsPerKm = totalSeconds / training.distance;
      const minutes = Math.floor(secondsPerKm / 60);
      const seconds = Math.round(secondsPerKm % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const pace = calculatePace();
    const hasDistance = !!training.distance && training.distance > 0;
    const hasRounds = !!training.rounds && training.rounds > 0;

    // Logo Club
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    const hasClubLogo = !!clubLogoSource;

    // Date
    const dateObj = training.date ? new Date(training.date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    // Styles dynamiques
    const isLightBackground = backgroundType === 'white';
    const brandingVariant = isLightBackground ? 'light' : 'dark';
    const textPrimary = isLightBackground ? '#1a1a1a' : '#FFFFFF';
    const textSecondary = isLightBackground ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
    const statsRowBg = isLightBackground ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    const statsRowBorder = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    const content = (
      <View style={styles.contentContainer}>
        {/* HAUT: Label + Date */}
        <View style={styles.topContent}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Trophy size={14} color={GOLD_COLOR} />
              <Text style={[styles.titleText, { color: GOLD_COLOR }]}>SÉANCE TERMINÉE</Text>
            </View>
            <Text style={[styles.titleDateText, { color: textSecondary }]}>
              {formattedDate.toUpperCase()}
            </Text>
          </View>

          {/* ICÔNE SPORT ou LOGO CLUB */}
          <View style={[
            styles.sportIconContainer, 
            { 
              backgroundColor: '#FFFFFF', 
              borderWidth: 3, 
              borderColor: hasClubLogo ? GOLD_COLOR : sportColor 
            }
          ]}>
            {hasClubLogo ? (
              <Image
                source={clubLogoSource}
                style={styles.clubLogo}
                resizeMode="contain"
              />
            ) : (
              <MaterialCommunityIcons name={sportIcon as any} size={42} color={sportColor} />
            )}
          </View>

          {/* NOM DU SPORT */}
          <Text style={[styles.sportName, { color: textPrimary, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 4 }]}>
            {sportName}
          </Text>
        </View>

        {/* CENTRE: Espace pour l'avatar/photo */}
        <View style={styles.centerSpace} />

        {/* BAS: Stats + Footer */}
        <View style={styles.bottomContent}>
          {/* STATS PRINCIPALES */}
          <View style={styles.proStatsGrid}>
            {/* COLONNE 1 */}
            <View style={styles.proStatBlock}>
              <Text style={[styles.proStatValue, { color: GOLD_COLOR }]}>
                {hasDistance 
                  ? Number(training.distance).toFixed(2) 
                  : (hasRounds ? training.rounds : training.duration_minutes)}
              </Text>
              <Text style={[styles.proStatLabel, { color: textSecondary }]}>
                {hasDistance ? 'KILOMÈTRES' : (hasRounds ? 'ROUNDS' : 'MINUTES')}
              </Text>
            </View>

            {/* COLONNE 2 */}
            <View style={styles.proStatBlock}>
              <Text style={[styles.proStatValue, { color: textPrimary }]}>
                {pace 
                  ? pace 
                  : (hasRounds ? `${training.round_duration}m` : (training.calories || '---'))}
              </Text>
              <Text style={[styles.proStatLabel, { color: textSecondary }]}>
                {pace ? 'ALLURE (/KM)' : (hasRounds ? 'TEMPS/RD' : 'CALORIES')}
              </Text>
            </View>

            {/* COLONNE 3 */}
            <View style={styles.proStatBlock}>
              <Text style={[styles.proStatValue, { color: textPrimary }]}>
                {hasDistance 
                  ? training.duration_minutes 
                  : (training.intensity ? `${training.intensity}/10` : (training.technique_rating ? `${training.technique_rating}/5` : '---'))}
              </Text>
              <Text style={[styles.proStatLabel, { color: textSecondary }]}>
                {hasDistance ? 'DURÉE (MIN)' : (training.intensity ? 'INTENSITÉ' : 'TECHNIQUE')}
              </Text>
            </View>
          </View>

          {/* INFOS SECONDAIRES */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Clock size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {training.start_time || '--:--'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: statsRowBorder }]} />
            <View style={styles.statItem}>
              <Calendar size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: statsRowBorder }]} />
            <View style={styles.statItem}>
              <MapPin size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1}>
                {displayLocation}
              </Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={{ paddingBottom: 10 }}>
          <SocialCardFooter variant={brandingVariant} />
        </View>
      </View>
    );

    // Rendu avec Photo Contain + Fond Noir (Smart Fit)
    if (backgroundImage) {
      return (
        <View
          ref={ref}
          style={[styles.card, { backgroundColor: '#000000', width, height: cardHeight }]}
          collapsable={false}
        >
          {/* Image en contain sur fond noir */}
          <Image
            source={{ uri: backgroundImage }}
            style={styles.backgroundImageContain}
            resizeMode="contain"
          />
          
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.2, 0.7, 1]}
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
          style={[styles.card, { backgroundColor: '#FFFFFF', width, height: cardHeight }]}
          collapsable={false}
        >
          {content}
        </View>
      );
    }

    // Fond noir (défaut)
    return (
      <View
        ref={ref}
        style={[styles.card, { width, height: cardHeight }]}
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  defaultBackground: {
    flex: 1,
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
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContent: {
    paddingTop: 24,
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
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
  },
  titleDateText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  sportIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  clubLogo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  sportName: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  centerSpace: {
    flex: 3,
    minHeight: 60,
  },
  bottomContent: {
    gap: 12,
    paddingBottom: 0,
  },
  proStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  proStatBlock: {
    alignItems: 'center',
    flex: 1,
  },
  proStatValue: {
    fontSize: 24, // Un peu plus petit pour tenir dans le modal si besoin
    fontWeight: '900',
    letterSpacing: -1,
  },
  proStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
});
