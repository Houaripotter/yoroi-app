import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  LayoutDashboard,
  Sliders,
  Info,
  Scale,
  X,
  Swords,
  Droplet,
  TrendingDown,
  Calendar,
  Award,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON, exportDataToCSV, exportTrainingsToCSV, exportTrainingsToExcelCSV } from '@/lib/exportService';
import { scale, scaleModerate } from '@/constants/responsive';
import { importAllData } from '@/lib/exportService';
import { generateProgressPDF } from '@/lib/pdfExport';
import { getWeightCategoriesBySportAndGender, WeightCategory, sportHasWeightCategories } from '@/lib/weightCategories';
import { UserMode, Sport, SPORT_LABELS } from '@/lib/fighterMode';
import { getUserMode, setUserMode as saveUserMode } from '@/lib/fighterModeService';

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
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    id: 'fasting',
    label: 'Jeûne',
    Icon: Utensils,
    route: '/fasting',
    gradient: ['#A855F7', '#9333EA'],
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
    id: 'customize-home',
    label: 'Personnaliser l\'Accueil',
    sublabel: 'Ordre et visibilité des sections',
    Icon: LayoutDashboard,
    route: '/customize-home',
    iconColor: '#10B981',
    iconBg: '#10B98120',
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
    id: 'training-journal',
    label: 'Carnet d\'Entraînement',
    sublabel: 'Suivi techniques et objectifs',
    Icon: BookOpen,
    route: '/training-journal',
    iconColor: '#F97316',
    iconBg: '#F9731620',
  },
  {
    id: 'lab',
    label: 'Savoir',
    sublabel: 'Dormir moins bête · Peer-reviewed',
    Icon: FlaskConical,
    route: '/lab',
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    sublabel: 'Plan personnalisé',
    Icon: Apple,
    route: '/nutrition-plan',
    iconColor: '#10B981',
    iconBg: '#10B98120',
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
];

// ============================================
// SECTION PARAMÈTRES
// ============================================
const SETTINGS_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    label: 'Réglages',
    sublabel: 'Notifications, rappels, thème',
    Icon: Settings,
    route: '/settings',
    iconColor: '#94A3B8',
    iconBg: '#94A3B820',
  },
  {
    id: 'preferences',
    label: 'Préférences',
    sublabel: 'Unités de poids et mesures',
    Icon: Sliders,
    route: '/preferences',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
  },
  {
    id: 'tutorial',
    label: 'Revoir le Tutoriel',
    sublabel: 'Découvre toutes les fonctionnalités',
    Icon: Info,
    onPress: () => {},
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
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
    id: 'ideas',
    label: 'Boîte à idées',
    sublabel: 'Proposer des idées et signaler des bugs',
    Icon: Lightbulb,
    route: '/ideas',
    iconColor: '#FCD34D',
    iconBg: '#FCD34D20',
  },
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

  // Mode Compétiteur state
  const [userModeSetting, setUserModeSetting] = useState<UserMode>('loisir');
  const [userSports, setUserSports] = useState<Sport[]>([]);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [selectedWeightCategory, setSelectedWeightCategory] = useState<WeightCategory | null>(null);
  const [sportsModalVisible, setSportsModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Load user settings on mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
      if (settingsStr) {
        const settings = JSON.parse(settingsStr);
        setUserModeSetting(settings.userMode || 'loisir');
        setUserSports(settings.userSports || []);
        setUserGender(settings.userGender || 'male');
        if (settings.selectedWeightCategory) {
          setSelectedWeightCategory(settings.selectedWeightCategory);
        }
      }

      // Load mode from fighterModeService as well
      const mode = await getUserMode();
      setUserModeSetting(mode);
    } catch (error) {
      console.error('[MoreScreen] Error loading settings:', error);
    }
  };

  const saveUserSettings = async (updates: any) => {
    try {
      const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const newSettings = { ...settings, ...updates };
      await AsyncStorage.setItem('@yoroi_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('[MoreScreen] Error saving settings:', error);
    }
  };

  const handleChangeUserMode = async (newMode: UserMode) => {
    // Si on désactive le mode compétiteur, demander confirmation
    if (newMode === 'loisir' && userModeSetting === 'competiteur') {
      Alert.alert(
        'Désactiver le Mode Compétiteur ?',
        'Êtes-vous sûr de vouloir revenir au Mode Loisir ? Vos sports et catégorie de poids seront conservés.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            style: 'destructive',
            onPress: async () => {
              try {
                await saveUserMode(newMode);
                await saveUserSettings({ userMode: newMode });
                setUserModeSetting(newMode);
                Alert.alert('Mode changé', 'Vous êtes maintenant en Mode Loisir');
              } catch (error) {
                console.error('[MoreScreen] Error changing mode:', error);
                Alert.alert('Erreur', 'Impossible de changer le mode');
              }
            },
          },
        ]
      );
    } else {
      // Activation du mode compétiteur sans confirmation
      try {
        await saveUserMode(newMode);
        await saveUserSettings({ userMode: newMode });
        setUserModeSetting(newMode);
        if (newMode === 'competiteur') {
          Alert.alert(
            'Mode Compétiteur activé',
            'Configurez vos sports et votre catégorie de poids ci-dessous'
          );
        }
      } catch (error) {
        console.error('[MoreScreen] Error changing mode:', error);
        Alert.alert('Erreur', 'Impossible de changer le mode');
      }
    }
  };

  const handleShowTutorial = async () => {
    Alert.alert(
      'Tutoriel',
      'La fonctionnalité de tutoriel sera bientôt disponible.',
      [{ text: 'OK' }]
    );
  };

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
    if (item.id === 'tutorial') {
      handleShowTutorial();
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

        {/* MODE UTILISATEUR */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>MODE</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => handleChangeUserMode(userModeSetting === 'loisir' ? 'competiteur' : 'loisir')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.menuItemIcon,
                { backgroundColor: userModeSetting === 'competiteur' ? '#FF6B6B20' : '#4ECDC420' }
              ]}>
                {userModeSetting === 'competiteur' ? (
                  <Swords size={20} color="#FF6B6B" strokeWidth={2} />
                ) : (
                  <Heart size={20} color="#4ECDC4" strokeWidth={2} />
                )}
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                  {userModeSetting === 'competiteur' ? 'Mode Compétiteur' : 'Mode Loisir'}
                </Text>
                <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                  {userModeSetting === 'competiteur'
                    ? 'Compétitions, palmarès, catégories'
                    : 'Bien-être et progression personnelle'}
                </Text>
              </View>
              <Switch
                value={userModeSetting === 'competiteur'}
                onValueChange={(value) => handleChangeUserMode(value ? 'competiteur' : 'loisir')}
                trackColor={{ false: colors.border, true: '#FF6B6B' }}
                thumbColor={'#fff'}
                ios_backgroundColor={colors.border}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* MODE COMPÉTITEUR - PROFIL */}
        {userModeSetting === 'competiteur' && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PROFIL COMPÉTITEUR</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

              {/* Catégorie de poids */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => setCategoryModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: colors.gold + '20' }]}>
                  <Scale size={20} color={colors.gold} strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Catégorie de poids
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {selectedWeightCategory
                      ? `${selectedWeightCategory.name} (${selectedWeightCategory.maxWeight}kg)`
                      : 'Non défini'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Sports pratiqués */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => setSportsModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#FF6B6B20' }]}>
                  <Trophy size={20} color="#FF6B6B" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Mes sports
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    {userSports.length > 0
                      ? userSports.map(s => SPORT_LABELS[s]).join(', ')
                      : 'Aucun sport défini'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* MODE COMPÉTITEUR - OUTILS */}
        {userModeSetting === 'competiteur' && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>OUTILS COMPÉTITION</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

              {/* Compétitions */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/competitions')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Calendar size={20} color="#8B5CF6" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Compétitions
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    Gérer mes compétitions à venir
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Palmarès */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/palmares')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Award size={20} color="#F59E0B" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Palmarès
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    Mes combats et statistiques
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Mode Cut */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/weight-cut')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#EF444420' }]}>
                  <TrendingDown size={20} color="#EF4444" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Mode Cut
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    Gestion du poids pour la pesée
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

              {/* Hydratation */}
              <TouchableOpacity
                style={[styles.menuItem, { backgroundColor: colors.card }]}
                onPress={() => router.push('/hydration')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#06B6D420' }]}>
                  <Droplet size={20} color="#06B6D4" strokeWidth={2} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                    Hydratation
                  </Text>
                  <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                    Suivi de l'hydratation quotidienne
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

            </View>
          </View>
        )}

        {/* BIENTÔT DISPONIBLE */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BIENTÔT DISPONIBLE</Text>
          <View style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.comingSoonContent}>
              <Zap size={24} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
                  Nouvelles fonctionnalités à venir
                </Text>
                <Text style={[styles.comingSoonDesc, { color: colors.textSecondary }]}>
                  Mode Siri, Apple Watch, partage avec coach...
                </Text>
              </View>
            </View>
          </View>
        </View>

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

          <View style={[styles.madeWith, { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }]}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>Made with</Text>
            <Heart size={14} color="#EF4444" fill="#EF4444" />
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '500' }}>in France</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal - Sports Selection */}
      <Modal
        visible={sportsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSportsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Mes sports de compétition
              </Text>
              <TouchableOpacity onPress={() => setSportsModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {Object.entries(SPORT_LABELS).map(([key, label]) => {
                const isSelected = userSports.includes(key as Sport);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.sportOption,
                      {
                        backgroundColor: isSelected ? colors.accent + '20' : colors.backgroundElevated,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      const newSports = isSelected
                        ? userSports.filter(s => s !== key)
                        : [...userSports, key as Sport];
                      setUserSports(newSports);
                    }}
                  >
                    <Text style={[styles.sportOptionText, { color: colors.textPrimary }]}>
                      {label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.checkmark, { backgroundColor: colors.accent }]}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={async () => {
                await saveUserSettings({ userSports });
                setSportsModalVisible(false);
                Alert.alert('Enregistré', `${userSports.length} sport(s) sélectionné(s)`);
              }}
            >
              <Text style={styles.modalButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal - Weight Category Selection */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Ma catégorie de poids
              </Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Sport Selection Hint */}
              {userSports.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: colors.backgroundElevated }]}>
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Sélectionne d'abord un sport de compétition
                  </Text>
                </View>
              ) : (
                <>
                  {/* Sport Selector */}
                  {userSports.length > 1 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                        SPORT
                      </Text>
                      <View style={styles.sportSelector}>
                        {userSports.map(sport => (
                          <TouchableOpacity
                            key={sport}
                            style={[
                              styles.sportChip,
                              {
                                backgroundColor: colors.backgroundElevated,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text style={[styles.sportChipText, { color: colors.textPrimary }]}>
                              {SPORT_LABELS[sport]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Gender Selector */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                      GENRE
                    </Text>
                    <View style={styles.genderSelector}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          {
                            backgroundColor: userGender === 'male' ? colors.accent : colors.backgroundElevated,
                            borderColor: userGender === 'male' ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setUserGender('male')}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            { color: userGender === 'male' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Homme
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          {
                            backgroundColor: userGender === 'female' ? colors.accent : colors.backgroundElevated,
                            borderColor: userGender === 'female' ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setUserGender('female')}
                      >
                        <Text
                          style={[
                            styles.genderButtonText,
                            { color: userGender === 'female' ? '#fff' : colors.textPrimary },
                          ]}
                        >
                          Femme
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Weight Categories */}
                  <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                    CATÉGORIES
                  </Text>
                  {userSports.map(sport => {
                    if (!sportHasWeightCategories(sport)) return null;
                    const categories = getWeightCategoriesBySportAndGender(sport, userGender);

                    return (
                      <View key={sport} style={{ marginBottom: 12 }}>
                        {userSports.length > 1 && (
                          <Text style={[styles.sportSubheader, { color: colors.textSecondary }]}>
                            {SPORT_LABELS[sport]}
                          </Text>
                        )}
                        {categories.map(category => {
                          const isSelected = selectedWeightCategory?.id === category.id;
                          return (
                            <TouchableOpacity
                              key={category.id}
                              style={[
                                styles.categoryOption,
                                {
                                  backgroundColor: isSelected ? colors.gold + '20' : colors.backgroundElevated,
                                  borderColor: isSelected ? colors.gold : colors.border,
                                },
                              ]}
                              onPress={() => setSelectedWeightCategory(category)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                                  {category.name}
                                </Text>
                                <Text style={[styles.categoryWeight, { color: colors.textMuted }]}>
                                  {category.minWeight > 0 && `${category.minWeight}kg - `}
                                  {category.maxWeight < 999 ? `${category.maxWeight}kg` : '+'}
                                </Text>
                              </View>
                              {isSelected && (
                                <View style={[styles.checkmark, { backgroundColor: colors.gold }]}>
                                  <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: selectedWeightCategory ? colors.gold : colors.backgroundElevated,
                  opacity: selectedWeightCategory ? 1 : 0.5,
                },
              ]}
              onPress={async () => {
                if (selectedWeightCategory) {
                  await saveUserSettings({ selectedWeightCategory, userGender });
                  setCategoryModalVisible(false);
                  Alert.alert('Enregistré', `Catégorie: ${selectedWeightCategory.name}`);
                }
              }}
              disabled={!selectedWeightCategory}
            >
              <Text style={styles.modalButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  // BIENTÔT DISPONIBLE
  comingSoonCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  comingSoonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  comingSoonDesc: {
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: scaleModerate(14, 0.3),
    fontWeight: '700',
  },
  privacyText: {
    fontSize: 12,
    marginTop: 2,
  },
  madeWith: {
    // View style - text styles applied inline
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  modalButton: {
    margin: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: scaleModerate(16, 0.3),
    fontWeight: '700',
  },

  // Sports Options
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  sportOptionText: {
    fontSize: scaleModerate(16, 0.3),
    fontWeight: '600',
  },

  // Weight Categories
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sportSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportSubheader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  categoryWeight: {
    fontSize: 13,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
