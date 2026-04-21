// ============================================
// YOROI - MATCH TRACKER EN DIRECT
// ============================================
// Saisie rapide pendant/après un match de tournoi
// Boutons 1 main — timeline reconstructible
// ============================================

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/lib/I18nContext';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { ChevronLeft, Plus, Minus, RotateCcw, Share2, Check, Trophy, Handshake } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

interface MatchEvent {
  id: string;
  timestamp: number; // ms depuis début du match
  type: EventType;
  label: string;
  side: 'me' | 'opponent';
  points?: number;
}

type EventType =
  | 'takedown' | 'guard_pass' | 'sweep' | 'mount' | 'back_control'
  | 'sub_attempt' | 'tap' | 'advantage' | 'penalty' | 'points_custom';

interface MatchResult {
  winner: 'me' | 'opponent' | null;
  method: 'submission' | 'points' | 'decision' | 'disqualification' | null;
  myScore: number;
  oppScore: number;
  events: MatchEvent[];
  duration: number; // secondes
  notes: string;
}

// ============================================
// CONFIG DES BOUTONS
// ============================================

interface ActionButton {
  type: EventType;
  label: string;
  shortLabel: string;
  points: number;
  color: string;
  side: 'me' | 'opponent';
}

const MY_ACTIONS: ActionButton[] = [
  { type: 'takedown', label: 'Takedown', shortLabel: 'TD', points: 2, color: '#3B82F6', side: 'me' },
  { type: 'guard_pass', label: 'Passage garde', shortLabel: 'Pass', points: 3, color: '#8B5CF6', side: 'me' },
  { type: 'sweep', label: 'Sweep', shortLabel: 'Sweep', points: 2, color: '#06B6D4', side: 'me' },
  { type: 'mount', label: 'Montée', shortLabel: 'Mount', points: 4, color: '#F59E0B', side: 'me' },
  { type: 'back_control', label: 'Contrôle dos', shortLabel: 'Dos', points: 4, color: '#F97316', side: 'me' },
  { type: 'sub_attempt', label: 'Tentative sub', shortLabel: 'Sub?', points: 0, color: '#EF4444', side: 'me' },
  { type: 'tap', label: 'TAP ennemi', shortLabel: 'TAP', points: 0, color: '#22C55E', side: 'me' },
  { type: 'advantage', label: 'Avantage', shortLabel: 'Avt', points: 1, color: '#94A3B8', side: 'me' },
];

const OPP_ACTIONS: ActionButton[] = [
  { type: 'takedown', label: 'TD adverse', shortLabel: 'TD', points: 2, color: '#3B82F6', side: 'opponent' },
  { type: 'guard_pass', label: 'Pass adverse', shortLabel: 'Pass', points: 3, color: '#8B5CF6', side: 'opponent' },
  { type: 'sweep', label: 'Sweep adverse', shortLabel: 'Sweep', points: 2, color: '#06B6D4', side: 'opponent' },
  { type: 'sub_attempt', label: 'Sub? adverse', shortLabel: 'Sub?', points: 0, color: '#EF4444', side: 'opponent' },
  { type: 'tap', label: 'JE TAPE', shortLabel: 'TAP', points: 0, color: '#EF4444', side: 'opponent' },
  { type: 'penalty', label: 'Pénalité adv.', shortLabel: 'Pénal', points: 1, color: '#94A3B8', side: 'opponent' },
];

const EVENT_LABELS: Record<EventType, string> = {
  takedown: 'Takedown',
  guard_pass: 'Passage de garde',
  sweep: 'Sweep',
  mount: 'Montée',
  back_control: 'Contrôle dos',
  sub_attempt: 'Tentative soumission',
  tap: 'Tap',
  advantage: 'Avantage',
  penalty: 'Pénalité',
  points_custom: 'Points custom',
};

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = '@yoroi_match_tracker';

async function saveMatch(match: MatchResult): Promise<void> {
  const existing = await loadMatches();
  existing.unshift({ ...match, date: new Date().toISOString() });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
}

async function loadMatches(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ============================================
// COMPOSANT
// ============================================

export default function MatchTrackerScreen() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [phase, setPhase] = useState<'setup' | 'live' | 'result'>('setup');
  const [matchStartTime, setMatchStartTime] = useState<number>(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const elapsed = useRef(0);

  const addEvent = useCallback((action: ActionButton) => {
    impactAsync(action.side === 'me' ? ImpactFeedbackStyle.Medium : ImpactFeedbackStyle.Heavy);
    const now = Date.now();
    const ts = phase === 'live' ? Math.round((now - matchStartTime) / 1000) : 0;

    const event: MatchEvent = {
      id: `${now}_${Math.random()}`,
      timestamp: ts,
      type: action.type,
      label: action.label,
      side: action.side,
      points: action.points,
    };

    setEvents(prev => [...prev, event]);

    if (action.points > 0) {
      if (action.side === 'me') setMyScore(s => s + action.points!);
      else setOppScore(s => s + action.points!);
    }

    if (action.type === 'tap') {
      if (action.side === 'me') {
        // Je tape = opponent wins
        notificationAsync(NotificationFeedbackType.Warning);
      } else {
        // L'ennemi tape = I win
        notificationAsync(NotificationFeedbackType.Success);
      }
    }
  }, [phase, matchStartTime]);

  const handleStartMatch = () => {
    setMatchStartTime(Date.now());
    setPhase('live');
    impactAsync(ImpactFeedbackStyle.Heavy);
  };

  const handleEndMatch = () => {
    elapsed.current = Math.round((Date.now() - matchStartTime) / 1000);
    setPhase('result');
  };

  const handleSave = async () => {
    const winner = myScore > oppScore ? 'me' : oppScore > myScore ? 'opponent' : null;
    const tapEvent = events.find(e => e.type === 'tap');
    const method = tapEvent ? 'submission' : winner ? 'points' : 'decision';

    const match: MatchResult = {
      winner,
      method,
      myScore,
      oppScore,
      events,
      duration: elapsed.current,
      notes,
    };

    try {
      await saveMatch(match);
      setSaved(true);
      impactAsync(ImpactFeedbackStyle.Heavy);
      setTimeout(() => router.back(), 1200);
    } catch (e) {
      logger.error('[MatchTracker] save error:', e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const cardBg = isDark ? (colors.card ?? '#1a1a1a') : '#fff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // ── SETUP ──
  if (phase === 'setup') {
    return (
      <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('matchTracker.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
            {t('matchTracker.readyToRecord')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888', textAlign: 'center', lineHeight: 20 }}>
            {t('matchTracker.tapButtonsHint')}
          </Text>

          <TouchableOpacity
            style={{ backgroundColor: '#22C55E', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 48 }}
            onPress={handleStartMatch}
          >
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{t('matchTracker.startMatch')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 32 }}
            onPress={() => { setPhase('live'); }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{t('matchTracker.postMatchLog')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── LIVE / POST-MATCH ──
  if (phase === 'live') {
    return (
      <View style={[styles.root, { backgroundColor: '#0a0a0a' }]}>
        {/* Score */}
        <View style={[styles.scoreBar, { paddingTop: insets.top + 4 }]}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>{t('matchTracker.me')}</Text>
            <Text style={{ fontSize: 44, fontWeight: '900', color: '#22C55E' }}>{myScore}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            {matchStartTime > 0 && (
              <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '600' }}>
                {formatTime(Math.round((Date.now() - matchStartTime) / 1000))}
              </Text>
            )}
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>VS</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#94A3B8', fontWeight: '700' }}>{t('matchTracker.opponent')}</Text>
            <Text style={{ fontSize: 44, fontWeight: '900', color: '#EF4444' }}>{oppScore}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 20 }}>
          {/* Mes actions */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E', marginBottom: 8, letterSpacing: 1 }}>{t('matchTracker.myActions')}</Text>
          <View style={styles.btnGrid}>
            {MY_ACTIONS.map(action => (
              <TouchableOpacity
                key={`${action.type}_${action.side}`}
                style={[styles.actionBtn, { backgroundColor: `${action.color}22`, borderColor: `${action.color}55` }]}
                onPress={() => addEvent(action)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '900', color: action.color }}>{action.shortLabel}</Text>
                {action.points > 0 && (
                  <View style={{ backgroundColor: action.color, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>+{action.points}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions adversaire */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', marginBottom: 8, marginTop: 14, letterSpacing: 1 }}>{t('matchTracker.opponentActions')}</Text>
          <View style={styles.btnGrid}>
            {OPP_ACTIONS.map(action => (
              <TouchableOpacity
                key={`${action.type}_${action.side}`}
                style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)' }]}
                onPress={() => addEvent(action)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#EF4444' }}>{action.shortLabel}</Text>
                {action.points > 0 && (
                  <View style={{ backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>+{action.points}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Timeline derniers events */}
          {events.length > 0 && (
            <View style={{ marginTop: 14, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 1 }}>{t('matchTracker.timeline')}</Text>
              {events.slice(-5).reverse().map(ev => (
                <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#64748B', minWidth: 32 }}>
                    {formatTime(ev.timestamp)}
                  </Text>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ev.side === 'me' ? '#22C55E' : '#EF4444' }} />
                  <Text style={{ fontSize: 12, color: ev.side === 'me' ? '#22C55E' : '#EF4444', fontWeight: '600' }}>
                    {ev.label}
                    {ev.points ? ` (+${ev.points}pts)` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bouton fin de match */}
        <View style={{ padding: 16, paddingBottom: insets.bottom + 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            onPress={handleEndMatch}
          >
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{t('matchTracker.endMatch')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── RÉSULTAT ──
  const myWin = myScore > oppScore || events.some(e => e.type === 'tap' && e.side === 'opponent');
  const oppWin = oppScore > myScore || events.some(e => e.type === 'tap' && e.side === 'me');

  return (
    <View style={[styles.root, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('matchTracker.matchSummary')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        {/* Résultat */}
        <View style={{
          borderRadius: 20, padding: 24, alignItems: 'center', gap: 8,
          backgroundColor: myWin ? '#22C55E20' : oppWin ? '#EF444420' : cardBg,
          borderWidth: 2, borderColor: myWin ? '#22C55E' : oppWin ? '#EF4444' : cardBorder,
        }}>
          {myWin
            ? <Trophy size={40} color="#F59E0B" />
            : oppWin
            ? <Trophy size={40} color="#6B7280" style={{ transform: [{ scaleX: -1 }] }} />
            : <Handshake size={40} color="#6366F1" />
          }
          <Text style={{ fontSize: 22, fontWeight: '900', color: myWin ? '#22C55E' : oppWin ? '#EF4444' : colors.text }}>
            {myWin ? t('matchTracker.victory') : oppWin ? t('matchTracker.defeat') : t('matchTracker.draw')}
          </Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text }}>{myScore} — {oppScore}</Text>
          {elapsed.current > 0 && (
            <Text style={{ fontSize: 13, color: colors.textMuted ?? '#888' }}>{t('matchTracker.duration')} {formatTime(elapsed.current)}</Text>
          )}
        </View>

        {/* Timeline complète */}
        {events.length > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: cardBorder, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{t('matchTracker.fullTimeline')}</Text>
            <View style={{ gap: 8 }}>
              {events.map(ev => (
                <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', minWidth: 36 }}>
                    {formatTime(ev.timestamp)}
                  </Text>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.side === 'me' ? '#22C55E' : '#EF4444' }} />
                  <Text style={{ flex: 1, fontSize: 13, color: ev.side === 'me' ? '#22C55E' : '#EF4444', fontWeight: '600' }}>
                    {ev.label}
                  </Text>
                  {ev.points != null && ev.points > 0 && (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: ev.side === 'me' ? '#22C55E' : '#EF4444' }}>
                      +{ev.points}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor: cardBorder, padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{t('matchTracker.postMatchNotes')}</Text>
          <TextInput
            style={{ color: colors.text, fontSize: 14, lineHeight: 20, minHeight: 60 }}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('matchTracker.notesPlaceholder')}
            placeholderTextColor={colors.textMuted ?? '#888'}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Sauvegarder */}
        <TouchableOpacity
          style={{ backgroundColor: saved ? '#22C55E' : '#3B82F6', borderRadius: 14, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          onPress={handleSave}
          disabled={saved}
        >
          {saved ? <Check size={18} color="#fff" /> : <Share2 size={18} color="#fff" />}
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>
            {saved ? t('matchTracker.saved') : t('matchTracker.saveMatch')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  scoreBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 32, paddingBottom: 12,
    backgroundColor: '#111',
  },
  btnGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
    minWidth: '22%',
    justifyContent: 'center',
  },
});
