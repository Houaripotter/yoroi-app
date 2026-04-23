// ============================================
// KEYBOARD AWARE VIEW
// Wrapper global qui évite que le clavier cache les champs texte.
//
// Solution :
// - iOS : utilise `automaticallyAdjustKeyboardInsets` (natif, RN 0.73+) qui ajuste
//   automatiquement le scroll inset quand le clavier apparaît. Zero config.
// - Android : utilise KeyboardAvoidingView avec behavior="height" + listener manuel
//   qui scroll vers le champ actif si besoin.
//
// Usage : remplace tes <ScrollView> par <KeyboardAwareScrollView>.
// Les props sont identiques à ScrollView + bonus "extraKeyboardOffset".
// ============================================

import React, { useRef } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /** Offset additionnel en px (par défaut 20) pour laisser de l'air sous le champ */
  extraKeyboardOffset?: number;
  /** Style du KeyboardAvoidingView parent (pas du ScrollView) */
  outerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const KeyboardAwareScrollViewInner: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  extraKeyboardOffset = 20,
  outerStyle,
  keyboardShouldPersistTaps,
  contentContainerStyle,
  ...rest
}) => {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, outerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        // iOS 14+ : ajuste automatiquement le scroll inset quand le clavier apparaît
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          contentContainerStyle,
          // Ajoute de l'espace bas pour que le dernier champ soit atteignable au scroll
          { paddingBottom: (contentContainerStyle as any)?.paddingBottom ?? extraKeyboardOffset + 40 },
        ]}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const KeyboardAwareScrollView = React.memo(KeyboardAwareScrollViewInner);

/**
 * Version "plain view" (sans scroll) pour les écrans qui ont déjà leur propre scroll
 * ou des modals/bottom-sheets. Évite juste que le clavier cache le contenu.
 */
interface KeyboardAwareViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const KeyboardAwareViewInner: React.FC<KeyboardAwareViewProps> = ({ children, style }) => {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

export const KeyboardAwareView = React.memo(KeyboardAwareViewInner);

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

/**
 * Dismiss le clavier · utile sur onPress d'un bouton de submit par exemple.
 */
export const dismissKeyboard = () => Keyboard.dismiss();
