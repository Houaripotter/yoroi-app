// ============================================
// YOROI - SELECTION DES CADRES PHOTO
// 12 formes pour photo de profil + positionnement
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
import Svg, { Path, Circle, Rect, Polygon, Defs, ClipPath, Image as SvgImage } from 'react-native-svg';
import { getProfile, saveProfile } from '@/lib/database';
import { logger } from '@/lib/security/logger';

export const FRAME_SHAPE_CHANGED_EVENT = 'FRAME_SHAPE_CHANGED';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2) / 3;

export const FRAME_STORAGE_KEY = '@yoroi_frame_shape';

// Definition des 18 formes disponibles
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
  | 'blob'
  | 'arch'
  | 'pentagon'
  | 'ovale'
  | 'oeuf'
  | 'tv'
  | 'plaque'
  | 'tonneau'
  | 'capsule'
  | 'coquille'
  | 'trapeze'
  | 'ogive'
  | 'marquise'
  | 'medaillon'
  | 'losange-arrondi'
  | 'sceau'
  | 'ticket'
  | 'cloche'
  | 'stade'
  | 'coussin';

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
  { id: 'drop', name: 'Goutte' },
  { id: 'blob', name: 'Blob' },
  { id: 'arch', name: 'Arche' },
  { id: 'pentagon', name: 'Pentagone' },
  { id: 'ovale', name: 'Ovale' },
  { id: 'oeuf', name: 'Oeuf' },
  { id: 'tv', name: 'TV Retro' },
  { id: 'plaque', name: 'Plaque' },
  { id: 'tonneau', name: 'Tonneau' },
  { id: 'capsule', name: 'Capsule' },
  { id: 'coquille', name: 'Coquille' },
  { id: 'trapeze', name: 'Trapeze' },
  { id: 'ogive', name: 'Ogive' },
  { id: 'marquise', name: 'Marquise' },
  { id: 'medaillon', name: 'Medaillon' },
  { id: 'losange-arrondi', name: 'Losange arrondi' },
  { id: 'sceau', name: 'Sceau' },
  { id: 'ticket', name: 'Ticket' },
  { id: 'cloche', name: 'Cloche' },
  { id: 'stade', name: 'Stade' },
  { id: 'coussin', name: 'Coussin' },
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

      case 'star': {
        // Etoile epaisse style badge - beaucoup plus remplie
        const sx = size / 2;
        const sy = size / 2;
        const outerR = innerSize / 2 - 2;
        const innerR = outerR * 0.58; // Plus epais = plus rempli
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
        // Coeur bien proportionne et arrondi
        const s = size;
        const p = 5;
        return (
          <Path
            d={`M ${s/2} ${s - p - 2}
                C ${s * 0.15} ${s * 0.68}, ${p} ${s * 0.48}, ${p} ${s * 0.35}
                C ${p} ${s * 0.2}, ${s * 0.2} ${p + 2}, ${s * 0.35} ${p + 2}
                C ${s * 0.42} ${p + 2}, ${s * 0.48} ${s * 0.15}, ${s/2} ${s * 0.22}
                C ${s * 0.52} ${s * 0.15}, ${s * 0.58} ${p + 2}, ${s * 0.65} ${p + 2}
                C ${s * 0.8} ${p + 2}, ${s - p} ${s * 0.2}, ${s - p} ${s * 0.35}
                C ${s - p} ${s * 0.48}, ${s * 0.85} ${s * 0.68}, ${s/2} ${s - p - 2}
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
        // Arche - demi-cercle en haut, cotes droits, bas plat
        const ap = 5;
        const aR = (size - ap * 2) / 2; // rayon du demi-cercle
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
        // Ovale horizontal - ellipse plus large que haute
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

      case 'oeuf': {
        // Forme oeuf - plus large en bas, plus etroit en haut
        const ep = 5;
        return (
          <Path
            d={`M ${size/2} ${ep}
                C ${size * 0.72} ${ep}, ${size - ep} ${size * 0.3}, ${size - ep} ${size * 0.55}
                C ${size - ep} ${size * 0.82}, ${size * 0.72} ${size - ep}, ${size/2} ${size - ep}
                C ${size * 0.28} ${size - ep}, ${ep} ${size * 0.82}, ${ep} ${size * 0.55}
                C ${ep} ${size * 0.3}, ${size * 0.28} ${ep}, ${size/2} ${ep}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'tv': {
        const tp = 6;
        const tw = size - tp * 2;
        const th = size - tp * 2;
        const tbr = tw * 0.22;
        return (
          <Rect
            x={tp}
            y={tp}
            width={tw}
            height={th}
            rx={tbr}
            ry={tbr}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'plaque': {
        // Rectangle avec coins coupes a 45 degres
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
        // Tonneau - rectangle avec cotes convexes (gonfles)
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
        // Capsule verticale - forme pilule
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
        // Coquille - cercle festonne avec 10 ondulations
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

      case 'trapeze': {
        // Trapeze arrondi - plus large en bas
        const trP = 6;
        const trInset = (size - trP * 2) * 0.14;
        return (
          <Polygon
            points={`${trP + trInset},${trP} ${size - trP - trInset},${trP} ${size - trP},${size - trP} ${trP},${size - trP}`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'ogive': {
        // Ogive - arche gothique pointue en haut
        const ogP = 5;
        const ogArcR = (size - ogP * 2) * 0.9;
        return (
          <Path
            d={`M ${ogP} ${size - ogP}
                L ${ogP} ${size * 0.45}
                A ${ogArcR} ${ogArcR} 0 0 1 ${size / 2} ${ogP}
                A ${ogArcR} ${ogArcR} 0 0 1 ${size - ogP} ${size * 0.45}
                L ${size - ogP} ${size - ogP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'marquise': {
        // Marquise - forme d'oeil/amande
        const mP = 5;
        return (
          <Path
            d={`M ${size / 2} ${mP}
                C ${size * 0.85} ${size * 0.25}, ${size * 0.85} ${size * 0.75}, ${size / 2} ${size - mP}
                C ${size * 0.15} ${size * 0.75}, ${size * 0.15} ${size * 0.25}, ${size / 2} ${mP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'medaillon': {
        // Medaillon - dodecagone (12 cotes) arrondi
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

      case 'losange-arrondi': {
        // Losange avec cotes courbes convexes
        const lp = 5;
        return (
          <Path
            d={`M ${size/2} ${lp}
                Q ${size * 0.78} ${size * 0.22}, ${size - lp} ${size/2}
                Q ${size * 0.78} ${size * 0.78}, ${size/2} ${size - lp}
                Q ${size * 0.22} ${size * 0.78}, ${lp} ${size/2}
                Q ${size * 0.22} ${size * 0.22}, ${size/2} ${lp}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'sceau': {
        // Sceau - cercle avec bord crante style cachet de cire
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
        // Rectangle avec encoches semi-circulaires sur les cotes
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

      case 'cloche': {
        // Cloche - dome en haut, evasee en bas
        const clP = 5;
        return (
          <Path
            d={`M ${clP} ${size - clP}
                C ${clP} ${size * 0.55}, ${clP} ${size * 0.35}, ${size * 0.25} ${size * 0.2}
                Q ${size/2} ${clP}, ${size * 0.75} ${size * 0.2}
                C ${size - clP} ${size * 0.35}, ${size - clP} ${size * 0.55}, ${size - clP} ${size - clP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'stade': {
        // Stade - pilule horizontale (plus large que haute)
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

      case 'coussin': {
        // Coussin - carre avec cotes legerement concaves
        const coP = 5;
        const coInset = (size - coP * 2) * 0.08;
        return (
          <Path
            d={`M ${coP + 8} ${coP}
                L ${size - coP - 8} ${coP}
                Q ${size - coP} ${coP}, ${size - coP} ${coP + 8}
                Q ${size - coP + coInset} ${size * 0.35}, ${size - coP + coInset} ${size/2}
                Q ${size - coP + coInset} ${size * 0.65}, ${size - coP} ${size - coP - 8}
                Q ${size - coP} ${size - coP}, ${size - coP - 8} ${size - coP}
                L ${coP + 8} ${size - coP}
                Q ${coP} ${size - coP}, ${coP} ${size - coP - 8}
                Q ${coP - coInset} ${size * 0.65}, ${coP - coInset} ${size/2}
                Q ${coP - coInset} ${size * 0.35}, ${coP} ${coP + 8}
                Q ${coP} ${coP}, ${coP + 8} ${coP}
                Z`}
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
// PREVIEW SIZE
// ============================================
const PREVIEW_SIZE = 160;

export default function FrameSelectionScreen() {
  const { colors, isDark } = useTheme();
  const [selectedFrame, setSelectedFrame] = useState<FrameShape>('circle');
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

      const profile = await getProfile();
      let history = await loadPhotoHistory();

      if (profile?.profile_photo) {
        setPhotoUri(profile.profile_photo);
        // Ajouter la photo actuelle a l'historique si pas deja dedans
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
            if (pendingPos.current) {
              setTransform(prev => ({ ...prev, translateX: pendingPos.current!.x, translateY: pendingPos.current!.y }));
              pendingPos.current = null;
            }
            rafId.current = null;
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

        // Sauvegarder comme photo de profil
        const profile = await getProfile();
        if (profile) {
          await saveProfile({ ...profile, profile_photo: uri });
        }

        // Ajouter a l'historique
        const updated = await addToPhotoHistory(uri);
        setPhotoHistory(updated);

        // Reset transform
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
      // Recentrer si necessaire
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
  // RENDER LIVE PREVIEW avec photo
  // ============================================
  const renderLivePreview = () => {
    const s = PREVIEW_SIZE;
    const getPreviewClipPath = (shape: FrameShape, sz: number): string => {
      const p = 4;
      const inner = sz - p * 2;
      switch (shape) {
        case 'circle': return '';
        case 'rounded-square': {
          const r = inner * 0.2;
          return `M ${p+r},${p} L ${p+inner-r},${p} Q ${p+inner},${p} ${p+inner},${p+r} L ${p+inner},${p+inner-r} Q ${p+inner},${p+inner} ${p+inner-r},${p+inner} L ${p+r},${p+inner} Q ${p},${p+inner} ${p},${p+inner-r} L ${p},${p+r} Q ${p},${p} ${p+r},${p} Z`;
        }
        case 'squircle': return `M ${sz/2} ${p} C ${sz-p-3} ${p}, ${sz-p} ${p+3}, ${sz-p} ${sz/2} C ${sz-p} ${sz-p-3}, ${sz-p-3} ${sz-p}, ${sz/2} ${sz-p} C ${p+3} ${sz-p}, ${p} ${sz-p-3}, ${p} ${sz/2} C ${p} ${p+3}, ${p+3} ${p}, ${sz/2} ${p} Z`;
        case 'hexagon': {
          const cx=sz/2, cy=sz/2, r=inner/2;
          const pts = Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
          return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
        }
        case 'octagon': {
          const cx=sz/2, cy=sz/2, r=inner/2;
          const pts = Array.from({length:8},(_,i)=>{const a=(Math.PI/4)*i-Math.PI/8;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
          return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} Z`;
        }
        case 'diamond': return `M ${sz/2},${p} L ${sz-p},${sz/2} L ${sz/2},${sz-p} L ${p},${sz/2} Z`;
        case 'shield': return `M ${sz/2} ${p} L ${sz-p} ${sz*0.25} L ${sz-p} ${sz*0.55} Q ${sz-p} ${sz*0.75}, ${sz/2} ${sz-p} Q ${p} ${sz*0.75}, ${p} ${sz*0.55} L ${p} ${sz*0.25} Z`;
        case 'star': {
          const cx=sz/2, cy=sz/2, outerR=inner/2, innerR=outerR*0.58;
          const pts = Array.from({length:10},(_,i)=>{const r=i%2===0?outerR:innerR;const a=(Math.PI/5)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
          return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} L ${pts[8]} L ${pts[9]} Z`;
        }
        case 'heart': return `M ${sz/2} ${sz-p-2} C ${sz*0.15} ${sz*0.68}, ${p} ${sz*0.48}, ${p} ${sz*0.35} C ${p} ${sz*0.2}, ${sz*0.2} ${p+2}, ${sz*0.35} ${p+2} C ${sz*0.42} ${p+2}, ${sz*0.48} ${sz*0.15}, ${sz/2} ${sz*0.22} C ${sz*0.52} ${sz*0.15}, ${sz*0.58} ${p+2}, ${sz*0.65} ${p+2} C ${sz*0.8} ${p+2}, ${sz-p} ${sz*0.2}, ${sz-p} ${sz*0.35} C ${sz-p} ${sz*0.48}, ${sz*0.85} ${sz*0.68}, ${sz/2} ${sz-p-2} Z`;
        case 'drop': return `M ${sz/2} ${p} Q ${sz-p} ${sz*0.4}, ${sz-p} ${sz*0.6} C ${sz-p} ${sz-p}, ${sz/2} ${sz-p}, ${sz/2} ${sz-p} C ${sz/2} ${sz-p}, ${p} ${sz-p}, ${p} ${sz*0.6} Q ${p} ${sz*0.4}, ${sz/2} ${p} Z`;
        case 'blob': return `M ${sz*0.5} ${sz*0.1} C ${sz*0.8} ${sz*0.05}, ${sz*0.95} ${sz*0.3}, ${sz*0.9} ${sz*0.5} C ${sz*0.95} ${sz*0.75}, ${sz*0.7} ${sz*0.95}, ${sz*0.5} ${sz*0.9} C ${sz*0.25} ${sz*0.95}, ${sz*0.05} ${sz*0.7}, ${sz*0.1} ${sz*0.5} C ${sz*0.05} ${sz*0.25}, ${sz*0.25} ${sz*0.05}, ${sz*0.5} ${sz*0.1} Z`;
        case 'arch': {
          const aR=(sz-p*2)/2;
          return `M ${p} ${sz-p} L ${p} ${p+aR} A ${aR} ${aR} 0 0 1 ${sz-p} ${p+aR} L ${sz-p} ${sz-p} Z`;
        }
        case 'pentagon': {
          const cx=sz/2, cy=sz/2, r=inner/2;
          const pts = Array.from({length:5},(_,i)=>{const a=(Math.PI*2/5)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
          return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} Z`;
        }
        case 'ovale': {
          const orx=inner/2, ory=orx*0.7;
          return `M ${sz/2-orx},${sz/2} A ${orx} ${ory} 0 1 1 ${sz/2+orx},${sz/2} A ${orx} ${ory} 0 1 1 ${sz/2-orx},${sz/2} Z`;
        }
        case 'oeuf':
          return `M ${sz/2} ${p} C ${sz*0.72} ${p}, ${sz-p} ${sz*0.3}, ${sz-p} ${sz*0.55} C ${sz-p} ${sz*0.82}, ${sz*0.72} ${sz-p}, ${sz/2} ${sz-p} C ${sz*0.28} ${sz-p}, ${p} ${sz*0.82}, ${p} ${sz*0.55} C ${p} ${sz*0.3}, ${sz*0.28} ${p}, ${sz/2} ${p} Z`;
        case 'tv': {
          const tw=sz-p*2, tbr=tw*0.22;
          return `M ${p+tbr},${p} L ${sz-p-tbr},${p} Q ${sz-p},${p} ${sz-p},${p+tbr} L ${sz-p},${sz-p-tbr} Q ${sz-p},${sz-p} ${sz-p-tbr},${sz-p} L ${p+tbr},${sz-p} Q ${p},${sz-p} ${p},${sz-p-tbr} L ${p},${p+tbr} Q ${p},${p} ${p+tbr},${p} Z`;
        }
        case 'plaque': {
          const cut=inner*0.2;
          return `M ${p+cut},${p} L ${sz-p-cut},${p} L ${sz-p},${p+cut} L ${sz-p},${sz-p-cut} L ${sz-p-cut},${sz-p} L ${p+cut},${sz-p} L ${p},${sz-p-cut} L ${p},${p+cut} Z`;
        }
        case 'tonneau': {
          const bulge=inner*0.12;
          return `M ${p+8},${p} L ${sz-p-8},${p} Q ${sz-p},${p} ${sz-p},${p+8} Q ${sz-p+bulge},${sz/2} ${sz-p},${sz-p-8} Q ${sz-p},${sz-p} ${sz-p-8},${sz-p} L ${p+8},${sz-p} Q ${p},${sz-p} ${p},${sz-p-8} Q ${p-bulge},${sz/2} ${p},${p+8} Q ${p},${p} ${p+8},${p} Z`;
        }
        case 'capsule': {
          const ci=sz*0.15, cr=(sz-ci*2)/2;
          return `M ${ci} ${p+cr} A ${cr} ${cr} 0 0 1 ${sz-ci} ${p+cr} L ${sz-ci} ${sz-p-cr} A ${cr} ${cr} 0 0 1 ${ci} ${sz-p-cr} Z`;
        }
        case 'coquille': {
          const scR=inner/2-2, scN=10;
          let scD='';
          for(let i=0;i<scN;i++){const a1=(2*Math.PI*i/scN)-Math.PI/2;const a2=(2*Math.PI*(i+1)/scN)-Math.PI/2;const x1=sz/2+scR*Math.cos(a1);const y1=sz/2+scR*Math.sin(a1);const x2=sz/2+scR*Math.cos(a2);const y2=sz/2+scR*Math.sin(a2);const mA=(a1+a2)/2;const cpx=sz/2+scR*1.18*Math.cos(mA);const cpy=sz/2+scR*1.18*Math.sin(mA);if(i===0)scD+=`M ${x1},${y1} `;scD+=`Q ${cpx},${cpy} ${x2},${y2} `;}
          return scD+'Z';
        }
        case 'trapeze': {
          const ti=inner*0.14;
          return `M ${p+ti},${p} L ${sz-p-ti},${p} L ${sz-p},${sz-p} L ${p},${sz-p} Z`;
        }
        case 'ogive': {
          const oR=inner*0.9;
          return `M ${p} ${sz-p} L ${p} ${sz*0.45} A ${oR} ${oR} 0 0 1 ${sz/2} ${p} A ${oR} ${oR} 0 0 1 ${sz-p} ${sz*0.45} L ${sz-p} ${sz-p} Z`;
        }
        case 'marquise':
          return `M ${sz/2} ${p} C ${sz*0.85} ${sz*0.25}, ${sz*0.85} ${sz*0.75}, ${sz/2} ${sz-p} C ${sz*0.15} ${sz*0.75}, ${sz*0.15} ${sz*0.25}, ${sz/2} ${p} Z`;
        case 'medaillon': {
          const mr=inner/2;
          const pts=Array.from({length:12},(_,i)=>{const a=(Math.PI*2/12)*i-Math.PI/2;return `${sz/2+mr*Math.cos(a)},${sz/2+mr*Math.sin(a)}`;});
          return `M ${pts[0]} ${pts.slice(1).map(pt=>`L ${pt}`).join(' ')} Z`;
        }
        case 'losange-arrondi':
          return `M ${sz/2} ${p} Q ${sz*0.78} ${sz*0.22}, ${sz-p} ${sz/2} Q ${sz*0.78} ${sz*0.78}, ${sz/2} ${sz-p} Q ${sz*0.22} ${sz*0.78}, ${p} ${sz/2} Q ${sz*0.22} ${sz*0.22}, ${sz/2} ${p} Z`;
        case 'sceau': {
          const seOuter=inner/2, seInner=seOuter*0.88, seN=16;
          let seD='';
          for(let i=0;i<seN*2;i++){const a=(Math.PI*i/seN)-Math.PI/2;const r=i%2===0?seOuter:seInner;seD+=(i===0?`M `:`L `)+`${sz/2+r*Math.cos(a)},${sz/2+r*Math.sin(a)} `;}
          return seD+'Z';
        }
        case 'ticket': {
          const tkR=inner*0.08;
          return `M ${p} ${p} L ${sz-p} ${p} L ${sz-p} ${sz/2-tkR} A ${tkR} ${tkR} 0 0 0 ${sz-p} ${sz/2+tkR} L ${sz-p} ${sz-p} L ${p} ${sz-p} L ${p} ${sz/2+tkR} A ${tkR} ${tkR} 0 0 0 ${p} ${sz/2-tkR} Z`;
        }
        case 'cloche':
          return `M ${p} ${sz-p} C ${p} ${sz*0.55}, ${p} ${sz*0.35}, ${sz*0.25} ${sz*0.2} Q ${sz/2} ${p}, ${sz*0.75} ${sz*0.2} C ${sz-p} ${sz*0.35}, ${sz-p} ${sz*0.55}, ${sz-p} ${sz-p} Z`;
        case 'stade': {
          const stI=sz*0.15, stR=(sz-stI*2)/2;
          return `M ${p+stR} ${stI} L ${sz-p-stR} ${stI} A ${stR} ${stR} 0 0 1 ${sz-p-stR} ${sz-stI} L ${p+stR} ${sz-stI} A ${stR} ${stR} 0 0 1 ${p+stR} ${stI} Z`;
        }
        case 'coussin': {
          const coI=inner*0.08;
          return `M ${p+8} ${p} L ${sz-p-8} ${p} Q ${sz-p} ${p} ${sz-p} ${p+8} Q ${sz-p+coI} ${sz*0.35}, ${sz-p+coI} ${sz/2} Q ${sz-p+coI} ${sz*0.65}, ${sz-p} ${sz-p-8} Q ${sz-p} ${sz-p} ${sz-p-8} ${sz-p} L ${p+8} ${sz-p} Q ${p} ${sz-p} ${p} ${sz-p-8} Q ${p-coI} ${sz*0.65}, ${p-coI} ${sz/2} Q ${p-coI} ${sz*0.35}, ${p} ${p+8} Q ${p} ${p} ${p+8} ${p} Z`;
        }
        default: return '';
      }
    };

    const clipPath = getPreviewClipPath(selectedFrame, s);
    const isCircle = !clipPath;
    const clipId = `preview-clip-${selectedFrame}`;

    const imageSize = s * transform.scale;
    const imageX = (s - imageSize) / 2 + transform.translateX;
    const imageY = (s - imageSize) / 2 + transform.translateY;

    if (photoUri) {
      return (
        <View style={{ width: s, height: s }} {...panResponder.panHandlers}>
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
        </View>
      );
    }

    // Pas de photo - forme vide
    return (
      <FrameShapePreview
        shape={selectedFrame}
        size={s}
        color={colors.accent}
        fillColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
        isSelected={true}
      />
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
