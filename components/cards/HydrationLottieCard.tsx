import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing, Modal } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Droplets, Minus, Settings, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';

import { getGridColumns } from '@/constants/responsive';
import logger from '@/lib/security/logger';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 16*2 = 32, gaps entre cartes = 8 * (colonnes - 1)
const columns = getGridColumns(); // 2 sur iPhone, 3 sur iPad
const CARD_SIZE = (screenWidth - 32 - 8 * (columns - 1)) / columns;

interface HydrationLottieCardProps {
  currentMl?: number; // En millilitres maintenant
  goalMl?: number;    // En millilitres
  onAddMl?: (amountMl: number) => void; // En millilitres
}

export const HydrationLottieCard = React.memo<HydrationLottieCardProps>(({
  currentMl = 0,
  goalMl = 2500,
  onAddMl
}) => {
  const { colors } = useTheme();
  logger.info('HYDRATION DEBUG:', { currentMl, goalMl, goalInLiters: goalMl / 1000 });
  const percentage = goalMl > 0 ? Math.min((currentMl / goalMl) * 100, 100) : 0;
  const goalReached = goalMl > 0 && currentMl >= goalMl;

  // Animation vague douce - effet liquide subtil
  const waveAnim = useRef(new Animated.Value(0)).current;
  // Animation de versement d'eau avec bouchon
  const pourAnim = useRef(new Animated.Value(0)).current;
  const capRotateAnim = useRef(new Animated.Value(0)).current;
  const [isPouringWater, setIsPouringWater] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  const [hasShownCongrats, setHasShownCongrats] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  // Charger le genre de l'utilisateur
  useEffect(() => {
    const loadGender = async () => {
      try {
        const settings = await AsyncStorage.getItem('@yoroi_user_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setGender(parsed.gender || null);
        }
      } catch (error) {
        logger.error('Erreur chargement genre:', error);
      }
    };
    loadGender();
  }, []);

  // Détecter quand l'objectif est atteint
  useEffect(() => {
    if (goalReached && !hasShownCongrats) {
      setHasShownCongrats(true);
      setShowCongrats(true);
      notificationAsync(NotificationFeedbackType.Success);

      // Animation du popup
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Fermer automatiquement après 3 secondes
      setTimeout(() => {
        setShowCongrats(false);
      }, 3000);
    }
  }, [goalReached, hasShownCongrats]);

  useEffect(() => {
    // Vague qui ondule de gauche à droite
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    wave.start();
    return () => wave.stop();
  }, []);

  // Fonction pour déclencher l'animation de versement avec bouchon qui s'ouvre
  const triggerPourAnimation = () => {
    setIsPouringWater(true);
    pourAnim.setValue(0);
    capRotateAnim.setValue(0);

    // Animation du bouchon qui s'ouvre
    Animated.parallel([
      Animated.timing(capRotateAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(pourAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      // Refermer le bouchon
      Animated.timing(capRotateAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setIsPouringWater(false);
      });
    });
  };

  // Wrapper pour onAddMl avec animation
  const handleAddWater = (amount: number) => {
    if (amount > 0) {
      triggerPourAnimation();
    }
    if (onAddMl) {
      onAddMl(amount);
    }
  };

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
          <Text style={styles.title}>HYDRATATION V2</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/hydration')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Settings size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Belle bouteille d'eau avec graduations - CLIQUABLE */}
      <TouchableOpacity
        style={styles.animationContainer}
        onPress={() => router.push('/hydration')}
        activeOpacity={0.7}
      >
        <View style={styles.bottleWrapper}>
          {/* Bouchon */}
          <Animated.View style={[
            styles.bottleCap,
            {
              transform: [
                {
                  translateY: capRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -15]
                  })
                }
              ]
            }
          ]} />

          {/* Goulot */}
          <View style={styles.bottleNeck} />

          {/* Corps de la bouteille */}
          <View style={styles.bottleBody}>
            {/* Eau qui monte */}
            <Animated.View
              style={[
                styles.waterLevel,
                {
                  height: `${percentage}%`,
                }
              ]}
            >
              {/* Vague au sommet */}
              {percentage > 0 && (
                <Animated.View style={[
                  styles.waterWave,
                  {
                    transform: [{
                      translateX: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 8]
                      })
                    }],
                  }
                ]} />
              )}

              {/* Bulles montantes */}
              {isPouringWater && (
                <>
                  <Animated.View style={[
                    styles.bubble,
                    { left: '25%', bottom: '20%' },
                    {
                      transform: [{
                        translateY: pourAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -50]
                        })
                      }],
                      opacity: pourAnim.interpolate({
                        inputRange: [0, 0.3, 0.8, 1],
                        outputRange: [0, 1, 0.5, 0]
                      })
                    }
                  ]}>
                    <View style={styles.bubbleCircle} />
                  </Animated.View>
                  <Animated.View style={[
                    styles.bubble,
                    { left: '60%', bottom: '30%' },
                    {
                      transform: [{
                        translateY: pourAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [5, -55]
                        })
                      }],
                      opacity: pourAnim.interpolate({
                        inputRange: [0, 0.2, 0.7, 1],
                        outputRange: [0, 1, 0.5, 0]
                      })
                    }
                  ]}>
                    <View style={[styles.bubbleCircle, { width: 8, height: 8 }]} />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </View>

          {/* Graduations à droite de la bouteille */}
          <View style={styles.graduations}>
            <View style={styles.graduation}>
              <View style={styles.graduationLine} />
              <Text style={styles.graduationLabel}>{(goalMl * 0.001).toFixed(1)}L</Text>
            </View>
            <View style={styles.graduation}>
              <View style={styles.graduationLine} />
              <Text style={styles.graduationLabel}>{(goalMl * 0.00075).toFixed(1)}L</Text>
            </View>
            <View style={styles.graduation}>
              <View style={styles.graduationLine} />
              <Text style={styles.graduationLabel}>{(goalMl * 0.0005).toFixed(1)}L</Text>
            </View>
            <View style={styles.graduation}>
              <View style={styles.graduationLine} />
              <Text style={styles.graduationLabel}>{(goalMl * 0.00025).toFixed(1)}L</Text>
            </View>
            <View style={styles.graduation}>
              <View style={styles.graduationLine} />
              <Text style={styles.graduationLabel}>0.0L</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Valeur ou message de félicitations */}
      {goalReached ? (
        <Text style={[styles.congratsText, { color: '#10B981' }]}>
          Bravo {gender === 'female' ? 'Championne' : 'Champion'} ! 🎉
        </Text>
      ) : (
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {formatDisplay(currentMl)}L
          <Text style={[styles.goalText, { color: colors.textMuted }]}> / {goalMl / 1000}L</Text>
        </Text>
      )}

      {/* Boutons avec ml explicite */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#EF444415' }]}
          onPress={() => handleAddWater(-250)}
        >
          <Minus size={12} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#0EA5E920' }]}
          onPress={() => handleAddWater(250)}
        >
          <Text style={styles.buttonText}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#0EA5E9' }]}
          onPress={() => handleAddWater(500)}
        >
          <Text style={styles.buttonTextPrimary}>+500ml</Text>
        </TouchableOpacity>
      </View>

      {/* Popup de félicitations */}
      <Modal
        visible={showCongrats}
        transparent
        animationType="none"
        onRequestClose={() => setShowCongrats(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            styles.congratsModal,
            { backgroundColor: colors.backgroundCard },
            { transform: [{ scale: scaleAnim }] }
          ]}>
            <View style={styles.trophyContainer}>
              <Trophy size={48} color="#10B981" fill="#10B981" />
            </View>
            <Text style={[styles.congratsTitle, { color: colors.textPrimary }]}>
              Félicitations !
            </Text>
            <Text style={[styles.congratsMessage, { color: '#10B981' }]}>
              Bravo {gender === 'female' ? 'Championne' : 'Champion'} !
            </Text>
            <Text style={[styles.congratsSubtext, { color: colors.textMuted }]}>
              Objectif d'hydratation atteint
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'visible',
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
  bottleWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  bottleCap: {
    width: 20,
    height: 8,
    backgroundColor: '#0EA5E9',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    zIndex: 10,
  },
  bottleNeck: {
    width: 16,
    height: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#0EA5E9',
  },
  bottleBody: {
    width: 45,
    height: 75,
    borderWidth: 2.5,
    borderColor: '#0EA5E9',
    borderRadius: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.03)',
    overflow: 'hidden',
    position: 'relative',
  },
  waterLevel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0EA5E9',
    opacity: 0.9,
    overflow: 'visible',
  },
  waterWave: {
    position: 'absolute',
    top: -5,
    left: -8,
    right: -8,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 50,
  },
  bubble: {
    position: 'absolute',
  },
  bubbleCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  graduations: {
    position: 'absolute',
    right: -32,
    top: 14,
    height: 75,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  graduation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  graduationLine: {
    width: 12,
    height: 2,
    backgroundColor: '#0EA5E9',
    borderRadius: 1,
  },
  graduationLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  congratsText: {
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsModal: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  trophyContainer: {
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  congratsMessage: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  congratsSubtext: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
