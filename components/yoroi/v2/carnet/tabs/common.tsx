/**
 * Morceaux communs aux onglets du carnet v2 : chargement, ligne de seance, appel a l'action.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSportName } from '@/lib/sports';
import type { Training } from '@/lib/database';
import { dayDate, shortDate } from '@/lib/v2/carnet/format';
import { P, EmptyState } from '../ui';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';

export function TabLoading() {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <ChargementPetit />
    </View>
  );
}

export function TabEmpty({ title, text, action, href }: { kanji?: string; title: string; text: string; action?: string; href?: string }) {
  const router = useRouter();
  return <EmptyState title={title} text={text} action={action} onAction={href ? () => router.push(href as any) : undefined} />;
}

/** Ligne de seance : pastille de date, sport ou theme, chips de mesures */
export function SessionLine({ t, title, chips, tone = P.ink }: { t: Training; title?: string; chips: string[]; tone?: string }) {
  const d = dayDate(t.date);
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
      <View style={{ width: 50, borderRadius: 14, backgroundColor: '#F4F2EC', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }}>
        <Ink size={20} weight="black" tight color={tone}>{isFinite(d.getTime()) ? String(d.getDate()) : ''}</Ink>
        <Ink size={11} weight="bold" color={P.ink2}>{isFinite(d.getTime()) ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : ''}</Ink>
      </View>
      <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
        <Ink size={15} weight="extraBold" numberOfLines={1}>{title ?? getSportName(t.sport)}</Ink>
        {chips.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((c) => (
              <View key={c} style={{ paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: '#F4F2EC' }}>
                <Ink size={12} weight="bold" color={P.ink2}>{c}</Ink>
              </View>
            ))}
          </View>
        ) : (
          <Ink size={12} weight="bold" color={P.muted}>{shortDate(t.date)}</Ink>
        )}
      </View>
    </View>
  );
}
