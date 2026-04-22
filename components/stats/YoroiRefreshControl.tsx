// ============================================
// YOROI REFRESH CONTROL
// Wrapper de RefreshControl avec couleur Yoroi + tint adapté au thème.
// Utilise le RefreshControl natif iOS/Android (le custom UI n'est pas
// fiable sans react-native-pull-to-refresh-then), donc on customise
// uniquement les couleurs pour rester instantané et solide.
// ============================================

import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface YoroiRefreshControlProps extends Partial<RefreshControlProps> {
  refreshing: boolean;
  onRefresh: () => void;
}

const YoroiRefreshControlInner: React.FC<YoroiRefreshControlProps> = ({
  refreshing,
  onRefresh,
  ...rest
}) => {
  const { colors } = useTheme();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.accent}
      colors={[colors.accent]}
      progressBackgroundColor={colors.backgroundCard}
      title="Actualisation…"
      titleColor={colors.textMuted}
      {...rest}
    />
  );
};

export const YoroiRefreshControl = React.memo(YoroiRefreshControlInner);
