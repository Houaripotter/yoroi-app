/**
 * Succes de sparring : les 36 succes du module Combat (sans XP, ils restent a part
 * de la Voie de l'Armure). Grille de tampons gagnes ou a gagner.
 */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import { BackHeader, Bar, DOJO } from '@/components/yoroi/v2/dojo/parts';
import { getTrainings } from '@/lib/database';
import { computeStats, listAchievements } from '@/lib/combatAchievements';
import type { Achievement, CombatStats } from '@/lib/combatAchievements';
import { P } from '@/components/yoroi/livePalette';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type Item = Achievement & { unlocked: boolean };

const CATEGORIES: { id: Achievement['category']; label: string; color: string }[] = [
  { id: 'milestone', label: 'Jalons', color: DOJO.indigo },
  { id: 'technique', label: 'Techniques', color: DOJO.mossText },
  { id: 'mental', label: traduire('Mental et analyse'), color: '#A8832F' },
  { id: 'legendary', label: traduire('Légendaires'), color: DOJO.ink },
];

export default function CombatAchievementsScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<CombatStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const trainings = await getTrainings(3650);
      const s = computeStats(trainings);
      setStats(s);
      setItems(await listAchievements(s));
    } catch {
      // on garde la derniere liste affichee
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const unlocked = items.filter((i) => i.unlocked).length;
  const total = items.length;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={DOJO.accent} />}
      >
        <BackHeader title={traduire("Succès de sparring")} subtitle={traduire("Tes rounds, tes finitions, tes partenaires")} />

        <View style={{ backgroundColor: DOJO.inkCard, borderRadius: 22, padding: 18, gap: 12, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <Ink size={52} weight="black" tight color={P.paper}>{unlocked}</Ink>
            <Ink size={16} weight="bold" color={paletteSombre() ? '#4A4E5A' : '#B9BBC4'} style={{ marginBottom: 8 }}>{traduire("sur {0} succès", total || 36)}</Ink>
          </View>
          <Bar progress={total ? unlocked / total : 0} color={DOJO.goldLight} track="#33363F" />
          {stats ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { v: stats.totalRounds, l: 'rounds' },
                { v: stats.totalSessions, l: traduire('séances') },
                { v: stats.uniquePartners, l: 'partenaires' },
              ].map((x) => (
                <View key={x.l} style={{ flex: 1 }}>
                  <Ink size={20} weight="black" color={P.white}>{x.v}</Ink>
                  <Ink size={12} color={paletteSombre() ? '#4A4E5A' : '#B9BBC4'}>{x.l}</Ink>
                </View>
              ))}
            </View>
          ) : null}
          {loaded && stats && stats.totalRounds === 0 ? (
            <Ink size={13} color={DOJO.goldLight}>{traduire("Note tes rounds de sparring dans une séance de combat : chaque round compte ici.")}</Ink>
          ) : null}
        </View>

        {CATEGORIES.map((cat) => {
          const list = items.filter((i) => i.category === cat.id);
          if (!list.length) return null;
          return (
            <View key={cat.id} style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat.color }} />
                <Ink size={17} weight="black" style={{ flex: 1 }}>{cat.label}</Ink>
                <Ink size={13} weight="bold" color={c.textMuted}>{traduire("{0} sur {1}", list.filter((i) => i.unlocked).length, list.length)}</Ink>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
                {list.map((a, i) => (
                  <View
                    key={a.id}
                    accessible
                    accessibilityLabel={`${a.title}, ${a.unlocked ? traduire('débloqué') : traduire('à débloquer')}. ${a.description}`}
                    style={{ width: '48.5%', gap: 8, padding: 10, borderRadius: 16, backgroundColor: a.unlocked ? '#FBFAF7' : 'transparent', borderWidth: 1, borderColor: a.unlocked ? c.border : c.divider, borderStyle: a.unlocked ? 'solid' : 'dashed' }}
                  >
                    <Hanko color={cat.color} size={38} earned={a.unlocked} tampon={i % 2 ? 'record_combat' : 'victoire'} />
                    <View style={{ gap: 2 }}>
                      <Ink size={13} weight="extraBold" color={a.unlocked ? c.ink : c.textMuted}>{a.title}</Ink>
                      <Ink size={12} color={c.textMuted}>{a.description}</Ink>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
