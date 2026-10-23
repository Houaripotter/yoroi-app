/**
 * Muscles travailles d'une seance (v2) : silhouette avant et arriere sur l'echelle d'indigo,
 * zones nommees, et reglage des muscles par puces (enregistre dans la seance).
 * Remplace l'ancien MuscleMapCard sur le detail d'une seance.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { updateTraining } from '@/lib/database';
import { MUSCLE_ORDER } from '@/lib/v2/progres/strength';
import { ALL_MUSCLES, groupCounts, musclesOf } from '@/lib/v2/seances/muscles';
import type { MuscleId } from '@/lib/v2/seances/muscles';
import { MUSCLE_LEVEL_COLORS, MuscleFigures } from './MuscleMap';
import { Chip, tap } from './ui';
import { P } from '@/components/yoroi/livePalette';

type Props = {
  sport: string;
  customMuscles?: string;
  trainingId?: number;
  onMusclesUpdated?: (muscles: string) => void;
};

export function MuscleWorked({ sport, customMuscles, trainingId, onMusclesUpdated }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [selected, setSelected] = useState<Set<MuscleId>>(() => musclesOf(sport, customMuscles));
  const [editing, setEditing] = useState(false);
  const counts = useMemo(() => groupCounts(selected), [selected]);
  const levels = useMemo(() => {
    const out: Record<string, number> = {};
    MUSCLE_ORDER.forEach((g) => (out[g] = counts[g] >= 3 ? 3 : counts[g] === 2 ? 2 : counts[g] === 1 ? 1 : 0));
    return out;
  }, [counts]);

  const toggle = (id: MuscleId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    const str = Array.from(next).join(',');
    onMusclesUpdated?.(str);
    if (trainingId) updateTraining(trainingId, { muscles: str }).catch(() => {});
  };

  const groups = MUSCLE_ORDER.map((g) => ({ g, names: ALL_MUSCLES.filter((m) => m.group === g && selected.has(m.id)).map((m) => m.label) })).filter((x) => x.names.length > 0);

  return (
    <View style={{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={17} weight="black" tight>Muscles travaillés</Ink>
          <Ink size={12} color={c.textSecondary}>{selected.size ? `${selected.size} muscle${selected.size > 1 ? 's' : ''} sollicité${selected.size > 1 ? 's' : ''}` : 'aucun muscle choisi'}</Ink>
        </View>
        <Pressable
          onPress={() => { tap(); setEditing((v) => !v); }}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Terminer le réglage des muscles' : 'Ajuster les muscles travaillés'}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: editing ? c.ink : P.white, borderWidth: editing ? 0 : 1, borderColor: c.border }}
        >
          <Ink size={13} weight="extraBold" color={editing ? P.paper : c.ink}>{editing ? 'Terminé' : 'Ajuster'}</Ink>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MuscleFigures levels={levels} height={150} />
        <View style={{ flex: 1, gap: 8 }}>
          {groups.length === 0 ? <Ink size={13} color={c.textMuted}>Touche Ajuster pour choisir les muscles de ta séance.</Ink> : null}
          {groups.map(({ g, names }) => (
            <View key={g} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 4, marginTop: 3, backgroundColor: MUSCLE_LEVEL_COLORS[levels[g] ?? 0] }} />
              <View style={{ flex: 1 }}>
                <Ink size={13} weight="extraBold">{g}</Ink>
                <Ink size={12} color={c.textSecondary}>{names.join(', ')}</Ink>
              </View>
            </View>
          ))}
        </View>
      </View>

      {editing ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {ALL_MUSCLES.map((m) => (
            <Chip key={m.id} label={m.label} on={selected.has(m.id)} onPress={() => toggle(m.id)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
