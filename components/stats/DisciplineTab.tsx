import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getWeeklyLoadStats, WeeklyLoadStats, getRiskColor } from '@/lib/trainingLoadService';
import { getTrainingStats, getTrainings } from '@/lib/database';
import { getSportColor, getSportIcon, getClubLogoSource } from '@/lib/sports';
import { Flame, Target } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Rect, G, Text as SvgText } from 'react-native-svg';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scale, isIPad } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = isIPad() ? scale(8) : 16; // iPhone garde 16, iPad s'adapte

interface SportStat {
  sport: string;
  count: number;
  club_name?: string;
  club_logo?: string;
  club_color?: string;
}

export default function DisciplineTab() {
  const { colors } = useTheme();
  const [loadStats, setLoadStats] = useState<WeeklyLoadStats | null>(null);
  const [sportStats, setSportStats] = useState<SportStat[]>([]);
  const [weeklyGoal] = useState(4); // Objectif hebdomadaire (à rendre configurable plus tard)
  const [weekCount, setWeekCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Charge d'entraînement
    const stats = await getWeeklyLoadStats();
    setLoadStats(stats);

    // Stats par sport
    const stats2 = await getTrainingStats();
    setSportStats(stats2);

    // Compter entraînements de la semaine
    const trainings = await getTrainings(7);
    setWeekCount(trainings.length);
  };

  const chartWidth = SCREEN_WIDTH - CONTAINER_PADDING * 2; // Utilise toute la largeur disponible
  const padding = { left: 35, right: 15, top: 15, bottom: 30 };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* CHARGE D'ENTRAÎNEMENT */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Flame size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Charge d'Entraînement</Text>
        </View>

        {loadStats && (
          <>
            <View style={styles.loadSummary}>
              <View style={styles.loadMain}>
                <Text style={[styles.loadValue, { color: getRiskColor(loadStats.riskLevel) }]}>
                  {loadStats.totalLoad}
                </Text>
                <Text style={[styles.loadUnit, { color: colors.textMuted }]}>pts Foster</Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: `${getRiskColor(loadStats.riskLevel)}20` }]}>
                <Text style={[styles.riskText, { color: getRiskColor(loadStats.riskLevel) }]}>
                  {loadStats.riskLevel === 'safe' ? 'Zone sûre' :
                    loadStats.riskLevel === 'moderate' ? 'Modéré' :
                      loadStats.riskLevel === 'high' ? 'Élevé' : 'Critique'}
                </Text>
              </View>
            </View>

            {/* Graphique barres charge quotidienne */}
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={100}>
                {loadStats.dailyLoads.map((day, i) => {
                  const barWidth = (chartWidth - padding.left - padding.right) / 7 - 8;
                  const x = padding.left + i * ((chartWidth - padding.left - padding.right) / 7) + 4;
                  const maxLoad = Math.max(...loadStats.dailyLoads.map(d => d.load), 500);
                  const barHeight = (day.load / maxLoad) * 60;

                  return (
                    <G key={i}>
                      <Rect
                        x={x}
                        y={70 - barHeight}
                        width={barWidth}
                        height={barHeight}
                        rx={4}
                        fill={day.load > 400 ? '#F97316' : colors.accent}
                      />
                      <SvgText
                        x={x + barWidth / 2}
                        y={85}
                        fontSize={9}
                        fill={colors.textMuted}
                        textAnchor="middle"
                      >
                        {format(new Date(day.date), 'EEE', { locale: fr }).slice(0, 2)}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>

            <Text style={[styles.advice, { color: colors.textMuted }]}>{loadStats.advice}</Text>
          </>
        )}
      </View>

      {/* OBJECTIF HEBDOMADAIRE */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Target size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Objectif Hebdomadaire</Text>
        </View>

        <View style={styles.goalContainer}>
          <View style={styles.goalCircle}>
            <Text style={[styles.goalCount, { color: colors.accent }]}>
              {weekCount}/{weeklyGoal}
            </Text>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
              Entraînements
            </Text>
          </View>

          {/* Barre de progression */}
          <View style={[styles.goalBar, { backgroundColor: colors.background }]}>
            <View
              style={[
                styles.goalBarFill,
                {
                  backgroundColor: colors.accent,
                  width: `${Math.min((weekCount / weeklyGoal) * 100, 100)}%`,
                },
              ]}
            />
          </View>

          {weekCount >= weeklyGoal && (
            <Text style={[styles.goalAchieved, { color: colors.accent }]}>
              ✓ Objectif atteint !
            </Text>
          )}
        </View>
      </View>

      {/* PAR SPORT (avec logos) */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 16 }]}>
          Par Sport
        </Text>

        {sportStats.slice(0, 5).map((stat, index) => {
          const sportColor = getSportColor(stat.sport);
          const sportIcon = getSportIcon(stat.sport);
          const clubLogo = stat.club_logo ? getClubLogoSource(stat.club_logo) : null;

          return (
            <View key={index} style={styles.sportItem}>
              {/* Logo ou Icône */}
              <View
                style={[
                  styles.sportIconContainer,
                  { backgroundColor: sportColor + '20' },
                ]}
              >
                {clubLogo ? (
                  <Image source={clubLogo} style={styles.clubLogo} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons
                    name={sportIcon as any}
                    size={24}
                    color={sportColor}
                  />
                )}
              </View>

              {/* Infos */}
              <View style={styles.sportInfo}>
                <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                  {stat.sport}
                </Text>
                {stat.club_name && (
                  <Text style={[styles.clubName, { color: colors.textSecondary }]}>
                    {stat.club_name}
                  </Text>
                )}
              </View>

              {/* Compteur */}
              <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.countText, { color: colors.textPrimary }]}>
                  {stat.count}
                </Text>
              </View>
            </View>
          );
        })}

        {sportStats.length === 0 && (
          <Text style={[styles.noData, { color: colors.textMuted }]}>
            Aucune donnée disponible
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  loadSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  loadValue: {
    fontSize: 36,
    fontWeight: '900',
  },
  loadUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartContainer: {
    marginBottom: 12,
  },
  advice: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  goalContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  goalCircle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  goalCount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  goalLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  goalBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalAchieved: {
    fontSize: 14,
    fontWeight: '600',
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  sportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clubLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sportInfo: {
    flex: 1,
  },
  sportName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clubName: {
    fontSize: 13,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noData: {
    textAlign: 'center',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
