// ============================================
// YOROI, fenetre de dialogue (refonte v2, l'armure vivante)
// ============================================
// Passe par la fenetre maison (appAlert). API inchangee : CustomPopup, useCustomPopup, PopupButton.

import React, { memo } from 'react';
import { View, StyleSheet, Modal, Pressable, useWindowDimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { appAlert, closeAppAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

export interface PopupButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
}

export interface CustomPopupProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: PopupButton[];
  onClose: () => void;
  icon?: React.ReactNode;
}

function safeImpact(style: ImpactFeedbackStyle) {
  try {
    impactAsync(style);
  } catch {
    // retour haptique indisponible
  }
}

export const CustomPopup: React.FC<CustomPopupProps> = memo(({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'primary' as const }],
  onClose,
  icon,
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  const handleButtonPress = (button: PopupButton) => {
    safeImpact(ImpactFeedbackStyle.Light);
    // Fermer d'abord, puis executer l'action (permet d'enchainer une autre fenetre)
    onClose();
    if (button.onPress) {
      setTimeout(() => {
        button.onPress?.();
      }, 100);
    }
  };

  const tone = (style?: PopupButton['style']) => {
    switch (style) {
      case 'destructive':
        return { bg: c.accentTint, fg: c.accent, border: c.accent, weight: 'extraBold' as const };
      case 'primary':
        return { bg: c.accent, fg: c.onAccent, border: c.accent, weight: 'extraBold' as const };
      case 'cancel':
        return { bg: c.surface, fg: c.textSecondary, border: c.border, weight: 'bold' as const };
      default:
        return { bg: c.fillSoft, fg: c.ink, border: c.fillSoft, weight: 'bold' as const };
    }
  };

  const vertical = buttons.length > 2;
  const hasDestructive = buttons.some((b) => b.style === 'destructive');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(29,32,41,0.42)' }]}>
        {Platform.OS === 'ios' ? <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill} /> : null}
        {visible ? (
          <Animated.View
            entering={ZoomIn.springify().damping(18).stiffness(220)}
            style={[
              styles.card,
              {
                width: Math.min(width - 40, 360),
                backgroundColor: c.surface,
                borderColor: c.divider,
                shadowColor: c.shadow,
              },
            ]}
          >
            {/* Lacet de soie en tete de plaque */}
            <View style={[styles.lace, { backgroundColor: hasDestructive ? c.accent : c.ink }]}>
              <View style={[styles.laceDot, { backgroundColor: c.gold, left: 22 }]} />
              <View style={[styles.laceDot, { backgroundColor: c.gold, right: 22 }]} />
            </View>

            <Animated.View entering={FadeIn.delay(80).duration(260)} style={styles.content}>
              {icon ? (
                <View style={[styles.iconWrap, { backgroundColor: c.background, borderColor: c.divider }]}>{icon}</View>
              ) : null}
              <Ink size={21} weight="black" tight style={styles.center}>
                {title}
              </Ink>
              {message ? (
                <Ink size={15} weight="medium" color={c.textSecondary} style={[styles.center, styles.message]}>
                  {message}
                </Ink>
              ) : null}
            </Animated.View>

            <View style={[styles.buttons, vertical && styles.buttonsVertical]}>
              {buttons.map((button, index) => {
                const t = tone(button.style);
                return (
                  <Pressable
                    key={index}
                    onPress={() => handleButtonPress(button)}
                    accessibilityRole="button"
                    accessibilityLabel={traduire(button.text)}
                    style={({ pressed }) => [
                      styles.button,
                      !vertical && styles.buttonHorizontal,
                      { backgroundColor: t.bg, borderColor: t.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                  >
                    <Ink size={15} weight={t.weight} color={t.fg} numberOfLines={2} style={styles.center}>
                      {traduire(button.text)}
                    </Ink>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
});

// ============================================
// HOOK POUR UTILISER LA POPUP
// ============================================

// Format objet
interface ShowPopupOptions {
  title: string;
  message?: string;
  buttons?: PopupButton[];
  icon?: React.ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export const useCustomPopup = () => {
  // Delegue a la fenetre maison unique (components/yoroi/v2/fenetre), montee une fois dans app/_layout.tsx :
  // meme style partout et affichage garanti au-dessus des ecrans modaux.
  const showPopup = React.useCallback(
    (titleOrOptions: string | ShowPopupOptions, message?: string, buttons?: PopupButton[], icon?: React.ReactNode) => {
      if (typeof titleOrOptions === 'object') {
        appAlert(titleOrOptions.title, titleOrOptions.message, titleOrOptions.buttons, titleOrOptions.icon ? { icon: titleOrOptions.icon } : undefined);
      } else {
        appAlert(titleOrOptions, message, buttons, icon ? { icon } : undefined);
      }
    },
    [],
  );

  const hidePopup = React.useCallback(() => {
    closeAppAlert();
  }, []);

  // Garde pour compatibilite : les ecrans l'affichent encore, la fenetre vit dans l'hote global.
  const PopupComponent = React.useCallback(() => null, []);

  return { showPopup, hidePopup, PopupComponent };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 16,
  },
  lace: {
    height: 6,
    width: '100%',
  },
  laceDot: {
    position: 'absolute',
    top: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  center: {
    textAlign: 'center',
  },
  message: {
    lineHeight: 21,
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  buttonsVertical: {
    flexDirection: 'column',
  },
  button: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHorizontal: {
    flex: 1,
  },
});

export default CustomPopup;
