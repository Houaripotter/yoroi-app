import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing, Modal } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Droplets, Minus, Settings, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { scale, getGridColumns } from '@/constants/responsive';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 8*2 = 16, gaps entre cartes = 8 * (colonnes - 1)
const columns = getGridColumns(); // 2 sur iPhone, 3 sur iPad
const CARD_SIZE = (screenWidth - scale(16 + 8 * (columns - 1))) / columns;

interface HydrationLottieCardProps {
  currentMl?: number; // En millilitres maintenant
  goalMl?: number;    // En millilitres
  onAddMl?: (amountMl: number) => void; // En millilitres
}

export const HydrationLottieCard: React.FC<HydrationLottieCardProps> = ({
  currentMl = 0,
  goalMl,
  onAddMl
}) => {
  const { colors } = useTheme();
  const percentage = Math.min((currentMl / goalMl) * 100, 100);
  const goalReached = currentMl >= goalMl;

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
        console.error('Erreur chargement genre:', error);
      }
    };
    loadGender();
  }, []);

  // Détecter quand l'objectif est atteint
  useEffect(() => {
    if (goalReached && !hasShownCongrats) {
      setHasShownCongrats(true);
      setShowCongrats(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
          <Text style={styles.title}>HYDRATATION</Text>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/hydration')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Settings size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Bouteille simple sans animation qui bouge - CLIQUABLE */}
      <TouchableOpacity
        style={styles.animationContainer}
        onPress={() => router.push('/hydration')}
        activeOpacity={0.7}
      >
        <View style={styles.bottle}>
          {/* Bouchon animé - se lève complètement */}
          <Animated.View style={[
            styles.cap,
            { backgroundColor: '#0EA5E9' },
            {
              transform: [
                {
                  translateY: capRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -20]
                  })
                },
                {
                  translateX: capRotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 5]
                  })
                }
              ]
            }
          ]} />

          {/* Corps de la bouteille */}
          <View style={[styles.bottleBody, { borderColor: '#0EA5E9' }]}>
            {/* Eau avec vagues */}
            <View style={styles.waterFill}>
              <View
                style={[
                  styles.water,
                  {
                    height: percentage >= 100 ? '110%' : `${percentage}%`,
                    backgroundColor: '#0EA5E9',
                  }
                ]}
              >
                {/* Vague qui ondule de gauche à droite - BIEN VISIBLE */}
                {percentage > 0 && (
                  <>
                    <Animated.View style={[
                      styles.waveLayer,
                      {
                        transform: [{
                          translateX: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-12, 12]
                          })
                        }],
                      }
                    ]}>
                      <View style={styles.waveShape1} />
                    </Animated.View>
                    <Animated.View style={[
                      styles.waveLayer,
                      styles.waveLayer2,
                      {
                        transform: [{
                          translateX: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, -12]
                          })
                        }],
                      }
                    ]}>
                      <View style={styles.waveShape2} />
                    </Animated.View>
                  </>
                )}

                {/* Bulles qui montent quand on ajoute de l'eau */}
                {isPouringWater && (
                  <>
                    <Animated.View style={[
                      styles.bubble,
                      { left: '20%' },
                      {
                        transform: [{
                          translateY: pourAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -70]
                          })
                        }],
                        opacity: pourAnim.interpolate({
                          inputRange: [0, 0.2, 0.8, 1],
                          outputRange: [0, 1, 1, 0]
                        })
                      }
                    ]}>
                      <View style={styles.bubbleShape} />
                    </Animated.View>
                    <Animated.View style={[
                      styles.bubble,
                      { left: '50%' },
                      {
                        transform: [{
                          translateY: pourAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, -80]
                          })
                        }],
                        opacity: pourAnim.interpolate({
                          inputRange: [0, 0.3, 0.9, 1],
                          outputRange: [0, 1, 1, 0]
                        })
                      }
                    ]}>
                      <View style={[styles.bubbleShape, { width: 10, height: 10, borderRadius: 5 }]} />
                    </Animated.View>
                    <Animated.View style={[
                      styles.bubble,
                      { left: '75%' },
                      {
                        transform: [{
                          translateY: pourAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [5, -65]
                          })
                        }],
                        opacity: pourAnim.interpolate({
                          inputRange: [0, 0.25, 0.85, 1],
                          outputRange: [0, 1, 1, 0]
                        })
                      }
                    ]}>
                      <View style={[styles.bubbleShape, { width: 7, height: 7, borderRadius: 3.5 }]} />
                    </Animated.View>
                  </>
                )}
              </View>
            </View>

            {/* Graduations avec chiffres */}
            <View style={styles.graduations}>
              {[100, 75, 50, 25, 0].map((val, index) => {
                const liters = ((goalMl / 1000) * (val / 100)).toFixed(1);
                return (
                  <View key={val} style={styles.gradRow}>
                    <View style={styles.grad} />
                    <Text style={styles.gradLabel}>{liters}</Text>
                  </View>
                );
              })}
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
};

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
    overflow: 'visible',
  },
  bottle: {
    alignItems: 'center',
    overflow: 'visible',
  },
  cap: {
    width: 28,
    height: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    zIndex: 15,
    elevation: 15,
  },
  bottleBody: {
    width: 60,
    height: 85,
    borderWidth: 3,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'visible',
    position: 'relative',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    zIndex: 5,
    elevation: 5,
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: -2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 9,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  water: {
    width: '100%',
    backgroundColor: '#0EA5E9',
    opacity: 0.8,
    position: 'relative',
  },
  waveLayer: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    height: 12,
    overflow: 'visible',
  },
  waveLayer2: {
    top: -3,
  },
  waveShape1: {
    width: '120%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    marginLeft: '-10%',
  },
  waveShape2: {
    width: '120%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderTopLeftRadius: 55,
    borderTopRightRadius: 55,
    marginLeft: '-10%',
  },
  bubble: {
    position: 'absolute',
    bottom: 10,
  },
  bubbleShape: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  graduations: {
    position: 'absolute',
    right: -22,
    top: 3,
    bottom: 3,
    justifyContent: 'space-between',
  },
  gradRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  grad: {
    width: 8,
    height: 1.5,
    backgroundColor: 'rgba(14, 165, 233, 0.5)',
  },
  gradLabel: {
    fontSize: 8,
    fontWeight: '700',
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
