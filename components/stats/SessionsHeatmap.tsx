// ============================================
// SESSIONS HEATMAP
// Grille 365 jours style GitHub. Chaque case = un jour.
// Couleur selon l'intensité d'entraînement de ce jour.
// Effet visuel : voir d'un coup d'œil sa régularité sur l'année.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { format, parseISO, startOfDay, subDays, addDays, getDay, getMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrainingPoint {
  date: string;
  duration?: number;
  duration_minutes?: number;
  intensity?: number;
}

interface SessionsHeatmapProps {
  trainings: TrainingPoint[];
  /** Nombre de jours à afficher en arrière (défaut 365) */
  days?: number;
  /** Couleur de base (défaut accent du thème) */
  baseColor?: string;
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const ROWS = 7; // jours de la semaine

const SessionsHeatmapInner: React.FC<SessionsHeatmapProps> = ({
  trainings,
  days = 365,
  baseColor,
}) => {
  const { colors, isDark } = useTheme();
  const accent = baseColor || colors.accent || '#3B82F6';

  // Construit une Map<dateISO, intensity> agrégeant les durées du jour
  const intensityByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trainings) {
      try {
        const d = format(parseISO(t.date), 'yyyy-MM-dd');
        const dur = (t.duration_minutes || t.duration || 0);
        // Score = durée en minutes, capé à 180 (3h+ = max)
        const score = Math.min(dur, 180);
        map.set(d, (map.get(d) || 0) + score);
      } catch { /* ignore */ }
    }
    return map;
  }, [trainings]);

  // Génère les cellules : on parcourt jour par jour de today à today - days
  // Organisé en colonnes (semaines) × 7 rows (lundi → dimanche)
  const { columns, monthLabels, totalSessions } = useMemo(() => {
    const today = startOfDay(new Date());
    const start = subDays(today, days - 1);
    // On commence à la semaine de start, en lundi
    const startDayOfWeek = getDay(start); // 0=dimanche, 1=lundi
    const offsetMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    const gridStart = subDays(start, offsetMonday);

    const cols: Array<Array<{ date: Date; iso: string; score: number; isFuture: boolean }>> = [];
    const months: Array<{ col: number; label: string }> = [];
    let lastMonth = -1;
    let totalCount = 0;

    let cursor = gridStart;
    let weekIndex = 0;
    while (cursor <= today || weekIndex === 0) {
      const week: Array<{ date: Date; iso: string; score: number; isFuture: boolean }> = [];
      for (let r = 0; r < 7; r++) {
        const d = addDays(cursor, r);
        const iso = format(d, 'yyyy-MM-dd');
        const score = intensityByDay.get(iso) || 0;
        const isFuture = d > today;
        if (score > 0) totalCount++;
        week.push({ date: d, iso, score, isFuture });

        // Label de mois sur la 1ère ligne (lundi) du début de chaque mois
        if (r === 0) {
          const m = getMonth(d);
          if (m !== lastMonth && d <= today) {
            months.push({ col: weekIndex, label: format(d, 'MMM', { locale: fr }) });
            lastMonth = m;
          }
        }
      }
      cols.push(week);
      cursor = addDays(cursor, 7);
      weekIndex++;
      if (weekIndex > 60) break; // safety
    }

    return { columns: cols, monthLabels: months, totalSessions: totalCount };
  }, [intensityByDay, days]);

  // Mapping intensité → couleur. Fond blanc pour la carte → on utilise des nuances
  // qui contrastent avec du blanc (pas du transparent qui dépend du parent).
  const cellColor = (score: number, isFuture: boolean): string => {
    if (isFuture) return '#F3F4F6'; // gris très clair (pas invisible)
    if (score === 0) return '#E5E7EB'; // gris clair visible sur blanc
    // 4 niveaux d'intensité avec opacité sur l'accent
    if (score < 30) return accent + '55';
    if (score < 60) return accent + '88';
    if (score < 120) return accent + 'CC';
    return accent;
  };

  // Fond blanc forcé → textes contrastés (ne pas utiliser colors.textPrimary qui est
  // blanc en dark mode et donc invisible sur notre fond blanc)
  const TITLE_COLOR = '#0F172A';
  const MUTED_COLOR = '#64748B';

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: TITLE_COLOR }]}>Activité sur 1 an</Text>
        <Text style={[styles.subtitle, { color: MUTED_COLOR }]}>
          {totalSessions} jour{totalSessions > 1 ? 's' : ''} actif{totalSessions > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          {/* Labels de mois */}
          <View style={styles.monthsRow}>
            {monthLabels.map((m, i) => (
              <Text
                key={i}
                style={[
                  styles.monthLabel,
                  {
                    color: MUTED_COLOR,
                    left: m.col * (CELL_SIZE + CELL_GAP),
                  },
                ]}
              >
                {m.label.toUpperCase()}
              </Text>
            ))}
          </View>

          {/* Grille */}
          <View style={styles.grid}>
            {columns.map((week, ci) => (
              <View key={ci} style={styles.weekColumn}>
                {week.map((cell, ri) => (
                  <View
                    key={ri}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: cellColor(cell.score, cell.isFuture),
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Légende */}
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Moins</Text>
        <View style={styles.legendCells}>
          {[0, 30, 60, 120, 180].map((s, i) => (
            <View
              key={i}
              style={[styles.legendCell, { backgroundColor: cellColor(s, false) }]}
            />
          ))}
        </View>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Plus</Text>
      </View>
    </View>
  );
};

export const SessionsHeatmap = React.memo(SessionsHeatmapInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingRight: 12,
  },
  monthsRow: {
    height: 14,
    position: 'relative',
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  weekColumn: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 12,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  legendCells: {
    flexDirection: 'row',
    gap: 3,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
