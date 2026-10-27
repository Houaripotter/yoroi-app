/**
 * Ajouter une seance deja faite : sport, jour, heure, duree, intensite, notes. En quelques appuis.
 * 17 octobre 2026 (audit des seances) : la meme section « Où » (club, salle, dehors, maison) et la meme note
 * de 1 a 5 que la feuille de fin (components/yoroi/v2/seance/Details.tsx).
 * Parametre facultatif : sport.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { ChoiceRow } from '@/components/yoroi/v2/seance/Sheet';
import { SessionDetailsForm } from '@/components/yoroi/v2/seance/Details';
import type { SessionDetails } from '@/lib/v2/seance/model';
import { trainingFromDetails } from '@/lib/v2/seance/edit';
import { niveauRpe } from '@/lib/v2/intensite';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { DayNav } from '@/components/yoroi/v2/DateChips';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { SPORTS, getSportName } from '@/lib/sports';
import { getEspace } from '@/lib/v2/espace';
import { fmtMinutes, isoDay, longDay, pad2 } from '@/lib/v2/seance/format';
import { normName } from '@/lib/v2/seance/history';
import { saveSeance } from '@/lib/v2/seance/save';
import { DEFAULT_SPORTS, sportShortName, sportTint } from '@/lib/v2/seance/sportVisuals';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const RPE = [
  { value: 3, label: traduire('Facile') },
  { value: 5, label: traduire('Correct') },
  { value: 7, label: traduire('Dur') },
  { value: 9, label: traduire('À bloc') },
];

const DURATIONS = [30, 45, 60, 90, 120];

function shift(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

export default function SeanceDejaFaite() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ sport?: string; duration?: string; notes?: string }>();

  const today = isoDay(new Date());
  const [history, setHistory] = useState<Training[]>([]);
  const [sports, setSports] = useState<string[]>(DEFAULT_SPORTS);
  const [sport, setSport] = useState<string>(params.sport || '');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState(() => {
    const d = Number(params.duration);
    return Number.isFinite(d) && d > 0 ? Math.round(d) : 60;
  });
  const [startMin, setStartMin] = useState(() => {
    const d = new Date();
    return Math.max(0, Math.floor((d.getHours() * 60 + d.getMinutes() - 60) / 15) * 15);
  });
  const [intensity, setIntensity] = useState<number | null>(null);
  const [notes, setNotes] = useState(params.notes ? String(params.notes) : '');
  // ou et note de 1 a 5 : la meme section que la feuille de fin ; le club habituel se recherche a chaque sport
  const lieuVide = (): SessionDetails => ({ date: today, startMin: 0, duration: 60, clubId: null, clubFixe: false, outdoor: false, place: '', lat: null, lon: null, technique: null, cadre: null });
  const [details, setDetails] = useState<SessionDetails>(lieuVide);
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches n'enregistrent jamais la seance deux fois
  const savingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [list, espace] = await Promise.all([getTrainings(180).catch(() => [] as Training[]), getEspace()]);
        setHistory(list ?? []);
        const counts = new Map<string, number>();
        (list ?? []).forEach((t) => counts.set(t.sport, (counts.get(t.sport) ?? 0) + 1));
        const practiced = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
        const ordered: string[] = [];
        for (const s of [...(params.sport ? [params.sport] : []), ...espace.sportsFavoris, ...practiced, ...DEFAULT_SPORTS]) {
          if (!ordered.includes(s) && SPORTS.some((x) => x.id === s)) ordered.push(s);
        }
        setSports(ordered.slice(0, 10));
        setSport((cur) => cur || ordered[0] || 'musculation');
      } catch (err) {
        logger.error('Chargement impossible', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La duree habituelle de ce sport sert de point de depart
  useEffect(() => {
    if (!sport) return;
    const last = history.find((t) => t.sport === sport && (t.duration_minutes ?? 0) > 0);
    if (last?.duration_minutes && !params.duration) setDuration(last.duration_minutes);
  }, [sport, history]);

  const results = useMemo(() => {
    const q = normName(query);
    if (!q) return [];
    return SPORTS.filter((s) => normName(s.name).includes(q)).slice(0, 8);
  }, [query]);

  const pickSport = (s: string) => {
    selectionAsync().catch(() => {});
    // autre sport, autre club habituel : la section « Où » repart de zero, la note reste
    if (s !== sport) setDetails((d) => ({ ...lieuVide(), technique: d.technique }));
    setSport(s);
    if (!sports.includes(s)) setSports((l) => [s, ...l]);
    setQuery('');
  };

  const dayLabel = date === today ? traduire('Aujourd’hui') : date === shift(today, -1) ? traduire('Hier') : longDay(date).charAt(0).toUpperCase() + longDay(date).slice(1);

  const save = async () => {
    if (!sport || savingRef.current || saving) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await saveSeance(
        {
          ...trainingFromDetails(details),
          sport,
          date,
          start_time: `${pad2(Math.floor(startMin / 60))}:${pad2(startMin % 60)}`,
          duration_minutes: duration,
          intensity: intensity ?? undefined,
          notes: notes.trim() || undefined,
          source: 'manual',
        },
        { title: getSportName(sport), methode: 'deja_faite' },
      );
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id) } });
    } catch (err) {
      logger.error('Enregistrement impossible', err);
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être enregistrée. Réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top, 24) + 12, paddingHorizontal: 22, paddingBottom: insets.bottom + 110, gap: 14 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire("Séance déjà faite")} onRetour={() => router.back()} style={{ marginHorizontal: -22, marginTop: -8 }} />

        <Section title={traduire("Sport")}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sports.map((s) => {
              const on = s === sport;
              return (
                <Pressable key={s} onPress={() => pickSport(s)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 46, paddingHorizontal: 14, borderRadius: 15, justifyContent: 'center', backgroundColor: on ? c.ink : sportTint(s) }}>
                  <Ink size={14} weight="extraBold" color={on ? P.paper : c.ink}>{sportShortName(s)}</Ink>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 48, borderRadius: 16, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
            <Icon name="search" size={18} color={c.textMuted} />
            <TextInput value={query} onChangeText={setQuery} placeholder={traduire("Un autre sport")} placeholderTextColor={c.textMuted} autoCorrect={false} accessibilityLabel={traduire("Chercher un sport")} style={[fontStyle('bold'), { flex: 1, fontSize: 15, color: c.ink, paddingVertical: 0 }]} />
          </View>
          {results.map((s) => (
            <Pressable key={s.id} onPress={() => pickSport(s.id)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface })}>
              <Ink size={15} weight="bold">{traduire(s.name)}</Ink>
            </Pressable>
          ))}
        </Section>

        <Section title={traduire("Quand")}>
          <DayNav value={date} onChange={setDate} label={dayLabel} size={20} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 18, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border }}>
            <Ink size={15} weight="bold">{traduire("Début")}</Ink>
            <Stepper value={startMin} step={15} min={0} max={23 * 60 + 45} unit={traduire("minutes")} size={22} button={34} format={(v) => `${pad2(Math.floor(v / 60))}:${pad2(v % 60)}`} onChange={setStartMin} />
          </View>
        </Section>

        <Section title={traduire("Durée")}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DURATIONS.map((d) => {
              const on = d === duration;
              return (
                <Pressable key={d} onPress={() => { selectionAsync().catch(() => {}); setDuration(d); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : blancA(0.7), borderWidth: on ? 0 : 1, borderColor: c.border }}>
                  <Ink size={13} weight="extraBold" color={on ? P.paper : c.ink}>{fmtMinutes(d)}</Ink>
                </Pressable>
              );
            })}
          </View>
          <View style={{ alignItems: 'center' }}>
            <Stepper value={duration} step={5} min={5} max={600} unit={traduire("minutes")} size={30} format={(v) => fmtMinutes(v)} onChange={setDuration} />
          </View>
        </Section>

        <Section title={traduire("Comment c’était ?")}>
          <ChoiceRow options={RPE} value={intensity} onChange={setIntensity} columns={4} niveau={niveauRpe} />
        </Section>

        {sport ? <SessionDetailsForm key={sport} value={details} onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))} sport={sport} /> : null}

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={traduire("Une note : ce que tu as travaillé, avec qui")}
          placeholderTextColor={c.textMuted}
          multiline
          accessibilityLabel={traduire("Note sur la séance")}
          style={[fontStyle('medium'), { minHeight: 80, fontSize: 15, color: c.ink, padding: 14, borderRadius: 18, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
        />
      </ScrollView>

      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 18 }}>
        <Pressable onPress={save} disabled={!sport || saving} accessibilityRole="button" style={({ pressed }) => ({ height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: !sport ? c.border : pressed ? c.primaryPressed : c.primary, opacity: saving ? 0.6 : 1, shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 })}>
          <Ink size={16} weight="black" color={c.onPrimary}>{saving ? 'Enregistrement...' : traduire('Enregistrer la séance')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 10 }}>
      <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{title}</Ink>
      {children}
    </View>
  );
}
