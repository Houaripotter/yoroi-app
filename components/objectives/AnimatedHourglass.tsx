// ============================================
// YOROI - Sablier anime spectaculaire V2
// ============================================
// SVG bold statique + particules Animated.View (fiable)
// progress: 0 = sable en haut (debut), 1 = sable en bas (temps ecoule)

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop, ClipPath, G, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';

interface AnimatedHourglassProps {
  progress: number; // 0-1
  size?: number;
  sandColor?: string;
  label?: string;
}

const PARTICLE_COUNT = 6;

// ============================================
// Particule de sable tombante (Animated.View - fiable)
// ============================================
const FallingParticle = ({
  index,
  color,
  startY,
  endY,
  centerX,
  particleSize,
}: {
  index: number;
  color: string;
  startY: number;
  endY: number;
  centerX: number;
  particleSize: number;
}) => {
  const anim = useSharedValue(0);
  const wobbleAmount = Math.sin(index * 1.7) * particleSize * 0.6;

  useEffect(() => {
    anim.value = withDelay(
      index * 250,
      withRepeat(
        withTiming(1, { duration: 1000 + index * 120, easing: Easing.in(Easing.quad) }),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const ty = interpolate(anim.value, [0, 1], [startY, endY]);
    const opacity = interpolate(anim.value, [0, 0.05, 0.2, 0.7, 1], [0, 1, 1, 0.7, 0]);
    const tx = centerX - particleSize / 2 + wobbleAmount * interpolate(anim.value, [0, 0.5, 1], [0, 1, 0.3]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: particleSize,
          height: particleSize,
          borderRadius: particleSize / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
};

// ============================================
// Filet de sable pulsant au col (Animated.View)
// ============================================
const PulsingStream = ({
  color,
  centerX,
  y,
  baseWidth,
  height,
}: {
  color: string;
  centerX: number;
  y: number;
  baseWidth: number;
  height: number;
}) => {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const w = interpolate(anim.value, [0, 1], [baseWidth * 0.6, baseWidth * 1.4]);
    return {
      width: w,
      opacity: interpolate(anim.value, [0, 1], [0.7, 1]),
      left: centerX - w / 2,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: y,
          height,
          backgroundColor: color,
          borderRadius: baseWidth,
        },
        animStyle,
      ]}
    />
  );
};

// ============================================
// Composant principal
// ============================================
export const AnimatedHourglass: React.FC<AnimatedHourglassProps> = ({
  progress,
  size = 180,
  sandColor: sandColorProp,
}) => {
  const { colors, isDark } = useTheme();
  const sandColor = sandColorProp || colors.accent;

  // Scale
  const scale = size / 100;
  const containerHeight = size * 1.4;

  // ViewBox
  const VW = 100;
  const VH = 140;

  // Positions cles
  const topBarY = 8;
  const bottomBarY = VH - 8;
  const neckY = VH / 2;
  const centerX = VW / 2;

  // Couleurs du cadre - BOLD et visible
  const frameMain = isDark ? '#C8A06C' : '#8B6914';
  const frameLight = isDark ? '#E0C898' : '#AA8830';
  const frameDark = isDark ? '#906030' : '#5A3810';
  const glassStroke = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(100,80,40,0.4)';
  const glassFill = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(200,180,140,0.05)';

  // Niveaux de sable
  const topSandMaxH = 36;
  const bottomSandMaxH = 36;
  const topSandH = topSandMaxH * (1 - progress);
  const bottomSandH = bottomSandMaxH * progress;

  // Sable haut (trapeze qui se vide)
  const topSandTop = topBarY + 10;
  const topSandBottom = topSandTop + topSandH;
  const topWidthTop = 32;
  const topWidthAtLevel = Math.max(3, 32 - (topSandH / topSandMaxH) * 22);

  // Sable bas (trapeze qui se remplit)
  const bottomSandBottom = bottomBarY - 10;
  const bottomSandTop = bottomSandBottom - bottomSandH;
  const bottomWidthBottom = 32;
  const bottomWidthAtLevel = Math.max(3, 32 - (bottomSandH / bottomSandMaxH) * 22);

  // Forme du verre (X)
  const glassPath = `
    M ${centerX - 34} ${topBarY + 6}
    L ${centerX + 34} ${topBarY + 6}
    L ${centerX + 5} ${neckY - 2}
    Q ${centerX} ${neckY} ${centerX + 5} ${neckY + 2}
    L ${centerX + 34} ${bottomBarY - 6}
    L ${centerX - 34} ${bottomBarY - 6}
    L ${centerX - 5} ${neckY + 2}
    Q ${centerX} ${neckY} ${centerX - 5} ${neckY - 2}
    Z
  `;

  // Path sable haut
  const topSandPath =
    progress < 1
      ? `M ${centerX - topWidthTop} ${topSandTop}
         L ${centerX + topWidthTop} ${topSandTop}
         L ${centerX + topWidthAtLevel} ${topSandBottom}
         L ${centerX - topWidthAtLevel} ${topSandBottom} Z`
      : '';

  // Path sable bas
  const bottomSandPath =
    progress > 0
      ? `M ${centerX - bottomWidthAtLevel} ${bottomSandTop}
         L ${centerX + bottomWidthAtLevel} ${bottomSandTop}
         L ${centerX + bottomWidthBottom} ${bottomSandBottom}
         L ${centerX - bottomWidthBottom} ${bottomSandBottom} Z`
      : '';

  const showStream = progress > 0 && progress < 1;

  // Positions en pixels pour les elements animes
  const neckPixelY = neckY * scale;
  const bottomTargetY =
    (bottomSandTop > neckY + 6 ? bottomSandTop - 4 : bottomBarY - 16) * scale;
  const centerPixelX = centerX * scale;
  const particleSize = Math.max(2.5, size * 0.04);
  const streamW = Math.max(2, size * 0.03);
  const streamH = Math.max(8, 18 * scale);

  return (
    <View style={{ width: size, height: containerHeight, position: 'relative' }}>
      {/* ====== SVG STATIQUE ====== */}
      <Svg
        width={size}
        height={containerHeight}
        viewBox={`0 0 ${VW} ${VH}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id="hgSandFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sandColor} stopOpacity="1" />
            <Stop offset="1" stopColor={sandColor} stopOpacity="0.9" />
          </LinearGradient>
          <LinearGradient id="hgBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={frameLight} stopOpacity="1" />
            <Stop offset="0.5" stopColor={frameMain} stopOpacity="1" />
            <Stop offset="1" stopColor={frameDark} stopOpacity="1" />
          </LinearGradient>
          <ClipPath id="hgGlassClip">
            <Path d={glassPath} />
          </ClipPath>
        </Defs>

        {/* Corps du verre */}
        <Path d={glassPath} fill={glassFill} stroke={glassStroke} strokeWidth={2} />

        {/* Reflet de verre */}
        <Path
          d={`M ${centerX - 26} ${topBarY + 16} L ${centerX - 10} ${neckY - 12} L ${centerX - 14} ${neckY - 12} L ${centerX - 30} ${topBarY + 16} Z`}
          fill={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.3)'}
        />

        {/* Sable clippe dans le verre */}
        <G clipPath="url(#hgGlassClip)">
          {/* Sable haut */}
          {topSandPath ? <Path d={topSandPath} fill="url(#hgSandFill)" /> : null}

          {/* Sable bas */}
          {bottomSandPath ? <Path d={bottomSandPath} fill="url(#hgSandFill)" /> : null}

          {/* Filet statique au col (backup si l'animated ne se voit pas) */}
          {showStream && (
            <Rect
              x={centerX - 1.5}
              y={neckY - 8}
              width={3}
              height={16}
              rx={1.5}
              fill={sandColor}
              opacity={0.85}
            />
          )}
        </G>

        {/* ====== BARRE HAUTE ====== */}
        <Rect
          x={centerX - 38}
          y={topBarY - 2}
          width={76}
          height={9}
          rx={3}
          fill="url(#hgBarGrad)"
        />
        {/* Ligne ombre sous la barre haute */}
        <Line
          x1={centerX - 34}
          y1={topBarY + 7}
          x2={centerX + 34}
          y2={topBarY + 7}
          stroke={frameDark}
          strokeWidth={0.8}
          opacity={0.5}
        />

        {/* ====== BARRE BASSE ====== */}
        <Rect
          x={centerX - 38}
          y={bottomBarY - 7}
          width={76}
          height={9}
          rx={3}
          fill="url(#hgBarGrad)"
        />
        {/* Ligne lumiere sur la barre basse */}
        <Line
          x1={centerX - 34}
          y1={bottomBarY - 7}
          x2={centerX + 34}
          y2={bottomBarY - 7}
          stroke={frameLight}
          strokeWidth={0.6}
          opacity={0.5}
        />

        {/* Vis decoratives */}
        <Circle cx={centerX - 30} cy={topBarY + 2.5} r={2.2} fill={frameDark} opacity={0.7} />
        <Circle cx={centerX + 30} cy={topBarY + 2.5} r={2.2} fill={frameDark} opacity={0.7} />
        <Circle cx={centerX - 30} cy={bottomBarY - 2.5} r={2.2} fill={frameDark} opacity={0.7} />
        <Circle cx={centerX + 30} cy={bottomBarY - 2.5} r={2.2} fill={frameDark} opacity={0.7} />
        {/* Reflet sur les vis */}
        <Circle cx={centerX - 30.5} cy={topBarY + 2} r={0.9} fill={frameLight} opacity={0.5} />
        <Circle cx={centerX + 29.5} cy={topBarY + 2} r={0.9} fill={frameLight} opacity={0.5} />
        <Circle cx={centerX - 30.5} cy={bottomBarY - 3} r={0.9} fill={frameLight} opacity={0.5} />
        <Circle cx={centerX + 29.5} cy={bottomBarY - 3} r={0.9} fill={frameLight} opacity={0.5} />
      </Svg>

      {/* ====== ELEMENTS ANIMES (Animated.View) ====== */}
      {showStream && (
        <>
          {/* Filet pulsant */}
          <PulsingStream
            color={sandColor}
            centerX={centerPixelX}
            y={neckPixelY - 4 * scale}
            baseWidth={streamW}
            height={streamH}
          />
          {/* Particules tombantes */}
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <FallingParticle
              key={i}
              index={i}
              color={sandColor}
              startY={neckPixelY + 2 * scale}
              endY={bottomTargetY}
              centerX={centerPixelX}
              particleSize={particleSize}
            />
          ))}
        </>
      )}
    </View>
  );
};

export default AnimatedHourglass;
