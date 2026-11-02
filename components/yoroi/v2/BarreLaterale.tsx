/**
 * Barre laterale du mode grand ecran (30 octobre 2026, maquette _propositions/grand_ecran_2026-10-30/accueil.png
 * validee par Houari). Sur Mac et iPad en grande fenetre, elle remplace la barre d'onglets du bas (InkTabBar, qui
 * reste celle de l'iPhone) : le nom YOROI, le bouton Enregistrer (le meme + que sur iPhone), Accueil, Seances,
 * Progres, Dojo, puis Reglages et ton rond de profil en bas. L'onglet ouvert est une pilule pastel, comme sur iPhone.
 * 30 octobre 2026 (valide par Houari) : avec le reglage Illustrations sur Stickers, les onglets prennent les memes
 * stickers que sur iPhone (torii, musculation, bilan, kabuto) et Reglages l'engrenage, toujours en pleine couleur ;
 * l'onglet ouvert garde sa pilule pastel avec un sticker un peu plus grand. En Encre japonaise, les icones reviennent.
 * 31 octobre 2026 (Houari : « mets-les sur les côtés », « stickers, pas d'icônes ») : toujours les stickers. De 700 a
 * 1023 points (iPad en portrait, Split View), la barre compacte de 84 points : le +, les stickers des onglets, Reglages
 * et ton rond de profil ; le nom de chaque onglet apparait au survol (Mac, trackpad de l'iPad) ou a l'appui long, et
 * le sticker liste en haut deplie la barre large par dessus la page. A partir de 1024, la barre large, comme avant.
 * Ancienne version : _archive_ancien_design_2026-10-09/grand_ecran_v2_2026-10-31/components/yoroi/v2/BarreLaterale.tsx
 */
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
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
import { LARGEUR_BARRE_COMPACTE, LARGEUR_BARRE_LATERALE } from '@/lib/v2/nav/grandEcran';
import { useModeEcran } from '@/lib/v2/nav/useGrandEcran';
import { useCoffrePret } from '@/components/yoroi/v2/dojo/useCoffrePret';
import { traduire } from '@/lib/i18n/tr';
import { STICKERS, type NomSticker } from '@/components/yoroi/v2/stickers';

const ONGLETS: Record<string, { label: string; sticker: NomSticker }> = {
  index: { label: 'Accueil', sticker: 'torii' },
  seances: { label: 'Séances', sticker: 'musculation' },
  progres: { label: 'Progrès', sticker: 'bilan' },
  dojo: { label: 'Dojo', sticker: 'kabuto' },
};
const ORDRE = ['index', 'seances', 'progres', 'dojo'];

type Props = BottomTabBarProps & { onPressAdd: () => void };

/** Le sticker d'un onglet en pleine couleur : 30 ouvert, 26 sinon (la ligne garde sa hauteur) */
/** 2 novembre 2026 : le point d'or de l'onglet Dojo quand le coffre du jour attend */
function PointCoffre({ haut, droite }: { haut: number; droite: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return <View pointerEvents="none" style={{ position: 'absolute', top: haut, right: droite, width: 11, height: 11, borderRadius: 6, borderWidth: 2, backgroundColor: c.gold, borderColor: c.surface }} />;
}

function StickerOnglet({ nom, ouvert }: { nom: NomSticker; ouvert?: boolean }) {
  const t = ouvert ? 30 : 26;
  return <Image source={STICKERS[nom]} style={{ width: t, height: t, margin: (21 - t) / 2 }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

/** La barre large (1024 points et plus, ou depliee par dessus la page) */
function BarreLarge({ state, navigation, onPressAdd, onChoisi }: Props & { onChoisi?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, armure } = useIdentite();
  const prenom = profile?.name?.trim().split(' ')[0] || traduire('Athlète');
  const coffrePret = useCoffrePret();

  const onglet = (name: string) => {
    const index = state.routes.findIndex((r) => r.name === name);
    if (index < 0) return null;
    const route = state.routes[index];
    const focused = state.index === index;
    const icon = ONGLETS[name];
    const onPress = () => {
      selectionAsync().catch(() => {});
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      onChoisi?.();
    };
    return (
      <TourAnchor key={name} id={`onglet.${name}`} rayon="rond">
        <Pressable
          onPress={onPress}
          accessibilityRole="tab"
          accessibilityLabel={name === 'dojo' && coffrePret && !focused ? traduire('Dojo, ton coffre est prêt') : traduire(icon.label)}
          accessibilityState={{ selected: focused }}
          style={({ pressed }) => [styles.ligne, focused ? { backgroundColor: c.primary } : pressed ? { backgroundColor: c.accentTint } : null]}
        >
          <StickerOnglet nom={icon.sticker} ouvert={focused} />
          <Ink size={15.5} weight={focused ? 'black' : 'extraBold'} color={focused ? c.onPrimary : c.textSecondary} numberOfLines={1}>
            {traduire(icon.label)}
          </Ink>
          {name === 'dojo' && coffrePret && !focused ? <PointCoffre haut={8} droite={12} /> : null}
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
            onChoisi?.();
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
          onChoisi?.();
          router.push('/settings' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire('Réglages')}
        style={({ pressed }) => [styles.ligne, pressed ? { backgroundColor: c.accentTint } : null]}
      >
        <StickerOnglet nom="engrenage" />
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

/** Le nom d'un onglet de la barre compacte, au survol ou a l'appui long : une bulle a droite du sticker */
function Bulle({ texte }: { texte: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View pointerEvents="none" style={[styles.bulle, { backgroundColor: c.ink }]}>
      <Ink size={13.5} weight="extraBold" color={c.background} numberOfLines={1}>
        {texte}
      </Ink>
    </View>
  );
}

/** Un bouton de la barre compacte : son sticker, sa pilule pastel quand il est ouvert, son nom en bulle */
function Case({ nom, libelle, ouvert, onPress, enfant, point }: { nom?: NomSticker; libelle: string; ouvert?: boolean; onPress: () => void; enfant?: React.ReactNode; point?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [bulle, setBulle] = useState(false);
  return (
    <View style={{ zIndex: bulle ? 30 : 1 }}>
      <Pressable
        onPress={() => {
          setBulle(false);
          onPress();
        }}
        onLongPress={() => setBulle(true)}
        onPressOut={() => setTimeout(() => setBulle(false), 900)}
        onHoverIn={() => setBulle(true)}
        onHoverOut={() => setBulle(false)}
        accessibilityRole={ouvert === undefined ? 'button' : 'tab'}
        accessibilityLabel={libelle}
        accessibilityState={ouvert === undefined ? undefined : { selected: ouvert }}
        style={({ pressed }) => [styles.case, ouvert ? { backgroundColor: c.primary } : pressed || bulle ? { backgroundColor: c.accentTint } : null]}
      >
        {enfant ?? (nom ? <Image source={STICKERS[nom]} style={{ width: ouvert ? 34 : 30, height: ouvert ? 34 : 30 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null)}
        {point ? <PointCoffre haut={6} droite={6} /> : null}
      </Pressable>
      {bulle ? <Bulle texte={libelle} /> : null}
    </View>
  );
}

/** La barre compacte (700 a 1023 points) : les stickers seuls */
function BarreCompacte({ state, navigation, onPressAdd, onDeplier }: Props & { onDeplier: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, armure } = useIdentite();
  const prenom = profile?.name?.trim().split(' ')[0] || traduire('Athlète');
  const coffrePret = useCoffrePret();
  return (
    <TourAnchor id="onglet.barre" style={[styles.compacte, { backgroundColor: c.surface, borderRightColor: c.border, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 16 }]}>
      <Case nom="liste" libelle={traduire('Ouvrir le menu')} onPress={() => { selectionAsync().catch(() => {}); onDeplier(); }} />
      <TourAnchor id="onglet.plus" rayon="rond">
        <Case
          libelle={traduire('Enregistrer')}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
            onPressAdd();
          }}
          enfant={
            <View style={[styles.plusRond, { backgroundColor: c.accent, shadowColor: c.accent }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M12 5v14M5 12h14" stroke={c.onAccent} strokeWidth={3} strokeLinecap="round" />
              </Svg>
            </View>
          }
        />
      </TourAnchor>
      <View style={{ gap: 8, marginTop: 6 }} accessibilityRole="tablist">
        {ORDRE.map((name) => {
          const index = state.routes.findIndex((r) => r.name === name);
          if (index < 0) return null;
          const route = state.routes[index];
          const focused = state.index === index;
          return (
            <TourAnchor key={name} id={`onglet.${name}`} rayon={20}>
              <Case
                nom={ONGLETS[name].sticker}
                libelle={name === 'dojo' && coffrePret && !focused ? traduire('Dojo, ton coffre est prêt') : traduire(ONGLETS[name].label)}
                ouvert={focused}
                point={name === 'dojo' && coffrePret && !focused}
                onPress={() => {
                  selectionAsync().catch(() => {});
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            </TourAnchor>
          );
        })}
      </View>
      <View style={[styles.separation, { backgroundColor: c.border, width: 40, alignSelf: 'center', marginHorizontal: 0 }]} />
      <Case nom="engrenage" libelle={traduire('Réglages')} onPress={() => { selectionAsync().catch(() => {}); router.push('/settings' as any); }} />
      <View style={{ marginTop: 'auto', alignItems: 'center' }} accessible accessibilityLabel={prenom}>
        <RondProfil photo={null} personnage="" rankIndex={Math.max(0, Math.min(4, armure?.rank.index ?? 0))} nom={prenom} taille={44} />
      </View>
    </TourAnchor>
  );
}

/**
 * La barre laterale du grand ecran : compacte de 700 a 1023 points (depliable par dessus la page), large ensuite.
 * La fenetre qui change (rotation de l'iPad, Split View, fenetre du Mac) la fait passer de l'une a l'autre en direct.
 */
export function BarreLaterale(props: Props) {
  const mode = useModeEcran();
  const [depliee, setDepliee] = useState(false);
  useEffect(() => {
    if (mode !== 'compact') setDepliee(false);
  }, [mode]);
  if (mode !== 'compact') return <BarreLarge {...props} />;
  const fermer = () => setDepliee(false);
  return (
    <>
      <BarreCompacte {...props} onDeplier={() => setDepliee(true)} />
      <Modal visible={depliee} transparent animationType="fade" onRequestClose={fermer} supportedOrientations={['portrait', 'landscape']}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={styles.ombreDepliee}>
            <BarreLarge {...props} onChoisi={fermer} />
          </View>
          <Pressable onPress={fermer} accessibilityRole="button" accessibilityLabel={traduire('Fermer le menu')} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.32)' }} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  barre: { width: LARGEUR_BARRE_LATERALE, height: '100%', borderRightWidth: 1, paddingHorizontal: 16, gap: 6 },
  compacte: { width: LARGEUR_BARRE_COMPACTE, height: '100%', borderRightWidth: 1, alignItems: 'center', gap: 8, zIndex: 20, overflow: 'visible' },
  case: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  plusRond: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  bulle: { position: 'absolute', left: 66, top: 15, height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', zIndex: 40, shadowColor: '#1B2A44', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  ombreDepliee: { height: '100%', shadowColor: '#1B2A44', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 8, height: 0 }, elevation: 12 },
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
