// ============================================
// FRAMED PROFILE PHOTO - Applique la forme selectionnee
// Utilise le cadre choisi dans frame-selection
// ============================================

import React, { useState, useEffect, memo } from 'react';
import { View, Image, StyleSheet, DeviceEventEmitter } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon, Defs, ClipPath, Image as SvgImage } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FRAME_STORAGE_KEY, FRAME_SHAPE_CHANGED_EVENT, type FrameShape, type PhotoTransform } from '@/app/frame-selection';
import { useTheme } from '@/lib/ThemeContext';

const PHOTO_TRANSFORM_KEY = '@yoroi_frame_transform';

interface FramedProfilePhotoProps {
  uri?: string | null;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  placeholderIconSize?: number;
}

// Genere le clipPath SVG pour chaque forme
function getClipPath(shape: FrameShape, s: number): string {
  const pad = 2;
  const inner = s - pad * 2;

  switch (shape) {
    case 'circle':
      // Pas de path, on utilise <Circle> directement
      return '';

    case 'rounded-square': {
      const r = inner * 0.2;
      return `M ${pad + r},${pad} L ${pad + inner - r},${pad} Q ${pad + inner},${pad} ${pad + inner},${pad + r} L ${pad + inner},${pad + inner - r} Q ${pad + inner},${pad + inner} ${pad + inner - r},${pad + inner} L ${pad + r},${pad + inner} Q ${pad},${pad + inner} ${pad},${pad + inner - r} L ${pad},${pad + r} Q ${pad},${pad} ${pad + r},${pad} Z`;
    }

    case 'squircle':
      return `M ${s / 2} ${pad} C ${s - pad - 3} ${pad}, ${s - pad} ${pad + 3}, ${s - pad} ${s / 2} C ${s - pad} ${s - pad - 3}, ${s - pad - 3} ${s - pad}, ${s / 2} ${s - pad} C ${pad + 3} ${s - pad}, ${pad} ${s - pad - 3}, ${pad} ${s / 2} C ${pad} ${pad + 3}, ${pad + 3} ${pad}, ${s / 2} ${pad} Z`;

    case 'hexagon': {
      const cx = s / 2;
      const cy = s / 2;
      const r = inner / 2;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      });
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
    }

    case 'octagon': {
      const cx = s / 2;
      const cy = s / 2;
      const r = inner / 2;
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i - Math.PI / 8;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      });
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} Z`;
    }

    case 'diamond':
      return `M ${s / 2},${pad} L ${s - pad},${s / 2} L ${s / 2},${s - pad} L ${pad},${s / 2} Z`;

    case 'shield':
      return `M ${s / 2} ${pad} L ${s - pad} ${s * 0.25} L ${s - pad} ${s * 0.55} Q ${s - pad} ${s * 0.75}, ${s / 2} ${s - pad} Q ${pad} ${s * 0.75}, ${pad} ${s * 0.55} L ${pad} ${s * 0.25} Z`;

    case 'star': {
      // Etoile epaisse style badge
      const cx = s / 2;
      const cy = s / 2;
      const outerR = inner / 2;
      const innerR = outerR * 0.58;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      });
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} L ${pts[8]} L ${pts[9]} Z`;
    }

    case 'heart':
      // Coeur bien proportionne et arrondi
      return `M ${s/2} ${s - pad - 2} C ${s * 0.15} ${s * 0.68}, ${pad} ${s * 0.48}, ${pad} ${s * 0.35} C ${pad} ${s * 0.2}, ${s * 0.2} ${pad + 2}, ${s * 0.35} ${pad + 2} C ${s * 0.42} ${pad + 2}, ${s * 0.48} ${s * 0.15}, ${s/2} ${s * 0.22} C ${s * 0.52} ${s * 0.15}, ${s * 0.58} ${pad + 2}, ${s * 0.65} ${pad + 2} C ${s * 0.8} ${pad + 2}, ${s - pad} ${s * 0.2}, ${s - pad} ${s * 0.35} C ${s - pad} ${s * 0.48}, ${s * 0.85} ${s * 0.68}, ${s/2} ${s - pad - 2} Z`;

    case 'drop':
      return `M ${s / 2} ${pad} Q ${s - pad} ${s * 0.4}, ${s - pad} ${s * 0.6} C ${s - pad} ${s - pad}, ${s / 2} ${s - pad}, ${s / 2} ${s - pad} C ${s / 2} ${s - pad}, ${pad} ${s - pad}, ${pad} ${s * 0.6} Q ${pad} ${s * 0.4}, ${s / 2} ${pad} Z`;

    case 'arch': {
      // Arche - demi-cercle en haut, cotes droits, bas plat
      const aR = (s - pad * 2) / 2;
      return `M ${pad} ${s - pad} L ${pad} ${pad + aR} A ${aR} ${aR} 0 0 1 ${s - pad} ${pad + aR} L ${s - pad} ${s - pad} Z`;
    }

    case 'blob':
      return `M ${s * 0.5} ${s * 0.1} C ${s * 0.8} ${s * 0.05}, ${s * 0.95} ${s * 0.3}, ${s * 0.9} ${s * 0.5} C ${s * 0.95} ${s * 0.75}, ${s * 0.7} ${s * 0.95}, ${s * 0.5} ${s * 0.9} C ${s * 0.25} ${s * 0.95}, ${s * 0.05} ${s * 0.7}, ${s * 0.1} ${s * 0.5} C ${s * 0.05} ${s * 0.25}, ${s * 0.25} ${s * 0.05}, ${s * 0.5} ${s * 0.1} Z`;

    case 'pentagon': {
      const cx = s / 2;
      const cy = s / 2;
      const r = inner / 2;
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      });
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} Z`;
    }

    case 'ovale': {
      const orx = inner / 2;
      const ory = orx * 0.7;
      return `M ${s/2 - orx},${s/2} A ${orx} ${ory} 0 1 1 ${s/2 + orx},${s/2} A ${orx} ${ory} 0 1 1 ${s/2 - orx},${s/2} Z`;
    }

    case 'oeuf':
      return `M ${s/2} ${pad} C ${s*0.72} ${pad}, ${s-pad} ${s*0.3}, ${s-pad} ${s*0.55} C ${s-pad} ${s*0.82}, ${s*0.72} ${s-pad}, ${s/2} ${s-pad} C ${s*0.28} ${s-pad}, ${pad} ${s*0.82}, ${pad} ${s*0.55} C ${pad} ${s*0.3}, ${s*0.28} ${pad}, ${s/2} ${pad} Z`;

    case 'tv': {
      const tw = s - pad * 2;
      const tbr = tw * 0.22;
      return `M ${pad+tbr},${pad} L ${s-pad-tbr},${pad} Q ${s-pad},${pad} ${s-pad},${pad+tbr} L ${s-pad},${s-pad-tbr} Q ${s-pad},${s-pad} ${s-pad-tbr},${s-pad} L ${pad+tbr},${s-pad} Q ${pad},${s-pad} ${pad},${s-pad-tbr} L ${pad},${pad+tbr} Q ${pad},${pad} ${pad+tbr},${pad} Z`;
    }

    case 'plaque': {
      const cut = inner * 0.2;
      return `M ${pad+cut},${pad} L ${s-pad-cut},${pad} L ${s-pad},${pad+cut} L ${s-pad},${s-pad-cut} L ${s-pad-cut},${s-pad} L ${pad+cut},${s-pad} L ${pad},${s-pad-cut} L ${pad},${pad+cut} Z`;
    }

    case 'tonneau': {
      const bulge = inner * 0.12;
      return `M ${pad+8},${pad} L ${s-pad-8},${pad} Q ${s-pad},${pad} ${s-pad},${pad+8} Q ${s-pad+bulge},${s/2} ${s-pad},${s-pad-8} Q ${s-pad},${s-pad} ${s-pad-8},${s-pad} L ${pad+8},${s-pad} Q ${pad},${s-pad} ${pad},${s-pad-8} Q ${pad-bulge},${s/2} ${pad},${pad+8} Q ${pad},${pad} ${pad+8},${pad} Z`;
    }

    default:
      return '';
  }
}

const FramedProfilePhoto: React.FC<FramedProfilePhotoProps> = memo(({
  uri,
  size,
  borderColor = '#FFFFFF',
  borderWidth: bw = 2.5,
  placeholderIconSize = 34,
}) => {
  const { isDark, colors } = useTheme();
  const [frameShape, setFrameShape] = useState<FrameShape>('circle');
  const [transform, setTransform] = useState<PhotoTransform>({ scale: 1, translateX: 0, translateY: 0 });

  useEffect(() => {
    AsyncStorage.getItem(FRAME_STORAGE_KEY).then(saved => {
      if (saved) setFrameShape(saved as FrameShape);
    });
    AsyncStorage.getItem(PHOTO_TRANSFORM_KEY).then(raw => {
      if (raw) {
        try { setTransform(JSON.parse(raw)); } catch {}
      }
    });

    const sub = DeviceEventEmitter.addListener(FRAME_SHAPE_CHANGED_EVENT, (shape: FrameShape) => {
      setFrameShape(shape);
    });
    return () => sub.remove();
  }, []);

  // Adapter le transform a la taille du composant (sauvegarde a 160px)
  const ratio = size / 160;
  const imgSize = size * transform.scale;
  const imgX = (size - imgSize) / 2 + transform.translateX * ratio;
  const imgY = (size - imgSize) / 2 + transform.translateY * ratio;

  const clipPath = getClipPath(frameShape, size);
  const isCircle = !clipPath;

  // Formes simples avec borderRadius (circle)
  if (isCircle) {
    if (!uri) {
      return (
        <View style={[{
          width: size, height: size, borderRadius: size / 2,
          overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: bw, borderColor,
        }]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
            <Ionicons name="person" size={placeholderIconSize} color={isDark ? '#666' : '#999'} />
          </View>
        </View>
      );
    }

    // Circle avec transform via SVG pour le positionnement
    const clipId = `frame-circle-${size}`;
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <ClipPath id={clipId}>
              <Circle cx={size/2} cy={size/2} r={size/2 - bw} />
            </ClipPath>
          </Defs>
          <SvgImage
            href={{ uri }}
            x={imgX} y={imgY}
            width={imgSize} height={imgSize}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <Circle cx={size/2} cy={size/2} r={size/2 - bw/2} fill="none" stroke={borderColor} strokeWidth={bw} />
        </Svg>
      </View>
    );
  }

  // Formes complexes avec SVG ClipPath
  const clipId = `frame-clip-${frameShape}-${size}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={clipPath} />
          </ClipPath>
        </Defs>

        {/* Image clippee avec transform */}
        {uri ? (
          <SvgImage
            href={{ uri }}
            x={imgX} y={imgY}
            width={imgSize} height={imgSize}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <Path d={clipPath} fill="#FFFFFF" />
        )}

        {/* Bordure */}
        <Path d={clipPath} fill="none" stroke={borderColor} strokeWidth={bw} />
      </Svg>

      {/* Placeholder icon over SVG when no photo */}
      {!uri && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="person" size={placeholderIconSize} color={isDark ? '#666' : '#999'} />
        </View>
      )}
    </View>
  );
});

FramedProfilePhoto.displayName = 'FramedProfilePhoto';

export { FramedProfilePhoto };
export default FramedProfilePhoto;
