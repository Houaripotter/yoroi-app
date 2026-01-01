import React, { useState, useRef, useEffect } from 'react';
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
import { X, ZoomIn, ZoomOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import AvatarDisplay from '@/components/AvatarDisplay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AvatarViewerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AvatarViewerModal: React.FC<AvatarViewerModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [isZoomed, setIsZoomed] = useState(true); // Démarrer en mode zoomé
  const scaleAnim = useRef(new Animated.Value(3.5)).current; // Démarrer à 3.5x
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 3.5, // Directement en TRÈS GRAND
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(3.5);
      fadeAnim.setValue(0);
      setIsZoomed(true);
    }
  }, [visible]);

  const handleZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const toValue = isZoomed ? 1 : 3.5;
    setIsZoomed(!isZoomed);

    Animated.spring(scaleAnim, {
      toValue,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Mon Avatar
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={handleZoom}
              >
                {isZoomed ? (
                  <ZoomOut size={20} color={colors.textPrimary} />
                ) : (
                  <ZoomIn size={20} color={colors.textPrimary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={handleClose}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Display */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleZoom}
            activeOpacity={0.95}
          >
            <Animated.View
              style={[
                styles.avatarWrapper,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <AvatarDisplay size="xlarge" refreshTrigger={Date.now()} showBorder={true} />
            </Animated.View>
          </TouchableOpacity>

          {/* Footer hint */}
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {isZoomed ? 'Tape pour dézoomer' : 'Tape pour agrandir'}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: SCREEN_WIDTH * 0.98,
    height: SCREEN_WIDTH * 0.98,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 60,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default AvatarViewerModal;

