/**
 * Le corps à toucher (24 octobre 2026) : devant et derrière, chaque zone (fessiers, abdos, avant-bras...)
 * s'allume en rouge quand tu la touches. Pensé pour ceux qui ne connaissent pas le nom des muscles : on
 * montre, on ne nomme pas d'abord.
 * Houari : « le corps, c'est pas mieux de le faire avec Gemini ? » puis « je veux vraiment la qualité ».
 * Illustration Gemini découpée par _propositions/corps/corps.py : une image de base, un calque rouge par
 * zone posé exactement dessus, et une grille qui dit quelle zone est sous le doigt (lib/v2/programmes/corpsCarte.ts).
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { zoneParId } from '@/lib/v2/programmes/zones';
import { CORPS_DEVANT, CORPS_DOS } from '@/lib/v2/programmes/corpsCarte';
import { zoneSousLeDoigt } from '@/lib/v2/programmes/corpsToucher';
import { traduire } from '@/lib/i18n/tr';

export function CorpsZones({
  cote,
  choisies,
  onToggle,
  hauteur = 420,
  interactif = true,
}: {
  cote: 'devant' | 'derriere';
  choisies: readonly ZoneId[];
  onToggle: (z: ZoneId) => void;
  hauteur?: number;
  interactif?: boolean;
}) {
  const carte = cote === 'devant' ? CORPS_DEVANT : CORPS_DOS;
  const largeur = Math.round(hauteur * carte.ratio);
  const toucher = (e: GestureResponderEvent) => {
    const z = zoneSousLeDoigt(carte, e.nativeEvent.locationX / largeur, e.nativeEvent.locationY / hauteur);
    if (!z) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    onToggle(z as ZoneId);
  };
  const plein = { position: 'absolute' as const, left: 0, top: 0, width: largeur, height: hauteur };
  return (
    <View style={{ alignItems: 'center' }} pointerEvents={interactif ? 'auto' : 'none'}>
      <Pressable
        onPress={interactif ? toucher : undefined}
        accessible={interactif}
        accessibilityRole="image"
        accessibilityLabel={cote === 'devant' ? traduire('Le corps, vu de devant') : traduire('Le corps, vu de dos')}
        accessibilityHint={interactif ? traduire('Touche une zone pour la choisir. Les boutons sous le corps font la même chose.') : undefined}
        style={{ width: largeur, height: hauteur }}
      >
        <Image source={carte.base} style={plein} resizeMode="contain" accessibilityIgnoresInvertColors />
        {choisies
          .filter((z) => carte.calques[z])
          .map((z) => (
            <Animated.Image key={`${cote}_${z}`} entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} source={carte.calques[z]} style={plein} resizeMode="contain" />
          ))}
      </Pressable>
    </View>
  );
}

/** La liste des zones en pastilles (accessible sans viser le dessin), cochées comme sur le corps */
export function PastillesZones({ ids, choisies, onToggle }: { ids: readonly ZoneId[]; choisies: readonly ZoneId[]; onToggle: (z: ZoneId) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {ids.map((id) => {
        const on = choisies.includes(id);
        return (
          <Pressable
            key={id}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
              onToggle(id);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border })}
          >
            <Ink size={14} weight="extraBold" color={on ? c.onAccent : c.ink}>{traduire(zoneParId(id)?.nom ?? id)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
