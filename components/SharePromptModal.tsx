// ============================================
// YOROI - MODAL DE PROMPT PARTAGE
// Apparaît après un entraînement pour inciter au partage
// ============================================

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
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, X, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SharePromptModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  sportName: string;
}

export const SharePromptModal: React.FC<SharePromptModalProps> = ({
  visible,
  onClose,
  onShare,
  sportName,
}) => {
  const { colors, isDark } = useTheme();

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <BlurView intensity={isDark ? 60 : 80} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />

        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={colors.textMuted} strokeWidth={2} />
          </TouchableOpacity>

          {/* Modal Card */}
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundCard }]}>
            {/* Icon Hero */}
            <LinearGradient
              colors={['#8B5CF6', '#A78BFA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Sparkles size={48} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Fais-toi remarquer ! 🔥
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Partage ta séance de <Text style={{ fontWeight: '700', color: colors.accent }}>{sportName}</Text> et
              deviens la star de ta communauté !
            </Text>

            {/* Preview Image */}
            <View style={[styles.previewContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewGradient}
              >
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>J'AI RÉALISÉ</Text>
                  <View style={styles.previewPhotoPlaceholder}>
                    <Text style={styles.previewPhotoText}>TA PHOTO ICI</Text>
                  </View>
                  <Text style={styles.previewSport}>{sportName}</Text>
                  <Text style={styles.previewLogo}>YOROI</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Features */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  Mets ta photo en avant
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  Style Strava viral
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  Parfait pour Instagram & TikTok
                </Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shareButtonGradient}
              >
                <Share2 size={22} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.shareButtonText}>Partager ma séance</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
                Peut-être plus tard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewContent: {
    alignItems: 'center',
    gap: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  previewPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  previewPhotoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  previewSport: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewLogo: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginTop: 8,
  },
  features: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  shareButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
