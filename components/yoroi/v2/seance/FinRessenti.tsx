/**
 * Saisie rapide sur l'ecran de fin : note de la seance (1 a 5), ressenti,
 * et pour les sports de combat la note technique. Chaque appui enregistre.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { MOODS, loadRessenti, saveRessenti } from '@/lib/v2/seance/ressenti';
import type { Ressenti } from '@/lib/v2/seance/ressenti';

const STAR = 'M12 3.2l2.7 5.5 6 .9-4.35 4.2 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z';

const RATING_WORDS = ['', 'Séance à oublier', 'Séance moyenne', 'Séance correcte', 'Bonne séance', 'Excellente séance'];
const TECH_WORDS = ['', 'À revoir', 'Fragile', 'Correcte', 'Propre', 'Parfaite'];

function tap(success?: boolean) {
  try {
    if (success) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.selectionAsync();
  } catch {
    // retour haptique indisponible
  }
}

function Stars({ value, onChange, label, color, track }: { value: number | null; onChange: (n: number | null) => void; label: string; color: string; track: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 5, now: value ?? 0 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(value === n ? null : n)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${label} : ${n} sur 5`}
            accessibilityState={{ selected: value === n }}
            style={({ pressed }) => ({ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.88 : 1 }] })}
          >
            <Svg width={40} height={40} viewBox="0 0 24 24">
              <Path d={STAR} fill={on ? color : 'none'} stroke={on ? color : track} strokeWidth={1.7} strokeLinejoin="round" />
            </Svg>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FinRessenti({ trainingId, combat }: { trainingId: number; combat: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [r, setR] = useState<Ressenti>({ rating: null, mood: null, technique: null });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!trainingId) return;
    loadRessenti(trainingId).then((x) => {
      if (x) setR(x);
    });
  }, [trainingId]);

  const update = (patch: Partial<Ressenti>) => {
    const next = { ...r, ...patch };
    setR(next);
    tap(next.rating !== null && next.mood !== null && (!combat || next.technique !== null));
    if (!trainingId) return;
    saveRessenti(trainingId, next).then(() => setSaved(true));
  };

  const anything = r.rating !== null || r.mood !== null || r.technique !== null;

  return (
    <View style={{ marginHorizontal: 22, marginTop: 10, borderRadius: 22, padding: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Ink size={17} weight="black" tight style={{ flexShrink: 1 }}>Ta note et ton ressenti</Ink>
        <Ink size={12} weight="bold" color={saved && anything ? c.successText : c.textMuted}>
          {saved && anything ? 'Enregistré' : 'Un appui suffit'}
        </Ink>
      </View>

      <View style={{ gap: 4 }}>
        <Stars value={r.rating} onChange={(n) => update({ rating: n })} label="Note de la séance" color={c.gold} track={c.border} />
        <Ink size={13} weight="bold" color={r.rating ? c.ink : c.textMuted} style={{ textAlign: 'center' }}>
          {r.rating ? RATING_WORDS[r.rating] : 'Note ta séance'}
        </Ink>
      </View>

      <View style={{ height: 1, backgroundColor: c.divider }} />

      <View style={{ gap: 10 }}>
        <Ink size={14} weight="extraBold" color={c.textSecondary}>Ton ressenti</Ink>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MOODS.map((m, mi) => {
            const on = r.mood === m.value;
            const level = MOODS.length - mi;
            return (
              <Pressable
                key={m.value}
                onPress={() => update({ mood: on ? null : m.value })}
                accessibilityRole="button"
                accessibilityLabel={m.label}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ flex: 1, minHeight: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.fillSoft, borderWidth: 1, borderColor: on ? c.accent : 'transparent' })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 22 }} accessibilityElementsHidden importantForAccessibility="no">
                  {[0, 1, 2, 3, 4].map((b) => (
                    <View key={b} style={{ width: 4, height: 6 + b * 4, borderRadius: 2, backgroundColor: b < level ? (on ? c.onAccent : c.ink) : on ? 'rgba(255,255,255,0.3)' : c.border }} />
                  ))}
                </View>
                <Ink size={11} weight="bold" color={on ? c.onAccent : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{m.label}</Ink>
              </Pressable>
            );
          })}
        </View>
      </View>

      {combat ? (
        <>
          <View style={{ height: 1, backgroundColor: c.divider }} />
          <View style={{ gap: 4 }}>
            <Ink size={14} weight="extraBold" color={c.textSecondary}>Ta technique</Ink>
            <Stars value={r.technique} onChange={(n) => update({ technique: n })} label="Note technique" color={c.indigo} track={c.border} />
            <Ink size={13} weight="bold" color={r.technique ? c.ink : c.textMuted} style={{ textAlign: 'center' }}>
              {r.technique ? TECH_WORDS[r.technique] : 'Elle nourrit ton radar de progression'}
            </Ink>
          </View>
        </>
      ) : null}
    </View>
  );
}
