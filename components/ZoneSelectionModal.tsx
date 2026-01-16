// ============================================
// YOROI - MODAL DE SÉLECTION DE ZONES MULTIPLES
// ============================================
// Permet de choisir entre plusieurs zones qui se chevauchent

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import {
  X,
  ChevronRight,
  Hand,
  Footprints,
  Brain,
  Bone,
  Dumbbell,
  Target,
  ArrowLeft,
  Zap,
  Heart,
  Circle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface Zone {
  id: string;
  name: string;
}

interface ZoneSelectionModalProps {
  visible: boolean;
  zones: Zone[];
  onSelect: (zone: Zone) => void;
  onClose: () => void;
}

// Mapping des zones vers les icônes
const getZoneIconComponent = (zoneName: string) => {
  const name = zoneName.toLowerCase();
  if (name.includes('main') || name.includes('doigt') || name.includes('pouce') || name.includes('poignet')) return Hand;
  if (name.includes('pied') || name.includes('orteil') || name.includes('cheville')) return Footprints;
  if (name.includes('tête') || name.includes('visage') || name.includes('front')) return Brain;
  if (name.includes('cou') || name.includes('gorge') || name.includes('hanche') || name.includes('côte')) return Bone;
  if (name.includes('épaule') || name.includes('coude') || name.includes('bras') || name.includes('pec') || name.includes('poitrine')) return Dumbbell;
  if (name.includes('genou') || name.includes('jambe') || name.includes('cuisse') || name.includes('mollet')) return Zap;
  if (name.includes('dos') || name.includes('lombaire')) return ArrowLeft;
  if (name.includes('abdos') || name.includes('ventre') || name.includes('sternum')) return Target;
  if (name.includes('coeur') || name.includes('thorax')) return Heart;
  return Circle;
};

const getZoneColor = (zoneName: string) => {
  const name = zoneName.toLowerCase();
  if (name.includes('main') || name.includes('doigt') || name.includes('pouce')) return '#F59E0B';
  if (name.includes('pied') || name.includes('orteil') || name.includes('cheville')) return '#10B981';
  if (name.includes('tête') || name.includes('visage')) return '#8B5CF6';
  if (name.includes('cou') || name.includes('épaule')) return '#0EA5E9';
  if (name.includes('genou') || name.includes('jambe')) return '#EF4444';
  if (name.includes('dos') || name.includes('lombaire')) return '#EC4899';
  if (name.includes('abdos') || name.includes('ventre') || name.includes('côte')) return '#6366F1';
  if (name.includes('pec') || name.includes('poitrine') || name.includes('sternum')) return '#14B8A6';
  return '#6B7280';
};

export const ZoneSelectionModal: React.FC<ZoneSelectionModalProps> = ({
  visible,
  zones,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  
  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'ouverture
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animation de fermeture
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSelect = (zone: Zone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animation de sélection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSelect(zone);
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
          style={styles.overlayTouchable} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.background,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            }
          ]}
        >
          {/* Poignée de glissement */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header avec icône croix rouge */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <View style={styles.redCross}>
                <View style={[styles.crossVertical, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.crossHorizontal, { backgroundColor: '#EF4444' }]} />
              </View>
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Zone à préciser
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Plusieurs zones détectées à cet endroit
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
            >
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Message d'aide */}
          <View style={[styles.helpBanner, { backgroundColor: '#F59E0B15' }]}>
            <Text style={[styles.helpText, { color: '#F59E0B' }]}>
              Sélectionne la zone exacte concernée
            </Text>
          </View>

          {/* Liste des zones avec icônes */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {zones.map((zone, index) => {
              const IconComponent = getZoneIconComponent(zone.name);
              const iconColor = getZoneColor(zone.name);
              
              return (
                <TouchableOpacity
                  key={zone.id}
                  style={[
                    styles.zoneItem,
                    { backgroundColor: colors.backgroundCard },
                  ]}
                  onPress={() => handleSelect(zone)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.zoneIconContainer, { backgroundColor: iconColor + '20' }]}>
                    <IconComponent size={22} color={iconColor} />
                  </View>
                  <View style={styles.zoneInfo}>
                    <Text style={[styles.zoneName, { color: colors.textPrimary }]}>
                      {zone.name}
                    </Text>
                  </View>
                  <View style={[styles.selectButton, { backgroundColor: colors.accent + '20' }]}>
                    <ChevronRight size={18} color={colors.accentText} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bouton annuler */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.backgroundCard }]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>
              Annuler
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '70%',
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redCross: {
    width: 24,
    height: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 8,
    height: 24,
    borderRadius: 2,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 24,
    height: 8,
    borderRadius: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  helpText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  zoneIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
