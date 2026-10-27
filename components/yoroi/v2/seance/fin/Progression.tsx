/**
 * Un seul bloc pour ta progression (24 octobre 2026) : la semaine (X sur Y, jauge qui se remplit),
 * ta serie de semaines, ton rythme de l'annee, et l'ecart avec ta seance precedente en une ligne.
 * Remplace le topo ecrit, « Ton compteur » et « Par rapport au... » qui repetaient les memes chiffres.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import type { IconName } from '@/components/yoroi/v2/seance/Icon';
import { jaugeSemaine } from './logique';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';

function Jauge({ ratio, couleur, fond, hauteur, anime, delai }: { ratio: number; couleur: string; fond: string; hauteur: number; anime: boolean; delai: number }) {
  const p = useSharedValue(anime ? 0 : ratio);
  useEffect(() => {
    p.value = anime ? withDelay(delai, withTiming(ratio, { duration: 800, easing: Easing.out(Easing.cubic) })) : ratio;
  }, [anime, ratio, delai, p]);
  const style = useAnimatedStyle(() => ({ width: `${Math.round(p.value * 1000) / 10}%` as `${number}%` }));
  return (
    <View style={{ height: hauteur, borderRadius: hauteur / 2, backgroundColor: fond, overflow: 'hidden' }}>
      <Animated.View style={[{ height: hauteur, borderRadius: hauteur / 2, backgroundColor: couleur }, style]} />
    </View>
  );
}

function Ligne({ icone, couleur, fond, children }: { icone: IconName; couleur: string; fond: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icone} size={15} color={couleur} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, paddingTop: 3 }}>{children}</View>
    </View>
  );
}

export function Progression({
  fait,
  objectif,
  ligneSemaine,
  serie,
  annee,
  comparaison,
  anime,
}: {
  fait: number;
  /** 0 : pas d'objectif choisi */
  objectif: number;
  ligneSemaine: string;
  /** « 10 semaines d'affilée avec ton objectif tenu. », ou null */
  serie: string | null;
  annee: { fait: number; total: number; texte: string } | null;
  /** « Par rapport au 23 oct. : 10 min de plus, ... », ou null */
  comparaison: string | null;
  anime: boolean;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const j = jaugeSemaine(fait, objectif);
  const compte = objectif > 0 ? traduire("{0} sur {1}", fait, objectif) : traduirePluriel(fait, fait > 1, "{0} séance", "{0} séances", fait);
  const couleurJauge = j.atteint ? c.successText : c.accent;

  return (
    <Animated.View
      entering={anime ? FadeInDown.delay(420).duration(380) : undefined}
      style={{ ...carteBlanche(c.surface, c.divider), marginHorizontal: 22, marginTop: 12, borderRadius: 22, padding: 16, gap: 14 }}
    >
      <View style={{ gap: 10 }} accessible accessibilityLabel={`${traduire("Ta semaine")}, ${compte}. ${ligneSemaine}`}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <Ink size={17} weight="black" tight>{traduire("Ta semaine")}</Ink>
          <Ink size={22} weight="black" tight color={couleurJauge} style={{ fontVariant: ['tabular-nums'] }}>{compte}</Ink>
        </View>
        <Jauge ratio={j.ratio} couleur={couleurJauge} fond={c.fillSubtle} hauteur={12} anime={anime} delai={600} />
        <Ink size={14} weight="extraBold" color={j.atteint ? c.successText : c.textSecondary}>{ligneSemaine}</Ink>
      </View>

      {serie || annee || comparaison ? <View style={{ height: 1, backgroundColor: c.divider }} /> : null}

      {serie ? (
        <Ligne icone="flame" couleur={c.goldDeep} fond={c.goldTint}>
          <Ink size={14} weight="bold" color={c.ink}>{serie}</Ink>
        </Ligne>
      ) : null}

      {annee ? (
        <Ligne icone="route" couleur={c.indigo} fond={c.indigoTint}>
          <View style={{ gap: 6 }}>
            <Ink size={14} weight="bold" color={c.ink}>{annee.texte}</Ink>
            <Jauge ratio={Math.min(1, annee.total > 0 ? annee.fait / annee.total : 0)} couleur={c.indigo} fond={c.fillSubtle} hauteur={6} anime={anime} delai={800} />
          </View>
        </Ligne>
      ) : null}

      {comparaison ? (
        <Ligne icone="swap" couleur={c.accent} fond={c.accentTint}>
          <Ink size={14} weight="bold" color={c.ink}>{comparaison}</Ink>
        </Ligne>
      ) : null}
    </Animated.View>
  );
}
