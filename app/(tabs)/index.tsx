import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Flame,
  Camera,
  ChevronRight,
  Trophy,
  Target,
  Activity,
  Droplet,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { QuoteCard } from '@/components/ui/QuoteCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { WeightChart } from '@/components/WeightChart';
import { useTheme } from '@/lib/ThemeContext';
import { getAllMeasurements, getUserSettings, getAllWorkouts, getPhotosFromStorage, Photo } from '@/lib/storage';
import { getDailyQuote } from '@/lib/quotes';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress } from '@/lib/ranks';

// ============================================
// ⚔️ DASHBOARD GUERRIER - ACCUEIL
// ============================================

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const { colors, gradients, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [startWeight, setStartWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [username, setUsername] = useState('Guerrier');
  const [allMeasurements, setAllMeasurements] = useState<{ date: string; weight: number }[]>([]);
  const [weightChange, setWeightChange] = useState<{ value: number; direction: 'up' | 'down' | 'stable' } | null>(null);
  const [streak, setStreak] = useState(0);
  const [trainingsThisWeek, setTrainingsThisWeek] = useState<any[]>([]);
  const [bodyComposition, setBodyComposition] = useState<{ bodyFat?: number; muscle?: number; water?: number } | null>(null);
  const [transformationPhotos, setTransformationPhotos] = useState<{ before?: Photo; after?: Photo } | null>(null);

  const quote = useMemo(() => getDailyQuote(), []);
  const rank = useMemo(() => getCurrentRank(streak), [streak]);
  const nextRank = useMemo(() => getNextRank(streak), [streak]);
  const daysToNextRank = useMemo(() => getDaysToNextRank(streak), [streak]);
  const rankProgress = useMemo(() => getRankProgress(streak), [streak]);

  const loadData = useCallback(async () => {
    try {
      const settings = await getUserSettings();
      if (settings.username) setUsername(settings.username);
      if (settings.weight_goal) setGoalWeight(settings.weight_goal);

      const measurements = await getAllMeasurements();

      if (measurements.length > 0) {
        const sorted = [...measurements].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setCurrentWeight(sorted[0].weight);

        // Le poids de départ est le premier enregistrement
        if (sorted.length > 1) {
          setStartWeight(sorted[sorted.length - 1].weight);
        }

        // Stocker toutes les mesures pour le graphique
        setAllMeasurements(sorted.map(m => ({ date: m.date, weight: m.weight })));

        // Composition corporelle (dernière mesure avec données)
        const withComposition = sorted.find(m => m.body_fat || m.muscle_mass || m.water);
        if (withComposition) {
          setBodyComposition({
            bodyFat: withComposition.body_fat,
            muscle: withComposition.muscle_mass,
            water: withComposition.water,
          });
        }

        // Calculer le streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < sorted.length; i++) {
          const measureDate = new Date(sorted[i].date);
          measureDate.setHours(0, 0, 0, 0);
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - i);

          if (measureDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
          } else {
            break;
          }
        }
        setStreak(currentStreak);

        // Changement sur 7 jours
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoMeasurement = sorted.find(m => new Date(m.date) <= weekAgo);

        if (weekAgoMeasurement) {
          const change = sorted[0].weight - weekAgoMeasurement.weight;
          setWeightChange({
            value: Math.abs(change),
            direction: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable'
          });
        }
      }

      // Charger les entraînements de la semaine
      try {
        const workouts = await getAllWorkouts();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const thisWeek = workouts.filter(w => new Date(w.date) >= weekStart);
        setTrainingsThisWeek(thisWeek);
      } catch (e) {
        // Pas d'entraînements
      }

      // Charger les photos transformation (première et dernière)
      try {
        const photos = await getPhotosFromStorage();
        if (photos.length >= 2) {
          const sortedPhotos = [...photos].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setTransformationPhotos({
            before: sortedPhotos[0],
            after: sortedPhotos[sortedPhotos.length - 1],
          });
        }
      } catch (e) {
        // Pas de photos
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalLost = useMemo(() => {
    if (!startWeight || !currentWeight) return 0;
    return startWeight - currentWeight;
  }, [startWeight, currentWeight]);

  const remainingToGoal = useMemo(() => {
    if (!goalWeight || !currentWeight) return 0;
    return currentWeight - goalWeight;
  }, [goalWeight, currentWeight]);

  const progressPercent = useMemo(() => {
    if (!startWeight || !goalWeight || !currentWeight) return 0;
    const totalToLose = startWeight - goalWeight;
    if (totalToLose <= 0) return 100;
    const lost = startWeight - currentWeight;
    return Math.min(100, Math.max(0, (lost / totalToLose) * 100));
  }, [startWeight, goalWeight, currentWeight]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <ScreenWrapper noPadding>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('@/assets/images/yoroi-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()},</Text>
            <Text style={[styles.username, { color: colors.textPrimary }]}>{username}</Text>
          </View>
          <View style={styles.headerBadges}>
            <Badge
              label={rank.name}
              icon={rank.icon}
              color={rank.color}
              size="sm"
            />
            {streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: colors.goldMuted }]}>
                <Flame size={14} color={colors.gold} />
                <Text style={[styles.streakText, { color: colors.gold }]}>{streak}j</Text>
              </View>
            )}
          </View>
        </View>

        {/* CITATION DU JOUR */}
        <QuoteCard quote={quote} style={styles.quoteCard} />

        {/* CARTE POIDS PRINCIPALE - CLIQUABLE */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/history')}
        >
          <Card variant="gold" style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <View style={[styles.weightIconContainer, { backgroundColor: colors.goldMuted }]}>
                <Scale size={24} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={[styles.weightLabel, { color: colors.textPrimary }]}>Poids actuel</Text>
              <ChevronRight size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>

            {currentWeight ? (
              <>
                <View style={styles.weightDisplay}>
                  <Text style={[styles.weightValue, { color: colors.textPrimary }]}>{currentWeight.toFixed(1)}</Text>
                  <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>kg</Text>

                  {weightChange && weightChange.direction !== 'stable' && (
                    <View style={[
                      styles.trendBadge,
                      { backgroundColor: weightChange.direction === 'down'
                        ? colors.successMuted
                        : colors.dangerMuted
                      }
                    ]}>
                      {weightChange.direction === 'down' ? (
                        <TrendingDown size={14} color={colors.success} />
                      ) : (
                        <TrendingUp size={14} color={colors.danger} />
                      )}
                      <Text style={[
                        styles.trendText,
                        { color: weightChange.direction === 'down'
                          ? colors.success
                          : colors.danger
                        }
                      ]}>
                        {weightChange.direction === 'down' ? '-' : '+'}
                        {weightChange.value.toFixed(1)} kg
                      </Text>
                    </View>
                  )}
                </View>

                {/* BARRE DE PROGRESSION */}
                {goalWeight && startWeight && (
                  <View style={styles.progressSection}>
                    <ProgressBar
                      progress={progressPercent}
                      height={10}
                      showLabel
                      labelPosition="right"
                    />

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Départ</Text>
                        <Text style={[styles.statValue, { color: colors.textPrimary }]}>{startWeight} kg</Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conquis</Text>
                        <Text style={[styles.statValue, { color: colors.success }]}>
                          {totalLost > 0 ? `-${totalLost.toFixed(1)}` : '0'} kg
                        </Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Objectif</Text>
                        <Text style={[styles.statValue, { color: colors.gold }]}>
                          {goalWeight} kg
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Commence ton combat</Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.gold }]}
                  onPress={() => router.push('/(tabs)/add')}
                >
                  <Text style={[styles.emptyButtonText, { color: colors.background }]}>+ Première pesée</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </TouchableOpacity>

        {/* ACTIONS RAPIDES */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/add')}
          >
            <LinearGradient
              colors={gradients.gold}
              style={styles.actionButtonGradient}
            >
              <Scale size={22} color={colors.background} />
              <Text style={[styles.actionButtonText, { color: colors.background }]}>Nouvelle pesée</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButtonSecondary, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/photos')}
          >
            <Camera size={22} color={colors.textPrimary} />
            <Text style={[styles.actionButtonSecondaryText, { color: colors.textPrimary }]}>Avant/Après</Text>
          </TouchableOpacity>
        </View>

        {/* GRAPHIQUE ÉVOLUTION - CLIQUABLE */}
        {allMeasurements.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/stats')}
            style={styles.chartCard}
          >
            <WeightChart
              data={allMeasurements}
              onPointPress={(point) => {
                console.log('Point cliqué:', point);
              }}
            />
          </TouchableOpacity>
        )}

        {/* COMPOSITION CORPORELLE */}
        {bodyComposition && (bodyComposition.bodyFat || bodyComposition.muscle || bodyComposition.water) && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/add-measurement')}
          >
            <Card style={styles.compositionCard}>
              <View style={styles.compositionHeader}>
                <Activity size={20} color={colors.info} />
                <Text style={[styles.compositionTitle, { color: colors.textPrimary }]}>Composition corporelle</Text>
                <ChevronRight size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
              </View>
              <View style={styles.compositionGrid}>
                {bodyComposition.bodyFat && (
                  <View style={styles.compositionItem}>
                    <View style={[styles.compositionBar, { backgroundColor: colors.warning }]}>
                      <Text style={[styles.compositionValue, { color: colors.background }]}>
                        {bodyComposition.bodyFat.toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Graisse</Text>
                  </View>
                )}
                {bodyComposition.muscle && (
                  <View style={styles.compositionItem}>
                    <View style={[styles.compositionBar, { backgroundColor: colors.success }]}>
                      <Text style={[styles.compositionValue, { color: colors.background }]}>
                        {bodyComposition.muscle.toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Muscle</Text>
                  </View>
                )}
                {bodyComposition.water && (
                  <View style={styles.compositionItem}>
                    <View style={[styles.compositionBar, { backgroundColor: colors.info }]}>
                      <Text style={[styles.compositionValue, { color: colors.background }]}>
                        {bodyComposition.water.toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Eau</Text>
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* TRANSFORMATION AVANT/APRÈS */}
        {transformationPhotos && transformationPhotos.before && transformationPhotos.after && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/photos')}
          >
            <Card style={styles.transformationCard}>
              <View style={styles.transformationHeader}>
                <Trophy size={20} color={colors.gold} />
                <Text style={[styles.transformationTitle, { color: colors.textPrimary }]}>Ma transformation</Text>
                <ChevronRight size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
              </View>
              <View style={styles.transformationPhotos}>
                <View style={styles.transformationPhotoContainer}>
                  <Image
                    source={{ uri: transformationPhotos.before.file_uri }}
                    style={styles.transformationPhoto}
                    resizeMode="cover"
                  />
                  <View style={[styles.transformationBadge, { backgroundColor: colors.dangerMuted }]}>
                    <Text style={[styles.transformationBadgeText, { color: colors.danger }]}>AVANT</Text>
                  </View>
                </View>
                <View style={styles.transformationArrow}>
                  <ChevronRight size={24} color={colors.gold} />
                </View>
                <View style={styles.transformationPhotoContainer}>
                  <Image
                    source={{ uri: transformationPhotos.after.file_uri }}
                    style={styles.transformationPhoto}
                    resizeMode="cover"
                  />
                  <View style={[styles.transformationBadge, { backgroundColor: colors.successMuted }]}>
                    <Text style={[styles.transformationBadgeText, { color: colors.success }]}>APRÈS</Text>
                  </View>
                </View>
              </View>
              {totalLost > 0 && (
                <View style={[styles.transformationStats, { borderTopColor: colors.border }]}>
                  <Text style={[styles.transformationStatsText, { color: colors.success }]}>
                    -{totalLost.toFixed(1)} kg conquis
                  </Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        )}

        {/* PROGRESSION DE RANG - CLIQUABLE */}
        {nextRank && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/profile')}
          >
            <Card style={styles.rankCard}>
              <View style={styles.rankHeader}>
                <Text style={styles.rankIcon}>{rank.icon}</Text>
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, { color: colors.textPrimary }]}>{rank.name}</Text>
                  <Text style={[styles.rankNameJp, { color: colors.textSecondary }]}>{rank.nameJp}</Text>
                </View>
                <View style={styles.rankArrow}>
                  <ChevronRight size={20} color={colors.textMuted} />
                </View>
                <Text style={styles.nextRankIcon}>{nextRank.icon}</Text>
                <View style={styles.rankInfo}>
                  <Text style={[styles.nextRankName, { color: colors.textSecondary }]}>{nextRank.name}</Text>
                  <Text style={[styles.rankNameJp, { color: colors.textSecondary }]}>{nextRank.nameJp}</Text>
                </View>
              </View>
              <ProgressBar
                progress={rankProgress}
                height={8}
                color="gold"
                style={{ marginTop: 12 }}
              />
              <Text style={[styles.rankProgress, { color: colors.textSecondary }]}>
                Encore {daysToNextRank} jours pour devenir {nextRank.name}
              </Text>
            </Card>
          </TouchableOpacity>
        )}

        {/* LIEN PHOTOS */}
        <TouchableOpacity
          style={[styles.photosLink, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/photos')}
        >
          <View style={styles.photosLinkContent}>
            <Camera size={20} color={colors.gold} />
            <View>
              <Text style={[styles.photosLinkText, { color: colors.textPrimary }]}>Ma Transformation</Text>
              <Text style={[styles.photosLinkSubtext, { color: colors.textSecondary }]}>Visualise ta progression</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// Constantes pour les valeurs non-thématiques
const RADIUS = { md: 12, lg: 16 };

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: 100,
    height: 36,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 13,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // QUOTE
  quoteCard: {
    marginBottom: 16,
  },

  // POIDS
  weightCard: {
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  weightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weightValue: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '600',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginLeft: 8,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // PROGRESSION
  progressSection: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // ACTIONS
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  actionButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // GRAPHIQUE
  chartCard: {
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // COMPOSITION CORPORELLE
  compositionCard: {
    marginBottom: 16,
  },
  compositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  compositionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  compositionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  compositionItem: {
    flex: 1,
    alignItems: 'center',
  },
  compositionBar: {
    width: '100%',
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compositionValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  compositionLabel: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },

  // TRANSFORMATION
  transformationCard: {
    marginBottom: 16,
  },
  transformationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  transformationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  transformationPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  transformationPhotoContainer: {
    flex: 1,
    position: 'relative',
  },
  transformationPhoto: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  transformationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transformationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  transformationArrow: {
    paddingHorizontal: 4,
  },
  transformationStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  transformationStatsText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // RANG
  rankCard: {
    marginBottom: 16,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '700',
  },
  rankNameJp: {
    fontSize: 12,
  },
  rankArrow: {
    marginHorizontal: 8,
  },
  nextRankIcon: {
    fontSize: 28,
    marginRight: 8,
    opacity: 0.5,
  },
  nextRankName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rankProgress: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },

  // PHOTOS LINK
  photosLink: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
  },
  photosLinkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photosLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
  photosLinkSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
});
