import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { UserClub } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.95;
const CARD_HEIGHT = CARD_WIDTH * 1.4; // Format portrait

interface FightCardProps {
  weekNumber: number;
  sessionsCount: number;
  currentWeight: number;
  weightChange: number;
  userClubs: UserClub[];
  avatarUri?: string | null;
}

export const FightCard: React.FC<FightCardProps> = ({
  weekNumber,
  sessionsCount,
  currentWeight,
  weightChange,
  userClubs,
  avatarUri,
}) => {
  const weightChangeText = weightChange > 0 
    ? `+${weightChange.toFixed(1)}kg` 
    : weightChange < 0 
    ? `${weightChange.toFixed(1)}kg` 
    : '0kg';

  const weightChangeColor = weightChange < 0 ? '#10B981' : weightChange > 0 ? '#EF4444' : '#9CA3AF';

  // Fonction pour obtenir le logo par défaut basé sur le type
  const getDefaultLogoForType = (type: string) => {
    // Les logos sont maintenant gérés par les clubs avec logoUri
    return null;
  };

  // Fonction pour obtenir l'emoji par défaut basé sur le type
  const getEmojiForType = (type: string) => {
    if (type === 'gracie_barra') return '';
    if (type === 'basic_fit') return '';
    if (type === 'running') return '';
    return '';
  };

  // Filtrer les clubs qui ont un logo (soit logoUri, soit un type avec logo par défaut)
  const clubsWithLogos = userClubs.filter(club => 
    club.logoUri || getDefaultLogoForType(club.type)
  );

  // Fallback : Toujours afficher au moins un club (ne jamais laisser vide)
  const displayClubs = clubsWithLogos.length > 0 
    ? clubsWithLogos.slice(0, 5)
    : [
        {
          id: 'demo',
          name: 'Yoroi',
          type: 'other' as const,
          logoUri: null,
          created_at: new Date().toISOString(),
        }
      ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0A', '#1A1A1A', '#0F0F0F']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RAPPORT DE COMBAT</Text>
          <Text style={styles.headerSubtitle}>SEMAINE {weekNumber}</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}></Text>
            </View>
          )}
        </View>

        {/* Stats Section - Tale of the Tape */}
        <View style={styles.statsSection}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>DISCIPLINE</Text>
            <Text style={styles.statValue}>{sessionsCount}</Text>
            <Text style={styles.statUnit}>Séances</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>PHYSIQUE</Text>
            <Text style={styles.statValue}>{currentWeight.toFixed(1)}kg</Text>
            <Text style={[styles.statChange, { color: weightChangeColor }]}>
              {weightChangeText}
            </Text>
          </View>
        </View>

        {/* Clubs Section - Always visible with fallback */}
        <View style={styles.clubsSection}>
          <Text style={styles.clubsLabel}>Q.G. ACTIFS</Text>
          <View style={styles.clubsRow}>
            {displayClubs.map((club) => {
              const defaultLogo = getDefaultLogoForType(club.type);
              return (
                <View key={club.id} style={styles.clubLogoWrapper}>
                  <View style={styles.clubLogoContainer}>
                    {club.logoUri ? (
                      <Image 
                        source={{ uri: club.logoUri }} 
                        style={styles.clubLogo}
                        resizeMode="cover"
                      />
                    ) : defaultLogo ? (
                      <Image 
                        source={defaultLogo} 
                        style={styles.clubLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.clubLogoPlaceholder}>
                        <Text style={styles.clubLogoPlaceholderText}>
                          {club.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.brandingText}>Propulsé par YOROI SYSTEM</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#0f172a', // Midnight Blue fallback
  },
  gradient: {
    flex: 1,
    padding: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#EF4444',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#EF4444',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 60,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 40,
    paddingVertical: 30,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#333333',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  statChange: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  statDivider: {
    width: 2,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clubsSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  clubsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  clubsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  clubLogoWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 2,
  },
  clubLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 18,
    overflow: 'hidden',
  },
  clubLogo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  clubLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubLogoPlaceholderText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2b32b2',
  },
  branding: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 1,
  },
});
