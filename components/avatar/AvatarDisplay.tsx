/**
 * AvatarDisplay.tsx
 * Composant d'affichage unifié pour les avatars YOROI V2
 *
 * Affiche l'avatar en grand format complet (pas de cercle)
 */

import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';

import { getAvatarConfig, getAvatarImage, getAvatarMeta } from '@/lib/avatarSystem';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';

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
  sm: { width: 70, height: 70 },
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
  const { isDark } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [imagePath, setImagePath] = useState<any>(null);

  const dimensions = SIZE_MAP[size];

  // Charger l'avatar
  useEffect(() => {
    loadAvatar();
  }, [refreshTrigger]);

  const loadAvatar = async () => {
    try {
      setIsLoading(true);

      // Récupérer la config et les métadonnées
      const config = await getAvatarConfig();

      // Obtenir l'image
      const image = getAvatarImage(config.pack, config.gender, config.level);

      setImagePath(image);
      setIsLoading(false);
    } catch (error) {
      logger.error('[AvatarDisplay] Erreur chargement avatar:', error);
      setIsLoading(false);
    }
  };

  // Rendu
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={[styles.container, dimensions]}>
          <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
        </View>
      );
    }

    if (!imagePath) {
      return (
        <View style={[styles.container, dimensions]} />
      );
    }

    return (
      <View style={[styles.container, dimensions]}>
        <Image
          source={imagePath}
          style={[styles.image, dimensions]}
          resizeMode="contain"
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
