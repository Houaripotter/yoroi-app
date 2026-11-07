/**
 * Tes records (vague 40, deplaces de Seances vers Progres) : les trois records utiles du moment
 * (source unique lib/v2/seances/records), un appui ouvre le record, « Tout voir » la page Records.
 * 7 novembre 2026 : puis les records en plaques de la pile (« 9 plaques »), a la suite, jamais ranges avec les kilos.
 */
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import type { Training } from '@/lib/database';
import { computeRecords, formatRecordPlaques, formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import { relativeDay } from '@/lib/v2/seances/sessionData';
import { SportThumb } from '../seances/SessionRow';
import { Hanko, tap } from '../seances/ui';
import { P } from '@/components/yoroi/livePalette';
import { todayIso, shiftDays } from '@/lib/v2/progres/format';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { traduire } from '@/lib/i18n/tr';
import { ombreCarte } from '@/components/yoroi/v2/accueil/kit';

export function RecordsCard({ trainings, femme }: { trainings: Training[]; femme: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const today = todayIso();
  const res = useMemo(() => computeRecords(trainings), [trainings]);
  const highlights = res.highlights;
  // les exercices en plaques les plus travailles, apres les records en kilos
  const plaques = useMemo(() => [...res.plaques].sort((a, b) => b.history.length - a.history.length || (a.date < b.date ? 1 : -1)).slice(0, highlights.length >= 3 ? 1 : 3 - highlights.length), [res, highlights.length]);
  const unite = useUnitePoids();

  if (highlights.length === 0 && plaques.length === 0) {
    return (
      <Pressable
        onPress={() => {
          tap();
          router.push('/records' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Tes records")}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: P.white }, ombreCarte]}
      >
        <Hanko size={28} color={c.textMuted} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold">{traduire("Ton premier record t’attend")}</Ink>
          <Ink size={13} color={c.textSecondary}>{traduire("Note tes charges, tes distances ou tes rounds : chaque marque battue reçoit son tampon ici.")}</Ink>
        </View>
      </Pressable>
    );
  }
  const fromIso = shiftDays(today, -14);
  return (
    <View style={[{ borderRadius: 22, backgroundColor: P.white, paddingHorizontal: 14, paddingVertical: 2 }, ombreCarte]}>
      {highlights.slice(0, 3).map((l, i) => {
        const v = formatRecordValue(l, undefined, unite);
        const fresh = l.stamps > 0 && l.date >= fromIso;
        return (
          <Pressable
            key={l.key}
            onPress={() => {
              tap();
              router.push({ pathname: '/records', params: { focus: l.key } } as any);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${recordShortTitle(l)}, ${v.main}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}
          >
            <SportThumb sport={l.sport} femme={femme} size={40} />
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15} weight="extraBold" numberOfLines={2}>{recordShortTitle(l)}</Ink>
              <Ink size={12} color={c.textSecondary} numberOfLines={2}>{`${relativeDay(l.date, today)}, ${v.sub}`}</Ink>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: '40%' }}>
              <Ink size={15} weight="black" tight numberOfLines={1} color={c.accentText}>{v.main}</Ink>
              {fresh ? <Hanko size={16} /> : null}
            </View>
          </Pressable>
        );
      })}
      {plaques.map((l, i) => {
        const v = formatRecordPlaques(l.best);
        const fresh = l.stamps > 0 && l.date >= fromIso;
        const titre = traduire(l.name);
        return (
          <Pressable
            key={l.key}
            onPress={() => {
              tap();
              router.push({ pathname: '/records', params: { focus: l.key } } as any);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${titre}, ${v.main}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i === 0 && highlights.length === 0 ? 0 : 1, borderColor: c.divider }}
          >
            <SportThumb sport={l.sport} femme={femme} size={40} />
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15} weight="extraBold" numberOfLines={2}>{titre}</Ink>
              <Ink size={12} color={c.textSecondary} numberOfLines={2}>{v.sub ? `${relativeDay(l.date, today)}, ${v.sub}` : relativeDay(l.date, today)}</Ink>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: '40%' }}>
              <Ink size={15} weight="black" tight numberOfLines={1} color={c.accentText}>{v.main}</Ink>
              {fresh ? <Hanko size={16} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
