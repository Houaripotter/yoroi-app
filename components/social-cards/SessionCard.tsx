// ============================================
// SESSION CARD COMPONENT - VERSION ULTRA PREMIUM V7
// ============================================
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Trophy, Clock, Calendar, MapPin, Flame, Dumbbell, Zap, Timer, Heart, Activity } from 'lucide-react-native';
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
  // Toggles
  showDate?: boolean;
  showYearlyCount?: boolean;
  showMonthlyCount?: boolean;
  showWeeklyCount?: boolean;
  showGoalProgress?: boolean;
  showClub?: boolean;
  showLieu?: boolean;
  showExercises?: boolean;
  showStats?: boolean;
  // Valeurs
  yearlyCount?: number;
  monthlyCount?: number;
  weeklyCount?: number;
  yearlyObjective?: number;
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ 
    training, backgroundImage, backgroundType = 'black', customLocation, isLandscape = false, width = DEFAULT_WIDTH,
    showDate = true, showYearlyCount = true, showMonthlyCount = true, showWeeklyCount = true, 
    showGoalProgress = true, showClub = true, showLieu = true, showExercises = true, showStats = true,
    yearlyCount = 0, monthlyCount = 0, weeklyCount = 0, yearlyObjective = 365
  }, ref) => {
    
    const CARD_HEIGHT = width * (16 / 9);
    const dateObj = training.date ? new Date(training.date) : new Date();
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toUpperCase();

    const sportId = training.sport?.split(',')[0].trim() || 'autre';
    const sportNameStr = training.sport?.split(',').map(s => getSportName(s)).join(' + ') || 'SÉANCE';

    // Calcul de la progression
    const progressPercent = Math.min(100, (yearlyCount / yearlyObjective) * 100);

    return (
      <View ref={ref} style={[styles.card, { width, height: CARD_HEIGHT }]} collapsable={false}>
        {/* FOND PHOTO (CONTAIN) */}
        <View style={styles.imageBackgroundContainer}>
          {backgroundImage ? (
            <Image source={{ uri: backgroundImage }} style={styles.mainImage} resizeMode="contain" />
          ) : (
            <LinearGradient colors={['#0a0a0a', '#1a1a1a']} style={StyleSheet.absoluteFill} />
          )}
        </View>

        {/* === BANDEAU HAUT (NOIR) === */}
        <View style={styles.topBar}>
          <View style={styles.headerRow}>
            {/* GAUCHE: DATE & SPORT */}
            <View style={styles.headerLeft}>
              {showDate && <Text style={styles.dateText}>{formattedDate}</Text>}
              <Text style={styles.sportTitleTop}>{sportNameStr.toUpperCase()}</Text>
              
              {/* CLUB LOGO SOUS LE SPORT SI EXISTE */}
              {showClub && clubLogoSource && (
                <View style={styles.clubLogoContainer}>
                  <Image source={clubLogoSource} style={styles.clubLogoHeader} resizeMode="contain" />
                </View>
              )}
            </View>

            {/* DROITE: COMPTEURS GÉANTS & BARRE DE PROGRESSION */}
            <View style={styles.headerRight}>
              <View style={styles.megaCountersRow}>
                {showMonthlyCount && (
                  <View style={styles.megaCounter}>
                    <Text style={[styles.megaCounterValue, { color: '#0ABAB5' }]}>{monthlyCount}</Text>
                    <Text style={styles.megaCounterLabel}>MOIS</Text>
                  </View>
                )}
                {showYearlyCount && (
                  <View style={styles.megaCounter}>
                    <Text style={[styles.megaCounterValue, { color: GOLD_COLOR }]}>{yearlyCount}</Text>
                    <Text style={styles.megaCounterLabel}>ANNEE</Text>
                  </View>
                )}
              </View>

              {/* BARRE DE PROGRESSION GÉANTE */}
              {showGoalProgress && (
                <View style={styles.megaProgressBarContainer}>
                  <View style={styles.megaProgressBarBg}>
                    <LinearGradient 
                      colors={[GOLD_COLOR, '#F59E0B']} 
                      start={{x:0, y:0}} end={{x:1, y:0}}
                      style={[styles.megaProgressBarFill, { width: `${progressPercent}%` }]} 
                    />
                  </View>
                  <Text style={styles.megaProgressText}>OBJECTIF: {yearlyCount}/{yearlyObjective}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* LIGNE DORÉE CENTRÉE */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.goldLineShort} />
        </View>

        {/* ESPACE MILIEU (POUR LA PHOTO) */}
        <View style={styles.imageSpace} />

        {/* LIGNE DORÉE CENTRÉE */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.goldLineShort} />
        </View>

        {/* === BANDEAU BAS (NOIR) === */}
        <View style={styles.bottomBar}>
          <View style={styles.mainStatsRow}>
            
            {/* GAUCHE: EXERCICES (EN DORÉ) */}
            <View style={styles.workedElementsColumn}>
              {showExercises && (
                <>
                  <Text style={styles.exercisesTitle}>EXERCICES TRAVAILLÉS</Text>
                  <View style={styles.exercisesList}>
                    {training.exercises && training.exercises.length > 0 ? (
                      training.exercises.slice(0, 6).map((ex, i) => (
                        <Text key={i} style={styles.exerciseGoldText}>
                          • {ex.name.toUpperCase()} {ex.sets ? `${ex.sets}x${ex.reps}` : ''}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.exerciseGoldText}>• {training.muscles?.toUpperCase().replace(/,/g, ' • ') || 'SÉANCE COMPLÈTE'}</Text>
                    )}
                  </View>
                </>
              )}
              {showLieu && (
                <View style={styles.lieuBadge}>
                  <MapPin size={12} color={GOLD_COLOR} />
                  <Text style={styles.lieuText}>{customLocation?.toUpperCase() || (training.is_outdoor ? 'PLEIN AIR' : 'EN SALLE')}</Text>
                </View>
              )}
            </View>

            {/* DROITE: STATS PERFORMANCE */}
            {showStats && (
              <View style={styles.machineStatsColumn}>
                <View style={styles.statLine}>
                  <Timer size={16} color={GOLD_COLOR} />
                  <Text style={styles.statValueText}>{training.duration_minutes} MIN</Text>
                </View>
                {training.distance && (
                  <View style={styles.statLine}>
                    <Activity size={16} color={GOLD_COLOR} />
                    <Text style={styles.statValueText}>{training.distance.toFixed(2)} KM</Text>
                  </View>
                )}
                {training.calories && (
                  <View style={styles.statLine}>
                    <Zap size={16} color={GOLD_COLOR} />
                    <Text style={styles.statValueText}>{training.calories} KCAL</Text>
                  </View>
                )}
                {training.heart_rate && (
                  <View style={styles.statLine}>
                    <Heart size={16} color="#EF4444" fill="#EF4444" />
                    <Text style={styles.statValueText}>{training.heart_rate} BPM</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* FOOTER BRANDING */}
          <View style={styles.brandingFooter}>
            <SocialCardFooter variant="dark" />
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#000000' },
  imageBackgroundContainer: { position: 'absolute', top: '22%', bottom: '35%', left: 0, right: 0, backgroundColor: '#000' },
  mainImage: { width: '100%', height: '100%' },
  
  // TOP BAR
  topBar: { height: '22%', backgroundColor: '#000000', paddingHorizontal: 20, paddingTop: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  dateText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  sportTitleTop: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  clubLogoContainer: { marginTop: 10 },
  clubLogoHeader: { width: 80, height: 40, borderRadius: 8 },
  
  headerRight: { flex: 1, alignItems: 'flex-end' },
  megaCountersRow: { flexDirection: 'row', gap: 15, marginBottom: 10 },
  megaCounter: { alignItems: 'center' },
  megaCounterValue: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  megaCounterLabel: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', opacity: 0.6 },
  
  megaProgressBarContainer: { width: '100%', maxWidth: 140 },
  megaProgressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  megaProgressBarFill: { height: '100%', borderRadius: 3 },
  megaProgressText: { color: GOLD_COLOR, fontSize: 8, fontWeight: '900', textAlign: 'right', marginTop: 4 },

  // GOLD LINES
  goldLineWrapper: { width: '100%', alignItems: 'center', zIndex: 10 },
  goldLineShort: { height: 3, backgroundColor: GOLD_COLOR, width: 100, shadowColor: GOLD_COLOR, shadowOpacity: 1, shadowRadius: 8, elevation: 10 },

  imageSpace: { flex: 1 },

  // BOTTOM BAR
  bottomBar: { height: '35%', backgroundColor: '#000000', padding: 20 },
  mainStatsRow: { flexDirection: 'row', justifyContent: 'space-between', flex: 1 },
  
  workedElementsColumn: { flex: 1.3, gap: 10 },
  exercisesTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  exercisesList: { gap: 5 },
  exerciseGoldText: { color: GOLD_COLOR, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  lieuBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  lieuText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800' },

  machineStatsColumn: { flex: 0.7, alignItems: 'flex-end', gap: 8 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statValueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  brandingFooter: { marginTop: 15, paddingTop: 15, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)' },
});