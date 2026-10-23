/**
 * Apercu miniature du nouvel accueil : en-tete compact, carte Aujourd'hui,
 * prochain entrainement, les blocs choisis dans l'ordre.
 */
import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { AccueilBloc, SceneId } from '@/lib/v2/espace';
import { adjustableBlocs, blocMeta } from '@/lib/v2/espace/blocs';
import { personnageImage, sceneMeta } from './assets';
import { Icon } from './ui';
import type { IconName } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';

type Props = {
  blocs: AccueilBloc[];
  scene: SceneId;
  personnage: string;
  rankIndex: number;
  width?: number;
  highlight?: AccueilBloc | null;
};

const ACCENT = '#2C4A84';

function Bar({ w, h, color, k }: { w: number; h: number; color: string; k: number }) {
  return <View style={{ width: w * k, height: h * k, borderRadius: (h * k) / 2, backgroundColor: color }} />;
}

export function AccueilPreview({ blocs, scene, personnage, rankIndex, width = 170, highlight }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const k = width / 170;
  const height = Math.round(360 * k);
  const list = adjustableBlocs(blocs);
  const shown = list.slice(0, 3);
  const t = (n: number) => n * k;

  return (
    <View
      style={{ width, height, borderRadius: t(26), borderWidth: t(5), borderColor: c.ink, backgroundColor: c.background, overflow: 'hidden' }}
      accessible
      accessibilityLabel={`Aperçu de ton accueil : ta journée, ton prochain entraînement${shown.length ? `, puis ${shown.map((b) => blocMeta(b).label).join(', ')}` : ''}`}
    >
      {/* bandeau de scene, discret */}
      <Image source={sceneMeta(scene).image} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: t(70), opacity: 0.3 }} resizeMode="cover" />

      <View style={{ paddingHorizontal: t(9), paddingTop: t(14), gap: t(5) }}>
        {/* en-tete compact */}
        <View style={{ flexDirection: 'row', alignItems: 'center', height: t(26) }}>
          <View style={{ flex: 1, gap: t(3) }}>
            <Bar w={22} h={3} color={c.textMuted} k={k} />
            <Bar w={52} h={7} color={c.ink} k={k} />
          </View>
          <View style={{ width: t(22), height: t(22), borderRadius: t(11), borderWidth: t(1.8), borderColor: P.white, backgroundColor: c.border, overflow: 'hidden' }}>
            {/* Vague 45 : « Sans personnage », une icone de personne sobre dans le petit rond */}
            {aUnPersonnage(personnage) ? (
              <Image source={personnageImage(personnage, rankIndex)} style={{ position: 'absolute', width: t(46), height: t(60), left: t(-13), top: t(-1) }} resizeMode="contain" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentTint }}>
                <Icon name="user" size={t(12)} color={c.accent} stroke={2.2} />
              </View>
            )}
          </View>
        </View>

        {/* carte Aujourd'hui */}
        <View style={{ borderRadius: t(11), backgroundColor: P.white, borderWidth: 1, borderColor: c.border, padding: t(7), gap: t(5) }}>
          <Ink size={t(8)} weight="black" allowFontScaling={false}>Aujourd’hui</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: t(2) }}>
              <Ink size={t(13)} weight="black" tight allowFontScaling={false}>78,8</Ink>
              <Bar w={30} h={2.5} color={c.textMuted} k={k} />
            </View>
            <Svg width={t(56)} height={t(20)} viewBox="0 0 56 20">
              <Path d="M2 5 C12 4 14 10 22 9 C30 8 34 14 42 13 C48 12 50 16 54 16" stroke={c.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />
              <Circle cx={54} cy={16} r={2.2} fill={ACCENT} />
            </Svg>
          </View>
          <View style={{ height: 1, backgroundColor: c.divider }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={t(11)} weight="black" tight allowFontScaling={false}>2 / 3</Ink>
            <View style={{ flexDirection: 'row', gap: t(2) }}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ width: t(3), height: t(10), borderRadius: t(1.5), backgroundColor: i < 2 ? c.ink : c.border }} />
              ))}
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: c.divider }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t(6) }}>
            <Svg width={t(18)} height={t(18)} viewBox="0 0 18 18">
              <Circle cx={9} cy={9} r={7.5} stroke="#EBC9C6" strokeWidth={2.4} fill="none" />
              <Circle cx={9} cy={9} r={4.5} stroke="#E8DCB8" strokeWidth={2.4} fill="none" />
            </Svg>
            <View style={{ gap: t(2) }}>
              <Bar w={46} h={2.5} color={c.textMuted} k={k} />
              <Bar w={30} h={2.5} color={c.border} k={k} />
            </View>
          </View>
        </View>

        {/* prochain entrainement */}
        <View style={{ height: t(30), borderRadius: t(10), backgroundColor: c.ink, paddingHorizontal: t(7), justifyContent: 'center', gap: t(3), overflow: 'hidden' }}>
          <Bar w={34} h={2.5} color="#E9A6A0" k={k} />
          <Bar w={62} h={5} color={c.background} k={k} />
          <View style={{ position: 'absolute', right: t(6), top: t(5), width: t(20), height: t(20), borderRadius: t(10), backgroundColor: '#262A35' }} />
        </View>

        {/* deux boutons */}
        <View style={{ flexDirection: 'row', gap: t(4) }}>
          <View style={{ flex: 1.15, height: t(13), borderRadius: t(5), backgroundColor: ACCENT }} />
          <View style={{ flex: 1, height: t(13), borderRadius: t(5), backgroundColor: P.white, borderWidth: 1, borderColor: c.border }} />
        </View>

        {/* blocs choisis */}
        <Ink size={t(7.5)} weight="black" color={c.ink} allowFontScaling={false} style={{ marginTop: t(2) }}>Ton suivi</Ink>
        {shown.length === 0 ? (
          <View style={{ borderRadius: t(8), borderWidth: 1, borderStyle: 'dashed', borderColor: c.border, padding: t(6) }}>
            <Ink size={t(7.5)} weight="bold" color={c.textMuted} allowFontScaling={false}>Aucun bloc en plus</Ink>
          </View>
        ) : (
          shown.map((b) => {
            const m = blocMeta(b);
            const on = highlight === b;
            return (
              <View
                key={b}
                style={{
                  borderRadius: t(8),
                  backgroundColor: on ? c.ink : P.carte,
                  borderWidth: 1,
                  borderColor: on ? c.ink : c.border,
                  paddingHorizontal: t(6),
                  height: t(19),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t(4),
                }}
              >
                <Icon name={m.icon as IconName} size={t(9)} color={on ? P.paper : c.accent} stroke={2.6} />
                <Ink size={t(8)} weight="extraBold" color={on ? P.paper : c.ink} numberOfLines={1} allowFontScaling={false} style={{ flex: 1 }}>{m.label}</Ink>
              </View>
            );
          })
        )}
        {list.length > shown.length ? <Ink size={t(7.5)} weight="bold" color={c.textMuted} allowFontScaling={false}>{`et ${list.length - shown.length} de plus`}</Ink> : null}

      </View>
    </View>
  );
}
