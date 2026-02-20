// ============================================
// SESSION CARD COMPONENT - V22 OPTIMIZED
// ============================================
// Optimisations:
// - Remplacement des styles inline par StyleSheet
// - Amélioration des performances de rendu
// - Code plus maintenable
// - Conversion des styles inline en useMemo pour réduire les re-allocations
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Training } from '@/lib/database';
import { getClubLogoSource, getSportName } from '@/lib/sports';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

// Constantes de layout
const PHOTO_SECTION_HEIGHT = '65%';
const STATS_SECTION_HEIGHT = '23%';
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
    pace?: string,
    sport?: string,
    sportName?: string
  }[];
}

export const SessionCard = React.memo(React.forwardRef<View, SessionCardProps>(
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

    // Memoized styles
    const cardStyle = useMemo(() => ({ width, height: CARD_HEIGHT, backgroundColor: bg }), [width, CARD_HEIGHT, bg]);
    const gradientFlexStyle = useMemo(() => ({ flex: 1 }), []);
    const dateTopContainerStyle = useMemo(() => ({ position: 'absolute' as const, top: 8, left: 0, right: 0, alignItems: 'center' as const, zIndex: 10 }), []);
    const dateBackdropStyle = useMemo(() => ({ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }), []);
    const dateColorStyle = useMemo(() => ({ color: GOLD_COLOR }), []);
    // SYMMETRIC ALIGNMENT: Both containers have same fixed width (80px fits "ASHIGARU" + padding)
    // Content is centered inside each container
    const SIDE_CONTAINER_WIDTH = 80;
    const profileLeftContainerStyle = useMemo(() => ({
      width: SIDE_CONTAINER_WIDTH,
      alignItems: 'center' as const,
      gap: 4
    }), []);
    const usernameBackdropStyle = useMemo(() => ({ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, maxWidth: 75 }), []);
    const usernameTextStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 9, fontWeight: '900' as const, textAlign: 'center' as const }), []);
    const usernameShadowStyle = useMemo(() => ({
      color: GOLD_COLOR, fontSize: 9, fontWeight: '900' as const,
      textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
      textAlign: 'center' as const, maxWidth: 75
    }), []);
    const avatarRightContainerStyle = useMemo(() => ({ width: SIDE_CONTAINER_WIDTH }), []);
    const rankBackdropStyle = useMemo(() => ({ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, maxWidth: 100 }), []);
    const rankTextStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 10, fontWeight: '900' as const, textAlign: 'center' as const }), []);
    const rankLevelTextStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 10, fontWeight: '900' as const, textAlign: 'center' as const, marginTop: 1 }), []);
    const objectifRowStyle = useMemo(() => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 }), []);
    const objectifParenthesesStyle = useMemo(() => ({ color: subTxt }), [subTxt]);
    const progressSlashStyle = useMemo(() => ({ color: txt, fontSize: 18, fontWeight: '800' as const }), [txt]);
    const progressGoalNumberStyle = useMemo(() => ({ fontSize: 24 }), []);
    const progressDaysTextStyle = useMemo(() => ({ color: txt, fontSize: 16, fontWeight: '800' as const }), [txt]);
    const progressContainerMarginStyle = useMemo(() => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginTop: 4 }), []);
    const progressBarBgStyle = useMemo(() => ({
      width: 120, height: 8,
      backgroundColor: isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
      borderRadius: 4, overflow: 'hidden' as const, position: 'relative' as const
    }), [isWhite]);
    const progressBarGraduationsStyle = useMemo(() => ({ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' as const }), []);
    const progressBarGraduationLineStyle = (mark: number) => ({
      position: 'absolute' as const, left: `${mark}%`, width: 1, height: '100%',
      backgroundColor: isWhite ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
    });
    const progressBarFillStyle = useMemo(() => ({ height: '100%', width: `${progressPercent}%` }), [progressPercent]);
    const progressPercentTextStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 12, fontWeight: '900' as const }), []);
    const durationBadgeStyle = useMemo(() => ({ backgroundColor: GOLD_COLOR, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 4, alignSelf: 'flex-end' as const }), []);
    const durationTextStyle = useMemo(() => ({ color: '#000', fontWeight: '900' as const, fontSize: 13 }), []);
    const yearDaysSlashStyle = { color: txt, fontSize: 13, fontWeight: '900' as const };
    const yearDaysNumberStyle = useMemo(() => ({ fontSize: 14 }), []);
    const detailsDividerGoldStyle = useMemo(() => ({ backgroundColor: GOLD_COLOR }), []);
    const scrollMaxHeightStyle = useMemo(() => ({ maxHeight: options && options.length > 7 ? 140 : undefined }), [options]);
    const sportSeparatorMarginStyle = (i: number) => ({ marginTop: i > 0 ? 8 : 0, marginBottom: 6 });
    const sportSeparatorTextStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 10, fontWeight: '900' as const, letterSpacing: 0.5 }), []);
    const exerciseRowBorderStyle = useMemo(() => ({ borderBottomColor: borderColor }), [borderColor]);
    const exerciseLabelStyle = useMemo(() => ({ color: txt }), [txt]);
    const statSeparatorStyle = useMemo(() => ({ color: txt }), [txt]);
    const paceTextStyle = useMemo(() => ({ color: subTxt }), [subTxt]);
    const emptyNotesStyle = useMemo(() => ({ color: subTxt }), [subTxt]);
    const footerBorderStyle = useMemo(() => ({ borderTopColor: borderColor }), [borderColor]);
    const styledStatContainerStyle = useMemo(() => ({ flexDirection: 'row' as const, alignItems: 'baseline' as const }), []);
    const styledStatCommaStyle = useMemo(() => ({ color: txt, fontSize: 11, fontWeight: '900' as const }), [txt]);
    const styledStatPartStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 11, fontWeight: '900' as const }), []);
    const styledStatUnitStyle = useMemo(() => ({ color: txt, fontSize: 7, fontWeight: '800' as const, marginLeft: 1 }), [txt]);

    const renderStyledStat = (value: string | number, unit: string) => {
      const valStr = value.toString().replace('.', ',');
      return (
        <View style={styledStatContainerStyle}>
          {valStr.split(',').map((part, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Text style={styledStatCommaStyle}>,</Text>}
              <Text style={styledStatPartStyle}>{part}</Text>
            </React.Fragment>
          ))}
          <Text style={styledStatUnitStyle}>{unit}</Text>
        </View>
      );
    };

    return (
      <View ref={ref} style={[styles.card, cardStyle]} collapsable={false}>

        {/* 1. SECTION PHOTO */}
        <View style={styles.photoSection}>
          {backgroundImage ? (
            <Image source={{ uri: backgroundImage }} style={styles.photoImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#1a1a1a', '#000']} style={gradientFlexStyle} />
          )}

          <LinearGradient
            colors={keepPhotoClear
              ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']
              : ['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
            style={styles.photoGradient}
          >
            {/* DATE EN HAUT AU MILIEU */}
            <View style={dateTopContainerStyle}>
              {keepPhotoClear ? (
                <View style={dateBackdropStyle}>
                  <Text style={[styles.dateText, dateColorStyle]}>{formattedDate}</Text>
                </View>
              ) : (
                <Text style={styles.dateText}>{formattedDate}</Text>
              )}
            </View>

            <View style={styles.photoHeader}>

              {/* PHOTO PROFIL (GAUCHE) + NOM */}
              <View style={profileLeftContainerStyle}>
                <View style={styles.profileContainer}>
                  {profileSource ? (
                    <Image source={profileSource} style={styles.photoImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <MaterialCommunityIcons name="account" size={28} color="#000" />
                    </View>
                  )}
                </View>
                {userName && (
                  keepPhotoClear ? (
                    <View style={usernameBackdropStyle}>
                      <Text style={usernameTextStyle} numberOfLines={2}>
                        {userName.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <Text style={usernameShadowStyle} numberOfLines={2}>
                      {userName.toUpperCase()}
                    </Text>
                  )
                )}
              </View>

              {/* AVATAR YOROI (DROITE) + RANG + NIVEAU */}
              <View style={[styles.avatarContainer, avatarRightContainerStyle]}>
                {userAvatar && (
                  <View style={styles.avatarCircle}>
                    <Image source={avatarSource} style={styles.photoImage} resizeMode="contain" />
                  </View>
                )}
                {rank && userLevel !== undefined && userLevel !== null ? (
                  <View style={rankBackdropStyle}>
                    <Text style={rankTextStyle} numberOfLines={1}>{rank.toUpperCase()}</Text>
                    <Text style={rankLevelTextStyle} numberOfLines={1}>
                      Niveau {userLevel}
                    </Text>
                  </View>
                ) : rank ? (
                  <View style={rankBackdropStyle}>
                    <Text style={rankTextStyle} numberOfLines={1}>{rank.toUpperCase()}</Text>
                  </View>
                ) : null}
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
        </View>

        {/* 2. SECTION STATS & EXERCICES */}
        <View style={styles.statsSection}>

          {/* CHIFFRES CLÉS & PROGRESSION */}
          {showYearlyCount && (
            <View style={styles.progressContainer}>
              <View style={styles.progressRow}>
                <View style={styles.progressLeft}>
                  <View style={objectifRowStyle}>
                    <Text style={styles.chronoLabel}>OBJECTIF ANNUEL</Text>
                    <Text style={[styles.chronoLabel, objectifParenthesesStyle]}>(ENTRAINEMENT)</Text>
                  </View>
                  <View style={styles.progressNumbers}>
                    <Text style={styles.goldLargeNumber}>{yearlyCount}</Text>
                    <Text style={progressSlashStyle}> / </Text>
                    <Text style={[styles.goldLargeNumber, progressGoalNumberStyle]}>{safeObjective}</Text>
                    <Text style={progressDaysTextStyle}> JOURS</Text>
                  </View>
                  {/* Barre de progression sous l'objectif */}
                  <View style={progressContainerMarginStyle}>
                    <View style={progressBarBgStyle}>
                      {/* Graduations */}
                      <View style={progressBarGraduationsStyle}>
                        {[25, 50, 75].map(mark => (
                          <View key={mark} style={progressBarGraduationLineStyle(mark)} />
                        ))}
                      </View>
                      <LinearGradient colors={[GOLD_COLOR, '#F59E0B']} start={{x:0, y:0}} end={{x:1, y:0}} style={progressBarFillStyle} />
                    </View>
                    <Text style={progressPercentTextStyle}>{Math.round(progressPercent)}%</Text>
                  </View>
                </View>
                <View style={styles.progressRight}>
                  <View style={durationBadgeStyle}>
                    {(() => {
                      const h = Math.floor((training.duration_minutes || 0) / 60);
                      const m = (training.duration_minutes || 0) % 60;
                      return <Text style={durationTextStyle}>{h > 0 ? `${h}H${m > 0 ? m : ''}` : `${m} MIN`}</Text>;
                    })()}
                  </View>
                  <View style={styles.yearProgressText}>
                    <Text style={[styles.smallGoldText, yearDaysNumberStyle]}>{yearlyCount}</Text>
                    <Text style={yearDaysSlashStyle}> / </Text>
                    <Text style={[styles.smallGoldText, yearDaysNumberStyle]}>365 JOURS</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.detailsSection}>
            <View style={styles.detailsHeader}>
              <View style={[styles.detailsDivider, detailsDividerGoldStyle]} />
              <Text style={styles.detailsLabel}>DÉTAILS DE LA SÉANCE</Text>
              <View style={[styles.detailsDivider, detailsDividerGoldStyle]} />
            </View>

            <ScrollView
              style={scrollMaxHeightStyle}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.exercisesList}>
                {options && options.length > 0 ? (
                  options.map((opt, i) => {
                    const pace = opt.pace || getPace(opt.speed);
                    // Vérifier si on change de sport (pour afficher un séparateur)
                    const prevSport = i > 0 ? options[i - 1].sport : null;
                    const showSportSeparator = opt.sport && opt.sport !== prevSport && opt.sportName;

                    return (
                      <React.Fragment key={i}>
                        {showSportSeparator && opt.sportName && (
                          <View style={sportSeparatorMarginStyle(i)}>
                            <Text style={sportSeparatorTextStyle}>
                              {opt.sportName.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.exerciseRow, exerciseRowBorderStyle]}>
                          <Text style={[styles.exerciseLabel, exerciseLabelStyle]} numberOfLines={1}>{opt.label.toUpperCase()}</Text>
                        <View style={styles.exerciseStats}>
                          {opt.weight && renderStyledStat(opt.weight, 'KG')}
                          {opt.reps && (
                            <View style={styles.statValue}>
                              <Text style={[styles.statSeparator, statSeparatorStyle]}> × </Text>
                              <Text style={styles.statReps}>{opt.reps}</Text>
                            </View>
                          )}
                          {opt.distance && renderStyledStat(opt.distance, 'KM')}
                          {opt.speed && renderStyledStat(opt.speed, 'KM/H')}
                          {pace && <Text style={[styles.paceText, paceTextStyle]}>({pace} min/km)</Text>}
                          {opt.pente && renderStyledStat(opt.pente, '%')}
                          {opt.stairs && renderStyledStat(opt.stairs, 'FLOORS')}
                          {opt.calories && renderStyledStat(opt.calories, 'KCAL')}
                        </View>
                      </View>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <Text style={[styles.emptyNotesText, emptyNotesStyle]}>{training.notes || 'SÉANCE VALIDÉE'}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* 3. FOOTER */}
        <View style={[styles.footerSection, footerBorderStyle]}>
          <SocialCardFooter variant={isWhite ? "light" : "dark"} />
        </View>
      </View>
    );
  }
));

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
    paddingHorizontal: 12,
    paddingTop: 32,
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
    borderColor: '#000000',
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
    justifyContent: 'flex-start',
    gap: 4,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#000000',
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
    marginTop: 4,
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
    paddingLeft: 12,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 24,
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
