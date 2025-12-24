import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Moon, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import Svg, { Path, Circle, Ellipse, G } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 8*2 = 16, gap 12 = total 28
const CARD_SIZE = (screenWidth - 28) / 2;

interface SleepLottieCardProps {
  hours?: number;
  quality?: number;
  debt?: number;
  goal?: number;
}

export const SleepLottieCard: React.FC<SleepLottieCardProps> = ({
  hours = 0,
  quality = 0,
  debt = 0,
  goal = 8
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
    // Lune flottante
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
    
    // Étoiles scintillantes
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
    
    const t1 = twinkle(starOpacity1, 0);
    const t2 = twinkle(starOpacity2, 300);
    const t3 = twinkle(starOpacity3, 600);
    
    t1.start();
    t2.start();
    t3.start();
    
    // Animation ZzZ
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
    
    const z1 = animateZzz(zzz1Opacity, zzz1TranslateY, 0);
    const z2 = animateZzz(zzz2Opacity, zzz2TranslateY, 500);
    const z3 = animateZzz(zzz3Opacity, zzz3TranslateY, 1000);
    
    z1.start();
    z2.start();
    z3.start();
    
    // Respiration couverture
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
    
    return () => {
      float.stop();
      t1.stop();
      t2.stop();
      t3.stop();
      z1.stop();
      z2.stop();
      z3.stop();
      breathe.stop();
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

  // Gradients adaptatifs au thème
  const gradientTop = isDark ? '#1E1B4B30' : '#DDD6FE20'; // Violet foncé en sombre, violet clair en clair
  const gradientBottom = isDark ? '#0F172A40' : '#C4B5FD15'; // Bleu-noir en sombre, violet très clair en clair

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      {/* Background gradient effect - nuit étoilée */}
      <View style={styles.gradientBg}>
        <View style={[styles.gradientTop, { backgroundColor: gradientTop }]} />
        <View style={[styles.gradientBottom, { backgroundColor: gradientBottom }]} />
      </View>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Moon size={12} color="#8B5CF6" />
          <Text style={styles.title}>SOMMEIL</Text>
        </View>
        <StatusIcon size={14} color={status.color} />
      </View>

      {/* Zone animation */}
      <View style={styles.animationContainer}>
        {/* Étoiles scintillantes */}
        <Animated.View style={[styles.star, styles.star1, { opacity: starOpacity1 }]}>
          <View style={[styles.starDot, { backgroundColor: '#C4B5FD' }]} />
        </Animated.View>
        <Animated.View style={[styles.star, styles.star2, { opacity: starOpacity2 }]}>
          <View style={[styles.starDot, styles.starDotSmall, { backgroundColor: '#DDD6FE' }]} />
        </Animated.View>
        <Animated.View style={[styles.star, styles.star3, { opacity: starOpacity3 }]}>
          <View style={[styles.starDot, { backgroundColor: '#C4B5FD' }]} />
        </Animated.View>
        <Animated.View style={[styles.star, styles.star4, { opacity: starOpacity1 }]}>
          <View style={[styles.starDot, styles.starDotSmall, { backgroundColor: '#E9D5FF' }]} />
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
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
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
  starDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  starDotSmall: {
    width: 3,
    height: 3,
  },
  moonContainer: {
    position: 'absolute',
    top: -8,
    right: 0,
  },
  sleepScene: {
    marginTop: 5,
  },
  zzzContainer: {
    position: 'absolute',
    top: 5,
    right: 25,
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
    right: 0,
    top: 0,
  },
  zzz2: {
    fontSize: 15,
    position: 'absolute',
    right: 10,
    top: -6,
  },
  zzz3: {
    fontSize: 20,
    position: 'absolute',
    right: 22,
    top: -14,
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
    fontSize: 20,
    fontWeight: '900',
  },
  unit: {
    fontSize: 12,
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
