import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Swords,
  Calendar,
  Award,
  TrendingDown,
  Droplet,
  Trophy,
  Target,
  Scale,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// ESPACE COMPÉTITEUR - Page dédiée
// ============================================

interface MenuItem {
  id: string;
  label: string;
  sublabel: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  route: string;
}

const COMPETITOR_ITEMS: MenuItem[] = [
  {
    id: 'profile',
    label: 'Profil Compétiteur',
    sublabel: 'Catégorie, ceinture, sport',
    icon: Swords,
    iconColor: '#8B5CF6',
    iconBg: '#8B5CF620',
    route: '/competitor-profile',
  },
  {
    id: 'competitions',
    label: 'Compétitions',
    sublabel: 'Gérer mes compétitions à venir',
    icon: Calendar,
    iconColor: '#06B6D4',
    iconBg: '#06B6D420',
    route: '/competitions',
  },
  {
    id: 'palmares',
    label: 'Palmarès',
    sublabel: 'Mes combats et statistiques',
    icon: Award,
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
    route: '/palmares',
  },
  {
    id: 'cut',
    label: 'Mode Cut',
    sublabel: 'Gestion du poids pour la pesée',
    icon: TrendingDown,
    iconColor: '#EF4444',
    iconBg: '#EF444420',
    route: '/cut-mode',
  },
  {
    id: 'hydration',
    label: 'Hydratation Cut',
    sublabel: 'Protocole hydratation compétition',
    icon: Droplet,
    iconColor: '#3B82F6',
    iconBg: '#3B82F620',
    route: '/hydration',
  },
];

export default function CompetitorSpaceScreen() {
  const { colors, isDark } = useTheme();

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Espace Compétiteur</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Card */}
        <LinearGradient
          colors={isDark ? ['#8B5CF620', '#8B5CF610'] : ['#8B5CF615', '#8B5CF608']}
          style={[styles.heroCard, { borderColor: '#8B5CF640' }]}
        >
          <View style={styles.heroIconContainer}>
            <Swords size={32} color="#8B5CF6" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Mode Compétiteur
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Prépare tes compétitions, gère ton poids et suis ton palmarès
          </Text>
        </LinearGradient>

        {/* Menu Items */}
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {COMPETITOR_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: item.iconBg }]}>
                    <IconComponent size={20} color={item.iconColor} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.menuItemSublabel, { color: colors.textMuted }]}>
                      {item.sublabel}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {index < COMPETITOR_ITEMS.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: isDark ? '#F59E0B40' : '#F59E0B' }]}>
          <Trophy size={20} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>
              Conseil du coach
            </Text>
            <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
              Planifie ta pesée 7 jours avant la compétition pour un cut optimal et sans risque.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5CF620',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  menuCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  divider: {
    height: 1,
    marginLeft: 70,
  },
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
