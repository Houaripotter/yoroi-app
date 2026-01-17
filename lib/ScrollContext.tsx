/**
 * ScrollContext.tsx
 * Contexte partagé pour tracker le scroll vertical
 * Permet aux composants de réagir au scroll de n'importe quelle page
 */

import React, { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface ScrollContextType {
  scrollY: Animated.Value;
  lastScrollY: React.MutableRefObject<number>;
  isScrollingDown: React.MutableRefObject<boolean>;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  setScrollingDown: (value: boolean) => void;
}

const ScrollContext = createContext<ScrollContextType | null>(null);

export const useScrollContext = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    // Retourner des valeurs par défaut si pas de contexte
    return {
      scrollY: new Animated.Value(0),
      lastScrollY: { current: 0 },
      isScrollingDown: { current: false },
      handleScroll: () => {},
      setScrollingDown: () => {},
    };
  }
  return context;
};

interface ScrollProviderProps {
  children: ReactNode;
}

export const ScrollProvider: React.FC<ScrollProviderProps> = ({ children }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isScrollingDown = useRef(false);

  const setScrollingDown = useCallback((value: boolean) => {
    isScrollingDown.current = value;
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    // Mettre à jour la valeur animée
    scrollY.setValue(currentY);

    // Détecter la direction avec un seuil
    if (diff > 10) {
      isScrollingDown.current = true;
    } else if (diff < -10) {
      isScrollingDown.current = false;
    }

    lastScrollY.current = currentY;
  }, []);

  return (
    <ScrollContext.Provider
      value={{
        scrollY,
        lastScrollY,
        isScrollingDown,
        handleScroll,
        setScrollingDown,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export default ScrollContext;
