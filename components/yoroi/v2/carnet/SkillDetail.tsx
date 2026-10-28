/**
 * Detail d'une technique (carnet v2) : statut en plaques kozane, tampon de maitrise,
 * compteur de repetitions en un appui, notes techniques, lien video.
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Skill, SkillStatus } from '@/lib/carnetService';
import { STATUS_LABEL, skillCategoryLabel, skillTone } from '@/lib/v2/carnet/journal';
import { shortDate } from '@/lib/v2/carnet/format';
import { P, Press, CIcon, IconBtn, Sheet2, Field, BigButton, Plate, Stamp, BlockTitle } from './ui';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

type Props = {
  visible: boolean;
  skill: Skill | null;
  busy: boolean;
  drillIncrement: string;
  setDrillIncrement: (v: string) => void;
  onIncrementDrill: (amount?: number) => void;
  newNoteText: string;
  setNewNoteText: (t: string) => void;
  onAddNote: () => void;
  onDeleteNote: (noteId: string) => void;
  editingVideoUrl: string;
  setEditingVideoUrl: (u: string) => void;
  onUpdateVideoUrl: () => void;
  onOpenVideoUrl: (u: string) => void;
  onUpdateStatus: (id: string, s: SkillStatus) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

const STATUSES: { key: SkillStatus; plate: 'empty' | 'half' | 'full'; sub: string }[] = [
  { key: 'to_learn', plate: 'empty', sub: traduire('Je la découvre') },
  { key: 'in_progress', plate: 'half', sub: traduire('Je la travaille') },
  { key: 'mastered', plate: 'full', sub: traduire('Elle passe en combat') },
];

export function SkillDetail(p: Props) {
  const insets = useSafeAreaInsets();
  const s = p.skill;
  if (!s) return null;
  const tone = skillTone(s.category);
  const mastered = s.status === 'mastered';

  return (
    <Modal visible={p.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={p.onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -6, minHeight: 44 }}>
            <IconBtn name="back" label={traduire("Retour")} onPress={p.onClose} />
            <IconBtn name="trash" label={traduire("Supprimer la technique")} onPress={() => p.onDelete(s.id)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={13} weight="bold" color={tone}>{skillCategoryLabel(s.category)}</Ink>
              <Ink size={30} weight="black" tight accessibilityRole="header">{sansTiret(traduire(s.name))}</Ink>
            </View>
            {mastered ? (
              <Animated.View key={s.id + s.status} entering={ENTREE}>
                <Stamp size={72} />
              </Animated.View>
            ) : null}
          </View>

          <BlockTitle title={traduire("Où tu en es")} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {STATUSES.map((it) => {
              const on = s.status === it.key;
              return (
                <View key={it.key} style={{ flex: 1 }}>
                  <Press onPress={() => p.onUpdateStatus(s.id, it.key)} haptic="medium" accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={STATUS_LABEL[it.key]}>
                    <View style={{ minHeight: 120, borderRadius: 22, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                      <Plate state={it.plate} w={30} h={38} />
                      <Ink size={14} weight="extraBold" color={on ? P.white : P.ink} style={{ textAlign: 'center' }}>{STATUS_LABEL[it.key]}</Ink>
                      <Ink size={11} weight="bold" color={on ? 'rgba(255,255,255,0.7)' : P.muted} style={{ textAlign: 'center' }}>{traduire(it.sub)}</Ink>
                    </View>
                  </Press>
                </View>
              );
            })}
          </View>

          <Sheet2>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Ink size={13} weight="bold" color={P.ink2}>{traduire("Répétitions")}</Ink>
                <Ink size={48} weight="black" tight>{String(s.drillCount)}</Ink>
              </View>
              <Glyph kind="sakura" size={46} color="#EEF0F7" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 5, 10, 25].map((n) => (
                <View key={n} style={{ flex: 1 }}>
                  <Press onPress={() => p.onIncrementDrill(n)} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Ajouter {0} répétitions", n)}>
                    <View style={{ height: 52, borderRadius: 16, backgroundColor: n === 10 ? P.primary : '#EEF0F7', alignItems: 'center', justifyContent: 'center' }}>
                      <Ink size={16} weight="black" color={n === 10 ? P.onPrimary : P.ink}>{`+${n}`}</Ink>
                    </View>
                  </Press>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field label={traduire("Un autre nombre")} value={p.drillIncrement} onChangeText={p.setDrillIncrement} keyboardType="number-pad" placeholder="10" />
              </View>
              <View style={{ width: 120 }}>
                <BigButton label={traduire("Ajouter")} tone="ink" onPress={() => p.onIncrementDrill()} />
              </View>
            </View>
          </Sheet2>

          <BlockTitle title={traduire("Notes techniques")} aside={traduire("Les détails qui font marcher le geste")} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field value={p.newNoteText} onChangeText={p.setNewNoteText} placeholder={traduire("Ex : saisir le pantalon d’abord, puis entrer les jambes")} multiline maxLength={500} accessibilityLabel={traduire("Nouvelle note")} />
            </View>
            <IconBtn name="plus" label={traduire("Ajouter la note")} onPress={p.onAddNote} tone="red" size={52} disabled={!p.newNoteText.trim() || p.busy} />
          </View>
          {[...(s.notes || [])].reverse().map((n) => (
            <View key={n.id} style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
              <View style={{ width: 4, borderRadius: 2, backgroundColor: P.detail }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Ink size={15} weight="medium">{traduire(n.text)}</Ink>
                <Ink size={12} weight="bold" color={P.muted}>{shortDate(n.date)}</Ink>
              </View>
              <IconBtn name="trash" label={traduire("Supprimer la note")} onPress={() => p.onDeleteNote(n.id)} tone="soft" />
            </View>
          ))}

          <BlockTitle title={traduire("Vidéo")} aside={traduire("Un lien YouTube, Instagram ou une vidéo filmée")} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field value={p.editingVideoUrl} onChangeText={p.setEditingVideoUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" autoCorrect={false} maxLength={500} accessibilityLabel={traduire("Lien de la vidéo")} />
            </View>
            <IconBtn name="check" label={traduire("Enregistrer le lien")} onPress={p.onUpdateVideoUrl} tone="ink" size={52} disabled={!p.editingVideoUrl.trim()} />
          </View>
          {s.videoUrl ? <BigButton label={traduire("Voir la vidéo")} icon="play" tone="light" onPress={() => p.onOpenVideoUrl(s.videoUrl!)} /> : null}
          {mastered ? null : (
            <Press onPress={() => p.onUpdateStatus(s.id, 'mastered')} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Je la maîtrise")}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.accent }}>
                <Stamp size={44} />
                <View style={{ flex: 1 }}>
                  <Ink size={16} weight="extraBold">{traduire("Je la maîtrise")}</Ink>
                  <Ink size={13} weight="medium" color={P.ink2}>{traduire("Pose ton tampon et lace une plaque de plus.")}</Ink>
                </View>
                <CIcon name="chevron" size={18} color={P.accent} />
              </View>
            </Press>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
