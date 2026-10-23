/**
 * Vague 45 : la vitrine de la boutique dans le Dojo. Un petit carrousel horizontal de vraies vignettes
 * (personnages et scenes, selon l'univers) avec un badge discret « Premium », « Offert » ou « Rang X »,
 * et en dernier une vignette « Tout voir » qui ouvre la boutique.
 */
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChevronIcon, tap } from '@/components/yoroi/v2/dojo/parts';
import type { BadgeVitrine, Vignette } from '@/lib/v2/dojo/dojoAffichage';
import { traduire } from '@/lib/i18n/tr';

const LARGEUR = 132;
const ECART = 10;

function Badge({ b }: { b: BadgeVitrine }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bg = b.ton === 'premium' ? c.goldTint : b.ton === 'offert' ? c.accentTint : c.fillSoft;
  const fg = b.ton === 'premium' ? c.goldDeep : b.ton === 'offert' ? c.accent : c.textSecondary;
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: bg }}>
      {/* Vague 45 : badge sur 2 lignes possibles, jamais coupe (« Rang Shōgun », « Rang Régulier ») */}
      <Ink size={11} weight="extraBold" color={fg} numberOfLines={2}>{b.texte}</Ink>
    </View>
  );
}

/** Vague 45 : une vignette qui s'enfonce legerement a l'appui */
function Carte({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={() => {
        s.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        s.value = withTiming(1, { duration: 140 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: LARGEUR }}
    >
      <Animated.View style={[{ flex: 1 }, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

export function VitrineBoutique({ vignettes, total, onOuvrir }: { vignettes: Vignette[]; total: string; onOuvrir: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const cadre = { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 6, paddingBottom: 10, gap: 8 } as const;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -22 }}
      contentContainerStyle={{ paddingHorizontal: 22, gap: ECART }}
      snapToInterval={LARGEUR + ECART}
      decelerationRate="fast"
    >
      {vignettes.map((v) => (
        <Carte key={v.key} label={traduire("{0}, {1}. Ouvrir la boutique", v.nom, v.badge.texte)} onPress={onOuvrir}>
          <View style={cadre}>
            <View style={{ height: 116, borderRadius: 15, overflow: 'hidden', backgroundColor: v.fond ?? c.fillSoft, alignItems: 'center', justifyContent: 'flex-end' }}>
              {v.genre === 'scene' ? (
                <Image source={v.image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
              ) : (
                <Image source={v.image} style={{ width: '100%', height: 128, marginBottom: -10 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              )}
            </View>
            <View style={{ paddingHorizontal: 4, gap: 5 }}>
              <Ink size={13} weight="extraBold" numberOfLines={2}>{v.nom}</Ink>
              <Badge b={v.badge} />
            </View>
          </View>
        </Carte>
      ))}
      {/* Vague 45 : la derniere vignette ouvre toute la boutique */}
      <Carte label={traduire("Tout voir, {0}", total)} onPress={onOuvrir}>
        <View style={[cadre, { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accentTint, borderColor: c.accentTint }]}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronIcon size={18} color={c.onAccent} />
          </View>
          <Ink size={14} weight="extraBold" color={c.accent} style={{ textAlign: 'center' }}>{traduire("Tout voir")}</Ink>
          <Ink size={11} weight="bold" color={c.textSecondary} style={{ textAlign: 'center' }} numberOfLines={3}>{total}</Ink>
        </View>
      </Carte>
    </ScrollView>
  );
}

export default VitrineBoutique;
