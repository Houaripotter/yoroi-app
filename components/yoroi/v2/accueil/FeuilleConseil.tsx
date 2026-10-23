/**
 * La feuille du conseil du jour (17 octobre 2026). Houari : « quand je clique dessus c'est grave moche, la pop-up
 * ne donne vraiment pas envie, l'icône du conseil du jour est nulle ».
 * De haut en bas : la citation du jour en grand, dans le style choisi (meme typographie, meme ornement que la ligne
 * de l'accueil) ; le conseil du jour dans une carte : un blason dessine pour YOROI (un mon : double cercle et un motif
 * selon le sujet, tomoe pour l'elan, sept points pour la semaine, lune pour le repos, cible de kyudo, montagne,
 * balance), un titre fort, un texte court avec les chiffres cles en couleur ; l'action principale en vrai bouton
 * (« Lancer une séance » ouvre directement le +) ; « Masquer aujourd'hui » en lien discret.
 * Plus de bouton OK : on ferme en glissant vers le bas ou en touchant hors de la feuille.
 * Entree douce (fondu du voile, la feuille monte en 340 ms), coupee par « reduire les animations ».
 */
import React, { useEffect, useMemo } from 'react';
import { PanResponder, Pressable, View, useWindowDimensions } from 'react-native';
import Reanimated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Conseil, ConseilPicto } from '@/lib/v2/accueil/conseil';
import { morceauxConseil } from '@/lib/v2/accueil/conseil';
import type { StyleCitation } from '@/lib/v2/accueil/styleCitation';
import { CitationGrande } from './Citation';
import { teinte, domaineDuLien } from './domaines';
import { Icon, P, Press } from './kit';
import { traduire } from '@/lib/i18n/tr';

type Motif = 'tomoe' | 'semaine' | 'lune' | 'mato' | 'montagne' | 'balance';

const MOTIF_DU_PICTO: Record<ConseilPicto, Motif> = {
  play: 'tomoe',
  flame: 'tomoe',
  bolt: 'tomoe',
  steps: 'tomoe',
  calendar: 'semaine',
  repeat: 'semaine',
  check: 'semaine',
  refresh: 'semaine',
  moon: 'lune',
  target: 'mato',
  mountain: 'montagne',
  scale: 'balance',
};

const TOMOE = 'M28 13 A15 15 0 0 1 42.6 31.4 A10.5 10.5 0 0 0 28 24.6 A5.8 5.8 0 0 1 28 13 Z';

/** Le blason du conseil : un mon dessine pour YOROI, dans la couleur du sujet */
export function BlasonConseil({ picto, couleur, fond, taille = 56 }: { picto: ConseilPicto; couleur: string; fond: string; taille?: number }) {
  const m = MOTIF_DU_PICTO[picto] ?? 'tomoe';
  return (
    <Svg width={taille} height={taille} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={26} fill={fond} stroke={couleur} strokeWidth={1.6} />
      <Circle cx={28} cy={28} r={22} fill="none" stroke={couleur} strokeWidth={0.8} strokeDasharray="1.4 2.2" opacity={0.7} />
      {m === 'tomoe' ? [0, 120, 240].map((a) => <Path key={a} d={TOMOE} fill={couleur} transform={`rotate(${a} 28 28)`} />) : null}
      {m === 'semaine'
        ? Array.from({ length: 7 }, (_, i) => {
            const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
            return <Circle key={i} cx={28 + 12 * Math.cos(a)} cy={28 + 12 * Math.sin(a)} r={2.5} fill={couleur} />;
          }).concat([<Circle key="c" cx={28} cy={28} r={4.2} fill="none" stroke={couleur} strokeWidth={1.6} />])
        : null}
      {m === 'lune' ? (
        <>
          <Path d="M33.5 15.5 A12.5 12.5 0 1 0 38.5 36 A10 10 0 1 1 33.5 15.5 Z" fill={couleur} />
          <Circle cx={37} cy={21} r={1.4} fill={couleur} />
          <Circle cx={40.5} cy={27.5} r={0.9} fill={couleur} />
        </>
      ) : null}
      {m === 'mato' ? (
        <>
          <Circle cx={28} cy={28} r={13} fill="none" stroke={couleur} strokeWidth={2.4} />
          <Circle cx={28} cy={28} r={7.6} fill="none" stroke={couleur} strokeWidth={2.4} />
          <Circle cx={28} cy={28} r={2.8} fill={couleur} />
        </>
      ) : null}
      {m === 'montagne' ? (
        <>
          <Path d="M13 38 L24 19 L29.5 28 L33 22.5 L43 38 Z" fill={couleur} />
          <Path d="M21.2 23.8 L24 19 L26.9 23.8 L25.1 23 L24 24.2 L22.8 23 Z" fill={fond} />
          <Circle cx={37.5} cy={16.5} r={2.2} fill={couleur} />
        </>
      ) : null}
      {m === 'balance' ? (
        <>
          <Path d="M28 15 V39 M21 39 H35 M16 20 H40" stroke={couleur} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Path d="M16 20 L12 29 H20 Z M40 20 L36 29 H44 Z" fill="none" stroke={couleur} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M11.5 29 a4.5 3 0 0 0 9 0 Z M35.5 29 a4.5 3 0 0 0 9 0 Z" fill={couleur} />
          <Circle cx={28} cy={15} r={2.2} fill={couleur} />
        </>
      ) : null}
    </Svg>
  );
}

/** L'action principale du conseil : la seance ouvre directement le +, la pesee sa saisie, le reste son ecran */
export function actionConseil(c: Conseil): { libelle: string; href: string; icone: 'plus' | 'scale' | 'chevron' } | null {
  if (!c.href) return null;
  if (c.href === '/seance') return { libelle: traduire('Lancer une séance'), href: '/ajouter', icone: 'plus' };
  if (c.href === '/pesee') return { libelle: 'Me peser', href: '/pesee', icone: 'scale' };
  return { libelle: c.action ?? 'Ouvrir', href: c.href, icone: 'chevron' };
}

export function FeuilleConseil({ conseil: c, citation, style, onFermer, onMasquer, onAller }: { conseil: Conseil; citation: string; style: StyleCitation; onFermer: () => void; onMasquer: () => void; onAller: (href: string) => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduit = useReducedMotion();
  const t = teinte(domaineDuLien(c.href));
  const action = actionConseil(c);
  const morceaux = useMemo(() => morceauxConseil(c.text), [c.text]);

  const y = useSharedValue(reduit ? 0 : height * 0.6);
  const voile = useSharedValue(reduit ? 1 : 0);
  useEffect(() => {
    const d = reduit ? 0 : 340;
    y.value = withTiming(0, { duration: d, easing: Easing.out(Easing.cubic) });
    voile.value = withTiming(1, { duration: reduit ? 0 : 240 });
  }, [reduit, y, voile]);

  const fermer = () => {
    const d = reduit ? 0 : 220;
    voile.value = withTiming(0, { duration: d });
    y.value = withTiming(height * 0.6, { duration: d, easing: Easing.in(Easing.cubic) }, (fini) => {
      if (fini) runOnJS(onFermer)();
    });
  };

  // glisser vers le bas pour fermer
  const glisse = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          y.value = Math.max(0, g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 90 || g.vy > 0.9) fermer();
          else y.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
        },
        onPanResponderTerminate: () => {
          y.value = withTiming(0, { duration: 180 });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [height, reduit],
  );

  const styleVoile = useAnimatedStyle(() => ({ opacity: voile.value }));
  const styleFeuille = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(16,19,27,0.45)' }, styleVoile]}>
        <Pressable onPress={fermer} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={traduire("Fermer le conseil du jour")} />
      </Reanimated.View>

      <Reanimated.View
        {...glisse.panHandlers}
        accessibilityViewIsModal
        style={[{ backgroundColor: P.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 14 }, styleFeuille]}
      >
        <Pressable onPress={fermer} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} hitSlop={10} style={{ alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 24 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: P.line }} />
        </Pressable>

        {/* la citation du jour, en grand, dans ton style */}
        <View style={{ paddingTop: 18, paddingBottom: 22, paddingHorizontal: 8 }}>
          <CitationGrande texte={citation} style={style} />
        </View>

        {/* le conseil du jour */}
        <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: P.line, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <BlasonConseil picto={c.picto} couleur={t.texte} fond={t.fond} />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Ink size={13} weight="extraBold" color={t.texte}>
                {traduire("Le conseil du jour")}</Ink>
              <Ink size={22} weight="black" tight numberOfLines={2} accessibilityRole="header">
                {c.title}
              </Ink>
            </View>
          </View>
          <Ink size={15.5} weight="medium" color={P.ink2} style={{ lineHeight: 23 }}>
            {morceaux.map((m, i) =>
              m.chiffre ? (
                <Ink key={i} size={15.5} weight="black" color={t.texte}>
                  {m.t}
                </Ink>
              ) : (
                m.t
              ),
            )}
          </Ink>
          {action ? (
            <Press
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                onAller(action.href);
              }}
              accessibilityRole="button"
              accessibilityLabel={action.libelle}
            >
              <View style={{ minHeight: 52, borderRadius: 26, backgroundColor: t.plein, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 }}>
                {action.icone !== 'chevron' ? <Icon name={action.icone} size={18} color={t.surPlein} width={2.8} /> : null}
                <Ink size={15.5} weight="extraBold" color={t.surPlein} numberOfLines={1}>
                  {action.libelle}
                </Ink>
                {action.icone === 'chevron' ? <Icon name="chevron" size={15} color={t.surPlein} width={2.8} /> : null}
              </View>
            </Press>
          ) : null}
        </View>

        <Pressable onPress={onMasquer} accessibilityRole="button" accessibilityLabel={traduire("Masquer la citation et le conseil pour aujourd’hui")} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 4 }}>
          <Ink size={14} weight="bold" color={P.ink2} style={{ textDecorationLine: 'underline' }}>
            {traduire("Masquer aujourd’hui")}</Ink>
        </Pressable>
      </Reanimated.View>
    </View>
  );
}
