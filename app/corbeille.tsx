/**
 * Corbeille (28 octobre 2026, audit « ne jamais perdre de données »). Trois parties : Séances, Pesées,
 * Mensurations. Ce qui a été supprimé ces 30 derniers jours, entier (Santé, cœur, tracé, séries, composition),
 * avec « Restaurer ». Ouverte depuis le menu de l'onglet Séances. Rien ne s'efface d'ici : le nettoyage après
 * 30 jours reste celui de la base.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glass } from '@/components/yoroi/v2/seances/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import type { TrashItem } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { longDay } from '@/lib/v2/seance/format';
import { corpsDansLaCorbeille, restaurerCorpsSupprime, restaurerSeanceSupprimee, seancesDansLaCorbeille } from '@/lib/v2/seances/corbeille';
import type { ElementCorbeilleCorps } from '@/lib/v2/seances/corbeille';
import { formatKg } from '@/lib/v2/weightStats';

type Partie = 'seances' | 'pesees' | 'mensurations';
const PARTIES: { key: Partie; label: string }[] = [
  { key: 'seances', label: traduire('Séances') },
  { key: 'pesees', label: traduire('Pesées') },
  { key: 'mensurations', label: traduire('Mensurations') },
];
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

export default function Corbeille() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [corps, setCorps] = useState<ElementCorbeilleCorps[]>([]);
  const [partie, setPartie] = useState<Partie>('seances');
  const [enCours, setEnCours] = useState<string | null>(null);

  const lire = useCallback(() => {
    seancesDansLaCorbeille()
      .then(setItems)
      .catch((e) => {
        logger.warn('Corbeille illisible', e);
        setItems([]);
      });
    corpsDansLaCorbeille()
      .then(setCorps)
      .catch((e) => {
        logger.warn('Corbeille des pesées illisible', e);
        setCorps([]);
      });
  }, []);
  useFocusEffect(lire);

  const restaurer = async (cle: string, faire: () => Promise<unknown>) => {
    if (enCours !== null) return;
    setEnCours(cle);
    try {
      await faire();
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    } catch (e) {
      logger.error('Restauration impossible', e);
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être remise. Réessaie.'));
    } finally {
      setEnCours(null);
      lire();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 12 }}>
        <EnTete titre={traduire('Corbeille')} sousTitre={traduire('Ce que tu as supprimé, gardé 30 jours')} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PARTIES.map((x) => {
            const n = x.key === 'seances' ? items?.length ?? 0 : corps.filter((y) => y.kind === (x.key === 'pesees' ? 'weights' : 'measurements')).length;
            const on = partie === x.key;
            return (
              <Pressable key={x.key} onPress={() => setPartie(x.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : c.fillSubtle }}>
                <Ink size={13} weight="extraBold" color={on ? c.onPrimary : c.ink} numberOfLines={1}>{n ? `${x.label} ${n}` : x.label}</Ink>
              </Pressable>
            );
          })}
        </View>
        {partie !== 'seances' ? (() => {
          const liste = corps.filter((y) => y.kind === (partie === 'pesees' ? 'weights' : 'measurements'));
          if (!liste.length) {
            return (
              <Glass style={{ gap: 6 }}>
                <Ink size={17} weight="black">{traduire('Rien ici')}</Ink>
                <Ink size={14} color={c.textSecondary}>{traduire('Ce que tu supprimes reste ici 30 jours, tu peux le remettre d’un toucher.')}</Ink>
              </Glass>
            );
          }
          return liste.map((t) => {
            const cle = `c${t.id}`;
            return (
              <Glass key={cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={16} weight="black" numberOfLines={1}>{t.kind === 'weights' ? (t.poids ? traduire('{0} kilos', formatKg(t.poids)) : traduire('Pesée')) : traduire('Mensurations')}</Ink>
                  {t.date ? <Ink size={13} color={c.textSecondary} numberOfLines={1}>{longDay(t.date)}</Ink> : null}
                  {t.deleted_at ? <Ink size={12} color={c.textMuted}>{traduire('Supprimée le {0}', longDay(t.deleted_at))}</Ink> : null}
                </View>
                <BoutonRestaurer occupe={enCours === cle} grise={enCours !== null && enCours !== cle} onPress={() => restaurer(cle, () => restaurerCorpsSupprime(t.id))} />
              </Glass>
            );
          });
        })() : null}
        {partie === 'seances' && items === null ? <ActivityIndicator style={{ marginTop: 40 }} /> : null}
        {partie === 'seances' && items && items.length === 0 ? (
          <Glass style={{ gap: 6 }}>
            <Ink size={17} weight="black">{traduire('La corbeille est vide')}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire('Une séance supprimée reste ici 30 jours, tu peux la remettre d’un toucher.')}</Ink>
          </Glass>
        ) : null}
        {(partie === 'seances' ? items ?? [] : []).map((t) => (
          <Glass key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={16} weight="black" numberOfLines={1}>{traduire(getSportName(t.sport))}</Ink>
              <Ink size={13} color={c.textSecondary} numberOfLines={1}>
                {longDay(t.date)}{t.start_time ? `, ${t.start_time.slice(0, 5)}` : ''}{t.duration_minutes ? `, ${t.duration_minutes} min` : ''}
              </Ink>
              {t.deleted_at ? <Ink size={12} color={c.textMuted}>{traduire('Supprimée le {0}', longDay(t.deleted_at))}</Ink> : null}
            </View>
            <BoutonRestaurer occupe={enCours === `s${t.id}`} grise={enCours !== null && enCours !== `s${t.id}`} onPress={() => restaurer(`s${t.id}`, () => restaurerSeanceSupprimee(t.id))} />
          </Glass>
        ))}
      </ScrollView>
    </View>
  );
}

function BoutonRestaurer({ occupe, grise, onPress }: { occupe: boolean; grise: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={occupe || grise}
      accessibilityRole="button"
      accessibilityLabel={traduire('Restaurer')}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary, opacity: grise ? 0.5 : 1 })}
    >
      {occupe ? <ActivityIndicator color={c.onPrimary} /> : <Ink size={14} weight="extraBold" color={c.onPrimary}>{traduire('Restaurer')}</Ink>}
    </Pressable>
  );
}
