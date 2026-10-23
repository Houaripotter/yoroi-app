/**
 * Citations : la citation du jour, ton style de citations et les rappels motivants.
 */
import React, { useEffect, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import {
  CITATION_STYLE_OPTIONS,
  forceNewCitation,
  getCitationNotifSettings,
  getCitationStyle,
  getDailyQuote,
  setCitationNotifSettings,
  setCitationStyle,
} from '@/lib/citations';
import type { CitationNotifSettings, CitationStyle } from '@/lib/citations';
import { requestNotificationPermissions, sendImmediateCitationNotification, updateCitationNotifications } from '@/lib/citationNotificationService';
import { logger } from '@/lib/security/logger';
import { Card, Enter, Icon, P, Pill, Press, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Toggle } from '@/components/yoroi/v2/accueil/sleepKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { partagerTexte } from '@/lib/v2/partage/texte';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const FREQ_TEXT = ['', traduire('Une citation par jour.'), traduire('Deux citations par jour.'), traduire('Trois citations par jour.'), traduire('Quatre citations par jour.'), traduire('Cinq citations par jour.')];

export default function Citations() {
  const [quote, setQuote] = useState<string | null>(null);
  const [style, setStyle] = useState<CitationStyle>('all');
  const [notif, setNotif] = useState<CitationNotifSettings>({ enabled: false, frequency: 1, time: '08:00' });

  useEffect(() => {
    (async () => {
      try {
        const [q, s, n] = await Promise.all([getDailyQuote(), getCitationStyle(), getCitationNotifSettings()]);
        setQuote(q?.text ?? null);
        setStyle(s);
        setNotif(n);
      } catch (err) {
        logger.error('Chargement des citations impossible', err);
      }
    })();
  }, []);

  const another = async () => {
    tap();
    const q = await forceNewCitation();
    setQuote(q.text);
  };

  const share = () => {
    if (!quote) return;
    tap();
    partagerTexte({ source: 'citation', message: `« ${quote} »` });
  };

  const changeStyle = async (s: CitationStyle) => {
    try {
      await setCitationStyle(s);
      setStyle(s);
      tap('success');
      const q = await getDailyQuote();
      setQuote(q?.text ?? null);
    } catch (err) {
      logger.error('Style de citation non enregistré', err);
    }
  };

  const toggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        const ok = await requestNotificationPermissions();
        if (!ok) {
          appAlert(traduire('Autorisation nécessaire'), traduire('Active les notifications pour YOROI dans les réglages de ton téléphone.'));
          return;
        }
      }
      const next = { ...notif, enabled };
      await setCitationNotifSettings(next);
      setNotif(next);
      const done = await updateCitationNotifications(next);
      if (enabled && done) {
        tap('success');
        appAlert(traduire('Rappels activés'), traduirePluriel(next.frequency, next.frequency > 1, "Tu recevras {0} citation par jour, prévues pour les 7 prochains jours.", "Tu recevras {0} citations par jour, prévues pour les 7 prochains jours.", next.frequency), [
          { text: 'OK' },
          { text: traduire('Essayer maintenant'), onPress: () => sendImmediateCitationNotification() },
        ]);
      }
    } catch (err) {
      logger.error('Rappels de citations non modifiés', err);
    }
  };

  const changeFreq = async (frequency: number) => {
    try {
      const next = { ...notif, frequency };
      await setCitationNotifSettings(next);
      setNotif(next);
      if (next.enabled) await updateCitationNotifications(next);
    } catch (err) {
      logger.error('Fréquence des citations non enregistrée', err);
    }
  };

  return (
    <DetailScreen title={traduire("Citations")} subtitle={traduire("Un mot pour te lancer chaque jour")}>
      <Enter i={0}>
        <View style={{ borderRadius: 26, backgroundColor: P.ink, padding: 24, gap: 18, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -30, bottom: -30 }}>
            <Glyph kind="sakura" size={170} color={paletteSombre() ? '#D6D4CC' : '#262A35'} />
          </View>
          <Ink size={13} weight="bold" color={paletteSombre() ? '#B0282E' : '#E9A6A0'}>
            {traduire("Ta citation du jour")}</Ink>
          <Ink size={23} weight="black" color={P.white} style={{ lineHeight: 31 }}>
            {quote ? `« ${quote} »` : traduire('Ta citation arrive.')}
          </Ink>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Press onPress={another} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("Une autre citation")}>
              <View style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: P.accent, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="refresh" size={17} color={P.white} />
                <Ink size={14} weight="extraBold" color={P.white}>
                  {traduire("Une autre")}</Ink>
              </View>
            </Press>
            <Press onPress={share} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("Partager la citation")}>
              <View style={{ height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: '#30343F', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="share" size={17} color={P.white} />
                <Ink size={14} weight="extraBold" color={P.white}>
                  {traduire("Partager")}</Ink>
              </View>
            </Press>
          </View>
        </View>
      </Enter>

      <Enter i={1} style={{ gap: 10 }}>
        <SectionTitle>{traduire("Ton style")}</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CITATION_STYLE_OPTIONS.map((o) => {
            const on = o.id === style;
            return (
              <View key={o.id} style={{ width: '48.6%' }}>
                <Press onPress={() => changeStyle(o.id)} haptic="medium" accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={traduire(o.label)}>
                  <View style={{ minHeight: 96, borderRadius: 20, padding: 14, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2, gap: 4, overflow: 'hidden' }}>
                    <Glyph kind="sakura" size={20} color={on ? P.goldLight : P.goldDark} />
                    <Ink size={16} weight="black" tight color={on ? P.white : P.ink}>
                      {o.label === 'Perseverance' ? traduire('Persévérance') : o.label}
                    </Ink>
                    <Ink size={12} weight="bold" color={on ? (paletteSombre() ? '#4A4E5A' : '#B9BBC4') : P.ink2} numberOfLines={2}>
                      {o.description.replace('Depassement', 'Dépassement').replace('Melange aleatoire', 'Mélange aléatoire').replace('Mindset de champion', 'Mental de champion')}
                    </Ink>
                  </View>
                </Press>
              </View>
            );
          })}
        </View>
      </Enter>

      <Enter i={2} style={{ gap: 10 }}>
        <SectionTitle>{traduire("Tes rappels")}</SectionTitle>
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold">
                {traduire("Recevoir des citations")}</Ink>
              <Ink size={13} weight="medium" color={P.ink2}>
                {traduire("Une notification pour te motiver.")}</Ink>
            </View>
            <Toggle value={notif.enabled} onChange={toggle} label={traduire("Recevoir des citations")} />
          </View>
          {notif.enabled ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((f) => (
                  <View key={f} style={{ flex: 1 }}>
                    <Pill label={`${f}`} active={notif.frequency === f} accent={P.accent} onPress={() => changeFreq(f)} />
                  </View>
                ))}
              </View>
              <Ink size={13} weight="bold" color={P.ink2}>
                {FREQ_TEXT[notif.frequency] ?? ''}
              </Ink>
              <Press onPress={() => sendImmediateCitationNotification()} accessibilityRole="button">
                <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="bell" size={17} color={P.accent} />
                  <Ink size={14} weight="bold" color={P.accent}>
                    {traduire("Essayer maintenant")}</Ink>
                </View>
              </Press>
            </View>
          ) : null}
        </Card>
      </Enter>
    </DetailScreen>
  );
}
