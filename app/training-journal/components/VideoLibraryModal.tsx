// ============================================
// VIDEO LIBRARY MODAL
// Bibliothèque de vidéos de mouvements
// Par groupe musculaire ou par exercice précis
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import {
  X,
  Film,
  Play,
  Plus,
  Trash2,
  Link,
  Video,
  ChevronDown,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';
import {
  ExerciseVideo,
  getVideos,
  getVideosByMuscleGroup,
  getVideosBySport,
  getVideosByBenchmark,
  addVideo,
  deleteVideo,
} from '@/lib/videoLibraryService';
import { safeOpenURL } from '@/lib/security/validators';

// ─── Lecteur vidéo en overlay (fichiers locaux) ────────────────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function InlineVideoPlayer({ uri, onClose, accentColor }: { uri: string; onClose: () => void; accentColor: string }) {
  const player = useVideoPlayer({ uri }, p => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={playerStyles.overlay}>
      <VideoView
        player={player}
        style={playerStyles.video}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        contentFit="contain"
        nativeControls
      />
      <TouchableOpacity style={[playerStyles.closeBtn, { backgroundColor: accentColor }]} onPress={onClose}>
        <ChevronDown size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const playerStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#000',
    zIndex: 999,
  },
  video: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

// ─── Props ─────────────────────────────────────────────────────────────────
interface VideoLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  muscleGroup?: string;
  muscleGroupLabel?: string;
  muscleGroupColor?: string;
  sport?: string;
  sportLabel?: string;
  sportColor?: string;
  benchmarkId?: string;
  benchmarkName?: string;
  benchmarkColor?: string;
}

export default function VideoLibraryModal({
  visible,
  onClose,
  muscleGroup,
  muscleGroupLabel,
  muscleGroupColor,
  sport,
  sportLabel,
  sportColor,
  benchmarkId,
  benchmarkName,
  benchmarkColor,
}: VideoLibraryModalProps) {
  const { colors, isDark } = useTheme();
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [urlTitleValue, setUrlTitleValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<ExerciseVideo | null>(null);

  const accentColor = benchmarkColor || muscleGroupColor || sportColor || colors.accent || '#EC4899';
  const isForBenchmark = !!benchmarkId;
  const isForSport = !!sport;
  const title = isForBenchmark
    ? benchmarkName || 'Exercice'
    : isForSport
    ? sportLabel || sport || 'Sport'
    : muscleGroupLabel || muscleGroup || 'Sans catégorie';

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      let result: ExerciseVideo[];
      if (isForBenchmark && benchmarkId) {
        result = await getVideosByBenchmark(benchmarkId);
      } else if (muscleGroup) {
        result = await getVideosByMuscleGroup(muscleGroup);
      } else if (isForSport && sport) {
        result = await getVideosBySport(sport);
      } else {
        const all = await getVideos();
        result = all.filter(v => !v.muscleGroup && !v.benchmarkId && !v.sport);
      }
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setVideos(result);
    } catch (e) {
      logger.error('[VideoLibraryModal] loadVideos error', e);
    } finally {
      setLoading(false);
    }
  }, [benchmarkId, muscleGroup, sport, isForBenchmark, isForSport]);

  useEffect(() => {
    if (visible) loadVideos();
  }, [visible, loadVideos]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Autorise l\'accès à ta galerie dans les réglages.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      Alert.prompt(
        'Nom de la vidéo',
        'Donne un titre à cette vidéo (ex: Technique DC prise large)',
        async (inputTitle) => {
          if (!inputTitle?.trim()) return;
          setSaving(true);
          try {
            // Copier le fichier dans documentDirectory pour qu'il survive entre les sessions
            const ext = asset.uri.split('.').pop()?.split('?')[0] || 'mp4';
            const fileName = `video_${Date.now()}.${ext}`;
            const destUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.copyAsync({ from: asset.uri, to: destUri });
            await addVideo({
              title: inputTitle.trim(),
              uri: destUri,
              isUrl: false,
              muscleGroup: isForBenchmark || isForSport ? undefined : muscleGroup,
              sport: isForBenchmark ? undefined : (isForSport ? sport : undefined),
              sportLabel: isForBenchmark ? undefined : (isForSport ? sportLabel : undefined),
              sportColor: isForBenchmark ? undefined : (isForSport ? sportColor : undefined),
              benchmarkId: isForBenchmark ? benchmarkId : undefined,
              benchmarkName: isForBenchmark ? benchmarkName : undefined,
            });
            await loadVideos();
          } finally {
            setSaving(false);
          }
        },
        'plain-text',
        ''
      );
    } catch (e) {
      logger.error('[VideoLibraryModal] pickFromGallery error', e);
    }
  }, [muscleGroup, benchmarkId, benchmarkName, isForBenchmark, loadVideos]);

  const handleAddUrl = useCallback(async () => {
    if (!urlInputValue.trim()) return;
    if (!urlTitleValue.trim()) {
      Alert.alert('Titre manquant', 'Donne un titre à cette vidéo.');
      return;
    }
    const url = urlInputValue.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('URL invalide', 'Le lien doit commencer par https://');
      return;
    }
    setSaving(true);
    try {
      await addVideo({
        title: urlTitleValue.trim(),
        uri: url,
        isUrl: true,
        muscleGroup: isForBenchmark || isForSport ? undefined : muscleGroup,
        sport: isForBenchmark ? undefined : (isForSport ? sport : undefined),
        sportLabel: isForBenchmark ? undefined : (isForSport ? sportLabel : undefined),
        sportColor: isForBenchmark ? undefined : (isForSport ? sportColor : undefined),
        benchmarkId: isForBenchmark ? benchmarkId : undefined,
        benchmarkName: isForBenchmark ? benchmarkName : undefined,
      });
      setUrlInputValue('');
      setUrlTitleValue('');
      setShowUrlInput(false);
      await loadVideos();
    } finally {
      setSaving(false);
    }
  }, [urlInputValue, urlTitleValue, muscleGroup, benchmarkId, benchmarkName, isForBenchmark, loadVideos]);

  const handlePlay = useCallback(async (video: ExerciseVideo) => {
    if (!video.isUrl) {
      // Fichier local → lecteur intégré
      setPlayingVideo(video);
    } else {
      // Lien YouTube / URL → ouvre l'app externe
      const opened = await safeOpenURL(video.uri);
      if (!opened) {
        Alert.alert('Impossible d\'ouvrir', 'Installe YouTube ou ouvre ce lien dans Safari.');
      }
    }
  }, []);

  const handleDelete = useCallback((video: ExerciseVideo) => {
    Alert.alert(
      'Supprimer la vidéo',
      `Supprimer "${video.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteVideo(video.id);
            await loadVideos();
          },
        },
      ]
    );
  }, [loadVideos]);

  const handleAddPress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Depuis la galerie', 'Lien (YouTube, etc.)'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) handlePickFromGallery();
          if (index === 2) setShowUrlInput(true);
        }
      );
    } else {
      Alert.alert(
        'Ajouter une vidéo',
        '',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Depuis la galerie', onPress: handlePickFromGallery },
          { text: 'Lien (YouTube, etc.)', onPress: () => setShowUrlInput(true) },
        ]
      );
    }
  }, [handlePickFromGallery]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Lecteur vidéo intégré (fichiers locaux uniquement) */}
          {playingVideo && !playingVideo.isUrl && (
            <InlineVideoPlayer
              uri={playingVideo.uri}
              onClose={() => setPlayingVideo(null)}
              accentColor={accentColor}
            />
          )}
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
              <Film size={20} color={accentColor} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                Bibliothèque de mouvements
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* URL Input */}
          {showUrlInput && (
            <View style={[styles.urlInputContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.urlInputLabel, { color: colors.textPrimary }]}>
                Ajouter un lien vidéo
              </Text>
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Titre de la vidéo"
                placeholderTextColor={colors.textMuted}
                value={urlTitleValue}
                onChangeText={setUrlTitleValue}
              />
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="https://youtube.com/..."
                placeholderTextColor={colors.textMuted}
                value={urlInputValue}
                onChangeText={setUrlInputValue}
                autoCapitalize="none"
                keyboardType="url"
              />
              <View style={styles.urlInputActions}>
                <TouchableOpacity
                  style={[styles.urlCancelBtn, { borderColor: colors.border }]}
                  onPress={() => { setShowUrlInput(false); setUrlInputValue(''); setUrlTitleValue(''); }}
                >
                  <Text style={[styles.urlCancelText, { color: colors.textMuted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.urlSaveBtn, { backgroundColor: accentColor }]}
                  onPress={handleAddUrl}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={styles.urlSaveText}>Ajouter</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={videos.length === 0 ? styles.emptyScrollContent : styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {videos.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: accentColor + '15' }]}>
                    <Video size={40} color={accentColor} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Aucune vidéo
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                    Ajoute des vidéos de technique pour visionner les mouvements avant ta séance.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyAddBtn, { backgroundColor: accentColor }]}
                    onPress={handleAddPress}
                  >
                    <Plus size={18} color="#FFF" />
                    <Text style={styles.emptyAddText}>Ajouter une vidéo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.countLabel, { color: colors.textMuted }]}>
                    {videos.length} vidéo{videos.length > 1 ? 's' : ''}
                  </Text>
                  {videos.map((video) => (
                    <View
                      key={video.id}
                      style={[styles.videoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                    >
                      <View style={[styles.thumbnail, { backgroundColor: accentColor + '15' }]}>
                        {video.isUrl ? (
                          <Link size={22} color={accentColor} />
                        ) : (
                          <Film size={22} color={accentColor} />
                        )}
                      </View>
                      <View style={styles.videoInfo}>
                        <Text style={[styles.videoTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {video.title}
                        </Text>
                        <Text style={[styles.videoDate, { color: colors.textMuted }]}>
                          {video.isUrl ? '🔗 Lien' : '📁 Local'} · {formatDate(video.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.videoActions}>
                        <TouchableOpacity
                          style={[styles.playBtn, { backgroundColor: accentColor }]}
                          onPress={() => handlePlay(video)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Play size={16} color="#FFF" fill="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.deleteBtn, { backgroundColor: '#EF444415' }]}
                          onPress={() => handleDelete(video)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <View style={{ height: 100 }} />
                </>
              )}
            </ScrollView>
          )}

          {/* FAB Ajouter */}
          {!loading && videos.length > 0 && !showUrlInput && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: accentColor }]}
              onPress={handleAddPress}
              activeOpacity={0.85}
            >
              <Plus size={24} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
  },
  urlInputContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  urlInputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  urlInputActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  urlCancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  urlCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  urlSaveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlSaveText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  emptyScrollContent: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  emptyAddText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  videoInfo: {
    flex: 1,
    gap: 4,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  videoDate: {
    fontSize: 12,
  },
  videoActions: {
    gap: 8,
    alignItems: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
