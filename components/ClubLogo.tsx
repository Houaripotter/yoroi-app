import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';

interface ClubLogoProps {
  clubName: string;
  logoPath?: ImageSourcePropType | string | null;
  size?: number;
  backgroundColor?: string;
}

const ClubLogo: React.FC<ClubLogoProps> = ({
  clubName,
  logoPath,
  size = 40,
  backgroundColor = '#14B8A6'
}) => {
  const [hasError, setHasError] = useState(false);

  // Obtenir les initiales du club
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Générer une couleur basée sur le nom du club
  const getColorFromName = (name: string): string => {
    const colors = [
      '#14B8A6', // Teal
      '#8B5CF6', // Violet
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#3B82F6', // Blue
      '#10B981', // Emerald
      '#EC4899', // Pink
      '#6366F1', // Indigo
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(clubName);
  const color = backgroundColor || getColorFromName(clubName);

  // Afficher le placeholder si pas de logo ou erreur
  if (hasError || !logoPath) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
          {initials}
        </Text>
      </View>
    );
  }

  // Essayer d'afficher le logo
  return (
    <Image
      source={typeof logoPath === 'string' ? { uri: logoPath } : logoPath}
      style={[
        styles.logo,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      onError={() => setHasError(true)}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  logo: {
    backgroundColor: '#1A1A1A',
  },
});

export default ClubLogo;

