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
  options?: { label: string, icon?: string, color?: string, weight?: string, reps?: string }[];
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ 
    training, backgroundImage, backgroundType = 'black', customLocation, isLandscape = false, width = DEFAULT_WIDTH,
    userAvatar, userName, sessionsPerWeek, options,
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

    // Formatter la durée (ex: 90 -> 1H 30)
    const formatDuration = (mins: number = 0) => {
      if (mins < 60) return `${mins} MIN`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}H ${m}` : `${h}H`;
    };

    // COULEURS DYNAMIQUES SELON LE THÈME
    const isWhite = backgroundType === 'white';
    const barBg = isWhite ? '#FFFFFF' : '#000000';
    const mainText = isWhite ? '#000000' : '#FFFFFF';
    const subText = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)';
    const cardContentBg = isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const borderColor = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    return (
      <View ref={ref} style={[styles.card, { width, height: CARD_HEIGHT, backgroundColor: barBg }]} collapsable={false}>
        {/* FOND PHOTO (98% LARGEUR, PAS DE ZOOM) */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isWhite ? '#F5F5F5' : '#000', alignItems: 'center', justifyContent: 'center' }]}>
          {backgroundImage ? (
            <Image 
              source={{ uri: backgroundImage }} 
              style={{ width: '98%', height: '100%' }} 
              resizeMode="contain" 
            />
          ) : (
            <LinearGradient 
              colors={isWhite ? ['#FFFFFF', '#F0F0F0'] : ['#0a0a0a', '#1a1a1a']} 
              style={StyleSheet.absoluteFill} 
            />
          )}
        </View>

        {/* === BANDEAU HAUT === */}
        <View style={[styles.topBar, { height: '29%', paddingBottom: 15, backgroundColor: barBg }]}>
          
          {/* 1. LIGNE HAUTE: CLUB & SPORT (GAUCHE) + AVATAR (DROITE) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 10 }}>
             {/* CLUB & SESSION INFO */}
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {clubLogoSource ? (
                  <Image source={clubLogoSource} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isWhite ? '#F0F0F0' : '#FFFFFF' }} resizeMode="contain" />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isWhite ? '#000' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                     <MaterialCommunityIcons name={getSportIcon(sportId) as any} size={20} color={isWhite ? '#FFF' : '#000'} />
                  </View>
                )}
                <View>
                  {/* DATE */}
                  <Text style={{ color: subText, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 }}>{formattedDate}</Text>
                  
                  {/* CLUB NAME */}
                  <Text 
                    style={{ color: mainText, opacity: 0.9, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, maxWidth: 150 }}
                    numberOfLines={1}
                  >
                    {training.club_name?.toUpperCase() || 'SÉANCE PERSO'}
                  </Text>

                  {/* SPORT + LIEU */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: mainText, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>
                      {sportNameStr.toUpperCase()}
                    </Text>
                    <Text style={{ color: isWhite ? GOLD_COLOR : '#FFFFFF', fontSize: 10, fontWeight: '800', opacity: 0.9 }}>
                      • {training.is_outdoor ? 'PLEIN AIR' : 'EN SALLE'}
                    </Text>
                  </View>
                </View>
             </View>

             {/* DROITE: AVATAR & DURÉE */}
             <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: GOLD_COLOR, fontSize: 12, fontWeight: '900' }}>
                    {formatDuration(training.duration_minutes)}
                  </Text>
                </View>
                {userAvatar && (
                  <Image 
                    source={{ uri: userAvatar }} 
                    style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: GOLD_COLOR }} 
                  />
                )}
             </View>
          </View>

          {/* 2. CENTRE: BLOC OBJECTIF (AU MILIEU DE LA CARTE) */}
          {showYearlyCount && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              
              {/* COMPTEUR GLOBAL */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <Text style={{ color: GOLD_COLOR, fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>
                  {yearlyCount}
                </Text>
                <Text style={{ color: mainText, fontSize: 16, fontWeight: '800' }}>
                  / 365
                </Text>
              </View>

              {/* BLOC PROGRESSION */}
              <View style={{ width: '100%', alignItems: 'center' }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>OBJECTIF</Text>
                    <Text style={{ color: mainText, fontSize: 14, fontWeight: '900' }}>{Math.round(progressPercent)}%</Text>
                 </View>

                {/* Barre de Progression CENTRÉE & LARGE */}
                {showGoalProgress && (
                  <View style={{ width: '65%', height: 12, backgroundColor: isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(212, 175, 55, 0.5)' }}>
                    <LinearGradient 
                      colors={[GOLD_COLOR, '#F59E0B']} 
                      start={{x:0, y:0}} end={{x:1, y:0}}
                      style={{ height: '100%', width: `${progressPercent}%`, borderRadius: 6 }} 
                    />
                  </View>
                )}
                
                {/* Ratio sous la barre */}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <Text style={{ color: GOLD_COLOR, fontSize: 13, fontWeight: '800' }}>
                    {yearlyCount}
                  </Text>
                  <Text style={{ color: mainText, fontSize: 13, fontWeight: '800' }}>
                    / {safeObjective}
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
             <View style={{ backgroundColor: isWhite ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: borderColor }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>NOTES DE SÉANCE</Text>
               </View>
               <Text style={{ color: mainText, fontSize: 12, lineHeight: 18, fontWeight: '500' }} numberOfLines={4}>
                 {training.notes}
               </Text>
             </View>
           )}
        </View>

        {/* LIGNE DORÉE CENTRÉE */}
        <View style={styles.goldLineWrapper}>
          <View style={styles.goldLineShort} />
        </View>

        {/* === BANDEAU BAS === */}
        <View style={[styles.bottomBar, { backgroundColor: barBg }]}>
          
          {/* ZONE DE DONNÉES UNIFIÉE (FULL WIDTH) */}
          <View style={{ flex: 1, width: '100%', gap: 12 }}>
            
            {/* 2. DÉTAILS DE LA SÉANCE (EXERCICES / OPTIONS / NOTES) */}
            {showExercises && (
              <View style={{ gap: 12 }}>
                
                {/* LIGNE TECHNIQUE UNIFIÉE (TAPIS, VITESSE, PENTE...) */}
                {(training.speed || training.pente || training.distance || training.calories) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, backgroundColor: cardContentBg, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: borderColor }}>
                    <Text style={{ color: GOLD_COLOR, fontSize: 12, fontWeight: '900' }}>
                      {(() => {
                        const machine = options?.find(o => ['tapis', 'vélo', 'velo', 'elliptique', 'rameur', 'marche'].some(k => o.label.toLowerCase().includes(k)));
                        return (machine?.label || 'TECHNIQUE').toUpperCase();
                      })()} :
                    </Text>
                    
                    {training.speed && (
                      <Text style={{ color: mainText, fontSize: 24, fontWeight: '900' }}>
                        {training.speed}<Text style={{ fontSize: 12, color: GOLD_COLOR }}> KM/H</Text>
                      </Text>
                    )}
                    
                    {training.pente && (
                      <Text style={{ color: mainText, fontSize: 24, fontWeight: '900' }}>
                        {training.pente}<Text style={{ fontSize: 12, color: GOLD_COLOR }}>%</Text>
                      </Text>
                    )}

                    {training.distance && (
                      <Text style={{ color: mainText, fontSize: 24, fontWeight: '900' }}>
                        {training.distance.toFixed(1)}<Text style={{ fontSize: 12, color: GOLD_COLOR }}> KM</Text>
                      </Text>
                    )}

                    {training.calories && (
                      <Text style={{ color: GOLD_COLOR, fontSize: 24, fontWeight: '900' }}>
                        {training.calories}<Text style={{ fontSize: 12, color: mainText }}> KCAL</Text>
                      </Text>
                    )}
                  </View>
                )}
                
                {/* BLOC DES PERFORMANCES (OPTIONS + EXERCICES AVEC POIDS) */}
                {((options && options.some(o => o.weight || o.reps)) || (training.exercises && training.exercises.some(e => e.weight || e.reps))) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {[
                      ...(options || []).filter(o => o.weight || o.reps).map(o => ({ label: o.label, weight: o.weight, reps: o.reps })),
                      ...(training.exercises || []).filter(e => e.weight || e.reps).map(e => ({ label: e.name, weight: e.weight?.toString(), reps: e.reps?.toString() }))
                    ].slice(0, 6).map((item, i) => (
                      <View 
                        key={i} 
                        style={{ 
                          width: '31%', 
                          backgroundColor: isWhite ? 'rgba(212, 175, 55, 0.08)' : 'rgba(212, 175, 55, 0.1)', 
                          padding: 10, 
                          borderRadius: 12, 
                          borderWidth: 1, 
                          borderColor: 'rgba(212, 175, 55, 0.2)',
                          alignItems: 'center'
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                          <Text style={{ color: GOLD_COLOR, fontSize: 18, fontWeight: '900' }}>{item.weight || '0'}</Text>
                          <Text style={{ color: mainText, fontSize: 10, fontWeight: '700' }}>KG</Text>
                          <Text style={{ color: GOLD_COLOR, fontSize: 14, fontWeight: '400', marginHorizontal: 2 }}>×</Text>
                          <Text style={{ color: mainText, fontSize: 18, fontWeight: '900' }}>{item.reps || '0'}</Text>
                        </View>
                        <Text 
                          style={{ color: subText, fontSize: 7, fontWeight: '800', textAlign: 'center', marginTop: 4, textTransform: 'uppercase' }}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* AUTRES EXERCICES (SANS POIDS) */}
                {((options && options.some(o => !o.weight && !o.reps)) || (training.exercises && training.exercises.some(e => !e.weight && !e.reps))) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      ...(options || []).filter(o => !o.weight && !o.reps).map(o => ({ label: o.label, icon: o.icon })),
                      ...(training.exercises || []).filter(e => !e.weight && !e.reps).map(e => ({ label: e.name, icon: 'dumbbell' }))
                    ].slice(0, 8).map((item, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.05)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 0.5, borderColor: borderColor }}>
                        <MaterialCommunityIcons name={(item.icon as any) || 'dumbbell'} size={10} color={GOLD_COLOR} />
                        <Text style={{ color: mainText, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

          </View>

          {/* FOOTER BRANDING */}
          <View style={[styles.brandingFooter, { borderTopColor: borderColor }]}>
            <SocialCardFooter variant={isWhite ? "light" : "dark"} />
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
  topBar: { paddingHorizontal: 20, paddingTop: 15 },
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
  megaProgressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  megaProgressBarFill: { height: '100%', borderRadius: 3 },
  megaProgressText: { color: GOLD_COLOR, fontSize: 8, fontWeight: '900', textAlign: 'right', marginTop: 4 },

  // GOLD LINES
  goldLineWrapper: { width: '100%', alignItems: 'center', zIndex: 10 },
  goldLineShort: { height: 3, backgroundColor: GOLD_COLOR, width: 100, shadowColor: GOLD_COLOR, shadowOpacity: 1, shadowRadius: 8, elevation: 10 },

  imageSpace: { flex: 1 },

  // BOTTOM BAR
  bottomBar: { height: '35%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0, justifyContent: 'space-between' },
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

  brandingFooter: { marginTop: 10, paddingBottom: 10, borderTopWidth: 0.5 },
});
