/**
 * Carnet YOROI (vague 16) : deux niveaux de navigation au plus.
 * 1. Records, Techniques, Videos, et Combat si tu pratiques un sport de combat.
 * 2. Dans chaque partie, un filtre par sport (ou par partie pour Combat).
 * En-tete simple : titre, une phrase, une action principale selon la partie ouverte, le reste dans un menu.
 * Toutes les fonctions et les donnees d'avant sont gardees (memes cles) : corbeille, bibliotheque
 * d'exercices, synchronisation montre, partage des perfs, seances et analyses par sport.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import {
  addBenchmarkEntry, addSkillNote, cleanDemoData, createBenchmark, createSkill, deleteBenchmark, deleteBenchmarkEntry, deleteSkill, deleteSkillNote,
  emptyTrash, getBenchmarkPR, getBenchmarks, getSkills, getTrashBenchmarks, getTrashCount, getTrashSkills, incrementDrillCount, restoreBenchmark,
  restoreSkill, updateSkillStatus, updateSkillVideoUrl,
} from '@/lib/carnetService';
import type { Benchmark, BenchmarkCategory, BenchmarkEntry, BenchmarkUnit, Skill, SkillCategory, SkillStatus, TrashItem } from '@/lib/carnetService';
import { EXERCISE_LIBRARY, canonicalExerciseName } from '@/constants/exerciseLibrary';
import { FREE_LIMITS } from '@/lib/v2/premium/limits';
import { usePremium } from '@/context/PremiumContext';
import { getPendingVictory } from '@/lib/victoryTrigger';
import { safeOpenURL } from '@/lib/security/validators';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import type { VictorySessionData } from '@/components/VictoryShareModal';
import { entryText, sortedEntries } from '@/lib/v2/carnet/journal';
import { FAMILY_ILLUS, familyOf, gainBetween } from '@/lib/v2/carnet/records';
import { usePratique } from '@/lib/v2/carnet/pratique';
import { P, CIcon, IconBtn, ScreenHead, ChoiceLine, Toast, BigButton } from '@/components/yoroi/v2/carnet/ui';
import { AddPill, Illus, SECTION_META, SectionTabs } from '@/components/yoroi/v2/carnet/nav';
import type { CarnetSection } from '@/components/yoroi/v2/carnet/nav';
import { CombatSection } from '@/components/yoroi/v2/carnet/CombatSection';
import type { CombatPart } from '@/components/yoroi/v2/carnet/CombatSection';
import { RecordShareSheet } from '@/components/yoroi/v2/carnet/RecordShareSheet';
import { partagerTexte } from '@/lib/v2/partage/texte';
import type { ShareRecord } from '@/components/yoroi/v2/carnet/RecordShareSheet';
import { RecordsView } from '@/components/yoroi/v2/carnet/RecordsView';
import { SkillsView } from '@/components/yoroi/v2/carnet/SkillsView';
import { VideosView } from '@/components/yoroi/v2/carnet/VideosView';
import { RecordPicker } from '@/components/yoroi/v2/carnet/RecordPicker';
import { EntrySheet } from '@/components/yoroi/v2/carnet/EntrySheet';
import type { EntryValues } from '@/components/yoroi/v2/carnet/EntrySheet';
import { BenchmarkDetail } from '@/components/yoroi/v2/carnet/BenchmarkDetail';
import { SkillDetail } from '@/components/yoroi/v2/carnet/SkillDetail';
import { AddSkillSheet } from '@/components/yoroi/v2/carnet/AddSkillSheet';
import { TrashSheet } from '@/components/yoroi/v2/carnet/TrashSheet';
import { ResultSheet } from '@/components/yoroi/v2/carnet/ResultSheet';
import type { ResultInfo } from '@/components/yoroi/v2/carnet/ResultSheet';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';

const JOURNAL_CACHE_KEY = '@yoroi_journal_data_cache_v1';
const JOURNAL_CACHE_TTL = 5 * 60 * 1000;
// Saisies gratuites et sans limite : suivis et techniques ne sont plus plafonnes
// Limites de la version gratuite : une seule source, lib/v2/premium/limits.ts (sans limite aujourd'hui)
const FREE_BENCHMARKS_LIMIT: number = FREE_LIMITS.carnetBenchmarks;
const FREE_SKILLS_LIMIT: number = FREE_LIMITS.carnetSkills;

export default function TrainingJournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const params = useLocalSearchParams<{ tab?: string; add?: string }>();

  // Donnees
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Corbeille
  const [trashBenchmarks, setTrashBenchmarks] = useState<TrashItem<Benchmark>[]>([]);
  const [trashSkills, setTrashSkills] = useState<TrashItem<Skill>[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  // Navigation : la partie ouverte (niveau 1) ; chaque partie gere son filtre par sport (niveau 2)
  const initialTab = String(params.tab ?? 'records');
  const combatParts: CombatPart[] = ['sparring', 'competitions', 'positions', 'soumissions'];
  const [section, setSection] = useState<CarnetSection>(
    initialTab === 'techniques' || initialTab === 'videos' ? initialTab : combatParts.includes(initialTab as CombatPart) || initialTab === 'combat' ? 'combat' : 'records',
  );
  const combatInitial: CombatPart = combatParts.includes(initialTab as CombatPart) ? (initialTab as CombatPart) : 'sparring';
  const [videoAddKey, setVideoAddKey] = useState(0);

  // Feuilles et details
  const [combatMenu, setCombatMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [picker, setPicker] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showBenchmarkDetail, setShowBenchmarkDetail] = useState(false);
  const [showSkillDetail, setShowSkillDetail] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Formulaire technique
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('jjb_garde');
  const [newSkillStatus, setNewSkillStatus] = useState<SkillStatus>('to_learn');
  const [newSkillNotes, setNewSkillNotes] = useState('');
  const [newSkillVideoUri, setNewSkillVideoUri] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [drillIncrement, setDrillIncrement] = useState('10');
  const [editingVideoUrl, setEditingVideoUrl] = useState('');

  // Partage
  const [userWeight, setUserWeight] = useState(75);
  const [, setClubName] = useState('');
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [pendingVictory, setPendingVictoryState] = useState<VictorySessionData | null>(null);
  const [pendingShare, setPendingShare] = useState<ShareRecord | null>(null);

  // ─── Chargement ───────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const screenshot = (await AsyncStorage.getItem('@yoroi_journal_screenshot_mode')) === 'true';
      if (screenshot) {
        const now = new Date().toISOString();
        setBenchmarks([
          { id: 'bench_1', name: 'Développé couché', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#2C4A84', createdAt: now, muscleGroup: 'Pectoraux', entries: [{ id: 'e1', value: 100, reps: 5, date: now, rpe: 9, notes: 'Record personnel' }, { id: 'e2', value: 95, reps: 5, date: new Date(Date.now() - 86400000 * 7).toISOString(), rpe: 8 }] },
          { id: 'bench_2', name: 'Squat', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#2C4A84', createdAt: now, muscleGroup: 'Jambes', entries: [{ id: 'e3', value: 140, reps: 3, date: now, rpe: 9 }] },
          { id: 'bench_3', name: '10 km', category: 'running', unit: 'time', iconName: 'timer', color: '#3D5D9E', createdAt: now, entries: [{ id: 'e4', value: 2400, date: now, duration: 40, distance: 10 }] },
        ]);
        setSkills([
          { id: 'skill_1', name: 'Triangle', category: 'jjb_soumission', status: 'mastered', drillCount: 150, createdAt: now, updatedAt: now, notes: [{ id: 'n1', text: 'Bien couper l’angle', date: now }] },
          { id: 'skill_2', name: 'Passage toreando', category: 'jjb_passage', status: 'in_progress', drillCount: 45, createdAt: now, updatedAt: now, notes: [] },
          { id: 'skill_3', name: 'Berimbolo', category: 'jjb_garde', status: 'to_learn', drillCount: 0, createdAt: now, updatedAt: now, notes: [] },
        ]);
        return;
      }
      try {
        const cached = await AsyncStorage.getItem(JOURNAL_CACHE_KEY);
        if (cached) {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < JOURNAL_CACHE_TTL) {
            if (data.benchmarks?.length) setBenchmarks(data.benchmarks);
            if (data.skills?.length) setSkills(data.skills);
          }
        }
      } catch {
        // cache illisible
      }
      const [b, s, count] = await Promise.all([getBenchmarks(), getSkills(), getTrashCount()]);
      setBenchmarks(b);
      setSkills(s);
      setTrashCount(count);
      AsyncStorage.setItem(JOURNAL_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: { benchmarks: b, skills: s } })).catch(() => {});
    } catch (error) {
      logger.error('Chargement du carnet impossible', error);
    }
  }, []);

  const loadTrash = useCallback(async () => {
    try {
      const [b, s, c] = await Promise.all([getTrashBenchmarks(), getTrashSkills(), getTrashCount()]);
      setTrashBenchmarks(b);
      setTrashSkills(s);
      setTrashCount(c);
    } catch (error) {
      logger.error('Chargement de la corbeille impossible', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const a = DeviceEventEmitter.addListener('CARNET_UPDATED', () => {
      AsyncStorage.removeItem(JOURNAL_CACHE_KEY).catch(() => {});
      loadData();
    });
    const b = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, loadData);
    return () => {
      a.remove();
      b.remove();
    };
  }, [loadData]);

  useEffect(() => {
    (async () => {
      try {
        const [w, c] = await Promise.all([AsyncStorage.getItem('yoroi_user_weight'), AsyncStorage.getItem('yoroi_club_name')]);
        if (w) setUserWeight(parseFloat(w));
        if (c) setClubName(c);
      } catch (e) {
        logger.error('Préférences illisibles', e);
      }
      const pending = await getPendingVictory();
      if (pending) setPendingVictoryState(pending);
    })();
  }, []);

  // Victoire en attente (venant du calendrier) : on l'ouvre une fois l'ecran pose
  useEffect(() => {
    if (!pendingVictory) return;
    const t = setTimeout(() => {
      setShare({ exerciseName: pendingVictory.exerciseName, performance: pendingVictory.performance, date: pendingVictory.date, isPR: pendingVictory.isPR });
      setPendingVictoryState(null);
    }, 500);
    return () => clearTimeout(t);
  }, [pendingVictory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await AsyncStorage.removeItem(JOURNAL_CACHE_KEY).catch(() => {});
    await loadData();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }, [loadData]);

  const changed = () => DeviceEventEmitter.emit(DATA_CHANGED_EVENT);

  // ─── Donnees calculees ────────────────────────────────────────────────

  const withEntries = useMemo(() => benchmarks.filter((b) => b.entries && b.entries.length > 0), [benchmarks]);
  const totals = useMemo(
    () => ({
      perfs: withEntries.reduce((n, b) => n + (b.entries?.length || 0), 0),
      mastered: skills.filter((s) => s.status === 'mastered').length,
      drills: skills.reduce((n, s) => n + (s.drillCount || 0), 0),
    }),
    [withEntries, skills],
  );
  const pratique = usePratique(useMemo(() => Array.from(new Set(skills.map((x) => String(x.category)))), [skills]));
  const sections: CarnetSection[] = pratique.combat ? ['records', 'techniques', 'videos', 'combat'] : ['records', 'techniques', 'videos'];

  // Partie Combat demandee sans sport de combat : retour aux records une fois la pratique connue
  useEffect(() => {
    if (section === 'combat' && pratique.loaded && !pratique.combat) setSection('records');
  }, [section, pratique.loaded, pratique.combat]);

  // ─── Records ──────────────────────────────────────────────────────────

  const openAddBenchmark = () => {
    if (!isPremium && benchmarks.length >= FREE_BENCHMARKS_LIMIT) {
      ouvrirPaywall('progression_mouvements', benchmarks.length);
      return;
    }
    setPicker(true);
  };

  const openAddSkill = (name?: string) => {
    if (!isPremium && skills.length >= FREE_SKILLS_LIMIT) {
      ouvrirPaywall('progression_mouvements', skills.length);
      return;
    }
    if (name) setNewSkillName(name);
    setShowAddSkill(true);
  };

  const openEntry = (b: Benchmark) => {
    setSelectedBenchmark(b);
    setShowEntry(true);
  };

  const handlePickTemplate = async (name: string, category: BenchmarkCategory, unit: BenchmarkUnit, muscleGroup?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      let target: Benchmark | null | undefined = benchmarks.find((b) => b.name === name);
      if (!target) target = await createBenchmark(name, category, unit, undefined, undefined, muscleGroup);
      if (target) {
        setPicker(false);
        setTimeout(() => openEntry(target as Benchmark), 300);
      }
    } catch (error) {
      logger.error('Ajout rapide impossible', error);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCustom = async (name: string, category: BenchmarkCategory, unit: BenchmarkUnit) => {
    if (busy) return;
    if (!isPremium && benchmarks.length >= FREE_BENCHMARKS_LIMIT) {
      appAlert('Limite atteinte', `Tu as atteint la limite de ${FREE_BENCHMARKS_LIMIT} suivis en version gratuite. Passe à Premium pour en créer autant que tu veux.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Débloquer Premium', onPress: () => ouvrirPaywall('progression_mouvements', benchmarks.length) },
      ]);
      return;
    }
    if (!name.trim()) return;
    setBusy(true);
    try {
      const created = await createBenchmark(name, category, unit);
      if (created) {
        setPicker(false);
        await loadData();
        setToast('Suivi créé');
        setTimeout(() => openEntry(created), 300);
      }
    } catch (error) {
      logger.error('Création du suivi impossible', error);
      appAlert('Oups', 'Le suivi n’a pas pu être créé.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddEntry = async (v: EntryValues) => {
    if (busy || !selectedBenchmark) return;
    const b = selectedBenchmark;
    setBusy(true);
    try {
      const currentPR = getBenchmarkPR(b);
      const entry = await addBenchmarkEntry(b.id, v.value, v.rpe, v.notes, v.date, v.reps, v.duration, v.calories, v.advanced);
      if (entry) {
        const isPR = currentPR ? (b.unit === 'time' ? v.value < currentPR.value : v.value > currentPR.value) : true;
        const perf = entryText(b, { id: 'tmp', value: v.value, reps: v.reps, date: v.date.toISOString(), distance: v.advanced.distance, duration: v.duration });
        const previous = currentPR ? entryText(b, currentPR) : undefined;
        setShare(null);
        const shareData: ShareRecord = { exerciseName: b.name, performance: perf, date: v.date.toISOString(), isPR, previous: isPR ? previous : undefined };
        setShowEntry(false);
        setPendingShare(shareData);
        const gain = isPR && currentPR ? gainBetween(b, currentPR.value, v.value) : null;
        setTimeout(() => setResult({ name: b.name, performance: perf, isPR, recordText: previous, gain, illus: FAMILY_ILLUS[familyOf(b)], first: !currentPR }), 350);
        const updated = await getBenchmarks();
        setBenchmarks(updated);
        const refreshed = updated.find((x) => x.id === b.id);
        if (refreshed) setSelectedBenchmark(refreshed);
        changed();
      }
    } catch (error) {
      logger.error('Ajout de la perf impossible', error);
      appAlert('Oups', 'La perf n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  };

  const shareBenchmark = (b: Benchmark, entry?: BenchmarkEntry, isPR?: boolean) => {
    const e = entry ?? [...b.entries].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())[0];
    if (!e) return;
    const pr = getBenchmarkPR(b);
    const pr2 = isPR ?? (!!pr && pr.id === e.id);
    // ancien record : le meilleur avant cette perf
    const before = sortedEntries(b).filter((x) => new Date(x.date).getTime() < new Date(e.date).getTime());
    const prev = before.length > 0 ? before.reduce((m, x) => (b.unit === 'time' ? (x.value < m.value ? x : m) : x.value > m.value ? x : m)) : null;
    setShare({ exerciseName: b.name, performance: entryText(b, e), date: e.date, isPR: pr2, previous: pr2 && prev ? entryText(b, prev) : undefined });
  };

  const handleDeleteBenchmark = (id: string) => {
    appAlert('Supprimer ce suivi ?', 'Il ira dans la corbeille, tu pourras le restaurer.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteBenchmark(id);
          setShowBenchmarkDetail(false);
          setSelectedBenchmark(null);
          await loadData();
          changed();
          setToast('Suivi mis à la corbeille');
        },
      },
    ]);
  };

  const quickDeleteBenchmark = async (b: Benchmark) => {
    await deleteBenchmark(b.id);
    await loadData();
    changed();
    setToast('Suivi mis à la corbeille');
  };

  const handleDeleteEntry = async (e: BenchmarkEntry) => {
    if (!selectedBenchmark) return;
    await deleteBenchmarkEntry(selectedBenchmark.id, e.id);
    const updated = await getBenchmarks();
    setBenchmarks(updated);
    const refreshed = updated.find((x) => x.id === selectedBenchmark.id);
    if (refreshed) setSelectedBenchmark(refreshed);
    changed();
  };

  // ─── Techniques ───────────────────────────────────────────────────────

  const saveVideoPermanently = async (tempUri: string): Promise<string | null> => {
    try {
      const dir = `${FileSystem.documentDirectory}skill_videos/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}skill_${Date.now()}.mp4`;
      await FileSystem.copyAsync({ from: tempUri, to: dest });
      return dest;
    } catch (error) {
      logger.error('Copie de la vidéo impossible', error);
      return null;
    }
  };

  const pickSkillVideo = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      appAlert('Accès refusé', 'Autorise l’accès à la galerie pour ajouter une vidéo.');
      return;
    }
    const r = await launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 0.8 });
    if (!r.canceled && r.assets[0]) {
      const uri = await saveVideoPermanently(r.assets[0].uri);
      if (uri) setNewSkillVideoUri(uri);
      else appAlert('Oups', 'La vidéo n’a pas pu être enregistrée.');
    }
  };

  const recordSkillVideo = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      appAlert('Accès refusé', 'Autorise l’accès à la caméra pour filmer.');
      return;
    }
    const r = await launchCameraAsync({ mediaTypes: ['videos'], allowsEditing: true, quality: 0.8, videoMaxDuration: 60 });
    if (!r.canceled && r.assets[0]) {
      const uri = await saveVideoPermanently(r.assets[0].uri);
      if (uri) setNewSkillVideoUri(uri);
      else appAlert('Oups', 'La vidéo n’a pas pu être enregistrée.');
    }
  };

  const handleAddSkill = async () => {
    if (busy) return;
    if (!isPremium && skills.length >= FREE_SKILLS_LIMIT) {
      appAlert('Limite atteinte', `Tu as atteint la limite de ${FREE_SKILLS_LIMIT} techniques en version gratuite. Passe à Premium pour en ajouter autant que tu veux.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Débloquer Premium', onPress: () => ouvrirPaywall('progression_mouvements', skills.length) },
      ]);
      return;
    }
    if (!newSkillName.trim()) return;
    setBusy(true);
    try {
      const created = await createSkill(newSkillName.trim(), newSkillCategory, newSkillStatus, newSkillNotes.trim() || undefined);
      if (created && newSkillVideoUri) await updateSkillVideoUrl(created.id, newSkillVideoUri);
      if (created) {
        setShowAddSkill(false);
        setNewSkillName('');
        setNewSkillStatus('to_learn');
        setNewSkillNotes('');
        setNewSkillVideoUri(null);
        setToast(newSkillStatus === 'mastered' ? 'Technique maîtrisée, bravo' : 'Technique ajoutée');
        await loadData();
        changed();
      }
    } catch (error) {
      logger.error('Création de la technique impossible', error);
      appAlert('Oups', 'La technique n’a pas pu être créée.');
    } finally {
      setBusy(false);
    }
  };

  const refreshSkill = async (id: string) => {
    const updated = await getSkills();
    setSkills(updated);
    const r = updated.find((s) => s.id === id);
    if (r) setSelectedSkill(r);
  };

  const handleUpdateSkillStatus = async (id: string, status: SkillStatus) => {
    await updateSkillStatus(id, status);
    await refreshSkill(id);
    if (status === 'mastered') setToast('Maîtrisée : tampon posé');
    changed();
  };

  const handleAddNote = async () => {
    if (busy || !selectedSkill || !newNoteText.trim()) return;
    setBusy(true);
    try {
      await addSkillNote(selectedSkill.id, newNoteText.trim());
      setNewNoteText('');
      await refreshSkill(selectedSkill.id);
      changed();
    } catch (error) {
      logger.error('Ajout de note impossible', error);
      appAlert('Oups', 'La note n’a pas pu être ajoutée.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedSkill) return;
    await deleteSkillNote(selectedSkill.id, noteId);
    await refreshSkill(selectedSkill.id);
  };

  const handleIncrementDrill = async (amount?: number) => {
    if (!selectedSkill) return;
    const n = amount ?? (parseInt(drillIncrement, 10) || 10);
    await incrementDrillCount(selectedSkill.id, n);
    await refreshSkill(selectedSkill.id);
    changed();
  };

  const handleUpdateVideoUrl = async () => {
    if (!selectedSkill) return;
    await updateSkillVideoUrl(selectedSkill.id, editingVideoUrl.trim());
    setToast('Lien vidéo enregistré');
    await refreshSkill(selectedSkill.id);
  };

  const handleDeleteSkill = (id: string) => {
    appAlert('Supprimer cette technique ?', 'Elle ira dans la corbeille, tu pourras la restaurer.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteSkill(id);
          setShowSkillDetail(false);
          setSelectedSkill(null);
          await loadData();
          changed();
        },
      },
    ]);
  };

  // ─── Corbeille et outils ──────────────────────────────────────────────

  const handleRestoreBenchmark = async (id: string) => {
    if (await restoreBenchmark(id)) {
      await Promise.all([loadData(), loadTrash()]);
      setToast('Suivi restauré');
      changed();
    } else appAlert('Oups', 'Impossible de restaurer.');
  };

  const handleRestoreSkill = async (id: string) => {
    if (await restoreSkill(id)) {
      await Promise.all([loadData(), loadTrash()]);
      setToast('Technique restaurée');
      changed();
    } else appAlert('Oups', 'Impossible de restaurer.');
  };

  const handleEmptyTrash = () => {
    if (trashCount === 0) return;
    appAlert('Vider la corbeille ?', `${trashCount} élément${trashCount > 1 ? 's' : ''} seront supprimés pour de bon.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Vider',
        style: 'destructive',
        onPress: async () => {
          try {
            await emptyTrash();
            await Promise.all([loadData(), loadTrash()]);
            setShowTrash(false);
            setToast('Corbeille vidée');
          } catch (error) {
            logger.error('Vidage de la corbeille impossible', error);
            appAlert('Oups', 'La corbeille n’a pas pu être vidée.');
          }
        },
      },
    ]);
  };

  const handleInstallLibrary = async () => {
    setMoreMenu(false);
    setBusy(true);
    try {
      for (const ex of EXERCISE_LIBRARY) {
        if (!benchmarks.find((b) => canonicalExerciseName(b.name).toLowerCase() === ex.name.toLowerCase())) {
          await createBenchmark(ex.name, ex.category as BenchmarkCategory, ex.unit as BenchmarkUnit, undefined, undefined, ex.muscle);
        }
      }
      await loadData();
      setToast('Bibliothèque installée');
    } catch (error) {
      logger.error('Installation de la bibliothèque impossible', error);
    } finally {
      setBusy(false);
    }
  };

  const handleCleanDemo = async () => {
    setMoreMenu(false);
    try {
      const r = await cleanDemoData();
      await loadData();
      appAlert(r.removed > 0 ? 'Carnet nettoyé' : 'Déjà propre', r.message);
    } catch (error) {
      logger.error('Nettoyage impossible', error);
    }
  };

  const shareStats = () => {
    setMoreMenu(false);
    partagerTexte({ source: 'carnet', message: `Mon carnet YOROI : ${totals.perfs} perfs notées, ${totals.mastered} techniques maîtrisées, ${totals.drills} répétitions, ${skills.length} techniques en tout.` });
  };

  // ─── Rendu ────────────────────────────────────────────────────────────

  // Ouverture directe de l'import d'une video (accueil, menu +)
  useEffect(() => {
    if (params.add === '1' && section === 'videos') {
      const t = setTimeout(() => (isPremium ? setVideoAddKey((k) => k + 1) : ouvrirPaywall('videos')), 450);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [params.add]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAddPress = () => {
    if (section === 'records') openAddBenchmark();
    else if (section === 'techniques') openAddSkill();
    else if (section === 'videos') {
      if (isPremium) setVideoAddKey((k) => k + 1);
      else ouvrirPaywall('videos');
    } else setCombatMenu(true);
  };

  const overlays = (
    <>
      <EntrySheet visible={showEntry} benchmark={selectedBenchmark} busy={busy} userWeight={userWeight} onClose={() => setShowEntry(false)} onSubmit={handleAddEntry} onError={(m) => appAlert('À compléter', m)} />
      <ResultSheet
        result={result}
        onClose={() => {
          setResult(null);
          setPendingShare(null);
        }}
        onShare={() => {
          const sd = pendingShare;
          setResult(null);
          setPendingShare(null);
          if (sd) setTimeout(() => setShare(sd), 350);
        }}
      />
      <RecordShareSheet data={share} onClose={() => setShare(null)} />
    </>
  );

  const meta = SECTION_META[section];

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.accent} colors={[P.accent]} />}
      >
        <ScreenHead
          title="Carnet"
          subtitle={meta.phrase}
          right={
            <>
              <AddPill label={meta.add} onPress={onAddPress} />
              <IconBtn name="more" label="Options du carnet" badge={trashCount} onPress={() => setMoreMenu(true)} />
            </>
          }
        />

        <View style={{ paddingHorizontal: 22, marginTop: 16 }}>
          <SectionTabs items={sections} value={section} onChange={setSection} />
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 16, gap: 14 }}>
          {section === 'records' ? (
            <RecordsView
              benchmarks={benchmarks}
              pratique={pratique}
              isPremium={isPremium}
              refreshKey={refreshKey}
              onOpen={(b) => { setSelectedBenchmark(b); setShowBenchmarkDetail(true); }}
              onAdd={openEntry}
              onDelete={quickDeleteBenchmark}
              onCreate={openAddBenchmark}
              onPremium={() => ouvrirPaywall('progression_mouvements')}
            />
          ) : null}
          {section === 'techniques' ? (
            <SkillsView
              skills={skills}
              onOpen={(sk) => { setSelectedSkill(sk); setEditingVideoUrl(sk.videoUrl || ''); setShowSkillDetail(true); }}
              onCreate={(name) => openAddSkill(name)}
            />
          ) : null}
          {section === 'videos' && !isPremium ? (
            <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 20, gap: 10, alignItems: 'center' }}>
              <Illus name="videos" size={120} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CIcon name="lock" size={18} color={P.goldDark} />
                <Ink size={20} weight="black" tight>Ta vidéothèque, avec Premium</Ink>
              </View>
              <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>
                Importe les vidéos qui t’inspirent, range-les par muscle ou par sport, et revois le geste juste avant ta séance.
              </Ink>
              <View style={{ alignSelf: 'stretch' }}>
                <BigButton label="Découvrir Premium" onPress={() => ouvrirPaywall('videos')} />
              </View>
            </View>
          ) : null}
          {section === 'videos' && isPremium ? <VideosView refreshKey={refreshKey} addKey={videoAddKey} /> : null}
          {section === 'combat' ? <CombatSection refreshKey={refreshKey} initial={combatInitial} /> : null}
        </View>
      </ScrollView>

      <Sheet visible={combatMenu} onClose={() => setCombatMenu(false)} title="Noter côté combat">
        <ChoiceLine title="Une séance de sparring" sub="Rounds, partenaires, soumissions" icon="swords" onPress={() => { setCombatMenu(false); router.push(`/seance/combat?sport=${pratique.combatSport}` as any); }} />
        <ChoiceLine title="Un combat en compétition" sub="Résultat, méthode, adversaire" icon="trophy" onPress={() => { setCombatMenu(false); router.push('/seance/match' as any); }} />
        <ChoiceLine title="Une compétition à venir" sub="La date, pour le compte à rebours" icon="calendar" onPress={() => { setCombatMenu(false); router.push('/add-competition' as any); }} />
      </Sheet>

      <Sheet visible={moreMenu} onClose={() => setMoreMenu(false)} title="Options du carnet">
        <ChoiceLine title="Installer la bibliothèque d’exercices" sub={`${EXERCISE_LIBRARY.length} exercices prêts à suivre`} icon="book" onPress={handleInstallLibrary} />
        <ChoiceLine title="Retirer les suivis vides de démonstration" sub="Garde un carnet propre" icon="refresh" onPress={handleCleanDemo} />
        <ChoiceLine title="Partager mon carnet" sub="Tes chiffres en une phrase" icon="share" onPress={shareStats} />
        <ChoiceLine title="Corbeille" sub={trashCount > 0 ? `${trashCount} élément${trashCount > 1 ? 's' : ''} à restaurer ou à vider` : 'Vide'} icon="trash" onPress={async () => { setMoreMenu(false); await loadTrash(); setTimeout(() => setShowTrash(true), 300); }} />
      </Sheet>

      <RecordPicker visible={picker} onClose={() => setPicker(false)} busy={busy} onPickTemplate={handlePickTemplate} onCreateCustom={handleCreateCustom} />

      <AddSkillSheet
        visible={showAddSkill}
        onClose={() => { setShowAddSkill(false); setNewSkillStatus('to_learn'); setNewSkillNotes(''); }}
        busy={busy}
        name={newSkillName}
        setName={setNewSkillName}
        category={newSkillCategory}
        setCategory={setNewSkillCategory}
        status={newSkillStatus}
        setStatus={setNewSkillStatus}
        notes={newSkillNotes}
        setNotes={setNewSkillNotes}
        videoUri={newSkillVideoUri}
        setVideoUri={setNewSkillVideoUri}
        onSubmit={handleAddSkill}
        onRecordVideo={recordSkillVideo}
        onPickVideo={pickSkillVideo}
      />

      <BenchmarkDetail
        visible={showBenchmarkDetail}
        benchmark={selectedBenchmark}
        onClose={() => setShowBenchmarkDetail(false)}
        onAddEntry={() => setShowEntry(true)}
        onDelete={handleDeleteBenchmark}
        onDeleteEntry={handleDeleteEntry}
        onShare={(e, isPR) => selectedBenchmark && shareBenchmark(selectedBenchmark, e, isPR)}
      >
        {showBenchmarkDetail ? overlays : null}
      </BenchmarkDetail>

      <SkillDetail
        visible={showSkillDetail}
        skill={selectedSkill}
        busy={busy}
        drillIncrement={drillIncrement}
        setDrillIncrement={setDrillIncrement}
        onIncrementDrill={handleIncrementDrill}
        newNoteText={newNoteText}
        setNewNoteText={setNewNoteText}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        editingVideoUrl={editingVideoUrl}
        setEditingVideoUrl={setEditingVideoUrl}
        onUpdateVideoUrl={handleUpdateVideoUrl}
        onOpenVideoUrl={(u) => { if (u) safeOpenURL(u); }}
        onUpdateStatus={handleUpdateSkillStatus}
        onDelete={handleDeleteSkill}
        onClose={() => setShowSkillDetail(false)}
      />

      <TrashSheet
        visible={showTrash}
        onClose={() => setShowTrash(false)}
        trashBenchmarks={trashBenchmarks}
        trashSkills={trashSkills}
        trashCount={trashCount}
        onRestoreBenchmark={handleRestoreBenchmark}
        onRestoreSkill={handleRestoreSkill}
        onEmptyTrash={handleEmptyTrash}
      />

      {!showBenchmarkDetail ? overlays : null}

      <Toast message={toast} onDone={() => setToast(null)} />
      {busy && !showEntry && !picker && !showAddSkill ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 12, alignSelf: 'center' }}>
          <View style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: P.ink, justifyContent: 'center' }}>
            <Ink size={12} weight="extraBold" color={P.white}>Un instant...</Ink>
          </View>
        </View>
      ) : null}
    </View>
  );
}
