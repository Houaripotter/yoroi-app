/**
 * Dicte ta seance (vague 39, refaite la nuit du 14 octobre) : une phrase, dite au micro du clavier ou
 * tapee, puis un ecran de verification. Lecture de la phrase : lib/v2/seance/dictee.ts (code pur,
 * rien ne quitte le telephone).
 * La phrase est surlignee la ou quelque chose a ete compris ; chaque champ montre le morceau de phrase
 * d'ou il vient, ce qui est vide se complete d'un geste. Le sparring s'affiche en cartes par
 * partenaire (rounds, resultat, finitions). La phrase entiere reste dans la note : rien n'est perdu.
 * « Plus de details » ouvre la saisie complete du sport (mode seance faite) avec ce qui a ete compris.
 * Nuit du 14 : en haut, « A confirmer » : l'exercice devine (« Tu as fait des ecartes a la poulie,
 * c'est ca ? » Oui ou un autre choix, un geste) et la seance deja dans Apple Sante ce jour-la (la relier
 * plutot que d'en creer une seconde). Techniques apprises, grade, club, foot a 5 entre amis.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { SPORTS, getSportName } from '@/lib/sports';
import { BigButton, Card, Enter, Icon, fondAjouter, P, PlusPastille, Press, SectionTitle, tap, useAccent } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { ChoiceRow } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { DayNav } from '@/components/yoroi/v2/DateChips';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { effacerFormulaire, lireFormulaire, useFormulaireGarde } from '@/lib/v2/seance/formulaireGarde';

/** 28 octobre 2026 : la phrase et ce qui en a été compris, gardés si l'app se ferme (lib/v2/seance/formulaireGarde.ts) */
const CLE_DICTEE = 'dictee';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getEspace } from '@/lib/v2/espace';
import { CHARGE_LABEL, QUICK_TECHNIQUES, TEAM_SPORTS, cardsToRounds, contextLine, fold, fmtPace, learnedLine, parseDictee, roundsText, teamLine, techniqueText } from '@/lib/v2/seance/dictee';
import type { DicteeExercise, DicteeGuess, DicteeLearned, DicteeRound, DicteeTeam, DicteeTechnique, RoundResult, SessionMood, Span } from '@/lib/v2/seance/dictee';
import { findHealthTwin } from '@/lib/v2/seance/dicteeLien';
import { MachineFinder, MachineFinderButton } from '@/components/yoroi/v2/seance/MachineFinder';
import { fmtMinutes, isoDay, longDay, pad2 } from '@/lib/v2/seance/format';
import { saveSeance } from '@/lib/v2/seance/save';
import { deposerTexteCarnet, ressembleCarnet } from '@/lib/v2/import/texteEnAttente';
import { RESULTS, SESSION_TYPES } from '@/lib/v2/seance/combat';
import { DEFAULT_SPORTS, seanceKindFor, seanceRoute, sportShortName, sportTint } from '@/lib/v2/seance/sportVisuals';
import { traduire, DECIMAL } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

const EXAMPLES = [
  'JJB ce soir, 5 rounds de 6 minutes, 2 contre Paul gagnés par triangle, les 3 autres avec Marc',
  'Muscu hier à 18 h, 4 séries de 10 au développé couché à 80 kg, squat 5 fois 5 à 100',
  'Footing ce matin, 8 km en 45 minutes, facile',
  'Open mat, on a appris le juji gatame et l’omoplata',
  'Match de foot, 90 minutes, 2 buts, une passe décisive, au poste d’ailier',
];

const RPE = [
  { value: 3, label: 'Facile' },
  { value: 5, label: traduire('Correct') },
  { value: 7, label: 'Dur' },
  { value: 9, label: traduire('À bloc') },
];

/** ressenti (memes valeurs que l'ecran de fin), avec la note de seance sur 5 qui va avec */
const MOODS: { value: SessionMood; label: string; rating: number }[] = [
  { value: 'fire', label: 'En feu', rating: 5 },
  { value: 'solid', label: 'Solide', rating: 4 },
  { value: 'ok', label: traduire('Correct'), rating: 3 },
  { value: 'hard', label: 'Difficile', rating: 2 },
  { value: 'crushed', label: traduire('Écrasé'), rating: 2 },
];

const toMin = (t?: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
const fmtNum = (v: number) => String(Math.round(v * 100) / 100).replace('.', DECIMAL);

type CardForm = { key: string; name: string; role?: string; rounds: number[]; result: RoundResult | null; given: DicteeTechnique[]; taken: DicteeTechnique[]; src: Span[] };

type Form = {
  sport: string | null;
  date: string;
  dateSaid: boolean;
  moment?: string;
  start: number | null;
  duration: number | null;
  durationFrom?: string;
  durationSec?: number;
  intensity: number | null;
  mood: SessionMood | null;
  rating: number | null;
  rounds: number | null;
  roundMin?: number;
  distance: number | null;
  paceSaid?: number;
  paceUnit?: 'km' | '100m';
  speed: number | null;
  heartRate: number | null;
  maxHeartRate?: number;
  calories: number | null;
  outdoor: boolean;
  type: string | null;
  theme: string;
  exercises: DicteeExercise[];
  cards: CardForm[];
  /** rounds de l'analyse, gardes tant que les cartes ne sont pas touchees */
  parsedRounds: DicteeRound[] | null;
  team: DicteeTeam | null;
  extraNotes: string[];
  notes: string;
  spans: Record<string, Span[]>;
  guesses: DicteeGuess[];
  learned: DicteeLearned[];
  sessionLabel?: string;
  grade: string;
  gradeEvent: boolean;
  club: string;
  coach: string;
  /** seance de Sante reliee (id), refusee (null) ou pas encore decidee (undefined) */
  linkId?: number | null;
};

const HEALTH = Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé';
const LEARN_HEAD: Record<DicteeLearned['mode'], string> = { appris: 'Appris', drill: 'En drill', travaille: traduire('Travaillé'), reussi: traduire('Réussi en combat') };
const FORMATS = ['Foot à 5', 'Foot à 7', 'Foot à 11', 'Futsal'].map((v) => ({ value: v, label: traduire(v.replace('Foot à ', 'À ')) }));
const CADRES = ['Entre amis', 'Club', 'Compétition'].map((v) => ({ value: v, label: traduire(v) }));

function exLine(e: DicteeExercise): string {
  if (e.distance) return `${e.sets} x ${fmtNum(e.distance * 1000)} m`;
  if (e.duration) return `${e.sets} x ${e.duration >= 1 ? `${fmtNum(e.duration)} min` : `${Math.round(e.duration * 60)} s`}`;
  return `${e.sets} x ${e.max ? 'max' : e.reps}${e.weight ? `, ${fmtNum(e.weight)} kg` : ''}`;
}

/** la phrase decoupee en morceaux compris (surlignes) et le reste */
function pieces(text: string, spans: Record<string, Span[]>): { t: string; on: boolean }[] {
  const all = Object.values(spans).flat().filter((s) => s.end > s.start).sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const s of all) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end + 1) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  const out: { t: string; on: boolean }[] = [];
  let at = 0;
  for (const s of merged) {
    if (s.start > at) out.push({ t: text.slice(at, s.start), on: false });
    out.push({ t: text.slice(s.start, s.end), on: true });
    at = s.end;
  }
  if (at < text.length) out.push({ t: text.slice(at), on: false });
  return out;
}

export default function DicteSeance() {
  const router = useRouter();
  const { accent } = useAccent();
  const [text, setText] = useState('');
  const [said, setSaid] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [favs, setFavs] = useState<string[]>(DEFAULT_SPORTS.slice(0, 6));
  const [saving, setSaving] = useState(false);
  // 28 octobre 2026 : garde synchrone, deux appuis rapprochés n'enregistrent jamais la séance deux fois
  const savingRef = useRef(false);
  const [machines, setMachines] = useState(false);
  const [history, setHistory] = useState<Training[]>([]);
  const input = useRef<TextInput>(null);
  const today = isoDay(new Date());

  // ─── Saisie gardée (28 octobre 2026) ───
  const [prete, setPrete] = useState(false);
  useFormulaireGarde(CLE_DICTEE, { text, said, form }, prete && !saving && (!!text.trim() || !!form));
  useEffect(() => {
    let vivant = true;
    lireFormulaire<{ text: string; said: string; form: Form | null }>(CLE_DICTEE).then((g) => {
      if (!vivant) return;
      const v = g?.valeur;
      if (!v || (!v.text?.trim() && !v.form)) {
        setPrete(true);
        return;
      }
      const reprendre = () => {
        setText(v.text ?? '');
        setSaid(v.said ?? '');
        setForm(v.form ?? null);
        setPrete(true);
      };
      appAlert(traduire('Reprendre ta saisie ?'), traduire('Tu avais commencé à noter une séance : {0}.', (v.said || v.text || '').trim().slice(0, 80)), [
        {
          text: traduire('Nouvelle saisie'),
          style: 'destructive',
          onPress: () =>
            appAlert(traduire('Effacer la saisie gardée ?'), traduire('Elle ne sera pas enregistrée.'), [
              { text: traduire('Reprendre'), style: 'cancel', onPress: reprendre },
              { text: traduire('Effacer'), style: 'destructive', onPress: () => { void effacerFormulaire(CLE_DICTEE); setPrete(true); } },
            ], { cancelable: false }),
        },
        { text: traduire('Reprendre'), style: 'primary', onPress: reprendre },
      ], { cancelable: false });
    });
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 300);
    (async () => {
      try {
        const [espace, list] = await Promise.all([getEspace(), getTrainings(120).catch(() => [] as Training[])]);
        setHistory(list ?? []);
        const counts = new Map<string, number>();
        (list ?? []).forEach((x) => counts.set(x.sport, (counts.get(x.sport) ?? 0) + 1));
        const practiced = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
        const ordered: string[] = [];
        for (const s of [...espace.sportsFavoris, ...practiced, ...DEFAULT_SPORTS]) if (!ordered.includes(s) && SPORTS.some((x) => x.id === s)) ordered.push(s);
        setFavs(ordered.slice(0, 6));
      } catch {
        // les sports par defaut suffisent
      }
    })();
    return () => clearTimeout(t);
  }, []);

  const analyze = () => {
    const phrase = text.trim();
    if (!phrase) return;
    // 26 octobre 2026 : un carnet de seances colle (notes du telephone, plusieurs exercices, plusieurs jours)
    // part dans l'import du carnet, qui comprend chaque charge et chaque serie
    if (ressembleCarnet(phrase)) {
      deposerTexteCarnet(phrase);
      router.replace('/importer-carnet' as any);
      return;
    }
    tap('medium');
    const r = parseDictee(text);
    setSaid(text);
    setForm({
      sport: r.sport ?? null,
      date: r.date ?? today,
      dateSaid: !!r.date,
      moment: r.moment,
      start: toMin(r.time),
      duration: r.duration ?? null,
      durationFrom: r.durationFrom,
      durationSec: r.durationSec,
      intensity: r.intensity ?? null,
      mood: r.mood ?? null,
      rating: r.rating ?? (r.mood ? MOODS.find((m) => m.value === r.mood)?.rating ?? null : null),
      rounds: r.rounds ?? null,
      roundMin: r.roundMin,
      distance: r.distance ?? null,
      paceSaid: r.paceSaid ? r.paceSec : undefined,
      paceUnit: r.paceUnit,
      speed: r.speed ?? null,
      heartRate: r.heartRate ?? null,
      maxHeartRate: r.maxHeartRate,
      calories: r.calories ?? null,
      outdoor: !!r.outdoor,
      type: r.sessionType ?? null,
      theme: r.technicalTheme ?? '',
      exercises: r.exercises,
      cards: r.partners.map((p, i) => ({ key: `c${i}`, name: p.name, role: p.role, rounds: p.rounds, result: p.result ?? null, given: p.given, taken: p.taken, src: p.src })),
      parsedRounds: r.combatRounds.length ? r.combatRounds : null,
      team: r.team ?? (r.sport && TEAM_SPORTS.has(r.sport) ? {} : null),
      extraNotes: r.extraNotes,
      notes: phrase,
      spans: r.spans,
      guesses: r.guesses,
      learned: r.learned,
      sessionLabel: r.sessionLabel,
      grade: r.grade ?? '',
      gradeEvent: !!r.gradeEvent,
      club: r.club ?? '',
      coach: r.coach ?? '',
      linkId: undefined,
    });
  };

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const kind = form?.sport ? seanceKindFor(form.sport) : null;
  const team = !!form?.sport && TEAM_SPORTS.has(form.sport);
  const sportChips = useMemo(() => {
    const list = form?.sport && !favs.includes(form.sport) ? [form.sport, ...favs] : favs;
    return list.slice(0, 7);
  }, [favs, form?.sport]);
  const understood = form ? Object.keys(form.spans).length : 0;
  // la meme seance deja ecrite par la montre dans Sante, ce jour-la
  const twin = useMemo(
    () => (form?.sport ? findHealthTwin(history, form.sport, form.date, form.start, form.distance) : null),
    [history, form?.sport, form?.date, form?.start, form?.distance],
  );
  const linked = !!twin && form?.linkId === twin.id;

  const answerGuess = (g: DicteeGuess, name: string | null) => {
    if (!form) return;
    tap();
    set({
      guesses: form.guesses.filter((x) => x !== g),
      exercises: name ? form.exercises.map((e, k) => (k === g.index ? { ...e, name } : e)) : form.exercises,
    });
  };

  const src = (...keys: string[]): string[] => {
    if (!form) return [];
    const out: string[] = [];
    for (const k of keys) for (const s of form.spans[k] ?? []) out.push(said.slice(s.start, s.end));
    return out.filter((q, i) => out.findIndex((x) => fold(x) === fold(q)) === i);
  };
  const exSrc = (i: number) => src(`exercice:${i}`);

  // cartes de sparring : une modification renumerote les rounds dans l'ordre des cartes
  const setCards = (cards: CardForm[], renumber = false) => {
    if (!form) return;
    let next = cards;
    if (renumber) {
      let n = 1;
      next = cards.map((c) => {
        const k = Math.max(1, c.rounds.length);
        const rounds = Array.from({ length: k }, (_, i) => n + i);
        n += k;
        return { ...c, rounds };
      });
    }
    const maxRound = Math.max(0, ...next.flatMap((c) => c.rounds));
    set({ cards: next, parsedRounds: null, rounds: Math.max(form.rounds ?? 0, maxRound) || null });
  };
  const updateCard = (key: string, patch: Partial<CardForm>, renumber = false) => {
    if (!form) return;
    setCards(form.cards.map((c) => (c.key === key ? { ...c, ...patch } : c)), renumber);
  };

  const pace = (() => {
    if (!form || !form.distance) return null;
    if (form.paceSaid && form.paceUnit === 'km') return `${fmtPace(form.paceSaid)} /km`;
    const sec = form.durationSec && form.duration === Math.round(form.durationSec / 60) ? form.durationSec : form.duration ? form.duration * 60 : 0;
    if (!sec) return null;
    if (kind === 'cardio' && form.sport && ['velo', 'vtt', 'cycling', 'velo_route', 'spinning', 'gravel', 'velo_electrique'].includes(form.sport)) return `${fmtNum(Math.round((form.distance / (sec / 3600)) * 10) / 10)} km/h`;
    if (form.paceUnit === '100m') return `${fmtPace(sec / (form.distance * 10))} /100 m`;
    return `${fmtPace(sec / form.distance)} /km`;
  })();

  // 17 octobre : a l'enregistrement, le score va dans score_for et score_against, plus dans la note
  // (sansScore) ; vers la saisie complete, la ligne entiere reste pour ne rien perdre
  const noteLines = (f: Form, sansScore = false): string[] => {
    const lines = [...f.extraNotes];
    const tl = f.team ? teamLine(sansScore ? { ...f.team, scoreFor: undefined, scoreAgainst: undefined } : f.team) : '';
    if (tl) lines.push(tl);
    const combat = !!f.sport && seanceKindFor(f.sport) === 'combat';
    if (combat && f.sessionLabel) lines.push(`Type : ${f.sessionLabel.toLowerCase()}`);
    const ll = combat ? learnedLine(f.learned) : '';
    if (ll) lines.push(ll);
    const cl = combat ? contextLine({ grade: f.grade.trim(), gradeEvent: f.gradeEvent, club: f.club.trim(), coach: f.coach.trim() }) : '';
    if (cl) lines.push(cl);
    return lines;
  };
  const themeOf = (f: Form) => f.theme.trim() || f.learned.filter((l) => l.mode !== 'reussi').map((l) => l.label).join(', ');

  const save = async () => {
    if (!form?.sport || saving || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    tap('medium');
    try {
      const combat = kind === 'combat';
      const cardsUsed = form.cards.length > 0;
      const rounds: DicteeRound[] | undefined = combat && form.rounds
        ? form.parsedRounds && cardsUsed
          ? Array.from({ length: Math.max(form.rounds, form.parsedRounds.length) }, (_, i) => form.parsedRounds?.[i] ?? { number: i + 1 })
          : cardsToRounds(form.rounds, form.cards)
        : undefined;
      const notes = [...noteLines(form, true), form.notes.trim()].filter(Boolean).join('\n');
      const theme = combat ? themeOf(form) : '';
      const score = form.team?.scoreFor !== undefined && form.team?.scoreAgainst !== undefined ? { score_for: form.team.scoreFor, score_against: form.team.scoreAgainst } : {};
      const exercises = form.exercises.length
        ? form.exercises.map((e) => ({ name: e.name, sets: Math.max(1, e.sets), reps: e.reps, weight: e.weight, ...(e.distance ? { distance: e.distance } : {}), ...(e.duration ? { duration: e.duration } : {}), ...(e.max || e.load ? { notes: [e.max ? 'Au max' : '', e.load ? CHARGE_LABEL[e.load] : ''].filter(Boolean).join(', ') } : {}) }))
        : undefined;
      if (twin && linked && twin.id) {
        // reliee a la seance de Sante : ses donnees (duree, distance, coeur) restent, on ajoute les tiennes
        const patch: Record<string, unknown> = {
          sport: twin.sport,
          date: twin.date,
          intensity: form.intensity ?? undefined,
          session_mood: form.mood ?? undefined,
          session_rating: form.rating ?? undefined,
          notes: [twin.notes, notes].filter(Boolean).join('\n') || undefined,
          ...score,
          exercises,
          combat_rounds: rounds,
          rounds: twin.rounds ? undefined : form.rounds ?? undefined,
          distance: twin.distance ? undefined : form.distance ?? undefined,
          duration_minutes: twin.duration_minutes ? undefined : form.duration ?? undefined,
          start_time: twin.start_time ? undefined : form.start !== null ? `${pad2(Math.floor(form.start / 60))}:${pad2(form.start % 60)}` : undefined,
        };
        for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];
        const res = await saveSeance(patch as unknown as Training, { editId: twin.id, title: getSportName(twin.sport), sessionTypes: combat && form.type ? [form.type] : undefined, technicalTheme: theme || undefined, methode: 'dictee' });
        await effacerFormulaire(CLE_DICTEE);
        router.replace({ pathname: '/seance/fin' as any, params: { id: String(res.id) } });
        return;
      }
      const result = await saveSeance(
        {
          sport: form.sport,
          date: form.date,
          start_time: form.start !== null ? `${pad2(Math.floor(form.start / 60))}:${pad2(form.start % 60)}` : undefined,
          duration_minutes: form.duration ?? undefined,
          intensity: form.intensity ?? undefined,
          session_mood: form.mood ?? undefined,
          session_rating: form.rating ?? undefined,
          rounds: form.rounds ?? undefined,
          round_duration: form.rounds && form.roundMin ? form.roundMin : undefined,
          combat_rounds: rounds,
          session_type: combat && form.type ? form.type : undefined,
          distance: form.distance ?? undefined,
          speed: form.speed ?? undefined,
          heart_rate: form.heartRate ?? undefined,
          max_heart_rate: form.maxHeartRate ?? undefined,
          calories: form.calories ?? undefined,
          is_outdoor: form.outdoor || undefined,
          exercises,
          notes: notes || undefined,
          ...score,
          source: 'manual',
        },
        { title: getSportName(form.sport), sessionTypes: combat && form.type ? [form.type] : undefined, technicalTheme: theme || undefined, methode: 'dictee' },
      );
      await effacerFormulaire(CLE_DICTEE);
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id) } });
    } catch (err) {
      logger.error('Enregistrement de la séance dictée impossible', err);
      appAlert('Oups', traduire('La séance n’a pas pu être enregistrée. Réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  // la saisie complete du sport, en mode seance faite, avec ce qui a ete compris
  const details = () => {
    if (!form?.sport) return;
    tap();
    const params: Record<string, string> = { sport: form.sport, form: '1', date: form.date };
    if (form.start !== null) params.time = `${pad2(Math.floor(form.start / 60))}:${pad2(form.start % 60)}`;
    if (form.duration) params.duration = String(form.duration);
    if (form.rounds) params.rounds = String(form.rounds);
    if (form.intensity) params.intensity = String(form.intensity);
    if (form.type) params.type = form.type;
    const notes = [...noteLines(form), form.notes.trim()].filter(Boolean).join('\n');
    if (notes) params.notes = notes;
    router.replace({ pathname: seanceRoute(form.sport) as any, params });
  };

  const dayText = form ? (form.date === today ? traduire('Aujourd’hui') : longDay(form.date).charAt(0).toUpperCase() + longDay(form.date).slice(1)) : '';
  const momentStart: Record<string, number> = { matin: 8 * 60, midi: 12 * 60, 'apres-midi': 15 * 60, soir: 19 * 60 };
  const momentText: Record<string, string> = { matin: traduire('le matin'), midi: traduire('le midi'), 'apres-midi': traduire('l’après midi'), soir: traduire('le soir') };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen
        title={traduire("Dicte ta séance")}
        subtitle={form ? traduire('Vérifie, corrige si besoin, enregistre') : traduire('Une phrase suffit, on remplit pour toi')}
        footer={
          form ? (
            <BigButton label={saving ? 'Enregistrement...' : !form.sport ? traduire('Choisis le sport') : linked ? traduire("Ajouter à la séance {0}", HEALTH) : traduire('Enregistrer la séance')} icon="check" onPress={save} disabled={!form.sport || saving} />
          ) : (
            <BigButton label={traduire("Vérifier")} icon="check" onPress={analyze} disabled={!text.trim()} />
          )
        }
      >
        {!form ? (
          <>
            <Enter i={0}>
              <Card style={{ gap: 12, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="mic" size={22} color={P.onPrimary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold">{traduire("Touche le micro du clavier")}</Ink>
                    <Ink size={13} weight="medium" color={P.ink2}>{traduire("et raconte ta séance comme à un pote.")}</Ink>
                  </View>
                </View>
                <TextInput
                  ref={input}
                  value={text}
                  onChangeText={setText}
                  placeholder={traduire("JJB ce soir, 5 rounds de 6 minutes contre Paul, gagné par triangle")}
                  placeholderTextColor={P.muted}
                  multiline
                  textAlignVertical="top"
                  style={[fontStyle('bold'), { minHeight: 120, fontSize: 18, lineHeight: 25, color: P.ink, padding: 12, borderRadius: 14, backgroundColor: P.paper }]}
                  accessibilityLabel={traduire("Ta séance en une phrase")}
                />
                {ressembleCarnet(text) ? (
                  <Ink size={13} weight="bold" color={accent}>{traduire('On dirait tes notes de séances : je vais les importer séance par séance, avec chaque charge et chaque série.')}</Ink>
                ) : null}
                {text.length > 0 ? (
                  <Pressable onPress={() => { setText(''); input.current?.focus(); }} accessibilityRole="button" accessibilityLabel={traduire("Effacer la phrase")} style={{ alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
                    <Ink size={13} weight="bold" color={P.ink2}>Effacer</Ink>
                  </Pressable>
                ) : null}
              </Card>
            </Enter>
            <Enter i={1} style={{ gap: 8 }}>
              <SectionTitle>{traduire("Par exemple")}</SectionTitle>
              {EXAMPLES.map((ex) => (
                <Press key={ex} onPress={() => setText(ex)} accessibilityRole="button" accessibilityLabel={`Exemple : ${traduire(ex)}`}>
                  <View style={{ minHeight: 52, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ink size={14} weight="bold" color={P.ink2} style={{ flex: 1 }}>{traduire(ex)}</Ink>
                    <Icon name="chevron" size={16} color={P.muted} />
                  </View>
                </Press>
              ))}
              <Ink size={13} weight="medium" color={P.muted} style={{ paddingHorizontal: 4 }}>
                {traduire("Je comprends le sport, le jour, l’heure, la durée, ton ressenti, les rounds avec tes partenaires, les finitions, les techniques apprises, ton grade, la distance et l’allure, les exercices avec séries et charges, même décrits avec tes mots, et pour le foot le format, les buts et ton poste. Quand je devine, je te demande. Tout reste sur ton téléphone.")}</Ink>
            </Enter>
          </>
        ) : (
          <>
            <Enter i={0}>
              <Press onPress={() => { setText(said); setForm(null); }} accessibilityRole="button" accessibilityLabel={traduire("Modifier la phrase")}>
                <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 14, gap: 8 }}>
                  <Ink size={12} weight="bold" color={P.muted}>{traduire("Tu as dit")}</Ink>
                  <Text style={[fontStyle('bold'), { fontSize: 16, lineHeight: 24, color: P.ink2 }]}>
                    {pieces(said, form.spans).map((p, i) => (
                      <Text key={i} style={p.on ? [fontStyle('extraBold'), { color: P.ink, backgroundColor: P.accentSoft }] : undefined}>{p.t}</Text>
                    ))}
                  </Text>
                  <Ink size={13} weight="extraBold" color={accent}>{traduire("Modifier la phrase")}</Ink>
                </View>
              </Press>
            </Enter>
            <Ink size={13} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>
              {understood === 0 ? traduire('Je n’ai rien reconnu. Remplis les champs ou reformule, par exemple : boxe 1 h, intense.') : traduire('Surligné : ce que j’ai compris. Ce qui est vide, tu le complètes ou tu le laisses vide. Ta phrase reste dans la note.')}
            </Ink>

            {form.guesses.length || (twin && form.linkId === undefined) || linked ? (
              <View style={{ gap: 10 }}>
                {form.guesses.length || (twin && form.linkId === undefined) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                    <Icon name="flag" size={16} color={accent} />
                    <Ink size={15} weight="extraBold">{traduire("À confirmer{0}", form.guesses.length + (twin && form.linkId === undefined ? 1 : 0) > 1 ? ` (${form.guesses.length + (twin && form.linkId === undefined ? 1 : 0)})` : '')}</Ink>
                  </View>
                ) : null}
                {form.guesses.map((g) => (
                  <GuessCard key={`${g.index}${g.said}`} g={g} onAnswer={(name) => answerGuess(g, name)} />
                ))}
                {twin ? (
                  <TwinCard
                    twin={twin}
                    linked={linked}
                    open={form.linkId === undefined}
                    onLink={() => { tap('medium'); set({ linkId: twin.id ?? null }); }}
                    onNew={() => { tap(); set({ linkId: null }); }}
                    onUndo={() => { tap(); set({ linkId: undefined }); }}
                  />
                ) : null}
              </View>
            ) : null}

            <Field label="Sport" src={src('sport')} empty={!form.sport ? traduire('pas reconnu, à choisir') : undefined}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {sportChips.map((s) => {
                  const on = s === form.sport;
                  return (
                    <Pressable key={s} onPress={() => { tap(); set({ sport: s }); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? P.ink : sportTint(s) }}>
                      <Ink size={14} weight="extraBold" color={on ? P.paper : '#1D2029'}>{sportShortName(s)}</Ink>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label={traduire("Jour")} src={src('jour')} empty={!form.dateSaid ? traduire('pas dit, aujourd’hui par défaut') : undefined}>
              <DayNav value={form.date} onChange={(d) => set({ date: d, dateSaid: true })} label={dayText} size={18} />
            </Field>

            <Field
              label={traduire("Début")}
              src={src('debut')}
              empty={form.start === null ? (form.moment ? traduire("pas d’heure, tu as dit {0}", momentText[form.moment] ?? form.moment) : traduire('pas dit')) : undefined}
              onAdd={form.start === null ? () => set({ start: form.moment && momentStart[form.moment] !== undefined ? momentStart[form.moment] : Math.max(0, Math.floor((new Date().getHours() * 60 - (form.duration ?? 60)) / 15) * 15) }) : undefined}
              onClear={form.start !== null ? () => set({ start: null }) : undefined}
            >
              {form.start !== null ? <Stepper value={form.start} step={15} min={0} max={23 * 60 + 45} unit={traduire("minutes")} size={22} button={34} format={(v) => `${pad2(Math.floor(v / 60))}:${pad2(v % 60)}`} onChange={(v) => set({ start: v })} /> : null}
            </Field>

            <Field
              label={traduire("Durée")}
              src={src('duree')}
              note={form.duration !== null && form.durationFrom ? traduire("pas dite, déduite : {0}", form.durationFrom) : undefined}
              empty={form.duration === null ? traduire('pas dite') : undefined}
              onAdd={form.duration === null ? () => set({ duration: 60 }) : undefined}
              onClear={form.duration !== null ? () => set({ duration: null, durationFrom: undefined }) : undefined}
            >
              {form.duration !== null ? <Stepper value={form.duration} step={5} min={5} max={600} unit={traduire("minutes")} size={22} button={34} format={(v) => fmtMinutes(v)} onChange={(v) => set({ duration: v, durationFrom: undefined, durationSec: undefined })} /> : null}
            </Field>

            <Field label="Ressenti" src={src('ressenti')} empty={form.mood === null ? traduire('pas dit') : undefined}>
              <ChoiceRow options={MOODS.map((m) => ({ value: m.value, label: m.label }))} value={form.mood} onChange={(v) => set({ mood: v, rating: v ? MOODS.find((m) => m.value === v)?.rating ?? null : null })} />
            </Field>

            <Field label={traduire("Intensité")} src={src('intensite')} empty={form.intensity === null ? traduire('pas dite') : undefined}>
              <ChoiceRow options={RPE} value={form.intensity} onChange={(v) => set({ intensity: v })} columns={4} />
            </Field>

            {kind === 'combat' ? (
              <Field label="Techniques" src={src('appris')} empty={form.learned.length === 0 ? traduire('aucune citée') : undefined} note={form.learned.length ? traduire('ce que tu as appris ou travaillé, pas les finitions de sparring') : undefined}>
                {(['appris', 'drill', 'travaille', 'reussi'] as const).map((mode) => {
                  const list = form.learned.filter((l) => l.mode === mode);
                  if (!list.length) return null;
                  return (
                    <View key={mode} style={{ gap: 6 }}>
                      <Ink size={13} weight="bold" color={P.ink2}>{LEARN_HEAD[mode]}</Ink>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {list.map((l) => (
                          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36, borderRadius: 12, paddingLeft: 12, backgroundColor: mode === 'reussi' ? P.mossSoft : P.accentSoft }}>
                            <Ink size={13} weight="extraBold" color={mode === 'reussi' ? P.mossText : P.ink}>{l.note ? `${l.label} (${l.note})` : l.label}</Ink>
                            <Pressable onPress={() => { tap(); set({ learned: form.learned.filter((x) => x !== l) }); }} accessibilityRole="button" accessibilityLabel={`Retirer ${l.label}`} hitSlop={4} style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="close" size={13} color={P.muted} />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </Field>
            ) : null}

            {kind === 'combat' && (form.grade || form.gradeEvent || form.club || form.coach) ? (
              <Field label="Contexte" src={src('grade', 'club', 'prof')} note={form.gradeEvent ? traduire('passage de grade, bravo') : undefined}>
                <View style={{ gap: 8 }}>
                  {([['grade', 'Grade', 'Ceinture bleue...'], ['coach', 'Professeur', 'Nom du prof'], ['club', 'Club', 'Nom du club']] as const).map(([k, label, ph]) =>
                    form[k] || (k === 'grade' && form.gradeEvent) ? (
                      <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ink size={13} weight="bold" color={P.ink2} style={{ width: 78 }}>{label}</Ink>
                        <TextInput
                          value={form[k]}
                          onChangeText={(t) => set({ [k]: t } as Partial<Form>)}
                          placeholder={ph}
                          placeholderTextColor={P.muted}
                          accessibilityLabel={label}
                          style={[fontStyle('bold'), { flex: 1, minHeight: 40, fontSize: 15, color: P.ink, paddingHorizontal: 12, borderRadius: 12, backgroundColor: P.paper }]}
                        />
                      </View>
                    ) : null,
                  )}
                </View>
              </Field>
            ) : null}

            {kind === 'combat' || form.rounds !== null ? (
              <Field
                label="Rounds"
                src={src('rounds', 'blocs')}
                empty={form.rounds === null ? traduire('pas dits') : form.roundMin ? traduire("de {0} min", form.roundMin) : undefined}
                onAdd={form.rounds === null ? () => set({ rounds: 5 }) : undefined}
                onClear={form.rounds !== null ? () => set({ rounds: null, roundMin: undefined }) : undefined}
              >
                {form.rounds !== null ? <Stepper value={form.rounds} step={1} min={1} max={40} unit="rounds" size={22} button={34} onChange={(v) => set({ rounds: v, parsedRounds: form.parsedRounds && v >= form.parsedRounds.length ? form.parsedRounds : null })} /> : null}
              </Field>
            ) : null}

            {kind === 'combat' ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 8 }}>
                  <Ink size={15} weight="extraBold" style={{ flex: 1 }}>Sparring</Ink>
                  {form.cards.length === 0 ? <Ink size={13} weight="medium" color={P.muted}>{traduire("personne de cité")}</Ink> : null}
                </View>
                {form.cards.map((c) => (
                  <PartnerCard
                    key={c.key}
                    card={c}
                    src={c.src.map((s) => said.slice(s.start, s.end))}
                    onChange={(patch, renumber) => updateCard(c.key, patch, renumber)}
                    onRemove={() => setCards(form.cards.filter((x) => x.key !== c.key), true)}
                  />
                ))}
                <Pressable
                  onPress={() => {
                    tap();
                    const next = Math.max(0, ...form.cards.flatMap((x) => x.rounds)) + 1;
                    setCards([...form.cards, { key: `c${Date.now()}`, name: '', rounds: [next], result: null, given: [], taken: [], src: [] }]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={traduire("Ajouter un partenaire")}
                  style={{ minHeight: 48, borderRadius: 16, backgroundColor: fondAjouter(), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <PlusPastille taille={26} />
                  <Ink size={14} weight="extraBold" color={P.accentText}>{traduire("Ajouter un partenaire")}</Ink>
                </Pressable>
              </View>
            ) : null}

            {kind === 'combat' ? (
              <Field label={traduire("Type de séance")} src={src('type')} empty={form.type === null ? traduire('pas dit') : undefined} note={form.sessionLabel ? traduire("tu as dit : {0}, noté dans la note", form.sessionLabel.toLowerCase()) : undefined}>
                <ChoiceRow options={SESSION_TYPES} value={form.type as never} onChange={(v) => set({ type: v })} />
              </Field>
            ) : null}

            {kind === 'combat' ? (
              <Field label={traduire("Thème technique")} src={src('theme')} empty={!form.theme ? (form.learned.length ? traduire('pas dit, tes techniques serviront de thème') : traduire('pas dit')) : undefined}>
                <TextInput
                  value={form.theme}
                  onChangeText={(t) => set({ theme: t })}
                  placeholder={traduire("Passage de garde, défense de dos...")}
                  placeholderTextColor={P.muted}
                  accessibilityLabel={traduire("Thème technique")}
                  style={[fontStyle('bold'), { minHeight: 44, fontSize: 15, color: P.ink, paddingHorizontal: 12, borderRadius: 12, backgroundColor: P.paper }]}
                />
              </Field>
            ) : null}

            {(kind === 'cardio' && !team) || form.distance !== null ? (
              <Field
                label="Distance"
                src={src('distance')}
                note={pace ? `allure ${form.paceSaid ? '' : traduire('calculée ')}${pace}` : undefined}
                empty={form.distance === null ? traduire('pas dite') : undefined}
                onAdd={form.distance === null ? () => set({ distance: 5 }) : undefined}
                onClear={form.distance !== null ? () => set({ distance: null }) : undefined}
              >
                {form.distance !== null ? <Stepper value={form.distance} step={0.5} min={0.1} max={400} decimals unit={traduire("kilomètres")} size={22} button={34} format={(v) => `${fmtNum(v)} km`} onChange={(v) => set({ distance: v })} /> : null}
              </Field>
            ) : null}

            {form.heartRate !== null || form.calories !== null ? (
              <Field label="Cardio" src={src('fc', 'calories')}>
                <View style={{ gap: 10 }}>
                  {form.heartRate !== null ? <Stepper value={form.heartRate} step={1} min={40} max={230} unit={traduire("battements par minute")} size={20} button={32} format={(v) => traduire("{0} bpm de moyenne", v)} onChange={(v) => set({ heartRate: v })} /> : null}
                  {form.calories !== null ? <Stepper value={form.calories} step={10} min={0} max={6000} unit="calories" size={20} button={32} format={(v) => `${v} kcal`} onChange={(v) => set({ calories: v })} /> : null}
                </View>
              </Field>
            ) : null}

            {kind === 'muscu' || form.exercises.length > 0 ? (
              <Field label={traduire("Exercices")} empty={form.exercises.length === 0 ? traduire('aucun compris, à ajouter avec Plus de détails') : undefined}>
                {form.exercises.map((e, i) => (
                  <ExerciseRow
                    key={`${e.name}${i}`}
                    ex={e}
                    first={i === 0}
                    src={exSrc(i)}
                    onChange={(patch) => set({ exercises: form.exercises.map((x, k) => (k === i ? { ...x, ...patch } : x)) })}
                    onRemove={() => set({ exercises: form.exercises.filter((_, k) => k !== i) })}
                  />
                ))}
                {kind === 'muscu' ? (
                  <View style={{ paddingTop: form.exercises.length ? 10 : 0 }}>
                    <MachineFinderButton onPress={() => setMachines(true)} />
                    <MachineFinder
                      visible={machines}
                      onClose={() => setMachines(false)}
                      onPick={(name) => set({ exercises: [...form.exercises, { name, sets: 0, reps: 0, weight: 0, missing: ['sets', 'reps', 'weight'] }] })}
                    />
                  </View>
                ) : null}
              </Field>
            ) : null}

            {team || form.team ? (
              <Field label={form.team?.match ? 'Match' : traduire('Ton match')} src={src('format', 'cadre', 'buts', 'passes', 'poste', 'score', 'points', 'essais')} note={traduire("score enregistré à part, le reste dans la note de la séance")}>
                <View style={{ gap: 12 }}>
                  {form.sport === 'football' || form.sport === 'futsal' ? (
                    <View style={{ gap: 6 }}>
                      <Ink size={13} weight="bold" color={P.ink2}>Format</Ink>
                      <ChoiceRow options={FORMATS} value={form.team?.format ?? null} onChange={(v) => set({ team: { ...(form.team ?? {}), format: v ?? undefined } })} columns={4} />
                    </View>
                  ) : null}
                  <View style={{ gap: 6 }}>
                    <Ink size={13} weight="bold" color={P.ink2}>{traduire("Avec qui")}</Ink>
                    <ChoiceRow options={CADRES} value={form.team?.cadre ?? null} onChange={(v) => set({ team: { ...(form.team ?? {}), cadre: v ?? undefined } })} columns={3} />
                  </View>
                  <TeamStepper label={traduire("Buts")} value={form.team?.goals} onChange={(v) => set({ team: { ...(form.team ?? {}), goals: v } })} />
                  <TeamStepper label={traduire("Passes décisives")} value={form.team?.assists} onChange={(v) => set({ team: { ...(form.team ?? {}), assists: v } })} />
                  {form.team?.scoreFor !== undefined && form.team?.scoreAgainst !== undefined ? (
                    <Ink size={14} weight="bold">{form.team.result === 'win' ? traduire("Score : {0} à {1}, victoire", form.team.scoreFor, form.team.scoreAgainst) : form.team.result === 'loss' ? traduire("Score : {0} à {1}, défaite", form.team.scoreFor, form.team.scoreAgainst) : traduire("Score : {0} à {1}, nul", form.team.scoreFor, form.team.scoreAgainst)}</Ink>
                  ) : null}
                  <View style={{ gap: 6 }}>
                    <Ink size={13} weight="bold" color={P.ink2}>{traduire("Poste")}</Ink>
                    <TextInput
                      value={form.team?.position ?? ''}
                      onChangeText={(t) => set({ team: { ...(form.team ?? {}), position: t || undefined } })}
                      placeholder="Ailier, milieu, gardien..."
                      placeholderTextColor={P.muted}
                      accessibilityLabel="Poste"
                      style={[fontStyle('bold'), { minHeight: 44, fontSize: 15, color: P.ink, paddingHorizontal: 12, borderRadius: 12, backgroundColor: P.paper }]}
                    />
                  </View>
                </View>
              </Field>
            ) : null}

            <Field label="Note" note={noteLines(form).length ? traduire("ajouté en tête : {0}", noteLines(form).join(' ; ')) : undefined}>
              <TextInput
                value={form.notes}
                onChangeText={(t) => set({ notes: t })}
                multiline
                placeholder={traduire("Ce que tu as travaillé, avec qui")}
                placeholderTextColor={P.muted}
                accessibilityLabel={traduire("Note sur la séance")}
                style={[fontStyle('medium'), { minHeight: 64, fontSize: 15, color: P.ink, textAlignVertical: 'top', paddingVertical: 4 }]}
              />
            </Field>

            {form.sport ? (
              <Press onPress={details} accessibilityRole="button" accessibilityLabel={traduire("Plus de détails, ouvrir la saisie complète")}>
                <View style={{ minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold">{traduire("Plus de détails")}</Ink>
                    <Ink size={12} weight="medium" color={P.ink2}>{kind === 'muscu' ? traduire('séries une par une, charges') : kind === 'combat' ? traduire('saisie complète des rounds et du bilan') : traduire('cardio, fréquence, lieu')}</Ink>
                  </View>
                  <Icon name="chevron" size={16} color={P.muted} />
                </View>
              </Press>
            ) : null}
          </>
        )}
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}

function Field({ label, empty, note, src, children, onAdd, onClear }: { label: string; empty?: string; note?: string; src?: string[]; children?: React.ReactNode; onAdd?: () => void; onClear?: () => void }) {
  const { accent } = useAccent();
  const quote = (src ?? []).filter(Boolean);
  return (
    <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: empty && !quote.length ? P.line2 : P.line, padding: 14, gap: 10 }}>
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 }}>
          <Ink size={14} weight="extraBold" style={{ flexShrink: 0 }}>{label}</Ink>
          {empty ? <Ink size={13} weight="medium" color={P.muted} style={{ flex: 1 }} numberOfLines={2}>{empty}</Ink> : <View style={{ flex: 1 }} />}
          {onAdd ? (
            <Pressable onPress={() => { tap(); onAdd(); }} accessibilityRole="button" accessibilityLabel={traduire("Ajouter : {0}", label)} hitSlop={6} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.paper }}>
              <Icon name="plus" size={14} color={accent} />
              <Ink size={13} weight="extraBold" color={accent}>{traduire("Ajouter")}</Ink>
            </Pressable>
          ) : null}
          {onClear ? (
            <Pressable onPress={() => { tap(); onClear(); }} accessibilityRole="button" accessibilityLabel={`Vider : ${label}`} hitSlop={6} style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: 'center' }}>
              <Ink size={13} weight="bold" color={P.muted}>Vider</Ink>
            </Pressable>
          ) : null}
        </View>
        {quote.length ? (
          <Ink size={12} weight="bold" color={P.accent} numberOfLines={2}>{quote.map((q) => `« ${q} »`).join('  ')}</Ink>
        ) : null}
        {note ? <Ink size={12} weight="medium" color={P.ink2}>{note}</Ink> : null}
      </View>
      {children}
    </View>
  );
}

function TeamStepper({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  const { accent } = useAccent();
  if (value === undefined) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}>
        <Ink size={14} weight="bold" style={{ flex: 1 }}>{label}</Ink>
        <Ink size={13} weight="medium" color={P.muted} style={{ marginRight: 8 }}>{traduire("pas dit")}</Ink>
        <Pressable onPress={() => { tap(); onChange(0); }} accessibilityRole="button" accessibilityLabel={traduire("Ajouter : {0}", label)} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.paper }}>
          <Icon name="plus" size={14} color={accent} />
          <Ink size={13} weight="extraBold" color={accent}>{traduire("Ajouter")}</Ink>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <Ink size={13} weight="bold" color={P.ink2}>{label}</Ink>
      <Stepper value={value} step={1} min={0} max={50} unit={label.toLowerCase()} size={20} button={32} onChange={(v) => onChange(v)} />
    </View>
  );
}

function NumBox({ value, label, onChange, decimals, missing }: { value: number; label: string; onChange: (v: number) => void; decimals?: boolean; missing?: boolean }) {
  const [draft, setDraft] = useState(value ? fmtNum(value) : '');
  useEffect(() => setDraft(value ? fmtNum(value) : ''), [value]);
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <TextInput
        value={draft}
        onChangeText={(t) => {
          setDraft(t);
          const v = Number(t.replace(',', '.'));
          if (Number.isFinite(v) && v >= 0) onChange(decimals ? v : Math.round(v));
        }}
        keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
        accessibilityLabel={label}
        placeholder={missing ? '?' : '0'}
        placeholderTextColor={missing ? P.accent : P.muted}
        style={[fontStyle('extraBold'), { width: 58, minHeight: 40, borderRadius: 10, backgroundColor: P.paper, textAlign: 'center', fontSize: 16, color: P.ink, borderWidth: missing && !draft ? 1 : 0, borderColor: P.accent, borderStyle: 'dashed' }]}
      />
      <Ink size={11} weight="medium" color={missing && !draft ? P.accent : P.muted}>{label}</Ink>
    </View>
  );
}

function ExerciseRow({ ex, first, src, onChange, onRemove }: { ex: DicteeExercise; first: boolean; src: string[]; onChange: (p: Partial<DicteeExercise>) => void; onRemove: () => void }) {
  const cardio = !!ex.distance || !!ex.duration;
  return (
    <View style={{ paddingTop: first ? 0 : 10, borderTopWidth: first ? 0 : 1, borderTopColor: P.line2, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2}>{traduire(ex.name)}</Ink>
          {src.length ? <Ink size={12} weight="bold" color={P.accent} numberOfLines={2}>{src.map((q) => `« ${q} »`).join('  ')}</Ink> : null}
          {cardio ? <Ink size={13} weight="medium" color={P.ink2}>{exLine(ex)}</Ink> : null}
          {ex.load || ex.missing?.length ? (
            <Ink size={12} weight="medium" color={P.ink2}>
              {[ex.load ? CHARGE_LABEL[ex.load] : '', ex.missing?.length ? `à compléter : ${ex.missing.map((m) => (m === 'sets' ? 'séries' : m === 'reps' ? 'répétitions' : 'charge')).join(', ')}` : ''].filter(Boolean).join(', ')}
            </Ink>
          ) : null}
        </View>
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Retirer ${ex.name}`} hitSlop={6} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={18} color={P.muted} />
        </Pressable>
      </View>
      {!cardio ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <NumBox value={ex.sets} label={traduire("séries")} missing={ex.missing?.includes('sets')} onChange={(v) => onChange({ sets: Math.max(1, v), missing: dropMissing(ex, 'sets') })} />
          <NumBox value={ex.max ? 0 : ex.reps} label={ex.max ? 'reps (max)' : 'reps'} missing={ex.missing?.includes('reps')} onChange={(v) => onChange({ reps: v, max: v ? undefined : ex.max, missing: v ? dropMissing(ex, 'reps') : ex.missing })} />
          <NumBox value={ex.weight} label={ex.load === 'pdc' ? 'lest kg' : 'kg'} decimals missing={ex.missing?.includes('weight')} onChange={(v) => onChange({ weight: v, missing: v ? dropMissing(ex, 'weight') : ex.missing })} />
        </View>
      ) : null}
    </View>
  );
}

function PartnerCard({ card, src, onChange, onRemove }: { card: CardForm; src: string[]; onChange: (p: Partial<CardForm>, renumber?: boolean) => void; onRemove: () => void }) {
  const { accent } = useAccent();
  const [adding, setAdding] = useState<'given' | 'taken' | null>(null);
  const bump = (list: 'given' | 'taken', t: DicteeTechnique) => {
    tap();
    const cur = card[list];
    const found = cur.find((x) => x.id === t.id);
    const next = found ? cur.map((x) => (x.id === t.id ? { ...x, count: (x.count ?? 1) + 1 } : x)) : [...cur, { ...t, count: 1 }];
    onChange({ [list]: next } as Partial<CardForm>);
  };
  const remove = (list: 'given' | 'taken', id: string) => {
    tap();
    onChange({ [list]: card[list].filter((x) => x.id !== id) } as Partial<CardForm>);
  };
  const chips = (list: 'given' | 'taken') => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {card[list].map((t) => (
        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36, borderRadius: 12, paddingLeft: 12, backgroundColor: list === 'given' ? P.mossSoft : P.goldSoft }}>
          <Pressable onPress={() => bump(list, t)} accessibilityRole="button" accessibilityLabel={traduire("{0}, toucher pour en ajouter une", techniqueText(t))} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Ink size={13} weight="extraBold" color={list === 'given' ? P.mossText : P.goldDark}>{techniqueText(t)}</Ink>
          </Pressable>
          <Pressable onPress={() => remove(list, t.id)} accessibilityRole="button" accessibilityLabel={`Retirer ${t.label}`} hitSlop={4} style={{ width: 32, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={13} color={P.muted} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => { tap(); setAdding(adding === list ? null : list); }} accessibilityRole="button" accessibilityLabel={list === 'given' ? traduire('Ajouter une finition donnée') : traduire('Ajouter une finition subie')} style={{ minHeight: 36, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: P.paper }}>
        <Icon name="plus" size={13} color={accent} />
        <Ink size={13} weight="extraBold" color={accent}>{card[list].length ? 'Autre' : traduire('Ajouter')}</Ink>
      </Pressable>
    </View>
  );
  const count = card.rounds.length;
  return (
    <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={16} weight="black" color={P.accent}>{(card.name.trim()[0] ?? '?').toUpperCase()}</Ink>
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            value={card.name}
            onChangeText={(t) => onChange({ name: t })}
            placeholder={traduire("Nom du partenaire")}
            placeholderTextColor={P.muted}
            accessibilityLabel={traduire("Nom du partenaire")}
            style={[fontStyle('extraBold'), { fontSize: 16, color: P.ink, minHeight: 32, padding: 0 }]}
          />
          <Ink size={12} weight="medium" color={P.ink2}>{`${card.role ? `${card.role.charAt(0).toUpperCase()}${card.role.slice(1)}, ` : ''}${roundsText(card.rounds)}`}</Ink>
        </View>
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={traduire("Retirer {0}", card.name || traduire('ce partenaire'))} hitSlop={6} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={18} color={P.muted} />
        </Pressable>
      </View>
      {src.length ? <Ink size={12} weight="bold" color={P.accent} numberOfLines={3}>{src.map((q) => `« ${q} »`).join('  ')}</Ink> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ink size={13} weight="bold" color={P.ink2} style={{ flex: 1 }}>{count > 1 ? traduire("{0} rounds", count) : traduire('1 round')}</Ink>
        <Pressable disabled={count <= 1} onPress={() => { tap(); onChange({ rounds: card.rounds.slice(0, -1) }, true); }} accessibilityRole="button" accessibilityLabel={traduire("Un round de moins")} style={{ width: 40, height: 36, borderRadius: 12, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center', opacity: count <= 1 ? 0.4 : 1 }}>
          <Icon name="minus" size={16} color={P.ink} />
        </Pressable>
        <Pressable onPress={() => { tap(); onChange({ rounds: [...card.rounds, (card.rounds[card.rounds.length - 1] ?? 0) + 1] }, true); }} accessibilityRole="button" accessibilityLabel={traduire("Un round de plus")} style={{ width: 40, height: 36, borderRadius: 12, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={16} color={P.ink} />
        </Pressable>
      </View>
      <ChoiceRow options={RESULTS} value={card.result} onChange={(v) => { tap(); onChange({ result: v }); }} columns={3} />
      <View style={{ gap: 6 }}>
        <Ink size={13} weight="bold" color={P.ink2}>{traduire("Tes finitions")}</Ink>
        {chips('given')}
      </View>
      {card.taken.length || adding === 'taken' ? (
        <View style={{ gap: 6 }}>
          <Ink size={13} weight="bold" color={P.ink2}>{traduire("Ses finitions sur toi")}</Ink>
          {chips('taken')}
        </View>
      ) : (
        <Pressable onPress={() => { tap(); setAdding('taken'); }} accessibilityRole="button" accessibilityLabel={traduire("Il t’a soumis")} style={{ minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Ink size={13} weight="bold" color={accent}>{traduire("Il t’a soumis ?")}</Ink>
        </Pressable>
      )}
      {adding ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
          {QUICK_TECHNIQUES.map((t) => (
            <Pressable key={t.id} onPress={() => { bump(adding, t); setAdding(null); }} accessibilityRole="button" accessibilityLabel={`${adding === 'given' ? traduire('Ajouter') : traduire('Ajouter subie')} : ${t.label}`} style={{ minHeight: 36, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: P.line2 }}>
              <Ink size={13} weight="bold">{traduire(t.label)}</Ink>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function dropMissing(ex: DicteeExercise, k: 'sets' | 'reps' | 'weight'): DicteeExercise['missing'] {
  const next = (ex.missing ?? []).filter((x) => x !== k);
  return next.length ? next : undefined;
}

/** « Tu as fait des ecartes a la poulie (vis-a-vis), c'est ca ? » : Oui ou un autre choix, un geste */
function GuessCard({ g, onAnswer }: { g: DicteeGuess; onAnswer: (name: string | null) => void }) {
  const { accent } = useAccent();
  return (
    <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1.5, borderColor: accent, padding: 14, gap: 10 }}>
      <View style={{ gap: 4 }}>
        <Ink size={16} weight="extraBold">{g.question}</Ink>
        <Ink size={12} weight="bold" color={P.accent} numberOfLines={2}>{`« ${g.said} »`}</Ink>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {g.guess ? (
          <BoutonPrincipal onPress={() => onAnswer(null)} haptique="light" accessibilityLabel={traduire("Oui, {0}", g.guess)} label={traduire("Oui")} hauteur={44} rayon={14} tailleTexte={14} lignes={1} compact styleBouton={{ paddingHorizontal: 18, gap: 6 }} icone={(col) => <Icon name="check" size={16} color={col} />} />
        ) : null}
        {g.options.map((o) => (
          <Pressable key={o} onPress={() => onAnswer(o)} accessibilityRole="button" accessibilityLabel={g.guess ? traduire("Non, {0}", o) : o} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: P.line2, backgroundColor: P.paper, justifyContent: 'center', flexShrink: 1 }}>
            <Ink size={14} weight="bold">{o}</Ink>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** la meme seance deja dans Apple Sante : la relier plutot que d'en creer une seconde */
function TwinCard({ twin, linked, open, onLink, onNew, onUndo }: { twin: Training; linked: boolean; open: boolean; onLink: () => void; onNew: () => void; onUndo: () => void }) {
  const { accent } = useAccent();
  const bits = [
    twin.distance ? `${fmtNum(Math.round(twin.distance * 100) / 100)} km` : '',
    twin.duration_minutes ? fmtMinutes(twin.duration_minutes) : '',
    twin.start_time ? `à ${String(twin.start_time).slice(0, 5)}` : '',
  ].filter(Boolean);
  const what = getSportName(twin.sport).toLowerCase();
  if (!open && !linked) return null;
  return (
    <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1.5, borderColor: linked ? P.line : accent, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: linked ? P.mossSoft : P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={linked ? 'check' : 'heart'} size={18} color={linked ? P.mossText : accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={16} weight="extraBold">{linked ? traduire("Reliée à ta séance {0}", HEALTH) : traduire("Déjà dans {0} ce jour", HEALTH)}</Ink>
          <Ink size={13} weight="medium" color={P.ink2}>{`${what.charAt(0).toUpperCase()}${what.slice(1)}${bits.length ? `, ${bits.join(', ')}` : ''}`}</Ink>
        </View>
      </View>
      <Ink size={13} weight="medium" color={P.ink2}>
        {linked ? traduire('Les données de la montre restent, ta note et ton ressenti s’ajoutent. Pas de seconde séance.') : traduire('La relier plutôt que d’en créer une seconde ? Ses données restent, ta phrase s’ajoute.')}
      </Ink>
      {linked ? (
        <Pressable onPress={onUndo} accessibilityRole="button" accessibilityLabel={traduire("Annuler le lien")} style={{ alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' }}>
          <Ink size={13} weight="extraBold" color={accent}>{traduire("Annuler")}</Ink>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <BoutonPrincipal onPress={onLink} haptique="light" accessibilityLabel={traduire("Relier à cette séance")} label="Relier" hauteur={44} rayon={14} tailleTexte={14} lignes={1} compact styleBouton={{ paddingHorizontal: 16, gap: 6 }} icone={(col) => <Icon name="check" size={16} color={col} />} />
          <Pressable onPress={onNew} accessibilityRole="button" accessibilityLabel={traduire("Créer une autre séance")} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: P.line2, backgroundColor: P.paper, justifyContent: 'center' }}>
            <Ink size={14} weight="bold">{traduire("C’est une autre séance")}</Ink>
          </Pressable>
        </View>
      )}
    </View>
  );
}
