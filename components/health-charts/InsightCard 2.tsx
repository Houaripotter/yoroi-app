import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, RADIUS } from '@/constants/design';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

export type InsightType = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface Insight {
  type: InsightType;
  title: string;
  message: string;
  metric?: string;
  change?: number;
}

interface InsightCardProps {
  insight: Insight;
  colors: any;
}

export function InsightCard({ insight, colors }: InsightCardProps) {
  const config = getInsightConfig(insight.type, colors);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
        <config.Icon size={20} color={config.iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{insight.title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{insight.message}</Text>
        {insight.metric && insight.change !== undefined && (
          <View style={styles.metricRow}>
            <Text style={[styles.metric, { color: config.iconColor }]}>{insight.metric}</Text>
            <View style={styles.changeRow}>
              {insight.change >= 0 ? (
                <TrendingUp size={14} color={config.iconColor} />
              ) : (
                <TrendingDown size={14} color={config.iconColor} />
              )}
              <Text style={[styles.change, { color: config.iconColor }]}>
                {insight.change >= 0 ? '+' : ''}
                {insight.change.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function getInsightConfig(type: InsightType, colors: any) {
  switch (type) {
    case 'success':
      return {
        Icon: CheckCircle,
        bgColor: colors.successMuted || colors.success + '15',
        borderColor: colors.success + '30',
        iconBg: colors.success + '20',
        iconColor: colors.success,
      };
    case 'warning':
      return {
        Icon: AlertCircle,
        bgColor: colors.warningMuted || colors.warning + '15',
        borderColor: colors.warning + '30',
        iconBg: colors.warning + '20',
        iconColor: colors.warning,
      };
    case 'danger':
      return {
        Icon: AlertCircle,
        bgColor: colors.dangerMuted || colors.danger + '15',
        borderColor: colors.danger + '30',
        iconBg: colors.danger + '20',
        iconColor: colors.danger,
      };
    case 'info':
      return {
        Icon: Info,
        bgColor: colors.infoMuted || colors.info + '15',
        borderColor: colors.info + '30',
        iconBg: colors.info + '20',
        iconColor: colors.info,
      };
    default:
      return {
        Icon: Zap,
        bgColor: colors.glass,
        borderColor: colors.glassBorder,
        iconBg: colors.gold + '20',
        iconColor: colors.gold,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  metric: {
    fontSize: 16,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  change: {
    fontSize: 13,
    fontWeight: '700',
  },
});
