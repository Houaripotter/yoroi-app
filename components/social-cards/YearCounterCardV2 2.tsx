import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { YearStats } from '@/lib/social-cards/useYearStats';
import { SocialCardFooter } from './SocialCardBranding';

// ============================================
// YEAR COUNTER CARD V2 - Style SessionCard
// Optimisé avec useMemo pour réduire les re-allocations
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

// Hauteurs fixes calculées sur ratio 16:9 pour éviter les débordements
const PHOTO_SECTION_RATIO = 0.58;  // 58% pour la photo
const STATS_SECTION_RATIO = 0.30;  // 30% pour les stats
const FOOTER_SECTION_RATIO = 0.12; // 12% pour le footer
const PROFILE_SIZE = 50;
const AVATAR_SIZE = 50;

export interface YearCounterCardV2Props {
  stats: YearStats;
  format: 'stories' | 'square';
  backgroundImage?: string;
  backgroundType?: 'photo' | 'black' | 'white';
  username?: string;
  weeklyGoal?: number;
  isLandscape?: boolean;
  userAvatar?: any;
  profilePhoto?: string | null;
  rank?: string;
  userLevel?: number;
}

export const YearCounterCardV2 = React.memo(forwardRef<View, YearCounterCardV2Props>(
  ({
    stats, format, backgroundImage, backgroundType = 'black', weeklyGoal = 4, isLandscape = false,
    username, userAvatar, profilePhoto, rank, userLevel
  }, ref) => {

    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;
    const keepPhotoClear = !!backgroundImage;

    // Formater l'année
    const yearLabel = `ANNÉE ${stats.year}`;

    const isWhite = backgroundType === 'white';
    const bg = isWhite ? '#FFFFFF' : '#000000';
    const txt = isWhite ? '#000000' : '#FFFFFF';
    const subTxt = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const borderColor = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    const avatarSource = typeof userAvatar === 'string' ? { uri: userAvatar } : userAvatar;
    const profileSource = profilePhoto ? { uri: profilePhoto } : null;

    // Calculer objectif annuel
    const yearlyGoal = stats.yearlyGoal || weeklyGoal * 52;
    const progressPercent = Math.min((stats.totalDays / yearlyGoal) * 100, 100);

    // Memoized styles
    const cardStyle = useMemo(() => ({ width: CARD_WIDTH, height: cardHeight, backgroundColor: bg }), [cardHeight, bg]);
    const gradientFlexStyle = useMemo(() => ({ flex: 1 }), []);
    const dateTopContainerStyle = useMemo(() => ({ position: 'absolute' as const, top: 8, left: 0, right: 0, alignItems: 'center' as const, zIndex: 10 }), []);
    const dateBackdropStyle = useMemo(() => ({ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }), []);
    const dateColorStyle = useMemo(() => ({ color: GOLD_COLOR }), []);
    // SYMMETRIC ALIGNMENT: Both containers have same fixed width (80px fits "ASHIGARU" + padding)
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
    const photoBottomBackdropStyle = useMemo(() => ({ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' as const }), []);
    const mainTitleWhiteStyle = useMemo(() => ({ color: '#FFF' }), []);
    const bigNumberContainerStyle = useMemo(() => ({ flexDirection: 'row' as const, alignItems: 'baseline' as const, gap: 4, marginTop: 4 }), []);
    const bigNumberGoldStyle = useMemo(() => ({ color: GOLD_COLOR }), []);
    const bigLabelWhiteStyle = useMemo(() => ({ color: '#FFF' }), []);
    const progressMarginStyle = useMemo(() => ({ marginBottom: 8 }), []);
    const progressHeaderStyle = useMemo(() => ({ flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 4 }), []);
    const sectionLabelGoldStyle = useMemo(() => ({ color: GOLD_COLOR }), []);
    const progressPercentStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 10, fontWeight: '900' as const }), []);
    const progressBarBgStyle = useMemo(() => ({ backgroundColor: isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }), [isWhite]);
    const progressBarFillStyle = useMemo(() => ({ width: `${progressPercent}%` as const }), [progressPercent]);
    const clubsMarginStyle = useMemo(() => ({ marginBottom: 6 }), []);
    const detailsDividerGoldStyle = useMemo(() => ({ backgroundColor: GOLD_COLOR }), []);
    const scrollHorizontalMarginStyle = useMemo(() => ({ marginTop: 6 }), []);
    const clubRowStyle = useMemo(() => ({ flexDirection: 'row' as const, gap: 8, paddingHorizontal: 4 }), []);
    const clubBadgeBgStyle = useMemo(() => ({ backgroundColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', borderColor }), [isWhite, borderColor]);
    const clubLogoStyle = useMemo(() => ({ width: 24, height: 24, borderRadius: 12, marginBottom: 4 }), []);
    const clubNameStyle = useMemo(() => ({ color: txt, fontSize: 8, fontWeight: '800' as const, textAlign: 'center' as const }), [txt]);
    const clubCountBadgeStyle = useMemo(() => ({ backgroundColor: GOLD_COLOR, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginTop: 3 }), []);
    const clubCountTextStyle = useMemo(() => ({ color: '#000', fontSize: 8, fontWeight: '900' as const }), []);
    const statsRowBgStyle = useMemo(() => ({ backgroundColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', borderColor }), [isWhite, borderColor]);
    const statColumnStyle = useMemo(() => ({ flex: 1, alignItems: 'center' as const }), []);
    const statValueStyle = useMemo(() => ({ color: GOLD_COLOR, fontSize: 16, fontWeight: '900' as const }), []);
    const statLabelStyle = useMemo(() => ({ color: subTxt, fontSize: 8, fontWeight: '800' as const }), [subTxt]);
    const statDividerStyle = useMemo(() => ({ width: 1, height: 30, backgroundColor: borderColor }), [borderColor]);
    const footerBorderStyle = useMemo(() => ({ borderTopColor: borderColor }), [borderColor]);

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
                  <Text style={[styles.dateText, dateColorStyle]}>{yearLabel}</Text>
                </View>
              ) : (
                <Text style={styles.dateText}>{yearLabel}</Text>
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
                {username && (
                  keepPhotoClear ? (
                    <View style={usernameBackdropStyle}>
                      <Text style={usernameTextStyle} numberOfLines={2}>
                        {username.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <Text style={usernameShadowStyle} numberOfLines={2}>
                      {username.toUpperCase()}
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
            {keepPhotoClear ? (
              <View style={photoBottomBackdropStyle}>
                <Text style={[styles.mainTitle, mainTitleWhiteStyle]}>RÉCAP ANNUEL</Text>
                <View style={bigNumberContainerStyle}>
                  <Text style={[styles.bigNumber, bigNumberGoldStyle]}>{stats.totalDays}</Text>
                  <Text style={[styles.bigLabel, bigLabelWhiteStyle]}>/365 JOURS</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.mainTitle}>RÉCAP ANNUEL</Text>
                <View style={bigNumberContainerStyle}>
                  <Text style={styles.bigNumber}>{stats.totalDays}</Text>
                  <Text style={styles.bigLabel}>/365 JOURS</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 2. SECTION STATS & DÉTAILS */}
        <View style={styles.statsSection}>

          {/* Barre de progression objectif */}
          <View style={progressMarginStyle}>
            <View style={progressHeaderStyle}>
              <Text style={[styles.sectionLabel, sectionLabelGoldStyle]}>OBJECTIF {yearlyGoal} JOURS</Text>
              <Text style={progressPercentStyle}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={[styles.progressBarBg, progressBarBgStyle]}>
              <LinearGradient
                colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, progressBarFillStyle]}
              />
            </View>
          </View>

          {/* Clubs principaux */}
          {stats.activityBreakdown && stats.activityBreakdown.length > 0 && (
            <View style={clubsMarginStyle}>
              <View style={styles.detailsHeader}>
                <View style={[styles.detailsDivider, detailsDividerGoldStyle]} />
                <Text style={styles.detailsLabel}>CLUBS</Text>
                <View style={[styles.detailsDivider, detailsDividerGoldStyle]} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={scrollHorizontalMarginStyle}>
                <View style={clubRowStyle}>
                  {stats.activityBreakdown.slice(0, 4).map((club, index) => (
                    <View key={index} style={[styles.clubBadge, clubBadgeBgStyle]}>
                      {club.clubLogo && (
                        <Image source={club.clubLogo} style={clubLogoStyle} resizeMode="cover" />
                      )}
                      <Text style={clubNameStyle} numberOfLines={2}>{club.clubName}</Text>
                      <View style={clubCountBadgeStyle}>
                        <Text style={clubCountTextStyle}>×{club.count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Stats rapides */}
          <View style={[styles.statsRow, statsRowBgStyle]}>
            <View style={statColumnStyle}>
              <Text style={statValueStyle}>{stats.bestStreak}</Text>
              <Text style={statLabelStyle}>BEST STREAK</Text>
            </View>
            <View style={statDividerStyle} />
            <View style={statColumnStyle}>
              <Text style={statValueStyle}>{stats.busiestMonth?.month.substring(0, 3) || '-'}</Text>
              <Text style={statLabelStyle}>TOP MOIS</Text>
            </View>
            <View style={statDividerStyle} />
            <View style={statColumnStyle}>
              <Text style={statValueStyle}>{Math.round(stats.percentage)}%</Text>
              <Text style={statLabelStyle}>DE L'ANNÉE</Text>
            </View>
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
    flex: PHOTO_SECTION_RATIO * 10,  // Utiliser flex pour proportions exactes
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
    paddingHorizontal: 16,
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
  mainTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bigNumber: {
    color: GOLD_COLOR,
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 48,
  },
  bigLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  statsSection: {
    flex: STATS_SECTION_RATIO * 10,  // Utiliser flex pour proportions exactes
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
    overflow: 'hidden',  // Éviter les débordements
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  clubBadge: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    width: 70,
    minHeight: 80,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerSection: {
    flex: FOOTER_SECTION_RATIO * 10,  // Utiliser flex pour proportions exactes
    borderTopWidth: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: 45,  // Hauteur minimale garantie
  },
});

export default YearCounterCardV2;
