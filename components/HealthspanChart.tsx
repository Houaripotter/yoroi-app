import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { ChevronRight, Moon, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DayData {
  date: string;
  sleep: number;    // 0-100
  stress: number;   // 0-100 (inverse: 100 = calme, 0 = stressé)
}

interface HealthspanChartProps {
  days?: number;
}

export const HealthspanChart: React.FC<HealthspanChartProps> = ({ days = 7 }) => {
  const { colors } = useTheme();
  const [data, setData] = useState<DayData[]>([]);

  const chartWidth = SCREEN_WIDTH - 60;
  const chartHeight = 100;
  const padding = { left: 25, right: 10, top: 10, bottom: 25 };

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      // Générer des données réalistes pour la démo
      // En production, on récupérerait depuis la base
      const generatedData: DayData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        
        // Simuler des patterns réalistes
        const dayOfWeek = new Date(date).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Sommeil: meilleur le weekend, aléatoire en semaine
        const baseSleep = isWeekend ? 80 : 65;
        const sleep = Math.min(100, Math.max(30, baseSleep + (Math.random() - 0.5) * 30));
        
        // Stress inversé: calme = haut, stressé = bas
        // Plus calme le weekend
        const baseStress = isWeekend ? 75 : 55;
        const stress = Math.min(100, Math.max(20, baseStress + (Math.random() - 0.5) * 40));
        
        generatedData.push({ date, sleep, stress });
      }
      
      setData(generatedData);
    } catch (error) {
      console.error('Erreur chargement données santé:', error);
    }
  };

  if (data.length === 0) {
    return null;
  }

  const xScale = (index: number) => 
    padding.left + (index / (data.length - 1)) * (chartWidth - padding.left - padding.right);
  
  const yScale = (value: number) =>
    padding.top + (1 - value / 100) * (chartHeight - padding.top - padding.bottom);

  // Générer les paths pour les courbes
  const generatePath = (values: number[]) => {
    if (values.length < 2) return '';
    
    let path = `M ${xScale(0)} ${yScale(values[0])}`;
    
    for (let i = 1; i < values.length; i++) {
      // Courbe de Bézier pour lisser
      const prevX = xScale(i - 1);
      const prevY = yScale(values[i - 1]);
      const currX = xScale(i);
      const currY = yScale(values[i]);
      
      const cp1x = prevX + (currX - prevX) / 2;
      const cp1y = prevY;
      const cp2x = prevX + (currX - prevX) / 2;
      const cp2y = currY;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currX} ${currY}`;
    }
    
    return path;
  };

  const sleepPath = generatePath(data.map(d => d.sleep));
  const stressPath = generatePath(data.map(d => d.stress));

  // Moyennes
  const avgSleep = Math.round(data.reduce((sum, d) => sum + d.sleep, 0) / data.length);
  const avgStress = Math.round(data.reduce((sum, d) => sum + d.stress, 0) / data.length);

  // Tendance (comparer dernière moitié vs première moitié)
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));
  const firstAvg = (firstHalf.reduce((s, d) => s + d.sleep + d.stress, 0)) / (firstHalf.length * 2);
  const secondAvg = (secondHalf.reduce((s, d) => s + d.sleep + d.stress, 0)) / (secondHalf.length * 2);
  
  const trend = secondAvg > firstAvg * 1.05 ? 'up' : secondAvg < firstAvg * 0.95 ? 'down' : 'stable';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : colors.textMuted;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.backgroundCard }]}
      onPress={() => router.push('/stats')}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Activity size={16} color={colors.accent} />
          <Text style={[styles.title, { color: colors.textMuted }]}>TENDANCE SANTÉ</Text>
        </View>
        <View style={styles.headerRight}>
          <TrendIcon size={14} color={trendColor} />
          <ChevronRight size={14} color={colors.textMuted} />
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
              <Stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Lignes horizontales de grille */}
          {[0, 50, 100].map((val) => (
            <Line
              key={val}
              x1={padding.left}
              y1={yScale(val)}
              x2={chartWidth - padding.right}
              y2={yScale(val)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          ))}

          {/* Courbe stress (calme) */}
          <Path
            d={stressPath}
            fill="none"
            stroke="#22D3EE"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Courbe sommeil */}
          <Path
            d={sleepPath}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Points sur les courbes */}
          {data.map((d, i) => (
            <G key={i}>
              <Circle
                cx={xScale(i)}
                cy={yScale(d.sleep)}
                r={3}
                fill="#8B5CF6"
              />
              <Circle
                cx={xScale(i)}
                cy={yScale(d.stress)}
                r={3}
                fill="#22D3EE"
              />
            </G>
          ))}
        </Svg>

        {/* Labels jours */}
        <View style={[styles.xLabels, { paddingLeft: padding.left }]}>
          {data.map((d, i) => (
            <Text 
              key={i} 
              style={[
                styles.xLabel, 
                { color: colors.textMuted, width: (chartWidth - padding.left - padding.right) / (data.length - 1) }
              ]}
            >
              {format(new Date(d.date), 'EEE', { locale: fr }).slice(0, 2)}
            </Text>
          ))}
        </View>
      </View>

      {/* Légende et moyennes */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <Moon size={12} color="#8B5CF6" />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Sommeil</Text>
          <Text style={[styles.legendValue, { color: '#8B5CF6' }]}>{avgSleep}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22D3EE' }]} />
          <Activity size={12} color="#22D3EE" />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Calme</Text>
          <Text style={[styles.legendValue, { color: '#22D3EE' }]}>{avgStress}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  chartContainer: {
    marginBottom: 8,
  },
  xLabels: {
    flexDirection: 'row',
    marginTop: 4,
  },
  xLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default HealthspanChart;

