import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Footprints } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PasTabProps {
  steps: number;
  calories: number;
  stepsHistory: { date: string; value: number }[];
  caloriesHistory: { date: string; value: number }[];
}

const getStepsColor = (value: number): string => {
  if (value >= 10000) return '#22C55E';
  if (value >= 7000) return '#06B6D4';
  if (value >= 4000) return '#F59E0B';
  return '#EF4444';
};

export const PasTab: React.FC<PasTabProps> = ({
  steps,
  calories,
  stepsHistory,
  caloriesHistory,
}) => {
  const { colors, isDark } = useTheme();

  const hasData = steps > 0 || stepsHistory.length > 0;

  if (!hasData) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
        <Footprints size={40} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Aucune donnee de pas disponible
        </Text>
      </View>
    );
  }

  // Trier par date plus recente
  const sortedHistory = [...stepsHistory].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View>
      {/* Hero - Grand compteur */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
        <Text style={[styles.heroValue, { color: '#6366F1' }]}>
          {steps > 0 ? steps.toLocaleString('fr-FR') : '--'}
        </Text>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
          pas aujourd'hui
        </Text>

        {/* Calories */}
        {calories > 0 && (
          <View style={[styles.caloriesRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[styles.caloriesLabel, { color: colors.textMuted }]}>Calories actives</Text>
            <Text style={[styles.caloriesValue, { color: '#F97316' }]}>
              {Math.round(calories).toLocaleString('fr-FR')} kcal
            </Text>
          </View>
        )}
      </View>

      {/* Graphique pas */}
      {stepsHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique des pas</Text>
          <ScrollableLineChart
            data={stepsHistory}
            color="#6366F1"
            unit="pas"
            height={160}
          />
        </View>
      )}

      {/* Graphique calories */}
      {caloriesHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique des calories</Text>
          <ScrollableLineChart
            data={caloriesHistory}
            color="#F97316"
            unit="kcal"
            height={160}
          />
        </View>
      )}

      {/* Liste des jours de pas */}
      {sortedHistory.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Historique ({sortedHistory.length} jours)
          </Text>
          {sortedHistory.map((day, index) => {
            let formattedDate = day.date;
            try {
              const d = parseISO(day.date);
              formattedDate = format(d, 'EEE d MMM', { locale: fr });
            } catch {}

            const stepsColor = getStepsColor(day.value);
            const isLast = index === sortedHistory.length - 1;
            const barWidth = Math.min(100, Math.max(5, (day.value / 12000) * 100));

            return (
              <View
                key={day.date + index}
                style={[
                  styles.dayRow,
                  {
                    backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                    borderBottomColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                  },
                  index === 0 && styles.dayRowFirst,
                  isLast && styles.dayRowLast,
                ]}
              >
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayDate, { color: colors.textPrimary }]}>
                    {formattedDate}
                  </Text>
                  {/* Mini barre de progression */}
                  <View style={[styles.miniBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={[styles.miniBarFill, { width: `${barWidth}%`, backgroundColor: stepsColor }]} />
                  </View>
                </View>
                <Text style={[styles.daySteps, { color: stepsColor }]}>
                  {day.value.toLocaleString('fr-FR')} pas
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  caloriesLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  caloriesValue: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayRowFirst: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dayRowLast: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomWidth: 0,
  },
  dayInfo: {
    flex: 1,
    marginRight: 12,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  miniBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  daySteps: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
