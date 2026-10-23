import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';

// ============================================
// Carte (refonte v2) : plaque blanche sur papier de riz.
// Variante gold : liseré d'or. Variante elevated : carte en verre.
// API inchangee.
// ============================================

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'gold' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noBorder?: boolean;
  noBlur?: boolean;
}

const PADDING = { none: 0, sm: 12, md: 18, lg: 22 };

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
  noBorder = false,
}) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  const look =
    variant === 'gold'
      ? { backgroundColor: c.surface, borderColor: c.goldLight }
      : variant === 'elevated'
        ? { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#FFFFFF' }
        : { backgroundColor: c.surface, borderColor: c.divider };

  return (
    <View
      style={[
        styles.card,
        look,
        { shadowColor: c.shadow, borderColor: noBorder ? 'transparent' : look.borderColor },
        variant === 'elevated' && styles.elevated,
        style,
      ]}
    >
      {variant === 'gold' ? <View style={[styles.goldVein, { backgroundColor: c.gold }]} /> : null}
      <View style={{ padding: PADDING[padding] }}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  elevated: {
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 4,
  },
  goldVein: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default Card;
