import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, TrendingDown, TrendingUp, Award } from 'lucide-react-native';
import { MonthStats } from '@/lib/social-cards/useMonthStats';
import { ThemeColors } from '@/lib/ThemeContext';

// ============================================
// MONTHLY RECAP CARD - Récap mensuel avec calendrier
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface MonthlyRecapCardProps {
  stats: MonthStats;
  format: 'stories' | 'square';
  colors: ThemeColors;
  username?: string;
}

export const MonthlyRecapCard = React.memo(forwardRef<View, MonthlyRecapCardProps>(
  ({ stats, format, colors, username }, ref) => {
    const isStories = format === 'stories';

    // Dimensions adaptées au format
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;
    const heroFontSize = isStories ? 64 : 52;
    const gap = isStories ? 14 : 10;

    // Générer la grille du calendrier (7 colonnes × N lignes)
    const renderCalendar = () => {
      type CalendarDay = MonthStats['calendar'][number];
      const weeks: (CalendarDay | null)[][] = [];
      const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

      // Calculer le jour de la semaine du 1er du mois (0 = Dimanche, 1 = Lundi, ...)
      const firstDayOfWeek = new Date(stats.year, stats.month, 1).getDay();
      // Convertir Dimanche=0 en Lundi=0, Dimanche=6
      const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

      // Ajouter des jours vides au début si le mois ne commence pas un lundi
      const calendar = [...Array(adjustedFirstDay).fill(null), ...stats.calendar];

      // Diviser en semaines (7 jours)
      for (let i = 0; i < calendar.length; i += 7) {
        weeks.push(calendar.slice(i, i + 7));
      }

      return (
        <View style={styles.calendarContainer}>
          {/* Headers des jours */}
          <View style={styles.calendarHeader}>
            {daysOfWeek.map((day, index) => (
              <Text key={index} style={[styles.dayHeader, { color: colors.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Grille des jours */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.calendarWeek}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  // Jour vide (padding)
                  return <View key={`empty-${dayIndex}`} style={styles.calendarDot} />;
                }

                return (
                  <View
                    key={dayIndex}
                    style={[
                      styles.calendarDot,
                      {
                        backgroundColor: day.isActive
                          ? colors.accent
                          : colors.border,
                      },
                      day.isToday && styles.calendarDotToday,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      );
    };

    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        <LinearGradient
          colors={[colors.background, colors.backgroundCard, colors.background]}
          style={styles.gradient}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Calendar size={20} color={colors.accent} />
              <Text style={[styles.monthTitle, { color: colors.accent }]}>
                {stats.monthName.toUpperCase()} {stats.year}
              </Text>
            </View>
            {username && (
              <Text style={[styles.username, { color: colors.textSecondary }]}>
                @{username}
              </Text>
            )}
          </View>

          {/* SEPARATOR */}
          <View style={[styles.separator, { backgroundColor: colors.gold || colors.accent }]} />

          {/* HERO COUNTER */}
          <View style={[styles.heroSection, { gap }]}>
            <Text style={[styles.heroNumber, { fontSize: heroFontSize, color: colors.accent }]}>
              {stats.activeDays}/{stats.totalDays}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              jours actifs
            </Text>
          </View>

          {/* CALENDRIER */}
          {renderCalendar()}

          {/* ÉVOLUTION POIDS */}
          {stats.evolution.weight && (
            <View style={[styles.evolutionContainer, { gap: gap / 2 }]}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                ÉVOLUTION
              </Text>
              <View style={styles.evolutionRow}>
                <Text style={[styles.evolutionLabel, { color: colors.textSecondary }]}>
                  Poids:
                </Text>
                <Text style={[styles.evolutionValue, { color: colors.textPrimary }]}>
                  {stats.evolution.weight.end.toFixed(1)} kg
                </Text>
                {stats.evolution.weight.change !== 0 && (
                  <View style={styles.evolutionChange}>
                    {stats.evolution.weight.change < 0 ? (
                      <TrendingDown size={16} color="#10B981" />
                    ) : (
                      <TrendingUp size={16} color="#EF4444" />
                    )}
                    <Text
                      style={[
                        styles.evolutionChangeText,
                        {
                          color: stats.evolution.weight.change < 0 ? '#10B981' : '#EF4444',
                        },
                      ]}
                    >
                      {stats.evolution.weight.change > 0 ? '+' : ''}
                      {stats.evolution.weight.change.toFixed(1)} kg
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* MEILLEURE SEMAINE */}
          {stats.bestWeek.daysActive > 0 && (
            <View style={[styles.bestWeekContainer, { backgroundColor: colors.backgroundElevated || colors.card }]}>
              <Award size={18} color={colors.gold || colors.accent} />
              <Text style={[styles.bestWeekText, { color: colors.textPrimary }]}>
                Meilleure semaine: Semaine {stats.bestWeek.weekNumber} • {stats.bestWeek.daysActive} jours
              </Text>
            </View>
          )}

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={[styles.separator, { backgroundColor: colors.gold || colors.accent, opacity: 0.3 }]} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              #YoroiWarrior #MonthlyRecap
            </Text>
            <Text style={[styles.footerBrand, { color: colors.gold || colors.accent }]}>
              YOROI
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
));

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  username: {
    fontSize: 11,
    fontWeight: '600',
  },

  separator: {
    height: 2,
    marginVertical: 10,
    opacity: 0.5,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
  },
  heroNumber: {
    fontWeight: '900',
    letterSpacing: -2,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Calendar
  calendarContainer: {
    alignSelf: 'center',
    gap: 6,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  dayHeader: {
    fontSize: 10,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  calendarDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  calendarDotToday: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },

  // Evolution
  evolutionContainer: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evolutionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  evolutionValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  evolutionChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evolutionChangeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Best Week
  bestWeekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  bestWeekText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
});

export default MonthlyRecapCard;
