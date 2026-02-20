// ============================================
// YOROI - COMPOSANT WELCOME HEADER MODERNE
// ============================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { X } from 'lucide-react-native';
import { getCurrentRank } from '@/lib/ranks';
import { getLevelProgress } from '@/lib/gamification';

interface WelcomeHeaderProps {
  userName: string;
  gender: 'male' | 'female';
  profileImage?: string | null;
  onAvatarPress?: () => void;
  onLogoPress?: () => void;
  streak?: number;
  totalPoints?: number;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({
  userName,
  gender,
  profileImage,
  onAvatarPress,
  onLogoPress,
  streak = 0,
  totalPoints = 0,
}) => {
  const { colors } = useTheme();
  const [showLogoModal, setShowLogoModal] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const title = gender === 'female' ? 'Championne' : 'Champion';

    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Comment ça va ce matin ?';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'Comment ça va cet après-midi ?';
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = 'Comment ça va ce soir ?';
    } else {
      timeGreeting = 'Encore debout ?';
    }

    return { title, timeGreeting };
  };

  const { title, timeGreeting } = getGreeting();
  const rank = getCurrentRank(streak);
  const xpProgress = getLevelProgress(totalPoints);

  return (
    <>
      <View style={styles.container}>
        {/* Logo YOROI à gauche */}
        <TouchableOpacity onPress={() => setShowLogoModal(true)} style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo2010.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

      {/* Texte au centre (prend toute la largeur) */}
      <View style={[styles.textContainer, { flex: 1 }]}>
        <Text style={[styles.hello, { color: colors.textMuted }]}>
          Hello {title},
        </Text>
        <Text style={[styles.name, { color: colors.textPrimary }]}>
          {userName}
        </Text>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>
          {timeGreeting}
        </Text>
      </View>
    </View>

    {/* Modal Logo en grand */}
    <Modal
      visible={showLogoModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLogoModal(false)}
    >
      <TouchableOpacity
        style={styles.logoModalOverlay}
        activeOpacity={1}
        onPress={() => setShowLogoModal(false)}
      >
        <View style={styles.logoModalContent}>
          <TouchableOpacity
            style={styles.logoModalClose}
            onPress={() => setShowLogoModal(false)}
          >
            <X size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Image
            source={require('../assets/images/logo2010.png')}
            style={styles.logoLarge}
            resizeMode="contain"
          />
          <Text style={[styles.logoModalText, { color: colors.textPrimary }]}>YOROI</Text>
          <Text style={[styles.logoModalSubtext, { color: colors.gold }]}>鎧</Text>
          <Text style={[styles.logoModalDescription, { color: colors.textSecondary }]}>Ton armure digitale</Text>
        </View>
      </TouchableOpacity>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 22,
  },
  textContainer: {},
  hello: {
    fontSize: 14,
    fontWeight: '500',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  greeting: {
    fontSize: 13,
    marginTop: 2,
  },

  // Modal styles
  logoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoModalClose: {
    position: 'absolute',
    top: -60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  logoLarge: {
    width: 220,
    height: 220,
    borderRadius: 30,
  },
  logoModalText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    marginTop: 32,
    letterSpacing: 4,
  },
  logoModalSubtext: {
    color: '#FFE500',
    fontSize: 64,
    marginTop: 8,
  },
  logoModalDescription: {
    color: '#AAAAAA',
    fontSize: 18,
    marginTop: 12,
    fontWeight: '500',
  },
});

export default WelcomeHeader;
