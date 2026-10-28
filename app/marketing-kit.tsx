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
import { traduire } from '@/lib/i18n/tr';

type Step = { id: string; title: string; story: string; route: string; icon: IconName; hint: string };

const STEPS: Step[] = [
  { id: 'accueil', title: traduire('Accueil'), story: traduire('Premier contact : ta semaine, ton armure et ta dernière pesée.'), route: '/(tabs)', icon: 'home', hint: traduire('Onglet Accueil, en haut de l’écran') },
  { id: 'progres', title: traduire('Courbe de poids'), story: traduire('Six mois de progression tracés au pinceau.'), route: '/(tabs)/progres', icon: 'scale', hint: traduire('Onglet Progrès, période 6 mois') },
  { id: 'seances', title: traduire('Séances'), story: traduire('Un historique bien rempli : musculation, combat, cardio.'), route: '/(tabs)/seances', icon: 'dumbbell', hint: traduire('Onglet Séances, fais défiler un peu') },
  { id: 'dojo', title: traduire('Dojo'), story: traduire('L’armure qui se construit plaque après plaque.'), route: '/(tabs)/dojo', icon: 'belt', hint: traduire('Onglet Dojo, carte du rang en haut') },
  { id: 'records', title: traduire('Records'), story: traduire('Les records tamponnés du sceau rouge.'), route: '/records', icon: 'trophy', hint: traduire('Séances, puis Records') },
  { id: 'transformation', title: traduire('Avant, après'), story: traduire('Le résultat concret, côte à côte.'), route: '/transformation', icon: 'image', hint: traduire('Progrès, puis Transformation') },
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
    <DetailScreen title={traduire("Kit marketing")} subtitle={traduire("6 captures qui racontent l’app, dans l’ordre")}>
      {/* Progression en plaques kozane */}
      <Card style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2, flex: 1 }}>
            <Ink size={28} weight="black" tight>{traduire("{0} sur {1}", done.size, STEPS.length)}</Ink>
            <Ink size={13} weight="bold" color={P.ink2}>{complete ? traduire('Séquence complète') : nextStep ? traduire("Prochaine : {0}", nextStep.title) : ''}</Ink>
          </View>
          {complete ? <Hanko size={48} /> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((s, i) => (
            <Kozane key={s.id} on={done.has(s.id)} partial={!done.has(s.id) && nextStep?.id === s.id} w={34} h={43} />
          ))}
        </View>
      </Card>

      <BigButton label={traduire("Démarrer la séquence")} icon="play" onPress={start} />
      <Ink size={12} color={P.muted} style={{ textAlign: 'center' }}>{traduire("Active le mode capture propre et la barre d’état 09:41.")}</Ink>

      <Card>
        <ToggleRow first icon="camera" label={traduire("Mode capture propre")} sub={traduire("Masque badges et messages de test")} value={isScreenshotMode} onChange={() => toggleScreenshotMode()} />
        <ToggleRow icon="timer" label={traduire("Barre d’état 09:41")} sub={traduire("Heure, batterie et réseau parfaits")} value={useFakeStatusBar} onChange={() => toggleFakeStatusBar()} disabled={!isScreenshotMode} />
      </Card>

      <Card style={{ padding: 14, gap: 6, backgroundColor: P.indigoSoft, borderColor: P.indigoSoft }}>
        <Ink size={14} weight="extraBold" color={P.indigo}>{traduire("Comment capturer")}</Ink>
        <Ink size={13} color={P.indigo}>{traduire("1. Touche Ouvrir sur une étape.")}</Ink>
        <Ink size={13} color={P.indigo}>{traduire("2. Fais la capture : bouton latéral et volume haut en même temps.")}</Ink>
        <Ink size={13} color={P.indigo}>{traduire("3. Reviens ici et coche l’étape.")}</Ink>
      </Card>

      <SectionTitle title={traduire("Les étapes")} />
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
                    <Ink size={16} weight="black">{traduire(step.title)}</Ink>
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
                  style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: pressed ? P.primaryPressed : P.primary, alignItems: 'center', justifyContent: 'center' })}
                >
                  <Ink size={14} weight="extraBold" color={P.onPrimary}>{traduire("Ouvrir")}</Ink>
                </Pressable>
                <Pressable
                  onPress={() => toggleStep(step.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ok }}
                  accessibilityLabel={ok ? traduire("{0}, capturé", step.title) : traduire("Marquer {0} comme capturé", step.title)}
                  style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: pressed ? '#EEECE6' : P.white, borderWidth: 1, borderColor: ok ? P.moss : P.line, alignItems: 'center', justifyContent: 'center' })}
                >
                  <Ink size={14} weight="extraBold" color={ok ? P.mossText : P.ink}>{ok ? traduire('Capturé') : 'Marquer fait'}</Ink>
                </Pressable>
              </View>
            </Card>
          );
        })}
      </View>

      {complete ? (
        <Card style={{ padding: 16, gap: 6, alignItems: 'center', backgroundColor: P.mossSoft, borderColor: P.mossSoft }}>
          <Ink size={17} weight="black" color={P.mossText}>{traduire("Séquence complète")}</Ink>
          <Ink size={13} color={P.mossText} style={{ textAlign: 'center' }}>{traduire("Tes 6 captures sont dans tes Photos. Range tes captures dans cet ordre pour l’App Store ou Instagram.")}</Ink>
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
