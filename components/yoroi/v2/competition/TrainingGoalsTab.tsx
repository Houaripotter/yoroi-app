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

const CATEGORY_LABELS: Record<string, string> = {
  combat_grappling: 'Combat au sol',
  combat_striking: 'Combat debout',
  fitness: 'Fitness',
  cardio: 'Cardio',
  collectif: 'Sports collectifs',
  raquettes: 'Raquettes',
  danse: 'Danse',
  glisse: 'Glisse',
  nature: 'Nature',
  aquatique: 'Aquatique',
  precision: 'Précision',
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
      appAlert('Ajout impossible', "L'objectif n'a pas pu être ajouté. Réessaie.");
    }
  };

  const remove = (sportId: string, name: string) => {
    appAlert('Supprimer cet objectif', `Supprimer l'objectif pour ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
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
                  Cette semaine
                </Ink>
                <Ink size={46} weight="black" tight>
                  {String(stats.totalWeeklyCompleted)}
                  <Ink size={16} weight="bold" color={P.muted}>
                    {` sur ${stats.totalWeeklyTarget} séances`}
                  </Ink>
                </Ink>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Ink size={24} weight="black" tight color={stats.overallWeekPercent >= 100 ? P.accent : P.ink}>
                  {`${Math.round(stats.overallWeekPercent)} %`}
                </Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {`${stats.goalsOnTrack} dans les temps`}
                </Ink>
              </View>
            </View>
            <InkBar value={stats.overallWeekPercent / 100} color={stats.overallWeekPercent >= 100 ? P.accent : P.ink} height={12} />
          </Glass>
        </Enter>
      ) : null}

      {progress.length > 0 ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>Par sport</SectionTitle>
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
                      {p.sport.name}
                    </Ink>
                    <Ink size={12} weight="bold" color={reached ? P.accent : p.isOnTrack ? P.ink2 : P.goldDark}>
                      {reached ? 'Objectif de la semaine atteint' : p.isOnTrack ? `Encore ${p.sessionsNeeded} séance${p.sessionsNeeded > 1 ? 's' : ''} cette semaine` : `En retard de ${p.sessionsNeeded} séance${p.sessionsNeeded > 1 ? 's' : ''}`}
                    </Ink>
                  </View>
                  <Press onPress={() => remove(p.goal.sport_id, p.sport.name)} accessibilityRole="button" accessibilityLabel={`Supprimer l'objectif ${p.sport.name}`}>
                    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="trash" size={17} color={P.muted} />
                    </View>
                  </Press>
                </View>
                {/* vague 45 : une pastille par seance prevue cette semaine, cochee en couleur quand elle est faite */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${p.weekCount} séances sur ${p.weekTarget} cette semaine`}>
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
                    {`${p.weekCount} sur ${p.weekTarget}`}
                    <Ink size={12} weight="bold" color={P.muted}>{' cette semaine'}</Ink>
                  </Ink>
                </View>
                {/* vague 45 : a 375 points, le reglage passe sous les totaux au lieu de deborder de la carte */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', rowGap: 8, columnGap: 8 }}>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Ink size={12} weight="bold" color={P.muted}>
                      {`Ce mois : ${p.monthCount} sur ${p.monthTarget}`}
                    </Ink>
                    <Ink size={12} weight="bold" color={P.muted}>
                      {`Cette année : ${p.yearCount} sur ${p.yearTarget}`}
                    </Ink>
                  </View>
                  <Stepper value={String(p.goal.weekly_target)} suffix="par semaine" label={`séances de ${p.sport.name}`} onMinus={() => update(p.goal.sport_id, p.goal.weekly_target - 1)} onPlus={() => update(p.goal.sport_id, p.goal.weekly_target + 1)} />
                </View>
              </Card>
            );
          })}
        </Enter>
      ) : (
        <EmptyState title="Aucun rythme fixé" text="Choisis un sport et le nombre de séances par semaine. Chaque séance faite se coche dans ta semaine." action="Ajouter un sport" onAction={() => setOpen(true)} />
      )}

      {progress.length > 0 && available.length > 0 ? <BigButton label="Ajouter un sport" icon="plus" onPress={() => setOpen(true)} /> : null}

      <Sheet visible={open} onClose={close} title={picked ? picked.name : 'Choisis un sport'} scroll>
        {picked ? (
          <View style={{ gap: 16, alignItems: 'center' }}>
            <Image source={sportArt(picked.id, gender, 2)} style={{ width: 150, height: 200 }} resizeMode="contain" />
            <Stepper value={String(weekly)} suffix="séances par semaine" label="séances par semaine" onMinus={() => setWeekly(Math.max(1, weekly - 1))} onPlus={() => setWeekly(Math.min(14, weekly + 1))} />
            <Ink size={13} weight="bold" color={P.ink2}>
              {`Soit environ ${weekly * 4} par mois et ${weekly * 52} par an.`}
            </Ink>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <View style={{ flex: 1 }}>
                <BigButton label="Retour" tone="light" onPress={() => setPicked(null)} />
              </View>
              <View style={{ flex: 1.4 }}>
                <BigButton label="Ajouter" icon="check" onPress={add} />
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
                    <Chip key={s.id} label={s.name} onPress={() => setPicked(s)} />
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
