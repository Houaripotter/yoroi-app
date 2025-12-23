import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

// ============================================
// SAMURAI SLASH - ANIMATION DE TRANSITION
// ============================================
// Effet de coupe de katana avec separation de l'ecran
// 1. Ecran noir avec logo
// 2. Silhouette de samourai apparait
// 3. Mouvement de katana rapide
// 4. L'ecran se "coupe" en diagonale
// 5. Les deux moities glissent et revelent le contenu

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Images de samourai disponibles
const SAMURAI_IMAGES = {
  man1: require('@/assets/images/samurai_man_1.png'),
  man2: require('@/assets/images/samurai_man_2.png'),
  man3: require('@/assets/images/samurai_man_3.png'),
  woman1: require('@/assets/images/samurai_woman_1.png'),
  woman2: require('@/assets/images/samurai_woman_2.png'),
  woman3: require('@/assets/images/samurai_woman_3.png'),
};

type SamuraiImage = keyof typeof SAMURAI_IMAGES;

interface SamuraiSlashProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
  showLogo?: boolean;
  showSamurai?: boolean;
  samuraiImage?: SamuraiImage;
  duration?: number;
  message?: string;
  messageJp?: string;
}

export const SamuraiSlash: React.FC<SamuraiSlashProps> = ({
  isVisible,
  onAnimationComplete,
  showLogo = true,
  showSamurai = true,
  samuraiImage = 'man1',
  duration = 2000,
  message,
  messageJp,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Valeurs d'animation avec Animated de React Native
  const slashProgress = useRef(new Animated.Value(0)).current;
  const topHalfTranslate = useRef(new Animated.Value(0)).current;
  const bottomHalfTranslate = useRef(new Animated.Value(0)).current;
  const slashOpacity = useRef(new Animated.Value(0)).current;
  const slashGlow = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const samuraiOpacity = useRef(new Animated.Value(0)).current;
  const samuraiScale = useRef(new Animated.Value(0.8)).current;
  const messageOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const sparkOpacity = useRef(new Animated.Value(0)).current;

  // Charger le son
  useEffect(() => {
    loadSound();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/gong.mp3')
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Son non disponible:', error);
    }
  };

  const playSlashSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.log('Erreur son:', error);
    }
  };

  // Lancer l'animation
  useEffect(() => {
    if (isVisible) {
      // Reset toutes les valeurs
      slashProgress.setValue(0);
      topHalfTranslate.setValue(0);
      bottomHalfTranslate.setValue(0);
      slashOpacity.setValue(0);
      slashGlow.setValue(0);
      logoOpacity.setValue(0);
      samuraiOpacity.setValue(0);
      samuraiScale.setValue(0.8);
      messageOpacity.setValue(0);
      containerOpacity.setValue(1);
      sparkOpacity.setValue(0);

      // Durations basees sur la duree totale
      const logoDuration = duration * 0.15;
      const samuraiAppearDuration = duration * 0.2;
      const slashDuration = duration * 0.15;
      const splitDuration = duration * 0.3;
      const fadeDuration = duration * 0.2;

      // Animation sequence
      // 1. Afficher le logo YOROI
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: logoDuration,
        useNativeDriver: true,
      }).start();

      // 2. Afficher le samourai avec scale up
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(samuraiOpacity, {
            toValue: 1,
            duration: samuraiAppearDuration,
            useNativeDriver: true,
          }),
          Animated.spring(samuraiScale, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Afficher le message si present
        if (message) {
          setTimeout(() => {
            Animated.timing(messageOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }, samuraiAppearDuration * 0.5);
        }
      }, logoDuration);

      // 3. Le SLASH !
      setTimeout(() => {
        playSlashSound();

        // Sparks au moment du slash
        Animated.sequence([
          Animated.timing(sparkOpacity, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(sparkOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Slash line + glow
        Animated.parallel([
          Animated.timing(slashProgress, {
            toValue: 1,
            duration: slashDuration,
            easing: Easing.out(Easing.exp),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(slashOpacity, {
              toValue: 1,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(slashGlow, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.delay(slashDuration - 200),
            Animated.parallel([
              Animated.timing(slashOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(slashGlow, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ]),
          // Fade out samourai pendant le slash
          Animated.timing(samuraiOpacity, {
            toValue: 0,
            duration: slashDuration,
            useNativeDriver: true,
          }),
        ]).start();

        // 4. Separation des moities
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(topHalfTranslate, {
              toValue: -SCREEN_HEIGHT,
              duration: splitDuration,
              easing: Easing.in(Easing.back(0.5)),
              useNativeDriver: true,
            }),
            Animated.timing(bottomHalfTranslate, {
              toValue: SCREEN_HEIGHT,
              duration: splitDuration,
              easing: Easing.in(Easing.back(0.5)),
              useNativeDriver: true,
            }),
          ]).start();

          // 5. Fade out final
          setTimeout(() => {
            Animated.timing(containerOpacity, {
              toValue: 0,
              duration: fadeDuration,
              useNativeDriver: true,
            }).start(() => {
              onAnimationComplete?.();
            });
          }, splitDuration * 0.8);
        }, slashDuration);
      }, logoDuration + samuraiAppearDuration + (message ? 300 : 100));
    }
  }, [isVisible]);

  // Interpolation pour la largeur du slash
  const slashWidth = slashProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 2],
  });

  // Rotation des moities (effet de chute)
  const topRotation = topHalfTranslate.interpolate({
    inputRange: [-SCREEN_HEIGHT, 0],
    outputRange: ['-8deg', '0deg'],
  });

  const bottomRotation = bottomHalfTranslate.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: ['0deg', '8deg'],
  });

  // Glow scale pour effet de flash
  const glowScale = slashGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Moitie superieure */}
      <Animated.View
        style={[
          styles.halfScreen,
          styles.topHalf,
          {
            transform: [
              { translateY: topHalfTranslate },
              { rotate: topRotation },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#050505', '#0F0F0F', '#1A1A1A']}
          style={styles.gradient}
        >
          {showLogo && (
            <Animated.View style={[styles.logoContainer, { opacity: logoOpacity }]}>
              <Text style={styles.logoText}>YOROI</Text>
              <Text style={styles.logoKanji}>鎧</Text>
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Moitie inferieure */}
      <Animated.View
        style={[
          styles.halfScreen,
          styles.bottomHalf,
          {
            transform: [
              { translateY: bottomHalfTranslate },
              { rotate: bottomRotation },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#1A1A1A', '#0F0F0F', '#050505']}
          style={styles.gradient}
        />
      </Animated.View>

      {/* Silhouette Samourai */}
      {showSamurai && (
        <Animated.View
          style={[
            styles.samuraiContainer,
            {
              opacity: samuraiOpacity,
              transform: [{ scale: samuraiScale }],
            },
          ]}
        >
          <Image
            source={SAMURAI_IMAGES[samuraiImage]}
            style={styles.samuraiImage}
            resizeMode="contain"
          />
          {/* Glow autour du samourai */}
          <View style={styles.samuraiGlow} />
        </Animated.View>
      )}

      {/* Message (pour promotion de rang) */}
      {message && (
        <Animated.View style={[styles.messageContainer, { opacity: messageOpacity }]}>
          <Text style={styles.messageText}>{message}</Text>
          {messageJp && <Text style={styles.messageJp}>{messageJp}</Text>}
        </Animated.View>
      )}

      {/* Sparks / etincelles */}
      <Animated.View style={[styles.sparksContainer, { opacity: sparkOpacity }]}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.spark,
              {
                left: `${20 + Math.random() * 60}%`,
                top: `${40 + Math.random() * 20}%`,
                transform: [{ rotate: `${Math.random() * 360}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Trait de slash (diagonal dore) avec glow */}
      <Animated.View style={[styles.slashContainer, { opacity: slashOpacity }]}>
        {/* Glow derriere le slash */}
        <Animated.View
          style={[
            styles.slashGlowOuter,
            {
              width: slashWidth,
              opacity: slashGlow,
              transform: [{ scaleY: glowScale }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(212, 175, 55, 0.3)', 'rgba(255, 215, 0, 0.5)', 'rgba(212, 175, 55, 0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.slashGradient}
          />
        </Animated.View>

        {/* Slash principal */}
        <Animated.View style={[styles.slashLine, { width: slashWidth }]}>
          <LinearGradient
            colors={['transparent', '#D4AF37', '#FFD700', '#FFFFFF', '#FFD700', '#D4AF37', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.slashGradient}
          />
        </Animated.View>
      </Animated.View>

      {/* Flash au moment du slash */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: slashGlow.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.3, 0],
            }),
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  halfScreen: {
    position: 'absolute',
    left: -50,
    right: -50,
    height: SCREEN_HEIGHT / 2 + 50,
    overflow: 'hidden',
  },
  topHalf: {
    top: -25,
  },
  bottomHalf: {
    bottom: -25,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT / 4 - 40,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '900',
    color: '#D4AF37',
    letterSpacing: 10,
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoKanji: {
    fontSize: 28,
    color: 'rgba(212, 175, 55, 0.6)',
    marginTop: 8,
  },
  // Samourai
  samuraiContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  samuraiImage: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_HEIGHT * 0.5,
    opacity: 0.9,
  },
  samuraiGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: SCREEN_WIDTH * 0.35,
    zIndex: -1,
  },
  // Message (promotion rang)
  messageContainer: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  messageText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D4AF37',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  messageJp: {
    fontSize: 18,
    color: 'rgba(212, 175, 55, 0.7)',
    marginTop: 8,
  },
  // Sparks / etincelles
  sparksContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  spark: {
    position: 'absolute',
    width: 3,
    height: 20,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  // Slash
  slashContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-20deg' }],
    zIndex: 30,
  },
  slashGlowOuter: {
    position: 'absolute',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  slashLine: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  slashGradient: {
    flex: 1,
  },
  // Flash overlay
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFD700',
    zIndex: 35,
  },
});

// Version simplifiee (juste le trait dore)
export const SimpleSlash: React.FC<{
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
}> = ({ isVisible, onComplete, duration = 800 }) => {
  const slashProgress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      slashProgress.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(slashProgress, {
          toValue: 1,
          duration: duration * 0.4,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }
  }, [isVisible]);

  const width = slashProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 2],
  });

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.slashContainer, { opacity }]}>
      <Animated.View style={[styles.slashLine, { width }]}>
        <LinearGradient
          colors={['transparent', '#D4AF37', '#FFD700', '#FFFFFF', '#FFD700', '#D4AF37', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.slashGradient}
        />
      </Animated.View>
    </Animated.View>
  );
};

export default SamuraiSlash;
