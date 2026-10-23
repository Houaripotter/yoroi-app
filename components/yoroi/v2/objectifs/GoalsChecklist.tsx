/**
 * Objectifs a cocher (repris de l'ancien ecran /goals, vague 14) : une cible claire,
 * cochee le jour ou elle est atteinte. Meme stockage (@yoroi_user_goals).
 * Un objectif atteint emet l'evenement de donnees (le moteur recalcule en coulisse).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, Icon, P, Press, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Field } from '@/components/yoroi/v2/competition/ui';
import { GoalPlate } from '@/components/yoroi/v2/competition/GoalPlate';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { ProgressBar } from '@/components/yoroi/v2/espace/ProgressBar';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

const GOALS_STORAGE_KEY = '@yoroi_user_goals';

type Goal = { id: string; title: string; description?: string; target?: string; deadline?: string; completed: boolean; createdAt: string; completedAt?: string };

const SUGGESTIONS = [traduire('3 séances par semaine'), traduire('Passer sous les 80 kg'), 'Courir 10 km', traduire('Ma première compétition')];

/** Liste d'objectifs a cocher, sans en-tete : s'affiche dans l'onglet « À cocher » de Tes objectifs. */
export function GoalsChecklist() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setGoals(parsed);
        }
      } catch (error) {
        logger.error('Erreur chargement objectifs:', error);
      }
    })();
  }, []);

  const persist = async (next: Goal[]) => {
    setGoals(next);
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      logger.error('Erreur sauvegarde objectifs:', error);
    }
  };

  const active = goals.filter((g) => !g.completed);
  const done = goals.filter((g) => g.completed);

  const openAdd = () => {
    setOpen(true);
  };

  const add = () => {
    if (!title.trim()) return;
    tap('medium');
    persist([{ id: Date.now().toString(), title: title.trim(), target: target.trim() || undefined, completed: false, createdAt: new Date().toISOString() }, ...goals]);
    setTitle('');
    setTarget('');
    setOpen(false);
  };

  const toggle = (id: string) => {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    const completing = !g.completed;
    tap(completing ? 'success' : 'light');
    persist(goals.map((x) => (x.id === id ? { ...x, completed: completing, completedAt: completing ? new Date().toISOString() : undefined } : x)));
    if (completing) DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  };

  const remove = (g: Goal) => {
    appAlert(traduire('Supprimer cet objectif'), traduire("« {0} » sera supprimé.", g.title), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: () => {
          tap('medium');
          persist(goals.filter((x) => x.id !== g.id));
        },
      },
    ]);
  };

  const row = (g: Goal, i: number) => (
    <Card key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, opacity: g.completed ? 0.94 : 1 }}>
      <Press onPress={() => toggle(g.id)} accessibilityRole="checkbox" accessibilityState={{ checked: g.completed }} accessibilityLabel={g.completed ? traduire("{0}, atteint. Annuler", g.title) : `${g.title}. Marquer comme atteint`}>
        <GoalPlate done={g.completed} size={40} />
      </Press>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={16} weight="black" tight color={g.completed ? P.ink2 : P.ink}>
          {g.title}
        </Ink>
        {g.target ? (
          <Ink size={13} weight="bold" color={P.ink2}>
            {traduire("Cible : {0}", g.target)}
          </Ink>
        ) : null}
        <Ink size={12} weight="bold" color={g.completed ? P.accent : P.muted}>
          {g.completed ? traduire('Objectif atteint') : traduire('Touche la case quand c’est fait')}
        </Ink>
      </View>
      <Press onPress={() => remove(g)} accessibilityRole="button" accessibilityLabel={traduire("Supprimer l'objectif {0}", g.title)} hitSlop={8}>
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="trash" size={18} color={P.muted} />
        </View>
      </Press>
    </Card>
  );

  return (
    <View style={{ gap: 14 }}>
      {goals.length > 0 ? (
        <Enter i={0}>
          <Glass style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Ink size={44} weight="black" tight>
                  {String(done.length)}
                  <Ink size={16} weight="bold" color={P.muted}>
                    {traduire(" sur {0}", goals.length)}
                  </Ink>
                </Ink>
                <Ink size={13} weight="bold" color={P.ink2}>
                  {done.length > 1 ? traduire('objectifs atteints') : traduire('objectif atteint')}
                </Ink>
              </View>
            </View>
            <ProgressBar progress={goals.length ? done.length / goals.length : 0} accessibilityLabel={traduire("{0} objectifs atteints sur {1}", done.length, goals.length)} />
          </Glass>
        </Enter>
      ) : (
        <Enter i={0}>
          <EmptyState title={traduire("Fixe ton premier objectif")} text={traduire("Un poids, une distance, une compétition, un rythme. Choisis une cible précise et coche-la le jour où tu l’atteins.")} action={traduire("Ajouter un objectif")} onAction={openAdd} />
        </Enter>
      )}

      {active.length > 0 ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>{`En cours, ${active.length}`}</SectionTitle>
          {active.map(row)}
        </Enter>
      ) : null}

      {done.length > 0 ? (
        <Enter i={2} style={{ gap: 10 }}>
          <SectionTitle>{`Atteints, ${done.length}`}</SectionTitle>
          {done.map(row)}
        </Enter>
      ) : null}

      {goals.length > 0 ? <BigButton label={traduire("Ajouter un objectif")} icon="plus" tone="red" onPress={openAdd} /> : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={traduire("Nouvel objectif")}>
        <Field value={title} onChangeText={setTitle} placeholder={traduire("Mon objectif")} icon="flag" autoFocus maxLength={80} />
        <Field value={target} onChangeText={setTarget} placeholder={traduire("Cible, ex : 80 kg, 10 km, 3 fois par semaine")} icon="star" maxLength={60} onSubmit={add} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTIONS.map((s) => (
            <Press key={s} onPress={() => setTitle(s)} accessibilityRole="button" accessibilityLabel={s}>
              <View style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 14, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, justifyContent: 'center' }}>
                <Ink size={13} weight="bold" color={P.ink2}>
                  {s}
                </Ink>
              </View>
            </Press>
          ))}
        </View>
        <BigButton label={traduire("Ajouter l'objectif")} icon="check" onPress={add} disabled={!title.trim()} />
      </Sheet>
    </View>
  );
}
