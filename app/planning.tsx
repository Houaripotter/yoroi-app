/**
 * Planning v2 : ta semaine (creneaux reguliers, validation, annulation), le calendrier du mois,
 * tes competitions et le catalogue d'evenements, tes clubs et tes objectifs.
 * Parametres : openSlots=1 (ouvre la gestion des creneaux), tab=semaine|mois|events|competitions|clubs|calendar.
 * Les vues sont dans components/yoroi/v2/seances/ (PlanWeek, PlanMonth, PlanEvents, PlanClubs).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Image, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getRestDays } from '@/lib/restDaysService';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { mainSportOf } from '@/lib/v2/seances/bannerSport';
import { isoOf } from '@/lib/v2/seances/sessionData';
import { PlanWeek } from '@/components/yoroi/v2/seances/PlanWeek';
import { PlanMonth } from '@/components/yoroi/v2/seances/PlanMonth';
import { PlanEvents } from '@/components/yoroi/v2/seances/PlanEvents';
import { PlanClubs } from '@/components/yoroi/v2/seances/PlanClubs';
import { BackButton, RoundIcon, Segments } from '@/components/yoroi/v2/seances/ui';

type View_ = 'semaine' | 'mois' | 'competitions' | 'clubs';

function initialView(tab?: string): View_ {
  if (tab === 'events' || tab === 'competitions') return 'competitions';
  if (tab === 'clubs') return 'clubs';
  if (tab === 'mois' || tab === 'calendar') return 'mois';
  return 'semaine';
}

export default function PlanningScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ openSlots?: string; tab?: string }>();
  const { trainings, plan, competitions, records, gender, reload } = useSeancesData();
  const [view, setView] = useState<View_>(initialView(params.tab));
  const [restDays, setRestDays] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  // L'illustration suit ton sport principal, ou celui de ta prochaine competition dans l'onglet Compét.
  const todayIso = isoOf(new Date());
  const nextComp = competitions.filter((x) => x.date >= todayIso && x.statut === 'a_venir').sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const bannerSport = (view === 'competitions' ? nextComp?.sport : undefined) || mainSportOf(trainings) || nextComp?.sport || 'musculation';

  useEffect(() => {
    if (params.openSlots === '1') router.push('/slots' as any);
  }, [params.openSlots]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (params.tab) setView(initialView(params.tab));
  }, [params.tab]);

  const loadRest = useCallback(async () => {
    try {
      const r = await getRestDays();
      setRestDays(new Set((r ?? []).map((x) => x.date)));
    } catch {
      // jours de repos facultatifs
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRest();
    }, [loadRest]),
  );

  const changed = useCallback(() => {
    loadRest();
    reload();
  }, [loadRest, reload]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (await healthConnect.isAvailable()) await healthConnect.syncAll();
    } catch (e) {
      logger.warn('[Planning] Synchronisation santé impossible', e);
    }
    await Promise.all([reload(), loadRest()]);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} />}
      >
        <View style={{ height: 170 + insets.top, backgroundColor: c.indigoTint, overflow: 'hidden' }}>
          <Glyph kind="sakura" size={170} color="rgba(255,255,255,0.55)" style={{ position: 'absolute', left: 90, top: insets.top + 4 }} />
          <Image source={sportArt(bannerSport, gender, 1)} style={{ position: 'absolute', right: -6, bottom: -36, width: 140, height: 186 }} resizeMode="contain" />
          <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
            <BackButton />
            <RoundIcon name="repeat" label="Gérer tes créneaux réguliers" onPress={() => router.push('/slots' as any)} />
          </View>
          <View style={{ position: 'absolute', left: 22, bottom: 18, maxWidth: '56%' }}>
            <Ink size={30} weight="black" tight accessibilityRole="header">Planning</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2}>Ta semaine, ton mois, tes échéances</Ink>
          </View>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 14 }}>
          <Segments
            items={[{ key: 'semaine', label: 'Semaine' }, { key: 'mois', label: 'Mois' }, { key: 'competitions', label: 'Compét.' }, { key: 'clubs', label: 'Clubs' }]}
            value={view}
            onChange={setView}
          />
          {view === 'semaine' ? <PlanWeek plan={plan} trainings={trainings} competitions={competitions} restDays={restDays} stampedTrainings={records.stampedTrainings} onChanged={changed} /> : null}
          {view === 'mois' ? <PlanMonth plan={plan} trainings={trainings} competitions={competitions} restDays={restDays} stampedTrainings={records.stampedTrainings} onChanged={changed} /> : null}
          {view === 'competitions' ? <PlanEvents competitions={competitions} /> : null}
          {view === 'clubs' ? <PlanClubs trainings={trainings} onChanged={changed} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
