// ============================================
// FRAMED PROFILE PHOTO - Applique la forme selectionnee
// + accessoire decoratif EXTERIEUR (deborde du cadre)
// ============================================

import React, { useState, useEffect, memo } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import Svg, { Path, Circle, Defs, ClipPath, Image as SvgImage, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  FRAME_STORAGE_KEY,
  FRAME_SHAPE_CHANGED_EVENT,
  ACCESSORY_STORAGE_KEY,
  FRAME_ACCESSORY_CHANGED_EVENT,
  ACCESSORY_2_STORAGE_KEY,
  ACCESSORY_2_CHANGED_EVENT,
  BORDER_COLOR_STORAGE_KEY,
  BORDER_COLOR_CHANGED_EVENT,
  BORDER_THICKNESS_STORAGE_KEY,
  BORDER_THICKNESS_CHANGED_EVENT,
  BORDER_EFFECT_STORAGE_KEY,
  BORDER_EFFECT_CHANGED_EVENT,
  BORDER_COLORS,
  BORDER_THICKNESS_OPTIONS,
  generateClipPath,
  renderAccessorySvg,
  type FrameShape,
  type FrameAccessory,
  type BorderEffect,
  type PhotoTransform,
} from '@/app/frame-selection';
import { useTheme } from '@/lib/ThemeContext';

const PHOTO_TRANSFORM_KEY = '@yoroi_frame_transform';

interface FramedProfilePhotoProps {
  uri?: string | null;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  placeholderIconSize?: number;
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
  const [accessory, setAccessory] = useState<FrameAccessory>('none');
  const [accessory2, setAccessory2] = useState<FrameAccessory>('none');
  const [borderColorId, setBorderColorId] = useState('theme');
  const [borderThicknessId, setBorderThicknessId] = useState('normal');
  const [borderEffect, setBorderEffect] = useState<BorderEffect>('none');
  const [transform, setTransform] = useState<PhotoTransform>({ scale: 1, translateX: 0, translateY: 0 });

  // Calcul couleur et epaisseur effectives
  const resolvedBorderColor = (() => {
    const found = BORDER_COLORS.find(c => c.id === borderColorId);
    if (!found || !found.color) return borderColor; // fallback = prop
    return found.color;
  })();
  const resolvedBorderWidth = BORDER_THICKNESS_OPTIONS.find(t => t.id === borderThicknessId)?.value ?? bw;

  useEffect(() => {
    AsyncStorage.getItem(FRAME_STORAGE_KEY).then(saved => {
      if (saved) setFrameShape(saved as FrameShape);
    });
    AsyncStorage.getItem(ACCESSORY_STORAGE_KEY).then(saved => {
      if (saved) setAccessory(saved as FrameAccessory);
    });
    AsyncStorage.getItem(ACCESSORY_2_STORAGE_KEY).then(saved => {
      if (saved) setAccessory2(saved as FrameAccessory);
    });
    AsyncStorage.getItem(BORDER_COLOR_STORAGE_KEY).then(saved => {
      if (saved) setBorderColorId(saved);
    });
    AsyncStorage.getItem(BORDER_THICKNESS_STORAGE_KEY).then(saved => {
      if (saved) setBorderThicknessId(saved);
    });
    AsyncStorage.getItem(BORDER_EFFECT_STORAGE_KEY).then(saved => {
      if (saved) setBorderEffect(saved as BorderEffect);
    });
    AsyncStorage.getItem(PHOTO_TRANSFORM_KEY).then(raw => {
      if (raw) {
        try { setTransform(JSON.parse(raw)); } catch {}
      }
    });

    const sub1 = DeviceEventEmitter.addListener(FRAME_SHAPE_CHANGED_EVENT, (shape: FrameShape) => {
      setFrameShape(shape);
    });
    const sub2 = DeviceEventEmitter.addListener(FRAME_ACCESSORY_CHANGED_EVENT, (acc: FrameAccessory) => {
      setAccessory(acc);
    });
    const sub3 = DeviceEventEmitter.addListener(ACCESSORY_2_CHANGED_EVENT, (acc: FrameAccessory) => {
      setAccessory2(acc);
    });
    const sub4 = DeviceEventEmitter.addListener(BORDER_COLOR_CHANGED_EVENT, (cid: string) => {
      setBorderColorId(cid);
    });
    const sub5 = DeviceEventEmitter.addListener(BORDER_THICKNESS_CHANGED_EVENT, (tid: string) => {
      setBorderThicknessId(tid);
    });
    const sub6 = DeviceEventEmitter.addListener(BORDER_EFFECT_CHANGED_EVENT, (ef: BorderEffect) => {
      setBorderEffect(ef);
    });
    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
      sub4.remove();
      sub5.remove();
      sub6.remove();
    };
  }, []);

  // Adapter le transform a la taille du composant (sauvegarde a 160px)
  const ratio = size / 160;
  const imgSize = size * transform.scale;
  const imgX = (size - imgSize) / 2 + transform.translateX * ratio;
  const imgY = (size - imgSize) / 2 + transform.translateY * ratio;

  const clipPath = generateClipPath(frameShape, size, 2);
  const isCircle = !clipPath;

  // L'accessoire deborde : on utilise un overlay SVG positionne en absolu
  const overflow = size * 0.6;
  const hasAccessory = accessory !== 'none';
  const hasAccessory2 = accessory2 !== 'none';
  // Couleur de bordure effective avec effet
  const effectBorderColor = borderEffect === 'gold' ? '#FFD700' : resolvedBorderColor;
  const glowColor = (borderEffect === 'neon' || borderEffect === 'gold') ? effectBorderColor : null;

  const accessoryOverlay = (hasAccessory || hasAccessory2) ? (
    <View
      style={{
        position: 'absolute',
        top: -overflow,
        left: -overflow,
        width: size + overflow * 2,
        height: size + overflow * 2,
      }}
      pointerEvents="none"
    >
      <Svg
        width={size + overflow * 2}
        height={size + overflow * 2}
        viewBox={`${-overflow} ${-overflow} ${size + overflow * 2} ${size + overflow * 2}`}
      >
        {hasAccessory && renderAccessorySvg(accessory, size, colors.accent)}
        {hasAccessory2 && renderAccessorySvg(accessory2, size, colors.accent)}
      </Svg>
    </View>
  ) : null;

  // Formes simples avec borderRadius (circle)
  if (isCircle) {
    if (!uri) {
      return (
        <View style={{ width: size, height: size, overflow: 'visible' }}>
          <View style={[{
            width: size, height: size, borderRadius: size / 2,
            overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: resolvedBorderWidth, borderColor: effectBorderColor,
          }]}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
              <Ionicons name="person" size={placeholderIconSize} color={isDark ? '#666' : '#999'} />
            </View>
          </View>
          {accessoryOverlay}
        </View>
      );
    }

    // Circle avec transform via SVG pour le positionnement
    const clipId = `frame-circle-${size}`;
    return (
      <View style={{ width: size, height: size, overflow: 'visible' }}>
        <Svg width={size} height={size}>
          <Defs>
            <ClipPath id={clipId}>
              <Circle cx={size/2} cy={size/2} r={size/2 - resolvedBorderWidth} />
            </ClipPath>
          </Defs>
          <SvgImage
            href={{ uri }}
            x={imgX} y={imgY}
            width={imgSize} height={imgSize}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          {glowColor && <Circle cx={size/2} cy={size/2} r={size/2 - resolvedBorderWidth/2} fill="none" stroke={glowColor} strokeWidth={resolvedBorderWidth + 5} opacity={0.35} />}
          <Circle cx={size/2} cy={size/2} r={size/2 - resolvedBorderWidth/2} fill="none" stroke={effectBorderColor} strokeWidth={resolvedBorderWidth} />
        </Svg>
        {accessoryOverlay}
      </View>
    );
  }

  // Formes complexes avec SVG ClipPath
  const clipId = `frame-clip-${frameShape}-${size}`;

  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
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

        {/* Lueur si effet actif */}
        {glowColor && <Path d={clipPath} fill="none" stroke={glowColor} strokeWidth={resolvedBorderWidth + 5} opacity={0.35} />}
        {/* Bordure */}
        <Path d={clipPath} fill="none" stroke={effectBorderColor} strokeWidth={resolvedBorderWidth} />
      </Svg>

      {/* Placeholder icon over SVG when no photo */}
      {!uri && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="person" size={placeholderIconSize} color={isDark ? '#666' : '#999'} />
        </View>
      )}

      {/* Accessoire decoratif - overlay qui deborde */}
      {accessoryOverlay}
    </View>
  );
});

FramedProfilePhoto.displayName = 'FramedProfilePhoto';

export { FramedProfilePhoto };
export default FramedProfilePhoto;
