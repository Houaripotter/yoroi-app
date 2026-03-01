// ============================================
// HEART RATE ZONES BAR - Style Apple Sante
// Zone 1 bleu, Zone 2 vert, Zone 3 jaune,
// Zone 4 orange, Zone 5 rouge/rose
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

// Couleurs Apple Health exactes
const APPLE_ZONE_COLORS: Record<number, string> = {
  1: '#3B82F6', // Bleu
  2: '#22C55E', // Vert
  3: '#EAB308', // Jaune
  4: '#F97316', // Orange
  5: '#EF4444', // Rouge
};

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatBpmRange = (zone: HRZone): string => {
  if (zone.zone === 1) return `<${zone.maxBpm}`;
  if (zone.zone === 5 || zone.maxBpm > 240) return `>${zone.minBpm}`;
  return `${zone.minBpm}-${zone.maxBpm}`;
};

export const HeartRateZonesBar: React.FC<HeartRateZonesBarProps> = ({
  zones,
  totalDurationSeconds,
}) => {
  const { colors, isDark } = useTheme();

  const total = totalDurationSeconds
    || zones.reduce((sum, z) => sum + z.durationSeconds, 0);

  if (total === 0) return null;

  const sortedZones = [...zones].sort((a, b) => a.zone - b.zone);
  const maxDuration = Math.max(...sortedZones.map(z => z.durationSeconds));

  return (
    <View style={styles.container}>
      {sortedZones.map((zone) => {
        const zoneColor = APPLE_ZONE_COLORS[zone.zone] || zone.color;
        const barWidth = maxDuration > 0 ? (zone.durationSeconds / maxDuration) * 100 : 0;

        return (
          <View key={zone.zone} style={styles.zoneRow}>
            {/* Zone label + color bar */}
            <Text style={[styles.zoneLabel, { color: zoneColor }]}>
              Zone {zone.zone}
            </Text>

            {/* Bar coloree proportionnelle */}
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(barWidth, 2)}%`,
                    backgroundColor: zoneColor,
                  },
                ]}
              />
            </View>

            {/* Duree */}
            <Text style={[styles.zoneDuration, { color: colors.text }]}>
              {formatDuration(zone.durationSeconds)}
            </Text>

            {/* BPM range */}
            <Text style={[styles.zoneBpm, { color: colors.textMuted }]}>
              {formatBpmRange(zone)} <Text style={styles.bpmUnit}>BPM</Text>
            </Text>
          </View>
        );
      })}

      {/* Texte explicatif comme Apple */}
      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        Estimation du temps passe dans chaque zone de frequence cardiaque.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoneLabel: {
    fontSize: 14,
    fontWeight: '700',
    width: 62,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  zoneDuration: {
    fontSize: 15,
    fontWeight: '600',
    width: 48,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  zoneBpm: {
    fontSize: 12,
    width: 80,
    textAlign: 'right',
  },
  bpmUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default HeartRateZonesBar;
