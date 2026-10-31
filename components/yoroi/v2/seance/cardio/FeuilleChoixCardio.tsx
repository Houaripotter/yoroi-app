/**
 * Feuille « Ton cardio » (31 octobre 2026, Houari : « j'aimerais choisir ce que je fais »). Le type dans une liste
 * fermee (lib/v2/seances/cardioChoix.ts), la duree en boutons rapides ou libre, et « Passer le cardio aujourd'hui ».
 * Le choix est garde pour ce jour du programme par l'ecran qui l'ouvre.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';
import { DUREES_RAPIDES, MINUTES_MAX, MINUTES_MIN, TYPES_CARDIO, bornerMinutes } from '@/lib/v2/seances/cardioChoix';
import type { ChoixCardio, TypeCardio } from '@/lib/v2/seances/cardioChoix';

type Props = {
  visible: boolean;
  depart: ChoixCardio;
  onValider: (c: ChoixCardio) => void;
  onPasser: () => void;
  onFermer: () => void;
};

export function FeuilleChoixCardio({ visible, depart, onValider, onPasser, onFermer }: Props) {
  return (
    <Sheet visible={visible} onClose={onFermer} title={traduire('Ton cardio')} scroll>
      <ContenuChoixCardio depart={depart} onValider={onValider} onPasser={onPasser} />
    </Sheet>
  );
}

/** Le contenu de la feuille, a part pour le rendu des maquettes */
export function ContenuChoixCardio({ depart, onValider, onPasser }: Omit<Props, 'visible' | 'onFermer'>) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [type, setType] = useState<TypeCardio>(depart.type);
  const [minutes, setMinutes] = useState(depart.minutes);
  const [libre, setLibre] = useState(!(DUREES_RAPIDES as readonly number[]).includes(depart.minutes));
  useEffect(() => {
    setType(depart.type);
    setMinutes(depart.minutes);
    setLibre(!(DUREES_RAPIDES as readonly number[]).includes(depart.minutes));
  }, [depart.type, depart.minutes]);

  const pastille = (on: boolean) => ({ backgroundColor: on ? ton('peche').fond : c.fillSoft, borderWidth: 2, borderColor: on ? ton('peche').encre : 'transparent' });

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 10 }}>
        <Ink size={14} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire('Ce que tu fais')}</Ink>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TYPES_CARDIO.map((t) => {
            const on = t.id === type;
            return (
              <Pressable
                key={t.id}
                onPress={() => { setType(t.id); selectionAsync().catch(() => {}); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={traduire(t.label)}
                style={({ pressed }) => [{ width: '48%', flexGrow: 1, minHeight: 64, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, opacity: pressed ? 0.85 : 1 }, pastille(on)]}
              >
                <StickerOuIcone sticker={t.sticker as NomSticker} icon="timer" size={38} />
                <Ink size={15} weight={on ? 'black' : 'extraBold'} color={on ? ton('peche').encre : c.ink} style={{ flex: 1 }} numberOfLines={2}>{traduire(t.label)}</Ink>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Ink size={14} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire('Combien de temps')}</Ink>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DUREES_RAPIDES.map((m) => {
            const on = !libre && m === minutes;
            return (
              <Pressable
                key={m}
                onPress={() => { setLibre(false); setMinutes(m); selectionAsync().catch(() => {}); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={traduire('{0} min', m)}
                style={({ pressed }) => [{ flex: 1, minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }, pastille(on)]}
              >
                <Ink size={19} weight="black" color={on ? ton('peche').encre : c.ink}>{String(m)}</Ink>
                <Ink size={11} weight="bold" color={on ? ton('peche').encre : c.textSecondary}>{traduire('min')}</Ink>
              </Pressable>
            );
          })}
        </View>
        {libre ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
            <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire('Autre durée')}</Ink>
            <Stepper value={minutes} step={1} min={MINUTES_MIN} max={MINUTES_MAX} unit={traduire('minutes')} size={22} button={42} format={(v) => traduire('{0} min', v)} onChange={(v) => setMinutes(bornerMinutes(v) ?? minutes)} />
          </View>
        ) : (
          <Pressable onPress={() => setLibre(true)} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Une autre durée')}</Ink>
          </Pressable>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Pressable
          onPress={() => onValider({ type, minutes: bornerMinutes(minutes) ?? 30 })}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}
        >
          <Ink size={17} weight="black" color={c.onPrimary}>{traduire('{0}, {1} min', traduire(TYPES_CARDIO.find((t) => t.id === type)?.label ?? ''), bornerMinutes(minutes) ?? 30)}</Ink>
        </Pressable>
        <Pressable onPress={onPasser} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
          <Ink size={15} weight="extraBold" color={c.textSecondary}>{traduire('Passer le cardio aujourd’hui')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}
