import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Training } from '@/lib/database';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { getSportIcon } from '@/constants/sportIcons';
import { getClubLogoSource } from '@/lib/sports';
import { Maximize2, Dumbbell as DumbbellIcon } from 'lucide-react-native';
import { StatsDetailModal } from '../StatsDetailModal';

import { scale, isIPad } from '@/constants/responsive';

const { width } = Dimensions.get('window');
// iPhone garde 16, iPad utilise scale(8)
const CONTAINER_PADDING = isIPad() ? scale(8) : 16;
const CHART_WIDTH = width - CONTAINER_PADDING * 2;
const CHART_HEIGHT = scale(200);
const PADDING_LEFT = scale(35);
const PADDING_RIGHT = scale(20);
const PADDING_TOP = scale(20);
const PADDING_BOTTOM = scale(50);

interface ActivityStatsProps {
  data: Training[];
}

type Period = '7j' | '30j' | '90j' | 'year';

export const ActivityStats: React.FC<ActivityStatsProps> = ({ data }) => {
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<Period>('30j');
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    count: number;
    weekStart: Date;
    weekEnd: Date;
    x: number;
    y: number;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Calculer stats par semaine selon la période
  const getWeeklyData = () => {
    const weeks: { [week: string]: number } = {};
    const now = new Date();
    let cutoffDate: Date;
    let numberOfWeeks: number;

    switch (period) {
      case '7j':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        numberOfWeeks = 1;
        break;
      case '30j':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        numberOfWeeks = 5;
        break;
      case '90j':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        numberOfWeeks = 13;
        break;
      case 'year':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        numberOfWeeks = 52;
        break;
      default:
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        numberOfWeeks = 4;
        break;
    }

    data.forEach((training) => {
      const d = new Date(training.date);
      if (d >= cutoffDate) {
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        weeks[weekKey] = (weeks[weekKey] || 0) + 1;
      }
    });

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-numberOfWeeks)
      .map(([week, count]) => ({
        week,
        count,
        weekStart: new Date(week),
        weekEnd: endOfWeek(new Date(week), { weekStartsOn: 1 }),
      }));
  };

  const weeklyData = getWeeklyData();
  const maxCount = Math.max(...weeklyData.map(w => w.count), 1);

  const now = new Date();

  // Calculer les statistiques globales et top clubs par période
  const getGlobalStats = () => {
    const nowDate = new Date();

    // Cette semaine (7 derniers jours)
    const weekAgo = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekTrainings = data.filter(t => new Date(t.date) >= weekAgo);
    const thisWeekCount = weekTrainings.length;

    // Ce mois (30 derniers jours)
    const monthAgo = new Date(nowDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthTrainings = data.filter(t => new Date(t.date) >= monthAgo);
    const thisMonthCount = monthTrainings.length;

    // Cette année (365 derniers jours)
    const yearAgo = new Date(nowDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const yearTrainings = data.filter(t => new Date(t.date) >= yearAgo);
    const thisYearCount = yearTrainings.length;

    // Top clubs par période
    const getTopClubs = (trainings: Training[], limit = 2) => {
      const clubCounts: { [key: string]: { count: number; logo: string | null; sport: string } } = {};

      trainings.forEach((training) => {
        const key = training.club_name || training.sport || 'Autre';
        if (!clubCounts[key]) {
          clubCounts[key] = {
            count: 0,
            logo: training.club_logo || null,
            sport: training.sport || 'Autre',
          };
        }
        clubCounts[key].count += 1;
      });

      return Object.entries(clubCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, limit);
    };

    return {
      thisWeekCount,
      thisMonthCount,
      thisYearCount,
      weekTopClubs: getTopClubs(weekTrainings, 2),
      monthTopClubs: getTopClubs(monthTrainings, 2),
      yearTopClubs: getTopClubs(yearTrainings, 2),
    };
  };

  const { thisWeekCount, thisMonthCount, thisYearCount, weekTopClubs, monthTopClubs, yearTopClubs } = getGlobalStats();

  // Préparer les points pour le graphique
  const chartData = weeklyData.map((entry, index) => {
    const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(weeklyData.length - 1, 1);
    const y = CHART_HEIGHT - PADDING_BOTTOM - ((entry.count / maxCount) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM));

    return { ...entry, x, y };
  });

  // Créer le path de la ligne
  const createPath = () => {
    if (chartData.length === 0) return '';

    let path = `M ${chartData[0].x} ${chartData[0].y}`;

    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];

      // Courbe de Bézier pour un rendu lisse
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.y;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Créer le path du gradient area
  const createAreaPath = () => {
    if (chartData.length === 0) return '';

    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];

    return `${linePath} L ${lastPoint.x} ${CHART_HEIGHT - PADDING_BOTTOM} L ${firstPoint.x} ${CHART_HEIGHT - PADDING_BOTTOM} Z`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Grande carte statistiques globales */}
      <View style={[styles.bigStatsCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.bigStatsTitle, { color: colors.textPrimary }]}>Statistiques</Text>

        <View style={styles.bigStatsRow}>
          {/* SEMAINE */}
          <View style={styles.bigStatItem}>
            <Text style={[styles.bigStatNumber, { color: isDark ? colors.accent : colors.textPrimary }]}>
              {thisWeekCount}
            </Text>
            <Text style={[styles.bigStatLabel, { color: colors.textMuted }]}>
              Cette semaine
            </Text>

            {/* Top clubs de la semaine */}
            <View style={styles.periodClubs}>
              {weekTopClubs.map(([name, { count, logo, sport }]) => {
                const logoSource = logo ? getClubLogoSource(logo) : null;
                const sportInfo = getSportIcon(sport);

                return (
                  <View key={name} style={styles.miniClubBadge}>
                    {logoSource ? (
                      <Image source={logoSource} style={styles.miniClubLogo} resizeMode="cover" />
                    ) : (
                      <View style={[styles.miniClubIconBg, { backgroundColor: sportInfo.color + '20' }]}>
                        <Text style={styles.miniClubIcon}>{sportInfo.icon}</Text>
                      </View>
                    )}
                    <Text style={[styles.miniClubCount, { color: colors.textSecondary }]}>
                      ×{count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.bigStatDivider, { backgroundColor: colors.border }]} />

          {/* MOIS */}
          <View style={styles.bigStatItem}>
            <Text style={[styles.bigStatNumber, { color: isDark ? colors.accent : colors.textPrimary }]}>
              {thisMonthCount}
            </Text>
            <Text style={[styles.bigStatLabel, { color: colors.textMuted }]}>
              Ce mois
            </Text>

            {/* Top clubs du mois */}
            <View style={styles.periodClubs}>
              {monthTopClubs.map(([name, { count, logo, sport }]) => {
                const logoSource = logo ? getClubLogoSource(logo) : null;
                const sportInfo = getSportIcon(sport);

                return (
                  <View key={name} style={styles.miniClubBadge}>
                    {logoSource ? (
                      <Image source={logoSource} style={styles.miniClubLogo} resizeMode="cover" />
                    ) : (
                      <View style={[styles.miniClubIconBg, { backgroundColor: sportInfo.color + '20' }]}>
                        <Text style={styles.miniClubIcon}>{sportInfo.icon}</Text>
                      </View>
                    )}
                    <Text style={[styles.miniClubCount, { color: colors.textSecondary }]}>
                      ×{count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.bigStatDivider, { backgroundColor: colors.border }]} />

          {/* ANNÉE */}
          <View style={styles.bigStatItem}>
            <Text style={[styles.bigStatNumber, { color: isDark ? colors.accent : colors.textPrimary }]}>
              {thisYearCount}
            </Text>
            <Text style={[styles.bigStatLabel, { color: colors.textMuted }]}>
              Cette année
            </Text>

            {/* Top clubs de l'année */}
            <View style={styles.periodClubs}>
              {yearTopClubs.map(([name, { count, logo, sport }]) => {
                const logoSource = logo ? getClubLogoSource(logo) : null;
                const sportInfo = getSportIcon(sport);

                return (
                  <View key={name} style={styles.miniClubBadge}>
                    {logoSource ? (
                      <Image source={logoSource} style={styles.miniClubLogo} resizeMode="cover" />
                    ) : (
                      <View style={[styles.miniClubIconBg, { backgroundColor: sportInfo.color + '20' }]}>
                        <Text style={styles.miniClubIcon}>{sportInfo.icon}</Text>
                      </View>
                    )}
                    <Text style={[styles.miniClubCount, { color: colors.textSecondary }]}>
                      ×{count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Graphique moderne avec courbe */}
      <TouchableOpacity
        style={[styles.chartCard, { backgroundColor: colors.backgroundElevated }]}
        activeOpacity={0.9}
        onPress={() => weeklyData.length > 0 && setShowModal(true)}
      >
        {/* Expand icon */}
        {weeklyData.length > 0 && (
          <View style={styles.expandIcon}>
            <Maximize2 size={16} color="#1F2937" opacity={0.9} />
          </View>
        )}

        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Entraînements par semaine
        </Text>

        {/* Période */}
        <View style={styles.periodRow}>
          {(['7j', '30j', '90j', 'year'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                { backgroundColor: period === p ? colors.accent : colors.backgroundElevated },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[
                styles.periodText,
                { color: period === p ? '#FFF' : colors.textPrimary },
              ]}>
                {p === 'year' ? 'Année' : p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {weeklyData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune donnée disponible
            </Text>
          </View>
        ) : (
          <View style={styles.chart}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.accent} stopOpacity="0.4" />
                  <Stop offset="0.5" stopColor={colors.accent} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Fond clair en mode sombre pour améliorer la visibilité */}
              {isDark && (
                <Rect
                  x={PADDING_LEFT - 5}
                  y={PADDING_TOP - 5}
                  width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT + 10}
                  height={CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM + 10}
                  rx={8}
                  ry={8}
                  fill="rgba(255, 255, 255, 0.06)"
                />
              )}

              {/* Zones d'intensité d'entraînement (en fond) */}
              {(() => {
                // Définir les zones d'entraînement recommandées
                const optimalMin = 3; // Minimum recommandé: 3 entraînements/semaine
                const optimalMax = 5; // Maximum recommandé: 5 entraînements/semaine
                const max = maxCount;

                const getYPosition = (count: number) => {
                  return PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * (1 - count / max));
                };

                const yOptimalMax = getYPosition(optimalMax);
                const yOptimalMin = getYPosition(optimalMin);
                const yTop = PADDING_TOP;
                const yBottom = CHART_HEIGHT - PADDING_BOTTOM;

                return (
                  <>
                    {/* Zone excellente (>5 entraînements) */}
                    {optimalMax < max && (
                      <Rect
                        x={PADDING_LEFT}
                        y={yTop}
                        width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                        height={Math.max(0, yOptimalMax - yTop)}
                        fill="#3B82F6"
                        opacity={0.08}
                      />
                    )}

                    {/* Zone optimale (3-5 entraînements) */}
                    <Rect
                      x={PADDING_LEFT}
                      y={Math.max(yTop, yOptimalMax)}
                      width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                      height={Math.max(0, Math.min(yBottom, yOptimalMin) - Math.max(yTop, yOptimalMax))}
                      fill="#10B981"
                      opacity={0.12}
                    />

                    {/* Zone faible (<3 entraînements) */}
                    <Rect
                      x={PADDING_LEFT}
                      y={Math.max(yTop, yOptimalMin)}
                      width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                      height={Math.max(0, yBottom - Math.max(yTop, yOptimalMin))}
                      fill="#F59E0B"
                      opacity={0.08}
                    />
                  </>
                );
              })()}

              {/* Lignes de grille horizontales */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * i) / 4;
                return (
                  <Rect
                    key={i}
                    x={PADDING_LEFT}
                    y={y}
                    width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                    height={1}
                    fill={colors.border}
                    opacity={0.3}
                  />
                );
              })}

              {/* Zone sous la courbe avec gradient */}
              <Path
                d={createAreaPath()}
                fill="url(#activityGradient)"
              />

              {/* Ligne de tendance */}
              <Path
                d={createPath()}
                stroke={colors.accent}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points sur la courbe */}
              {chartData.map((point, index) => (
                <React.Fragment key={index}>
                  {/* Cercle extérieur blanc */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={8}
                    fill="#FFFFFF"
                    opacity={0.95}
                  />
                  {/* Cercle intérieur avec couleur d'accent */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={5}
                    fill={colors.accent}
                    onPress={() => {
                      setSelectedPoint({
                        index,
                        count: point.count,
                        weekStart: point.weekStart,
                        weekEnd: point.weekEnd,
                        x: point.x,
                        y: point.y,
                      });

                      setTimeout(() => {
                        setSelectedPoint(null);
                      }, 3000);
                    }}
                  />
                </React.Fragment>
              ))}
            </Svg>

            {/* Labels Y (nombre d'entraînements) */}
            <View style={styles.yLabelsContainer}>
              {[maxCount, Math.floor(maxCount * 0.75), Math.floor(maxCount * 0.5), Math.floor(maxCount * 0.25), 0].map((value, index) => (
                <Text key={index} style={[styles.yLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
                  {value}
                </Text>
              ))}
            </View>

            {/* Labels X (dates de semaines) */}
            <View style={styles.xLabelsContainer}>
              {chartData.map((point, index) => (
                <View key={index} style={[styles.xLabelWrapper, { left: point.x - 30 }]}>
                  <Text style={[styles.xLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
                    {format(point.weekStart, 'd MMM', { locale: fr })}
                  </Text>
                  <Text style={[styles.xLabelSub, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
                    S{format(point.weekStart, 'ww', { locale: fr })}
                  </Text>
                </View>
              ))}
            </View>

            {/* Valeurs au-dessus des points */}
            {chartData.map((point, index) => (
              <View key={index} style={[styles.valueLabel, { left: point.x - 15, top: point.y - 28 }]}>
                <Text style={[styles.valueLabelText, { color: isDark ? colors.accent : colors.textPrimary }]}>
                  {point.count}
                </Text>
              </View>
            ))}

            {/* Tooltip */}
            {selectedPoint && (
              <View
                style={[
                  styles.tooltip,
                  {
                    left: selectedPoint.x - 60,
                    top: selectedPoint.y - 85,
                  },
                ]}
              >
                <View style={[styles.tooltipContent, { backgroundColor: '#1F2937', shadowColor: '#000' }]}>
                  <Text style={styles.tooltipValue}>
                    {selectedPoint.count} {selectedPoint.count > 1 ? 'entraînements' : 'entraînement'}
                  </Text>
                  <Text style={styles.tooltipDate}>
                    {format(selectedPoint.weekStart, 'd MMM', { locale: fr })} - {format(selectedPoint.weekEnd, 'd MMM', { locale: fr })}
                  </Text>
                </View>
                <View style={[styles.tooltipArrow, { borderTopColor: '#1F2937' }]} />
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* CETTE SEMAINE */}
      {(() => {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekTrainings = data.filter(t => new Date(t.date) >= weekAgo);
        const clubData: { [key: string]: { count: number; logo: string | null; sport: string } } = {};

        thisWeekTrainings.forEach((training) => {
          const key = training.club_name || training.sport || 'Autre';
          if (!clubData[key]) {
            clubData[key] = { count: 0, logo: training.club_logo || null, sport: training.sport || 'Autre' };
          }
          clubData[key].count += 1;
        });

        const sorted = Object.entries(clubData).sort(([, a], [, b]) => b.count - a.count);

        return (
          <View style={[styles.typesCard, { backgroundColor: colors.backgroundElevated }]}>
            <Text style={[styles.typesTitle, { color: colors.textPrimary }]}>Cette semaine</Text>
            {sorted.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun entraînement</Text>
            ) : (
              sorted.map(([name, { count, logo, sport }], index) => {
                const logoSource = logo ? getClubLogoSource(logo) : null;
                const sportInfo = getSportIcon(sport);
                return (
                  <View key={name} style={[styles.clubItem, index < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    {logoSource ? (
                      <Image source={logoSource} style={styles.clubLogoBig} resizeMode="cover" />
                    ) : (
                      <View style={[styles.sportIconBigBg, { backgroundColor: sportInfo.color + '20' }]}>
                        <Text style={styles.sportIconBig}>{sportInfo.icon}</Text>
                      </View>
                    )}
                    <View style={styles.clubInfoContainer}>
                      <Text style={[styles.clubName, { color: colors.textPrimary }]}>{name}</Text>
                      {logo && sport && <Text style={[styles.clubSport, { color: colors.textMuted }]}>{sport.toUpperCase()}</Text>}
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: colors.accent + '15' }]}>
                      <Text style={[styles.countMultiplier, { color: isDark ? colors.accent : colors.textPrimary }]}>×</Text>
                      <Text style={[styles.countNumber, { color: isDark ? colors.accent : colors.textPrimary }]}>{count}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        );
      })()}

      {/* CE MOIS */}
      {(() => {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const thisMonthTrainings = data.filter(t => new Date(t.date) >= monthAgo);
        const clubData: { [key: string]: { count: number; logo: string | null; sport: string } } = {};

        thisMonthTrainings.forEach((training) => {
          const key = training.club_name || training.sport || 'Autre';
          if (!clubData[key]) {
            clubData[key] = { count: 0, logo: training.club_logo || null, sport: training.sport || 'Autre' };
          }
          clubData[key].count += 1;
        });

        const sorted = Object.entries(clubData).sort(([, a], [, b]) => b.count - a.count);

        return (
          <View style={[styles.typesCard, { backgroundColor: colors.backgroundElevated }]}>
            <Text style={[styles.typesTitle, { color: colors.textPrimary }]}>Ce mois</Text>
            {sorted.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun entraînement</Text>
            ) : (
              sorted.map(([name, { count, logo, sport }], index) => {
                const logoSource = logo ? getClubLogoSource(logo) : null;
                const sportInfo = getSportIcon(sport);
                return (
                  <View key={name} style={[styles.clubItem, index < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    {logoSource ? (
                      <Image source={logoSource} style={styles.clubLogoBig} resizeMode="cover" />
                    ) : (
                      <View style={[styles.sportIconBigBg, { backgroundColor: sportInfo.color + '20' }]}>
                        <Text style={styles.sportIconBig}>{sportInfo.icon}</Text>
                      </View>
                    )}
                    <View style={styles.clubInfoContainer}>
                      <Text style={[styles.clubName, { color: colors.textPrimary }]}>{name}</Text>
                      {logo && sport && <Text style={[styles.clubSport, { color: colors.textMuted }]}>{sport.toUpperCase()}</Text>}
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: colors.accent + '15' }]}>
                      <Text style={[styles.countMultiplier, { color: isDark ? colors.accent : colors.textPrimary }]}>×</Text>
                      <Text style={[styles.countNumber, { color: isDark ? colors.accent : colors.textPrimary }]}>{count}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        );
      })()}

      {/* CETTE ANNÉE */}
      {(() => {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const thisYearTrainings = data.filter(t => new Date(t.date) >= yearAgo);
        const clubData: { [key: string]: { count: number; logo: string | null; sport: string } } = {};

        thisYearTrainings.forEach((training) => {
          const key = training.club_name || training.sport || 'Autre';
          if (!clubData[key]) {
            clubData[key] = { count: 0, logo: training.club_logo || null, sport: training.sport || 'Autre' };
          }
          clubData[key].count += 1;
        });

        const sorted = Object.entries(clubData).sort(([, a], [, b]) => b.count - a.count);

        return (
          <View style={[styles.typesCard, { backgroundColor: colors.backgroundElevated }]}>
            <Text style={[styles.typesTitle, { color: colors.textPrimary }]}>Cette année</Text>
            {sorted.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucun entraînement</Text>
            ) : (
              sorted.map(([name, { count, logo, sport }], index) => {
                const logoSource = logo ? getClubLogoSource(logo) : null;
                const sportInfo = getSportIcon(sport);
                return (
                  <View key={name} style={[styles.clubItem, index < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    {logoSource ? (
                      <Image source={logoSource} style={styles.clubLogoBig} resizeMode="cover" />
                    ) : (
                      <View style={[styles.sportIconBigBg, { backgroundColor: sportInfo.color + '20' }]}>
                        <Text style={styles.sportIconBig}>{sportInfo.icon}</Text>
                      </View>
                    )}
                    <View style={styles.clubInfoContainer}>
                      <Text style={[styles.clubName, { color: colors.textPrimary }]}>{name}</Text>
                      {logo && sport && <Text style={[styles.clubSport, { color: colors.textMuted }]}>{sport.toUpperCase()}</Text>}
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: colors.accent + '15' }]}>
                      <Text style={[styles.countMultiplier, { color: isDark ? colors.accent : colors.textPrimary }]}>×</Text>
                      <Text style={[styles.countNumber, { color: isDark ? colors.accent : colors.textPrimary }]}>{count}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        );
      })()}

      {/* Modal de détail */}
      {showModal && (
        <StatsDetailModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          title="Entraînements par semaine"
          subtitle={period === '7j' ? '7 derniers jours' : period === '30j' ? '30 derniers jours' : period === '90j' ? '90 derniers jours' : 'Année complète'}
          data={weeklyData.map((entry) => ({
            value: entry.count,
            label: format(entry.weekStart, 'd MMM', { locale: fr }),
            date: format(entry.weekStart, 'yyyy-MM-dd'),
          }))}
          color={colors.accent}
          unit="séances"
          icon={<DumbbellIcon size={24} color={colors.accent} />}
        />
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 150,
  },

  // Grande carte statistiques
  bigStatsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  bigStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  bigStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  bigStatNumber: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 8,
  },
  bigStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  bigStatDivider: {
    width: 1,
    height: 100,
    marginHorizontal: 8,
    opacity: 0.3,
  },
  periodClubs: {
    marginTop: 12,
    gap: 6,
    alignItems: 'center',
  },
  miniClubBadge: {
    alignItems: 'center',
    gap: 4,
  },
  miniClubLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  miniClubIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniClubIcon: {
    fontSize: 16,
  },
  miniClubCount: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Chart
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  expandIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  chart: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yLabelsContainer: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  xLabelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PADDING_BOTTOM,
  },
  xLabelWrapper: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    top: 8,
  },
  xLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  xLabelSub: {
    fontSize: 9,
    marginTop: 2,
  },
  valueLabel: {
    position: 'absolute',
    width: 30,
    alignItems: 'center',
  },
  valueLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Clubs de la semaine
  typesCard: {
    borderRadius: 16,
    padding: 16,
  },
  typesTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  clubLogoBig: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  sportIconBigBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportIconBig: {
    fontSize: 28,
  },
  clubInfoContainer: {
    flex: 1,
  },
  clubName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  clubSport: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 2,
  },
  countMultiplier: {
    fontSize: 18,
    fontWeight: '800',
  },
  countNumber: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  // Tooltip
  tooltip: {
    position: 'absolute',
    zIndex: 1000,
  },
  tooltipContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
});
