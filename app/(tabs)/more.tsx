import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Camera,
  Settings,
  MessageCircle,
  Star,
  ChevronRight,
  Building2,
  Ruler,
  Download,
  Upload,
  Lock,
  Share2,
  FileText,
  LucideIcon,
  Utensils,
  Timer,
  Calculator,
  Apple,
  Lightbulb,
  Activity,
  BookOpen,
  Palette,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Crown,
  Trophy,
  Target,
  FlaskConical,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON, exportDataToCSV } from '@/lib/exportService';
import { importAllData } from '@/lib/exportService';
import { generateProgressPDF } from '@/lib/pdfExport';

// ============================================
// ECRAN PLUS - DESIGN MODERNE
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuickAction {
  id: string;
  label: string;
  Icon: LucideIcon;
  route?: string;
  onPress?: () => void;
  gradient: readonly [string, string, ...string[]];
}

interface MenuItem {
  id: string;
  label: string;
  sublabel?: string;
  Icon: LucideIcon;
  route?: string;
  onPress?: () => void;
  iconColor?: string;
  iconBg?: string;
}

// ============================================
// ACTIONS RAPIDES (Grille en haut)
// ============================================
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'infirmary',
    label: 'Infirmerie',
    Icon: Activity,
    route: '/infirmary',
    gradient: ['#FF6B6B', '#EE5A5A'],
  },
  {
    id: 'timer',
    label: 'Timer',
    Icon: Timer,
    route: '/timer',
    gradient: ['#4ECDC4', '#3DBDB5'],
  },
  {
    id: 'calculator',
    label: 'Calculateurs',
    Icon: Calculator,
    route: '/calculators',
    gradient: ['#A855F7', '#9333EA'],
  },
  {
    id: 'fasting',
    label: 'Jeûne',
    Icon: Utensils,
    route: '/fasting',
    gradient: ['#F59E0B', '#D97706'],
  },
];

// ============================================
// SECTION PROFIL & APPARENCE
// ============================================
const PROFILE_ITEMS: MenuItem[] = [
  {
    id: 'profile',
    label: 'Mon Profil',
    sublabel: 'Statistiques et progression',
    Icon: User,
    route: '/profile',
    iconColor: '#60A5FA',
    iconBg: '#60A5FA20',
  },
  {
    id: 'photos',
    label: 'Transformation',
    sublabel: 'Photos avant/après',
    Icon: Camera,
    route: '/photos',
    iconColor: '#F472B6',
    iconBg: '#F472B620',
  },
  {
    id: 'appearance',
    label: 'Apparence',
    sublabel: 'Thèmes et personnalisation',
    Icon: Palette,
    route: '/appearance',
    iconColor: '#A78BFA',
    iconBg: '#A78BFA20',
  },
  {
    id: 'avatars',
    label: 'Avatars',
    sublabel: 'Débloque des guerriers',
    Icon: Sparkles,
    route: '/avatar-gallery',
    iconColor: '#FBBF24',
    iconBg: '#FBBF2420',
  },
];

// ============================================
// SECTION OUTILS
// ============================================
const TOOLS_ITEMS: MenuItem[] = [
  {
    id: 'measurements',
    label: 'Mensurations',
    sublabel: 'Suivi corporel détaillé',
    Icon: Ruler,
    route: '/entry',
    iconColor: '#34D399',
    iconBg: '#34D39920',
  },
  {
    id: 'lab',
    label: 'LABO',
    sublabel: 'Articles & protocoles scientifiques',
    Icon: FlaskConical,
    route: '/lab',
    iconColor: '#3B82F6',
    iconBg: '#3B82F620',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    sublabel: 'Plan alimentaire',
    Icon: Apple,
    route: '/nutrition-plan',
    iconColor: '#FB7185',
    iconBg: '#FB718520',
  },
  {
    id: 'share',
    label: 'Partager',
    sublabel: 'Stories et réseaux sociaux',
    Icon: Share2,
    route: '/social-card',
    iconColor: '#38BDF8',
    iconBg: '#38BDF820',
  },
  {
    id: 'ideas',
    label: 'Suggestions',
    sublabel: 'Proposer des idées',
    Icon: Lightbulb,
    route: '/ideas',
    iconColor: '#FCD34D',
    iconBg: '#FCD34D20',
  },
];

// ============================================
// SECTION COMMUNAUTÉ
// ============================================
const COMMUNITY_ITEMS: MenuItem[] = [
  {
    id: 'clubs',
    label: 'Clubs & Coach',
    sublabel: 'Partenaires et salles',
    Icon: Building2,
    route: '/partners',
    iconColor: '#818CF8',
    iconBg: '#818CF820',
  },
  {
    id: 'health-pros',
    label: 'Pros de Santé',
    sublabel: 'Kinés, nutritionnistes',
    Icon: Heart,
    route: '/health-professionals',
    iconColor: '#F87171',
    iconBg: '#F8717120',
  },
  {
    id: 'savoir',
    label: 'Base de Savoir',
    sublabel: 'Articles et conseils',
    Icon: BookOpen,
    route: '/savoir',
    iconColor: '#22D3EE',
    iconBg: '#22D3EE20',
  },
];

// ============================================
// SECTION PARAMÈTRES
// ============================================
const SETTINGS_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    label: 'Réglages',
    sublabel: 'Notifications, unités, thème',
    Icon: Settings,
    route: '/settings',
    iconColor: '#94A3B8',
    iconBg: '#94A3B820',
  },
  {
    id: 'exportPdf',
    label: 'Rapport PDF',
    sublabel: 'Pour médecin ou coach',
    Icon: FileText,
    onPress: () => {},
    iconColor: '#F97316',
    iconBg: '#F9731620',
  },
  {
    id: 'export',
    label: 'Exporter',
    sublabel: 'Sauvegarder tes données',
    Icon: Download,
    onPress: () => {},
    iconColor: '#10B981',
    iconBg: '#10B98120',
  },
  {
    id: 'import',
    label: 'Importer',
    sublabel: 'Restaurer un backup',
    Icon: Upload,
    onPress: () => {},
    iconColor: '#6366F1',
    iconBg: '#6366F120',
  },
];

// ============================================
// SECTION SUPPORT
// ============================================
const SUPPORT_ITEMS: MenuItem[] = [
  {
    id: 'rate',
    label: "Noter l'App",
    sublabel: 'Laisse un avis sur l\'App Store',
    Icon: Star,
    onPress: () => {},
    iconColor: '#FBBF24',
    iconBg: '#FBBF2420',
  },
  {
    id: 'contact',
    label: 'Contact',
    sublabel: 'Questions ou suggestions',
    Icon: MessageCircle,
    onPress: () => {},
    iconColor: '#14B8A6',
    iconBg: '#14B8A620',
  },
];

export default function MoreScreen() {
  const { colors, isDark } = useTheme();

  const handleExport = async () => {
    Alert.alert(
      'Exporter mes données',
      'Choisis le format d\'export',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'JSON (complet)', onPress: () => exportDataToJSON() },
        { text: 'CSV (tableur)', onPress: () => exportDataToCSV() },
      ]
    );
  };

  const handleImport = async () => {
    Alert.alert(
      'Importer des données',
      'Cette action remplacera tes données actuelles.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Choisir un fichier',
          onPress: async () => {
            try {
              await importAllData(async (data) => {
                console.log('Data to import:', data);
              });
            } catch (e) {
              console.log('Import error:', e);
            }
          }
        },
      ]
    );
  };

  const handleRate = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        Alert.alert('Merci !', 'Tu peux nous noter sur l\'App Store');
      }
    } catch (e) {
      console.log('Rate error:', e);
    }
  };

  const handleContact = () => {
    Linking.openURL('mailto:contact@yoroi-app.com?subject=Contact%20Yoroi');
  };

  const handleExportPDF = async () => {
    Alert.alert(
      'Rapport PDF',
      'Choisis la période du rapport',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: '30 derniers jours',
          onPress: async () => {
            try {
              await generateProgressPDF('30j');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de générer le PDF');
            }
          }
        },
        {
          text: '90 derniers jours',
          onPress: async () => {
            try {
              await generateProgressPDF('90j');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de générer le PDF');
            }
          }
        },
      ]
    );
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.route) {
      router.push(action.route as any);
    } else if (action.onPress) {
      action.onPress();
    }
  };

  const handleMenuItem = (item: MenuItem) => {
    if (item.id === 'export') {
      handleExport();
      return;
    }
    if (item.id === 'import') {
      handleImport();
      return;
    }
    if (item.id === 'rate') {
      handleRate();
      return;
    }
    if (item.id === 'contact') {
      handleContact();
      return;
    }
    if (item.id === 'exportPdf') {
      handleExportPDF();
      return;
    }

    if (item.route) {
      router.push(item.route as any);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  // Rendu d'une action rapide (grille)
  const renderQuickAction = (action: QuickAction) => {
    const IconComponent = action.Icon;
    return (
      <TouchableOpacity
        key={action.id}
        style={styles.quickActionContainer}
        onPress={() => handleQuickAction(action)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={action.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickActionGradient}
        >
          <IconComponent size={26} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.quickActionLabel}>{action.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Rendu d'un item de menu
  const renderMenuItem = (item: MenuItem) => {
    const IconComponent = item.Icon;
    const iconColor = item.iconColor || colors.textSecondary;
    const iconBg = item.iconBg || colors.cardHover;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, { backgroundColor: colors.card }]}
        onPress={() => handleMenuItem(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: iconBg }]}>
          <IconComponent size={20} color={iconColor} strokeWidth={2} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
          {item.sublabel && (
            <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>{item.sublabel}</Text>
          )}
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  // Rendu d'une section
  const renderSection = (title: string, items: MenuItem[]) => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.map((item, index) => (
          <View key={item.id}>
            {renderMenuItem(item)}
            {index < items.length - 1 && (
              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenWrapper noPadding>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Plus</Text>
            <View style={[styles.versionBadge, { backgroundColor: colors.cardHover }]}>
              <Text style={[styles.versionText, { color: colors.textMuted }]}>v1.0.0</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Outils et paramètres
          </Text>
        </View>

        {/* QUICK ACTIONS GRID */}
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map(renderQuickAction)}
        </View>

        {/* SECTIONS */}
        {renderSection('PROFIL & APPARENCE', PROFILE_ITEMS)}
        {renderSection('OUTILS', TOOLS_ITEMS)}
        {renderSection('COMMUNAUTÉ', COMMUNITY_ITEMS)}
        {renderSection('PARAMÈTRES', SETTINGS_ITEMS)}
        {renderSection('SUPPORT', SUPPORT_ITEMS)}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={[styles.privacyCard, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
            <View style={styles.privacyIconContainer}>
              <Shield size={20} color={isDark ? '#4ADE80' : '#16A34A'} />
            </View>
            <View style={styles.privacyContent}>
              <Text style={[styles.privacyTitle, { color: isDark ? '#4ADE80' : '#16A34A' }]}>
                100% Privé
              </Text>
              <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                Tes données restent uniquement sur ton téléphone
              </Text>
            </View>
          </View>

          <Text style={[styles.madeWith, { color: colors.textMuted }]}>
            Made with ❤️ in France
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const QUICK_ACTION_SIZE = (SCREEN_WIDTH - 60) / 4;

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  // QUICK ACTIONS
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  quickActionContainer: {
    width: QUICK_ACTION_SIZE,
    height: QUICK_ACTION_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  quickActionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  // SECTIONS
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },

  // MENU ITEM
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    marginLeft: 68,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
    gap: 14,
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  privacyText: {
    fontSize: 12,
    marginTop: 2,
  },
  madeWith: {
    fontSize: 13,
    fontWeight: '500',
  },
});
