// ============================================
// AIDE & TUTORIELS
// Page listant tous les tutoriels disponibles
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { PAGE_TUTORIALS, FeaturePage, PageTutorial } from '@/lib/featureDiscoveryService';
import { FeatureDiscoveryModal } from '@/components/FeatureDiscoveryModal';
import * as Haptics from 'expo-haptics';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  home: require('lucide-react-native').Home,
  'bar-chart': require('lucide-react-native').BarChart3,
  calendar: require('lucide-react-native').Calendar,
  plus: require('lucide-react-native').Plus,
  menu: require('lucide-react-native').Menu,
  book: require('lucide-react-native').BookOpen,
  scale: require('lucide-react-native').Scale,
  activity: require('lucide-react-native').Activity,
  clock: require('lucide-react-native').Clock,
  'heart-pulse': require('lucide-react-native').HeartPulse,
  gauge: require('lucide-react-native').Gauge,
};

export default function HelpTutorialsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedTutorial, setSelectedTutorial] = useState<PageTutorial | null>(null);

  const handleTutorialPress = (tutorial: PageTutorial) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTutorial(tutorial);
  };

  // Grouper les tutoriels par catégorie
  const mainTutorials = [
    PAGE_TUTORIALS.home,
    PAGE_TUTORIALS.stats,
    PAGE_TUTORIALS.planning,
    PAGE_TUTORIALS.add,
    PAGE_TUTORIALS.menu,
  ];

  const featureTutorials = [
    PAGE_TUTORIALS.carnet,
    PAGE_TUTORIALS.weight,
    PAGE_TUTORIALS.composition,
    PAGE_TUTORIALS.fasting,
    PAGE_TUTORIALS.injury,
    PAGE_TUTORIALS.performance,
  ];

  const renderTutorialCard = (tutorial: PageTutorial) => {
    const IconComponent = ICON_MAP[tutorial.icon];
    return (
      <TouchableOpacity
        key={tutorial.id}
        style={[
          styles.tutorialCard,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleTutorialPress(tutorial)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: tutorial.color + '20' }]}>
          <IconComponent size={28} color={tutorial.color} />
        </View>
        <View style={styles.tutorialInfo}>
          <Text style={[styles.tutorialTitle, { color: colors.textPrimary }]}>
            {tutorial.title}
          </Text>
          <Text style={[styles.tutorialDescription, { color: colors.textMuted }]}>
            {tutorial.description}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Aide & Tutoriels</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Section: Onglets Principaux */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Onglets Principaux
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Découvre comment utiliser chaque onglet de l'app
          </Text>
          {mainTutorials.map(renderTutorialCard)}
        </View>

        {/* Section: Fonctionnalités */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Fonctionnalités
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
            Explore toutes les fonctionnalités de Yoroi
          </Text>
          {featureTutorials.map(renderTutorialCard)}
        </View>

        {/* Section: Besoin d'aide ? */}
        <View style={[styles.helpBox, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Text style={[styles.helpTitle, { color: colors.textPrimary }]}>
            Tu as encore une question ?
          </Text>
          <Text style={[styles.helpText, { color: colors.textMuted }]}>
            N'hésite pas à me contacter sur Instagram @Yoroiapp ou via la boîte à idées dans le menu.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de tutoriel */}
      {selectedTutorial && (
        <FeatureDiscoveryModal
          visible={selectedTutorial !== null}
          tutorial={selectedTutorial}
          onClose={() => setSelectedTutorial(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tutorialDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  helpBox: {
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
