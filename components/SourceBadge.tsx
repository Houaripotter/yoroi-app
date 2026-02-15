// ============================================
// YOROI - SOURCE BADGE COMPONENT
// ============================================
// Affiche un petit badge indiquant l'origine des donnees de sante
// (Withings, Garmin, Polar, Apple Watch, etc.)
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Display config for each normalized source
const SOURCE_CONFIG: Record<string, { label: string; color: string; short: string }> = {
  withings:      { label: 'Withings',       color: '#00B5AD', short: 'W' },
  garmin:        { label: 'Garmin',         color: '#007DC5', short: 'G' },
  polar:         { label: 'Polar',          color: '#D5001C', short: 'P' },
  whoop:         { label: 'WHOOP',          color: '#00C48C', short: 'WH' },
  apple_watch:   { label: 'Apple Watch',    color: '#333333', short: 'AW' },
  samsung:       { label: 'Samsung',        color: '#1428A0', short: 'S' },
  fitbit:        { label: 'Fitbit',         color: '#00B0B9', short: 'F' },
  xiaomi:        { label: 'Xiaomi',         color: '#FF6900', short: 'X' },
  renpho:        { label: 'Renpho',         color: '#2563EB', short: 'R' },
  eufy:          { label: 'Eufy',           color: '#1D4ED8', short: 'E' },
  omron:         { label: 'Omron',          color: '#003DA5', short: 'O' },
  suunto:        { label: 'Suunto',         color: '#000000', short: 'Su' },
  oura:          { label: 'Oura',           color: '#D4AF37', short: 'Or' },
  iphone:        { label: 'iPhone',         color: '#666666', short: 'iP' },
  apple_health:  { label: 'Apple Sante',    color: '#FF3B30', short: 'AS' },
  health_connect:{ label: 'Health Connect', color: '#4285F4', short: 'HC' },
  manual:        { label: 'Manuel',         color: '#9CA3AF', short: 'M' },
  apple:         { label: 'Apple Sante',    color: '#FF3B30', short: 'AS' },
};

interface SourceBadgeProps {
  source?: string | null;
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  source,
  size = 'small',
  showLabel = false,
}) => {
  if (!source || source === 'unknown') return null;

  const config = SOURCE_CONFIG[source] || {
    label: source,
    color: '#9CA3AF',
    short: source.substring(0, 2).toUpperCase(),
  };

  const isSmall = size === 'small';

  if (showLabel) {
    return (
      <View style={[styles.labelBadge, { backgroundColor: `${config.color}15` }]}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.labelText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.color,
          width: isSmall ? 20 : 28,
          height: isSmall ? 20 : 28,
          borderRadius: isSmall ? 6 : 8,
        },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize: isSmall ? 8 : 10 }]}>
        {config.short}
      </Text>
    </View>
  );
};

/**
 * Returns the display name for a given source key
 */
export const getSourceDisplayName = (source?: string | null): string => {
  if (!source) return '';
  return SOURCE_CONFIG[source]?.label || source;
};

/**
 * Returns the color for a given source key
 */
export const getSourceColor = (source?: string | null): string => {
  if (!source) return '#9CA3AF';
  return SOURCE_CONFIG[source]?.color || '#9CA3AF';
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default SourceBadge;
