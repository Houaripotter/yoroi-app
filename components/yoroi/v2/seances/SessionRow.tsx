/**
 * Ligne d'historique (maquette S4) : vignette illustree du sport, titre, date et resume
 * (duree, series et tonnage en musculation, rounds en combat, distance en cardio), tampon si record.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Training } from '@/lib/database';
import { DOW_SHORT, dateOf, firstSport, sessionMeta, sessionTitle } from '@/lib/v2/seances/sessionData';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { Hanko, tap } from './ui';
import { Icon } from './Icon';
import { P } from '@/components/yoroi/livePalette';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';

/** Vignette du sport : illustration cadree dans une tuile teintee */
export function SportThumb({ sport, femme, size = 48 }: { sport: string | undefined; femme?: boolean; size?: number }) {
  const { theme } = useYoroiTheme();
  const id = firstSport(sport);
  const img = sportImage(id, !!femme, 0);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: sportTint(id), overflow: 'hidden', alignItems: 'center' }}>
      {img ? (
        <Image source={img} style={{ position: 'absolute', top: -size * 0.04, width: size * 1.25, height: size * 1.66 }} resizeMode="contain" />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}><Icon name="dumbbell" size={size * 0.46} color={theme.colors.textSecondary} /></View>
      )}
    </View>
  );
}

export function SessionRow({ t, stamps = 0, onBeforeOpen, femme, showDate = true }: { t: Training; stamps?: number; onBeforeOpen?: () => void; femme?: boolean; showDate?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const d = dateOf(t.date);
  const meta = sessionMeta(t, useUnitePoids());
  const when = `${DOW_SHORT[d.getDay()]} ${d.getDate()}`;
  const line = showDate ? [when, meta].filter(Boolean).join(', ') : meta;
  return (
    <Pressable
      onPress={() => {
        if (!t.id) return;
        tap();
        // navigation directe : la seance s'ouvre tout de suite (sous la feuille qui se ferme, s'il y en a une)
        router.push({ pathname: '/workout-detail', params: { id: String(t.id) } } as any);
        onBeforeOpen?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${sessionTitle(t)}, ${when}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider })}
    >
      <SportThumb sport={t.sport} femme={femme} />
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold" numberOfLines={2}>{sessionTitle(t)}</Ink>
        {line ? <Ink size={13} color={c.textSecondary} numberOfLines={2}>{line}</Ink> : null}
      </View>
      {stamps > 0 ? <Hanko size={20} /> : null}
    </Pressable>
  );
}
