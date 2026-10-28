/**
 * Onglet Muscles (pack musculation) : groupes bien travailles sur 30 jours, groupes a relancer,
 * volume par groupe musculaire avec acces aux videos du groupe.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, BrushBar, IconBtn, Hanko } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { VideoLibrarySheet } from '../VideoLibrarySheet';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const GROUPS = [
  { key: 'pecs', label: 'Pectoraux', kw: ['pecs', 'pectoraux', 'pectoral', 'pec', 'développé couché', 'dc', 'bench', 'push', 'écartés', 'dips'] },
  { key: 'dos', label: 'Dos', kw: ['dos', 'back', 'rowing', 'tirage', 'tractions', 'pull', 'lat', 'soulevé de terre', 'sdt', 'deadlift'] },
  { key: 'epaules', label: 'Épaules', kw: ['épaules', 'epaule', 'shoulder', 'développé militaire', 'dm', 'ohp', 'latéral', 'face pull'] },
  { key: 'biceps', label: 'Biceps', kw: ['biceps', 'curl', 'bicep', 'arm'] },
  { key: 'triceps', label: 'Triceps', kw: ['triceps', 'skull crusher', 'extension triceps'] },
  { key: 'jambes', label: 'Jambes', kw: ['jambes', 'legs', 'quadri', 'ischio', 'squat', 'fente', 'presse', 'leg press', 'leg extension', 'leg curl'] },
  { key: 'fessiers', label: 'Fessiers', kw: ['fessiers', 'fesses', 'glutes', 'hip thrust', 'hip-thrust'] },
  { key: 'mollets', label: 'Mollets', kw: ['mollets', 'mollet', 'calves', 'calf'] },
  { key: 'abdos', label: 'Abdos / Core', kw: ['abdos', 'abs', 'core', 'gainage', 'planche', 'crunch'] },
  { key: 'avant_bras', label: 'Avant bras', kw: ['avant-bras', 'avant bras', 'grip', 'forearm'] },
];

export function MusclesView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { trainings, loading } = useTrainings((t) => ['musculation', 'bodybuilding', 'fitness', 'powerlifting'].includes(t.sport), refreshKey);
  const [video, setVideo] = useState<string | null>(null);

  const data = useMemo(() => {
    const now = Date.now();
    const cut = now - 30 * 86400000;
    const by: Record<string, { total: number; last30: number; lastDate: string | null }> = {};
    for (const t of trainings) {
      const theme = (t.technical_theme || '').toLowerCase();
      const ts = new Date(t.date).getTime();
      for (const g of GROUPS) {
        if (g.kw.some((k) => theme.includes(k))) {
          if (!by[g.key]) by[g.key] = { total: 0, last30: 0, lastDate: null };
          by[g.key].total++;
          if (ts >= cut) by[g.key].last30++;
          if (!by[g.key].lastDate || t.date > by[g.key].lastDate!) by[g.key].lastDate = t.date;
        }
      }
    }
    const groups = GROUPS.map((g) => {
      const d = by[g.key];
      return { ...g, total: d?.total || 0, last30: d?.last30 || 0, since: d?.lastDate ? Math.floor((now - new Date(d.lastDate).getTime()) / 86400000) : null };
    });
    const max = Math.max(...groups.map((g) => g.total), 1);
    return { groups, max, neglected: groups.filter((g) => g.since !== null && g.since > 14 && g.total > 0), well: groups.filter((g) => g.last30 >= 4) };
  }, [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0) {
    return hideEmpty ? null : <TabEmpty title={traduire("Aucune donnée de musculation")} text={traduire("Donne un thème à tes séances (pecs, dos, jambes...) pour voir l’équilibre de ton corps.")} action={traduire("Commencer une séance")} href="/seance/muscu" />;
  }

  return (
    <View style={{ gap: 14 }}>
      {data.well.length > 0 ? (
        <Sheet2 tint={P.mossSoft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Hanko size={34} tampon="record_force" />
            <Ink size={17} weight="black" tight color={P.mossText}>{traduire("Bien travaillés ces 30 jours")}</Ink>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {data.well.map((g) => (
              <View key={g.key} style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: blancA(0.75) }}>
                <Ink size={13} weight="extraBold" color={P.mossText}>{traduire("{0}, {1} fois", traduire(g.label), g.last30)}</Ink>
              </View>
            ))}
          </View>
        </Sheet2>
      ) : null}
      {data.neglected.length > 0 ? (
        <Sheet2 tint={P.accentSoft}>
          <Ink size={17} weight="black" tight color={P.accent}>{traduire("À relancer")}</Ink>
          {data.neglected.map((g) => (
            <View key={g.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Ink size={15} weight="bold">{traduire(g.label)}</Ink>
              <Ink size={14} weight="extraBold" color={P.accent}>{traduire("{0} jours sans", g.since)}</Ink>
            </View>
          ))}
        </Sheet2>
      ) : null}
      <Sheet2>
        <Ink size={18} weight="black" tight>{traduire("Volume par groupe")}</Ink>
        {data.groups.filter((g) => g.total > 0).length === 0 ? <Ink size={14} weight="medium" color={P.ink2}>{traduire("Ajoute un thème à tes séances pour remplir ce tableau.")}</Ink> : null}
        {data.groups
          .filter((g) => g.total > 0)
          .sort((a, b) => b.total - a.total)
          .map((g) => (
            <View key={g.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Ink size={15} weight="bold">{traduire(g.label)}</Ink>
                  <Ink size={13} weight="extraBold" color={g.last30 >= 4 ? P.mossText : P.ink2}>{traduire("{0} au total, {1} en 30 j", g.total, g.last30)}</Ink>
                </View>
                <BrushBar value={g.total / data.max} color={g.last30 >= 4 ? P.moss : P.ink} height={8} />
              </View>
              <IconBtn name="film" label={traduire("Vidéos {0}", traduire(g.label))} onPress={() => setVideo(g.label)} tone="soft" />
            </View>
          ))}
      </Sheet2>
      {video ? <VideoLibrarySheet visible onClose={() => setVideo(null)} muscleGroup={video} muscleGroupLabel={traduire(video)} /> : null}
    </View>
  );
}
