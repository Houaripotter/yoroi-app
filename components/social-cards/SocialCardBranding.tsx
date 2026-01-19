// ============================================
// SOCIAL CARD BRANDING - Identique à VictoryShareModal
// Bannière haut + Footer Pro avec assets
// ============================================

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// ============================================
// TOP BANNER - Ligne + Logo + YOROI + Ligne
// ============================================
export const SocialCardTopBanner: React.FC<{ variant?: 'dark' | 'light' }> = ({
  variant = 'dark'
}) => {
  const isLight = variant === 'light';
  const lineColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)';
  const textColor = isLight ? '#1a1a1a' : '#FFFFFF';

  return (
    <View style={styles.topBanner}>
      <View style={[styles.topBannerLine, { backgroundColor: lineColor }]} />
      <View style={styles.topBannerContent}>
        <Image
          source={require('@/assets/images/logo2010.png')}
          style={styles.topBannerLogo}
          resizeMode="contain"
        />
        <Text style={[styles.topBannerText, { color: textColor }]}>Yoroi</Text>
      </View>
      <View style={[styles.topBannerLine, { backgroundColor: lineColor }]} />
    </View>
  );
};

// ============================================
// FOOTER PRO - Design avec Logo grand à gauche, App Store à droite
// ============================================
export const SocialCardFooter: React.FC<{ variant?: 'dark' | 'light' }> = ({
  variant = 'dark'
}) => {
  const isLight = variant === 'light';
  const goldColor = '#D4AF37';
  const textColor = isLight ? '#1a1a1a' : goldColor;
  const separatorColor = isLight ? 'rgba(0,0,0,0.2)' : goldColor;

  return (
    <View style={styles.footer}>
      {/* Ligne de séparation dorée */}
      <View style={[styles.footerSeparator, { backgroundColor: separatorColor }]} />

      {/* Layout horizontal: Logo | Texte | App Store */}
      <View style={styles.footerRow}>
        {/* Logo grand à gauche */}
        <Image
          source={require('@/assets/images/logo2010.png')}
          style={styles.footerLogoBig}
          resizeMode="contain"
        />

        {/* Texte au centre */}
        <View style={styles.footerTextBlock}>
          <Text style={[styles.footerBrandName, { color: textColor }]}>Yoroi</Text>
          <Text style={[styles.footerTagline, { color: textColor }]}>Suivi du poids & sport</Text>
        </View>

        {/* App Store Badge à droite */}
        <Image
          source={require('@/assets/images/appstore.png')}
          style={styles.footerAppStoreBadgeSide}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

// ============================================
// FOOTER COMPACT - Pour cartes plus petites
// ============================================
export const SocialCardFooterCompact: React.FC<{ variant?: 'dark' | 'light' }> = ({
  variant = 'dark'
}) => {
  const isLight = variant === 'light';
  const goldColor = '#D4AF37';
  const textColor = isLight ? '#1a1a1a' : goldColor;
  const separatorColor = isLight ? 'rgba(0,0,0,0.2)' : goldColor;

  return (
    <View style={styles.footerCompact}>
      <View style={[styles.footerSeparator, { backgroundColor: separatorColor }]} />
      <Text style={[styles.footerBrandNameCompact, { color: textColor }]}>Yoroi</Text>
      <Text style={[styles.footerTaglineCompact, { color: textColor }]}>Suivi du poids & sport</Text>
      <Image
        source={require('@/assets/images/appstore.png')}
        style={styles.footerAppStoreBadgeSmall}
        resizeMode="contain"
      />
    </View>
  );
};

// ============================================
// WATERMARK LOGO - Grand logo derrière quand pas de photo
// Utilise logo2010.png
// ============================================
export const SocialCardWatermark: React.FC<{ show?: boolean; variant?: 'dark' | 'light' }> = ({
  show = true,
  variant = 'dark'
}) => {
  if (!show) return null;

  const isLight = variant === 'light';

  return (
    <View style={styles.watermarkContainer}>
      <Image
        source={require('@/assets/images/logo2010.png')}
        style={[
          styles.watermarkLogo,
          { opacity: isLight ? 0.15 : 0.2 }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  // Top Banner
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  topBannerLine: {
    flex: 1,
    height: 1,
  },
  topBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBannerLogo: {
    width: 22,
    height: 22,
  },
  topBannerText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
  },

  // Footer Pro - Layout horizontal
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  footerSeparator: {
    width: '100%',
    height: 1,
    borderRadius: 1,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLogoBig: {
    width: 48,
    height: 48,
  },
  footerTextBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  footerBrandName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  footerTagline: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  footerAppStoreBadgeSide: {
    width: 80,
    height: 48,
  },

  // Footer Compact
  footerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  footerBrandNameCompact: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
  },
  footerTaglineCompact: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 0,
  },
  footerAppStoreBadgeSmall: {
    width: 65,
    height: 20,
    marginTop: 3,
  },

  // Watermark
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  watermarkLogo: {
    width: 280,
    height: 280,
  },
});

export default { SocialCardTopBanner, SocialCardFooter, SocialCardFooterCompact, SocialCardWatermark };
