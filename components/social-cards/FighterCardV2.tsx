import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Target, Scale } from 'lucide-react-native';
import { SocialCardTopBanner, SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

// ============================================
// FIGHTER CARD V2 - Style Pro (type UFC)
// Design épuré et professionnel
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface CombatClub {
  name: string;
  logo?: any;
  sport: string;
}

export interface FighterStats {
  name: string;
  nickname?: string;
  weight: number;
  height: number;
  rank: string;
  xp: number;
  streak: number;
  totalTrainings: number;
  clubName: string;
  clubLogo?: any;
  joinDate: string;
  weightLost: number;
  badges: number;
  profilePhoto?: string;
  combatClubs?: CombatClub[];
  // Palmarès
  wins?: number;
  losses?: number;
  draws?: number;
  // Stats additionnelles
  weightClass?: string;
  discipline?: string;
}

export interface FighterCardV2Props {
  stats: FighterStats;
  format: 'stories' | 'square';
  backgroundImage?: string;
  username?: string;
}

// Noms des sports en français
const getSportDisplayName = (sportId: string): string => {
  const sportNames: Record<string, string> = {
    'jjb': 'Jiu-Jitsu Brésilien',
    'mma': 'MMA',
    'boxe': 'Boxe Anglaise',
    'kickboxing': 'Kickboxing',
    'muay_thai': 'Muay Thai',
    'karate': 'Karaté',
    'judo': 'Judo',
    'lutte': 'Lutte',
    'grappling': 'Grappling',
    'sambo': 'Sambo',
    'taekwondo': 'Taekwondo',
    'boxe_francaise': 'Boxe Française',
    'kung_fu': 'Kung Fu',
    'krav_maga': 'Krav Maga',
  };
  return sportNames[sportId] || sportId.charAt(0).toUpperCase() + sportId.slice(1);
};

export const FighterCardV2 = React.memo(forwardRef<View, FighterCardV2Props>(
  ({ stats, format, backgroundImage }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Calculer le palmarès
    const wins = stats.wins || 0;
    const losses = stats.losses || 0;
    const draws = stats.draws || 0;
    const hasRecord = wins > 0 || losses > 0 || draws > 0;

    const content = (
      <>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        >
          {/* TOP BANNER - Branding YOROI */}
          <SocialCardTopBanner variant="dark" />

          {/* FIGHTER PROFILE */}
          <View style={styles.profileSection}>
            {/* Avatar avec bordure dorée - Photo ou Logo Yoroi */}
            <View style={styles.avatarWrapper}>
              <LinearGradient
                colors={['#D4AF37', '#F4E5B0', '#D4AF37']}
                style={styles.avatarBorder}
              >
                {stats.profilePhoto ? (
                  <Image
                    source={{ uri: stats.profilePhoto }}
                    style={styles.avatarPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarInner}>
                    <Image
                      source={require('@/assets/images/logo2010.png')}
                      style={styles.avatarLogo}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Nombre d'entraînements au-dessus du nom */}
            <View style={styles.trainingCountBadge}>
              <Target size={14} color="#000000" />
              <Text style={styles.trainingCountText}>{stats.totalTrainings} ENTRAÎNEMENTS</Text>
            </View>

            {/* Nom du combattant */}
            <Text style={styles.fighterName}>{stats.name.toUpperCase()}</Text>

            {/* Surnom */}
            {stats.nickname && (
              <Text style={styles.fighterNickname}>"{stats.nickname}"</Text>
            )}

            {/* Grade/Rang */}
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{stats.rank.toUpperCase()}</Text>
            </View>
          </View>

          {/* PALMARÈS - Style Pro */}
          {hasRecord && (
            <View style={styles.recordSection}>
              <View style={styles.recordBox}>
                <Text style={styles.recordNumber}>{wins}</Text>
                <Text style={styles.recordLabel}>V</Text>
              </View>
              <View style={styles.recordSeparator}>
                <Text style={styles.recordDash}>-</Text>
              </View>
              <View style={styles.recordBox}>
                <Text style={styles.recordNumber}>{losses}</Text>
                <Text style={styles.recordLabel}>D</Text>
              </View>
              <View style={styles.recordSeparator}>
                <Text style={styles.recordDash}>-</Text>
              </View>
              <View style={styles.recordBox}>
                <Text style={styles.recordNumber}>{draws}</Text>
                <Text style={styles.recordLabel}>N</Text>
              </View>
            </View>
          )}

          {/* STATS PRINCIPALES */}
          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              {/* Streak */}
              <View style={styles.statItem}>
                <Flame size={18} color="#FF6B00" />
                <Text style={styles.statValue}>{stats.streak}</Text>
                <Text style={styles.statLabel}>STREAK</Text>
              </View>

              {/* Entraînements */}
              <View style={styles.statItem}>
                <Target size={18} color="#D4AF37" />
                <Text style={styles.statValue}>{stats.totalTrainings}</Text>
                <Text style={styles.statLabel}>SESSIONS</Text>
              </View>

              {/* Poids */}
              <View style={styles.statItem}>
                <Scale size={18} color="#D4AF37" />
                <Text style={styles.statValue}>{stats.weight}</Text>
                <Text style={styles.statLabel}>KG</Text>
              </View>
            </View>
          </View>

          {/* DISCIPLINES / CLUBS */}
          {stats.combatClubs && stats.combatClubs.length > 0 && (
            <View style={styles.disciplinesSection}>
              {stats.combatClubs.slice(0, 2).map((club, index) => (
                <View key={index} style={styles.disciplineItem}>
                  {club.logo ? (
                    <Image source={club.logo} style={styles.clubLogo} resizeMode="contain" />
                  ) : (
                    <View style={styles.clubLogoPlaceholder}>
                      <Text style={styles.clubInitial}>{club.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.disciplineText}>
                    <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
                    <Text style={styles.sportName}>{getSportDisplayName(club.sport)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* FOOTER - Branding YOROI */}
          <SocialCardFooter variant="dark" />
        </LinearGradient>
      </>
    );

    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        {backgroundImage ? (
          <ImageBackground
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode="contain"
          >
            {content}
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={['#0a0a0a', '#1a1a2e', '#0f0f1a']}
            style={styles.defaultBackground}
          >
            <SocialCardWatermark show={!backgroundImage} />
            {content}
          </LinearGradient>
        )}
      </View>
    );
  }
));

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  defaultBackground: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarBorder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: {
    width: 122,
    height: 122,
    borderRadius: 61,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 2,
  },
  avatarLogo: {
    width: 80,
    height: 80,
  },
  trainingCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  trainingCountText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  fighterName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  fighterNickname: {
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#D4AF37',
    marginTop: 4,
  },
  rankBadge: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#D4AF37',
  },

  // Record Section (V-D-N)
  recordSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recordBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  recordNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  recordLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginTop: 2,
  },
  recordSeparator: {
    paddingHorizontal: 8,
  },
  recordDash: {
    fontSize: 28,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // Stats Section
  statsSection: {
    paddingHorizontal: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
  },
  
  // Disciplines Section
  disciplinesSection: {
    paddingHorizontal: 20,
    gap: 8,
  },
  disciplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  clubLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  clubLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  clubInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D4AF37',
  },
  disciplineText: {
    flex: 1,
  },
  clubName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sportName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4AF37',
    marginTop: 2,
  },
});

export default FighterCardV2;
