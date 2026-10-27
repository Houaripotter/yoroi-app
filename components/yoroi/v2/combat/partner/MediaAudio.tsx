/**
 * Fiche partenaire v2 : galerie (photos et liens video), notes vocales de 30 s,
 * carte face a face a partager.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Image, Modal, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { createAudioPlayer, getRecordingPermissionsAsync, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { safeOpenURL } from '@/lib/security/validators';
import { logger } from '@/lib/security/logger';
import type { PartnerMedia } from '@/lib/partnerModel';
import { ARCHETYPE_META } from '@/lib/partnerModel';
import { makeId, shortDate } from '@/lib/v2/combat/rounds';
import type { AudioNote, Partner } from '@/lib/v2/combat/partners';
import { BeltBar, BigButton, Card, CIcon, D, Field, FormSheet, IconBtn, P, Press, Seal, tap, V } from '../ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { SignatureCarte } from '@/components/yoroi/v2/partage/SignatureCarte';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from '@/lib/v2/partage/mesure';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

// ─── Galerie ──────────────────────────────────────────────────────────

export function MediaGallery({ media, onChange }: { media: PartnerMedia[]; onChange: (m: PartnerMedia[]) => void }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  const addPhoto = async () => {
    try {
      const res = await launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.Images, quality: 0.85, allowsEditing: false });
      if (res.canceled || !res.assets?.[0]) return;
      onChange([{ id: makeId(), type: 'photo', uri: res.assets[0].uri, date: new Date().toISOString() }, ...media]);
      tap('medium');
    } catch (e) {
      logger.warn('Ajout de photo partenaire impossible', e);
    }
  };
  const addLink = () => {
    const u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      appAlert(traduire('Lien invalide'), traduire('Le lien doit commencer par https://'));
      return;
    }
    onChange([{ id: makeId(), type: 'video_link', uri: u, caption: caption.trim() || undefined, date: new Date().toISOString() }, ...media]);
    tap('medium');
    setLinkOpen(false);
    setUrl('');
    setCaption('');
  };
  const remove = (id: string) => {
    appAlert(traduire('Retirer ce média ?'), undefined, [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Retirer'), style: 'destructive', onPress: () => onChange(media.filter((m) => m.id !== id)) },
    ]);
  };
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Ink size={18} weight="black" tight>
            {traduire("Photos et vidéos")}</Ink>
          <Ink size={13} color={P.ink2}>
            {traduire("Ses positions, tes combats filmés")}</Ink>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconBtn icon="camera" label={traduire("Ajouter une photo")} onPress={addPhoto} />
          <IconBtn icon="video" label={traduire("Ajouter un lien vidéo")} onPress={() => setLinkOpen(true)} />
        </View>
      </View>
      {media.length === 0 ? (
        <Ink size={14} color={P.muted}>
          {traduire("Rien pour l'instant. Ajoute une photo ou le lien d'une vidéo.")}</Ink>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {media.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => (m.type === 'photo' ? setZoom(m.uri) : safeOpenURL(m.uri))}
              onLongPress={() => remove(m.id)}
              accessibilityRole="button"
              accessibilityLabel={m.type === 'photo' ? traduire('Voir la photo, appui long pour retirer') : traduire('Ouvrir la vidéo, appui long pour retirer')}
              style={{ width: 120, height: 150, borderRadius: 18, overflow: 'hidden', backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}
            >
              {m.type === 'photo' ? (
                <Image source={{ uri: m.uri }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10, gap: 8, backgroundColor: P.accentSoft }}>
                  <CIcon name="play" size={30} color={P.accent} fill={P.accent} />
                  <Ink size={12} weight="bold" numberOfLines={3} style={{ textAlign: 'center' }}>
                    {m.caption || traduire('Ouvrir la vidéo')}
                  </Ink>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
      {media.length > 0 ? (
        <Ink size={12} color={P.muted}>
          {traduire("Appui long sur un média pour le retirer")}</Ink>
      ) : null}
      <FormSheet visible={linkOpen} onClose={() => setLinkOpen(false)} title={traduire("Lien d'une vidéo")}>
        <Field value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" autoFocus placeholder="https://" />
        <Field value={caption} onChangeText={setCaption} placeholder={traduire("Description (facultatif)")} />
        <BigButton label={traduire("Ajouter")} onPress={addLink} />
      </FormSheet>
      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable onPress={() => setZoom(null)} accessibilityLabel={traduire("Fermer")} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          {zoom ? <Image source={{ uri: zoom }} style={{ width: '92%', height: '80%' }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </Card>
  );
}

// ─── Notes vocales ────────────────────────────────────────────────────

const MAX_MS = 30000;

type Player = ReturnType<typeof createAudioPlayer>;

export function AudioNotes({ notes, onChange }: { notes: AudioNote[]; onChange: (n: AudioNote[]) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTs = useRef(0);
  const player = useRef<Player | null>(null);
  const playTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(
    () => () => {
      if (tick.current) clearInterval(tick.current);
      if (playTimer.current) clearTimeout(playTimer.current);
      try {
        player.current?.remove();
      } catch {
        // deja libere
      }
    },
    [],
  );

  const stop = async () => {
    try {
      if (tick.current) {
        clearInterval(tick.current);
        tick.current = null;
      }
      const duration = Date.now() - startTs.current;
      await recorder.stop();
      const uri = recorder.uri;
      setRecording(false);
      setElapsed(0);
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch {
        // sans importance
      }
      if (uri) {
        onChange([{ id: makeId(), uri, date: new Date().toISOString(), durationMs: Math.min(MAX_MS, duration) }, ...notesRef.current]);
        tap('success');
      }
    } catch (e) {
      logger.warn('Arret de la note vocale impossible', e);
      setRecording(false);
    }
  };

  const start = async () => {
    try {
      const cur = await getRecordingPermissionsAsync();
      let ok = cur.granted;
      if (!ok) {
        if (!cur.canAskAgain) {
          appAlert(traduire('Micro bloqué'), traduire('Autorise le micro pour Yoroi dans les réglages de ton téléphone.'));
          return;
        }
        ok = (await requestRecordingPermissionsAsync()).granted;
      }
      if (!ok) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startTs.current = Date.now();
      setRecording(true);
      setElapsed(0);
      tap('medium');
      tick.current = setInterval(() => {
        const e = Date.now() - startTs.current;
        setElapsed(e);
        if (e >= MAX_MS) stop();
      }, 100);
    } catch (e) {
      logger.warn('Enregistrement vocal impossible', e);
      appAlert(traduire('Enregistrement impossible'), traduire('Vérifie que le micro est autorisé.'));
      setRecording(false);
    }
  };

  const play = (n: AudioNote) => {
    try {
      if (playTimer.current) clearTimeout(playTimer.current);
      try {
        player.current?.pause();
        player.current?.remove();
      } catch {
        // deja libere
      }
      player.current = null;
      if (playing === n.id) {
        setPlaying(null);
        return;
      }
      const pl = createAudioPlayer({ uri: n.uri });
      player.current = pl;
      pl.play();
      setPlaying(n.id);
      tap();
      playTimer.current = setTimeout(() => {
        try {
          player.current?.remove();
        } catch {
          // deja libere
        }
        player.current = null;
        setPlaying((prev) => (prev === n.id ? null : prev));
      }, n.durationMs + 400);
    } catch (e) {
      logger.warn('Lecture de la note vocale impossible', e);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <View>
        <Ink size={18} weight="black" tight>
          {traduire("Notes vocales")}</Ink>
        <Ink size={13} color={P.ink2}>
          {traduire("30 secondes maximum, juste après le combat")}</Ink>
      </View>
      <Press onPress={recording ? stop : start} haptic="none" accessibilityRole="button" accessibilityLabel={recording ? traduire('Arrêter l\'enregistrement') : traduire('Enregistrer une note vocale')}>
        <View style={{ height: 60, borderRadius: 20, backgroundColor: recording ? P.danger : P.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <CIcon name={recording ? 'stop' : 'mic'} size={20} color={P.white} fill={recording ? P.white : undefined} />
          <Ink size={17} weight="extraBold" color={P.white}>
            {recording ? traduire("Arrêter, {0} s", (elapsed / 1000).toFixed(1).replace('.', DECIMAL)) : traduire('Enregistrer une note')}
          </Ink>
        </View>
      </Press>
      {recording ? <View style={{ height: 6, borderRadius: 3, backgroundColor: P.line2, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, (elapsed / MAX_MS) * 100)}%`, height: '100%', backgroundColor: P.danger }} /></View> : null}
      {notes.map((n) => (
        <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: P.paper }}>
          <IconBtn icon={playing === n.id ? 'pause' : 'play'} label={playing === n.id ? traduire('Pause') : traduire('Écouter')} tone={playing === n.id ? 'red' : 'ink'} onPress={() => play(n)} />
          <View style={{ flex: 1 }}>
            <Ink size={15} weight="extraBold">
              {shortDate(n.date, true)}
            </Ink>
            <Ink size={13} color={P.ink2}>
              {`${(n.durationMs / 1000).toFixed(1).replace('.', DECIMAL)} s`}
            </Ink>
          </View>
          <IconBtn
            icon="trash"
            label={traduire("Supprimer la note")}
            onPress={() =>
              appAlert(traduire('Supprimer cette note vocale ?'), undefined, [
                { text: traduire('Annuler'), style: 'cancel' },
                { text: traduire('Supprimer'), style: 'destructive', onPress: () => onChange(notes.filter((x) => x.id !== n.id)) },
              ])
            }
          />
        </View>
      ))}
    </Card>
  );
}

// ─── Face a face a partager ───────────────────────────────────────────

export function FaceoffShare({ p, wins, losses, draws }: { p: Partner; wins: number; losses: number; draws: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const shot = useRef<ViewShot | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cw = Math.min(width - 44, 400);
  const total = wins + losses + draws;
  const wr = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
  const arch = p.archetype ? ARCHETYPE_META[p.archetype].label : null;

  const share = async () => {
    if (busy) return;
    noterPartage('partenaire');
    setBusy(true);
    try {
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: traduire('Face à face Yoroi') });
      else {
        const res = await Share.share({ url: uri, title: traduire('Face à face Yoroi'), message: signaturePartage() });
        if (res.action === Share.sharedAction) noterPartage('partenaire', true);
      }
      tap('success');
    } catch (e) {
      logger.warn('Partage du face a face impossible', e);
      appAlert(traduire('Image impossible'), traduire('Réessaie dans un instant.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Press onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Créer la carte face à face")}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <CIcon name="swords" size={24} color={P.goldLight} />
          </View>
          <View style={{ flex: 1 }}>
            <Ink size={16} weight="black">
              {traduire("Carte face à face")}</Ink>
            <Ink size={13} color={P.ink2}>
              {traduire("Une image à partager avec ton bilan contre lui")}</Ink>
          </View>
          <CIcon name="chevron" size={16} color={P.muted} />
        </Card>
      </Press>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: P.paper, paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <IconBtn icon="close" label={traduire("Fermer")} onPress={() => setOpen(false)} />
            <Ink size={18} weight="black">
              {traduire("Face à face")}</Ink>
            <View style={{ width: 44 }} />
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 16, paddingBottom: insets.bottom + 110 }}>
            <ViewShot ref={shot} style={{ width: cw, borderRadius: 28, overflow: 'hidden', backgroundColor: P.paper }}>
              <View style={{ padding: 22, gap: 20, backgroundColor: '#F7F4EC' }}>
                <View style={{ position: 'absolute', right: -20, top: -10 }}>
                  <Glyph kind="sakura" size={210} color="rgba(44,74,132,0.07)" />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ alignItems: 'center', gap: 8, flex: 1 }}>
                    <Seal name="Moi" size={96} tone={V} rotate={-5} />
                    <Ink size={18} weight="black">
                      Moi
                    </Ink>
                  </View>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] }}>
                    <Ink weight="black" size={20} color={P.onPrimary} allowFontScaling={false}>
                      VS
                    </Ink>
                  </View>
                  <View style={{ alignItems: 'center', gap: 8, flex: 1 }}>
                    <Seal name={p.name} photoUri={p.photoUri} belt={p.belt} size={96} tone={D} rotate={5} />
                    <Ink size={18} weight="black" numberOfLines={1}>
                      {traduire(p.name)}
                    </Ink>
                    <BeltBar belt={p.belt} width={70} height={10} />
                  </View>
                </View>
                {p.nickname || arch ? (
                  <Ink size={14} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>
                    {[p.nickname ? `« ${p.nickname} »` : null, arch].filter(Boolean).join(', ')}
                  </Ink>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { v: String(wins), l: 'victoires', c: V },
                    { v: String(losses), l: traduire('défaites'), c: D },
                    { v: String(total), l: 'rounds', c: P.ink },
                    ...(wr != null ? [{ v: `${wr}%`, l: traduire('réussite'), c: wr >= 50 ? V : D }] : []),
                  ].map((s) => (
                    <View key={s.l} style={{ flex: 1, paddingVertical: 12, borderRadius: 18, backgroundColor: blancA(0.85), alignItems: 'center' }}>
                      <Ink size={24} weight="black" tight color={s.c}>
                        {s.v}
                      </Ink>
                      <Ink size={11} weight="bold" color={P.ink2}>
                        {s.l}
                      </Ink>
                    </View>
                  ))}
                </View>
                <View style={{ gap: 4 }}>
                  <Ink size={13} weight="black" color={P.accent} style={{ textAlign: 'center', letterSpacing: 2 }}>
                    YOROI
                  </Ink>
                  <SignatureCarte size={10} color={P.muted} align="center" />
                </View>
              </View>
            </ViewShot>
          </ScrollView>
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 14 }}>
            <BigButton label={busy ? traduire('Préparation') : traduire("Partager l'image")} icon="share" onPress={share} disabled={busy} />
          </View>
        </View>
      </Modal>
    </>
  );
}

