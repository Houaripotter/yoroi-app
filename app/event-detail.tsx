// ============================================
// YOROI - DÉTAIL D'UN ÉVÉNEMENT SPORTIF
// Page de détail pour les événements IBJJF, HYROX, etc.
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  ExternalLink,
  Tag,
  Users,
  Trophy,
  Dumbbell,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';

// Icônes par sport
const getSportIcon = (sportTag: string) => {
  const icons: Record<string, any> = {
    jjb: Trophy,
    grappling: Users,
    hyrox: Zap,
    marathon: Dumbbell,
    running: Dumbbell,
    trail: Dumbbell,
    climbing: Trophy,
    fitness: Dumbbell,
    powerlifting: Dumbbell,
    crossfit: Zap,
  };
  return icons[sportTag] || Tag;
};

// Couleurs par catégorie
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    combat: '#EF4444',
    endurance: '#10B981',
    force: '#F59E0B',
    nature: '#8B5CF6',
    autre: '#6B7280',
  };
  return colors[category] || '#6B7280';
};

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams();

  // Récupérer les données de l'événement depuis les params
  const event = {
    id: params.id as string,
    title: params.title as string,
    date_start: params.date_start as string,
    city: params.city as string,
    country: params.country as string,
    category: params.category as string,
    sport_tag: params.sport_tag as string,
    registration_link: params.registration_link as string,
    federation: params.federation as string,
  };

  const SportIcon = getSportIcon(event.sport_tag);
  const categoryColor = getCategoryColor(event.category);
  const eventDate = new Date(event.date_start);

  // Calculer les jours restants
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const handleOpenLink = async () => {
    if (event.registration_link) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await Linking.openURL(event.registration_link);
      } catch (error) {
        console.error('Erreur ouverture lien:', error);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md, backgroundColor: categoryColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.sportIconContainer}>
            <SportIcon size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.sportTag}>{event.sport_tag?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {event.title}
        </Text>

        {/* Date */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={[styles.iconCircle, { backgroundColor: categoryColor + '20' }]}>
            <Calendar size={20} color={categoryColor} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {eventDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {daysLeft > 0 && (
              <Text style={[styles.countdown, { color: categoryColor }]}>
                Dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Lieu */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={[styles.iconCircle, { backgroundColor: categoryColor + '20' }]}>
            <MapPin size={20} color={categoryColor} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Lieu</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {event.city}
            </Text>
            {event.country && (
              <Text style={[styles.infoSecondary, { color: colors.textSecondary }]}>
                {event.country}
              </Text>
            )}
          </View>
        </View>

        {/* Fédération */}
        {event.federation && (
          <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={[styles.iconCircle, { backgroundColor: categoryColor + '20' }]}>
              <Trophy size={20} color={categoryColor} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Fédération</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {event.federation}
              </Text>
            </View>
          </View>
        )}

        {/* Catégorie */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={[styles.iconCircle, { backgroundColor: categoryColor + '20' }]}>
            <Tag size={20} color={categoryColor} />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Catégorie</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {event.category === 'combat' ? 'Combat' :
               event.category === 'endurance' ? 'Endurance' :
               event.category === 'force' ? 'Force' :
               event.category === 'nature' ? 'Nature' : 'Autre'}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bouton d'inscription */}
      {event.registration_link && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: categoryColor }]}
            onPress={handleOpenLink}
            activeOpacity={0.8}
          >
            <ExternalLink size={20} color="#FFFFFF" />
            <Text style={styles.registerButtonText}>S'inscrire à l'événement</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  sportIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  sportTag: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: SPACING.xl,
    lineHeight: 32,
  },
  infoCard: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoSecondary: {
    fontSize: 14,
    fontWeight: '500',
  },
  countdown: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
