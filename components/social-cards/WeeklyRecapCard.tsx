// ============================================
// WEEKLY RECAP CARD - Style SessionCard
// ============================================
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WeekStats } from '@/lib/social-cards/useWeekStats';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

const PHOTO_SECTION_HEIGHT = '60%';
const STATS_SECTION_HEIGHT = '28%';
const FOOTER_SECTION_HEIGHT = '12%';
const PROFILE_SIZE = 50;
const AVATAR_SIZE = 50;

interface WeeklyRecapCardProps {
  stats: WeekStats;
  backgroundImage?: string | null;
  backgroundType?: 'photo' | 'black' | 'white';
  keepPhotoClear?: boolean;
  width?: number;
  userAvatar?: any;
  profilePhoto?: string | null;
  userName?: string;
  rank?: string;
  userLevel?: number;
}

export const WeeklyRecapCard = React.memo(React.forwardRef<View, WeeklyRecapCardProps>(
  ({
    stats, backgroundImage, backgroundType = 'black', keepPhotoClear = false, width = DEFAULT_WIDTH,
    userAvatar, profilePhoto, userName, rank, userLevel
  }, ref) => {

    const CARD_HEIGHT = width * (16 / 9);

    // Formater la date de la semaine
    const weekLabel = stats.weekLabel.toUpperCase();

    const isWhite = backgroundType === 'white';
    const bg = isWhite ? '#FFFFFF' : '#000000';
    const txt = isWhite ? '#000000' : '#FFFFFF';
    const subTxt = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const borderColor = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    const avatarSource = typeof userAvatar === 'string' ? { uri: userAvatar } : userAvatar;
    const profileSource = profilePhoto ? { uri: profilePhoto } : null;

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
              ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']
              : ['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
            style={styles.photoGradient}
          >
            {/* DATE EN HAUT AU MILIEU */}
            <View style={{ position: 'absolute', top: 16, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
              {keepPhotoClear ? (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={[styles.dateText, { color: GOLD_COLOR }]}>{weekLabel}</Text>
                </View>
              ) : (
                <Text style={styles.dateText}>{weekLabel}</Text>
              )}
            </View>

            <View style={styles.photoHeader}>

              {/* PHOTO PROFIL (GAUCHE) + NOM - SYMMETRIC WIDTH 80px */}
              <View style={{ width: 80, alignItems: 'center', gap: 4 }}>
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
                  keepPhotoClear ? (
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, maxWidth: 75 }}>
                      <Text style={{ color: GOLD_COLOR, fontSize: 9, fontWeight: '900', textAlign: 'center' }} numberOfLines={2}>
                        {userName.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: GOLD_COLOR, fontSize: 9, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, textAlign: 'center', maxWidth: 75 }} numberOfLines={2}>
                      {userName.toUpperCase()}
                    </Text>
                  )
                )}
              </View>

              {/* AVATAR YOROI (DROITE) + RANG + NIVEAU - SYMMETRIC WIDTH 80px */}
              <View style={[styles.avatarContainer, { width: 80 }]}>
                {userAvatar && (
                  <View style={styles.avatarCircle}>
                    <Image source={avatarSource} style={styles.photoImage} resizeMode="contain" />
                  </View>
                )}
                {rank && (
                  keepPhotoClear ? (
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 }}>
                      <Text style={{ color: GOLD_COLOR, fontSize: 7, fontWeight: '900' }}>{rank.toUpperCase()}</Text>
                    </View>
                  ) : (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{rank.toUpperCase()}</Text>
                    </View>
                  )
                )}
                {userLevel !== undefined && userLevel !== null && (
                  keepPhotoClear ? (
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 }}>
                      <Text style={{ color: GOLD_COLOR, fontSize: 8, fontWeight: '900' }}>
                        {`NIV. ${userLevel}`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: GOLD_COLOR, fontSize: 8, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginTop: 2 }}>
                      {`NIV. ${userLevel}`}
                    </Text>
                  )
                )}
              </View>
            </View>
          </LinearGradient>

          {/* INFOS BAS DE PHOTO */}
          <View style={styles.photoBottomInfo}>
            <Text style={styles.mainTitle}>RÉCAPITULATIF HEBDO</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <Text style={styles.bigNumber}>{stats.totalSessions}</Text>
              <Text style={styles.bigLabel}>ENTRAÎNEMENTS</Text>
            </View>
          </View>
        </View>

        {/* 2. SECTION STATS & DÉTAILS */}
        <View style={styles.statsSection}>

          {/* Calendrier de la semaine */}
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { color: GOLD_COLOR }]}>CALENDRIER</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 }}>
              {stats.calendar.map((day, index) => (
                <View key={index} style={{ alignItems: 'center', gap: 3 }}>
                  <Text style={{ color: GOLD_COLOR, fontSize: 8, fontWeight: '900' }}>{day.dayName}</Text>
                  <View style={[
                    styles.dayDot,
                    {
                      backgroundColor: day.sessions > 0 ? GOLD_COLOR : (isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                      borderColor: day.isToday ? GOLD_COLOR : 'transparent',
                      borderWidth: day.isToday ? 2 : 0
                    }
                  ]}>
                    {day.sessions > 0 && (
                      <Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>{day.sessions}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Clubs principaux */}
          {stats.clubs && stats.clubs.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={styles.detailsHeader}>
                <View style={[styles.detailsDivider, { backgroundColor: GOLD_COLOR }]} />
                <Text style={styles.detailsLabel}>CLUBS</Text>
                <View style={[styles.detailsDivider, { backgroundColor: GOLD_COLOR }]} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {stats.clubs.slice(0, 3).map((club, index) => (
                  <View key={index} style={[styles.clubBadge, { backgroundColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', borderColor }]}>
                    <Text style={{ color: txt, fontSize: 9, fontWeight: '800' }} numberOfLines={1}>{club.clubName}</Text>
                    <View style={{ backgroundColor: GOLD_COLOR, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 4 }}>
                      <Text style={{ color: '#000', fontSize: 8, fontWeight: '900' }}>×{club.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats rapides */}
          <View style={[styles.statsRow, { backgroundColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', borderColor }]}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: GOLD_COLOR, fontSize: 16, fontWeight: '900' }}>{stats.activeDays}</Text>
              <Text style={{ color: subTxt, fontSize: 8, fontWeight: '800' }}>JOURS ACTIFS</Text>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: borderColor }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: GOLD_COLOR, fontSize: 16, fontWeight: '900' }}>{stats.bestDay?.dayName || '-'}</Text>
              <Text style={{ color: subTxt, fontSize: 8, fontWeight: '800' }}>BEST DAY</Text>
            </View>
          </View>
        </View>

        {/* 3. FOOTER */}
        <View style={[styles.footerSection, { borderTopColor: borderColor }]}>
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
    paddingHorizontal: 20,
    paddingTop: 12,
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
    justifyContent: 'flex-start',
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
    padding: 20,
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
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerSection: {
    height: FOOTER_SECTION_HEIGHT,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
});
