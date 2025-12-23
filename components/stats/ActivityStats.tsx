import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Training } from '@/lib/database';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 200;
const PADDING_LEFT = 35;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 50;

interface ActivityStatsProps {
  data: Training[];
}

export const ActivityStats: React.FC<ActivityStatsProps> = ({ data }) => {
  const { colors } = useTheme();

  // Calculer stats par semaine
  const getWeeklyData = () => {
    const weeks: { [week: string]: number } = {};

    data.forEach((training) => {
      const d = new Date(training.date);
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      weeks[weekKey] = (weeks[weekKey] || 0) + 1;
    });

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, count]) => ({
        week,
        count,
        weekStart: new Date(week),
        weekEnd: endOfWeek(new Date(week), { weekStartsOn: 1 }),
      }));
  };

  const weeklyData = getWeeklyData();
  const maxCount = Math.max(...weeklyData.map(w => w.count), 1);

  // Total du mois
  const now = new Date();
  const monthTotal = data.filter((training) => {
    const d = new Date(training.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Total de l'année
  const yearTotal = data.filter((training) => {
    const d = new Date(training.date);
    return d.getFullYear() === now.getFullYear();
  }).length;

  // Jours d'entraînement uniques
  const uniqueDays = new Set(data.map(t => t.date)).size;

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
    <View style={styles.container}>
      {/* Stats résumé */}
      <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElevated }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.accent }]}>
            {monthTotal}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Entraînements
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted, fontSize: 10 }]}>
            ce mois
          </Text>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {yearTotal}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Entraînements
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted, fontSize: 10 }]}>
            cette année
          </Text>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
            {uniqueDays}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
            Jours actifs
          </Text>
        </View>
      </View>

      {/* Graphique moderne avec courbe */}
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Entraînements par semaine
        </Text>
        <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
          8 dernières semaines
        </Text>

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
                  <Stop offset="0" stopColor={colors.accent} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
                </LinearGradient>
              </Defs>

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
                strokeWidth={3}
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
                    r={6}
                    fill="#FFFFFF"
                  />
                  {/* Cercle intérieur avec couleur d'accent */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={colors.accent}
                  />
                </React.Fragment>
              ))}
            </Svg>

            {/* Labels Y (nombre d'entraînements) */}
            <View style={styles.yLabelsContainer}>
              {[maxCount, Math.floor(maxCount * 0.75), Math.floor(maxCount * 0.5), Math.floor(maxCount * 0.25), 0].map((value, index) => (
                <Text key={index} style={[styles.yLabel, { color: colors.textMuted }]}>
                  {value}
                </Text>
              ))}
            </View>

            {/* Labels X (dates de semaines) */}
            <View style={styles.xLabelsContainer}>
              {chartData.map((point, index) => (
                <View key={index} style={[styles.xLabelWrapper, { left: point.x - 30 }]}>
                  <Text style={[styles.xLabel, { color: colors.textMuted }]}>
                    {format(point.weekStart, 'd MMM', { locale: fr })}
                  </Text>
                  <Text style={[styles.xLabelSub, { color: colors.textMuted }]}>
                    S{format(point.weekStart, 'ww', { locale: fr })}
                  </Text>
                </View>
              ))}
            </View>

            {/* Valeurs au-dessus des points */}
            {chartData.map((point, index) => (
              <View key={index} style={[styles.valueLabel, { left: point.x - 15, top: point.y - 28 }]}>
                <Text style={[styles.valueLabelText, { color: colors.accent }]}>
                  {point.count}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Par type d'activité */}
      <View style={[styles.typesCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.typesTitle, { color: colors.textPrimary }]}>
          PAR SPORT
        </Text>

        {(() => {
          const sportData: { [key: string]: { count: number; logos: string[]; clubNames: string[] } } = {};

          data.forEach((training) => {
            const sport = training.sport || 'Autre';
            if (!sportData[sport]) {
              sportData[sport] = { count: 0, logos: [], clubNames: [] };
            }
            sportData[sport].count += 1;

            // Collect club logos for this sport
            if (training.club_logo) {
              sportData[sport].logos.push(training.club_logo);
            }

            // Collect club names for this sport
            if (training.club_name) {
              sportData[sport].clubNames.push(training.club_name);
            }
          });

          const sorted = Object.entries(sportData)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5);

          return sorted.map(([sport, { count, logos, clubNames }], index) => {
            // Format sport name: ≤3 chars = UPPERCASE, >3 chars = First letter capitalized
            const formatSportName = (name: string) => {
              if (name.length <= 3) {
                return name.toUpperCase(); // JJB, MMA
              }
              return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(); // Musculation
            };

            // Get most common logo for this sport
            const logoCount: { [key: string]: number } = {};
            logos.forEach(logo => {
              logoCount[logo] = (logoCount[logo] || 0) + 1;
            });
            const mostCommonLogo = Object.entries(logoCount).sort(([, a], [, b]) => b - a)[0]?.[0];

            // Get most common club name for this sport
            const clubNameCount: { [key: string]: number } = {};
            clubNames.forEach(name => {
              clubNameCount[name] = (clubNameCount[name] || 0) + 1;
            });
            const mostCommonClubName = Object.entries(clubNameCount).sort(([, a], [, b]) => b - a)[0]?.[0];

            return (
              <View
                key={sport}
                style={[
                  styles.typeItem,
                  index < sorted.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={styles.typeNameContainer}>
                  {mostCommonLogo && (
                    <Image
                      source={{ uri: mostCommonLogo }}
                      style={styles.clubLogo}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.sportTextContainer}>
                    <Text style={[styles.typeName, { color: colors.textPrimary }]}>
                      {formatSportName(sport)}
                    </Text>
                    {mostCommonClubName && (
                      <Text style={[styles.clubNameText, { color: colors.textMuted }]}>
                        ({mostCommonClubName})
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.typeCount, { color: colors.accent }]}>
                  {count}
                </Text>
              </View>
            );
          });
        })()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 8,
  },

  // Chart
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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

  // Types
  typesCard: {
    borderRadius: 16,
    padding: 16,
  },
  typesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  typeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  clubLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  sportTextContainer: {
    flex: 1,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  clubNameText: {
    fontSize: 12,
    marginTop: 2,
  },
  typeCount: {
    fontSize: 18,
    fontWeight: '700',
  },
});
