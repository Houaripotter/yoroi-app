/**
 * Jeune (refonte v2) : anneau au pinceau avec les phases, chrono, choix du protocole,
 * jeune personnalise et Ramadan, statistiques. Avertissement medical avant chaque depart.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { BottomSheet, Badge, Chip, H2, HRow, IconDot, LinkCard, NIcon, Notice, P, TextField, tap } from '@/components/yoroi/v2/nutrition/ui';
import type { NIconName } from '@/components/yoroi/v2/nutrition/ui';
import { FastPhases, FastRing } from '@/components/yoroi/v2/nutrition/FastRing';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { durationBetween, FAST_MARKERS, hhmmValid } from '@/lib/v2/nutrition/formulas';
import { playSuccessSound } from '@/lib/soundManager';
import { logger } from '@/lib/security/logger';
import {
  FASTING_MODES,
  completeFasting,
  formatCountdown,
  formatDate,
  formatTime,
  getCustomFastingSettings,
  getFastingMode,
  getFastingState,
  getFastingStats,
  getProgressPercentage,
  getRamadanSettings,
  getTimeRemaining,
  saveCustomFastingSettings,
  saveRamadanSettings,
  startFasting,
  stopFasting,
} from '@/lib/fasting';
import type { CustomFastingSettings, FastingMode, FastingState, FastingStats, RamadanSettings } from '@/lib/fasting';
import { ProgressBar } from '@/components/yoroi/v2/espace/ProgressBar';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

const ICONS: Record<string, NIconName> = {
  Clock: 'clock',
  Moon: 'moon',
  Star: 'star',
  Cross: 'plus',
  Swords: 'swords',
  Utensils: 'fork',
  RefreshCw: 'refresh',
  Droplets: 'drop',
  Settings: 'edit',
  Sun: 'sun',
};

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** Noms et textes affiches, en francais soigne (la bibliotheque garde ses identifiants) */
const MODE_TEXT: Record<string, { name: string; description: string }> = {
  '12_12': { name: 'Intermittent 12:12', description: 'Pour débuter. 12 h de jeûne, 12 h pour manger.' },
  '14_10': { name: 'Intermittent 14:10', description: 'Progression douce. 14 h de jeûne, 10 h pour manger.' },
  '16_8': { name: 'Intermittent 16:8', description: 'Le plus courant. 16 h de jeûne, 8 h pour manger.' },
  '18_6': { name: 'Intermittent 18:6', description: 'Plus exigeant. 18 h de jeûne, 6 h pour manger.' },
  '20_4': { name: 'Intermittent 20:4', description: 'Très exigeant. 20 h de jeûne, 4 h pour manger.' },
  omad: { name: 'Un repas par jour', description: 'Un seul repas dans la journée. Réservé aux habitués.' },
  ramadan: { name: 'Ramadan', description: 'Jeûne de l’aube au coucher du soleil.' },
  yom_kippur: { name: 'Yom Kippour', description: 'Le Grand Pardon. Jeûne de 25 h.' },
  careme: { name: 'Carême', description: '40 jours avant Pâques. Abstinence ou jeûne partiel.' },
  eat_stop_eat: { name: 'Jeûne de 24 h', description: '24 h sans manger, une à deux fois par semaine.' },
  prolonged_36: { name: 'Jeûne de 36 h', description: '36 h de jeûne. Pour les habitués.' },
  prolonged_48: { name: 'Jeûne de 48 h', description: '48 h de jeûne. Uniquement pour les expérimentés.' },
  prolonged_72: { name: 'Jeûne de 72 h', description: '72 h de jeûne. Suivi médical recommandé.' },
  custom: { name: 'Personnalisé', description: 'Tes propres horaires.' },
};
const modeName = (m?: FastingMode) => (m ? MODE_TEXT[m.id]?.name ?? m.name : 'Jeûne');
const modeDesc = (m: FastingMode) => MODE_TEXT[m.id]?.description ?? m.description;
const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const HEALTH_WARNING =
  'Consulte un médecin avant de jeûner si tu as un problème de santé, un traitement, un diabète, si tu es enceinte ou si tu allaites. Arrête si tu as des vertiges, des malaises ou des palpitations.';
const PROLONGED_WARNING =
  'Un jeûne prolongé peut être dangereux. Parles-en à un médecin avant de commencer et reste bien hydraté. Arrête immédiatement en cas de malaise.';

export default function FastingScreen() {
  const [state, setState] = useState<FastingState | null>(null);
  const [stats, setStats] = useState<FastingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const completing = useRef(false);

  const [customOpen, setCustomOpen] = useState(false);
  const [ramadanOpen, setRamadanOpen] = useState(false);
  const [customStart, setCustomStart] = useState('20:00');
  const [customDuration, setCustomDuration] = useState('16');
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [city, setCity] = useState('Paris');
  const [fajr, setFajr] = useState('05:30');
  const [maghrib, setMaghrib] = useState('18:45');

  const load = useCallback(async () => {
    try {
      const [s, st, custom, ramadan] = await Promise.all([getFastingState(), getFastingStats(), getCustomFastingSettings(), getRamadanSettings()]);
      setState(s);
      setStats(st);
      if (custom) {
        setCustomStart(custom.startTime);
        setCustomDuration(String(custom.durationHours));
        setCustomDays(custom.activeDays);
      }
      if (ramadan) {
        setCity(ramadan.city);
        setFajr(ramadan.fajrTime);
        setMaghrib(ramadan.maghribTime);
      }
    } catch (err) {
      logger.error('Chargement du jeûne impossible', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  // Chrono : une mise a jour par seconde seulement pendant un jeune
  useEffect(() => {
    if (!state?.isActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.isActive]);

  const remaining = state?.isActive && state.targetEndTime ? getTimeRemaining(state.targetEndTime) : 0;
  const progress = state?.isActive && state.startTime && state.targetEndTime ? getProgressPercentage(state.startTime, state.targetEndTime) / 100 : 0;
  const elapsedHours = state?.isActive && state.startTime ? Math.max(0, (now - new Date(state.startTime).getTime()) / 3600000) : 0;
  const activeMode = state?.modeId ? getFastingMode(state.modeId) : undefined;

  const onComplete = useCallback(async () => {
    if (completing.current) return;
    completing.current = true;
    try {
      tap('success');
      playSuccessSound();
      await completeFasting();
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await load();
      appAlert('Jeûne tenu', 'Bravo, tu as tenu ton jeûne jusqu’au bout. Romps-le en douceur et bois de l’eau.');
    } catch (err) {
      logger.error('Fin du jeûne impossible', err);
    } finally {
      completing.current = false;
    }
  }, [load]);

  useEffect(() => {
    if (state?.isActive && state.phase === 'fasting' && state.targetEndTime && remaining <= 0) onComplete();
  }, [remaining, state, onComplete]);

  const proceed = async (mode: FastingMode) => {
    const ok = await startFasting(mode.id);
    if (ok) {
      tap('success');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await load();
    } else {
      appAlert('Le jeûne n’a pas démarré', 'Un souci est survenu. Réessaie.');
    }
  };

  const askStart = (mode: FastingMode) => {
    appAlert('Avant de commencer', mode.warning ? PROLONGED_WARNING : HEALTH_WARNING, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'J’ai compris',
        onPress: () => {
          if (mode.id === 'ramadan') setRamadanOpen(true);
          else if (mode.id === 'custom') setCustomOpen(true);
          else proceed(mode);
        },
      },
    ]);
  };

  const askStop = () => {
    appAlert('Arrêter le jeûne ?', 'Tu peux t’arrêter à tout moment. Ce jeûne ne sera pas compté comme terminé.', [
      { text: 'Continuer', style: 'cancel' },
      {
        text: 'Arrêter',
        style: 'destructive',
        onPress: async () => {
          await stopFasting(false);
          tap('medium');
          DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
          await load();
        },
      },
    ]);
  };

  const saveCustom = async () => {
    if (saving) return;
    const hours = parseInt(customDuration, 10);
    if (!hhmmValid(customStart)) {
      appAlert('Heure à vérifier', 'Écris l’heure de début sous la forme 20:00.');
      return;
    }
    if (isNaN(hours) || hours < 1 || hours > 72) {
      appAlert('Durée à vérifier', 'Choisis une durée entre 1 et 72 heures.');
      return;
    }
    setSaving(true);
    try {
      const settings: CustomFastingSettings = { startTime: customStart, durationHours: hours, activeDays: customDays };
      await saveCustomFastingSettings(settings);
      setCustomOpen(false);
      if (await startFasting('custom')) {
        tap('success');
        DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const saveRamadan = async () => {
    if (saving) return;
    if (!hhmmValid(fajr) || !hhmmValid(maghrib)) {
      appAlert('Heures à vérifier', 'Écris les heures sous la forme 05:30.');
      return;
    }
    setSaving(true);
    try {
      const settings: RamadanSettings = { city: city.trim() || 'Paris', country: 'France', fajrTime: fajr, maghribTime: maghrib, useManualTimes: true };
      await saveRamadanSettings(settings);
      setRamadanOpen(false);
      if (await startFasting('ramadan')) {
        tap('success');
        DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const isFasting = state?.phase !== 'eating';
  const ringColor = isFasting ? P.accent : P.moss;
  const intermittent = FASTING_MODES.filter((m) => m.category === 'intermittent');
  const religious = FASTING_MODES.filter((m) => m.category === 'religious');
  const advanced = FASTING_MODES.filter((m) => m.category === 'advanced');
  const customMode = FASTING_MODES.find((m) => m.id === 'custom');
  const monthPct = stats && stats.thisMonthTarget > 0 ? Math.min(1, stats.thisMonthCompleted / stats.thisMonthTarget) : 0;

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DetailScreen title="Jeûne" subtitle={state?.isActive ? (isFasting ? 'Tu es en plein jeûne' : 'Ta fenêtre pour manger est ouverte') : 'Choisis ton rythme et lance le chrono'}>
          {loading ? (
            <Card style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="bold" color={P.ink2}>
                Préparation de ton jeûne
              </Ink>
            </Card>
          ) : null}

          {/* JEUNE EN COURS */}
          {!loading && state?.isActive ? (
            <>
              <Enter i={0}>
                <Card style={{ alignItems: 'center', gap: 14, paddingVertical: 22 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <NIcon name={ICONS[activeMode?.icon ?? 'Clock'] ?? 'clock'} size={18} color={ringColor} />
                    <Ink size={15} weight="extraBold">
                      {modeName(activeMode)}
                    </Ink>
                  </View>
                  <FastRing
                    progress={progress}
                    totalHours={activeMode?.fastingHours ?? null}
                    markers={FAST_MARKERS}
                    color={ringColor}
                    center={
                      <>
                        <Badge label={isFasting ? 'Jeûne' : 'Fenêtre repas'} tone={isFasting ? 'red' : 'moss'} />
                        <Ink size={40} weight="black" tight style={{ marginTop: 8, lineHeight: 44 }} accessibilityLabel={`Temps restant ${formatCountdown(remaining)}`}>
                          {formatCountdown(remaining)}
                        </Ink>
                        <Ink size={13} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
                          {isFasting ? (activeMode?.fastingHours ? `restant sur ${activeMode.fastingHours} h` : 'restant') : 'restant pour manger'}
                        </Ink>
                        <Ink size={13} weight="extraBold" color={ringColor} style={{ marginTop: 4 }}>
                          {`${Math.round(progress * 100)} %`}
                        </Ink>
                      </>
                    }
                  />
                  <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
                    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: P.paper, gap: 2 }}>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        Début
                      </Ink>
                      <Ink size={18} weight="black" tight>
                        {state.startTime ? formatTime(state.startTime) : ''}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {state.startTime ? formatDate(state.startTime) : ''}
                      </Ink>
                    </View>
                    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: P.paper, gap: 2 }}>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        Fin prévue
                      </Ink>
                      <Ink size={18} weight="black" tight>
                        {state.targetEndTime ? formatTime(state.targetEndTime) : ''}
                      </Ink>
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {state.targetEndTime ? formatDate(state.targetEndTime) : ''}
                      </Ink>
                    </View>
                  </View>
                  {stats && stats.currentStreak > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: P.goldSoft }}>
                      <NIcon name="flame" size={16} color={P.goldDark} />
                      <Ink size={13} weight="extraBold" color={P.goldDark}>
                        {`Série de ${stats.currentStreak} jour${stats.currentStreak > 1 ? 's' : ''}`}
                      </Ink>
                    </View>
                  ) : null}
                </Card>
              </Enter>

              {isFasting ? (
                <Enter i={1}>
                  <H2 sub="Repères approximatifs, chacun réagit différemment">Où tu en es</H2>
                  <Card style={{ marginTop: 10, paddingBottom: 6 }}>
                    <FastPhases elapsedHours={elapsedHours} markers={FAST_MARKERS} color={ringColor} />
                  </Card>
                </Enter>
              ) : null}

              <Enter i={2}>
                <Notice tone="gold" title="Écoute ton corps" text="Bois de l’eau régulièrement. Vertiges, malaise ou palpitations : arrête le jeûne et mange." icon="drop" />
              </Enter>

              <Enter i={3}>
                <BigButton label="Arrêter le jeûne" tone="light" icon="close" onPress={askStop} />
              </Enter>
            </>
          ) : null}

          {/* CHOIX DU JEUNE */}
          {!loading && !state?.isActive ? (
            <>
              <Enter i={0}>
                <Notice tone="danger" title="Ta santé d’abord" text={HEALTH_WARNING} icon="shield" />
              </Enter>

              <Enter i={1}>
                <H2 sub="Heures de jeûne et heures pour manger">Jeûne intermittent</H2>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  {intermittent.map((m) => (
                    <View key={m.id} style={{ width: '48.4%' }}>
                      <ModeTile mode={m} onPress={() => askStart(m)} />
                    </View>
                  ))}
                </View>
              </Enter>

              <Enter i={2}>
                <H2>Jeûne religieux</H2>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {religious.map((m) => (
                    <LinkCard key={m.id} icon={ICONS[m.icon] ?? 'moon'} tone="indigo" title={modeName(m)} sub={modeDesc(m)} onPress={() => askStart(m)} />
                  ))}
                </View>
              </Enter>

              <Enter i={3}>
                <H2 sub="Réservé aux pratiquants expérimentés">Jeûne avancé</H2>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {advanced.map((m) => (
                    <LinkCard
                      key={m.id}
                      icon={ICONS[m.icon] ?? 'clock'}
                      tone={m.warning ? 'red' : 'ink'}
                      title={modeName(m)}
                      sub={modeDesc(m)}
                      onPress={() => askStart(m)}
                      right={m.warning ? <Badge label="Avis médical" tone="danger" /> : undefined}
                    />
                  ))}
                </View>
              </Enter>

              <Enter i={4}>
                <LinkCard
                  icon="edit"
                  tone="gold"
                  title="Jeûne personnalisé"
                  sub="Tes heures, ta durée, tes jours"
                  onPress={() => {
                    if (customMode) askStart(customMode);
                    else setCustomOpen(true);
                  }}
                />
              </Enter>
            </>
          ) : null}

          {/* STATISTIQUES */}
          {!loading && stats && stats.totalCompleted > 0 ? (
            <Enter i={5}>
              <H2>Ta régularité</H2>
              <Card style={{ marginTop: 10, gap: 16 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <StatBox value={String(stats.totalCompleted)} label="Jeûnes tenus" color={P.accent} />
                  <StatBox value={`${stats.totalHoursFasted}`} unit="h" label="Au total" />
                  <StatBox value={`${stats.longestStreak}`} unit="j" label="Série record" color={P.goldDark} />
                </View>
                {stats.longestStreak > 0 && stats.currentStreak >= stats.longestStreak ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Hanko size={36} />
                    <Ink size={13} weight="extraBold" color={P.accent} style={{ flex: 1 }}>
                      Tu égales ta meilleure série
                    </Ink>
                  </View>
                ) : null}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Ink size={13} weight="bold" color={P.ink2}>
                      Ce mois-ci
                    </Ink>
                    <Ink size={13} weight="black">
                      {`${stats.thisMonthCompleted} sur ${stats.thisMonthTarget}`}
                    </Ink>
                  </View>
                  <ProgressBar progress={monthPct} accessibilityLabel="Ton mois de jeûne" />
                </View>
              </Card>
            </Enter>
          ) : null}

          {!loading && stats && stats.totalCompleted === 0 && !state?.isActive ? (
            <Enter i={5}>
              <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <IconDot name="clock" tone="gold" />
                <Ink size={14} weight="bold" color={P.ink2} style={{ flex: 1 }}>
                  Aucun jeûne terminé pour l’instant. Commence doux, le 12:12 est parfait pour débuter.
                </Ink>
              </Card>
            </Enter>
          ) : null}
        </DetailScreen>
      </KeyboardAvoidingView>

      {/* JEUNE PERSONNALISE */}
      <BottomSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Jeûne personnalisé"
        subtitle="Règle tes heures en deux appuis"
        footer={<BigButton label={saving ? 'Démarrage' : 'Lancer le jeûne'} onPress={saveCustom} disabled={saving} icon="play" />}
      >
        <Ink size={13} weight="bold" color={P.ink2}>
          Heure de début
        </Ink>
        <HRow>
          {['18:00', '19:00', '20:00', '21:00', '22:00'].map((h) => (
            <Chip key={h} label={h} active={customStart === h} onPress={() => setCustomStart(h)} />
          ))}
        </HRow>
        <TextField value={customStart} onChange={setCustomStart} placeholder="20:00" />
        <Ink size={13} weight="bold" color={P.ink2}>
          Durée du jeûne
        </Ink>
        <HRow>
          {['12', '14', '16', '18', '20', '24'].map((h) => (
            <Chip key={h} label={`${h} h`} active={customDuration === h} onPress={() => setCustomDuration(h)} />
          ))}
        </HRow>
        <TextField value={customDuration} onChange={(v) => setCustomDuration(v.replace(/[^0-9]/g, ''))} placeholder="16" />
        <Ink size={13} weight="bold" color={P.ink2}>
          Jours actifs
        </Ink>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAYS.map((d, i) => {
            const on = customDays.includes(i);
            return (
              <Chip
                key={i}
                label={d}
                active={on}
                accent={P.accent}
                onPress={() => setCustomDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))}
              />
            );
          })}
        </View>
        <Ink size={12} weight="medium" color={P.ink2}>
          {customDays.length ? `Actif le ${customDays.slice().sort().map((i) => DAY_NAMES[i]).join(', ')}` : 'Aucun jour choisi'}
        </Ink>
      </BottomSheet>

      {/* RAMADAN */}
      <BottomSheet
        visible={ramadanOpen}
        onClose={() => setRamadanOpen(false)}
        title="Ramadan"
        subtitle="Entre les heures de prière de ta ville"
        footer={<BigButton label={saving ? 'Démarrage' : 'Commencer le jeûne'} onPress={saveRamadan} disabled={saving} icon="moon" />}
      >
        <TextField label="Ville" value={city} onChange={setCity} placeholder="Paris" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Fajr (aube)" value={fajr} onChange={setFajr} placeholder="05:30" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Maghrib (coucher)" value={maghrib} onChange={setMaghrib} placeholder="18:45" />
          </View>
        </View>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: P.goldSoft, borderColor: P.goldSoft }}>
          <NIcon name="clock" size={20} color={P.goldDark} />
          <Ink size={15} weight="extraBold" color={P.goldDark}>
            {`Jeûne de ${durationBetween(fajr, maghrib)}`}
          </Ink>
        </Card>
        <Notice tone="indigo" text="Vérifie les heures exactes auprès de ta mosquée ou d’un calendrier local." />
      </BottomSheet>
    </>
  );
}

function ModeTile({ mode, onPress }: { mode: FastingMode; onPress: () => void }) {
  const big = mode.id === 'omad' ? '1 repas' : `${mode.fastingHours}:${mode.eatingHours}`;
  const pct = mode.fastingHours ? Math.min(1, mode.fastingHours / 24) : 1;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${modeName(mode)}. ${modeDesc(mode)}`}>
      <Card style={{ padding: 14, gap: 8, minHeight: 132 }}>
        <Ink size={30} weight="black" tight>
          {big}
        </Ink>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: P.mossSoft, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ width: `${pct * 100}%`, backgroundColor: P.ink, borderRadius: 4 }} />
        </View>
        <Ink size={12} weight="medium" color={P.ink2} numberOfLines={3}>
          {modeDesc(mode)}
        </Ink>
      </Card>
    </Press>
  );
}

function StatBox({ value, unit, label, color = P.ink }: { value: string; unit?: string; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: P.paper, gap: 2 }}>
      <Ink size={26} weight="black" tight color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
        {unit ? (
          <Ink size={13} weight="bold" color={P.ink2}>
            {` ${unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={12} weight="bold" color={P.ink2}>
        {label}
      </Ink>
    </View>
  );
}
