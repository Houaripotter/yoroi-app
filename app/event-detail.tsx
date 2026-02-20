// ============================================
// YOROI - DÉTAIL D'UN ÉVÉNEMENT SPORTIF
// Page de détail complète avec image, description et lien direct
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  ExternalLink,
  Info,
  Globe,
  Users,
  Timer,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { safeOpenURL } from '@/lib/security/validators';
import { getSportById } from '@/lib/sports';
import { logger } from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Descriptions des événements par type
const getEventDescription = (sportTag: string, federation: string, title: string): string => {
  const descriptions: Record<string, string> = {
    marathon: `Le ${title} est l'une des courses les plus prestigieuses au monde. Rejoignez des milliers de coureurs pour cette aventure de 42,195 km à travers un parcours emblématique. Que vous soyez un coureur expérimenté ou que vous releviez votre premier défi marathon, cet événement offre une expérience inoubliable avec une ambiance électrique et un soutien massif du public.`,

    running: `Cette course à pied rassemble des milliers de participants de tous niveaux. Profitez d'un parcours bien organisé, d'une ambiance festive et d'un ravitaillement complet. Parfait pour battre votre record personnel ou simplement profiter du plaisir de courir avec la communauté.`,

    trail: `Cette épreuve de trail vous emmène à travers des paysages spectaculaires. Affrontez les dénivelés, les chemins techniques et la nature sauvage. Un défi physique et mental qui récompense chaque finisher avec des souvenirs impérissables et une fierté immense.`,

    jjb: `Compétition officielle de Jiu-Jitsu Brésilien organisée par ${federation || 'une fédération reconnue'}. Affrontez des compétiteurs de votre niveau dans des combats intenses. Catégories par ceinture, âge et poids. Médailles et points de classement à la clé pour les vainqueurs.`,

    grappling: `Tournoi de grappling/submission wrestling de haut niveau. Règles permettant les soumissions sans gi. Une opportunité de tester vos techniques contre des adversaires motivés dans un environnement compétitif et respectueux.`,

    hyrox: `HYROX est la compétition de fitness racing mondiale. 8 stations de workout entrecoupées de 8 courses de 1km. Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls et SkiErg. Préparez-vous pour le défi ultime qui teste votre force et votre endurance.`,

    crossfit: `Compétition CrossFit officielle avec des WODs (Workout of the Day) variés testant toutes les facettes de votre condition physique. Force, endurance, gymnastique et cardio - montrez que vous êtes le plus complet des athlètes.`,

    powerlifting: `Championnats de force athlétique avec les trois mouvements : squat, développé couché et soulevé de terre. Catégories par poids de corps et classes d'âge. Tentez de battre vos records personnels et de vous mesurer aux meilleurs.`,

    triathlon: `Épreuve combinant natation, cyclisme et course à pied. Un défi d'endurance ultime qui teste votre polyvalence et votre mental. Transitions rapides, gestion de l'effort et stratégie sont les clés du succès.`,

    obstacle: `Course à obstacles intense combinant running et défis physiques. Murs, cordes, boue, eau glacée et bien plus. Repoussez vos limites et découvrez de quoi vous êtes capable. Esprit d'équipe et dépassement de soi garantis.`,

    cycling: `Événement cycliste sur un parcours mythique. Grimpées légendaires, descentes techniques et paysages à couper le souffle. Roulez comme les pros sur des routes fermées à la circulation.`,

    judo: `Compétition officielle de judo avec combats par catégories de poids. Ippons, waza-aris et projections spectaculaires. Représentez votre club et visez la plus haute marche du podium.`,
  };

  return descriptions[sportTag] || `Événement sportif de ${sportTag}. Rejoignez la compétition et mesurez-vous aux meilleurs athlètes de votre discipline. Une expérience unique qui combine performance, convivialité et dépassement de soi.`;
};

// Infos pratiques par type d'événement
const getEventTips = (sportTag: string): string[] => {
  const tips: Record<string, string[]> = {
    marathon: [
      'Arrivez 2h avant le départ',
      'Préparez votre tenue la veille',
      'Hydratez-vous bien les jours précédents',
      'Ne testez rien de nouveau le jour J',
    ],
    running: [
      'Récupérez votre dossard à l\'avance',
      'Échauffez-vous 20 min avant',
      'Partez à votre rythme',
    ],
    trail: [
      'Vérifiez le matériel obligatoire',
      'Prévoyez ravitaillement personnel',
      'Étudiez le profil du parcours',
      'Lampe frontale chargée (si nuit)',
    ],
    jjb: [
      'Pesée la veille ou le matin',
      'Apportez gi de rechange',
      'Coupez vos ongles',
      'Arrivez 1h avant votre catégorie',
    ],
    grappling: [
      'Short et rashguard obligatoires',
      'Vérifiez les règles de la compétition',
      'Protège-oreilles recommandés',
    ],
    hyrox: [
      'Entraînez les 8 stations',
      'Pratiquez les transitions',
      'Gérez votre effort sur les runs',
      'Apportez vos gants de workout',
    ],
    crossfit: [
      'Connaissez les standards des mouvements',
      'Apportez votre équipement',
      'Hydratez-vous entre les WODs',
    ],
    powerlifting: [
      'Vérifiez les équipements autorisés',
      'Connaissez les commandes arbitrage',
      'Pesée officielle obligatoire',
    ],
  };

  return tips[sportTag] || ['Arrivez à l\'avance', 'Préparez votre équipement', 'Restez hydraté'];
};

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    date_start?: string;
    city?: string;
    country?: string;
    full_address?: string;
    category?: string;
    sport_tag?: string;
    registration_link?: string;
    federation?: string;
    image_logo_url?: string;
  }>();

  // Safe parameter extraction with defaults
  const event = {
    id: params.id || '',
    title: params.title || 'Événement',
    date_start: params.date_start || new Date().toISOString(),
    city: params.city || 'Lieu inconnu',
    country: params.country || '',
    full_address: params.full_address || '',
    category: params.category || 'autre',
    sport_tag: params.sport_tag || 'autre',
    registration_link: params.registration_link || '',
    federation: params.federation || '',
    image_logo_url: params.image_logo_url || '',
  };

  // Early return if no valid event id
  if (!params.id) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.md, backgroundColor: '#6B7280' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.sportTag}>ERREUR</Text>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 16, textAlign: 'center' }}>
            Événement non trouvé. Veuillez réessayer.
          </Text>
        </View>
      </View>
    );
  }

  const sport = getSportById(event.sport_tag);
  const categoryColor = getCategoryColor(event.category);
  const eventDate = new Date(event.date_start);
  const description = getEventDescription(event.sport_tag, event.federation, event.title);
  const tips = getEventTips(event.sport_tag);

  // Calculer les jours restants
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDateCopy = new Date(event.date_start);
  eventDateCopy.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((eventDateCopy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const handleOpenLink = async () => {
    if (event.registration_link) {
      impactAsync(ImpactFeedbackStyle.Medium);
      try {
        await safeOpenURL(event.registration_link);
      } catch (error) {
        logger.error('Erreur ouverture lien:', error);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec design visuel */}
      <View style={[styles.headerContainer, { backgroundColor: categoryColor }]}>
        {/* Pattern décoratif en arrière-plan */}
        <View style={styles.headerPattern}>
          <MaterialCommunityIcons
            name={(sport?.icon as any) || 'trophy'}
            size={200}
            color="rgba(255,255,255,0.08)"
          />
        </View>

        {/* Pattern secondaire */}
        <View style={styles.headerPatternSecondary}>
          <MaterialCommunityIcons
            name={(sport?.icon as any) || 'trophy'}
            size={120}
            color="rgba(255,255,255,0.05)"
          />
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + SPACING.sm }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Icône centrale dans un cercle */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons
              name={(sport?.icon as any) || 'trophy'}
              size={48}
              color="#FFFFFF"
            />
          </View>
        </View>

        {/* Sport Tag Badge */}
        <View style={[styles.sportBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={styles.sportBadgeText}>
            {event.sport_tag?.toUpperCase().replace('_', ' ')}
          </Text>
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

        {/* Countdown Badge */}
        {daysLeft > 0 && (
          <View style={[styles.countdownBadge, { backgroundColor: categoryColor + '15' }]}>
            <Timer size={16} color={categoryColor} />
            <Text style={[styles.countdownText, { color: categoryColor }]}>
              Dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Quick Info Row */}
        <View style={styles.quickInfoRow}>
          <View style={[styles.quickInfoItem, { backgroundColor: colors.backgroundCard }]}>
            <Calendar size={18} color={categoryColor} />
            <Text style={[styles.quickInfoText, { color: colors.textPrimary }]}>
              {eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.quickInfoItem, { backgroundColor: colors.backgroundCard }]}>
            <MapPin size={18} color={categoryColor} />
            <Text style={[styles.quickInfoText, { color: colors.textPrimary }]} numberOfLines={1}>
              {event.city}
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={categoryColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              À propos
            </Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>

        {/* Infos détaillées */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={categoryColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Informations
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {eventDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Lieu</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {event.full_address || `${event.city}, ${event.country}`}
            </Text>
          </View>

          {event.federation && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Organisateur</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {event.federation}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Catégorie</Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {event.category === 'combat' ? 'Combat' :
                 event.category === 'endurance' ? 'Endurance' :
                 event.category === 'force' ? 'Force' :
                 event.category === 'nature' ? 'Nature' : 'Autre'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Section */}
        <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={categoryColor} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Conseils pratiques
            </Text>
          </View>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <View style={[styles.tipBullet, { backgroundColor: categoryColor }]} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {tip}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bouton d'inscription fixe */}
      {event.registration_link && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.registerButton, { backgroundColor: categoryColor }]}
            onPress={handleOpenLink}
            activeOpacity={0.8}
          >
            <ExternalLink size={20} color="#FFFFFF" />
            <Text style={styles.registerButtonText}>S'inscrire sur le site officiel</Text>
          </TouchableOpacity>
          <Text style={[styles.linkHint, { color: colors.textMuted }]}>
            {event.registration_link.replace('https://', '').replace('http://', '').split('/')[0]}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    right: -40,
    top: -20,
    opacity: 1,
  },
  headerPatternSecondary: {
    position: 'absolute',
    left: -30,
    bottom: 20,
    opacity: 1,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoContainer: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    zIndex: 10,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  eventLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportBadge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sportBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 32,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: SPACING.lg,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickInfoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  quickInfoText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: SPACING.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  linkHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
