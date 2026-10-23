import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

// ============================================
// En-tete d'ecran (refonte v2) : bouton rond, grand titre a gauche.
// API inchangee.
// ============================================

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  rightElement?: React.ReactNode;
  transparent?: boolean; // conserve pour compatibilite
}

function RoundIcon({ d, onPress, label }: { d: string; onPress: () => void; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        try {
          impactAsync(ImpactFeedbackStyle.Light);
        } catch {
          // sans importance
        }
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: c.divider, shadowColor: c.shadow, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d={d} stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

export function Header({
  title,
  showBack = false,
  showClose = false,
  onBack,
  onClose,
  rightElement,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const hasButtons = showBack || showClose || !!rightElement;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {hasButtons ? (
        <View style={styles.row}>
          <View style={styles.left}>
            {showBack ? <RoundIcon d="M15 5l-7 7 7 7" onPress={handleBack} label="Retour" /> : null}
            {showClose ? <RoundIcon d="M6 6l12 12M18 6L6 18" onPress={handleClose} label="Fermer" /> : null}
          </View>
          <View style={styles.right}>{rightElement}</View>
        </View>
      ) : null}
      {title ? (
        <Ink size={30} weight="black" tight numberOfLines={2} style={styles.title}>
          {title}
        </Ink>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    gap: 8,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    paddingHorizontal: 4,
  },
});

export default Header;
