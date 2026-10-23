/**
 * Historique du sommeil : toutes tes nuits par mois, appui pour le detail, appui long pour supprimer.
 */
import React, { useCallback, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSleepEntries, getSleepGoal } from '@/lib/sleepService';
import type { SleepEntry } from '@/lib/sleepService';
import { logger } from '@/lib/security/logger';
import { BigButton, Card, Enter, P, SectionTitle, Stat, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { NightRow, dayLabel, hm, monthLabel } from '@/components/yoroi/v2/accueil/sleepKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export default function HistoriqueSommeil() {
  const router = useRouter();
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [goal, setGoal] = useState(480);

  const load = useCallback(async () => {
    try {
      const [e, g] = await Promise.all([getSleepEntries(), getSleepGoal()]);
      setEntries([...(e ?? [])].sort((a, b) => b.date.localeCompare(a.date)));
      setGoal(g || 480);
    } catch (err) {
      logger.error('Chargement de l’historique du sommeil impossible', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = (entry: SleepEntry) => {
    tap('medium');
    appAlert(traduire('Supprimer cette nuit ?'), `${dayLabel(entry.date, true)}, ${hm(entry.duration)}`, [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          try {
            const all = await getSleepEntries();
            const updated = all.filter((e) => e.id !== entry.id);
            await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(updated));
            setEntries([...updated].sort((a, b) => b.date.localeCompare(a.date)));
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
          } catch (err) {
            logger.error('Suppression de la nuit impossible', err);
          }
        },
      },
    ]);
  };

  const groups: { month: string; items: SleepEntry[] }[] = [];
  for (const e of entries) {
    const m = monthLabel(e.date);
    const g = groups[groups.length - 1];
    if (g && g.month === m) g.items.push(e);
    else groups.push({ month: m, items: [e] });
  }
  const total = entries.length;
  const avg = total > 0 ? Math.round(entries.reduce((s, e) => s + e.duration, 0) / total) : 0;
  const rated = entries.filter((e) => e.quality > 0);
  const avgQ = rated.length > 0 ? rated.reduce((s, e) => s + e.quality, 0) / rated.length : 0;

  return (
    <DetailScreen title={traduire("Tes nuits")} subtitle={total > 0 ? traduirePluriel(total, total > 1, "{0} nuit notée", "{0} nuits notées", total) : undefined} footer={<BigButton label={traduire("Noter ma nuit")} icon="moon" tone="ink" onPress={() => router.push('/sleep-input' as any)} />}>
      {total === 0 ? (
        <Enter i={0}>
          <EmptyState title={traduire("Aucune nuit pour l’instant")} text={traduire("Note ta première nuit, ton historique se construira ici.")} />
        </Enter>
      ) : (
        <>
          <Enter i={0}>
            <Card style={{ flexDirection: 'row', gap: 10 }}>
              <Stat value={hm(avg)} label="en moyenne" color={P.indigo} />
              <Stat value={avgQ > 0 ? avgQ.toFixed(1).replace('.', DECIMAL) : traduire('pas noté')} unit={avgQ > 0 ? traduire('sur 5') : undefined} label={traduire("qualité moyenne")} />
              <Stat value={String(entries.filter((e) => e.duration >= goal).length)} label={traduire("nuits à l’objectif")} color={P.mossText} />
            </Card>
          </Enter>
          <Ink size={13} weight="medium" color={P.muted} style={{ paddingHorizontal: 4 }}>
            {traduire("Appuie longuement sur une nuit pour la supprimer.")}</Ink>
          {groups.map((g, gi) => (
            <Enter key={g.month} i={gi + 1} style={{ gap: 8 }}>
              <SectionTitle>{g.month}</SectionTitle>
              <Card style={{ paddingVertical: 6 }}>
                {g.items.map((e, i) => (
                  <View key={e.id}>
                    <NightRow entry={e} goal={goal} first={i === 0} onPress={() => router.push({ pathname: '/sleep-detail', params: { date: e.date } } as any)} onLongPress={() => remove(e)} />
                  </View>
                ))}
              </Card>
            </Enter>
          ))}
        </>
      )}
    </DetailScreen>
  );
}
