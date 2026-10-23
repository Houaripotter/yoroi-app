/**
 * Journal de synchronisation (refonte v2) : chaque sauvegarde, envoi et synchro,
 * reussie ou non, pour voir que tout fonctionne. Effacement du journal seulement.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { DeviceEventEmitter, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { RoundButton } from '@/components/yoroi/v2/accueil/kit';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SanteIcon } from '@/components/yoroi/v2/sante/SanteIcon';
import type { SanteIconName } from '@/components/yoroi/v2/sante/SanteIcon';
import { GlassBox, S } from '@/components/yoroi/v2/sante/ui';
import { getSyncHistory, clearSyncHistory, SYNC_EVENT_LABELS } from '@/lib/syncHistoryService';
import type { SyncEvent } from '@/lib/syncHistoryService';
import { formatRelative, formatSize } from '@/lib/utils/formatDate';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

const EVENT_LOOK: Record<string, { icon: SanteIconName; color: string; tint: string; label: string }> = {
  auto_backup: { icon: 'sync', color: S.indigo, tint: S.indigoSoft, label: traduire('Sauvegarde automatique') },
  manual_backup: { icon: 'save', color: S.indigo, tint: S.indigoSoft, label: traduire('Sauvegarde manuelle') },
  safety_backup: { icon: 'shield', color: S.gold, tint: S.goldSoft, label: traduire('Sauvegarde de sécurité') },
  cloud_push: { icon: 'upload', color: S.mossText, tint: S.mossSoft, label: traduire('Envoi vers le cloud') },
  cloud_pull: { icon: 'cloud', color: S.mossText, tint: S.mossSoft, label: traduire('Récupération depuis le cloud') },
  peer_sync: { icon: 'tablet', color: S.accent, tint: S.accentSoft, label: traduire('Synchro iPhone et iPad') },
  import_file: { icon: 'download', color: S.ink2, tint: '#ECE9E2', label: traduire('Import de fichier') },
  restore_safety: { icon: 'restore', color: S.gold, tint: S.goldSoft, label: traduire('Retour à un état précédent') },
  watch_sync: { icon: 'watch', color: S.accent, tint: S.accentSoft, label: traduire('Synchro de la montre') },
  export_share: { icon: 'external', color: S.ink2, tint: '#ECE9E2', label: 'Partage' },
};

function dayKey(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return traduire("Aujourd'hui");
  if (d.toDateString() === y.toDateString()) return traduire('Hier');
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function SyncHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<SyncEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setHistory(await getSyncHistory());
  }, []);

  useEffect(() => {
    refresh();
    const sub = DeviceEventEmitter.addListener('YOROI_SYNC_HISTORY_UPDATED', refresh);
    return () => sub.remove();
  }, [refresh]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleClear = () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    appAlert(traduire("Effacer le journal ?"), traduire("Seul le journal des opérations est supprimé. Tes données et tes sauvegardes restent intactes."), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          await clearSyncHistory();
          await refresh();
        },
      },
    ]);
  };

  const ok = history.filter((e) => e.success).length;
  const fails = history.length - ok;
  const groups = useMemo(() => {
    const out: { day: string; items: SyncEvent[] }[] = [];
    history.forEach((e) => {
      const k = dayKey(e.timestamp);
      const last = out[out.length - 1];
      if (last && last.day === k) last.items.push(e);
      else out.push({ day: k, items: [e] });
    });
    return out;
  }, [history]);

  return (
    <View style={{ flex: 1, backgroundColor: S.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={S.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <EnTete
          titre={traduire("Journal de synchro")}
          sousTitre={history.length === 0 ? traduire('Rien pour le moment') : traduirePluriel(history.length, history.length > 1, "{0} opération récente", "{0} opérations récentes", history.length)}
          droite={history.length > 0 ? <RoundButton icon="trash" label={traduire("Effacer le journal")} onPress={handleClear} /> : null}
          onRetour={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
          style={{ marginHorizontal: -16, marginTop: -8 }}
        />

        {history.length === 0 ? (
          <GlassBox style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
            <Ornement name="torii" size={84} />
            <Ink size={19} weight="black" tight style={{ textAlign: 'center' }}>
              {traduire("Aucune activité récente")}</Ink>
            <Ink size={14} weight="medium" color={S.ink2} style={{ textAlign: 'center' }}>
              {traduire("Dès qu'une sauvegarde ou une synchro a lieu, elle s'inscrit ici.")}</Ink>
          </GlassBox>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 14 }}>
                <Ink size={28} weight="black" tight>
                  {String(ok)}
                </Ink>
                <Ink size={12} weight="bold" color={S.ink2}>
                  {traduirePluriel(ok, ok > 1, "réussie", "réussies")}</Ink>
              </View>
              <View style={{ flex: 1, borderRadius: 22, backgroundColor: fails ? S.dangerSoft : P.white, borderWidth: 1, borderColor: fails ? S.dangerSoft : S.line2, padding: 14 }}>
                <Ink size={28} weight="black" tight color={fails ? S.danger : S.ink}>
                  {String(fails)}
                </Ink>
                <Ink size={12} weight="bold" color={S.ink2}>
                  {traduire("en échec")}</Ink>
              </View>
            </View>
            {groups.map((g) => (
              <View key={g.day} style={{ gap: 8 }}>
                <Ink size={16} weight="black" tight style={{ paddingHorizontal: 4, marginTop: 6 }}>
                  {g.day.charAt(0).toUpperCase() + g.day.slice(1)}
                </Ink>
                <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingHorizontal: 14 }}>
                  {g.items.map((event, i) => {
                    const look = EVENT_LOOK[event.type] ?? { icon: 'info' as SanteIconName, color: S.ink2, tint: '#ECE9E2', label: SYNC_EVENT_LABELS[event.type]?.label ?? event.type };
                    const details: string[] = [formatRelative(new Date(event.timestamp))];
                    if (event.device) details.push(event.device);
                    if (event.itemsCount !== undefined) details.push(traduirePluriel(event.itemsCount, event.itemsCount > 1, "{0} élément", "{0} éléments", event.itemsCount));
                    if (event.sizeBytes !== undefined) details.push(formatSize(event.sizeBytes));
                    return (
                      <View key={`${event.timestamp}_${i}`} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: S.line2 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: look.tint, alignItems: 'center', justifyContent: 'center' }}>
                          <SanteIcon name={look.icon} size={20} color={look.color} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>
                              {look.label}
                            </Ink>
                            <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: event.success ? S.mossSoft : S.dangerSoft, justifyContent: 'center' }}>
                              <Ink size={11} weight="extraBold" color={event.success ? S.mossText : S.danger}>
                                {event.success ? traduire('Réussi') : traduire('Échec')}
                              </Ink>
                            </View>
                          </View>
                          <Ink size={12} weight="bold" color={S.ink2}>
                            {details.join(', ')}
                          </Ink>
                          {event.details ? (
                            <Ink size={12} weight="medium" color={S.muted} numberOfLines={2}>
                              {event.details}
                            </Ink>
                          ) : null}
                          {event.error && !event.success ? (
                            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-start' }}>
                              <SanteIcon name="info" size={13} color={S.danger} />
                              <Ink size={12} weight="bold" color={S.danger} numberOfLines={2} style={{ flex: 1 }}>
                                {event.error}
                              </Ink>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
