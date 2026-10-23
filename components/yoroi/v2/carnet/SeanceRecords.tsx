/**
 * Records battus en seance, dans le Carnet (vague 32) : la MEME source que l'onglet Seances
 * et l'ecran Records (lib/v2/seances/records.ts, seances dedoublonnees). Le Carnet ne compte plus
 * a part : il montre ces records, puis tes perfs notees a la main en dessous.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import type { RecordsResult } from '@/lib/v2/seances/records';
import { relative } from '@/lib/v2/carnet/format';
import { SportThumb } from '@/components/yoroi/v2/seances/SessionRow';
import { P, Press, CIcon, Hanko } from './ui';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function SeanceRecords({ records, max = 5 }: { records: RecordsResult; max?: number }) {
  const router = useRouter();
  // 18 octobre 2026 : charges dans l'unite du reglage (kg ou lb)
  const unite = useUnitePoids();
  const lines = records.highlights.slice(0, max);
  if (lines.length === 0) return null;
  const n = records.totalStamps;
  return (
    <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 4 }}>
      <Press onPress={() => router.push('/records' as any)} accessibilityRole="button" accessibilityLabel={traduire("{0} records battus en séance, tout voir", n)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Hanko size={30} rotate={-8} />
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={17} weight="black" tight>{traduirePluriel(n, n > 1, "{0} record battu en séance", "{0} records battus en séance", n)}</Ink>
            <Ink size={12} weight="bold" color={P.ink2}>{traduire("les mêmes que dans Séances, calculés sur tes séances")}</Ink>
          </View>
          <Ink size={13} weight="extraBold" color={P.accent}>{traduire("Tout voir")}</Ink>
          <CIcon name="chevron" size={16} color={P.muted} />
        </View>
      </Press>
      {lines.map((l) => {
        const v = formatRecordValue(l, undefined, unite);
        return (
          <Press key={l.key} onPress={() => router.push({ pathname: '/records', params: { focus: l.key } } as any)} accessibilityRole="button" accessibilityLabel={`${recordShortTitle(l)}, ${v.main}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: P.line2 }}>
              <SportThumb sport={l.sport} size={38} />
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={15} weight="extraBold" numberOfLines={2}>{recordShortTitle(l)}</Ink>
                <Ink size={12} weight="medium" color={P.ink2} numberOfLines={2}>{`${relative(l.date)}, ${v.sub}`}</Ink>
              </View>
              <Ink size={16} weight="black" tight numberOfLines={1} style={{ maxWidth: '42%' }}>{v.main}</Ink>
            </View>
          </Press>
        );
      })}
    </View>
  );
}
