import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  getRamadanStats,
  getRamadanSettings,
  getTonightHydration,
  addRamadanHydration,
  getHydrationTimeRemaining,
  isDuringFastingHours,
  RamadanStats as RamadanStatsType,
  RamadanSettings,
} from '@/lib/ramadanService';
import { TrendingDown, TrendingUp, Droplet, Moon, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// ============================================
// RAMADAN STATS - STATISTIQUES DU MOIS SACRE
// ============================================

interface RamadanStatsProps {
  onRefresh?: () => void;
  compact?: boolean;
}

export const RamadanStats: React.FC<RamadanStatsProps> = ({
  onRefresh,
  compact = false,
}) => {
  const { colors } = useTheme();
  const [stats, setStats] = useState<RamadanStatsType | null>(null);
  const [settings, setSettings] = useState<RamadanSettings | null>(null);
  const [hydration, setHydration] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0 });
  const [isFasting, setIsFasting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Animation pour la lune
  const moonAnim = useState(new Animated.Value(0))[0];

  // Charger les donnees
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ramadanStats, ramadanSettings, tonightHydration] = await Promise.all([
        getRamadanStats(),
        getRamadanSettings(),
        getTonightHydration(),
      ]);

      setStats(ramadanStats);
      setSettings(ramadanSettings);
      setHydration(tonightHydration);

      if (ramadanSettings) {
        const fasting = isDuringFastingHours(
          ramadanSettings.fajrTime,
          ramadanSettings.maghribTime
        );
        setIsFasting(fasting);

        if (!fasting) {
          const remaining = getHydrationTimeRemaining(ramadanSettings.fajrTime);
          setTimeRemaining(remaining);
        }
      }
    } catch (error) {
      console.error('Erreur chargement stats Ramadan:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Animation de la lune
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(moonAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rafraichir le temps restant toutes les minutes
    const interval = setInterval(() => {
      if (settings && !isFasting) {
        const remaining = getHydrationTimeRemaining(settings.fajrTime);
        setTimeRemaining(remaining);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData, settings, isFasting]);

  // Ajouter de l'hydratation
  const handleAddHydration = async (amount: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newAmount = await addRamadanHydration(amount);
      setHydration(newAmount);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erreur ajout hydratation:', error);
    }
  };

  // Animation de la lune
  const moonTranslateY = moonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  if (isLoading || !stats || !settings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.loadingBar, { backgroundColor: colors.cardHover }]} />
      </View>
    );
  }

  // Version compacte pour le dashboard
  if (compact) {
    return (
      <View style={[styles.containerCompact, { backgroundColor: colors.card }]}>
        {/* En-tete */}
        <View style={styles.headerCompact}>
          <Animated.Text
            style={[
              styles.moonIcon,
              { transform: [{ translateY: moonTranslateY }] },
            ]}
          >
            🌙
          </Animated.Text>
          <View style={styles.headerTextCompact}>
            <Text style={[styles.titleCompact, { color: colors.textPrimary }]}>
              Ramadan 2025
            </Text>
            <Text style={[styles.subtitleCompact, { color: colors.textSecondary }]}>
              Jour {stats.currentDay} / {stats.totalDays}
            </Text>
          </View>
          {isFasting ? (
            <View style={[styles.fastingBadge, { backgroundColor: colors.warningMuted }]}>
              <Sun size={14} color={colors.warning} />
              <Text style={[styles.fastingText, { color: colors.warning }]}>Jeune</Text>
            </View>
          ) : (
            <View style={[styles.fastingBadge, { backgroundColor: colors.infoMuted }]}>
              <Moon size={14} color={colors.info} />
              <Text style={[styles.fastingText, { color: colors.info }]}>Iftar</Text>
            </View>
          )}
        </View>

        {/* Stats rapides */}
        <View style={styles.quickStats}>
          {stats.totalWeightChange !== null && (
            <View style={styles.quickStatItem}>
              {stats.totalWeightChange < 0 ? (
                <TrendingDown size={16} color={colors.success} />
              ) : (
                <TrendingUp size={16} color={colors.danger} />
              )}
              <Text
                style={[
                  styles.quickStatValue,
                  { color: stats.totalWeightChange < 0 ? colors.success : colors.danger },
                ]}
              >
                {stats.totalWeightChange > 0 ? '+' : ''}
                {stats.totalWeightChange.toFixed(1)} kg
              </Text>
            </View>
          )}

          {!isFasting && settings.hydrationGoal > 0 && (
            <View style={styles.quickStatItem}>
              <Droplet size={16} color={colors.info} />
              <Text style={[styles.quickStatValue, { color: colors.info }]}>
                {hydration.toFixed(1)} / {settings.hydrationGoal} L
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Version complete
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* En-tete avec lune animee */}
      <View style={styles.header}>
        <Animated.Text
          style={[
            styles.moonIconLarge,
            { transform: [{ translateY: moonTranslateY }] },
          ]}
        >
          🌙
        </Animated.Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Ramadan 2025
          </Text>
          <Text style={[styles.subtitle, { color: colors.gold }]}>
            Jour {stats.currentDay} / {stats.totalDays}
          </Text>
        </View>
        <View style={styles.daysRemaining}>
          <Text style={[styles.daysRemainingValue, { color: colors.textPrimary }]}>
            {stats.daysRemaining}
          </Text>
          <Text style={[styles.daysRemainingLabel, { color: colors.textSecondary }]}>
            jours restants
          </Text>
        </View>
      </View>

      {/* Statut jeune */}
      <View
        style={[
          styles.fastingStatus,
          { backgroundColor: isFasting ? colors.warningMuted : colors.successMuted },
        ]}
      >
        {isFasting ? (
          <>
            <Sun size={20} color={colors.warning} />
            <Text style={[styles.fastingStatusText, { color: colors.warning }]}>
              Periode de jeune en cours
            </Text>
          </>
        ) : (
          <>
            <Moon size={20} color={colors.success} />
            <Text style={[styles.fastingStatusText, { color: colors.success }]}>
              Temps de manger et boire
            </Text>
          </>
        )}
      </View>

      {/* Evolution du poids */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Evolution du poids
        </Text>

        <View style={styles.weightStats}>
          {/* Poids avant Ramadan */}
          {stats.preRamadanWeight && (
            <View style={styles.weightStatItem}>
              <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>
                Debut Ramadan
              </Text>
              <Text style={[styles.weightStatValue, { color: colors.textPrimary }]}>
                {stats.preRamadanWeight.toFixed(1)} kg
              </Text>
            </View>
          )}

          {/* Poids actuel Suhoor */}
          {stats.currentSuhoorWeight && (
            <View style={styles.weightStatItem}>
              <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>
                Actuel (Suhoor)
              </Text>
              <Text style={[styles.weightStatValue, { color: colors.gold }]}>
                {stats.currentSuhoorWeight.toFixed(1)} kg
              </Text>
            </View>
          )}

          {/* Evolution */}
          {stats.totalWeightChange !== null && (
            <View style={styles.weightStatItem}>
              <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>
                Evolution
              </Text>
              <View style={styles.evolutionRow}>
                {stats.totalWeightChange < 0 ? (
                  <TrendingDown size={18} color={colors.success} />
                ) : (
                  <TrendingUp size={18} color={colors.danger} />
                )}
                <Text
                  style={[
                    styles.evolutionValue,
                    { color: stats.totalWeightChange < 0 ? colors.success : colors.danger },
                  ]}
                >
                  {stats.totalWeightChange > 0 ? '+' : ''}
                  {stats.totalWeightChange.toFixed(1)} kg
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Moyennes Suhoor vs Iftar */}
      <View style={[styles.section, { borderTopColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Moyennes Suhoor vs Iftar
        </Text>

        <View style={styles.comparisonRow}>
          {/* Suhoor */}
          <View style={[styles.comparisonItem, { backgroundColor: colors.cardHover }]}>
            <Text style={styles.comparisonIcon}>🌅</Text>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
              Suhoor
            </Text>
            <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
              {stats.averageSuhoorWeight
                ? `${stats.averageSuhoorWeight.toFixed(1)} kg`
                : '—'}
            </Text>
          </View>

          {/* Variation */}
          <View style={styles.variationArrow}>
            <Text style={[styles.variationText, { color: colors.textMuted }]}>
              {stats.dailyVariation !== null
                ? `+${stats.dailyVariation.toFixed(1)} kg`
                : '—'}
            </Text>
          </View>

          {/* Iftar */}
          <View style={[styles.comparisonItem, { backgroundColor: colors.cardHover }]}>
            <Text style={styles.comparisonIcon}>🌙</Text>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
              Iftar
            </Text>
            <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
              {stats.averageIftarWeight
                ? `${stats.averageIftarWeight.toFixed(1)} kg`
                : '—'}
            </Text>
          </View>
        </View>

        <Text style={[styles.variationNote, { color: colors.textMuted }]}>
          Normal de peser plus apres Iftar (+0.5 a +1.5 kg)
        </Text>
      </View>

      {/* Hydratation nocturne */}
      {!isFasting && (
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <View style={styles.hydrationHeader}>
            <Droplet size={20} color={colors.info} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Hydratation cette nuit
            </Text>
          </View>

          {/* Temps restant */}
          <View style={[styles.timeAlert, { backgroundColor: colors.infoMuted }]}>
            <Text style={[styles.timeAlertText, { color: colors.info }]}>
              {timeRemaining.hours}h {timeRemaining.minutes}min pour boire{' '}
              {Math.max(0, settings.hydrationGoal - hydration).toFixed(1)} L
            </Text>
          </View>

          {/* Barre de progression */}
          <View style={styles.hydrationProgress}>
            <View style={[styles.hydrationBar, { backgroundColor: colors.cardHover }]}>
              <View
                style={[
                  styles.hydrationFill,
                  {
                    backgroundColor: colors.info,
                    width: `${Math.min(100, (hydration / settings.hydrationGoal) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.hydrationText, { color: colors.textPrimary }]}>
              {hydration.toFixed(1)} / {settings.hydrationGoal} L
            </Text>
          </View>

          {/* Boutons */}
          <View style={styles.hydrationButtons}>
            {[0.25, 0.5, 1].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.hydrationBtn,
                  { backgroundColor: amount === 1 ? colors.info : colors.cardHover },
                ]}
                onPress={() => handleAddHydration(amount)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.hydrationBtnText,
                    { color: amount === 1 ? '#fff' : colors.textPrimary },
                  ]}
                >
                  +{amount}L
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Moyenne */}
          {stats.averageNightHydration !== null && (
            <Text style={[styles.hydrationAverage, { color: colors.textSecondary }]}>
              Moyenne: {stats.averageNightHydration.toFixed(1)} L / nuit
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  containerCompact: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  loadingBar: {
    height: 150,
    borderRadius: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  moonIconLarge: {
    fontSize: 36,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTextCompact: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  titleCompact: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  subtitleCompact: {
    fontSize: 12,
    marginTop: 1,
  },
  daysRemaining: {
    alignItems: 'center',
  },
  daysRemainingValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  daysRemainingLabel: {
    fontSize: 11,
  },

  // Fasting status
  fastingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  fastingStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fastingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  fastingText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Quick stats (compact)
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Section
  section: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Weight stats
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  weightStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  weightStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evolutionValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Comparison
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  comparisonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  comparisonValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  variationArrow: {
    paddingHorizontal: 4,
  },
  variationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  variationNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Hydration
  hydrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeAlert: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  timeAlertText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  hydrationProgress: {
    marginBottom: 12,
  },
  hydrationBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  hydrationFill: {
    height: '100%',
    borderRadius: 5,
  },
  hydrationText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  hydrationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  hydrationBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  hydrationBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  hydrationAverage: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default RamadanStats;
