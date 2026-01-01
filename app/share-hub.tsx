// ============================================
// YOROI - HUB DE PARTAGE
// ============================================
// Écran central pour partager sa progression sur les réseaux sociaux

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Trophy,
  Calendar,
  TrendingUp,
  Flame,
  Camera,
  Swords,
  ChevronRight,
  Share2,
  Scale,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TYPES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  route: string;
  gradient: readonly [string, string];
  badge?: string;
}

// ============================================
// CARTES DISPONIBLES
// ============================================

const SHARE_CARDS: ShareCard[] = [
  {
    id: 'year-counter',
    title: 'Compteur Annuel',
    subtitle: 'Le fameux X/365',
    description: 'Prends-toi en photo et ajoute tes stats en overlay ! Comme un filtre Instagram Stories. La carte la plus virale !',
    icon: Trophy,
    route: '/social-share/year-counter-v2',
    gradient: ['#F59E0B', '#D97706'],
    badge: 'NOUVEAU',
  },
  {
    id: 'monthly-recap',
    title: 'Récap Mensuel',
    subtitle: 'Ton mois en un coup d\'œil',
    description: 'Prends-toi en photo et ajoute ton calendrier du mois en overlay ! Évolution de poids et meilleure semaine.',
    icon: Calendar,
    route: '/social-share/monthly-recap-v2',
    gradient: ['#8B5CF6', '#7C3AED'],
    badge: 'NOUVEAU',
  },
  {
    id: 'transformation',
    title: 'Transformation',
    subtitle: 'Avant / Après',
    description: 'Choisis 2 photos de ta galerie et affiche ton avant/après côte à côte ! Parfait pour montrer ta progression.',
    icon: Camera,
    route: '/social-share/transformation-v2',
    gradient: ['#EC4899', '#DB2777'],
    badge: 'NOUVEAU',
  },
  {
    id: 'fighter-card',
    title: 'Fiche Combattant',
    subtitle: 'Fiche de combattant',
    description: 'Prends-toi en photo et affiche tes stats de champion ! Rang, streak, discipline, et badges comme une fiche UFC.',
    icon: Swords,
    route: '/social-share/fighter-card-v2',
    gradient: ['#EF4444', '#DC2626'],
    badge: 'NOUVEAU',
  },
  {
    id: 'weekly-recap',
    title: 'Récap Hebdo',
    subtitle: 'Ta semaine d\'entraînement',
    description: 'Prends-toi en photo et ajoute tes stats de la semaine en overlay ! Calendrier, sports et évolution.',
    icon: TrendingUp,
    route: '/social-share/weekly-recap-v2',
    gradient: ['#10B981', '#059669'],
    badge: 'NOUVEAU',
  },
  {
    id: 'weight-progress',
    title: 'Progression Poids',
    subtitle: 'Ta courbe de poids',
    description: 'Affiche ta progression poids avec graphique, achievements et stats ! Parfait pour montrer tes resultats.',
    icon: Scale,
    route: '/social-share/weight-progress',
    gradient: ['#06B6D4', '#0891B2'],
    badge: 'NOUVEAU',
  },
  {
    id: 'streak-fire',
    title: 'Série de Feu',
    subtitle: 'Ta série de feu',
    description: 'Affiche ton streak actuel et impressionne avec ta régularité.',
    icon: Flame,
    route: '/social-share/year-counter', // Même route, focus sur le streak
    gradient: ['#F97316', '#EA580C'],
  },
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ShareHubScreen() {
  const { colors, isDark } = useTheme();

  const renderShareCard = (card: ShareCard, index: number) => {
    return (
      <TouchableOpacity
        key={card.id}
        style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(card.route as any)}
        activeOpacity={0.7}
      >
        {/* Badge NOUVEAU en haut à droite */}
        {card.badge && (
          <View style={[styles.gridBadge, { backgroundColor: card.gradient[0] }]}>
            <Text style={styles.gridBadgeText}>{card.badge}</Text>
          </View>
        )}

        {/* Icône centrale */}
        <LinearGradient
          colors={[...card.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gridIconGradient}
        >
          <card.icon size={32} color="#FFFFFF" />
        </LinearGradient>

        {/* Titre */}
        <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {card.title}
        </Text>

        {/* Sous-titre */}
        <Text style={[styles.gridCardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {card.subtitle}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Partager ma progression
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Choisis ta carte et inspire la communauté
          </Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <LinearGradient
          colors={isDark ? ['#1A1A1A', '#2D2D2D'] : ['#F3F4F6', '#E5E7EB']}
          style={[styles.heroBanner, { borderColor: colors.border }]}
        >
          <Share2 size={32} color={colors.accent} />
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Partage tes victoires
          </Text>
          <Text style={[styles.heroText, { color: colors.textSecondary }]}>
            Inspire les autres avec ton parcours de champion et fais connaître Yoroi !
          </Text>
        </LinearGradient>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            CARTES DISPONIBLES
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {SHARE_CARDS.length}
          </Text>
        </View>

        {/* Cards Grid - 2 colonnes */}
        <View style={styles.cardsGrid}>
          {SHARE_CARDS.map((card, index) => renderShareCard(card, index))}
        </View>

        {/* Tips */}
        <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tipTitle, { color: colors.gold || colors.accent }]}>
            💡 Conseil
          </Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Publie régulièrement tes cartes sur Instagram Stories ! Ça inspire tes amis et ça fait
            connaître Yoroi. N'oublie pas d'utiliser #YoroiWarrior !
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Hero Banner
  heroBanner: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  heroText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Cards Grid - 2 colonnes
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (SCREEN_WIDTH - 52) / 2, // 2 colonnes avec gap
    aspectRatio: 1, // Carré
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
  },
  gridBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  gridIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  gridCardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Tips
  tipCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
