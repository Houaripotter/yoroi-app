import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Droplets, Minus, Settings } from 'lucide-react-native';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 8*2 = 16, gap 12 = total 28
const CARD_SIZE = (screenWidth - 28) / 2;

interface HydrationLottieCardProps {
  currentMl?: number; // En millilitres maintenant
  goalMl?: number;    // En millilitres
  onAddMl?: (amountMl: number) => void; // En millilitres
}

export const HydrationLottieCard: React.FC<HydrationLottieCardProps> = ({
  currentMl = 0,
  goalMl = 2500,
  onAddMl
}) => {
  const { colors } = useTheme();
  const percentage = Math.min((currentMl / goalMl) * 100, 100);
  
  // Animation vague douce (sans scale pour éviter les mouvements)
  const waveAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // Pour la hauteur
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    wave.start();
    return () => wave.stop();
  }, []);

  // Formater l'affichage (toujours 2 décimales pour éviter les arrondis incorrects)
  const formatDisplay = (ml: number) => {
    const liters = ml / 1000;
    return `${liters.toFixed(2)}`;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      {/* Titre + Icône réglages */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Droplets size={12} color="#0EA5E9" />
          <Text style={styles.title}>HYDRATATION</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/hydration')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Settings size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Bouteille simple sans animation qui bouge */}
      <View style={styles.animationContainer}>
        <View style={styles.bottle}>
          {/* Bouchon */}
          <View style={[styles.cap, { backgroundColor: '#0EA5E9' }]} />

          {/* Corps de la bouteille */}
          <View style={[styles.bottleBody, { borderColor: '#0EA5E9' }]}>
            {/* Eau */}
            <View style={styles.waterFill}>
              <View
                style={[
                  styles.water,
                  {
                    height: `${percentage}%`,
                    backgroundColor: '#0EA5E9',
                  }
                ]}
              />
            </View>

            {/* Graduations */}
            <View style={styles.graduations}>
              {[0, 25, 50, 75, 100].map((val) => (
                <View key={val} style={styles.grad} />
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Valeur */}
      <Text style={[styles.value, { color: colors.textPrimary }]}>
        {formatDisplay(currentMl)}L
        <Text style={[styles.goalText, { color: colors.textMuted }]}> / {goalMl / 1000}L</Text>
      </Text>

      {/* Boutons avec ml explicite */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#EF444415' }]}
          onPress={() => onAddMl && onAddMl(-250)}
        >
          <Minus size={12} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#0EA5E920' }]}
          onPress={() => onAddMl && onAddMl(250)}
        >
          <Text style={styles.buttonText}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#0EA5E9' }]}
          onPress={() => onAddMl && onAddMl(500)}
        >
          <Text style={styles.buttonTextPrimary}>+500ml</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0EA5E9',
    letterSpacing: 1,
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottle: {
    alignItems: 'center',
  },
  cap: {
    width: 20,
    height: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bottleBody: {
    width: 50,
    height: 65,
    borderWidth: 2.5,
    borderRadius: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
  },
  water: {
    width: '100%',
    backgroundColor: '#0EA5E9',
    opacity: 0.7,
  },
  graduations: {
    position: 'absolute',
    right: 2,
    top: 4,
    bottom: 4,
    justifyContent: 'space-between',
  },
  grad: {
    width: 6,
    height: 1,
    backgroundColor: 'rgba(14, 165, 233, 0.3)',
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  goalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#0EA5E9',
    fontWeight: '700',
    fontSize: 9,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 9,
  },
});
