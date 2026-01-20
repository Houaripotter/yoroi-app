// ============================================
// SESSION CARD COMPONENT
// ============================================
// Carte partagée réutilisable (Last Session + Modal Validation)

import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Trophy, Clock, Calendar, MapPin, Flame, Dumbbell, Zap, Timer } from 'lucide-react-native';
import { Training } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

interface SessionCardProps {
  training: Partial<Training>;
  backgroundImage?: string | null;
  backgroundType?: 'photo' | 'black' | 'white';
  customLocation?: string;
  isLandscape?: boolean;
  width?: number;
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ training, backgroundImage, backgroundType = 'black', customLocation, isLandscape = false, width = DEFAULT_WIDTH }, ref) => {
    const CARD_HEIGHT_PORTRAIT = width * (16 / 9);
    const CARD_HEIGHT_LANDSCAPE = width * (9 / 16);
    const cardHeight = isLandscape ? CARD_HEIGHT_LANDSCAPE : CARD_HEIGHT_PORTRAIT;

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

    const displayLocation = customLocation || (training.is_outdoor ? 'Plein air' : 'Salle');

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
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    const hasClubLogo = !!clubLogoSource;

    const dateObj = training.date ? new Date(training.date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const isLightBackground = backgroundType === 'white';
    const brandingVariant = isLightBackground ? 'light' : 'dark';
    const textPrimary = isLightBackground ? '#1a1a1a' : '#FFFFFF';
    const textSecondary = isLightBackground ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
    const statsRowBg = isLightBackground ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';
    const statsRowBorder = isLightBackground ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    // Muscles logic
    const musclesList = training.muscles ? training.muscles.split(',').map(m => m.trim()) : [];
    const showMuscles = musclesList.length > 0;

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
        </View>

        {/* CENTRE: Colonne Gauche (Stats) + Droite (Icone) */}
        <View style={styles.centerRow}>
          {/* COLONNE GAUCHE: Stats détaillées */}
          <View style={styles.leftColumn}>
            {/* Muscles */}
            {showMuscles && (
              <View style={styles.statBlockLeft}>
                <View style={styles.statLabelRow}>
                  <Dumbbell size={12} color={GOLD_COLOR} />
                  <Text style={[styles.statLabelLeft, { color: textSecondary }]}>CIBLÉS</Text>
                </View>
                <View style={styles.musclesContainer}>
                  {musclesList.slice(0, 3).map((m, i) => (
                    <Text key={i} style={[styles.muscleText, { color: textPrimary }]}>
                      • {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  ))}
                  {musclesList.length > 3 && (
                    <Text style={[styles.muscleText, { color: textPrimary }]}>...</Text>
                  )}
                </View>
              </View>
            )}

            {/* Durée */}
            <View style={styles.statBlockLeft}>
              <View style={styles.statLabelRow}>
                <Timer size={12} color={GOLD_COLOR} />
                <Text style={[styles.statLabelLeft, { color: textSecondary }]}>DURÉE</Text>
              </View>
              <Text style={[styles.statValueLeft, { color: textPrimary }]}>
                {training.duration_minutes} min
              </Text>
            </View>

            {/* Distance (si dispo) */}
            {hasDistance && (
              <View style={styles.statBlockLeft}>
                <View style={styles.statLabelRow}>
                  <MapPin size={12} color={GOLD_COLOR} />
                  <Text style={[styles.statLabelLeft, { color: textSecondary }]}>DISTANCE</Text>
                </View>
                <Text style={[styles.statValueLeft, { color: textPrimary }]}>
                  {Number(training.distance).toFixed(2)} km
                </Text>
              </View>
            )}

            {/* Allure (si dispo) */}
            {pace && (
              <View style={styles.statBlockLeft}>
                <View style={styles.statLabelRow}>
                  <Trophy size={12} color={GOLD_COLOR} />
                  <Text style={[styles.statLabelLeft, { color: textSecondary }]}>ALLURE</Text>
                </View>
                <Text style={[styles.statValueLeft, { color: textPrimary }]}>
                  {pace} /km
                </Text>
              </View>
            )}

            {/* Rounds (si dispo) */}
            {hasRounds && (
              <View style={styles.statBlockLeft}>
                <View style={styles.statLabelRow}>
                  <Clock size={12} color={GOLD_COLOR} />
                  <Text style={[styles.statLabelLeft, { color: textSecondary }]}>ROUNDS</Text>
                </View>
                <Text style={[styles.statValueLeft, { color: textPrimary }]}>
                  {training.rounds}
                </Text>
              </View>
            )}

            {/* Intensité */}
            {training.intensity && (
              <View style={styles.statBlockLeft}>
                <View style={styles.statLabelRow}>
                  <Flame size={12} color={GOLD_COLOR} />
                  <Text style={[styles.statLabelLeft, { color: textSecondary }]}>INTENSITÉ</Text>
                </View>
                <Text style={[styles.statValueLeft, { color: textPrimary }]}>
                  {training.intensity}/10
                </Text>
              </View>
            )}

            {/* Calories */}
            {(training.calories || 0) > 0 && (
              <View style={styles.statBlockLeft}>
                <View style={styles.statLabelRow}>
                  <Zap size={12} color={GOLD_COLOR} />
                  <Text style={[styles.statLabelLeft, { color: textSecondary }]}>CALORIES</Text>
                </View>
                <Text style={[styles.statValueLeft, { color: textPrimary }]}>
                  {training.calories} kcal
                </Text>
              </View>
            )}
          </View>

          {/* COLONNE DROITE: Icone Sport */}
          <View style={styles.rightColumn}>
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
            <Text style={[styles.sportNameSmall, { color: textPrimary }]}>
              {sportName}
            </Text>
          </View>
        </View>

        {/* BAS: Footer seulement (les stats sont à gauche) */}
        <View style={styles.bottomContent}>
          {/* INFOS SECONDAIRES (Date, Lieu) */}
          <View style={[styles.statsRow, { backgroundColor: statsRowBg, borderColor: statsRowBorder }]}>
            <View style={styles.statItem}>
              <Clock size={14} color={GOLD_COLOR} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {training.start_time || '--:--'}
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

          {/* FOOTER */}
          <View style={{ paddingBottom: 10, paddingTop: 10 }}>
            <SocialCardFooter variant={brandingVariant} />
          </View>
        </View>
      </View>
    );

    // ... (Le reste du code pour les rendus conditionnels reste identique)
    if (backgroundImage) {
        return (
          <View
            ref={ref}
            style={[styles.card, { backgroundColor: '#000000', width, height: cardHeight }]}
            collapsable={false}
          >
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
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    flex: 1,
  },
  leftColumn: {
    flex: 1,
    gap: 16,
    alignItems: 'flex-start',
  },
  rightColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 4,
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
  
  // Left Stats Styles
  statBlockLeft: {
    gap: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabelLeft: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValueLeft: {
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 18, // Aligner sous le label (approx)
  },
  musclesContainer: {
    marginLeft: 18,
    marginTop: 2,
  },
  muscleText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Right Icon Styles
  sportIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  clubLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  sportNameSmall: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  centerSpace: {
    // Supprimé car remplacé par centerRow
  },
  bottomContent: {
    gap: 12,
    paddingBottom: 0,
  },
  
  // Extra Stats (Distance/Pace)
  extraStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 8,
  },
  extraStatItem: {
    alignItems: 'center',
  },
  extraStatValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  extraStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
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
