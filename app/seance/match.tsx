/**
 * Combat de competition (remplace add-combat) : resultat, methode, round et temps, adversaire,
 * poids a la pesee et le jour J, rattache ou non a une competition. Enregistre dans le palmares.
 * Parametre : competitionId (facultatif).
 */
import React, { useEffect, useRef, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { DeviceEventEmitter, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DayNav } from '@/components/yoroi/v2/DateChips';
import { dayLabel } from '@/components/yoroi/v2/seance/Details';
import { Hanko } from '@/components/yoroi/v2/seance/Hanko';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import type { CombatMethode, CombatResultat, Competition } from '@/lib/fighterMode';
import { addCombat, getCompetitions } from '@/lib/fighterModeService';
import { getLatestWeight } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { isoDay } from '@/lib/v2/seance/format';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

const RESULTS: { value: CombatResultat; label: string }[] = [
  { value: 'victoire', label: traduire('Victoire') },
  { value: 'defaite', label: traduire('Défaite') },
  { value: 'nul', label: traduire('Nul') },
];

const METHODS: { value: CombatMethode; label: string }[] = [
  { value: 'soumission', label: traduire('Soumission') },
  { value: 'ko', label: 'KO' },
  { value: 'tko', label: traduire('Arrêt de l’arbitre') },
  { value: 'points', label: traduire('Points') },
  { value: 'decision', label: traduire('Décision') },
  { value: 'dq', label: traduire('Disqualification') },
];

/** « 3:42 » a partir de secondes */
function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SeanceMatch() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ competitionId?: string }>();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState<number | null>(params.competitionId ? Number(params.competitionId) || null : null);
  const [date, setDate] = useState(isoDay(new Date()));
  const [result, setResult] = useState<CombatResultat>('victoire');
  const [method, setMethod] = useState<CombatMethode | null>(null);
  const [technique, setTechnique] = useState('');
  const [round, setRound] = useState(1);
  const [timeSec, setTimeSec] = useState(0);
  const [opponent, setOpponent] = useState('');
  const [club, setClub] = useState('');
  const [weighIn, setWeighIn] = useState(0);
  const [dayWeight, setDayWeight] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches n'enregistrent jamais la seance deux fois
  const savingRef = useRef(false);

  useEffect(() => {
    // Promise.resolve().then : sur le web, une fonction absente de la version web du stockage
    // (getLatestWeight n'existe pas dans lib/database.web.ts) devient une promesse rejetee, pas un plantage
    Promise.resolve()
      .then(() => getCompetitions())
      .then((list) => {
        setCompetitions(list ?? []);
        const pre = (list ?? []).find((x) => x.id === competitionId);
        if (pre?.date) setDate(pre.date.slice(0, 10));
      })
      .catch(() => setCompetitions([]));
    // poids pre-remplis avec la derniere pesee
    Promise.resolve()
      .then(() => getLatestWeight())
      .then((w) => {
        const v = w?.weight ? Math.round(w.weight * 10) / 10 : 0;
        if (v > 0) {
          setWeighIn((cur) => cur || v);
          setDayWeight((cur) => cur || v);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (savingRef.current || saving) return;
    if (!opponent.trim()) {
      appAlert(traduire('Ton adversaire ?'), traduire('Écris au moins son nom pour garder ce combat dans ton palmarès.'));
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await addCombat({
        competition_id: competitionId ?? undefined,
        date,
        resultat: result,
        methode: method ?? undefined,
        technique: technique.trim() || undefined,
        round: round > 0 ? round : undefined,
        temps: timeSec > 0 ? fmtTime(timeSec) : undefined,
        adversaire_nom: opponent.trim(),
        adversaire_club: club.trim() || undefined,
        poids_pesee: weighIn > 0 ? weighIn : undefined,
        poids_jour_j: dayWeight > 0 ? dayWeight : undefined,
        notes: notes.trim() || undefined,
      });
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      router.back();
    } catch (err) {
      logger.error('Enregistrement du combat impossible', err);
      appAlert(traduire('Oups'), traduire('Le combat n’a pas pu être enregistré. Réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  const chip = (on: boolean, tone?: string) => ({ minHeight: 46, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: on ? tone ?? c.ink : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border });
  const input = [fontStyle('bold'), { height: 52, fontSize: 16, color: c.ink, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }];
  const resultTone = (r: CombatResultat) => (r === 'victoire' ? c.success : r === 'defaite' ? c.accent : c.textSecondary);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 24) + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 110, gap: 16 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire("Un combat")} sousTitre={traduire("Pour ton palmarès")} onRetour={() => router.back()} style={{ marginHorizontal: -22, marginTop: -8 }} />

        <View style={{ padding: 16, borderRadius: 26, backgroundColor: result === 'victoire' ? c.successTint : result === 'defaite' ? c.accentTint : c.fillSoft, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ink size={24} weight="black" tight style={{ flex: 1 }} color={resultTone(result)}>{traduire(RESULTS.find((r) => r.value === result)?.label)}</Ink>
            {result === 'victoire' ? <Hanko size={44} rotate={-8} color={c.goldDeep} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {RESULTS.map((r) => {
              const on = r.value === result;
              return (
                <Pressable key={r.value} onPress={() => { selectionAsync().catch(() => {}); setResult(r.value); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ ...chip(on, resultTone(r.value)), flex: 1 }}>
                  <Ink size={15} weight="extraBold" color={on ? '#FFFFFF' : c.ink}>{traduire(r.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Section title={traduire("Comment")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {METHODS.map((m) => {
              const on = m.value === method;
              return (
                <Pressable key={m.value} onPress={() => { selectionAsync().catch(() => {}); setMethod(on ? null : m.value); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={chip(on)}>
                  <Ink size={14} weight="extraBold" color={on ? c.background : c.ink}>{traduire(m.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
          <TextInput value={technique} onChangeText={setTechnique} placeholder={method === 'soumission' ? traduire('Quelle soumission\u00a0? Triangle, clé de bras...') : traduire('La technique décisive')} placeholderTextColor={c.textMuted} accessibilityLabel={traduire("Technique")} style={input} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("Round")}</Ink>
              <Stepper value={round} step={1} min={1} max={12} unit={traduire("numéro du round")} layout="stack" size={26} button={44} format={(v) => String(v)} onChange={setRound} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("Temps dans le round")}</Ink>
              <Stepper value={timeSec} step={5} max={1800} unit={traduire("secondes dans le round")} layout="stack" size={26} button={44} format={(v) => fmtTime(v)} onChange={setTimeSec} />
            </View>
          </View>
        </Section>

        <Section title={traduire("Adversaire")}>
          <TextInput value={opponent} onChangeText={setOpponent} placeholder={traduire("Son nom")} placeholderTextColor={c.textMuted} accessibilityLabel={traduire("Nom de l'adversaire")} style={input} />
          <TextInput value={club} onChangeText={setClub} placeholder={traduire("Son club (facultatif)")} placeholderTextColor={c.textMuted} accessibilityLabel={traduire("Club de l'adversaire")} style={input} />
        </Section>

        <Section title={traduire("Quand")}>
          <DayNav value={date} onChange={setDate} label={dayLabel(date)} maxDate={date > isoDay(new Date()) ? date : undefined} />
          {competitions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable onPress={() => setCompetitionId(null)} accessibilityRole="button" accessibilityState={{ selected: competitionId === null }} style={chip(competitionId === null)}>
                <Ink size={14} weight="extraBold" color={competitionId === null ? c.background : c.ink}>{traduire("Combat libre")}</Ink>
              </Pressable>
              {competitions.map((comp) => {
                const on = comp.id === competitionId;
                return (
                  <Pressable key={comp.id} onPress={() => { setCompetitionId(comp.id); if (comp.date) setDate(comp.date.slice(0, 10)); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={chip(on)}>
                    <Ink size={14} weight="extraBold" color={on ? c.background : c.ink} numberOfLines={1}>{traduire(comp.nom)}</Ink>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </Section>

        <Section title={traduire("Ton poids")}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("À la pesée")}</Ink>
              <Stepper value={weighIn} step={0.1} max={250} decimals unit={traduire("kilos à la pesée")} layout="stack" size={26} button={44} format={(v) => String(v).replace('.', DECIMAL)} onChange={setWeighIn} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("Le jour J")}</Ink>
              <Stepper value={dayWeight} step={0.1} max={250} decimals unit={traduire("kilos le jour du combat")} layout="stack" size={26} button={44} format={(v) => String(v).replace('.', DECIMAL)} onChange={setDayWeight} />
            </View>
          </View>
          <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Pré-rempli avec ta dernière pesée. Touche un chiffre pour le taper.")}</Ink>
        </Section>

        <TextInput value={notes} onChangeText={setNotes} placeholder={traduire("Ce que tu retiens de ce combat")} placeholderTextColor={c.textMuted} multiline accessibilityLabel="Notes" style={[fontStyle('medium'), { minHeight: 90, fontSize: 15, color: c.ink, padding: 14, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]} />
      </ScrollView>

      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 18 }}>
        <Pressable onPress={save} disabled={saving} accessibilityRole="button" style={({ pressed }) => ({ height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent, opacity: saving ? 0.6 : 1, shadowColor: c.accent, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 })}>
          <Ink size={16} weight="extraBold" color={c.onAccent}>{saving ? 'Enregistrement...' : traduire('Enregistrer ce combat')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ gap: 10 }}>
      <Ink size={14} weight="bold" color={theme.colors.textSecondary} style={{ paddingHorizontal: 4 }}>{title}</Ink>
      {children}
    </View>
  );
}
