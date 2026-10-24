/**
 * Les grands chiffres de la seance (24 octobre 2026) : au plus trois tuiles qui comptent jusqu'a leur valeur.
 * Le lecteur d'ecran lit directement la valeur finale. Sans animation : la valeur finale tout de suite.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import type { IconName } from '@/components/yoroi/v2/seance/Icon';
import { valeurMontee } from './logique';

export type TuileVue = {
  cle: string;
  cible: number;
  decimales?: number;
  label: string;
  icone: IconName;
  /** met en forme la valeur courante du compteur */
  format: (v: number) => string;
};

const DUREE = 950;

/** Avancee 0 a 1 d'un compteur, au rythme de l'ecran */
function useAvancee(lance: boolean, delai: number): number {
  const [t, setT] = useState(lance ? 0 : 1);
  useEffect(() => {
    if (!lance) {
      setT(1);
      return;
    }
    let raf = 0;
    let debut = 0;
    const pas = (now: number) => {
      if (!debut) debut = now;
      const x = Math.min(1, Math.max(0, (now - debut - delai) / DUREE));
      setT(x);
      if (x < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [lance, delai]);
  return t;
}

function Tuile({ t, i, anime, pret }: { t: TuileVue; i: number; anime: boolean; pret: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const avancee = useAvancee(pret && anime, 300 + i * 120);
  const v = pret ? valeurMontee(t.cible, avancee, t.decimales ?? 0) : 0;
  const finale = t.format(t.cible);
  return (
    <Animated.View
      entering={anime ? FadeInDown.delay(260 + i * 90).duration(360) : undefined}
      accessible
      accessibilityLabel={`${finale}, ${t.label}`}
      style={{ flex: 1, minWidth: 0, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 8 }}
    >
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={t.icone} size={17} color={c.accent} strokeWidth={2.4} />
      </View>
      <Ink size={26} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>
        {pret ? t.format(v) : finale}
      </Ink>
      <Ink size={12} weight="bold" color={c.textMuted} numberOfLines={1}>{t.label}</Ink>
    </Animated.View>
  );
}

export function TuilesStats({ tuiles, anime, pret }: { tuiles: TuileVue[]; anime: boolean; pret: boolean }) {
  if (!tuiles.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 22, marginTop: 12 }}>
      {tuiles.map((t, i) => (
        <Tuile key={t.cle} t={t} i={i} anime={anime} pret={pret} />
      ))}
    </View>
  );
}
