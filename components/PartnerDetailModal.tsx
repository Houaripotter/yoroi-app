// ============================================
// YOROI - MODAL DÉTAIL PARTENAIRE (Coach/Club/Kiné/Nutri)
// ============================================

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
  Image,
  Linking,
} from 'react-native';
import { 
  X, 
  MapPin, 
  Instagram, 
  Youtube, 
  Globe, 
  Phone, 
  Mail,
  Calendar,
  Award,
  Dumbbell,
  Heart,
  User,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PartnerLink {
  type: 'instagram' | 'youtube' | 'website' | 'doctolib' | 'phone' | 'email';
  url: string;
  label?: string;
}

export interface Partner {
  id: number | string;
  type: 'club' | 'coach' | 'kine' | 'nutritionniste';
  name: string;
  photo?: any; // require() ou { uri: string }
  sport?: string;
  specialty?: string;
  bio?: string;
  address?: string;
  color?: string;
  links?: PartnerLink[];
}

interface PartnerDetailModalProps {
  visible: boolean;
  partner: Partner | null;
  onClose: () => void;
}

const getLinkIcon = (type: string) => {
  switch (type) {
    case 'instagram': return Instagram;
    case 'youtube': return Youtube;
    case 'website': return Globe;
    case 'doctolib': return Calendar;
    case 'phone': return Phone;
    case 'email': return Mail;
    default: return ExternalLink;
  }
};

const getLinkColor = (type: string) => {
  switch (type) {
    case 'instagram': return '#E4405F';
    case 'youtube': return '#FF0000';
    case 'website': return '#0EA5E9';
    case 'doctolib': return '#0596DE';
    case 'phone': return '#10B981';
    case 'email': return '#F59E0B';
    default: return '#6B7280';
  }
};

const getLinkLabel = (type: string, label?: string) => {
  if (label) return label;
  switch (type) {
    case 'instagram': return 'Instagram';
    case 'youtube': return 'YouTube';
    case 'website': return 'Site Web';
    case 'doctolib': return 'Doctolib';
    case 'phone': return 'Téléphone';
    case 'email': return 'Email';
    default: return 'Lien';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'club': return Dumbbell;
    case 'coach': return Award;
    case 'kine': return Heart;
    case 'nutritionniste': return Heart;
    default: return User;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'club': return 'Club';
    case 'coach': return 'Coach';
    case 'kine': return 'Kinésithérapeute';
    case 'nutritionniste': return 'Nutritionniste';
    default: return 'Partenaire';
  }
};

export const PartnerDetailModal: React.FC<PartnerDetailModalProps> = ({
  visible,
  partner,
  onClose,
}) => {
  const { colors } = useTheme();
  
  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const photoScale = useRef(new Animated.Value(0.8)).current;

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
        Animated.spring(photoScale, {
          toValue: 1,
          damping: 12,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      photoScale.setValue(0.8);
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
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

  const handleLinkPress = async (link: PartnerLink) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    let url = link.url;
    
    // Formatter les URLs
    if (link.type === 'phone') {
      url = `tel:${link.url}`;
    } else if (link.type === 'email') {
      url = `mailto:${link.url}`;
    } else if (link.type === 'instagram' && !link.url.startsWith('http')) {
      url = `https://instagram.com/${link.url.replace('@', '')}`;
    } else if (link.type === 'youtube' && !link.url.startsWith('http')) {
      url = `https://youtube.com/@${link.url.replace('@', '')}`;
    }
    
    try {
      await Linking.openURL(url);
    } catch (error) {
      logger.error('Cannot open URL:', url);
    }
  };

  if (!partner) return null;

  const TypeIcon = getTypeIcon(partner.type);
  const accentColor = partner.color || colors.accent;

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
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, { backgroundColor: colors.backgroundCard }]}
          >
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Photo */}
            <Animated.View style={[
              styles.photoContainer,
              { transform: [{ scale: photoScale }] }
            ]}>
              {partner.photo ? (
                <Image
                  source={partner.photo}
                  style={[styles.photo, { borderColor: accentColor }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: accentColor + '30', borderColor: accentColor }]}>
                  <TypeIcon size={48} color={accentColor} />
                </View>
              )}
              
              {/* Badge type */}
              <View style={[styles.typeBadge, { backgroundColor: accentColor }]}>
                <TypeIcon size={14} color="#FFFFFF" />
                <Text style={styles.typeBadgeText}>{getTypeLabel(partner.type)}</Text>
              </View>
            </Animated.View>

            {/* Nom et spécialité */}
            <Text style={[styles.name, { color: colors.textPrimary }]}>
              {partner.name}
            </Text>
            
            {(partner.sport || partner.specialty) && (
              <Text style={[styles.specialty, { color: accentColor }]}>
                {partner.sport || partner.specialty}
              </Text>
            )}

            {/* Adresse */}
            {partner.address && (
              <View style={styles.addressRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[styles.address, { color: colors.textMuted }]}>
                  {partner.address}
                </Text>
              </View>
            )}

            {/* Bio */}
            {partner.bio && (
              <View style={[styles.bioContainer, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.bioLabel, { color: colors.textMuted }]}>À propos</Text>
                <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                  {partner.bio}
                </Text>
              </View>
            )}

            {/* Liens */}
            {partner.links && partner.links.length > 0 && (
              <View style={styles.linksContainer}>
                <Text style={[styles.linksTitle, { color: colors.textPrimary }]}>
                  Liens & Contact
                </Text>
                <View style={styles.linksGrid}>
                  {partner.links.map((link, index) => {
                    const LinkIcon = getLinkIcon(link.type);
                    const linkColor = getLinkColor(link.type);
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.linkButton, { backgroundColor: linkColor + '15', borderColor: linkColor + '30' }]}
                        onPress={() => handleLinkPress(link)}
                        activeOpacity={0.7}
                      >
                        <LinkIcon size={20} color={linkColor} />
                        <Text style={[styles.linkLabel, { color: linkColor }]}>
                          {getLinkLabel(link.type, link.label)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Placeholder si pas de bio ni de liens */}
            {!partner.bio && (!partner.links || partner.links.length === 0) && (
              <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  Aucune information supplémentaire disponible.
                </Text>
              </View>
            )}

          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '50%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
  },
  photoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: SPACING.lg,
  },
  address: {
    fontSize: 13,
  },
  bioContainer: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  bioLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
  },
  linksContainer: {
    marginBottom: SPACING.lg,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

