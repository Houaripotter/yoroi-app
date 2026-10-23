/**
 * Carte de partage d'un record (vague 16), a la place de l'ancienne carte « Victoire ! ».
 * Un fond illustre japonais (Nuit, Aube, Dojo, Sakura) ou ta photo, le record en grand, l'exercice,
 * la date, ton prenom, le tampon rouge pour un record battu, une signature YOROI discrete
 * et la ligne d'adresse commune (SignatureCarte).
 * Format story (9:16) ou carre, image exportee en 1080 pixels de large.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Ink } from '@/components/yoroi/v2/Ink';
import { RecordSeal } from '@/components/yoroi/v2/ornements/RecordSeal';
import { getProfile } from '@/lib/database';
import { longDate } from '@/lib/v2/carnet/format';
import { niceName, splitPerf } from '@/lib/v2/carnet/records';
import logger from '@/lib/security/logger';
import { PARTAGE_FONDS, PARTAGE_FONDS_LISTE } from './images';
import type { PartageFond } from './images';
import { P, Press, CIcon, IconBtn, BigButton, tap } from './ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { SignatureCarte } from '@/components/yoroi/v2/partage/SignatureCarte';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from '@/lib/v2/partage/mesure';
import type { SourcePartage } from '@/lib/v2/partage/mesure';
import { traduire } from '@/lib/i18n/tr';

export type ShareRecord = {
  exerciseName: string;
  performance: string;
  date: string;
  isPR?: boolean;
  /** ancien record, pour une perf qui le bat */
  previous?: string;
};

type Fond = PartageFond | 'photo';
type Format = 'story' | 'carre';

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function Card({ data, fond, photo, format, width, name }: { data: ShareRecord; fond: Fond; photo: string | null; format: Format; width: number; name: string | null }) {
  const height = format === 'story' ? Math.round((width * 16) / 9) : width;
  const light = fond !== 'photo' && !PARTAGE_FONDS_LISTE.find((f) => f.key === fond)?.dark;
  const ink = light ? P.ink : P.white;
  const ink2 = light ? P.ink2 : 'rgba(255,255,255,0.82)';
  const perf = splitPerf(data.performance);
  const u = width / 100;
  const src = fond === 'photo' && photo ? { uri: photo } : PARTAGE_FONDS[fond === 'photo' ? 'nuit' : fond];
  const story = format === 'story';
  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: '#14161E' }}>
      <Image source={src} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" />
      <LinearGradient
        pointerEvents="none"
        colors={light ? ['rgba(242,241,236,0.7)', 'rgba(242,241,236,0)'] : ['rgba(14,16,22,0.55)', 'rgba(14,16,22,0)']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * 0.28 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={light ? ['rgba(242,241,236,0)', 'rgba(242,241,236,0.94)', 'rgba(242,241,236,0.98)'] : ['rgba(14,16,22,0)', 'rgba(14,16,22,0.78)', 'rgba(14,16,22,0.92)']}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * (story ? 0.6 : 0.72) }}
      />

      <View style={{ position: 'absolute', left: 6 * u, right: 6 * u, top: 6 * u, gap: 0.5 * u }}>
        {name ? (
          <Ink size={6.4 * u} weight="black" tight color={ink} numberOfLines={1}>
            {name}
          </Ink>
        ) : null}
        <Ink size={4.2 * u} weight="bold" color={ink2}>
          {data.isPR ? traduire('Nouveau record personnel') : traduire('Ma perf du jour')}
        </Ink>
      </View>

      <View style={{ position: 'absolute', left: 6 * u, right: 6 * u, bottom: 6 * u, gap: 1.6 * u }}>
        <Ink size={6.2 * u} weight="extraBold" color={ink} numberOfLines={2}>
          {niceName(data.exerciseName)}
        </Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 * u }}>
          <View style={{ flex: 1 }}>
            <Ink size={(story ? 17 : 15) * u} weight="black" tight color={ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {perf.main}
            </Ink>
            {perf.sub ? (
              <Ink size={4.8 * u} weight="bold" color={ink2}>
                {perf.sub}
              </Ink>
            ) : null}
          </View>
          {data.isPR ? <RecordSeal size={20 * u} filled color={P.record} glyph="laurier" rotate={-10} border={1.2 * u} /> : null}
        </View>
        <View style={{ height: 0.4 * u, backgroundColor: light ? 'rgba(29,32,41,0.18)' : 'rgba(255,255,255,0.28)', marginVertical: 1.2 * u }} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 3 * u }}>
          <View style={{ flex: 1, gap: 0.4 * u }}>
            <Ink size={4 * u} weight="bold" color={ink2} numberOfLines={1}>
              {cap(longDate(data.date))}
            </Ink>
            {data.previous ? (
              <Ink size={3.6 * u} weight="medium" color={ink2} numberOfLines={1}>
                {`Ancien record : ${data.previous}`}
              </Ink>
            ) : null}
          </View>
          <Ink size={4 * u} weight="black" color={ink2} style={{ letterSpacing: 0.9 * u }}>
            YOROI
          </Ink>
        </View>
        <SignatureCarte size={3.2 * u} color={ink2} align="right" style={{ marginTop: 0.6 * u }} />
      </View>
    </View>
  );
}

export function RecordShareSheet({ data, onClose, source = 'record_mouvement' }: { data: ShareRecord | null; onClose: () => void; source?: SourcePartage }) {
  const insets = useSafeAreaInsets();
  const { width: sw, height: sh } = useWindowDimensions();
  const shot = useRef<ViewShot>(null);
  const [fond, setFond] = useState<Fond>('nuit');
  const [format, setFormat] = useState<Format>('story');
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    getProfile()
      .then((p) => setName(p?.name?.trim().split(' ')[0] || null))
      .catch(() => setName(null));
  }, [data]);

  const maxW = sw - 44;
  const cardW = format === 'story' ? Math.min(maxW, Math.round(((sh - insets.top - insets.bottom - 330) * 9) / 16)) : Math.min(maxW, Math.round(sh * 0.42));

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        appAlert(traduire('Accès refusé'), traduire('Autorise l’accès à tes photos pour mettre la tienne en fond.'));
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
      if (!r.canceled && r.assets?.[0]) {
        setPhoto(r.assets[0].uri);
        setFond('photo');
        tap();
      }
    } catch (e) {
      logger.error('[RecordShareSheet] photo', e);
    }
  };

  const share = async () => {
    if (!shot.current?.capture) return;
    noterPartage(source);
    setBusy(true);
    try {
      const uri = await shot.current.capture();
      if (!uri) return;
      if (await isAvailableAsync()) await shareAsync(uri, { mimeType: 'image/png', dialogTitle: traduire('Partager mon record') });
      else {
        const res = await Share.share({ url: uri, message: signaturePartage() });
        if (res.action === Share.sharedAction) noterPartage(source, true);
      }
    } catch (e) {
      logger.error('[RecordShareSheet] partage', e);
      appAlert('Oups', traduire('La carte n’a pas pu être partagée.'));
    } finally {
      setBusy(false);
    }
  };

  const outH = format === 'story' ? 1920 : 1080;

  return (
    <Modal visible={!!data} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 22, gap: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: -6 }}>
            <IconBtn name="close" label={traduire("Fermer")} onPress={onClose} />
            <Ink size={22} weight="black" tight style={{ flex: 1 }} accessibilityRole="header">
              {traduire("Partage ton record")}</Ink>
          </View>

          {data ? (
            <View style={{ alignSelf: 'center', borderRadius: 18, overflow: 'hidden', shadowColor: '#1D2029', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } }}>
              <ViewShot ref={shot} options={{ format: 'png', quality: 1, width: 1080, height: outH }}>
                <Card data={data} fond={fond} photo={photo} format={format} width={cardW} name={name} />
              </ViewShot>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'center' }}>
            {(['story', 'carre'] as Format[]).map((f) => {
              const on = format === f;
              return (
                <Press key={f} onPress={() => setFormat(f)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={f === 'story' ? 'Format story' : traduire('Format carré')}>
                  <View style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                    <View style={{ width: f === 'story' ? 10 : 14, height: f === 'story' ? 16 : 14, borderRadius: 3, borderWidth: 2, borderColor: on ? P.white : P.ink2 }} />
                    <Ink size={14} weight="extraBold" color={on ? P.white : P.ink2}>{f === 'story' ? 'Story' : traduire('Carré')}</Ink>
                  </View>
                </Press>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {PARTAGE_FONDS_LISTE.map((f) => {
              const on = fond === f.key;
              return (
                <Press key={f.key} onPress={() => setFond(f.key)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Fond ${f.label}`}>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 18, overflow: 'hidden', borderWidth: on ? 3 : 1, borderColor: on ? P.accent : P.line2 }}>
                      <Image source={PARTAGE_FONDS[f.key]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <Ink size={12} weight={on ? 'extraBold' : 'bold'} color={on ? P.accent : P.ink2}>{f.label}</Ink>
                  </View>
                </Press>
              );
            })}
            <Press onPress={pickPhoto} accessibilityRole="button" accessibilityState={{ selected: fond === 'photo' }} accessibilityLabel={traduire("Ta photo en fond")}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 58, height: 58, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: P.white, borderWidth: fond === 'photo' ? 3 : 1, borderColor: fond === 'photo' ? P.accent : P.line2 }}>
                  {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <CIcon name="image" size={24} color={P.ink2} />}
                </View>
                <Ink size={12} weight={fond === 'photo' ? 'extraBold' : 'bold'} color={fond === 'photo' ? P.accent : P.ink2}>{traduire("Ta photo")}</Ink>
              </View>
            </Press>
          </View>

          <BigButton label={busy ? traduire('Préparation...') : traduire('Partager')} icon="share" disabled={busy || !data} onPress={share} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default RecordShareSheet;
