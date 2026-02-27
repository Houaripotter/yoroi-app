// ============================================
// HEART RATE ZONES BAR - Style Yoroi
// 5 barres horizontales avec temps par zone FC
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

export interface HRZone {
  zone: number;
  name: string;
  minBpm: number;
  maxBpm: number;
  durationSeconds: number;
  color: string;
}

interface HeartRateZonesBarProps {
  zones: HRZone[];
  totalDurationSeconds?: number;
}

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  if (m > 0) return `${m}m${s > 0 ? ` ${s}s` : ''}`;
  return `${s}s`;
};

export const HeartRateZonesBar: React.FC<HeartRateZonesBarProps> = ({
  zones,
  totalDurationSeconds,
}) => {
  const { colors } = useTheme();

  const total = totalDurationSeconds
    || zones.reduce((sum, z) => sum + z.durationSeconds, 0);

  if (total === 0) return null;

  // Trier par zone (1 -> 5)
  const sortedZones = [...zones].sort((a, b) => a.zone - b.zone);

  return (
    <View style={styles.container}>
      {/* Barre empilee horizontale */}
      <View style={styles.stackedBar}>
        {sortedZones.map((zone) => {
          const pct = (zone.durationSeconds / total) * 100;
          if (pct < 1) return null;
          return (
            <View
              key={zone.zone}
              style={[
                styles.barSegment,
                { width: `${pct}%`, backgroundColor: zone.color },
              ]}
            />
          );
        })}
      </View>

      {/* Detail par zone */}
      <View style={styles.zonesDetail}>
        {sortedZones.map((zone) => {
          const pct = Math.round((zone.durationSeconds / total) * 100);
          return (
            <View key={zone.zone} style={styles.zoneRow}>
              <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
              <Text style={[styles.zoneNumber, { color: colors.textMuted }]}>
                Z{zone.zone}
              </Text>
              <Text style={[styles.zoneName, { color: colors.text }]} numberOfLines={1}>
                {zone.name}
              </Text>
              <Text style={[styles.zoneBpm, { color: colors.textMuted }]}>
                {zone.minBpm}-{zone.maxBpm > 240 ? '...' : zone.maxBpm}
              </Text>
              <View style={styles.zoneBarContainer}>
                <View
                  style={[
                    styles.zoneBarFill,
                    { width: `${pct}%`, backgroundColor: zone.color },
                  ]}
                />
              </View>
              <Text style={[styles.zoneTime, { color: colors.text }]}>
                {formatDuration(zone.durationSeconds)}
              </Text>
              <Text style={[styles.zonePct, { color: colors.textMuted }]}>
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  barSegment: {
    height: '100%',
  },
  zonesDetail: {
    gap: 10,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneNumber: {
    fontSize: 12,
    fontWeight: '700',
    width: 22,
  },
  zoneName: {
    fontSize: 13,
    fontWeight: '500',
    width: 90,
  },
  zoneBpm: {
    fontSize: 11,
    width: 55,
  },
  zoneBarContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  zoneBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  zoneTime: {
    fontSize: 13,
    fontWeight: '700',
    width: 50,
    textAlign: 'right',
  },
  zonePct: {
    fontSize: 11,
    width: 30,
    textAlign: 'right',
  },
});

export default HeartRateZonesBar;
