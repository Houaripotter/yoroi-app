import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

const { width } = Dimensions.get('window');
const BODY_WIDTH = width * 0.7;
const BODY_HEIGHT = BODY_WIDTH * 1.8; // Ratio approximatif pour une silhouette humaine

export type BodyZone = 'neck' | 'shoulders' | 'chest' | 'arms' | 'waist' | 'hips' | 'thighs' | 'calves' | null;

interface InteractiveBodyMapProps {
  onSelectZone: (zone: BodyZone) => void;
  selectedZone: BodyZone;
}

export function InteractiveBodyMap({ onSelectZone, selectedZone }: InteractiveBodyMapProps) {
  const { colors, isDark, themeName } = useTheme();
  const isWellness = false;

  const getFillColor = (zone: BodyZone) => {
    if (selectedZone === zone) {
      return colors.gold; // Couleur d'accentuation quand sélectionné
    } else {
      return colors.card; // Couleur neutre
    }
  };

  const getStrokeColor = (zone: BodyZone) => {
    if (selectedZone === zone) {
      return colors.gold; // Bordure accentuée
    } else {
      return colors.border; // Bordure neutre
    }
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: colors.card },
      isWellness && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      }
    ]}>
      <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
        Touchez une zone pour saisir la mesure
      </Text>
      <Svg width={BODY_WIDTH} height={BODY_HEIGHT} viewBox="0 0 200 360">
        <G scale={BODY_WIDTH / 200}> {/* Ajuster l'échelle du groupe pour s'adapter à BODY_WIDTH */}
          {/* Corps principal (torse et bassin) */}
          <Path
            d="M100 0 C120 0, 130 20, 120 40 L120 100 C130 120, 130 160, 120 180 L120 250 C110 280, 90 280, 80 250 L80 180 C70 160, 70 120, 80 100 L80 40 C70 20, 80 0, 100 0 Z"
            fill={getFillColor(null)} // Corps de base, non cliquable directement
            stroke={colors.border}
            strokeWidth="2"
          />

          {/* Tête - Pour la démo, non cliquable, juste visuel */}
          <Circle cx="100" cy="20" r="15" fill={colors.textSecondary} stroke={colors.border} strokeWidth="2" />

          {/* Cou */}
          <Path
            d="M90 35 L90 50 C95 55, 105 55, 110 50 L110 35 Z"
            fill={getFillColor('neck')}
            stroke={getStrokeColor('neck')}
            strokeWidth="2"
            onPress={() => onSelectZone('neck')}
          />

          {/* Épaules */}
          <Path
            d="M120 40 C130 40, 140 50, 145 60 L145 80 L120 100 Z M80 40 C70 40, 60 50, 55 60 L55 80 L80 100 Z"
            fill={getFillColor('shoulders')}
            stroke={getStrokeColor('shoulders')}
            strokeWidth="2"
            onPress={() => onSelectZone('shoulders')}
          />

          {/* Pectoraux / Buste */}
          <Path
            d="M120 100 L120 140 C125 145, 125 155, 120 160 L120 180 L80 180 L80 160 C75 155, 75 145, 80 140 L80 100 Z"
            fill={getFillColor('chest')}
            stroke={getStrokeColor('chest')}
            strokeWidth="2"
            onPress={() => onSelectZone('chest')}
          />

          {/* Bras */}
          <Path
            d="M145 60 L145 150 C140 160, 130 160, 120 150 L120 80 L145 60 Z M55 60 L55 150 C60 160, 70 160, 80 150 L80 80 L55 60 Z"
            fill={getFillColor('arms')}
            stroke={getStrokeColor('arms')}
            strokeWidth="2"
            onPress={() => onSelectZone('arms')}
          />

          {/* Taille / Abdos */}
          <Path
            d="M120 180 C125 185, 125 195, 120 200 L120 220 C125 225, 125 235, 120 240 L120 250 L80 250 L80 240 C75 235, 75 225, 80 220 L80 200 C75 195, 75 185, 80 180 Z"
            fill={getFillColor('waist')}
            stroke={getStrokeColor('waist')}
            strokeWidth="2"
            onPress={() => onSelectZone('waist')}
          />

          {/* Hanches */}
          <Path
            d="M80 250 C70 280, 90 280, 100 280 C110 280, 130 280, 120 250 L80 250 Z"
            fill={getFillColor('hips')}
            stroke={getStrokeColor('hips')}
            strokeWidth="2"
            onPress={() => onSelectZone('hips')}
          />

          {/* Cuisses */}
          <Path
            d="M110 280 L110 330 C105 340, 95 340, 90 330 L90 280 Z M120 250 L130 280 L130 330 C125 340, 115 340, 110 330 L110 280 L120 250 Z M80 250 L70 280 L70 330 C75 340, 85 340, 90 330 L90 280 L80 250 Z"
            fill={getFillColor('thighs')}
            stroke={getStrokeColor('thighs')}
            strokeWidth="2"
            onPress={() => onSelectZone('thighs')}
          />

          {/* Jambes/Mollets (simplifié) - pour la démo, non cliquable directement, partie des cuisses */}
          <Path
            d="M90 330 L90 360 L110 360 L110 330 Z"
            fill={getFillColor('calves')}
            stroke={getStrokeColor('calves')}
            strokeWidth="2"
            onPress={() => onSelectZone('calves')}
          />

        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
});
