// ============================================
// SESSION CARD COMPONENT - PREMIUM DESIGN
// ============================================
// Design style "Strava / UFC" avec bandes noires et lignes dorées
// Photo entière (contain) et stats détaillées

import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Trophy, Clock, Calendar, MapPin, Flame, Dumbbell, Zap, Timer } from 'lucide-react-native';
import { Training } from '@/lib/database';
import { getClubLogoSource, getSportIcon, getSportName } from '@/lib/sports';
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
  yearlyCount?: number; 
  yearlyObjective?: number;
  monthlyCount?: number; // Nouveau
  weeklyCount?: number; // Nouveau
  showYearlyCount?: boolean;
  showMonthlyCount?: boolean; // Nouveau
  showWeeklyCount?: boolean; // Nouveau
  showExercises?: boolean; // Nouveau
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ 
    training, backgroundImage, backgroundType = 'black', customLocation, isLandscape = false, width = DEFAULT_WIDTH, 
    yearlyCount, yearlyObjective, monthlyCount, weeklyCount,
    showYearlyCount = false, showMonthlyCount = false, showWeeklyCount = false, showExercises = true 
  }, ref) => {
    
    const CARD_HEIGHT = width * (16 / 9);
    const dateObj = training.date ? new Date(training.date) : new Date();
    
    // Stats Calculations
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
    
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();

    // Muscles & Exercices logic
    const musclesList = training.muscles ? training.muscles.split(',').map(m => m.trim()) : [];
    const exercisesList = training.exercises || [];
    
    // Header Info
    const sportId = training.sport?.split(',')[0].trim() || 'autre';
    const sportNameStr = training.sport?.split(',').map(s => getSportName(s)).join(' + ') || 'ENTRAÎNEMENT';

    const renderDataOverlay = () => (
      <View style={styles.overlayContainer}>
        
        {/* BANDEAU HAUT (NOIR) */}
        <View style={styles.topBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.headerTitleRow}>
              <Text style={styles.previewLabel}>APERÇU DE TA CARD</Text>
            </View>
          </View>
          
          {/* Section des compteurs (Haut Droite) */}
          <View style={styles.counterSectionTop}>
            {showYearlyCount && yearlyCount !== undefined && (
              <View style={styles.yearlyCounterBox}>
                <Text style={styles.yearlyCounterValue}>{yearlyCount}</Text>
                <Text style={styles.yearlyCounterLabel}>/AN</Text>
              </View>
            )}
            
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {showMonthlyCount && monthlyCount !== undefined && (
                <View style={[styles.yearlyCounterBox, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'transparent' }]}>
                  <Text style={[styles.yearlyCounterValue, { fontSize: 10 }]}>{monthlyCount}</Text>
                  <Text style={[styles.yearlyCounterLabel, { fontSize: 7 }]}>/MOIS</Text>
                </View>
              )}
              {showWeeklyCount && weeklyCount !== undefined && (
                <View style={[styles.yearlyCounterBox, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'transparent' }]}>
                  <Text style={[styles.yearlyCounterValue, { fontSize: 10 }]}>{weeklyCount}</Text>
                  <Text style={[styles.yearlyCounterLabel, { fontSize: 7 }]}>/SEMAINE</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* LIGNE DORÉE PREMIUM HAUT (COURTE ET CENTRÉE) */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.premiumGoldLineShort} />
        </View>

        {/* ESPACE MILIEU (IMAGE) */}
        <View style={styles.imageSpace} />

        {/* LIGNE DORÉE PREMIUM BAS (COURTE ET CENTRÉE) */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.premiumGoldLineShort} />
        </View>

        {/* BANDEAU BAS (NOIR) */}
        <View style={styles.bottomBar}>
          <View style={styles.statsContainer}>
            {/* Colonne de gauche : Stats techniques & EXERCICES */}
            <View style={styles.technicalColumn}>
              
              {/* Club & Lieu */}
              <View style={[styles.techRow, { marginBottom: 4 }]}>
                {clubLogoSource ? (
                  <Image source={clubLogoSource} style={styles.clubLogoSmall} resizeMode="contain" />
                ) : (
                  <MaterialCommunityIcons name={getSportIcon(sportId) as any} size={16} color={GOLD_COLOR} />
                )}
                <Text style={[styles.techText, { color: GOLD_COLOR }]}>
                  {training.club_name?.toUpperCase() || 'YOROI'} • {training.is_outdoor ? 'PLEIN AIR' : 'EN SALLE'}
                </Text>
              </View>

              {/* Exercices effectués */}
              {showExercises && exercisesList.length > 0 && (
                <View style={styles.exercisesBox}>
                  {exercisesList.slice(0, 3).map((ex, i) => (
                    <Text key={i} style={styles.exerciseItemText} numberOfLines={1}>
                      • {ex.name.toUpperCase()} {ex.sets ? `(${ex.sets.length}S)` : ''}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.techRow}>
                <Timer size={12} color={GOLD_COLOR} />
                <Text style={styles.techText}>{training.duration_minutes} MIN</Text>
                {training.intensity && (
                  <Text style={[styles.techText, { color: GOLD_COLOR }]}> • INT {training.intensity}/10</Text>
                )}
              </View>

              <View style={styles.techRow}>
                {(training.calories || 0) > 0 && (
                  <Text style={styles.techText}>{training.calories} KCAL</Text>
                )}
                {training.technique_rating && (
                  <Text style={[styles.techText, { color: GOLD_COLOR }]}> • TECH {training.technique_rating}/5</Text>
                )}
                {training.heart_rate && (
                  <Text style={styles.techText}> • {training.heart_rate} BPM</Text>
                )}
              </View>
            </View>

            {/* Chiffres Clés (Running / Cardio) */}
            {(hasDistance || hasRounds) && (
              <View style={styles.keyStats}>
                {hasDistance && (
                  <View style={styles.keyStatItem}>
                    <Text style={styles.keyStatValue}>{Number(training.distance).toFixed(2)}</Text>
                    <Text style={styles.keyStatLabel}>KM</Text>
                  </View>
                )}
                {pace && (
                  <View style={styles.keyStatItem}>
                    <Text style={styles.keyStatValue}>{pace}</Text>
                    <Text style={styles.keyStatLabel}>/KM</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* BRANDING FOOTER */}
          <View style={styles.cardFooter}>
            <SocialCardFooter variant="dark" />
          </View>
        </View>
      </View>
    );

    return (
      <View
        ref={ref}
        style={[styles.card, { width, height: CARD_HEIGHT, backgroundColor: '#000000' }]}
        collapsable={false}
      >
        {/* L'IMAGE DE FOND (CONTAIN) */}
        {backgroundImage ? (
          <Image
            source={{ uri: backgroundImage }}
            style={styles.mainImage}
            resizeMode="contain"
          />
        ) : (
          <LinearGradient
            colors={['#0f0f1a', '#1a1a2e']}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* OVERLAY AVEC INFOS ET BANDES NOIRES */}
        {renderDataOverlay()}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  mainImage: {
    position: 'absolute',
    top: '15%', // Décalage pour laisser voir le haut noir
    bottom: '25%', // Décalage pour laisser voir le bas noir
    left: 0,
    right: 0,
    width: '100%',
    height: '60%', // La photo occupe le centre
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    height: '15%',
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerLeft: {
    flexDirection: 'column',
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clubLogoSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD_COLOR,
  },
  clubNameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  counterSectionTop: {
    alignItems: 'flex-end',
  },
  yearlyCounterBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  yearlyCounterValue: {
    color: GOLD_COLOR,
    fontSize: 14,
    fontWeight: '900',
  },
  yearlyCounterLabel: {
    color: GOLD_COLOR,
    fontSize: 8,
    fontWeight: '700',
    marginLeft: 2,
    opacity: 0.8,
  },
  premiumGoldLine: {
    height: 1.5,
    backgroundColor: GOLD_COLOR,
    width: '100%',
    shadowColor: GOLD_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  imageSpace: {
    flex: 1,
  },
  bottomBar: {
    height: '25%',
    backgroundColor: '#000000',
    padding: 16,
    justifyContent: 'space-between',
  },
  exercisesBox: {
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: GOLD_COLOR,
    paddingLeft: 8,
  },
  exerciseItemText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  technicalColumn: {
    flex: 1,
    gap: 8,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  techText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
  },
  keyStats: {
    flexDirection: 'row',
    gap: 20, // Plus d'espace
    alignItems: 'flex-end',
    flexWrap: 'wrap', // Permettre le wrap si trop large
    justifyContent: 'flex-end',
    maxWidth: '50%', // Limiter la largeur pour laisser de la place à la colonne technique
  },
  keyStatItem: {
    alignItems: 'center',
    minWidth: 45, // Largeur minimale pour éviter le tassement
  },
  keyStatValue: {
    color: '#FFFFFF',
    fontSize: 22, // Réduit légèrement
    fontWeight: '900',
  },
  keyStatLabel: {
    color: GOLD_COLOR,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});