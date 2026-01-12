import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { EssentielHeader } from './essentiel/EssentielHeader';
import { EssentielWeightCard } from './essentiel/EssentielWeightCard';
import { HydrationCard2 } from '@/components/cards/HydrationCard2';
import { SleepLottieCard } from '@/components/cards/SleepLottieCard';
import { EssentielActivityCard } from './essentiel/EssentielActivityCard';
import { EssentielWeekSummary } from './essentiel/EssentielWeekSummary';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { QuestsCard } from '@/components/QuestsCard';
import { ViewMode } from '@/hooks/useViewMode';
import { Profile } from '@/lib/database';
import { useTheme } from '@/lib/ThemeContext';
import { BookOpen, Target, FileText, ChevronRight, Plus, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface HomeEssentielContentProps {
  // Profil
  userName?: string;
  viewMode?: ViewMode;
  onToggleMode?: () => void;
  profile?: Profile | null;

  // Poids
  currentWeight?: number;
  targetWeight?: number;
  weightHistory?: number[];
  weightTrend?: 'up' | 'down' | 'stable';

  // Hydratation
  hydration?: number; // en ml
  hydrationGoal?: number; // en ml
  onAddWater?: (ml: number) => void;

  // Sommeil
  sleepHours?: number;
  sleepDebt?: number;
  sleepGoal?: number;

  // Activité
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  caloriesGoal?: number;

  // Résumé semaine
  weekWeightChange?: number;
  weekHydrationRate?: number;
  weekAvgSleep?: number;
}

export const HomeEssentielContent: React.FC<HomeEssentielContentProps> = ({
  userName,
  viewMode,
  onToggleMode,
  profile,
  currentWeight,
  targetWeight,
  weightHistory = [],
  weightTrend,
  hydration = 0,
  hydrationGoal = 2500,
  onAddWater,
  sleepHours = 0,
  sleepDebt = 0,
  sleepGoal = 8,
  steps,
  stepsGoal,
  calories,
  caloriesGoal,
  weekWeightChange,
  weekHydrationRate,
  weekAvgSleep,
}) => {
  const handleAddWeight = () => {
    router.push('/(tabs)/add');
  };

  const handleViewWeightStats = () => {
    router.push('/(tabs)/stats?tab=poids');
  };

  const handleWeekSummaryPress = () => {
    router.push('/stats');
  };

  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Salutation et citation */}
      <EssentielHeader
        userName={userName}
        viewMode={viewMode}
        onToggleMode={onToggleMode}
        profile={profile}
      />

      {/* CARTE POIDS - FULL WIDTH */}
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <EssentielWeightCard
          currentWeight={currentWeight}
          objective={targetWeight}
          weekData={weightHistory}
          weekLabels={['L', 'M', 'M', 'J', 'V', 'S', 'D']}
          trend={weightTrend}
          onAddWeight={handleAddWeight}
          onViewStats={handleViewWeightStats}
        />
      </View>

      {/* 3 CARTES COMPACTES : Hydratation | Sommeil | Activité */}
      <View style={styles.threeCardsRow}>
        <View style={styles.compactCard}>
          <HydrationCard2
            currentMl={hydration}
            goalMl={hydrationGoal}
            onAddMl={onAddWater}
          />
        </View>
        <TouchableOpacity onPress={() => router.push('/sleep')} activeOpacity={0.9} style={styles.compactCard}>
          <SleepLottieCard
            hours={sleepHours}
            quality={0}
            debt={sleepDebt}
            goal={sleepGoal}
          />
        </TouchableOpacity>
        <View style={styles.compactCard}>
          <EssentielActivityCard
            steps={steps}
            stepsGoal={stepsGoal}
            calories={calories}
            caloriesGoal={caloriesGoal}
          />
        </View>
      </View>

      {/* Citation motivante du jour */}
      <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
        <View style={[styles.citationCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.citationText, { color: colors.textSecondary }]}>
            💪 Reste focus sur tes objectifs
          </Text>
        </View>
      </View>

      <View style={{ height: 120 }} />
    </View>
  );
};

// Quick Tools Row Component
const QuickToolsRow: React.FC = () => {
  const { colors } = useTheme();

  const tools = [
    { id: 'carnet', label: 'Carnet', route: '/training-journal', icon: BookOpen, color: '#F97316' },
    { id: 'blessures', label: 'Blessures', route: '/infirmary', icon: Plus, color: '#EF4444' },
    { id: 'objectifs', label: 'Objectifs', route: '/challenges', icon: Award, color: '#8B5CF6' },
  ];

  return (
    <View style={styles.quickToolsRow}>
      {tools.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          style={[styles.quickToolCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(tool.route as any);
          }}
          activeOpacity={0.85}
        >
          <tool.icon size={22} color={tool.color} />
          <Text style={[styles.quickToolLabel, { color: colors.textPrimary }]}>{tool.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  quickToolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  quickToolCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickToolLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportContent: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  reportSubtitle: {
    fontSize: 13,
    color: '#16A34A',
    marginTop: 2,
  },
  // 3 cartes compactes
  threeCardsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  compactCard: {
    flex: 1,
  },
  // Citation
  citationCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citationText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
