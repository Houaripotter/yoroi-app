/**
 * Tes notifications (refonte v2, vague 11) : chaque rappel dit clairement ce qu'il fait,
 * quand il arrive (heure et jours reels utilises par la programmation) et a quoi il ressemble.
 * Les reglages sont ecrits par les memes services qu'avant (notificationService, citations,
 * conseils du soir, minuteur, recap de la semaine, serie en danger) : memes cles de stockage.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, Linking, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { impactAsync, ImpactFeedbackStyle, selectionAsync } from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EspaceScreen, Icon, SectionTitle } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import {
  ChoiceChips,
  DaysPicker,
  EVERY_DAY,
  MiniToggle,
  NotifCard,
  TimeField,
  WEEKDAYS,
  nextFire,
  sayDays,
  sayTime,
  sayWhen,
} from '@/components/yoroi/v2/notifications/parts';
import { notificationService, requestNotificationPermissions } from '@/lib/notificationService';
import type { NotificationSettings } from '@/lib/notificationService';
import { getCitationNotifSettings, getDailyQuote, setCitationNotifSettings } from '@/lib/citations';
import type { CitationNotifSettings } from '@/lib/citations';
import { getHealthTipSettings, saveHealthTipSettings } from '@/lib/eveningHealthTipsService';
import type { HealthTipSettings } from '@/lib/eveningHealthTipsService';
import { timerNotifications } from '@/lib/timerNotifications';
import type { TimerNotifSettings } from '@/lib/timerNotifications';
import { cancelWeeklyRecap, isWeeklyRecapEnabled, scheduleWeeklyRecap } from '@/lib/weeklyRecapNotification';
import { isStreakRiskEnabled, setStreakRiskEnabled } from '@/lib/streakAtRiskNotification';
import { MOMENT_LABEL, getHabitudePesee, heureDe, heureRappel, planifierRappelPesee, saveHabitudePesee } from '@/lib/v2/pesee/rappelHabitude';
import type { HabitudePesee } from '@/lib/v2/pesee/rappelHabitude';
import { getUnreadCount } from '@/lib/notificationHistoryService';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { RappelsDiscipline } from '@/components/yoroi/v2/notifications/RappelsDiscipline';
import { choixDepuisServices } from '@/lib/v2/notifications/discipline';
import type { ChoixRappels } from '@/lib/v2/notifications/discipline';
import { appliquerChoixRappels } from '@/lib/v2/notifications/rappels';

const NB = ' ';

/** Jours reellement utilises par la programmation quand la liste est vide. */
const eff = (days: number[] | undefined, fallback: number[]) => (days && days.length ? days : fallback);

function hydrationHours(start: string, end: string, interval: number): number[] {
  const s = parseInt(start.split(':')[0], 10);
  const e = parseInt(end.split(':')[0], 10);
  const step = Math.max(1, interval || 24);
  const out: number[] = [];
  if (!Number.isFinite(s) || !Number.isFinite(e)) return out;
  for (let h = s; h <= e; h += step) out.push(h);
  return out;
}

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function TesNotifications() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const showPopup = useCallback((title: string, body: string) => appAlert(title, body), []);

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [cit, setCit] = useState<CitationNotifSettings | null>(null);
  const [tips, setTips] = useState<HealthTipSettings | null>(null);
  const [timer, setTimer] = useState<TimerNotifSettings | null>(null);
  const [recap, setRecap] = useState(true);
  const [risk, setRisk] = useState(true);
  const [hab, setHab] = useState<HabitudePesee>({ moment: null, actif: false });
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);
  const [quote, setQuote] = useState<string>('La discipline, c’est choisir entre ce que tu veux maintenant et ce que tu veux le plus.');

  useEffect(() => {
    (async () => {
      try {
        await notificationService.initialize();
      } catch {
        // le service garde ses reglages par defaut
      }
      setSettings(notificationService.getSettings());
      setCit(await getCitationNotifSettings());
      setTips(await getHealthTipSettings());
      setTimer(await timerNotifications.loadSettings());
      setRecap(await isWeeklyRecapEnabled().catch(() => true));
      setRisk(await isStreakRiskEnabled().catch(() => true));
      setHab(await getHabitudePesee());
      try {
        const q = await getDailyQuote();
        if (q?.text) setQuote(q.text);
      } catch {
        // citation d'exemple
      }
    })();
  }, []);

  const refreshPermission = useCallback(async () => {
    try {
      const p = await Notifications.getPermissionsAsync();
      setAllowed(p.status === 'granted');
    } catch {
      setAllowed(null);
    }
    setUnread(await getUnreadCount().catch(() => 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission]),
  );

  const askPermission = useCallback(async (): Promise<boolean> => {
    const ok = await requestNotificationPermissions();
    setAllowed(ok);
    if (!ok) showPopup('Autorisation nécessaire', 'Active les notifications de YOROI dans les réglages de ton téléphone.');
    return ok;
  }, [showPopup]);

  /** Met a jour un bloc de reglages (ex. patch('training', { time: '18:30' })) et reprogramme. */
  const patch = useCallback(
    async <K extends keyof NotificationSettings>(parent: K, value: Partial<NotificationSettings[K]>) => {
      if (!settings) return;
      const turningOn = (value as { enabled?: boolean }).enabled === true;
      if (turningOn && !(await askPermission())) return;
      const next = JSON.parse(JSON.stringify(settings)) as NotificationSettings;
      (next as any)[parent] = { ...((next as any)[parent] ?? {}), ...value };
      if (turningOn) next.enabled = true;
      setSettings(next);
      await notificationService.updateSettings(next);
    },
    [settings, askPermission],
  );

  const setCitation = useCallback(
    async (p: Partial<CitationNotifSettings>) => {
      if (!cit) return;
      if (p.enabled === true && !(await askPermission())) return;
      const next = { ...cit, ...p };
      setCit(next);
      await setCitationNotifSettings(next);
    },
    [cit, askPermission],
  );

  const setTip = useCallback(
    async (p: Partial<HealthTipSettings>) => {
      if (!tips) return;
      if (p.enabled === true && !(await askPermission())) return;
      const next = { ...tips, ...p };
      setTips(next);
      await saveHealthTipSettings(next);
    },
    [tips, askPermission],
  );

  const setTimerOpt = useCallback(
    async (key: keyof TimerNotifSettings, value: boolean) => {
      if (!timer) return;
      const next = { ...timer, [key]: value };
      setTimer(next);
      await timerNotifications.saveSettings(next);
    },
    [timer],
  );

  const toggleRecap = useCallback(
    async (v: boolean) => {
      if (v && !(await askPermission())) return;
      setRecap(v);
      if (v) await scheduleWeeklyRecap();
      else await cancelWeeklyRecap();
    },
    [askPermission],
  );

  const toggleRisk = useCallback(
    async (v: boolean) => {
      if (v && !(await askPermission())) return;
      setRisk(v);
      await setStreakRiskEnabled(v);
    },
    [askPermission],
  );

  // vague 27 : rappel doux si la pesee habituelle n'est pas notee environ 2 h apres
  const habOn = hab.actif && !!heureDe(hab);
  const habJours = hab.jours ?? [];
  const toggleHab = useCallback(
    async (v: boolean) => {
      if (v && !(await askPermission())) return;
      const next = await saveHabitudePesee({ actif: v, ...(v && (!hab.moment || hab.moment === 'inconnu') ? { moment: 'reveil' as const } : {}) });
      setHab(next);
      await planifierRappelPesee();
    },
    [askPermission, hab.moment],
  );
  const pickHabMoment = useCallback(async (m: 'reveil' | 'douche' | 'midi' | 'soir' | 'heure') => {
    selectionAsync().catch(() => {});
    setHab(await saveHabitudePesee({ moment: m, ...(m === 'heure' && !hab.heure ? { heure: '07:00' } : {}) }));
    await planifierRappelPesee();
  }, [hab.heure]);
  // vague 28 : tes jours de pesee (comme Date.getDay()) et ton heure precise
  const pickHabJours = useCallback(async (jours: number[]) => {
    setHab(await saveHabitudePesee({ jours }));
    await planifierRappelPesee();
  }, []);
  const pickHabHeure = useCallback(async (heure: string) => {
    setHab(await saveHabitudePesee({ moment: 'heure', heure }));
    await planifierRappelPesee();
  }, []);

  // 14 octobre 2026 : « Ta discipline », le meme reglage que l'ecran 7 de l'onboarding et les Nouveautes de la 3.0,
  // lu dans l'etat de cet ecran (toujours d'accord avec les cartes ci-dessous)
  const discipline = useMemo<ChoixRappels | null>(() => {
    if (!settings) return null;
    const on = settings.enabled !== false;
    return choixDepuisServices({
      autorise: allowed === true,
      training: on ? settings.training : null,
      hydratation: on && !!settings.hydration?.enabled,
      pesee: { actif: habOn, joursJs: hab.jours },
      bilan: recap,
    });
  }, [settings, allowed, habOn, hab.jours, recap]);
  const changerDiscipline = useCallback(async (next: ChoixRappels) => {
    await appliquerChoixRappels(next);
    void refreshPermission();
    setSettings(notificationService.getSettings());
    setRecap(await isWeeklyRecapEnabled().catch(() => next.bilan.actif));
    setHab(await getHabitudePesee());
  }, [refreshPermission]);

  const sendTest = useCallback(
    async (type: string) => {
      impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
      try {
        switch (type) {
          case 'training': await notificationService.sendTrainingReminder(); break;
          case 'hydration': await notificationService.sendHydrationReminder(); break;
          case 'streak': await notificationService.sendStreakWarning(5); break;
          case 'social_weekly': await notificationService.sendWeeklyCardReminder(); break;
          case 'briefing': await notificationService.sendBriefing(); break;
          case 'smart': await notificationService.sendSmartReminderTest(); break;
        }
        DeviceEventEmitter.emit('YOROI_NOTIF_READ');
        showPopup('C’est parti', 'Tu vas la recevoir dans quelques secondes.');
      } catch {
        showPopup('Oups', 'La notification de test n’a pas pu partir.');
      }
    },
    [showPopup],
  );

  // Prochain rappel, toutes notifications confondues
  const upcoming = useMemo(() => {
    if (!settings || !cit || !tips) return null;
    const list: { label: string; icon: IconName; at: Date | null }[] = [];
    const add = (on: boolean | undefined, label: string, icon: IconName, days: number[], time: string) => {
      if (on) list.push({ label, icon, at: nextFire(days, time) });
    };
    add(settings.weighing.enabled, 'Pesée', 'scale', eff(settings.weighing.days, WEEKDAYS), settings.weighing.time);
    add(settings.training.enabled, 'Entraînement', 'dumbbell', eff(settings.training.days, WEEKDAYS), settings.training.time);
    add(settings.streak.enabled, 'Ta série', 'flame', EVERY_DAY, settings.streak.time);
    add(settings.briefing?.enabled, 'Briefing du matin', 'sun', eff(settings.briefing?.days, EVERY_DAY), settings.briefing?.time ?? '07:30');
    add(recap, 'Bilan de la semaine', 'calendar', [0], '19:00');
    add(settings.sleep.enabled, 'Heure du coucher', 'bed', eff(settings.sleep.days, EVERY_DAY), settings.sleep.bedtimeReminder);
    if (settings.hydration.enabled) {
      hydrationHours(settings.hydration.startTime, settings.hydration.endTime, settings.hydration.interval).forEach((h) =>
        add(true, 'Boire de l’eau', 'drop', EVERY_DAY, pad(h)),
      );
    }
    add(tips.enabled, 'Conseil du soir', 'moon', eff(tips.days, EVERY_DAY), tips.time);
    add(cit.enabled, 'Citation du matin', 'quote', EVERY_DAY, cit.time || '08:00');
    add(settings.socialCards?.enabled, 'Carte de la semaine', 'share', [5], settings.socialCards?.weeklyTime ?? '19:00');
    const dated = list.filter((x) => x.at).sort((a, b) => a.at!.getTime() - b.at!.getTime());
    return dated[0] ?? null;
  }, [settings, cit, tips, recap]);

  if (!settings || !cit || !tips || !timer) {
    return (
      <EspaceScreen title="Notifications">
        <View style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ height: 70, borderRadius: 22, backgroundColor: c.fillSoft }} />
          ))}
        </View>
      </EspaceScreen>
    );
  }

  const weighDays = eff(settings.weighing.days, WEEKDAYS);
  const trainDays = eff(settings.training.days, WEEKDAYS);
  const sleepDays = eff(settings.sleep.days, EVERY_DAY);
  const briefing = settings.briefing ?? { enabled: false, time: '07:30', days: [] };
  const briefDays = eff(briefing.days, EVERY_DAY);
  const tipDays = eff(tips.days, EVERY_DAY);
  const hyd = settings.hydration;
  const hydHours = hydrationHours(hyd.startTime, hyd.endTime, hyd.interval);
  const smart = settings.smartReminders ?? { enabled: false, missedTrainingAlert: false, restDaySuggestion: false, frequencyAlert: false, checkTime: '19:00' };
  const social = settings.socialCards ?? { enabled: false, weeklyTime: '19:00', monthlyTime: '10:00' };

  const states = [
    settings.weighing.enabled, habOn, settings.training.enabled, recap, settings.streak.enabled, risk, briefing.enabled,
    settings.sleep.enabled, hyd.enabled, tips.enabled, cit.enabled, smart.enabled, social.enabled,
  ];
  const active = states.filter(Boolean).length;
  let idx = 0;

  return (
    <EspaceScreen
      title="Notifications"
      subtitle="Choisis ce que YOROI te rappelle, et quand."
    >
      {/* Autorisation */}
      {allowed === false ? (
        <Animated.View entering={ENTREE} style={{ borderRadius: 22, backgroundColor: c.goldTint, borderWidth: 1, borderColor: '#E9DCC0', padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="lock" size={22} color={c.goldDeep} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={16} weight="extraBold">Les notifications sont bloquées</Ink>
              <Ink size={13} color={c.textSecondary}>{`Tant qu’elles le sont, aucun rappel ne peut arriver${NB}: autorise-les une fois.`}</Ink>
            </View>
          </View>
          <Pressable
            onPress={async () => {
              const ok = await requestNotificationPermissions();
              if (ok) setAllowed(true);
              else Linking.openSettings().catch(() => {});
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
          >
            <Ink size={15} weight="extraBold" color={c.onAccent}>Autoriser les notifications</Ink>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Resume */}
      <Animated.View entering={ENTREE} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 18, gap: 14, overflow: 'hidden' }}>
        <Glyph kind="sakura" size={120} color="#F1EFE9" style={{ position: 'absolute', right: -18, top: -20 }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <Ink size={48} weight="black" tight color={active ? c.accent : c.ink}>{String(active)}</Ink>
          <Ink size={15} weight="bold" color={c.textSecondary} style={{ flex: 1, marginBottom: 8 }}>
            {active === 0 ? 'rappel allumé pour l’instant' : `rappel${active > 1 ? 's' : ''} allumé${active > 1 ? 's' : ''}`}
          </Ink>
        </View>
        {upcoming && upcoming.at ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: c.accentTint, padding: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={upcoming.icon} size={19} color={c.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Ink size={12} weight="bold" color={c.textSecondary}>Prochain rappel</Ink>
              <Ink size={15} weight="extraBold">{`${upcoming.label}, ${sayWhen(upcoming.at)}`}</Ink>
            </View>
          </View>
        ) : (
          <Ink size={14} color={c.textSecondary}>Allume un rappel ci-dessous : tu vois tout de suite quand il arrivera et à quoi il ressemble.</Ink>
        )}
        <Pressable
          onPress={() => router.push('/notification-center' as any)}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}
        >
          <Ink size={14} weight="extraBold" color={c.accent} style={{ flex: 1 }}>
            {unread > 0 ? `Voir les notifications reçues, ${unread} non lue${unread > 1 ? 's' : ''}` : 'Voir les notifications reçues'}
          </Ink>
          <Icon name="chevron" size={16} color={c.accent} />
        </Pressable>
      </Animated.View>

      {discipline ? (
        <>
          <SectionTitle title="Ta discipline" sub="La régularité fait le résultat" />
          <RappelsDiscipline value={discipline} onChange={(n) => void changerDiscipline(n)} ecran="reglages" />
        </>
      ) : null}

      <SectionTitle title="Ton suivi" sub="Poids, séances et régularité" />
      <NotifCard
        index={idx++}
        icon="scale"
        title="Rappel de pesée"
        pitch="Le matin, pour un suivi fiable"
        summary={`${sayTime(settings.weighing.time)}, ${sayDays(weighDays)}`}
        on={settings.weighing.enabled}
        onToggle={(v) => patch('weighing', { enabled: v })}
        preview={{ title: `Pesée du jour`, body: `Monte sur la balance pour suivre ta progression${NB}!`, when: sayTime(settings.weighing.time) }}
      >
        <TimeField label="Heure de la pesée" value={settings.weighing.time} onChange={(v) => patch('weighing', { time: v })} />
        <DaysPicker value={weighDays} onChange={(d) => patch('weighing', { days: d })} />
        <Ink size={12} color={c.textMuted}>Au réveil, à jeun et après être passé aux toilettes : c’est là que ton poids est le plus comparable d’un jour à l’autre.</Ink>
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="bell"
        title="Pesée oubliée"
        pitch="Un seul rappel doux, si ta pesée habituelle manque"
        summary={habOn ? `Vers ${sayTime(heureRappel(hab))} si rien n’est noté, ${habJours.length ? sayDays(habJours) : 'les jours où tu te pèses d’habitude'}` : 'Seulement les jours où tu te pèses d’habitude'}
        on={habOn}
        onToggle={toggleHab}
        preview={{ title: 'YOROI', body: 'Ta pesée du jour t’attend, 10 secondes suffisent.', when: habOn ? sayTime(heureRappel(hab)) : '' }}
      >
        <Ink size={13} weight="bold" color={c.textSecondary}>Quand te pèses-tu, d’habitude ?</Ink>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['reveil', 'douche', 'midi', 'soir', 'heure'] as const).map((m) => {
            const sel = hab.moment === m;
            return (
              <Pressable key={m} onPress={() => void pickHabMoment(m)} accessibilityRole="button" accessibilityState={{ selected: sel }} accessibilityLabel={MOMENT_LABEL[m]} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 14, backgroundColor: sel ? c.accent : c.surface, borderWidth: 1, borderColor: sel ? c.accent : c.border }}>
                <Ink size={13} weight="bold" color={sel ? '#FFFFFF' : c.ink}>{MOMENT_LABEL[m]}</Ink>
              </Pressable>
            );
          })}
        </View>
        {hab.moment === 'heure' ? <TimeField label="Ton heure de pesée" value={hab.heure ?? '07:00'} onChange={(v) => void pickHabHeure(v)} /> : null}
        <DaysPicker value={habJours} onChange={(d) => void pickHabJours(d)} />
        <Ink size={12} color={c.textMuted}>{habJours.length ? `Un seul rappel, environ 2${NB}h après, seulement ces jours-là et seulement si ta pesée manque.` : 'Sans jours choisis : seulement les jours où tu t’es pesé la semaine d’avant.'}</Ink>
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="dumbbell"
        title="Rappel d’entraînement"
        pitch="Les jours où tu t’entraînes"
        summary={`${sayTime(settings.training.time)}, ${sayDays(trainDays)}`}
        on={settings.training.enabled}
        onToggle={(v) => patch('training', { enabled: v })}
        preview={{ title: `C’est l’heure${NB}!`, body: `Ton entraînement t’attend. Donne tout${NB}!`, when: sayTime(settings.training.time) }}
        test={{ label: 'M’envoyer un essai', run: () => sendTest('training') }}
      >
        <TimeField label="Heure du rappel" value={settings.training.time} onChange={(v) => patch('training', { time: v })} />
        <DaysPicker value={trainDays} onChange={(d) => patch('training', { days: d })} />
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="calendar"
        title="Bilan de la semaine"
        pitch="Tes séances et tes minutes, chaque dimanche"
        summary={`Le dimanche à 19${NB}h`}
        on={recap}
        onToggle={toggleRecap}
        preview={{ title: 'Récap de ta semaine', body: 'Découvre ton bilan sportif des 7 derniers jours dans YOROI', when: `dim. 19${NB}h` }}
      />

      <NotifCard
        index={idx++}
        icon="flame"
        title="Protège ta série"
        pitch="Un rappel le soir si rien n’est noté"
        summary={`${sayTime(settings.streak.time)}, seulement sans séance`}
        on={settings.streak.enabled}
        onToggle={(v) => patch('streak', { enabled: v })}
        preview={{ title: `Ne casse pas ta série${NB}!`, body: `Même une séance légère compte. Go${NB}!`, when: sayTime(settings.streak.time) }}
        test={{ label: 'M’envoyer un essai', run: () => sendTest('streak') }}
      >
        <TimeField label="Heure du rappel" value={settings.streak.time} onChange={(v) => patch('streak', { time: v })} />
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="shield"
        title="Série en danger"
        pitch="Après 3 jours d’affilée, si tu n’as rien fait"
        summary={`Le soir vers 20${NB}h, après 3 jours d’affilée`}
        on={risk}
        onToggle={toggleRisk}
      />

      <NotifCard
        index={idx++}
        icon="sun"
        title="Briefing du matin"
        pitch="Ta série, ton poids et ton planning du jour"
        summary={`${sayTime(briefing.time)}, ${sayDays(briefDays)}`}
        on={briefing.enabled}
        onToggle={(v) => patch('briefing', { enabled: v })}
        preview={{ title: `Bonjour${NB}!`, body: 'Ta série, ton dernier poids et ce qui est prévu aujourd’hui.', when: sayTime(briefing.time) }}
        test={{ label: 'M’envoyer le briefing', run: () => sendTest('briefing') }}
      >
        <TimeField label="Heure du briefing" value={briefing.time} onChange={(v) => patch('briefing', { time: v })} />
        <DaysPicker value={briefDays} onChange={(d) => patch('briefing', { days: d })} />
      </NotifCard>

      <SectionTitle title="Ta récupération" sub="Sommeil, eau et conseils" />
      <NotifCard
        index={idx++}
        icon="bed"
        title="Heure du coucher"
        pitch="Pour lâcher les écrans à temps"
        summary={`${sayTime(settings.sleep.bedtimeReminder)}, ${sayDays(sleepDays)}`}
        on={settings.sleep.enabled}
        onToggle={(v) => patch('sleep', { enabled: v })}
        preview={{ title: 'Heure du coucher', body: 'Éteins les écrans, ton objectif sommeil t’attend.', when: sayTime(settings.sleep.bedtimeReminder) }}
      >
        <TimeField label="Heure du rappel" value={settings.sleep.bedtimeReminder} onChange={(v) => patch('sleep', { bedtimeReminder: v })} />
        <DaysPicker value={sleepDays} onChange={(d) => patch('sleep', { days: d })} />
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="drop"
        title="Boire de l’eau"
        pitch="Quelques rappels répartis dans la journée"
        summary={hydHours.length > 1 ? `${hydHours.length} fois par jour, de ${sayTime(hyd.startTime)} à ${sayTime(pad(hydHours[hydHours.length - 1]))}` : `Une fois par jour à ${sayTime(hyd.startTime)}`}
        on={hyd.enabled}
        onToggle={(v) => {
          // premiere activation : des horaires utiles plutot qu'un seul rappel a 8 h
          if (v && hyd.startTime === hyd.endTime && hyd.interval >= 24) patch('hydration', { enabled: true, startTime: '09:00', endTime: '19:00', interval: 3 });
          else patch('hydration', { enabled: v });
        }}
        preview={{ title: 'Pause eau', body: `Ton corps a besoin d’eau. Bois un verre${NB}!`, when: sayTime(hyd.startTime) }}
        test={{ label: 'M’envoyer un essai', run: () => sendTest('hydration') }}
      >
        <TimeField label="Premier rappel" value={hyd.startTime} onChange={(v) => patch('hydration', { startTime: v.slice(0, 3) + '00', endTime: v > hyd.endTime ? v.slice(0, 3) + '00' : hyd.endTime })} />
        <TimeField label="Dernier rappel au plus tard" value={hyd.endTime} onChange={(v) => patch('hydration', { endTime: v.slice(0, 3) + '00', startTime: v < hyd.startTime ? v.slice(0, 3) + '00' : hyd.startTime })} />
        <ChoiceChips
          label="Un rappel toutes les"
          value={hyd.interval >= 24 ? 24 : hyd.interval}
          options={[
            { value: 2, label: `2${NB}h` },
            { value: 3, label: `3${NB}h` },
            { value: 4, label: `4${NB}h` },
            { value: 24, label: 'Une fois' },
          ]}
          onChange={(v) => patch('hydration', { interval: v })}
        />
        <Ink size={12} color={c.textMuted}>
          {hydHours.length ? `Tu les recevras à ${hydHours.map((h) => `${h}${NB}h`).join(', ')}.` : 'Aucun horaire valide.'}
        </Ink>
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="moon"
        title="Conseil du soir"
        pitch="Un conseil santé ou nutrition, court"
        summary={`${sayTime(tips.time)}, ${sayDays(tipDays)}`}
        on={tips.enabled}
        onToggle={(v) => setTip({ enabled: v })}
        preview={{ title: 'Fluctuations', body: 'Ton poids varie d’un jour à l’autre avec l’eau et le sel : regarde la tendance, pas la pesée du jour.', when: sayTime(tips.time) }}
      >
        <TimeField label="Heure du conseil" value={tips.time} onChange={(v) => setTip({ time: v })} />
        <DaysPicker value={tipDays} onChange={(d) => setTip({ days: d })} />
      </NotifCard>

      <SectionTitle title="Motivation" sub="Pour garder l’envie" />
      <NotifCard
        index={idx++}
        icon="quote"
        title="Citation du matin"
        pitch="Une phrase de guerrier pour démarrer"
        summary={`Tous les jours à ${sayTime(cit.time || '08:00')}`}
        on={cit.enabled}
        onToggle={(v) => setCitation({ enabled: v })}
        preview={{ title: 'Citation du jour', body: quote, when: sayTime(cit.time || '08:00') }}
      >
        <TimeField label="Heure de la citation" value={cit.time || '08:00'} onChange={(v) => setCitation({ time: v })} />
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="brain"
        title="Rappels malins"
        pitch="Selon tes habitudes des 60 derniers jours"
        summary={`Analyse chaque soir à ${sayTime(smart.checkTime)}`}
        on={smart.enabled}
        onToggle={(v) => patch('smartReminders', { enabled: v, ...(v && !smart.missedTrainingAlert && !smart.restDaySuggestion && !smart.frequencyAlert ? { missedTrainingAlert: true, restDaySuggestion: true, frequencyAlert: true } : {}) })}
        test={{ label: 'Voir mon analyse', run: () => sendTest('smart') }}
      >
        <TimeField label="Heure de l’analyse" value={smart.checkTime} onChange={(v) => patch('smartReminders', { checkTime: v })} />
        <View>
          <MiniToggle label="Jour habituel manqué" sub="Tu t’entraînes d’habitude ce jour-là" value={smart.missedTrainingAlert} onChange={(v) => patch('smartReminders', { missedTrainingAlert: v })} />
          <MiniToggle label="Conseil de repos" sub="Après plusieurs jours d’affilée" value={smart.restDaySuggestion} onChange={(v) => patch('smartReminders', { restDaySuggestion: v })} />
          <MiniToggle label="Rythme en baisse" sub="Moins de séances que d’habitude" value={smart.frequencyAlert} onChange={(v) => patch('smartReminders', { frequencyAlert: v })} />
        </View>
      </NotifCard>

      <NotifCard
        index={idx++}
        icon="share"
        title="Carte à partager"
        pitch="Ta carte de la semaine, celle du mois le 1er"
        summary={`Le vendredi à ${sayTime(social.weeklyTime)}, et le 1er du mois`}
        on={social.enabled}
        onToggle={(v) => patch('socialCards', { enabled: v })}
        preview={{ title: `Ta semaine en image${NB}!`, body: 'Ta carte hebdo est prête. Partage tes progrès.', when: `ven. ${sayTime(social.weeklyTime)}` }}
        test={{ label: 'M’envoyer un essai', run: () => sendTest('social_weekly') }}
      >
        <TimeField label="Heure du vendredi" value={social.weeklyTime} onChange={(v) => patch('socialCards', { weeklyTime: v })} />
      </NotifCard>

      <SectionTitle title="Pendant la séance" sub="Arrivent même téléphone verrouillé" />
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 4 }}>
        <MiniToggle label="Repos terminé" sub="Pour reprendre ta série à l’heure" value={timer.restFinished} onChange={(v) => setTimerOpt('restFinished', v)} />
        <View style={{ height: 1, backgroundColor: c.divider }} />
        <MiniToggle label="Round terminé" sub="Rounds de combat, Tabata, chaque minute, maximum de tours" value={timer.roundFinished} onChange={(v) => setTimerOpt('roundFinished', v)} />
        <View style={{ height: 1, backgroundColor: c.divider }} />
        <MiniToggle label="Séance terminée" sub="À la toute fin du minuteur" value={timer.workoutFinished} onChange={(v) => setTimerOpt('workoutFinished', v)} />
      </View>

    </EspaceScreen>
  );
}
