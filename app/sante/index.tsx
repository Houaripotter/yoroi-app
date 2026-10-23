/**
 * Ta santé (refonte v2, 9 octobre 2026) : score de préparation honnête, anneaux,
 * sections Activité, Cœur, Sommeil, Récupération, Respiration, Corps, Nutrition,
 * graphiques au doigt, appareils détectés et fiche par marque.
 * Vague 14 : la grille « Aller plus loin » est remplacée par une seule ligne Connexion santé.
 * Lecture depuis Apple Santé (iPhone) ou Health Connect (Android).
 * Dans Expo Go : connexion expliquée en trois gestes et données déjà enregistrées.
 */
import { setProprietes, track } from '@/utils/telemetry';
import React, { useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Image, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Enter, RoundButton, tap } from '@/components/yoroi/v2/accueil/kit';
import { SCENES } from '@/components/yoroi/v2/accueil/images';
import { GoalsSheet, InsightsRow, RingsCard, WaitingList, WorkoutList } from '@/components/yoroi/v2/sante/Dashboard';
import { BrandStrip, ConnectSteps, ExtendedCard, ScoreHero, SectionBlock } from '@/components/yoroi/v2/sante/Hub';
import { ActionRow, CardBox, Label, S, SourceCard } from '@/components/yoroi/v2/sante/ui';
import { paperA } from '@/components/yoroi/livePalette';
import { healthConnect } from '@/lib/healthConnect';
import { useSante } from '@/lib/v2/sante/useSante';
import { DEFAULT_GOALS, askExtendedAccess, saveRingGoals } from '@/lib/v2/sante/data';
import { connecterSanteSuivi } from '@/lib/v2/onboarding/save';
import { montrerIssueSante } from '@/lib/v2/sante/demandeActions';
import { METRICS, SECTIONS, availableOn } from '@/lib/v2/sante/metrics';
import type { MetricKey } from '@/lib/v2/sante/metrics';
import { dayLong, todayIso, capitalize } from '@/lib/v2/progres/format';
import { logger } from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

const ANDROID = Platform.OS === 'android';


export default function SanteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const st = useSante();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [asking, setAsking] = useState(false);

  const goals = st.goals ?? DEFAULT_GOALS;
  const series = st.series;
  const provider = ANDROID ? 'Health Connect' : 'Apple Santé';

  const { withData, waiting } = useMemo(() => {
    const w: typeof METRICS = [];
    const d: typeof METRICS = [];
    METRICS.forEach((m) => {
      if (!availableOn(m, ANDROID)) return;
      const pts = series?.[m.key] ?? [];
      if (pts.some((p) => p.value > 0)) d.push(m);
      else w.push(m);
    });
    return { withData: d, waiting: w };
  }, [series]);

  const open = (k: MetricKey) => router.push(`/sante/${k}` as any);
  const openBrand = (key?: string) => router.push((key ? `/sante/montre?marque=${key}` : '/sante/montre') as any);

  const connect = async () => {
    if (connecting) return;
    tap('medium');
    setConnecting(true);
    try {
      const available = await healthConnect.isAvailable();
      if (!available) {
        router.push('/health-connect' as any);
        return;
      }
      // 14 octobre 2026 (SANTÉ CONNEXION) : vérifié par une vraie lecture, import en arrière-plan
      const issue = await connecterSanteSuivi();
      if (issue === 'connecte') {
        tap('success');
        await st.reload();
      } else if (issue === 'indisponible') {
        router.push('/health-connect' as any);
      } else {
        montrerIssueSante(issue);
      }
    } catch (e) {
      logger.error('[Sante v2] connexion', e);
      appAlert(traduire('Connexion impossible'), traduire('Réessaie depuis Appareils et sources.'));
    } finally {
      setConnecting(false);
    }
  };

  const askMore = async () => {
    setAsking(true);
    try {
      await askExtendedAccess();
      st.hideExtended();
      tap('success');
      await st.reload({ sync: true });
    } catch (e) {
      // audit 18 octobre : plus de promesse rejetee sans suite si l'autorisation echoue
      logger.warn('[Sante v2] mesures avancees', e);
    } finally {
      setAsking(false);
    }
  };

  const isLive = st.source?.mode === 'live';
  const nothing = !st.loading && withData.length === 0;
  const showConnect = !st.loading && (!isLive || nothing);

  return (
    <View style={{ flex: 1, backgroundColor: S.paper }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}>
        <Image source={SCENES.matcha} style={{ width: '100%', height: '100%', opacity: 0.55 }} resizeMode="cover" />
        <LinearGradient colors={[paperA(0.15), paperA(0.7), S.paper]} locations={[0, 0.6, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48, paddingHorizontal: 16, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={st.refreshing} onRefresh={st.refresh} tintColor={S.accent} />}
      >
        <EnTete
          titre={traduire("Ta santé")}
          sousTitre={capitalize(dayLong(todayIso()))}
          onRetour={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
          style={{ marginHorizontal: -16, marginTop: -8 }}
        />

        {showConnect ? (
          <Enter i={0}>
            <ConnectSteps provider={provider} mode={st.source?.mode ?? 'off'} connecting={connecting} onConnect={connect} onPickBrand={openBrand} />
          </Enter>
        ) : (
          <Enter i={0}>
            <SourceCard source={st.source} onConnect={connect} connecting={connecting} onSync={st.refresh} syncing={st.refreshing} />
          </Enter>
        )}

        {st.needsExtended ? (
          <Enter i={1}>
            <ExtendedCard onAsk={askMore} busy={asking} />
          </Enter>
        ) : null}

        {!nothing ? (
          <Enter i={1}>
            <ScoreHero readiness={st.readiness} onOpen={open} />
          </Enter>
        ) : null}

        <Enter i={2}>
          <RingsCard rings={st.rings} goals={goals} week={st.week} onEditGoals={() => setGoalsOpen(true)} />
        </Enter>

        {!st.loading ? (
          <Enter i={3} style={{ gap: 8 }}>
            <Label aside={st.detected.length ? traduire('sur 30 jours') : undefined}>{traduire("Tes appareils")}</Label>
            <BrandStrip detected={st.detected} onOpen={openBrand} onAdd={() => openBrand()} />
          </Enter>
        ) : null}

        {st.insights.length > 0 ? (
          <Enter i={4} style={{ gap: 10 }}>
            <Label>{traduire("Ce que disent tes données")}</Label>
            <InsightsRow insights={st.insights} />
          </Enter>
        ) : null}

        {series ? SECTIONS.map((sec) => <SectionBlock key={sec.key} section={sec} series={series} onOpen={open} />) : null}

        {isLive && st.workouts.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Label aside={traduire("{0} au total", st.workouts.length)}>{traduire("Séances de ta montre")}</Label>
            <WorkoutList workouts={st.workouts} limit={5} />
          </View>
        ) : null}

        {!st.loading && waiting.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Label aside={traduire("{0} mesures", waiting.length)}>{traduire("Encore en attente")}</Label>
            <WaitingList defs={waiting} onOpen={open} />
          </View>
        ) : null}

        {/* Une seule porte vers la gestion de la liaison ; les marques s'ouvrent depuis Tes appareils,
            les zones cardiaques depuis la fiche Fréquence cardiaque, la synchro iPhone et iPad depuis Réglages. */}
        <CardBox>
          <ActionRow first icon="link" title={traduire("Connexion santé")} sub={traduire("Autorisations, import, diagnostic")} onPress={() => router.push('/health-connect' as any)} color={S.indigo} tint={S.indigoSoft} />
        </CardBox>
      </ScrollView>

      <GoalsSheet
        visible={goalsOpen}
        goals={goals}
        hasStand={!!st.rings?.hasStand}
        hasExercise={st.rings ? st.rings.hasExercise : true}
        onClose={() => setGoalsOpen(false)}
        onSave={async (g) => {
          await saveRingGoals(g);
          st.setGoals(g);
          tap('success');
          setGoalsOpen(false);
        }}
      />
    </View>
  );
}
