import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Droplets } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface EssentielHydrationCardProps {
  current?: number; // en litres
  goal?: number; // en litres
  onAdd250?: () => void;
  onAdd500?: () => void;
}

export const EssentielHydrationCard: React.FC<EssentielHydrationCardProps> = ({
  current = 0,
  goal,
  onAdd250,
  onAdd500,
}) => {
  const { colors } = useTheme();
  const percentage = Math.min((current / goal) * 100, 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <Droplets size={18} color="#0EA5E9" />
        <Text style={styles.title}>HYDRATATION</Text>
      </View>

      {/* Icône bouteille */}
      <View style={styles.bottleContainer}>
        <View style={styles.bottle}>
          <View style={[styles.bottleFill, { height: `${percentage}%` }]} />
        </View>
      </View>

      {/* Valeur */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {current.toFixed(1)}L
        </Text>
        <Text style={[styles.goal, { color: colors.textMuted }]}>/ {goal}L</Text>
      </View>

      {/* Barre de progression */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={[styles.percentage, { color: colors.textMuted }]}>
        {Math.round(percentage)}%
      </Text>

      {/* Boutons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.border }]} onPress={onAdd250}>
          <Text style={[styles.buttonText, { color: colors.textSecondary }]}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onAdd500}>
          <Text style={[styles.buttonText, styles.buttonTextPrimary]}>+500ml</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0EA5E9',
    letterSpacing: 1,
  },
  bottleContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  bottle: {
    width: 40,
    height: 60,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bottleFill: {
    backgroundColor: '#0EA5E9',
    width: '100%',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  goal: {
    fontSize: 14,
    marginLeft: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0EA5E9',
    borderRadius: 3,
  },
  percentage: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0EA5E9',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
});
