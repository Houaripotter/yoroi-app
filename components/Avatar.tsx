import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, GRADIENTS, RADIUS, SHADOWS } from '@/constants/design';
import { scale } from '@/constants/responsive';

// ============================================
// AVATAR COMPONENT - RESPONSIVE
// ============================================
// Gère le fond coloré pour cacher le fond blanc des PNG
// Avec options de ring progress et glow effects
// ADAPTÉ IPHONE & IPAD

interface AvatarProps {
  source?: ImageSourcePropType | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRing?: boolean;
  ringProgress?: number;
  ringColor?: string;
  glowColor?: string;
  style?: any;
}

const SIZES = {
  sm: { container: scale(48), image: scale(40), ring: scale(52), strokeWidth: scale(2) },
  md: { container: scale(64), image: scale(54), ring: scale(72), strokeWidth: scale(3) },
  lg: { container: scale(80), image: scale(68), ring: scale(90), strokeWidth: scale(4) },
  xl: { container: scale(100), image: scale(85), ring: scale(116), strokeWidth: scale(5) },
};

// Default avatar - placeholder
const DEFAULT_AVATAR = require('@/assets/avatars/samurai/male/samurai_m_1.png');

// Ring Progress Component
const RingProgress = ({
  progress,
  size,
  strokeWidth,
  color,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgGradient id="avatarRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={COLORS.primaryLight} />
        </SvgGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={COLORS.surfaceBorder}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#avatarRingGrad)"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

export const Avatar: React.FC<AvatarProps> = ({
  source = DEFAULT_AVATAR,
  size = 'md',
  showRing = false,
  ringProgress = 0,
  ringColor = COLORS.primary,
  glowColor,
  style,
}) => {
  const dimensions = SIZES[size];

  const containerStyle = [
    styles.container,
    {
      width: showRing ? dimensions.ring : dimensions.container,
      height: showRing ? dimensions.ring : dimensions.container,
    },
    glowColor && {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: scale(15),
      elevation: 8,
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      {/* Ring Progress */}
      {showRing && (
        <RingProgress
          progress={ringProgress}
          size={dimensions.ring}
          strokeWidth={dimensions.strokeWidth}
          color={ringColor}
        />
      )}

      {/* Avatar Container with gradient background */}
      <View
        style={[
          styles.avatarContainer,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.container / 2,
          },
        ]}
      >
        <LinearGradient
          colors={GRADIENTS.surface}
          style={[
            styles.gradientBg,
            { borderRadius: dimensions.container / 2 },
          ]}
        >
          <Image
            source={source ?? DEFAULT_AVATAR}
            style={[
              styles.image,
              {
                width: dimensions.image,
                height: dimensions.image * 1.2, // Avatar is taller than wide
              },
            ]}
            resizeMode="contain"
          />
        </LinearGradient>
      </View>
    </View>
  );
};

// Avatar with colored background (no gradient, solid color)
export const AvatarSolid: React.FC<AvatarProps & { backgroundColor?: string }> = ({
  source = DEFAULT_AVATAR,
  size = 'md',
  backgroundColor = COLORS.avatarBg,
  showRing = false,
  ringProgress = 0,
  ringColor = COLORS.primary,
  glowColor,
  style,
}) => {
  const dimensions = SIZES[size];

  const containerStyle = [
    styles.container,
    {
      width: showRing ? dimensions.ring : dimensions.container,
      height: showRing ? dimensions.ring : dimensions.container,
    },
    glowColor && {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: scale(15),
      elevation: 8,
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      {/* Ring Progress */}
      {showRing && (
        <RingProgress
          progress={ringProgress}
          size={dimensions.ring}
          strokeWidth={dimensions.strokeWidth}
          color={ringColor}
        />
      )}

      {/* Avatar Container with solid background */}
      <View
        style={[
          styles.avatarContainer,
          styles.solidBg,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.container / 2,
            backgroundColor,
          },
        ]}
      >
        <Image
          source={source ?? DEFAULT_AVATAR}
          style={[
            styles.image,
            {
              width: dimensions.image,
              height: dimensions.image * 1.2,
            },
          ]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

// Compact avatar for lists
export const AvatarCompact: React.FC<{
  source?: ImageSourcePropType;
  size?: number;
  style?: any;
}> = ({
  source = DEFAULT_AVATAR,
  size = scale(40),
  style,
}) => {
  return (
    <View
      style={[
        styles.compactContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Image
        source={source ?? DEFAULT_AVATAR}
        style={{
          width: size * 0.85,
          height: size * 1.0,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
  },
  gradientBg: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  solidBg: {
    borderWidth: scale(3),
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(10),
    elevation: 8,
  },
  image: {
    marginTop: scale(4), // Slight offset since avatar heads are at top
  },
  compactContainer: {
    backgroundColor: COLORS.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: scale(2),
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(6),
    elevation: 4,
  },
});

export default Avatar;
