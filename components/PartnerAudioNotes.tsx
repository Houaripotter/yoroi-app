// ============================================
// PARTNER AUDIO NOTES · enregistrement vocal 30s
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';

// expo-audio est deja dans package.json. Import dynamique pour eviter crash
// sur ancienne API.
let ExpoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoAudio = require('expo-audio');
} catch {
  ExpoAudio = null;
}

interface AudioNote {
  id: string;
  uri: string;
  date: string;
  durationMs: number;
}

interface Props {
  notes: AudioNote[];
  onChange: (notes: AudioNote[]) => void;
}

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const MAX_DURATION_MS = 30_000; // 30s

export const PartnerAudioNotes: React.FC<Props> = ({ notes, onChange }) => {
  const { colors, isDark } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const recorderRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (recorderRef.current) {
      try { recorderRef.current.stop?.(); } catch { /* ignore */ }
    }
    if (playerRef.current) {
      try { playerRef.current.remove?.(); } catch { /* ignore */ }
    }
  }, []);

  const startRecording = async () => {
    if (!ExpoAudio) {
      Alert.alert('Indisponible', 'expo-audio n\'est pas lie. Rebuild l\'app.');
      return;
    }
    try {
      // Nouvelle API expo-audio (SDK 52+)
      if (typeof ExpoAudio.setAudioModeAsync === 'function') {
        await ExpoAudio.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      }
      // Compat : utiliser la methode disponible selon la version
      let recorder: any;
      if (typeof ExpoAudio.AudioRecorder === 'function') {
        // Nouvelle API (SDK 52+)
        recorder = new ExpoAudio.AudioRecorder(ExpoAudio.RecordingPresets?.HIGH_QUALITY || {});
        await recorder.prepareToRecordAsync?.();
        await recorder.record();
      } else if (ExpoAudio.Recording) {
        // Ancienne API
        recorder = new ExpoAudio.Recording();
        await recorder.prepareToRecordAsync(ExpoAudio.RecordingOptionsPresets?.HIGH_QUALITY || {});
        await recorder.startAsync();
      } else {
        throw new Error('API audio non supportee');
      }
      recorderRef.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      lightHaptic().catch(() => {});

      const startTs = Date.now();
      tickRef.current = setInterval(() => {
        const e = Date.now() - startTs;
        setElapsed(e);
        if (e >= MAX_DURATION_MS) {
          stopRecording();
        }
      }, 100);
    } catch (e) {
      logger.warn('[AudioNote] start error', e);
      errorHaptic().catch(() => {});
      Alert.alert('Erreur', 'Impossible de demarrer l\'enregistrement. Verifie les permissions micro.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;
    try {
      const rec = recorderRef.current;
      let uri: string | null = null;
      if (typeof rec.stop === 'function') {
        await rec.stop();
        uri = rec.uri ?? rec.getURI?.();
      } else if (typeof rec.stopAndUnloadAsync === 'function') {
        await rec.stopAndUnloadAsync();
        uri = rec.getURI?.();
      }
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      const duration = elapsed;
      setIsRecording(false);
      setElapsed(0);
      recorderRef.current = null;

      if (uri) {
        const note: AudioNote = {
          id: makeId(),
          uri,
          date: new Date().toISOString(),
          durationMs: duration,
        };
        onChange([note, ...notes]);
        successHaptic().catch(() => {});
      }
    } catch (e) {
      logger.warn('[AudioNote] stop error', e);
      setIsRecording(false);
    }
  };

  const playNote = async (note: AudioNote) => {
    if (!ExpoAudio) return;
    try {
      if (playerRef.current) {
        try { playerRef.current.pause?.(); playerRef.current.remove?.(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      if (playingId === note.id) {
        setPlayingId(null);
        return;
      }
      let player: any;
      if (typeof ExpoAudio.AudioPlayer === 'function') {
        player = new ExpoAudio.AudioPlayer({ uri: note.uri });
        player.play();
      } else if (ExpoAudio.Sound) {
        const { sound } = await ExpoAudio.Sound.createAsync({ uri: note.uri });
        player = sound;
        await player.playAsync();
      }
      playerRef.current = player;
      setPlayingId(note.id);
      lightHaptic().catch(() => {});
      // Auto-stop apres la duree
      setTimeout(() => {
        setPlayingId(prev => prev === note.id ? null : prev);
      }, note.durationMs + 300);
    } catch (e) {
      logger.warn('[AudioNote] play error', e);
    }
  };

  const removeNote = (id: string) => {
    lightHaptic().catch(() => {});
    onChange(notes.filter(n => n.id !== id));
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Notes audio</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Max 30s · utile juste apres le sparring</Text>
      </View>

      {/* Bouton enregistrement */}
      {isRecording ? (
        <TouchableOpacity onPress={stopRecording} style={[styles.recBtn, { backgroundColor: '#EF4444' }]}>
          <Square size={18} color="#fff" fill="#fff" />
          <Text style={styles.recBtnText}>Arreter · {(elapsed / 1000).toFixed(1)}s</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={startRecording} style={[styles.recBtn, { backgroundColor: '#D4AF37' }]}>
          <Mic size={18} color="#1a1a2e" />
          <Text style={[styles.recBtnText, { color: '#1a1a2e' }]}>Enregistrer une note</Text>
        </TouchableOpacity>
      )}

      {/* Liste des notes */}
      {notes.length > 0 && (
        <View style={{ marginTop: 10, gap: 6 }}>
          {notes.map(n => (
            <View
              key={n.id}
              style={[styles.noteRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
            >
              <TouchableOpacity
                onPress={() => playNote(n)}
                style={[styles.playBtn, { backgroundColor: playingId === n.id ? '#EF4444' : '#10B981' }]}
              >
                {playingId === n.id ? <Pause size={14} color="#fff" /> : <Play size={14} color="#fff" fill="#fff" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.noteDate, { color: colors.text }]}>
                  {new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                </Text>
                <Text style={[styles.noteDuration, { color: colors.textMuted }]}>
                  {(n.durationMs / 1000).toFixed(1)}s
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeNote(n.id)} hitSlop={8}>
                <Trash2 size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: { marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, marginTop: 2 },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
  },
  playBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  noteDate: { fontSize: 12, fontWeight: '700' },
  noteDuration: { fontSize: 10, marginTop: 1 },
});

export default PartnerAudioNotes;
