/**
 * Bibliotheque de videos de mouvements (carnet v2) : par groupe musculaire, par sport ou par exercice.
 * Ajout depuis la galerie (copie permanente) ou par lien, lecture integree des fichiers, suppression.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import logger from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';
import { addVideo, deleteVideo, getVideos, getVideosByBenchmark, getVideosByMuscleGroup, getVideosBySport } from '@/lib/videoLibraryService';
import type { ExerciseVideo } from '@/lib/videoLibraryService';
import { shortDate } from '@/lib/v2/carnet/format';
import { P, CIcon, IconBtn, BigButton, Field, ChoiceLine, EmptyState, Press } from './ui';
import { ChargementBloc } from '@/components/yoroi/v2/chargement/Chargement';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type VideoContext = {
  muscleGroup?: string;
  muscleGroupLabel?: string;
  muscleGroupColor?: string;
  sport?: string;
  sportLabel?: string;
  sportColor?: string;
  benchmarkId?: string;
  benchmarkName?: string;
  benchmarkColor?: string;
};

function Player({ uri, onClose }: { uri: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 20 }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls allowsPictureInPicture fullscreenOptions={{ enable: true }} />
      <View style={{ position: 'absolute', top: insets.top + 10, left: 16 }}>
        <IconBtn name="close" label={traduire("Fermer la vidéo")} onPress={onClose} />
      </View>
    </View>
  );
}

export function VideoLibrarySheet({ visible, onClose, muscleGroup, muscleGroupLabel, sport, sportLabel, sportColor, benchmarkId, benchmarkName }: VideoContext & { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<'choice' | 'link' | 'name'>('choice');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [pendingAsset, setPendingAsset] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState<ExerciseVideo | null>(null);

  const isForBenchmark = !!benchmarkId;
  const isForSport = !!sport;
  const heading = isForBenchmark ? benchmarkName || traduire('Exercice') : isForSport ? sportLabel || sport || 'Sport' : muscleGroupLabel || muscleGroup || traduire('Sans catégorie');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let result: ExerciseVideo[];
      if (isForBenchmark && benchmarkId) result = await getVideosByBenchmark(benchmarkId);
      else if (muscleGroup) result = await getVideosByMuscleGroup(muscleGroup);
      else if (isForSport && sport) result = await getVideosBySport(sport);
      else result = (await getVideos()).filter((v) => !v.muscleGroup && !v.benchmarkId && !v.sport);
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setVideos(result);
    } catch (e) {
      logger.error('[VideoLibrarySheet] chargement impossible', e);
    } finally {
      setLoading(false);
    }
  }, [benchmarkId, muscleGroup, sport, isForBenchmark, isForSport]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const target = () => ({
    muscleGroup: isForBenchmark || isForSport ? undefined : muscleGroup,
    sport: isForBenchmark ? undefined : isForSport ? sport : undefined,
    sportLabel: isForBenchmark ? undefined : isForSport ? sportLabel : undefined,
    sportColor: isForBenchmark ? undefined : isForSport ? sportColor : undefined,
    benchmarkId: isForBenchmark ? benchmarkId : undefined,
    benchmarkName: isForBenchmark ? benchmarkName : undefined,
  });

  const openAdd = () => {
    setMode('choice');
    setUrl('');
    setTitle('');
    setPendingAsset(null);
    setAddOpen(true);
  };

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        appAlert(traduire('Accès refusé'), traduire('Autorise l’accès à ta galerie dans les réglages du téléphone.'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
      if (result.canceled || !result.assets?.[0]) return;
      setPendingAsset(result.assets[0].uri);
      setMode('name');
    } catch (e) {
      logger.error('[VideoLibrarySheet] galerie', e);
    }
  };

  const saveLocal = async () => {
    if (!pendingAsset || !title.trim()) return;
    setSaving(true);
    try {
      const ext = pendingAsset.split('.').pop()?.split('?')[0] || 'mp4';
      const destUri = `${FileSystem.documentDirectory}video_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: pendingAsset, to: destUri });
      await addVideo({ title: title.trim(), uri: destUri, isUrl: false, ...target() });
      setAddOpen(false);
      await load();
    } catch (e) {
      logger.error('[VideoLibrarySheet] copie impossible', e);
      appAlert('Oups', traduire('La vidéo n’a pas pu être enregistrée.'));
    } finally {
      setSaving(false);
    }
  };

  const saveLink = async () => {
    if (!url.trim()) return;
    if (!title.trim()) {
      appAlert('Titre manquant', traduire('Donne un titre à cette vidéo.'));
      return;
    }
    const link = url.trim();
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      appAlert('Lien invalide', traduire('Le lien doit commencer par https://'));
      return;
    }
    setSaving(true);
    try {
      await addVideo({ title: title.trim(), uri: link, isUrl: true, ...target() });
      setAddOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const play = async (v: ExerciseVideo) => {
    if (!v.isUrl) {
      setPlaying(v);
      return;
    }
    const opened = await safeOpenURL(v.uri);
    if (!opened) appAlert(traduire('Impossible d’ouvrir'), traduire('Installe l’application ou ouvre ce lien dans ton navigateur.'));
  };

  const remove = (v: ExerciseVideo) => {
    appAlert(traduire('Supprimer la vidéo ?'), traduire("« {0} » sera retirée.", v.title), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: async () => {
          await deleteVideo(v.id);
          await load();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 110, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: -6, minHeight: 44 }}>
            <IconBtn name="back" label={traduire("Fermer")} onPress={onClose} />
          </View>
          <View style={{ paddingHorizontal: 4, gap: 2 }}>
            <Ink size={13} weight="bold" color={P.ink2}>{traduire("Bibliothèque de mouvements")}</Ink>
            <Ink size={30} weight="black" tight accessibilityRole="header">{heading}</Ink>
          </View>
          {loading ? (
            <ChargementBloc style={{ marginTop: 16 }} />
          ) : videos.length === 0 ? (
            <EmptyState title={traduire("Aucune vidéo")} text={traduire("Garde tes vidéos de technique ici pour revoir le mouvement juste avant ta séance.")} action={traduire("Ajouter une vidéo")} onAction={openAdd} />
          ) : (
            <>
              <Ink size={13} weight="bold" color={P.ink2} style={{ paddingHorizontal: 4 }}>{traduirePluriel(videos.length, videos.length > 1, "{0} vidéo", "{0} vidéos", videos.length)}</Ink>
              {videos.map((v) => (
                <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
                  <Press onPress={() => play(v)} accessibilityRole="button" accessibilityLabel={traduire("Lire {0}", v.title)}>
                    <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center' }}>
                      <CIcon name={v.isUrl ? 'link' : 'play'} size={24} color={P.goldLight} />
                    </View>
                  </Press>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={2}>{v.title}</Ink>
                    <Ink size={12} weight="bold" color={P.muted}>{`${v.isUrl ? 'Lien' : traduire('Sur ton téléphone')}, ${shortDate(v.createdAt)}`}</Ink>
                  </View>
                  <IconBtn name="trash" label={traduire("Supprimer {0}", v.title)} onPress={() => remove(v)} tone="soft" />
                </View>
              ))}
            </>
          )}
        </ScrollView>
        {!loading && videos.length > 0 ? (
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 16 }}>
            <BigButton label={traduire("Ajouter une vidéo")} icon="plus" onPress={openAdd} />
          </View>
        ) : null}

        <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title={mode === 'link' ? traduire('Ajouter un lien') : mode === 'name' ? traduire('Nomme ta vidéo') : traduire('Ajouter une vidéo')} scroll>
          {mode === 'choice' ? (
            <>
              <ChoiceLine title={traduire("Depuis ta galerie")} sub={traduire("La vidéo est copiée dans YOROI")} icon="image" onPress={pickFromGallery} />
              <ChoiceLine title={traduire("Un lien")} sub="YouTube, Instagram..." icon="link" onPress={() => setMode('link')} />
            </>
          ) : null}
          {mode === 'name' ? (
            <>
              <Field value={title} onChangeText={setTitle} placeholder={traduire("Ex : technique développé couché prise large")} autoFocus />
              <BigButton label={saving ? 'Enregistrement...' : traduire('Enregistrer')} icon="check" disabled={saving || !title.trim()} onPress={saveLocal} />
            </>
          ) : null}
          {mode === 'link' ? (
            <>
              <Field value={title} onChangeText={setTitle} placeholder={traduire("Titre de la vidéo")} />
              <Field value={url} onChangeText={setUrl} placeholder="https://..." autoCapitalize="none" keyboardType="url" autoCorrect={false} />
              <BigButton label={saving ? 'Enregistrement...' : traduire('Ajouter')} icon="check" disabled={saving} onPress={saveLink} />
            </>
          ) : null}
        </Sheet>

        {playing && !playing.isUrl ? <Player uri={playing.uri} onClose={() => setPlaying(null)} /> : null}
      </View>
    </Modal>
  );
}

export default VideoLibrarySheet;
