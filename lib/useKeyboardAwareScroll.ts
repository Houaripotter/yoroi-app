// ============================================
// YOROI — Hook utility pour ScrollView keyboard-aware
// Évite que le clavier cache les champs de saisie
// + les suggestions qui apparaissent en dessous
// ============================================

import { useRef } from 'react';
import { Platform, ScrollView, TextInput, findNodeHandle, UIManager } from 'react-native';

export interface KeyboardAwareScrollProps {
  ref: React.RefObject<ScrollView | null>;
  scrollToInput: (node: number | React.RefObject<TextInput> | TextInput | null, extraOffset?: number) => void;
  /** Props à appliquer directement sur le ScrollView */
  scrollProps: {
    keyboardShouldPersistTaps: 'handled';
    keyboardDismissMode: 'interactive';
    automaticallyAdjustKeyboardInsets: boolean;
    contentInsetAdjustmentBehavior: 'automatic';
    showsVerticalScrollIndicator: boolean;
  };
}

/**
 * Hook à utiliser pour les écrans avec TextInputs.
 *
 * Usage :
 * ```tsx
 * const { ref, scrollToInput, scrollProps } = useKeyboardAwareScroll();
 * return (
 *   <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top + 48}>
 *     <ScrollView ref={ref} contentContainerStyle={{ paddingBottom: insets.bottom + 300 }} {...scrollProps}>
 *       <TextInput onFocus={e => scrollToInput(e.target)} />
 *     </ScrollView>
 *   </KeyboardAvoidingView>
 * )
 * ```
 */
export function useKeyboardAwareScroll(): KeyboardAwareScrollProps {
  const ref = useRef<ScrollView | null>(null);

  const scrollToInput = (node: number | React.RefObject<TextInput> | TextInput | null, extraOffset = 100) => {
    if (!ref.current || !node) return;

    // Extraire le NodeHandle
    let handle: number | null = null;
    if (typeof node === 'number') {
      handle = node;
    } else if ('current' in (node as any)) {
      handle = findNodeHandle((node as React.RefObject<TextInput>).current as any);
    } else {
      handle = findNodeHandle(node as any);
    }
    if (handle == null) return;

    // Mesurer la position de l'input dans le scrollView
    UIManager.measureLayout(
      handle,
      findNodeHandle(ref.current as any) as number,
      () => { /* silent fail */ },
      (_x: number, y: number) => {
        const targetY = Math.max(0, y - extraOffset);
        ref.current?.scrollTo({ y: targetY, animated: true });
      }
    );
  };

  return {
    ref,
    scrollToInput,
    scrollProps: {
      keyboardShouldPersistTaps: 'handled',
      keyboardDismissMode: 'interactive',
      automaticallyAdjustKeyboardInsets: Platform.OS === 'ios',
      contentInsetAdjustmentBehavior: 'automatic',
      showsVerticalScrollIndicator: false,
    },
  };
}
