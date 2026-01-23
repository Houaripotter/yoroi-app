// ============================================
// SESSION CARD COMPONENT - V22 OPTIMIZED
// ============================================
// Optimisations:
// - Remplacement des styles inline par StyleSheet
// - Amélioration des performances de rendu
// - Code plus maintenable
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Training } from '@/lib/database';
import { getClubLogoSource, getSportIcon, getSportName } from '@/lib/sports';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

// Constantes de layout
const PHOTO_SECTION_HEIGHT = '60%';
const STATS_SECTION_HEIGHT = '28%';
const FOOTER_SECTION_HEIGHT = '12%';
const PROFILE_SIZE = 50;
const AVATAR_SIZE = 50;
const CLUB_LOGO_SIZE = 18;

interface SessionCardProps {
  training: Partial<Training>;
  backgroundImage?: string | null;
  backgroundType?: 'photo' | 'black' | 'white';
  keepPhotoClear?: boolean; // Ne pas assombrir la photo de fond
  customLocation?: string;
  isLandscape?: boolean;
  width?: number;
  userAvatar?: any;
  profilePhoto?: string | null;
  userName?: string;
  rank?: string;
  userLevel?: number;
  showDate?: boolean;
  showYearlyCount?: boolean;
  showMonthlyCount?: boolean;
  showWeeklyCount?: boolean;
  showGoalProgress?: boolean;
  showClub?: boolean;
  showLieu?: boolean;
  showExercises?: boolean;
  showStats?: boolean;
  yearlyCount?: number;
  monthlyCount?: number;
  weeklyCount?: number;
  yearlyObjective?: number;
  sessionsPerWeek?: number;
  options?: { 
    label: string, 
    icon?: string, 
    color?: string, 
    weight?: string, 
    reps?: string,
    distance?: string,
    duration?: string,
    speed?: string,
    pente?: string,
    calories?: string,
    watts?: string,
    resistance?: string,
    stairs?: string,
    pace?: string
  }[];
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({
    training, backgroundImage, backgroundType = 'black', keepPhotoClear = false, width = DEFAULT_WIDTH,
    userAvatar, profilePhoto, userName, rank, userLevel, options,
    showYearlyCount = true,
    yearlyCount = 0, yearlyObjective = 365,
    showGoalProgress = true
  }, ref) => {
    
    const CARD_HEIGHT = width * (16 / 9);
    const dateObj = training.date ? new Date(training.date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();

    const sportNameStr = training.sport?.split(',').map(s => getSportName(s)).join(' + ') || 'SÉANCE';
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    
    // Calcul Progression sur l'Objectif Personnel
    const safeObjective = yearlyObjective && yearlyObjective > 0 ? yearlyObjective : 365;
    const progressPercent = Math.min(100, (yearlyCount / safeObjective) * 100);

    const isWhite = backgroundType === 'white';
    const bg = isWhite ? '#FFFFFF' : '#000000';
    const txt = isWhite ? '#000000' : '#FFFFFF';
    const subTxt = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const borderColor = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    const avatarSource = typeof userAvatar === 'string' ? { uri: userAvatar } : userAvatar;
    const profileSource = profilePhoto ? { uri: profilePhoto } : null;

    // Helper Allure
    const getPace = (speedStr?: string) => {
      const s = parseFloat((speedStr || '0').replace(',', '.'));
      if (s > 0) {
        const paceDecimal = 60 / s;
        const mins = Math.floor(paceDecimal);
        const secs = Math.round((paceDecimal - mins) * 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      return null;
    };

    const renderStyledStat = (value: string | number, unit: string) => {
      const valStr = value.toString().replace('.', ',');
      return (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          {valStr.split(',').map((part, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Text style={{ color: txt, fontSize: 11, fontWeight: '900' }}>,</Text>}
              <Text style={{ color: GOLD_COLOR, fontSize: 11, fontWeight: '900' }}>{part}</Text>
            </React.Fragment>
          ))}
          <Text style={{ color: txt, fontSize: 7, fontWeight: '800', marginLeft: 1 }}>{unit}</Text>
        </View>
      );
    };

    return (
      <View ref={ref} style={[styles.card, { width, height: CARD_HEIGHT, backgroundColor: bg }]} collapsable={false}>

        {/* 1. SECTION PHOTO */}
        <View style={styles.photoSection}>
          {backgroundImage ? (
            <Image source={{ uri: backgroundImage }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#1a1a1a', '#000']} style={{ flex: 1 }} />
          )}

          <LinearGradient
            colors={keepPhotoClear
              ? ['rgba(0,0,0,0.15)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.25)']
              : ['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
            style={styles.photoGradient}
          >
            {/* DATE EN HAUT AU MILIEU */}
            <View style={{ position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>

            <View style={styles.photoHeader}>

              {/* PHOTO PROFIL (GAUCHE) + NOM */}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={styles.profileContainer}>
                  {profileSource ? (
                    <Image source={profileSource} style={styles.photoImage} />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <MaterialCommunityIcons name="account" size={28} color="#000" />
                    </View>
                  )}
                </View>
                {userName && (
                  <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                    {userName.toUpperCase()}
                  </Text>
                )}
              </View>

              {/* AVATAR YOROI (DROITE) + RANG + NIVEAU */}
              <View style={styles.avatarContainer}>
                {userAvatar && (
                  <View style={styles.avatarCircle}>
                    <Image source={avatarSource} style={styles.photoImage} resizeMode="contain" />
                  </View>
                )}
                {rank && (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{rank.toUpperCase()}</Text>
                  </View>
                )}
                {userLevel !== undefined && userLevel !== null && (
                  <Text style={{ color: GOLD_COLOR, fontSize: 8, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                    {`NIV. ${userLevel}`}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>

          {/* INFOS BAS DE PHOTO */}
          <View style={styles.photoBottomInfo}>
            <View style={styles.clubRow}>
              {clubLogoSource && (
                <View style={styles.clubLogoBox}>
                  <Image source={clubLogoSource} style={styles.clubLogo} resizeMode="contain" />
                </View>
              )}
              <Text style={styles.clubName}>{training.club_name?.toUpperCase() || 'SÉANCE INDIVIDUELLE'}</Text>
            </View>
            <Text style={styles.sportName}>{sportNameStr.toUpperCase()}</Text>
          </View>

          {/* DUREE */}
          <View style={styles.durationBadge}>
            {(() => {
              const h = Math.floor((training.duration_minutes || 0) / 60);
              const m = (training.duration_minutes || 0) % 60;
              return <Text style={styles.durationText}>{h > 0 ? `${h}H ${m > 0 ? m : ''}` : `${m} MIN`}</Text>;
            })()}
          </View>
        </View>

        {/* 2. SECTION STATS & EXERCICES */}
        <View style={styles.statsSection}>

          {/* CHIFFRES CLÉS & PROGRESSION */}
          {showYearlyCount && (
            <View style={styles.progressContainer}>
              <View style={styles.progressRow}>
                <View style={styles.progressLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.chronoLabel}>OBJECTIF ANNUEL</Text>
                    <Text style={[styles.chronoLabel, { color: subTxt }]}>(ENTRAINEMENT)</Text>
                  </View>
                  <View style={styles.progressNumbers}>
                    <Text style={styles.goldLargeNumber}>{yearlyCount}</Text>
                    <Text style={[{ color: txt, fontSize: 18, fontWeight: '800' }]}> / </Text>
                    <Text style={[styles.goldLargeNumber, { fontSize: 24 }]}>{safeObjective}</Text>
                    <Text style={[{ color: txt, fontSize: 16, fontWeight: '800' }]}> JOURS</Text>
                  </View>
                </View>
                <View style={styles.progressRight}>
                  <View style={styles.percentContainer}>
                    <Text style={styles.percentLarge}>{Math.round(progressPercent)}</Text>
                    <Text style={[{ color: txt, fontSize: 18, fontWeight: '900' }]}>%</Text>
                  </View>
                  <View style={styles.yearProgressText}>
                    <Text style={styles.smallGoldText}>{yearlyCount}</Text>
                    <Text style={[{ color: txt, fontSize: 11, fontWeight: '900' }]}> / </Text>
                    <Text style={styles.smallGoldText}>{safeObjective} JOURS</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.progressBar, { backgroundColor: isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }]}>
                <LinearGradient colors={[GOLD_COLOR, '#F59E0B']} start={{x:0, y:0}} end={{x:1, y:0}} style={{ height: '100%', width: `${progressPercent}%` }} />
              </View>
            </View>
          )}

          <View style={styles.detailsSection}>
            <View style={styles.detailsHeader}>
              <View style={[styles.detailsDivider, { backgroundColor: GOLD_COLOR }]} />
              <Text style={styles.detailsLabel}>DÉTAILS DE LA SÉANCE</Text>
              <View style={[styles.detailsDivider, { backgroundColor: GOLD_COLOR }]} />
            </View>

            <ScrollView
              style={{ maxHeight: options && options.length > 7 ? 140 : undefined }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.exercisesList}>
                {options && options.length > 0 ? (
                  options.map((opt, i) => {
                    const pace = opt.pace || getPace(opt.speed);
                    return (
                      <View key={i} style={[styles.exerciseRow, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.exerciseLabel, { color: txt }]} numberOfLines={1}>{opt.label.toUpperCase()}</Text>
                        <View style={styles.exerciseStats}>
                          {opt.weight && renderStyledStat(opt.weight, 'KG')}
                          {opt.reps && (
                            <View style={styles.statValue}>
                              <Text style={[styles.statSeparator, { color: txt }]}> × </Text>
                              <Text style={styles.statReps}>{opt.reps}</Text>
                            </View>
                          )}
                          {opt.distance && renderStyledStat(opt.distance, 'KM')}
                          {opt.speed && renderStyledStat(opt.speed, 'KM/H')}
                          {pace && <Text style={[styles.paceText, { color: subTxt }]}>({pace} min/km)</Text>}
                          {opt.pente && renderStyledStat(opt.pente, '%')}
                          {opt.stairs && renderStyledStat(opt.stairs, 'FLOORS')}
                          {opt.calories && renderStyledStat(opt.calories, 'KCAL')}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={[styles.emptyNotesText, { color: subTxt }]}>{training.notes || 'SÉANCE VALIDÉE'}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* 3. FOOTER */}
        <View style={[styles.footerSection, { borderTopColor: borderColor }]}>
          <SocialCardFooter variant={isWhite ? "light" : "dark"} />
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  photoSection: {
    height: PHOTO_SECTION_HEIGHT,
    width: '100%',
    backgroundColor: '#111',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  photoHeader: {
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileContainer: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    borderWidth: 2,
    borderColor: GOLD_COLOR,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  profilePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 4,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: GOLD_COLOR,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    backgroundColor: GOLD_COLOR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: -10,
  },
  rankText: {
    color: '#000',
    fontSize: 7,
    fontWeight: '900',
  },
  photoBottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  dateText: {
    color: GOLD_COLOR,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  clubLogoBox: {
    padding: 2,
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  clubLogo: {
    width: CLUB_LOGO_SIZE,
    height: CLUB_LOGO_SIZE,
  },
  clubName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  sportName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: GOLD_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
  },
  statsSection: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 10,
  },
  progressContainer: {
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  progressLeft: {
    flex: 1,
  },
  progressRight: {
    alignItems: 'flex-end',
  },
  chronoLabel: {
    color: GOLD_COLOR,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  goldLargeNumber: {
    color: GOLD_COLOR,
    fontSize: 32,
    fontWeight: '900',
  },
  percentContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percentLarge: {
    color: GOLD_COLOR,
    fontSize: 36,
    fontWeight: '900',
  },
  yearProgressText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallGoldText: {
    color: GOLD_COLOR,
    fontSize: 12,
    fontWeight: '900',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailsSection: {
    gap: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  detailsDivider: {
    height: 1,
    flex: 1,
    opacity: 0.3,
  },
  detailsLabel: {
    color: GOLD_COLOR,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  exercisesList: {
    gap: 2,
  },
  exerciseRow: {
    borderBottomWidth: 0.5,
    paddingBottom: 1,
    paddingTop: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseLabel: {
    fontSize: 8,
    fontWeight: '800',
    flex: 1,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statNumber: {
    color: GOLD_COLOR,
    fontSize: 13,
    fontWeight: '900',
  },
  statUnit: {
    fontSize: 8,
    fontWeight: '800',
    marginLeft: 1,
  },
  statSeparator: {
    fontSize: 7,
  },
  statReps: {
    color: GOLD_COLOR,
    fontSize: 10,
    fontWeight: '900',
  },
  paceText: {
    fontSize: 7,
  },
  emptyNotesText: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerSection: {
    height: FOOTER_SECTION_HEIGHT,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
});
