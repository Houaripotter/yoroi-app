// ============================================
// YOROI - PROFESSIONNELS DE SANTÉ
// ============================================
// Kinésithérapeutes et Nutritionnistes recommandés

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  Star,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { COACHES, NUTRITIONISTS, OSTEOPATHS, Coach, Nutritionist, Osteopath } from '@/data/partners';

export default function HealthProfessionalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'kines' | 'nutritionists' | 'osteos'>('kines');
  const [selectedProfessional, setSelectedProfessional] = useState<Coach | Nutritionist | Osteopath | null>(null);

  // Filtrer les kinés depuis COACHES
  const kines = COACHES.filter(c => c.type === 'kine');

  const openInstagram = (handle: string) => {
    const cleanHandle = handle.replace('@', '');
    safeOpenURL(`https://instagram.com/${cleanHandle}`);
  };

  const openEmail = () => {
    const email = 'yoroiapp@hotmail.com';
    const subject = 'Partenariat Professionnel de Santé YOROI';
    safeOpenURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
  };

  const openWebsite = (url: string) => {
    safeOpenURL(url);
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
              Professionnels de Santé
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Kinés, nutritionnistes et ostéopathes recommandés
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.backgroundCard }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'kines' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setActiveTab('kines')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'kines' ? colors.textOnAccent : colors.textPrimary },
              ]}
            >
              Kinés
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'nutritionists' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setActiveTab('nutritionists')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'nutritionists' ? colors.textOnAccent : colors.textPrimary },
              ]}
            >
              Nutritionnistes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'osteos' && { backgroundColor: colors.accent },
            ]}
            onPress={() => setActiveTab('osteos')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'osteos' ? colors.textOnAccent : colors.textPrimary },
              ]}
            >
              Ostéos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Liste Kinés */}
        {activeTab === 'kines' && (
          <View style={styles.list}>
            {kines.map(kine => (
              <ProfessionalCard
                key={kine.id}
                professional={kine}
                colors={colors}
                onPress={() => setSelectedProfessional(kine)}
              />
            ))}
          </View>
        )}

        {/* Liste Nutritionnistes */}
        {activeTab === 'nutritionists' && (
          <View style={styles.list}>
            {NUTRITIONISTS.length > 0 ? (
              NUTRITIONISTS.map(nutritionist => (
                <ProfessionalCard
                  key={nutritionist.id}
                  professional={nutritionist}
                  colors={colors}
                  onPress={() => setSelectedProfessional(nutritionist)}
                />
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  📋 Aucun nutritionniste pour le moment
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Les partenariats arrivent bientôt !
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Liste Ostéopathes */}
        {activeTab === 'osteos' && (
          <View style={styles.list}>
            {OSTEOPATHS.length > 0 ? (
              OSTEOPATHS.map(osteopath => (
                <ProfessionalCard
                  key={osteopath.id}
                  professional={osteopath}
                  colors={colors}
                  onPress={() => setSelectedProfessional(osteopath)}
                />
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucun ostéopathe pour le moment
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Les partenariats arrivent bientôt !
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Devenir Partenaire */}
        <View style={[styles.becomePartner, { backgroundColor: colors.backgroundCard }]}>
          <Text style={styles.becomePartnerIcon}>🩺</Text>
          <Text style={[styles.becomePartnerTitle, { color: colors.textPrimary }]}>
            Tu es professionnel de santé ?
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
          Les professionnels listés sont indépendants. YOROI ne garantit pas leurs services.
          Vérifiez toujours les qualifications avant de vous engager.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Détail Professionnel */}
      {selectedProfessional && (
        <Modal
          visible={!!selectedProfessional}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedProfessional(null)}
        >
          <View style={styles.detailContainer}>
            {/* Header avec photo en grand */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                onPress={() => setSelectedProfessional(null)}
                style={styles.detailCloseButton}
              >
                <X size={28} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Grande photo */}
              {selectedProfessional.imageUrl && (
                <Image
                  source={selectedProfessional.imageUrl}
                  style={styles.detailHeaderImage}
                  resizeMode="cover"
                />
              )}

              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.detailHeaderGradient}
              />

              {/* Nom et titre en overlay */}
              <View style={styles.detailHeaderContent}>
                <Text style={styles.detailName}>{selectedProfessional.name}</Text>
                <Text style={styles.detailRole}>{selectedProfessional.title}</Text>
              </View>
            </View>

            {/* Contenu scrollable */}
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {/* Bio / Description */}
              {selectedProfessional.bio && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                    À propos
                  </Text>
                  <Text style={[styles.detailBio, { color: colors.textPrimary }]}>
                    {selectedProfessional.bio}
                  </Text>
                </View>
              )}

              {/* Spécialités */}
              {selectedProfessional.specialties && selectedProfessional.specialties.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                    Spécialités
                  </Text>
                  <View style={styles.specialtiesContainer}>
                    {selectedProfessional.specialties.map((spec, i) => (
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

              {/* Localisation */}
              {selectedProfessional.location && (
                <TouchableOpacity
                  style={[styles.detailLocationCard, { backgroundColor: colors.backgroundCard }]}
                  onPress={() => {
                    const address = selectedProfessional.location!;
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
                  <Text style={[styles.detailLocationText, { color: colors.accent }]}>
                    {selectedProfessional.location}
                  </Text>
                  <ExternalLink size={16} color={colors.accent} />
                </TouchableOpacity>
              )}

              {/* Instagram */}
              {selectedProfessional.instagram && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.textMuted }]}>
                    Réseaux sociaux
                  </Text>
                  <TouchableOpacity
                    style={styles.detailInstagramButton}
                    onPress={() => openInstagram(selectedProfessional.instagram!)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={22} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.detailInstagramText}>{selectedProfessional.instagram}</Text>
                    <ExternalLink size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Website */}
              {selectedProfessional.website && (
                <TouchableOpacity
                  style={[styles.detailWebsiteButton, { backgroundColor: colors.accent }]}
                  onPress={() => openWebsite(selectedProfessional.website!)}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={22} color={colors.textOnAccent} strokeWidth={2.5} />
                  <Text style={[styles.detailWebsiteText, { color: colors.textOnAccent }]}>Site web</Text>
                  <ExternalLink size={18} color={colors.textOnAccent} />
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
// COMPOSANT PROFESSIONAL CARD
// ============================================

interface ProfessionalCardProps {
  professional: Coach | Nutritionist | Osteopath;
  colors: any;
  onPress: () => void;
}

const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ professional, colors, onPress }) => (
  <TouchableOpacity
    style={[styles.professionalCard, { backgroundColor: colors.backgroundCard }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {/* Photo */}
    <View style={[styles.professionalPhoto, { backgroundColor: colors.backgroundLight }]}>
      {professional.imageUrl ? (
        <Image source={professional.imageUrl} style={styles.professionalImage} />
      ) : (
        <Text style={styles.professionalPhotoPlaceholder}>🩺</Text>
      )}
    </View>

    {/* Info */}
    <View style={styles.professionalInfo}>
      <View style={styles.professionalHeader}>
        <Text style={[styles.professionalName, { color: colors.textPrimary }]}>{professional.name}</Text>
        {professional.featured && (
          <View style={[styles.featuredBadge, { backgroundColor: colors.accent }]}>
            <Star size={10} color={colors.textOnAccent} />
            <Text style={[styles.featuredText, { color: colors.textOnAccent }]}>Recommandé</Text>
          </View>
        )}
      </View>

      <View style={styles.professionalLocation}>
        <MapPin size={12} color={colors.textMuted} />
        <Text style={[styles.professionalTitle, { color: colors.textSecondary }]}>
          {professional.title} • {professional.location}
        </Text>
      </View>

      <View style={styles.specialties}>
        {professional.specialties.slice(0, 3).map((spec, i) => (
          <View key={i} style={[styles.specialtyTag, { backgroundColor: colors.backgroundLight }]}>
            <Text style={[styles.specialtyText, { color: colors.textMuted }]}>{spec}</Text>
          </View>
        ))}
      </View>

      <View style={styles.professionalFooter}>
        {professional.instagram && (
          <View style={styles.instagramRow}>
            <ExternalLink size={14} color={colors.accent} />
            <Text style={[styles.instagramHandle, { color: colors.accent }]}>{professional.instagram}</Text>
          </View>
        )}
        {professional.featured && (
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

  // Professional card
  professionalCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  professionalPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  professionalImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  professionalPhotoPlaceholder: {
    fontSize: 32,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  professionalName: {
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
  professionalLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  professionalTitle: {
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
  professionalFooter: {
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

  // Empty state
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
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

  // Detail Modal
  detailContainer: {
    flex: 1,
    backgroundColor: '#E8EDF2',
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
  detailWebsiteButton: {
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
  detailWebsiteText: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
});
