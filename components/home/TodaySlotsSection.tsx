import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Check, ChevronRight, RefreshCw, X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getSportIcon, getSportColor, getSportName } from '@/lib/sports';
import {
  getWeeklyPlan,
  getSlotOccurrences,
  ensureCurrentWeekOccurrences,
  WeeklyPlan,
  SlotOccurrence,
} from '@/lib/database';
import { selectionAsync } from 'expo-haptics';

interface TodaySlot extends WeeklyPlan {
  occurrence?: SlotOccurrence;
  isValidated: boolean;
  isCancelled: boolean;
  isPending: boolean;
}

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
};

export const TodaySlotsSection: React.FC = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const [todaySlots, setTodaySlots] = useState<TodaySlot[]>([]);

  const loadSlots = useCallback(async () => {
    try {
      await ensureCurrentWeekOccurrences();
      const weekStart = getWeekStart();
      const [slots, occurrences] = await Promise.all([
        getWeeklyPlan(),
        getSlotOccurrences(weekStart),
      ]);

      const now = new Date();
      const jsDay = now.getDay();
      const planDay = jsDay === 0 ? 6 : jsDay - 1;

      const today = slots
        .filter(s => s.day_of_week === planDay && !s.is_rest_day)
        .map(slot => {
          const occ = occurrences.find(o => o.weekly_plan_id === slot.id);
          return {
            ...slot,
            occurrence: occ,
            isValidated: occ?.status === 'validated',
            isCancelled: occ?.status === 'cancelled',
            isPending: !occ || occ.status === 'pending',
          };
        });

      setTodaySlots(today);
    } catch {}
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  if (todaySlots.length === 0) return null;

  const validated = todaySlots.filter(s => s.isValidated).length;
  const pending = todaySlots.filter(s => s.isPending).length;
  const allDone = pending === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RefreshCw size={16} color={colors.accent} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Creneaux du jour
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: allDone ? colors.success + '20' : colors.accent + '20' }]}>
          <Text style={[styles.badgeText, { color: allDone ? colors.success : colors.accent }]}>
            {validated}/{todaySlots.length}
          </Text>
        </View>
      </View>

      {/* Slots list */}
      <View style={styles.slotsList}>
        {todaySlots.map(slot => {
          const sportColor = getSportColor(slot.sport);
          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slotItem,
                {
                  backgroundColor: slot.isValidated
                    ? colors.success + '08'
                    : slot.isCancelled
                    ? colors.error + '08'
                    : colors.background,
                  borderColor: slot.isValidated
                    ? colors.success + '30'
                    : slot.isCancelled
                    ? colors.error + '30'
                    : colors.border,
                },
              ]}
              onPress={() => {
                selectionAsync();
                if (slot.isPending) {
                  router.push({
                    pathname: '/add-training',
                    params: {
                      slotId: String(slot.id),
                      prefillSport: slot.sport,
                      prefillClubId: slot.club_id ? String(slot.club_id) : undefined,
                      prefillTime: slot.time || undefined,
                      prefillDuration: slot.duration_minutes ? String(slot.duration_minutes) : undefined,
                    },
                  });
                }
              }}
              activeOpacity={slot.isPending ? 0.6 : 1}
            >
              <View style={[styles.slotIcon, { backgroundColor: sportColor + '15' }]}>
                <MaterialCommunityIcons
                  name={getSportIcon(slot.sport) as any}
                  size={18}
                  color={sportColor}
                />
              </View>

              <View style={styles.slotInfo}>
                <Text
                  style={[
                    styles.slotName,
                    { color: colors.textPrimary },
                    slot.isCancelled && { textDecorationLine: 'line-through', opacity: 0.5 },
                  ]}
                  numberOfLines={1}
                >
                  {slot.label || getSportName(slot.sport)}
                </Text>
                <Text style={[styles.slotTime, { color: colors.textMuted }]}>
                  {slot.time || '--:--'}
                  {slot.duration_minutes ? ` - ${slot.duration_minutes} min` : ''}
                  {slot.club_name ? ` | ${slot.club_name}` : ''}
                </Text>
              </View>

              {/* Status */}
              {slot.isValidated ? (
                <View style={[styles.statusDot, { backgroundColor: colors.success }]}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : slot.isCancelled ? (
                <View style={[styles.statusDot, { backgroundColor: colors.error }]}>
                  <X size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : (
                <ChevronRight size={16} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Progress bar */}
      {todaySlots.length > 1 && (
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: allDone ? colors.success : colors.accent,
                width: `${(validated / todaySlots.length) * 100}%`,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  slotsList: {
    gap: 6,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  slotIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  slotName: {
    fontSize: 14,
    fontWeight: '600',
  },
  slotTime: {
    fontSize: 11,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
