/**
 * AvatarDisplay.tsx
 * Composant d'affichage unifié pour les avatars YOROI V2
 *
 * Affiche l'avatar en grand format complet (pas de cercle)
 */

import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';

import { useAvatar } from '@/lib/AvatarContext';
import { useTheme } from '@/lib/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarDisplayProps {
  /** Taille de l'avatar */
  size?: AvatarSize;
  /** Afficher la customisation (ignoré pour l'instant) */
  showCustomization?: boolean;
  /** Action au clic */
  onPress?: () => void;
  /** Trigger pour forcer le rafraîchissement */
  refreshTrigger?: number;
  /** Désactiver l'animation (ignoré) */
  disableAnimation?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SIZE_MAP: Record<AvatarSize, { width: number; height: number }> = {
  sm: { width: 100, height: 100 }, // Taille pour le cercle du header (remplit le parent de 105x105)
  md: { width: 120, height: 180 },
  lg: { width: 160, height: 240 },
  xl: { width: 200, height: 300 },
};

// ============================================================================
// COMPOSANT
// ============================================================================

export default function AvatarDisplay({
  size = 'md',
  showCustomization = true,
  onPress,
  refreshTrigger = 0,
  disableAnimation = false,
}: AvatarDisplayProps) {
  const { isDark, colors } = useTheme();
  const { avatarImage, isLoading } = useAvatar();

  const dimensions = SIZE_MAP[size];
  const imagePath = avatarImage;

  // Rendu
  const renderContent = () => {
    // Pour la taille 'sm', pas de bordure/fond car le conteneur parent gère ça
    const isSmall = size === 'sm';
    const isSquare = dimensions.width === dimensions.height;
    const borderRadius = isSquare ? dimensions.width / 2 : 16;

    const containerStyle = [
      styles.container,
      dimensions,
      isSmall ? {
        // Taille sm: transparent car le parent gère le style
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderRadius: borderRadius,
      } : {
        // Autres tailles: fond blanc avec bordure
        borderWidth: 2,
        borderColor: isDark ? '#FFFFFF' : '#000000',
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius,
      }
    ];

    if (isLoading) {
      return (
        <View style={containerStyle}>
          <ActivityIndicator size="small" color="#000000" />
        </View>
      );
    }

    // ✅ FIX: Utiliser image par défaut si imagePath est null
    const imageSource = imagePath || require('@/assets/avatars/samurai/samurai_neutral.png');

    return (
      <View style={containerStyle}>
        <Image
          source={imageSource}
          // Pour sm: image grande pour remplir le cercle (95%)
          // Pour autres: 85% standard
          style={isSmall
            ? { width: '95%', height: '95%', borderRadius: dimensions.width / 2 }
            : { width: '85%', height: '85%' }
          }
          resizeMode={isSmall ? 'cover' : 'contain'}
        />
      </View>
    );
  };

  const content = renderContent();

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  image: {
    // L'image prend toute la taille du container
  },
});
