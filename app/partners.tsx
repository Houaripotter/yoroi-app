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
  Image,
  Modal,
  Platform,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, ExternalLink, Mail, MapPin, Star, X, Phone, Globe, Facebook as FacebookIcon, Swords, Trophy, Award, Zap, Dumbbell, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import {
  COACHES,
  CLUBS,
  Coach,
  Club,
} from '@/data/partners';
import { SPACING, RADIUS } from '@/constants/appTheme';

const getClubIcon = (type: string, color: string = '#999') => {
  if (type.toLowerCase().includes('jiu-jitsu') || type.toLowerCase().includes('jjb')) {
    return <Swords size={32} color={color} strokeWidth={2} />;
  } else if (type.toLowerCase().includes('mma') || type.toLowerCase().includes('combat')) {
    return <Trophy size={32} color={color} strokeWidth={2} />;
  } else if (type.toLowerCase().includes('boxe')) {
    return <Award size={32} color={color} strokeWidth={2} />;
  } else if (type.toLowerCase().includes('crossfit')) {
    return <Zap size={32} color={color} strokeWidth={2} />;
  } else if (type.toLowerCase().includes('musculation')) {
    return <Dumbbell size={32} color={color} strokeWidth={2} />;
  } else {
    return <Trophy size={32} color={color} strokeWidth={2} />;
  }
};

export default function PartnersScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'coaches' | 'clubs'>('coaches');
  const [selectedPartner, setSelectedPartner] = useState<Coach | Club | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);

  const openInstagram = (handle: string) => {
    const cleanHandle = handle.replace('@', '');
    safeOpenURL(`https://instagram.com/${cleanHandle}`);
  };

  const openYoutube = (channelName: string) => {
    safeOpenURL(`https://youtube.com/@${channelName}`);
  };

  const openPhone = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/\s/g, '').replace(/\./g, '');
    safeOpenURL(`tel:${cleanNumber}`);
  };

  const openEmail = (email?: string) => {
    const emailAddress = email || 'yoroiapp@hotmail.com';
    const subject = email ? 'Contact via YOROI' : 'Partenariat YOROI';
    safeOpenURL(`mailto:${emailAddress}?subject=${encodeURIComponent(subject)}`);
  };

  const openWebsite = (url: string) => {
    safeOpenURL(url);
  };

  const openFacebook = (handle: string) => {
    const cleanHandle = handle.replace('@', '').replace('/', '');
    safeOpenURL(`https://facebook.com/${cleanHandle}`);
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
                onPress={() => setSelectedPartner(coach)}
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
                onPress={() => setSelectedPartner(club)}
              />
            ))}
          </View>
        )}

        {/* Devenir Partenaire */}
        <View style={[styles.becomePartner, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.becomePartnerTitle, { color: colors.textPrimary }]}>
            Tu es coach ou tu gères un club ?
          </Text>
          <Text style={[styles.becomePartnerText, { color: colors.textMuted }]}>
            Rejoins le réseau YOROI et sois visible auprès de notre communauté de guerriers !
          </Text>
          <TouchableOpacity
            style={[styles.becomePartnerButton, { backgroundColor: colors.accent }]}
            onPress={() => openEmail()}
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

      {/* Modal Image Agrandie */}
      {selectedPartner && imageZoomed && (
        <Modal
          visible={imageZoomed}
          transparent
          animationType="fade"
          onRequestClose={() => setImageZoomed(false)}
        >
          <View style={styles.imageZoomContainer}>
            <TouchableOpacity
              style={styles.imageZoomOverlay}
              activeOpacity={1}
              onPress={() => setImageZoomed(false)}
            >
              <TouchableOpacity
                style={styles.imageZoomCloseButton}
                onPress={() => setImageZoomed(false)}
              >
                <X size={32} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
              {selectedPartner.imageUrl && (
                <Image
                  source={selectedPartner.imageUrl}
                  style={styles.imageZoomImage}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Modal Détail Partenaire */}
      {selectedPartner && (
        <Modal
          visible={!!selectedPartner}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setSelectedPartner(null);
            setImageZoomed(false);
          }}
        >
          <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
            {/* Header avec photo en grand */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setSelectedPartner(null)}
                style={styles.detailCloseButton}
              >
                <X size={28} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Grande photo - Cliquable pour agrandir */}
              {selectedPartner.imageUrl && (
                <TouchableOpacity
                  onPress={() => setImageZoomed(true)}
                  activeOpacity={0.9}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Image
                    source={selectedPartner.imageUrl}
                    style={styles.detailHeaderImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.detailHeaderGradient}
              />

              {/* Nom et titre en overlay */}
              <View style={styles.detailHeaderContent}>
                <Text style={styles.detailName}>{selectedPartner.name}</Text>
                <Text style={styles.detailRole}>
                  {'title' in selectedPartner ? selectedPartner.title : selectedPartner.type}
                </Text>
              </View>
            </View>

            {/* Contenu scrollable */}
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {/* Bio / Description */}
              {selectedPartner.bio && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                    À propos
                  </Text>
                  <Text style={[styles.detailBio, { color: colors.textPrimary }]}>
                    {selectedPartner.bio}
                  </Text>
                </View>
              )}

              {/* Contact - Boutons cliquables */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                  Contact
                </Text>
                <View style={styles.contactButtonsGrid}>
                  {/* Téléphone */}
                  {'phone' in selectedPartner && selectedPartner.phone && (
                    <TouchableOpacity
                      style={[styles.contactButton, { backgroundColor: '#10B981' }]}
                      onPress={() => openPhone(selectedPartner.phone!)}
                      activeOpacity={0.8}
                    >
                      <Phone size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contactButtonText}>Appeler</Text>
                    </TouchableOpacity>
                  )}

                  {/* Instagram */}
                  {selectedPartner.instagram && !Array.isArray(selectedPartner.instagram) && (
                    <TouchableOpacity
                      style={[styles.contactButton, { backgroundColor: '#E1306C' }]}
                      onPress={() => openInstagram(selectedPartner.instagram as string)}
                      activeOpacity={0.8}
                    >
                      <ExternalLink size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contactButtonText}>Instagram</Text>
                    </TouchableOpacity>
                  )}

                  {/* Site Web */}
                  {selectedPartner.website && (
                    <TouchableOpacity
                      style={[styles.contactButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => openWebsite(selectedPartner.website!)}
                      activeOpacity={0.8}
                    >
                      <Globe size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contactButtonText}>Site Web</Text>
                    </TouchableOpacity>
                  )}

                  {/* Email */}
                  {'email' in selectedPartner && selectedPartner.email && (
                    <TouchableOpacity
                      style={[styles.contactButton, { backgroundColor: '#F59E0B' }]}
                      onPress={() => openEmail(selectedPartner.email)}
                      activeOpacity={0.8}
                    >
                      <Mail size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contactButtonText}>Email</Text>
                    </TouchableOpacity>
                  )}

                  {/* Facebook */}
                  {'facebook' in selectedPartner && selectedPartner.facebook && (
                    <TouchableOpacity
                      style={[styles.contactButton, { backgroundColor: '#1877F2' }]}
                      onPress={() => openFacebook(selectedPartner.facebook!)}
                      activeOpacity={0.8}
                    >
                      <FacebookIcon size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contactButtonText}>Facebook</Text>
                    </TouchableOpacity>
                  )}

                  {/* YouTube */}
                  {'youtube' in selectedPartner && selectedPartner.youtube && (
                    <TouchableOpacity
                      style={[styles.contactButton, { backgroundColor: '#FF0000' }]}
                      onPress={() => openYoutube(selectedPartner.youtube!)}
                      activeOpacity={0.8}
                    >
                      <ExternalLink size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.contactButtonText}>YouTube</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Si Instagram multiple (pour les clubs) */}
                {Array.isArray(selectedPartner.instagram) && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={[styles.detailSectionTitle, { color: colors.textMuted, fontSize: 12, marginBottom: 8 }]}>
                      Comptes Instagram
                    </Text>
                    {selectedPartner.instagram.map((handle, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.contactButton, { backgroundColor: '#E1306C', marginBottom: 8 }]}
                        onPress={() => openInstagram(handle)}
                        activeOpacity={0.8}
                      >
                        <ExternalLink size={20} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.contactButtonText}>{handle}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Spécialités (pour les coachs) */}
              {'specialties' in selectedPartner && selectedPartner.specialties && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                    Spécialités
                  </Text>
                  <View style={styles.specialtiesContainer}>
                    {selectedPartner.specialties.map((spec, i) => (
                      <View
                        key={i}
                        style={[styles.specialtyBadge, { backgroundColor: colors.backgroundCard }]}
                      >
                        <Text style={[styles.specialtyBadgeText, { color: colors.textPrimary }]}>
                          {spec}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Entraîneurs (pour les clubs) */}
              {'trainers' in selectedPartner && selectedPartner.trainers && selectedPartner.trainers.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                    Entraîneurs
                  </Text>
                  {selectedPartner.trainers.map((trainer, i) => (
                    <Text key={i} style={[styles.trainerText, { color: colors.textPrimary }]}>
                      • {trainer}
                    </Text>
                  ))}
                </View>
              )}

              {/* Localisation */}
              {selectedPartner.location && (
                <TouchableOpacity
                  style={[styles.detailLocationCard, { backgroundColor: colors.backgroundCard }]}
                  onPress={() => {
                    const address = selectedPartner.location!;
                    const encodedAddress = encodeURIComponent(address);
                    const url = Platform.select({
                      ios: `maps://maps.apple.com/?q=${encodedAddress}`,
                      android: `geo:0,0?q=${encodedAddress}`,
                    });
                    if (url) safeOpenURL(url);
                  }}
                  activeOpacity={0.7}
                >
                  <MapPin size={20} color={colors.accent} strokeWidth={2} />
                  <Text style={[styles.detailLocationText, { color: isDark ? colors.accent : colors.textPrimary }]}>
                    {selectedPartner.location}
                  </Text>
                  <ExternalLink size={16} color={colors.accent} />
                </TouchableOpacity>
              )}


              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </Modal>
      )}
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
        <View style={styles.coachPhotoPlaceholder}>
          <User size={32} color={colors.textMuted} strokeWidth={2} />
        </View>
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
            <Text style={[styles.instagramHandle, { color: isDark ? colors.accent : colors.textPrimary }]}>{coach.instagram}</Text>
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
    {/* Photo - Même style que les coachs */}
    <View style={[styles.clubPhoto, { backgroundColor: colors.backgroundLight }]}>
      {club.imageUrl ? (
        <Image source={club.imageUrl} style={styles.clubImage} />
      ) : (
        <View style={styles.clubPhotoPlaceholder}>
          {getClubIcon(club.type, colors.textMuted)}
        </View>
      )}
    </View>

    {/* Info */}
    <View style={styles.clubInfo}>
      <View style={styles.clubHeader}>
        <Text style={[styles.clubName, { color: colors.textPrimary }]}>{club.name}</Text>
        {club.featured && (
          <View style={[styles.featuredBadge, { backgroundColor: colors.accent }]}>
            <Star size={10} color={colors.textOnAccent} />
            <Text style={[styles.featuredText, { color: colors.textOnAccent }]}>Recommandé</Text>
          </View>
        )}
      </View>

      <View style={styles.clubLocation}>
        <MapPin size={12} color={colors.textMuted} />
        <Text style={[styles.clubType, { color: colors.textSecondary }]}>
          {club.type} • {club.location}
        </Text>
      </View>

      {club.trainers && club.trainers.length > 0 && (
        <Text style={[styles.clubTrainers, { color: colors.textMuted }]} numberOfLines={2}>
          {club.trainers.join(' • ')}
        </Text>
      )}

      <View style={styles.clubFooter}>
        {club.instagram && (
          <View style={styles.instagramRow}>
            <ExternalLink size={14} color={colors.accent} />
            <Text style={[styles.instagramHandle, { color: isDark ? colors.accent : colors.textPrimary }]}>
              {Array.isArray(club.instagram)
                ? `${club.instagram.length} comptes`
                : club.instagram}
            </Text>
          </View>
        )}
        {club.featured && (
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
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  clubPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  clubImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  clubPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 17,
    fontWeight: '700',
  },
  clubLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  clubType: {
    fontSize: 13,
  },
  clubTrainers: {
    fontSize: 12,
    marginBottom: 8,
  },
  clubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Become partner
  becomePartner: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: SPACING.lg,
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

  // Detail Modal
  detailContainer: {
    flex: 1,
    // backgroundColor dynamique via style inline
  },
  detailHeader: {
    height: 400,
    position: 'relative',
  },
  detailCloseButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detailHeaderImage: {
    width: '100%',
    height: '100%',
  },
  detailHeaderGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  detailHeaderContent: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
  },
  detailName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  detailRole: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detailScroll: {
    flex: 1,
  },
  detailSection: {
    padding: 24,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  detailBio: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  specialtyBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainerText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  detailLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  detailLocationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  detailInstagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#E1306C',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  detailInstagramText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  detailYoutubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  detailYoutubeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },

  // Contact buttons
  contactButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Image zoom modal
  imageZoomContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageZoomOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageZoomCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imageZoomImage: {
    width: '100%',
    height: '80%',
  },
});
