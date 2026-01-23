import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MonthStats } from '@/lib/social-cards/useMonthStats';
import { SocialCardFooter } from './SocialCardBranding';

// ============================================
// MONTHLY RECAP CARD V2 - Style SessionCard
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

const PHOTO_SECTION_HEIGHT = '65%';
const STATS_SECTION_HEIGHT = '23%';
const FOOTER_SECTION_HEIGHT = '12%';
const PROFILE_SIZE = 50;
const AVATAR_SIZE = 50;

export interface MonthlyRecapCardV2Props {
  stats: MonthStats;
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

export const MonthlyRecapCardV2 = forwardRef<View, MonthlyRecapCardV2Props>(
  ({
    stats, format, backgroundImage, backgroundType = 'black', weeklyGoal = 4, isLandscape = false,
    username, userAvatar, profilePhoto, rank, userLevel
  }, ref) => {

    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;
    const keepPhotoClear = !!backgroundImage;

    // Formater la date du mois avec année
    const currentYear = new Date().getFullYear();
    const monthLabel = `${stats.monthName} ${stats.year}`.toUpperCase();

    const isWhite = backgroundType === 'white';
    const bg = isWhite ? '#FFFFFF' : '#000000';
    const txt = isWhite ? '#000000' : '#FFFFFF';
    const subTxt = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const borderColor = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    const avatarSource = typeof userAvatar === 'string' ? { uri: userAvatar } : userAvatar;
    const profileSource = profilePhoto ? { uri: profilePhoto } : null;

    // Calculer objectif mensuel
    const monthlyGoal = weeklyGoal * 4;
    const progressPercent = Math.min((stats.totalTrainings / monthlyGoal) * 100, 100);

    return (
      <View ref={ref} style={[styles.card, { width: CARD_WIDTH, height: cardHeight, backgroundColor: bg }]} collapsable={false}>

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
            <View style={{ position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
              {keepPhotoClear ? (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={[styles.dateText, { color: GOLD_COLOR }]}>{monthLabel}</Text>
                </View>
              ) : (
                <Text style={styles.dateText}>{monthLabel}</Text>
              )}
            </View>

            <View style={styles.photoHeader}>

              {/* PHOTO PROFIL (GAUCHE) + NOM */}
              <View style={{ alignItems: 'center', gap: 4, maxWidth: 100 }}>
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
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, maxWidth: 100 }}>
                      <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', textAlign: 'center' }} numberOfLines={2}>
                        {username.toUpperCase()}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, textAlign: 'center', maxWidth: 100 }} numberOfLines={2}>
                      {username.toUpperCase()}
                    </Text>
                  )
                )}
              </View>

              {/* AVATAR YOROI (DROITE) + RANG + NIVEAU */}
              <View style={[styles.avatarContainer, { maxWidth: 100 }]}>
                {userAvatar && (
                  <View style={styles.avatarCircle}>
                    <Image source={avatarSource} style={styles.photoImage} resizeMode="contain" />
                  </View>
                )}
                {rank && userLevel !== undefined && userLevel !== null ? (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, maxWidth: 100 }}>
                    <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>{rank.toUpperCase()}</Text>
                    <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 1 }} numberOfLines={1}>
                      Niveau {userLevel}
                    </Text>
                  </View>
                ) : rank ? (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4, maxWidth: 100 }}>
                    <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', textAlign: 'center' }} numberOfLines={1}>{rank.toUpperCase()}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </LinearGradient>

          {/* INFOS BAS DE PHOTO */}
          <View style={styles.photoBottomInfo}>
            {keepPhotoClear ? (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' }}>
                <Text style={[styles.mainTitle, { color: '#FFF' }]}>RÉCAP MENSUEL</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <Text style={[styles.bigNumber, { color: GOLD_COLOR }]}>{stats.totalTrainings}</Text>
                  <Text style={[styles.bigLabel, { color: '#FFF' }]}>ENTRAÎNEMENTS</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.mainTitle}>RÉCAP MENSUEL</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <Text style={styles.bigNumber}>{stats.totalTrainings}</Text>
                  <Text style={styles.bigLabel}>ENTRAÎNEMENTS</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 2. SECTION STATS & DÉTAILS */}
        <View style={styles.statsSection}>

          {/* Barre de progression objectif */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={[styles.sectionLabel, { color: GOLD_COLOR }]}>OBJECTIF {monthlyGoal} SÉANCES</Text>
              <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900' }}>{Math.round(progressPercent)}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)' }]}>
              <LinearGradient
                colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>

          {/* Clubs principaux */}
          {stats.clubTrainings && stats.clubTrainings.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <View style={styles.detailsHeader}>
                <View style={[styles.detailsDivider, { backgroundColor: GOLD_COLOR }]} />
                <Text style={styles.detailsLabel}>CLUBS</Text>
                <View style={[styles.detailsDivider, { backgroundColor: GOLD_COLOR }]} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                  {stats.clubTrainings.slice(0, 4).map((club, index) => (
                    <View key={index} style={[styles.clubBadge, { backgroundColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)', borderColor }]}>
                      {club.clubLogo && (
                        <Image source={{ uri: club.clubLogo }} style={{ width: 24, height: 24, borderRadius: 12, marginBottom: 4 }} resizeMode="cover" />
                      )}
                      <Text style={{ color: txt, fontSize: 8, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>{club.clubName}</Text>
                      <View style={{ backgroundColor: GOLD_COLOR, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginTop: 3 }}>
                        <Text style={{ color: '#000', fontSize: 8, fontWeight: '900' }}>×{club.count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
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
              <Text style={{ color: GOLD_COLOR, fontSize: 16, fontWeight: '900' }}>S{stats.bestWeek?.weekNumber || '-'}</Text>
              <Text style={{ color: subTxt, fontSize: 8, fontWeight: '800' }}>BEST WEEK</Text>
            </View>
            <View style={{ width: 1, height: 30, backgroundColor: borderColor }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: GOLD_COLOR, fontSize: 16, fontWeight: '900' }}>{Math.round((stats.activeDays / stats.totalDays) * 100)}%</Text>
              <Text style={{ color: subTxt, fontSize: 8, fontWeight: '800' }}>DU MOIS</Text>
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
    paddingHorizontal: 12,
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
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
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
    height: FOOTER_SECTION_HEIGHT,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
});

export default MonthlyRecapCardV2;
