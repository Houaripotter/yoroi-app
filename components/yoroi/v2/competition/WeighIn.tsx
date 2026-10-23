/**
 * Carte de la pesee officielle : categorie, poids maximum, ta derniere pesee et l'ecart a combler.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Icon, P, Press } from '@/components/yoroi/v2/accueil/kit';
import { Hanko } from '@/components/yoroi/v2/ornements/screens';
import { formatKg } from '@/lib/v2/weightStats';
import { mediumDate, parseLocalDate } from '@/lib/v2/competition/dates';

export function WeighInCard({ categorie, poidsMax, weight, weightDate, daysLeft, onWeigh, onCut, peseeLabel }: { categorie?: string; poidsMax?: number; weight?: number | null; weightDate?: string; daysLeft: number; onWeigh: () => void; onCut?: () => void; peseeLabel?: string }) {
  const open = !poidsMax || poidsMax >= 900;
  const gap = weight && poidsMax && !open ? weight - poidsMax : null;
  const inside = gap !== null && gap <= 0;
  const perWeek = gap !== null && gap > 0 && daysLeft > 0 ? (gap / daysLeft) * 7 : null;
  const W = 300;
  // Jauge : de max - 4 kg a max + 6 kg
  const lo = (poidsMax ?? 0) - 4;
  const hi = (poidsMax ?? 0) + 6;
  const xOf = (v: number) => 14 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (W - 28);

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: P.indigoSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="scale" size={22} color={P.indigo} />
        </View>
        <View style={{ flex: 1 }}>
          <Ink size={12} weight="bold" color={P.muted}>
            {peseeLabel ? `Pesée officielle, ${peseeLabel}` : 'Pesée officielle'}
          </Ink>
          <Ink size={19} weight="black" tight>
            {categorie ? (open ? `${categorie}, sans limite` : `${categorie}, ${formatKg(poidsMax!)} kg max`) : 'Catégorie à choisir'}
          </Ink>
        </View>
        {inside ? <Hanko size={40} /> : null}
      </View>

      {weight ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Ink size={40} weight="black" tight>
                {formatKg(weight)}
                <Ink size={15} weight="bold" color={P.muted}>
                  {' kg'}
                </Ink>
              </Ink>
              <Ink size={12} weight="bold" color={P.ink2}>
                {weightDate ? `Ta dernière pesée, le ${mediumDate(parseLocalDate(weightDate), false)}` : 'Ta dernière pesée'}
              </Ink>
            </View>
            {gap !== null ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Ink size={22} weight="black" tight color={inside ? P.mossText : P.danger}>
                  {inside ? `${formatKg(-gap)} kg` : `${formatKg(gap)} kg`}
                </Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {inside ? 'de marge' : 'à perdre'}
                </Ink>
              </View>
            ) : null}
          </View>
          {poidsMax && !open ? (
            <Svg width="100%" height={34} viewBox={`0 0 ${W} 34`}>
              <Path d={`M14 17 H${W - 14}`} stroke={P.line} strokeWidth={10} strokeLinecap="round" />
              <Path d={`M14 17 H${xOf(poidsMax)}`} stroke={P.moss} strokeWidth={10} strokeLinecap="round" opacity={0.55} />
              <Line x1={xOf(poidsMax)} y1={3} x2={xOf(poidsMax)} y2={31} stroke={P.ink} strokeWidth={2.5} strokeLinecap="round" />
              <Circle cx={xOf(weight)} cy={17} r={8} fill={inside ? P.mossText : P.danger} stroke={P.white} strokeWidth={3} />
            </Svg>
          ) : null}
          {perWeek !== null ? (
            <Ink size={13} weight="bold" color={P.ink2}>
              {perWeek > 1 ? `Soit ${formatKg(perWeek)} kg par semaine : c'est beaucoup. Parles-en à ton coach avant de couper.` : `Soit environ ${formatKg(perWeek)} kg par semaine d'ici le jour J.`}
            </Ink>
          ) : null}
        </>
      ) : (
        <Ink size={14} weight="medium" color={P.ink2}>
          Pèse-toi pour savoir où tu en es par rapport à ta catégorie.
        </Ink>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Press onPress={onWeigh} accessibilityRole="button" accessibilityLabel="Me peser" style={{ flex: 1 }}>
          <View style={{ minHeight: 48, borderRadius: 16, backgroundColor: P.paper, borderWidth: 1, borderColor: P.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="plus" size={18} />
            <Ink size={15} weight="extraBold">
              Me peser
            </Ink>
          </View>
        </Press>
        {onCut && gap !== null && gap > 0 ? (
          <Press onPress={onCut} accessibilityRole="button" accessibilityLabel="Préparer ma coupe de poids" style={{ flex: 1 }}>
            <View style={{ minHeight: 48, borderRadius: 16, backgroundColor: P.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 }}>
              <Icon name="scale" size={18} color={P.accent} />
              <Ink size={15} weight="extraBold" color={P.accent} numberOfLines={1}>
                Ma coupe
              </Ink>
            </View>
          </Press>
        ) : null}
      </View>
    </Card>
  );
}
