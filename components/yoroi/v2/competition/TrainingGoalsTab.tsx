/**
 * Onglet des objectifs d'entrainement par sport : seances par semaine, pastilles de la semaine (vague 45),
 * progression du mois et de l'annee, ajout d'un sport, reglage du rythme.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, Icon, P, Press, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { Pastille } from '@/components/yoroi/v2/dojo/Kozane';
import { EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Chip, ChipScroll, InkBar, Label, Stepper } from './ui';
import { SPORTS } from '@/lib/sports';
import type { Sport } from '@/lib/sports';
import { deleteGoal, getAllGoals, getAllGoalsProgress, getGlobalGoalStats, setGoal } from '@/lib/trainingGoalsService';
import type { GlobalGoalStats, GoalProgress, TrainingGoal } from '@/lib/trainingGoalsService';
import { sportArt } from '@/lib/v2/seances/illustrations';
import type { Gender } from '@/lib/v2/competition/athlete';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const CATEGORY_LABELS: Record<string, string> = {
  combat_grappling: traduire('Combat au sol'),
  combat_striking: traduire('Combat debout'),
  fitness: 'Fitness',
  cardio: 'Cardio',
  collectif: 'Sports collectifs',
  raquettes: 'Raquettes',
  danse: 'Danse',
  glisse: 'Glisse',
  nature: traduire('Nature'),
  aquatique: 'Aquatique',
  precision: traduire('Précision'),
  autre: 'Autres',
};

export function TrainingGoalsTab({ gender }: { gender: Gender }) {
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [stats, setStats] = useState<GlobalGoalStats | null>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Sport | null>(null);
  const [weekly, setWeekly] = useState(2);

  const load = useCallback(async () => {
    try {
      const [g, p, s] = await Promise.all([getAllGoals(), getAllGoalsProgress(), getGlobalGoalStats()]);
      setGoals(g);
      setProgress(p);
      setStats(s);
    } catch (error) {
      logger.error('Erreur chargement objectifs entraînement:', error);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const available = useMemo(() => SPORTS.filter((s) => !goals.some((g) => g.sport_id === s.id)), [goals]);
  const byCategory = useMemo(() => {
    const acc: Record<string, Sport[]> = {};
    available.forEach((s) => {
      (acc[s.category] = acc[s.category] || []).push(s);
    });
    return acc;
  }, [available]);

  const close = () => {
    setOpen(false);
    setPicked(null);
    setWeekly(2);
  };

  const add = async () => {
    if (!picked) return;
    try {
      await setGoal(picked.id, weekly);
      tap('success');
      close();
      await load();
    } catch {
      appAlert(traduire('Ajout impossible'), traduire("L'objectif n'a pas pu être ajouté. Réessaie."));
    }
  };

  const remove = (sportId: string, name: string) => {
    appAlert(traduire('Supprimer cet objectif'), traduire("Supprimer l'objectif pour {0} ?", name), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(sportId);
          await load();
        },
      },
    ]);
  };

  const update = async (sportId: string, target: number) => {
    if (target < 1 || target > 14) return;
    tap();
    await setGoal(sportId, target);
    await load();
  };

  return (
    <View style={{ gap: 14 }}>
      {stats && stats.activeGoals > 0 ? (
        <Enter i={0}>
          <Glass style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Ink size={12} weight="bold" color={P.muted}>
                  {traduire("Cette semaine")}</Ink>
                <Ink size={46} weight="black" tight>
                  {String(stats.totalWeeklyCompleted)}
                  <Ink size={16} weight="bold" color={P.muted}>
                    {traduire(" sur {0} séances", stats.totalWeeklyTarget)}
                  </Ink>
                </Ink>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Ink size={24} weight="black" tight color={stats.overallWeekPercent >= 100 ? P.accent : P.ink}>
                  {`${Math.round(stats.overallWeekPercent)} %`}
                </Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {traduire("{0} dans les temps", stats.goalsOnTrack)}
                </Ink>
              </View>
            </View>
            <InkBar value={stats.overallWeekPercent / 100} color={stats.overallWeekPercent >= 100 ? P.accent : P.ink} height={12} />
          </Glass>
        </Enter>
      ) : null}

      {progress.length > 0 ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>{traduire("Par sport")}</SectionTitle>
          {progress.map((p) => {
            const reached = p.weekPercent >= 100;
            const plates = Math.max(p.weekTarget, p.weekCount);
            return (
              <Card key={p.goal.sport_id} style={{ gap: 12, padding: 14, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: P.paper, overflow: 'hidden', alignItems: 'center' }}>
                    <Image source={sportArt(p.sport.id, gender, 1)} style={{ width: 56, height: 76 }} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Ink size={17} weight="black" tight>
                      {traduire(p.sport.name)}
                    </Ink>
                    <Ink size={12} weight="bold" color={reached ? P.accent : p.isOnTrack ? P.ink2 : P.goldDark}>
                      {reached ? traduire('Objectif de la semaine atteint') : p.isOnTrack ? traduirePluriel(p.sessionsNeeded, p.sessionsNeeded > 1, "Encore {0} séance cette semaine", "Encore {0} séances cette semaine", p.sessionsNeeded) : traduirePluriel(p.sessionsNeeded, p.sessionsNeeded > 1, "En retard de {0} séance", "En retard de {0} séances", p.sessionsNeeded)}
                    </Ink>
                  </View>
                  <Press onPress={() => remove(p.goal.sport_id, p.sport.name)} accessibilityRole="button" accessibilityLabel={traduire("Supprimer l'objectif {0}", p.sport.name)}>
                    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="trash" size={17} color={P.muted} />
                    </View>
                  </Press>
                </View>
                {/* vague 45 : une pastille par seance prevue cette semaine, cochee en couleur quand elle est faite */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={traduire("{0} séances sur {1} cette semaine", p.weekCount, p.weekTarget)}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
                    {Array.from({ length: Math.min(plates, 14) }).map((_, i) => {
                      const faite = i < p.weekCount;
                      return (
                        // vague 45 : la pastille a faire porte l'icone du sport (components/yoroi/v2/dojo/Kozane.tsx)
                        <Pastille key={i} etat={faite ? 'fait' : 'vide'} taille={28} sport={p.sport.id} />
                      );
                    })}
                  </View>
                  <Ink size={14} weight="extraBold" color={reached ? P.accent : P.ink} style={{ marginLeft: 'auto' }}>
                    {traduire("{0} sur {1}", p.weekCount, p.weekTarget)}
                    <Ink size={12} weight="bold" color={P.muted}>{traduire(' cette semaine')}</Ink>
                  </Ink>
                </View>
                {/* vague 45 : a 375 points, le reglage passe sous les totaux au lieu de deborder de la carte */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', rowGap: 8, columnGap: 8 }}>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Ink size={12} weight="bold" color={P.muted}>
                      {traduire("Ce mois : {0} sur {1}", p.monthCount, p.monthTarget)}
                    </Ink>
                    <Ink size={12} weight="bold" color={P.muted}>
                      {traduire("Cette année : {0} sur {1}", p.yearCount, p.yearTarget)}
                    </Ink>
                  </View>
                  <Stepper value={String(p.goal.weekly_target)} suffix="par semaine" label={traduire("séances de {0}", p.sport.name)} onMinus={() => update(p.goal.sport_id, p.goal.weekly_target - 1)} onPlus={() => update(p.goal.sport_id, p.goal.weekly_target + 1)} />
                </View>
              </Card>
            );
          })}
        </Enter>
      ) : (
        <EmptyState title={traduire("Aucun rythme fixé")} text={traduire("Choisis un sport et le nombre de séances par semaine. Chaque séance faite se coche dans ta semaine.")} action={traduire("Ajouter un sport")} onAction={() => setOpen(true)} />
      )}

      {progress.length > 0 && available.length > 0 ? <BigButton label={traduire("Ajouter un sport")} icon="plus" onPress={() => setOpen(true)} /> : null}

      <Sheet visible={open} onClose={close} title={picked ? picked.name : traduire('Choisis un sport')} scroll>
        {picked ? (
          <View style={{ gap: 16, alignItems: 'center' }}>
            <Image source={sportArt(picked.id, gender, 2)} style={{ width: 150, height: 200 }} resizeMode="contain" />
            <Stepper value={String(weekly)} suffix={traduire("séances par semaine")} label={traduire("séances par semaine")} onMinus={() => setWeekly(Math.max(1, weekly - 1))} onPlus={() => setWeekly(Math.min(14, weekly + 1))} />
            <Ink size={13} weight="bold" color={P.ink2}>
              {traduire("Soit environ {0} par mois et {1} par an.", weekly * 4, weekly * 52)}
            </Ink>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <View style={{ flex: 1 }}>
                <BigButton label={traduire("Retour")} tone="light" onPress={() => setPicked(null)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <BigButton label={traduire("Ajouter")} icon="check" onPress={add} />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {Object.entries(byCategory).map(([cat, list]) => (
              <View key={cat} style={{ gap: 8 }}>
                <Label>{CATEGORY_LABELS[cat] ?? cat}</Label>
                <ChipScroll>
                  {list.map((s) => (
                    <Chip key={s.id} label={traduire(s.name)} onPress={() => setPicked(s)} />
                  ))}
                </ChipScroll>
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </View>
  );
}
