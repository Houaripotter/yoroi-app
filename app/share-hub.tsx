// ============================================
// YOROI - HUB DE PARTAGE (Style Yoroi)
// Templates avec photo utilisateur mise en avant
// ============================================

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
  Share2,
  Camera,
  Lightbulb,
  Sparkles,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TEMPLATES DISPONIBLES
// ============================================

interface ShareTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  route: string;
  gradient: readonly [string, string];
  badge?: string;
}

const SHARE_TEMPLATES: ShareTemplate[] = [
  {
    id: 'year-counter',
    title: 'Compteur Annuel',
    subtitle: 'Le fameux X/365',
    description: 'Affiche ton compteur annuel avec ta photo. Le plus viral ! 11/208 jours + tes clubs.',
    icon: Trophy,
    route: '/social-share/year-counter-v2',
    gradient: ['#F59E0B', '#FBBF24'],
    badge: 'VIRAL',
  },
  {
    id: 'weekly-recap',
    title: 'Récap Hebdo',
    subtitle: 'Ta semaine d\'entraînement',
    description: 'Calendrier visuel de ta semaine avec ta photo. Parfait pour Stories Instagram.',
    icon: Calendar,
    route: '/social-share/weekly-recap-v2',
    gradient: ['#10B981', '#34D399'],
    badge: 'POPULAIRE',
  },
  {
    id: 'monthly-recap',
    title: 'Récap Mensuel',
    subtitle: 'Ton mois de warrior',
    description: 'Vue d\'ensemble de ton mois avec toutes tes stats et ta photo.',
    icon: TrendingUp,
    route: '/social-share/monthly-recap-v2',
    gradient: ['#3B82F6', '#60A5FA'],
  },
  {
    id: 'tiktok-stats',
    title: 'TikTok, Insta...',
    subtitle: 'Stats pour tes réseaux',
    description: 'Fond transparent parfait pour superposer sur tes vidéos et stories. Choisis tes stats !',
    icon: Sparkles,
    route: '/social-share/tiktok-stats',
    gradient: ['#EC4899', '#F472B6'],
    badge: 'NOUVEAU',
  },
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ShareHubScreen() {
  const { colors, isDark } = useTheme();

  const renderTemplate = (template: ShareTemplate) => {
    return (
      <TouchableOpacity
        key={template.id}
        style={[styles.templateCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        onPress={() => router.push(template.route as any)}
        activeOpacity={0.85}
      >
        {/* Badge */}
        {template.badge && (
          <View style={[styles.badge, { backgroundColor: template.gradient[0] }]}>
            <Text style={styles.badgeText}>{template.badge}</Text>
          </View>
        )}

        <View style={styles.templateContent}>
          {/* Icône */}
          <LinearGradient
            colors={[...template.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <template.icon size={32} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>

          {/* Textes */}
          <View style={styles.textContainer}>
            <Text style={[styles.templateTitle, { color: colors.textPrimary }]}>
              {template.title}
            </Text>
            <Text style={[styles.templateSubtitle, { color: colors.textSecondary }]}>
              {template.subtitle}
            </Text>
            <Text style={[styles.templateDescription, { color: colors.textMuted }]} numberOfLines={2}>
              {template.description}
            </Text>
          </View>

          {/* Icône Camera */}
          <View style={[styles.cameraIcon, { backgroundColor: `${template.gradient[0]}15` }]}>
            <Camera size={18} color={template.gradient[0]} strokeWidth={2.5} />
          </View>
        </View>
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
            Partage ta progression
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Mets ta photo en avant, fais la star !
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
          colors={[colors.accent, colors.accentDark || colors.accent]}
          style={[styles.heroBanner, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Share2 size={40} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={2.5} />
          <Text style={[styles.heroTitle, { color: isDark ? '#000000' : '#FFFFFF' }]}>
            Fais-toi remarquer
          </Text>
          <Text style={[styles.heroText, { color: isDark ? '#000000' : '#FFFFFF', opacity: 0.8 }]}>
            Choisis un template, ajoute ta photo, et deviens la star de ta communauté !
          </Text>
        </LinearGradient>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            TEMPLATES AVEC TA PHOTO
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
            {SHARE_TEMPLATES.length}
          </Text>
        </View>

        {/* Templates List */}
        <View style={styles.templatesList}>
          {SHARE_TEMPLATES.map(template => renderTemplate(template))}
        </View>

        {/* Tips */}
        <View style={[styles.tipCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.tipTitleRow}>
            <Lightbulb size={18} color={isDark ? colors.accent : '#1A1A1A'} />
            <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>
              Astuce Pro
            </Text>
          </View>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Ajoute ta photo pour que tes followers voient ton visage ! Tu peux prendre un selfie ou
            choisir depuis ta galerie. Plus tu es visible, plus tu vas faire fureur !
          </Text>
        </View>

        <View style={{ height: 100 }} />
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
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  heroText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Templates List
  templatesList: {
    gap: 16,
  },
  templateCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  templateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  templateSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    marginTop: 4,
  },
  cameraIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tips
  tipCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
