/**
 * Liens legaux du bas de l'accroche et du paywall (vague 49, Houari : « bien alignés, centrés »).
 * « Conditions d'utilisation (EULA) » et « Confidentialité » sur une meme ligne, separes par une barre fine,
 * centres ; si la ligne ne tient pas (grand texte, petit ecran), deux lignes centrees. Meme style partout.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';

export type LienLegal = { label: string; onPress: () => void; role?: 'link' | 'button' };

export function LienLegalTexte({ label, onPress, role = 'link', size = 12 }: LienLegal & { size?: number }) {
  const { theme } = useYoroiTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole={role} accessibilityLabel={label} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} style={{ minHeight: 32, justifyContent: 'center' }}>
      <Ink size={size} weight="bold" color={theme.colors.textSecondary} numberOfLines={1} style={{ textDecorationLine: 'underline', textAlign: 'center' }}>
        {label}
      </Ink>
    </Pressable>
  );
}

/** Une rangee de liens centres ; s'ils ne tiennent pas sur une ligne, un lien par ligne, centre */
export function LiensLegaux({ liens, size = 12 }: { liens: LienLegal[]; size?: number }) {
  const { theme } = useYoroiTheme();
  const [w, setW] = useState(0);
  // largeur estimee d'un lien (texte en gras) et de la barre fine qui les separe
  const larg = (t: string) => t.length * size * 0.56 + 8;
  const total = liens.reduce((s, l) => s + larg(l.label), 0) + (liens.length - 1) * 21;
  const uneLigne = w === 0 || total <= w;
  return (
    <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ alignSelf: 'stretch', alignItems: 'center' }}>
      {uneLigne ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {liens.map((l, k) => (
            <React.Fragment key={l.label}>
              {k > 0 ? <View style={{ width: 1, height: size + 2, marginHorizontal: 10, backgroundColor: theme.colors.border }} /> : null}
              <LienLegalTexte {...l} size={size} />
            </React.Fragment>
          ))}
        </View>
      ) : (
        liens.map((l) => <LienLegalTexte key={l.label} {...l} size={size} />)
      )}
    </View>
  );
}

export default LiensLegaux;
