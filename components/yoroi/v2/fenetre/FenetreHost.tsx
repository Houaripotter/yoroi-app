/**
 * Hote unique des fenetres YOROI (appAlert, appChoices, appPrompt).
 * Monte une fois dans app/_layout.tsx.
 * iOS : FullWindowOverlay (react-native-screens) pour passer au-dessus des ecrans modaux
 * et des feuilles Modal deja ouvertes. Android : Modal transparent (bouton retour gere).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import {
  _fenetreCloseSignal,
  _fenetreCurrent,
  _fenetreDone,
  _fenetreSubscribe,
  type AppAlertButton,
  type FenetreRequest,
} from './api';
import { traduire } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

const VEIL = 'rgba(29,32,41,0.38)';
const IN_MS = 160;
const OUT_MS = 110;

type Tone = 'main' | 'danger' | 'soft' | 'cancel';

function lightTap() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // retour haptique indisponible
  }
}

/** Ordre et couleur des boutons : action principale d'abord, annulation en dernier quand c'est empile */
function arrange(buttons: AppAlertButton[], kind: FenetreRequest['kind']) {
  const cancels = buttons.filter((b) => b.style === 'cancel');
  const destructive = buttons.filter((b) => b.style === 'destructive');
  const others = buttons.filter((b) => b.style !== 'cancel' && b.style !== 'destructive');
  const forced = others.filter((b) => b.style === 'primary' || b.isPreferred);

  const toneOf = (b: AppAlertButton): Tone => {
    if (kind === 'choices') return b.style === 'cancel' ? 'cancel' : b.style === 'destructive' ? 'danger' : 'soft';
    if (b.style === 'destructive') return 'danger';
    if (b.style === 'cancel') return others.length === 0 && destructive.length === 0 && b === cancels[0] ? 'main' : 'cancel';
    if (forced.length > 0) return forced.includes(b) ? 'main' : 'soft';
    return others.length === 1 ? 'main' : 'soft';
  };

  const longText = buttons.some((b) => (b.text ?? 'OK').length > 13);
  const stacked = kind === 'choices' || buttons.length > 2 || longText;
  const ordered = stacked ? [...others, ...destructive, ...cancels] : buttons.length === 2 && cancels.length === 1 ? [cancels[0], ...buttons.filter((b) => b !== cancels[0])] : buttons;
  return { stacked, items: ordered.map((b) => ({ b, tone: toneOf(b) })), cancel: cancels[0] };
}

export function FenetreHost() {
  const current = useSyncExternalStore(_fenetreSubscribe, _fenetreCurrent, _fenetreCurrent);
  if (!current) return null;
  return <Fenetre key={current.id} req={current} />;
}

function Fenetre({ req }: { req: FenetreRequest }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const titleRef = useRef<View>(null);
  const [value, setValue] = useState(req.input?.defaultValue ?? '');
  const valueRef = useRef(value);
  valueRef.current = value;
  const [kb, setKb] = useState(0);
  const isChoices = req.kind === 'choices';
  const { stacked, items, cancel } = useMemo(() => arrange(req.buttons, req.kind), [req]);
  // Le voile et le retour Android ferment seulement s'il existe une sortie neutre
  const single = req.buttons.length === 1 && req.buttons[0].style !== 'destructive' ? req.buttons[0] : undefined;

  useEffect(() => {
    lightTap();
    Animated.timing(anim, { toValue: 1, duration: IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const t = setTimeout(() => {
      try {
        if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current as any, 'focus');
        else AccessibilityInfo.announceForAccessibility(req.title);
      } catch {
        // lecteur d'ecran indisponible
      }
    }, IN_MS + 40);
    return () => clearTimeout(t);
  }, [anim, req.title]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, (e) => setKb(e.endCoordinates?.height ?? 0));
    const b = Keyboard.addListener(hideEvt, () => setKb(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const finish = useCallback(
    (button?: AppAlertButton, dismissed?: boolean) => {
      if (closing.current) return;
      closing.current = true;
      if (button) lightTap();
      if (req.input) Keyboard.dismiss();
      const typed = valueRef.current;
      Animated.timing(anim, { toValue: 0, duration: OUT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        _fenetreDone(req.id);
        try {
          button?.onPress?.(req.input ? typed : undefined);
        } finally {
          if (dismissed) req.options?.onDismiss?.();
        }
      });
    },
    [anim, req],
  );

  // closeAppAlert() : fermeture sans bouton
  const signalAtOpen = useRef(_fenetreCloseSignal());
  useEffect(
    () =>
      _fenetreSubscribe(() => {
        if (_fenetreCloseSignal() !== signalAtOpen.current) {
          signalAtOpen.current = _fenetreCloseSignal();
          finish(undefined, true);
        }
      }),
    [finish],
  );

  const onBackdrop = () => {
    if (cancel) finish(cancel, true);
  };
  const onBack = () => {
    if (cancel) finish(cancel, true);
    else if (single) finish(single, true);
  };

  const mainOf = items.find((x) => x.tone === 'main');
  const cardWidth = Math.min(width - 32, isChoices ? 420 : 360);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: isChoices ? [1, 1] : [0.96, 1] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: isChoices ? [14, 0] : [0, 0] });

  const toneStyle = (tone: Tone, pressed: boolean) => {
    switch (tone) {
      case 'main':
        return { bg: pressed ? c.primaryPressed : c.primary, fg: c.onPrimary, border: 'transparent', weight: 'extraBold' as const };
      case 'danger':
        if (isChoices) return { bg: pressed ? c.dangerTint : c.surface, fg: c.danger, border: c.border, weight: 'bold' as const };
        return { bg: pressed ? c.dangerPressed : c.danger, fg: '#FFFFFF', border: 'transparent', weight: 'extraBold' as const };
      case 'soft':
        if (isChoices) return { bg: pressed ? c.fillSoft : c.surface, fg: c.ink, border: c.border, weight: 'bold' as const };
        return { bg: pressed ? c.indigoTint : c.accentTint, fg: c.accent, border: 'transparent', weight: 'bold' as const };
      default:
        return { bg: pressed ? c.fillSoft : c.surface, fg: c.ink, border: c.border, weight: 'bold' as const };
    }
  };

  const renderButton = ({ b, tone }: { b: AppAlertButton; tone: Tone }, i: number) =>
    // 28 octobre 2026 : le bouton principal de la fenetre prend le bouton partage (degrade bleu nuit, texte blanc)
    tone === 'main' ? (
      <BoutonPrincipal
        key={`${i}-${b.text ?? 'OK'}`}
        onPress={() => finish(b)}
        haptique="none"
        accessibilityLabel={b.text ?? 'OK'}
        label={b.text ?? 'OK'}
        hauteur={52}
        rayon={16}
        tailleTexte={15.5}
        style={!stacked ? styles.buttonRow : undefined}
      />
    ) : (
    <Pressable
      key={`${i}-${b.text ?? 'OK'}`}
      onPress={() => finish(b)}
      accessibilityRole="button"
      accessibilityLabel={b.text ?? 'OK'}
      style={({ pressed }) => {
        const t = toneStyle(tone, pressed);
        return [
          styles.button,
          !stacked && styles.buttonRow,
          isChoices && tone === 'cancel' && styles.choiceCancel,
          { backgroundColor: t.bg, borderColor: t.border, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ];
      }}
    >
      {({ pressed }) => {
        const t = toneStyle(tone, pressed);
        return (
          <Ink size={15.5} weight={t.weight} color={t.fg} numberOfLines={2} style={styles.center}>
            {b.text ?? 'OK'}
          </Ink>
        );
      }}
    </Pressable>
    );

  const hasHeader = !!req.title || !!req.message || !!req.options?.icon || !!req.options?.illustration;

  const body = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: VEIL, opacity: anim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onBackdrop}
          accessible={!!cancel}
          accessibilityRole={cancel ? 'button' : undefined}
          accessibilityLabel={cancel ? cancel.text ?? traduire('Fermer') : undefined}
        />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={[
          styles.place,
          isChoices
            ? { justifyContent: 'flex-end', paddingBottom: Math.max(insets.bottom, 12) + 4 }
            : { justifyContent: 'center', paddingBottom: kb > 0 ? kb + 16 : 0 },
        ]}
      >
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              width: cardWidth,
              backgroundColor: c.background,
              borderColor: c.border,
              shadowColor: c.shadow,
              opacity: anim,
              transform: [{ scale }, { translateY }],
            },
          ]}
        >
          {hasHeader ? (
            <View style={isChoices ? styles.choiceHeader : undefined}>
              {req.options?.illustration ? (
                <View style={[styles.illustration, isChoices && { alignSelf: 'center' }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {req.options.illustration}
                </View>
              ) : null}
              {!req.options?.illustration && req.options?.icon ? <View style={[styles.icon, { backgroundColor: c.surface, borderColor: c.border }]}>{req.options.icon}</View> : null}
              {req.title ? (
                <View ref={titleRef} accessible accessibilityRole="header" accessibilityLabel={traduire(req.title)}>
                  <Ink size={isChoices ? 16 : 19} weight="extraBold" tight style={isChoices ? styles.center : undefined}>
                    {traduire(req.title)}
                  </Ink>
                </View>
              ) : null}
              {req.message ? (
                <ScrollView style={{ maxHeight: Math.round(height * (req.input ? 0.25 : 0.45)) }} bounces={false} showsVerticalScrollIndicator={false}>
                  <Ink size={15} color={c.textSecondary} style={[styles.message, isChoices && styles.center]}>
                    {req.message}
                  </Ink>
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          {req.input ? (
            <TextInput
              value={value}
              onChangeText={setValue}
              autoFocus
              secureTextEntry={req.input.type === 'secure-text' || req.input.type === 'login-password'}
              placeholder={req.input.placeholder}
              placeholderTextColor={c.textMuted}
              keyboardType={(req.input.keyboardType as KeyboardTypeOptions) ?? 'default'}
              returnKeyType="done"
              onSubmitEditing={() => mainOf && finish(mainOf.b)}
              accessibilityLabel={traduire(req.title)}
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.ink }]}
            />
          ) : null}

          <View style={[styles.buttons, !hasHeader && !req.input && { marginTop: 0 }, !stacked && styles.buttonsRow]}>{items.map(renderButton)}</View>
        </Animated.View>
      </View>
    </View>
  );

  if (Platform.OS === 'ios') return <FullWindowOverlay>{body}</FullWindowOverlay>;
  if (Platform.OS === 'android') {
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onBack}>
        {body}
      </Modal>
    );
  }
  return <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]}>{body}</View>;
}

const styles = StyleSheet.create({
  place: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 14,
  },
  choiceHeader: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  illustration: {
    marginBottom: 14,
    marginTop: 2,
  },
  message: {
    marginTop: 6,
    lineHeight: 21,
  },
  center: {
    textAlign: 'center',
  },
  input: {
    marginTop: 14,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  buttons: {
    marginTop: 18,
    gap: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flex: 1,
  },
  choiceCancel: {
    marginTop: 4,
  },
});
