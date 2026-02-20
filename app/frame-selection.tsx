// ============================================
// YOROI - SELECTION DES CADRES PHOTO
// 15 formes differentes pour avatar et photo de profil
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { logger } from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2) / 3;

export const FRAME_STORAGE_KEY = '@yoroi_frame_shape';

// Definition des 15 formes disponibles
export type FrameShape =
  | 'circle'
  | 'rounded-square'
  | 'squircle'
  | 'hexagon'
  | 'octagon'
  | 'diamond'
  | 'shield'
  | 'star'
  | 'heart'
  | 'pentagon'
  | 'flower'
  | 'drop'
  | 'clover'
  | 'wave'
  | 'blob';

interface FrameOption {
  id: FrameShape;
  name: string;
}

const FRAME_OPTIONS: FrameOption[] = [
  { id: 'circle', name: 'Cercle' },
  { id: 'rounded-square', name: 'Carre arrondi' },
  { id: 'squircle', name: 'Squircle' },
  { id: 'hexagon', name: 'Hexagone' },
  { id: 'octagon', name: 'Octogone' },
  { id: 'diamond', name: 'Diamant' },
  { id: 'shield', name: 'Bouclier' },
  { id: 'star', name: 'Etoile' },
  { id: 'heart', name: 'Coeur' },
  { id: 'pentagon', name: 'Pentagone' },
  { id: 'flower', name: 'Fleur' },
  { id: 'drop', name: 'Goutte' },
  { id: 'clover', name: 'Trefle' },
  { id: 'wave', name: 'Vague' },
  { id: 'blob', name: 'Blob' },
];

// Composant pour afficher une forme
const FrameShapePreview: React.FC<{
  shape: FrameShape;
  size: number;
  color: string;
  fillColor: string;
  isSelected: boolean;
}> = ({ shape, size, color, fillColor, isSelected }) => {
  const strokeWidth = isSelected ? 3 : 2;
  const innerSize = size - 10;

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={innerSize / 2 - 2}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'rounded-square':
        return (
          <Rect
            x={5}
            y={5}
            width={innerSize}
            height={innerSize}
            rx={innerSize * 0.2}
            ry={innerSize * 0.2}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'squircle':
        // iOS-style squircle
        const sq = innerSize / 2;
        return (
          <Path
            d={`M ${size/2} 5
                C ${size - 8} 5, ${size - 5} 8, ${size - 5} ${size/2}
                C ${size - 5} ${size - 8}, ${size - 8} ${size - 5}, ${size/2} ${size - 5}
                C 8 ${size - 5}, 5 ${size - 8}, 5 ${size/2}
                C 5 8, 8 5, ${size/2} 5 Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'hexagon':
        const hx = size / 2;
        const hy = size / 2;
        const hr = innerSize / 2 - 2;
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          return `${hx + hr * Math.cos(angle)},${hy + hr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={hexPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'octagon':
        const ox = size / 2;
        const oy = size / 2;
        const or = innerSize / 2 - 2;
        const octPoints = Array.from({ length: 8 }, (_, i) => {
          const angle = (Math.PI / 4) * i - Math.PI / 8;
          return `${ox + or * Math.cos(angle)},${oy + or * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={octPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'diamond':
        const dx = size / 2;
        const dy = size / 2;
        const dr = innerSize / 2 - 2;
        return (
          <Polygon
            points={`${dx},${5} ${size - 5},${dy} ${dx},${size - 5} ${5},${dy}`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'shield':
        return (
          <Path
            d={`M ${size/2} 5
                L ${size - 5} ${size * 0.25}
                L ${size - 5} ${size * 0.55}
                Q ${size - 5} ${size * 0.75}, ${size/2} ${size - 5}
                Q 5 ${size * 0.75}, 5 ${size * 0.55}
                L 5 ${size * 0.25}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'star':
        const sx = size / 2;
        const sy = size / 2;
        const outerR = innerSize / 2 - 2;
        const innerR = outerR * 0.4;
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          return `${sx + r * Math.cos(angle)},${sy + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={starPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'heart':
        const hs = innerSize * 0.45;
        return (
          <Path
            d={`M ${size/2} ${size - 8}
                C ${size/2 - hs} ${size/2 + hs/2}, 5 ${size/2 - hs/3}, 5 ${size/2 - hs/2}
                C 5 ${size * 0.2}, ${size/2 - hs/3} 8, ${size/2} ${size * 0.3}
                C ${size/2 + hs/3} 8, ${size - 5} ${size * 0.2}, ${size - 5} ${size/2 - hs/2}
                C ${size - 5} ${size/2 - hs/3}, ${size/2 + hs} ${size/2 + hs/2}, ${size/2} ${size - 8}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'pentagon':
        const px = size / 2;
        const py = size / 2;
        const pr = innerSize / 2 - 2;
        const pentPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
          return `${px + pr * Math.cos(angle)},${py + pr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={pentPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'flower':
        // 6 petals flower shape
        const fx = size / 2;
        const fy = size / 2;
        const petalR = innerSize * 0.25;
        const centerDist = innerSize * 0.22;
        return (
          <>
            {Array.from({ length: 6 }, (_, i) => {
              const angle = (Math.PI / 3) * i;
              return (
                <Circle
                  key={i}
                  cx={fx + centerDist * Math.cos(angle)}
                  cy={fy + centerDist * Math.sin(angle)}
                  r={petalR}
                  fill={fillColor}
                  stroke={color}
                  strokeWidth={strokeWidth * 0.7}
                />
              );
            })}
            <Circle
              cx={fx}
              cy={fy}
              r={petalR * 0.8}
              fill={fillColor}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </>
        );

      case 'drop':
        return (
          <Path
            d={`M ${size/2} 5
                Q ${size - 5} ${size * 0.4}, ${size - 5} ${size * 0.6}
                C ${size - 5} ${size - 5}, ${size/2} ${size - 5}, ${size/2} ${size - 5}
                C ${size/2} ${size - 5}, 5 ${size - 5}, 5 ${size * 0.6}
                Q 5 ${size * 0.4}, ${size/2} 5
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'clover':
        const clx = size / 2;
        const cly = size / 2;
        const leafR = innerSize * 0.22;
        const leafDist = innerSize * 0.2;
        return (
          <>
            <Circle cx={clx} cy={cly - leafDist} r={leafR} fill={fillColor} stroke={color} strokeWidth={strokeWidth * 0.7} />
            <Circle cx={clx - leafDist} cy={cly + leafDist * 0.5} r={leafR} fill={fillColor} stroke={color} strokeWidth={strokeWidth * 0.7} />
            <Circle cx={clx + leafDist} cy={cly + leafDist * 0.5} r={leafR} fill={fillColor} stroke={color} strokeWidth={strokeWidth * 0.7} />
            <Rect x={clx - 3} y={cly + leafR * 0.5} width={6} height={innerSize * 0.2} fill={color} rx={2} />
          </>
        );

      case 'wave':
        return (
          <Path
            d={`M 5 ${size * 0.35}
                Q ${size * 0.25} ${size * 0.15}, ${size * 0.5} ${size * 0.25}
                Q ${size * 0.75} ${size * 0.35}, ${size - 5} ${size * 0.25}
                L ${size - 5} ${size * 0.65}
                Q ${size * 0.75} ${size * 0.85}, ${size * 0.5} ${size * 0.75}
                Q ${size * 0.25} ${size * 0.65}, 5 ${size * 0.75}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'blob':
        return (
          <Path
            d={`M ${size * 0.5} ${size * 0.1}
                C ${size * 0.8} ${size * 0.05}, ${size * 0.95} ${size * 0.3}, ${size * 0.9} ${size * 0.5}
                C ${size * 0.95} ${size * 0.75}, ${size * 0.7} ${size * 0.95}, ${size * 0.5} ${size * 0.9}
                C ${size * 0.25} ${size * 0.95}, ${size * 0.05} ${size * 0.7}, ${size * 0.1} ${size * 0.5}
                C ${size * 0.05} ${size * 0.25}, ${size * 0.25} ${size * 0.05}, ${size * 0.5} ${size * 0.1}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      default:
        return (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={innerSize / 2 - 2}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
    }
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderShape()}
    </Svg>
  );
};

export default function FrameSelectionScreen() {
  const { colors, isDark } = useTheme();
  const [selectedFrame, setSelectedFrame] = useState<FrameShape>('circle');

  useEffect(() => {
    loadSelectedFrame();
  }, []);

  const loadSelectedFrame = async () => {
    try {
      const saved = await AsyncStorage.getItem(FRAME_STORAGE_KEY);
      if (saved) {
        setSelectedFrame(saved as FrameShape);
      }
    } catch (error) {
      logger.error('Error loading frame shape:', error);
    }
  };

  const handleSelectFrame = async (frameId: FrameShape) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setSelectedFrame(frameId);
    try {
      await AsyncStorage.setItem(FRAME_STORAGE_KEY, frameId);
    } catch (error) {
      logger.error('Error saving frame shape:', error);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topSection}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Cadres photo
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choisis la forme de ton avatar et photo de profil
          </Text>
        </View>

        {/* Preview */}
        <View style={[styles.previewContainer, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
            Apercu
          </Text>
          <View style={styles.previewFrame}>
            <FrameShapePreview
              shape={selectedFrame}
              size={120}
              color={colors.accent}
              fillColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
              isSelected={true}
            />
          </View>
          <Text style={[styles.previewName, { color: colors.textPrimary }]}>
            {FRAME_OPTIONS.find(f => f.id === selectedFrame)?.name}
          </Text>
        </View>

        {/* Grid of frames */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Formes disponibles
        </Text>

        <View style={styles.grid}>
          {FRAME_OPTIONS.map((frame) => {
            const isSelected = selectedFrame === frame.id;
            return (
              <TouchableOpacity
                key={frame.id}
                style={[
                  styles.frameCard,
                  { backgroundColor: colors.backgroundCard },
                  isSelected && { borderColor: colors.accent, borderWidth: 2 },
                ]}
                onPress={() => handleSelectFrame(frame.id)}
                activeOpacity={0.7}
              >
                <View style={styles.framePreview}>
                  <FrameShapePreview
                    shape={frame.id}
                    size={FRAME_SIZE - 30}
                    color={isSelected ? colors.accent : colors.textMuted}
                    fillColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
                    isSelected={isSelected}
                  />
                </View>
                <Text
                  style={[
                    styles.frameName,
                    { color: isSelected ? colors.accent : colors.textPrimary }
                  ]}
                  numberOfLines={1}
                >
                  {frame.name}
                </Text>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                    <Check size={12} color={colors.textOnAccent} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  topSection: {
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
  },
  previewContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  previewFrame: {
    marginBottom: SPACING.md,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  frameCard: {
    width: FRAME_SIZE,
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    position: 'relative',
  },
  framePreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
