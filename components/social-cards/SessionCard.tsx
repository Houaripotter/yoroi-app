// ============================================
// SESSION CARD COMPONENT - VERSION ULTRA PREMIUM V7
// ============================================
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Trophy, Clock, Calendar, MapPin, Flame, Dumbbell, Zap, Timer, Heart, Activity, TrendingUp, RotateCcw } from 'lucide-react-native';
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
  // User info
  userAvatar?: string | null;
  userName?: string;
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
  sessionsPerWeek?: number;
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ 
    training, backgroundImage, backgroundType = 'black', customLocation, isLandscape = false, width = DEFAULT_WIDTH,
    userAvatar, userName, sessionsPerWeek,
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

    // Calcul de la progression (Sécurité division par 0)
    const safeObjective = yearlyObjective && yearlyObjective > 0 ? yearlyObjective : 365;
    const progressPercent = Math.min(100, (yearlyCount / safeObjective) * 100);

    return (
      <View ref={ref} style={[styles.card, { width, height: CARD_HEIGHT }]} collapsable={false}>
        {/* FOND PHOTO (98% LARGEUR, PAS DE ZOOM) */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
          {backgroundImage ? (
            <Image 
              source={{ uri: backgroundImage }} 
              style={{ width: '98%', height: '100%' }} 
              resizeMode="contain" 
            />
          ) : (
            <LinearGradient colors={['#0a0a0a', '#1a1a1a']} style={StyleSheet.absoluteFill} />
          )}
        </View>

        {/* === BANDEAU HAUT (NOIR) === */}
        <View style={[styles.topBar, { height: '29%', paddingBottom: 15 }]}>
          
          {/* 1. LIGNE HAUTE: CLUB & SPORT (GAUCHE) + AVATAR (DROITE) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 12 }}>
             {/* CLUB INFO */}
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {clubLogoSource ? (
                  <Image source={clubLogoSource} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF' }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                     <MaterialCommunityIcons 
                       name={getSportIcon(sportId) as any} 
                       size={24} 
                       color="#000000" 
                     />
                  </View>
                )}
                <View>
                  <Text 
                    style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, maxWidth: 150 }}
                    numberOfLines={1}
                  >
                    {training.club_name?.toUpperCase() || 'SÉANCE PERSO'}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 }}>
                    {sportNameStr.toUpperCase()}
                  </Text>
                </View>
             </View>

             {/* USER AVATAR */}
             {userAvatar && (
               <Image 
                 source={{ uri: userAvatar }} 
                 style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: GOLD_COLOR }} 
               />
             )}
          </View>

          {/* 2. CENTRE: BLOC OBJECTIF (AU MILIEU DE LA CARTE) */}
          {showYearlyCount && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              
              {/* COMPTEUR GLOBAL */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <Text style={{ color: GOLD_COLOR, fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>
                  {yearlyCount}
                </Text>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                  / 365
                </Text>
              </View>

              {/* BLOC PROGRESSION */}
              <View style={{ width: '100%', alignItems: 'center' }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>OBJECTIF</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>{Math.round(progressPercent)}%</Text>
                 </View>

                {/* Barre de Progression CENTRÉE & LARGE */}
                {showGoalProgress && (
                  <View style={{ width: '65%', height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)' }}>
                    <LinearGradient 
                      colors={[GOLD_COLOR, '#F59E0B']} 
                      start={{x:0, y:0}} end={{x:1, y:0}}
                      style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 6 }} 
                    />
                  </View>
                )}
                
                {/* Ratio sous la barre - BIEN DANS LE NOIR - DORE / BLANC */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <Text style={{ color: GOLD_COLOR, fontSize: 13, fontWeight: '800' }}>
                    {yearlyCount}
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    / {yearlyObjective}
                  </Text>
                </View>
              </View>

            </View>
          )}

        </View>

        {/* LIGNE DORÉE CENTRÉE */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.goldLineShort} />
        </View>

        {/* ESPACE MILIEU (POUR LA PHOTO & NOTES) */}
        <View style={[styles.imageSpace, { padding: 20, justifyContent: 'flex-end' }]}>
           {/* NOTES SUR LA PHOTO/FOND */}
           {training.notes && (
             <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>NOTES DE SÉANCE</Text>
               </View>
               <Text style={{ color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontWeight: '500' }} numberOfLines={4}>
                 {training.notes}
               </Text>
             </View>
           )}
        </View>

        {/* LIGNE DORÉE CENTRÉE */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.goldLineShort} />
        </View>

        {/* === BANDEAU BAS (NOIR) === */}
        <View style={styles.bottomBar}>
          <View style={styles.mainStatsRow}>
            
            {/* GAUCHE: EXERCICES & DÉTAILS COMPLETS */}
            <View style={[styles.workedElementsColumn, { flex: 1.8 }]}>
              {showExercises && (
                <View style={{ gap: 10 }}>
                  
                  {/* 1. MUSCLES (Si renseignés) */}
                  {training.muscles && (
                    <View>
                      <Text style={styles.exercisesTitle}>CIBLAGE</Text>
                      <Text style={styles.exerciseWhiteText} numberOfLines={2}>
                        {training.muscles.toUpperCase().split(',').join(' • ')}
                      </Text>
                    </View>
                  )}

                  {/* 2. EXERCICES (Si renseignés) */}
                  {training.exercises && training.exercises.length > 0 && (
                    <View>
                      <Text style={styles.exercisesTitle}>EXERCICES</Text>
                      <View style={styles.exercisesList}>
                        {training.exercises.slice(0, 8).map((ex, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: GOLD_COLOR }} />
                            <Text style={[styles.exerciseGoldText, { fontSize: 11 }]}>
                              {ex.name.toUpperCase()} <Text style={{ color: '#FFF', fontWeight: '400' }}>{ex.sets ? `${ex.sets}x${ex.reps}` : ''}</Text>
                            </Text>
                          </View>
                        ))}
                        {training.exercises.length > 8 && (
                          <Text style={[styles.exerciseGoldText, { fontSize: 9, opacity: 0.7 }]}>+ {training.exercises.length - 8} AUTRES...</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* 3. DÉTAILS TECHNIQUES (Machines, Cardio) */}
                  {(training.pente || training.resistance || training.watts || training.cadence) && (
                    <View>
                      <Text style={styles.exercisesTitle}>TECHNIQUE</Text>
                      <View style={{ gap: 4 }}>
                        {training.pente && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>PENTE: {training.pente}%</Text>}
                        {training.resistance && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>RÉSISTANCE: {training.resistance}</Text>}
                        {training.watts && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>PUISSANCE: {training.watts}W</Text>}
                        {training.cadence && <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>CADENCE: {training.cadence} RPM</Text>}
                      </View>
                    </View>
                  )}

                  {/* 4. INTENSITÉ & ÉNERGIE (En grand) */}
                  {training.calories && (
                    <View>
                      <Text style={styles.exercisesTitle}>ÉNERGIE</Text>
                      <Text style={{ color: GOLD_COLOR, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 }}>
                        {training.calories} KCAL
                      </Text>
                      {training.heart_rate && (
                        <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '800', marginTop: 2 }}>
                          FC MOY: {training.heart_rate} BPM
                        </Text>
                      )}
                    </View>
                  )}

                  {/* 5. NOTES (Seulement si non vide) */}
                  {training.notes ? (
                    <View>
                      <Text style={[styles.exercisesTitle, { marginTop: 4 }]}>NOTES</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, lineHeight: 15, fontWeight: '500' }} numberOfLines={4}>
                        {training.notes}
                      </Text>
                    </View>
                  ) : null}

                </View>
              )}
            </View>

            {/* DROITE: STATS GRID COMPACTE (VERTICALE, GRANDE) */}
            <View style={[styles.machineStatsColumn, { flex: 0.8, minWidth: 110 }]}>
              <View style={{ gap: 10, alignItems: 'flex-end' }}>
                <View style={styles.statLine}>
                  <Timer size={18} color={GOLD_COLOR} />
                  <Text style={[styles.statValueText, { fontSize: 20 }]}>{training.duration_minutes || 0} MIN</Text>
                </View>
                {training.distance !== undefined && training.distance > 0 && (
                  <View style={styles.statLine}>
                    <Activity size={18} color={GOLD_COLOR} />
                    <Text style={[styles.statValueText, { fontSize: 20 }]}>{training.distance.toFixed(2)} KM</Text>
                  </View>
                )}
                {training.calories !== undefined && training.calories > 0 && (
                  <View style={styles.statLine}>
                    <Zap size={18} color={GOLD_COLOR} />
                    <Text style={[styles.statValueText, { fontSize: 20 }]}>{training.calories} CAL</Text>
                  </View>
                )}
                {training.heart_rate !== undefined && training.heart_rate > 0 && (
                  <View style={styles.statLine}>
                    <Heart size={18} color="#EF4444" fill="#EF4444" />
                    <Text style={[styles.statValueText, { fontSize: 20 }]}>{training.heart_rate} BPM</Text>
                  </View>
                )}
                {training.watts !== undefined && training.watts > 0 && (
                   <View style={styles.statLine}>
                    <Zap size={18} color={GOLD_COLOR} />
                    <Text style={[styles.statValueText, { fontSize: 20 }]}>{training.watts} W</Text>
                  </View>
                )}
                 {showLieu && (
                  <View style={[styles.lieuBadge, { marginTop: 4 }]}>
                    <MapPin size={14} color={GOLD_COLOR} />
                    <Text style={[styles.lieuText, { fontSize: 10 }]}>{customLocation?.toUpperCase() || (training.is_outdoor ? 'PLEIN AIR' : 'EN SALLE')}</Text>
                  </View>
                )}
              </View>
            </View>
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
  bottomBar: { height: '35%', backgroundColor: '#000000', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0, justifyContent: 'space-between' },
  mainStatsRow: { flexDirection: 'row', justifyContent: 'space-between', flex: 1 },
  
  workedElementsColumn: { flex: 1.3, gap: 10 },
  exercisesTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  exercisesList: { gap: 5 },
  exerciseGoldText: { color: GOLD_COLOR, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  exerciseWhiteText: { color: '#F5F5F5', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, lineHeight: 18 },
  lieuBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  lieuText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800' },

  machineStatsColumn: { flex: 0.7, alignItems: 'flex-end', gap: 8 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statValueText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  brandingFooter: { borderTopWidth: 0 },
});