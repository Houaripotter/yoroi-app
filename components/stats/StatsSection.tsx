// ============================================
// STATS SECTION (refonte v2) : titre de section a l'encre, espacement regulier
// API inchangee.
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

interface StatsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  containerStyle?: any;
}

export const StatsSection: React.FC<StatsSectionProps> = React.memo(({ title, children, containerStyle }) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, containerStyle]}>
      {title ? (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={[styles.lace, { backgroundColor: c.primary }]} />
            <Ink size={20} weight="black" tight style={{ flex: 1 }}>
              {title}
            </Ink>
          </View>
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  header: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lace: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  content: {
    gap: 16,
  },
});
