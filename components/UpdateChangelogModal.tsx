// ============================================
// ÉCRAN DE MISE À JOUR / CHANGELOG - PLEIN ÉCRAN
// Affiche les nouveautés après chaque mise à jour
// ============================================

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sparkles,
  Heart,
  Star,
  Instagram,
  ExternalLink,
  Check,
  TrendingUp,
  Trash2,
  BarChart3,
  Moon,
  Lock,
  Zap,
  Globe,
  Palette,
  Watch,
  CalendarDays,
  Bell,
  Scale,
  Activity,
} from 'lucide-react-native';
import { safeOpenURL } from '@/lib/security/validators';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UpdateChangelogModalProps {
  visible: boolean;
  onClose: () => void;
}

const CHANGELOG_ITEMS = [
  {
    icon: Globe,
    color: '#3B82F6',
    title: '9 Langues disponibles',
    description: 'Français, Anglais, Espagnol, Portugais, Allemand, Italien, Russe, Arabe et Chinois',
  },
  {
    icon: Palette,
    color: '#EC4899',
    title: '15 Thèmes Premium',
    description: 'Une personnalisation totale avec de nouveaux thèmes exclusifs (Blaze, Phantom, Ghost, Ocean, etc.)',
  },
  {
    icon: Zap,
    color: '#F59E0B',
    title: 'Dynamic Island',
    description: 'Ton timer de combat ou de muscu s\'affiche en haut de l\'écran, même hors de l\'app',
  },
  {
    icon: Watch,
    color: '#3B82F6',
    title: 'Apple Watch Total Sync',
    description: 'Application Apple Watch fonctionnelle avec suivi en temps réel de tes records',
  },
  {
    icon: Activity,
    color: '#8B5CF6',
    title: 'Human Battery',
    description: 'Ton score d\'énergie calculé intelligemment pour savoir si tu es prêt à t\'entraîner',
  },
  {
    icon: BarChart3,
    color: '#10B981',
    title: 'Graphiques interactifs',
    description: 'Graphiques scrollables et cliquables avec navigation directe',
  },
  {
    icon: TrendingUp,
    color: '#06B6D4',
    title: 'Sélecteur de période',
    description: 'Analyse tes stats sur 7j, 30j, 90j, 6 mois ou 1 an',
  },
  {
    icon: Bell,
    color: '#EF4444',
    title: 'Notifications corrigées',
    description: 'Plus de spam ! Tu contrôles tes rappels dans les réglages',
  },
  {
    icon: Scale,
    color: '#F97316',
    title: '6 Onglets de stats',
    description: 'Poids, composition, mensurations, discipline, performance et vitalité',
  },
  {
    icon: CalendarDays,
    color: '#0ABAB5',
    title: 'Planning & Carnet',
    description: 'Calendrier interactif et carnet d\'entraînement avec records',
  },
  {
    icon: Trash2,
    color: '#DC2626',
    title: 'Système de corbeille',
    description: 'Restaure tes records et techniques supprimés par erreur',
  },
  {
    icon: Moon,
    color: '#6366F1',
    title: 'Mode clair/sombre',
    description: 'Bascule entre mode clair et sombre selon ta préférence',
  },
  {
    icon: Lock,
    color: '#14B8A6',
    title: '100% Hors ligne & Privé',
    description: 'Tes données restent sur ton téléphone, pas de cloud ni de tracking',
  },
];

export const UpdateChangelogModal: React.FC<UpdateChangelogModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleRateApp = () => {
    safeOpenURL('https://apps.apple.com/us/app/yoroi-suivi-poids-sport/id6757306612');
  };

  const handleInstagram = () => {
    safeOpenURL('https://instagram.com/yoroiapp');
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo et Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/logo2010.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { color: colors.textPrimary }]}>YOROI</Text>
            <View style={[styles.versionBadge, { backgroundColor: colors.accent + '20' }]}>
              <Text style={[styles.versionText, { color: isDark ? colors.accent : colors.textPrimary }]}>Version 2.0.0</Text>
            </View>
          </View>

          {/* Titre principal */}
          <View style={styles.titleSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
              <Sparkles size={48} color={colors.accentText} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Mise à jour majeure
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Design V2 : Tout a été repensé pour toi
            </Text>
          </View>

          {/* Message personnel d'excuse */}
          <View style={[styles.messageBox, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Heart size={24} color="#EF4444" style={{ marginBottom: 16 }} />
            <Text style={[styles.messageTitle, { color: colors.textPrimary }]}>
              Salut la famille Yoroi !
            </Text>
            <Text style={[styles.messageText, { color: colors.textSecondary }]}>
              Je m'excuse d'abord pour les soucis que tu as peut-être rencontrés récemment, notamment avec les notifications en pagaille.{'\n\n'}
              J'ai fait un gros travail sur l'app pour l'améliorer. Je suis seul sur ce projet et je fais de mon mieux pour te proposer la meilleure expérience possible.{'\n\n'}
              Si tu vois une erreur, même minime, je suis dispo sur{' '}
              <Text style={{ fontWeight: '800', color: isDark ? colors.accent : colors.textPrimary }}>@Yoroiapp</Text>
              {' '}ou dans la boîte à idées dans le menu.
            </Text>
          </View>

          {/* Liste des nouveautés */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Toutes les nouveautés
            </Text>
            {CHANGELOG_ITEMS.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <View
                  key={index}
                  style={[
                    styles.changeItem,
                    { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.changeIcon, { backgroundColor: item.color + '20' }]}>
                    <IconComponent size={22} color={item.color} />
                  </View>
                  <View style={styles.changeContent}>
                    <Text style={[styles.changeTitle, { color: colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.changeDescription, { color: colors.textMuted }]}>
                      {item.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Call to action */}
          <View style={[styles.ctaBox, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
            <Text style={[styles.ctaTitle, { color: isDark ? colors.accent : colors.textPrimary }]}>
              Aide-moi à faire grandir Yoroi
            </Text>
            <Text style={[styles.ctaText, { color: colors.textMuted }]}>
              Partage l'app à ceux qui pourraient en avoir besoin et laisse une note sur l'App Store.
              Ça m'aide énormément à progresser et à faire connaître notre famille Yoroi.
            </Text>
          </View>

          {/* Boutons d'action */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={handleRateApp}
              activeOpacity={0.8}
            >
              <Star size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Noter l'app</Text>
              <ExternalLink size={16} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#E1306C' }]}
              onPress={handleInstagram}
              activeOpacity={0.8}
            >
              <Instagram size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>@Yoroiapp</Text>
              <ExternalLink size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bouton C'est parti en bas fixe */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.accent }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Check size={22} color="#FFFFFF" />
            <Text style={styles.continueButtonText}>C'est parti !</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  messageBox: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 32,
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 14,
  },
  changeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeContent: {
    flex: 1,
  },
  changeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  changeDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  ctaBox: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 24,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  actions: {
    gap: 14,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
