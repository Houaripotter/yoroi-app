// ============================================
// YOROI - ÉCRAN DÉTAILLÉ READINESS
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Header } from '@/components/ui/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateReadinessScore, ReadinessScore } from '@/lib/readinessService';
import { Moon, Zap, Droplets, Flame, Heart, Activity } from 'lucide-react-native';
import { useI18n } from '@/lib/I18nContext';
import Svg, { Circle } from 'react-native-svg';

// ============================================
// SOUS-COMPOSANTS
// ============================================

const ReadinessRing: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const { isDark } = useTheme();
  const size = 160;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;

  const levelColors: Record<string, string> = {
    optimal: '#22C55E',
    good: '#4ADE80',
    moderate: '#F59E0B',
    poor: '#F97316',
    critical: '#EF4444',
  };
  const color = levelColors[level] ?? '#8B5CF6';

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 38, fontWeight: '900', color }}>{Math.round(score)}</Text>
        <Text style={{ fontSize: 12, color, fontWeight: '700', marginTop: -4 }}>/100</Text>
      </View>
    </View>
  );
};

interface FactorRowProps {
  label: string;
  score: number;
  impact: 'positive' | 'neutral' | 'negative';
  icon: React.ReactNode;
  color: string;
}
const FactorRow: React.FC<FactorRowProps> = ({ label, score, impact, icon, color }) => {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const impactColors = { positive: '#22C55E', neutral: '#F59E0B', negative: '#EF4444' };
  const impactLabels = { positive: t('readiness.positive'), neutral: t('readiness.neutral'), negative: t('readiness.negative') };
  const impactColor = impactColors[impact];
  const pct = Math.min(100, Math.round(score));

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${color}18`, justifyContent: 'center', alignItems: 'center' }}>
            {icon}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color }}>{pct}</Text>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: `${impactColor}18` }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: impactColor }}>{impactLabels[impact]}</Text>
          </View>
        </View>
      </View>
      {/* Barre */}
      <View style={{ height: 7, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
};

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

const LEVEL_COLORS: Record<string, string> = {
  optimal: '#22C55E',
  good: '#4ADE80',
  moderate: '#F59E0B',
  poor: '#F97316',
  critical: '#EF4444',
};

// LEVEL_LABELS sera calculé dans le composant avec t()

const RECO_COLORS: Record<string, string> = {
  go: '#22C55E',
  caution: '#F59E0B',
  rest: '#EF4444',
};
// RECO_LABELS sera calculé dans le composant avec t()

export default function ReadinessDetailScreen() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const LEVEL_LABELS: Record<string, string> = {
    optimal: t('readiness.levelOptimal'),
    good: t('readiness.levelGood'),
    moderate: t('readiness.levelModerate'),
    poor: t('readiness.levelPoor'),
    critical: t('readiness.levelCritical'),
  };

  const RECO_LABELS: Record<string, string> = {
    go: t('readiness.recoGo'),
    caution: t('readiness.recoCaution'),
    rest: t('readiness.recoRest'),
  };

  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateReadinessScore()
      .then(setReadiness)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cardStyle = {
    backgroundColor: isDark ? (colors.backgroundCard ?? colors.card) : '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    padding: 18,
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <Header title={t('readiness.screenTitle')} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </View>
    );
  }

  if (!readiness) {
    return (
      <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <Header title={t('readiness.screenTitle')} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 15 }}>
            {t('readiness.cannotCalculate')}
          </Text>
        </View>
      </View>
    );
  }

  const levelColor = LEVEL_COLORS[readiness.level] ?? '#8B5CF6';
  const recoColor = RECO_COLORS[readiness.recommendation] ?? '#8B5CF6';

  const factors: Array<{
    key: keyof ReadinessScore['factors'];
    label: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    { key: 'sleep', label: 'Sommeil', icon: <Moon size={16} color="#6366F1" />, color: '#6366F1' },
    { key: 'charge', label: 'Charge d\'entraînement', icon: <Zap size={16} color="#F59E0B" />, color: '#F59E0B' },
    { key: 'hydration', label: 'Hydratation', icon: <Droplets size={16} color="#06B6D4" />, color: '#06B6D4' },
    { key: 'streak', label: 'Régularité', icon: <Flame size={16} color="#EF4444" />, color: '#EF4444' },
    { key: 'heartRate', label: 'Fréquence cardiaque', icon: <Heart size={16} color="#EC4899" />, color: '#EC4899' },
    { key: 'hrv', label: 'Variabilité cardiaque (HRV)', icon: <Activity size={16} color="#22C55E" />, color: '#22C55E' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      <Header title="Score Readiness" showBack />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Score global */}
        <View style={[cardStyle, { alignItems: 'center', gap: 12 }]}>
          <ReadinessRing score={readiness.score} level={readiness.level} />
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: `${levelColor}18` }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: levelColor }}>
              {LEVEL_LABELS[readiness.level] ?? readiness.level}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textMuted ?? '#888', textAlign: 'center', lineHeight: 20 }}>
            {readiness.message}
          </Text>

          {/* Recommandation */}
          <View style={{ width: '100%', backgroundColor: `${recoColor}12`, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: recoColor }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: recoColor }}>
              {RECO_LABELS[readiness.recommendation] ?? readiness.recommendation}
            </Text>
          </View>
        </View>

        {/* Détail des facteurs */}
        <View style={[cardStyle, { gap: 18 }]}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
            Facteurs détaillés
          </Text>
          {factors.map(({ key, label, icon, color }) => {
            const factor = readiness.factors[key];
            if (!factor) return null;
            return (
              <FactorRow
                key={key}
                label={label}
                score={factor.score}
                impact={factor.impact}
                icon={icon}
                color={color}
              />
            );
          })}
        </View>

        {/* Info pédagogique */}
        <View style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.07)', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' }}>
          <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', lineHeight: 18 }}>
            Le score Readiness combine ton sommeil, ta charge d'entraînement hebdomadaire, ton hydratation et ta régularité. Un score supérieur à 70 indique que tu es dans de bonnes conditions pour t'entraîner intensément.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
