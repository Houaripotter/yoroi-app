// ============================================
// PERSONAL RECORDS CARD
// Affiche les 4 records personnels de l'utilisateur :
// - Séance la plus longue
// - Plus calorique
// - Plus haute intensité (RPE)
// - Meilleure note technique
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '@/lib/ThemeContext';
import { Trophy, Clock, Flame, Zap, Star } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { getSportName, getSportColor } from '@/lib/sports';

interface TrainingPoint {
  id?: number;
  date: string;
  sport?: string;
  duration?: number;
  duration_minutes?: number;
  calories?: number;
  intensity?: number;
  technique_rating?: number;
}

interface PersonalRecordsCardProps {
  trainings: TrainingPoint[];
}

interface Record {
  id: string;
  label: string;
  value: string;
  sport: string;
  date: string;
  trainingId?: number;
  icon: React.ComponentType<any>;
  color: string;
}

const PersonalRecordsCardInner: React.FC<PersonalRecordsCardProps> = ({ trainings }) => {
  const { colors, isDark, screenText } = useTheme();

  const records = useMemo((): Record[] => {
    if (!trainings || trainings.length === 0) return [];

    // Helpers : trouve le max selon une fonction d'extraction
    const findMax = (extractor: (t: TrainingPoint) => number): TrainingPoint | null => {
      let best: TrainingPoint | null = null;
      let bestVal = -Infinity;
      for (const t of trainings) {
        const v = extractor(t);
        if (v > bestVal && v > 0) {
          bestVal = v;
          best = t;
        }
      }
      return best;
    };

    const formatDur = (min: number) => {
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `${m}min`;
    };
    const formatDate = (d: string) => {
      try { return format(parseISO(d), 'd MMM yyyy', { locale: fr }); } catch { return d; }
    };

    const longest = findMax(t => t.duration_minutes || t.duration || 0);
    const mostCalorific = findMax(t => t.calories || 0);
    const mostIntense = findMax(t => t.intensity || 0);
    const bestTechnique = findMax(t => t.technique_rating || 0);

    const out: Record[] = [];
    if (longest) {
      const dur = longest.duration_minutes || longest.duration || 0;
      out.push({
        id: 'longest',
        label: 'Plus longue',
        value: formatDur(dur),
        sport: getSportName(longest.sport || ''),
        date: formatDate(longest.date),
        trainingId: longest.id,
        icon: Clock,
        color: '#3B82F6',
      });
    }
    if (mostCalorific && (mostCalorific.calories || 0) > 0) {
      out.push({
        id: 'kcal',
        label: 'Plus calorique',
        value: `${Math.round(mostCalorific.calories!)} kcal`,
        sport: getSportName(mostCalorific.sport || ''),
        date: formatDate(mostCalorific.date),
        trainingId: mostCalorific.id,
        icon: Flame,
        color: '#F97316',
      });
    }
    if (mostIntense && (mostIntense.intensity || 0) > 0) {
      out.push({
        id: 'intensity',
        label: 'Plus intense',
        value: `${mostIntense.intensity}/10 RPE`,
        sport: getSportName(mostIntense.sport || ''),
        date: formatDate(mostIntense.date),
        trainingId: mostIntense.id,
        icon: Zap,
        color: '#EF4444',
      });
    }
    if (bestTechnique && (bestTechnique.technique_rating || 0) > 0) {
      out.push({
        id: 'technique',
        label: 'Meilleure technique',
        value: `${bestTechnique.technique_rating}/5`,
        sport: getSportName(bestTechnique.sport || ''),
        date: formatDate(bestTechnique.date),
        trainingId: bestTechnique.id,
        icon: Star,
        color: '#F59E0B',
      });
    }
    return out;
  }, [trainings]);

  if (records.length === 0) return null;

  const handlePress = (trainingId?: number) => {
    if (!trainingId) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    router.push(`/workout-detail?id=${trainingId}` as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Trophy size={16} color={screenText} strokeWidth={2.5} />
        <Text style={[styles.title, { color: screenText }]}>Tes records personnels</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        snapToInterval={210}
        decelerationRate="fast"
      >
        {records.map(r => {
          const Icon = r.icon;
          return (
            <TouchableOpacity
              key={r.id}
              activeOpacity={0.85}
              onPress={() => handlePress(r.trainingId)}
              style={[
                styles.card,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: r.color + '50',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Record ${r.label} : ${r.value} en ${r.sport} le ${r.date}`}
            >
              <View style={[styles.iconBox, { backgroundColor: r.color + '20' }]}>
                <Icon size={18} color={r.color} strokeWidth={2.5} />
              </View>
              <Text style={[styles.recordLabel, { color: '#64748B' }]}>{r.label}</Text>
              <Text style={[styles.recordValue, { color: r.color }]}>{r.value}</Text>
              <Text style={[styles.recordMeta, { color: '#475569' }]} numberOfLines={1}>
                {r.sport}, {r.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const PersonalRecordsCard = React.memo(PersonalRecordsCardInner);

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 200,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recordValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
});
