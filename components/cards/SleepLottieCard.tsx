import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Moon, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';
import { router } from 'expo-router';
import { scale, getGridColumns } from '@/constants/responsive';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 16*2 = 32, gaps entre cartes = 8 * (colonnes - 1)
const columns = getGridColumns(); // 2 sur iPhone, 3 sur iPad
const CARD_SIZE = (screenWidth - 32 - 8 * (columns - 1)) / columns;

interface SleepLottieCardProps {
  hours?: number;
  quality?: number;
  debt?: number;
  goal?: number;
}

export const SleepLottieCard = React.memo<SleepLottieCardProps>(({
  hours = 0,
  quality = 0,
  debt = 0,
  goal
}) => {
  const { colors, isDark } = useTheme();
  
  // Animations
  const moonFloat = useRef(new Animated.Value(0)).current;
  const starOpacity1 = useRef(new Animated.Value(0.3)).current;
  const starOpacity2 = useRef(new Animated.Value(0.6)).current;
  const starOpacity3 = useRef(new Animated.Value(0.4)).current;
  
  // ZzZ animations
  const zzz1Opacity = useRef(new Animated.Value(0)).current;
  const zzz1TranslateY = useRef(new Animated.Value(0)).current;
  const zzz2Opacity = useRef(new Animated.Value(0)).current;
  const zzz2TranslateY = useRef(new Animated.Value(0)).current;
  const zzz3Opacity = useRef(new Animated.Value(0)).current;
  const zzz3TranslateY = useRef(new Animated.Value(0)).current;
  
  // Couverture qui respire
  const breatheScale = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // OPTIMISATION #70: Étaler les animations avec setTimeout pour éviter de blocker le thread
    const animations: any[] = [];
    const timeouts: NodeJS.Timeout[] = [];

    // Lune flottante - démarrage immédiat (légère)
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(moonFloat, {
          toValue: -4,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(moonFloat, {
          toValue: 4,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    float.start();
    animations.push(float);

    // Étoiles scintillantes - démarrage décalé
    const twinkle = (anim: Animated.Value, delay: number) => Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.2,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const timeout1 = setTimeout(() => {
      const t1 = twinkle(starOpacity1, 0);
      t1.start();
      animations.push(t1);
    }, 100);
    timeouts.push(timeout1);

    const timeout2 = setTimeout(() => {
      const t2 = twinkle(starOpacity2, 300);
      t2.start();
      animations.push(t2);
    }, 150);
    timeouts.push(timeout2);

    const timeout3 = setTimeout(() => {
      const t3 = twinkle(starOpacity3, 600);
      t3.start();
      animations.push(t3);
    }, 200);
    timeouts.push(timeout3);

    // Animation ZzZ - démarrage encore plus décalé
    const animateZzz = (opacity: Animated.Value, translateY: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -15,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const timeout4 = setTimeout(() => {
      const z1 = animateZzz(zzz1Opacity, zzz1TranslateY, 0);
      z1.start();
      animations.push(z1);
    }, 250);
    timeouts.push(timeout4);

    const timeout5 = setTimeout(() => {
      const z2 = animateZzz(zzz2Opacity, zzz2TranslateY, 500);
      z2.start();
      animations.push(z2);
    }, 300);
    timeouts.push(timeout5);

    const timeout6 = setTimeout(() => {
      const z3 = animateZzz(zzz3Opacity, zzz3TranslateY, 1000);
      z3.start();
      animations.push(z3);
    }, 350);
    timeouts.push(timeout6);

    // Respiration couverture - démarrage différé
    const timeout7 = setTimeout(() => {
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheScale, {
            toValue: 1.02,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breatheScale, {
            toValue: 1,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      breathe.start();
      animations.push(breathe);
    }, 400);
    timeouts.push(timeout7);

    return () => {
      // Cleanup animations
      animations.forEach(anim => anim.stop && anim.stop());
      // Cleanup timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Déterminer le statut
  const getStatus = () => {
    if (hours === 0) return { text: 'Aucune donnée', color: '#9CA3AF', icon: Moon };
    if (hours >= 7) return { text: 'Excellent', color: '#10B981', icon: CheckCircle };
    if (hours >= 5) return { text: 'Correct', color: '#F59E0B', icon: Moon };
    return { text: 'Insuffisant', color: '#EF4444', icon: AlertTriangle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundCard }]}
      onPress={() => router.push('/sleep')}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Moon size={12} color="#8B5CF6" />
          <Text style={styles.title}>SOMMEIL</Text>
        </View>
      </View>

      {/* Zone animation */}
      <View style={styles.animationContainer}>
        {/* Vraies étoiles ★ */}
        <Animated.View style={[styles.star, styles.star1, { opacity: starOpacity1 }]}>
          <Text style={[styles.starIcon, { color: '#DDD6FE' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star2, { opacity: starOpacity2 }]}>
          <Text style={[styles.starIconSmall, { color: '#C4B5FD' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star3, { opacity: starOpacity3 }]}>
          <Text style={[styles.starIcon, { color: '#DDD6FE' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star4, { opacity: starOpacity1 }]}>
          <Text style={[styles.starIconSmall, { color: '#E9D5FF' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star5, { opacity: starOpacity2 }]}>
          <Text style={[styles.starIcon, { color: '#C4B5FD' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star6, { opacity: starOpacity3 }]}>
          <Text style={[styles.starIconSmall, { color: '#DDD6FE' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star7, { opacity: starOpacity1 }]}>
          <Text style={[styles.starIconSmall, { color: '#E9D5FF' }]}>★</Text>
        </Animated.View>
        <Animated.View style={[styles.star, styles.star8, { opacity: starOpacity2 }]}>
          <Text style={[styles.starIcon, { color: '#C4B5FD' }]}>★</Text>
        </Animated.View>
        
        {/* Croissant de lune en haut à droite */}
        <Animated.View style={[
          styles.moonContainer,
          { transform: [{ translateY: moonFloat }] }
        ]}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="#FBBF24"
            />
          </Svg>
        </Animated.View>
        
        {/* Personne qui dort - Vue de profil claire */}
        <Animated.View style={[styles.sleepScene, { transform: [{ scale: breatheScale }] }]}>
          <Svg width={80} height={50} viewBox="0 0 80 50">
            {/* Lit - pieds du lit */}
            <Path d="M 5 45 L 5 38" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />
            <Path d="M 75 45 L 75 38" stroke="#6D28D9" strokeWidth="3" strokeLinecap="round" />
            
            {/* Lit - base / sommier */}
            <Path 
              d="M 3 38 L 77 38" 
              stroke="#7C3AED" 
              strokeWidth="4" 
              strokeLinecap="round"
            />
            
            {/* Matelas */}
            <Ellipse cx="40" cy="33" rx="35" ry="6" fill="#8B5CF6" opacity={0.8} />
            
            {/* Oreiller - bien visible */}
            <Ellipse cx="14" cy="28" rx="10" ry="5" fill="#C4B5FD" />
            <Ellipse cx="14" cy="27" rx="8" ry="4" fill="#DDD6FE" />
            
            {/* Corps sous la couverture */}
            <Path 
              d="M 8 30 Q 25 22 45 28 Q 60 32 70 30 L 70 35 Q 50 38 30 36 Q 15 34 8 35 Z" 
              fill="#A78BFA" 
              opacity={0.9}
            />
            
            {/* Tête de la personne - claire et visible */}
            <Circle cx="18" cy="22" r="7" fill="#FCD34D" />
            {/* Cheveux */}
            <Path 
              d="M 12 19 Q 18 14 24 19" 
              stroke="#92400E" 
              strokeWidth="3" 
              fill="none"
              strokeLinecap="round"
            />
            {/* Œil fermé - trait */}
            <Path 
              d="M 15 22 Q 17 23 19 22" 
              stroke="#78350F" 
              strokeWidth="1.5" 
              fill="none"
              strokeLinecap="round"
            />
            {/* Petit sourire paisible */}
            <Path 
              d="M 16 25 Q 18 26 20 25" 
              stroke="#78350F" 
              strokeWidth="1" 
              fill="none"
              strokeLinecap="round"
            />
            
            {/* Bras visible sur la couverture */}
            <Ellipse cx="28" cy="26" rx="4" ry="2.5" fill="#FCD34D" />
          </Svg>
        </Animated.View>
        
        {/* ZzZ qui flottent - plus visibles */}
        <View style={styles.zzzContainer}>
          <Animated.Text style={[
            styles.zzz,
            styles.zzz1,
            { 
              opacity: zzz1Opacity,
              transform: [{ translateY: zzz1TranslateY }],
              color: '#A78BFA',
            }
          ]}>
            z
          </Animated.Text>
          <Animated.Text style={[
            styles.zzz,
            styles.zzz2,
            { 
              opacity: zzz2Opacity,
              transform: [{ translateY: zzz2TranslateY }],
              color: '#8B5CF6',
            }
          ]}>
            Z
          </Animated.Text>
          <Animated.Text style={[
            styles.zzz,
            styles.zzz3,
            { 
              opacity: zzz3Opacity,
              transform: [{ translateY: zzz3TranslateY }],
              color: '#7C3AED',
            }
          ]}>
            Z
          </Animated.Text>
        </View>
      </View>

      {/* Valeur et status */}
      <View style={styles.valueContainer}>
        <View style={styles.hoursRow}>
          <Clock size={12} color="#8B5CF6" />
          <Text style={[styles.hours, { color: colors.textPrimary }]}>
            {hours > 0 ? hours.toFixed(1) : '--'}
            <Text style={[styles.unit, { color: colors.textMuted }]}>h</Text>
          </Text>
        </View>
        <Text style={[styles.status, { color: status.color }]}>
          {status.text}
        </Text>
      </View>

      {/* Footer - Dette si présente */}
      {debt > 0 && (
        <View style={[styles.footer, { backgroundColor: '#EF444415' }]}>
          <AlertTriangle size={10} color="#EF4444" />
          <Text style={styles.debtText}>
            Dette: {debt.toFixed(1)}h
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  star: {
    position: 'absolute',
  },
  star1: {
    top: -5,
    left: 5,
  },
  star2: {
    top: 0,
    left: 40,
  },
  star3: {
    top: 10,
    left: 20,
  },
  star4: {
    top: 5,
    right: 40,
  },
  star5: {
    top: 15,
    right: 10,
  },
  star6: {
    top: 8,
    left: 60,
  },
  star7: {
    top: 20,
    left: 8,
  },
  star8: {
    top: 3,
    right: 25,
  },
  starIcon: {
    fontSize: 12,
    textShadowColor: 'rgba(221, 214, 254, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  starIconSmall: {
    fontSize: 9,
    textShadowColor: 'rgba(221, 214, 254, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  moonContainer: {
    position: 'absolute',
    top: -8,
    right: 0,
  },
  sleepScene: {
    marginTop: 8,
  },
  zzzContainer: {
    position: 'absolute',
    top: 60,
    left: 48,
  },
  zzz: {
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  zzz1: {
    fontSize: 11,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  zzz2: {
    fontSize: 15,
    position: 'absolute',
    left: 8,
    top: -8,
  },
  zzz3: {
    fontSize: 20,
    position: 'absolute',
    left: 18,
    top: -18,
  },
  valueContainer: {
    alignItems: 'center',
    gap: 2,
    zIndex: 10,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hours: {
    fontSize: 24,
    fontWeight: '900',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  debtText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
});
