/**
 * Les sections repliables de « En détail » (onglet Séances, maquette A, 28 octobre 2026) : un carré pastel avec son
 * sticker, le titre, un résumé qui reste lisible une fois la section fermée, et le rond du chevron.
 * L'état ouvert ou fermé de chaque section est retenu sur le téléphone (AsyncStorage, clé CLE_SECTIONS).
 * Pendant la visite guidée, les sections qu'elle montre restent ouvertes (forcee).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { CarreSticker, useCarteA } from './kitA';
import type { TeinteA } from './kitA';
import { tap } from './ui';
import { traduire } from '@/lib/i18n/tr';

export const CLE_SECTIONS = 'yoroi.seances.sections.v1';
export type IdSection = 'derniere' | 'mesSeances' | 'mois' | 'muscles' | 'records';
export const SECTIONS_OUVERTES_PAR_DEFAUT: Record<IdSection, boolean> = { derniere: true, mesSeances: false, mois: false, muscles: true, records: false };

/** L'état ouvert ou fermé des sections, retenu ; toutOuvrir et toutFermer pour « Tout replier » */
export function useSectionsOuvertes(): {
  ouvert: Record<IdSection, boolean>;
  basculer: (id: IdSection) => void;
  toutes: (v: boolean) => void;
} {
  const [ouvert, setOuvert] = useState<Record<IdSection, boolean>>(SECTIONS_OUVERTES_PAR_DEFAUT);
  useEffect(() => {
    let vivant = true;
    AsyncStorage.getItem(CLE_SECTIONS)
      .then((v) => {
        if (!vivant || !v) return;
        const lu = JSON.parse(v) as Partial<Record<IdSection, boolean>>;
        setOuvert((o) => {
          const n = { ...o };
          (Object.keys(n) as IdSection[]).forEach((k) => {
            if (typeof lu[k] === 'boolean') n[k] = lu[k] as boolean;
          });
          return n;
        });
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);
  const ecrire = (n: Record<IdSection, boolean>) => {
    AsyncStorage.setItem(CLE_SECTIONS, JSON.stringify(n)).catch(() => {});
    return n;
  };
  const basculer = useCallback((id: IdSection) => setOuvert((o) => ecrire({ ...o, [id]: !o[id] })), []);
  const toutes = useCallback((v: boolean) => setOuvert((o) => ecrire(Object.fromEntries(Object.keys(o).map((k) => [k, v])) as Record<IdSection, boolean>)), []);
  return { ouvert, basculer, toutes };
}

export function SectionRepliable({ titre, resume, sticker, teinte, ouvert, onBasculer, enTete, children }: {
  titre: string;
  /** le résumé, sous le titre (texte ou petit dessin) ; il reste visible une fois ouvert */
  resume?: React.ReactNode;
  sticker: NomSticker;
  teinte: TeinteA;
  ouvert: boolean;
  onBasculer: () => void;
  /** à côté du titre (une pastille « Nouveau ») */
  enTete?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  return (
    <View style={carte}>
      <Pressable
        onPress={() => { tap(); onBasculer(); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        accessibilityLabel={titre}
        accessibilityHint={ouvert ? traduire('Touche pour replier') : traduire('Touche pour déplier')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
      >
        <CarreSticker nom={sticker} teinte={teinte} taille={44} rayon={15} />
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Ink size={16} weight="black" tight>{titre}</Ink>
            {enTete}
          </View>
          {typeof resume === 'string' ? <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ lineHeight: 17 }}>{resume}</Ink> : resume}
        </View>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d={ouvert ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} stroke={c.textMuted} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </Pressable>
      {ouvert && children ? (
        <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)} style={{ marginTop: 12 }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}
