/**
 * Ton sommeil : derniere nuit, semaine, dette, objectif, rappel du coucher et historique.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { DeviceEventEmitter, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSleepEntries, getSleepGoal, getSleepStats, setSleepGoal } from '@/lib/sleepService';
import type { SleepEntry, SleepStats } from '@/lib/sleepService';
import { notificationService, requestNotificationPermissions } from '@/lib/notificationService';
import HealthConnect from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { usePremium } from '@/context/PremiumContext';
import { BigButton, Card, Enter, Icon, P, Press, SectionTitle, Stat, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { ExampleTag } from '@/components/yoroi/v2/progres/ExamplePreview';
import { NightBars, NightLetters, NightRow, Stars, Stepper, Toggle, QUALITY_LABELS, clock, hm, shiftTime } from '@/components/yoroi/v2/accueil/sleepKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { intensite } from '@/lib/v2/intensite';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

type HkNight = { total: number; deep: number; rem: number; core: number; awake: number };

async function hkLastNight(): Promise<any[] | null> {
  try {
    return await HealthConnect.getSleepHistory(1);
  } catch {
    return null;
  }
}

function advice(debtH: number): { text: string; color: string } {
  if (debtH <= 2) return { text: traduire('Ton sommeil est bien là. Garde ce rythme.'), color: intensite(2).text };
  if (debtH <= 5) return { text: traduire("Il te manque {0} h sur 7 jours. Va au lit un peu plus tôt ce soir.", String(debtH).replace('.', DECIMAL)), color: intensite(3).text };
  if (debtH <= 10) return { text: traduire("{0} h de retard sur 7 jours. La fatigue va peser sur tes séances.", String(debtH).replace('.', DECIMAL)), color: intensite(4).text };
  return { text: traduire("{0} h de retard. Ton corps a besoin de vraies nuits avant de pousser.", String(debtH).replace('.', DECIMAL)), color: intensite(5).text };
}

function SleepExample() {
  return (
    <View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ opacity: 0.42 }}>
        <View style={{ borderRadius: 26, backgroundColor: P.indigo, padding: 22, gap: 12 }}>
          <Ink size={13} weight="bold" color="#C9D3EA">
            {traduire("Ta dernière nuit")}</Ink>
          <Ink size={60} weight="black" tight color={P.white}>
            7 h 30
          </Ink>
          <Ink size={15} weight="bold" color="#E4E9F3">
            {traduire("23 h 10 à 6 h 40")}</Ink>
          <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ flex: 80, backgroundColor: '#0F1F45' }} />
            <View style={{ flex: 230, backgroundColor: '#6E86C0' }} />
            <View style={{ flex: 100, backgroundColor: P.goldLight }} />
            <View style={{ flex: 20, backgroundColor: '#E9A6A0' }} />
          </View>
        </View>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: 14, right: 14 }}>
        <ExampleTag />
      </View>
    </View>
  );
}

export default function Sommeil() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  let isPremium = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    isPremium = usePremium().isPremium;
  } catch {
    isPremium = false;
  }
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [goal, setGoal] = useState(480);
  const [hk, setHk] = useState<HkNight | null>(null);
  const [notif, setNotif] = useState(false);
  const [bedtime, setBedtime] = useState('22:30');
  const [savingReminder, setSavingReminder] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, s, g, hkh] = await Promise.all([getSleepEntries(), getSleepStats(), getSleepGoal(), hkLastNight()]);
      setEntries([...(e ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
      setStats(s);
      setGoal(g);
      if (Array.isArray(hkh) && hkh.length > 0) {
        const last = hkh[hkh.length - 1];
        if (last?.total > 0) setHk({ total: last.total, deep: last.deep || 0, rem: last.rem || 0, core: last.core || 0, awake: last.awake || 0 });
      }
      // Reglages enregistres, meme si le service n'a pas encore ete initialise
      const ns = await notificationService.loadSettings().catch(() => null);
      setNotif(!!ns?.sleep?.enabled);
      if (ns?.sleep?.bedtimeReminder) setBedtime(ns.sleep.bedtimeReminder);
    } catch (err) {
      logger.error('Chargement du sommeil impossible', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', load);
    return () => sub.remove();
  }, [load]);

  const changeGoal = async (delta: number) => {
    const g = Math.max(300, Math.min(600, goal + delta));
    setGoal(g);
    try {
      await setSleepGoal(g);
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    } catch (err) {
      logger.error('Objectif de sommeil non enregistré', err);
    }
  };

  const toggleReminder = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        appAlert(traduire('Autorisation nécessaire'), traduire('Active les notifications pour YOROI dans les réglages de ton téléphone.'));
        return;
      }
    }
    setNotif(value);
    try {
      // Lire tes reglages enregistres avant d'ecrire : jamais les valeurs par defaut par-dessus
      const settings = await notificationService.loadSettings();
      const days = settings.sleep.days.length > 0 ? settings.sleep.days : [0, 1, 2, 3, 4, 5, 6];
      await notificationService.updateSettings({ sleep: { ...settings.sleep, enabled: value, days } });
      if (value) tap('success');
    } catch (err) {
      logger.error('Rappel du coucher non enregistré', err);
    }
  };

  const saveBedtime = async (t: string) => {
    setBedtime(t);
    if (savingReminder) return;
    setSavingReminder(true);
    try {
      const settings = await notificationService.loadSettings();
      await notificationService.updateSettings({ sleep: { ...settings.sleep, bedtimeReminder: t } });
    } catch (err) {
      logger.error('Heure du rappel non enregistrée', err);
    } finally {
      setSavingReminder(false);
    }
  };

  const last = entries[0] ?? null;
  const lastTotal = hk?.total && hk.total > 0 ? hk.total : stats?.lastNightDuration || last?.duration || 0;
  const hasPhases = !!hk && hk.deep + hk.rem + hk.core > 0;
  const chartW = width - 44 - 36;
  const adv = stats && stats.totalDays > 0 ? advice(stats.sleepDebtHours) : null;

  // Le suivi du sommeil est gratuit, historique complet compris
  const visible = entries.slice(0, 6);
  const locked: typeof entries = [];

  return (
    <DetailScreen
      title={traduire("Ton sommeil")}
      subtitle={last ? traduire("Objectif {0} par nuit", hm(goal)) : traduire('30 % de ta récupération')}
      footer={<BigButton label={traduire("Noter ma nuit")} icon="moon" onPress={() => router.push('/sleep-input' as any)} />}
    >
      {/* Derniere nuit */}
      <Enter i={0}>
        {lastTotal > 0 ? (
          <Press onPress={() => last && router.push({ pathname: '/sleep-detail', params: { date: last.date } } as any)} accessibilityRole="button" accessibilityLabel={traduire("Dernière nuit : {0}", hm(lastTotal))}>
            <View style={{ borderRadius: 26, backgroundColor: P.indigo, padding: 22, gap: 12, overflow: 'hidden' }}>
              <Ornement name="lanterne" size={84} opacity={0.92} style={{ position: 'absolute', right: 16, top: 16 }} />
              <Ink size={13} weight="bold" color="#C9D3EA">
                {traduire("Ta dernière nuit")}</Ink>
              <Ink size={60} weight="black" tight color={P.white}>
                {hm(lastTotal)}
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {last?.bedTime && last?.wakeTime ? (
                  <Ink size={15} weight="bold" color="#E4E9F3">
                    {traduire("{0} à {1}", clock(last.bedTime), clock(last.wakeTime))}
                  </Ink>
                ) : null}
                {last && last.quality > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Stars value={last.quality} size={14} />
                    <Ink size={13} weight="bold" color="#E4E9F3">
                      {QUALITY_LABELS[last.quality]?.toLowerCase()}
                    </Ink>
                  </View>
                ) : null}
              </View>
              {hasPhases && hk ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                    {[
                      { v: hk.deep, c: '#0F1F45' },
                      { v: hk.core, c: '#6E86C0' },
                      { v: hk.rem, c: P.goldLight },
                      { v: hk.awake, c: '#E9A6A0' },
                    ].map((p, i) => (p.v > 0 ? <View key={i} style={{ flex: p.v, backgroundColor: p.c }} /> : null))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {[
                      { l: 'profond', v: hk.deep },
                      { l: traduire('léger'), v: hk.core },
                      { l: 'paradoxal', v: hk.rem },
                      { l: traduire('éveillé'), v: hk.awake },
                    ].map((p) => (
                      <View key={p.l}>
                        <Ink size={14} weight="black" color={P.white}>
                          {hm(p.v)}
                        </Ink>
                        <Ink size={11} weight="bold" color="#C9D3EA">
                          {p.l}
                        </Ink>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
              <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (lastTotal / goal) * 100)}%`, height: 6, backgroundColor: lastTotal >= goal ? P.goldLight : P.white }} />
              </View>
              <Ink size={13} weight="bold" color="#E4E9F3">
                {lastTotal >= goal ? traduire('Objectif atteint') : traduire("{0} sous ton objectif", hm(goal - lastTotal))}
              </Ink>
            </View>
          </Press>
        ) : (
          <View style={{ gap: 12 }}>
            <SleepExample />
            <View style={{ gap: 4, paddingHorizontal: 4 }}>
              <Ink size={20} weight="black" tight>
                {traduire("Aucune nuit notée")}</Ink>
              <Ink size={14} weight="medium" color={P.ink2}>
                {traduire("Note ta nuit chaque matin, ça prend deux appuis. Ton score de récupération s’en servira.")}</Ink>
            </View>
          </View>
        )}
      </Enter>

      {/* Semaine */}
      {entries.length > 0 ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>{traduire("Tes 7 dernières nuits")}</SectionTitle>
          <Card style={{ gap: 10 }}>
            <NightBars entries={entries} goal={goal} width={chartW} height={130} />
            <NightLetters width={chartW} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: P.line2 }}>
              <Stat value={stats && stats.averageDuration > 0 ? hm(stats.averageDuration) : traduire('pas noté')} label={traduire("en moyenne")} color={P.indigo} />
              <Stat value={stats && stats.averageQuality > 0 ? String(stats.averageQuality).replace('.', DECIMAL) : traduire('pas noté')} unit={stats && stats.averageQuality > 0 ? traduire('sur 5') : undefined} label={traduire("qualité")} />
              <Stat value={stats ? (stats.trend === 'improving' ? 'en hausse' : stats.trend === 'declining' ? 'en baisse' : 'stable') : 'stable'} label="tendance" color={stats?.trend === 'declining' ? intensite(4).text : stats?.trend === 'improving' ? P.mossText : P.ink} />
            </View>
            {adv ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: P.paper, borderRadius: 16, padding: 12 }}>
                <Icon name="moon" size={18} color={adv.color} />
                <Ink size={13} weight="bold" color={adv.color} style={{ flex: 1 }}>
                  {traduire(adv.text)}
                </Ink>
              </View>
            ) : null}
          </Card>
        </Enter>
      ) : null}

      {/* Series */}
      {stats && stats.totalDays > 0 ? (
        <Enter i={2}>
          <Card style={{ flexDirection: 'row', gap: 10 }}>
            <Stat value={String(stats.currentStreak)} unit={stats.currentStreak > 1 ? 'nuits' : 'nuit'} label={traduire("objectif tenu d’affilée")} />
            <Stat value={String(stats.longestStreak)} unit={stats.longestStreak > 1 ? 'nuits' : 'nuit'} label={traduire("ton record")} color={P.goldDark} />
            <Stat value={`${stats.goalReachedDays}/${stats.totalDays}`} label={traduire("nuits réussies sur 30 jours")} />
          </Card>
        </Enter>
      ) : null}

      {/* Objectif et rappel */}
      <Enter i={3} style={{ gap: 10 }}>
        <SectionTitle>{traduire("Tes réglages")}</SectionTitle>
        <Card style={{ gap: 12 }}>
          <Ink size={15} weight="extraBold">
            {traduire("Objectif par nuit")}</Ink>
          <Stepper value={hm(goal)} label={traduire("Objectif de sommeil")} onMinus={() => changeGoal(-30)} onPlus={() => changeGoal(30)} color={P.indigo} />
        </Card>
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold">
                {traduire("Rappel du coucher")}</Ink>
              <Ink size={13} weight="medium" color={P.ink2}>
                {traduire("Une notification pour aller dormir à l’heure.")}</Ink>
            </View>
            <Toggle value={notif} onChange={toggleReminder} label={traduire("Rappel du coucher")} />
          </View>
          {notif ? <Stepper value={clock(bedtime)} label={traduire("Heure du rappel")} onMinus={() => saveBedtime(shiftTime(bedtime, -15))} onPlus={() => saveBedtime(shiftTime(bedtime, 15))} /> : null}
        </Card>
      </Enter>

      {/* Historique */}
      <Enter i={4} style={{ gap: 10 }}>
        <SectionTitle action={entries.length > 0 ? traduire('Tout voir') : undefined} onAction={() => router.push('/sleep-history' as any)}>
          {traduire("Historique")}</SectionTitle>
        {entries.length === 0 ? (
          <Card>
            <Ink size={14} color={P.ink2}>
              {traduire("Tes nuits apparaîtront ici.")}</Ink>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 6 }}>
            {visible.map((e, i) => (
              <NightRow key={e.id} entry={e} goal={goal} first={i === 0} onPress={() => router.push({ pathname: '/sleep-detail', params: { date: e.date } } as any)} />
            ))}
            {locked.map((e) => (
              <NightRow key={e.id} entry={e} goal={goal} locked onPress={() => ouvrirPaywall('periode_longue', locked.length)} />
            ))}
            {locked.length > 0 ? (
              <View style={{ marginVertical: 8 }}><BigButton label={traduire("Voir tout l’historique")} tone="light" onPress={() => ouvrirPaywall('periode_longue', locked.length)} /></View>
            ) : null}
          </Card>
        )}
      </Enter>
    </DetailScreen>
  );
}
