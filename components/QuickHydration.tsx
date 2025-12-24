// ============================================
// YOROI - QUICK HYDRATION
// ============================================
// Section compacte pour le suivi d'hydratation

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplets, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TYPES
// ============================================

interface QuickHydrationProps {
  currentMl: number;
  targetMl: number;
  onAddWater: (amount: number) => void;
}

// ============================================
// BOUTON D'AJOUT RAPIDE
// ============================================

interface QuickAddButtonProps {
  amount: number;
  label: string;
  onPress: () => void;
  colors: any;
}

const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  amount,
  label,
  onPress,
  colors,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Animation de press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.quickAddButton,
          {
            backgroundColor: 'rgba(0,191,255,0.15)',
            borderColor: 'rgba(0,191,255,0.3)',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Plus size={12} color="#00BFFF" />
        <Text style={[styles.quickAddText, { color: '#00BFFF' }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const QuickHydration: React.FC<QuickHydrationProps> = ({
  currentMl,
  targetMl,
  onAddWater,
}) => {
  const { colors, isDark, themeName } = useTheme();
  const isWellness = false;

  // Ombres selon le thème
  const cardShadow = isWellness ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    elevation: 3,
  };
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculs
  const progress = Math.min((currentMl / targetMl) * 100, 100);
  const currentL = (currentMl / 1000).toFixed(2);
  const targetL = (targetMl / 1000).toFixed(2);

  // Animation de la barre
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Options d'ajout rapide
  const quickOptions = [
    { amount: 250, label: '250ml' },
    { amount: 500, label: '500ml' },
    { amount: 1000, label: '1L' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Droplets size={18} color="#00BFFF" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Hydratation
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          <Text style={{ color: '#00BFFF', fontWeight: '800' }}>{currentL}</Text>
          <Text style={{ color: colors.textMuted }}>/{targetL}L</Text>
        </Text>
      </View>

      {/* Barre de progression */}
      <View style={[styles.progressBar, { backgroundColor: 'rgba(0,191,255,0.15)' }]}>
        <Animated.View style={{ width: widthInterpolated, height: '100%' }}>
          <LinearGradient
            colors={['#00BFFF', '#0099CC', '#006699']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressFill}
          />
        </Animated.View>
      </View>

      {/* Boutons d'ajout rapide */}
      <View style={styles.quickAddContainer}>
        {quickOptions.map((option) => (
          <QuickAddButton
            key={option.amount}
            amount={option.amount}
            label={option.label}
            onPress={() => onAddWater(option.amount)}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  amount: {
    fontSize: 15,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickAddContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default QuickHydration;
