/**
 * Feuille du bas (refonte v2) : titre, texte, contenu libre et actions.
 */
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { tapLight } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export type SheetAction = { label: string; onPress: () => void; tone?: 'accent' | 'ink' | 'ghost' | 'danger' };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  children?: React.ReactNode;
  actions: SheetAction[];
};

export function Sheet({ visible, onClose, title, text, children, actions }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(29,32,41,0.42)' }} onPress={onClose} accessibilityLabel={traduire("Fermer")} />
        <View style={{ margin: 10, marginBottom: insets.bottom + 10, borderRadius: 28, backgroundColor: c.background, padding: 20, gap: 12, borderWidth: 1, borderColor: P.carte }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 4 }} />
          <Ink size={22} weight="black" tight accessibilityRole="header">
            {title}
          </Ink>
          {text ? (
            <Ink size={15} color={c.textSecondary}>
              {text}
            </Ink>
          ) : null}
          {children}
          <View style={{ gap: 8, marginTop: 6 }}>
            {actions.map((a) => {
              const bg = a.tone === 'accent' ? c.accent : a.tone === 'ink' ? c.ink : a.tone === 'danger' ? c.dangerTint : 'transparent';
              const fg = a.tone === 'accent' ? c.onAccent : a.tone === 'ink' ? c.background : a.tone === 'danger' ? c.danger : c.textSecondary;
              return (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    tapLight();
                    a.onPress();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => ({ height: 54, borderRadius: 18, backgroundColor: bg, borderWidth: a.tone === 'ghost' || !a.tone ? 1.5 : 0, borderColor: '#D5D2CA', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
                >
                  <Ink size={16} weight="extraBold" color={fg}>
                    {traduire(a.label)}
                  </Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
