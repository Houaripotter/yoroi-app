/**
 * Briques des ecrans du corps en v2 : en-tete avec retour rond, etiquette de source,
 * feuille de saisie d'une valeur (valeur et jour), encart Premium.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import type { IconName } from '@/components/yoroi/v2/seance/Icon';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { frDay, parseDay, sourceOf } from '@/lib/v2/seance/corps';
import { isoDay } from '@/lib/v2/seance/format';
import { P, blancA } from '@/components/yoroi/livePalette';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export function CorpsHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode; kanji?: string }) {
  const router = useRouter();
  // 16 octobre 2026 : barre compacte figee, retour et titre sur la meme ligne
  return <EnTete titre={title} sousTitre={sub} droite={right} onRetour={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))} zoneSure="insets" />;
}

export function RoundBtn({ icon, label, onPress, tone }: { icon: IconName; label: string; onPress: () => void; tone?: 'accent' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tone === 'accent' ? (pressed ? c.accentPressed : c.accent) : pressed ? P.white : blancA(0.86), borderWidth: tone === 'accent' ? 0 : 1, borderColor: P.white, shadowColor: '#1D2029', shadowOpacity: tone === 'accent' ? 0 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: tone === 'accent' ? 0 : 2 })}>
      <Icon name={icon} size={20} color={tone === 'accent' ? '#FFFFFF' : c.ink} strokeWidth={2.4} />
    </Pressable>
  );
}

export function SourceTag({ source }: { source?: string | null }) {
  const s = sourceOf(source);
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: `${s.color}14` }}>
      <Ink size={11} weight="extraBold" color={s.color}>{s.label}</Ink>
    </View>
  );
}

/** Saisie d'une valeur et de son jour */
export function ValueSheet({
  visible, onClose, title, unit, initialValue, initialDate, onSave, onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  unit: string;
  initialValue?: number | null;
  initialDate?: string;
  onSave: (value: number, date: string) => void;
  onDelete?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setValue(initialValue ? String(initialValue).replace('.', DECIMAL) : '');
    setDate(frDay(initialDate ?? isoDay(new Date())));
    setError('');
  }, [visible, initialValue, initialDate]);

  const submit = () => {
    const n = parseFloat(value.replace(',', '.'));
    const d = parseDay(date);
    if (!Number.isFinite(n) || n <= 0) return setError(traduire('Écris une valeur, par exemple 72,5.'));
    if (!d) return setError(traduire('Écris le jour comme ceci : 12/03/2026.'));
    onSave(n, d);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 4 }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          autoFocus
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={c.textMuted}
          accessibilityLabel={`${title} en ${unit}`}
          style={[fontStyle('black'), { flex: 1, fontSize: 48, color: c.ink, paddingVertical: 0, borderBottomWidth: 2, borderColor: c.accent }]}
        />
        <Ink size={20} weight="bold" color={c.textSecondary} style={{ paddingBottom: 8 }}>{unit}</Ink>
      </View>
      <View style={{ gap: 6 }}>
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Jour")}</Ink>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="12/03/2026"
          placeholderTextColor={c.textMuted}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel={traduire("Jour de la mesure")}
          style={[fontStyle('bold'), { height: 50, fontSize: 16, color: c.ink, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
        />
      </View>
      {error ? <Ink size={13} weight="bold" color={c.danger} style={{ paddingHorizontal: 4 }}>{error}</Ink> : null}
      <Pressable onPress={submit} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}>
        <Ink size={16} weight="extraBold" color={c.onAccent}>{traduire("Enregistrer")}</Ink>
      </Pressable>
      {onDelete ? (
        <Pressable onPress={onDelete} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={14} weight="bold" color={c.danger}>{traduire("Supprimer")}</Ink>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

export function PremiumTeaser({ hidden, what }: { hidden: number; what: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (hidden <= 0) return null;
  return (
    <Pressable onPress={() => ouvrirPaywall('periode_longue', hidden)} accessibilityRole="button" style={({ pressed }) => ({ marginTop: 6, padding: 16, borderRadius: 22, backgroundColor: c.goldTint, borderWidth: 1, borderColor: 'rgba(197,157,69,0.4)', gap: 4, opacity: pressed ? 0.85 : 1 })}>
      <Ink size={15} weight="extraBold" color={c.goldDeep}>{traduire("Encore {0} {1} avec Premium", hidden, what)}</Ink>
      <Ink size={13} color={c.textSecondary}>{traduire("Tout ton historique, sans limite. Touche pour voir.")}</Ink>
    </Pressable>
  );
}
