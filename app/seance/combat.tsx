/**
 * Seance de combat en direct (maquette S3) : JJB, boxe, MMA, lutte, judo...
 * Type de seance, chrono de rounds (bips, vibrations, pause, plus et moins 10 s),
 * intensite de chaque round en un appui, partenaire, resultat, soumission, theme technique, notes.
 * Plan de jeu, ce qui a marche, ce qui coince, cardio moyen et max, club, lieu, technique notee.
 * Parametres : sport, type, label, slotId, resume ('1'), editId (modification), date, time, duration,
 * clubId, rounds, intensity, notes (aussi sous les anciens noms prefill... et sessionType).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, Vibration, View, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { keepAwakeOn, keepAwakeOff } from '@/lib/keepAwakeSafe';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { SessionDetailsForm, SportRibbon, dayLabel } from '@/components/yoroi/v2/seance/Details';
import { ChoiceRow, Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { getTrainings, getWeeklyPlanById } from '@/lib/database';
import type { CombatRound, Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { playBeepSound, playBellSound, playClapSound, playGongSound, prepareSounds } from '@/lib/soundManager';
import { loadClapEnabled } from '@/lib/v2/carnet/chrono';
import { COMBAT_SPORTS, getSportName } from '@/lib/sports';
import {
  RESULTS, ROUND_INTENSITIES, SESSION_TYPES, advanceTimer, ensureRound, isGrappling, knownPartners,
  libelleTypeSeance, methodSuggestions, sonEnRetard, suggestedRpe, themeCategories, timerLeft, typeAEnregistrer, typeLibre, typeSeanceRelu,
} from '@/lib/v2/seance/combat';
import type { TimerEvent } from '@/lib/v2/seance/combat';
import { fmtClock, fmtMinutes, hhmm, isoDay } from '@/lib/v2/seance/format';
import { useSauvegardeBrouillon } from '@/lib/v2/seance/useSauvegardeBrouillon';
import { clearDraft, loadCombatPrefs, loadDraft, saveCombatPrefs } from '@/lib/v2/seance/model';
import type { CombatDraft, CombatSessionType, LiveRound, RoundIntensity, SessionDetails } from '@/lib/v2/seance/model';
import { detailsFromTraining, loadTrainingForEdit, trainingFromDetails } from '@/lib/v2/seance/edit';
import { aliasTypeSeance, initialDetails, readParams, timeOf, wantsForm } from '@/lib/v2/seance/params';
import { draftAgo, draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { saveSeance } from '@/lib/v2/seance/save';
import { useAlignedNow } from '@/lib/v2/carnet/useAlignedNow';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { intensite, niveauRpe, type NiveauIntensite } from '@/lib/v2/intensite';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, LOCALE } from '@/lib/i18n/tr';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { marquerJourFait } from '@/lib/v2/programmes/suivi';

const RPE = [
  { value: 3, label: traduire('Facile') },
  { value: 5, label: traduire('Correct') },
  { value: 7, label: traduire('Dur') },
  { value: 9, label: traduire('À bloc') },
];

// Vague 32 : intensite des rounds sur l'echelle commune (lib/v2/intensite.ts)
const ROUND_NIVEAU: Record<RoundIntensity, NiveauIntensite> = { detendu: 1, technique: 3, guerre: 4 };

const SESSION_IDS = SESSION_TYPES.map((s) => s.value);

/** Premier texte d'un parametre de navigation */
function param1(v: string | string[] | undefined): string | undefined {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' && x ? x : undefined;
}

/** Nombre entier borne d'un parametre de navigation */
function paramSec(v: string | string[] | undefined, min: number, max: number): number | undefined {
  const n = parseInt(param1(v) ?? '', 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export default function SeanceCombat() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const raw = useLocalSearchParams();
  const params = useMemo(() => readParams(raw), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [bilanOpen, setBilanOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const [draft, setDraft] = useState<CombatDraft | null>(null);
  const [history, setHistory] = useState<Training[]>([]);
  const [detailFor, setDetailFor] = useState<number | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches n'enregistrent jamais la seance deux fois
  const savingRef = useRef(false);
  const [themeCat, setThemeCat] = useState(0);
  const [customTheme, setCustomTheme] = useState('');
  const [sportOpen, setSportOpen] = useState(false);
  const finished = useRef(false);
  const beepKey = useRef('');
  // Claquettes de bois a 10 s de la fin du round (reglage commun aux chronos)
  const clapOn = useRef(true);
  useEffect(() => {
    loadClapEnabled().then((v) => { clapOn.current = v; }).catch(() => {});
    // sons charges d'avance (pas de retard au premier coup) et joues meme en mode silencieux
    prepareSounds().catch(() => {});
  }, []);

  const running = !!draft && (draft.timer.phase === 'round' || draft.timer.phase === 'rest') && draft.timer.paused === null;
  // horloge calee sur la fin du round : un chiffre par seconde, pile
  const now = useAlignedNow(running ? draft?.timer.endsAt ?? null : null, !!draft);

  useEffect(() => {
    (async () => {
      try {
        // affichage immediat (15 octobre 2026) : l'historique complet des seances (lecture lourde) arrive
        // apres, il ne retarde plus l'ecran ; avant, la page restait blanche le temps de tout relire
        getTrainings()
          .catch(() => [])
          .then((trainings) => setHistory((trainings ?? []).filter((t) => t.id !== params.editId)));
        const [existing, prefs, slot] = await Promise.all([
          params.editId ? Promise.resolve(null) : loadDraft(),
          loadCombatPrefs(),
          params.slotId ? getWeeklyPlanById(params.slotId).catch(() => null) : Promise.resolve(null),
        ]);
        const typeOf = (v?: string | null): CombatSessionType => (SESSION_IDS.includes(v as CombatSessionType) ? (v as CombatSessionType) : 'entrainement');

        if (params.editId) {
          const t = await loadTrainingForEdit(params.editId);
          if (!t) {
            appAlert(traduire('Séance introuvable'), traduire('Elle a peut-être été supprimée.'));
            router.back();
            return;
          }
          const saved = t.combat_rounds ?? [];
          const rounds: LiveRound[] = saved.length > 0
            ? saved.map((r) => ({
                number: r.number,
                partner: r.partner || undefined,
                result: r.result,
                method: r.method || r.methodsGiven?.[0] || r.methodsTaken?.[0] || undefined,
                intensity: r.roundIntensity as RoundIntensity | undefined,
                notes: r.notes || undefined,
                orig: r,
              }))
            : Array.from({ length: Math.min(t.rounds ?? 0, 30) }, (_, i) => ({ number: i + 1 }));
          setDraft({
            kind: 'combat',
            form: true,
            editId: params.editId,
            details: detailsFromTraining(t),
            sport: t.sport || 'jjb',
            startedAt: Date.now(),
            // un ancien type hors liste est garde tel quel tant que tu n'en choisis pas un autre
            ...((r) => ({ sessionType: r.sessionType, sessionTypeOrig: r.orig }))(typeSeanceRelu(t.session_type, aliasTypeSeance)),
            roundSec: t.round_duration ? Math.round(t.round_duration * 60) : prefs.roundSec,
            restSec: prefs.restSec,
            totalRounds: Math.max(rounds.length, t.rounds ?? 0, 1),
            rounds,
            theme: t.technical_theme ?? '',
            notes: t.notes ?? '',
            timer: { phase: 'idle', index: 0, endsAt: null, paused: null },
            rpe: t.intensity ?? null,
            hrAvg: t.heart_rate ?? undefined,
            hrMax: t.max_heart_rate ?? undefined,
            gamePlan: t.game_plan ?? '',
            worked: t.what_worked ?? '',
            didnt: t.what_didnt_work ?? '',
          });
          if (t.game_plan || t.what_worked || t.what_didnt_work) setBilanOpen(true);
          return;
        }

        const form = wantsForm(params);
        const details: SessionDetails = initialDetails(
          { ...params, clubId: params.clubId ?? slot?.club_id, time: params.time ?? slot?.time, duration: params.duration ?? slot?.duration_minutes },
          90,
        );
        const startRounds = params.rounds ? Math.min(params.rounds, 30) : 0;
        // 24 octobre 2026 : rounds d'un programme (sac de frappe), duree, repos et consigne de chaque round
        const prog = programmeParId(param1(raw.programme));
        const jourProg = prog?.jours.find((j) => j.id === param1(raw.jour) && j.rounds);
        const fresh = (): CombatDraft => ({
          kind: 'combat',
          form,
          details,
          sport: params.sport || slot?.sport || 'jjb',
          label: params.label ?? slot?.label ?? undefined,
          slotId: params.slotId,
          startedAt: Date.now(),
          sessionType: typeOf(params.sessionType ?? slot?.session_type),
          roundSec: paramSec(raw.roundSec, 10, 1200) ?? prefs.roundSec,
          restSec: paramSec(raw.restSec, 0, 600) ?? prefs.restSec,
          totalRounds: startRounds || prefs.totalRounds,
          ...(prog && jourProg?.rounds ? { programme: { id: prog.id, jourId: jourProg.id }, consignes: jourProg.rounds.consignes.map((x) => traduire(x)) } : {}),
          rounds: form ? Array.from({ length: startRounds }, (_, i) => ({ number: i + 1 })) : [],
          theme: '',
          notes: params.notes ?? '',
          timer: { phase: 'idle', index: 0, endsAt: null, paused: null },
          rpe: params.intensity ?? null,
        });
        if (form) {
          setDraft(fresh());
          return;
        }
        if (existing && existing.kind === 'combat' && params.resume) {
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
                        if (existing.kind === 'combat') setDraft(existing);
                        else router.replace({ pathname: draftRoute(existing) as any, params: { resume: '1' } });
                      },
                    },
                    { text: traduire('Effacer'), style: 'destructive', onPress: async () => { await clearDraft(); setDraft(fresh()); } },
                  ], { cancelable: false }),
              },
              {
                text: traduire('Reprendre'),
                onPress: () => {
                  if (existing.kind === 'combat') setDraft(existing);
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
        logger.error('Ouverture de la seance de combat impossible', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 26 octobre 2026 : le brouillon est ecrit tout de suite, et encore au passage en arriere plan (lib/v2/seance/useSauvegardeBrouillon.ts)
  useSauvegardeBrouillon(draft, finished);

  // L'ecran reste allume pendant les rounds
  useEffect(() => {
    if (!running) return;
    keepAwakeOn('yoroi-seance-combat');
    return () => {
      keepAwakeOff('yoroi-seance-combat');
    };
  }, [running]);

  const fire = useCallback((events: TimerEvent[]) => {
    if (events.includes('all_done')) {
      // fin du dernier round : la cloche
      playBellSound().catch(() => {});
      Vibration.vibrate([0, 600, 200, 600, 200, 600]);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    if (events.includes('round_end')) {
      // fin du round : la cloche (sans repos, elle lance aussi le round suivant : un seul son)
      playBellSound().catch(() => {});
      Vibration.vibrate([0, 500, 200, 500]);
      if (events.includes('round_start')) impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    } else if (events.includes('round_start')) {
      playGongSound().catch(() => {});
      Vibration.vibrate(400);
      impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  }, []);

  // Le chrono avance, avec ses bips
  useEffect(() => {
    if (!draft || !running) return;
    const { draft: next, events, lastAt } = advanceTimer(draft, now);
    if (events.length > 0) {
      // retour d'arriere-plan : un round fini pendant l'absence ne fait plus sonner la cloche en retard
      if (!sonEnRetard(lastAt, Date.now())) fire(events);
      setDraft(next);
      return;
    }
    const left = timerLeft(draft.timer, now);
    const key = `${draft.timer.phase}-${draft.timer.index}-${left}`;
    if (key !== beepKey.current) {
      beepKey.current = key;
      if (draft.timer.phase === 'round' && left === 10 && draft.roundSec > 12) {
        (clapOn.current ? playClapSound() : playBeepSound()).catch(() => {});
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      } else if (draft.timer.phase === 'rest' && left > 0 && left <= 3) {
        playBeepSound().catch(() => {});
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }, [now, running, draft, fire]);

  const update = useCallback((fn: (d: CombatDraft) => CombatDraft) => setDraft((d) => (d ? fn(d) : d)), []);

  const updateRound = (n: number, patch: Partial<LiveRound>) =>
    update((d) => ({ ...d, rounds: d.rounds.map((r) => (r.number === n ? { ...r, ...patch } : r)) }));

  const lastNumber = draft ? draft.rounds.reduce((m, r) => Math.max(m, r.number), 0) : 0;

  const start = () => {
    if (!draft) return;
    const n = lastNumber + 1;
    update((d) => ({
      ...d,
      totalRounds: Math.max(d.totalRounds, n),
      rounds: ensureRound(d.rounds, n),
      timer: { phase: 'round', index: n, endsAt: Date.now() + d.roundSec * 1000, paused: null },
    }));
    // seance de programme : ses reglages de rounds ne remplacent pas les tiens
    if (!draft.programme) saveCombatPrefs({ roundSec: draft.roundSec, restSec: draft.restSec, totalRounds: draft.totalRounds });
    playGongSound().catch(() => {});
    Vibration.vibrate(400);
  };

  const togglePause = () => {
    if (!draft) return;
    const t = draft.timer;
    if (t.phase === 'idle' || t.phase === 'done') return start();
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (t.paused !== null) update((d) => ({ ...d, timer: { ...d.timer, endsAt: Date.now() + (d.timer.paused ?? 0) * 1000, paused: null } }));
    else update((d) => ({ ...d, timer: { ...d.timer, paused: timerLeft(d.timer, Date.now()), endsAt: null } }));
  };

  const shift = (sec: number) => {
    selectionAsync().catch(() => {});
    update((d) => {
      const t = d.timer;
      if (t.phase !== 'round' && t.phase !== 'rest') return d;
      if (t.paused !== null) return { ...d, timer: { ...t, paused: Math.max(1, t.paused + sec) } };
      if (t.endsAt === null) return d;
      return { ...d, timer: { ...t, endsAt: Math.max(Date.now() + 1000, t.endsAt + sec * 1000) } };
    });
  };

  const stopTimer = () =>
    update((d) => ({ ...d, timer: { phase: 'done', index: d.timer.index, endsAt: null, paused: null } }));

  const skipRest = () => update((d) => (d.timer.phase === 'rest' ? { ...d, timer: { ...d.timer, endsAt: Date.now(), paused: null } } : d));

  const elapsedSec = draft ? Math.floor((now - draft.startedAt) / 1000) : 0;

  const partners = useMemo(() => knownPartners(history), [history]);
  const methods = useMemo(() => (draft ? methodSuggestions(draft.sport, history) : []), [draft?.sport, history]);
  const themeCats = useMemo(() => (draft ? themeCategories(draft.sport, history) : []), [draft?.sport, history]);
  const selectedThemes = useMemo(() => (draft?.theme ? draft.theme.split(',').map((s) => s.trim()).filter(Boolean) : []), [draft?.theme]);

  const toggleTheme = (th: string) => {
    selectionAsync().catch(() => {});
    update((d) => {
      const list = d.theme ? d.theme.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const next = list.includes(th) ? list.filter((x) => x !== th) : [...list, th];
      return { ...d, theme: next.join(', ') };
    });
  };

  const abandon = () => {
    if (draft?.form) {
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
    if (!draft || savingRef.current || saving) return;
    savingRef.current = true;
    setSaving(true);
    try {
      // un vrai tableau : addTraining et updateTraining l'encodent une seule fois
      const rounds: CombatRound[] = draft.rounds.map((r) => {
        const out: CombatRound = { ...(r.orig ?? {}), number: r.number };
        delete out.partner; delete out.result; delete out.method; delete out.roundIntensity; delete out.notes;
        if (r.partner?.trim()) out.partner = r.partner.trim();
        if (r.result) out.result = r.result;
        const prevMethod = r.orig?.method || r.orig?.methodsGiven?.[0] || r.orig?.methodsTaken?.[0];
        if (r.method?.trim()) {
          out.method = r.method.trim();
          // les listes d'origine sont gardees si la finition n'a pas change
          if (out.method !== prevMethod || !r.orig) {
            out.methodsGiven = r.result === 'win' ? [out.method] : [];
            out.methodsTaken = r.result === 'loss' ? [out.method] : [];
            out.submissionsGiven = r.result === 'win' ? 1 : 0;
            out.submissionsTaken = r.result === 'loss' ? 1 : 0;
          }
        } else if (prevMethod) {
          out.methodsGiven = [];
          out.methodsTaken = [];
          out.submissionsGiven = 0;
          out.submissionsTaken = 0;
        }
        if (r.intensity) out.roundIntensity = r.intensity;
        if (r.notes?.trim()) out.notes = r.notes.trim();
        return out;
      });
      const start = new Date(draft.startedAt);
      const theme = draft.theme.trim();
      const det = draft.details;
      const pos = (n?: number) => (n && n > 0 ? Math.round(n) : undefined);
      finished.current = true;
      const result = await saveSeance(
        {
          ...(det ? trainingFromDetails(det) : {}),
          sport: draft.sport,
          session_type: typeAEnregistrer(draft),
          date: draft.form && det ? det.date : isoDay(start),
          start_time: draft.form && det ? timeOf(det.startMin) : hhmm(start),
          duration_minutes: draft.form && det ? det.duration : Math.max(1, Math.round(elapsedSec / 60)),
          // 17 octobre : seulement ce que tu as choisi, jamais deduit des rounds
          intensity: draft.rpe ?? undefined,
          rounds: rounds.length || undefined,
          round_duration: rounds.length ? Math.round((draft.roundSec / 60) * 10) / 10 : undefined,
          combat_rounds: rounds.length ? rounds : undefined,
          technical_theme: theme || undefined,
          heart_rate: pos(draft.hrAvg),
          max_heart_rate: pos(draft.hrMax),
          game_plan: draft.gamePlan?.trim() || undefined,
          what_worked: draft.worked?.trim() || undefined,
          what_didnt_work: draft.didnt?.trim() || undefined,
          notes: draft.notes.trim() || undefined,
          source: 'manual',
        },
        { slotId: draft.slotId, title: draft.editId ? getSportName(draft.sport) : draftTitle(draft), technicalTheme: theme, sessionTypes: [typeAEnregistrer(draft)], editId: draft.editId, methode: 'live' },
      );
      setFinishOpen(false);
      // 26 octobre 2026 : la seance est enregistree, le brouillon part tout de suite (sinon, app fermee juste
      // apres, elle reapparaissait « en cours » et pouvait etre enregistree deux fois)
      if (!draft.form) await clearDraft();
      if (draft.programme && !draft.editId) await marquerJourFait(draft.programme.id, draft.programme.jourId, result.id, draft.form && det ? det.date : undefined).catch(() => {});
      if (draft.editId) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        router.back();
        return;
      }
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id) } });
    } catch (err) {
      finished.current = false;
      logger.error('Enregistrement de la seance de combat impossible', err);
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être enregistrée. Elle reste en cours, réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!draft) {
    return <View style={{ flex: 1, backgroundColor: c.background }}><Stack.Screen options={{ gestureEnabled: false }} /></View>;
  }

  const t = draft.timer;
  const left = timerLeft(t, now);
  const phaseTotal = t.phase === 'rest' ? draft.restSec : draft.roundSec;
  const frac = t.phase === 'round' || t.phase === 'rest' ? Math.min(1, left / Math.max(1, phaseTotal)) : t.phase === 'done' ? 0 : 1;
  const ring = Math.min(width - 70, 300);
  const R = ring / 2 - 14;
  const CIRC = 2 * Math.PI * R;
  const ringColor = t.phase === 'rest' ? c.indigo : c.accent;
  const target = t.phase === 'round' ? draft.rounds.find((r) => r.number === t.index) : draft.rounds[draft.rounds.length - 1];
  const detail = draft.rounds.find((r) => r.number === detailFor) ?? null;
  const grappling = isGrappling(draft.sport);
  const dots = Math.min(Math.max(draft.totalRounds, lastNumber), 14);
  const sportName = getSportName(draft.sport);

  const topLine =
    t.phase === 'round' ? traduire("Round {0} sur {1}", t.index, Math.max(draft.totalRounds, t.index))
      : t.phase === 'rest' ? traduire('Repos')
        : t.phase === 'done' ? (lastNumber > 0 ? traduire('Rounds terminés') : traduire('Chrono arrêté'))
          : traduire('Prêt ?');
  const bigTime = t.phase === 'idle' ? fmtClock(draft.roundSec) : t.phase === 'done' ? `${lastNumber}` : fmtClock(left);
  const subLine =
    t.phase === 'round' ? (t.index >= draft.totalRounds ? traduire('dernier round') : draft.restSec > 0 ? traduire("puis {0} de repos", fmtClock(draft.restSec)) : traduire('puis on enchaîne'))
      : t.phase === 'rest' ? traduire("prochain : round {0}", t.index + 1)
        : t.phase === 'done' ? (lastNumber > 1 ? traduire('rounds au compteur') : traduire('round au compteur'))
          : traduire("{0} rounds, {1} de repos", draft.totalRounds, fmtClock(draft.restSec));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      <View style={{ paddingTop: Math.max(insets.top, 24) + 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={draft.form ? abandon : () => router.back()} accessibilityRole="button" accessibilityLabel={draft.form ? traduire('Fermer sans enregistrer') : traduire('Réduire, la séance reste en cours')} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fillSubtle }}>
          <Icon name={draft.form ? 'close' : 'down'} size={draft.form ? 18 : 20} strokeWidth={2.6} />
        </Pressable>
        <Pressable onPress={() => setSportOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("{0}, changer de sport", sportName)} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ink size={14} weight="bold" color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>{draft.label || sportName}, {draft.form && draft.details ? (draft.editId ? traduire('modifier') : dayLabel(draft.details.date).toLocaleLowerCase(LOCALE)) : fmtClock(elapsedSec)}</Ink>
            <Icon name="down" size={14} color={c.textSecondary} />
          </View>
          <Ink size={22} weight="black" tight>{libelleTypeSeance(draft, aliasTypeSeance)}</Ink>
        </Pressable>
        <Pressable onPress={() => setFinishOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}>
          <Ink size={15} weight="extraBold" color={c.onAccent}>{draft.form ? traduire('Enregistrer') : traduire('Terminer')}</Ink>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        {/* Type de seance */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 22, paddingVertical: 10 }}>
          {SESSION_TYPES.map((s) => {
            const on = s.value === draft.sessionType && !typeLibre(draft, aliasTypeSeance);
            return (
              <Pressable key={s.value} onPress={() => { selectionAsync().catch(() => {}); update((d) => ({ ...d, sessionType: s.value, sessionTypeOrig: undefined })); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: c.border }}>
                <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? P.paper : c.textSecondary}>{traduire(s.label)}</Ink>
              </Pressable>
            );
          })}
        </ScrollView>

        {draft.form && draft.details ? (
          <Pressable onPress={() => setFinishOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Changer le jour et la durée")} style={{ marginHorizontal: 22, marginTop: 4, padding: 16, borderRadius: 22, backgroundColor: c.indigoTint, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="calendar" size={24} color={c.indigo} />
            <View style={{ flex: 1 }}>
              <Ink size={18} weight="black" tight>{dayLabel(draft.details.date)}, {timeOf(draft.details.startMin)}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("{0} de séance. Touche pour changer.", fmtMinutes(draft.details.duration))}</Ink>
            </View>
            <Icon name="chevron" size={18} color={c.textMuted} />
          </Pressable>
        ) : null}

        {!draft.form ? (<>
        {/* Rounds en pastilles */}
        {dots > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }} accessibilityLabel={topLine}>
            {Array.from({ length: dots }, (_, i) => {
              const n = i + 1;
              const done = n < t.index || (t.phase !== 'round' && n <= lastNumber);
              const cur = t.phase === 'round' && n === t.index;
              return <View key={n} style={{ width: dots > 8 ? 18 : 30, height: 8, borderRadius: 4, backgroundColor: cur ? c.accent : done ? c.ink : '#D5D2CA' }} />;
            })}
          </View>
        ) : null}

        {/* Le grand chrono */}
        <View style={{ alignItems: 'center', marginTop: 14 }}>
          <View style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={ring} height={ring} style={{ position: 'absolute' }}>
              <Circle cx={ring / 2} cy={ring / 2} r={R} stroke={c.border} strokeWidth={14} fill="none" />
              <Circle cx={ring / 2} cy={ring / 2} r={R} stroke={ringColor} strokeWidth={17} fill="none" strokeLinecap="round" strokeDasharray={`${CIRC}`} strokeDashoffset={CIRC * (1 - frac)} transform={`rotate(-90 ${ring / 2} ${ring / 2})`} />
              <Circle cx={ring / 2} cy={ring / 2} r={R + 5} stroke={ringColor} strokeOpacity={0.25} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * (R + 5)}`} strokeDashoffset={2 * Math.PI * (R + 5) * (1 - frac * 0.97)} transform={`rotate(-88 ${ring / 2} ${ring / 2})`} />
            </Svg>
            <Ink size={16} weight="extraBold" color={t.phase === 'rest' ? c.indigo : c.accent}>{topLine}</Ink>
            <Ink size={Math.round(ring * 0.28)} weight="black" style={{ fontVariant: ['tabular-nums'], lineHeight: Math.round(ring * 0.31) }} accessibilityLiveRegion="polite">{bigTime}</Ink>
            <Ink size={14} color={c.textSecondary}>{t.paused !== null ? traduire('en pause') : subLine}</Ink>
          </View>
        </View>

        {/* 24 octobre 2026 : consigne du round (programme sac de frappe) ; au repos, celle du round suivant */}
        {draft.consignes && draft.consignes.length > 0 ? (() => {
          const n = t.phase === 'rest' ? t.index + 1 : Math.max(1, t.index);
          const txt = draft.consignes[n - 1];
          if (!txt || t.phase === 'done') return null;
          return (
            <View style={{ marginTop: 12, marginHorizontal: 8, padding: 12, borderRadius: 16, backgroundColor: c.accentTint, gap: 2 }}>
              <Ink size={12} weight="extraBold" color={c.accent}>{t.phase === 'round' ? traduire('ROUND {0}', n) : traduire('PROCHAIN ROUND, {0}', n)}</Ink>
              <Ink size={15} weight="bold">{txt}</Ink>
            </View>
          );
        })() : null}

        {/* Commandes */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 18 }}>
          <Pressable onPress={() => shift(-10)} disabled={t.phase === 'idle' || t.phase === 'done'} accessibilityRole="button" accessibilityLabel={traduire("Reculer de 10 secondes")} style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.border : c.fillSubtle, opacity: t.phase === 'idle' || t.phase === 'done' ? 0.4 : 1 })}>
            <Ink size={15} weight="extraBold">− 10</Ink>
          </Pressable>
          <Pressable onPress={togglePause} accessibilityRole="button" accessibilityLabel={t.phase === 'idle' ? traduire('Lancer les rounds') : t.phase === 'done' ? traduire('Encore un round') : t.paused !== null ? traduire('Reprendre') : traduire('Pause')} style={({ pressed }) => ({ width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: t.phase === 'idle' || t.phase === 'done' ? (pressed ? c.accentPressed : c.accent) : pressed ? c.textSecondary : c.ink })}>
            <Icon name={running ? 'pause' : 'play'} size={32} color={t.phase === 'idle' || t.phase === 'done' ? c.onAccent : c.background} />
          </Pressable>
          <Pressable onPress={() => shift(10)} disabled={t.phase === 'idle' || t.phase === 'done'} accessibilityRole="button" accessibilityLabel={traduire("Avancer de 10 secondes")} style={({ pressed }) => ({ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.border : c.fillSubtle, opacity: t.phase === 'idle' || t.phase === 'done' ? 0.4 : 1 })}>
            <Ink size={15} weight="extraBold">+ 10</Ink>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6, minHeight: 44 }}>
          {t.phase === 'rest' ? (
            <Pressable onPress={skipRest} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
              <Ink size={14} weight="bold" color={c.indigo}>{traduire("Passer le repos")}</Ink>
            </Pressable>
          ) : null}
          {t.phase === 'round' || t.phase === 'rest' ? (
            <Pressable onPress={stopTimer} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
              <Ink size={14} weight="bold" color={c.textMuted}>{traduire("Arrêter le chrono")}</Ink>
            </Pressable>
          ) : (
            <Ink size={13} color={c.textMuted} style={{ alignSelf: 'center' }}>{t.phase === 'idle' ? traduire('Tu peux aussi noter tes rounds sans chrono, plus bas.') : traduire('Le bouton rouge relance un round.')}</Ink>
          )}
        </View>

        </>) : null}

        <View style={{ paddingHorizontal: 22, gap: 12, marginTop: 8 }}>
          {/* Reglages du chrono, hors rounds */}
          {t.phase === 'idle' || t.phase === 'done' ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Setting label={draft.form ? traduire('Durée d’un round') : traduire('Round')}>
                <Stepper value={draft.roundSec} step={30} min={30} max={1200} unit={traduire("secondes de round")} layout="stack" size={24} button={44} format={fmtClock} onChange={(v) => update((d) => ({ ...d, roundSec: v }))} />
              </Setting>
              {!draft.form ? (
                <>
                  <Setting label={traduire("Repos")}>
                    <Stepper value={draft.restSec} step={15} min={0} max={600} unit={traduire("secondes de repos")} layout="stack" size={24} button={44} format={fmtClock} onChange={(v) => update((d) => ({ ...d, restSec: v }))} />
                  </Setting>
                  <Setting label={traduire("Rounds")}>
                    <Stepper value={draft.totalRounds} step={1} min={1} max={30} unit="rounds" layout="stack" size={24} button={44} onChange={(v) => update((d) => ({ ...d, totalRounds: v }))} />
                  </Setting>
                </>
              ) : null}
            </View>
          ) : null}

          {/* Intensite du round en un appui */}
          {target ? (
            <View style={{ gap: 8 }}>
              <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Le round {0} était", target.number)}</Ink>
              <ChoiceRow options={ROUND_INTENSITIES} value={target.intensity ?? null} columns={3} onChange={(v) => { selectionAsync().catch(() => {}); updateRound(target.number, { intensity: v ?? undefined }); }} />
              <Pressable onPress={() => setDetailFor(target.number)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: pressed ? c.fillSubtle : blancA(0.7), borderWidth: 1, borderColor: c.border })}>
                <Icon name="pencil" size={20} color={c.textSecondary} />
                <Ink size={15} color={target.partner || target.result || target.method ? c.ink : c.textMuted} style={{ flex: 1 }} numberOfLines={1}>
                  {roundSummary(target) || (grappling ? traduire('Partenaire, résultat, soumission') : traduire('Partenaire, résultat, note'))}
                </Ink>
              </Pressable>
            </View>
          ) : null}

          {/* Liste des rounds */}
          <View style={{ gap: 6, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
              <Ink size={18} weight="black" tight style={{ flex: 1 }}>{traduire("Tes rounds")}</Ink>
              <Pressable onPress={() => { update((d) => ({ ...d, rounds: ensureRound(d.rounds, lastNumber + 1) })); impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); }} accessibilityRole="button" accessibilityLabel={traduire("Ajouter un round sans chrono")} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.fillSubtle }}>
                <Icon name="plus" size={16} strokeWidth={2.8} />
                <Ink size={13} weight="extraBold">{traduire("Un round")}</Ink>
              </Pressable>
            </View>
            {draft.rounds.length === 0 ? (
              <Ink size={14} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{draft.form ? traduire('Ajoute tes rounds avec le bouton Un round. Ils sont facultatifs.') : traduire('Lance le chrono ou ajoute tes rounds à la main.')}</Ink>
            ) : (
              draft.rounds.map((r) => (
                <Pressable key={r.number} onPress={() => setDetailFor(r.number)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fillSubtle : blancA(0.55) })}>
                  <Ink size={15} weight="black" style={{ width: 70 }}>Round {r.number}</Ink>
                  <Ink size={13} color={c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{roundSummary(r) || traduire('touche pour détailler')}</Ink>
                  {r.intensity ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: intensite(ROUND_NIVEAU[r.intensity]).tint }}>
                      <Ink size={11} weight="extraBold" color={intensite(ROUND_NIVEAU[r.intensity]).text}>{traduire(ROUND_INTENSITIES.find((x) => x.value === r.intensity)?.label)}</Ink>
                    </View>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>

          {/* Theme technique */}
          <View style={{ gap: 8, marginTop: 10 }}>
            <Ink size={18} weight="black" tight style={{ paddingHorizontal: 4 }}>{traduire("Thème travaillé")}</Ink>
            {selectedThemes.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {selectedThemes.map((th) => (
                  <Pressable key={th} onPress={() => toggleTheme(th)} accessibilityRole="button" accessibilityLabel={traduire("Retirer {0}", th)} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.ink }}>
                    <Ink size={13} weight="extraBold" color={c.background}>{traduire(th)}</Ink>
                    <Icon name="close" size={12} color={c.background} strokeWidth={3} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {themeOpen ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, borderRadius: 16, paddingHorizontal: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                  <TextInput
                    value={customTheme}
                    onChangeText={setCustomTheme}
                    placeholder={traduire("Passage de garde, triangle, jab...")}
                    placeholderTextColor={c.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={() => { if (customTheme.trim()) { toggleTheme(customTheme.trim()); setCustomTheme(''); } }}
                    accessibilityLabel={traduire("Thème travaillé")}
                    style={[fontStyle('bold'), { flex: 1, fontSize: 15, color: c.ink, paddingVertical: 0 }]}
                  />
                  {customTheme.trim() ? (
                    <Pressable onPress={() => { toggleTheme(customTheme.trim()); setCustomTheme(''); }} accessibilityLabel={traduire("Ajouter ce thème")} hitSlop={4} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="plus" size={18} color={c.onAccent} strokeWidth={2.8} />
                    </Pressable>
                  ) : null}
                </View>
                {themeCats.length > 0 ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {themeCats.map((cat, i) => {
                        const on = i === themeCat;
                        return (
                          <Pressable key={cat.label} onPress={() => setThemeCat(i)} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.fillSubtle : 'transparent' }}>
                            <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textMuted}>{traduire(cat.label)}</Ink>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(themeCats[themeCat]?.themes ?? []).slice(0, 18).map((th) => {
                        const on = selectedThemes.includes(th);
                        return (
                          <Pressable key={th} onPress={() => toggleTheme(th)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.ink : blancA(0.7), borderWidth: on ? 0 : 1, borderColor: c.border }}>
                            <Ink size={13} weight="bold" color={on ? P.paper : c.ink}>{traduire(th)}</Ink>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <Pressable onPress={() => setThemeOpen(true)} accessibilityRole="button" accessibilityState={{ expanded: false }} style={({ pressed }) => ({ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: pressed ? c.fillSubtle : blancA(0.7), borderWidth: 1, borderColor: c.border })}>
                <Icon name="plus" size={16} strokeWidth={2.8} color={c.textSecondary} />
                <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{selectedThemes.length ? traduire('Un autre thème') : traduire('Ajouter un thème travaillé')}</Ink>
              </Pressable>
            )}
          </View>

          <TextInput
            value={draft.notes}
            onChangeText={(v) => update((d) => ({ ...d, notes: v }))}
            placeholder={traduire("Une note sur ta séance")}
            placeholderTextColor={c.textMuted}
            multiline
            accessibilityLabel={traduire("Note sur la séance")}
            style={[fontStyle('medium'), { marginTop: 8, minHeight: 80, fontSize: 15, color: c.ink, padding: 14, borderRadius: 18, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
          />
        </View>
      </ScrollView>

      {/* Detail d'un round */}
      <Sheet visible={!!detail} onClose={() => setDetailFor(null)} title={detail ? traduire("Round {0}", detail.number) : undefined} scroll>
        {detail ? (
          <View style={{ gap: 12 }}>
            <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Partenaire")}</Ink>
            <TextInput
              value={detail.partner ?? ''}
              onChangeText={(v) => updateRound(detail.number, { partner: v })}
              placeholder={traduire("Avec qui ?")}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={traduire("Partenaire")}
              style={[fontStyle('bold'), { height: 50, fontSize: 16, color: c.ink, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
            />
            {partners.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
                {partners.map((p) => (
                  <Pressable key={p} onPress={() => updateRound(detail.number, { partner: p })} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: detail.partner === p ? c.ink : c.fillSoft }}>
                    <Ink size={13} weight="bold" color={detail.partner === p ? c.background : c.ink}>{p}</Ink>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Résultat")}</Ink>
            <ChoiceRow options={RESULTS} value={detail.result ?? null} columns={3} onChange={(v) => updateRound(detail.number, { result: v ?? undefined })} />

            <Ink size={14} weight="bold" color={c.textSecondary}>{grappling ? traduire('Soumission') : 'Finition'}</Ink>
            <TextInput
              value={detail.method ?? ''}
              onChangeText={(v) => updateRound(detail.number, { method: v })}
              placeholder={grappling ? traduire('Triangle, clé de bras...') : traduire('KO, aux points...')}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={grappling ? traduire('Soumission') : 'Finition'}
              style={[fontStyle('bold'), { height: 50, fontSize: 16, color: c.ink, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
              {methods.map((m) => (
                <Pressable key={m} onPress={() => updateRound(detail.number, { method: m })} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: detail.method === m ? c.ink : c.fillSoft }}>
                  <Ink size={13} weight="bold" color={detail.method === m ? c.background : c.ink}>{m}</Ink>
                </Pressable>
              ))}
            </ScrollView>

            <Ink size={14} weight="bold" color={c.textSecondary}>Note</Ink>
            <TextInput
              value={detail.notes ?? ''}
              onChangeText={(v) => updateRound(detail.number, { notes: v })}
              placeholder={traduire("Ce qui a marché, ce qui coince")}
              placeholderTextColor={c.textMuted}
              multiline
              accessibilityLabel={traduire("Note du round")}
              style={[fontStyle('medium'), { minHeight: 70, fontSize: 15, color: c.ink, padding: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => {
                  const n = detail.number;
                  setDetailFor(null);
                  update((d) => ({ ...d, rounds: d.rounds.filter((r) => r.number !== n) }));
                }}
                accessibilityRole="button"
                style={{ minHeight: 52, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center', backgroundColor: c.fillSubtle }}
              >
                <Ink size={15} weight="bold" color={c.danger}>{traduire("Retirer")}</Ink>
              </Pressable>
              <Pressable onPress={() => setDetailFor(null)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.textSecondary : c.ink })}>
                <Ink size={16} weight="extraBold" color={c.background}>{traduire("Valider")}</Ink>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* Changer de sport */}
      <Sheet visible={sportOpen} onClose={() => setSportOpen(false)} title={traduire("Quel sport ?")} scroll>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {COMBAT_SPORTS.map((s) => {
            const on = s.id === draft.sport;
            return (
              <Pressable key={s.id} onPress={() => { update((d) => ({ ...d, sport: s.id, label: d.label === sportName ? undefined : d.label })); setThemeCat(0); setSportOpen(false); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 46, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border }}>
                <Ink size={14} weight="extraBold" color={on ? P.paper : c.ink}>{traduire(s.name)}</Ink>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* Fin de seance */}
      <Sheet visible={finishOpen} onClose={() => setFinishOpen(false)} title={draft.editId ? traduire('Enregistrer les changements ?') : draft.form ? traduire('Enregistrer la séance ?') : traduire('Terminer la séance ?')} scroll>
        <SportRibbon sport={draft.sport} sub={draft.label && draft.label !== getSportName(draft.sport) ? draft.label : undefined} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <MiniStat label={traduire("durée")} value={fmtMinutes(draft.form && draft.details ? draft.details.duration : elapsedSec / 60)} />
          <MiniStat label={draft.rounds.length > 1 ? traduire('rounds') : traduire('round')} value={String(draft.rounds.length)} />
          <MiniStat label="type" value={libelleTypeSeance(draft, aliasTypeSeance)} />
        </View>
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Comment c’était ?")}</Ink>
        <ChoiceRow options={RPE} value={draft.rpe ?? null} onChange={(v) => update((d) => ({ ...d, rpe: v }))} columns={4} niveau={niveauRpe} />
        {draft.rpe == null && suggestedRpe(draft.rounds) ? (
          <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Tes rounds font penser à « {0} ». Rien n’est noté tant que tu ne choisis pas.", RPE.find((o) => o.value === suggestedRpe(draft.rounds))?.label ?? '')}</Ink>
        ) : null}
        {bilanOpen || draft.hrAvg || draft.hrMax || draft.gamePlan || draft.worked || draft.didnt ? (
          <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Setting label={traduire("Cardio moyen")}>
              <Stepper value={draft.hrAvg ?? 0} step={1} max={230} unit={traduire("battements par minute en moyenne")} layout="stack" size={24} button={44} onChange={(v) => update((d) => ({ ...d, hrAvg: v }))} />
            </Setting>
            <Setting label={traduire("Cardio max")}>
              <Stepper value={draft.hrMax ?? 0} step={1} max={240} unit={traduire("battements par minute au maximum")} layout="stack" size={24} button={44} onChange={(v) => update((d) => ({ ...d, hrMax: v }))} />
            </Setting>
          </View>
            <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Ton bilan")}</Ink>
            {([
              { key: 'gamePlan', label: 'Plan de jeu', ph: 'Ce que tu voulais tenter' },
              { key: 'worked', label: 'Ce qui a marché', ph: 'Ta garde, ton timing, une finition' },
              { key: 'didnt', label: 'Ce qui coince', ph: 'À retravailler la prochaine fois' },
            ] as const).map((f) => (
              <TextInput
                key={f.key}
                value={draft[f.key] ?? ''}
                onChangeText={(v) => update((d) => ({ ...d, [f.key]: v }))}
                placeholder={traduire("{0} : {1}", traduire(f.label), traduire(f.ph).toLocaleLowerCase(LOCALE))}
                placeholderTextColor={c.textMuted}
                multiline
                accessibilityLabel={traduire(f.label)}
                style={[fontStyle('medium'), { minHeight: 56, fontSize: 15, color: c.ink, padding: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
              />
            ))}
          </View>
        ) : (
          <Pressable onPress={() => setBilanOpen(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Ink size={14} weight="bold" color={c.indigo}>{traduire("Plus de détails : cardio et ton bilan")}</Ink>
          </Pressable>
        )}
        {draft.details ? <SessionDetailsForm value={draft.details} onChange={(patch) => update((d) => (d.details ? { ...d, details: { ...d.details, ...patch } } : d))} sport={draft.sport} showWhen={!!draft.form} /> : null}
        <Pressable onPress={save} disabled={saving} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent, opacity: saving ? 0.6 : 1 })}>
          <Ink size={16} weight="extraBold" color={c.onAccent}>{saving ? 'Enregistrement...' : draft.editId ? traduire('Enregistrer les changements') : traduire('Enregistrer la séance')}</Ink>
        </Pressable>
        <Pressable onPress={abandon} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={14} weight="bold" color={c.textMuted}>{draft.form ? traduire('Quitter sans enregistrer') : traduire('Abandonner la séance')}</Ink>
        </Pressable>
      </Sheet>
    </View>
  );
}

function roundSummary(r: LiveRound): string {
  const parts: string[] = [];
  if (r.partner?.trim()) parts.push(r.partner.trim());
  if (r.result) parts.push(RESULTS.find((x) => x.value === r.result)?.label.toLowerCase() ?? '');
  if (r.method?.trim()) parts.push(r.method.trim());
  if (!parts.length && r.notes?.trim()) parts.push(r.notes.trim());
  return parts.filter(Boolean).join(', ');
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 18, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border, alignItems: 'center', gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textMuted}>{label}</Ink>
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
