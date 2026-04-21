// ============================================
// SPARRING TAB — Onglet Combat du Carnet
// Analyse sparring : partenaires, techniques, finitions
// ============================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { getTrainings, openDatabase } from '@/lib/database';
import type { Training, CombatRound } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import {
  Users, Zap, Target, TrendingUp, BarChart2, X, ChevronRight,
  Calendar, Clock, CheckCircle, Circle, Flame, Settings, Star,
  Share2, Swords, Shield, AlertTriangle, Lightbulb, Dumbbell,
  Trophy, ClipboardList, Plus, Edit2, Camera,
} from 'lucide-react-native';
import { BarChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { getMethodDisplayName } from '@/components/BJJBodyMap';

const WEEKLY_GOAL_KEY = '@sparring_weekly_goal';
const SPARRING_PARTNERS_KEY = '@yoroi_sparring_partners';

interface SparringPartnerData {
  id: string;
  name: string;
  photoUri?: string;
  belt?: string;
}

// ============================================
// TYPES
// ============================================

interface PartnerStats {
  name: string;
  totalRounds: number;
  wins: number;
  losses: number;
  draws: number;
  submissionsGiven: number;
  submissionsTaken: number;
  lastSession?: string;
  sessions: PartnerSession[];
  avgRating?: number;        // Moyenne des notes données (1-10)
  ratingHistory?: { date: string; rating: number }[]; // Évolution de la note
}

interface PartnerSession {
  date: string;
  sport: string;
  rounds: CombatRound[];
  technicalTheme?: string;
}

interface TechniqueStats {
  name: string;
  count: number;
  lastSession?: string;
}

interface SubmissionStats {
  name: string;
  given: number;
  taken: number;
}

interface WeeklyBar {
  value: number;
  label: string;
  frontColor: string;
  wins: number;
  total: number;
}

interface RecentSession {
  id: number | undefined;
  date: string;
  sport: string;
  roundsCount: number;
  partners: string[];
  technicalTheme?: string;
  wins: number;
  losses: number;
}

// ============================================
// HELPERS
// ============================================

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function currentWeekKey(): string {
  return isoWeekKey(new Date().toISOString().slice(0, 10));
}

function weekLabel(key: string): string {
  return key.split('-W')[1] ? `S${key.split('-W')[1]}` : key;
}

function parseCombatRounds(raw: any): CombatRound[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function formatDateFull(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function resultColor(result: string) {
  if (result === 'win') return '#22C55E';
  if (result === 'loss') return '#EF4444';
  return '#F59E0B';
}

function resultLabel(result: string) {
  if (result === 'win') return 'V';
  if (result === 'loss') return 'D';
  return 'N';
}

function isCombatSport(sport: string): boolean {
  const s = sport.toLowerCase();
  const prefixes = ['bo_', 'mt_', 'kb_', 'mma_', 'jjb_', 'j_', 'lu_', 'g_', 'p_', 's_', 't_'];
  const keywords = ['boxe', 'muay', 'kick', 'mma', 'jiu', 'judo', 'lutte', 'grappling', 'sparring', 'combat', 'karate', 'taekwondo', 'wrestling'];
  return prefixes.some(p => s.startsWith(p)) || keywords.some(k => s.includes(k));
}

// Hash simple pour couleur d'avatar
function nameToColor(name: string): string {
  // Palette de couleurs visuellement harmonieuses (pas de roses/saumons garish)
  const palette = [
    '#6366F1', '#0EA5E9', '#10B981', '#F59E0B',
    '#8B5CF6', '#14B8A6', '#3B82F6', '#22C55E',
    '#7C3AED', '#0284C7', '#059669', '#D97706',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % palette.length;
  return palette[Math.abs(hash)];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

interface SparringTabProps {
  refreshTrigger?: number;
}

export default function SparringTab({ refreshTrigger }: SparringTabProps) {
  const { colors, isDark, screenBackground } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  // Objectif hebdo
  const [weeklyGoal, setWeeklyGoal] = useState<number>(10);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalInput, setGoalInput] = useState('10');

  // Modal partenaire
  const [selectedPartner, setSelectedPartner] = useState<PartnerStats | null>(null);

  // Photos + noms des partenaires qui ont une fiche (depuis sparring-partners.tsx)
  const [partnerPhotos, setPartnerPhotos] = useState<Record<string, string>>({});
  // Noms des partenaires qui ont une fiche (même sans photo)
  const [partnerHasFiche, setPartnerHasFiche] = useState<Set<string>>(new Set());

  // Modal édition partenaire (nom + photo)
  const [editingPartner, setEditingPartner] = useState<string | null>(null); // nom actuel
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadPartnerPhotos = async () => {
    try {
      const raw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
      if (!raw) return;
      let partners: SparringPartnerData[] = [];
      try { partners = JSON.parse(raw); } catch { return; }

      // Dédoublonner : garder une seule entrée par nom (lowercase), la dernière ayant une photo
      const seen = new Map<string, SparringPartnerData>();
      for (const p of partners) {
        const key = p.name.trim().toLowerCase();
        const existing = seen.get(key);
        if (!existing || (!existing.photoUri && p.photoUri)) {
          seen.set(key, p);
        }
      }
      const deduped = Array.from(seen.values());
      if (deduped.length !== partners.length) {
        // Sauvegarder la version dédoublonnée silencieusement
        try { await AsyncStorage.setItem(SPARRING_PARTNERS_KEY, JSON.stringify(deduped)); } catch {}
      }

      const photoMap: Record<string, string> = {};
      const ficheSet = new Set<string>();
      for (const p of deduped) {
        const key = p.name.trim().toLowerCase();
        ficheSet.add(key);
        if (p.photoUri) photoMap[key] = p.photoUri;
      }
      setPartnerPhotos(photoMap);
      setPartnerHasFiche(ficheSet);
    } catch {}
  };

  const savePartnerPhoto = async (partnerName: string, photoUri: string) => {
    try {
      const raw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
      let partners: SparringPartnerData[] = raw ? JSON.parse(raw) : [];
      const key = partnerName.trim().toLowerCase();
      const existing = partners.find(p => p.name.trim().toLowerCase() === key);
      if (existing) {
        existing.photoUri = photoUri || undefined;
      } else if (photoUri) {
        // Crée un nouveau partenaire si inexistant et qu'il y a une photo
        partners.push({ id: Date.now().toString(), name: partnerName.trim(), photoUri });
      }
      await AsyncStorage.setItem(SPARRING_PARTNERS_KEY, JSON.stringify(partners));
      if (photoUri) {
        setPartnerPhotos(prev => ({ ...prev, [key]: photoUri }));
      } else {
        setPartnerPhotos(prev => { const next = { ...prev }; delete next[key]; return next; });
      }
    } catch {}
  };

  const pickPhotoForPartner = async (partnerName: string) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission refusée', "Autorise l'accès à la galerie dans les Réglages.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        await savePartnerPhoto(partnerName, result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Erreur', `Impossible d'ouvrir la galerie : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const openEditPartner = (name: string) => {
    setEditingPartner(name);
    setEditName(name);
    setEditPhoto(partnerPhotos[name.trim().toLowerCase()] || null);
  };

  const pickEditPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission refusée', "Autorise l'accès à la galerie dans les Réglages pour ajouter une photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setEditPhoto(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Erreur', `Impossible d'ouvrir la galerie : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const deletePartner = async () => {
    if (!editingPartner) return;
    const key = editingPartner.trim().toLowerCase();
    try {
      const raw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
      let partners: SparringPartnerData[] = [];
      try { partners = raw ? JSON.parse(raw) : []; } catch { partners = []; }
      partners = partners.filter(p => p.name.trim().toLowerCase() !== key);
      await AsyncStorage.setItem(SPARRING_PARTNERS_KEY, JSON.stringify(partners));
      setPartnerPhotos(prev => { const next = { ...prev }; delete next[key]; return next; });
      setPartnerHasFiche(prev => { const next = new Set(prev); next.delete(key); return next; });
      setEditingPartner(null);
    } catch (e) {
      Alert.alert('Erreur', `Impossible de supprimer : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const confirmDeletePartner = () => {
    Alert.alert(
      'Supprimer le partenaire',
      `Supprimer la fiche de ${editingPartner} ? Son historique de combats est conservé.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: deletePartner },
      ]
    );
  };

  const saveEditPartner = async () => {
    if (!editingPartner || !editName.trim()) return;
    setIsSavingEdit(true);
    try {
      const oldKey = editingPartner.trim().toLowerCase();
      const newName = editName.trim();
      const newKey = newName.toLowerCase();
      const photoToSave = editPhoto || undefined;

      // 1. Mettre à jour AsyncStorage sans créer de doublons
      const raw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
      let partners: SparringPartnerData[] = [];
      try { partners = raw ? JSON.parse(raw) : []; } catch { partners = []; }

      const oldIdx = partners.findIndex(p => p.name.trim().toLowerCase() === oldKey);
      const newIdx = partners.findIndex(p => p.name.trim().toLowerCase() === newKey);

      if (oldIdx >= 0) {
        // Mettre à jour l'entrée existante
        partners[oldIdx] = { ...partners[oldIdx], name: newName, photoUri: photoToSave };
        // Supprimer l'éventuel doublon avec le nouveau nom
        if (newIdx >= 0 && newIdx !== oldIdx) {
          partners.splice(newIdx > oldIdx ? newIdx : newIdx, 1);
        }
      } else if (newIdx >= 0) {
        // Déjà une entrée avec le nouveau nom (tentative précédente) — la mettre à jour
        partners[newIdx] = { ...partners[newIdx], name: newName, photoUri: photoToSave };
      } else {
        // Nouvelle entrée
        partners.push({ id: Date.now().toString(), name: newName, photoUri: photoToSave });
      }
      await AsyncStorage.setItem(SPARRING_PARTNERS_KEY, JSON.stringify(partners));

      // 2. Renommer dans les combat_rounds de la DB si le nom change
      if (oldKey !== newKey) {
        try {
          const db = await openDatabase();
          const rows = await db.getAllAsync<{ id: number; combat_rounds: string }>(
            `SELECT id, combat_rounds FROM trainings WHERE combat_rounds IS NOT NULL AND combat_rounds != '[]'`
          );
          for (const row of rows) {
            try {
              const rounds: CombatRound[] = JSON.parse(row.combat_rounds);
              if (!Array.isArray(rounds)) continue;
              let changed = false;
              for (const r of rounds) {
                if (r.partner?.trim().toLowerCase() === oldKey) {
                  r.partner = newName;
                  changed = true;
                }
              }
              if (changed) {
                await db.runAsync(`UPDATE trainings SET combat_rounds = ? WHERE id = ?`, [JSON.stringify(rounds), row.id]);
              }
            } catch {}
          }
        } catch {}
      }

      // 3. Mettre à jour le state local — garder les deux clés pour éviter
      //    une disparition de photo si le rename DB a échoué
      setPartnerPhotos(prev => {
        const next = { ...prev };
        delete next[oldKey];
        delete next[newKey];
        if (photoToSave) {
          next[newKey] = photoToSave;
          next[oldKey] = photoToSave; // alias temporaire au cas où le rename DB n'a pas pris
        }
        return next;
      });
      setPartnerHasFiche(prev => {
        const next = new Set(prev);
        next.delete(oldKey);
        next.add(newKey);
        next.add(oldKey); // alias temporaire
        return next;
      });

      setEditingPartner(null);
      await load(true);

      // 4. Reconstruire la photo map depuis AS + alias pour cohérence
      const finalRaw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
      const finalPartners: SparringPartnerData[] = (() => {
        try { return finalRaw ? JSON.parse(finalRaw) : []; } catch { return []; }
      })();
      const photoMap: Record<string, string> = {};
      const ficheSet = new Set<string>();
      for (const p of finalPartners) {
        const k = p.name.trim().toLowerCase();
        ficheSet.add(k);
        if (p.photoUri) photoMap[k] = p.photoUri;
      }
      // Alias : si partnerStats a encore l'ancien nom (rename DB non appliqué),
      // associer quand même la photo
      if (oldKey !== newKey && photoToSave && !photoMap[oldKey]) {
        photoMap[oldKey] = photoToSave;
      }
      setPartnerPhotos(photoMap);
      setPartnerHasFiche(ficheSet);

    } catch (e) {
      Alert.alert('Erreur', `Impossible de sauvegarder : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getTrainings(3650);
      setTrainings(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); loadPartnerPhotos(); }, [refreshTrigger]);

  // Recharger quand les données changent (ex: nouvel entraînement ajouté)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => load(true));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(WEEKLY_GOAL_KEY).then(v => {
      if (v) { setWeeklyGoal(parseInt(v, 10)); setGoalInput(v); }
    });
  }, []);

  const saveGoal = useCallback(async () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0) {
      setWeeklyGoal(val);
      await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(val));
    }
    setShowGoalEditor(false);
  }, [goalInput]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Sports uniques ayant des données combat ──
  const combatSports = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const tr of trainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      if (rounds.length > 0 || tr.technical_theme?.trim()) {
        if (tr.sport) set.add(tr.sport);
      }
    }
    return Array.from(set).sort();
  }, [trainings]);

  // ── Trainings filtrés ──
  const filteredTrainings = useMemo(() => {
    return trainings.filter(tr => {
      const rounds = parseCombatRounds(tr.combat_rounds);
      const hasCombat = rounds.length > 0 || tr.technical_theme?.trim();
      if (!hasCombat) return false;
      if (selectedSport && tr.sport !== selectedSport) return false;
      return true;
    });
  }, [trainings, selectedSport]);

  // ── Partenaires ──
  const partnerStats = useMemo<PartnerStats[]>(() => {
    const map: Record<string, PartnerStats> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      const partnersInSession: Record<string, CombatRound[]> = {};
      for (const r of rounds) {
        if (!r.partner?.trim()) continue;
        const key = r.partner.trim().toLowerCase();
        if (!map[key]) map[key] = {
          name: r.partner.trim(), totalRounds: 0, wins: 0, losses: 0, draws: 0,
          submissionsGiven: 0, submissionsTaken: 0, lastSession: tr.date, sessions: [],
        };
        const p = map[key];
        p.totalRounds++;
        if (r.result === 'win') p.wins++;
        else if (r.result === 'loss') p.losses++;
        else if (r.result === 'draw') p.draws++;
        // Compter les finitions : champ legacy + nouvelles listes multi-select
        p.submissionsGiven += Math.max(r.submissionsGiven ?? 0, r.methodsGiven?.length ?? 0);
        p.submissionsTaken += Math.max(r.submissionsTaken ?? 0, r.methodsTaken?.length ?? 0);
        if (!p.lastSession || tr.date > p.lastSession) p.lastSession = tr.date;
        if (!partnersInSession[key]) partnersInSession[key] = [];
        partnersInSession[key].push(r);
      }
      // Ajouter la session à chaque partenaire rencontré
      for (const [key, pRounds] of Object.entries(partnersInSession)) {
        if (map[key]) {
          map[key].sessions.push({
            date: tr.date,
            sport: tr.sport,
            rounds: pRounds,
            technicalTheme: tr.technical_theme,
          });
        }
      }
    }
    // Trier les sessions de chaque partenaire par date desc
    for (const p of Object.values(map)) {
      p.sessions.sort((a, b) => b.date.localeCompare(a.date));
      // Calculer note moyenne + historique
      const ratings: { date: string; rating: number }[] = [];
      for (const s of p.sessions) {
        for (const r of s.rounds) {
          if (r.partnerRating) ratings.push({ date: s.date, rating: r.partnerRating });
        }
      }
      if (ratings.length > 0) {
        p.ratingHistory = ratings.sort((a, b) => a.date.localeCompare(b.date));
        p.avgRating = Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10;
      }
    }
    return Object.values(map).sort((a, b) => b.totalRounds - a.totalRounds);
  }, [filteredTrainings]);

  // ── Techniques ──
  const techniqueStats = useMemo<TechniqueStats[]>(() => {
    const map: Record<string, TechniqueStats> = {};
    for (const tr of filteredTrainings) {
      if (!tr.technical_theme?.trim()) continue;
      const key = tr.technical_theme.trim().toLowerCase();
      if (!map[key]) map[key] = { name: tr.technical_theme.trim(), count: 0, lastSession: tr.date };
      map[key].count++;
      if (tr.date > (map[key].lastSession ?? '')) map[key].lastSession = tr.date;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredTrainings]);

  // ── Finitions ──
  const submissionStats = useMemo<SubmissionStats[]>(() => {
    const map: Record<string, SubmissionStats> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const r of rounds) {
        if (!r.method?.trim()) continue;
        const key = r.method.trim().toLowerCase();
        if (!map[key]) map[key] = { name: r.method.trim(), given: 0, taken: 0 };
        if (r.result === 'win') map[key].given++;
        else if (r.result === 'loss') map[key].taken++;
      }
    }
    return Object.values(map).sort((a, b) => (b.given + b.taken) - (a.given + a.taken));
  }, [filteredTrainings]);

  // ── Séances récentes ──
  const recentSessions = useMemo<RecentSession[]>(() => {
    return filteredTrainings
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map(tr => {
        const rounds = parseCombatRounds(tr.combat_rounds);
        const partners = Array.from(new Set(rounds.map(r => r.partner).filter(Boolean) as string[]));
        const wins = rounds.filter(r => r.result === 'win').length;
        const losses = rounds.filter(r => r.result === 'loss').length;
        return {
          id: tr.id,
          date: tr.date,
          sport: tr.sport,
          roundsCount: rounds.length > 0 ? rounds.length : (tr.rounds ?? 0),
          partners,
          technicalTheme: tr.technical_theme,
          wins,
          losses,
        };
      });
  }, [filteredTrainings]);

  // ── Graphique rounds par semaine ──
  const weeklyBars = useMemo<WeeklyBar[]>(() => {
    const map: Record<string, { rounds: number; wins: number; total: number }> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      if (rounds.length === 0 && !(tr.rounds && tr.rounds > 0)) continue;
      const key = isoWeekKey(tr.date);
      if (!map[key]) map[key] = { rounds: 0, wins: 0, total: 0 };
      const count = rounds.length > 0 ? rounds.length : (tr.rounds ?? 0);
      map[key].rounds += count;
      for (const r of rounds) {
        if (r.result === 'win') map[key].wins++;
        if (r.result === 'win' || r.result === 'loss') map[key].total++;
      }
    }
    const sorted = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
    const maxVal = Math.max(...sorted.map(([, v]) => v.rounds), 1);
    return sorted.map(([key, v]) => ({
      value: v.rounds,
      label: weekLabel(key),
      frontColor: v.rounds >= maxVal * 0.8 ? (screenBackground || '#8B5CF6') : v.rounds >= maxVal * 0.4 ? '#A78BFA' : '#C4B5FD',
      wins: v.wins,
      total: v.total,
    }));
  }, [filteredTrainings, screenBackground]);

  // ── Rounds cette semaine (pour objectif) ──
  const thisWeekRounds = useMemo(() => {
    const key = currentWeekKey();
    const bar = weeklyBars.find(b => {
      // On retrouve la semaine courante via le label
      const curLabel = weekLabel(key);
      return b.label === curLabel;
    });
    // Recalcul direct pour être sûr
    let count = 0;
    const curKey = currentWeekKey();
    for (const tr of filteredTrainings) {
      if (isoWeekKey(tr.date) !== curKey) continue;
      const rounds = parseCombatRounds(tr.combat_rounds);
      count += rounds.length > 0 ? rounds.length : (tr.rounds ?? 0);
    }
    return count;
  }, [filteredTrainings, weeklyBars]);

  // ── Win rate mensuel ──
  const monthlyWinRate = useMemo(() => {
    const map: Record<string, { wins: number; total: number }> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const r of rounds) {
        if (r.result !== 'win' && r.result !== 'loss') continue;
        const key = tr.date.slice(0, 7);
        if (!map[key]) map[key] = { wins: 0, total: 0 };
        if (r.result === 'win') map[key].wins++;
        map[key].total++;
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        value: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
        label: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
        total: v.total,
      }));
  }, [filteredTrainings]);

  // ── Totaux ──
  const totals = useMemo(() => {
    let rounds = 0, wins = 0, losses = 0;
    for (const p of partnerStats) { rounds += p.totalRounds; wins += p.wins; losses += p.losses; }
    const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return { rounds, wins, losses, winRate, partners: partnerStats.length, techniques: techniqueStats.length };
  }, [partnerStats, techniqueStats]);

  // ── Top finitions reçues (toutes séances) ──
  const topMethodsTaken = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tr of filteredTrainings) {
      const rounds = parseCombatRounds(tr.combat_rounds);
      for (const r of rounds) {
        for (const m of (r.methodsTaken ?? [])) {
          const key = getMethodDisplayName(m.trim());
          if (!key) continue;
          map[key] = (map[key] ?? 0) + 1;
        }
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredTrainings]);

  // ── Insights Coach auto-générés ──
  const insights = useMemo(() => {
    const out: { Icon: React.ComponentType<{ size?: number; color?: string }>; text: string; color: string }[] = [];
    if (partnerStats.length === 0) return out;

    // 1. Finition la + récurrente reçue
    if (topMethodsTaken.length > 0) {
      const [name, count] = topMethodsTaken[0];
      if (count >= 2) out.push({
        Icon: Shield,
        text: `Tu te fais prendre ${count}× par ${name}. Priorité : drill ta défense.`,
        color: '#EF4444',
      });
    }

    // 2. Niveau moyen des adversaires
    const ratings = partnerStats.filter(p => p.avgRating != null).map(p => p.avgRating!);
    if (ratings.length >= 2) {
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      out.push({
        Icon: Swords,
        text: `Niveau moyen de tes adversaires : ${avg}/10`,
        color: avg <= 4 ? '#22C55E' : avg <= 7 ? '#F59E0B' : '#9333EA',
      });
    }

    // 3. Matchup difficile (partenaire avec 0 victoire)
    const tough = partnerStats.filter(p => p.losses >= 2 && p.wins === 0);
    if (tough.length > 0) {
      const worst = tough[0];
      out.push({
        Icon: AlertTriangle,
        text: `${worst.losses} défaites d'affilée contre ${worst.name}. Change de stratégie.`,
        color: '#F59E0B',
      });
    }

    // 4. Partenaire à réattaquer (stat dormante)
    const dormant = partnerStats.find(p => {
      if (!p.lastSession) return false;
      const days = Math.floor((Date.now() - new Date(p.lastSession).getTime()) / 86400000);
      return days >= 21;
    });
    if (dormant) {
      const days = Math.floor((Date.now() - new Date(dormant.lastSession!).getTime()) / 86400000);
      out.push({
        Icon: Clock,
        text: `${days} jours sans croiser ${dormant.name}. Retry pour voir si tu as progressé.`,
        color: '#3B82F6',
      });
    }

    // 5. Win rate global
    if (totals.winRate != null && (totals.wins + totals.losses) >= 3) {
      if (totals.winRate >= 70) out.push({
        Icon: Flame,
        text: `${totals.winRate}% de victoires — tu domines. Cherche du plus dur.`,
        color: '#22C55E',
      });
      else if (totals.winRate <= 30) out.push({
        Icon: Dumbbell,
        text: `${totals.winRate}% de victoires — phase d'apprentissage. Concentre-toi sur 1 objectif par séance.`,
        color: '#EF4444',
      });
    }

    // 6. Victoire seulement contre un niveau faible
    const hasEasyWins = partnerStats.some(p => p.wins > 0 && (p.avgRating ?? 5) <= 3);
    const hasHardWins = partnerStats.some(p => p.wins > 0 && (p.avgRating ?? 5) >= 6);
    if (hasEasyWins && !hasHardWins && partnerStats.length >= 3) {
      out.push({
        Icon: Target,
        text: `Tu bats les débutants mais pas les intermédiaires. Prochain défi : un round face à du 6+/10.`,
        color: '#8B5CF6',
      });
    }

    return out.slice(0, 4);
  }, [partnerStats, topMethodsTaken, totals]);

  // ── Tri des partenaires ──
  const [partnerSortMode, setPartnerSortMode] = useState<'volume' | 'winrate' | 'recent' | 'level'>('volume');
  const sortedPartners = useMemo(() => {
    const arr = [...partnerStats];
    switch (partnerSortMode) {
      case 'winrate':
        return arr.sort((a, b) => {
          const wrA = (a.wins + a.losses) > 0 ? a.wins / (a.wins + a.losses) : -1;
          const wrB = (b.wins + b.losses) > 0 ? b.wins / (b.wins + b.losses) : -1;
          return wrB - wrA;
        });
      case 'recent':
        return arr.sort((a, b) => (b.lastSession ?? '').localeCompare(a.lastSession ?? ''));
      case 'level':
        return arr.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
      default:
        return arr; // volume (déjà trié par totalRounds desc)
    }
  }, [partnerStats, partnerSortMode]);

  const maxRounds = partnerStats[0]?.totalRounds ?? 1;
  const maxTech = techniqueStats[0]?.count ?? 1;

  const accent = screenBackground || '#06B6D4';
  const bgColor = isDark ? colors.background : '#F2F2F7';
  const cardBg = colors.backgroundCard;
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const sepColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const trackBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  const isEmpty = partnerStats.length === 0 && techniqueStats.length === 0;

  // Segments pour la barre de progression hebdo
  const goalSegments = Math.max(weeklyGoal, 1);
  const filledSegments = Math.min(thisWeekRounds, goalSegments);
  const progressPercent = Math.min((thisWeekRounds / weeklyGoal) * 100, 100);
  const goalReached = thisWeekRounds >= weeklyGoal;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: bgColor }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />}
      >
        {/* ── FILTRE PAR SPORT ── */}
        {combatSports.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
          >
            <TouchableOpacity
              style={[styles.sportPill, {
                backgroundColor: selectedSport === null ? accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                borderColor: selectedSport === null ? accent : cardBorder,
              }]}
              onPress={() => setSelectedSport(null)}
            >
              <Text style={[styles.sportPillText, { color: selectedSport === null ? '#FFF' : colors.textMuted }]}>
                {t('sparring.filterAll')}
              </Text>
            </TouchableOpacity>
            {combatSports.map(sport => (
              <TouchableOpacity
                key={sport}
                style={[styles.sportPill, {
                  backgroundColor: selectedSport === sport ? accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                  borderColor: selectedSport === sport ? accent : cardBorder,
                }]}
                onPress={() => setSelectedSport(sport === selectedSport ? null : sport)}
              >
                <Text style={[styles.sportPillText, { color: selectedSport === sport ? '#FFF' : colors.textMuted }]}>
                  {getSportName(sport)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── VIDE ── */}
        {isEmpty && (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('sparring.noData')}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('sparring.noDataMessage')}
            </Text>
          </View>
        )}

        {/* ── PODIUM TOP 3 — tout en haut ── */}
        {partnerStats.length >= 2 && (
          <PodiumSection
            partners={partnerStats.slice(0, 3)}
            accent={accent}
            colors={colors}
            isDark={isDark}
            onSelect={(p) => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any);
            }}
            partnerPhotos={partnerPhotos}
          />
        )}

        {/* ── ACCÈS RAPIDES : Game Plan + Achievements ── */}
        {!isEmpty && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                router.push('/game-plan' as any);
              }}
              activeOpacity={0.85}
              style={{ flex: 1, backgroundColor: '#8B5CF6', borderRadius: 14, padding: 14, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Target size={20} color="#fff" />
                <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>PLAYBOOK</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>Mon Game Plan</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>Checklist, playbook, journal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                router.push('/combat-achievements' as any);
              }}
              activeOpacity={0.85}
              style={{ flex: 1, backgroundColor: '#EAB308', borderRadius: 14, padding: 14, shadowColor: '#EAB308', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Trophy size={20} color="#fff" />
                <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 }}>BADGES</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>Achievements</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>35+ badges à débloquer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── INSIGHTS COACH ── */}
        {insights.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder, marginBottom: 12 }]}>
            <View style={[styles.sectionHead, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Lightbulb size={16} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Coach — insights</Text>
            </View>
            <View style={{ gap: 8, marginTop: 6 }}>
              {insights.map((ins, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: `${ins.color}12`, borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: ins.color }}>
                  <View style={{ marginTop: 1 }}>
                    <ins.Icon size={16} color={ins.color} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 }}>{ins.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── VUE D'ENSEMBLE — grille 2×2 ── */}
        {!isEmpty && (
          <View style={styles.overviewGrid}>
            {/* Rounds */}
            <View style={[styles.overviewBox, { backgroundColor: '#8B5CF620' }]}>
              <Text style={[styles.overviewValue, { color: '#8B5CF6' }]}>{totals.rounds}</Text>
              <Text style={[styles.overviewLabel, { color: '#8B5CF6' }]}>{t('sparring.rounds')}</Text>
            </View>
            {/* Partenaires */}
            <View style={[styles.overviewBox, { backgroundColor: `${accent}20` }]}>
              <Text style={[styles.overviewValue, { color: accent }]}>{totals.partners}</Text>
              <Text style={[styles.overviewLabel, { color: accent }]}>{t('sparring.partners')}</Text>
            </View>
            {/* Techniques */}
            <View style={[styles.overviewBox, { backgroundColor: '#F59E0B20' }]}>
              <Text style={[styles.overviewValue, { color: '#F59E0B' }]}>{totals.techniques}</Text>
              <Text style={[styles.overviewLabel, { color: '#F59E0B' }]}>{t('sparring.techniques')}</Text>
            </View>
            {/* Win rate — couleur dynamique */}
            {(() => {
              const wr = totals.winRate;
              const wrColor = wr == null ? '#6B7280' : wr >= 60 ? '#22C55E' : wr >= 40 ? '#F59E0B' : '#EF4444';
              return (
                <View style={[styles.overviewBox, { backgroundColor: `${wrColor}20` }]}>
                  <Text style={[styles.overviewValue, { color: wrColor }]}>
                    {wr !== null ? `${wr}%` : '--'}
                  </Text>
                  <Text style={[styles.overviewLabel, { color: wrColor }]}>{t('sparring.winRate')}</Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* ── OBJECTIF HEBDOMADAIRE ── */}
        {!isEmpty && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.weeklyGoal')}</Text>
              <TouchableOpacity
                onPress={() => { setGoalInput(String(weeklyGoal)); setShowGoalEditor(true); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Settings size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Compteur + statut */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: goalReached ? '#22C55E' : colors.text, lineHeight: 42 }}>
                  {thisWeekRounds}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textMuted }}>
                  / {weeklyGoal} {t('sparring.roundsUnit')}
                </Text>
              </View>
              {goalReached ? (
                <View style={[styles.goalBadge, { backgroundColor: '#22C55E18' }]}>
                  <CheckCircle size={13} color="#22C55E" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#22C55E' }}>{t('sparring.goalReached')}</Text>
                </View>
              ) : (
                <View style={[styles.goalBadge, { backgroundColor: '#F59E0B14' }]}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B' }}>
                    {weeklyGoal - thisWeekRounds} {t('sparring.remaining')}
                  </Text>
                </View>
              )}
            </View>

            {/* Barre de progression segmentée */}
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
                <View style={[styles.progressFill, {
                  width: `${progressPercent}%` as any,
                  backgroundColor: goalReached ? '#22C55E' : '#F59E0B',
                }]} />
                {/* Ligne pointillée objectif (quand pas encore atteint) */}
                {!goalReached && (
                  <View style={[styles.goalLine, { right: 0 }]} />
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>0</Text>
                <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>
                  {t('sparring.goal')} : {weeklyGoal}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── SÉANCES RÉCENTES ── */}
        {recentSessions.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.recentSessions')}</Text>
              <View style={[styles.countBadge, { backgroundColor: `${accent}18` }]}>
                <Text style={[styles.countBadgeText, { color: accent }]}>{recentSessions.length}</Text>
              </View>
            </View>

            <View style={{ gap: 8, marginTop: 4 }}>
              {recentSessions.map((s, idx) => (
                <View
                  key={s.id ?? idx}
                  style={[styles.recentCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    borderLeftColor: accent,
                  }]}
                >
                  {/* Date badge */}
                  <View style={[styles.recentDateBadge, { backgroundColor: `${accent}18` }]}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: accent, lineHeight: 20 }}>
                      {new Date(s.date).getDate()}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: accent, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' })}
                    </Text>
                  </View>

                  {/* Contenu */}
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {getSportName(s.sport)}
                      </Text>
                      {s.roundsCount > 0 && (
                        <View style={[styles.roundsBadge, { backgroundColor: '#8B5CF620' }]}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }}>
                            {s.roundsCount} {s.roundsCount > 1 ? t('sparring.roundsPlural') : t('sparring.roundSingular')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {s.technicalTheme && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Zap size={10} color="#F59E0B" />
                        <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }} numberOfLines={1}>
                          {s.technicalTheme}
                        </Text>
                      </View>
                    )}

                    {s.partners.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Users size={10} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                          {s.partners.join(', ')}
                        </Text>
                      </View>
                    )}

                    {(s.wins > 0 || s.losses > 0) && (
                      <View style={{ flexDirection: 'row', gap: 5, marginTop: 2 }}>
                        {s.wins > 0 && <RecordPill value={s.wins} label="V" color="#22C55E" />}
                        {s.losses > 0 && <RecordPill value={s.losses} label="D" color="#EF4444" />}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── GRAPHIQUE ROUNDS PAR SEMAINE ── */}
        {weeklyBars.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.roundsPerWeek')}</Text>
            </View>
            {weeklyBars.length < 3 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                  {t('sparring.notEnoughData')}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', opacity: 0.7 }}>
                  {t('sparring.continueWeeks')}
                </Text>
              </View>
            ) : (
              <>
                <View style={{ marginTop: 8, marginLeft: -8 }}>
                  <BarChart
                    data={weeklyBars}
                    barWidth={Math.min(40, Math.max(14, Math.floor((SCREEN_WIDTH - 80) / Math.max(weeklyBars.length, 8)) - 4))}
                    spacing={8}
                    roundedTop
                    hideRules
                    hideAxesAndRules
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9, fontWeight: '600' }}
                    noOfSections={3}
                    maxValue={Math.max(...weeklyBars.map(b => b.value), weeklyGoal, 1) + 1}
                    yAxisThickness={0}
                    xAxisThickness={0}
                    isAnimated
                    animationDuration={600}
                    width={SCREEN_WIDTH - 80}
                    height={100}
                    referenceLine1Config={{ color: '#F59E0B', dashWidth: 4, dashGap: 4, thickness: 1 }}
                    referenceLine1Position={weeklyGoal}
                  />
                </View>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                  {t('sparring.lastWeeks', { count: weeklyBars.length })}{'  '}
                  <Text style={{ color: '#F59E0B' }}>— {t('sparring.goal')} {weeklyGoal}</Text>
                </Text>
              </>
            )}
          </View>
        )}

        {/* ── GRAPHIQUE WIN RATE MENSUEL ── */}
        {monthlyWinRate.length > 0 && (() => {
          const currentWR = monthlyWinRate[monthlyWinRate.length - 1]?.value ?? 0;
          const wrColor = currentWR >= 60 ? '#22C55E' : currentWR >= 40 ? '#F59E0B' : '#EF4444';
          return (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.monthlyWinRate')}</Text>
              <View style={[styles.countBadge, { backgroundColor: `${wrColor}18` }]}>
                <Text style={[styles.countBadgeText, { color: wrColor }]}>
                  {currentWR}%
                </Text>
              </View>
            </View>
            {monthlyWinRate.length < 3 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                  {t('sparring.notEnoughData')}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', opacity: 0.7 }}>
                  {t('sparring.continueMonths')}
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: 8, marginLeft: -8 }}>
                <BarChart
                  data={monthlyWinRate.map(m => ({
                    value: m.value,
                    label: m.label,
                    frontColor: m.value >= 60 ? '#22C55E' : m.value >= 40 ? '#F59E0B' : '#EF4444',
                    topLabelComponent: () => (
                      <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 2 }}>
                        {m.value}%
                      </Text>
                    ),
                  }))}
                  barWidth={Math.min(44, Math.max(20, Math.floor((SCREEN_WIDTH - 80) / Math.max(monthlyWinRate.length, 6)) - 8))}
                  spacing={10}
                  roundedTop
                  hideRules
                  hideAxesAndRules
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}
                  maxValue={100}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  isAnimated
                  animationDuration={600}
                  width={SCREEN_WIDTH - 80}
                  height={110}
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('sparring.dominant')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('sparring.balanced')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('sparring.needsWork')}</Text>
              </View>
            </View>
          </View>
          );
        })()}

        {/* ── TOP FINITIONS REÇUES (global) ── */}
        {topMethodsTaken.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.sectionHead, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Shield size={16} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Finitions reçues — à défendre</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {topMethodsTaken.map(([name, count]) => (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF444418', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#EF444430' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>{name}</Text>
                  <Text style={{ fontSize: 11, color: '#EF444499', fontWeight: '700' }}>×{count}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 15 }}>
              Les finitions qui te sont le + souvent appliquées. Travaille ta défense sur la première.
            </Text>
          </View>
        )}

        {/* ── PARTENAIRES ── */}
        {partnerStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.sparringPartners')}</Text>
              <View style={[styles.countBadge, { backgroundColor: `${accent}18` }]}>
                <Text style={[styles.countBadgeText, { color: accent }]}>{partnerStats.length}</Text>
              </View>
            </View>

            {/* Sélecteur de tri */}
            {partnerStats.length >= 2 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 4 }} contentContainerStyle={{ gap: 6 }}>
                {([
                  { key: 'volume', label: 'Volume', Icon: BarChart2 },
                  { key: 'winrate', label: 'Win rate', Icon: Trophy },
                  { key: 'recent', label: 'Récent', Icon: Clock },
                  { key: 'level', label: 'Niveau', Icon: Star },
                ] as { key: typeof partnerSortMode; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[]).map(opt => {
                  const active = partnerSortMode === opt.key;
                  const iconColor = active ? '#fff' : colors.textMuted;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setPartnerSortMode(opt.key); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        backgroundColor: active ? accent : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                      }}
                    >
                      <opt.Icon size={12} color={iconColor} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.textMuted }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={{ gap: 10, marginTop: 4 }}>
              {sortedPartners.map((p, idx) => {
                const avatarColor = nameToColor(p.name);
                const initials = getInitials(p.name);
                const winRate = (p.wins + p.losses) > 0
                  ? Math.round((p.wins / (p.wins + p.losses)) * 100)
                  : null;
                const isTop = idx === 0;

                const photoUri = partnerPhotos[p.name.trim().toLowerCase()];

                return (
                  <TouchableOpacity
                    key={p.name}
                    style={[styles.partnerCard, {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                      borderColor: isTop
                        ? '#F59E0B'
                        : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                      borderWidth: isTop ? 1.5 : 1,
                    }]}
                    onPress={() => setSelectedPartner(p)}
                    onLongPress={() => { impactAsync(ImpactFeedbackStyle.Medium); openEditPartner(p.name); }}
                    delayLongPress={500}
                    activeOpacity={0.75}
                  >
                    {/* Avatar — photo ou initiales */}
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          `Photo de ${p.name}`,
                          photoUri ? 'Changer ou supprimer la photo ?' : 'Ajouter une photo ?',
                          [
                            { text: 'Annuler', style: 'cancel' },
                            { text: photoUri ? 'Changer' : 'Ajouter depuis la galerie', onPress: () => pickPhotoForPartner(p.name) },
                            ...(photoUri ? [{ text: 'Supprimer', style: 'destructive' as const, onPress: () => savePartnerPhoto(p.name, '') }] : []),
                          ]
                        );
                      }}
                      style={[styles.avatarCircle, {
                        backgroundColor: photoUri ? 'transparent' : `${avatarColor}28`,
                        borderColor: isTop ? '#F59E0B' : (photoUri ? 'rgba(255,255,255,0.2)' : `${avatarColor}50`),
                        borderWidth: isTop ? 2 : 1.5,
                        overflow: 'hidden',
                      }]}
                    >
                      {photoUri ? (
                        <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '800', color: avatarColor }}>
                          {initials}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Infos */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Text style={[styles.partnerName, { color: colors.text }]} numberOfLines={1}>
                            {p.name}
                          </Text>
                          {winRate !== null && (
                            <View style={[styles.winRateBadge, {
                              backgroundColor: winRate >= 60 ? '#22C55E18' : winRate >= 40 ? '#F59E0B18' : '#EF444418',
                            }]}>
                              <Text style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: winRate >= 60 ? '#22C55E' : winRate >= 40 ? '#F59E0B' : '#EF4444',
                              }}>
                                {winRate}%
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                            {p.totalRounds} {p.totalRounds > 1 ? t('sparring.roundsPlural') : t('sparring.roundSingular')}
                          </Text>
                          <ChevronRight size={13} color={colors.textMuted} />
                        </View>
                      </View>

                      {/* Barre */}
                      <View style={[styles.track, { backgroundColor: trackBg }]}>
                        <View style={[styles.fill, { width: `${(p.totalRounds / maxRounds) * 100}%` as any, backgroundColor: avatarColor }]} />
                      </View>

                      {/* Résultats + subs */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', gap: 5 }}>
                          {(p.wins > 0 || p.losses > 0 || p.draws > 0) && (
                            <>
                              {p.wins > 0 && <RecordPill value={p.wins} label="V" color="#22C55E" />}
                              {p.losses > 0 && <RecordPill value={p.losses} label="D" color="#EF4444" />}
                              {p.draws > 0 && <RecordPill value={p.draws} label="N" color="#F59E0B" />}
                            </>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          {p.submissionsGiven > 0 && (
                            <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>{p.submissionsGiven} sub+</Text>
                          )}
                          {p.submissionsTaken > 0 && (
                            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>{p.submissionsTaken} sub-</Text>
                          )}
                        </View>
                      </View>

                      {/* Note moyenne + évolution */}
                      {p.avgRating != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: p.avgRating <= 3 ? '#22C55E18' : p.avgRating <= 6 ? '#F59E0B18' : p.avgRating <= 8 ? '#EF444418' : '#9333EA18',
                            borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
                          }}>
                            <Star size={10} color={p.avgRating <= 3 ? '#22C55E' : p.avgRating <= 6 ? '#F59E0B' : p.avgRating <= 8 ? '#EF4444' : '#9333EA'} fill={p.avgRating <= 3 ? '#22C55E' : p.avgRating <= 6 ? '#F59E0B' : p.avgRating <= 8 ? '#EF4444' : '#9333EA'} />
                            <Text style={{ fontSize: 10, fontWeight: '900', color: p.avgRating <= 3 ? '#22C55E' : p.avgRating <= 6 ? '#F59E0B' : p.avgRating <= 8 ? '#EF4444' : '#9333EA' }}>
                              {p.avgRating}/10
                            </Text>
                          </View>
                          {p.ratingHistory && p.ratingHistory.length >= 2 && (() => {
                            const first = p.ratingHistory[0].rating;
                            const last = p.ratingHistory[p.ratingHistory.length - 1].rating;
                            const diff = last - first;
                            if (diff > 0) return <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '700' }}>↑ +{diff} pts</Text>;
                            if (diff < 0) return <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '700' }}>↓ {diff} pts</Text>;
                            return null;
                          })()}
                        </View>
                      )}

                      {p.lastSession && (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {t('sparring.lastSession')} : {formatDateShort(p.lastSession)}
                        </Text>
                      )}

                      {/* Bouton Fiche partenaire */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          impactAsync(ImpactFeedbackStyle.Light);
                          router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any);
                        }}
                        style={{
                          marginTop: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          alignSelf: 'flex-start',
                          backgroundColor: partnerHasFiche.has(p.name.trim().toLowerCase())
                            ? '#8B5CF615'
                            : '#EF444415',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: partnerHasFiche.has(p.name.trim().toLowerCase())
                            ? '#8B5CF630'
                            : '#EF444430',
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {partnerHasFiche.has(p.name.trim().toLowerCase()) ? (
                            <ClipboardList size={12} color="#8B5CF6" />
                          ) : (
                            <Plus size={12} color="#EF4444" />
                          )}
                          <Text style={{ fontSize: 11, fontWeight: '800', color: partnerHasFiche.has(p.name.trim().toLowerCase()) ? '#8B5CF6' : '#EF4444' }}>
                            {partnerHasFiche.has(p.name.trim().toLowerCase()) ? 'Voir la fiche' : 'Créer la fiche'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── TECHNIQUES ── */}
        {techniqueStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.techniques')}</Text>
              <View style={[styles.countBadge, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.countBadgeText, { color: '#F59E0B' }]}>{techniqueStats.length}</Text>
              </View>
            </View>

            <View style={{ gap: 10, marginTop: 4 }}>
              {techniqueStats.slice(0, 10).map((tech, idx) => (
                <View key={tech.name} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={[styles.techBadge, {
                    backgroundColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#CD7C32' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'),
                  }]}>
                    <Text style={styles.rankText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.techName, { color: colors.text }]} numberOfLines={1}>{tech.name}</Text>
                      <Text style={[styles.techCount, { color: '#F59E0B' }]}>{tech.count}x</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: trackBg }]}>
                      <View style={[styles.fill, { width: `${(tech.count / maxTech) * 100}%` as any, backgroundColor: '#F59E0B' }]} />
                    </View>
                    {tech.lastSession && (
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                        {t('sparring.lastTime')} : {formatDateShort(tech.lastSession)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── FINITIONS ── */}
        {submissionStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('sparring.submissions')}</Text>
              <View style={[styles.countBadge, { backgroundColor: '#EC489918' }]}>
                <Text style={[styles.countBadgeText, { color: '#EC4899' }]}>{submissionStats.length}</Text>
              </View>
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {submissionStats.map((s, idx) => (
                <View key={s.name} style={[styles.subRow, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  padding: 10,
                }]}>
                  <Text style={[styles.subName, { color: colors.text }]}>{s.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {s.given > 0 && (
                      <View style={[styles.subPill, { backgroundColor: '#22C55E18' }]}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#22C55E' }}>{s.given}</Text>
                        <Text style={{ fontSize: 10, color: '#22C55E' }}>{s.given > 1 ? t('sparring.submittedPlural') : t('sparring.submittedSingular')}</Text>
                      </View>
                    )}
                    {s.taken > 0 && (
                      <View style={[styles.subPill, { backgroundColor: '#EF444418' }]}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>{s.taken}</Text>
                        <Text style={{ fontSize: 10, color: '#EF4444' }}>{s.taken > 1 ? t('sparring.takenPlural') : t('sparring.takenSingular')}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL OBJECTIF ── */}
      <Modal
        visible={showGoalEditor}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalEditor(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.goalModal, { backgroundColor: cardBg }]}>
            <Text style={[styles.goalModalTitle, { color: colors.text }]}>{t('sparring.weeklyGoal')}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>
              {t('sparring.goalDescription')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setGoalInput(String(Math.max(1, parseInt(goalInput || '1', 10) - 5)))}
                style={[styles.goalStepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>-5</Text>
              </TouchableOpacity>
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="number-pad"
                style={[styles.goalInput, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
              />
              <TouchableOpacity
                onPress={() => setGoalInput(String(parseInt(goalInput || '0', 10) + 5))}
                style={[styles.goalStepBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>+5</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={[styles.goalCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => setShowGoalEditor(false)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.goalSaveBtn, { backgroundColor: accent }]}
                onPress={saveGoal}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PARTENAIRE ── */}
      {selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
          colors={colors}
          isDark={isDark}
        />
      )}

      {/* ── MODAL ÉDITION NOM + PHOTO ── */}
      <Modal visible={editingPartner !== null} transparent animationType="slide" onRequestClose={() => setEditingPartner(null)}>
        <View style={{ flex: 1 }}>
          {/* Backdrop — position absolue pour ne pas bloquer les touches sur le contenu */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)' }}
            activeOpacity={1}
            onPress={() => setEditingPartner(null)}
          />
          {/* Contenu — KeyboardAvoidingView entoure uniquement le bas */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            pointerEvents="box-none"
          >
            <View style={{ backgroundColor: colors.backgroundCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
              <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>Modifier le partenaire</Text>
                  <TouchableOpacity onPress={() => setEditingPartner(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <X size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Photo */}
                <TouchableOpacity
                  onPress={pickEditPhoto}
                  style={{ alignSelf: 'center', marginBottom: 20 }}
                  activeOpacity={0.8}
                >
                  <View style={{
                    width: 90, height: 90, borderRadius: 45, overflow: 'hidden',
                    backgroundColor: editPhoto ? 'transparent' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {editPhoto ? (
                      <Image source={{ uri: editPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Camera size={28} color={colors.textMuted} />
                    )}
                  </View>
                  <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B5CF6', borderRadius: 12, padding: 5 }}>
                    <Edit2 size={12} color="#FFF" />
                  </View>
                </TouchableOpacity>
                {editPhoto && (
                  <TouchableOpacity onPress={() => setEditPhoto(null)} style={{ alignSelf: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '700' }}>Supprimer la photo</Text>
                  </TouchableOpacity>
                )}

                {/* Nom */}
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nom</Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderRadius: 12, borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                    paddingHorizontal: 16, paddingVertical: 14,
                    fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 24,
                  }}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Nom du partenaire"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  maxLength={50}
                  returnKeyType="done"
                />

                {/* Bouton sauvegarder */}
                <TouchableOpacity
                  onPress={saveEditPartner}
                  disabled={isSavingEdit || !editName.trim()}
                  style={{
                    backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 16,
                    alignItems: 'center', opacity: (isSavingEdit || !editName.trim()) ? 0.5 : 1,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>
                    {isSavingEdit ? 'Sauvegarde...' : 'Enregistrer'}
                  </Text>
                </TouchableOpacity>

                {/* Bouton supprimer */}
                <TouchableOpacity
                  onPress={confirmDeletePartner}
                  disabled={isSavingEdit}
                  style={{
                    borderRadius: 14, paddingVertical: 14,
                    alignItems: 'center', borderWidth: 1.5, borderColor: '#EF4444',
                    opacity: isSavingEdit ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444' }}>
                    Supprimer ce partenaire
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

// ============================================
// MODAL DÉTAIL PARTENAIRE
// ============================================

interface PartnerDetailModalProps {
  partner: PartnerStats;
  onClose: () => void;
  colors: any;
  isDark: boolean;
}

function PartnerDetailModal({ partner, onClose, colors, isDark }: PartnerDetailModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const winRate = (partner.wins + partner.losses) > 0
    ? Math.round((partner.wins / (partner.wins + partner.losses)) * 100)
    : null;

  // Finitions les plus utilisées contre ce partenaire (legacy + multi-select)
  const subMap: Record<string, { name: string; given: number; taken: number }> = {};
  const addSub = (rawName: string, isWin: boolean) => {
    const display = getMethodDisplayName(rawName.trim());
    const key = display.toLowerCase();
    if (!subMap[key]) subMap[key] = { name: display, given: 0, taken: 0 };
    if (isWin) subMap[key].given++;
    else subMap[key].taken++;
  };
  for (const s of partner.sessions) {
    for (const r of s.rounds) {
      const isWin = r.result === 'win';
      const isLoss = r.result === 'loss';
      if (r.method?.trim()) addSub(r.method, isWin);
      if (isWin) r.methodsGiven?.forEach(m => addSub(m, true));
      if (isLoss) r.methodsTaken?.forEach(m => addSub(m, false));
    }
  }
  const topSubs = Object.values(subMap)
    .map(v => ({ ...v, total: v.given + v.taken }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.partnerModal, { backgroundColor: colors.backgroundCard }]}>
          {/* Header */}
          <View style={styles.partnerModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.partnerModalName, { color: colors.text }]}>{partner.name}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                {partner.sessions.length} {partner.sessions.length > 1 ? t('sparring.sessionsPlural') : t('sparring.sessionSingular')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Actions rapides */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onClose();
                setTimeout(() => {
                  router.push(`/social-share/duel-card?partnerName=${encodeURIComponent(partner.name)}` as any);
                }, 150);
              }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EC489915', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#EC489930' }}
            >
              <Share2 size={14} color="#EC4899" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#EC4899' }}>Partager le duel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onClose();
                setTimeout(() => {
                  router.push(`/sparring-partners?partnerName=${encodeURIComponent(partner.name)}` as any);
                }, 150);
              }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#8B5CF615', borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#8B5CF630' }}
            >
              <Target size={14} color="#8B5CF6" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#8B5CF6' }}>Profil tactique</Text>
            </TouchableOpacity>
          </View>

          {/* Stats globales */}
          <View style={[styles.partnerStatsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 12 }]}>
            <MiniStat value={partner.totalRounds} label={t('sparring.rounds')} color="#8B5CF6" />
            <MiniStat value={partner.wins} label={t('sparring.victories')} color="#22C55E" />
            <MiniStat value={partner.losses} label={t('sparring.defeats')} color="#EF4444" />
            {winRate !== null && <MiniStat value={`${winRate}%`} label={t('sparring.winRate')} color={winRate >= 60 ? '#22C55E' : winRate >= 40 ? '#F59E0B' : '#EF4444'} />}
            {partner.avgRating != null && <MiniStat value={`${partner.avgRating}/10`} label="Niveau" color={partner.avgRating <= 3 ? '#22C55E' : partner.avgRating <= 6 ? '#F59E0B' : partner.avgRating <= 8 ? '#EF4444' : '#9333EA'} />}
          </View>

          {/* Évolution de la note */}
          {partner.ratingHistory && partner.ratingHistory.length >= 2 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.partnerSectionLabel, { color: colors.textMuted }]}>ÉVOLUTION DU NIVEAU</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8, height: 50 }}>
                {partner.ratingHistory.map((h, i) => {
                  const barColor = h.rating <= 3 ? '#22C55E' : h.rating <= 6 ? '#F59E0B' : h.rating <= 8 ? '#EF4444' : '#9333EA';
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 8, color: colors.textMuted, fontWeight: '700' }}>{h.rating}</Text>
                      <View style={{ width: '100%', height: (h.rating / 10) * 36, backgroundColor: barColor, borderRadius: 4, opacity: 0.85 }} />
                      <Text style={{ fontSize: 7, color: colors.textMuted }} numberOfLines={1}>
                        {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {(() => {
                const first = partner.ratingHistory[0].rating;
                const last = partner.ratingHistory[partner.ratingHistory.length - 1].rating;
                const diff = last - first;
                if (diff > 0) return <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700', marginTop: 4 }}>↑ Adversaire +{diff} pts plus fort qu'au début</Text>;
                if (diff < 0) return <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700', marginTop: 4 }}>↓ Tu progressas : adversaire perçu {Math.abs(diff)} pts moins difficile</Text>;
                return <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>→ Niveau stable</Text>;
              })()}
            </View>
          )}

          {/* Top finitions */}
          {topSubs.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.partnerSectionLabel, { color: colors.textMuted }]}>{t('sparring.submissionsTitle')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {topSubs.map((sub, i) => (
                  <View key={i} style={[styles.subChip, {
                    backgroundColor: sub.given > sub.taken
                      ? (isDark ? 'rgba(22,163,74,0.12)' : 'rgba(22,163,74,0.08)')
                      : sub.taken > sub.given
                        ? (isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.08)')
                        : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                  }]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      {sub.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                      {sub.given > 0 ? `${sub.given} ${sub.given > 1 ? t('sparring.submittedPlural') : t('sparring.submittedSingular')}` : ''}
                      {sub.given > 0 && sub.taken > 0 ? '  ·  ' : ''}
                      {sub.taken > 0 ? `${sub.taken} ${sub.taken > 1 ? t('sparring.takenPlural') : t('sparring.takenSingular')}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Historique des séances */}
          <Text style={[styles.partnerSectionLabel, { color: colors.textMuted, marginBottom: 8 }]}>{t('sparring.history')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {partner.sessions.map((session, sIdx) => (
              <View key={sIdx} style={[styles.sessionBlock, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }]}>
                {/* Date + sport */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                    {formatDateFull(session.date)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{getSportName(session.sport)}</Text>
                </View>

                {/* Thème technique */}
                {session.technicalTheme && (
                  <Text style={{ fontSize: 12, color: '#F59E0B', fontWeight: '600', marginBottom: 6 }}>
                    {session.technicalTheme}
                  </Text>
                )}

                {/* Rounds avec ce partenaire */}
                {session.rounds.map((r, rIdx) => {
                  const allGiven = r.methodsGiven?.length ? r.methodsGiven : (r.method && r.result === 'win' ? [r.method] : []);
                  const allTaken = r.methodsTaken?.length ? r.methodsTaken : (r.method && r.result === 'loss' ? [r.method] : []);
                  return (
                    <View key={rIdx} style={[styles.roundLine, {
                      borderLeftColor: resultColor(r.result ?? ''),
                    }]}>
                      {/* En-tête : numéro + résultat + note */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.resultDot, { backgroundColor: resultColor(r.result ?? '') }]}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFF' }}>
                            {resultLabel(r.result ?? '')}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                          {t('sparring.roundLabel', { num: r.number ?? rIdx + 1 })}
                        </Text>
                        {r.partnerRating != null && (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                            backgroundColor: r.partnerRating <= 3 ? '#22C55E18' : r.partnerRating <= 6 ? '#F59E0B18' : r.partnerRating <= 8 ? '#EF444418' : '#9333EA18',
                            borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                          }}>
                            <Star size={10} color={r.partnerRating <= 3 ? '#22C55E' : r.partnerRating <= 6 ? '#F59E0B' : r.partnerRating <= 8 ? '#EF4444' : '#9333EA'} fill={r.partnerRating <= 3 ? '#22C55E' : r.partnerRating <= 6 ? '#F59E0B' : r.partnerRating <= 8 ? '#EF4444' : '#9333EA'} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: r.partnerRating <= 3 ? '#22C55E' : r.partnerRating <= 6 ? '#F59E0B' : r.partnerRating <= 8 ? '#EF4444' : '#9333EA' }}>
                              {r.partnerRating}/10
                            </Text>
                          </View>
                        )}
                      </View>
                      {/* Finitions données */}
                      {allGiven.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {allGiven.map((m, mi) => (
                            <View key={mi} style={{ backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : 'rgba(22,163,74,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '600' }}>{getMethodDisplayName(m)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Finitions reçues */}
                      {allTaken.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {allTaken.map((m, mi) => (
                            <View key={mi} style={{ backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '600' }}>{getMethodDisplayName(m)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {/* Notes du round */}
                      {r.notes?.trim() && (
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 15 }} numberOfLines={3}>
                          {r.notes}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// PODIUM
// ============================================

const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7C32'];
const MEDAL_BG     = ['#FEF3C7', '#F3F4F6', '#FDF2E9'];
const MEDAL_LABELS = ['1', '2', '3'];
const PODIUM_HEIGHTS = [110, 80, 58];  // hauteur du socle (1er plus grand)
const PODIUM_ORDER   = [1, 0, 2];      // affichage: 2ème | 1er | 3ème

interface PodiumSectionProps {
  partners: PartnerStats[];
  accent: string;
  colors: any;
  isDark: boolean;
  onSelect: (p: PartnerStats) => void;
  partnerPhotos: Record<string, string>;
}

function PodiumSection({ partners, accent, colors, isDark, onSelect, partnerPhotos }: PodiumSectionProps) {
  const { t } = useI18n();
  const displayOrder = PODIUM_ORDER.filter(i => i < partners.length);

  return (
    <View style={[styles.podiumCard, {
      backgroundColor: colors.backgroundCard,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    }]}>
      {/* ── Bande titre ── */}
      <View style={[styles.podiumTitleBar, { backgroundColor: `${accent}12` }]}>
        <View style={[styles.podiumTitleDot, { backgroundColor: accent }]} />
        <Text style={[styles.podiumTitle, { color: accent }]}>TOP SPARRING · PAR VOLUME</Text>
        <View style={[styles.podiumTitleDot, { backgroundColor: accent }]} />
      </View>

      {/* ── Scène ── */}
      <View style={styles.podiumStage}>
        {displayOrder.map((partnerIdx) => {
          const p = partners[partnerIdx];
          const rank       = partnerIdx;
          const medalColor = MEDAL_COLORS[rank];
          const medalBg    = isDark ? `${medalColor}25` : MEDAL_BG[rank];
          const podiumH    = PODIUM_HEIGHTS[rank];
          const isFirst    = rank === 0;
          const avatarColor = nameToColor(p.name);
          const firstName  = p.name.trim().split(/\s+/)[0];
          const photoUri = partnerPhotos[p.name.trim().toLowerCase()];
          const winRate = (p.wins + p.losses) > 0
            ? Math.round((p.wins / (p.wins + p.losses)) * 100)
            : null;

          return (
            <TouchableOpacity
              key={p.name}
              style={[styles.podiumSlot, isFirst && { marginTop: -18 }]}
              onPress={() => onSelect(p)}
              activeOpacity={0.75}
            >
              {/* Étoile sur le 1er */}
              {isFirst && (
                <View style={{ alignItems: 'center', marginBottom: 2 }}>
                  <Star size={18} color={MEDAL_COLORS[0]} fill={MEDAL_COLORS[0]} />
                </View>
              )}

              {/* Avatar */}
              <View style={[
                styles.podiumAvatarWrap,
                isFirst && {
                  shadowColor: medalColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 8,
                },
              ]}>
                <View style={[
                  styles.podiumAvatar,
                  {
                    backgroundColor: photoUri ? 'transparent' : `${avatarColor}18`,
                    borderColor: medalColor,
                    borderWidth: isFirst ? 3 : 2,
                    width: isFirst ? 68 : 52,
                    height: isFirst ? 68 : 52,
                    borderRadius: isFirst ? 34 : 26,
                    overflow: 'hidden',
                  },
                ]}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Text
                      style={{
                        fontSize: isFirst ? 16 : 12,
                        fontWeight: '900',
                        color: avatarColor,
                        paddingHorizontal: 4,
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {firstName}
                    </Text>
                  )}
                </View>
                {/* Badge médaille rond */}
                <View style={[styles.podiumMedalBadge, {
                  backgroundColor: medalColor,
                  borderColor: colors.backgroundCard,
                  width: isFirst ? 26 : 22,
                  height: isFirst ? 26 : 22,
                  borderRadius: isFirst ? 13 : 11,
                }]}>
                  <Text style={[styles.podiumMedalText, { fontSize: isFirst ? 11 : 9 }]}>
                    {MEDAL_LABELS[rank]}
                  </Text>
                </View>
              </View>

              {/* Nom */}
              <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                {p.name}
              </Text>

              {/* Win rate */}
              {winRate !== null ? (
                <Text style={[styles.podiumWinRate, {
                  color: winRate >= 60 ? '#16A34A' : winRate >= 40 ? '#D97706' : '#DC2626',
                }]}>
                  {winRate}%
                </Text>
              ) : (
                <Text style={[styles.podiumWinRate, { color: colors.textMuted }]}>—</Text>
              )}

              {/* Socle coloré */}
              <View style={[styles.podiumBase, {
                height: podiumH,
                backgroundColor: medalBg,
                borderTopColor: medalColor,
                borderLeftColor: `${medalColor}40`,
                borderRightColor: `${medalColor}40`,
                borderBottomColor: `${medalColor}40`,
              }]}>
                <View style={{ gap: 4, alignItems: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: isFirst ? 13 : 11, fontWeight: '900', color: medalColor }}>
                    #{MEDAL_LABELS[rank]}
                  </Text>
                  {p.wins > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{p.wins}V</Text>
                  )}
                  {p.losses > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>{p.losses}D</Text>
                  )}
                  {p.draws > 0 && (
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#D97706' }}>{p.draws}N</Text>
                  )}
                  <Text style={{ fontSize: 10, color: isDark ? `${medalColor}99` : `${medalColor}CC` }}>
                    {p.totalRounds} round{p.totalRounds > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.podiumHint, { color: colors.textMuted }]}>{t('sparring.podiumHint')}</Text>
    </View>
  );
}

// ============================================
// MINI-COMPOSANTS
// ============================================

const GlobalStat: React.FC<{ value: number | string; label: string; color: string }> = ({ value, label, color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.globalStatItem}>
      <Text style={[styles.globalStatValue, { color }]}>{value}</Text>
      <Text style={[styles.globalStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const MiniStat: React.FC<{ value: number | string; label: string; color: string }> = ({ value, label, color }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.globalStatItem}>
      <Text style={{ fontSize: 20, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
};

const RecordPill: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={[styles.recordPill, { backgroundColor: `${color}18` }]}>
    <Text style={{ fontSize: 12, fontWeight: '800', color }}>{value}</Text>
    <Text style={{ fontSize: 10, fontWeight: '700', color }}>{label}</Text>
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Cards
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    gap: 0,
  },

  // Filtres sport
  sportPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sportPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Vue d'ensemble — rangée compacte horizontale
  overviewGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  overviewBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
    textAlign: 'center',
  },

  // Objectif hebdo
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  // Section header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Séances récentes — cartes
  recentCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 10,
  },
  recentDateBadge: {
    width: 42,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    flexShrink: 0,
  },
  roundsBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Partenaires — cartes avatar
  partnerCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  winRateBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // Barre de progression
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },

  // Pills résultat
  recordPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },

  // Technique
  techBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  techName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  techCount: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Soumissions
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  subName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  subPill: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 1,
  },

  // Vide
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Globaux (pour MiniStat / GlobalStat)
  globalStatItem: {
    alignItems: 'center',
  },
  globalStatValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  globalStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Overlays / Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  // Modal objectif
  goalModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  goalModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  goalInput: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    width: 90,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
  },
  goalStepBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  goalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  // Modal partenaire
  partnerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    flex: 1,
  },
  partnerModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  partnerModalName: {
    fontSize: 22,
    fontWeight: '800',
  },
  partnerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 16,
  },
  partnerSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  sessionBlock: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  roundLine: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 6,
    gap: 2,
  },
  resultDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Séparateur (conservé pour compatibilité interne)
  sep: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },

  // Podium
  podiumCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  podiumTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  podiumTitleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  podiumTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  podiumStage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumMedalBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  podiumMedalText: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  podiumWinRate: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  podiumBase: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderTopWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  podiumHint: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 10,
    letterSpacing: 0.3,
  },
});
