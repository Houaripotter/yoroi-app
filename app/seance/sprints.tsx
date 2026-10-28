/**
 * Sprints guidés (28 octobre 2026). Demande d'un ami de Houari : « je veux faire des sprints, que l'appli me
 * guide : échauffement, sprints, récupération, adaptable à tous les niveaux ».
 *
 * Réglage : Débutant, Intermédiaire, Confirmé, 4 fois 4 minutes, ou Personnaliser (lib/v2/intervalles/plan.ts).
 * Pendant la séance : l'écran des Chronos (ActiveChrono, moteur à horodatage useChronoEngine) : l'étape en
 * grand, le compte à rebours, sa couleur, « Sprint 3 sur 6 », l'étape suivante, pause et arrêt, bip et
 * vibration à 3 2 1, écran gardé allumé, Live Activity. Le coach vocal dit chaque étape
 * (useCoachIntervalles), son bouton est en haut à gauche.
 * Fin : la séance est enregistrée comme les autres (saveSeance, sport sprint ou course à pied), puis l'écran
 * de fin de séance.
 *
 * Téléphone verrouillé : le temps est compté depuis des heures absolues, l'étape se recalcule au retour.
 * Le JavaScript s'endort environ 30 s après le verrouillage : plus de bip ni de voix, mais une notification
 * sonne à chaque changement d'étape (lib/v2/intervalles/alertes.ts) si les notifications sont autorisées.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, Vibration, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, ScreenHead, CIcon } from '@/components/yoroi/v2/carnet/ui';
import { ActiveChrono } from '@/components/yoroi/v2/carnet/chrono/ActiveChrono';
import { FinishSheet, SettingRow } from '@/components/yoroi/v2/carnet/chrono/parts';
import { ChoiceGrid, DOCK_SPACE, HugeButton, SetupBlock, SetupHero, StartDock } from '@/components/yoroi/v2/carnet/chrono/setup';
import { BoutonCoachVocal } from '@/components/yoroi/v2/seance/CoachVocal';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { PHASE_COLORS } from '@/lib/v2/carnet/chrono';
import { useChronoEngine, type ChronoEvent } from '@/lib/v2/carnet/useChronoEngine';
import { clock, humanSeconds } from '@/lib/v2/carnet/format';
import {
  ORDRE_PRESETS, PRESETS, ajuster, borner, changementsApres, choixCorrespondant, construirePlan, dureeTotale, estReglages, sportDuPlan, sprintsFaits,
  type ChoixSprint, type CleReglage, type EtapeIntervalle, type ReglagesIntervalles,
} from '@/lib/v2/intervalles/plan';
import { alerteEtape, nomChoix, notesSeance, resumeAutour, resumeSprints, versPhasesChrono } from '@/lib/v2/intervalles/textes';
import { evenementFin, evenementPourEtape } from '@/lib/v2/intervalles/coach';
import { annulerAlertesSprints, planifierAlertesSprints } from '@/lib/v2/intervalles/alertes';
import { useCoachIntervalles } from '@/lib/v2/coachVocal/useCoachIntervalles';
import { SOURCES } from '@/lib/v2/programmes/sources';
import { soundManager } from '@/lib/sounds';
import { timerNotifications } from '@/lib/timerNotifications';
import { backgroundTaskService } from '@/lib/backgroundTaskService';
import { keepAwakeOff, keepAwakeOn } from '@/lib/keepAwakeSafe';
import { useActiviteChrono } from '@/lib/v2/widgets/activiteChrono';
import { saveSeance } from '@/lib/v2/seance/save';
import { hhmm, isoDay } from '@/lib/v2/seance/format';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

/** Ton dernier réglage, repris à l'ouverture */
const REGLAGES_KEY = 'yoroi_sprints_guides_v1';

type EnCours = { plan: EtapeIntervalle[]; reglages: ReglagesIntervalles; choix: ChoixSprint; debutMs: number; finMs: number | null; faits: number };

function haptic(s: ImpactFeedbackStyle) {
  impactAsync(s).catch(() => {});
}

function sans(fn: () => void) {
  try {
    fn();
  } catch {
    // un son ou une vibration ne casse jamais la séance
  }
}

/** Sous titre de chaque réglage tout prêt */
function sousChoix(c: ChoixSprint): string {
  if (c === 'perso') return traduire('à ta main');
  const r = PRESETS[c].reglages;
  return `${r.sprints} x ${humanSeconds(r.sprint)}`;
}

/** La source d'un réglage tout prêt, en clair : « Helgerud 2007 » */
function sourceCourte(id: string | undefined): string | null {
  const s = id ? SOURCES.find((x) => x.id === id) : undefined;
  if (!s) return null;
  return `${s.auteurs.split(/[ ,]/)[0]} ${s.annee}`;
}

export default function SprintsGuides() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [choix, setChoix] = useState<ChoixSprint>('debutant');
  const [reglages, setReglages] = useState<ReglagesIntervalles>(PRESETS.debutant.reglages);
  const [showFinish, setShowFinish] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [faits, setFaits] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const enCours = useRef<EnCours | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { annoncer, reinitialiser } = useCoachIntervalles();

  // ton dernier réglage
  useEffect(() => {
    AsyncStorage.getItem(REGLAGES_KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw) as { choix?: string; reglages?: unknown };
        if (!estReglages(v?.reglages)) return;
        const r = borner(v.reglages);
        setReglages(r);
        setChoix(v.choix === 'perso' ? 'perso' : choixCorrespondant(r));
      })
      .catch(() => {});
  }, []);

  const plan = useMemo(() => construirePlan(reglages), [reglages]);

  // ─── Sons, vibrations et voix de chaque évènement du moteur ─────────────
  const onEvent = useCallback((e: ChronoEvent) => {
    const s = enCours.current;
    if (!s) return;
    switch (e.type) {
      case 'phase': {
        // étape commencée pendant que l'app dormait : rien en retard
        if (!e.live) return;
        const etape = s.plan[e.index];
        const voix = etape ? annoncer(evenementPourEtape(etape)) : false;
        if (!voix) {
          sans(() => {
            if (e.phase.cue === 'go') soundManager.playWizz();
            else if (e.phase.cue === 'bell') soundManager.playBell();
            else if (e.phase.kind === 'repos' && e.phase.duration >= 15) soundManager.playRecovery();
            else soundManager.playBeep();
          });
        }
        if (e.first) haptic(ImpactFeedbackStyle.Medium);
        else {
          haptic(ImpactFeedbackStyle.Heavy);
          sans(() => Vibration.vibrate([0, 400, 150, 400]));
        }
        return;
      }
      case 'countdown':
        sans(() => soundManager.playFinalCountdown(e.n));
        haptic(ImpactFeedbackStyle.Heavy);
        return;
      case 'warn':
        sans(() => soundManager.playCountdownTick(10));
        haptic(ImpactFeedbackStyle.Light);
        return;
      case 'finish': {
        sans(() => backgroundTaskService.end());
        void annulerAlertesSprints();
        s.finMs = Date.now();
        s.faits = s.reglages.sprints;
        setFaits(s.faits);
        if (e.live) {
          const voix = annoncer(evenementFin(s.plan));
          sans(() => {
            if (!voix) soundManager.playVictory();
            Vibration.vibrate([0, 500, 200, 500]);
          });
          haptic(ImpactFeedbackStyle.Heavy);
        }
        if (finishTimer.current) clearTimeout(finishTimer.current);
        finishTimer.current = setTimeout(() => setShowFinish(true), 900);
        return;
      }
      default:
        return;
    }
  }, [annoncer]);

  const engine = useChronoEngine(onEvent);
  const engineRef = useRef(engine);
  engineRef.current = engine;
  const status = engine.status;
  useActiviteChrono(engine, traduire('Sprints guidés'));

  // sons préparés à l'ouverture, tout nettoyé en quittant
  useEffect(() => {
    soundManager.initialize();
    return () => {
      soundManager.cleanup();
      keepAwakeOff();
      if (finishTimer.current) clearTimeout(finishTimer.current);
      void annulerAlertesSprints();
      sans(() => backgroundTaskService.end());
    };
  }, []);

  // écran allumé et temps d'arrière plan tant que ça tourne
  useEffect(() => {
    if (status === 'running') {
      keepAwakeOn();
      sans(() => backgroundTaskService.begin());
    } else {
      if (status !== 'paused') keepAwakeOff();
      sans(() => backgroundTaskService.end());
    }
  }, [status]);

  // arrière plan : une notification par changement d'étape à venir ; retour : tout est annulé
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        void annulerAlertesSprints();
        return;
      }
      const s = enCours.current;
      const eng = engineRef.current;
      const fin = eng.phaseEndsAt();
      if (!s || fin === null) return;
      const alertes = changementsApres(s.plan, eng.index, fin).map((c) => ({ atMs: c.atMs, ...alerteEtape(c.index === null ? null : s.plan[c.index]) }));
      void planifierAlertesSprints(alertes);
    });
    return () => sub.remove();
  }, []);

  const choisir = (c: ChoixSprint) => {
    haptic(ImpactFeedbackStyle.Light);
    setChoix(c);
    if (c !== 'perso') setReglages(PRESETS[c].reglages);
  };

  const regler = (cle: CleReglage, sens: 1 | -1) => {
    setReglages((r) => ajuster(r, cle, sens));
    setChoix('perso');
  };

  const lancer = () => {
    haptic(ImpactFeedbackStyle.Medium);
    setShowFinish(false);
    setRpe(null);
    setFaits(0);
    enCours.current = { plan, reglages, choix, debutMs: Date.now(), finMs: null, faits: 0 };
    reinitialiser();
    engine.start(versPhasesChrono(plan));
    void timerNotifications.proposerAuLancement('sprints');
    AsyncStorage.setItem(REGLAGES_KEY, JSON.stringify({ choix, reglages })).catch(() => {});
  };

  /** Arrêt en cours de route : ce qui est fait peut être enregistré */
  const arreter = () => {
    const s = enCours.current;
    const n = s ? sprintsFaits(s.plan, engine.index, engine.elapsedMs(), engine.status === 'finished') : 0;
    if (finishTimer.current) clearTimeout(finishTimer.current);
    engine.stop();
    void annulerAlertesSprints();
    haptic(ImpactFeedbackStyle.Medium);
    if (s && n > 0) {
      s.finMs = s.finMs ?? Date.now();
      s.faits = n;
      setFaits(n);
      setShowFinish(true);
    } else {
      enCours.current = null;
      setShowFinish(false);
    }
  };

  const recommencer = () => {
    setShowFinish(false);
    if (engine.status !== 'idle') engine.stop();
    enCours.current = null;
    lancer();
  };

  const fermerBilan = () => {
    setShowFinish(false);
    if (engine.status === 'finished') engine.stop();
    enCours.current = null;
  };

  const enregistrer = async () => {
    const s = enCours.current;
    if (!s || savingRef.current || saving) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const debut = new Date(s.debutMs);
      const minutes = Math.max(1, Math.round(((s.finMs ?? Date.now()) - s.debutMs) / 60000));
      const sport = sportDuPlan(s.reglages);
      const result = await saveSeance(
        {
          sport,
          date: isoDay(debut),
          start_time: hhmm(debut),
          duration_minutes: minutes,
          intensity: rpe ?? undefined,
          notes: notesSeance(s.choix, s.reglages, s.faits),
          source: 'manual',
        },
        { title: traduire('Sprints guidés'), methode: 'live' },
      );
      setShowFinish(false);
      if (engine.status !== 'idle') engine.stop();
      enCours.current = null;
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id) } });
    } catch (err) {
      logger.error('Enregistrement des sprints impossible', err);
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être enregistrée. Réessaie.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const s = enCours.current;
  const bilan = s ? [
    { label: traduire('Temps total'), value: clock(Math.max(0, Math.round(((s.finMs ?? Date.now()) - s.debutMs) / 1000))) },
    { label: traduire('Sprints'), value: faits < s.reglages.sprints ? traduire('{0} sur {1}', faits, s.reglages.sprints) : String(s.reglages.sprints) },
    { label: traduire('Chaque sprint'), value: humanSeconds(s.reglages.sprint) },
  ] : [];
  const finSheet = (
    <FinishSheet visible={showFinish} title={traduire('Sprints terminés')} lines={bilan} rpe={rpe} onRpe={setRpe} onSave={enregistrer} onRestart={recommencer} onClose={fermerBilan} />
  );

  // ─── Séance en cours ─────────────────────────────────────────────────
  if (status !== 'idle' && s) {
    const etape = s.plan[engine.index];
    const finished = status === 'finished';
    const total = s.reglages.sprints;
    const track = finished || !etape ? { done: total, total }
      : etape.type === 'sprint' ? { done: etape.numero - 1, total, current: etape.numero }
      : etape.type === 'recup' ? { done: etape.numero, total, current: etape.numero + 1 }
      : etape.type === 'echauffement' ? { done: 0, total, current: 1 }
      : { done: total, total };
    return (
      <>
        <ActiveChrono
          engine={engine}
          name={traduire('Sprints guidés, {0}', nomChoix(s.choix))}
          focusMode={false}
          onStop={arreter}
          confirmStop
          canSkip
          skipLabel={traduire('Passer')}
          titleOverride={finished ? traduire('Bravo, c’est fini') : undefined}
          nextOverride={finished ? null : undefined}
          track={track}
          headerLeft={<BoutonCoachVocal />}
          footer={finished ? <HugeButton title={traduire('Voir le bilan')} icon="check" onPress={() => setShowFinish(true)} /> : undefined}
        />
        {finSheet}
      </>
    );
  }

  // ─── Réglage ─────────────────────────────────────────────────────────
  const totalS = dureeTotale(plan);
  const band = plan.map((e) => ({ seconds: e.duree, color: e.type === 'sprint' ? PHASE_COLORS.effort.main : e.type === 'echauffement' ? PHASE_COLORS.prepa.main : PHASE_COLORS.repos.main }));
  const source = choix !== 'perso' ? sourceCourte(PRESETS[choix].source) : null;
  const autour = resumeAutour(reglages);

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + DOCK_SPACE }} showsVerticalScrollIndicator={false}>
        <ScreenHead title={traduire('Sprints guidés')} subtitle={traduire('Échauffement, sprints, récupération : la voix et le chrono te guident.')} onBack={() => router.back()} right={<BoutonCoachVocal />} />

        <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 18 }}>
          <SetupHero
            label={traduire('Durée totale')}
            big={humanSeconds(totalS)}
            line={resumeSprints(reglages)}
            band={band}
            legend={[
              ...(reglages.echauffement > 0 ? [{ color: PHASE_COLORS.prepa.main, text: traduire('Échauffement') }] : []),
              { color: PHASE_COLORS.effort.main, text: traduire('Sprint') },
              { color: PHASE_COLORS.repos.main, text: traduire('Récupération et retour au calme') },
            ]}
          />

          <SetupBlock title={traduire('Ton niveau')} hint={traduire('Des réglages de départ, à ajuster à ta forme.')}>
            <ChoiceGrid<ChoixSprint>
              items={[...ORDRE_PRESETS, 'perso' as const].map((k) => ({ key: k, title: nomChoix(k), sub: sousChoix(k) }))}
              value={choix}
              onPick={choisir}
              columns={3}
            />
            {source ? (
              <Ink size={13} weight="medium" color={P.muted}>{traduire('Le protocole étudié par {0} : 4 minutes dur, 3 minutes de récupération active.', source)}</Ink>
            ) : null}
          </SetupBlock>

          <SetupBlock title={traduire('Tes intervalles')} hint={choix === 'perso' ? undefined : traduire('Touche moins ou plus pour personnaliser.')}>
            <View>
              <SettingRow label={traduire('Échauffement')} dot={PHASE_COLORS.prepa.main} value={reglages.echauffement === 0 ? traduire('Aucun') : humanSeconds(reglages.echauffement)} onMinus={() => regler('echauffement', -1)} onPlus={() => regler('echauffement', 1)} accent={PHASE_COLORS.prepa.deep} />
              <SettingRow label={traduire('Sprints')} hint={traduire('en tout')} value={String(reglages.sprints)} onMinus={() => regler('sprints', -1)} onPlus={() => regler('sprints', 1)} />
              <SettingRow label={traduire('Sprint')} hint={traduire('à fond')} dot={PHASE_COLORS.effort.main} value={humanSeconds(reglages.sprint)} onMinus={() => regler('sprint', -1)} onPlus={() => regler('sprint', 1)} accent={PHASE_COLORS.effort.deep} />
              <SettingRow label={traduire('Récupération')} hint={traduire('entre deux sprints')} dot={PHASE_COLORS.repos.main} value={humanSeconds(reglages.recup)} onMinus={() => regler('recup', -1)} onPlus={() => regler('recup', 1)} accent={PHASE_COLORS.repos.deep} />
              <SettingRow label={traduire('Retour au calme')} dot={PHASE_COLORS.repos.main} value={reglages.retourCalme === 0 ? traduire('Aucun') : humanSeconds(reglages.retourCalme)} onMinus={() => regler('retourCalme', -1)} onPlus={() => regler('retourCalme', 1)} accent={PHASE_COLORS.repos.deep} />
            </View>
            {autour ? <Ink size={13} weight="medium" color={P.muted}>{autour}</Ink> : null}
          </SetupBlock>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 6 }}>
            <CIcon name="sound" size={18} color={P.muted} />
            <Ink size={13} weight="medium" color={P.ink2} style={{ flex: 1 }}>
              {traduire('Bip et vibration à 3, 2, 1 avant chaque changement. Téléphone verrouillé, une notification sonne à chaque étape si tu les as autorisées.')}
            </Ink>
          </View>
        </View>
      </ScrollView>

      <StartDock>
        <HugeButton title={traduire('Lancer les sprints')} sub={traduire('{0} en tout', humanSeconds(totalS))} icon="play" onPress={lancer} />
      </StartDock>

      {finSheet}
    </View>
  );
}
