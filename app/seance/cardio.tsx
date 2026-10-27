/**
 * Seance de cardio ou de fitness en direct : chrono, puis distance, allure, calories,
 * frequence cardiaque et intensite, toutes facultatives.
 * Vitesse, pente, resistance, puissance et cadence pour les machines, score pour les sports de match.
 * Parametres : sport, label, slotId, resume ('1'), editId, date, time, duration, clubId, intensity, notes
 * (aussi sous les anciens noms prefill...).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import type { IconName } from '@/components/yoroi/v2/seance/Icon';
import { SessionDetailsForm, SportRibbon, dayLabel } from '@/components/yoroi/v2/seance/Details';
import { ChoiceRow, Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { getProfile, getWeeklyPlanById } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { SPORTS, getSportCategory, getSportName } from '@/lib/sports';
import { fmtClock, fmtMinutes, fmtNum, hhmm, isoDay, parseNum } from '@/lib/v2/seance/format';
import { useSauvegardeBrouillon } from '@/lib/v2/seance/useSauvegardeBrouillon';
import { clearDraft, loadDraft } from '@/lib/v2/seance/model';
import type { CardioDraft, SessionDetails } from '@/lib/v2/seance/model';
import { detailsFromTraining, loadTrainingForEdit, mesuresMachine, sportLibre, trainingFromDetails } from '@/lib/v2/seance/edit';
import { noteSansScore, scoreDeSeance } from '@/lib/v2/seance/score';
import { niveauRpe } from '@/lib/v2/intensite';
import { initialDetails, readParams, timeOf, wantsForm } from '@/lib/v2/seance/params';
import { draftAgo, draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { saveSeance } from '@/lib/v2/seance/save';
import { hasDistance, sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { useNow } from '@/lib/v2/seance/useNow';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { marquerJourFait } from '@/lib/v2/programmes/suivi';

const RPE = [
  { value: 3, label: traduire('Facile') },
  { value: 5, label: traduire('Correct') },
  { value: 7, label: traduire('Dur') },
  { value: 9, label: traduire('À bloc') },
];

/** Texte pose sur la teinte claire de la scene en mode sombre : encre #1D2029 (12,8 a 13,2:1), gris fonce #464B58 (6,8 a 7,1:1), AA sur les six teintes de sportTint */
const SCENE_ENCRE = '#1D2029';
const SCENE_TEXTE_2 = '#464B58';

const SPEED_SPORTS = new Set(['velo', 'cycling', 'vtt', 'spinning', 'aquabike', 'roller', 'ski', 'ski_de_fond']);

/** Premier texte d'un parametre de navigation */
function param1(v: string | string[] | undefined): string | undefined {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' && x ? x : undefined;
}

export default function SeanceCardio() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const raw = useLocalSearchParams();
  const params = useMemo(() => readParams(raw), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [more, setMore] = useState(false);
  const [draft, setDraft] = useState<CardioDraft | null>(null);
  const [femme, setFemme] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches n'enregistrent jamais la seance deux fois
  const savingRef = useRef(false);
  const finished = useRef(false);
  const now = useNow(1000, !!draft && draft.manualMinutes === null);

  useEffect(() => {
    (async () => {
      try {
        const [existing, profile, slot] = await Promise.all([
          params.editId ? Promise.resolve(null) : loadDraft(),
          getProfile().catch(() => null),
          params.slotId ? getWeeklyPlanById(params.slotId).catch(() => null) : Promise.resolve(null),
        ]);
        setFemme(profile?.avatar_gender === 'femme');

        if (params.editId) {
          const t = await loadTrainingForEdit(params.editId);
          if (!t) {
            appAlert(traduire('Séance introuvable'), traduire('Elle a peut-être été supprimée.'));
            router.back();
            return;
          }
          const det = detailsFromTraining(t);
          // 17 octobre : le nom libre du sport « Autre » et le score dans leurs champs (anciennes seances : relus de la note)
          const libre = sportLibre({ sport: t.sport || 'running', session_type: t.session_type }, (id) => SPORTS.some((x) => x.id === id));
          const score = scoreDeSeance(t);
          setDraft({
            kind: 'cardio',
            form: true,
            editId: params.editId,
            details: det,
            sport: libre.sport,
            customName: libre.customName,
            scoreFor: score?.pour,
            scoreAgainst: score?.contre,
            label: undefined,
            startedAt: Date.now(),
            manualMinutes: det.duration,
            distance: t.distance ? String(t.distance) : '',
            calories: t.calories ? String(t.calories) : '',
            heartRate: t.heart_rate ? String(t.heart_rate) : '',
            maxHeartRate: t.max_heart_rate ?? undefined,
            intensity: t.intensity ?? null,
            notes: noteSansScore(t.notes),
            speed: t.speed ?? undefined,
            pente: t.pente ?? undefined,
            resistance: t.resistance ?? undefined,
            watts: t.watts ?? undefined,
            cadence: t.cadence ?? undefined,
          });
          if (t.speed || t.pente || t.resistance || t.watts || t.cadence || t.max_heart_rate) setMore(true);
          return;
        }

        const form = wantsForm(params);
        const details: SessionDetails = initialDetails(
          { ...params, clubId: params.clubId ?? slot?.club_id, time: params.time ?? slot?.time, duration: params.duration ?? slot?.duration_minutes },
          45,
        );
        const fresh = (): CardioDraft => ({
          kind: 'cardio',
          form,
          details,
          sport: params.sport || slot?.sport || 'running',
          label: params.label ?? slot?.label ?? undefined,
          slotId: params.slotId,
          startedAt: Date.now(),
          manualMinutes: form ? details.duration : null,
          distance: '',
          calories: '',
          heartRate: '',
          intensity: params.intensity ?? null,
          notes: params.notes ?? '',
          // 24 octobre 2026 : seance de cardio d'un programme, le jour suivant avance a l'enregistrement
          ...((): Partial<CardioDraft> => {
            const prog = programmeParId(param1(raw.programme));
            const j = prog?.jours.find((x) => x.id === param1(raw.jour) && x.cardio);
            return prog && j ? { programme: { id: prog.id, jourId: j.id } } : {};
          })(),
        });
        if (form) {
          setDraft(fresh());
          return;
        }
        if (existing && existing.kind === 'cardio' && params.resume) {
          setDraft(existing);
          return;
        }
        if (existing) {
          appAlert(
            traduire('Une séance est en cours'),
            traduire("{0}, commencée {1}. Tu la reprends ?", draftTitle(existing), draftAgo(existing)),
            [
              {
                text: traduire('Nouvelle séance'),
                style: 'destructive',
                // 26 octobre 2026 : on ne jette plus une seance en cours sur un seul toucher
                onPress: () =>
                  appAlert(traduire('Effacer la séance en cours ?'), traduire('Ses séries ne seront pas gardées. Pour les garder, reprends la et termine la.'), [
                    {
                      text: traduire('Reprendre'),
                      style: 'cancel',
                      onPress: () => {
                        if (existing.kind === 'cardio') setDraft(existing);
                        else router.replace({ pathname: draftRoute(existing) as any, params: { resume: '1' } });
                      },
                    },
                    { text: traduire('Effacer'), style: 'destructive', onPress: async () => { await clearDraft(); setDraft(fresh()); } },
                  ], { cancelable: false }),
              },
              {
                text: traduire('Reprendre'),
                onPress: () => {
                  if (existing.kind === 'cardio') setDraft(existing);
                  else router.replace({ pathname: draftRoute(existing) as any, params: { resume: '1' } });
                },
              },
            ],
            { cancelable: false },
          );
          return;
        }
        setDraft(fresh());
      } catch (err) {
        logger.error('Ouverture de la seance impossible', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 26 octobre 2026 : le brouillon est ecrit tout de suite, et encore au passage en arriere plan (lib/v2/seance/useSauvegardeBrouillon.ts)
  useSauvegardeBrouillon(draft, finished);

  const update = useCallback((fn: (d: CardioDraft) => CardioDraft) => setDraft((d) => (d ? fn(d) : d)), []);

  if (!draft) {
    return <View style={{ flex: 1, backgroundColor: c.background }}><Stack.Screen options={{ gestureEnabled: false }} /></View>;
  }

  const elapsedSec = Math.floor((now - draft.startedAt) / 1000);
  const minutes = draft.manualMinutes ?? Math.max(1, Math.round(elapsedSec / 60));
  const distance = parseNum(draft.distance) ?? 0;
  const calories = parseNum(draft.calories) ?? 0;
  const hr = parseNum(draft.heartRate) ?? 0;
  const withDistance = hasDistance(draft.sport);
  const speedMode = SPEED_SPORTS.has(draft.sport);
  // course, marche, natation : distance et allure passent en premier, en grand
  const runFirst = withDistance && !speedMode;
  const paceSec = distance > 0 && minutes > 0 && !speedMode ? Math.round((minutes * 60) / distance) : 0;
  const pace = distance > 0 && minutes > 0 ? (speedMode ? `${fmtNum(distance / (minutes / 60), 1)} km/h` : `${fmtClock(Math.round((minutes * 60) / distance))} /km`) : null;
  const image = sportImage(draft.sport, femme, 0);
  const sportName = draft.sport === 'autre' && draft.customName?.trim() ? draft.customName.trim() : getSportName(draft.sport);
  const cat = getSportCategory(draft.sport);
  const withScore = cat === 'collectif' || cat === 'raquettes';
  // 17 octobre : pente, resistance et watts seulement sur machine (tapis, rameur, velo en salle...), jamais pour une course dehors
  const machine = mesuresMachine(draft.sport, draft.details);
  const setDetails = (patch: Partial<SessionDetails>) => update((d) => (d.details ? { ...d, details: { ...d.details, ...patch } } : d));

  const abandon = () => {
    if (draft.form) {
      appAlert(draft.editId ? traduire('Quitter sans enregistrer ?') : traduire('Annuler cette saisie ?'), traduire('Tes changements ne seront pas gardés.'), [
        { text: traduire('Rester'), style: 'cancel' },
        { text: traduire('Quitter'), style: 'destructive', onPress: () => { finished.current = true; setFinishOpen(false); router.back(); } },
      ]);
      return;
    }
    appAlert(traduire('Abandonner la séance ?'), traduire('Rien ne sera enregistré.'), [
      { text: traduire('Continuer'), style: 'cancel' },
      {
        text: traduire('Abandonner'),
        style: 'destructive',
        onPress: async () => {
          finished.current = true;
          setFinishOpen(false);
          await clearDraft();
          router.back();
        },
      },
    ]);
  };

  const save = async () => {
    if (savingRef.current || saving) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const start = new Date(draft.startedAt);
      const det = draft.details;
      const pos = (n?: number) => (n && n > 0 ? n : undefined);
      // 17 octobre : le score dans ses colonnes, plus dans la note (une ancienne ligne de score est retiree, jamais doublee)
      const hasScore = withScore && ((draft.scoreFor ?? 0) > 0 || (draft.scoreAgainst ?? 0) > 0);
      const scoreCols = withScore ? { score_for: hasScore ? draft.scoreFor ?? 0 : null, score_against: hasScore ? draft.scoreAgainst ?? 0 : null } : {};
      const notes = noteSansScore(draft.notes);
      // sport « Autre » : l'identifiant reste « autre », le nom libre va dans le type de seance
      const sport = draft.sport;
      const libre = draft.sport === 'autre' ? { session_type: draft.customName?.trim() || undefined } : {};
      finished.current = true;
      const result = await saveSeance(
        {
          ...(det ? trainingFromDetails(det) : {}),
          ...scoreCols,
          ...libre,
          sport,
          date: draft.form && det ? det.date : isoDay(start),
          start_time: draft.form && det ? timeOf(det.startMin) : hhmm(start),
          duration_minutes: minutes,
          distance: distance > 0 ? Math.round(distance * 100) / 100 : undefined,
          calories: calories > 0 ? Math.round(calories) : undefined,
          heart_rate: hr > 0 ? Math.round(hr) : undefined,
          max_heart_rate: pos(draft.maxHeartRate),
          speed: pos(draft.speed),
          pente: pos(draft.pente),
          resistance: pos(draft.resistance),
          watts: pos(draft.watts),
          cadence: pos(draft.cadence),
          intensity: draft.intensity ?? undefined,
          notes: notes || undefined,
          source: 'manual',
        },
        { slotId: draft.slotId, title: draft.label || sportName, editId: draft.editId, methode: 'live' },
      );
      setFinishOpen(false);
      // 26 octobre 2026 : la seance est enregistree, le brouillon part tout de suite (sinon, app fermee juste
      // apres, elle reapparaissait « en cours » et pouvait etre enregistree deux fois)
      if (!draft.form) await clearDraft();
      if (draft.programme && !draft.editId) await marquerJourFait(draft.programme.id, draft.programme.jourId, result.id, draft.form && det ? det.date : undefined).catch(() => {});
      if (draft.editId) {
        router.back();
        return;
      }
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id) } });
    } catch (err) {
      finished.current = false;
      logger.error('Enregistrement de la seance impossible', err);
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être enregistrée. Elle reste en cours, réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={{ paddingTop: Math.max(insets.top, 24) + 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={draft.form ? abandon : () => router.back()} accessibilityRole="button" accessibilityLabel={draft.form ? traduire('Fermer sans enregistrer') : traduire('Réduire, la séance reste en cours')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fillSubtle }}>
          <Icon name={draft.form ? 'close' : 'down'} size={draft.form ? 18 : 20} strokeWidth={2.6} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {draft.form && draft.details ? <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={1}>{draft.editId ? traduire('Modifier ta séance') : dayLabel(draft.details.date)}</Ink> : null}
          <Ink size={22} weight="black" tight numberOfLines={1}>{draft.label || sportName}</Ink>
        </View>
        <Pressable onPress={() => setFinishOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}>
          <Ink size={15} weight="black" color={c.onPrimary}>{draft.form ? traduire('Enregistrer') : traduire('Terminer')}</Ink>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: insets.bottom + 40, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        {/* Le chrono sur la scene du sport */}
        <View style={{ height: 210, borderRadius: 28, backgroundColor: sportTint(draft.sport), overflow: 'hidden', padding: 20, justifyContent: 'space-between' }}>
          {image ? <Image source={image} style={{ position: 'absolute', right: -16, bottom: -44, width: 190, height: 253 }} resizeMode="contain" /> : null}
          <View style={{ gap: 2 }}>
            {/* 17 octobre : la scene garde sa teinte claire en sombre, le texte reste a l'encre (contraste AA) */}
            <Ink size={14} weight="bold" color={theme.isDark ? SCENE_TEXTE_2 : c.textSecondary}>{draft.form ? traduire('Durée de ta séance') : draft.manualMinutes === null ? traduire('Séance en cours') : traduire('Durée réglée à la main')}</Ink>
            <Ink size={58} weight="black" color={theme.isDark ? SCENE_ENCRE : undefined} style={{ fontVariant: ['tabular-nums'] }}>{draft.manualMinutes === null ? fmtClock(elapsedSec) : fmtMinutes(draft.manualMinutes)}</Ink>
          </View>
          {!draft.form ? <Pressable
            onPress={() => update((d) => ({ ...d, manualMinutes: d.manualMinutes === null ? Math.max(1, Math.round(elapsedSec / 60)) : null }))}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: blancA(0.85) }}
          >
            <Ink size={14} weight="extraBold">{draft.manualMinutes === null ? traduire('Régler la durée') : traduire('Revenir au chrono')}</Ink>
          </Pressable> : null}
        </View>

        {runFirst ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1.25, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: c.border, gap: 4 }}>
              <Ink size={13} weight="bold" color={c.textSecondary}>Distance</Ink>
              <Stepper value={distance} step={0.5} max={500} decimals unit={traduire("kilomètres")} layout="stack" size={34} button={44} onChange={(v) => update((d) => ({ ...d, distance: String(v) }))} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 22, backgroundColor: c.fillSoft, gap: 4 }}>
              <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Allure")}</Ink>
              {paceSec > 0 ? (
                <>
                  <Ink size={34} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontVariant: ['tabular-nums'] }}>{fmtClock(paceSec)}</Ink>
                  <Ink size={12} color={c.textMuted}>{traduire("min par km")}</Ink>
                </>
              ) : (
                <Ink size={14} weight="bold" color={c.textMuted} style={{ textAlign: 'center', paddingVertical: 10 }}>{traduire('Calculée avec\nta distance')}</Ink>
              )}
            </View>
          </View>
        ) : null}

        {draft.sport === 'autre' ? (
          <TextInput
            value={draft.customName ?? ''}
            onChangeText={(v) => update((d) => ({ ...d, customName: v }))}
            placeholder={traduire("Quel sport ? Escalade, padel...")}
            placeholderTextColor={c.textMuted}
            accessibilityLabel={traduire("Nom du sport")}
            style={[fontStyle('bold'), { height: 52, fontSize: 16, color: c.ink, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
          />
        ) : null}

        {draft.manualMinutes !== null ? (
          <Field icon="clock" label={traduire("Durée en minutes")}>
            <Stepper value={draft.manualMinutes} step={5} min={1} max={600} unit={traduire("minutes")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, manualMinutes: v, details: d.details ? { ...d.details, duration: v } : d.details }))} />
          </Field>
        ) : null}

        {withScore ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 20, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("Ton score")}</Ink>
              <Stepper value={draft.scoreFor ?? 0} step={1} max={999} unit={traduire("points pour toi")} layout="stack" size={30} button={44} onChange={(v) => update((d) => ({ ...d, scoreFor: v }))} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 20, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("En face")}</Ink>
              <Stepper value={draft.scoreAgainst ?? 0} step={1} max={999} unit={traduire("points en face")} layout="stack" size={30} button={44} onChange={(v) => update((d) => ({ ...d, scoreAgainst: v }))} />
            </View>
          </View>
        ) : null}

        {withDistance && !runFirst ? (
          <Field icon="route" label={traduire("Distance en km")} extra={pace ? (speedMode ? `moyenne ${pace}` : `allure ${pace}`) : undefined}>
            <Stepper value={distance} step={0.5} max={500} decimals unit={traduire("kilomètres")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, distance: String(v) }))} />
          </Field>
        ) : null}

        <Field icon="flame" label={traduire("Calories")}>
          <Stepper value={calories} step={10} max={5000} unit="calories" size={24} button={40} format={(v) => (v > 0 ? String(Math.round(v)) : '0')} onChange={(v) => update((d) => ({ ...d, calories: String(v) }))} />
        </Field>

        {more || hr > 0 ? (
          <>
            <Field icon="heart" label={traduire("Cardio moyen")}>
              <Stepper value={hr > 0 ? hr : 0} step={1} max={230} unit={traduire("battements par minute")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, heartRate: String(v) }))} />
            </Field>
            <Field icon="heart" label={traduire("Cardio max")}>
              <Stepper value={draft.maxHeartRate ?? 0} step={1} max={240} unit={traduire("battements par minute au maximum")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, maxHeartRate: v }))} />
            </Field>
            {machine ? (
              <>
                <Field icon="bolt" label={traduire("Vitesse en km/h")}>
                  <Stepper value={draft.speed ?? 0} step={0.5} max={80} decimals unit={traduire("kilomètres heure")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, speed: v }))} />
                </Field>
                <Field icon="up" label={traduire("Pente en %")}>
                  <Stepper value={draft.pente ?? 0} step={0.5} max={40} decimals unit={traduire("pour cent de pente")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, pente: v }))} />
                </Field>
                <Field icon="swap" label={traduire("Résistance")}>
                  <Stepper value={draft.resistance ?? 0} step={1} max={40} unit={traduire("niveau de résistance")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, resistance: v }))} />
                </Field>
                <Field icon="flame" label={traduire("Puissance en watts")}>
                  <Stepper value={draft.watts ?? 0} step={5} max={2000} unit="watts" size={24} button={40} onChange={(v) => update((d) => ({ ...d, watts: v }))} />
                </Field>
                <Field icon="route" label={traduire("Cadence par minute")}>
                  <Stepper value={draft.cadence ?? 0} step={1} max={250} unit={traduire("tours par minute")} size={24} button={40} onChange={(v) => update((d) => ({ ...d, cadence: v }))} />
                </Field>
              </>
            ) : null}
          </>
        ) : (
          <Pressable onPress={() => setMore(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Ink size={14} weight="bold" color={c.indigo}>{machine ? traduire('Plus de mesures : cardio, vitesse, pente, watts') : traduire('Plus de mesures : cardio moyen et max')}</Ink>
          </Pressable>
        )}

        <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4, marginTop: 4 }}>{traduire("Comment c’était ?")}</Ink>
        <ChoiceRow options={RPE} value={draft.intensity} columns={4} niveau={niveauRpe} onChange={(v) => { selectionAsync().catch(() => {}); update((d) => ({ ...d, intensity: v })); }} />

        <TextInput
          value={draft.notes}
          onChangeText={(v) => update((d) => ({ ...d, notes: v }))}
          placeholder={traduire("Une note sur ta séance")}
          placeholderTextColor={c.textMuted}
          multiline
          accessibilityLabel={traduire("Note sur la séance")}
          style={[fontStyle('medium'), { minHeight: 80, fontSize: 15, color: c.ink, padding: 14, borderRadius: 18, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
        />
        <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Tout est facultatif sauf la durée. Touche un chiffre pour le taper.")}</Ink>
      </ScrollView>

      <Sheet visible={finishOpen} onClose={() => setFinishOpen(false)} title={draft.editId ? traduire('Enregistrer les changements ?') : draft.form ? traduire('Enregistrer la séance ?') : traduire('Terminer la séance ?')} scroll>
        <SportRibbon sport={draft.sport} femme={femme} title={draft.customName?.trim() || undefined} sub={draft.label && draft.label !== getSportName(draft.sport) ? draft.label : undefined} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat label={traduire("durée")} value={fmtMinutes(minutes)} />
          {distance > 0 ? <MiniStat label="km" value={fmtNum(distance)} /> : null}
          {calories > 0 ? <MiniStat label="calories" value={String(Math.round(calories))} /> : null}
        </View>
        {draft.details ? <SessionDetailsForm value={draft.details} onChange={setDetails} sport={draft.sport} showWhen={!!draft.form} hideDuration /> : null}
        <Pressable onPress={save} disabled={saving} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary, opacity: saving ? 0.6 : 1 })}>
          <Ink size={16} weight="black" color={c.onPrimary}>{saving ? 'Enregistrement...' : draft.editId ? traduire('Enregistrer les changements') : traduire('Enregistrer la séance')}</Ink>
        </Pressable>
        <Pressable onPress={abandon} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={14} weight="bold" color={c.textMuted}>{draft.form ? traduire('Quitter sans enregistrer') : traduire('Abandonner la séance')}</Ink>
        </Pressable>
      </Sheet>
    </View>
  );
}

function Field({ icon, label, extra, children }: { icon: IconName; label: string; extra?: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
      <Icon name={icon} size={22} color={c.textSecondary} />
      <View style={{ flex: 1 }}>
        <Ink size={15} weight="bold">{label}</Ink>
        {extra ? <Ink size={12} weight="bold" color={c.indigo}>{extra}</Ink> : null}
      </View>
      {children}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      <Ink size={20} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
      <Ink size={12} color={c.textMuted}>{label}</Ink>
    </View>
  );
}
