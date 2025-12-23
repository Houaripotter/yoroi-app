// ============================================
// YOROI - ÉCRAN PARTENAIRES
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, ExternalLink, Mail, MapPin, Star } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  COACHES,
  CLUBS,
  Coach,
  Club,
} from '@/data/partners';
import { SPACING, RADIUS } from '@/constants/appTheme';

const getClubIcon = (type: string): string => {
  if (type.toLowerCase().includes('jiu-jitsu') || type.toLowerCase().includes('jjb')) {
    return '🥋';
  } else if (type.toLowerCase().includes('mma') || type.toLowerCase().includes('combat')) {
    return '🥊';
  } else if (type.toLowerCase().includes('boxe')) {
    return '🥊';
  } else if (type.toLowerCase().includes('crossfit')) {
    return '💪';
  } else if (type.toLowerCase().includes('musculation')) {
    return '🏋️';
  } else {
    return '🏆';
  }
};

export default function PartnersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'coaches' | 'clubs'>('coaches');

  const openInstagram = (handle: string) => {
    const cleanHandle = handle.replace('@', '');
    Linking.openURL(`https://instagram.com/${cleanHandle}`);
  };

  const openYoutube = (channelName: string) => {
    Linking.openURL(`https://youtube.com/@${channelName}`);
  };

  const openEmail = () => {
    const email = 'partenaires@yoroi-app.com';
    const subject = 'Partenariat YOROI';
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  const openWebsite = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Partenaires YOROI
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Coachs et clubs recommandés
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.backgroundCard }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'coaches' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setActiveTab('coaches')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'coaches' ? colors.textOnAccent : colors.textPrimary },
              ]}
            >
              Coachs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'clubs' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setActiveTab('clubs')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'clubs' ? colors.textOnAccent : colors.textPrimary },
              ]}
            >
              Clubs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Liste Coachs */}
        {activeTab === 'coaches' && (
          <View style={styles.list}>
            {COACHES.filter(coach => coach.type === 'coach').map(coach => (
              <CoachCard
                key={coach.id}
                coach={coach}
                colors={colors}
                onPress={() => {
                  if (coach.instagram) {
                    openInstagram(coach.instagram);
                  } else if (coach.youtube) {
                    openYoutube(coach.youtube);
                  } else if (coach.website) {
                    openWebsite(coach.website);
                  }
                }}
              />
            ))}
          </View>
        )}

        {/* Liste Clubs */}
        {activeTab === 'clubs' && (
          <View style={styles.list}>
            {CLUBS.map(club => (
              <ClubCard
                key={club.id}
                club={club}
                colors={colors}
                onPress={() => {
                  if (club.instagram) {
                    openInstagram(club.instagram);
                  } else if (club.website) {
                    openWebsite(club.website);
                  }
                }}
              />
            ))}
          </View>
        )}

        {/* Devenir Partenaire */}
        <View style={[styles.becomePartner, { backgroundColor: colors.backgroundCard }]}>
          <Text style={styles.becomePartnerIcon}>🤝</Text>
          <Text style={[styles.becomePartnerTitle, { color: colors.textPrimary }]}>
            Tu es coach ou tu gères un club ?
          </Text>
          <Text style={[styles.becomePartnerText, { color: colors.textMuted }]}>
            Rejoins le réseau YOROI et sois visible auprès de notre communauté de guerriers !
          </Text>
          <TouchableOpacity
            style={[styles.becomePartnerButton, { backgroundColor: colors.accent }]}
            onPress={openEmail}
            activeOpacity={0.8}
          >
            <Mail size={18} color={colors.textOnAccent} />
            <Text style={[styles.becomePartnerButtonText, { color: colors.textOnAccent }]}>
              Nous contacter
            </Text>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          Les partenaires listés sont des professionnels indépendants. YOROI ne garantit pas leurs
          services. Vérifiez toujours les qualifications avant de vous engager.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// COMPOSANT COACH CARD
// ============================================

interface CoachCardProps {
  coach: Coach;
  colors: any;
  onPress: () => void;
}

const CoachCard: React.FC<CoachCardProps> = ({ coach, colors, onPress }) => (
  <TouchableOpacity
    style={[styles.coachCard, { backgroundColor: colors.backgroundCard }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {/* Photo */}
    <View style={[styles.coachPhoto, { backgroundColor: colors.backgroundLight }]}>
      {coach.imageUrl ? (
        <Image source={coach.imageUrl} style={styles.coachImage} />
      ) : (
        <Text style={styles.coachPhotoPlaceholder}>👨‍🏫</Text>
      )}
    </View>

    {/* Info */}
    <View style={styles.coachInfo}>
      <View style={styles.coachHeader}>
        <Text style={[styles.coachName, { color: colors.textPrimary }]}>{coach.name}</Text>
        {coach.featured && (
          <View style={[styles.featuredBadge, { backgroundColor: colors.accent }]}>
            <Star size={10} color={colors.textOnAccent} />
            <Text style={[styles.featuredText, { color: colors.textOnAccent }]}>Recommandé</Text>
          </View>
        )}
      </View>

      <View style={styles.coachLocation}>
        <MapPin size={12} color={colors.textMuted} />
        <Text style={[styles.coachTitle, { color: colors.textSecondary }]}>
          {coach.title} • {coach.location}
        </Text>
      </View>

      <View style={styles.specialties}>
        {coach.specialties.slice(0, 3).map((spec, i) => (
          <View key={i} style={[styles.specialtyTag, { backgroundColor: colors.backgroundLight }]}>
            <Text style={[styles.specialtyText, { color: colors.textMuted }]}>{spec}</Text>
          </View>
        ))}
      </View>

      <View style={styles.coachFooter}>
        {coach.instagram && (
          <View style={styles.instagramRow}>
            <ExternalLink size={14} color={colors.accent} />
            <Text style={[styles.instagramHandle, { color: colors.accent }]}>{coach.instagram}</Text>
          </View>
        )}
        {coach.featured && (
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={12} color="#FFD700" fill="#FFD700" />
            ))}
          </View>
        )}
      </View>
    </View>

    {/* Arrow */}
    <ChevronRight size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

// ============================================
// COMPOSANT CLUB CARD
// ============================================

interface ClubCardProps {
  club: Club;
  colors: any;
  onPress: () => void;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, colors, onPress }) => (
  <TouchableOpacity
    style={[styles.clubCard, { backgroundColor: colors.backgroundCard }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {/* Icon */}
    <View style={[styles.clubIcon, { backgroundColor: colors.accent }]}>
      <Text style={styles.clubIconText}>{getClubIcon(club.type)}</Text>
    </View>

    {/* Info */}
    <View style={styles.clubInfo}>
      <View style={styles.clubHeader}>
        <Text style={[styles.clubName, { color: colors.textPrimary }]}>{club.name}</Text>
        {club.featured && (
          <View style={[styles.featuredBadgeSmall, { backgroundColor: colors.accent }]}>
            <Star size={10} color={colors.textOnAccent} fill={colors.textOnAccent} />
          </View>
        )}
      </View>
      <View style={styles.clubLocation}>
        <MapPin size={12} color={colors.textMuted} />
        <Text style={[styles.clubType, { color: colors.textMuted }]}>
          {club.type} • {club.location}
        </Text>
      </View>
{club.trainers && club.trainers.length > 0 && (
        <Text style={[styles.clubTrainers, { color: colors.textMuted }]} numberOfLines={1}>
          {club.trainers.join(' • ')}
        </Text>
      )}
      {club.instagram && (
        <View style={styles.clubInstagramRow}>
          <ExternalLink size={12} color={colors.accent} />
          <Text style={[styles.clubInstagram, { color: colors.accent }]}>{club.instagram}</Text>
        </View>
      )}
      {club.website && !club.instagram && (
        <View style={styles.clubInstagramRow}>
          <ExternalLink size={12} color={colors.accent} />
          <Text style={[styles.clubInstagram, { color: colors.accent }]} numberOfLines={1}>
            Site web
          </Text>
        </View>
      )}
    </View>

    {/* Arrow */}
    <ChevronRight size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // List
  list: {
    gap: 12,
    marginBottom: SPACING.xl,
  },

  // Coach card
  coachCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  coachPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  coachImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  coachPhotoPlaceholder: {
    fontSize: 32,
  },
  coachInfo: {
    flex: 1,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  coachName: {
    fontSize: 17,
    fontWeight: '700',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
  },
  coachLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  coachTitle: {
    fontSize: 13,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  specialtyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specialtyText: {
    fontSize: 11,
  },
  coachFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instagramHandle: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
  },

  // Club card
  clubCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  clubIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  clubIconText: {
    fontSize: 24,
  },
  clubInfo: {
    flex: 1,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
  },
  featuredBadgeSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  clubType: {
    fontSize: 13,
  },
  clubTrainers: {
    fontSize: 12,
    marginTop: 4,
  },
  clubInstagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  clubInstagram: {
    fontSize: 12,
  },

  // Become partner
  becomePartner: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  becomePartnerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  becomePartnerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  becomePartnerText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  becomePartnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  becomePartnerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
