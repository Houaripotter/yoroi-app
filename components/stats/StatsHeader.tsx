// ============================================
// STATS HEADER (refonte v2) : grand titre, description, choix de periode
// Utilise en haut de chaque section de statistiques. API inchangee.
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PeriodSelector } from './PeriodSelector';

export type Period = '7j' | '14j' | '30j' | '60j' | '90j' | '6m' | '9m' | '1a' | '2a' | 'tout' | 'custom';

interface StatsHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
  showPeriodSelector?: boolean;
  customStart?: string;
  customEnd?: string;
  onCustomRangeChange?: (start: string, end: string) => void;
}

export const StatsHeader: React.FC<StatsHeaderProps> = React.memo(({
  title,
  description,
  icon,
  selectedPeriod,
  onPeriodChange,
  showPeriodSelector = true,
  customStart,
  customEnd,
  onCustomRangeChange,
}) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {icon ? <View style={[styles.iconTile, { backgroundColor: c.surface, borderColor: c.divider }]}>{icon}</View> : null}
        <Ink size={32} weight="black" tight style={{ flex: 1 }}>
          {title}
        </Ink>
      </View>
      {description ? (
        <Ink size={15} weight="medium" color={c.textSecondary} style={styles.description}>
          {description}
        </Ink>
      ) : null}
      {showPeriodSelector ? (
        <View style={styles.periodContainer}>
          <PeriodSelector
            selected={selectedPeriod}
            onChange={onPeriodChange}
            customStart={customStart}
            customEnd={customEnd}
            onCustomRangeChange={onCustomRangeChange}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    lineHeight: 21,
    marginTop: 6,
  },
  periodContainer: {
    marginTop: 14,
  },
});
