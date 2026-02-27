import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface CalendarWeekStripProps {
  /** Override accent color for active day circle */
  accentColor?: string;
}

export const CalendarWeekStrip: React.FC<CalendarWeekStripProps> = ({
  accentColor,
}) => {
  const { colors, isDark } = useTheme();
  const accent = accentColor || (isDark ? '#6EE7A0' : '#4ADE80');

  const { dayLabels, dates, todayIndex } = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    const dts: number[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dts.push(d.getDate());
    }

    return { dayLabels: labels, dates: dts, todayIndex: dayOfWeek };
  }, []);

  return (
    <View style={styles.row}>
      {dayLabels.map((label, i) => {
        const isToday = i === todayIndex;
        return (
          <View key={i} style={styles.day}>
            <Text
              style={[
                styles.dayLabel,
                { color: isToday ? (isDark ? '#FFF' : '#111') : (isDark ? colors.textMuted : '#9CA3AF') },
                isToday && { fontWeight: '700' },
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.circle,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB',
                  backgroundColor: 'transparent',
                },
                isToday && { backgroundColor: accent, borderColor: accent },
              ]}
            >
              <Text
                style={[
                  styles.date,
                  { color: isDark ? colors.text : '#374151' },
                  isToday && { color: '#FFF', fontWeight: '800' },
                ]}
              >
                {dates[i]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  day: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CalendarWeekStrip;
