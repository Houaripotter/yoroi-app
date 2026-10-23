/**
 * Mon plan de jeu v2 : la checklist de ta prochaine seance (objectifs et
 * defenses tires de tes debriefs), la fiabilite de tes plans, ton playbook,
 * ce qu'il faut defendre et le journal de tes plans round par round.
 * Parametre facultatif : partnerName pour le plan contre un partenaire.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { buildGamePlan, CHECKED_KEY } from '@/lib/v2/combat/gamePlan';
import { daysAgo, plural, RESULT_LABEL, shortDate } from '@/lib/v2/combat/rounds';
import { BigButton, Card, CIcon, D, EmptyState, Enter, Hanko, IconBtn, InkBar, N, P, Press, RankRow, ResultPlate, Section, tap, V } from '@/components/yoroi/v2/combat/ui';
import { ProgressBar } from '@/components/yoroi/v2/espace/ProgressBar';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export default function GamePlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ partnerName?: string }>();
  const { trainings, loaded, reload } = useCombatData({ partners: false });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHECKED_KEY)
      .then((raw) => {
        if (!raw) return;
        const arr: unknown = JSON.parse(raw);
        if (Array.isArray(arr)) setChecked(new Set(arr.filter((x): x is string => typeof x === 'string')));
      })
      .catch(() => {});
  }, []);

  const data = useMemo(() => buildGamePlan(trainings, params.partnerName), [trainings, params.partnerName]);

  const toggle = useCallback((id: string) => {
    tap('medium');
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(CHECKED_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, []);
  const reset = () => {
    tap();
    setChecked(new Set());
    AsyncStorage.removeItem(CHECKED_KEY).catch(() => {});
  };

  const doneCount = data.checklist.filter((c) => checked.has(c.id)).length;
  const pending = data.checklist.length - doneCount;
  const last = data.entries[0]?.date;
  const since = daysAgo(last);
  const hint = !last ? traduire('À préparer') : since === 0 ? traduire('Ta séance du jour est notée') : since === 1 ? traduire('Dernière séance hier') : traduire("Dernière séance il y a {0} jours", since);
  const empty = data.checklist.length === 0 && data.playbook.length === 0 && data.dangers.length === 0 && data.journal.length === 0;

  return (
    <PremiumGate source="plan_de_match" featureTitle={traduire("Mon plan de jeu")} perks={[traduire('Ton plan tiré de tes débriefs de rounds'), traduire('Ce qui marche chez toi, à reproduire'), traduire('Ce qui te pose problème, à défendre')]}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={P.accent}
              onRefresh={async () => {
                setRefreshing(true);
                await reload();
                setRefreshing(false);
              }}
            />
          }
        >
          <EnTete
            titre={params.partnerName ? `Plan contre ${params.partnerName}` : traduire('Mon plan de jeu')}
            sousTitre={traduire("Tiré de tes débriefs de rounds")}
            onRetour={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
            style={{ marginHorizontal: -22, marginTop: -8 }}
          />

          {loaded && empty ? (
            <EmptyState title={traduire("Ton plan de jeu est vide")} text={traduire("Enregistre une séance de sparring et remplis l'analyse des rounds (plan, ce qui a marché, contré par, à améliorer). Ton plan se construit tout seul.")} action={traduire("Nouvelle séance de combat")} onAction={() => router.push('/seance/combat' as any)} />
          ) : null}

          {!empty ? (
            <Enter i={0}>
              <View style={{ borderRadius: 28, padding: 20, backgroundColor: P.ink, gap: 12, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', right: -30, bottom: -30 }} pointerEvents="none">
                  <Glyph kind="sakura" size={170} color={(paletteSombre() ? 'rgba(29,32,41,0.06)' : 'rgba(255,255,255,0.06)')} />
                </View>
                <Ink size={13} weight="extraBold" color={P.goldLight}>
                  {traduire("Prochaine séance")}</Ink>
                <Ink size={28} weight="black" tight color={P.white}>
                  {hint}
                </Ink>
                <Ink size={14} color={(paletteSombre() ? 'rgba(29,32,41,0.82)' : 'rgba(255,255,255,0.82)')}>
                  {pending > 0 ? traduire("{0} en attente. Coche quand c'est travaillé.", plural(pending, 'objectif')) : data.checklist.length > 0 ? traduire('Checklist complète. Ajoute de nouveaux objectifs dans tes rounds.') : traduire('Remplis tes analyses de rounds pour générer ta checklist.')}
                </Ink>
                {data.checklist.length > 0 ? (
                  <ProgressBar progress={data.checklist.filter((c) => checked.has(c.id)).length / data.checklist.length} color={P.white} track={(paletteSombre() ? 'rgba(29,32,41,0.22)' : 'rgba(255,255,255,0.22)')} accessibilityLabel={traduire("Ta checklist")} />
                ) : null}
                {data.totalPlans > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {[
                      { v: String(data.totalPlans), l: 'plans' },
                      { v: String(data.executed), l: traduire('exécutés') },
                      { v: `${data.executionRate}%`, l: traduire('réussite'), gold: true },
                    ].map((x) => (
                      <View key={x.l} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: x.gold ? 'rgba(227,196,123,0.18)' : (paletteSombre() ? 'rgba(29,32,41,0.1)' : 'rgba(255,255,255,0.1)') }}>
                        <Ink size={24} weight="black" tight color={x.gold ? P.goldLight : P.white}>
                          {x.v}
                        </Ink>
                        <Ink size={12} weight="bold" color={x.gold ? P.goldLight : (paletteSombre() ? 'rgba(29,32,41,0.75)' : 'rgba(255,255,255,0.75)')}>
                          {x.l}
                        </Ink>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </Enter>
          ) : null}

          {data.checklist.length > 0 ? (
            <>
              <Section title={traduire("À travailler")} sub={doneCount > 0 ? traduire("{0} sur {1} cochés", doneCount, data.checklist.length) : plural(data.checklist.length, 'objectif')} action={doneCount > 0 ? traduire('Tout décocher') : undefined} onAction={doneCount > 0 ? reset : undefined} />
              {data.checklist.map((item) => {
                const on = checked.has(item.id);
                const def = item.source === 'defense';
                const color = def ? N : V;
                return (
                  <Pressable key={item.id} onPress={() => toggle(item.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={traduire(item.text)}>
                    <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', opacity: on ? 0.6 : 1, borderLeftWidth: 5, borderLeftColor: on ? '#6E8C3A' : color }}>
                      <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: on ? 0 : 2, borderColor: color, backgroundColor: on ? '#6E8C3A' : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        {on ? <CIcon name="check" size={16} color={P.white} width={3} /> : null}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Ink size={16} weight="bold" style={{ textDecorationLine: on ? 'line-through' : 'none' }}>
                          {traduire(item.text)}
                        </Ink>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {def ? (
                            <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: `${N}20` }}>
                              <Ink size={11} weight="extraBold" color={N}>
                                {traduire("Défense")}</Ink>
                            </View>
                          ) : null}
                          <Ink size={12} weight="bold" color={P.muted}>
                            {[item.partner ? `contre ${item.partner}` : null, shortDate(item.date)].filter(Boolean).join(', ')}
                          </Ink>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </>
          ) : null}

          {data.reliability.length > 0 ? (
            <>
              <Section title={traduire("Fiabilité de mes plans")} sub={traduire("Réussite de chaque plan testé")} />
              <Card style={{ gap: 14 }}>
                {data.reliability.map((gp, i) => {
                  const c = gp.rate >= 60 ? '#4F6B28' : gp.rate >= 30 ? N : D;
                  return (
                    <View key={i} style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ink size={15} weight="bold" style={{ flex: 1 }} numberOfLines={2}>
                          {traduire(gp.text)}
                        </Ink>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Ink size={18} weight="black" color={c}>
                            {`${gp.rate}%`}
                          </Ink>
                          <Ink size={11} weight="bold" color={P.muted}>
                            {traduire("{0} sur {1}", gp.success, plural(gp.total, 'essai'))}
                          </Ink>
                        </View>
                      </View>
                      <InkBar value={gp.rate / 100} color={c} height={8} />
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}

          {data.playbook.length > 0 ? (
            <>
              <Section title={traduire("Mon playbook")} sub={traduire("Ce qui marche chez moi, à reproduire")} />
              <Card style={{ gap: 14 }}>
                {data.playbook.map(([t, n], i) => (
                  <RankRow key={t} index={i} label={t} value={n} max={data.playbook[0][1]} color={V} suffix={traduire(" fois")} />
                ))}
              </Card>
            </>
          ) : null}

          {data.dangers.length > 0 ? (
            <>
              <Section title={traduire("À défendre")} sub={traduire("Ce qui te pose problème en sparring")} />
              <Card style={{ gap: 14 }}>
                {data.dangers.map(([t, n], i) => (
                  <RankRow key={t} index={i} label={t} value={n} max={data.dangers[0][1]} color={D} suffix={traduire(" fois")} />
                ))}
              </Card>
            </>
          ) : null}

          {data.journal.length > 0 ? (
            <>
              <Section title={traduire("Journal de mes plans")} sub={traduire("Ta stratégie, round par round")} />
              {data.journal.map((gp) => (
                <Press key={gp.id} onPress={() => gp.trainingId && router.push(`/workout-detail?id=${gp.trainingId}` as any)} accessibilityRole="button" accessibilityLabel={traduire("Plan du {0}, ouvrir la séance", shortDate(gp.date))}>
                  <Card style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ResultPlate result={gp.result ?? null} size={22} />
                      <View style={{ flex: 1 }}>
                        <Ink size={14} weight="black">
                          {gp.partner ? traduire("Round {0} contre {1}", gp.roundNum, gp.partner) : traduire("Round {0}", gp.roundNum)}
                        </Ink>
                        <Ink size={12} weight="bold" color={P.muted}>
                          {`${shortDate(gp.date, true)}${gp.result ? `, ${RESULT_LABEL[gp.result].toLowerCase()}` : ''}`}
                        </Ink>
                      </View>
                      {gp.whatWorked ? <Hanko size={32} /> : null}
                    </View>
                    <Ink size={15}>{traduire(gp.text)}</Ink>
                    {gp.whatWorked ? (
                      <View style={{ paddingTop: 8, borderTopWidth: 1, borderTopColor: P.line2, gap: 2 }}>
                        <Ink size={12} weight="extraBold" color={V}>
                          {traduire("Ce qui a marché")}</Ink>
                        <Ink size={14} numberOfLines={2}>
                          {gp.whatWorked}
                        </Ink>
                      </View>
                    ) : null}
                  </Card>
                </Press>
              ))}
            </>
          ) : null}

          {!empty ? <BigButton label={traduire("Nouvelle séance de combat")} icon="plus" onPress={() => router.push('/seance/combat' as any)} /> : null}
        </ScrollView>
      </View>
    </PremiumGate>
  );
}
