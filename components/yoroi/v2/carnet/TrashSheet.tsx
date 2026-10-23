/**
 * Corbeille du carnet v2 : records et techniques supprimes, restauration en un appui, vider la corbeille.
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import type { Benchmark, Skill, TrashItem } from '@/lib/carnetService';
import { relative } from '@/lib/v2/carnet/format';
import { P, Press, CIcon, BigButton, Label, EmptyState } from './ui';
import { traduire } from '@/lib/i18n/tr';

type Props = {
  visible: boolean;
  onClose: () => void;
  trashBenchmarks: TrashItem<Benchmark>[];
  trashSkills: TrashItem<Skill>[];
  trashCount: number;
  onRestoreBenchmark: (id: string) => void;
  onRestoreSkill: (id: string) => void;
  onEmptyTrash: () => void;
};

function Line({ title, sub, onRestore }: { title: string; sub: string; onRestore: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold" numberOfLines={1}>{title}</Ink>
        <Ink size={12} weight="bold" color={P.muted}>{sub}</Ink>
      </View>
      <Press onPress={onRestore} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Restaurer {0}", title)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: P.mossSoft }}>
          <CIcon name="refresh" size={16} color={P.mossText} />
          <Ink size={13} weight="extraBold" color={P.mossText}>{traduire("Restaurer")}</Ink>
        </View>
      </Press>
    </View>
  );
}

export function TrashSheet(p: Props) {
  return (
    <Sheet visible={p.visible} onClose={p.onClose} title="Corbeille" scroll>
      {p.trashCount === 0 ? <EmptyState title={traduire("La corbeille est vide")} text={traduire("Ce que tu supprimes du carnet arrive ici. Tu peux le restaurer quand tu veux.")} /> : null}
      {p.trashBenchmarks.length > 0 ? <Label>{traduire("Records supprimés, {0}", p.trashBenchmarks.length)}</Label> : null}
      {p.trashBenchmarks.map((t) => (
        <Line key={t.item.id} title={t.item.name} sub={traduire("Supprimé {0}{1}", relative(t.deletedAt), t.item.entries.length > 0 ? `, ${t.item.entries.length} perf${t.item.entries.length > 1 ? 's' : ''}` : '')} onRestore={() => p.onRestoreBenchmark(t.item.id)} />
      ))}
      {p.trashSkills.length > 0 ? <Label>{traduire("Techniques supprimées, {0}", p.trashSkills.length)}</Label> : null}
      {p.trashSkills.map((t) => (
        <Line key={t.item.id} title={t.item.name} sub={traduire("Supprimée {0}, {1} répétitions{2}", relative(t.deletedAt), t.item.drillCount, t.item.notes.length > 0 ? `, ${t.item.notes.length} notes` : '')} onRestore={() => p.onRestoreSkill(t.item.id)} />
      ))}
      {p.trashCount > 0 ? <BigButton label={traduire("Vider la corbeille, {0}", p.trashCount)} icon="trash" tone="ink" onPress={p.onEmptyTrash} /> : null}
    </Sheet>
  );
}
