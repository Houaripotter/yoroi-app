// ============================================
// YOROI - SELECTION DES CADRES PHOTO
// 30 formes + accessoires decoratifs
// ============================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  PanResponder,
  DeviceEventEmitter,
} from 'react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ArrowLeft, Check, ImagePlus, ZoomIn, RotateCcw } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SPACING, RADIUS } from '@/constants/appTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle, Rect, Polygon, Defs, ClipPath, Image as SvgImage, G } from 'react-native-svg';
import { getProfile, saveProfile } from '@/lib/database';
import { logger } from '@/lib/security/logger';

export const FRAME_SHAPE_CHANGED_EVENT = 'FRAME_SHAPE_CHANGED';
export const FRAME_ACCESSORY_CHANGED_EVENT = 'FRAME_ACCESSORY_CHANGED';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2) / 3;

export const FRAME_STORAGE_KEY = '@yoroi_frame_shape';
export const ACCESSORY_STORAGE_KEY = '@yoroi_frame_accessory';

// 30 formes - toutes avec assez d'aire pour une photo
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
  | 'drop'
  | 'arch'
  | 'pentagon'
  | 'ovale'
  | 'plaque'
  | 'tonneau'
  | 'capsule'
  | 'coquille'
  | 'medaillon'
  | 'sceau'
  | 'ticket'
  | 'stade'
  | 'nuage'
  | 'tv-retro'
  | 'clover'
  | 'soft-diamond'
  | 'egg'
  | 'wide-barrel'
  | 'leaf-wide'
  | 'nonagon'
  | 'super-ellipse';

// Accessoires decoratifs (rendus par-dessus la bordure, style badge notification)
export type FrameAccessory =
  | 'none'
  | 'flower'
  | 'bow'
  | 'crown'
  | 'halo'
  | 'mini-star'
  | 'mini-heart'
  | 'lightning';

interface FrameOption {
  id: FrameShape;
  name: string;
}

interface AccessoryOption {
  id: FrameAccessory;
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
  { id: 'drop', name: 'Goutte' },
  { id: 'arch', name: 'Arche' },
  { id: 'pentagon', name: 'Pentagone' },
  { id: 'ovale', name: 'Ovale' },
  { id: 'plaque', name: 'Plaque' },
  { id: 'tonneau', name: 'Tonneau' },
  { id: 'capsule', name: 'Capsule' },
  { id: 'coquille', name: 'Coquille' },
  { id: 'medaillon', name: 'Medaillon' },
  { id: 'sceau', name: 'Sceau' },
  { id: 'ticket', name: 'Ticket' },
  { id: 'stade', name: 'Stade' },
  { id: 'nuage', name: 'Nuage' },
  { id: 'tv-retro', name: 'TV Retro' },
  { id: 'clover', name: 'Trefle' },
  { id: 'soft-diamond', name: 'Coussin' },
  { id: 'egg', name: 'Oeuf' },
  { id: 'wide-barrel', name: 'Barrique' },
  { id: 'leaf-wide', name: 'Feuille' },
  { id: 'nonagon', name: 'Nonagone' },
  { id: 'super-ellipse', name: 'Super Ellipse' },
];

const ACCESSORY_OPTIONS: AccessoryOption[] = [
  { id: 'none', name: 'Aucun' },
  { id: 'flower', name: 'Fleur' },
  { id: 'bow', name: 'Noeud' },
  { id: 'crown', name: 'Couronne' },
  { id: 'halo', name: 'Aureole' },
  { id: 'mini-star', name: 'Etoile' },
  { id: 'mini-heart', name: 'Coeur' },
  { id: 'lightning', name: 'Eclair' },
];

// ============================================
// ACCESSORY SVG RENDERER
// Gros ornements decoratifs EXTERIEURS au cadre
// Positionnes sur le bord comme un noeud cadeau
// ============================================
export function renderAccessorySvg(
  accessory: FrameAccessory,
  frameSize: number,
  accentColor: string,
): React.ReactNode {
  if (accessory === 'none') return null;

  // Taille de l'accessoire
  const frameScale = frameSize * 0.38;

  // Position par defaut : bord droit en haut (pour fleur, noeud, etoile, coeur, eclair)
  const cx = frameSize - frameScale * 0.15;
  const cy = frameSize * 0.18;

  // Position CENTRE HAUT (pour couronne et aureole - au-dessus de la tete)
  const topCx = frameSize / 2;
  const topCy = -frameScale * 0.15;

  switch (accessory) {
    case 'flower': {
      // Grosse fleur 5 petales sur le bord droit
      const petalR = frameScale * 0.24;
      const petalDist = frameScale * 0.28;
      const centerR = frameScale * 0.15;
      return (
        <G>
          <Circle cx={cx + 1} cy={cy + 1.5} r={frameScale * 0.45} fill="rgba(0,0,0,0.12)" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
            return (
              <Circle
                key={i}
                cx={cx + petalDist * Math.cos(a)}
                cy={cy + petalDist * Math.sin(a)}
                r={petalR}
                fill={accentColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            );
          })}
          <Circle cx={cx} cy={cy} r={centerR} fill="#FFD700" stroke="#FFFFFF" strokeWidth={1} />
        </G>
      );
    }

    case 'bow': {
      // Gros noeud papillon cadeau - bord droit
      const w = frameScale * 0.48;
      const h = frameScale * 0.32;
      return (
        <G>
          <Path
            d={`M ${cx + 1} ${cy + 1.5}
                C ${cx - w + 1} ${cy - h * 1.4 + 1.5}, ${cx - w * 1.1 + 1} ${cy + h * 1.4 + 1.5}, ${cx + 1} ${cy + 1.5}
                C ${cx + w + 1} ${cy - h * 1.4 + 1.5}, ${cx + w * 1.1 + 1} ${cy + h * 1.4 + 1.5}, ${cx + 1} ${cy + 1.5} Z`}
            fill="rgba(0,0,0,0.12)"
          />
          <Path
            d={`M ${cx} ${cy}
                C ${cx - w} ${cy - h * 1.4}, ${cx - w * 1.1} ${cy + h * 1.4}, ${cx} ${cy} Z`}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Path
            d={`M ${cx} ${cy}
                C ${cx + w} ${cy - h * 1.4}, ${cx + w * 1.1} ${cy + h * 1.4}, ${cx} ${cy} Z`}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Path
            d={`M ${cx - frameScale * 0.08} ${cy + frameScale * 0.05}
                L ${cx - frameScale * 0.18} ${cy + frameScale * 0.35}
                L ${cx - frameScale * 0.06} ${cy + frameScale * 0.25}
                L ${cx + frameScale * 0.06} ${cy + frameScale * 0.25}
                L ${cx + frameScale * 0.18} ${cy + frameScale * 0.35}
                L ${cx + frameScale * 0.08} ${cy + frameScale * 0.05} Z`}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={1}
          />
          <Circle cx={cx} cy={cy} r={frameScale * 0.08} fill="#FFFFFF" />
        </G>
      );
    }

    case 'crown': {
      // Couronne doree CENTREE EN HAUT - au dessus de la tete
      const crownW = frameSize * 0.28;
      const crownH = frameSize * 0.18;
      const crCx = topCx;
      const crBase = topCy + crownH * 0.65;
      const crTop = topCy - crownH * 0.35;
      return (
        <G>
          {/* Ombre */}
          <Path
            d={`M ${crCx - crownW} ${crBase + 2}
                L ${crCx - crownW} ${crTop + crownH * 0.3 + 2}
                L ${crCx - crownW * 0.5} ${crTop + crownH * 0.6 + 2}
                L ${crCx} ${crTop + 2}
                L ${crCx + crownW * 0.5} ${crTop + crownH * 0.6 + 2}
                L ${crCx + crownW} ${crTop + crownH * 0.3 + 2}
                L ${crCx + crownW} ${crBase + 2} Z`}
            fill="rgba(0,0,0,0.1)"
          />
          {/* Corps */}
          <Path
            d={`M ${crCx - crownW} ${crBase}
                L ${crCx - crownW} ${crTop + crownH * 0.3}
                L ${crCx - crownW * 0.5} ${crTop + crownH * 0.6}
                L ${crCx} ${crTop}
                L ${crCx + crownW * 0.5} ${crTop + crownH * 0.6}
                L ${crCx + crownW} ${crTop + crownH * 0.3}
                L ${crCx + crownW} ${crBase}
                Z`}
            fill="#FFD700"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Bande base */}
          <Rect
            x={crCx - crownW}
            y={crBase - crownH * 0.12}
            width={crownW * 2}
            height={crownH * 0.2}
            rx={2}
            fill="#DAA520"
            stroke="#FFFFFF"
            strokeWidth={1}
          />
          {/* Gemmes */}
          <Circle cx={crCx} cy={crTop + crownH * 0.1} r={frameSize * 0.025} fill={accentColor} stroke="#FFFFFF" strokeWidth={1} />
          <Circle cx={crCx - crownW * 0.5} cy={crTop + crownH * 0.5} r={frameSize * 0.02} fill={accentColor} stroke="#FFFFFF" strokeWidth={0.8} />
          <Circle cx={crCx + crownW * 0.5} cy={crTop + crownH * 0.5} r={frameSize * 0.02} fill={accentColor} stroke="#FFFFFF" strokeWidth={0.8} />
        </G>
      );
    }

    case 'halo': {
      // Aureole CENTREE EN HAUT - arc dore au-dessus de la tete
      const haloW = frameSize * 0.35;
      const haloH = frameSize * 0.12;
      const haloCy = topCy + frameSize * 0.02;
      return (
        <G>
          {/* Ombre aureole */}
          <Path
            d={`M ${topCx - haloW} ${haloCy + 2}
                A ${haloW} ${haloH} 0 1 1 ${topCx + haloW} ${haloCy + 2}`}
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={frameSize * 0.045}
            strokeLinecap="round"
          />
          {/* Aureole principale - anneau */}
          <Path
            d={`M ${topCx - haloW} ${haloCy}
                A ${haloW} ${haloH} 0 1 1 ${topCx + haloW} ${haloCy}`}
            fill="none"
            stroke={accentColor}
            strokeWidth={frameSize * 0.04}
            strokeLinecap="round"
            opacity={0.9}
          />
          {/* Bord lumineux exterieur */}
          <Path
            d={`M ${topCx - haloW + 2} ${haloCy - 1}
                A ${haloW - 2} ${haloH - 1} 0 1 1 ${topCx + haloW - 2} ${haloCy - 1}`}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={frameSize * 0.012}
            strokeLinecap="round"
          />
          {/* Bord lumineux interieur */}
          <Path
            d={`M ${topCx - haloW + 3} ${haloCy + 2}
                A ${haloW - 3} ${haloH + 1} 0 1 1 ${topCx + haloW - 3} ${haloCy + 2}`}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={frameSize * 0.008}
            strokeLinecap="round"
          />
        </G>
      );
    }

    case 'mini-star': {
      // Grosse etoile brillante - bord droit
      const outerR = frameScale * 0.4;
      const innerR = outerR * 0.42;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const rad = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
      }).join(' ');
      return (
        <G>
          <Polygon
            points={Array.from({ length: 10 }, (_, i) => {
              const rad = i % 2 === 0 ? outerR : innerR;
              const a = (Math.PI / 5) * i - Math.PI / 2;
              return `${cx + 1 + rad * Math.cos(a)},${cy + 1.5 + rad * Math.sin(a)}`;
            }).join(' ')}
            fill="rgba(0,0,0,0.12)"
          />
          <Polygon
            points={pts}
            fill="#FFD700"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Circle cx={cx - outerR * 0.15} cy={cy - outerR * 0.2} r={frameScale * 0.04} fill="rgba(255,255,255,0.6)" />
        </G>
      );
    }

    case 'mini-heart': {
      // Gros coeur - bord droit
      const hs = frameScale * 0.45;
      return (
        <G>
          <Path
            d={`M ${cx + 1} ${cy + hs * 0.85 + 1.5}
                C ${cx - hs * 0.9 + 1} ${cy + hs * 0.3 + 1.5}, ${cx - hs + 1} ${cy - hs * 0.3 + 1.5}, ${cx - hs + 1} ${cy - hs * 0.45 + 1.5}
                C ${cx - hs + 1} ${cy - hs * 0.85 + 1.5}, ${cx - hs * 0.3 + 1} ${cy - hs * 0.9 + 1.5}, ${cx + 1} ${cy - hs * 0.35 + 1.5}
                C ${cx + hs * 0.3 + 1} ${cy - hs * 0.9 + 1.5}, ${cx + hs + 1} ${cy - hs * 0.85 + 1.5}, ${cx + hs + 1} ${cy - hs * 0.45 + 1.5}
                C ${cx + hs + 1} ${cy - hs * 0.3 + 1.5}, ${cx + hs * 0.9 + 1} ${cy + hs * 0.3 + 1.5}, ${cx + 1} ${cy + hs * 0.85 + 1.5} Z`}
            fill="rgba(0,0,0,0.12)"
          />
          <Path
            d={`M ${cx} ${cy + hs * 0.85}
                C ${cx - hs * 0.9} ${cy + hs * 0.3}, ${cx - hs} ${cy - hs * 0.3}, ${cx - hs} ${cy - hs * 0.45}
                C ${cx - hs} ${cy - hs * 0.85}, ${cx - hs * 0.3} ${cy - hs * 0.9}, ${cx} ${cy - hs * 0.35}
                C ${cx + hs * 0.3} ${cy - hs * 0.9}, ${cx + hs} ${cy - hs * 0.85}, ${cx + hs} ${cy - hs * 0.45}
                C ${cx + hs} ${cy - hs * 0.3}, ${cx + hs * 0.9} ${cy + hs * 0.3}, ${cx} ${cy + hs * 0.85} Z`}
            fill="#FF4466"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Circle cx={cx - hs * 0.3} cy={cy - hs * 0.45} r={frameScale * 0.05} fill="rgba(255,255,255,0.4)" />
        </G>
      );
    }

    case 'lightning': {
      // Eclair dans un cercle - bord droit
      const er = frameScale * 0.32;
      return (
        <G>
          <Circle cx={cx + 1} cy={cy + 1.5} r={er + 2} fill="rgba(0,0,0,0.12)" />
          <Circle cx={cx} cy={cy} r={er + 2} fill={accentColor} stroke="#FFFFFF" strokeWidth={1.5} />
          <Path
            d={`M ${cx + er * 0.15} ${cy - er * 0.8}
                L ${cx - er * 0.3} ${cy + er * 0.05}
                L ${cx + er * 0.05} ${cy + er * 0.05}
                L ${cx - er * 0.15} ${cy + er * 0.8}
                L ${cx + er * 0.3} ${cy - er * 0.05}
                L ${cx - er * 0.05} ${cy - er * 0.05}
                Z`}
            fill="#FFD700"
            stroke="#FFFFFF"
            strokeWidth={0.8}
          />
        </G>
      );
    }

    default:
      return null;
  }
}

// ============================================
// ACCESSORY PREVIEW for grid
// ============================================
const AccessoryPreview: React.FC<{
  accessory: FrameAccessory;
  size: number;
  accentColor: string;
  bgColor: string;
  isSelected: boolean;
}> = ({ accessory, size, accentColor, bgColor, isSelected }) => {
  if (accessory === 'none') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={size * 0.3} fill="none" stroke={isSelected ? accentColor : '#888'} strokeWidth={2} strokeDasharray="4,3" />
        <Path
          d={`M ${size * 0.35} ${size * 0.35} L ${size * 0.65} ${size * 0.65}`}
          stroke={isSelected ? accentColor : '#888'}
          strokeWidth={1.5}
        />
      </Svg>
    );
  }

  // Pour la preview dans la grille, on centre l'accessoire
  // en utilisant un viewBox decale pour compenser la position "bord droit"
  const previewScale = 1.8;
  const vbSize = size * previewScale;
  const offsetX = vbSize * 0.32;
  const offsetY = -vbSize * 0.08;
  return (
    <Svg width={size} height={size} viewBox={`${offsetX} ${offsetY} ${vbSize} ${vbSize}`}>
      {renderAccessorySvg(accessory, vbSize, accentColor)}
    </Svg>
  );
};

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

      case 'squircle': {
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
      }

      case 'hexagon': {
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
      }

      case 'octagon': {
        const ox = size / 2;
        const oy = size / 2;
        const or2 = innerSize / 2 - 2;
        const octPoints = Array.from({ length: 8 }, (_, i) => {
          const angle = (Math.PI / 4) * i - Math.PI / 8;
          return `${ox + or2 * Math.cos(angle)},${oy + or2 * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={octPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'diamond': {
        const dx = size / 2;
        const dy = size / 2;
        return (
          <Polygon
            points={`${dx},${5} ${size - 5},${dy} ${dx},${size - 5} ${5},${dy}`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

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

      case 'star': {
        const sx = size / 2;
        const sy = size / 2;
        const outerR = innerSize / 2 - 2;
        const innerR = outerR * 0.58;
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
            strokeLinejoin="round"
          />
        );
      }

      case 'heart': {
        const scale = size;
        const padding = 5;
        return (
          <Path
            d={`M ${scale/2} ${scale - padding - 2}
                C ${scale * 0.15} ${scale * 0.68}, ${padding} ${scale * 0.48}, ${padding} ${scale * 0.35}
                C ${padding} ${scale * 0.2}, ${scale * 0.2} ${padding + 2}, ${scale * 0.35} ${padding + 2}
                C ${scale * 0.42} ${padding + 2}, ${scale * 0.48} ${scale * 0.15}, ${scale/2} ${scale * 0.22}
                C ${scale * 0.52} ${scale * 0.15}, ${scale * 0.58} ${padding + 2}, ${scale * 0.65} ${padding + 2}
                C ${scale * 0.8} ${padding + 2}, ${scale - padding} ${scale * 0.2}, ${scale - padding} ${scale * 0.35}
                C ${scale - padding} ${scale * 0.48}, ${scale * 0.85} ${scale * 0.68}, ${scale/2} ${scale - padding - 2}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

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

      case 'arch': {
        const ap = 5;
        const aR = (size - ap * 2) / 2;
        return (
          <Path
            d={`M ${ap} ${size - ap}
                L ${ap} ${ap + aR}
                A ${aR} ${aR} 0 0 1 ${size - ap} ${ap + aR}
                L ${size - ap} ${size - ap}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'pentagon': {
        const px = size / 2;
        const py = size / 2;
        const pr = innerSize / 2 - 2;
        const pentPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          return `${px + pr * Math.cos(angle)},${py + pr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={pentPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'ovale': {
        const orx = innerSize / 2 - 2;
        const ory = orx * 0.7;
        return (
          <Path
            d={`M ${size/2 - orx},${size/2}
                A ${orx} ${ory} 0 1 1 ${size/2 + orx},${size/2}
                A ${orx} ${ory} 0 1 1 ${size/2 - orx},${size/2} Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'plaque': {
        const pp = 5;
        const cut = (size - pp * 2) * 0.2;
        return (
          <Polygon
            points={`${pp + cut},${pp} ${size - pp - cut},${pp} ${size - pp},${pp + cut} ${size - pp},${size - pp - cut} ${size - pp - cut},${size - pp} ${pp + cut},${size - pp} ${pp},${size - pp - cut} ${pp},${pp + cut}`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'tonneau': {
        const tp = 5;
        const bulge = (size - tp * 2) * 0.12;
        return (
          <Path
            d={`M ${tp + 8},${tp}
                L ${size - tp - 8},${tp}
                Q ${size - tp},${tp} ${size - tp},${tp + 8}
                Q ${size - tp + bulge},${size/2} ${size - tp},${size - tp - 8}
                Q ${size - tp},${size - tp} ${size - tp - 8},${size - tp}
                L ${tp + 8},${size - tp}
                Q ${tp},${size - tp} ${tp},${size - tp - 8}
                Q ${tp - bulge},${size/2} ${tp},${tp + 8}
                Q ${tp},${tp} ${tp + 8},${tp}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'capsule': {
        const capInset = size * 0.15;
        const capR = (size - capInset * 2) / 2;
        const capP = 5;
        return (
          <Path
            d={`M ${capInset} ${capP + capR}
                A ${capR} ${capR} 0 0 1 ${size - capInset} ${capP + capR}
                L ${size - capInset} ${size - capP - capR}
                A ${capR} ${capR} 0 0 1 ${capInset} ${size - capP - capR}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'coquille': {
        const scCx = size / 2;
        const scCy = size / 2;
        const scR = innerSize / 2 - 4;
        const scN = 10;
        let scD = '';
        for (let i = 0; i < scN; i++) {
          const a1 = (2 * Math.PI * i / scN) - Math.PI / 2;
          const a2 = (2 * Math.PI * (i + 1) / scN) - Math.PI / 2;
          const x1 = scCx + scR * Math.cos(a1);
          const y1 = scCy + scR * Math.sin(a1);
          const x2 = scCx + scR * Math.cos(a2);
          const y2 = scCy + scR * Math.sin(a2);
          const midA = (a1 + a2) / 2;
          const cpx = scCx + scR * 1.18 * Math.cos(midA);
          const cpy = scCy + scR * 1.18 * Math.sin(midA);
          if (i === 0) scD += `M ${x1},${y1} `;
          scD += `Q ${cpx},${cpy} ${x2},${y2} `;
        }
        scD += 'Z';
        return (
          <Path
            d={scD}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'medaillon': {
        const mdCx = size / 2;
        const mdCy = size / 2;
        const mdR = innerSize / 2 - 2;
        const mdPoints = Array.from({ length: 12 }, (_, i) => {
          const angle = (Math.PI * 2 / 12) * i - Math.PI / 2;
          return `${mdCx + mdR * Math.cos(angle)},${mdCy + mdR * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={mdPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'sceau': {
        const seCx = size / 2;
        const seCy = size / 2;
        const seOuter = innerSize / 2 - 2;
        const seInner = seOuter * 0.88;
        const seN = 16;
        let seD = '';
        for (let i = 0; i < seN * 2; i++) {
          const a = (Math.PI * i / seN) - Math.PI / 2;
          const r = i % 2 === 0 ? seOuter : seInner;
          const x = seCx + r * Math.cos(a);
          const y = seCy + r * Math.sin(a);
          seD += (i === 0 ? `M ` : `L `) + `${x},${y} `;
        }
        seD += 'Z';
        return (
          <Path
            d={seD}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'ticket': {
        const tkP = 5;
        const tkR = innerSize * 0.08;
        return (
          <Path
            d={`M ${tkP} ${tkP}
                L ${size - tkP} ${tkP}
                L ${size - tkP} ${size/2 - tkR}
                A ${tkR} ${tkR} 0 0 0 ${size - tkP} ${size/2 + tkR}
                L ${size - tkP} ${size - tkP}
                L ${tkP} ${size - tkP}
                L ${tkP} ${size/2 + tkR}
                A ${tkR} ${tkR} 0 0 0 ${tkP} ${size/2 - tkR}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'stade': {
        const stInset = size * 0.15;
        const stR = (size - stInset * 2) / 2;
        const stP = 5;
        return (
          <Path
            d={`M ${stP + stR} ${stInset}
                L ${size - stP - stR} ${stInset}
                A ${stR} ${stR} 0 0 1 ${size - stP - stR} ${size - stInset}
                L ${stP + stR} ${size - stInset}
                A ${stR} ${stR} 0 0 1 ${stP + stR} ${stInset}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'nuage': {
        const nP = 5;
        return (
          <Path
            d={`M ${nP} ${size * 0.65}
                Q ${nP} ${size * 0.4}, ${size * 0.25} ${size * 0.32}
                Q ${size * 0.3} ${size * 0.15}, ${size/2} ${size * 0.2}
                Q ${size * 0.7} ${size * 0.15}, ${size * 0.75} ${size * 0.32}
                Q ${size - nP} ${size * 0.4}, ${size - nP} ${size * 0.65}
                Q ${size - nP} ${size - nP}, ${size/2} ${size - nP}
                Q ${nP} ${size - nP}, ${nP} ${size * 0.65}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      // ===== 8 NEW SHAPES =====

      case 'tv-retro': {
        // TV retro - rectangle avec bords bombes (large, pas etroit)
        const tp2 = 5;
        const tw = innerSize;
        const th = innerSize * 0.82;
        const ty = (size - th) / 2;
        const bulge2 = tw * 0.06;
        return (
          <Path
            d={`M ${tp2 + 12},${ty}
                L ${size - tp2 - 12},${ty}
                Q ${size - tp2},${ty} ${size - tp2},${ty + 12}
                Q ${size - tp2 + bulge2},${size/2} ${size - tp2},${ty + th - 12}
                Q ${size - tp2},${ty + th} ${size - tp2 - 12},${ty + th}
                L ${tp2 + 12},${ty + th}
                Q ${tp2},${ty + th} ${tp2},${ty + th - 12}
                Q ${tp2 - bulge2},${size/2} ${tp2},${ty + 12}
                Q ${tp2},${ty} ${tp2 + 12},${ty}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'clover': {
        // Trefle a 4 feuilles - 4 cercles qui se chevauchent avec large zone centrale
        const clCx = size / 2;
        const clCy = size / 2;
        const clR = innerSize * 0.27;
        const clOffset = innerSize * 0.18;
        return (
          <G>
            <Circle cx={clCx} cy={clCy - clOffset} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            <Circle cx={clCx + clOffset} cy={clCy} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            <Circle cx={clCx} cy={clCy + clOffset} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            <Circle cx={clCx - clOffset} cy={clCy} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            {/* Zone centrale - remplissage pour masquer les bordures internes */}
            <Circle cx={clCx} cy={clCy} r={clOffset * 0.9} fill={fillColor} />
          </G>
        );
      }

      case 'soft-diamond': {
        // Diamant arrondi / coussin - losange avec courbes douces
        const sdP = 5;
        const sdW = innerSize / 2;
        return (
          <Path
            d={`M ${size/2} ${sdP}
                Q ${size - sdP + 4} ${sdP + 4}, ${size - sdP} ${size/2}
                Q ${size - sdP + 4} ${size - sdP - 4}, ${size/2} ${size - sdP}
                Q ${sdP - 4} ${size - sdP - 4}, ${sdP} ${size/2}
                Q ${sdP - 4} ${sdP + 4}, ${size/2} ${sdP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'egg': {
        // Oeuf - cercle plus large en bas, plus etroit en haut, bonne surface
        const ep = 5;
        const eW = innerSize * 0.45;
        const eH = innerSize / 2;
        return (
          <Path
            d={`M ${size/2} ${ep}
                C ${size/2 + eW * 0.85} ${ep}, ${size/2 + eW} ${size * 0.3}, ${size/2 + eW} ${size * 0.45}
                C ${size/2 + eW} ${size * 0.65}, ${size/2 + eW * 0.9} ${size - ep}, ${size/2} ${size - ep}
                C ${size/2 - eW * 0.9} ${size - ep}, ${size/2 - eW} ${size * 0.65}, ${size/2 - eW} ${size * 0.45}
                C ${size/2 - eW} ${size * 0.3}, ${size/2 - eW * 0.85} ${ep}, ${size/2} ${ep}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'wide-barrel': {
        // Barrique - tonneau horizontal, plus large que haut
        const wbP = 5;
        const wbH = innerSize * 0.78;
        const wbY = (size - wbH) / 2;
        const wbBulge = wbH * 0.1;
        return (
          <Path
            d={`M ${wbP + 6},${wbY}
                L ${size - wbP - 6},${wbY}
                Q ${size - wbP},${wbY} ${size - wbP},${wbY + 6}
                L ${size - wbP},${wbY + wbH - 6}
                Q ${size - wbP},${wbY + wbH} ${size - wbP - 6},${wbY + wbH}
                L ${wbP + 6},${wbY + wbH}
                Q ${wbP},${wbY + wbH} ${wbP},${wbY + wbH - 6}
                L ${wbP},${wbY + 6}
                Q ${wbP},${wbY} ${wbP + 6},${wbY}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'leaf-wide': {
        // Feuille large - forme organique avec pointes douces, bonne surface
        const lfP = 5;
        return (
          <Path
            d={`M ${size/2} ${lfP}
                Q ${size - lfP + 3} ${lfP - 3}, ${size - lfP} ${size/2}
                Q ${size - lfP + 3} ${size - lfP + 3}, ${size/2} ${size - lfP}
                Q ${lfP - 3} ${size - lfP + 3}, ${lfP} ${size/2}
                Q ${lfP - 3} ${lfP - 3}, ${size/2} ${lfP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'nonagon': {
        // Nonagone - 9 cotes, entre octogone et cercle
        const nCx = size / 2;
        const nCy = size / 2;
        const nR = innerSize / 2 - 2;
        const nonPoints = Array.from({ length: 9 }, (_, i) => {
          const angle = (Math.PI * 2 / 9) * i - Math.PI / 2;
          return `${nCx + nR * Math.cos(angle)},${nCy + nR * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={nonPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'super-ellipse': {
        // Super ellipse - entre carre arrondi et cercle, forme Piet Hein
        const seP = 6;
        const seR = (size - seP * 2) / 2;
        const n = 4; // exposant (2=ellipse, inf=rect)
        const pts: string[] = [];
        for (let i = 0; i <= 64; i++) {
          const t = (2 * Math.PI * i) / 64;
          const cosT = Math.cos(t);
          const sinT = Math.sin(t);
          const x = size / 2 + seR * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n);
          const y = size / 2 + seR * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n);
          pts.push(`${x},${y}`);
        }
        return (
          <Polygon
            points={pts.join(' ')}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

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

// Storage keys
const PHOTO_HISTORY_KEY = '@yoroi_photo_history';
const PHOTO_TRANSFORM_KEY = '@yoroi_frame_transform';

export interface PhotoTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

// Charger / sauvegarder l'historique des photos
const loadPhotoHistory = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(PHOTO_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const savePhotoHistory = async (history: string[]) => {
  try {
    await AsyncStorage.setItem(PHOTO_HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
  } catch (e) { logger.error('Error saving photo history:', e); }
};

const addToPhotoHistory = async (uri: string): Promise<string[]> => {
  const history = await loadPhotoHistory();
  const filtered = history.filter(h => h !== uri);
  const updated = [uri, ...filtered].slice(0, 5);
  await savePhotoHistory(updated);
  return updated;
};

// Charger / sauvegarder le transform
const loadTransform = async (): Promise<PhotoTransform> => {
  try {
    const raw = await AsyncStorage.getItem(PHOTO_TRANSFORM_KEY);
    return raw ? JSON.parse(raw) : { scale: 1, translateX: 0, translateY: 0 };
  } catch { return { scale: 1, translateX: 0, translateY: 0 }; }
};

const saveTransform = async (t: PhotoTransform) => {
  try {
    await AsyncStorage.setItem(PHOTO_TRANSFORM_KEY, JSON.stringify(t));
  } catch (e) { logger.error('Error saving transform:', e); }
};

// ============================================
// CLIP PATH GENERATOR (shared between preview and FramedProfilePhoto)
// ============================================
export function generateClipPath(shape: FrameShape, s: number, pad: number = 4): string {
  const inner = s - pad * 2;

  switch (shape) {
    case 'circle': return '';
    case 'rounded-square': {
      const r = inner * 0.2;
      return `M ${pad+r},${pad} L ${pad+inner-r},${pad} Q ${pad+inner},${pad} ${pad+inner},${pad+r} L ${pad+inner},${pad+inner-r} Q ${pad+inner},${pad+inner} ${pad+inner-r},${pad+inner} L ${pad+r},${pad+inner} Q ${pad},${pad+inner} ${pad},${pad+inner-r} L ${pad},${pad+r} Q ${pad},${pad} ${pad+r},${pad} Z`;
    }
    case 'squircle': return `M ${s/2} ${pad} C ${s-pad-3} ${pad}, ${s-pad} ${pad+3}, ${s-pad} ${s/2} C ${s-pad} ${s-pad-3}, ${s-pad-3} ${s-pad}, ${s/2} ${s-pad} C ${pad+3} ${s-pad}, ${pad} ${s-pad-3}, ${pad} ${s/2} C ${pad} ${pad+3}, ${pad+3} ${pad}, ${s/2} ${pad} Z`;
    case 'hexagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts = Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
    }
    case 'octagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts = Array.from({length:8},(_,i)=>{const a=(Math.PI/4)*i-Math.PI/8;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} Z`;
    }
    case 'diamond': return `M ${s/2},${pad} L ${s-pad},${s/2} L ${s/2},${s-pad} L ${pad},${s/2} Z`;
    case 'shield': return `M ${s/2} ${pad} L ${s-pad} ${s*0.25} L ${s-pad} ${s*0.55} Q ${s-pad} ${s*0.75}, ${s/2} ${s-pad} Q ${pad} ${s*0.75}, ${pad} ${s*0.55} L ${pad} ${s*0.25} Z`;
    case 'star': {
      const cx=s/2, cy=s/2, outerR=inner/2, innerR=outerR*0.58;
      const pts = Array.from({length:10},(_,i)=>{const r=i%2===0?outerR:innerR;const a=(Math.PI/5)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} L ${pts[8]} L ${pts[9]} Z`;
    }
    case 'heart': return `M ${s/2} ${s-pad-2} C ${s*0.15} ${s*0.68}, ${pad} ${s*0.48}, ${pad} ${s*0.35} C ${pad} ${s*0.2}, ${s*0.2} ${pad+2}, ${s*0.35} ${pad+2} C ${s*0.42} ${pad+2}, ${s*0.48} ${s*0.15}, ${s/2} ${s*0.22} C ${s*0.52} ${s*0.15}, ${s*0.58} ${pad+2}, ${s*0.65} ${pad+2} C ${s*0.8} ${pad+2}, ${s-pad} ${s*0.2}, ${s-pad} ${s*0.35} C ${s-pad} ${s*0.48}, ${s*0.85} ${s*0.68}, ${s/2} ${s-pad-2} Z`;
    case 'drop': return `M ${s/2} ${pad} Q ${s-pad} ${s*0.4}, ${s-pad} ${s*0.6} C ${s-pad} ${s-pad}, ${s/2} ${s-pad}, ${s/2} ${s-pad} C ${s/2} ${s-pad}, ${pad} ${s-pad}, ${pad} ${s*0.6} Q ${pad} ${s*0.4}, ${s/2} ${pad} Z`;
    case 'arch': {
      const aR=(s-pad*2)/2;
      return `M ${pad} ${s-pad} L ${pad} ${pad+aR} A ${aR} ${aR} 0 0 1 ${s-pad} ${pad+aR} L ${s-pad} ${s-pad} Z`;
    }
    case 'pentagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts = Array.from({length:5},(_,i)=>{const a=(Math.PI*2/5)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} Z`;
    }
    case 'ovale': {
      const orx=inner/2, ory=orx*0.7;
      return `M ${s/2-orx},${s/2} A ${orx} ${ory} 0 1 1 ${s/2+orx},${s/2} A ${orx} ${ory} 0 1 1 ${s/2-orx},${s/2} Z`;
    }
    case 'plaque': {
      const cut=inner*0.2;
      return `M ${pad+cut},${pad} L ${s-pad-cut},${pad} L ${s-pad},${pad+cut} L ${s-pad},${s-pad-cut} L ${s-pad-cut},${s-pad} L ${pad+cut},${s-pad} L ${pad},${s-pad-cut} L ${pad},${pad+cut} Z`;
    }
    case 'tonneau': {
      const bulge=inner*0.12;
      return `M ${pad+8},${pad} L ${s-pad-8},${pad} Q ${s-pad},${pad} ${s-pad},${pad+8} Q ${s-pad+bulge},${s/2} ${s-pad},${s-pad-8} Q ${s-pad},${s-pad} ${s-pad-8},${s-pad} L ${pad+8},${s-pad} Q ${pad},${s-pad} ${pad},${s-pad-8} Q ${pad-bulge},${s/2} ${pad},${pad+8} Q ${pad},${pad} ${pad+8},${pad} Z`;
    }
    case 'capsule': {
      const ci=s*0.15, cr=(s-ci*2)/2;
      return `M ${ci} ${pad+cr} A ${cr} ${cr} 0 0 1 ${s-ci} ${pad+cr} L ${s-ci} ${s-pad-cr} A ${cr} ${cr} 0 0 1 ${ci} ${s-pad-cr} Z`;
    }
    case 'coquille': {
      const scR=inner/2-2, scN=10;
      let scD='';
      for(let i=0;i<scN;i++){const a1=(2*Math.PI*i/scN)-Math.PI/2;const a2=(2*Math.PI*(i+1)/scN)-Math.PI/2;const x1=s/2+scR*Math.cos(a1);const y1=s/2+scR*Math.sin(a1);const x2=s/2+scR*Math.cos(a2);const y2=s/2+scR*Math.sin(a2);const mA=(a1+a2)/2;const cpx=s/2+scR*1.18*Math.cos(mA);const cpy=s/2+scR*1.18*Math.sin(mA);if(i===0)scD+=`M ${x1},${y1} `;scD+=`Q ${cpx},${cpy} ${x2},${y2} `;}
      return scD+'Z';
    }
    case 'medaillon': {
      const mr=inner/2;
      const pts=Array.from({length:12},(_,i)=>{const a=(Math.PI*2/12)*i-Math.PI/2;return `${s/2+mr*Math.cos(a)},${s/2+mr*Math.sin(a)}`;});
      return `M ${pts[0]} ${pts.slice(1).map(pt=>`L ${pt}`).join(' ')} Z`;
    }
    case 'sceau': {
      const seOuter=inner/2, seInner=seOuter*0.88, seN=16;
      let seD='';
      for(let i=0;i<seN*2;i++){const a=(Math.PI*i/seN)-Math.PI/2;const r=i%2===0?seOuter:seInner;seD+=(i===0?`M `:`L `)+`${s/2+r*Math.cos(a)},${s/2+r*Math.sin(a)} `;}
      return seD+'Z';
    }
    case 'ticket': {
      const tkR=inner*0.08;
      return `M ${pad} ${pad} L ${s-pad} ${pad} L ${s-pad} ${s/2-tkR} A ${tkR} ${tkR} 0 0 0 ${s-pad} ${s/2+tkR} L ${s-pad} ${s-pad} L ${pad} ${s-pad} L ${pad} ${s/2+tkR} A ${tkR} ${tkR} 0 0 0 ${pad} ${s/2-tkR} Z`;
    }
    case 'stade': {
      const stI=s*0.15, stR=(s-stI*2)/2;
      return `M ${pad+stR} ${stI} L ${s-pad-stR} ${stI} A ${stR} ${stR} 0 0 1 ${s-pad-stR} ${s-stI} L ${pad+stR} ${s-stI} A ${stR} ${stR} 0 0 1 ${pad+stR} ${stI} Z`;
    }
    case 'nuage':
      return `M ${pad} ${s*0.65} Q ${pad} ${s*0.4}, ${s*0.25} ${s*0.32} Q ${s*0.3} ${s*0.15}, ${s/2} ${s*0.2} Q ${s*0.7} ${s*0.15}, ${s*0.75} ${s*0.32} Q ${s-pad} ${s*0.4}, ${s-pad} ${s*0.65} Q ${s-pad} ${s-pad}, ${s/2} ${s-pad} Q ${pad} ${s-pad}, ${pad} ${s*0.65} Z`;

    // ===== 8 NEW SHAPES =====
    case 'tv-retro': {
      const tw = inner;
      const th = inner * 0.82;
      const ty = (s - th) / 2;
      const bulge2 = tw * 0.06;
      return `M ${pad+12},${ty} L ${s-pad-12},${ty} Q ${s-pad},${ty} ${s-pad},${ty+12} Q ${s-pad+bulge2},${s/2} ${s-pad},${ty+th-12} Q ${s-pad},${ty+th} ${s-pad-12},${ty+th} L ${pad+12},${ty+th} Q ${pad},${ty+th} ${pad},${ty+th-12} Q ${pad-bulge2},${s/2} ${pad},${ty+12} Q ${pad},${ty} ${pad+12},${ty} Z`;
    }
    case 'clover': {
      // Trefle - 4 lobes arrondis
      const clR = inner * 0.27;
      const clO = inner * 0.18;
      const cx2 = s / 2;
      const cy2 = s / 2;
      // Generate path for 4 overlapping circles as a union
      // Approximate with a smooth path
      return `M ${cx2} ${cy2-clO-clR} A ${clR} ${clR} 0 1 1 ${cx2+clO} ${cy2-clO} Q ${cx2+clO+clR*0.5} ${cy2-clO-clR*0.5} ${cx2+clO+clR} ${cy2} A ${clR} ${clR} 0 1 1 ${cx2+clO} ${cy2+clO} Q ${cx2+clO+clR*0.5} ${cy2+clO+clR*0.5} ${cx2} ${cy2+clO+clR} A ${clR} ${clR} 0 1 1 ${cx2-clO} ${cy2+clO} Q ${cx2-clO-clR*0.5} ${cy2+clO+clR*0.5} ${cx2-clO-clR} ${cy2} A ${clR} ${clR} 0 1 1 ${cx2-clO} ${cy2-clO} Q ${cx2-clO-clR*0.5} ${cy2-clO-clR*0.5} ${cx2} ${cy2-clO-clR} Z`;
    }
    case 'soft-diamond': {
      return `M ${s/2} ${pad} Q ${s-pad+4} ${pad+4}, ${s-pad} ${s/2} Q ${s-pad+4} ${s-pad-4}, ${s/2} ${s-pad} Q ${pad-4} ${s-pad-4}, ${pad} ${s/2} Q ${pad-4} ${pad+4}, ${s/2} ${pad} Z`;
    }
    case 'egg': {
      const eW = inner * 0.45;
      return `M ${s/2} ${pad} C ${s/2+eW*0.85} ${pad}, ${s/2+eW} ${s*0.3}, ${s/2+eW} ${s*0.45} C ${s/2+eW} ${s*0.65}, ${s/2+eW*0.9} ${s-pad}, ${s/2} ${s-pad} C ${s/2-eW*0.9} ${s-pad}, ${s/2-eW} ${s*0.65}, ${s/2-eW} ${s*0.45} C ${s/2-eW} ${s*0.3}, ${s/2-eW*0.85} ${pad}, ${s/2} ${pad} Z`;
    }
    case 'wide-barrel': {
      const wbH = inner * 0.78;
      const wbY = (s - wbH) / 2;
      return `M ${pad+6},${wbY} L ${s-pad-6},${wbY} Q ${s-pad},${wbY} ${s-pad},${wbY+6} L ${s-pad},${wbY+wbH-6} Q ${s-pad},${wbY+wbH} ${s-pad-6},${wbY+wbH} L ${pad+6},${wbY+wbH} Q ${pad},${wbY+wbH} ${pad},${wbY+wbH-6} L ${pad},${wbY+6} Q ${pad},${wbY} ${pad+6},${wbY} Z`;
    }
    case 'leaf-wide': {
      return `M ${s/2} ${pad} Q ${s-pad+3} ${pad-3}, ${s-pad} ${s/2} Q ${s-pad+3} ${s-pad+3}, ${s/2} ${s-pad} Q ${pad-3} ${s-pad+3}, ${pad} ${s/2} Q ${pad-3} ${pad-3}, ${s/2} ${pad} Z`;
    }
    case 'nonagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts=Array.from({length:9},(_,i)=>{const a=(Math.PI*2/9)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} L ${pts[8]} Z`;
    }
    case 'super-ellipse': {
      const seR = inner / 2;
      const n = 4;
      const pts: string[] = [];
      for (let i = 0; i <= 64; i++) {
        const t = (2 * Math.PI * i) / 64;
        const cosT = Math.cos(t);
        const sinT = Math.sin(t);
        const x = s / 2 + seR * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n);
        const y = s / 2 + seR * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n);
        pts.push(`${x},${y}`);
      }
      return `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} Z`;
    }

    default: return '';
  }
}

// ============================================
// PREVIEW SIZE
// ============================================
const PREVIEW_SIZE = 160;

export default function FrameSelectionScreen() {
  const { colors, isDark } = useTheme();
  const [selectedFrame, setSelectedFrame] = useState<FrameShape>('circle');
  const [selectedAccessory, setSelectedAccessory] = useState<FrameAccessory>('none');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoHistory, setPhotoHistory] = useState<string[]>([]);
  const [transform, setTransform] = useState<PhotoTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Pan gesture - utiliser une ref pour le transform courant
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const hasPhotoRef = useRef(false);
  hasPhotoRef.current = !!photoUri;
  const panStart = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const pendingPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(FRAME_STORAGE_KEY);
      if (saved) setSelectedFrame(saved as FrameShape);

      const savedAccessory = await AsyncStorage.getItem(ACCESSORY_STORAGE_KEY);
      if (savedAccessory) setSelectedAccessory(savedAccessory as FrameAccessory);

      const profile = await getProfile();
      let history = await loadPhotoHistory();

      if (profile?.profile_photo) {
        setPhotoUri(profile.profile_photo);
        if (!history.includes(profile.profile_photo)) {
          history = [profile.profile_photo, ...history].slice(0, 5);
          await savePhotoHistory(history);
        }
      }

      setPhotoHistory(history);

      const t = await loadTransform();
      setTransform(t);
    })();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => hasPhotoRef.current,
      onStartShouldSetPanResponderCapture: () => hasPhotoRef.current,
      onMoveShouldSetPanResponder: () => hasPhotoRef.current,
      onMoveShouldSetPanResponderCapture: () => hasPhotoRef.current,
      onPanResponderGrant: () => {
        panStart.current.x = transformRef.current.translateX;
        panStart.current.y = transformRef.current.translateY;
        setScrollEnabled(false);
      },
      onPanResponderMove: (_, gesture) => {
        const curScale = transformRef.current.scale;
        const maxOffset = PREVIEW_SIZE * (curScale - 1) / 2 + 10;
        const newX = Math.max(-maxOffset, Math.min(maxOffset, panStart.current.x + gesture.dx));
        const newY = Math.max(-maxOffset, Math.min(maxOffset, panStart.current.y + gesture.dy));
        pendingPos.current = { x: newX, y: newY };
        if (!rafId.current) {
          rafId.current = requestAnimationFrame(() => {
            const pos = pendingPos.current;
            pendingPos.current = null;
            rafId.current = null;
            if (pos) {
              setTransform(prev => ({ ...prev, translateX: pos.x, translateY: pos.y }));
            }
          });
        }
      },
      onPanResponderRelease: () => {
        saveTransform(transformRef.current);
        setScrollEnabled(true);
      },
      onPanResponderTerminate: () => {
        setScrollEnabled(true);
      },
    })
  ).current;

  const handleSelectFrame = async (frameId: FrameShape) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setSelectedFrame(frameId);
    try {
      await AsyncStorage.setItem(FRAME_STORAGE_KEY, frameId);
      DeviceEventEmitter.emit(FRAME_SHAPE_CHANGED_EVENT, frameId);
    } catch (error) {
      logger.error('Error saving frame shape:', error);
    }
  };

  const handleSelectAccessory = async (accId: FrameAccessory) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSelectedAccessory(accId);
    try {
      await AsyncStorage.setItem(ACCESSORY_STORAGE_KEY, accId);
      DeviceEventEmitter.emit(FRAME_ACCESSORY_CHANGED_EVENT, accId);
    } catch (error) {
      logger.error('Error saving accessory:', error);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);

        const profile = await getProfile();
        if (profile) {
          await saveProfile({ ...profile, profile_photo: uri });
        }

        const updated = await addToPhotoHistory(uri);
        setPhotoHistory(updated);

        const resetT = { scale: 1, translateX: 0, translateY: 0 };
        setTransform(resetT);
        await saveTransform(resetT);

        impactAsync(ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      logger.error('Error picking photo:', e);
    }
  };

  const handleSelectFromHistory = async (uri: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setPhotoUri(uri);

    const profile = await getProfile();
    if (profile) {
      await saveProfile({ ...profile, profile_photo: uri });
    }

    const resetT = { scale: 1, translateX: 0, translateY: 0 };
    setTransform(resetT);
    await saveTransform(resetT);
  };

  const handleZoomIn = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setTransform(prev => {
      const newScale = Math.min(2.5, prev.scale + 0.2);
      const updated = { ...prev, scale: newScale };
      saveTransform(updated);
      return updated;
    });
  };

  const handleZoomOut = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setTransform(prev => {
      const newScale = Math.max(1, prev.scale - 0.2);
      const maxOffset = PREVIEW_SIZE * (newScale - 1) / 2;
      const updated = {
        scale: newScale,
        translateX: Math.max(-maxOffset, Math.min(maxOffset, prev.translateX)),
        translateY: Math.max(-maxOffset, Math.min(maxOffset, prev.translateY)),
      };
      saveTransform(updated);
      return updated;
    });
  };

  const handleResetTransform = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    const resetT = { scale: 1, translateX: 0, translateY: 0 };
    setTransform(resetT);
    saveTransform(resetT);
  };

  // ============================================
  // RENDER LIVE PREVIEW avec photo + accessoire
  // ============================================
  const renderLivePreview = () => {
    const s = PREVIEW_SIZE;
    const clipPath = generateClipPath(selectedFrame, s);
    const isCircle = !clipPath;
    const clipId = `preview-clip-${selectedFrame}`;
    const overflow = s * 0.25; // marge pour debordement accessoire
    const hasAcc = selectedAccessory !== 'none';

    const imageSize = s * transform.scale;
    const imageX = (s - imageSize) / 2 + transform.translateX;
    const imageY = (s - imageSize) / 2 + transform.translateY;

    // Overlay accessoire qui deborde du cadre
    const accOverlay = hasAcc ? (
      <View
        style={{
          position: 'absolute',
          top: -overflow,
          left: -overflow,
          width: s + overflow * 2,
          height: s + overflow * 2,
        }}
        pointerEvents="none"
      >
        <Svg
          width={s + overflow * 2}
          height={s + overflow * 2}
          viewBox={`${-overflow} ${-overflow} ${s + overflow * 2} ${s + overflow * 2}`}
        >
          {renderAccessorySvg(selectedAccessory, s, colors.accent)}
        </Svg>
      </View>
    ) : null;

    if (photoUri) {
      return (
        <View style={{ width: s, height: s, overflow: 'visible' }} {...panResponder.panHandlers}>
          <Svg width={s} height={s}>
            <Defs>
              <ClipPath id={clipId}>
                {isCircle ? (
                  <Circle cx={s/2} cy={s/2} r={s/2 - 4} />
                ) : (
                  <Path d={clipPath} />
                )}
              </ClipPath>
            </Defs>
            <SvgImage
              key={photoUri}
              href={{ uri: photoUri }}
              x={imageX}
              y={imageY}
              width={imageSize}
              height={imageSize}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
            {/* Bordure */}
            {isCircle ? (
              <Circle cx={s/2} cy={s/2} r={s/2 - 4} fill="none" stroke={colors.accent} strokeWidth={3} />
            ) : (
              <Path d={clipPath} fill="none" stroke={colors.accent} strokeWidth={3} />
            )}
          </Svg>
          {accOverlay}
        </View>
      );
    }

    // Pas de photo - forme vide + accessoire
    return (
      <View style={{ width: s, height: s, overflow: 'visible' }}>
        <FrameShapePreview
          shape={selectedFrame}
          size={s}
          color={colors.accent}
          fillColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
          isSelected={true}
        />
        {accOverlay}
      </View>
    );
  };

  // Memoize la grille pour eviter de re-render 30 cartes pendant le drag photo
  const framesGrid = useMemo(() => (
    <>
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
    </>
  ), [selectedFrame, colors, isDark]);

  // Memoize la grille des accessoires
  const accessoriesGrid = useMemo(() => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: SPACING.xl }]}>
        Accessoires
      </Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
        Ajoute un ornement sur le bord de ta photo
      </Text>
      <View style={styles.accessoryRow}>
        {ACCESSORY_OPTIONS.map((acc) => {
          const isSelected = selectedAccessory === acc.id;
          return (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.accessoryCard,
                { backgroundColor: colors.backgroundCard },
                isSelected && { borderColor: colors.accent, borderWidth: 2 },
              ]}
              onPress={() => handleSelectAccessory(acc.id)}
              activeOpacity={0.7}
            >
              <AccessoryPreview
                accessory={acc.id}
                size={40}
                accentColor={isSelected ? colors.accent : colors.textMuted}
                bgColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}
                isSelected={isSelected}
              />
              <Text
                style={[
                  styles.accessoryName,
                  { color: isSelected ? colors.accent : colors.textPrimary }
                ]}
                numberOfLines={1}
              >
                {acc.name}
              </Text>
              {isSelected && (
                <View style={[styles.accessoryCheck, { backgroundColor: colors.accent }]}>
                  <Check size={10} color={colors.textOnAccent} strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  ), [selectedAccessory, colors, isDark]);

  return (
    <ScreenWrapper>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
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
            Choisis la forme et positionne ta photo
          </Text>
        </View>

        {/* Preview avec vraie photo */}
        <View style={[styles.previewContainer, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>
            Apercu
          </Text>
          <View style={styles.previewFrame}>
            {renderLivePreview()}
          </View>

          {/* Nom de la forme */}
          <Text style={[styles.previewName, { color: colors.textPrimary }]}>
            {FRAME_OPTIONS.find(f => f.id === selectedFrame)?.name}
            {selectedAccessory !== 'none' ? ` + ${ACCESSORY_OPTIONS.find(a => a.id === selectedAccessory)?.name}` : ''}
          </Text>

          {/* Controles de positionnement */}
          {photoUri && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={handleZoomOut}
              >
                <ZoomIn size={16} color={colors.textMuted} style={{ transform: [{ scaleX: -1 }] }} />
                <Text style={[styles.controlLabel, { color: colors.textMuted }]}>-</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={handleResetTransform}
              >
                <RotateCcw size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={handleZoomIn}
              >
                <ZoomIn size={16} color={colors.textMuted} />
                <Text style={[styles.controlLabel, { color: colors.textMuted }]}>+</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bouton changer photo */}
          <TouchableOpacity
            style={[styles.changePhotoBtn, { backgroundColor: colors.accent + '15' }]}
            onPress={handlePickPhoto}
            activeOpacity={0.7}
          >
            <ImagePlus size={16} color={colors.accent} />
            <Text style={[styles.changePhotoText, { color: colors.accent }]}>
              {photoUri ? 'Changer la photo' : 'Choisir une photo'}
            </Text>
          </TouchableOpacity>

          {/* Hint pour le drag */}
          {photoUri && (
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              Glisse pour repositionner ta photo
            </Text>
          )}
        </View>

        {/* Historique des photos */}
        {photoHistory.length >= 1 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Photos recentes
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
              {photoHistory.map((uri, index) => (
                <TouchableOpacity
                  key={`${uri}-${index}`}
                  style={[
                    styles.historyThumb,
                    { borderColor: uri === photoUri ? colors.accent : colors.border },
                    uri === photoUri && { borderWidth: 2.5 },
                  ]}
                  onPress={() => handleSelectFromHistory(uri)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri }} style={styles.historyImg} />
                  {uri === photoUri && (
                    <View style={[styles.historyCheck, { backgroundColor: colors.accent }]}>
                      <Check size={10} color={colors.textOnAccent} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Accessoires decoratifs */}
        {accessoriesGrid}

        {/* Grid of frames - memoize pour ne pas re-render pendant le drag */}
        {framesGrid}

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
    overflow: 'visible',
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
    overflow: 'visible',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Controles zoom
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Bouton changer photo
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },

  // Historique photos
  historySection: {
    marginBottom: SPACING.xl,
  },
  historyScroll: {
    flexDirection: 'row',
  },
  historyThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1.5,
    position: 'relative',
  },
  historyImg: {
    width: '100%',
    height: '100%',
  },
  historyCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: SPACING.md,
    marginTop: -6,
  },

  // Accessoires
  accessoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  accessoryCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 3) / 4,
    aspectRatio: 0.9,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xs,
    position: 'relative',
  },
  accessoryName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  accessoryCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
