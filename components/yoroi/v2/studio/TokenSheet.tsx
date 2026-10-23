/**
 * Saisie du jeton createur : ouverte par un appui long sur le numero de version des Reglages.
 * Champ masque (le jeton ne s'affiche jamais en clair), bouton Coller qui vide ensuite le
 * presse-papiers, blocage apres 5 essais rates (compte garde dans SecureStore).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function TokenSheet({ visible, onClose, onUnlocked }: { visible: boolean; onClose: () => void; onUnlocked: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { unlock, getLockedUntil } = useCreatorMode();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setValue('');
    setMessage(null);
    getLockedUntil().then(setLockedUntil).catch(() => setLockedUntil(0));
  }, [visible, getLockedUntil]);

  // compte a rebours du blocage
  useEffect(() => {
    if (!visible || lockedUntil <= Date.now()) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= lockedUntil) {
        setLockedUntil(0);
        setMessage(null);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [visible, lockedUntil]);

  const locked = lockedUntil > now;
  const wait = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const submit = async (raw: string, fromClipboard: boolean) => {
    if (busy || locked || !raw.trim()) return;
    setBusy(true);
    const r = await unlock(raw);
    setBusy(false);
    if (r.ok) {
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      if (fromClipboard) Clipboard.setStringAsync('').catch(() => {});
      setValue('');
      onUnlocked();
      return;
    }
    notificationAsync(NotificationFeedbackType.Error).catch(() => {});
    setValue('');
    setMessage(r.message);
    if (r.lockedUntil) {
      setNow(Date.now());
      setLockedUntil(r.lockedUntil);
    }
  };

  const paste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) {
        setMessage(traduire('Le presse-papiers est vide. Copie d’abord ton jeton.'));
        return;
      }
      await submit(text, true);
    } catch {
      setMessage(traduire('Le presse-papiers est illisible. Colle le jeton dans le champ.'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.5)', paddingTop: insets.top + 56, paddingHorizontal: 16 }}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={onClose} accessibilityLabel={traduire("Fermer")} />
        <View style={{ backgroundColor: c.background, borderRadius: 28, padding: 20, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={22} color={c.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={20} weight="black" tight>{traduire("Studio YOROI")}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("Colle ton jeton créateur")}</Ink>
            </View>
            <RoundButton icon="close" label={traduire("Fermer")} onPress={onClose} />
          </View>

          <TextInput
            ref={input}
            value={value}
            onChangeText={(v) => {
              setValue(v);
              if (message && !locked) setMessage(null);
            }}
            placeholder={traduire("Jeton")}
            placeholderTextColor={c.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            editable={!locked && !busy}
            returnKeyType="done"
            onSubmitEditing={() => void submit(value, false)}
            accessibilityLabel={traduire("Jeton créateur")}
            style={{ minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: message ? c.danger : c.border, backgroundColor: c.surface, paddingHorizontal: 14, fontSize: 16, color: c.ink }}
          />

          {message || locked ? (
            <Ink size={13} weight="bold" color={c.danger}>
              {locked ? traduirePluriel(wait, wait > 1, "Trop d’essais. Réessaie dans {0} seconde.", "Trop d’essais. Réessaie dans {0} secondes.", wait) : message}
            </Ink>
          ) : (
            <Ink size={13} color={c.textMuted}>{traduire("Le jeton est dans le dossier privé de ton ordinateur. Il n’est jamais affiché ici.")}</Ink>
          )}

          <Button tone="accent" icon="doc" label={traduire("Coller et ouvrir")} onPress={() => void paste()} loading={busy} disabled={locked} />
          {value.trim() ? <Button tone="ghost" label={traduire("Ouvrir avec le jeton saisi")} onPress={() => void submit(value, false)} disabled={locked || busy} /> : null}
        </View>
      </View>
    </Modal>
  );
}

export default TokenSheet;
