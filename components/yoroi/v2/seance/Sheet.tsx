/**
 * Feuille basse simple (Modal) pour les choix rapides de la saisie de seance.
 */
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { intensite } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';

export function Sheet({ visible, onClose, title, children, scroll = false }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; scroll?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const body = (
    <View style={{ gap: 12 }}>
      {title ? <Ink size={22} weight="black" tight style={{ paddingHorizontal: 4 }}>{title}</Ink> : null}
      {children}
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
          <Pressable onPress={() => {}} style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 20, maxHeight: '88%' }}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 14 }} />
            {scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{body}</ScrollView> : body}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Rangee de pastilles a choix unique.
 * 17 octobre : niveau (facultatif) colore la pastille choisie sur l'echelle d'intensite commune
 * (lib/v2/intensite.ts) ; sans niveau, rien ne change pour les autres ecrans.
 */
export function ChoiceRow<T extends string | number>({ options, value, onChange, columns, niveau }: { options: { value: T; label: string }[]; value: T | null | undefined; onChange: (v: T | null) => void; columns?: number; niveau?: (v: T) => number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        const teinte = niveau ? intensite(niveau(o.value)) : null;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(on ? null : o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: columns ? `${Math.floor(100 / columns) - 3}%` : undefined,
              minHeight: 46,
              paddingHorizontal: 12,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              // (vague 39) surfaces du theme : lisible en clair comme en sombre
              backgroundColor: on ? (teinte ? teinte.fill : c.ink) : pressed ? c.fillSubtle : teinte ? teinte.tint : c.surface,
              borderWidth: on || teinte ? 0 : 1,
              borderColor: c.border,
            })}
          >
            <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? (teinte ? teinte.onFill : c.background) : teinte ? teinte.text : c.ink}>{o.label}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
