// ============================================
// PARTNER LOSS HEATMAP : zones d'attaque subies
// ============================================
// Silhouette corporelle simplifiee avec zones colorees selon
// la frequence des techniques subies.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  methodsTaken: string[]; // liste des techniques subies (texte libre)
}

// Mapping grossier technique → zone corporelle
function zoneFromMethod(method: string): Zone | null {
  const m = method.toLowerCase();
  if (/triangle|bras|omoplata|kimura|americana|coude|levier.*bras/.test(m)) return 'arms';
  if (/etranglement|strangul|mata|leao|ezekiel|col|north south|guillotine/.test(m)) return 'neck';
  if (/jambe|cheville|genou|heel|knee|ankle|leg|toe/.test(m)) return 'legs';
  if (/dos|rnc|rear naked|sangles/.test(m)) return 'back';
  if (/mount|pression|passage|side control|kesa|flanc/.test(m)) return 'torso';
  return null;
}

type Zone = 'neck' | 'arms' | 'torso' | 'legs' | 'back';

const ZONE_LABELS: Record<Zone, string> = {
  neck: 'Cou / etranglements',
  arms: 'Bras / soumissions',
  torso: 'Torse / pressions',
  legs: 'Jambes / leglocks',
  back: 'Dos / RNC',
};

export const PartnerLossHeatMap: React.FC<Props> = ({ methodsTaken }) => {
  const { colors, isDark } = useTheme();

  const zoneCount = useMemo(() => {
    const counts: Record<Zone, number> = { neck: 0, arms: 0, torso: 0, legs: 0, back: 0 };
    methodsTaken.forEach(m => {
      const z = zoneFromMethod(m);
      if (z) counts[z] += 1;
    });
    return counts;
  }, [methodsTaken]);

  const maxCount = Math.max(1, ...Object.values(zoneCount));

  const colorForZone = (z: Zone): string => {
    const ratio = zoneCount[z] / maxCount;
    if (ratio === 0) return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    if (ratio < 0.34) return 'rgba(245,158,11,0.4)';
    if (ratio < 0.67) return 'rgba(239,68,68,0.6)';
    return 'rgba(239,68,68,0.9)';
  };

  if (methodsTaken.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      <Text style={[styles.title, { color: colors.text }]}>Zones d'attaque subies</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>Ou il t'attrape le plus souvent</Text>

      <View style={styles.row}>
        <View style={styles.silhouetteWrap}>
          <Svg width={110} height={220} viewBox="0 0 110 220">
            {/* Tete */}
            <Circle cx="55" cy="22" r="18" fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
            {/* Cou */}
            <Rect x="48" y="36" width="14" height="10" rx="3" fill={colorForZone('neck')} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
            {/* Torse */}
            <Rect x="30" y="46" width="50" height="70" rx="8" fill={colorForZone('torso')} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
            {/* Bras gauche */}
            <Rect x="12" y="50" width="14" height="60" rx="6" fill={colorForZone('arms')} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
            {/* Bras droit */}
            <Rect x="84" y="50" width="14" height="60" rx="6" fill={colorForZone('arms')} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
            {/* Jambes */}
            <Rect x="32" y="118" width="20" height="90" rx="6" fill={colorForZone('legs')} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
            <Rect x="58" y="118" width="20" height="90" rx="6" fill={colorForZone('legs')} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'} strokeWidth="1" />
            {/* Dos (petite indication en haut) */}
            <Ellipse cx="55" cy="60" rx="18" ry="6" fill={colorForZone('back')} opacity={0.65} />
          </Svg>
        </View>

        <View style={{ flex: 1, marginLeft: 14, gap: 6 }}>
          {(Object.keys(ZONE_LABELS) as Zone[])
            .filter(z => zoneCount[z] > 0)
            .sort((a, b) => zoneCount[b] - zoneCount[a])
            .map(z => (
              <View key={z} style={styles.zoneRow}>
                <View style={[styles.zoneDot, { backgroundColor: colorForZone(z) }]} />
                <Text style={[styles.zoneLabel, { color: colors.text }]}>{ZONE_LABELS[z]}</Text>
                <Text style={[styles.zoneCount, { color: colors.textMuted }]}>{zoneCount[z]}</Text>
              </View>
            ))}
          {(Object.keys(ZONE_LABELS) as Zone[]).every(z => zoneCount[z] === 0) && (
            <Text style={[styles.zoneLabel, { color: colors.textMuted, fontStyle: 'italic' }]}>
              Aucune technique encore renseignee.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  silhouetteWrap: { width: 110, alignItems: 'center' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneDot: { width: 10, height: 10, borderRadius: 5 },
  zoneLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  zoneCount: { fontSize: 12, fontWeight: '800' },
});

export default React.memo(PartnerLossHeatMap);
