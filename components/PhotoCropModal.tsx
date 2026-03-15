import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Image,
  PanResponder,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Rect, Circle, Defs, Mask } from 'react-native-svg';
import { Check, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react-native';

interface Props {
  visible: boolean;
  uri: string | null;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
  accentColor?: string;
}

export const PhotoCropModal: React.FC<Props> = ({
  visible,
  uri,
  onConfirm,
  onCancel,
  accentColor = '#007AFF',
}) => {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const CIRCLE_SIZE = Math.min(SCREEN_W - 40, 320);
  const CIRCLE_CX = SCREEN_W / 2;
  const CIRCLE_CY = SCREEN_H / 2;
  const styles = useMemo(() => createStyles(SCREEN_H), [SCREEN_H]);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animated values
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Mutable refs (no re-render)
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const scaleRef = useRef(1);
  const startTx = useRef(0);
  const startTy = useRef(0);
  const startScale = useRef(1);
  const startDistance = useRef<number | null>(null);
  const pinchActive = useRef(false);

  // Reset everything when uri changes or modal opens
  const resetTransform = useCallback(() => {
    txRef.current = 0;
    tyRef.current = 0;
    scaleRef.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(1);
  }, [translateX, translateY, scale]);

  useEffect(() => {
    if (visible && uri) {
      resetTransform();
      setImageNaturalSize(null);
      Image.getSize(
        uri,
        (w, h) => setImageNaturalSize({ w, h }),
        () => {},
      );
    }
  }, [visible, uri, resetTransform]);

  // Display size of image (fit to screen keeping aspect ratio)
  const getDisplaySize = (imgW: number, imgH: number) => {
    const imgAspect = imgW / imgH;
    const screenAspect = SCREEN_W / SCREEN_H;
    if (imgAspect > screenAspect) {
      return { dw: SCREEN_W, dh: SCREEN_W / imgAspect };
    }
    return { dw: SCREEN_H * imgAspect, dh: SCREEN_H };
  };

  // Initial scale to fill the crop circle
  const getInitialFillScale = (imgW: number, imgH: number) => {
    const { dw, dh } = getDisplaySize(imgW, imgH);
    const minDim = Math.min(dw, dh);
    return minDim < CIRCLE_SIZE ? CIRCLE_SIZE / minDim : 1;
  };

  useEffect(() => {
    if (imageNaturalSize) {
      const fillScale = getInitialFillScale(imageNaturalSize.w, imageNaturalSize.h);
      if (fillScale > 1) {
        scaleRef.current = fillScale;
        scale.setValue(fillScale);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageNaturalSize]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startTx.current = txRef.current;
        startTy.current = tyRef.current;
        startScale.current = scaleRef.current;
        startDistance.current = null;
        pinchActive.current = false;
      },
      onPanResponderMove: (e, gestureState) => {
        const { touches } = e.nativeEvent;
        if (touches.length >= 2) {
          pinchActive.current = true;
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (startDistance.current === null) {
            startDistance.current = dist;
            startScale.current = scaleRef.current;
          }
          const newScale = Math.max(0.2, Math.min(8, startScale.current * (dist / startDistance.current)));
          scaleRef.current = newScale;
          scale.setValue(newScale);
        } else if (!pinchActive.current) {
          translateX.setValue(startTx.current + gestureState.dx);
          translateY.setValue(startTy.current + gestureState.dy);
        }
      },
      onPanResponderRelease: (_e, gestureState) => {
        if (!pinchActive.current) {
          txRef.current = startTx.current + gestureState.dx;
          tyRef.current = startTy.current + gestureState.dy;
        }
        pinchActive.current = false;
        startDistance.current = null;
      },
    })
  ).current;

  const handleZoomIn = () => {
    const newScale = Math.min(8, scaleRef.current * 1.3);
    scaleRef.current = newScale;
    Animated.spring(scale, { toValue: newScale, useNativeDriver: true }).start();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.2, scaleRef.current / 1.3);
    scaleRef.current = newScale;
    Animated.spring(scale, { toValue: newScale, useNativeDriver: true }).start();
  };

  const handleReset = () => {
    txRef.current = 0;
    tyRef.current = 0;
    const fillScale = imageNaturalSize
      ? Math.max(1, getInitialFillScale(imageNaturalSize.w, imageNaturalSize.h))
      : 1;
    scaleRef.current = fillScale;
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(scale, { toValue: fillScale, useNativeDriver: true }),
    ]).start();
  };

  const handleConfirm = async () => {
    if (!uri || !imageNaturalSize) return;
    setIsProcessing(true);
    try {
      const { dw, dh } = getDisplaySize(imageNaturalSize.w, imageNaturalSize.h);
      const s = scaleRef.current;
      const tx = txRef.current;
      const ty = tyRef.current;

      // Rapport pixels display → pixels originaux
      const dToO = imageNaturalSize.w / dw;

      // Centre de l'image sur l'écran (après translate)
      const imgCenterX = SCREEN_W / 2 + tx;
      const imgCenterY = SCREEN_H / 2 + ty;

      // Décalage du centre du cercle par rapport au centre de l'image (en coords display)
      const offsetX = (CIRCLE_CX - imgCenterX) / s;
      const offsetY = (CIRCLE_CY - imgCenterY) / s;

      // Position dans l'image display (origine = coin haut-gauche image)
      const cropCenterDx = dw / 2 + offsetX;
      const cropCenterDy = dh / 2 + offsetY;

      // Rayon du cercle dans l'espace display
      const cropRadiusDx = CIRCLE_SIZE / 2 / s;

      // Coordonnées dans l'image originale
      let origX = (cropCenterDx - cropRadiusDx) * dToO;
      let origY = (cropCenterDy - cropRadiusDx) * dToO;
      let origSize = CIRCLE_SIZE / s * dToO;

      // Clamp dans les limites de l'image
      origX = Math.max(0, origX);
      origY = Math.max(0, origY);
      origSize = Math.min(origSize, imageNaturalSize.w - origX, imageNaturalSize.h - origY);
      origSize = Math.max(1, origSize);

      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: Math.round(origX),
              originY: Math.round(origY),
              width: Math.round(origSize),
              height: Math.round(origSize),
            },
          },
          { resize: { width: 600, height: 600 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      onConfirm(result.uri);
    } catch {
      // En cas d'erreur, retourner l'image brute
      onConfirm(uri);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!uri) return null;

  const { dw, dh } = imageNaturalSize
    ? getDisplaySize(imageNaturalSize.w, imageNaturalSize.h)
    : { dw: SCREEN_W, dh: SCREEN_H };

  // Position initiale : image centrée sur l'écran
  const imgLeft = SCREEN_W / 2 - dw / 2;
  const imgTop = SCREEN_H / 2 - dh / 2;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* Image avec gestures */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          <Animated.View
            style={{
              position: 'absolute',
              top: imgTop,
              left: imgLeft,
              width: dw,
              height: dh,
              transform: [
                { translateX },
                { translateY },
                { scale },
              ],
            }}
          >
            <Image
              source={{ uri }}
              style={{ width: dw, height: dh }}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* Overlay sombre avec trou circulaire */}
        <Svg
          width={SCREEN_W}
          height={SCREEN_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="cropMask" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
              <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="white" />
              <Circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={CIRCLE_SIZE / 2} fill="black" />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={SCREEN_W}
            height={SCREEN_H}
            fill="rgba(0,0,0,0.7)"
            mask="url(#cropMask)"
          />
          {/* Bordure du cercle */}
          <Circle
            cx={CIRCLE_CX}
            cy={CIRCLE_CY}
            r={CIRCLE_SIZE / 2}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={2}
            strokeDasharray="8,4"
          />
        </Svg>

        {/* Texte d'aide en haut */}
        <View style={styles.topBar} pointerEvents="none">
          <Text style={styles.helpText}>Pincer pour zoomer · Glisser pour repositionner</Text>
        </View>

        {/* Boutons zoom + reset flottants (côté droit) */}
        <View style={styles.sideControls} pointerEvents="box-none">
          <TouchableOpacity style={styles.sideBtn} onPress={handleZoomIn}>
            <ZoomIn size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn} onPress={handleZoomOut}>
            <ZoomOut size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn} onPress={handleReset}>
            <RotateCcw size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Barre du bas : Annuler / Confirmer */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={isProcessing}>
            <X size={20} color="#FFFFFF" />
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: accentColor }]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.confirmText}>Utiliser cette photo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (SCREEN_H: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  helpText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sideControls: {
    position: 'absolute',
    right: 16,
    top: SCREEN_H / 2 - 80,
    gap: 10,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
