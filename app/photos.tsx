/**
 * Photos de forme v2 (vague 39) : un coffre 100 % local, range par mois.
 * Camera avec la derniere photo de la meme pose en transparence et un minuteur,
 * pose de chaque photo (face, profil, dos) et filtre, date complete et poids sous chaque photo,
 * visionneuse plein ecran ou l'on glisse d'une photo a l'autre, suppression confirmee dans l'app.
 * NUIT 14 : a l'ajout, la date est celle de la prise de vue (EXIF, sinon galerie, sinon aujourd'hui),
 * proposee et modifiable (lib/v2/photos/datePhoto.ts). Une photo de l'appareil de l'app prend la date du moment.
 * 17 octobre 2026 : bouton « Créer ma carte avant après » (au moins 2 photos), vers l'atelier des cartes.
 */
import { track } from '@/utils/telemetry';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import { getAssetInfoAsync, getPermissionsAsync as getLibraryPermissionsAsync } from 'expo-media-library';
import { DatePickerSheet } from '@/components/yoroi/v2/DateChips';
import { cameraDay, photoDay } from '@/lib/v2/photos/datePhoto';
import type { PhotoDay } from '@/lib/v2/photos/datePhoto';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailHeader, GhostButton, GLASS, GUTTER, IconButton, Pills, PrimaryButton, StatStrip, tapLight } from '@/components/yoroi/v2/progres/ui';
import { Sheet } from '@/components/yoroi/v2/progres/Sheet';
import { CameraFantome } from '@/components/yoroi/v2/photos/CameraFantome';
import { VisionneusePhotos } from '@/components/yoroi/v2/photos/VisionneusePhotos';
import { deletePhotoFromStorage, getPhotosFromStorage, savePhotoToStorage, updatePhotoInStorage } from '@/lib/storage';
import type { Photo } from '@/lib/storage';
import { addWeight, getLatestWeight } from '@/lib/database';
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { logger } from '@/lib/security/logger';
import { carteAvantApresDirecte } from '@/lib/v2/nav/direct';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { capitalize, daysDiff, monthLong, num, parseInput, todayIso } from '@/lib/v2/progres/format';
import { dateComplete, dateCourte, dureeTexte, ecartTexte, kg, poseLabel, poseOf, POSES, trierAnciennesDabord } from '@/lib/v2/photos/outils';
import type { Pose } from '@/lib/v2/photos/outils';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { usePremium } from '@/context/PremiumContext';
import { canAddMore } from '@/lib/v2/premium/limits';
import { LimitNotice } from '@/components/yoroi/v2/premium/LimitNotice';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const PRIVACY_CHALLENGE_KEY = '@yoroi_privacy_challenge_shown';
const LAST_POSE_KEY = '@yoroi_photos_derniere_pose';

function Eye({ color, off }: { color: string; off?: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      {off ? <Path d="M4 4l16 16" stroke={color} strokeWidth={2} strokeLinecap="round" /> : null}
    </Svg>
  );
}

function Lock({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

type Filtre = Pose | 'toutes';

export default function PhotosScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isBlurred: appBlurred, screenshotDetected } = useSensitiveScreen();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [veiled, setVeiled] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingPose, setPendingPose] = useState<Pose | null>(null);
  const [pendingDay, setPendingDay] = useState<PhotoDay | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [lastPose, setLastPose] = useState<Pose | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [useCurrent, setUseCurrent] = useState(true);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [note, setNote] = useState('');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Photo | null>(null);
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [message, setMessage] = useState<{ title: string; text: string; reglages?: boolean } | null>(null);
  const { isPremium } = usePremium();
  // Version gratuite : un nombre limite de photos (lib/v2/premium/limits.ts). Toutes les photos deja
  // enregistrees restent visibles et comparables ; seul l'ajout d'une nouvelle est bloque.
  const full = !loading && !canAddMore(isPremium, 'progressPhotos', photos.length);

  const fetchPhotos = useCallback(async () => {
    try {
      setPhotos((await getPhotosFromStorage()) ?? []);
    } catch (err) {
      logger.error('Lecture des photos impossible', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPrivacyChallenge = useCallback(async () => {
    try {
      const seen = await AsyncStorage.getItem(PRIVACY_CHALLENGE_KEY);
      if (!seen) {
        setPrivacyVisible(true);
        await AsyncStorage.setItem(PRIVACY_CHALLENGE_KEY, 'true');
        return false;
      }
      return true;
    } catch (err) {
      logger.error('Lecture du test de confiance impossible', err);
      return true;
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
    checkPrivacyChallenge();
    AsyncStorage.getItem(LAST_POSE_KEY)
      .then((v) => {
        if (v === 'face' || v === 'profil' || v === 'dos') setLastPose(v);
      })
      .catch(() => {});
    const t = setTimeout(() => setLoading(false), 2000);
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, fetchPhotos);
    return () => {
      clearTimeout(t);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWeightSheet = async (uri: string, pose: Pose | null, day: PhotoDay) => {
    setPendingUri(uri);
    setPendingPose(pose);
    setPendingDay(day);
    setDateOpen(false);
    setNote('');
    try {
      const latest = await getLatestWeight();
      setCurrentWeight(latest?.weight ?? null);
      setWeightInput(latest?.weight ? num(latest.weight, 1, false) : '');
      setUseCurrent(!!latest?.weight);
    } catch {
      setCurrentWeight(null);
      setUseCurrent(false);
    }
  };

  const pickImage = async () => {
    if (full) return;
    if (!(await checkPrivacyChallenge())) return;
    try {
      const lib = await requestMediaLibraryPermissionsAsync();
      if (lib.status !== 'granted') {
        setMessage({ title: traduire('Autorisation nécessaire'), text: traduire('YOROI a besoin de ta galerie pour ajouter une photo. Tu peux l’autoriser dans les réglages de ton téléphone.'), reglages: true });
        return;
      }
      const r = await launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: false, quality: 0.8, selectionLimit: 1, exif: true });
      const asset = !r.canceled ? r.assets?.[0] : undefined;
      if (asset?.uri) {
        // la date de prise de vue : EXIF d'abord, sinon la date de la galerie (si l'acces est deja donne)
        let creationTime: number | undefined;
        if (Platform.OS !== 'web' && asset.assetId) {
          try {
            if ((await getLibraryPermissionsAsync()).granted) creationTime = (await getAssetInfoAsync(asset.assetId)).creationTime || undefined;
          } catch {
            // pas grave : l'EXIF suffit souvent
          }
        }
        openWeightSheet(asset.uri, filtre !== 'toutes' ? filtre : lastPose, photoDay({ exif: asset.exif, fileName: asset.fileName, creationTime }));
      }
    } catch (err) {
      logger.error('Galerie indisponible', err);
    }
  };

  const takePhoto = () => {
    if (full) return;
    // la camera ne tourne pas dans le navigateur : on passe par la galerie
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }
    setCameraOpen(true);
  };

  const savePending = async () => {
    if (!pendingUri) return;
    const weight = useCurrent ? currentWeight ?? undefined : parseInput(weightInput, 20, 400);
    const uri = pendingUri;
    const pose = pendingPose;
    setPendingUri(null);
    setUploading(true);
    const today = pendingDay?.date && pendingDay.date <= todayIso() ? pendingDay.date : todayIso();
    try {
      await savePhotoToStorage(uri, today, weight, note.trim() || undefined, pose ?? undefined);
      track('photo_ajoutee');
      if (pose) {
        setLastPose(pose);
        AsyncStorage.setItem(LAST_POSE_KEY, pose).catch(() => {});
      }
      // Un poids saisi a la main devient aussi une pesee
      if (weight && !useCurrent) {
        try {
          await addWeight({ weight, date: today, source: 'manual' });
        } catch (err) {
          logger.error('Enregistrement du poids de la photo impossible', err);
        }
      }
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      logger.error('Enregistrement de la photo impossible', err);
      setMessage({ title: traduire('Photo non enregistrée'), text: traduire('Un souci est survenu, réessaie.') });
    } finally {
      setUploading(false);
      fetchPhotos();
    }
  };

  const doDelete = async (p: Photo) => {
    setToDelete(null);
    const ok = await deletePhotoFromStorage(p.id);
    if (ok) {
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      const left = photos.filter((x) => x.id !== p.id);
      setPhotos(left);
      if (viewerId === p.id) {
        const i = shown.findIndex((x) => x.id === p.id);
        const next = shown.filter((x) => x.id !== p.id);
        setViewerId(next.length ? next[Math.min(i, next.length - 1)].id : null);
      }
      fetchPhotos();
    } else {
      notificationAsync(NotificationFeedbackType.Error).catch(() => {});
      setMessage({ title: traduire('Suppression impossible'), text: traduire('La photo n’a pas pu être supprimée.') });
    }
  };

  const setPose = async (p: Photo, pose: Pose | null) => {
    setPhotos((l) => l.map((x) => (x.id === p.id ? { ...x, pose: pose ?? undefined } : x)));
    const ok = await updatePhotoInStorage(p.id, { pose: pose ?? undefined });
    if (ok) DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  };

  // du plus recent au plus ancien
  const sorted = useMemo(() => trierAnciennesDabord(photos).reverse(), [photos]);
  const counts = useMemo(() => {
    const m: Record<Pose, number> = { face: 0, profil: 0, dos: 0 };
    sorted.forEach((p) => {
      const k = poseOf(p);
      if (k) m[k] += 1;
    });
    return m;
  }, [sorted]);
  const anyPose = counts.face + counts.profil + counts.dos > 0;
  const shown = useMemo(() => (filtre === 'toutes' ? sorted : sorted.filter((p) => poseOf(p) === filtre)), [sorted, filtre]);
  useEffect(() => {
    if (filtre !== 'toutes' && counts[filtre] === 0) setFiltre('toutes');
  }, [counts, filtre]);

  const groups = useMemo(() => {
    const g: { key: string; title: string; items: Photo[] }[] = [];
    shown.forEach((p) => {
      const k = p.date.slice(0, 7);
      if (!g.length || g[g.length - 1].key !== k) g.push({ key: k, title: `${capitalize(monthLong(p.date.slice(0, 10)))} ${p.date.slice(0, 4)}`, items: [] });
      g[g.length - 1].items.push(p);
    });
    return g;
  }, [shown]);

  // Les chiffres du coffre : combien de photos, depuis quand, et l'ecart de poids entre la premiere et la derniere
  const first = sorted[sorted.length - 1];
  const last = sorted[0];
  const span = first && last ? Math.abs(daysDiff(first.date.slice(0, 10), last.date.slice(0, 10))) : 0;
  const sinceToday = first ? Math.abs(daysDiff(first.date.slice(0, 10), todayIso())) : 0;
  const withWeight = sorted.filter((p) => p.weight);
  const weightDiff = withWeight.length >= 2 && span > 0 ? withWeight[0].weight! - withWeight[withWeight.length - 1].weight! : null;
  const cell = (width - GUTTER * 2 - 16) / 3;

  const statItems = first
    ? [
        { value: String(sorted.length), label: sorted.length > 1 ? traduire('photos dans ton coffre') : traduire('photo dans ton coffre') },
        sinceToday === 0
          ? { value: 'Aujourd’hui', label: traduire('ta première photo') }
          : { value: dateCourte(first.date.slice(0, 10)), label: traduire("ta première photo, il y a {0}", dureeTexte(sinceToday)) },
        ...(weightDiff !== null
          ? [{ value: ecartTexte(weightDiff), label: traduire("en {0}, de la première à la dernière", dureeTexte(span)) }]
          : span > 0
            ? [{ value: capitalize(dureeTexte(span)), label: traduire('entre la première et la dernière') }]
            : []),
      ]
    : [];

  const filterItems: { value: Filtre; label: string }[] = [
    { value: 'toutes', label: traduire("Toutes, {0}", sorted.length) },
    ...POSES.filter((p) => counts[p.value] > 0).map((p) => ({ value: p.value as Filtre, label: `${p.label}, ${counts[p.value]}` })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <DetailHeader
          title={traduire("Tes photos")}
          sub={traduire("Ton coffre de progression, rangé par mois.")}
          right={
            sorted.length ? (
              <IconButton label={veiled ? traduire('Afficher les photos') : traduire('Flouter les photos')} onPress={() => setVeiled((v) => !v)}>
                <Eye color={c.ink} off={veiled} />
              </IconButton>
            ) : undefined
          }
        />

        {screenshotDetected ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: c.accentTint }}>
            <Ink size={13} weight="bold">{traduire("Capture d’écran repérée. Tes photos sont sensibles.")}</Ink>
          </View>
        ) : null}

        <View style={{ marginHorizontal: GUTTER, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: c.successTint }}>
          <Lock color={c.successText} />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={15} weight="extraBold" color={c.successText}>{traduire("Coffre 100 % local")}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("Tes photos restent sur ton téléphone. Elles ne partent jamais en ligne.")}</Ink>
          </View>
        </View>

        {statItems.length ? <StatStrip style={{ marginHorizontal: GUTTER, marginTop: 18 }} items={statItems} /> : null}

        {full ? (
          <LimitNotice limit="progressPhotos" count={photos.length} style={{ marginHorizontal: GUTTER, marginTop: 18 }} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, marginTop: 18 }}>
            <PrimaryButton label={uploading ? 'Enregistrement en cours' : traduire('Prendre une photo')} onPress={takePhoto} disabled={uploading} style={{ flex: 1 }} />
            <GhostButton label={traduire("Galerie")} onPress={pickImage} style={{ width: 120, height: 56 }} />
          </View>
        )}
        {sorted.length >= 2 ? (
          <>
            <GhostButton label={traduire("Comparer avant et après")} onPress={() => router.push('/transformation' as any)} style={{ marginHorizontal: GUTTER, marginTop: 10 }} />
            <GhostButton label={traduire("Créer ma carte avant après")} onPress={() => router.push(carteAvantApresDirecte() as never)} style={{ marginHorizontal: GUTTER, marginTop: 10 }} />
          </>
        ) : null}

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ChargementPetit />
          </View>
        ) : sorted.length === 0 ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 22, padding: 18, borderRadius: 24, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.divider, gap: 10 }}>
            <Ink size={20} weight="black" tight>{traduire("Commence ta transformation")}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire("Une photo par mois suffit. Même lumière, même tenue, même cadrage : face, profil et dos. La prochaine fois, la caméra te montre ta dernière photo en transparence pour te replacer au même endroit.")}</Ink>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {POSES.map((v) => (
                <View key={v.value} style={{ flex: 1, height: 120, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={13} weight="bold" color={c.textSecondary}>{traduire(v.label)}</Ink>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            {anyPose ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER }} style={{ marginTop: 22 }}>
                <Pills scroll items={filterItems} value={filtre} onChange={(v) => setFiltre(v)} />
              </ScrollView>
            ) : (
              <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 20 }}>
                {traduire("Donne une pose à tes photos (face, profil, dos) en les ouvrant : la comparaison se fera à cadrage égal.")}</Ink>
            )}
            {groups.map((g) => (
              <View key={g.key} style={{ marginTop: 22, paddingHorizontal: GUTTER }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Ink size={17} weight="black" tight>{traduire(g.title)}</Ink>
                  <Ink size={12} weight="bold" color={c.textMuted}>{traduirePluriel(g.items.length, g.items.length > 1, "{0} photo", "{0} photos", g.items.length)}</Ink>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {g.items.map((p) => {
                    const pose = poseOf(p);
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          tapLight();
                          if (veiled) setVeiled(false);
                          else setViewerId(p.id);
                        }}
                        onLongPress={() => {
                          selectionAsync().catch(() => {});
                          setToDelete(p);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={traduire("Photo du {0}{1}{2}", dateComplete(p.date.slice(0, 10)), p.weight ? traduire(", {0} kilos", num(p.weight, 1)) : '', pose ? `, ${poseLabel(pose)}` : '')}
                        accessibilityHint={traduire("Appui long pour supprimer")}
                        style={{ width: cell, gap: 5 }}
                      >
                        <View>
                          <Image source={{ uri: p.file_uri }} blurRadius={veiled ? 25 : 0} style={{ width: cell, height: cell * 1.33, borderRadius: 16, backgroundColor: c.fillSubtle }} resizeMode="cover" />
                          {pose && !veiled ? (
                            <View style={{ position: 'absolute', left: 6, top: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(14,15,19,0.6)' }}>
                              <Ink size={11} weight="extraBold" color="#FFFFFF">{poseLabel(pose)}</Ink>
                            </View>
                          ) : null}
                        </View>
                        <View>
                          <Ink size={12} weight="extraBold" numberOfLines={1}>{dateComplete(p.date.slice(0, 10))}</Ink>
                          <Ink size={12} color={c.textSecondary} numberOfLines={1}>{p.weight && !veiled ? kg(p.weight) : traduire('Sans poids')}</Ink>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 16 }}>{traduire("Touche une photo pour la voir en grand et glisser vers les autres. Appui long pour la supprimer.")}</Ink>
          </>
        )}
      </ScrollView>

      <VisionneusePhotos photos={shown} startId={viewerId} onClose={() => setViewerId(null)} onDelete={doDelete} onPose={setPose} />

      <CameraFantome
        visible={cameraOpen}
        photos={photos}
        initialPose={filtre !== 'toutes' ? filtre : lastPose}
        onClose={() => setCameraOpen(false)}
        onTaken={(uri, pose) => {
          setCameraOpen(false);
          openWeightSheet(uri, pose, cameraDay());
        }}
      />

      <Sheet
        visible={!!toDelete && !viewerId}
        onClose={() => setToDelete(null)}
        title={traduire("Supprimer cette photo ?")}
        text={toDelete ? traduire("La photo du {0} sera effacée de ton coffre. Ce n’est pas réversible.", dateComplete(toDelete.date.slice(0, 10))) : undefined}
        actions={[
          { label: traduire('Supprimer'), tone: 'danger', onPress: () => toDelete && doDelete(toDelete) },
          { label: traduire('Garder'), onPress: () => setToDelete(null) },
        ]}
      />

      <Sheet
        visible={!!pendingUri}
        onClose={() => setPendingUri(null)}
        title={traduire("Range cette photo")}
        text={traduire("La pose et le poids servent à comparer des photos qui se ressemblent.")}
        actions={[
          { label: traduire('Enregistrer la photo'), tone: 'ink', onPress: savePending },
          { label: traduire('Annuler'), onPress: () => setPendingUri(null) },
        ]}
      >
        {pendingUri && !dateOpen ? <Image source={{ uri: pendingUri }} style={{ width: 84, height: 112, borderRadius: 14, alignSelf: 'center' }} resizeMode="cover" /> : null}
        {pendingDay ? (
          <View style={{ gap: 6 }}>
            <Ink size={12} weight="bold" color={c.textSecondary}>{traduire(pendingDay.label)}</Ink>
            <Pressable
              onPress={() => { selectionAsync().catch(() => {}); setDateOpen((o) => !o); }}
              accessibilityRole="button"
              accessibilityLabel={traduire("Date de la photo, {0}. Toucher pour changer.", dateComplete(pendingDay.date))}
              style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: c.border }}
            >
              <Ink size={15} weight="extraBold">{dateComplete(pendingDay.date)}</Ink>
              <Ink size={13} weight="bold" color={c.accent}>{dateOpen ? traduire('Fermer') : traduire('Changer')}</Ink>
            </Pressable>
            <DatePickerSheet
              inline
              visible={dateOpen}
              value={pendingDay.date}
              onClose={() => setDateOpen(false)}
              onPick={(iso) => setPendingDay({ date: iso, found: true, label: traduire('Date choisie') })}
            />
          </View>
        ) : null}
        {/* le calendrier ouvert prend la place : le reste revient quand la date est choisie */}
        {!dateOpen ? (
        <>
        <View style={{ gap: 6 }}>
          <Ink size={12} weight="bold" color={c.textSecondary}>{traduire("Pose")}</Ink>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {POSES.map((o) => {
              const on = pendingPose === o.value;
              return (
                <Pressable key={o.value} onPress={() => { selectionAsync().catch(() => {}); setPendingPose(on ? null : o.value); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent', borderWidth: 1.5, borderColor: on ? c.ink : c.border }}>
                  <Ink size={14} weight="extraBold" color={on ? P.paper : c.textSecondary}>{traduire(o.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Ink size={12} weight="bold" color={c.textSecondary}>Poids</Ink>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { on: useCurrent, label: currentWeight ? traduire("Mon poids, {0}", kg(currentWeight)) : traduire('Pas de pesée'), disabled: !currentWeight, press: () => setUseCurrent(true) },
              { on: !useCurrent, label: traduire('Saisir un poids'), disabled: false, press: () => setUseCurrent(false) },
            ].map((o) => (
              <Pressable key={o.label} disabled={o.disabled} onPress={() => { selectionAsync().catch(() => {}); o.press(); }} accessibilityRole="button" accessibilityState={{ selected: o.on }} style={{ flex: 1, minHeight: 46, borderRadius: 14, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: o.on ? c.ink : 'transparent', borderWidth: 1.5, borderColor: o.on ? c.ink : c.border, opacity: o.disabled ? 0.45 : 1 }}>
                <Ink size={13} weight="extraBold" color={o.on ? P.paper : c.textSecondary} numberOfLines={1}>{traduire(o.label)}</Ink>
              </Pressable>
            ))}
          </View>
        </View>
        {!useCurrent ? (
          <TextInput value={weightInput} onChangeText={setWeightInput} keyboardType="decimal-pad" placeholder={traduire("Poids en kilos, facultatif")} placeholderTextColor={c.textMuted} maxLength={6} style={{ height: 52, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, fontSize: 18, color: c.ink }} />
        ) : null}
        <TextInput value={note} onChangeText={setNote} placeholder={traduire("Une note, facultatif")} placeholderTextColor={c.textMuted} maxLength={80} style={{ height: 48, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, fontSize: 15, color: c.ink }} />
        </>
        ) : null}
      </Sheet>

      <Sheet
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        title={traduire("Test de confiance")}
        text={traduire("Passe en mode avion et ajoute une photo : ça marche, parce que tout reste sur ton téléphone. Rien ne part en ligne.")}
        actions={[{ label: traduire('Compris'), tone: 'ink', onPress: () => setPrivacyVisible(false) }]}
      />

      <Sheet visible={!!message} onClose={() => setMessage(null)} title={message?.title ?? ''} text={traduire(message?.text)} actions={message?.reglages ? [{ label: traduire('Ouvrir les réglages'), tone: 'ink', onPress: () => { setMessage(null); Linking.openSettings().catch(() => {}); } }, { label: traduire('Plus tard'), tone: 'ghost', onPress: () => setMessage(null) }] : [{ label: traduire('D’accord'), tone: 'ink', onPress: () => setMessage(null) }]} />

      {appBlurred && Platform.OS === 'ios' ? <BlurView style={StyleSheet.absoluteFill} intensity={100} tint="light" /> : null}
    </View>
  );
}
