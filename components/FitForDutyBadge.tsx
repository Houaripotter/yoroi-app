// ============================================
// YOROI - FIT FOR DUTY BADGE
// ============================================
// Badge d'aptitude à l'entraînement

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, AlertTriangle, XCircle } from 'lucide-react-native';
import { FitForDutyStatus } from '@/lib/infirmary';
import { SPACING, RADIUS } from '@/constants/appTheme';

interface FitForDutyBadgeProps {
  status: FitForDutyStatus;
}

export function FitForDutyBadge({ status }: FitForDutyBadgeProps) {
  const getIcon = () => {
    switch (status.status) {
      case 'operational':
        return <Shield size={32} color="#FFFFFF" fill={status.color} />;
      case 'restricted':
        return <AlertTriangle size={32} color="#FFFFFF" fill={status.color} />;
      case 'unfit':
        return <XCircle size={32} color="#FFFFFF" fill={status.color} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: status.color }]}>
      <View style={styles.iconContainer}>{getIcon()}</View>

      <View style={styles.content}>
        <Text style={styles.label}>{status.label}</Text>
        <Text style={styles.message}>{status.message}</Text>

        {status.affectedZones.length > 0 && (
          <Text style={styles.zones}>
            {status.affectedZones.join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  zones: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '600',
  },
});
