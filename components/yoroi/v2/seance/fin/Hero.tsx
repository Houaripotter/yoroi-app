/**
 * Le moment de la validation (24 octobre 2026) : un grand panneau a la couleur du sport, son illustration,
 * le sceau vert qui se pose avec un ressort, un anneau qui s'evase, une gerbe de confettis,
 * « Séance bouclée ! » et le compteur de la semaine. Sans animation si le telephone les reduit.
 */
import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Confettis } from './Confettis';
import { traduire } from '@/lib/i18n/tr';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const BADGE = 78;
const CHECK = 'M7 12.8l3.4 3.4L17.4 8.6';
const CHECK_LEN = 20;

function Sceau({ anime }: { anime: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const s = useSharedValue(anime ? 0.3 : 1);
  const o = useSharedValue(anime ? 0 : 1);
  const trait = useSharedValue(anime ? CHECK_LEN : 0);
  const anneau = useSharedValue(anime ? 0 : 1);

  useEffect(() => {
    if (!anime) return;
    s.value = withSpring(1, { damping: 9, stiffness: 170, mass: 0.8 });
    o.value = withTiming(1, { duration: 140 });
    trait.value = withDelay(180, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));
    anneau.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [anime, s, o, trait, anneau]);

  const sceau = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${(1 - s.value) * -18}deg` }] }));
  const onde = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - anneau.value), transform: [{ scale: 1 + anneau.value * 0.9 }] }));
  const props = useAnimatedProps(() => ({ strokeDashoffset: trait.value }));

  return (
    <View style={{ width: BADGE, height: BADGE }}>
      {anime ? <Animated.View style={[{ position: 'absolute', width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 3, borderColor: c.successText }, onde]} /> : null}
      <Animated.View
        style={[
          { width: BADGE, height: BADGE, borderRadius: BADGE / 2, backgroundColor: c.successText, alignItems: 'center', justifyContent: 'center', shadowColor: c.successText, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
          sceau,
        ]}
      >
        <Svg width={46} height={46} viewBox="0 0 24 24">
          <AnimatedPath d={CHECK} stroke={c.background} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${CHECK_LEN} ${CHECK_LEN}`} animatedProps={props} />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function FinHero({
  titre,
  compteSemaine,
  image,
  teinteSport,
  anime,
  pret,
}: {
  titre: string;
  /** « Ta 9e séance de la semaine », ou null */
  compteSemaine: string | null;
  image: ImageSourcePropType | null;
  teinteSport: string;
  /** animations permises (reglage du telephone lu et non reduit) */
  anime: boolean;
  /** le reglage est lu : on peut lancer la scene */
  pret: boolean;
}) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const fond = isDark ? c.surface : teinteSport;
  const titreFort = traduire('Séance bouclée !');
  const label = [titreFort, titre, compteSemaine].filter(Boolean).join('. ');

  return (
    <View style={{ marginHorizontal: 22 }}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
        style={{ borderRadius: 22, backgroundColor: fond, minHeight: 236, padding: 18, overflow: 'hidden', borderWidth: isDark ? 1 : 0, borderColor: c.border }}
      >
        {image ? (
          <Image
            source={image}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ position: 'absolute', right: -18, bottom: -26, width: 180, height: 240, opacity: isDark ? 0.9 : 1 }}
          />
        ) : null}
        {pret ? <Sceau anime={anime} /> : <View style={{ width: BADGE, height: BADGE }} />}
        <Animated.View entering={anime ? FadeInDown.delay(220).duration(380) : undefined} style={{ marginTop: 14, maxWidth: image ? '62%' : '100%', gap: 4 }}>
          <Ink size={34} weight="black" tight>{titreFort}</Ink>
          <Ink size={15} weight="bold" color={c.textSecondary} numberOfLines={2}>{titre}</Ink>
        </Animated.View>
        {compteSemaine ? (
          <Animated.View
            entering={anime ? FadeInDown.delay(380).duration(380) : undefined}
            style={{ alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, maxWidth: image ? '64%' : '100%' }}
          >
            <Ink size={14} weight="extraBold" color={c.accent} numberOfLines={2}>{compteSemaine}</Ink>
          </Animated.View>
        ) : null}
      </View>
      {pret && anime ? <Confettis x={18 + BADGE / 2} y={18 + BADGE / 2} couleurs={[c.accent, c.gold, c.success, c.record, c.indigo, c.goldLight]} /> : null}
    </View>
  );
}
