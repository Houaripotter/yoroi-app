import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Moon,
  Dumbbell,
  Flame,
  Target,
  Calendar,
  Zap,
} from 'lucide-react-native';
import Svg, { Path, Line, Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getWeeklyLoadStats, WeeklyLoadStats, getRiskColor } from '@/lib/trainingLoadService';
import { getWeights } from '@/lib/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [loadStats, setLoadStats] = useState<WeeklyLoadStats | null>(null);
  const [healthData, setHealthData] = useState<{ date: string; sleep: number; stress: number }[]>([]);
  const [weightData, setWeightData] = useState<{ date: string; weight: number }[]>([]);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      // Charger stats de charge
      const stats = await getWeeklyLoadStats();
      setLoadStats(stats);

      // Générer données santé (démo)
      const health = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        health.push({
          date,
          sleep: Math.min(100, Math.max(40, (isWeekend ? 80 : 65) + (Math.random() - 0.5) * 30)),
          stress: Math.min(100, Math.max(30, (isWeekend ? 75 : 55) + (Math.random() - 0.5) * 40)),
        });
      }
      setHealthData(health);

      // Charger poids
      const weights = await getWeights();
      const last14 = weights.slice(0, 14).reverse().map(w => ({
        date: w.date,
        weight: w.weight,
      }));
      setWeightData(last14);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const chartWidth = SCREEN_WIDTH - 48;
  const chartHeight = 140;
  const padding = { left: 35, right: 15, top: 15, bottom: 30 };

  // Générer path pour courbe
  const generatePath = (data: { value: number }[], minVal: number, maxVal: number) => {
    if (data.length < 2) return '';
    
    const xScale = (i: number) => padding.left + (i / (data.length - 1)) * (chartWidth - padding.left - padding.right);
    const yScale = (v: number) => padding.top + (1 - (v - minVal) / (maxVal - minVal || 1)) * (chartHeight - padding.top - padding.bottom);

    let path = `M ${xScale(0)} ${yScale(data[0].value)}`;
    for (let i = 1; i < data.length; i++) {
      const prevX = xScale(i - 1);
      const prevY = yScale(data[i - 1].value);
      const currX = xScale(i);
      const currY = yScale(data[i].value);
      path += ` C ${(prevX + currX) / 2} ${prevY}, ${(prevX + currX) / 2} ${currY}, ${currX} ${currY}`;
    }
    return path;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Statistiques</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
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

        {/* TENDANCE SANTÉ */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Activity size={18} color="#22D3EE" />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Tendance Santé</Text>
          </View>

          {healthData.length > 0 && (
            <>
              <View style={styles.chartContainer}>
                <Svg width={chartWidth} height={chartHeight}>
                  {/* Grille */}
                  {[0, 50, 100].map(v => (
                    <G key={v}>
                      <Line
                        x1={padding.left}
                        y1={padding.top + (1 - v / 100) * (chartHeight - padding.top - padding.bottom)}
                        x2={chartWidth - padding.right}
                        y2={padding.top + (1 - v / 100) * (chartHeight - padding.top - padding.bottom)}
                        stroke={colors.border}
                        strokeDasharray="4,4"
                      />
                      <SvgText
                        x={padding.left - 5}
                        y={padding.top + (1 - v / 100) * (chartHeight - padding.top - padding.bottom) + 4}
                        fontSize={9}
                        fill={colors.textMuted}
                        textAnchor="end"
                      >
                        {v}%
                      </SvgText>
                    </G>
                  ))}

                  {/* Courbe Stress/Calme */}
                  <Path
                    d={generatePath(healthData.map(d => ({ value: d.stress })), 0, 100)}
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth={2.5}
                  />

                  {/* Courbe Sommeil */}
                  <Path
                    d={generatePath(healthData.map(d => ({ value: d.sleep })), 0, 100)}
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                  />

                  {/* Labels jours */}
                  {healthData.map((d, i) => {
                    const x = padding.left + (i / (healthData.length - 1)) * (chartWidth - padding.left - padding.right);
                    return (
                      <SvgText
                        key={i}
                        x={x}
                        y={chartHeight - 8}
                        fontSize={9}
                        fill={colors.textMuted}
                        textAnchor="middle"
                      >
                        {format(new Date(d.date), 'EEE', { locale: fr }).slice(0, 2)}
                      </SvgText>
                    );
                  })}
                </Svg>
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                  <Moon size={12} color="#8B5CF6" />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Sommeil</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22D3EE' }]} />
                  <Activity size={12} color="#22D3EE" />
                  <Text style={[styles.legendText, { color: colors.textMuted }]}>Calme</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ÉVOLUTION POIDS */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Target size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Évolution Poids</Text>
          </View>

          {weightData.length > 1 && (
            <View style={styles.chartContainer}>
              <Svg width={chartWidth} height={chartHeight}>
                {(() => {
                  const weights = weightData.map(w => w.weight);
                  const minW = Math.min(...weights) - 1;
                  const maxW = Math.max(...weights) + 1;

                  return (
                    <>
                      {/* Grille */}
                      {[minW, (minW + maxW) / 2, maxW].map((v, idx) => (
                        <G key={idx}>
                          <Line
                            x1={padding.left}
                            y1={padding.top + (1 - (v - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom)}
                            x2={chartWidth - padding.right}
                            y2={padding.top + (1 - (v - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom)}
                            stroke={colors.border}
                            strokeDasharray="4,4"
                          />
                          <SvgText
                            x={padding.left - 5}
                            y={padding.top + (1 - (v - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom) + 4}
                            fontSize={9}
                            fill={colors.textMuted}
                            textAnchor="end"
                          >
                            {v.toFixed(0)}
                          </SvgText>
                        </G>
                      ))}

                      {/* Courbe */}
                      <Path
                        d={generatePath(weights.map(w => ({ value: w })), minW, maxW)}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth={2.5}
                      />

                      {/* Points */}
                      {weights.map((w, i) => {
                        const x = padding.left + (i / (weights.length - 1)) * (chartWidth - padding.left - padding.right);
                        const y = padding.top + (1 - (w - minW) / (maxW - minW)) * (chartHeight - padding.top - padding.bottom);
                        return <Circle key={i} cx={x} cy={y} r={4} fill="#10B981" />;
                      })}
                    </>
                  );
                })()}
              </Svg>
            </View>
          )}

          {weightData.length <= 1 && (
            <Text style={[styles.noData, { color: colors.textMuted }]}>
              Pas assez de données pour afficher le graphique
            </Text>
          )}
        </View>

        {/* RÉSUMÉ HEBDO */}
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color={colors.gold} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Cette Semaine</Text>
          </View>

          <View style={styles.weekSummary}>
            <View style={styles.summaryItem}>
              <Dumbbell size={20} color={colors.accent} />
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {loadStats?.sessionsCount || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Séances</Text>
            </View>
            <View style={styles.summaryItem}>
              <Zap size={20} color="#F59E0B" />
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {loadStats?.averageRPE?.toFixed(1) || '0'}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>RPE Moyen</Text>
            </View>
            <View style={styles.summaryItem}>
              <Activity size={20} color="#22D3EE" />
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {loadStats?.totalDuration || 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Minutes</Text>
            </View>
          </View>
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
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noData: {
    textAlign: 'center',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  weekSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

