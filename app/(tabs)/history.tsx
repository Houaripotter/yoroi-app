import { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Scale, Flame, Dumbbell, Droplet, Activity, Gauge, Bone, Zap } from 'lucide-react-native';
import { InteractiveLineChart } from '@/components/InteractiveLineChart';
import { MetricSelector } from '@/components/MetricSelector';
import { SoftCard } from '@/components/SoftCard';
import { AnimatedCard } from '@/components/AnimatedCard';
import { MetricType, METRIC_CONFIGS } from '@/types/health';
import { supabase } from '../../lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

interface TanitaRecord {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  water?: number;
  muscleMass?: number;
  visceralFat?: number;
  metabolicAge?: number;
  boneMass?: number;
  bmr?: number;
}

export default function HistoryScreen() {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');
  const [records, setRecords] = useState<TanitaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistoryRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching history records:', error);
      setRecords([]);
    } else if (data) {
      setRecords(data as TanitaRecord[]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistoryRecords();
    }, [fetchHistoryRecords])
  );

  const screenWidth = Dimensions.get('window').width;
  const currentMetricConfig = METRIC_CONFIGS[selectedMetric];

  const chartData = useMemo(() => {
    return records
      .map((record) => {
        let value: number;
        switch (selectedMetric) {
          case 'weight':
            value = record.weight;
            break;
          case 'bodyFat':
            value = record.bodyFat || 0;
            break;
          case 'water':
            value = record.water || 0;
            break;
          case 'muscleMass':
            value = record.muscleMass || 0;
            break;
          default:
            value = record.weight;
        }
        return { date: record.date, value };
      })
      .reverse();
  }, [records, selectedMetric]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }

    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const calculateBodyFatKg = (weight: number, bodyFat: number) => {
    return (weight * bodyFat) / 100;
  };

  const calculateWaterKg = (weight: number, water: number) => {
    return (weight * water) / 100;
  };

  const renderRecord = ({ item }: { item: TanitaRecord }) => {
    const bodyFatKg = item.bodyFat ? calculateBodyFatKg(item.weight, item.bodyFat) : undefined;
    const waterKg = item.water ? calculateWaterKg(item.weight, item.water) : undefined;

    return (
      <View style={styles.recordCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.dateColumn}>{formatDate(item.date)}</Text>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.tableCell}>
            <View style={styles.labelRow}>
              <Scale size={10} color="#4ECDC4" strokeWidth={2.5} />
              <Text style={styles.cellLabel}>Poids</Text>
            </View>
            <Text style={[styles.cellValue, { color: '#4ECDC4' }]}>
              {item.weight.toFixed(1)} kg
            </Text>
          </View>

          {item.bodyFat !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Flame size={10} color="#FF9500" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>% Graisse</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#FF9500' }]}>
                {item.bodyFat.toFixed(1)}%
              </Text>
            </View>
          )}

          {item.muscleMass !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Dumbbell size={10} color="#5856D6" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>Muscle</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#5856D6' }]}>
                {item.muscleMass.toFixed(1)} kg
              </Text>
            </View>
          )}

          {item.water !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Droplet size={10} color="#32ADE6" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>% Eau</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#32ADE6' }]}>
                {item.water.toFixed(1)}%
              </Text>
            </View>
          )}

          {item.visceralFat !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Activity size={10} color="#FF3B30" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>Viscéral</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#FF3B30' }]}>
                {item.visceralFat}
              </Text>
            </View>
          )}

          {item.bmr !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Gauge size={10} color="#F59E0B" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>MB</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#F59E0B' }]}>
                {item.bmr} kcal
              </Text>
            </View>
          )}

          {item.boneMass !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Bone size={10} color="#A0AEC0" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>Masse Os.</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#A0AEC0' }]}>
                {item.boneMass.toFixed(1)} kg
              </Text>
            </View>
          )}

          {item.metabolicAge !== undefined && (
            <View style={styles.tableCell}>
              <View style={styles.labelRow}>
                <Zap size={10} color="#8E8E93" strokeWidth={2.5} />
                <Text style={styles.cellLabel}>Âge Métab.</Text>
              </View>
              <Text style={[styles.cellValue, { color: '#8E8E93' }]}>
                {item.metabolicAge} ans
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Chargement de l'historique...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Historique</Text>
          <Text style={styles.subtitle}>
            Suivi complet de vos métriques corporelles
          </Text>
        </View>

        {records.length > 0 ? (
          <>
            <AnimatedCard delay={100}>
              <SoftCard>
                <Text style={styles.sectionTitle}>ÉVOLUTION ({records.length} JOURS)</Text>
                <MetricSelector selected={selectedMetric} onSelect={setSelectedMetric} />
                <InteractiveLineChart
                  data={chartData}
                  width={screenWidth - 80}
                  color={currentMetricConfig.color}
                  unit={currentMetricConfig.unit}
                />
              </SoftCard>
            </AnimatedCard>

            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Mesures enregistrées</Text>
              <View style={styles.listContent}>
                {records.map((item) => (
                  <View key={item.id}>
                    {renderRecord({ item })}
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Aucune mesure enregistrée pour le moment.</Text>
            <Text style={styles.emptyStateSubtitle}>Enregistrez votre premier poids depuis l'onglet 'Saisie'.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1A202C',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#718096',
    letterSpacing: 1,
    marginBottom: 16,
  },
  historySection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  historyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A202C',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  listContent: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000", 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  dateColumn: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1A202C',
    letterSpacing: -0.3,
  },
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tableCell: {
    minWidth: '30%',
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center',
  },
});
