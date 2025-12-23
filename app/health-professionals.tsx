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
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  Star,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { COACHES, NUTRITIONISTS, OSTEOPATHS, Coach, Nutritionist, Osteopath } from '@/data/partners';

export default function HealthProfessionalsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'kines' | 'nutritionists' | 'osteos'>('kines');

  // Filtrer les kinés depuis COACHES
  const kines = COACHES.filter(c => c.type === 'kine');

  const openInstagram = (handle: string) => {
    const cleanHandle = handle.replace('@', '');
    Linking.openURL(`https://instagram.com/${cleanHandle}`);
  };

  const openEmail = () => {
    const email = 'partenaires@yoroi-app.com';
    const subject = 'Partenariat Professionnel de Santé YOROI';
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
                onPress={() => {
                  if (kine.instagram) {
                    openInstagram(kine.instagram);
                  } else if (kine.website) {
                    openWebsite(kine.website);
                  }
                }}
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
                  onPress={() => {
                    if (nutritionist.instagram) {
                      openInstagram(nutritionist.instagram);
                    } else if (nutritionist.website) {
                      openWebsite(nutritionist.website);
                    }
                  }}
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
                  onPress={() => {
                    if (osteopath.instagram) {
                      openInstagram(osteopath.instagram);
                    } else if (osteopath.website) {
                      openWebsite(osteopath.website);
                    }
                  }}
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
});
