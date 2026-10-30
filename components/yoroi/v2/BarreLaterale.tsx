/**
 * Barre laterale du mode grand ecran (30 octobre 2026, maquette _propositions/grand_ecran_2026-10-30/accueil.png
 * validee par Houari). Sur Mac et iPad en grande fenetre, elle remplace la barre d'onglets du bas (InkTabBar, qui
 * reste celle de l'iPhone) : le nom YOROI, le bouton Enregistrer (le meme + que sur iPhone), Accueil, Seances,
 * Progres, Dojo, puis Reglages et ton rond de profil en bas. L'onglet ouvert est une pilule pastel, comme sur iPhone.
 * 30 octobre 2026 (valide par Houari) : avec le reglage Illustrations sur Stickers, les onglets prennent les memes
 * stickers que sur iPhone (torii, musculation, bilan, kabuto) et Reglages l'engrenage, toujours en pleine couleur ;
 * l'onglet ouvert garde sa pilule pastel avec un sticker un peu plus grand. En Encre japonaise, les icones reviennent.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync, impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { Ink } from './Ink';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { RondProfil } from '@/components/yoroi/v2/accueil/Scene';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { LARGEUR_BARRE_LATERALE } from '@/lib/v2/nav/grandEcran';
import { traduire } from '@/lib/i18n/tr';
import { STICKERS, useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

const ICONS: Record<string, { label: string; d: string[]; join?: boolean; sticker: NomSticker }> = {
  index: { label: 'Accueil', d: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'], join: true, sticker: 'torii' },
  seances: { label: 'Séances', d: ['M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11'], sticker: 'musculation' },
  progres: { label: 'Progrès', d: ['M3 17l5-5 4 3 8-8', 'M15 7h5v5'], join: true, sticker: 'bilan' },
  dojo: { label: 'Dojo', d: ['M3 6h18M5 9.5h14M7 6v15M17 6v15'], sticker: 'kabuto' },
};
const ORDRE = ['index', 'seances', 'progres', 'dojo'];
/** la roue dentee de Reglages */
const ROUE = [
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
];

type Props = BottomTabBarProps & { onPressAdd: () => void };

/** Le sticker d'un onglet en pleine couleur : 30 ouvert, 26 sinon (la ligne garde sa hauteur) */
function StickerOnglet({ nom, ouvert }: { nom: NomSticker; ouvert?: boolean }) {
  const t = ouvert ? 30 : 26;
  return <Image source={STICKERS[nom]} style={{ width: t, height: t, margin: (21 - t) / 2 }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

function Icone({ d, couleur, join }: { d: string[]; couleur: string; join?: boolean }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      {d.map((p) => (
        <Path key={p} d={p} stroke={couleur} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin={join ? 'round' : undefined} />
      ))}
    </Svg>
  );
}

export function BarreLaterale({ state, navigation, onPressAdd }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, armure } = useIdentite();
  const prenom = profile?.name?.trim().split(' ')[0] || traduire('Athlète');
  const illus = useIllustrations();

  const onglet = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    const route = state.routes[index];
    const focused = state.index === index;
    const icon = ICONS[name];
    const onPress = () => {
      selectionAsync().catch(() => {});
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <TourAnchor key={name} id={`onglet.${name}`} rayon="rond">
        <Pressable
          onPress={onPress}
          accessibilityRole="tab"
          accessibilityLabel={traduire(icon.label)}
          accessibilityState={{ selected: focused }}
          style={({ pressed }) => [styles.ligne, focused ? { backgroundColor: c.primary } : pressed ? { backgroundColor: c.accentTint } : null]}
        >
          {illus.stickers ? <StickerOnglet nom={icon.sticker} ouvert={focused} /> : <Icone d={icon.d} join={icon.join} couleur={focused ? c.onPrimary : c.textSecondary} />}
          <Ink size={15.5} weight={focused ? 'black' : 'extraBold'} color={focused ? c.onPrimary : c.textSecondary} numberOfLines={1}>
            {traduire(icon.label)}
          </Ink>
        </Pressable>
      </TourAnchor>
    );
  };

  return (
    <TourAnchor id="onglet.barre" style={[styles.barre, { backgroundColor: c.surface, borderRightColor: c.border, paddingTop: insets.top + 22, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.marque} accessibilityRole="header">
        <Ink size={22} weight="black" color={c.ink} style={{ letterSpacing: 3 }}>
          YOROI
        </Ink>
      </View>

      <TourAnchor id="onglet.plus" rayon="rond">
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
            onPressAdd();
          }}
          accessibilityRole="button"
          accessibilityLabel={traduire('Enregistrer une séance, une pesée ou une mesure')}
          style={({ pressed }) => [styles.plus, { backgroundColor: pressed ? c.accentPressed : c.accent, shadowColor: c.accent, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M12 5v14M5 12h14" stroke={c.onAccent} strokeWidth={2.8} strokeLinecap="round" />
          </Svg>
          <Ink size={16} weight="black" color={c.onAccent}>
            {traduire('Enregistrer')}
          </Ink>
        </Pressable>
      </TourAnchor>

      <View style={{ gap: 6 }} accessibilityRole="tablist">
        {ORDRE.map(onglet)}
      </View>

      <View style={[styles.separation, { backgroundColor: c.border }]} />

      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          router.push('/settings' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire('Réglages')}
        style={({ pressed }) => [styles.ligne, pressed ? { backgroundColor: c.accentTint } : null]}
      >
        {illus.stickers ? <StickerOnglet nom="engrenage" /> : <Icone d={ROUE} join couleur={c.textSecondary} />}
        <Ink size={15.5} weight="extraBold" color={c.textSecondary} numberOfLines={1}>
          {traduire('Réglages')}
        </Ink>
      </Pressable>

      <View style={[styles.profil, { backgroundColor: c.background }]}>
        <RondProfil photo={null} personnage="" rankIndex={Math.max(0, Math.min(4, armure?.rank.index ?? 0))} nom={prenom} taille={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Ink size={14} weight="black" color={c.ink} numberOfLines={1}>
            {prenom}
          </Ink>
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>
            {traduire('Ton profil')}
          </Ink>
        </View>
      </View>
    </TourAnchor>
  );
}

const styles = StyleSheet.create({
  barre: { width: LARGEUR_BARRE_LATERALE, height: '100%', borderRightWidth: 1, paddingHorizontal: 16, gap: 6 },
  marque: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 18 },
  plus: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ligne: { height: 46, borderRadius: 23, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  separation: { height: 1, marginVertical: 10, marginHorizontal: 8 },
  profil: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18 },
});
