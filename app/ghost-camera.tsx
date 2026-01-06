// ============================================
// YOROI - CAMERA FANTOME
// ============================================
// Analyse technique avec overlay fantome
// Compare ta technique a une reference

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Camera,
  Ghost,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Layers,
  Video as VideoIcon,
  Circle,
  Square,
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';

// ============================================
// CONSTANTS
// ============================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function GhostCameraScreen() {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video>(null);

  // States
  const [ghostVideo, setGhostVideo] = useState<string | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState(0.5);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');

  // Demander les permissions
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Charger une video fantome
  const loadGhostVideo = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setGhostVideo(result.assets[0].uri);
        setIsPlaying(true);
      }
    } catch (error) {
      logger.error('Erreur chargement video:', error);
      showPopup('Erreur', 'Impossible de charger la video', [
        { text: 'OK', style: 'primary' },
      ]);
    }
  };

  // Demarrer l'enregistrement
  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      setIsRecording(true);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 30, // 30 secondes max
      });

      if (video) {
        setRecordedVideo(video.uri);
        setShowComparison(true);
      }
    } catch (error) {
      logger.error('Erreur enregistrement:', error);
    } finally {
      setIsRecording(false);
    }
  };

  // Arreter l'enregistrement
  const stopRecording = () => {
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  // Toggle lecture video fantome
  const toggleGhostPlayback = async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  // Reset la video fantome
  const resetGhost = async () => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(0);
      await videoRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    setFacing(f => f === 'front' ? 'back' : 'front');
  };

  // Si pas de permission
  if (!permission?.granted) {
    return (
      <ScreenWrapper>
        <View style={styles.permissionContainer}>
          <Ghost size={64} color={colors.textMuted} />
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            Camera requise
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Autorise l'acces a la camera pour utiliser la Camera Fantome
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.gold }]}
            onPress={requestPermission}
          >
            <Text style={[styles.permissionButtonText, { color: colors.background }]}>
              Autoriser la camera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={[styles.backLinkText, { color: colors.textMuted }]}>
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Ghost Video Overlay */}
        {ghostVideo && (
          <View style={[styles.ghostOverlay, { opacity: ghostOpacity }]}>
            <Video
              ref={videoRef}
              source={{ uri: ghostVideo }}
              style={styles.ghostVideo}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={isPlaying}
              isMuted
            />
          </View>
        )}

        {/* Top Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Ghost size={20} color="#FFF" />
            <Text style={styles.topTitle}>CAMERA FANTOME</Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={toggleCamera}
          >
            <RotateCcw size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Ghost Controls (if video loaded) */}
        {ghostVideo && (
          <View style={styles.ghostControls}>
            <View style={[styles.ghostControlsCard, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              {/* Opacity Slider */}
              <View style={styles.opacityRow}>
                <Layers size={16} color="#FFF" />
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  value={ghostOpacity}
                  onValueChange={setGhostOpacity}
                  minimumTrackTintColor={colors.gold}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor={colors.gold}
                />
                <Text style={styles.opacityValue}>{Math.round(ghostOpacity * 100)}%</Text>
              </View>

              {/* Playback Controls */}
              <View style={styles.playbackRow}>
                <TouchableOpacity
                  style={styles.playbackButton}
                  onPress={resetGhost}
                >
                  <RotateCcw size={18} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.playbackButton, { backgroundColor: colors.gold }]}
                  onPress={toggleGhostPlayback}
                >
                  {isPlaying ? (
                    <Pause size={20} color={colors.background} />
                  ) : (
                    <Play size={20} color={colors.background} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playbackButton}
                  onPress={() => {
                    setGhostVideo(null);
                    setIsPlaying(false);
                  }}
                >
                  <Square size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          {/* Load Ghost Video */}
          <TouchableOpacity
            style={[styles.sideButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={loadGhostVideo}
          >
            <Upload size={22} color="#FFF" />
            <Text style={styles.sideButtonText}>Fantome</Text>
          </TouchableOpacity>

          {/* Record Button */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <Square size={32} color="#FFF" fill="#FFF" />
            ) : (
              <Circle size={48} color="#FFF" fill="#EF4444" />
            )}
          </TouchableOpacity>

          {/* View Recording */}
          <TouchableOpacity
            style={[styles.sideButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => {
              if (recordedVideo) {
                setShowComparison(true);
              } else {
                showPopup('Info', 'Enregistre d\'abord une video', [
                  { text: 'OK', style: 'primary' },
                ]);
              }
            }}
          >
            <VideoIcon size={22} color="#FFF" />
            <Text style={styles.sideButtonText}>Replay</Text>
          </TouchableOpacity>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC</Text>
          </View>
        )}
      </CameraView>

      {/* Tips Overlay (when no ghost) */}
      {!ghostVideo && !isRecording && (
        <View style={styles.tipsOverlay}>
          <View style={[styles.tipCard, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <Ghost size={32} color={colors.gold} />
            <Text style={styles.tipTitle}>Comment utiliser</Text>
            <Text style={styles.tipText}>
              1. Charge une video de reference (fantome){'\n'}
              2. Ajuste l'opacite pour voir ton overlay{'\n'}
              3. Positionne-toi et compare ta technique{'\n'}
              4. Enregistre pour revoir ta performance
            </Text>
          </View>
        </View>
      )}

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  ghostOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  ghostVideo: {
    width: '100%',
    height: '100%',
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Ghost Controls
  ghostControls: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    zIndex: 20,
  },
  ghostControlsCard: {
    borderRadius: 16,
    padding: 16,
  },
  opacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  opacityValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  playbackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  sideButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 4,
  },
  sideButtonText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  recordButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
  },

  // Recording Indicator
  recordingIndicator: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 30,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  recordingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Tips
  tipsOverlay: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    zIndex: 15,
  },
  tipCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  tipTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Permission Screen
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  permissionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    marginTop: 20,
    padding: 10,
  },
  backLinkText: {
    fontSize: 14,
  },
});
