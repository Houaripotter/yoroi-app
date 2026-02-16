import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Coffee,
  Info,
  Calendar,
  Target,
  Sparkles,
  Heart,
} from 'lucide-react-native';
import { getWeeklyLoad, getRiskLevel, formatLoad } from '@/lib/trainingLoadService';
import logger from '@/lib/security/logger';
import { FeatureTutorial } from '@/components/FeatureTutorial';

const { width: screenWidth } = Dimensions.get('window');
const IS_SMALL_SCREEN = screenWidth < 375; // iPhone SE, petits téléphones

export default function ChargeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [weeklyLoad, setWeeklyLoad] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'safe' | 'moderate' | 'high' | 'danger'>('safe');
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const load = await getWeeklyLoad();
      setWeeklyLoad(load);
      setRiskLevel(getRiskLevel(load));
      // Calculer les sessions depuis la charge (approximation: 1 session = ~300 pts)
      const estimatedSessions = load > 0 ? Math.max(1, Math.round(load / 300)) : 0;
      setSessions(estimatedSessions);
    } catch (error) {
      logger.error('Erreur chargement charge:', error);
    }
  };

  // Niveaux expliqués
  const levelInfo = [
    {
      level: t('screens.charge.levels.recovery.name'),
      range: '0 - 500 pts',
      color: '#0EA5E9',
      icon: Heart,
      description: t('screens.charge.levels.recovery.description'),
      advice: t('screens.charge.levels.recovery.advice'),
    },
    {
      level: t('screens.charge.levels.balanced.name'),
      range: '500 - 1000 pts',
      color: '#10B981',
      icon: CheckCircle,
      description: t('screens.charge.levels.balanced.description'),
      advice: t('screens.charge.levels.balanced.advice'),
    },
    {
      level: t('screens.charge.levels.optimal.name'),
      range: '1000 - 1500 pts',
      color: '#22C55E',
      icon: Sparkles,
      description: t('screens.charge.levels.optimal.description'),
      advice: t('screens.charge.levels.optimal.advice'),
    },
    {
      level: t('screens.charge.levels.intense.name'),
      range: '1500 - 2000 pts',
      color: '#F59E0B',
      icon: TrendingUp,
      description: t('screens.charge.levels.intense.description'),
      advice: t('screens.charge.levels.intense.advice'),
    },
    {
      level: t('screens.charge.levels.veryIntense.name'),
      range: '> 2000 pts',
      color: '#EF4444',
      icon: AlertCircle,
      description: t('screens.charge.levels.veryIntense.description'),
      advice: t('screens.charge.levels.veryIntense.advice'),
    },
  ];

  // Trouver le niveau actuel
  const getCurrentLevelIndex = () => {
    if (weeklyLoad < 500) return 0;
    if (weeklyLoad < 1000) return 1;
    if (weeklyLoad < 1500) return 2;
    if (weeklyLoad < 2000) return 3;
    return 4;
  };

  const currentLevel = levelInfo[getCurrentLevelIndex()];
  const CurrentIcon = currentLevel.icon;
  const percentage = Math.min((weeklyLoad / 2000) * 100, 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Tutoriel de fonctionnalité */}
      <FeatureTutorial
        featureId="charge"
        title={t('screens.charge.title')}
        description={t('screens.charge.tutorialDescription')}
        keyPoints={[
          t('screens.charge.keyPoint1'),
          t('screens.charge.keyPoint2'),
          t('screens.charge.keyPoint3'),
          t('screens.charge.keyPoint4'),
        ]}
        icon="flash"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('screens.charge.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte principale */}
        <View style={[styles.mainCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.mainCardHeader}>
            <Activity size={24} color={currentLevel.color} />
            <Text style={[styles.mainCardTitle, { color: colors.textPrimary }]}>
              {t('screens.charge.thisWeek')}
            </Text>
          </View>

          {/* Jauge circulaire */}
          <View style={styles.gaugeContainer}>
            <View style={[styles.gaugeBg, { borderColor: colors.border }]} />
            <View style={[
              styles.gaugeFill,
              {
                borderColor: currentLevel.color,
                transform: [{ rotate: `${(percentage / 100) * 180 - 90}deg` }],
              }
            ]} />
            <View style={styles.gaugeCenter}>
              <CurrentIcon size={40} color={currentLevel.color} strokeWidth={1.5} />
              <View style={{ height: 8 }} />
              <Text style={[styles.gaugeValue, { color: colors.textPrimary }]}>
                {formatLoad(weeklyLoad)}
              </Text>
              <Text style={[styles.gaugeUnit, { color: colors.textMuted }]}>{t('screens.charge.points')}</Text>
            </View>
          </View>

          {/* Niveau actuel */}
          <View style={[styles.currentLevelBadge, { backgroundColor: currentLevel.color + '20' }]}>
            <Text style={[styles.currentLevelText, { color: currentLevel.color }]}>
              {currentLevel.level}
            </Text>
          </View>

          <Text style={[styles.currentDescription, { color: colors.textSecondary }]}>
            {currentLevel.description}
          </Text>

          <View style={[styles.adviceBox, { backgroundColor: currentLevel.color + '10', borderColor: currentLevel.color + '30' }]}>
            <Info size={16} color={currentLevel.color} />
            <Text style={[styles.adviceText, { color: colors.textPrimary }]}>
              {currentLevel.advice}
            </Text>
          </View>
        </View>

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Calendar size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{sessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('screens.charge.sessions')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Target size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {weeklyLoad > 0 ? Math.round(weeklyLoad / Math.max(sessions, 1)) : 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('screens.charge.ptsPerSession')}</Text>
          </View>
        </View>

        {/* Explication des niveaux */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('screens.charge.understandLevels')}
        </Text>

        {levelInfo.map((level, index) => {
          const LevelIcon = level.icon;
          const isCurrent = index === getCurrentLevelIndex();

          return (
            <View
              key={level.level}
              style={[
                styles.levelCard,
                { backgroundColor: colors.backgroundCard },
                isCurrent && { borderColor: level.color, borderWidth: 2 }
              ]}
            >
              <View style={styles.levelHeader}>
                <View style={[styles.levelIconContainer, { backgroundColor: level.color + '20' }]}>
                  <LevelIcon size={18} color={level.color} />
                </View>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelName, { color: level.color }]}>
                    {level.level}
                  </Text>
                  <Text style={[styles.levelRange, { color: colors.textMuted }]}>
                    {level.range}
                  </Text>
                </View>
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: level.color }]}>
                    <Text style={styles.currentBadgeText}>{t('screens.charge.current')}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.levelDescription, { color: colors.textSecondary }]}>
                {level.description}
              </Text>
            </View>
          );
        })}

        {/* Comment ça marche */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
            {t('screens.charge.howCalculated')}
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('screens.charge.calculationExplanation')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    borderRadius: 20,
    padding: 28,
    paddingVertical: 36,
    alignItems: 'center',
    marginBottom: 20,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  mainCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  gaugeContainer: {
    width: IS_SMALL_SCREEN ? 150 : 180,
    height: IS_SMALL_SCREEN ? 100 : 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: IS_SMALL_SCREEN ? 30 : 36,
    marginTop: IS_SMALL_SCREEN ? 16 : 20,
  },
  gaugeBg: {
    position: 'absolute',
    width: IS_SMALL_SCREEN ? 150 : 180,
    height: IS_SMALL_SCREEN ? 150 : 180,
    borderRadius: IS_SMALL_SCREEN ? 75 : 90,
    borderWidth: IS_SMALL_SCREEN ? 10 : 12, // Bordure plus fine sur petits écrans
    borderBottomColor: 'transparent',
    top: 0,
  },
  gaugeFill: {
    position: 'absolute',
    width: IS_SMALL_SCREEN ? 150 : 180,
    height: IS_SMALL_SCREEN ? 150 : 180,
    borderRadius: IS_SMALL_SCREEN ? 75 : 90,
    borderWidth: IS_SMALL_SCREEN ? 10 : 12,
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    top: 0,
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: IS_SMALL_SCREEN ? 28 : 32, // Plus petit sur petits écrans
    fontWeight: '900',
    letterSpacing: -1,
  },
  gaugeUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentLevelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    marginTop: 16,
  },
  currentLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  levelCard: {
    borderRadius: 16,
    padding: IS_SMALL_SCREEN ? 12 : 16, // Padding adaptatif
    marginBottom: 12,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelRange: {
    fontSize: 11,
    fontWeight: '600',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  levelDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoCard: {
    borderRadius: 16,
    padding: IS_SMALL_SCREEN ? 12 : 16, // Padding adaptatif
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

