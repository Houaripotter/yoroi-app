/**
 * 3 novembre 2026 (demande de Houari) : l'etat d'un exercice en seance (lib/v2/seances/etatExo.ts).
 * Toutes les series prevues sont faites : le grand sticker « validé » (nuage coche), qui arrive avec un petit
 * rebond et un leger retour haptique. Il ne capte aucun appui : les series dessous restent modifiables.
 * Il manque des series : un avertissement vif, sticker alerte sur fond creme orange, « 1 série manquante ».
 */
import React, { useEffect } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { intensite } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';
import { texteManquantes } from '@/lib/v2/seances/etatExo';

/** Le sticker « validé », avec un rebond a son arrivee quand `anime` (une seule fois, a la derniere serie validee) */
export function TamponValide({ taille = 96, anime = false, style }: { taille?: number; anime?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const echelle = useSharedValue(anime ? 0.2 : 1);
  const angle = useSharedValue(anime ? -18 : -6);
  useEffect(() => {
    if (!anime) return;
    echelle.value = withSequence(withTiming(1.18, { duration: 180 }), withSpring(1, { damping: 9, stiffness: 180 }));
    angle.value = withSpring(-6, { damping: 10, stiffness: 160 });
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  }, [anime]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }, { rotate: `${angle.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" accessible accessibilityLabel={traduire('Exercice validé')} style={[{ alignItems: 'center', gap: 2 }, st, style]}>
      {illus.stickers ? (
        <Image source={illus.img('nuage_ok')} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: taille * 0.8, height: taille * 0.8, borderRadius: taille, backgroundColor: c.successText, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={taille * 0.42} color={c.onPrimary} strokeWidth={3.2} />
        </View>
      )}
      <View style={{ marginTop: -8, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10, backgroundColor: c.successText }}>
        <Ink size={Math.max(12, Math.round(taille / 7))} weight="black" color="#FFFFFF">{traduire('VALIDÉ')}</Ink>
      </View>
    </Animated.View>
  );
}

/** « 1 série manquante », vif, avec le sticker alerte ; `detail` precise lesquelles (« Série 3 pas validée ») */
export function AlerteManquantes({ n, detail, compact = false, style }: { n: number; detail?: string | null; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const illus = useIllustrations();
  // orange vif de la palette des zones (texte AA sur sa teinte), liseré plein
  const t = intensite(4);
  return (
    <View accessible accessibilityRole="alert" accessibilityLabel={[texteManquantes(n), detail].filter(Boolean).join('. ')} style={[{ flexDirection: 'row', alignItems: 'center', gap: compact ? 6 : 10, paddingVertical: compact ? 5 : 10, paddingLeft: compact ? 6 : 10, paddingRight: compact ? 10 : 14, borderRadius: compact ? 12 : 16, backgroundColor: t.tint, borderWidth: 2, borderColor: t.fill }, style]}>
      {illus.stickers ? (
        <Image source={illus.img('alerte')} style={{ width: compact ? 20 : 32, height: compact ? 20 : 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <Ink size={compact ? 14 : 18} weight="black" color={t.text}>!</Ink>
      )}
      <View style={{ flexShrink: 1, gap: 1 }}>
        <Ink size={compact ? 12.5 : 15} weight="black" color={t.text} numberOfLines={1}>{texteManquantes(n)}</Ink>
        {detail && !compact ? <Ink size={12.5} weight="bold" color={t.text} numberOfLines={2}>{detail}</Ink> : null}
      </View>
    </View>
  );
}
