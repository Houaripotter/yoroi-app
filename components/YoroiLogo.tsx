// ============================================
// YOROI - COMPOSANT LOGO AMELIORE
// Support des logos PNG custom (Premium)
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { RADIUS, SHADOWS } from '@/constants/appTheme';
import { getSelectedLogo, LOGO_OPTIONS, LogoVariant } from '@/lib/storage';

interface YoroiLogoProps {
  size?: 'small' | 'medium' | 'large';
  showKanji?: boolean;
  showText?: boolean;
  forceLogoId?: LogoVariant; // Permet de forcer un logo spécifique (pour la preview)
}

const SIZES = {
  small: { container: 28, kanji: 16, text: 14, logo: 24 },
  medium: { container: 40, kanji: 22, text: 20, logo: 36 },
  large: { container: 56, kanji: 32, text: 28, logo: 48 },
};

export const YoroiLogo: React.FC<YoroiLogoProps> = ({
  size = 'medium',
  showKanji = true,
  showText = true,
  forceLogoId,
}) => {
  const { colors, theme } = useTheme();
  const sizeConfig = SIZES[size];
  const [selectedLogo, setSelectedLogo] = useState<LogoVariant>('default');

  useEffect(() => {
    if (forceLogoId) {
      setSelectedLogo(forceLogoId);
    } else {
      loadSelectedLogo();
    }
  }, [forceLogoId]);

  const loadSelectedLogo = async () => {
    const logo = await getSelectedLogo();
    setSelectedLogo(logo);
  };

  // Trouver l'option de logo correspondante
  const logoOption = LOGO_OPTIONS.find(opt => opt.id === selectedLogo);
  const isCustomLogo = selectedLogo !== 'default' && logoOption?.image;

  return (
    <View style={styles.container}>
      {showKanji && (
        <>
          {isCustomLogo && logoOption?.image ? (
            // Afficher le logo PNG custom
            <View
              style={[
                styles.logoContainer,
                {
                  width: sizeConfig.container,
                  height: sizeConfig.container,
                  borderRadius: sizeConfig.container / 4,
                },
              ]}
            >
              <Image
                source={logoOption.image}
                style={{
                  width: sizeConfig.logo,
                  height: sizeConfig.logo,
                  borderRadius: sizeConfig.logo / 4,
                }}
                resizeMode="contain"
              />
            </View>
          ) : (
            // Afficher le kanji par défaut
            <View
              style={[
                styles.kanjiContainer,
                {
                  width: sizeConfig.container,
                  height: sizeConfig.container,
                  borderRadius: sizeConfig.container / 4,
                  backgroundColor: colors.accent,
                  ...SHADOWS.glowSubtle,
                  shadowColor: colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.kanji,
                  {
                    fontSize: sizeConfig.kanji,
                    color: colors.textOnAccent || '#FFFFFF',
                  },
                ]}
              >
                {theme.kanji || '鎧'}
              </Text>
            </View>
          )}
        </>
      )}
      {showText && (
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeConfig.text,
              color: colors.textPrimary,
            },
          ]}
        >
          Yoroi
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kanjiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  kanji: {
    fontWeight: '700',
  },
  text: {
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default YoroiLogo;
