// ============================================
// PARTNER STREAK BADGE : Affiche la streak actuelle
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Shield } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import type { PartnerStreakData } from '@/lib/partnerStreaksService';

interface Props {
  streaks: PartnerStreakData;
  compact?: boolean;
}

export const PartnerStreakBadge: React.FC<Props> = ({ streaks, compact }) => {
  const { colors } = useTheme();

  const items: Array<{ icon: any; label: string; value: string; color: string }> = [];

  if (streaks.currentWinStreak >= 2) {
    items.push({
      icon: Flame,
      label: 'Serie actuelle',
      value: `${streaks.currentWinStreak} V consecutives`,
      color: '#EF4444',
    });
  }
  if (streaks.longestWinStreak >= 3 && streaks.longestWinStreak !== streaks.currentWinStreak) {
    items.push({
      icon: Flame,
      label: 'Record victoires',
      value: `${streaks.longestWinStreak}`,
      color: '#F59E0B',
    });
  }
  if (streaks.currentNoTapStreak >= 5) {
    items.push({
      icon: Shield,
      label: 'Sans tapper',
      value: `${streaks.currentNoTapStreak} rounds`,
      color: '#10B981',
    });
  }

  if (items.length === 0) return null;

  if (compact) {
    return (
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <View key={i} style={[styles.pill, { backgroundColor: it.color + '20' }]}>
              <Icon size={10} color={it.color} />
              <Text style={[styles.pillText, { color: it.color }]}>{it.value}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <View
            key={i}
            style={[
              styles.card,
              { backgroundColor: it.color + '15', borderColor: it.color + '40' },
            ]}
          >
            <Icon size={16} color={it.color} />
            <Text style={[styles.label, { color: colors.textMuted }]}>{it.label}</Text>
            <Text style={[styles.value, { color: it.color }]}>{it.value}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'flex-start',
    gap: 4,
  },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  value: { fontSize: 13, fontWeight: '800' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pillText: { fontSize: 10, fontWeight: '800' },
});

export default React.memo(PartnerStreakBadge);
