import { StyleSheet, Text, View } from 'react-native';
import { Calendar, Target } from 'lucide-react-native';
import { useI18n } from '@/lib/I18nContext';

interface Prediction {
  label: string;
  weight: number;
  date: string;
  isGoal?: boolean;
}

interface PredictionsListProps {
  predictions: Prediction[];
}

export function PredictionsList({ predictions }: PredictionsListProps) {
  const { t } = useI18n();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('predictions.title')}</Text>
      <View style={styles.list}>
        {predictions.map((prediction, index) => (
          <View
            key={index}
            style={[
              styles.item,
              prediction.isGoal && styles.goalItem,
            ]}
          >
            <View style={styles.iconContainer}>
              {prediction.isGoal ? (
                <Target size={18} color="#48DBFB" strokeWidth={2.5} />
              ) : (
                <Calendar size={18} color="#48DBFB" strokeWidth={2.5} />
              )}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{prediction.label}</Text>
              <Text style={styles.details}>
                {prediction.weight.toFixed(1)} kg · {prediction.date}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
    letterSpacing: 0.3,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(72, 219, 251, 0.08)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  goalItem: {
    backgroundColor: 'rgba(72, 219, 251, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(72, 219, 251, 0.3)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(72, 219, 251, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
    letterSpacing: 0.2,
  },
  details: {
    fontSize: 13,
    fontWeight: '600',
    color: '#48DBFB',
    letterSpacing: 0.1,
  },
});
