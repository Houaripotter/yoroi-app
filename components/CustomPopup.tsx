// ============================================
// YOROI - CUSTOM POPUP COMPONENT
// ============================================
// Popup personnalisee pour remplacer Alert.alert

import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

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

export const CustomPopup: React.FC<CustomPopupProps> = memo(({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'primary' as const }],
  onClose,
  icon,
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const styles = useMemo(() => createStyles(SCREEN_WIDTH), [SCREEN_WIDTH]);
  const { colors, isDark } = useTheme();

  const handleButtonPress = (button: PopupButton) => {
    impactAsync(ImpactFeedbackStyle.Light);
    // Fermer d'abord le popup actuel
    onClose();
    // Puis executer l'action apres un court delai pour permettre
    // l'affichage d'un nouveau popup si necessaire
    if (button.onPress) {
      setTimeout(() => {
        button.onPress?.();
      }, 100);
    }
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return { backgroundColor: '#EF4444', textColor: '#FFFFFF' };
      case 'cancel':
        return { backgroundColor: colors.backgroundElevated, textColor: colors.textPrimary };
      case 'primary':
        return { backgroundColor: colors.accent, textColor: colors.textOnAccent };
      default:
        return { backgroundColor: colors.backgroundElevated, textColor: colors.textPrimary };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={isDark ? 40 : 20}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.centeredView}>
          <View style={[styles.popupContainer, { backgroundColor: colors.card }]}>
            {/* Accent bar */}
            <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />

            {/* Content */}
            <View style={styles.content}>
              {icon && <View style={styles.iconContainer}>{icon}</View>}

              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {title}
              </Text>

              {message && (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {message}
                </Text>
              )}
            </View>

            {/* Buttons */}
            <View style={[
              styles.buttonsContainer,
              buttons.length > 2 && styles.buttonsVertical,
            ]}>
              {buttons.map((button, index) => {
                const buttonStyle = getButtonStyle(button.style);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      buttons.length <= 2 && styles.buttonHorizontal,
                      buttons.length > 2 && styles.buttonFullWidth,
                      { backgroundColor: buttonStyle.backgroundColor },
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: buttonStyle.textColor },
                        button.style === 'primary' && styles.buttonTextBold,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// ============================================
// HOOK POUR UTILISER LA POPUP
// ============================================

interface PopupState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: PopupButton[];
  icon?: React.ReactNode;
}

// Type pour le format objet
interface ShowPopupOptions {
  title: string;
  message?: string;
  buttons?: PopupButton[];
  icon?: React.ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export const useCustomPopup = () => {
  const [popupState, setPopupState] = React.useState<PopupState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  // Supporte les deux formats: positional et object
  const showPopup = (
    titleOrOptions: string | ShowPopupOptions,
    message?: string,
    buttons?: PopupButton[],
    icon?: React.ReactNode
  ) => {
    impactAsync(ImpactFeedbackStyle.Medium);

    // Format objet
    if (typeof titleOrOptions === 'object') {
      setPopupState({
        visible: true,
        title: titleOrOptions.title,
        message: titleOrOptions.message,
        buttons: titleOrOptions.buttons || [{ text: 'OK', style: 'primary' }],
        icon: titleOrOptions.icon,
      });
    } else {
      // Format positionnel
      setPopupState({
        visible: true,
        title: titleOrOptions,
        message,
        buttons: buttons || [{ text: 'OK', style: 'primary' }],
        icon,
      });
    }
  };

  const hidePopup = React.useCallback(() => {
    setPopupState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Ref vers l'état courant, mise à jour à chaque rendu de l'écran hôte
  const popupStateRef = React.useRef(popupState);
  popupStateRef.current = popupState;

  // Type de composant STABLE : la Modal n'est plus démontée à chaque re-render de l'hôte.
  // Non mémoïsé (pas de React.memo) → se re-rend avec l'hôte et lit l'état à jour via la ref.
  const PopupComponent = React.useCallback(() => {
    const state = popupStateRef.current;
    return (
      <CustomPopup
        visible={state.visible}
        title={state.title}
        message={state.message}
        buttons={state.buttons}
        onClose={hidePopup}
        icon={state.icon}
      />
    );
  }, [hidePopup]);

  return { showPopup, hidePopup, PopupComponent };
};

// ============================================
// STYLES
// ============================================

const createStyles = (SCREEN_WIDTH: number) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredView: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
  },
  popupContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  buttonsVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextBold: {
    fontWeight: '700',
  },
});

export default CustomPopup;
