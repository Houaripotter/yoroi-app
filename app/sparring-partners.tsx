// ============================================
// YOROI - CARNET PARTENAIRE TACTIQUE
// ============================================
// Notes tactiques par partenaire de sparring :
// forces, faiblesses, ce qui fonctionne, historique
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
  ChevronRight,
  Trash2,
  Shield,
  Zap,
  Target,
  BookOpen,
  Check,
  X,
  TrendingUp,
  Calendar,
  Swords,
  Flag,
  Trophy,
  AlertCircle,
  Share2,
  Camera,
  Image as ImageIcon,
  BarChart3,
  Mic,
  Crown,
  UserPlus,
  Flame,
  Leaf,
  Sword,
  Star,
  AlertTriangle,
} from 'lucide-react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { getTrainingsByPartnerName, Training, CombatRound } from '@/lib/database';
import logger from '@/lib/security/logger';
import * as FileSystem from 'expo-file-system/legacy';
import { scheduleSparringReminders, requestNotificationPermissions } from '@/lib/sparringNotifications';

// Copie une image dans le dossier permanent de l'app
const saveImagePermanently = async (tempUri: string): Promise<string> => {
  try {
    const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const fileName = `sparring_photo_${Date.now()}.${ext}`;
    const destUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    return destUri;
  } catch (e) {
    logger.warn('saveImagePermanently sparring:', e);
    return tempUri;
  }
};
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { AnimatedCounter } from '@/components/stats/AnimatedCounter';

// ============================================
// TYPES
// ============================================

interface TacticalNote {
  id: string;
  date: string;         // ISO
  content: string;
}

interface Partner {
  id: string;
  name: string;
  belt?: string;
  weight?: string;
  sport?: string;
  photoUri?: string;
  strengths: string[];
  weaknesses: string[];
  whatWorks: string[];
  notes: TacticalNote[];
  matchCount: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  activeGoal?: { text: string; createdAt: string };
  longTermGoal?: { text: string; targetWinRate: number; deadline: string; createdAt: string };
}

const STORAGE_KEY = '@yoroi_sparring_partners';
const BELT_COLORS: Record<string, string> = {
  'blanche': '#ffffff',
  'bleue': '#3B82F6',
  'violette': '#8B5CF6',
  'marron': '#92400E',
  'noire': '#111827',
  'grise': '#6B7280',
  'jaune': '#F59E0B',
  'orange': '#F97316',
  'verte': '#22C55E',
  'rouge': '#EF4444',
};

// ============================================
// HELPERS
// ============================================

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const loadPartners = async (): Promise<Partner[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    // Normalise: certains partenaires créés depuis SparringTab n'ont que { id, name, photoUri }
    return parsed.map(p => ({
      strengths: [],
      weaknesses: [],
      whatWorks: [],
      notes: [],
      matchCount: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      ...p,
    })) as Partner[];
  } catch { return []; }
};

const savePartners = async (partners: Partner[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
    // Notifier les autres écrans (ex: autocomplete dans add-combat-session)
    // pour que la liste se rafraîchisse instantanément sans fermer l'app.
    DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
  } catch { /* storage error - silent fail */ }
};

// ============================================
// SOUS-COMPOSANTS
// ============================================

function TagList({
  items,
  color,
  onAdd,
  onRemove,
  editable,
}: {
  items: string[];
  color: string;
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  editable: boolean;
}) {
  const [draft, setDraft] = useState('');
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 }}>
            <Text style={{ fontSize: 12, color, fontWeight: '600' }}>{item}</Text>
            {editable && (
              <TouchableOpacity onPress={() => onRemove(i)}>
                <X size={10} color={color} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      {editable && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TextInput
            style={{ flex: 1, fontSize: 12, color: colors.text, borderRadius: 8, borderWidth: 1, borderColor: `${color}40`, paddingHorizontal: 10, paddingVertical: 6 }}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ajouter..."
            placeholderTextColor={colors.textMuted ?? '#888'}
            onSubmitEditing={() => {
              if (draft.trim()) { onAdd(draft.trim()); setDraft(''); }
            }}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); } }}
            style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' }}
          >
            <Plus size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ============================================
// ECRAN DÉTAIL PARTENAIRE
// ============================================

// Entrée d'historique : une séance + les rounds avec ce partenaire
interface SessionEntry {
  training: Training;
  rounds: CombatRound[];
}

function SessionHistoryCard({ entry, colors, isDark }: { entry: SessionEntry; colors: any; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { training, rounds } = entry;

  const wins = rounds.filter(r => r.result === 'win').length;
  const losses = rounds.filter(r => r.result === 'loss').length;
  const draws = rounds.filter(r => r.result === 'draw').length;
  const totalRounds = rounds.length;

  const resultColor = wins > losses ? '#22C55E' : losses > wins ? '#EF4444' : '#F59E0B';
  const resultLabel = wins > losses ? 'Victoire' : losses > wins ? 'Défaite' : 'Nul';

  const dateStr = new Date(training.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });

  const hasAnalysis = rounds.some(r => r.gamePlan || r.whatWorked || r.whatDidntWork || r.counteredBy || r.improvement);

  return (
    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: `${resultColor}25` }}>
      {/* Header de la séance */}
      <TouchableOpacity
        onPress={() => setExpanded(v => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}
        activeOpacity={0.7}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${resultColor}20`, justifyContent: 'center', alignItems: 'center' }}>
          <Swords size={16} color={resultColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{dateStr}</Text>
            <View style={{ backgroundColor: `${resultColor}20`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: resultColor }}>{resultLabel}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 2 }}>
            {totalRounds} round{totalRounds > 1 ? 's' : ''} · {wins}V / {losses}D{draws > 0 ? ` / ${draws}N` : ''}
            {training.sport ? ` · ${training.sport.toUpperCase()}` : ''}
          </Text>
        </View>
        {hasAnalysis && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#8B5CF6' }} />}
        {expanded ? <ChevronUp size={14} color={colors.textMuted ?? '#888'} /> : <ChevronDown size={14} color={colors.textMuted ?? '#888'} />}
      </TouchableOpacity>

      {/* Détail des rounds */}
      {expanded && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 10 }}>
          {rounds.map((round, i) => {
            const rc = round.result === 'win' ? '#22C55E' : round.result === 'loss' ? '#EF4444' : round.result === 'draw' ? '#F59E0B' : (colors.textMuted ?? '#888');
            const analysisItems = [
              { label: 'Game plan', value: round.gamePlan, color: '#3B82F6' },
              { label: 'A marché', value: round.whatWorked, color: '#22C55E' },
              { label: "N'a pas marché", value: round.whatDidntWork, color: '#EF4444' },
              { label: 'Contré par', value: round.counteredBy, color: '#F59E0B' },
              { label: 'Amélioration', value: round.improvement, color: '#8B5CF6' },
            ].filter(a => !!a.value);

            return (
              <View key={i} style={{ borderLeftWidth: 2, borderLeftColor: rc, paddingLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Round {round.number}</Text>
                  {round.result && (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: rc }}>
                      {round.result === 'win' ? 'V' : round.result === 'loss' ? 'D' : 'N'}
                    </Text>
                  )}
                  {(round.pointsFor != null || round.pointsAgainst != null) && (
                    <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>
                      {round.pointsFor ?? 0} - {round.pointsAgainst ?? 0}
                    </Text>
                  )}
                  {round.methodsGiven && round.methodsGiven.length > 0 && (
                    <View style={{ backgroundColor: '#22C55E20', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '700' }}>{round.methodsGiven.map(m => getMethodDisplayName(m)).join(', ')}</Text>
                    </View>
                  )}
                </View>
                {round.notes ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: analysisItems.length > 0 ? 6 : 0, lineHeight: 17 }}>{round.notes}</Text>
                ) : null}
                {analysisItems.map(a => (
                  <View key={a.label} style={{ flexDirection: 'row', gap: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: a.color, minWidth: 80 }}>{a.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.text, flex: 1, lineHeight: 17 }}>{a.value}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function PartnerDetail({
  partner,
  onUpdate,
  onClose,
}: {
  partner: Partner;
  onUpdate: (p: Partner) => void;
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<Partner>({ ...partner });
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [goalInput, setGoalInput] = useState(partner.activeGoal?.text ?? '');
  const [editingGoal, setEditingGoal] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showLongTermGoal, setShowLongTermGoal] = useState(false);
  const [ltGoalText, setLtGoalText] = useState(partner.longTermGoal?.text ?? '');
  const [ltGoalRate, setLtGoalRate] = useState(partner.longTermGoal?.targetWinRate ?? 60);
  const [ltGoalDeadline, setLtGoalDeadline] = useState(partner.longTermGoal?.deadline ?? '');
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [voiceNoteText, setVoiceNoteText] = useState('');

  // Charger l'historique des séances depuis la DB
  useEffect(() => {
    const load = async () => {
      try {
        setHistoryLoading(true);
        const trainings = await getTrainingsByPartnerName(partner.name);
        const entries: SessionEntry[] = trainings.map(t => ({
          training: t,
          rounds: (t.combat_rounds ?? []).filter(r => r.partner && r.partner.toLowerCase().includes(partner.name.toLowerCase().trim())),
        })).filter(e => e.rounds.length > 0);
        setSessionHistory(entries);
      } catch (e) {
        logger.error('Erreur chargement historique partenaire:', e);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, [partner.name]);

  // Stats calculées depuis l'historique DB (source de vérité)
  const dbWins = sessionHistory.reduce((s, e) => s + e.rounds.filter(r => r.result === 'win').length, 0);
  const dbLosses = sessionHistory.reduce((s, e) => s + e.rounds.filter(r => r.result === 'loss').length, 0);
  const dbDraws = sessionHistory.reduce((s, e) => s + e.rounds.filter(r => r.result === 'draw').length, 0);
  const dbTotal = dbWins + dbLosses + dbDraws;
  const dbWinRate = dbTotal > 0 ? Math.round((dbWins / dbTotal) * 100) : null;

  // Progression par séance (résultat dominant de chaque séance, du plus récent au plus ancien)
  const progressionBlocks = sessionHistory.map(e => {
    const w = e.rounds.filter(r => r.result === 'win').length;
    const l = e.rounds.filter(r => r.result === 'loss').length;
    const result = w > l ? 'win' : l > w ? 'loss' : 'draw';
    return { result, date: e.training.date };
  });

  // Streak actuel
  const currentStreak = (() => {
    if (progressionBlocks.length === 0) return null;
    const first = progressionBlocks[0].result;
    if (first === 'draw') return null;
    let count = 0;
    for (const b of progressionBlocks) {
      if (b.result === first) count++;
      else break;
    }
    return { type: first as 'win' | 'loss', count };
  })();

  // Patterns : top techniques données / reçues
  const allMethodsGiven = sessionHistory.flatMap(e => e.rounds.flatMap(r => (r.methodsGiven ?? []).map(getMethodDisplayName)));
  const allMethodsTaken = sessionHistory.flatMap(e => e.rounds.flatMap(r => (r.methodsTaken ?? []).map(getMethodDisplayName)));
  const countFreq = (arr: string[]) => {
    const freq: Record<string, number> = {};
    arr.forEach(s => { freq[s] = (freq[s] ?? 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  const topGiven = countFreq(allMethodsGiven);
  const topTaken = countFreq(allMethodsTaken);

  // Dernier objectif d'amélioration
  const lastImprovement = (() => {
    for (const entry of sessionHistory) {
      for (const r of entry.rounds) {
        if (r.improvement) return { text: r.improvement, date: entry.training.date };
      }
    }
    return null;
  })();

  // Ce qui revient le plus souvent dans "Ce qui a marché"
  const allWhatWorked = sessionHistory.flatMap(e => e.rounds.map(r => r.whatWorked).filter(Boolean) as string[]);
  const topWhatWorked = countFreq(allWhatWorked.flatMap(s => s.split(/[,;.]+/).map(w => w.trim()).filter(w => w.length > 3)));

  // Win rate mensuel pour le graphique
  const monthlyStats = (() => {
    const map: Record<string, { wins: number; losses: number; draws: number }> = {};
    for (const entry of sessionHistory) {
      const d = new Date(entry.training.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { wins: 0, losses: 0, draws: 0 };
      for (const r of entry.rounds) {
        if (r.result === 'win') map[key].wins++;
        else if (r.result === 'loss') map[key].losses++;
        else if (r.result === 'draw') map[key].draws++;
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // 6 derniers mois
      .map(([key, v]) => {
        const total = v.wins + v.losses + v.draws;
        const rate = total > 0 ? Math.round((v.wins / total) * 100) : 0;
        const [year, month] = key.split('-');
        const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', { month: 'short' });
        return { key, label, rate, ...v, total };
      });
  })();

  const update = (changes: Partial<Partner>) => {
    setP(prev => ({ ...prev, ...changes }));
    setDirty(true);
  };

  const save = () => {
    onUpdate(p);
    setDirty(false);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: TacticalNote = { id: makeId(), date: new Date().toISOString(), content: newNote.trim() };
    update({ notes: [note, ...p.notes] });
    setNewNote('');
    setShowNoteInput(false);
  };

  // ── Sélection photo ──
  const pickPhoto = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permResult.granted) {
          Alert.alert(
            'Caméra non autorisée',
            'Va dans Réglages > Yoroi > Caméra pour autoriser l\'accès.',
            [{ text: 'OK' }]
          );
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: true,
          aspect: [1, 1],
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          const permanentUri = await saveImagePermanently(result.assets[0].uri);
          update({ photoUri: permanentUri });
          impactAsync(ImpactFeedbackStyle.Medium);
        }
      } else {
        // GALERIE · on NE demande PAS la permission avant launchImageLibraryAsync
        // PHPickerViewController (iOS 14+) n'a PAS besoin de permission
        // et donne accès à TOUTES les photos de la bibliothèque
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: true,
          aspect: [1, 1],
          selectionLimit: 1,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          const permanentUri = await saveImagePermanently(result.assets[0].uri);
          update({ photoUri: permanentUri });
          impactAsync(ImpactFeedbackStyle.Medium);
        }
      }
    } catch (e) {
      logger.error('Erreur sélection photo:', e);
    }
  };

  const choosePhotoSource = () => {
    Alert.alert(
      `Photo de ${p.name}`,
      'Choisis une source',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Caméra', onPress: () => pickPhoto('camera') },
        { text: 'Galerie', onPress: () => pickPhoto('library') },
        ...(p.photoUri ? [{ text: 'Supprimer', style: 'destructive' as const, onPress: () => update({ photoUri: undefined }) }] : []),
      ]
    );
  };

  // ── Stats enrichies : points, soumissions reçues/données, etc. ──
  const enrichedStats = (() => {
    let pointsFor = 0, pointsAgainst = 0;
    const methodsGivenMap: Record<string, number> = {};
    const methodsTakenMap: Record<string, number> = {};
    const intensityCount: Record<string, number> = { guerre: 0, technique: 0, detendu: 0 };
    let totalRating = 0, ratingCount = 0;
    for (const entry of sessionHistory) {
      for (const r of entry.rounds) {
        pointsFor += r.pointsFor ?? 0;
        pointsAgainst += r.pointsAgainst ?? 0;
        for (const m of (r.methodsGiven ?? [])) {
          const key = getMethodDisplayName(m);
          methodsGivenMap[key] = (methodsGivenMap[key] ?? 0) + 1;
        }
        for (const m of (r.methodsTaken ?? [])) {
          const key = getMethodDisplayName(m);
          methodsTakenMap[key] = (methodsTakenMap[key] ?? 0) + 1;
        }
        if (r.roundIntensity) intensityCount[r.roundIntensity] = (intensityCount[r.roundIntensity] ?? 0) + 1;
        if (r.partnerRating) { totalRating += r.partnerRating; ratingCount++; }
      }
    }
    const avgRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : null;
    const topMethodsGiven = Object.entries(methodsGivenMap).sort((a, b) => b[1] - a[1]);
    const topMethodsTaken = Object.entries(methodsTakenMap).sort((a, b) => b[1] - a[1]);
    const totalSubGiven = Object.values(methodsGivenMap).reduce((s, n) => s + n, 0);
    const totalSubTaken = Object.values(methodsTakenMap).reduce((s, n) => s + n, 0);
    return { pointsFor, pointsAgainst, topMethodsGiven, topMethodsTaken, totalSubGiven, totalSubTaken, intensityCount, avgRating };
  })();

  // ── Titre combattant auto-calculé ──
  const fighterTitle = (() => {
    const total = dbWins + dbLosses;
    if (total === 0) return { label: 'ROOKIE', color: '#6B7280', Icon: UserPlus, description: 'Pas encore de round enregistré' };
    if (dbLosses >= 3 && dbWins === 0) return { label: 'NEMESIS', color: '#DC2626', Icon: AlertTriangle, description: `${dbLosses} défaites sans riposte` };
    if (dbWins >= 3 && dbLosses === 0) return { label: 'DOMINATED', color: '#F59E0B', Icon: Crown, description: `${dbWins} victoires consécutives` };
    if (total >= 10) return { label: 'LEGEND', color: '#9333EA', Icon: Swords, description: `${total} rounds ensemble` };
    if (dbTotal >= 5 && Math.abs(dbWins - dbLosses) <= 1) return { label: 'RIVAL', color: '#EF4444', Icon: Flame, description: 'Score équilibré' };
    if (dbWinRate != null && dbWinRate >= 60) return { label: 'FAVORABLE', color: '#22C55E', Icon: Check, description: `${dbWinRate}% de victoires` };
    if (dbWinRate != null && dbWinRate <= 30) return { label: 'CHALLENGE', color: '#F59E0B', Icon: Target, description: 'Matchup difficile' };
    return { label: 'SPARRING', color: '#3B82F6', Icon: Sword, description: `${total} rounds` };
  })();

  // ── Niveau de menace (0-100) basé sur ses victoires + son niveau perçu ──
  const threatLevel = (() => {
    if (dbTotal === 0) return 50;
    const lossRatio = dbTotal > 0 ? (dbLosses / dbTotal) : 0;
    const ratingFactor = (enrichedStats.avgRating ?? 5) / 10;
    return Math.round((lossRatio * 0.6 + ratingFactor * 0.4) * 100);
  })();
  const threatColor = threatLevel >= 70 ? '#DC2626' : threatLevel >= 40 ? '#F59E0B' : '#22C55E';
  const threatLabel = threatLevel >= 70 ? 'ÉLEVÉE' : threatLevel >= 40 ? 'MODÉRÉE' : 'FAIBLE';

  const cardStyle = {
    backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    padding: 14,
    marginBottom: 12,
  };

  const beltColor = p.belt ? (BELT_COLORS[p.belt.toLowerCase()] ?? '#888') : '#888';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F2F2F7' }}>
      {/* Header */}
      <View style={[{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}>
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{p.name}</Text>
          {p.belt && <View style={{ width: 40, height: 5, borderRadius: 2.5, backgroundColor: beltColor, marginTop: 3 }} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.push(`/game-plan?partnerName=${encodeURIComponent(p.name)}` as any)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center' }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Target size={16} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/social-share/duel-card?partnerName=${encodeURIComponent(p.name)}&partnerBelt=${encodeURIComponent(p.belt ?? '')}` as any)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EC489920', justifyContent: 'center', alignItems: 'center' }}
          >
            <Share2 size={16} color="#EC4899" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowBriefing(true)}
            style={{ height: 40, borderRadius: 20, backgroundColor: '#EF444420', paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 5 }}
          >
            <Flag size={14} color="#EF4444" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>Briefing</Text>
          </TouchableOpacity>
          {dirty && (
            <TouchableOpacity onPress={save} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E20', justifyContent: 'center', alignItems: 'center' }}>
              <Check size={20} color="#22C55E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal Briefing pré-combat · full screen, riche, scrollable */}
      <Modal visible={showBriefing} transparent={false} animationType="slide" onRequestClose={() => setShowBriefing(false)}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#0F0F12' : '#F8FAFC' }}>
          {/* Header sticky */}
          <View style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 16,
            paddingBottom: 12,
            backgroundColor: '#EF4444',
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Flag size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 }}>BRIEFING PRÉ-COMBAT</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBriefing(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={18} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Hero : avatar + nom + ceinture + winrate */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: 'rgba(255,255,255,0.22)',
                borderWidth: 2, borderColor: '#FFFFFF',
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {p.photoUri ? (
                  <Image source={{ uri: p.photoUri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#FFFFFF' }}>{p.name.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 }} numberOfLines={1}>
                  {p.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {p.belt ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Ceinture {p.belt}</Text>
                    </View>
                  ) : null}
                  {p.weight ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>{p.weight}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {/* Win rate big */}
              {dbWinRate !== null && (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 }}>{dbWinRate}%</Text>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 }}>WINRATE</Text>
                </View>
              )}
            </View>

            {/* Stats compactes */}
            {dbTotal > 0 && (
              <View style={{ flexDirection: 'row', marginTop: 12, gap: 6 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.25)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{dbWins}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>VICTOIRES</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{dbLosses}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>DÉFAITES</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(245,158,11,0.25)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{dbDraws}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>NULS</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>{dbTotal}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>ROUNDS</Text>
                </View>
              </View>
            )}

            {/* Streak */}
            {currentStreak && currentStreak.count >= 2 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
                <Text style={{ fontSize: 14 }}>{currentStreak.type === 'win' ? '🔥' : '⚠️'}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                  {currentStreak.count} {currentStreak.type === 'win' ? 'victoires' : 'défaites'} d'affilée
                </Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
            {/* OBJECTIF DU JOUR · gros bloc accent violet */}
            {p.activeGoal?.text && (
              <View style={{
                backgroundColor: '#8B5CF6', borderRadius: 16, padding: 16, marginBottom: 14,
                shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Target size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 }}>OBJECTIF DU JOUR</Text>
                </View>
                <Text style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700', lineHeight: 22 }}>{p.activeGoal.text}</Text>
              </View>
            )}

            {/* OBJECTIF LONG TERME */}
            {p.longTermGoal?.text && (
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14, padding: 14, marginBottom: 14,
                borderLeftWidth: 4, borderLeftColor: '#06B6D4',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#06B6D4', letterSpacing: 0.5 }}>🎯 OBJECTIF LONG TERME</Text>
                  {p.longTermGoal.targetWinRate ? (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted ?? '#888' }}>cible {p.longTermGoal.targetWinRate}%</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', lineHeight: 20 }}>{p.longTermGoal.text}</Text>
              </View>
            )}

            {/* DANGERS · ses forces (rouge) */}
            {p.strengths.length > 0 && (
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14, padding: 14, marginBottom: 14,
                borderLeftWidth: 4, borderLeftColor: '#EF4444',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <AlertCircle size={14} color="#EF4444" />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#EF4444', letterSpacing: 0.5 }}>DANGERS · SES POINTS FORTS</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {p.strengths.map((s, i) => (
                    <View key={i} style={{ backgroundColor: '#EF444418', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 12.5, color: '#EF4444', fontWeight: '700' }}>{s}</Text>
                    </View>
                  ))}
                </View>
                {/* Top techniques qu'il a données contre toi */}
                {topTaken.length > 0 && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', marginBottom: 6, letterSpacing: 0.5 }}>SES SOUMISSIONS PRÉFÉRÉES SUR TOI</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {topTaken.map(([name, count], i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444412', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                          <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '700' }}>{name}</Text>
                          <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '900' }}>×{count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* OPPORTUNITÉS · ce qui marche (vert) */}
            {(p.whatWorks.length > 0 || topGiven.length > 0) && (
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14, padding: 14, marginBottom: 14,
                borderLeftWidth: 4, borderLeftColor: '#22C55E',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Zap size={14} color="#22C55E" />
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#22C55E', letterSpacing: 0.5 }}>OPPORTUNITÉS · CE QUI MARCHE</Text>
                </View>
                {p.whatWorks.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {p.whatWorks.map((s, i) => (
                      <View key={i} style={{ backgroundColor: '#22C55E18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 12.5, color: '#22C55E', fontWeight: '700' }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {topGiven.length > 0 && (
                  <View style={{ marginTop: p.whatWorks.length > 0 ? 12 : 0, paddingTop: p.whatWorks.length > 0 ? 12 : 0, borderTopWidth: p.whatWorks.length > 0 ? 1 : 0, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', marginBottom: 6, letterSpacing: 0.5 }}>TES SOUMISSIONS QUI PASSENT</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {topGiven.map(([name, count], i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E12', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                          <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '700' }}>{name}</Text>
                          <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '900' }}>×{count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* FAIBLESSES (orange) */}
            {p.weaknesses.length > 0 && (
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14, padding: 14, marginBottom: 14,
                borderLeftWidth: 4, borderLeftColor: '#F59E0B',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Text style={{ fontSize: 13 }}>⚡</Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#F59E0B', letterSpacing: 0.5 }}>SES FAIBLESSES · À EXPLOITER</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {p.weaknesses.map((s, i) => (
                    <View key={i} style={{ backgroundColor: '#F59E0B18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 12.5, color: '#F59E0B', fontWeight: '700' }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* GAME PLAN + ce qui a marché la dernière fois */}
            {(() => {
              const lastGP = sessionHistory.flatMap(e => e.rounds.map(r => r.gamePlan)).find(Boolean);
              const lastWorked = sessionHistory.flatMap(e => e.rounds.map(r => r.whatWorked)).find(Boolean);
              const lastDidnt = sessionHistory.flatMap(e => e.rounds.map(r => r.whatDidntWork)).find(Boolean);
              if (!lastGP && !lastWorked && !lastDidnt && !lastImprovement) return null;
              return (
                <View style={{
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderRadius: 14, padding: 14, marginBottom: 14,
                  borderLeftWidth: 4, borderLeftColor: '#3B82F6',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Text style={{ fontSize: 13 }}>📋</Text>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#3B82F6', letterSpacing: 0.5 }}>DERNIÈRE SESSION · DEBRIEF</Text>
                  </View>
                  {lastGP && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', marginBottom: 3, letterSpacing: 0.4 }}>GAME PLAN PRÉVU</Text>
                      <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{lastGP}</Text>
                    </View>
                  )}
                  {lastWorked && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#22C55E', marginBottom: 3, letterSpacing: 0.4 }}>✓ CE QUI A MARCHÉ</Text>
                      <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{lastWorked}</Text>
                    </View>
                  )}
                  {lastDidnt && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444', marginBottom: 3, letterSpacing: 0.4 }}>✗ CE QUI N'A PAS MARCHÉ</Text>
                      <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{lastDidnt}</Text>
                    </View>
                  )}
                  {lastImprovement && (
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#A855F7', marginBottom: 3, letterSpacing: 0.4 }}>→ PISTE D'AMÉLIORATION</Text>
                      <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{lastImprovement.text}</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* PROGRESSION récente · mini timeline */}
            {progressionBlocks.length > 0 && (
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14, padding: 14, marginBottom: 14,
                borderLeftWidth: 4, borderLeftColor: '#A855F7',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Text style={{ fontSize: 13 }}>📊</Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#A855F7', letterSpacing: 0.5 }}>PROGRESSION · {progressionBlocks.length} DERNIÈRES SESSIONS</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  {progressionBlocks.slice(0, 20).map((b, i) => (
                    <View
                      key={i}
                      style={{
                        width: 22, height: 22, borderRadius: 6,
                        backgroundColor: b.result === 'win' ? '#22C55E' : b.result === 'loss' ? '#EF4444' : '#F59E0B',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>
                        {b.result === 'win' ? 'V' : b.result === 'loss' ? 'D' : 'N'}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginTop: 8, fontStyle: 'italic' }}>
                  Du plus récent (gauche) au plus ancien
                </Text>
              </View>
            )}

            {/* NOTES TACTIQUES · 3 dernières */}
            {p.notes.length > 0 && (
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14, padding: 14, marginBottom: 14,
                borderLeftWidth: 4, borderLeftColor: '#64748B',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Text style={{ fontSize: 13 }}>📝</Text>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 }}>NOTES TACTIQUES RÉCENTES</Text>
                </View>
                {p.notes.slice(0, 3).map((n, i) => (
                  <View key={n.id} style={{ marginBottom: i < Math.min(p.notes.length, 3) - 1 ? 10 : 0, paddingBottom: i < Math.min(p.notes.length, 3) - 1 ? 10 : 0, borderBottomWidth: i < Math.min(p.notes.length, 3) - 1 ? 1 : 0, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888', marginBottom: 3, fontWeight: '700', letterSpacing: 0.3 }}>
                      {new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{n.content}</Text>
                  </View>
                ))}
                {p.notes.length > 3 && (
                  <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 8, fontStyle: 'italic' }}>
                    +{p.notes.length - 3} autre{p.notes.length - 3 > 1 ? 's' : ''} dans la fiche complète
                  </Text>
                )}
              </View>
            )}

            {/* Empty state si rien */}
            {!p.activeGoal?.text && !p.longTermGoal?.text && p.strengths.length === 0 && p.weaknesses.length === 0 && p.whatWorks.length === 0 && p.notes.length === 0 && sessionHistory.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🥋</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted ?? '#888', textAlign: 'center', maxWidth: 280, lineHeight: 20 }}>
                  Remplis le profil de {p.name} (forces, faiblesses, ce qui marche) pour avoir un briefing complet avant ton prochain sparring.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Note Rapide */}
      <Modal visible={showVoiceNote} transparent animationType="slide" onRequestClose={() => setShowVoiceNote(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Mic size={18} color={colors.text} />
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Note rapide</Text>
                </View>
                <TouchableOpacity onPress={() => setShowVoiceNote(false)}>
                  <X size={20} color={colors.textMuted ?? '#888'} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 10, lineHeight: 17 }}>
                Tape tes observations post-sparring pendant qu'elles sont encore fraîches.
              </Text>
              <TextInput
                style={{ fontSize: 15, color: colors.text, borderRadius: 12, borderWidth: 1, borderColor: '#EF444440', paddingHorizontal: 14, paddingVertical: 12, minHeight: 100, textAlignVertical: 'top', backgroundColor: isDark ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.03)', lineHeight: 22 }}
                value={voiceNoteText}
                onChangeText={setVoiceNoteText}
                placeholder={`Qu'est-ce qui s'est passé contre ${p.name} aujourd'hui ?`}
                placeholderTextColor={colors.textMuted ?? '#888'}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  if (!voiceNoteText.trim()) return;
                  impactAsync(ImpactFeedbackStyle.Medium);
                  const note: TacticalNote = { id: makeId(), date: new Date().toISOString(), content: voiceNoteText.trim() };
                  update({ notes: [note, ...p.notes] });
                  setVoiceNoteText('');
                  setShowVoiceNote(false);
                }}
                style={{ backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Enregistrer la note</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 280 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior="automatic">

        {/* ════════════════════════════════════════════════
            🥊 FIGHTER CARD · Hero stylée façon UFC / EA Sports
            ════════════════════════════════════════════════ */}
        <View style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 12, backgroundColor: isDark ? '#0a0a0a' : '#1a1a1a', shadowColor: fighterTitle.color, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18, elevation: 10 }}>
          {/* Photo + overlay */}
          <TouchableOpacity
            onPress={choosePhotoSource}
            activeOpacity={0.9}
            style={{ width: '100%', height: 320, position: 'relative', backgroundColor: '#0a0a0a' }}
          >
            {p.photoUri ? (
              <Image source={{ uri: p.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[`${fighterTitle.color}30`, '#0a0a0a']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}
              >
                <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: `${fighterTitle.color}25`, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: `${fighterTitle.color}60` }}>
                  <User size={62} color={fighterTitle.color} strokeWidth={1.5} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Camera size={14} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Ajouter une photo</Text>
                </View>
              </LinearGradient>
            )}

            {/* Gradient dark bottom pour lisibilité du nom */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.5, 1]}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 }}
            />

            {/* Badge TITRE en haut à gauche */}
            <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: fighterTitle.color, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, shadowColor: fighterTitle.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8 }}>
              <fighterTitle.Icon size={14} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>{fighterTitle.label}</Text>
            </View>

            {/* Badge NOTE en haut à droite */}
            {enrichedStats.avgRating != null && (
              <View style={{ position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: enrichedStats.avgRating <= 3 ? '#22C55E' : enrichedStats.avgRating <= 6 ? '#F59E0B' : enrichedStats.avgRating <= 8 ? '#EF4444' : '#9333EA' }}>
                <Text style={{ fontSize: 13 }}>⭐</Text>
                <Text style={{ fontSize: 13, fontWeight: '900', color: enrichedStats.avgRating <= 3 ? '#22C55E' : enrichedStats.avgRating <= 6 ? '#F59E0B' : enrichedStats.avgRating <= 8 ? '#EF4444' : '#9333EA' }}>
                  {enrichedStats.avgRating}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>/10</Text>
              </View>
            )}

            {/* Indicateur caméra en bas à droite (si photo existe) */}
            {p.photoUri && (
              <View style={{ position: 'absolute', bottom: 14, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                <Camera size={15} color="#fff" />
              </View>
            )}

            {/* Nom + sous-titre en bas */}
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }} numberOfLines={1} adjustsFontSizeToFit>
                {p.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {p.belt && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: beltColor }}>
                    <View style={{ width: 14, height: 5, borderRadius: 1, backgroundColor: beltColor }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>{p.belt}</Text>
                  </View>
                )}
                {p.sport && <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>{p.sport.toUpperCase()}</Text>}
                {p.weight && <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>· {p.weight}</Text>}
              </View>
            </View>
          </TouchableOpacity>

          {/* ── Barre de menace (si des données) ── */}
          {dbTotal > 0 && (
            <View style={{ backgroundColor: '#0a0a0a', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={10} color="rgba(255,255,255,0.5)" />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>NIVEAU DE MENACE</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '900', color: threatColor, letterSpacing: 0.5 }}>{threatLabel} · {threatLevel}%</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#22C55E', '#F59E0B', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ width: `${threatLevel}%` as any, height: '100%', borderRadius: 3 }}
                />
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontStyle: 'italic' }}>
                {fighterTitle.description}
              </Text>
            </View>
          )}

          {/* ── Stats record (V/D/N + win rate) ── */}
          {dbTotal > 0 && (
            <View style={{ flexDirection: 'row', backgroundColor: '#111', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#22C55E' }}>{dbWins}</Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(34,197,94,0.8)', marginTop: 2, letterSpacing: 1 }}>WINS</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#EF4444' }}>{dbLosses}</Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(239,68,68,0.8)', marginTop: 2, letterSpacing: 1 }}>LOSSES</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#F59E0B' }}>{dbDraws}</Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(245,158,11,0.8)', marginTop: 2, letterSpacing: 1 }}>DRAWS</Text>
              </View>
              <View style={{ flex: 1.2, alignItems: 'center', paddingVertical: 14, backgroundColor: dbWinRate != null && dbWinRate >= 50 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: dbWinRate != null && dbWinRate >= 50 ? '#22C55E' : '#EF4444' }}>
                  {dbWinRate != null ? `${dbWinRate}%` : '·'}
                </Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', marginTop: 2, letterSpacing: 1 }}>WIN RATE</Text>
              </View>
            </View>
          )}
        </View>

        {/* ════════════════════════════════════════════════
            ⚔️ TALE OF THE TAPE · scorecard comparatif MOI vs LUI
            ════════════════════════════════════════════════ */}
        {dbTotal > 0 && (() => {
          const rows = [
            { label: 'Points', me: enrichedStats.pointsFor, him: enrichedStats.pointsAgainst, fmt: (v: number) => String(v) },
            { label: 'Soumissions', me: enrichedStats.totalSubGiven, him: enrichedStats.totalSubTaken, fmt: (v: number) => String(v) },
            { label: 'Victoires', me: dbWins, him: dbLosses, fmt: (v: number) => String(v) },
          ];
          const maxOf = (m: number, h: number) => Math.max(m, h, 1);
          return (
            <View style={[cardStyle, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                <View style={{ width: 4, height: 14, backgroundColor: '#EC4899', borderRadius: 2 }} />
                <Text style={{ fontSize: 11, fontWeight: '900', color: colors.text, letterSpacing: 2 }}>TALE OF THE TAPE</Text>
                <View style={{ width: 4, height: 14, backgroundColor: '#EC4899', borderRadius: 2 }} />
              </View>

              {/* Entêtes MOI / LUI */}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#22C55E', letterSpacing: 1 }}>MOI</Text>
                </View>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: colors.textMuted ?? '#888' }}>VS</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#EF4444', letterSpacing: 1 }}>{p.name.toUpperCase()}</Text>
                </View>
              </View>

              {rows.map(row => {
                const max = maxOf(row.me, row.him);
                const mePct = (row.me / max) * 100;
                const himPct = (row.him / max) * 100;
                const meWin = row.me > row.him;
                const himWin = row.him > row.me;
                return (
                  <View key={row.label} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* Valeur MOI */}
                      <Text style={{ width: 38, textAlign: 'right', fontSize: 16, fontWeight: '900', color: meWin ? '#22C55E' : colors.text }}>
                        {row.fmt(row.me)}
                      </Text>
                      {/* Barre MOI (de droite à gauche) */}
                      <View style={{ flex: 1, height: 8, marginHorizontal: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${mePct}%` as any, backgroundColor: meWin ? '#22C55E' : '#22C55E60', borderRadius: 4 }} />
                      </View>
                      {/* Label centre */}
                      <Text style={{ width: 90, textAlign: 'center', fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', letterSpacing: 0.5 }}>
                        {row.label.toUpperCase()}
                      </Text>
                      {/* Barre LUI (de gauche à droite) */}
                      <View style={{ flex: 1, height: 8, marginHorizontal: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${himPct}%` as any, backgroundColor: himWin ? '#EF4444' : '#EF444460', borderRadius: 4 }} />
                      </View>
                      {/* Valeur LUI */}
                      <Text style={{ width: 38, fontSize: 16, fontWeight: '900', color: himWin ? '#EF4444' : colors.text }}>
                        {row.fmt(row.him)}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Répartition intensité (en bas de la scorecard) */}
              {(enrichedStats.intensityCount.guerre + enrichedStats.intensityCount.technique + enrichedStats.intensityCount.detendu) > 0 && (
                <View style={{ marginTop: 8, flexDirection: 'row', gap: 6 }}>
                  {enrichedStats.intensityCount.guerre > 0 && (
                    <View style={{ flex: 1, backgroundColor: '#EF444410', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                      <Zap size={18} color="#EF4444" />
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#EF4444' }}>{enrichedStats.intensityCount.guerre}</Text>
                      <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '800', letterSpacing: 0.5 }}>GUERRE</Text>
                    </View>
                  )}
                  {enrichedStats.intensityCount.technique > 0 && (
                    <View style={{ flex: 1, backgroundColor: '#3B82F610', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                      <Target size={18} color="#3B82F6" />
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#3B82F6' }}>{enrichedStats.intensityCount.technique}</Text>
                      <Text style={{ fontSize: 9, color: '#3B82F6', fontWeight: '800', letterSpacing: 0.5 }}>TECHNIQUE</Text>
                    </View>
                  )}
                  {enrichedStats.intensityCount.detendu > 0 && (
                    <View style={{ flex: 1, backgroundColor: '#22C55E10', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                      <Leaf size={18} color="#22C55E" />
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#22C55E' }}>{enrichedStats.intensityCount.detendu}</Text>
                      <Text style={{ fontSize: 9, color: '#22C55E', fontWeight: '800', letterSpacing: 0.5 }}>DÉTENDU</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })()}

        {/* ════════════════════════════════════════════════
            🗡️ ARSENAL · détail des finitions (qui finit qui par quoi)
            ════════════════════════════════════════════════ */}
        {dbTotal > 0 && (enrichedStats.topMethodsTaken.length > 0 || enrichedStats.topMethodsGiven.length > 0) && (
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
              <View style={{ width: 4, height: 14, backgroundColor: '#F59E0B', borderRadius: 2 }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: colors.text, letterSpacing: 2 }}>ARSENAL TECHNIQUE</Text>
              <View style={{ width: 4, height: 14, backgroundColor: '#F59E0B', borderRadius: 2 }} />
            </View>

            {/* Ses armes (finitions qu'il t'a faites) */}
            {enrichedStats.topMethodsTaken.length > 0 && (
              <View style={{ marginBottom: enrichedStats.topMethodsGiven.length > 0 ? 12 : 0, backgroundColor: isDark ? '#2a0f0f' : '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EF444430' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                    <Swords size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444', letterSpacing: 1 }}>SES ARMES CONTRE MOI</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#ffa4a4' : '#991b1b', fontWeight: '600' }}>{p.name} m'a fini {enrichedStats.totalSubTaken}×</Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  {enrichedStats.topMethodsTaken.map(([m, count], idx) => {
                    const pct = (count / enrichedStats.topMethodsTaken[0][1]) * 100;
                    return (
                      <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ width: 18, fontSize: 11, fontWeight: '900', color: '#EF4444', textAlign: 'center' }}>#{idx + 1}</Text>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: isDark ? '#ffa4a4' : '#991b1b' }}>{m}</Text>
                        <View style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: 'rgba(239,68,68,0.15)', overflow: 'hidden' }}>
                          <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: '#EF4444', borderRadius: 3 }} />
                        </View>
                        <Text style={{ width: 26, textAlign: 'right', fontSize: 12, fontWeight: '900', color: '#EF4444' }}>×{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Mes armes (finitions que tu lui as faites) */}
            {enrichedStats.topMethodsGiven.length > 0 && (
              <View style={{ backgroundColor: isDark ? '#0f2a18' : '#f0fdf4', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#22C55E30' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                    <Sword size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#22C55E', letterSpacing: 1 }}>MES ARMES CONTRE LUI</Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#86efac' : '#166534', fontWeight: '600' }}>Je l'ai fini {enrichedStats.totalSubGiven}×</Text>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  {enrichedStats.topMethodsGiven.map(([m, count], idx) => {
                    const pct = (count / enrichedStats.topMethodsGiven[0][1]) * 100;
                    return (
                      <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ width: 18, fontSize: 11, fontWeight: '900', color: '#22C55E', textAlign: 'center' }}>#{idx + 1}</Text>
                        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: isDark ? '#86efac' : '#166534' }}>{m}</Text>
                        <View style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: 'rgba(34,197,94,0.15)', overflow: 'hidden' }}>
                          <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: '#22C55E', borderRadius: 3 }} />
                        </View>
                        <Text style={{ width: 26, textAlign: 'right', fontSize: 12, fontWeight: '900', color: '#22C55E' }}>×{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Objectif actif épinglé */}
        <View style={[cardStyle, { borderColor: p.activeGoal?.text ? '#8B5CF640' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)') }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Target size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Objectif actif</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {p.activeGoal?.text && !editingGoal && (
                <TouchableOpacity
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Medium);
                    const achievedNote: TacticalNote = {
                      id: makeId(),
                      date: new Date().toISOString(),
                      content: `✓ Objectif atteint : ${p.activeGoal!.text}`,
                    };
                    update({ activeGoal: undefined, notes: [achievedNote, ...p.notes] });
                    setGoalInput('');
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
                >
                  <Check size={12} color="#22C55E" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#22C55E' }}>Atteint !</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setEditingGoal(v => !v)}
                style={{ backgroundColor: '#8B5CF615', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }}>{editingGoal ? 'Annuler' : p.activeGoal?.text ? 'Modifier' : '+ Définir'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!editingGoal && p.activeGoal?.text ? (
            <View style={{ backgroundColor: '#8B5CF610', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 14, color: colors.text, fontWeight: '600', lineHeight: 20 }}>{p.activeGoal.text}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginTop: 4 }}>
                Depuis le {new Date(p.activeGoal.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ) : !editingGoal ? (
            <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 6 }}>
              Aucun objectif défini. Fixe-toi un objectif pour ta prochaine séance.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              <TextInput
                style={{ fontSize: 13, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: '#8B5CF640', paddingHorizontal: 12, paddingVertical: 10, minHeight: 70, textAlignVertical: 'top', backgroundColor: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)' }}
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="Ex : travailler ma garde papillon, finir par triangle..."
                placeholderTextColor={colors.textMuted ?? '#888'}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  if (!goalInput.trim()) return;
                  impactAsync(ImpactFeedbackStyle.Medium);
                  update({ activeGoal: { text: goalInput.trim(), createdAt: new Date().toISOString() } });
                  setEditingGoal(false);
                }}
                style={{ backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Enregistrer l'objectif</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Infos de base */}
        <View style={cardStyle}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Profil</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginBottom: 4 }}>Ceinture</Text>
              <TextInput
                style={{ fontSize: 13, color: colors.text, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                value={p.belt ?? ''}
                onChangeText={v => update({ belt: v })}
                placeholder="bleue, violette..."
                placeholderTextColor={colors.textMuted ?? '#888'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginBottom: 4 }}>Sport</Text>
              <TextInput
                style={{ fontSize: 13, color: colors.text, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                value={p.sport ?? ''}
                onChangeText={v => update({ sport: v })}
                placeholder="BJJ, MMA..."
                placeholderTextColor={colors.textMuted ?? '#888'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginBottom: 4 }}>Catégorie</Text>
              <TextInput
                style={{ fontSize: 13, color: colors.text, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                value={p.weight ?? ''}
                onChangeText={v => update({ weight: v })}
                placeholder="-77kg, lourds..."
                placeholderTextColor={colors.textMuted ?? '#888'}
              />
            </View>
          </View>
        </View>

        {/* Objectif long terme */}
        <View style={[cardStyle, { borderColor: p.longTermGoal ? '#3B82F640' : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)') }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Trophy size={14} color="#3B82F6" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Objectif long terme</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLongTermGoal(v => !v)}
              style={{ backgroundColor: '#3B82F615', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#3B82F6' }}>
                {showLongTermGoal ? 'Annuler' : p.longTermGoal ? 'Modifier' : '+ Définir'}
              </Text>
            </TouchableOpacity>
          </View>

          {!showLongTermGoal && p.longTermGoal ? (() => {
            const daysLeft = Math.ceil((new Date(p.longTermGoal.deadline).getTime() - Date.now()) / 86400000);
            const progress = dbWinRate ?? 0;
            const target = p.longTermGoal.targetWinRate;
            const pct = Math.min(100, Math.round((progress / target) * 100));
            return (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{p.longTermGoal.text}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>
                    {progress}% → objectif {target}%
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: daysLeft > 0 ? '#3B82F6' : '#EF4444' }}>
                    {daysLeft > 0 ? `J-${daysLeft}` : 'Délai dépassé'}
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: pct >= 100 ? '#22C55E' : '#3B82F6', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', textAlign: 'right' }}>{pct}% de l'objectif atteint</Text>
                {pct >= 100 && (
                  <TouchableOpacity
                    onPress={() => { impactAsync(ImpactFeedbackStyle.Medium); update({ longTermGoal: undefined }); }}
                    style={{ backgroundColor: '#22C55E20', borderRadius: 8, paddingVertical: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                  >
                    <Trophy size={13} color="#22C55E" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#22C55E' }}>Objectif atteint !</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })() : !showLongTermGoal ? (
            <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 6 }}>
              Fixe un objectif de win rate à atteindre avant une date donnée.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput
                style={{ fontSize: 13, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F640', paddingHorizontal: 12, paddingVertical: 9, backgroundColor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)' }}
                value={ltGoalText}
                onChangeText={setLtGoalText}
                placeholder="Ex : Dominer Hedi en garde fermée"
                placeholderTextColor={colors.textMuted ?? '#888'}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6', marginBottom: 4 }}>OBJECTIF WIN RATE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F610', borderRadius: 10, padding: 8 }}>
                    <TouchableOpacity onPress={() => setLtGoalRate(r => Math.max(10, r - 10))}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#3B82F6' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ flex: 1, fontSize: 18, fontWeight: '900', color: '#3B82F6', textAlign: 'center' }}>{ltGoalRate}%</Text>
                    <TouchableOpacity onPress={() => setLtGoalRate(r => Math.min(100, r + 10))}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#3B82F6' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6', marginBottom: 4 }}>DATE LIMITE</Text>
                  <TextInput
                    style={{ fontSize: 13, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F640', paddingHorizontal: 10, paddingVertical: 9, backgroundColor: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)' }}
                    value={ltGoalDeadline}
                    onChangeText={setLtGoalDeadline}
                    placeholder="2025-06-01"
                    placeholderTextColor={colors.textMuted ?? '#888'}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!ltGoalText.trim() || !ltGoalDeadline.trim()) return;
                  impactAsync(ImpactFeedbackStyle.Medium);
                  update({ longTermGoal: { text: ltGoalText.trim(), targetWinRate: ltGoalRate, deadline: ltGoalDeadline.trim(), createdAt: new Date().toISOString() } });
                  setShowLongTermGoal(false);
                }}
                style={{ backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Enregistrer l'objectif</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bilan sparring · calculé depuis les vraies séances */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={14} color="#22C55E" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Bilan sparring</Text>
            {dbTotal > 0 && (
              <View style={{ backgroundColor: '#22C55E15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E' }}>{dbTotal} rounds</Text>
              </View>
            )}
          </View>
          {historyLoading ? (
            <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 8 }}>Chargement...</Text>
          ) : dbTotal === 0 ? (
            <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 8 }}>
              Aucun round enregistré avec {p.name}.{'\n'}Commence une séance et indique son nom dans les rounds.
            </Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Victoires', value: dbWins, color: '#22C55E' },
                  { label: 'Défaites', value: dbLosses, color: '#EF4444' },
                  { label: 'Nuls', value: dbDraws, color: '#F59E0B' },
                ].map(({ label, value, color }) => (
                  <View key={label} style={{ flex: 1, backgroundColor: `${color}15`, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginBottom: 4 }}>{label}</Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color }}>{value}</Text>
                  </View>
                ))}
              </View>
              {dbWinRate !== null && (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>Taux de victoire</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: dbWinRate >= 50 ? '#22C55E' : '#EF4444' }}>{dbWinRate}%</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${dbWinRate}%` as any, height: '100%', backgroundColor: dbWinRate >= 50 ? '#22C55E' : '#EF4444', borderRadius: 3 }} />
                  </View>
                </View>
              )}
              <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginTop: 8, textAlign: 'center' }}>
                Sur {sessionHistory.length} séance{sessionHistory.length > 1 ? 's' : ''}
              </Text>
            </>
          )}
        </View>

        {/* ── HISTORIQUE DES NOTES · évolution niveau perçu ── */}
        {(() => {
          const ratings: { date: string; rating: number; roundNum: number }[] = [];
          for (const entry of [...sessionHistory].reverse()) {
            for (const r of entry.rounds) {
              if (r.partnerRating) {
                ratings.push({ date: entry.training.date, rating: r.partnerRating, roundNum: r.number });
              }
            }
          }
          if (ratings.length === 0) return null;
          const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
          const avgRounded = Math.round(avg * 10) / 10;
          const avgColor = avg <= 3 ? '#22C55E' : avg <= 6 ? '#F59E0B' : avg <= 8 ? '#EF4444' : '#9333EA';
          const minRating = Math.min(...ratings.map(r => r.rating));
          const maxRating = Math.max(...ratings.map(r => r.rating));
          const first = ratings[0].rating;
          const last = ratings[ratings.length - 1].rating;
          const trend = last - first;

          return (
            <View style={cardStyle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Niveau perçu · par round</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${avgColor}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: avgColor }}>Moy : {avgRounded}/10</Text>
                </View>
              </View>

              {/* Stats min/max/trend */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted ?? '#888' }}>MIN</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{minRating}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted ?? '#888' }}>MAX</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{maxRating}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted ?? '#888' }}>ROUNDS</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{ratings.length}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: trend > 0 ? '#EF444410' : trend < 0 ? '#22C55E10' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: trend > 0 ? '#EF4444' : trend < 0 ? '#22C55E' : colors.textMuted ?? '#888' }}>TENDANCE</Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: trend > 0 ? '#EF4444' : trend < 0 ? '#22C55E' : colors.text }}>
                    {trend > 0 ? '↑' : trend < 0 ? '↓' : '='}{trend !== 0 ? Math.abs(trend) : ''}
                  </Text>
                </View>
              </View>

              {/* Mini courbe / barres */}
              {ratings.length >= 2 && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 70, marginBottom: 4 }}>
                    {ratings.map((r, i) => {
                      const barH = (r.rating / 10) * 60;
                      const barColor = r.rating <= 3 ? '#22C55E' : r.rating <= 6 ? '#F59E0B' : r.rating <= 8 ? '#EF4444' : '#9333EA';
                      const isLast = i === ratings.length - 1;
                      return (
                        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: barColor }}>{r.rating}</Text>
                          <View style={{ width: '100%', height: Math.max(4, barH), borderRadius: 3, backgroundColor: isLast ? barColor : `${barColor}70`, borderWidth: isLast ? 1.5 : 0, borderColor: barColor }} />
                        </View>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888' }}>← plus ancien</Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888' }}>plus récent →</Text>
                  </View>
                </View>
              )}

              {/* Message interprétatif */}
              <View style={{ marginTop: 10, padding: 8, backgroundColor: `${avgColor}10`, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: avgColor }}>
                <Text style={{ fontSize: 11, color: colors.text, lineHeight: 16 }}>
                  {trend > 1 && `↑ Tu le perçois ${trend} pts plus fort qu'au début · il s'améliore.`}
                  {trend < -1 && `↓ Tu le perçois ${Math.abs(trend)} pts moins fort qu'au début · tu progresses sur lui.`}
                  {trend === 0 && `→ Niveau stable à travers les rounds.`}
                  {trend === 1 && `↑ Légère montée en puissance.`}
                  {trend === -1 && `↓ Tu commences à le dominer légèrement.`}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Progression dans le temps */}
        {!historyLoading && progressionBlocks.length > 0 && (
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} color="#3B82F6" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Progression</Text>
              </View>
              {currentStreak && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: currentStreak.type === 'win' ? '#22C55E15' : '#EF444415', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  {currentStreak.type === 'win'
                    ? <Flame size={11} color="#22C55E" />
                    : <Shield size={11} color="#EF4444" />}
                  <Text style={{ fontSize: 11, fontWeight: '800', color: currentStreak.type === 'win' ? '#22C55E' : '#EF4444' }}>
                    {currentStreak.count} série {currentStreak.type === 'win' ? 'V' : 'D'}
                  </Text>
                </View>
              )}
            </View>

            {/* Timeline de progression · dernier à gauche */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 4 }}>
                {progressionBlocks.map((b, i) => {
                  const bc = b.result === 'win' ? '#22C55E' : b.result === 'loss' ? '#EF4444' : '#F59E0B';
                  const letter = b.result === 'win' ? 'V' : b.result === 'loss' ? 'D' : 'N';
                  const shortDate = new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
                  return (
                    <View key={i} style={{ alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: `${bc}${i === 0 ? 'FF' : '80'}`, justifyContent: 'center', alignItems: 'center', borderWidth: i === 0 ? 2 : 0, borderColor: bc }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: i === 0 ? '#fff' : bc }}>{letter}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888' }}>{shortDate}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>← plus récent · plus ancien →</Text>

            {/* Graphique win rate mensuel */}
            {monthlyStats.length >= 2 && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted ?? '#888', marginBottom: 8 }}>WIN RATE PAR MOIS</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 70 }}>
                  {monthlyStats.map((m, i) => {
                    const barH = Math.max(4, Math.round((m.rate / 100) * 60));
                    const barColor = m.rate >= 60 ? '#22C55E' : m.rate >= 40 ? '#F59E0B' : '#EF4444';
                    const isLast = i === monthlyStats.length - 1;
                    return (
                      <View key={m.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: barColor }}>{m.rate}%</Text>
                        <View style={{
                          width: '100%', height: barH, borderRadius: 4,
                          backgroundColor: isLast ? barColor : `${barColor}70`,
                          borderWidth: isLast ? 1.5 : 0, borderColor: barColor,
                        }} />
                        <Text style={{ fontSize: 9, color: colors.textMuted ?? '#888' }}>{m.label}</Text>
                      </View>
                    );
                  })}
                </View>
                {(() => {
                  const first = monthlyStats[0].rate;
                  const last = monthlyStats[monthlyStats.length - 1].rate;
                  const diff = last - first;
                  if (Math.abs(diff) < 5) return null;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <TrendingUp size={11} color={diff > 0 ? '#22C55E' : '#EF4444'} />
                      <Text style={{ fontSize: 11, color: diff > 0 ? '#22C55E' : '#EF4444', fontWeight: '700' }}>
                        {diff > 0 ? `+${diff}%` : `${diff}%`} sur {monthlyStats.length} mois
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        )}

        {/* Patterns détectés automatiquement */}
        {!historyLoading && (topGiven.length > 0 || topTaken.length > 0 || lastImprovement || topWhatWorked.length > 0) && (
          <View style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Zap size={14} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Patterns détectés</Text>
            </View>

            {/* Dernier objectif */}
            {lastImprovement && (
              <View style={{ backgroundColor: '#8B5CF610', borderRadius: 10, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#8B5CF6', marginBottom: 3 }}>DERNIER OBJECTIF</Text>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{lastImprovement.text}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginTop: 3 }}>
                  {new Date(lastImprovement.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            )}

            {/* Top techniques données */}
            {topGiven.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E', marginBottom: 6 }}>MES MEILLEURES FINITIONS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {topGiven.map(([tech, count]) => (
                    <View key={tech} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '700' }}>{tech}</Text>
                      <Text style={{ fontSize: 10, color: '#22C55E80', fontWeight: '600' }}>×{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Top techniques reçues */}
            {topTaken.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', marginBottom: 6 }}>IL ME FINIT LE + SOUVENT PAR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {topTaken.map(([tech, count]) => (
                    <View key={tech} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444415', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '700' }}>{tech}</Text>
                      <Text style={{ fontSize: 10, color: '#EF444480', fontWeight: '600' }}>×{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Ce qui marche le plus */}
            {topWhatWorked.length > 0 && (
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6', marginBottom: 6 }}>CE QUI FONCTIONNE LE MIEUX</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {topWhatWorked.map(([word, count]) => (
                    <View key={word} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '700' }}>{word}</Text>
                      <Text style={{ fontSize: 10, color: '#3B82F680', fontWeight: '600' }}>×{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Forces (ses forces = mes risques) */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Shield size={14} color="#EF4444" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Ses points forts</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>(ce dont il faut se méfier)</Text>
          </View>
          <TagList items={p.strengths} color="#EF4444" editable onAdd={v => update({ strengths: [...p.strengths, v] })} onRemove={i => update({ strengths: p.strengths.filter((_, idx) => idx !== i) })} />
        </View>

        {/* Faiblesses (ses faiblesses = mes opportunités) */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Target size={14} color="#22C55E" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Ses points faibles</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>(mes opportunités)</Text>
          </View>
          <TagList items={p.weaknesses} color="#22C55E" editable onAdd={v => update({ weaknesses: [...p.weaknesses, v] })} onRemove={i => update({ weaknesses: p.weaknesses.filter((_, idx) => idx !== i) })} />
        </View>

        {/* Ce qui fonctionne */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Zap size={14} color="#F59E0B" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Ce qui fonctionne contre lui</Text>
          </View>
          <TagList items={p.whatWorks} color="#F59E0B" editable onAdd={v => update({ whatWorks: [...p.whatWorks, v] })} onRemove={i => update({ whatWorks: p.whatWorks.filter((_, idx) => idx !== i) })} />
        </View>

        {/* Notes tactiques */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Notes tactiques</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => { setVoiceNoteText(''); setShowVoiceNote(true); }}
                style={{ backgroundColor: '#EF444415', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Mic size={13} color="#EF4444" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Voix</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowNoteInput(v => !v)}
                style={{ backgroundColor: '#8B5CF618', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>+ Note</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showNoteInput && (
            <View style={{ gap: 6, marginBottom: 10 }}>
              <TextInput
                style={{ fontSize: 13, color: colors.text, borderRadius: 8, borderWidth: 1, borderColor: '#8B5CF640', paddingHorizontal: 10, paddingVertical: 8, minHeight: 60, textAlignVertical: 'top', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Observations tactiques, garde utilisée, soumissions tentées..."
                placeholderTextColor={colors.textMuted ?? '#888'}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => { setShowNoteInput(false); setNewNote(''); }} style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted ?? '#888', fontWeight: '700', fontSize: 13 }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addNote} style={{ flex: 2, backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {p.notes.length === 0 && !showNoteInput && (
            <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 8 }}>Aucune note pour l'instant.</Text>
          )}

          <View style={{ gap: 8 }}>
            {p.notes.map((note, i) => (
              <View key={note.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>
                    {new Date(note.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </Text>
                  <TouchableOpacity onPress={() => update({ notes: p.notes.filter((_, idx) => idx !== i) })}>
                    <Trash2 size={12} color={colors.textMuted ?? '#888'} />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 18 }}>{note.content}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Historique des séances */}
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Calendar size={14} color="#3B82F6" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Historique des séances</Text>
            {sessionHistory.length > 0 && (
              <View style={{ backgroundColor: '#3B82F615', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>{sessionHistory.length}</Text>
              </View>
            )}
          </View>
          {historyLoading ? (
            <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', paddingVertical: 12 }}>Chargement de l'historique...</Text>
          ) : sessionHistory.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
              <Swords size={28} color={colors.textMuted ?? '#888'} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Aucune séance encore</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', textAlign: 'center', maxWidth: 240, lineHeight: 17 }}>
                Lance une séance de combat et entre le nom "{p.name}" dans un round pour que tout s'affiche ici automatiquement.
              </Text>
            </View>
          ) : (
            <View>
              {sessionHistory.map((entry, i) => (
                <SessionHistoryCard key={`${entry.training.id}-${i}`} entry={entry} colors={colors} isDark={isDark} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================
// ECRAN LISTE PARTENAIRES
// ============================================

export default function SparringPartnersScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ partnerName?: string }>();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const autoSelectDone = useRef(false);
  // Stats réelles calculées depuis la DB (V/D/N/lastDate) par nom de partenaire
  const [liveStats, setLiveStats] = useState<Record<string, { wins: number; losses: number; draws: number; total: number; lastDate?: string; avgRating?: number }>>({});

  useEffect(() => {
    loadPartners().then(loaded => {
      setPartners(loaded);
      // Planifier les rappels sparring intelligents
      requestNotificationPermissions().then(granted => {
        if (granted) scheduleSparringReminders(loaded as any);
      });
      // Auto-sélection si partnerName passé en param (depuis combat-analytics)
      if (params.partnerName && !autoSelectDone.current) {
        autoSelectDone.current = true;
        const nameLower = params.partnerName.toLowerCase();
        const found = loaded.find(p => p.name.toLowerCase() === nameLower);
        if (found) {
          setSelectedId(found.id);
        } else {
          // Partenaire pas encore créé : pré-remplir le formulaire avec son nom
          setNewName(params.partnerName);
          setShowNewForm(true);
        }
      }
      // Calculer les stats live depuis la DB pour chaque partenaire
      (async () => {
        const statsByKey: typeof liveStats = {};
        for (const p of loaded) {
          try {
            const trainings = await getTrainingsByPartnerName(p.name);
            const nameLower = p.name.toLowerCase().trim();
            let wins = 0, losses = 0, draws = 0, total = 0;
            let lastDate: string | undefined;
            let ratingSum = 0, ratingCount = 0;
            for (const t of trainings) {
              if (!t.combat_rounds) continue;
              for (const r of t.combat_rounds) {
                if (!r.partner || !r.partner.toLowerCase().includes(nameLower)) continue;
                total++;
                if (r.result === 'win') wins++;
                else if (r.result === 'loss') losses++;
                else if (r.result === 'draw') draws++;
                if (r.partnerRating) { ratingSum += r.partnerRating; ratingCount++; }
              }
              if (!lastDate || t.date > lastDate) lastDate = t.date;
            }
            statsByKey[p.id] = {
              wins, losses, draws, total, lastDate,
              avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : undefined,
            };
          } catch (e) {
            logger.error('Erreur stats live partenaire:', e);
          }
        }
        setLiveStats(statsByKey);
      })();
    });
  }, []);

  const persist = async (updated: Partner[]) => {
    setPartners(updated);
    await savePartners(updated);
  };

  const addPartner = async () => {
    if (!newName.trim()) return;
    impactAsync(ImpactFeedbackStyle.Medium);
    const p: Partner = {
      id: makeId(),
      name: newName.trim(),
      strengths: [],
      weaknesses: [],
      whatWorks: [],
      notes: [],
      matchCount: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [p, ...partners];
    await persist(updated);
    setNewName('');
    setShowNewForm(false);
    setSelectedId(p.id);
  };

  const updatePartner = async (p: Partner) => {
    const updated = partners.map(x => x.id === p.id ? p : x);
    await persist(updated);
  };

  const deletePartner = async (id: string) => {
    const updated = partners.filter(p => p.id !== id);
    await persist(updated);
  };

  const selected = selectedId ? partners.find(p => p.id === selectedId) ?? null : null;

  const cardStyle = {
    backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    padding: 14,
    marginBottom: 10,
  };

  if (selected) {
    return (
      <PartnerDetail
        partner={selected}
        onUpdate={async p => { await updatePartner(p); }}
        onClose={() => setSelectedId(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F2F2F7' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Partenaires tactiques</Text>
        <TouchableOpacity
          onPress={() => { setShowNewForm(true); setNewName(''); }}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center' }}
        >
          <Plus size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Formulaire ajout */}
      {showNewForm && (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <View style={[cardStyle, { marginBottom: 0 }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Nouveau partenaire</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                value={newName}
                onChangeText={setNewName}
                placeholder="Prénom ou pseudo"
                placeholderTextColor={colors.textMuted ?? '#888'}
                autoFocus
                onSubmitEditing={addPartner}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addPartner} style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}>
                <Check size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowNewForm(false)} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 10, justifyContent: 'center' }}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {partners.length === 0 && !showNewForm && (
          <StatsEmptyState
            icon={<User size={36} color="#EF4444" strokeWidth={2} />}
            title="Aucun partenaire"
            description="Ajoute tes partenaires de sparring pour noter leurs forces, faiblesses et tes stratégies."
            ctaLabel="Ajouter un partenaire"
            onCtaPress={() => { setShowNewForm(true); setNewName(''); }}
            accentColor="#EF4444"
          />
        )}

        {partners.map(partner => {
          const beltColor = partner.belt ? (BELT_COLORS[partner.belt.toLowerCase()] ?? '#888') : null;
          // Stats réelles depuis DB (fallback sur les anciens champs périmés si pas encore chargé)
          const stats = liveStats[partner.id];
          const realWins = stats?.wins ?? partner.wins;
          const realLosses = stats?.losses ?? partner.losses;
          const realDraws = stats?.draws ?? partner.draws;
          const realTotal = stats?.total ?? partner.matchCount;
          const realAvgRating = stats?.avgRating;
          const winRate = (realWins + realLosses) > 0 ? Math.round((realWins / (realWins + realLosses)) * 100) : null;
          const lastDaysAgo = stats?.lastDate
            ? Math.floor((Date.now() - new Date(stats.lastDate).getTime()) / 86400000)
            : null;
          return (
            <TouchableOpacity
              key={partner.id}
              style={[cardStyle, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}
              onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setSelectedId(partner.id); }}
              activeOpacity={0.8}
            >
              {/* Avatar · photo ou icône */}
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#EF444418', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                {partner.photoUri ? (
                  <Image source={{ uri: partner.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <User size={24} color="#EF4444" />
                )}
                {beltColor && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, backgroundColor: beltColor, borderWidth: beltColor === '#ffffff' ? 1 : 0, borderColor: '#ccc' }} />
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{partner.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  {partner.sport && <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>{partner.sport}</Text>}
                  {partner.weight && <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888' }}>{partner.weight}</Text>}
                  {realTotal > 0 && (
                    <Text style={{ fontSize: 11, color: winRate != null && winRate >= 50 ? '#22C55E' : '#EF4444', fontWeight: '700' }}>
                      {realWins}V/{realLosses}D{realDraws > 0 ? `/${realDraws}N` : ''}
                    </Text>
                  )}
                  {realAvgRating != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Star size={11} color={realAvgRating <= 3 ? '#22C55E' : realAvgRating <= 6 ? '#F59E0B' : realAvgRating <= 8 ? '#EF4444' : '#9333EA'} fill={realAvgRating <= 3 ? '#22C55E' : realAvgRating <= 6 ? '#F59E0B' : realAvgRating <= 8 ? '#EF4444' : '#9333EA'} />
                      <Text style={{ fontSize: 11, color: realAvgRating <= 3 ? '#22C55E' : realAvgRating <= 6 ? '#F59E0B' : realAvgRating <= 8 ? '#EF4444' : '#9333EA', fontWeight: '800' }}>
                        {realAvgRating}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {realTotal > 0 && (
                    <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888' }}>
                      {realTotal} round{realTotal > 1 ? 's' : ''}
                    </Text>
                  )}
                  {lastDaysAgo != null && (
                    <Text style={{ fontSize: 10, color: lastDaysAgo > 21 ? '#F59E0B' : colors.textMuted ?? '#888' }}>
                      {lastDaysAgo === 0 ? '· aujourd\'hui' : lastDaysAgo === 1 ? "· hier" : `· il y a ${lastDaysAgo}j`}
                    </Text>
                  )}
                </View>
                {(partner.strengths.length + partner.weaknesses.length + partner.whatWorks.length) > 0 && (
                  <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginTop: 2 }}>
                    {partner.strengths.length} forces · {partner.weaknesses.length} faiblesses · {partner.whatWorks.length} tactiques
                  </Text>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {partner.notes.length > 0 && (
                  <View style={{ backgroundColor: '#8B5CF618', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#8B5CF6' }}>{partner.notes.length} notes</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    impactAsync(ImpactFeedbackStyle.Light);
                    router.push(`/social-share/duel-card?partnerName=${encodeURIComponent(partner.name)}&partnerBelt=${encodeURIComponent(partner.belt ?? '')}` as any);
                  }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EC489915', justifyContent: 'center', alignItems: 'center' }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Share2 size={14} color="#EC4899" />
                </TouchableOpacity>
                <ChevronRight size={16} color={colors.textMuted ?? '#888'} />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
