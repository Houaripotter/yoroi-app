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
        <Text style={[styles.topBannerText, { color: textColor }]}>YOROI</Text>
      </View>
      <View style={[styles.topBannerLine, { backgroundColor: lineColor }]} />
    </View>
  );
};

// ============================================
// FOOTER PRO - Design compact
// Trait doré + YOROI + Suivi du poids & sport + @yoroiapp
// ============================================
export const SocialCardFooter: React.FC<{ variant?: 'dark' | 'light' }> = ({
  variant = 'dark'
}) => {
  const isLight = variant === 'light';
  const goldColor = '#D4AF37';
  const textColor = isLight ? '#1a1a1a' : goldColor;
  const subTextColor = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
  const separatorColor = isLight ? 'rgba(0,0,0,0.2)' : goldColor;

  return (
    <View style={styles.footer}>
      {/* Ligne de séparation dorée */}
      <View style={[styles.footerSeparator, { backgroundColor: separatorColor }]} />

      {/* Brand Block - Compact */}
      <View style={styles.footerBrandBlock}>
        <Text style={[styles.footerBrandName, { color: textColor }]}>YOROI</Text>
        <Text style={[styles.footerTagline, { color: textColor }]}>Suivi du poids & sport</Text>

        {/* Social Row - Juste Instagram */}
        <View style={styles.footerSocialRow}>
          <Image
            source={require('@/assets/images/instagram.png')}
            style={styles.footerInstagramIconSmall}
            resizeMode="contain"
          />
          <Text style={[styles.footerSocialText, { color: subTextColor }]}>@yoroiapp</Text>
        </View>
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
  const subTextColor = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';
  const separatorColor = isLight ? 'rgba(0,0,0,0.2)' : goldColor;

  return (
    <View style={styles.footerCompact}>
      <View style={[styles.footerSeparator, { backgroundColor: separatorColor }]} />
      <Text style={[styles.footerBrandNameCompact, { color: textColor }]}>YOROI</Text>
      <Text style={[styles.footerTaglineCompact, { color: textColor }]}>Suivi du poids & sport</Text>
      <View style={styles.footerSocialRowCompact}>
        <Image
          source={require('@/assets/images/instagram.png')}
          style={styles.socialIconSmall}
          resizeMode="contain"
        />
        <Text style={[styles.footerSocialTextCompact, { color: subTextColor }]}>@yoroiapp</Text>
      </View>
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

  // Footer Pro - Compact
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  footerSeparator: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    marginBottom: 6,
  },
  footerBrandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrandName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
  },
  footerTagline: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 1,
    textAlign: 'center',
  },
  footerSocialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  footerInstagramIconSmall: {
    width: 16,
    height: 16,
  },
  footerSocialText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Footer Compact
  footerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerBrandNameCompact: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 5,
  },
  footerTaglineCompact: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  footerSocialRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  socialIconSmall: {
    width: 14,
    height: 14,
  },
  appStoreIconSmall: {
    width: 70,
    height: 20,
  },
  footerSocialTextCompact: {
    fontSize: 10,
    fontWeight: '600',
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
