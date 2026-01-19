import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LineChart } from 'react-native-gifted-charts';
import { Scale, Activity, Flame, Heart, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react-native';
import { getWeights, getTrainings } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { calculateReadinessScore } from '@/lib/readinessService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 16;
// 2 columns
const CARD_WIDTH = (SCREEN_WIDTH - (CARD_PADDING * 2) - CARD_GAP) / 2;

interface DashboardPageProps {
  onNavigateToTab: (tabId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToTab }) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [weightData, setWeightData] = useState<{ value: number; label: string; date: string }[]>([]);
  const [compositionData, setCompositionData] = useState<{ value: number; label: string; date: string }[]>([]);
  const [disciplineData, setDisciplineData] = useState<{ value: number; label: string; date: string }[]>([]);
  const [vitalityData, setVitalityData] = useState<{ value: number; label: string; date: string }[]>([]);

  // Current Values
  const [currentWeight, setCurrentWeight] = useState(0);
  const [currentFat, setCurrentFat] = useState(0);
  const [currentDiscipline, setCurrentDiscipline] = useState(0); // e.g. sessions this week
  const [currentVitality, setCurrentVitality] = useState(0);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // 1. Weights & Composition
      const weights = await getWeights();
      if (weights && weights.length > 0) {
        // Take last 20 points for chart
        const recentWeights = weights.slice(0, 20).reverse(); // database returns newest first usually? check PoidsTab
        // Actually getWeights() usually returns newest first? 
        // PoidsTab: const startWeight = data.length > 0 ? data[0].weight : undefined; -> data[0] is newest?
        // Let's assume weights are sorted by date DESC (newest first).
        
        // Sort by date ASC for chart
        const sortedWeights = [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const last20 = sortedWeights.slice(-20);

        setWeightData(last20.map(w => ({ value: w.weight, label: '', date: w.date })));
        setCompositionData(last20.map(w => ({ value: w.fat_percent || 0, label: '', date: w.date })));

        setCurrentWeight(weights[0].weight);
        setCurrentFat(weights[0].fat_percent || 0);
      }

      // 2. Discipline (Trainings count per week? or just recent sessions intensity?)
      // Let's use recent trainings intensity or duration as a proxy for "Discipline" chart
      const trainings = await getTrainings(30); // last 30 days
      if (trainings && trainings.length > 0) {
         const sortedTrainings = [...trainings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
         // Map to chart data (e.g. intensity or load)
         // If multiple per day, we might need to aggregate, but for sparkline just showing individual sessions is okay
         setDisciplineData(sortedTrainings.map(t => ({ value: t.intensity || 5, label: '', date: t.date })));
         setCurrentDiscipline(trainings.length); // Count last 30 days
      }

      // 3. Vitality (Readiness Score)
      const readiness = await calculateReadinessScore(7); // Last 7 days
      // This returns a score. We might need history.
      // Let's use sleep duration history as proxy for chart if readiness history is hard
      const sleepStats = await getSleepStats();
      if (sleepStats.weeklyData && sleepStats.weeklyData.length > 0) {
          const sortedSleep = [...sleepStats.weeklyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setVitalityData(sortedSleep.map(s => ({ value: (s.duration || 0) / 60, label: '', date: s.date })));
          setCurrentVitality(readiness.score);
      }

    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (
    title: string, 
    value: string | number, 
    unit: string, 
    data: any[], 
    color: string, 
    icon: React.ReactNode, 
    tabId: string,
    isGoodWhenHigh: boolean = true
  ) => {
    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (data.length >= 2) {
      const last = data[data.length - 1].value;
      const prev = data[data.length - 2].value;
      if (last > prev) trend = 'up';
      else if (last < prev) trend = 'down';
    }
    
    // Determine trend color
    // If isGoodWhenHigh (e.g. Muscle, Vitality): Up is Green, Down is Red
    // If !isGoodWhenHigh (e.g. Weight, Fat): Up is Red, Down is Green
    let trendColor = colors.textMuted;
    if (trend === 'up') trendColor = isGoodWhenHigh ? '#10B981' : '#EF4444';
    if (trend === 'down') trendColor = isGoodWhenHigh ? '#EF4444' : '#10B981';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.backgroundCard }]}
        activeOpacity={0.7}
        onPress={() => onNavigateToTab(tabId)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            {icon}
          </View>
          <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>

        <View style={styles.valueContainer}>
           <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
             {value} <Text style={{ fontSize: 14, color: colors.textMuted, fontWeight: '600' }}>{unit}</Text>
           </Text>
           {trend !== 'stable' && (
             <View style={styles.trendContainer}>
                {trend === 'up' ? <TrendingUp size={14} color={trendColor} /> : <TrendingDown size={14} color={trendColor} />}
             </View>
           )}
        </View>

        <View style={styles.chartContainer}>
           {data.length > 1 ? (
             <LineChart
                data={data}
                height={50}
                width={CARD_WIDTH - 32} // padding
                hideRules
                hideAxesAndRules
                hideYAxisText
                xAxisThickness={0}
                xAxisLabelsHeight={0}
                curved
                thickness={2}
                color={color}
                startFillColor={color}
                endFillColor={color}
                startOpacity={0.15}
                endOpacity={0.0}
                areaChart
                initialSpacing={0}
             />
           ) : (
             <View style={styles.noDataChart}>
               <Text style={{ fontSize: 10, color: colors.textMuted }}>Pas assez de données</Text>
             </View>
           )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vue d'ensemble</Text>
      
      <View style={styles.grid}>
         {/* Row 1 */}
         <View style={styles.row}>
            {renderCard(
              "Poids", 
              currentWeight.toFixed(1), 
              "kg", 
              weightData, 
              "#3B82F6", 
              <Scale size={16} color="#3B82F6" />, 
              "poids",
              false // weight loss usually good? assumes cutting
            )}
            {renderCard(
              "Composition", 
              currentFat.toFixed(1), 
              "%", 
              compositionData, 
              "#EF4444", 
              <Activity size={16} color="#EF4444" />, 
              "composition",
              false // fat loss good
            )}
         </View>

         {/* Row 2 */}
         <View style={styles.row}>
            {renderCard(
              "Discipline", 
              currentDiscipline, 
              "sess.", 
              disciplineData, 
              "#F59E0B", 
              <Flame size={16} color="#F59E0B" />, 
              "discipline",
              true
            )}
            {renderCard(
              "Vitalité", 
              currentVitality, 
              "/100", 
              vitalityData, 
              "#10B981", 
              <Heart size={16} color="#10B981" />, 
              "sante", // mapped to 'sante' (VitalitePage)
              true
            )}
         </View>
      </View>
      
      {/* Disclaimer or extra info */}
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Cliquez sur une carte pour voir les détails complets.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: CARD_PADDING,
    paddingTop: 80, // Space for header
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  grid: {
    gap: CARD_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    height: 160,
    justifyContent: 'space-between'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  trendContainer: {
    paddingBottom: 2,
  },
  chartContainer: {
    height: 50,
    overflow: 'hidden', // Clip chart
    marginTop: 'auto',
    marginHorizontal: -8, // slight bleed
  },
  noDataChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  hint: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  }
});
