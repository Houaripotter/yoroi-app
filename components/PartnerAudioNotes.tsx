// ============================================
// PARTNER AUDIO NOTES : enregistrement vocal 30s
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
  AudioModule,
} from 'expo-audio';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { LOCALE } from '@/lib/i18n/tr';

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

  // Hook recorder (SDK 55+)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const playerRef = useRef<any>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    if (playerRef.current) {
      try { playerRef.current.remove?.(); } catch { /* ignore */ }
    }
  }, []);

  const ensurePermission = async (): Promise<boolean> => {
    try {
      const current = await getRecordingPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) {
        appAlert(
          'Micro bloqué',
          'Autorise le micro pour YOROI dans les réglages de ton téléphone.'
        );
        return false;
      }
      const res = await requestRecordingPermissionsAsync();
      return res.granted;
    } catch (e) {
      logger.warn('[AudioNote] permission error', e);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const ok = await ensurePermission();
      if (!ok) {
        errorHaptic().catch(() => {});
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

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
      appAlert('Enregistrement impossible', 'Vérifie que le micro est autorisé.');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      const duration = elapsed;

      await recorder.stop();
      const uri = recorder.uri;

      setIsRecording(false);
      setElapsed(0);

      // Remettre le mode audio en lecture classique
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch { /* ignore */ }

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
    try {
      // Si on tape sur la note en cours de lecture → pause
      if (playingId === note.id) {
        try { playerRef.current?.pause?.(); } catch { /* ignore */ }
        try { playerRef.current?.remove?.(); } catch { /* ignore */ }
        playerRef.current = null;
        setPlayingId(null);
        if (playTimeoutRef.current) { clearTimeout(playTimeoutRef.current); playTimeoutRef.current = null; }
        return;
      }

      // Nettoyer le precedent
      if (playerRef.current) {
        try { playerRef.current.pause?.(); playerRef.current.remove?.(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      if (playTimeoutRef.current) { clearTimeout(playTimeoutRef.current); playTimeoutRef.current = null; }

      const player = createAudioPlayer({ uri: note.uri });
      playerRef.current = player;
      player.play();
      setPlayingId(note.id);
      lightHaptic().catch(() => {});

      playTimeoutRef.current = setTimeout(() => {
        try { playerRef.current?.remove?.(); } catch { /* ignore */ }
        playerRef.current = null;
        setPlayingId(prev => prev === note.id ? null : prev);
      }, note.durationMs + 400);
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
        <Text style={[styles.sub, { color: colors.textMuted }]}>Max 30s, utile juste apres le sparring</Text>
      </View>

      {/* Bouton enregistrement */}
      {isRecording ? (
        <TouchableOpacity onPress={stopRecording} style={[styles.recBtn, { backgroundColor: '#EF4444' }]}>
          <Square size={18} color="#fff" fill="#fff" />
          <Text style={styles.recBtnText}>Arreter, {(elapsed / 1000).toFixed(1)}s</Text>
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
                  {new Date(n.date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: '2-digit' })}
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
