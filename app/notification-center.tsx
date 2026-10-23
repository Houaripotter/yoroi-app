/**
 * Centre des notifications (refonte v2, vague 11) : tout ce que YOROI t'a envoye,
 * groupe par jour, les non lues en avant. Appui : ouvre l'ecran concerne.
 * Appui long (ou bouton) : partager ou supprimer. Historique : lib/notificationHistoryService.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { selectionAsync, impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EspaceScreen, Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import { clearAll, deleteNotification, getNotifications, markAllAsRead, markAsRead } from '@/lib/notificationHistoryService';
import type { NotificationHistoryItem } from '@/lib/notificationHistoryService';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { cheminDirect } from '@/lib/v2/nav/direct';
import { cibleDeNotification, deposerCible } from '@/lib/v2/notifications/toucher';

const NB = ' ';
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

type Kind = 'accent' | 'indigo' | 'gold' | 'moss' | 'ink' | 'record';

function look(type: string): { icon: IconName; kind: Kind; label: string } {
  switch (type) {
    case 'training':
    case 'workout_completed':
    case 'workout_complete':
    case 'workouts_complete':
      return { icon: 'dumbbell', kind: 'accent', label: 'Entraînement' };
    case 'hydration':
      return { icon: 'drop', kind: 'indigo', label: 'Hydratation' };
    case 'streak':
      return { icon: 'flame', kind: 'accent', label: 'Série' };
    case 'sleep':
      return { icon: 'bed', kind: 'indigo', label: 'Sommeil' };
    case 'achievement':
      return { icon: 'trophy', kind: 'record', label: 'Récompense' };
    case 'briefing':
      return { icon: 'sun', kind: 'gold', label: 'Briefing' };
    case 'smart_check':
    case 'smart_missed':
    case 'smart_rest':
    case 'smart_frequency':
    case 'smart_test':
      return { icon: 'brain', kind: 'moss', label: 'Rappel malin' };
    case 'social_card_weekly':
    case 'social_card_monthly':
      return { icon: 'share', kind: 'indigo', label: 'Carte à partager' };
    case 'weekly_recap':
      return { icon: 'calendar', kind: 'gold', label: 'Bilan' };
    case 'weighing':
      return { icon: 'scale', kind: 'ink', label: 'Pesée' };
    case 'citation':
      return { icon: 'quote', kind: 'gold', label: 'Citation' };
    default:
      return { icon: 'bell', kind: 'ink', label: 'YOROI' };
  }
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start - day) / 86400000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  const base = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const txt = d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function clock(ts: number): string {
  const d = new Date(ts);
  const m = d.getMinutes();
  return m === 0 ? `${d.getHours()}${NB}h` : `${d.getHours()}${NB}h${NB}${String(m).padStart(2, '0')}`;
}

function routeFor(item: NotificationHistoryItem): string | null {
  // Rappel de competition : le detail de cette competition (id en chiffres seulement), sinon la liste
  if (item.data?.screen === 'competition-detail') {
    const id = String(item.data?.id ?? '');
    return /^\d{1,12}$/.test(id) ? `/competition-detail?id=${id}` : '/competitions';
  }
  // navigation directe : une ancienne route relais (badges, stats...) vise tout de suite son ecran
  if (item.data?.screen) return item.data.screen === 'home' ? '/(tabs)' : cheminDirect(`/${item.data.screen}`);
  switch (item.type) {
    case 'training':
    case 'workout_completed':
      return '/training-journal';
    case 'streak':
    case 'achievement':
      return '/dojo/sceaux';
    case 'sleep':
      return '/sleep';
    case 'hydration':
      return '/hydration';
    case 'weighing':
      return '/body-composition';
    case 'citation':
      return '/citations';
    case 'weekly_recap':
      return '/(tabs)/progres';
    case 'briefing':
    case 'smart_check':
    case 'smart_missed':
    case 'smart_rest':
    case 'smart_frequency':
      return '/(tabs)';
    default:
      return null;
  }
}

export default function CentreNotifications() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const tone = (k: Kind): { fg: string; bg: string } => {
    switch (k) {
      case 'accent':
        return { fg: c.accent, bg: c.accentTint };
      case 'indigo':
        return { fg: c.indigo, bg: c.indigoTint };
      case 'gold':
        return { fg: c.goldDeep, bg: c.goldTint };
      case 'moss':
        return { fg: c.successText, bg: c.successTint };
      case 'record':
        return { fg: c.record, bg: c.dangerTint };
      default:
        return { fg: c.ink, bg: c.fillSoft };
    }
  };

  const load = useCallback(async () => {
    const data = await getNotifications().catch(() => []);
    setItems((data ?? []).slice().sort((a, b) => b.timestamp - a.timestamp));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const open = async (item: NotificationHistoryItem) => {
    selectionAsync().catch(() => {});
    if (!item.read) {
      await markAsRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      DeviceEventEmitter.emit('YOROI_NOTIF_READ');
    }
    // 18 octobre 2026 : une fin de séance ouvre la carte de CETTE séance (ou tes séances si elle n'existe plus)
    const workoutId = String(item.data?.workoutId ?? '');
    if (/^workouts?_complete(d)?$/.test(item.type) || /^workouts?_complete(d)?$/.test(String(item.data?.type ?? ''))) {
      const cible = cibleDeNotification(item.data, /^[a-zA-Z0-9_-]{1,64}$/.test(workoutId) ? { workoutId } : {});
      if (cible) {
        deposerCible(cible, '');
        return;
      }
    }
    const r = routeFor(item);
    if (r) router.push(r as any);
  };

  const actions = (item: NotificationHistoryItem) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    // Pas de partage du texte d'une notification : il peut contenir une valeur de sante
    appAlert(item.title, item.body, [
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteNotification(item.id);
          setItems((prev) => prev.filter((n) => n.id !== item.id));
          DeviceEventEmitter.emit('YOROI_NOTIF_READ');
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const readAll = async () => {
    selectionAsync().catch(() => {});
    await markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    DeviceEventEmitter.emit('YOROI_NOTIF_READ');
  };

  const wipe = () => {
    appAlert('Tout effacer ?', 'Toutes les notifications reçues seront supprimées. Tes rappels restent réglés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: async () => {
          await clearAll();
          setItems([]);
          DeviceEventEmitter.emit('YOROI_NOTIF_READ');
        },
      },
    ]);
  };

  const unread = items.filter((n) => !n.read).length;
  const shown = filter === 'unread' ? items.filter((n) => !n.read) : items;
  const groups = useMemo(() => {
    const out: { key: string; label: string; list: NotificationHistoryItem[] }[] = [];
    shown.forEach((n) => {
      const k = dayKey(n.timestamp);
      const last = out[out.length - 1];
      if (last && last.key === k) last.list.push(n);
      else out.push({ key: k, label: dayLabel(n.timestamp), list: [n] });
    });
    return out;
  }, [shown]);

  const subtitle = !loaded ? undefined : items.length === 0 ? 'Ce que YOROI t’envoie arrive ici.' : unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''} sur ${items.length}` : `Tout est lu, ${items.length} au total`;

  return (
    <EspaceScreen
      title="Notifications reçues"
      subtitle={subtitle}
      gap={14}
    >
      {loaded && items.length === 0 ? (
        <Animated.View entering={ENTREE} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 22, gap: 12, alignItems: 'center' }}>
          <Hanko size={78} color={c.accent} tampon="frein_motivation" />
          <Ink size={20} weight="black" tight style={{ textAlign: 'center' }}>Rien de neuf pour l’instant</Ink>
          <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center' }}>Tes rappels de pesée et d’entraînement, ton bilan du dimanche et tes cartes à partager arriveront ici.</Ink>
          <Pressable
            onPress={() => router.push('/notifications' as any)}
            accessibilityRole="button"
            style={({ pressed }) => ({ alignSelf: 'stretch', marginTop: 4, minHeight: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
          >
            <Ink size={16} weight="extraBold" color={c.onAccent}>Régler mes rappels</Ink>
          </Pressable>
        </Animated.View>
      ) : null}

      {items.length > 0 ? (
        <Animated.View entering={ENTREE} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 16, padding: 3, flex: 1 }}>
            {([['all', 'Toutes'], ['unread', unread ? `Non lues (${unread})` : 'Non lues']] as ['all' | 'unread', string][]).map(([id, label]) => {
              const on = filter === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    selectionAsync().catch(() => {});
                    setFilter(id);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={{ flex: 1, minHeight: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent' }}
                >
                  <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary} numberOfLines={1}>{label}</Ink>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={wipe}
            accessibilityRole="button"
            accessibilityLabel="Tout effacer"
            style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 16, backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' })}
          >
            <Icon name="trash" size={19} color={c.textSecondary} />
          </Pressable>
        </Animated.View>
      ) : null}

      {unread > 0 ? (
        <Pressable
          onPress={readAll}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: pressed ? c.accentTint : 'transparent', borderWidth: 1, borderColor: c.accentTint })}
        >
          <Icon name="check" size={17} color={c.accent} stroke={2.6} />
          <Ink size={14} weight="extraBold" color={c.accent}>Tout marquer comme lu</Ink>
        </Pressable>
      ) : null}

      {items.length > 0 && filter === 'unread' && unread === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
          <Icon name="check" size={28} color={c.successText} stroke={2.6} />
          <Ink size={16} weight="extraBold">Tout est lu</Ink>
        </View>
      ) : null}

      {groups.map((g, gi) => (
        <Animated.View key={g.key} layout={LinearTransition} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 4, marginTop: 4 }}>
            <Ink size={17} weight="black" tight style={{ flex: 1 }}>{g.label}</Ink>
            <Ink size={12} weight="bold" color={c.textMuted}>{`${g.list.length} notification${g.list.length > 1 ? 's' : ''}`}</Ink>
          </View>
          <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
            {g.list.map((n, i) => {
              const l = look(n.type);
              const t = tone(l.kind);
              return (
                <Animated.View key={n.id} exiting={FadeOut.duration(180)} layout={LinearTransition}>
                  <Pressable
                    onPress={() => open(n)}
                    onLongPress={() => actions(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n.read ? '' : 'Non lue. '}${l.label}, ${clock(n.timestamp)}. ${n.title}. ${n.body}`}
                    accessibilityHint="Appui long pour partager ou supprimer"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      gap: 12,
                      paddingVertical: 14,
                      paddingLeft: 14,
                      paddingRight: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: c.divider,
                      backgroundColor: pressed ? c.fillSoft : n.read ? c.surface : '#FBFAF7',
                    })}
                  >
                    <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={l.icon} size={20} color={t.fg} />
                      {!n.read ? <View style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, borderWidth: 2, borderColor: c.surface }} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ink size={12} weight="extraBold" color={t.fg} style={{ flex: 1 }} numberOfLines={1}>{l.label}</Ink>
                        <Ink size={12} weight="bold" color={c.textMuted}>{clock(n.timestamp)}</Ink>
                      </View>
                      <Ink size={15} weight={n.read ? 'bold' : 'black'} numberOfLines={2}>{n.title}</Ink>
                      <Ink size={13} color={c.textSecondary} numberOfLines={3}>{n.body}</Ink>
                    </View>
                    <Pressable
                      onPress={() => actions(n)}
                      accessibilityRole="button"
                      accessibilityLabel={`Options pour ${n.title}`}
                      hitSlop={4}
                      style={({ pressed }) => ({ width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
                    >
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        {[0, 1, 2].map((k) => (
                          <View key={k} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.textMuted }} />
                        ))}
                      </View>
                    </Pressable>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      ))}
    </EspaceScreen>
  );
}
