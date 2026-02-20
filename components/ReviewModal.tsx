// ============================================
// YOROI - REVIEW MODAL
// ============================================
// Popup personnalisee pour demander une note App Store
// Design premium avec logo et texte explicatif

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { requestReview } from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Star, Check, Clock } from 'lucide-react-native';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REVIEW_ASKED_KEY = 'yoroi_review_asked';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();

  // Option 1: Laisser un avis - ouvre le store review et marque comme fait
  const handleReview = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    onClose();

    try {
      await requestReview();
      await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
    } catch (error) {
      logger.info('Store review error:', error);
    }
  };

  // Option 2: C'est deja fait - marque comme fait, ne demandera plus
  const handleAlreadyDone = async () => {
    impactAsync(ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
    } catch (error) {
      logger.info('Mark review done error:', error);
    }
    onClose();
  };

  // Option 3: Plus tard - ferme simplement, redemandera plus tard
  const handleLater = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={isDark ? 40 : 20}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centeredView}>
          <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Accent bar gold */}
            <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />

            {/* Content */}
            <View style={styles.content}>
              {/* Logo de l'app */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/logo2010.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              {/* Titre */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Tu aimes Yoroi ?
              </Text>

              {/* Message explicatif */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Si l'app t'aide au quotidien, ta note sur l'App Store permet a Yoroi d'apparaitre dans les recherches et d'atteindre plus de sportifs.
              </Text>

              <Text style={[styles.messageSecondary, { color: colors.textMuted }]}>
                C'est grace a toi que la famille Yoroi grandit. Merci pour ton soutien !
              </Text>

              {/* Etoiles decoratives */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={24} color={colors.accent} fill={colors.accent} />
                ))}
              </View>
            </View>

            {/* Boutons */}
            <View style={styles.buttonsContainer}>
              {/* Bouton principal: Laisser un avis */}
              <TouchableOpacity
                style={[styles.buttonPrimary, { backgroundColor: colors.accent }]}
                onPress={handleReview}
                activeOpacity={0.8}
              >
                <Star size={18} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.buttonPrimaryText}>Laisser un avis</Text>
              </TouchableOpacity>

              {/* Bouton secondaire: C'est deja fait */}
              <TouchableOpacity
                style={[styles.buttonSecondary, { backgroundColor: colors.backgroundElevated }]}
                onPress={handleAlreadyDone}
                activeOpacity={0.8}
              >
                <Check size={16} color={colors.textSecondary} strokeWidth={2.5} />
                <Text style={[styles.buttonSecondaryText, { color: colors.textSecondary }]}>
                  C'est deja fait
                </Text>
              </TouchableOpacity>

              {/* Bouton tertiaire: Plus tard */}
              <TouchableOpacity
                style={styles.buttonTertiary}
                onPress={handleLater}
                activeOpacity={0.8}
              >
                <Clock size={14} color={colors.textMuted} />
                <Text style={[styles.buttonTertiaryText, { color: colors.textMuted }]}>
                  Plus tard
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// HOOK POUR UTILISER LE REVIEW MODAL
// ============================================

export const useReviewModal = () => {
  const [visible, setVisible] = React.useState(false);

  const showReviewModal = () => {
    setVisible(true);
  };

  const hideReviewModal = () => {
    setVisible(false);
  };

  const ReviewModalComponent = () => (
    <ReviewModal visible={visible} onClose={hideReviewModal} />
  );

  return { showReviewModal, hideReviewModal, ReviewModalComponent };
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredView: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
  },
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageSecondary: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 16,
  },
  buttonsContainer: {
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTertiary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  buttonTertiaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ReviewModal;
