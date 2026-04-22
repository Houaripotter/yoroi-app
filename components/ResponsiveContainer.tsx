// ============================================
// RESPONSIVE CONTAINER
// Sur iPad : centre le contenu avec max-width ~780px pour éviter les textes
// qui s'étirent sur toute la largeur. Sur iPhone : transparent (no-op).
//
// Usage :
//   <ResponsiveContainer>
//     ... ton contenu existant ...
//   </ResponsiveContainer>
// ============================================

import React from 'react';
import { View, StyleSheet, useWindowDimensions, ViewStyle, StyleProp } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  /** Largeur max en px (défaut 780). Sur iPad portrait ≈ 768 → prend presque tout. */
  maxWidth?: number;
  /** Style additionnel appliqué au wrapper intérieur */
  style?: StyleProp<ViewStyle>;
  /** Si true, n'applique aucune limite (mode passthrough, pour debug) */
  disabled?: boolean;
}

const ResponsiveContainerInner: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 780,
  style,
  disabled,
}) => {
  const { width } = useWindowDimensions();
  // Sur iPhone / petit iPad portrait → pas de contrainte.
  // Sur iPad large (≥ 900px) → on limite.
  const shouldConstrain = !disabled && width >= 900;

  if (!shouldConstrain) {
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth }, style]}>
        {children}
      </View>
    </View>
  );
};

export const ResponsiveContainer = React.memo(ResponsiveContainerInner);

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
