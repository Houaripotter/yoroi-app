/**
 * Cadre de l'ecran Ton profil (vague 18).
 * - En haut, ta scene (celle choisie dans Reglages, Scene) en bandeau, ton personnage debout a droite,
 *   ta photo cerclee (contour au choix depuis la vague 41, Fin par defaut) a cheval sur le bas du bandeau, ton prenom en grand, puis "Membre depuis".
 * - Une barre du haut fixe : retour rond et titre. Son fond papier apparait des que tu defiles,
 *   pour que rien ne passe sous l'heure ni sous la Dynamic Island.
 */
import React from 'react';
import { Image, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { GUTTER, Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { SCENE_FOCUS, SCENE_RATIO, sceneForNow, sceneIsDark } from '@/components/yoroi/v2/accueil/images';
import type { SceneId } from '@/lib/v2/espace';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { RondCadre, styleRondDe } from '@/components/yoroi/v2/reglages/contour';
import { RondInitiales } from '@/components/yoroi/v2/espace/RondInitiales';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { traduire } from '@/lib/i18n/tr';

/** Hauteur du bandeau illustre : la scene descend sous l'heure */
function bannerHeight(top: number): number {
  return top + 196;
}

const PHOTO = 132;

export function ProfilEcran({ hero, children, footer }: { hero: (top: number) => React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const fadeStart = Math.max(30, bannerHeight(insets.top) - insets.top - 150);
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [fadeStart, fadeStart + 60], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [fadeStart + 60, fadeStart + 120], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: footer ? 24 : insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {hero(insets.top)}
        <View style={{ paddingHorizontal: GUTTER, gap: 18, paddingTop: 6 }}>{children}</View>
      </Animated.ScrollView>

      {/* barre du haut fixe : fond papier qui masque la zone de l'heure des que le contenu defile */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 58 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.background, borderBottomWidth: 1, borderColor: c.divider }, barStyle]} />
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 6, height: 44, flexDirection: 'row', alignItems: 'center' }}>
          <RoundButton icon="back" label={traduire("Retour")} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))} />
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 52, right: 52, alignItems: 'center' }, titleStyle]}>
            <Ink size={17} weight="extraBold" numberOfLines={1}>{traduire("Ton profil")}</Ink>
          </Animated.View>
        </View>
      </View>

      {footer ? (
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: insets.bottom + 12, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.divider }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

/** Petit losange d'or, pour encadrer "Membre depuis" */
function Losange({ color }: { color: string }) {
  return (
    <Svg width={8} height={8} viewBox="0 0 8 8">
      <Path d="M4 0 L8 4 L4 8 L0 4 Z" fill={color} />
    </Svg>
  );
}

export function ProfilHero({ top, scene, photo, personnage, onPhoto, name, onName, since }: {
  top: number;
  scene: SceneId;
  photo: string | null;
  /** illustration du personnage choisi : dans la scene si tu as une photo, dans le rond sinon */
  personnage: ImageSourcePropType;
  onPhoto: () => void;
  name: string;
  onName: (v: string) => void;
  since: string | null;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const now = new Date();
  const dark = sceneIsDark(scene, now);
  // vague 41 : le contour choisi dans Reglages, le meme qu'a l'accueil. 28 octobre 2026 : le vrai cadre partage
  // (RondCadre), avant un bord fait main ici qui ne connaissait que Fin, Or et Indigo (les autres couleurs devenaient
  // indigo) ; la forme, l'epaisseur et le badge suivent aussi, avec la photo comme avec le personnage
  const { espace } = useEspace();
  const styleRond = styleRondDe(espace);
  const H = bannerHeight(top);

  // recadrage : l'image couvre le bandeau, son motif (chateau, torii, temple) reste au centre
  const imgH = Math.max(H, width / SCENE_RATIO);
  const imgW = imgH * SCENE_RATIO;
  const focus = SCENE_FOCUS[scene] ?? 0.5;
  const shift = Math.max(0, Math.min(imgW - width, focus * imgW - width * 0.5));

  // personnage a droite, sans toucher la photo (le dessin occupe 21 % a 83 % de son image)
  const charH = 150;
  const charW = charH * 0.75;
  const charRight = -charW * 0.14;
  const charLeft = width - charRight - charW + charW * 0.21;
  const photoRight = width / 2 + PHOTO / 2 + 6;
  // Vague 45 : « Sans personnage », aucune figure dans la scene, les initiales dans le rond sans photo
  const sansPerso = !aUnPersonnage(espace.personnage);
  const showChar = !sansPerso && !!photo && charLeft >= photoRight;

  return (
    <View>
      <View style={{ height: H, overflow: 'hidden', backgroundColor: dark ? '#1E2336' : c.background }}>
        <Image source={sceneForNow(scene, now)} style={{ position: 'absolute', top: 0, left: -shift, width: imgW, height: imgH }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <LinearGradient
          pointerEvents="none"
          colors={dark ? ['rgba(20,24,38,0.45)', 'rgba(20,24,38,0)'] : ['rgba(242,241,236,0.5)', 'rgba(242,241,236,0)']}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top + 50 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(242,241,236,0)', 'rgba(242,241,236,0.75)', c.background]}
          locations={[0, 0.6, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.42 }}
        />
        {showChar ? (
          <Image source={personnage} style={{ position: 'absolute', right: charRight, bottom: 0, width: charW, height: charH }} resizeMode="contain" accessibilityLabel={traduire("Ton personnage")} />
        ) : null}
      </View>

      {/* ta photo, a cheval sur le bas de la scene */}
      <View style={{ alignItems: 'center', marginTop: -PHOTO / 2 - 10, gap: 10 }}>
        <Pressable onPress={onPhoto} accessibilityRole="button" accessibilityLabel={traduire("Changer ta photo")} style={{ width: PHOTO, height: PHOTO }}>
          <View style={{ width: PHOTO, height: PHOTO, shadowColor: c.ink, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <RondCadre size={PHOTO} {...styleRond} fond="scene" fill={c.fillSoft}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
            ) : sansPerso ? (
              <RondInitiales size={PHOTO} nom={name} />
            ) : (
              <BusteRond source={personnage} />
            )}
            </RondCadre>
          </View>
          {/* l'appareil photo en bas a droite, le badge du rond en haut a droite : jamais l'un sur l'autre */}
          <View style={{ position: 'absolute', right: 2, bottom: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary, borderWidth: 3, borderColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={18} color={c.onPrimary} stroke={2.4} />
          </View>
        </Pressable>

        <TextInput
          value={name}
          onChangeText={onName}
          placeholder={traduire("Ton prénom")}
          placeholderTextColor={c.textMuted}
          maxLength={40}
          accessibilityLabel={traduire("Ton prénom")}
          style={{ fontSize: 34, fontWeight: '900', letterSpacing: -1.2, color: c.ink, textAlign: 'center', minWidth: 200, maxWidth: width - 2 * GUTTER, paddingVertical: 2, borderBottomWidth: 2, borderColor: name.trim() ? 'transparent' : c.accent }}
        />

        {since ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LinearGradient colors={[`${c.gold}00`, c.gold]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: 34, height: 1.5 }} />
            <Losange color={c.gold} />
            <Ink size={14} weight="bold" color={c.textSecondary} style={{ fontStyle: 'italic', letterSpacing: 0.2 }}>{since}</Ink>
            <Losange color={c.gold} />
            <LinearGradient colors={[c.gold, `${c.gold}00`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: 34, height: 1.5 }} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
