/**
 * Les records de la seance, reunis dans une seule carte (24 octobre 2026) : le grand tampon rouge
 * qui se pose, puis chaque record sur sa ligne.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/seance/Hanko';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function RecordsSeance({ lignes, anime }: { lignes: { cle: string; titre: string; detail: string | null }[]; anime: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (!lignes.length) return null;
  const n = lignes.length;
  return (
    <Animated.View
      entering={anime ? FadeInDown.delay(360).duration(380) : undefined}
      style={{ marginHorizontal: 22, marginTop: 12, borderRadius: 22, padding: 16, backgroundColor: c.dangerTint, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Hanko size={52} rotate={-8} color={c.record} animate={anime} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={20} weight="black" tight color={c.record}>
            {traduirePluriel(n, n > 1, "{0} record battu", "{0} records battus", n)}
          </Ink>
          <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Tu fais mieux que tout ce que tu avais noté.')}</Ink>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        {lignes.map((l) => (
          <View key={l.cle} style={{ borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: c.surface, gap: 1 }}>
            <Ink size={15} weight="extraBold">{l.titre}</Ink>
            {l.detail ? <Ink size={13} color={c.textSecondary}>{l.detail}</Ink> : null}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
