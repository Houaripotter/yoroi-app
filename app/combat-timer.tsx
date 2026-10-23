/**
 * Chrono de sparring (refonte v2) : reglage des rounds, preparation, rounds et repos plein ecran,
 * claquettes de bois a 10 s de la fin de chaque round, resultat de chaque round (victoire,
 * defaite, nul) avec une note, bilan de la session puis enregistrement de la seance.
 * Moteur de temps a horodatage commun aux chronos : regulier, juste au retour de l'arriere-plan.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { keepAwakeOn, keepAwakeOff } from '@/lib/keepAwakeSafe';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { P, Press, ScreenHead, Sheet2, BigButton, Field, ResultDot, BigStats, MiniChips } from '@/components/yoroi/v2/carnet/ui';
import { ActiveChrono } from '@/components/yoroi/v2/carnet/chrono/ActiveChrono';
import { SettingRow, ToggleRow } from '@/components/yoroi/v2/carnet/chrono/parts';
import { DOCK_SPACE, HugeButton, SetupBlock, SetupHero, StartDock } from '@/components/yoroi/v2/carnet/chrono/setup';
import { PHASE_COLORS, PREPA_SECONDS, SAVE_SPORTS_COMBAT, loadClapEnabled, roundPhases, roundsSummary, saveClapEnabled } from '@/lib/v2/carnet/chrono';
import { useChronoEngine, totalSeconds } from '@/lib/v2/carnet/useChronoEngine';
import type { ChronoEvent } from '@/lib/v2/carnet/useChronoEngine';
import { humanSeconds } from '@/lib/v2/carnet/format';
import { soundManager } from '@/lib/sounds';
import logger from '@/lib/security/logger';
import { startLiveActivity, updateLiveActivity, endLiveActivity } from '@/lib/liveActivityBridge';
import { traduire } from '@/lib/i18n/tr';

type AppPhase = 'setup' | 'active' | 'summary';
type RoundResult = 'V' | 'D' | 'N' | null;

interface RoundEntry {
  roundNumber: number;
  result: RoundResult;
  notes: string;
}

interface SetupConfig {
  roundSeconds: number;
  restSeconds: number;
  totalRounds: number;
  prepaSeconds: number;
  partnerName: string;
}

const RESULT_LABEL: Record<NonNullable<RoundResult>, string> = { V: traduire('Victoire'), D: traduire('Défaite'), N: 'Nul' };
const RESULT_COLOR: Record<NonNullable<RoundResult>, string> = { V: P.moss, D: P.danger, N: P.gold };

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // un son ne doit jamais bloquer le chrono
  }
}

export default function CombatTimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [config, setConfig] = useState<SetupConfig>({ roundSeconds: 300, restSeconds: 60, totalRounds: 5, prepaSeconds: PREPA_SECONDS, partnerName: '' });
  const [sport, setSport] = useState('jjb');
  const [appPhase, setAppPhase] = useState<AppPhase>('setup');
  const startedAtRef = useRef<number>(0);
  // fin des rounds : la duree enregistree s'arrete la, meme si le bilan reste ouvert longtemps
  const endedAtRef = useRef<number | null>(null);
  const [clapOn, setClapOn] = useState(true);
  const clapRef = useRef(true);
  clapRef.current = clapOn;

  const [showResultSheet, setShowResultSheet] = useState(false);
  const [pendingResult, setPendingResult] = useState<RoundResult>(null);
  const [pendingNotes, setPendingNotes] = useState('');
  const [roundsHistory, setRoundsHistory] = useState<RoundEntry[]>([]);

  useEffect(() => {
    soundManager.initialize();
    loadClapEnabled().then(setClapOn).catch(() => {});
    return () => {
      endLiveActivity().catch(() => {});
      soundManager.cleanup();
    };
  }, []);

  // Ecran allume pendant les rounds
  useEffect(() => {
    if (appPhase === 'active') keepAwakeOn('combat-timer');
    else keepAwakeOff('combat-timer');
    return () => {
      keepAwakeOff('combat-timer');
    };
  }, [appPhase]);

  const onEvent = useCallback((e: ChronoEvent) => {
    switch (e.type) {
      case 'phase':
        if (!e.live) return;
        if (e.phase.cue === 'gong') safe(() => soundManager.playGong());
        else if (e.phase.cue === 'bell') safe(() => soundManager.playBell());
        else if (e.phase.cue === 'beep') safe(() => soundManager.playBeep());
        impactAsync(e.first ? ImpactFeedbackStyle.Medium : ImpactFeedbackStyle.Heavy).catch(() => {});
        return;
      case 'clap':
        if (!clapRef.current) return;
        safe(() => soundManager.playClap());
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
        return;
      case 'countdown':
        safe(() => soundManager.playFinalCountdown(e.n));
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
        return;
      case 'hold':
        // fin du round : la cloche (ding ding ding), puis le resultat
        if (e.live) safe(() => soundManager.playBell());
        impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
        setTimeout(() => {
          notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        }, 200);
        setPendingResult(null);
        setPendingNotes('');
        setShowResultSheet(true);
        return;
      case 'finish':
        endedAtRef.current = Date.now();
        safe(() => soundManager.playVictory());
        setAppPhase('summary');
        return;
      default:
        return;
    }
  }, []);

  const engine = useChronoEngine(onEvent);

  // Ilot dynamique : temps ecoule de la session, recale a chaque seconde affichee
  const round = engine.phase?.step ?? 1;
  useEffect(() => {
    if (appPhase !== 'active' || !startedAtRef.current) return;
    updateLiveActivity({ elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)), rounds: round }).catch(() => {});
  }, [engine.display, round, appPhase]);

  useEffect(() => {
    if (appPhase === 'summary') endLiveActivity().catch(() => {});
  }, [appPhase]);

  const phasesFor = (c: SetupConfig) =>
    roundPhases({ rounds: c.totalRounds, round: c.roundSeconds, rest: c.restSeconds, prepa: c.prepaSeconds, clap: true, hold: true })
      // la cloche sonne a la fin du round : le repos demarre sans second son
      .map((p) => (p.kind === 'repos' ? { ...p, cue: 'none' as const } : p));

  const handleStart = useCallback(() => {
    logger.info('CombatTimer: session démarrée', { rounds: config.totalRounds, roundSeconds: config.roundSeconds, restSeconds: config.restSeconds });
    Keyboard.dismiss();
    setRoundsHistory([]);
    setAppPhase('active');
    startedAtRef.current = Date.now();
    endedAtRef.current = null;
    engine.start(phasesFor(config));
    startLiveActivity({
      sportName: config.partnerName ? `Sparring contre ${config.partnerName}` : 'Sparring',
      sportIcon: 'figure.martial.arts',
      sportColorHex: '2C4A84',
    }).catch(() => {});
  }, [config, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = useCallback(() => {
    engine.stop();
    setAppPhase('setup');
    setShowResultSheet(false);
    impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    endLiveActivity().catch(() => {});
    logger.info('CombatTimer: session arrêtée manuellement');
  }, [engine]);

  const currentRound = engine.phase?.step ?? 1;

  const handleConfirmResult = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    const entry: RoundEntry = { roundNumber: currentRound, result: pendingResult, notes: pendingNotes };
    setRoundsHistory((h) => [...h, entry]);
    setShowResultSheet(false);
    engine.advance();
  }, [currentRound, pendingResult, pendingNotes, engine]);

  const wins = roundsHistory.filter((r) => r.result === 'V').length;
  const losses = roundsHistory.filter((r) => r.result === 'D').length;
  const draws = roundsHistory.filter((r) => r.result === 'N').length;

  const step = (field: 'roundSeconds' | 'restSeconds' | 'totalRounds' | 'prepaSeconds', delta: number, min: number, max: number) => {
    setConfig((prev) => ({ ...prev, [field]: Math.max(min, Math.min(max, prev[field] + delta)) }));
  };

  const saveSession = () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    const end = endedAtRef.current ?? Date.now();
    const minutes = Math.max(1, Math.round((end - (startedAtRef.current || end)) / 60000));
    const partner = config.partnerName.trim();
    const detail = roundsHistory.map((r) => `R${r.roundNumber} ${r.result ? RESULT_LABEL[r.result].toLowerCase() : traduire('sans résultat')}${r.notes.trim() ? ` (${r.notes.trim()})` : ''}`).join(', ');
    const notes = `Sparring${partner ? traduire(" avec {0}", partner) : ''} : ${roundsHistory.length} rounds, ${wins} V, ${losses} D, ${draws} N. ${detail}`;
    router.push({ pathname: '/seance/deja-faite' as any, params: { sport, duration: String(minutes), notes } });
  };

  const newSession = () => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    engine.stop();
    setRoundsHistory([]);
    setAppPhase('setup');
  };

  const toggleClap = (v: boolean) => {
    setClapOn(v);
    saveClapEnabled(v).catch(() => {});
    if (v) safe(() => soundManager.playClap());
  };

  // ─── Rounds en cours ────────────────────────────────────────────────

  if (appPhase === 'active') {
    const lastRound = currentRound >= config.totalRounds;
    return (
      <>
        <ActiveChrono
          engine={engine}
          name={config.partnerName.trim() ? `Sparring contre ${config.partnerName.trim()}` : 'Sparring'}
          focusMode={false}
          onStop={handleStop}
          confirmStop
          canSkip={false}
          onReset={engine.restartPhase}
          nextOverride={engine.status === 'holding' ? traduire('Note le résultat du round') : undefined}
          track={{ done: roundsHistory.length, total: config.totalRounds, current: engine.phase?.kind === 'repos' ? currentRound + 1 : currentRound }}
        >
          {roundsHistory.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 20 }}>
              {roundsHistory.map((r) => <ResultDot key={r.roundNumber} result={r.result} size={24} />)}
            </View>
          ) : null}
        </ActiveChrono>

        <Sheet visible={showResultSheet} onClose={() => {}} title={traduire("Round {0} terminé", currentRound)}>
          <Ink size={14} weight="medium" color={P.ink2}>{traduire("Quel a été le résultat ? Un appui suffit.")}</Ink>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['V', 'D', 'N'] as NonNullable<RoundResult>[]).map((r) => {
              const on = pendingResult === r;
              return (
                <View key={r} style={{ flex: 1 }}>
                  <Press onPress={() => setPendingResult(on ? null : r)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={RESULT_LABEL[r]}>
                    <View style={{ minHeight: 84, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? RESULT_COLOR[r] : P.white, borderWidth: on ? 0 : 1, borderColor: P.line2 }}>
                      <Ink size={30} weight="black" color={on ? P.white : RESULT_COLOR[r]}>{r}</Ink>
                      <Ink size={12} weight="bold" color={on ? 'rgba(255,255,255,0.85)' : P.ink2}>{RESULT_LABEL[r]}</Ink>
                    </View>
                  </Press>
                </View>
              );
            })}
          </View>
          <Field value={pendingNotes} onChangeText={setPendingNotes} placeholder={traduire("Une note rapide : une soumission, un placement")} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} accessibilityLabel={traduire("Note du round")} />
          <BigButton
            label={lastRound ? traduire('Terminer la session') : config.restSeconds > 0 ? traduire("Lancer le repos de {0}", humanSeconds(config.restSeconds)) : traduire('Round suivant')}
            icon={lastRound ? 'flag' : 'play'}
            tone={lastRound ? 'ink' : 'red'}
            onPress={handleConfirmResult}
          />
        </Sheet>
      </>
    );
  }

  // ─── Bilan ──────────────────────────────────────────────────────────

  if (appPhase === 'summary') {
    const decided = wins + losses;
    const rate = decided > 0 ? Math.round((wins / decided) * 100) : null;
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <ScreenHead title={traduire("Session terminée")} subtitle={config.partnerName.trim() ? `Contre ${config.partnerName.trim()}` : traduire('Beau travail sur le tatami')} onBack={newSession} />
          <View style={{ paddingHorizontal: 22, gap: 14, marginTop: 18 }}>
            <Sheet2>
              <BigStats
                items={[
                  { value: String(roundsHistory.length), label: 'Rounds' },
                  { value: String(wins), label: 'Victoires', color: P.mossText },
                  { value: String(losses), label: traduire('Défaites'), color: P.danger },
                  { value: rate !== null ? `${rate} %` : String(draws), label: rate !== null ? traduire('Taux de victoire') : 'Nuls', color: P.indigo },
                ]}
              />
            </Sheet2>
            {roundsHistory.length > 0 ? (
              <Sheet2>
                <Ink size={18} weight="black" tight>{traduire("Round par round")}</Ink>
                {roundsHistory.map((e, i) => (
                  <View key={e.roundNumber} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: i === 0 ? 0 : 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2 }}>
                    <ResultDot result={e.result} size={32} />
                    <View style={{ flex: 1 }}>
                      <Ink size={15} weight="bold">{`Round ${e.roundNumber}, ${e.result ? RESULT_LABEL[e.result].toLowerCase() : traduire('sans résultat')}`}</Ink>
                      {e.notes ? <Ink size={13} weight="medium" color={P.ink2} numberOfLines={2}>{e.notes}</Ink> : null}
                    </View>
                  </View>
                ))}
              </Sheet2>
            ) : null}
            <Sheet2>
              <Ink size={16} weight="black" tight>{traduire("Sport de la séance")}</Ink>
              <MiniChips items={SAVE_SPORTS_COMBAT.map((s) => ({ key: s.id, label: s.label }))} value={sport} onChange={(k) => setSport(k)} />
            </Sheet2>
            <BigButton label={traduire("Enregistrer la séance")} icon="check" onPress={saveSession} />
            <BigButton label={traduire("Nouvelle session")} tone="light" icon="refresh" onPress={newSession} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Reglages ───────────────────────────────────────────────────────

  const preview = phasesFor(config);
  const totalDuration = totalSeconds(preview);
  const band = preview.filter((x) => x.kind !== 'prepa').map((x) => ({ seconds: x.duration, color: PHASE_COLORS[x.kind === 'repos' ? 'repos' : 'effort'].main }));

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + DOCK_SPACE }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHead title="Sparring" subtitle={traduire("Round par round : à chaque fin de round, tu notes le résultat.")} />
        <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 18 }}>
          <SetupHero
            label={traduire("Durée totale")}
            big={humanSeconds(totalDuration)}
            line={roundsSummary(config.totalRounds, config.roundSeconds, config.restSeconds)}
            band={band.length > 1 ? band : undefined}
            legend={[
              { color: PHASE_COLORS.effort.main, text: 'Round' },
              ...(config.restSeconds > 0 ? [{ color: PHASE_COLORS.repos.main, text: traduire('Repos') }] : []),
              ...(config.prepaSeconds > 0 ? [{ color: PHASE_COLORS.prepa.main, text: traduire("{0} s pour te préparer au début", config.prepaSeconds) }] : []),
            ]}
          />
          <SetupBlock title={traduire("Tes rounds")}>
            <View>
              <SettingRow label="Round" dot={PHASE_COLORS.effort.main} value={humanSeconds(config.roundSeconds)} onMinus={() => step('roundSeconds', -30, 30, 900)} onPlus={() => step('roundSeconds', 30, 30, 900)} accent={PHASE_COLORS.effort.deep} />
              <SettingRow label={traduire("Repos")} dot={PHASE_COLORS.repos.main} value={config.restSeconds === 0 ? traduire('Aucun') : humanSeconds(config.restSeconds)} onMinus={() => step('restSeconds', -15, 0, 300)} onPlus={() => step('restSeconds', 15, 0, 300)} accent={PHASE_COLORS.repos.deep} />
              <SettingRow label="Rounds" hint={traduire("en tout")} value={String(config.totalRounds)} onMinus={() => step('totalRounds', -1, 1, 20)} onPlus={() => step('totalRounds', 1, 1, 20)} />
              <SettingRow label={traduire("Préparation")} hint={traduire("avant le premier gong")} dot={PHASE_COLORS.prepa.main} value={config.prepaSeconds === 0 ? traduire('Aucune') : `${config.prepaSeconds} s`} onMinus={() => step('prepaSeconds', -5, 0, 30)} onPlus={() => step('prepaSeconds', 5, 0, 30)} />
            </View>
            <View style={{ height: 1, backgroundColor: P.line2 }} />
            <ToggleRow label={traduire("Claquettes à 10 s")} hint={traduire("Clac clac clac à 10 s de la fin de chaque round, comme à l’UFC")} value={clapOn} onChange={toggleClap} />
          </SetupBlock>
          <SetupBlock title={traduire("Ton partenaire")} hint={traduire("Facultatif, pour le retrouver dans ton historique")}>
            <Field value={config.partnerName} onChangeText={(v) => setConfig((p) => ({ ...p, partnerName: v }))} placeholder={traduire("Nom de ton partenaire")} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} accessibilityLabel={traduire("Nom de ton partenaire")} />
          </SetupBlock>
          <Ink size={13} weight="medium" color={P.ink2} style={{ paddingHorizontal: 6 }}>{config.prepaSeconds > 0 ? traduire("{0} s de préparation, puis le gong lance le round 1. À chaque fin de round, le chrono attend ton résultat : victoire, défaite ou nul.", config.prepaSeconds) : traduire('Le gong lance le round 1. À chaque fin de round, le chrono attend ton résultat : victoire, défaite ou nul.')}</Ink>
        </View>
      </ScrollView>
      <StartDock>
        <HugeButton title={traduire("Démarrer le sparring")} sub={traduire("{0} en tout", humanSeconds(totalDuration))} icon="play" onPress={handleStart} />
      </StartDock>
    </View>
  );
}
