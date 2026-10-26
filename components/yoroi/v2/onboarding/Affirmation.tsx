/**
 * Ecran 6 (vague 27) : une affirmation qui rassure, choisie selon ce qui t'a freine.
 * Vague 29 : texte nettement plus grand, mots et phrases cles en gras dans la couleur du frein,
 * le tampon du frein dans la meme encre. Aucun chiffre ni etude : seulement ce que fait vraiment l'app.
 * Vague 48 : plusieurs freins choisis, un texte qui les melange (lib/v2/onboarding/freins.ts, affirmationMelee) :
 * les tampons cote a cote, le titre du frein principal, la phrase qui relie les autres, un point par frein dans sa couleur.
 * 15 octobre 2026 (retour de Houari) : Continuer ne s'allume qu'une fois le bas de la page vu (les rappels sont en bas).
 * Si tout tient sans defiler, il est actif tout de suite. Tant qu'il est gris, une fleche douce invite a descendre.
 * 26 octobre 2026 (Houari : « réduire la taille du texte pour le lire en entier ») : titre 28 (24 sur petit iPhone),
 * texte 18 (16,5), tampons et cartes plus compacts, agrandissement du texte du systeme plafonne a 1,15.
 */
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeOut, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { Frein } from '@/lib/v2/onboarding/draft';
import { affirmationMelee } from '@/lib/v2/onboarding/freins';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import { ENCRE_FREIN, TAMPON_FREIN } from './Frein';
import { ENCRES_THEME as ENCRES } from './couleurs';
import { MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

/** « du texte **cle** » vers des morceaux, les cles en gras et en couleur */
export function morceaux(t: string): { txt: string; cle: boolean }[] {
  return t.split('**').map((txt, i) => ({ txt, cle: i % 2 === 1 })).filter((m) => m.txt.length > 0);
}

function Line({ text, index, ink, fond, petit }: { text: string; index: number; ink: string; fond: string; petit: boolean }) {
  const c = useColors();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(250 + index * 120, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [v, index]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + v.value * 0.75, transform: [{ translateY: (1 - v.value) * 8 }] }));
  // vague 49 : chaque point dans sa propre carte, plus genereuse, liseree de la couleur du frein
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: petit ? 44 : 54, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderLeftWidth: 4, borderLeftColor: ink, paddingVertical: petit ? 6 : 9, paddingLeft: 12, paddingRight: 14 }, style]}>
      <View style={{ width: petit ? 28 : 34, height: petit ? 28 : 34, borderRadius: 17, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={petit ? 16 : 18} color={ink} stroke={3} />
      </View>
      <Ink size={petit ? 15 : 16} weight="bold" maxFontSizeMultiplier={1.15} style={{ flex: 1, lineHeight: petit ? 20 : 21 }}>{text}</Ink>
    </Animated.View>
  );
}

/** « Descends pour continuer » : une fleche qui respire doucement (immobile si Reduire les animations) */
function Descends() {
  const c = useColors();
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(withSequence(withTiming(4, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1);
    return () => cancelAnimation(y);
  }, [reduce, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View exiting={reduce ? undefined : FadeOut.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 2 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View style={anim}>
        <Icon name="down" size={16} color={c.accent} stroke={2.6} />
      </Animated.View>
      <Ink size={13} weight="extraBold" color={c.accent}>{traduire("Descends pour continuer")}</Ink>
    </Animated.View>
  );
}

// 14 octobre 2026 : children, le bloc discipline et rappels (app/onboarding.tsx), sous les points
export function Affirmation({ nav, name, freins, genre = null, onNext, children }: { nav: Nav; name: string; freins: Frein[]; genre?: 'h' | 'f' | null; onNext: () => void; children?: React.ReactNode }) {
  const c = useColors();
  const a = affirmationMelee(freins, genre);
  const main = a.principal;
  const e = ENCRE_FREIN[main] ?? ENCRES.indigo;
  const prenom = name.trim();
  const { height, width } = useWindowDimensions();
  const petit = height < 720;
  const plusieurs = a.freins.length > 1;
  // vague 49 (Houari : « trop petit, un grand vide ») : texte, tampons et cartes plus grands
  // 26 octobre 2026 : plus petit, pour lire tout l'ecran d'un coup d'oeil
  const fs = petit ? (plusieurs ? 15.5 : 16.5) : plusieurs ? 17 : 18;
  const titre = prenom ? `${prenom}, ${a.titre.charAt(0).toLowerCase()}${a.titre.slice(1)}` : a.titre;
  // les tampons cote a cote : un peu plus petits quand ils sont plusieurs, toujours dans la largeur
  const n = a.freins.length;
  const tSize = n === 1 ? (petit ? 72 : 104) : Math.min(petit ? 54 : 80, Math.floor((width - 44 + (n - 1) * 14) / n));
  // 15 octobre 2026 : le bas de la page doit avoir ete vu (une fois vu, le bouton reste actif)
  const [fin, setFin] = useState(false);
  return (
    <Shell
      {...nav}
      gap={petit ? 10 : 16}
      onFin={fin ? undefined : () => setFin(true)}
      footer={
        <>
          {fin ? null : <Descends />}
          <MainButton
            label={traduire("Continuer")}
            onPress={onNext}
            disabled={!fin}
            accessibilityLabel={fin ? traduire('Continuer') : traduire('Continuer, indisponible : descends jusqu’en bas de la page')}
          />
        </>
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 2 }}>
        {a.freins.map((f, i) => (
          <Tampon
            key={f}
            name={TAMPON_FREIN[f] ?? 'frein_rien'}
            size={tSize}
            rotate={n === 1 ? -6 : [-7, 5, -3, 6, -5][i] ?? 0}
            ink={(ENCRE_FREIN[f] ?? ENCRES.indigo).ink}
            animate
            style={{ marginLeft: i ? -14 : 0 }}
            accessibilityLabel={null}
          />
        ))}
      </View>
      <View style={{ gap: petit ? 8 : 12 }}>
        <Ink size={petit ? 24 : 28} weight="black" tight maxFontSizeMultiplier={1.15} style={{ lineHeight: petit ? 29 : 33 }} accessibilityRole="header">{titre}</Ink>
        <Ink size={fs} weight="medium" color={c.ink} maxFontSizeMultiplier={1.15} style={{ lineHeight: Math.round(fs * 1.45) }}>
          {morceaux(a.texte).map((m, i) =>
            m.cle ? (
              <Ink key={i} size={fs} weight="black" color={e.ink} maxFontSizeMultiplier={1.15}>{m.txt}</Ink>
            ) : (
              m.txt
            ),
          )}
        </Ink>
        {a.lien ? (
          <Ink size={fs} weight="medium" color={c.ink} maxFontSizeMultiplier={1.15} style={{ lineHeight: Math.round(fs * 1.45) }}>
            {morceaux(a.lien).map((m, i, all) => {
              if (!m.cle) return m.txt;
              const k = all.slice(0, i).filter((x) => x.cle).length;
              const ink = (ENCRE_FREIN[a.autres[k]] ?? e).ink;
              return <Ink key={i} size={fs} weight="black" color={ink} maxFontSizeMultiplier={1.15}>{m.txt}</Ink>;
            })}
          </Ink>
        ) : null}
      </View>
      <View style={{ gap: petit ? 6 : 8 }}>
        {a.points.map((p, i) => {
          const pe = ENCRE_FREIN[p.frein] ?? e;
          return <Line key={p.texte} text={traduire(p.texte)} index={i} ink={pe.ink} fond={pe.fond} petit={petit} />;
        })}
      </View>
      {children}
    </Shell>
  );
}

export default Affirmation;
