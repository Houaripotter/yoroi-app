// ============================================
// RATING POPUP - Demande de notation humble et personnelle
// Apparaît après 3 actions positives (poids, séance)
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { APP_CONFIG } from '@/lib/appConfig';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { requestReview, isAvailableAsync } from 'expo-store-review';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RatingPopupProps {
  visible: boolean;
  onClose: () => void;
  onRated: () => void;
  actionType?: 'weight' | 'session' | 'general';
}

export const RatingPopup: React.FC<RatingPopupProps> = ({
  visible,
  onClose,
  onRated,
  actionType = 'general',
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animation du coeur
      const heartbeat = Animated.sequence([
        Animated.timing(heartAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1.15,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
      ]);

      const heartLoop = Animated.loop(heartbeat);
      heartLoop.start();

      return () => {
        heartLoop.stop();
      };
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleRateApp = async () => {
    notificationAsync(NotificationFeedbackType.Success);

    try {
      // Utiliser le système natif de notation
      const isAvailable = await isAvailableAsync();
      if (isAvailable) {
        await requestReview();
      } else {
        // Fallback vers le store
        const storeUrl = APP_CONFIG.getReviewUrl();
        if (storeUrl) {
          await safeOpenURL(storeUrl);
        }
      }
      onRated();
    } catch (error) {
      // Silently fail - review request is not critical
    }

    onClose();
  };

  const handleSuggestionBox = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    onClose();
    // Naviguer vers la boîte à idées
    router.push('/ideas');
  };

  const handleLater = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  };

  // Message personnalisé selon l'action
  const getPersonalMessage = () => {
    const messages = {
      weight: t('rating.messageWeight') || "Tu viens d'enregistrer ton poids, c'est super de rester régulier !",
      session: t('rating.messageSession') || "Bravo pour cette séance ! Tu fais partie des warriors qui se dépassent !",
      general: t('rating.messageGeneral') || "Merci d'utiliser Yoroi au quotidien !",
    };
    return messages[actionType];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <BlurView
        intensity={isDark ? 40 : 20}
        style={styles.blurContainer}
        tint={isDark ? 'dark' : 'light'}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleLater}
        />

        <Animated.View
          style={[
            styles.popupContainer,
            {
              backgroundColor: colors.backgroundCard,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Bouton fermer */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: `${colors.textMuted}20` }]}
            onPress={handleLater}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Photo du développeur ou avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[colors.accent, `${colors.accent}80`]}
              style={styles.avatarGradient}
            >
              {/* Logo de l'app avec fond noir en clair et blanc en sombre */}
              <View style={[styles.avatarImageContainer, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}>
                <Image source={require('@/assets/images/icon.png')} style={styles.avatarImage} />
              </View>
            </LinearGradient>

            {/* Badge coeur animé */}
            <Animated.View
              style={[
                styles.heartBadge,
                { backgroundColor: '#FF6B6B', transform: [{ scale: heartAnim }] },
              ]}
            >
              <Ionicons name="heart" size={14} color="#FFFFFF" />
            </Animated.View>
          </View>

          {/* Message personnel */}
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {t('rating.greeting') || 'Salut Champion !'}
          </Text>

          <Text style={[styles.actionMessage, { color: colors.textPrimary }]}>
            {getPersonalMessage()}
          </Text>

          {/* Message humble */}
          <Text style={[styles.humbleMessage, { color: colors.textSecondary }]}>
            {t('rating.humbleMessage') ||
              "Excuse-moi de t'interrompre... Je sais que ton temps est précieux.\n\nMais si Yoroi t'aide dans ta progression, une petite note sur le Store m'aiderait énormément à faire grandir notre famille de warriors et à rendre l'app visible pour d'autres sportifs comme toi.\n\nSi je mérite les 5 étoiles, je t'en serais infiniment reconnaissant. ⭐⭐⭐⭐⭐"}
          </Text>

          {/* Statistique encourageante */}
          <View style={[styles.statBox, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}30`, borderWidth: 1 }]}>
            <Ionicons name="people" size={20} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.textPrimary }]}>
              {t('rating.familyGrowing') || 'Chaque note aide la famille Yoroi à grandir !'}
            </Text>
          </View>

          {/* Signature */}
          <Text style={[styles.signature, { color: colors.textMuted }]}>
            Équipe Yoroi
          </Text>

          {/* Boutons */}
          <View style={styles.buttonsContainer}>
            {/* Bouton principal - Noter */}
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: colors.accent }]}
              onPress={handleRateApp}
              activeOpacity={0.8}
            >
              <View style={styles.rateButtonGradient}>
                <Ionicons name="star" size={22} color={colors.textOnAccent} />
                <Text style={[styles.rateButtonText, { color: colors.textOnAccent }]}>
                  {t('rating.rateButton') || "Je note l'app !"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Bouton secondaire - Boîte à idées */}
            <TouchableOpacity
              style={[styles.suggestionButton, { backgroundColor: `${colors.accent}15` }]}
              onPress={handleSuggestionBox}
              activeOpacity={0.7}
            >
              <Ionicons name="bulb-outline" size={20} color={colors.accent} />
              <Text style={[styles.suggestionButtonText, { color: isDark ? colors.accent : colors.textPrimary }]}>
                {t('rating.suggestionButton') || "J'ai une idée / un problème"}
              </Text>
            </TouchableOpacity>

            {/* Bouton tertiaire - Plus tard */}
            <TouchableOpacity
              style={styles.laterButton}
              onPress={handleLater}
              activeOpacity={0.6}
            >
              <Text style={[styles.laterButtonText, { color: colors.textMuted }]}>
                {t('rating.laterButton') || 'Plus tard, je suis pressé'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message de remerciement */}
          <Text style={[styles.thankYou, { color: colors.textMuted }]}>
            {t('rating.thankYou') || 'Merci du fond du cœur ! ❤️'}
          </Text>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  popupContainer: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarImageContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  heartBadge: {
    position: 'absolute',
    bottom: 0,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  humbleMessage: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  rateButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  rateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  suggestionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  thankYou: {
    fontSize: 12,
    marginTop: 16,
  },
  signature: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default RatingPopup;
