/**
 * AvatarDisplay.tsx
 * Wrapper de compatibilité vers le nouveau système d'avatars
 *
 * Ce fichier redirige vers le nouveau composant components/avatar/AvatarDisplay.tsx
 * pour maintenir la compatibilité avec le code existant.
 */

import React from 'react';
import AvatarDisplayNew, { AvatarDisplayProps as NewProps } from './avatar/AvatarDisplay';

// Types pour compatibilité avec l'ancien système
type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarDisplayProps {
  size?: AvatarSize;
  showState?: boolean;
  showBorder?: boolean;
  showGlow?: boolean;
  onPress?: () => void;
  refreshTrigger?: number;
  avatarId?: string; // Ignoré dans le nouveau système
  state?: string; // Ignoré dans le nouveau système
}

// Mapping des tailles ancien → nouveau système
const SIZE_MAPPING: Record<AvatarSize, NewProps['size']> = {
  small: 'sm',
  medium: 'lg', // Plus grand par défaut
  large: 'xl',
  xlarge: 'xl',
};

/**
 * Composant de compatibilité qui redirige vers le nouveau système
 */
export default function AvatarDisplay({
  size = 'medium',
  showState = true,
  showBorder = true,
  showGlow = true,
  onPress,
  refreshTrigger = 0,
  avatarId, // Paramètre ignoré
  state, // Paramètre ignoré
}: AvatarDisplayProps) {
  const newSize = SIZE_MAPPING[size] || 'md';

  return (
    <AvatarDisplayNew
      size={newSize}
      showCustomization={showState}
      onPress={onPress}
      refreshTrigger={refreshTrigger}
      disableAnimation={false}
    />
  );
}
