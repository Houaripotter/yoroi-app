import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { Audio } from 'expo-av';
import logger from '@/lib/security/logger';

interface RewardOverlayProps {
  onComplete?: () => void;
}

export const RewardOverlay = React.forwardRef<
  { trigger: () => void },
  RewardOverlayProps
>(({ onComplete }, ref) => {
  const [visible, setVisible] = useState(false);
  const animationRef = useRef<LottieView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Exposer la méthode trigger via ref
  React.useImperativeHandle(ref, () => ({
    trigger: () => {
      setVisible(true);
      // Réinitialiser l'animation puis la jouer
      animationRef.current?.reset();
      setTimeout(() => {
        animationRef.current?.play();
      }, 100);
      
      // Jouer le son (avec gestion d'erreur si le fichier n'existe pas)
      playSuccessSound();
    },
  }));

  const playSuccessSound = async () => {
    try {
      // Charger le son
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/victory.mp3')
      );
      soundRef.current = sound;
      
      // Jouer le son
      await sound.playAsync();
      
      // Nettoyer après la lecture
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      // Le fichier son n'existe pas ou erreur de chargement - on continue sans son
      logger.info('Son de succès non disponible:', error);
    }
  };

  // Gérer la fin de l'animation
  const handleAnimationFinish = () => {
    setVisible(false);
    animationRef.current?.reset();
    onComplete?.();
  };

  // Nettoyer le son lors du démontage
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <LottieView
          ref={animationRef}
          source={require('@/assets/animations/confetti.json')}
          style={styles.animation}
          loop={false}
          autoPlay={true}
          resizeMode="cover"
          onAnimationFinish={handleAnimationFinish}
        />
      </View>
    </Modal>
  );
});

RewardOverlay.displayName = 'RewardOverlay';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
