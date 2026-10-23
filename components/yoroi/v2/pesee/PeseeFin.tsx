/**
 * Fin de pesee (vague 26) : le plaisir de l'ancienne jauge de poids, juste apres l'enregistrement.
 * Le poids au centre d'une jauge en arc vers ton objectif (pourcentage atteint), puis Perdu ou Pris,
 * Objectif, Reste, l'ecart avec ta pesee precedente et ta tendance, et un bouton pour revenir.
 * Sans objectif : Depart, Aujourd'hui, Ecart, et un lien pour fixer ton objectif.
 * Tout vient de tes pesees et de ton profil, rien n'est estime.
 */
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { StampButton } from '@/components/yoroi/v2/progres/ui';
import { formatKg, formatLongDate } from '@/lib/v2/weightStats';
import { goalProgress } from '@/lib/v2/accueil/projection';
import { blancA } from '@/components/yoroi/livePalette';

export type PeseeFinData = {
  date: string;
  weight: number;
  previous: number | null;
  start: number | null;
  target: number | null;
  weeklyRate: number | null;
};

const W = 264;
const R = 112;
const STROKE = 16;
const CX = W / 2;
const CY = R + STROKE / 2 + 2;
const H = CY + 8;

function arcPath(): string {
  return `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
}

function kgOrGrams(v: number, step = 1): string {
  const a = Math.abs(v);
  return a >= 1 ? `${formatKg(a)} kg` : `${Math.round((a * 1000) / step) * step} g`;
}

function Tile({ label, value, unit, color }: { label: string; value: string; unit?: string; color?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 18, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: c.divider, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{label}</Ink>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Ink size={21} weight="black" tight color={color ?? c.ink} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{value}</Ink>
        {unit ? <Ink size={12} weight="bold" color={c.textSecondary}>{unit}</Ink> : null}
      </View>
    </View>
  );
}

function Line({ label, text, color, last }: { label: string; text: string; color?: string; last?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: c.divider, gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary}>{label}</Ink>
      <Ink size={16} weight="extraBold" color={color ?? c.ink}>{text}</Ink>
    </View>
  );
}

export function PeseeFin({ data, onDone, onSetGoal, onShare }: { data: PeseeFinData; onDone: () => void; onSetGoal: () => void; onShare?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { weight, previous, start, target, weeklyRate } = data;

  // meme regle que la carte Poids de l'accueil (goalProgress) : sur la pesee du jour
  const hasGoal = !!(target && target > 0 && start && start > 0);
  const gp = hasGoal ? goalProgress(start!, target!, weight) : null;
  const losing = gp ? gp.losing : true;
  const pct = gp ? gp.pct : 0;
  const pctText = `${Math.round(pct * 100)}${' '}%`;
  const left = gp ? gp.left : 0;
  const reached = !!gp && gp.reached;
  const fromStart = start && start > 0 ? weight - start : null;

  // Ecart avec la pesee precedente : couleur de reussite quand ca va vers l'objectif, jamais de rouge
  const diff = previous !== null ? weight - previous : null;
  const good = (d: number) => (losing ? d < 0 : d > 0);
  const diffText = diff === null ? 'C’est ta première pesée' : Math.abs(diff) < 0.05 ? 'Le même poids' : `${kgOrGrams(diff)} de ${diff < 0 ? 'moins' : 'plus'}`;
  const diffColor = diff !== null && Math.abs(diff) >= 0.05 && hasGoal && good(diff) ? c.successText : c.ink;
  const rateText =
    weeklyRate === null
      ? null
      : Math.abs(weeklyRate) < 0.05
        ? 'Stable'
        : `${kgOrGrams(weeklyRate, 10)} de ${weeklyRate < 0 ? 'moins' : 'plus'} par semaine`;
  const rateColor = weeklyRate !== null && Math.abs(weeklyRate) >= 0.05 && hasGoal && good(weeklyRate) ? c.successText : c.ink;

  const arcLen = Math.PI * R;
  const angle = Math.PI * (1 - pct);
  const dotX = CX + R * Math.cos(angle);
  const dotY = CY - R * Math.sin(angle);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110, paddingHorizontal: 22 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ENTREE} style={{ gap: 18 }}>
          <View style={{ alignItems: 'center', gap: 2 }} accessibilityLiveRegion="polite">
            <Ink size={22} weight="black" tight accessibilityRole="header">Pesée enregistrée</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{formatLongDate(data.date)}</Ink>
          </View>

          {hasGoal ? (
            <View style={{ alignItems: 'center' }} accessible accessibilityLabel={`${formatKg(weight)} kilos, ${reached ? 'objectif atteint' : `${Math.round(pct * 100)} pour cent du chemin vers ton objectif`}`}>
              <View style={{ width: W, height: H }}>
                <Svg width={W} height={H}>
                  <Path d={arcPath()} stroke={c.fillSubtle} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
                  {pct > 0.005 ? (
                    <Path d={arcPath()} stroke={c.accent} strokeWidth={STROKE} strokeLinecap="round" fill="none" strokeDasharray={`${arcLen * pct} ${arcLen}`} />
                  ) : null}
                  <Circle cx={dotX} cy={dotY} r={STROKE / 2 + 3} fill="#FFFFFF" stroke={c.accent} strokeWidth={3} />
                </Svg>
                <View style={{ position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Ink size={56} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{formatKg(weight)}</Ink>
                    <Ink size={17} weight="bold" color={c.textSecondary}>kg</Ink>
                  </View>
                </View>
              </View>
              <View style={{ width: W + 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Ink size={12} weight="bold" color={c.textMuted}>{`départ ${formatKg(start!)}`}</Ink>
                <Ink size={12} weight="bold" color={c.textMuted}>{`objectif ${formatKg(target!)}`}</Ink>
              </View>
              <View style={{ marginTop: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, backgroundColor: c.indigoTint }}>
                <Ink size={15} weight="extraBold" color={c.accent}>{reached ? 'Objectif atteint' : `${pctText} du chemin vers ton objectif`}</Ink>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Ink size={72} weight="black" tight style={{ fontVariant: ['tabular-nums'] }}>{formatKg(weight)}</Ink>
                <Ink size={18} weight="bold" color={c.textSecondary}>kg</Ink>
              </View>
            </View>
          )}

          {hasGoal ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Tile label={fromStart !== null && fromStart > 0 ? 'Pris' : 'Perdu'} value={formatKg(Math.abs(fromStart ?? 0))} unit="kg" />
              <Tile label="Objectif" value={formatKg(target!)} unit="kg" />
              <Tile label="Reste" value={reached ? 'Atteint' : formatKg(left)} unit={reached ? undefined : 'kg'} color={reached ? c.successText : undefined} />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Tile label="Départ" value={start ? formatKg(start) : formatKg(weight)} unit="kg" />
                <Tile label="Aujourd’hui" value={formatKg(weight)} unit="kg" />
                <Tile label="Écart" value={fromStart !== null && Math.abs(fromStart) >= 0.05 ? `${fromStart < 0 ? '−' : '+'}${formatKg(Math.abs(fromStart))}` : '0'} unit="kg" />
              </View>
              <Pressable onPress={onSetGoal} accessibilityRole="link" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={14} weight="extraBold" color={c.accent}>Fixer ton objectif de poids</Ink>
              </Pressable>
            </View>
          )}

          <View style={{ borderRadius: 20, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: c.divider, paddingHorizontal: 16 }}>
            <Line label="Depuis ta dernière pesée" text={diffText} color={diffColor} last={!rateText} />
            {rateText ? <Line label="Ta tendance sur 4 semaines" text={rateText} color={rateColor} last /> : null}
          </View>
        </Animated.View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 20, flexDirection: 'row', gap: 10 }}>
        {onShare ? (
          <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Partager ta pesée en carte" style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : blancA(0.92), borderWidth: 1, borderColor: c.border })}>
            <Ink size={16} weight="extraBold">Partager</Ink>
          </Pressable>
        ) : null}
        <View style={{ flex: onShare ? 1.4 : 1 }}>
          <StampButton label="Terminer" onPress={onDone} />
        </View>
      </View>
    </View>
  );
}
