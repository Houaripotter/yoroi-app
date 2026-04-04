import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight, Plus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Path, Defs, Circle, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

interface EssentielWeightCardProps {
  currentWeight?: number;
  objective?: number;
  weekData?: number[];
  weekLabels?: string[];
  trend?: 'up' | 'down' | 'stable';
  onAddWeight?: () => void;
  onViewStats?: () => void;
}

export const EssentielWeightCard: React.FC<EssentielWeightCardProps> = ({
  currentWeight,
  objective,
  trend = 'stable',
  onAddWeight,
  onViewStats,
}) => {
  const { colors, isDark } = useTheme();

  // ── Calcul de la progression sur la jauge ──
  // 0 = loin de l'objectif (rouge), 1 = objectif atteint (vert)
  const calculateProgress = (): number => {
    if (!currentWeight || currentWeight <= 0) return 0.5;
    if (!objective || objective <= 0) return 0.5;

    const diff = Math.abs(currentWeight - objective);
    if (diff < 0.3) return 0.95;

    const maxDiff = 15;
    return Math.max(0.05, Math.min(0.95, 1 - diff / maxDiff));
  };

  const progress = calculateProgress();

  // ── Dimensions SVG de la jauge ──
  const SVG_W = 220;
  const SVG_H = 130;
  const CX = SVG_W / 2;      // Centre X
  const CY = SVG_H - 10;     // Centre Y (bas)
  const R = 85;               // Rayon
  const STROKE = 18;          // Épaisseur de l'arc

  // Arc demi-cercle (gauche → droite)
  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  // Position de l'indicateur sur l'arc
  const angle = Math.PI * (1 - progress);
  const ix = CX + R * Math.cos(angle);
  const iy = CY - R * Math.sin(angle);

  // Couleur à la position actuelle
  const getColorAt = (p: number): string => {
    if (p < 0.25) return '#EF4444';
    if (p < 0.5) return '#F97316';
    if (p < 0.75) return '#EAB308';
    return '#22C55E';
  };

  const indicatorColor = getColorAt(progress);
  const diff = currentWeight && objective ? currentWeight - objective : null;

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>Poids</Text>
        <TouchableOpacity
          style={styles.statsLink}
          onPress={onViewStats}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.statsText, { color: colors.accent }]}>Stats</Text>
          <ArrowRight size={14} color={colors.accent} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ── Jauge compteur ── */}
      <View style={styles.gaugeContainer}>
        <Svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
          <Defs>
            <SvgGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#EF4444" />
              <Stop offset="0.3" stopColor="#F97316" />
              <Stop offset="0.6" stopColor="#EAB308" />
              <Stop offset="1" stopColor="#22C55E" />
            </SvgGradient>
          </Defs>

          {/* Piste de fond */}
          <Path
            d={arcPath}
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            strokeWidth={STROKE + 8}
            fill="none"
            strokeLinecap="round"
          />

          {/* Arc dégradé rouge → orange → jaune → vert */}
          <Path
            d={arcPath}
            stroke="url(#gaugeGrad)"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
          />

          {/* Ombre de l'indicateur */}
          <Circle cx={ix} cy={iy + 2} r={12} fill="rgba(0,0,0,0.12)" />

          {/* Indicateur (curseur) */}
          <Circle cx={ix} cy={iy} r={11} fill="#FFFFFF" stroke={indicatorColor} strokeWidth={3.5} />
          <Circle cx={ix} cy={iy} r={4} fill={indicatorColor} />
        </Svg>
      </View>

      {/* ── Poids actuel + Objectif ── */}
      <View style={styles.valuesRow}>
        <View style={styles.currentGroup}>
          <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
            {currentWeight && currentWeight > 0 ? currentWeight.toFixed(1) : '--'}
          </Text>
          <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
        </View>

        {objective != null && objective > 0 && (
          <View style={styles.goalGroup}>
            <Text style={[styles.goalText, { color: colors.textMuted }]}>
              Objectif {objective}kg
            </Text>
            {diff !== null && Math.abs(diff) >= 0.1 && (
              <View style={[styles.diffPill, { backgroundColor: `${indicatorColor}15` }]}>
                <Text style={[styles.diffValue, { color: indicatorColor }]}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Bouton Nouvelle pesée ── */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}20` }]}
        onPress={onAddWeight}
        activeOpacity={0.7}
      >
        <Plus size={16} color={colors.accent} strokeWidth={2.5} />
        <Text style={[styles.addButtonText, { color: colors.accent }]}>Nouvelle pesée</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Gauge
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },

  // Values
  valuesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  currentGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontSize: 40,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '600',
  },
  goalGroup: {
    alignItems: 'flex-end',
    gap: 6,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  diffValue: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
