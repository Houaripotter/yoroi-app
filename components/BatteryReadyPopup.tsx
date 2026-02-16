import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { Zap, X, Dumbbell, ChevronRight, Battery, Flame } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POPUP_KEY = '@yoroi_battery_popup_shown';

interface BatteryReadyPopupProps {
  batteryPercent: number;
  onClose?: () => void;
}

export const BatteryReadyPopup: React.FC<BatteryReadyPopupProps> = ({
  batteryPercent,
  onClose,
}) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    checkAndShowPopup();

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (pulseLoopRef.current) pulseLoopRef.current.stop();
    };
  }, [batteryPercent]);

  const checkAndShowPopup = async () => {
    // Ne montrer que si batterie >= 80%
    if (batteryPercent < 80) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const lastShown = await AsyncStorage.getItem(POPUP_KEY);

      // Ne montrer qu'une fois par jour
      if (lastShown === today) return;

      // Marquer comme montré aujourd'hui
      await AsyncStorage.setItem(POPUP_KEY, today);

      // Afficher le popup avec délai
      showTimerRef.current = setTimeout(() => {
        setVisible(true);
        notificationAsync(NotificationFeedbackType.Success);

        // Animation d'entrée
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Animation pulse continue
        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          ])
        );
        pulseLoopRef.current.start();
      }, 1500);
    } catch (error) {
      logger.error('Erreur popup batterie:', error);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      onClose?.();
    });
  };

  const handleGoTrain = () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    handleClose();
    setTimeout(() => {
      router.push('/add-training');
    }, 300);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View 
          style={[
            styles.popup, 
            { 
              backgroundColor: colors.backgroundCard,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Bouton fermer */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Icône animée */}
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.iconBg, { backgroundColor: '#10B98120' }]}>
              <Flame size={40} color="#10B981" />
            </View>
          </Animated.View>

          {/* Texte */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Tu es au top !
          </Text>
          <Text style={[styles.subtitle, { color: '#10B981' }]}>
            Batterie à {Math.round(batteryPercent)}%
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            Ton corps est prêt pour une séance intense. C'est le moment idéal pour progresser !
          </Text>

          {/* Boutons */}
          <TouchableOpacity 
            style={[styles.goBtn, { backgroundColor: '#10B981' }]}
            onPress={handleGoTrain}
          >
            <Dumbbell size={20} color="#FFFFFF" />
            <Text style={styles.goBtnText}>GO S'ENTRAÎNER</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterBtn} onPress={handleClose}>
            <Text style={[styles.laterText, { color: colors.textMuted }]}>Plus tard</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popup: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
  },
  goBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  laterBtn: {
    marginTop: 12,
    padding: 8,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BatteryReadyPopup;

