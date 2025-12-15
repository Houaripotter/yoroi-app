import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import {
  User,
  Camera,
  Calendar,
  Dumbbell,
  BookOpen,
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
  LucideIcon,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON, exportDataToCSV } from '@/lib/exportService';
import { importAllData } from '@/lib/exportService';

// ============================================
// ECRAN PLUS - MENU GUERRIER
// ============================================

interface MenuItem {
  id: string;
  label: string;
  sublabel?: string;
  Icon: LucideIcon;
  route?: string;
  onPress?: () => void;
  isGold?: boolean;
  isComingSoon?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'profile',
    label: 'Mon Profil Guerrier',
    sublabel: 'Rangs, badges et statistiques',
    Icon: User,
    route: '/profile',
    isGold: true,
  },
  {
    id: 'photos',
    label: 'Ma Transformation',
    sublabel: 'Photos avant/après',
    Icon: Camera,
    route: '/photos',
    isGold: true,
  },
  {
    id: 'share',
    label: 'Partager ma progression',
    sublabel: 'Instagram, Snapchat, Stories',
    Icon: Share2,
    isGold: true,
    isComingSoon: true,
  },
  {
    id: 'measurements',
    label: 'Mensurations',
    sublabel: 'Suivi de tes mesures',
    Icon: Ruler,
    route: '/add-measurement',
    isGold: true,
  },
  {
    id: 'clubs',
    label: 'Mes Clubs',
    sublabel: 'Salles et clubs de sport',
    Icon: Building2,
    route: '/clubs',
    isGold: true,
  },
  {
    id: 'savoir',
    label: 'Savoir (Labo)',
    sublabel: 'Base de connaissances',
    Icon: BookOpen,
    route: '/savoir',
    isGold: true,
  },
];

const SETTINGS_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    label: 'Reglages',
    Icon: Settings,
    route: '/settings',
    isGold: false,
  },
  {
    id: 'export',
    label: 'Exporter mes donnees',
    Icon: Download,
    onPress: () => {},
    isGold: false,
  },
  {
    id: 'import',
    label: 'Importer des donnees',
    Icon: Upload,
    onPress: () => {},
    isGold: false,
  },
  {
    id: 'rate',
    label: "Noter l'App",
    Icon: Star,
    onPress: () => {},
    isGold: false,
  },
  {
    id: 'contact',
    label: 'Nous Contacter',
    Icon: MessageCircle,
    onPress: () => {},
    isGold: false,
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();

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
      'Cette action remplacera tes données actuelles. Assure-toi d\'avoir un export JSON valide.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Choisir un fichier',
          onPress: async () => {
            try {
              await importAllData(async (data) => {
                // Ici on importerait les données - pour l'instant juste un log
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
        // Fallback vers l'App Store
        Alert.alert('Merci !', 'Tu peux nous noter sur l\'App Store');
      }
    } catch (e) {
      console.log('Rate error:', e);
    }
  };

  const handleContact = () => {
    Linking.openURL('mailto:contact@yoroi-app.com?subject=Contact%20Yoroi');
  };

  const handlePress = (item: MenuItem) => {
    // Gestion des items "coming soon"
    if (item.isComingSoon) {
      Alert.alert(
        '📲 Bientôt disponible !',
        'Le partage Instagram/Snapchat arrive très bientôt. Stay tuned Guerrier !',
        [{ text: 'OK 💪' }]
      );
      return;
    }

    // Gestion spéciale pour certains items
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

    if (item.route) {
      router.push(item.route as any);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const iconColor = item.isGold ? colors.gold : colors.textSecondary;
    const IconComponent = item.Icon;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.menuItemIcon, { backgroundColor: item.isGold ? colors.goldMuted : colors.cardHover }]}>
          <IconComponent size={22} color={iconColor} />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
          {item.sublabel && (
            <Text style={[styles.menuItemSublabel, { color: colors.textSecondary }]}>{item.sublabel}</Text>
          )}
        </View>
        {item.isComingSoon ? (
          <View style={[styles.comingSoonBadge, { backgroundColor: colors.goldMuted }]}>
            <Text style={[styles.comingSoonText, { color: colors.gold }]}>Bientôt</Text>
          </View>
        ) : (
          <ChevronRight size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper noPadding>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Plus</Text>
        </View>

        {/* MENU PRINCIPAL */}
        <View style={styles.section}>
          {MENU_ITEMS.map(renderMenuItem)}
        </View>

        {/* SEPARATOR */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* SETTINGS */}
        <View style={styles.section}>
          {SETTINGS_ITEMS.map(renderMenuItem)}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors.textMuted }]}>Version 1.0.0</Text>
          <Text style={[styles.madeWith, { color: colors.textMuted }]}>Made with in France</Text>
          <View style={[styles.privacyBadge, { backgroundColor: colors.successMuted }]}>
            <Lock size={14} color={colors.success} />
            <Text style={[styles.privacyText, { color: colors.success }]}>
              Tes donnees restent sur TON telephone
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// Constantes non-thématiques
const RADIUS = { lg: 16, full: 9999 };

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
  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  // SECTION
  section: {
    gap: 4,
  },

  // MENU ITEM
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 16,
    borderWidth: 1,
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemSublabel: {
    fontSize: 13,
    marginTop: 2,
  },

  // SEPARATOR
  separator: {
    height: 1,
    marginVertical: 24,
  },

  // FOOTER
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  version: {
    fontSize: 13,
  },
  madeWith: {
    fontSize: 13,
    marginTop: 4,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
