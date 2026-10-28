/**
 * Rubriques teintees de la page Ton profil (28 octobre 2026, maquette validee « le melange », bas de C) :
 * Ton objectif en peche, Sur le tapis en menthe, Tes preferences en lilas. Petit losange et petites capitales
 * colorees, lignes a sticker (ou icone selon le reglage Illustrations), segment pastel.
 */
import React from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

export type TeinteRubrique = 'peche' | 'menthe' | 'lilas' | 'or';

/** fond, titre, texte du segment inactif ; en sombre, des teintes profondes */
export function teinteRubrique(t: TeinteRubrique, sombre: boolean): { fond: string; titre: string; doux: string; voile: string; ligne: string } {
  if (sombre) {
    if (t === 'peche') return { fond: '#3A2B27', titre: '#F2A68A', doux: '#D9B3A5', voile: 'rgba(255,255,255,0.08)', ligne: 'rgba(255,255,255,0.08)' };
    if (t === 'menthe') return { fond: '#21332A', titre: '#7CCFA2', doux: '#A6CDB8', voile: 'rgba(255,255,255,0.08)', ligne: 'rgba(255,255,255,0.08)' };
    if (t === 'or') return { fond: '#3A3222', titre: '#E3C47B', doux: '#CDB88A', voile: 'rgba(255,255,255,0.08)', ligne: 'rgba(255,255,255,0.08)' };
    return { fond: '#30283A', titre: '#D9A3CC', doux: '#C2AFC9', voile: 'rgba(255,255,255,0.08)', ligne: 'rgba(255,255,255,0.08)' };
  }
  if (t === 'peche') return { fond: '#FFE1D6', titre: '#B4471E', doux: '#8A5A48', voile: 'rgba(255,255,255,0.55)', ligne: 'rgba(29,32,51,0.07)' };
  if (t === 'menthe') return { fond: '#E3F2EA', titre: '#1C6B45', doux: '#4F7A63', voile: 'rgba(255,255,255,0.6)', ligne: 'rgba(29,32,51,0.07)' };
  if (t === 'or') return { fond: '#F6EEDD', titre: '#A57A1C', doux: '#8A6B2A', voile: 'rgba(255,255,255,0.6)', ligne: 'rgba(29,32,51,0.07)' };
  return { fond: '#EFE6F3', titre: '#8A3F78', doux: '#7A5A72', voile: 'rgba(255,255,255,0.6)', ligne: 'rgba(29,32,51,0.07)' };
}

export function Losange({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Path d="M4 0 L8 4 L4 8 L0 4 Z" fill={color} />
    </Svg>
  );
}

/** Petites capitales colorees, avec ou sans losange */
export function Capitales({ children, color, losange = true }: { children: string; color: string; losange?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {losange ? <Losange color={color} /> : null}
      <Ink size={11} weight="extraBold" color={color} style={{ letterSpacing: 1.4 }} accessibilityRole="header">{children.toUpperCase()}</Ink>
    </View>
  );
}

export function Rubrique({ teinte, titre, sous, children, padBas = 2 }: { teinte: TeinteRubrique; titre: string; sous?: string; children: React.ReactNode; padBas?: number }) {
  const { theme, isDark } = useYoroiTheme();
  const t = teinteRubrique(teinte, isDark);
  return (
    <View style={{ backgroundColor: t.fond, borderRadius: 26, paddingTop: 14, paddingHorizontal: 14, paddingBottom: padBas }}>
      <Capitales color={t.titre}>{titre}</Capitales>
      {sous ? <Ink size={12.5} weight="bold" color={theme.colors.textSecondary} style={{ marginTop: 2 }}>{sous}</Ink> : null}
      {children}
    </View>
  );
}

/** Le sticker d'une ligne, ou son icone en Encre japonaise */
export function StickerOuIcone({ sticker, icon, size = 34 }: { sticker: NomSticker; icon: IconName; size?: number }) {
  const illus = useIllustrations();
  const { theme } = useYoroiTheme();
  if (illus.stickers) return <Image source={illus.img(sticker)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: theme.colors.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size * 0.54} />
    </View>
  );
}

/** Ligne de rubrique : sticker, libelle, sous titre, valeur ou champ, unite, chevron */
export function LigneRubrique({ sticker, icon, label, sub, value, unit, muted, first, onPress, extra, ligne, input, a11y, lignesValeur = 1 }: {
  sticker: NomSticker;
  icon: IconName;
  label: string;
  sub?: string;
  value?: string;
  unit?: string;
  muted?: boolean;
  first?: boolean;
  onPress?: () => void;
  extra?: React.ReactNode;
  /** couleur du filet entre deux lignes */
  ligne: string;
  /** champ de saisie a droite (poids) */
  input?: TextInputProps;
  a11y?: string;
  /** une valeur longue (nom de club) peut passer sur deux lignes */
  lignesValeur?: number;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const contenu = (
    <>
      <StickerOuIcone sticker={sticker} icon={icon} />
      <View style={lignesValeur > 1 ? { flexShrink: 0, gap: 1 } : { flex: 1, minWidth: 0, gap: 1 }}>
        <Ink size={15} weight="extraBold" numberOfLines={2}>{label}</Ink>
        {sub ? <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{sub}</Ink> : null}
      </View>
      {extra}
      {input ? (
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={c.textMuted}
          style={{ width: 84, flexShrink: 0, height: 44, textAlign: 'right', fontSize: 16.5, fontWeight: '800', color: c.ink }}
        />
      ) : value ? (
        <Ink size={muted ? 14 : 16.5} weight={muted ? 'bold' : 'extraBold'} color={muted ? c.textMuted : c.ink} numberOfLines={lignesValeur} style={lignesValeur > 1 ? { flex: 1, textAlign: 'right' } : { maxWidth: '46%', textAlign: 'right' }}>{value}</Ink>
      ) : null}
      {unit ? <Ink size={13} weight="bold" color={c.textMuted}>{unit}</Ink> : null}
      {onPress ? <Icon name="chevron" size={15} color={c.textMuted} stroke={2.4} /> : null}
    </>
  );
  const style = { minHeight: 56, paddingVertical: 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, borderTopWidth: first ? 0 : 1, borderColor: ligne };
  if (!onPress) return <View style={style}>{contenu}</View>;
  return (
    <Pressable
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? (value ? `${label}, ${value}` : label)}
      style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}
    >
      {contenu}
    </Pressable>
  );
}

/** Segment pastel : pastille blanche sur l'option active */
export function SegmentTeinte<T extends string>({ options, value, onChange, teinte, petit }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; teinte: TeinteRubrique; petit?: boolean }) {
  const { theme, isDark } = useYoroiTheme();
  const t = teinteRubrique(teinte, isDark);
  const H = petit ? 44 : 48;
  return (
    <View accessibilityRole="radiogroup" style={{ marginTop: petit ? 10 : 12, height: H, padding: 4, borderRadius: H / 2, backgroundColor: t.voile, flexDirection: 'row', gap: 2 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => { selectionAsync().catch(() => {}); onChange(o.key); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={{ flex: 1, borderRadius: (H - 8) / 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: on ? (isDark ? theme.colors.surface : '#FFFFFF') : 'transparent', shadowColor: t.titre, shadowOpacity: on ? 0.14 : 0, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
          >
            <Ink size={petit ? 13 : 14} weight="extraBold" color={on ? t.titre : t.doux} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{o.label}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
