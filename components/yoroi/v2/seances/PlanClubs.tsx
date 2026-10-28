/**
 * Planning, vue clubs : tes clubs avec leurs seances du mois, tes objectifs par sport,
 * tes seances en exterieur. Ajouter, modifier, supprimer un club.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { deleteClub, getClubs } from '@/lib/database';
import type { Club, Training } from '@/lib/database';
import { getClubLogoSource, getSportName } from '@/lib/sports';
import { getAllGoalsProgress } from '@/lib/trainingGoalsService';
import type { GoalProgress } from '@/lib/trainingGoalsService';
import { logger } from '@/lib/security/logger';
import { dateOf } from '@/lib/v2/seances/sessionData';
import { ClubFormModal } from './ClubForm';
import { Icon } from './Icon';
import { BigButton, EmptyState, Glass, SectionTitle, tap } from './ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function ClubLogo({ club, size = 52 }: { club: Club; size?: number }) {
  const src = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: src ? P.white : club.color || '#1D2029', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {src ? <Image source={src} style={{ width: size, height: size }} resizeMode="cover" /> : <Ink size={size * 0.42} weight="black" color="#FFFFFF">{(club.name?.trim()[0] ?? '?').toUpperCase()}</Ink>}
    </View>
  );
}

export function PlanClubs({ trainings, onChanged }: { trainings: Training[]; onChanged: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [editing, setEditing] = useState<Club | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setClubs((await getClubs()) ?? []);
    } catch (e) {
      logger.error('Lecture des clubs impossible', e);
    }
    try {
      setGoals((await getAllGoalsProgress()) ?? []);
    } catch {
      // objectifs facultatifs
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, trainings]);

  const now = new Date();
  const inMonth = (t: Training) => {
    const d = dateOf(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const outdoor = trainings.filter((t) => t.is_outdoor);

  const remove = (club: Club) => {
    appAlert(traduire('Supprimer ce club ?'), traduire("{0} sera retiré. Tes séances restent dans ton historique.", club.name), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClub(club.id!);
            await load();
            onChanged();
          } catch (e) {
            logger.error('Suppression du club impossible', e);
            appAlert(traduire('Oups'), traduire('Le club n’a pas pu être supprimé.'));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={traduire("Tes clubs")} action={traduire("Ajouter")} onAction={() => { setEditing(null); setFormOpen(true); }} />
      {clubs.length === 0 ? (
        <EmptyState title={traduire("Ajoute ton club")} text={traduire("Ta salle, ton dojo, ta box : tes séances s’y rattachent et tu vois ta régularité club par club.")} action={traduire("Ajouter un club")} onAction={() => { setEditing(null); setFormOpen(true); }} />
      ) : (
        clubs.map((club) => {
          const all = trainings.filter((t) => t.club_id === club.id);
          const month = all.filter(inMonth).length;
          return (
            <Glass key={club.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
              <ClubLogo club={club} />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={16} weight="extraBold" numberOfLines={2}>{traduire(club.name)}</Ink>
                <Ink size={12} color={c.textSecondary}>{traduire("{0}, {1} ce mois, {2} au total", getSportName(club.sport), month, all.length)}</Ink>
              </View>
              <Pressable onPress={() => { tap(); setEditing(club); setFormOpen(true); }} accessibilityRole="button" accessibilityLabel={traduire("Modifier {0}", club.name)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="edit" size={18} color={c.ink} />
              </Pressable>
              <Pressable onPress={() => { tap(); remove(club); }} accessibilityRole="button" accessibilityLabel={traduire("Supprimer {0}", club.name)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.dangerTint, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trash" size={18} color={c.danger} />
              </Pressable>
            </Glass>
          );
        })
      )}

      {outdoor.length ? (
        <Glass style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mountain" size={24} color={c.successText} />
          </View>
          <View style={{ flex: 1 }}>
            <Ink size={16} weight="extraBold">{traduire("En extérieur")}</Ink>
            <Ink size={12} color={c.textSecondary}>{traduire("{0} ce mois, {1} au total", outdoor.filter(inMonth).length, outdoor.length)}</Ink>
          </View>
        </Glass>
      ) : null}

      <SectionTitle title={traduire("Tes objectifs")} action={traduire("Régler")} onAction={() => router.push('/training-goals?tab=training' as any)} />
      {goals.length === 0 ? (
        <Glass onPress={() => router.push('/training-goals?tab=training' as any)} label={traduire("Fixer un objectif")} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="target" size={24} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Ink size={15} weight="extraBold">{traduire("Un objectif par sport")}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("Par exemple trois séances de JJB par semaine.")}</Ink>
          </View>
        </Glass>
      ) : (
        goals.map((g) => (
          <Glass key={g.goal.sport_id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Ink size={15} weight="extraBold">{g.sport?.name ?? getSportName(g.goal.sport_id)}</Ink>
              <Ink size={14} weight="black">{traduire("{0} sur {1}", g.weekCount, g.weekTarget)}</Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: Math.max(1, g.weekTarget) }, (_, i) => (
                <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < g.weekCount ? c.detail : c.fillSubtle }} />
              ))}
            </View>
            <Ink size={12} color={c.textMuted}>{g.weekCount >= g.weekTarget ? traduire('Objectif de la semaine tenu') : traduirePluriel(g.sessionsNeeded, g.sessionsNeeded > 1, "Encore {0} séance cette semaine", "Encore {0} séances cette semaine", g.sessionsNeeded)}</Ink>
          </Glass>
        ))
      )}

      {clubs.length > 0 ? <BigButton label={traduire("Ajouter un club")} tone="soft" icon="plus" onPress={() => { setEditing(null); setFormOpen(true); }} /> : null}

      <ClubFormModal visible={formOpen} editingClub={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={() => { load(); onChanged(); }} />
    </View>
  );
}
