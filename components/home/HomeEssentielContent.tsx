import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
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
import { BookOpen, Target, FileText, ChevronRight, Plus, Award, Brain, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useI18n } from '@/lib/I18nContext';

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

  // Avatar refresh
  refreshTrigger?: number;
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
  refreshTrigger = 0,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Quote keys for i18n
  const quoteKeys = [
    'home.quotes.quote1',
    'home.quotes.quote2',
    'home.quotes.quote3',
    'home.quotes.quote4',
    'home.quotes.quote5',
  ];

  // Select a deterministic quote based on the day
  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const quoteKey = quoteKeys[dayOfYear % quoteKeys.length];
  const dailyQuote = t(quoteKey);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation d'apparition de la citation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animation pulse pour le cerveau
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handleAddWeight = () => {
    router.push('/(tabs)/add');
  };

  const handleViewWeightStats = () => {
    router.push('/(tabs)/stats?tab=poids');
  };

  const handleWeekSummaryPress = () => {
    router.push('/stats');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* Salutation et citation */}
      <EssentielHeader
        userName={userName}
        viewMode={viewMode}
        onToggleMode={onToggleMode}
        profile={profile}
        refreshTrigger={refreshTrigger}
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

      {/* QUÊTES JOURNALIÈRES - Points XP */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <QuestsCard />
      </View>

      {/* Citation motivante - BULLE DE PENSÉE ANIMÉE */}
      {dailyQuote && (
        <Animated.View
          style={[
            { paddingHorizontal: 16, marginTop: 24 },
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <View style={styles.speechBubbleContainer}>
            {/* Cerveau animé */}
            <Animated.View style={[styles.brainContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.brainCircle}>
                <Brain size={28} color="#8B5CF6" strokeWidth={2.5} />
              </View>
              {/* Mini éclairs d'idée */}
              <View style={styles.ideaSparks}>
                <Zap size={12} color="#FFD700" fill="#FFD700" style={{ position: 'absolute', top: -8, right: -4 }} />
                <Zap size={10} color="#FFD700" fill="#FFD700" style={{ position: 'absolute', top: -4, right: 8 }} />
              </View>
            </Animated.View>

            {/* Bulle de pensée (fond BLANC) */}
            <View style={[styles.speechBubble, {
              backgroundColor: '#FFFFFF',
              shadowColor: isDark ? '#8B5CF6' : '#000',
            }]}>
              {/* Petite queue de bulle */}
              <View style={[styles.bubbleTail, { backgroundColor: '#FFFFFF' }]} />

              <Text style={styles.quoteTextBubble}>
                "{dailyQuote}"
              </Text>

              {/* Badge "Citation du jour" */}
              <View style={styles.quoteBadge}>
                <Text style={styles.quoteBadgeText}>{t('home.quoteOfTheDay')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
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
    paddingBottom: 250,
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

  // ═══════════════════════════════════════════════
  // CITATION - BULLE DE PENSÉE ANIMÉE
  // ═══════════════════════════════════════════════

  speechBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Cerveau animé
  brainContainer: {
    position: 'relative',
  },
  brainCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  ideaSparks: {
    position: 'relative',
    width: 60,
    height: 20,
  },

  // Bulle de pensée (FOND BLANC)
  speechBubble: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },

  // Queue de la bulle
  bubbleTail: {
    position: 'absolute',
    left: -10,
    top: 24,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    transform: [{ rotate: '-45deg' }],
  },

  // Texte de la citation
  quoteTextBubble: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: '#1A1A1A',
    fontStyle: 'italic',
    letterSpacing: 0.2,
    marginBottom: 12,
  },

  // Badge "Citation du jour"
  quoteBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  quoteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
