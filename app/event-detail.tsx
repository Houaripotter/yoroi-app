/**
 * Detail d'un evenement sportif du calendrier (refonte v2) : date, lieu, federation,
 * inscription en ligne et ajout a tes rendez-vous. Parametres : ceux de l'evenement.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, ImageBackground, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, P, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { InfoRow, RoundAction, XIcon } from '@/components/yoroi/v2/competition/ui';
import { CountdownPlates } from '@/components/yoroi/v2/competition/CountdownPlates';
import { safeOpenURL } from '@/lib/security/validators';
import type { SportEvent } from '@/lib/eventsService';
import { capitalize, daysUntil, longDate, parseLocalDate } from '@/lib/v2/competition/dates';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const SAVED_EVENTS_KEY = 'my_saved_events';
const SCENE = require('@/assets/avatars/app/themes/theme_matcha.webp');

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  combat: { label: traduire('Combat'), color: P.accent },
  endurance: { label: 'Endurance', color: P.mossText },
  force: { label: 'Force', color: P.goldDark },
  nature: { label: traduire('Nature'), color: '#8C6A3F' },
  autre: { label: 'Autre', color: P.ink2 },
};

export default function EventDetailScreen() {
  const { gender } = useAthlete();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    date_start: string;
    city?: string;
    country?: string;
    full_address?: string;
    category?: string;
    sport_tag?: string;
    registration_link?: string;
    federation?: string;
    image_logo_url?: string;
  }>();
  const [isSaved, setIsSaved] = useState(false);
  const meta = CATEGORY_META[params.category || 'autre'] ?? CATEGORY_META.autre;
  const eventDate = params.date_start ? parseLocalDate(params.date_start) : null;
  const days = eventDate && !isNaN(eventDate.getTime()) ? daysUntil(eventDate) : null;

  const checkSaved = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      if (!raw) {
        setIsSaved(false);
        return;
      }
      const saved: SportEvent[] = JSON.parse(raw);
      setIsSaved(saved.some((e) => e.id === params.id));
    } catch (e) {
      logger.warn('[EventDetail] check saved error', e);
    }
  }, [params.id]);

  useEffect(() => {
    checkSaved();
  }, [checkSaved]);

  const toggleSaved = async () => {
    try {
      tap('medium');
      const raw = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      const saved: SportEvent[] = raw ? JSON.parse(raw) : [];
      let next: SportEvent[];
      if (isSaved) {
        next = saved.filter((e) => e.id !== params.id);
        setIsSaved(false);
      } else {
        const ev: SportEvent = {
          id: params.id,
          title: params.title,
          date_start: params.date_start,
          location: { city: params.city || '', country: params.country || '', full_address: params.full_address || '' } as any,
          category: (params.category as any) || 'autre',
          sport_tag: (params.sport_tag as any) || 'jjb',
          registration_link: params.registration_link || '',
          federation: params.federation || null,
          image_logo_url: params.image_logo_url || null,
        } as SportEvent;
        next = [...saved, ev];
        setIsSaved(true);
        tap('success');
      }
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(next));
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    } catch (e) {
      logger.error('[EventDetail] toggle saved error', e);
      appAlert(traduire('Enregistrement impossible'), traduire("Cet événement n'a pas pu être ajouté."));
    }
  };

  const openRegistration = async () => {
    if (!params.registration_link) return;
    const ok = await safeOpenURL(params.registration_link);
    if (!ok) appAlert(traduire('Lien invalide'), traduire("Ce lien d'inscription n'a pas pu être ouvert."));
  };

  const place = [params.city, params.country].filter(Boolean).join(', ');
  const rows: { icon: 'calendar' | 'flag' | 'shield'; label: string; value: string }[] = [];
  if (eventDate && !isNaN(eventDate.getTime())) rows.push({ icon: 'calendar', label: 'Date', value: capitalize(longDate(eventDate)) });
  if (place) rows.push({ icon: 'flag', label: traduire('Lieu'), value: place });
  if (params.full_address) rows.push({ icon: 'flag', label: traduire('Adresse'), value: params.full_address });
  if (params.federation) rows.push({ icon: 'shield', label: traduire('Fédération'), value: params.federation });

  return (
    <DetailScreen
      title={traduire("Événement")}
      subtitle={traduire(meta.label)}
      right={<RoundAction icon="bookmark" label={isSaved ? traduire('Retirer de mes rendez-vous') : traduire('Ajouter à mes rendez-vous')} tint={isSaved ? P.accent : P.ink} onPress={toggleSaved} />}
      footer={params.registration_link ? <BigButton label={traduire("S'inscrire en ligne")} icon="share" onPress={openRegistration} /> : undefined}
    >
      <Enter i={0}>
        <ImageBackground source={SCENE} style={{ borderRadius: 28, overflow: 'hidden', minHeight: 230 }} resizeMode="cover">
          {params.image_logo_url ? (
            <View style={{ position: 'absolute', right: 16, top: 16, width: 104, height: 104, borderRadius: 26, backgroundColor: blancA(0.92), alignItems: 'center', justifyContent: 'center', padding: 10 }}>
              <Image source={{ uri: params.image_logo_url }} style={{ width: 84, height: 84 }} resizeMode="contain" />
            </View>
          ) : (
            <Image source={sportArt(params.sport_tag || 'jjb', gender, 2)} style={{ position: 'absolute', right: -20, bottom: -40, width: 190, height: 270 }} resizeMode="contain" />
          )}
          <View style={{ padding: 14, flex: 1, justifyContent: 'flex-end' }}>
            <Glass style={{ alignSelf: 'flex-start', maxWidth: params.image_logo_url ? '100%' : '56%', padding: 16, gap: 6 }}>
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, height: 26, borderRadius: 9, backgroundColor: meta.color, justifyContent: 'center' }}>
                <Ink size={12} weight="extraBold" color={P.white}>
                  {days !== null && days >= 0 ? (days === 0 ? traduire("Aujourd'hui") : traduirePluriel(days, days > 1, "Dans {0} jour", "Dans {0} jours", days)) : meta.label}
                </Ink>
              </View>
              <Ink size={22} weight="black" tight>
                {traduire(params.title)}
              </Ink>
            </Glass>
          </View>
        </ImageBackground>
      </Enter>

      {rows.length ? (
        <Enter i={1}>
          <Card style={{ paddingVertical: 4 }}>
            {rows.map((r, i) => (
              <InfoRow key={r.label} icon={r.icon} label={traduire(r.label)} value={r.value} color={meta.color} last={i === rows.length - 1} />
            ))}
          </Card>
        </Enter>
      ) : null}

      {days !== null && days > 0 && days <= 60 ? (
        <Enter i={2}>
          <Card style={{ gap: 10 }}>
            <Ink size={15} weight="black" tight>
              {traduire("Une plaque par jour jusqu'au départ")}</Ink>
            <CountdownPlates daysLeft={days} max={35} plate={22} />
          </Card>
        </Enter>
      ) : null}

      <Enter i={3}>
        <Press onPress={toggleSaved} accessibilityRole="button" accessibilityLabel={isSaved ? traduire('Retirer de mes rendez-vous') : traduire('Ajouter à mes rendez-vous')}>
          <View style={{ minHeight: 60, borderRadius: 20, backgroundColor: isSaved ? P.accentSoft : P.white, borderWidth: 1, borderColor: isSaved ? P.accent : P.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <XIcon name="bookmark" size={20} color={isSaved ? P.accent : P.ink} />
            <Ink size={16} weight="extraBold" color={isSaved ? P.accent : P.ink}>
              {isSaved ? traduire('Dans mes rendez-vous') : traduire('Ajouter à mes rendez-vous')}
            </Ink>
          </View>
        </Press>
      </Enter>
    </DetailScreen>
  );
}
