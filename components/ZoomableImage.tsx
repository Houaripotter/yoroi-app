import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { X } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableImageProps {
  source: { uri: string } | number;
  style?: any;
  onClose?: () => void;
}

export function ZoomableImage({ source, style, onClose }: ZoomableImageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scale = new RNAnimated.Value(1);
  const translateX = new RNAnimated.Value(0);
  const translateY = new RNAnimated.Value(0);
  const lastScale = React.useRef(1);
  const lastTranslate = React.useRef({ x: 0, y: 0 });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      scale.setOffset(lastScale.current);
      translateX.setOffset(lastTranslate.current.x);
      translateY.setOffset(lastTranslate.current.y);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (evt.nativeEvent.touches.length === 2) {
        // Pinch to zoom
        const touch1 = evt.nativeEvent.touches[0];
        const touch2 = evt.nativeEvent.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.pageX - touch1.pageX, 2) +
          Math.pow(touch2.pageY - touch1.pageY, 2)
        );
        const initialDistance = Math.sqrt(
          Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2)
        );
        if (initialDistance > 0) {
          const newScale = Math.max(1, Math.min((distance / initialDistance) * lastScale.current, 4));
          scale.setValue(newScale);
          lastScale.current = newScale;
        }
      } else {
        // Pan
        translateX.setValue(gestureState.dx);
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: () => {
      scale.flattenOffset();
      translateX.flattenOffset();
      translateY.flattenOffset();
      lastTranslate.current = {
        x: (translateX as any)._value,
        y: (translateY as any)._value,
      };
      if (lastScale.current < 1) {
        RNAnimated.parallel([
          RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true }),
          RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          RNAnimated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        lastScale.current = 1;
        lastTranslate.current = { x: 0, y: 0 };
      }
    },
  });

  const openFullscreen = () => {
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    RNAnimated.parallel([
      RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true }),
      RNAnimated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      RNAnimated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    lastScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
    onClose?.();
  };

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
    ],
  };

  return (
    <>
      <TouchableOpacity onPress={openFullscreen} activeOpacity={0.9}>
        <Image source={source} style={style} resizeMode="contain" />
      </TouchableOpacity>

      <Modal
        visible={isFullscreen}
        transparent
        animationType="fade"
        onRequestClose={closeFullscreen}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeFullscreen}
            activeOpacity={0.7}
          >
            <X size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.imageContainer} {...panResponder.panHandlers}>
            <RNAnimated.Image
              source={source}
              style={[styles.fullscreenImage, animatedStyle]}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
