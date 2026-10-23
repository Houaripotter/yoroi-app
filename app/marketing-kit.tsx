/**
 * Kit marketing (Studio createur, v2) : guide pas a pas pour capturer les 6 ecrans
 * qui racontent l'app dans l'ordre. Active le mode capture propre et la barre 09:41.
 * Reserve au mode createur verifie : sans lui, un cadenas seulement.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import { StudioGate } from '@/components/yoroi/v2/studio/StudioLock';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Kozane, P } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { Card, Icon, SectionTitle, ToggleRow } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';

type Step = { id: string; title: string; story: string; route: string; icon: IconName; hint: string };

const STEPS: Step[] = [
  { id: 'accueil', title: 'Accueil', story: 'Premier contact : ta semaine, ton armure et ta dernière pesée.', route: '/(tabs)', icon: 'home', hint: 'Onglet Accueil, en haut de l’écran' },
  { id: 'progres', title: 'Courbe de poids', story: 'Six mois de progression tracés au pinceau.', route: '/(tabs)/progres', icon: 'scale', hint: 'Onglet Progrès, période 6 mois' },
  { id: 'seances', title: 'Séances', story: 'Un historique bien rempli : musculation, combat, cardio.', route: '/(tabs)/seances', icon: 'dumbbell', hint: 'Onglet Séances, fais défiler un peu' },
  { id: 'dojo', title: 'Dojo', story: 'L’armure qui se construit plaque après plaque.', route: '/(tabs)/dojo', icon: 'belt', hint: 'Onglet Dojo, carte du rang en haut' },
  { id: 'records', title: 'Records', story: 'Les records tamponnés du sceau rouge.', route: '/records', icon: 'trophy', hint: 'Séances, puis Records' },
  { id: 'transformation', title: 'Avant, après', story: 'Le résultat concret, côte à côte.', route: '/transformation', icon: 'image', hint: 'Progrès, puis Transformation' },
];

function MarketingKitInner() {
  const router = useRouter();
  const { isScreenshotMode, setScreenshotMode, useFakeStatusBar, toggleFakeStatusBar, toggleScreenshotMode } = useScreenshotMode();
  const [done, setDone] = useState<Set<string>>(new Set());

  const toggleStep = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === STEPS.length) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      return next;
    });
  };

  const open = async (step: Step) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (!isScreenshotMode) await setScreenshotMode(true);
    router.push(step.route as any);
  };

  const start = async () => {
    impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    if (!isScreenshotMode) await setScreenshotMode(true);
    if (!useFakeStatusBar) await toggleFakeStatusBar();
    setDone(new Set());
    router.push(STEPS[0].route as any);
  };

  const nextStep = STEPS.find((s) => !done.has(s.id));
  const complete = done.size === STEPS.length;

  return (
    <DetailScreen title="Kit marketing" subtitle="6 captures qui racontent l’app, dans l’ordre">
      {/* Progression en plaques kozane */}
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Ink size={28} weight="black" tight>{`${done.size} sur ${STEPS.length}`}</Ink>
            <Ink size={13} weight="bold" color={P.ink2}>{complete ? 'Séquence complète' : nextStep ? `Prochaine : ${nextStep.title}` : ''}</Ink>
          </View>
          {complete ? <Hanko size={48} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((s, i) => (
            <Kozane key={s.id} on={done.has(s.id)} partial={!done.has(s.id) && nextStep?.id === s.id} w={34} h={43} />
          ))}
        </View>
      </Card>

      <BigButton label="Démarrer la séquence" icon="play" onPress={start} />
      <Ink size={12} color={P.muted} style={{ textAlign: 'center' }}>Active le mode capture propre et la barre d’état 09:41.</Ink>

      <Card>
        <ToggleRow first icon="camera" label="Mode capture propre" sub="Masque badges et messages de test" value={isScreenshotMode} onChange={() => toggleScreenshotMode()} />
        <ToggleRow icon="timer" label="Barre d’état 09:41" sub="Heure, batterie et réseau parfaits" value={useFakeStatusBar} onChange={() => toggleFakeStatusBar()} disabled={!isScreenshotMode} />
      </Card>

      <Card style={{ padding: 14, gap: 6, backgroundColor: P.indigoSoft, borderColor: P.indigoSoft }}>
        <Ink size={14} weight="extraBold" color={P.indigo}>Comment capturer</Ink>
        <Ink size={13} color={P.indigo}>1. Touche Ouvrir sur une étape.</Ink>
        <Ink size={13} color={P.indigo}>2. Fais la capture : bouton latéral et volume haut en même temps.</Ink>
        <Ink size={13} color={P.indigo}>3. Reviens ici et coche l’étape.</Ink>
      </Card>

      <SectionTitle title="Les étapes" />
      <View style={{ gap: 10 }}>
        {STEPS.map((step, idx) => {
          const ok = done.has(step.id);
          return (
            <Card key={step.id} style={{ padding: 14, gap: 12, borderWidth: ok ? 2 : 1, borderColor: ok ? P.moss : P.line2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: ok ? P.mossSoft : '#EEECE6', alignItems: 'center', justifyContent: 'center' }}>
                  {ok ? <Icon name="check" size={20} color={P.mossText} stroke={3} /> : <Ink size={17} weight="black">{String(idx + 1)}</Ink>}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name={step.icon} size={16} color={P.ink2} />
                    <Ink size={16} weight="black">{step.title}</Ink>
                  </View>
                  <Ink size={13} color={P.ink2}>{step.story}</Ink>
                  <Ink size={12} weight="bold" color={P.muted}>{step.hint}</Ink>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => open(step)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir ${step.title}`}
                  style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: pressed ? P.accentDark : P.accent, alignItems: 'center', justifyContent: 'center' })}
                >
                  <Ink size={14} weight="extraBold" color={P.white}>Ouvrir</Ink>
                </Pressable>
                <Pressable
                  onPress={() => toggleStep(step.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ok }}
                  accessibilityLabel={ok ? `${step.title}, capturé` : `Marquer ${step.title} comme capturé`}
                  style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: pressed ? '#EEECE6' : P.white, borderWidth: 1, borderColor: ok ? P.moss : P.line, alignItems: 'center', justifyContent: 'center' })}
                >
                  <Ink size={14} weight="extraBold" color={ok ? P.mossText : P.ink}>{ok ? 'Capturé' : 'Marquer fait'}</Ink>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </View>

      {complete ? (
        <Card style={{ padding: 16, gap: 6, alignItems: 'center', backgroundColor: P.mossSoft, borderColor: P.mossSoft }}>
          <Ink size={17} weight="black" color={P.mossText}>Séquence complète</Ink>
          <Ink size={13} color={P.mossText} style={{ textAlign: 'center' }}>Tes 6 captures sont dans tes Photos. Range-les dans cet ordre pour l’App Store ou Instagram.</Ink>
        </Card>
      ) : null}
    </DetailScreen>
  );
}

export default function MarketingKitScreen() {
  return (
    <StudioGate>
      <MarketingKitInner />
    </StudioGate>
  );
}
