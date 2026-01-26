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
  sm: { width: 120, height: 120 }, // Ajusté pour correspondre exactement à la photo de profil (120px)
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

      // Récupérer la config avec état dynamique
      const config = await getAvatarConfig();

      // Obtenir l'image (avec état pour character packs, personnage pour collection packs)
      const image = getAvatarImage(
        config.pack,
        config.packType === 'character' ? config.state : undefined,
        config.collectionCharacter,
        config.gender
      );

      setImagePath(image);
      setIsLoading(false);
    } catch (error) {
      logger.error('[AvatarDisplay] Erreur chargement avatar:', error);
      setIsLoading(false);
    }
  };

  // Rendu
  const renderContent = () => {
    // Style minimaliste : contour fin et fond blanc pour unifier l'image
    // MODIFICATION: Cercle parfait si les dimensions sont carrées (sm), sinon borderRadius standard
    const isSquare = dimensions.width === dimensions.height;
    const borderRadius = isSquare ? dimensions.width / 2 : 16;
    
    const containerStyle = [
      styles.container,
      dimensions,
      {
        borderWidth: 2, // Bordure un peu plus visible pour le cercle
        borderColor: isDark ? '#FFFFFF' : '#000000',
        backgroundColor: '#FFFFFF', // Fond TOUJOURS blanc pour éviter de voir du noir à travers l'avatar
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

    if (!imagePath) {
      return (
        <View style={containerStyle} />
      );
    }

    return (
      <View style={containerStyle}>
        <Image
          source={imagePath}
          // Taille réduite à 85% pour voir l'avatar en entier dans le cercle sans couper
          style={{ width: '85%', height: '85%' }} 
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
