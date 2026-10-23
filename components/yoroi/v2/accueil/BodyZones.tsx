/**
 * Etat du corps : 8 zones a surveiller (ancien ecran body-status).
 * Appui sur une zone : tout va bien, gene (douleur de 1 a 10) ou blessure (note obligatoire).
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { saveUserBodyStatus } from '@/lib/storage';
import type { BodyStatusData, BodyZoneData } from '@/lib/storage';
import { logger } from '@/lib/security/logger';
import { BigButton, Card, Icon, P, Pill, Press, tap } from './kit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { intensite, niveauDouleur } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';

export const BODY_ZONES: { key: string; label: string }[] = [
  { key: 'neck', label: 'Nuque' },
  { key: 'shoulders', label: 'Épaules' },
  { key: 'back', label: 'Dos' },
  { key: 'elbows', label: 'Coudes' },
  { key: 'wrists', label: 'Poignets' },
  { key: 'hips', label: 'Hanches' },
  { key: 'knees', label: 'Genoux' },
  { key: 'ankles', label: 'Chevilles' },
];

const STATUS: Record<BodyZoneData['status'], { label: string; color: string; soft: string }> = {
  ok: { label: traduire('Tout va bien'), color: P.mossText, soft: P.mossSoft },
  warning: { label: traduire('Gêne'), color: P.goldDark, soft: P.goldSoft },
  injury: { label: 'Blessure', color: P.danger, soft: P.dangerSoft },
};

export function BodyZones({ body, onChange }: { body: BodyStatusData; onChange: (b: BodyStatusData) => void }) {
  const insets = useSafeAreaInsets();
  const [zone, setZone] = useState<string | null>(null);
  const [status, setStatus] = useState<BodyZoneData['status']>('ok');
  const [pain, setPain] = useState(5);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (key: string) => {
    const cur = body[key];
    setZone(key);
    setStatus(cur?.status ?? 'ok');
    setPain(cur?.pain ?? 5);
    setNote(cur?.note ?? '');
  };

  const save = async () => {
    if (!zone || saving) return;
    if (status === 'injury' && !note.trim()) {
      appAlert(traduire('Ajoute une note'), traduire('Dis en quelques mots ce qui s’est passé, ça t’aidera à suivre ta blessure.'));
      return;
    }
    setSaving(true);
    try {
      const data: BodyZoneData = { status };
      if (status === 'warning') data.pain = pain;
      if (status === 'injury') data.note = note.trim();
      const next = { ...body, [zone]: data };
      await saveUserBodyStatus(next);
      tap('success');
      onChange(next);
      setZone(null);
    } catch (err) {
      logger.error('Enregistrement de l’état du corps impossible', err);
      appAlert('Oups', traduire('L’enregistrement n’a pas marché. Réessaie.'));
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!zone) return;
    const next = { ...body };
    delete next[zone];
    try {
      await saveUserBodyStatus(next);
      tap();
      onChange(next);
      setZone(null);
    } catch (err) {
      logger.error('Suppression de l’état du corps impossible', err);
    }
  };

  const label = BODY_ZONES.find((z) => z.key === zone)?.label ?? '';

  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BODY_ZONES.map((z) => {
          const st = body[z.key]?.status;
          const s = st ? STATUS[st] : null;
          return (
            <View key={z.key} style={{ width: '48.6%' }}>
            <Press onPress={() => open(z.key)} accessibilityRole="button" accessibilityLabel={`${z.label} : ${s ? s.label : traduire('rien de signalé')}`}>
              <View style={{ minHeight: 64, borderRadius: 18, backgroundColor: s ? s.soft : P.white, borderWidth: 1, borderColor: s ? s.soft : P.line2, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', gap: 2 }}>
                <Ink size={15} weight="extraBold">
                  {z.label}
                </Ink>
                <Ink size={12} weight="bold" color={s ? s.color : P.muted}>
                  {st === 'warning' ? traduire("gêne {0} sur 10", body[z.key]?.pain ?? 5) : s ? s.label.toLowerCase() : traduire('rien de signalé')}
                </Ink>
              </View>
            </Press>
            </View>
          );
        })}
      </View>

      <Modal visible={zone !== null} transparent animationType="slide" onRequestClose={() => setZone(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(29,32,41,0.35)' }} onPress={() => setZone(null)} accessibilityLabel={traduire("Fermer")} />
          <View style={{ backgroundColor: P.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 10, paddingBottom: insets.bottom + 22, gap: 16 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.line }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={22} weight="black" tight>
                {label}
              </Ink>
              <Pressable onPress={() => setZone(null)} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P.white, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={18} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['ok', 'warning', 'injury'] as const).map((s) => (
                <View key={s} style={{ flex: 1 }}>
                  <Pill label={STATUS[s].label} active={status === s} accent={STATUS[s].color} onPress={() => setStatus(s)} />
                </View>
              ))}
            </View>
            {status === 'warning' ? (
              <Card style={{ gap: 10, padding: 14 }}>
                <Ink size={14} weight="bold" color={P.ink2}>
                  {traduire("Douleur : {0} sur 10", pain)}
                </Ink>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {Array.from({ length: 10 }).map((_, i) => {
                    const v = i + 1;
                    const on = v <= pain;
                    return (
                      <Pressable key={v} onPress={() => { tap(); setPain(v); }} accessibilityLabel={traduire("Douleur {0}", v)} hitSlop={4} style={{ width: 28, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 24, height: 12 + v * 2.6, borderRadius: 6, backgroundColor: on ? intensite(niveauDouleur(v)).fill : P.line }} />
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            ) : null}
            {status === 'injury' ? (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={traduire("Ce qui s’est passé, ce qu’a dit le médecin")}
                placeholderTextColor={P.muted}
                multiline
                style={{ minHeight: 90, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 14, fontSize: 15, color: P.ink, textAlignVertical: 'top' }}
              />
            ) : null}
            <BigButton label={saving ? 'Enregistrement' : traduire('Enregistrer')} onPress={save} disabled={saving} />
            {zone && body[zone] ? (
              <Pressable onPress={clear} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={14} weight="bold" color={P.danger}>
                  {traduire("Effacer cette zone")}</Ink>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
