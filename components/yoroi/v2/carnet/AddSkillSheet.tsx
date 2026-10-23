/**
 * Nouvelle technique (carnet v2) : nom, discipline, statut de depart, notes, video filmee ou de la galerie.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { SKILL_CATEGORIES } from '@/lib/carnetService';
import type { SkillCategory, SkillStatus } from '@/lib/carnetService';
import { STATUS_LABEL, skillCategoryLabel, skillTone } from '@/lib/v2/carnet/journal';
import { P, Press, CIcon, Field, BigButton, Label, Plate, IconBtn } from './ui';
import { traduire } from '@/lib/i18n/tr';

type Props = {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  name: string;
  setName: (v: string) => void;
  category: SkillCategory;
  setCategory: (v: SkillCategory) => void;
  status: SkillStatus;
  setStatus: (v: SkillStatus) => void;
  notes: string;
  setNotes: (v: string) => void;
  videoUri: string | null;
  setVideoUri: (v: string | null) => void;
  onSubmit: () => void;
  onRecordVideo: () => void;
  onPickVideo: () => void;
};

export function AddSkillSheet(p: Props) {
  return (
    <Sheet visible={p.visible} onClose={p.onClose} title={traduire("Nouvelle technique")} scroll>
      <Field value={p.name} onChangeText={p.setName} placeholder={traduire("Berimbolo, défense de clé de jambe...")} maxLength={50} accessibilityLabel={traduire("Nom de la technique")} />
      <Label>Discipline</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {(Object.keys(SKILL_CATEGORIES) as SkillCategory[]).map((k) => {
          const on = p.category === k;
          return (
            <Press key={k} onPress={() => p.setCategory(k)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={skillCategoryLabel(k)}>
              <View style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: skillTone(k) }} />
                <Ink size={14} weight="bold" color={on ? P.white : P.ink}>{skillCategoryLabel(k)}</Ink>
              </View>
            </Press>
          );
        })}
      </ScrollView>
      <Label>{traduire("Où tu en es")}</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['to_learn', 'in_progress', 'mastered'] as SkillStatus[]).map((k) => {
          const on = p.status === k;
          return (
            <View key={k} style={{ flex: 1 }}>
              <Press onPress={() => p.setStatus(k)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={STATUS_LABEL[k]}>
                <View style={{ minHeight: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                  <Plate state={k === 'mastered' ? 'full' : k === 'in_progress' ? 'half' : 'empty'} w={20} h={26} />
                  <Ink size={13} weight="extraBold" color={on ? P.white : P.ink}>{STATUS_LABEL[k]}</Ink>
                </View>
              </Press>
            </View>
          );
        })}
      </View>
      <Field label="Notes techniques" value={p.notes} onChangeText={p.setNotes} placeholder={traduire("Saisir le pantalon d’abord, puis entrer les jambes")} multiline maxLength={500} />
      <Label>{traduire("Vidéo")}</Label>
      {p.videoUri ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' }}>
            <CIcon name="play" size={20} color={P.goldLight} />
          </View>
          <Ink size={15} weight="bold" style={{ flex: 1 }}>{traduire("Vidéo prête")}</Ink>
          <IconBtn name="close" label={traduire("Retirer la vidéo")} onPress={() => p.setVideoUri(null)} tone="soft" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><BigButton label="Filmer" tone="ink" icon="play" onPress={p.onRecordVideo} /></View>
          <View style={{ flex: 1 }}><BigButton label="Galerie" tone="light" onPress={p.onPickVideo} /></View>
        </View>
      )}
      <BigButton label={p.busy ? traduire('Création...') : traduire('Ajouter la technique')} icon="check" disabled={p.busy || !p.name.trim()} onPress={p.onSubmit} />
    </Sheet>
  );
}
