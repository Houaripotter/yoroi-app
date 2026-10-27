/**
 * Ta note et ton ressenti, en version compacte (24 octobre 2026) : les memes donnees que FinRessenti
 * (note sur 5, ressenti, note technique en combat), enregistrees a chaque appui (lib/v2/seance/ressenti).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { MOODS, loadRessenti, saveRessenti } from '@/lib/v2/seance/ressenti';
import type { Ressenti } from '@/lib/v2/seance/ressenti';
import { traduire } from '@/lib/i18n/tr';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';

const STAR = 'M12 3.2l2.7 5.5 6 .9-4.35 4.2 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z';
// cles francaises, traduites au rendu (la langue peut changer apres le chargement du module)
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

function Etoiles({ value, onChange, label, color, track }: { value: number | null; onChange: (n: number | null) => void; label: string; color: string; track: string }) {
  return (
    <View
      style={{ flexDirection: 'row', gap: 2 }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 5, now: value ?? 0 }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const v = value ?? 0;
        if (e.nativeEvent.actionName === 'increment' && v < 5) onChange(v + 1);
        if (e.nativeEvent.actionName === 'decrement' && v > 0) onChange(v - 1 > 0 ? v - 1 : null);
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const on = (value ?? 0) >= n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(value === n ? null : n)}
            accessibilityRole="button"
            accessibilityLabel={traduire("{0} : {1} sur 5", label, n)}
            accessibilityState={{ selected: value === n }}
            style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.86 : 1 }] })}
          >
            <Svg width={32} height={32} viewBox="0 0 24 24">
              <Path d={STAR} fill={on ? color : 'none'} stroke={on ? color : track} strokeWidth={1.7} strokeLinejoin="round" />
            </Svg>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NoteCompacte({ trainingId, combat }: { trainingId: number; combat: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [r, setR] = useState<Ressenti>({ rating: null, mood: null, technique: null });
  const [saved, setSaved] = useState(false);
  // un appui avant la fin du chargement : le chargement n'ecrase pas ton choix
  const touche = useRef(false);

  useEffect(() => {
    if (!trainingId) return;
    loadRessenti(trainingId)
      .then((x) => {
        if (x && !touche.current) setR(x);
      })
      .catch(() => {});
  }, [trainingId]);

  const update = (patch: Partial<Ressenti>) => {
    touche.current = true;
    const next = { ...r, ...patch };
    setR(next);
    tap(next.rating !== null && next.mood !== null && (!combat || next.technique !== null));
    if (!trainingId) return;
    saveRessenti(trainingId, next)
      .then(() => setSaved(true))
      .catch(() => {});
  };

  const anything = r.rating !== null || r.mood !== null || r.technique !== null;

  return (
    <View style={{ ...carteBlanche(c.surface, c.divider), marginHorizontal: 22, marginTop: 12, borderRadius: 22, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Ink size={17} weight="black" tight style={{ flexShrink: 1 }}>{traduire("Ta note et ton ressenti")}</Ink>
        <Ink size={12} weight="bold" color={saved && anything ? c.successText : c.textMuted}>
          {saved && anything ? traduire('Enregistré') : traduire('Un appui suffit')}
        </Ink>
      </View>

      <View style={{ alignItems: 'center', gap: 2 }}>
        <Etoiles value={r.rating} onChange={(n) => update({ rating: n })} label={traduire("Note de la séance")} color={c.gold} track={c.border} />
        <Ink size={13} weight="bold" color={r.rating ? c.ink : c.textMuted}>{r.rating ? traduire(RATING_WORDS[r.rating]) : traduire('Note ta séance')}</Ink>
      </View>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {MOODS.map((m) => {
          const on = r.mood === m.value;
          return (
            <Pressable
              key={m.value}
              onPress={() => update({ mood: on ? null : m.value })}
              accessibilityRole="button"
              accessibilityLabel={traduire(m.label)}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ flex: 1, minHeight: 44, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.fillSoft })}
            >
              <Ink size={12} weight="extraBold" color={on ? c.onPrimary : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{traduire(m.label)}</Ink>
            </Pressable>
          );
        })}
      </View>

      {combat ? (
        <View style={{ alignItems: 'center', gap: 2, paddingTop: 4, borderTopWidth: 1, borderColor: c.divider }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ marginTop: 8 }}>{traduire("Ta technique")}</Ink>
          <Etoiles value={r.technique} onChange={(n) => update({ technique: n })} label={traduire("Note technique")} color={c.indigo} track={c.border} />
          <Ink size={13} weight="bold" color={r.technique ? c.ink : c.textMuted}>{r.technique ? traduire(TECH_WORDS[r.technique]) : traduire('Elle nourrit ton radar de progression')}</Ink>
        </View>
      ) : null}
    </View>
  );
}
