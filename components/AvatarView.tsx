import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import des images d'avatar
const samuraiMan1 = require('@/assets/images/samurai_man_1.png');
const samuraiMan2 = require('@/assets/images/samurai_man_2.png');
const samuraiMan3 = require('@/assets/images/samurai_man_3.png');
const samuraiWoman1 = require('@/assets/images/samurai_woman_1.png');
const samuraiWoman2 = require('@/assets/images/samurai_woman_2.png');
const samuraiWoman3 = require('@/assets/images/samurai_woman_3.png');

interface AvatarViewProps {
  gradeId: string; // 'ashigaru' | 'bushi' | 'samurai' | 'daimyo' | 'shogun'
  gender: 'male' | 'female';
  size?: number;
}

// ============================================
// 👹 AVATAR SYSTEM - IMAGES PNG
// ============================================

/**
 * Mappe un grade vers un tier d'image (1, 2, ou 3)
 */
function getImageTierFromGrade(gradeId: string): 1 | 2 | 3 {
  switch (gradeId) {
    case 'ashigaru':
      return 1; // Kimono
    case 'bushi':
      return 2; // Light Armor
    case 'samurai':
    case 'daimyo':
    case 'shogun':
      return 3; // Full Armor
    default:
      return 1;
  }
}

/**
 * Récupère l'image appropriée selon le genre et le tier
 */
function getAvatarImage(gender: 'male' | 'female', tier: 1 | 2 | 3): ImageSourcePropType {
  if (gender === 'male') {
    switch (tier) {
      case 1:
        return samuraiMan1;
      case 2:
        return samuraiMan2;
      case 3:
        return samuraiMan3;
    }
    } else {
    switch (tier) {
      case 1:
        return samuraiWoman1;
      case 2:
        return samuraiWoman2;
      case 3:
        return samuraiWoman3;
    }
  }
}

export function AvatarView({ gradeId, gender, size = 200 }: AvatarViewProps) {
  const tier = getImageTierFromGrade(gradeId);
  const imageSource = getAvatarImage(gender, tier);
  const isShogun = gradeId === 'shogun';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Image de l'avatar */}
      <View style={[styles.imageContainer, { width: size, height: size }]}>
        <Image
          source={imageSource}
          style={[styles.avatarImage, { width: size, height: size }]}
          resizeMode="contain"
        />
        
        {/* Effet doré pour Shogun */}
        {isShogun && (
          <>
            {/* Bordure dorée */}
            <View style={[styles.goldenBorder, { width: size, height: size, borderRadius: size / 2 }]} />
            {/* Glow doré */}
            <View style={[styles.goldenGlow, { width: size, height: size, borderRadius: size / 2 }]}>
        <LinearGradient
                colors={['rgba(241, 196, 15, 0.4)', 'rgba(241, 196, 15, 0.2)', 'rgba(241, 196, 15, 0.05)', 'transparent']}
                style={styles.glowGradient}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  goldenBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 4,
    borderColor: '#F1C40F',
    shadowColor: '#F1C40F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  goldenGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
  },
});
