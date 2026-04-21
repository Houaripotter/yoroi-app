// ============================================
// YOROI - AJOUT / ÉDITION SÉANCE SPORT DE COMBAT
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  FlatList,
  InteractionManager,
  DeviceEventEmitter,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  impactAsync,
  ImpactFeedbackStyle,
  notificationAsync,
  NotificationFeedbackType,
} from 'expo-haptics';
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Calendar,
  Clock,
  Swords,
  Trophy,
  BookOpen,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Check,
  Star,
  Heart,
  X,
  Search,
  Zap,
  Target,
  Leaf,
  Home,
  Brain,
  AlertTriangle,
  ClipboardList,
  Rocket,
  Lightbulb,
  BarChart3,
  Library,
  Copy,
  ArrowRight,
  RefreshCw,
  Flame,
  Users,
  Flag,
  FileText,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaybookModal from '@/components/PlaybookModal';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import * as Location from 'expo-location';
import { safeOpenURL } from '@/lib/security/validators';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  addTraining,
  updateTraining,
  getTrainingById,
  getTrainings,
  getClubs,
  addClub,
  openDatabase,
  getProfile,
  Club,
  CombatRound,
} from '@/lib/database';
import { SPORTS, getSportName, getClubLogoSource } from '@/lib/sports';
import { AddClubModal } from '@/components/planning/AddClubModal';
import { BJJBodyMap } from '@/components/BJJBodyMap';
import { successHaptic, lightHaptic } from '@/lib/haptics';
import { playWorkoutCompleteSound } from '@/lib/soundManager';
import { getCurrentRank } from '@/lib/ranks';
import { getUnifiedPoints } from '@/lib/gamification';
import { useAvatar } from '@/lib/AvatarContext';
import { getUserSettings } from '@/lib/storage';
import { checkOvertrainingAlert } from '@/lib/trainingLoadService';
import { getCombatThemesForSport, getCombatThemeSuggestionsForSport, COMBAT_THEME_LIBRARY } from '@/lib/combatThemeLibrary';
import { PLAYBOOK_BY_FIELD } from '@/lib/combatPlaybook';

// ============================================
// SPORTS DE COMBAT
// ============================================

const COMBAT_SPORTS = SPORTS.filter(
  (s) => s.category === 'combat_striking' || s.category === 'combat_grappling'
);

// ============================================
// SOUMISSIONS / FINITIONS PAR SPORT
// ============================================

// --- JJB / GRAPPLING (60+ finitions) ---
const SUBMISSIONS_GRAPPLING = [
  // ─── ⭐ LES PLUS UTILISÉES ───
  'Armbar (juji-gatame)',
  'Triangle (ashi-sankaku)',
  'Guillotine frontale',
  'RNC / Mata leão (Rear Naked Choke)',
  'Kimura',
  'Omoplata',
  'Américaine (Americana)',
  "D'Arce choke (no-gi brabo)",
  'Anaconda choke',
  'Heel hook intérieur (inside heel hook)',
  'Heel hook extérieur (outside heel hook)',
  'Bow and Arrow choke',
  'Arm triangle (kata gatame)',
  'Guillotine arm-in',
  'Rear triangle',
  // ─── ÉTRANGLEMENTS ───
  'Guillotine high-elbow (Marcelotine)',
  'Hip bump guillotine',
  'Col croisé (cross collar choke)',
  'Body triangle + RNC',
  'Triangle dos',
  'Mounted triangle',
  'Brabo choke (gi)',
  'Loop choke',
  'Baseball bat choke',
  'Paper cutter choke',
  'Ezekiel choke (sode guruma)',
  'Crucifix choke',
  'Clock choke',
  'North-south choke',
  'Von flue choke',
  'Gogoplata',
  'Buggy choke',
  'Peruvian necktie',
  'Twister choke',
  'Lapel choke (worm guard)',
  'Darce-triangle (daratine)',
  'Carotid squeeze',
  'Squirrel choke',
  'Gator roll choke',
  // ─── LOCKS BRAS ───
  'Armbar depuis garde fermée',
  'Armbar depuis triangle',
  'Armbar depuis le dos',
  'Armbar depuis mount',
  'Kimura trap',
  'Monoplata',
  'Baratoplata',
  'Tarikoplata',
  'Wristlock',
  'Bicep slicer',
  'Shoulder lock',
  'Hammerlock',
  'Straight arm lock',
  'Chicken wing',
  // ─── LOCKS JAMBES ───
  'Kneebar',
  'Toehold',
  'Calf slicer',
  'Ankle lock droit',
  'Ankle lock rotatif',
  'Estima lock',
  'Electric chair',
  'Banana split',
  'Knee reap',
  'Straight foot lock',
  'Cross heel hook',
  'Saddle (inside sankaku)',
  // ─── RÉSULTATS ───
  'Points / décision',
  'Avantages',
  'Abandon (tap)',
  'Verbal tap',
  'DQ (faute)',
  'No contest',
];

// --- MMA (50+ finitions) ---
const SUBMISSIONS_MMA = [
  // --- Frappes ---
  'KO (poing)',
  'KO (kick)',
  'KO (genou)',
  'KO (coude)',
  'KO (uppercut)',
  'KO (crochet)',
  'KO (direct)',
  'KO (body shot)',
  'TKO (arrêt arbitre)',
  'TKO (traumatisme / blessure)',
  'TKO (frappes au sol)',
  'TKO (abandon coin)',
  'TKO (coupure)',
  // --- Étranglements ---
  'RNC (Rear Naked Choke)',
  'Guillotine',
  'Arm-in guillotine',
  'Triangle',
  'D\'Arce choke',
  'Anaconda choke',
  'North-south choke',
  'Arm triangle',
  'Ezekiel choke',
  'Crucifix choke',
  'Loop choke',
  'Peruvian necktie',
  // --- Bras ---
  'Armbar',
  'Kimura',
  'Américaine (Americana)',
  'Omoplata',
  'Wristlock',
  'Bicep slicer',
  'Gogoplata',
  // --- Jambes ---
  'Heel hook',
  'Kneebar',
  'Toehold',
  'Ankle lock',
  'Calf slicer',
  // --- Décisions ---
  'Décision unanime',
  'Décision partagée (split)',
  'Décision majority',
  'Disqualification (DQ)',
  'No contest',
  'Technical draw',
];

// --- BOXE / KICKBOXING / KARATE (20+ finitions) ---
const SUBMISSIONS_STRIKING = [
  'KO (poing)',
  'KO (direct)',
  'KO (crochet)',
  'KO (uppercut)',
  'KO (jab)',
  'KO (body shot)',
  'KO (overhand)',
  'KO (kick)',
  'KO (low kick)',
  'KO (kick tête)',
  'KO (spinning back fist)',
  'TKO (arrêt arbitre)',
  'TKO (traumatisme)',
  'TKO (abandon coin)',
  'TKO (coupure)',
  'TKO (blessure)',
  'Décision unanime',
  'Décision partagée (split)',
  'Décision majority',
  'Disqualification (DQ)',
  'Points (sparring)',
  'Abandon',
];

// --- MUAY THAI (25+ finitions) ---
const SUBMISSIONS_MUAYTHAI = [
  'KO (poing)',
  'KO (coude)',
  'KO (genou)',
  'KO (kick circulaire)',
  'KO (kick tête)',
  'KO (low kick)',
  'KO (push kick / teep)',
  'KO (spinning back kick)',
  'KO (flying knee)',
  'KO (sweep)',
  'KO (body shot)',
  'TKO (arrêt arbitre)',
  'TKO (traumatisme)',
  'TKO (abandon coin)',
  'TKO (coupure)',
  'TKO (blessure)',
  'Décision unanime',
  'Décision partagée (split)',
  'Points',
  'Disqualification (DQ)',
  'Abandon',
  'Clinch dominant',
  'Knockdown + points',
];

// --- JUDO (30+ finitions) ---
const SUBMISSIONS_JUDO = [
  // --- Projections (nage-waza) ---
  'Ippon — O-goshi (hanche)',
  'Ippon — Seoi-nage (épaule)',
  'Ippon — Uchi-mata (intérieur cuisse)',
  'Ippon — Harai-goshi (fauchage hanche)',
  'Ippon — Tai-otoshi (chute du corps)',
  'Ippon — Soto-gari (fauchage extérieur)',
  'Ippon — O-uchi-gari (fauchage intérieur)',
  'Ippon — Ko-uchi-gari (petit fauchage)',
  'Ippon — Tomoe-nage (projection cercle)',
  'Ippon — Tani-otoshi (chute vallée)',
  'Ippon — Morote-seoi-nage',
  'Ippon — Kata-guruma (roue épaule)',
  'Ippon — Ura-nage (projection arrière)',
  'Ippon — Sumi-gaeshi',
  // --- Au sol (ne-waza) ---
  'Ippon — Kesa-gatame (immobilisation)',
  'Ippon — Kuzure-kesa-gatame',
  'Ippon — Yoko-shiho-gatame',
  'Ippon — Kami-shiho-gatame',
  'Ippon — Tate-shiho-gatame',
  'Ippon — Juji-gatame (armbar)',
  'Ippon — Sangaku-jime (triangle)',
  'Ippon — Okuri-eri-jime (étranglement)',
  'Ippon — Hadaka-jime (RNC)',
  'Ippon — Kata-ha-jime (étranglement)',
  'Ippon — Sode-guruma-jime (Ezekiel)',
  // --- Résultats ---
  'Waza-ari x2',
  'Yuko (points)',
  'Shido (pénalité adv.)',
  'Hansoku-make (DQ)',
  'Ippon (abandon)',
];

// --- LUTTE (20+ finitions) ---
const SUBMISSIONS_LUTTE = [
  'Tombé (pin) — grecque-romaine',
  'Tombé (pin) — libre',
  'Points — décision',
  'Abandon (blessure)',
  'DQ (faute)',
  'Double leg takedown',
  'Single leg takedown',
  'Suplex (greco)',
  'Suplex amplitude',
  'Bear hug',
  'Double nelson',
  'Half nelson',
  'Arm bar (lutte)',
  'Cradle',
  'Tilt',
  'Granby roll',
  'Fireman\'s carry',
  'Duck under',
  'Pancake',
  'Gut wrench',
];

// --- SAMBO (30+ finitions) ---
const SUBMISSIONS_SAMBO = [
  'Armbar (ryote-gake)',
  'Kimura (gyaku-ude-garami)',
  'Heel hook',
  'Kneebar',
  'Toehold',
  'Ankle lock',
  'Calf slicer',
  'Bicep slicer',
  'Wristlock',
  'Shoulder lock',
  'RNC (Rear Naked Choke)',
  'Triangle',
  'Arm triangle',
  'Guillotine',
  'Ezekiel choke',
  'Tombé (pin)',
  'Points (décision)',
  'Ippon (projection)',
  'Sumi-gaeshi',
  'O-goshi',
  'Sacrifice throw',
  'Suplex',
  'Double leg',
  'Single leg',
  'Gut wrench',
  'Abandon',
  'DQ',
];

// --- HAPKIDO / AÏKIDO (20+ finitions) ---
const SUBMISSIONS_HAPKIDO = [
  'Armbar',
  'Wristlock (kote gaeshi)',
  'Wristlock (nikkyo)',
  'Wristlock (sankyo)',
  'Elbow lock',
  'Shoulder lock',
  'Kimura',
  'Hip throw (irimi nage)',
  'Koshi nage',
  'Projection au sol',
  'Kesa gatame',
  'Pin au sol',
  'Étranglement',
  'Kick (coup de pied)',
  'Frappe de paume',
  'Points / décision',
  'Abandon',
  'DQ',
];

function getSubmissionsForSport(sportId: string): string[] {
  const id = sportId.toLowerCase();
  if (id === 'judo') return SUBMISSIONS_JUDO;
  if (id === 'lutte') return SUBMISSIONS_LUTTE;
  if (id === 'sambo') return SUBMISSIONS_SAMBO;
  if (id === 'hapkido' || id === 'aikido' || id === 'aïkido') return SUBMISSIONS_HAPKIDO;
  if (id === 'mma') return SUBMISSIONS_MMA;
  if (id === 'muaythai' || id === 'muay_thai' || id === 'muay thai') return SUBMISSIONS_MUAYTHAI;
  const sport = COMBAT_SPORTS.find((s) => s.id === sportId);
  if (!sport) return SUBMISSIONS_MMA;
  if (sport.category === 'combat_grappling') return SUBMISSIONS_GRAPPLING;
  return SUBMISSIONS_STRIKING; // boxe, kickboxing, karate, taekwondo, etc.
}

// Chips rapides pour "Finitions données/reçues" — les plus courantes par sport
const QUICK_FINS_GRAPPLING = ['RNC', 'Triangle', 'Armbar', 'Kimura', 'Guillotine', "D'Arce", 'Heel hook', 'Omoplata'];
const QUICK_FINS_MMA       = ['KO', 'TKO', 'RNC', 'Armbar', 'Triangle', 'Guillotine', 'Kimura', 'Décision'];
const QUICK_FINS_STRIKING  = ['KO', 'TKO', 'Points', 'Abandon', 'DQ', 'Crochet', 'Uppercut'];
const QUICK_FINS_JUDO      = ['Ippon', 'Waza-ari x2', 'Osaekomi', 'Armbar (juji-gatame)', 'Triangle (sangaku)', 'Étranglement (shime-waza)'];
const QUICK_FINS_LUTTE     = ['Tombé (pin)', 'Points', 'Abandon', 'DQ', 'Suplex', 'Double leg'];
const QUICK_FINS_SAMBO     = ['Armbar', 'Kimura', 'Heel hook', 'Ippon (projection)', 'Tombé (pin)', 'Points'];

function getQuickFinsForSport(sportId: string): string[] {
  const id = sportId.toLowerCase();
  if (id === 'judo') return QUICK_FINS_JUDO;
  if (id === 'lutte') return QUICK_FINS_LUTTE;
  if (id === 'sambo') return QUICK_FINS_SAMBO;
  if (id === 'mma') return QUICK_FINS_MMA;
  const sport = COMBAT_SPORTS.find((s) => s.id === sportId);
  if (!sport) return QUICK_FINS_MMA;
  if (sport.category === 'combat_grappling') return QUICK_FINS_GRAPPLING;
  return QUICK_FINS_STRIKING;
}

// ============================================
// THÈMES TECHNIQUES PAR CATÉGORIE
// ============================================

const THEME_CATEGORIES_GRAPPLING = [
  {
    label: 'Debout',
    color: '#3B82F6',
    themes: ['Amenée au sol', 'Single leg', 'Double leg', 'Projection (hip/épaule)', 'Fauchage', 'Corps à corps', 'Défense takedown', 'Entrée jambes'],
  },
  {
    label: 'Gardes',
    color: '#8B5CF6',
    themes: ['Garde fermée', 'Demi-garde', 'Papillon', 'Spider guard', 'De la Riva', 'X-guard', 'Single leg X', '50/50', 'Lasso', 'Worm guard', 'Rubber guard'],
  },
  {
    label: 'Passage de garde',
    color: '#F97316',
    themes: ['Toreando', 'Knee slice', 'Smash pass', 'Stack pass', 'Over-under', 'Leg drag', 'Cartwheel pass', 'Long step', 'Headquarters'],
  },
  {
    label: 'Contrôle & positions',
    color: '#22C55E',
    themes: ['Side control', "Genou sur l'estomac", 'Position montée', 'Contrôle du dos', 'North-south', 'Turtle', 'Back take', 'Body triangle', 'Berimbolo'],
  },
  {
    label: 'Soumissions',
    color: '#EF4444',
    themes: ['Triangle', 'Guillotine', 'RNC', 'Armbar', 'Kimura', 'Américaine', 'Omoplata', "D'Arce", 'Heel hook', 'Ankle lock', 'Kneebar', 'Toe hold'],
  },
  {
    label: 'Défense',
    color: '#64748B',
    themes: ['Récupération de garde', 'Défense soumission', 'Hip escape', 'Bridge & roll', 'Contre-attaque', 'Flow rolling'],
  },
];

const THEME_CATEGORIES_STRIKING = [
  {
    label: 'Frappes de base',
    color: '#3B82F6',
    themes: ['Jab', 'Cross', 'Crochet', 'Uppercut', 'Body shot', 'Overhand'],
  },
  {
    label: 'Combinaisons',
    color: '#F97316',
    themes: ['Jab-cross', 'Jab-cross-crochet', '1-2-3', 'Corps-tête', 'Entrée direct'],
  },
  {
    label: 'Kicks',
    color: '#8B5CF6',
    themes: ['Low kick', 'Kick circulaire', 'Kick tête', 'Push kick', 'Spinning back kick', 'Genou'],
  },
  {
    label: 'Défense',
    color: '#22C55E',
    themes: ['Slip', 'Bob & weave', 'Parry', 'Couverture', 'Sortie angle', 'Footwork'],
  },
  {
    label: 'Clinch',
    color: '#EF4444',
    themes: ['Clinch contrôle', 'Genou clinch', 'Coude', 'Corps à corps', 'Entrée clinch'],
  },
];

function getThemeCategoriesForSport(sportId: string) {
  // Priorité : bibliothèque spécifique par sport (combatThemeLibrary).
  // Fallback : anciennes listes génériques grappling/striking.
  if (COMBAT_THEME_LIBRARY[sportId]) {
    return getCombatThemesForSport(sportId);
  }
  const sport = COMBAT_SPORTS.find((s) => s.id === sportId);
  if (!sport) return THEME_CATEGORIES_STRIKING;
  return sport.category === 'combat_grappling' ? THEME_CATEGORIES_GRAPPLING : THEME_CATEGORIES_STRIKING;
}

// Gardé pour compatibilité
const THEMES_GRAPPLING = THEME_CATEGORIES_GRAPPLING.flatMap(c => c.themes);
const THEMES_STRIKING = THEME_CATEGORIES_STRIKING.flatMap(c => c.themes);

function getSuggestionsForSport(sportId: string): string[] {
  if (COMBAT_THEME_LIBRARY[sportId]) {
    return getCombatThemeSuggestionsForSport(sportId);
  }
  const sport = COMBAT_SPORTS.find((s) => s.id === sportId);
  if (!sport) return THEMES_STRIKING;
  return sport.category === 'combat_grappling' ? THEMES_GRAPPLING : THEMES_STRIKING;
}

// ============================================
// TYPES DE SÉANCE
// ============================================

const SESSION_TYPES = [
  {
    id: 'entrainement' as const,
    label: 'Entraînement',
    sublabel: 'Drills + rounds',
    icon: Swords,
    color: '#8B5CF6',
  },
  {
    id: 'openmat' as const,
    label: 'Open Mat',
    sublabel: 'Rolling libre',
    icon: Target,
    color: '#22C55E',
  },
  {
    id: 'technique' as const,
    label: 'Technique',
    sublabel: 'Drills & kata',
    icon: BookOpen,
    color: '#3B82F6',
  },
  {
    id: 'guerre' as const,
    label: 'Guerre',
    sublabel: 'Sparring 100%',
    icon: Zap,
    color: '#EF4444',
  },
  {
    id: 'competition' as const,
    label: 'Compétition',
    sublabel: 'Match officiel',
    icon: Trophy,
    color: '#F59E0B',
  },
];

// ============================================
// RPE
// ============================================

const RPE_LABELS: Record<number, string> = {
  1: 'Très léger',
  2: 'Léger',
  3: 'Léger+',
  4: 'Modéré',
  5: 'Modéré+',
  6: 'Difficile',
  7: 'Difficile+',
  8: 'Très difficile',
  9: 'Maximal',
  10: 'MAX',
};

function getRpeColor(value: number): string {
  const ratio = (value - 1) / 9;
  const r = Math.round(34 + ratio * (220 - 34));
  const g = Math.round(197 - ratio * (197 - 38));
  const b = Math.round(94 - ratio * (94 - 38));
  return `rgb(${r},${g},${b})`;
}

// ============================================
// TYPES
// ============================================

type SessionTypeId = 'technique' | 'entrainement' | 'openmat' | 'guerre' | 'competition';

// ============================================
// COMPOSANTS INTERNES
// ============================================

function SectionLabel({ label, accent }: { label: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionLabelRow}>
      {accent && <View style={[styles.sectionLabelAccent, { backgroundColor: accent }]} />}
      <Text style={[styles.sectionLabel, { color: colors.textMuted ?? colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

function Stepper({
  value,
  onDecrement,
  onIncrement,
  displayValue,
  accentColor,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  displayValue: string;
  accentColor: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: colors.border ?? '#333', backgroundColor: colors.card }]}
        onPress={onDecrement}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Minus size={16} color={colors.text} />
      </TouchableOpacity>
      <View style={[styles.stepperValue, { borderColor: accentColor + '55', backgroundColor: accentColor + '15' }]}>
        <Text style={[styles.stepperValueText, { color: accentColor }]}>
          {displayValue}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.stepperBtn, { borderColor: colors.border ?? '#333', backgroundColor: colors.card }]}
        onPress={onIncrement}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Plus size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// MODAL SOUMISSIONS
// ============================================

// Item mémoïsé pour éviter les re-renders en cascade
const SubItem = React.memo(({
  item, isSelected, screenBg, cardBg, textColor, borderColor, onPress,
}: {
  item: string; isSelected: boolean; screenBg: string; cardBg: string;
  textColor: string; borderColor: string; onPress: (item: string) => void;
}) => (
  <TouchableOpacity
    style={[
      styles.subItem,
      { borderColor: isSelected ? screenBg : borderColor, backgroundColor: isSelected ? screenBg + '20' : cardBg },
    ]}
    onPress={() => onPress(item)}
  >
    <Text style={[styles.subItemText, { color: isSelected ? screenBg : textColor, fontWeight: isSelected ? '700' : '500' }]}>
      {item}
    </Text>
    {isSelected && (
      <View style={[styles.subItemCheck, { backgroundColor: screenBg }]}>
        <Check size={12} color="#fff" />
      </View>
    )}
  </TouchableOpacity>
));

function SubmissionsModal({
  visible,
  onClose,
  submissions,
  selected,
  onToggle,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  submissions: string[];
  selected: string[];
  onToggle: (sub: string) => void;
  title: string;
}) {
  const { colors, screenBackground } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Réinitialise la recherche à chaque ouverture du modal
  useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  // Set pour lookup O(1) au lieu de includes() O(n)
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => search.trim()
    ? submissions.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : submissions,
  [submissions, search]);

  const handlePress = useCallback((item: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    onToggle(item);
  }, [onToggle]);

  const renderItem = useCallback(({ item }: { item: string }) => (
    <SubItem
      item={item}
      isSelected={selectedSet.has(item)}
      screenBg={screenBackground}
      cardBg={colors.card}
      textColor={colors.text}
      borderColor={colors.border ?? '#2a2a2a'}
      onPress={handlePress}
    />
  ), [selectedSet, screenBackground, colors.card, colors.text, colors.border, handlePress]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Header modal */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View
              style={[
                styles.modalSearch,
                { backgroundColor: colors.card, borderColor: colors.border ?? '#333' },
              ]}
            >
              <Search size={14} color={colors.textMuted ?? '#888'} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher..."
                placeholderTextColor={colors.textMuted ?? '#888'}
                autoCorrect={false}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={14} color={colors.textMuted ?? '#888'} />
                </TouchableOpacity>
              )}
            </View>

            {/* Sélectionnés */}
            {selected.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedTagsRow}
                style={{ maxHeight: 50, marginBottom: 8 }}
                keyboardShouldPersistTaps="handled"
              >
                {selected.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.selectedTag, { backgroundColor: screenBackground }]}
                    onPress={() => onToggle(sub)}
                  >
                    <Text style={styles.selectedTagText}>{sub}</Text>
                    <X size={10} color="#fff" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Compteur résultats */}
            {filtered.length === 0 && search.length > 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                Aucune finition trouvée
              </Text>
            )}
            {filtered.length > 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 6 }}>
                {filtered.length} finition{filtered.length > 1 ? 's' : ''}{search ? ` pour "${search}"` : ''}
              </Text>
            )}

            {/* Liste */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={20}
              maxToRenderPerBatch={15}
              windowSize={7}
              extraData={selectedSet}
              renderItem={renderItem}
            />

            {/* Bouton valider */}
            <TouchableOpacity
              style={[styles.modalConfirmBtn, { backgroundColor: screenBackground }]}
              onPress={onClose}
            >
              <Text style={styles.modalConfirmBtnText}>
                {selected.length > 0 ? `Valider (${selected.length})` : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Helper : ajoute ou incrémente une technique dans usedTechniques
function addOrIncrTechnique(
  existing: { label: string; pts: number; count: number }[] | undefined,
  label: string,
  pts: number
): { label: string; pts: number; count: number }[] {
  const arr = existing ?? [];
  const found = arr.find(t => t.label === label);
  if (found) return arr.map(t => t.label === label ? { ...t, count: t.count + 1 } : t);
  return [...arr, { label, pts, count: 1 }];
}

// ============================================
// ROUND CARD
// ============================================

const RoundCard = React.memo(function RoundCard({
  round,
  index,
  sportId,
  accentColor,
  colors,
  onUpdate,
  partnerSuggestions = [],
  partnerGoals = {},
  drillSuggestions = [],
  partnerProfiles = {},
  previousRound,
}: {
  round: CombatRound;
  index: number;
  sportId: string;
  accentColor: string;
  colors: any;
  onUpdate: (updates: Partial<CombatRound>) => void;
  partnerSuggestions?: string[];
  partnerGoals?: Record<string, string>;
  drillSuggestions?: string[];
  partnerProfiles?: Record<string, { strengths: string[]; weaknesses: string[]; whatWorks: string[] }>;
  previousRound?: CombatRound;
}) {
  // Actions de score rapide BJJ/Grappling (points prédéfinis par action)
  const sport = COMBAT_SPORTS.find(s => s.id === sportId);
  // Score rapide IBJJF uniquement pour les sports qui utilisent ce système de points.
  // Judo (ippon/waza-ari), Sumo, Hapkido, Aikido ont leurs propres règles — pas IBJJF.
  const IBJJF_SPORTS = ['jjb', 'grappling', 'lutte', 'sambo', 'catch', 'lutte_olympique'];
  const isGrappling = IBJJF_SPORTS.includes(sportId.toLowerCase());

  // Techniques standard IBJJF / CFJJB — organisées par groupe
  const BJJ_SCORE_ACTIONS = isGrappling ? [
    // ─── TAKEDOWNS / PROJECTIONS (2 pts) ───
    { label: 'Single leg', pts: 2, group: 'Debout' },
    { label: 'Double leg', pts: 2, group: 'Debout' },
    { label: 'Arm drag', pts: 2, group: 'Debout' },
    { label: 'Ankle pick', pts: 2, group: 'Debout' },
    { label: 'Body lock', pts: 2, group: 'Debout' },
    { label: 'Duck under', pts: 2, group: 'Debout' },
    { label: 'Snap down', pts: 2, group: 'Debout' },
    { label: 'Blast double', pts: 2, group: 'Debout' },
    { label: 'Seoi-nage', pts: 2, group: 'Debout' },
    { label: 'O-soto-gari', pts: 2, group: 'Debout' },
    { label: 'Uchi-mata', pts: 2, group: 'Debout' },
    { label: 'Ko-uchi-gari', pts: 2, group: 'Debout' },
    { label: 'O-goshi', pts: 2, group: 'Debout' },
    { label: 'Tomoe-nage', pts: 2, group: 'Debout' },
    // ─── SWEEPS (2 pts) ─── depuis garde fermée
    { label: 'Sweep', pts: 2, group: 'Sol' },
    { label: 'Hip bump', pts: 2, group: 'Sol' },
    { label: 'Scissor sweep', pts: 2, group: 'Sol' },
    { label: 'Pendulum', pts: 2, group: 'Sol' },
    { label: 'Flower sweep', pts: 2, group: 'Sol' },
    { label: 'Omoplata sweep', pts: 2, group: 'Sol' },
    { label: 'Pontage (UPA)', pts: 2, group: 'Sol' },
    // ─── SWEEPS (2 pts) ─── depuis garde ouverte / demi-garde
    { label: 'Butterfly sweep', pts: 2, group: 'Sol' },
    { label: 'Tripod sweep', pts: 2, group: 'Sol' },
    { label: 'Tomahawk sweep', pts: 2, group: 'Sol' },
    { label: 'Berimbolo', pts: 2, group: 'Sol' },
    { label: 'X-guard sweep', pts: 2, group: 'Sol' },
    { label: 'De la Riva sweep', pts: 2, group: 'Sol' },
    { label: 'Single leg X', pts: 2, group: 'Sol' },
    { label: '50/50 sweep', pts: 2, group: 'Sol' },
    { label: 'Renversement (autre)', pts: 2, group: 'Sol' },
    // ─── GENOU SUR L'ESTOMAC (2 pts) — terme officiel CFJJB Art. 4.3 ───
    { label: "Genou sur l'estomac", pts: 2, group: 'Sol' },
    // ─── PASSAGES DE GARDE (3 pts) ───
    { label: 'Passage de garde', pts: 3, group: 'Sol' },
    { label: 'Toreando', pts: 3, group: 'Sol' },
    { label: 'Leg drag', pts: 3, group: 'Sol' },
    { label: 'Knee cut', pts: 3, group: 'Sol' },
    { label: 'Smash pass', pts: 3, group: 'Sol' },
    { label: 'Over-under', pts: 3, group: 'Sol' },
    { label: 'Stack pass', pts: 3, group: 'Sol' },
    { label: 'Bull fighter', pts: 3, group: 'Sol' },
    { label: 'Headquarters', pts: 3, group: 'Sol' },
    // ─── POSITIONS DOMINANTES (4 pts) — Art. 4.4 CFJJB ───
    { label: 'Position montée', pts: 4, group: 'Dominant' },
    { label: 'Montée arrière', pts: 4, group: 'Dominant' },
    { label: 'Contrôle du dos', pts: 4, group: 'Dominant' },
    { label: 'Body triangle', pts: 4, group: 'Dominant' },
    // ─── AVANTAGES (IBJJF) — tiebreaker, ne s'ajoutent pas aux points ───
    { label: 'Avantage', pts: 1, group: 'Bonus' },
    { label: 'Quasi-soumission', pts: 1, group: 'Bonus' },
    { label: 'Quasi-sweep', pts: 1, group: 'Bonus' },
    { label: 'Quasi-takedown', pts: 1, group: 'Bonus' },
    { label: 'Quasi-passe', pts: 1, group: 'Bonus' },
    // ─── PÉNALITÉS ADVERSAIRE ───
    { label: 'Pénalité adv.', pts: 1, group: 'Bonus' },   // 2e faute adv. → +1 avantage
    { label: 'Pénalité +2 pts', pts: 2, group: 'Bonus' }, // 3e faute adv. → +2 pts
  ] : [];

  // État pour technique personnalisée
  const [customLabel, setCustomLabel] = useState('');
  const [customPts, setCustomPts] = useState('2');

  const RESULTS: { value: 'win' | 'loss' | 'draw'; label: string; color: string }[] = [
    { value: 'win', label: 'Victoire', color: '#22C55E' },
    { value: 'loss', label: 'Défaite', color: '#EF4444' },
    { value: 'draw', label: 'Nul', color: '#6B7280' },
  ];

  const submissions = getSubmissionsForSport(sportId);
  const [showSubsGivenModal, setShowSubsGivenModal] = useState(false);
  const [showSubsTakenModal, setShowSubsTakenModal] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  // Collapse par défaut les sections secondaires — seul Game plan est ouvert.
  // Les autres s'ouvrent quand l'user veut remplir, ou automatiquement si déjà un contenu.
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({
    gamePlan: true,
  });
  const [playbookField, setPlaybookField] = useState<string | null>(null);
  const [showPartnerSuggestions, setShowPartnerSuggestions] = useState(false);

  const methodsGiven = round.methodsGiven ?? [];
  const methodsTaken = round.methodsTaken ?? [];

  const resultColor =
    round.result === 'win'
      ? '#22C55E'
      : round.result === 'loss'
      ? '#EF4444'
      : round.result === 'draw'
      ? '#6B7280'
      : accentColor;

  return (
    <View
      style={[
        styles.roundCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border ?? '#2a2a2a',
          borderLeftColor: resultColor,
          borderLeftWidth: 3,
        },
      ]}
    >
      {/* Header round */}
      <View style={styles.roundCardHeader}>
        <Text style={[styles.roundTitle, { color: colors.text }]}>
          Round {round.number}
        </Text>
        <View style={styles.resultBtnsRow}>
          {RESULTS.map((r) => {
            const selected = round.result === r.value;
            const letter = r.value === 'win' ? 'V' : r.value === 'loss' ? 'D' : 'N';
            return (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.resultPill,
                  {
                    backgroundColor: selected ? r.color : 'transparent',
                    borderColor: 'transparent',
                  },
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onUpdate({ result: round.result === r.value ? undefined : r.value });
                }}
              >
                <Text style={[styles.resultPillLetter, { color: selected ? '#fff' : r.color }]}>
                  {letter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Partenaire */}
      <View style={{ marginBottom: 10 }}>
        <View style={{
          borderRadius: 12, borderWidth: 1.5,
          borderColor: round.partner ? accentColor : (colors.border ?? '#333'),
          backgroundColor: round.partner ? `${accentColor}08` : colors.background,
          paddingHorizontal: 12, paddingVertical: 2,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: round.partner ? accentColor : (colors.textMuted ?? '#888'), letterSpacing: 0.5 }}>
            VS
          </Text>
          <TextInput
            style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '600', paddingVertical: 10 }}
            value={round.partner ?? ''}
            onChangeText={(v) => {
              onUpdate({ partner: v });
              setShowPartnerSuggestions(true);
            }}
            onFocus={() => setShowPartnerSuggestions(true)}
            onBlur={() => setTimeout(() => setShowPartnerSuggestions(false), 250)}
            placeholder="Nom de l'adversaire..."
            placeholderTextColor={colors.textMuted ?? '#888'}
            returnKeyType="done"
          />
          {round.partner ? (
            <TouchableOpacity onPress={() => { onUpdate({ partner: '' }); setShowPartnerSuggestions(false); }}>
              <X size={14} color={colors.textMuted ?? '#888'} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Suggestions de partenaires — affichées dès qu'on clique dans le champ.
            Filtre intelligent : si query vide → on montre les partenaires connus,
            sinon on filtre par query, et on laisse toujours la possibilité de créer un nouveau nom. */}
        {showPartnerSuggestions && partnerSuggestions.length > 0 && (() => {
          const q = (round.partner ?? '').trim().toLowerCase();
          const filtered = q.length === 0
            ? partnerSuggestions // pas de query → tous les partenaires connus
            : partnerSuggestions.filter(n => n.toLowerCase().includes(q));

          // Un match exact existe-t-il déjà ? (pour masquer le hint "Nouveau partenaire")
          const exactMatch = partnerSuggestions.some(n => n.toLowerCase() === q);

          if (filtered.length === 0 && (q.length === 0 || exactMatch)) return null;

          return (
            <View style={{
              backgroundColor: colors.card ?? colors.background, borderRadius: 10,
              borderWidth: 1, borderColor: `${accentColor}40`, marginTop: 6, overflow: 'hidden',
              shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}>
              {/* Libellé en-tête */}
              {q.length === 0 ? (
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', letterSpacing: 0.5, paddingHorizontal: 12, paddingTop: 8 }}>
                  PARTENAIRES ENREGISTRÉS
                </Text>
              ) : (
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', letterSpacing: 0.5, paddingHorizontal: 12, paddingTop: 8 }}>
                  {filtered.length} SUGGESTION{filtered.length > 1 ? 'S' : ''}
                </Text>
              )}

              {filtered.slice(0, 6).map((name, i) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    onUpdate({ partner: name });
                    setShowPartnerSuggestions(false);
                    Keyboard.dismiss();
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingHorizontal: 12, paddingVertical: 11,
                    borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: colors.border ?? 'rgba(0,0,0,0.1)',
                  }}
                  activeOpacity={0.6}
                >
                  <View style={{
                    width: 30, height: 30, borderRadius: 15, backgroundColor: `${accentColor}20`,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: accentColor }}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text, fontWeight: '700' }}>
                    {name}
                  </Text>
                  <ArrowRight size={14} color={accentColor} />
                </TouchableOpacity>
              ))}

              {/* Hint "Créer nouveau" si texte saisi et pas de match exact */}
              {q.length > 0 && !exactMatch && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border ?? 'rgba(0,0,0,0.1)',
                  backgroundColor: `${accentColor}08`,
                }}>
                  <Plus size={12} color={accentColor} strokeWidth={3} />
                  <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', fontWeight: '600', flex: 1 }}>
                    Nouveau partenaire : <Text style={{ color: accentColor, fontWeight: '800' }}>{round.partner}</Text>
                  </Text>
                </View>
              )}
            </View>
          );
        })()}
      </View>

      {/* ════════════════════════════════════════════════
          🧠 COACH BRIEF — briefing pré-round intelligent
          Apparaît si partenaire saisi ET round pas encore débuté
          ════════════════════════════════════════════════ */}
      {(() => {
        const partnerKey = (round.partner ?? '').trim().toLowerCase();
        if (!partnerKey) return null;

        const profile = partnerProfiles[partnerKey];
        const activeGoal = partnerGoals[partnerKey];
        const prevImprovement = previousRound?.improvement;
        const prevCounteredBy = previousRound?.counteredBy;

        // Le round est "commencé" s'il a un résultat, points, finitions, notes ou game plan déjà rempli
        const roundStarted = !!(
          round.result ||
          (round.pointsFor ?? 0) > 0 || (round.pointsAgainst ?? 0) > 0 ||
          (round.methodsGiven?.length ?? 0) > 0 || (round.methodsTaken?.length ?? 0) > 0 ||
          round.notes || round.gamePlan || round.whatWorked || round.selfRating
        );

        // Rien à afficher ?
        const hasContent = !!(activeGoal || prevImprovement || prevCounteredBy ||
          (profile?.strengths?.length ?? 0) > 0 ||
          (profile?.weaknesses?.length ?? 0) > 0 ||
          (profile?.whatWorks?.length ?? 0) > 0);
        if (!hasContent) return null;

        // Suggestion de game plan auto-généré
        const autoGamePlan = (() => {
          const bits: string[] = [];
          if (profile?.weaknesses && profile.weaknesses.length > 0) bits.push(`Exploiter : ${profile.weaknesses[0]}`);
          if (profile?.whatWorks && profile.whatWorks.length > 0) bits.push(profile.whatWorks[0]);
          if (prevImprovement) bits.push(prevImprovement);
          return bits.slice(0, 2).join(' · ');
        })();

        return (
          <View style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#1E1B4B', '#4C1D95', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 14 }}
            >
              {/* Header coach */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                  <Brain size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 }}>
                    COACH BRIEF
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>
                    vs {round.partner}
                    {previousRound && <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>  ·  Round {round.number}</Text>}
                  </Text>
                </View>
                {roundStarted && (
                  <View style={{ backgroundColor: '#22C55E', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff' }}>EN COURS</Text>
                  </View>
                )}
              </View>

              {/* 🎯 TA MISSION */}
              {(activeGoal || prevImprovement) && (
                <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Target size={14} color="#FBBF24" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#FBBF24', letterSpacing: 1 }}>TA MISSION</Text>
                  </View>
                  {activeGoal && (
                    <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700', lineHeight: 18 }}>
                      {activeGoal}
                    </Text>
                  )}
                  {prevImprovement && (
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17, marginTop: activeGoal ? 4 : 0 }}>
                      {activeGoal && '↳ '}Du round précédent : {prevImprovement}
                    </Text>
                  )}
                </View>
              )}

              {/* ⚠️ DANGERS */}
              {((profile?.strengths?.length ?? 0) > 0 || prevCounteredBy) && (
                <View style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <AlertTriangle size={14} color="#FCA5A5" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#FCA5A5', letterSpacing: 1 }}>DANGERS À DÉFENDRE</Text>
                  </View>
                  {prevCounteredBy && (
                    <View style={{ marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#fff', lineHeight: 17 }}>
                        <Text style={{ fontWeight: '800' }}>Round précédent : </Text>il t'a contré par "{prevCounteredBy}"
                      </Text>
                    </View>
                  )}
                  {profile?.strengths && profile.strengths.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                      {profile.strengths.slice(0, 4).map(s => (
                        <View key={s} style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(252,165,165,0.3)' }}>
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* ⚡ OPPORTUNITÉS */}
              {((profile?.weaknesses?.length ?? 0) > 0 || (profile?.whatWorks?.length ?? 0) > 0) && (
                <View style={{ backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 12, padding: 12, marginBottom: autoGamePlan ? 8 : 0, borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Zap size={14} color="#86EFAC" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#86EFAC', letterSpacing: 1 }}>OPPORTUNITÉS À EXPLOITER</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {[...(profile?.weaknesses ?? []).slice(0, 3), ...(profile?.whatWorks ?? []).slice(0, 3)].map(w => (
                      <View key={w} style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(134,239,172,0.3)' }}>
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>{w}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 📋 GAME PLAN SUGGÉRÉ */}
              {autoGamePlan && !round.gamePlan && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <ClipboardList size={14} color="#fff" />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 }}>GAME PLAN SUGGÉRÉ</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '600', lineHeight: 18, marginBottom: 10 }}>
                    "{autoGamePlan}"
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      onUpdate({ gamePlan: autoGamePlan });
                    }}
                    style={{ backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                  >
                    <Check size={14} color="#7C3AED" strokeWidth={3} />
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#7C3AED', letterSpacing: 0.3 }}>ACCEPTER CE GAME PLAN</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Game plan déjà accepté */}
              {round.gamePlan && (
                <View style={{ backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)' }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, color: '#fff', fontWeight: '700', lineHeight: 16 }} numberOfLines={2}>
                    Game plan : {round.gamePlan}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        );
      })()}

      {/* Note de l'adversaire (1-10) */}
      {round.partner ? (
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted ?? '#888', letterSpacing: 0.5 }}>
              NIVEAU ADVERSAIRE
            </Text>
            {round.partnerRating ? (
              <Text style={{ fontSize: 11, color: accentColor, fontWeight: '800' }}>
                {round.partnerRating}/10 · {
                  round.partnerRating <= 2 ? 'Débutant' :
                  round.partnerRating <= 4 ? 'Intermédiaire' :
                  round.partnerRating <= 6 ? 'Bon niveau' :
                  round.partnerRating <= 8 ? 'Avancé' :
                  round.partnerRating === 9 ? 'Expert' : 'Élite'
                }
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => {
              const selected = (round.partnerRating ?? 0) >= n;
              const dotColor = n <= 3 ? '#22C55E' : n <= 6 ? '#F59E0B' : n <= 8 ? '#EF4444' : '#9333EA';
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    onUpdate({ partnerRating: round.partnerRating === n ? undefined : n });
                  }}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? dotColor : `${dotColor}18`,
                    borderWidth: 1.5,
                    borderColor: selected ? dotColor : `${dotColor}40`,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: selected ? '#FFF' : dotColor }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Intensité du round */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
        {([
          { value: 'guerre', label: 'Guerre', color: '#EF4444', icon: Zap },
          { value: 'technique', label: 'Technique', color: '#3B82F6', icon: Target },
          { value: 'detendu', label: 'Détendu', color: '#22C55E', icon: Leaf },
        ] as Array<{ value: 'guerre' | 'technique' | 'detendu'; label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }>).map((opt) => {
          const selected = round.roundIntensity === opt.value;
          const IntIcon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onUpdate({ roundIntensity: selected ? undefined : opt.value });
              }}
              style={{
                flex: 1, alignItems: 'center', justifyContent: 'center',
                paddingVertical: 9, borderRadius: 10, gap: 3,
                borderWidth: selected ? 0 : 1,
                borderColor: colors.border ?? '#444',
                backgroundColor: selected ? opt.color : colors.background,
              }}
            >
              <IntIcon size={16} color={selected ? '#fff' : (colors.textMuted ?? '#888')} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: selected ? '#fff' : (colors.textMuted ?? '#888') }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Body Map BJJ (silhouettes interactives) — remplace les chips finitions ── */}
      {isGrappling ? (
        <BJJBodyMap
          myName="MOI"
          opponentName={round.partner || 'ADVERSAIRE'}
          methodsGiven={methodsGiven}
          methodsTaken={round.methodsTaken ?? []}
          pointsFor={round.pointsFor ?? 0}
          pointsAgainst={round.pointsAgainst ?? 0}
          usedTechniques={round.usedTechniques ?? []}
          onUpdate={(updates) => onUpdate(updates as Partial<CombatRound>)}
        />
      ) : (
        /* Finitions classiques pour sports de combat non-grappling */
        <>
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.roundSubLabel, { color: colors.textMuted ?? colors.text }]}>Finitions données</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {getQuickFinsForSport(sportId).map(fin => {
                const isSelected = methodsGiven.includes(fin);
                return (
                  <TouchableOpacity key={fin} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); const next = isSelected ? methodsGiven.filter(m => m !== fin) : [...methodsGiven, fin]; onUpdate({ methodsGiven: next, submissionsGiven: next.length }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: isSelected ? accentColor : `${accentColor}12`, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? accentColor : `${accentColor}35` }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#fff' : accentColor }}>{fin}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => setShowSubsGivenModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border ?? '#444', borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted ?? '#888' }}>+ Autre</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.roundSubLabel, { color: colors.textMuted ?? colors.text }]}>Finitions reçues</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {getQuickFinsForSport(sportId).map(fin => {
                const isSelected = (round.methodsTaken ?? []).includes(fin);
                return (
                  <TouchableOpacity key={fin} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); const mt = round.methodsTaken ?? []; const next = isSelected ? mt.filter(m => m !== fin) : [...mt, fin]; onUpdate({ methodsTaken: next, submissionsTaken: next.length }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: isSelected ? '#EF4444' : 'rgba(239,68,68,0.12)', borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? '#EF4444' : 'rgba(239,68,68,0.35)' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#fff' : '#EF4444' }}>{fin}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => setShowSubsTakenModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border ?? '#444', borderStyle: 'dashed' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted ?? '#888' }}>+ Autre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Score rapide BJJ — masqué pour grappling (BJJBodyMap le remplace) */}
      {false && BJJ_SCORE_ACTIONS.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted ?? '#888', marginBottom: 8, letterSpacing: 0.5 }}>
            SCORE RAPIDE
          </Text>

          {/* Groupes de techniques */}
          {(['Debout', 'Sol', 'Dominant', 'Bonus'] as const).map(group => {
            const actions = BJJ_SCORE_ACTIONS.filter(a => a.group === group);
            const groupColors: Record<string, string> = {
              Debout: '#3B82F6',
              Sol: '#22C55E',
              Dominant: '#A855F7',
              Bonus: '#F59E0B',
            };
            const groupLabels: Record<string, string> = {
              Debout: "DEBOUT — AMENÉE AU SOL (+2)",
              Sol: "AU SOL — RENVERSEMENT (+2) · GENOU SUR L'ESTOMAC (+2) · PASSAGE DE GARDE (+3)",
              Dominant: "MONTÉE / CONTRÔLE DU DOS (+4)",
              Bonus: 'AVANTAGES / PÉNALITÉS',
            };
            const color = groupColors[group];
            return (
              <View key={group} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: color, marginBottom: 4, letterSpacing: 0.5 }}>
                  {groupLabels[group]}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {actions.map(action => {
                    const used = round.usedTechniques?.find(t => t.label === action.label);
                    const isUsed = (used?.count ?? 0) > 0;
                    return (
                    <TouchableOpacity
                      key={action.label}
                      onPress={() => {
                        onUpdate({
                          pointsFor: (round.pointsFor ?? 0) + action.pts,
                          usedTechniques: addOrIncrTechnique(round.usedTechniques, action.label, action.pts),
                        });
                        impactAsync(ImpactFeedbackStyle.Light);
                      }}
                      onLongPress={() => {
                        onUpdate({
                          pointsAgainst: (round.pointsAgainst ?? 0) + action.pts,
                          usedTechniques: addOrIncrTechnique(round.usedTechniques, `${action.label} (adv)`, action.pts),
                        });
                        impactAsync(ImpactFeedbackStyle.Medium);
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
                        backgroundColor: isUsed ? color : `${color}12`,
                        borderWidth: isUsed ? 2 : 1,
                        borderColor: isUsed ? color : `${color}35`,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isUsed ? '#fff' : color }}>{action.label}</Text>
                      <View style={{ backgroundColor: isUsed ? 'rgba(255,255,255,0.3)' : color, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>
                          {isUsed ? `×${used!.count}` : `+${action.pts}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', marginBottom: 10 }}>
            Appui court = tes points · Appui long = points adversaire
          </Text>

          {/* Technique personnalisée */}
          <View style={{
            backgroundColor: (colors.card ?? (colors.background === '#000' ? '#1a1a1a' : '#f5f5f5')),
            borderRadius: 10, borderWidth: 1,
            borderColor: colors.border ?? '#333',
            padding: 10,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted ?? '#888', marginBottom: 8, letterSpacing: 0.5 }}>
              + TECHNIQUE PERSONNALISÉE
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: colors.background,
                  borderRadius: 8, borderWidth: 1, borderColor: colors.border ?? '#444',
                  paddingHorizontal: 10, paddingVertical: 7,
                  color: colors.text, fontSize: 13,
                }}
                placeholder="Nom de la technique..."
                placeholderTextColor={colors.textMuted ?? '#888'}
                value={customLabel}
                onChangeText={setCustomLabel}
                returnKeyType="done"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TouchableOpacity
                  onPress={() => setCustomPts(p => String(Math.max(1, parseInt(p || '1') - 1)))}
                  style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border ?? '#444' }}
                >
                  <Minus size={12} color={colors.text} />
                </TouchableOpacity>
                <TextInput
                  style={{
                    width: 36, backgroundColor: colors.background,
                    borderRadius: 8, borderWidth: 1, borderColor: colors.border ?? '#444',
                    paddingVertical: 7, color: colors.text,
                    fontSize: 14, fontWeight: '800', textAlign: 'center',
                  }}
                  value={customPts}
                  onChangeText={v => setCustomPts(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <TouchableOpacity
                  onPress={() => setCustomPts(p => String(Math.min(99, parseInt(p || '1') + 1)))}
                  style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Plus size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  const pts = parseInt(customPts) || 1;
                  if (!customLabel.trim()) return;
                  onUpdate({
                    pointsFor: (round.pointsFor ?? 0) + pts,
                    usedTechniques: addOrIncrTechnique(round.usedTechniques, customLabel.trim(), pts),
                  });
                  impactAsync(ImpactFeedbackStyle.Light);
                  setCustomLabel('');
                  setCustomPts('2');
                }}
                disabled={!customLabel.trim()}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, backgroundColor: customLabel.trim() ? '#22C55E' : (colors.border ?? '#333'),
                  borderRadius: 8, paddingVertical: 8,
                }}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                  +{customPts || '1'} pts pour moi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const pts = parseInt(customPts) || 1;
                  if (!customLabel.trim()) return;
                  onUpdate({ pointsAgainst: (round.pointsAgainst ?? 0) + pts });
                  impactAsync(ImpactFeedbackStyle.Medium);
                  setCustomLabel('');
                  setCustomPts('2');
                }}
                disabled={!customLabel.trim()}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, backgroundColor: customLabel.trim() ? '#EF4444' : (colors.border ?? '#333'),
                  borderRadius: 8, paddingVertical: 8,
                }}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
                  +{customPts} pts adversaire
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Points du round */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        {/* Points marqués */}
        <View style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', padding: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E', marginBottom: 6, textAlign: 'center' }}>MES POINTS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { onUpdate({ pointsFor: Math.max(0, (round.pointsFor ?? 0) - 1) }); impactAsync(ImpactFeedbackStyle.Light); }}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(34,197,94,0.15)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Minus size={14} color="#22C55E" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#22C55E', minWidth: 28, textAlign: 'center' }}>{round.pointsFor ?? 0}</Text>
            <TouchableOpacity
              onPress={() => { onUpdate({ pointsFor: (round.pointsFor ?? 0) + 1 }); impactAsync(ImpactFeedbackStyle.Light); }}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}
            >
              <Plus size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Points concédés */}
        <View style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.07)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', padding: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444', marginBottom: 6, textAlign: 'center' }}>POINTS ADVERSAIRE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { onUpdate({ pointsAgainst: Math.max(0, (round.pointsAgainst ?? 0) - 1) }); impactAsync(ImpactFeedbackStyle.Light); }}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(239,68,68,0.15)', justifyContent: 'center', alignItems: 'center' }}
            >
              <Minus size={14} color="#EF4444" />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#EF4444', minWidth: 28, textAlign: 'center' }}>{round.pointsAgainst ?? 0}</Text>
            <TouchableOpacity
              onPress={() => { onUpdate({ pointsAgainst: (round.pointsAgainst ?? 0) + 1 }); impactAsync(ImpactFeedbackStyle.Light); }}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}
            >
              <Plus size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notes du round */}
      <TextInput
        style={[
          styles.roundNotesInput,
          {
            color: colors.text,
            borderColor: colors.border ?? '#333',
            backgroundColor: colors.background,
          },
        ]}
        value={round.notes ?? ''}
        onChangeText={(v) => onUpdate({ notes: v })}
        placeholder="Observations sur ce round..."
        placeholderTextColor={colors.textMuted ?? '#888'}
        multiline
        numberOfLines={2}
        textAlignVertical="top"
      />

      {/* ════════════════════════════════════════════════
          🎯 ANALYSE DU ROUND — module premium
          ════════════════════════════════════════════════ */}
      {(() => {
        // ── Suggestions contextuelles calculées ──
        const isGrapplingSport = ['jjb', 'grappling', 'lutte', 'sambo', 'catch', 'judo'].includes(sportId.toLowerCase());
        const isStriking = ['boxe', 'kickboxing', 'muaythai', 'muay_thai', 'karate', 'taekwondo', 'savate'].includes(sportId.toLowerCase());
        const isMMA = sportId.toLowerCase() === 'mma';

        // ── Moods pré-définis ──
        const MOODS = [
          { id: 'fire',     emoji: '🔥', label: 'Au top',    color: '#EF4444' },
          { id: 'strong',   emoji: '💪', label: 'En forme',  color: '#22C55E' },
          { id: 'focus',    emoji: '🎯', label: 'Focus',     color: '#3B82F6' },
          { id: 'flow',     emoji: '🌊', label: 'Dans le flow', color: '#06B6D4' },
          { id: 'gassed',   emoji: '😮‍💨', label: 'Essoufflé', color: '#F59E0B' },
          { id: 'tired',    emoji: '😓', label: 'Fatigué',   color: '#6B7280' },
          { id: 'confused', emoji: '🤯', label: 'Perdu',     color: '#F97316' },
          { id: 'frustrated', emoji: '😤', label: 'Frustré', color: '#DC2626' },
        ];

        // Profil du partenaire (si reconnu)
        const partnerKey = (round.partner ?? '').trim().toLowerCase();
        const partnerProfile = partnerProfiles[partnerKey];

        // GAME PLAN : suggestions par sport + points faibles connus du partenaire
        const gamePlanSuggestions: string[] = [];
        if (isGrapplingSport) gamePlanSuggestions.push('Garde fermée', 'Passage knee cut', 'Single leg entry', 'Back take');
        else if (isStriking) gamePlanSuggestions.push('Combinaison jab-cross', 'Low kick pressure', 'Counter au back-step', 'Body shots');
        else if (isMMA) gamePlanSuggestions.push('Striking → takedown', 'Clinch pressure', 'Ground and pound', 'Guillotine setup');
        if (partnerProfile?.weaknesses && partnerProfile.weaknesses.length > 0) {
          partnerProfile.weaknesses.slice(0, 2).forEach(w => gamePlanSuggestions.push(`Exploiter : ${w}`));
        }
        if (partnerProfile?.whatWorks && partnerProfile.whatWorks.length > 0) {
          partnerProfile.whatWorks.slice(0, 2).forEach(w => gamePlanSuggestions.push(w));
        }

        // CE QUI A MARCHÉ : finitions données + positions dominantes + drills
        const whatWorkedSuggestions: string[] = [];
        if (round.methodsGiven && round.methodsGiven.length > 0) {
          round.methodsGiven.forEach(m => whatWorkedSuggestions.push(m));
        }
        if (round.usedTechniques && round.usedTechniques.length > 0) {
          round.usedTechniques.slice(0, 4).forEach(t => whatWorkedSuggestions.push(t.label));
        }
        drillSuggestions.slice(0, 4).forEach(d => whatWorkedSuggestions.push(d));

        // CE QUI N'A PAS MARCHÉ : suggestions génériques par sport
        const whatDidntWorkSuggestions: string[] = [];
        if (isGrapplingSport) whatDidntWorkSuggestions.push('Entrée de garde trop lente', 'Trop statique', 'Défense hanches', 'Cadres mal posés', 'Sortie de dos');
        else if (isStriking) whatDidntWorkSuggestions.push('Distance mal gérée', 'Garde trop basse', 'Manque de head movement', 'Trop statique', 'Sorties droites');
        else whatDidntWorkSuggestions.push('Timing', 'Pression', 'Distance', 'Transitions', 'Défense');

        // CONTRÉ PAR : finitions reçues + points forts connus du partenaire
        const counteredBySuggestions: string[] = [];
        if (round.methodsTaken && round.methodsTaken.length > 0) {
          round.methodsTaken.forEach(m => counteredBySuggestions.push(m));
        }
        if (partnerProfile?.strengths && partnerProfile.strengths.length > 0) {
          partnerProfile.strengths.slice(0, 3).forEach(s => counteredBySuggestions.push(s));
        }

        // OBJECTIF PROCHAIN ROUND : reproduire / défendre / drill
        const improvementSuggestions: string[] = [];
        if (previousRound?.counteredBy) improvementSuggestions.push(`Défendre : ${previousRound.counteredBy}`);
        if (round.methodsTaken && round.methodsTaken.length > 0) {
          round.methodsTaken.slice(0, 2).forEach(m => improvementSuggestions.push(`Défendre ${m}`));
        }
        if (round.methodsGiven && round.methodsGiven.length > 0) {
          round.methodsGiven.slice(0, 2).forEach(m => improvementSuggestions.push(`Reproduire ${m}`));
        }
        if (isGrapplingSport) improvementSuggestions.push('Plus de passes', 'Finir la soumission', 'Plus de pression');
        else if (isStriking) improvementSuggestions.push('Head movement', 'Plus de combinaisons', 'Gérer la distance');

        const fields = [
          { key: 'gamePlan' as const, label: 'Game plan prévu', Icon: Target, placeholder: 'Ex : travailler ma garde fermée, chercher le single leg...', color: '#3B82F6', suggestions: Array.from(new Set(gamePlanSuggestions)).slice(0, 6) },
          { key: 'whatWorked' as const, label: 'Ce qui a marché', Icon: Check, placeholder: 'Techniques efficaces, positions, enchaînements...', color: '#22C55E', suggestions: Array.from(new Set(whatWorkedSuggestions)).slice(0, 8) },
          { key: 'whatDidntWork' as const, label: "Ce qui n'a pas marché", Icon: X, placeholder: 'Ce qu\'il faut éviter la prochaine fois...', color: '#EF4444', suggestions: Array.from(new Set(whatDidntWorkSuggestions)).slice(0, 6) },
          { key: 'counteredBy' as const, label: 'Contré par', Icon: AlertTriangle, placeholder: 'Techniques adverses qui ont fonctionné...', color: '#F59E0B', suggestions: Array.from(new Set(counteredBySuggestions)).slice(0, 6) },
          { key: 'improvement' as const, label: 'Objectif prochain round', Icon: Rocket, placeholder: 'Ta piste d\'amélioration pour le prochain round...', color: '#8B5CF6', suggestions: Array.from(new Set(improvementSuggestions)).slice(0, 6) },
        ];

        // Compter les champs remplis
        const filledCount = fields.filter(f => ((round[f.key] as string) ?? '').trim().length > 0).length;
        const totalFields = fields.length;

        // Progress global incluant tous les modules (champs + rating + mood)
        const hasSelfRating = !!round.selfRating;
        const hasMood = !!round.mood;
        const totalModules = totalFields + 2;
        const filledModules = filledCount + (hasSelfRating ? 1 : 0) + (hasMood ? 1 : 0);
        const progressPct = Math.round((filledModules / totalModules) * 100);

        // Debrief auto-généré
        const autoDebrief = (() => {
          const parts: string[] = [];
          if (round.gamePlan && round.whatWorked) {
            parts.push(`Tu voulais "${round.gamePlan.trim()}" → ${round.whatWorked.trim()} a marché.`);
          } else if (round.gamePlan) {
            parts.push(`Game plan : ${round.gamePlan.trim()}.`);
          } else if (round.whatWorked) {
            parts.push(`${round.whatWorked.trim()} a fonctionné.`);
          }
          if (round.counteredBy) {
            parts.push(`À défendre : ${round.counteredBy.trim()}.`);
          }
          if (round.improvement) {
            parts.push(`Prochain round : ${round.improvement.trim()}.`);
          }
          return parts.join(' ');
        })();

        const currentMood = MOODS.find(m => m.id === round.mood);

        return (
          <View style={{ marginTop: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.background, borderWidth: 1.5, borderColor: filledModules === totalModules ? '#22C55E' : 'rgba(139,92,246,0.3)' }}>
            {/* ── Header gradient premium ── */}
            <TouchableOpacity
              onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setShowAnalysis(v => !v); }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={filledModules === totalModules ? ['#16A34A', '#15803D'] : ['#8B5CF6', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingHorizontal: 14, paddingVertical: 14 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                    {filledModules === totalModules ? <Trophy size={22} color="#fff" /> : <Target size={22} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 }}>
                      DEBRIEF DU ROUND {round.number}
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>
                      {filledModules === 0 ? 'Débriefe ce round' : filledModules === totalModules ? 'Round analysé à fond' : `${filledModules}/${totalModules} points complétés`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff' }}>{progressPct}%</Text>
                    </View>
                    {showAnalysis ? <ChevronUp size={14} color="#fff" /> : <ChevronDown size={14} color="#fff" />}
                  </View>
                </View>
                {/* Progress bar */}
                <View style={{ marginTop: 10, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                  <View style={{ width: `${progressPct}%` as any, height: '100%', backgroundColor: '#fff', borderRadius: 2 }} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Contenu analyse ── */}
            {showAnalysis && (
              <View style={{ padding: 12, gap: 14 }}>
                {/* Pitch d'explication */}
                {filledModules === 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' }}>
                    <Lightbulb size={16} color="#8B5CF6" />
                    <Text style={{ flex: 1, fontSize: 12, color: colors.text, lineHeight: 17 }}>
                      <Text style={{ fontWeight: '800' }}>C'est ICI que tu progresses 10× plus vite. </Text>
                      <Text style={{ color: colors.textMuted ?? '#888' }}>Note ton ressenti + tape sur les chips pour remplir en 30 secondes.</Text>
                    </Text>
                  </View>
                )}

                {/* ═══ NOTE PERSO DU ROUND ═══ */}
                <View style={{ backgroundColor: round.selfRating ? '#F59E0B15' : (isGrapplingSport ? 'rgba(245,158,11,0.05)' : 'rgba(245,158,11,0.05)'), borderRadius: 12, padding: 12, borderWidth: 1, borderColor: round.selfRating ? '#F59E0B40' : 'rgba(245,158,11,0.15)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14 }}>⭐</Text>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#F59E0B', letterSpacing: 0.5, flex: 1 }}>
                      TA NOTE SUR CE ROUND
                    </Text>
                    {round.selfRating && (
                      <View style={{ backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: '#fff' }}>{round.selfRating}/10</Text>
                      </View>
                    )}
                  </View>
                  {/* Échelle simplifiée à 5 émojis (chaque émoji = valeur médiane 2/4/6/8/10).
                      Plus rapide à tapper qu'une échelle 1-10, plus compréhensible visuellement. */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { emoji: '😫', value: 2, label: 'Mauvais', color: '#EF4444' },
                      { emoji: '😕', value: 4, label: 'Moyen', color: '#F59E0B' },
                      { emoji: '😐', value: 6, label: 'Correct', color: '#EAB308' },
                      { emoji: '😊', value: 8, label: 'Bien', color: '#22C55E' },
                      { emoji: '🔥', value: 10, label: 'Au top', color: '#9333EA' },
                    ].map(opt => {
                      // L'émoji est "actif" quand selfRating tombe dans sa tranche (ex: 😊 actif si 7 ou 8)
                      const r = round.selfRating ?? 0;
                      const isActive = r > opt.value - 2 && r <= opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            onUpdate({ selfRating: isActive ? undefined : opt.value });
                          }}
                          style={{
                            flex: 1,
                            aspectRatio: 1,
                            borderRadius: 12,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: isActive ? opt.color : `${opt.color}12`,
                            borderWidth: isActive ? 2 : 1,
                            borderColor: isActive ? opt.color : `${opt.color}30`,
                          }}
                        >
                          <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: isActive ? '#fff' : opt.color, marginTop: 2, letterSpacing: 0.3 }}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {round.selfRating && (
                    <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 6, fontStyle: 'italic' }}>
                      {round.selfRating <= 3 && "🥲 Round compliqué — pas grave, l'analyse t'aidera à progresser"}
                      {round.selfRating > 3 && round.selfRating <= 6 && "💪 Correct, mais tu peux mieux faire"}
                      {round.selfRating > 6 && round.selfRating <= 8 && "🔥 Beau round, continue comme ça !"}
                      {round.selfRating > 8 && "🏆 Round exceptionnel !"}
                    </Text>
                  )}
                </View>

                {/* ═══ MOOD DU ROUND ═══ */}
                <View style={{ backgroundColor: currentMood ? `${currentMood.color}12` : 'rgba(6,182,212,0.05)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: currentMood ? `${currentMood.color}40` : 'rgba(6,182,212,0.15)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14 }}>{currentMood?.emoji ?? '💭'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: currentMood?.color ?? '#06B6D4', letterSpacing: 0.5, flex: 1 }}>
                      COMMENT TU TE SENTAIS ?
                    </Text>
                    {currentMood && (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: currentMood.color }}>{currentMood.label}</Text>
                    )}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 4 }}>
                    {MOODS.map(m => {
                      const selected = round.mood === m.id;
                      return (
                        <TouchableOpacity
                          key={m.id}
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            onUpdate({ mood: round.mood === m.id ? undefined : m.id });
                          }}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            backgroundColor: selected ? m.color : `${m.color}15`,
                            borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6,
                            borderWidth: selected ? 0 : 1, borderColor: `${m.color}40`,
                          }}
                        >
                          <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: selected ? '#fff' : m.color }}>{m.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* ═══ DEBRIEF AUTO (si assez de data) ═══ */}
                {autoDebrief.length > 0 && (
                  <View style={{ backgroundColor: isGrapplingSport ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.08)', borderRadius: 12, padding: 12, borderLeftWidth: 3, borderLeftColor: '#3B82F6' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <ClipboardList size={14} color="#3B82F6" />
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#3B82F6', letterSpacing: 0.5 }}>DEBRIEF AUTO</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}>{autoDebrief}</Text>
                  </View>
                )}

                {/* ═══ COMPARAISON ROUND PRÉCÉDENT ═══ */}
                {previousRound && (previousRound.selfRating || previousRound.result) && (() => {
                  const parts: string[] = [];
                  if (previousRound.selfRating && round.selfRating) {
                    const diff = round.selfRating - previousRound.selfRating;
                    if (diff > 0) parts.push(`+${diff} pts vs round ${previousRound.number}`);
                    else if (diff < 0) parts.push(`${diff} pts vs round ${previousRound.number}`);
                    else parts.push(`Même niveau que round ${previousRound.number}`);
                  }
                  if (previousRound.result === 'loss' && round.result === 'win') {
                    parts.push('Tu t\'es rattrapé !');
                  } else if (previousRound.result === 'win' && round.result === 'win') {
                    parts.push('2e victoire de suite');
                  } else if (previousRound.result === 'loss' && round.result === 'loss') {
                    parts.push('2e défaite de suite — change de stratégie');
                  }
                  if (parts.length === 0) return null;
                  const trendColor = round.selfRating && previousRound.selfRating && round.selfRating > previousRound.selfRating ? '#22C55E' : '#F59E0B';
                  return (
                    <View style={{ backgroundColor: `${trendColor}15`, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <BarChart3 size={14} color={trendColor} />
                      <Text style={{ flex: 1, fontSize: 12, color: colors.text, fontWeight: '600' }}>{parts.join(' · ')}</Text>
                    </View>
                  );
                })()}

                {/* Bouton "Copier du round précédent" — seulement s'il existe un round précédent rempli */}
                {previousRound && (previousRound.gamePlan || previousRound.whatWorked || previousRound.improvement) && (
                  <TouchableOpacity
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      onUpdate({
                        gamePlan: previousRound.gamePlan ?? round.gamePlan,
                        whatWorked: previousRound.whatWorked ?? round.whatWorked,
                        whatDidntWork: previousRound.whatDidntWork ?? round.whatDidntWork,
                        counteredBy: previousRound.counteredBy ?? round.counteredBy,
                        improvement: previousRound.improvement ?? round.improvement,
                      });
                    }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
                      borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderStyle: 'dashed',
                    }}
                  >
                    <Copy size={13} color="#8B5CF6" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>
                      Reprendre les réponses du round {(previousRound.number ?? index) }
                    </Text>
                  </TouchableOpacity>
                )}

                {fields.map(field => {
                  const currentValue = (round[field.key] as string) ?? '';
                  const hasValue = currentValue.trim().length > 0;

                  // Filtrer les suggestions déjà présentes dans le texte
                  const availableSuggestions = field.suggestions.filter(s =>
                    !currentValue.toLowerCase().includes(s.toLowerCase())
                  );

                  // Accordion : la section est ouverte si l'user l'a explicitement ouverte,
                  // ou si elle a déjà du contenu (pour ne pas cacher les données existantes),
                  // ou si c'est Game plan (ouvert par défaut via expandedFields initial).
                  const isExpanded = !!expandedFields[field.key] || hasValue;

                  return (
                    <View key={field.key} style={{ borderWidth: 1, borderColor: hasValue ? `${field.color}40` : `${field.color}20`, borderRadius: 10, overflow: 'hidden' }}>
                      {/* Header cliquable (toggle accordion) */}
                      <TouchableOpacity
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          setExpandedFields(prev => ({ ...prev, [field.key]: !prev[field.key] }));
                        }}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: hasValue ? `${field.color}12` : `${field.color}08` }}
                      >
                        <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: `${field.color}25`, justifyContent: 'center', alignItems: 'center' }}>
                          <field.Icon size={14} color={field.color} />
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: field.color, letterSpacing: 0.5, flex: 1 }}>
                          {field.label.toUpperCase()}
                        </Text>
                        {hasValue && (
                          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: field.color, justifyContent: 'center', alignItems: 'center' }}>
                            <Check size={11} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                        {isExpanded ? <ChevronUp size={16} color={field.color} /> : <ChevronDown size={16} color={field.color} />}
                      </TouchableOpacity>

                      {/* Preview collapsed state : si y'a du contenu et qu'on ferme, on résume */}
                      {!isExpanded && hasValue && (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888' }} numberOfLines={2}>
                            {currentValue}
                          </Text>
                        </View>
                      )}

                      {/* Contenu expansé : bibliothèque + chips + text input */}
                      {isExpanded && (
                        <View style={{ padding: 10, gap: 8 }}>
                          {/* Bouton Bibliothèque — version compacte */}
                          <TouchableOpacity
                            onPress={() => {
                              impactAsync(ImpactFeedbackStyle.Medium);
                              setPlaybookField(field.key as string);
                            }}
                            activeOpacity={0.75}
                            style={{
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                              backgroundColor: `${field.color}15`,
                              borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10,
                              borderWidth: 1, borderColor: `${field.color}40`,
                            }}
                          >
                            <Library size={13} color={field.color} />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: field.color }}>
                              Bibliothèque
                            </Text>
                            <Plus size={12} color={field.color} strokeWidth={3} />
                          </TouchableOpacity>

                          {/* Chips de suggestions */}
                          {availableSuggestions.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingRight: 4 }}>
                              {availableSuggestions.map((s, i) => (
                                <TouchableOpacity
                                  key={`${s}_${i}`}
                                  onPress={() => {
                                    impactAsync(ImpactFeedbackStyle.Light);
                                    const newValue = currentValue ? `${currentValue}, ${s}` : s;
                                    onUpdate({ [field.key]: newValue });
                                  }}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${field.color}12`, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${field.color}30` }}
                                >
                                  <Plus size={10} color={field.color} strokeWidth={3} />
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: field.color }}>{s}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}

                          {/* Champ texte */}
                          <TextInput
                            style={{
                              color: colors.text,
                              borderColor: hasValue ? field.color : `${field.color}40`,
                              backgroundColor: hasValue ? `${field.color}08` : `${field.color}05`,
                              borderWidth: hasValue ? 1.5 : 1,
                              borderRadius: 10,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontSize: 13,
                              minHeight: 44,
                              textAlignVertical: 'top',
                              lineHeight: 18,
                            }}
                            value={currentValue}
                            onChangeText={(v) => onUpdate({ [field.key]: v })}
                            placeholder={field.placeholder}
                            placeholderTextColor={colors.textMuted ?? '#888'}
                            multiline
                          />

                          {/* ── Autocomplete inline ──
                              Dès que l'user tape au moins 2 caractères dans le DERNIER item
                              (après la dernière virgule), on propose les templates de la
                              bibliothèque qui matchent. Tap → remplace le dernier item.
                              Évite d'ouvrir la modal pour juste chercher un nom. */}
                          {(() => {
                            // Extraire la "query" = dernier item après la dernière virgule/point-virgule
                            const parts = currentValue.split(/[,;]/);
                            const lastPart = parts[parts.length - 1].trim();
                            if (lastPart.length < 2) return null;
                            const q = lastPart.toLowerCase();

                            // Sources de suggestions :
                            //  1) bibliothèque de playbook (templates riches)
                            //  2) chips de suggestions du champ (déjà filtrées par contexte)
                            const playbookEntries = (PLAYBOOK_BY_FIELD[field.key as string] ?? [])
                              .flatMap(cat => cat.entries)
                              .filter(e => !e.sports || e.sports.length === 0 || e.sports.includes(sportId));

                            // Dédupe + filtre match + exclu ce qui est déjà dans le champ
                            const lowerCurrent = currentValue.toLowerCase();
                            const seen = new Set<string>();
                            const matches: string[] = [];

                            for (const entry of playbookEntries) {
                              const t = entry.text;
                              if (!t || seen.has(t.toLowerCase())) continue;
                              if (!t.toLowerCase().includes(q)) continue;
                              // Ne pas proposer si déjà présent (sauf si c'est juste la query en cours)
                              const alreadyThere = parts.slice(0, -1).some(p => p.trim().toLowerCase() === t.toLowerCase());
                              if (alreadyThere) continue;
                              seen.add(t.toLowerCase());
                              matches.push(t);
                            }

                            // Fallback : aussi proposer depuis les chips si playbook vide
                            for (const s of field.suggestions) {
                              if (matches.length >= 6) break;
                              if (seen.has(s.toLowerCase())) continue;
                              if (!s.toLowerCase().includes(q)) continue;
                              if (lowerCurrent.includes(s.toLowerCase())) continue;
                              seen.add(s.toLowerCase());
                              matches.push(s);
                            }

                            const top = matches.slice(0, 6);
                            if (top.length === 0) return null;

                            return (
                              <View style={{
                                marginTop: 6,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: `${field.color}40`,
                                backgroundColor: colors.card ?? colors.background,
                                overflow: 'hidden',
                              }}>
                                <View style={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: colors.textMuted ?? '#888', letterSpacing: 0.5 }}>
                                    {top.length} SUGGESTION{top.length > 1 ? 'S' : ''}
                                  </Text>
                                </View>
                                {top.map((text, i) => (
                                  <TouchableOpacity
                                    key={`${text}_${i}`}
                                    onPress={() => {
                                      impactAsync(ImpactFeedbackStyle.Light);
                                      // Remplace le dernier item (la query) par le template choisi.
                                      // Conserve ce qui a été tapé avant (autres items séparés par virgule).
                                      const prefix = parts.slice(0, -1).join(', ').trim();
                                      const newValue = prefix ? `${prefix}, ${text}` : text;
                                      // Ajoute une virgule + espace pour continuer à taper si besoin
                                      onUpdate({ [field.key]: `${newValue}, ` });
                                    }}
                                    activeOpacity={0.6}
                                    style={{
                                      flexDirection: 'row', alignItems: 'center', gap: 8,
                                      paddingHorizontal: 10, paddingVertical: 9,
                                      borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                                      borderTopColor: colors.border ?? 'rgba(0,0,0,0.08)',
                                    }}
                                  >
                                    <Plus size={12} color={field.color} strokeWidth={3} />
                                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                                      {text}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            );
                          })()}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Résumé motivationnel */}
                {filledCount === totalFields && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#22C55E' }}>
                    <Trophy size={18} color="#22C55E" />
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#22C55E' }}>
                      Round analysé à fond. C'est comme ça qu'on progresse !
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })()}

      {/* Modals soumissions */}
      <SubmissionsModal
        visible={showSubsGivenModal}
        onClose={() => setShowSubsGivenModal(false)}
        submissions={submissions}
        selected={methodsGiven}
        onToggle={(sub) => {
          const arr = methodsGiven.includes(sub)
            ? methodsGiven.filter((s) => s !== sub)
            : [...methodsGiven, sub];
          onUpdate({ methodsGiven: arr, submissionsGiven: arr.length });
        }}
        title="Finitions données"
      />
      <SubmissionsModal
        visible={showSubsTakenModal}
        onClose={() => setShowSubsTakenModal(false)}
        submissions={submissions}
        selected={methodsTaken}
        onToggle={(sub) => {
          const arr = methodsTaken.includes(sub)
            ? methodsTaken.filter((s) => s !== sub)
            : [...methodsTaken, sub];
          onUpdate({ methodsTaken: arr, submissionsTaken: arr.length });
        }}
        title="Finitions reçues"
      />

      {/* Modal bibliothèque templates */}
      <PlaybookModal
        visible={playbookField !== null}
        onClose={() => setPlaybookField(null)}
        fieldKey={playbookField ?? ''}
        sportId={sportId}
        currentValue={playbookField ? ((round[playbookField as keyof CombatRound] as string) ?? '') : ''}
        onSelect={(text, mode) => {
          if (!playbookField) return;
          const key = playbookField as keyof CombatRound;
          const current = (round[key] as string) ?? '';
          const newValue = mode === 'replace' || !current ? text : `${current}, ${text}`;
          onUpdate({ [key]: newValue });
        }}
      />
    </View>
  );
});

// ============================================
// ÉCRAN PRINCIPAL
// ============================================

export default function AddCombatSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sport?: string;
    editId?: string;
    date?: string;
    clubId?: string;
  }>();
  const { colors, screenBackground, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { showPopup, PopupComponent } = useCustomPopup();
  const mainScrollRef = useRef<ScrollView>(null);
  const locationSectionY = useRef<number>(0);
  const { avatarImage: contextAvatar } = useAvatar();
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // --- State ---
  const [selectedSport, setSelectedSport] = useState(params.sport || 'jjb');
  const [step, setStep] = useState(1);
  const [sessionType, setSessionType] = useState<SessionTypeId>('entrainement');
  const [date, setDate] = useState(() => {
    if (params.date) return new Date(params.date);
    return new Date();
  });
  const [durationHours, setDurationHours] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(
    params.clubId ? parseInt(params.clubId) : null
  );
  const [clubs, setClubs] = useState<Club[]>([]);

  // Lieu
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLon, setLocationLon] = useState<number | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<
    { name: string; lat: number | null; lon: number | null; address?: string }[]
  >([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentLocations, setRecentLocations] = useState<
    { name: string; lat: number | null; lon: number | null; address?: string }[]
  >([]);

  // Séance combat
  const [technicalTheme, setTechnicalTheme] = useState('');
  const [selectedThemeTags, setSelectedThemeTags] = useState<string[]>([]);
  const [nbRounds, setNbRounds] = useState(0);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundDuration, setRoundDuration] = useState(5);
  const [showRoundDetail, setShowRoundDetail] = useState(true);
  const [combatRounds, setCombatRounds] = useState<CombatRound[]>([]);

  // Ressenti
  const [rpe, setRpe] = useState(6);
  const [heartRateMin, setHeartRateMin] = useState('');
  const [heartRateAvg, setHeartRateAvg] = useState('');
  const [heartRateMax, setHeartRateMax] = useState('');
  const [techniqueRating, setTechniqueRating] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  // Noms des partenaires connus (pour autocomplétion dans les rounds)
  const [partnerNames, setPartnerNames] = useState<string[]>([]);
  // Objectifs actifs par partenaire (pour rappel avant séance)
  const [partnerGoals, setPartnerGoals] = useState<Record<string, string>>({});
  // Profils partenaires (forces/faiblesses/ce qui marche) pour suggestions d'analyse
  const [partnerProfiles, setPartnerProfiles] = useState<Record<string, { strengths: string[]; weaknesses: string[]; whatWorks: string[] }>>({});
  // Techniques les plus drillées (pour suggestions dans l'analyse)
  const [drillSuggestions, setDrillSuggestions] = useState<string[]>([]);

  // UI
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [saving, setSaving] = useState(false);

  // Données utilisateur pour la carte
  const [userName, setUserName] = useState<string>('Champion');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [yearlyCount, setYearlyCount] = useState<number>(0);
  const [yearlyObjective, setYearlyObjective] = useState<number>(365);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>('Ashigaru');
  const [userLevel, setUserLevel] = useState<number>(0);

  // ============================================
  // EFFETS
  // ============================================

  useEffect(() => {
    getClubs().then(setClubs);
  }, []);

  // Charger les partenaires connus pour autocomplétion + objectifs actifs
  // + écouter l'event YOROI_PARTNERS_CHANGED pour rafraîchir instantanément
  // quand l'utilisateur ajoute/modifie un partenaire sans fermer l'app.
  const loadPartners = useCallback(() => {
    AsyncStorage.getItem('@yoroi_sparring_partners').then(raw => {
      if (!raw) { setPartnerNames([]); setPartnerGoals({}); setPartnerProfiles({}); return; }
      try {
        const partners: { name: string; activeGoal?: { text: string }; strengths?: string[]; weaknesses?: string[]; whatWorks?: string[] }[] = JSON.parse(raw);
        setPartnerNames(partners.map(p => p.name));
        const goals: Record<string, string> = {};
        const profiles: Record<string, { strengths: string[]; weaknesses: string[]; whatWorks: string[] }> = {};
        for (const p of partners) {
          if (p.activeGoal?.text) goals[p.name.toLowerCase()] = p.activeGoal.text;
          profiles[p.name.toLowerCase()] = {
            strengths: p.strengths ?? [],
            weaknesses: p.weaknesses ?? [],
            whatWorks: p.whatWorks ?? [],
          };
        }
        setPartnerGoals(goals);
        setPartnerProfiles(profiles);
      } catch { /* silent */ }
    });
  }, []);

  useEffect(() => {
    loadPartners();
    // Rafraîchissement instantané quand un partenaire est ajouté/modifié ailleurs
    const sub = DeviceEventEmitter.addListener('YOROI_PARTNERS_CHANGED', loadPartners);

    // Charger les techniques les plus drillées comme suggestions
    AsyncStorage.getItem('@yoroi_drill_tracker').then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw);
        const techs: { name: string; totalReps: number }[] = data.techniques ?? [];
        const sorted = techs
          .filter(t => t.totalReps > 0)
          .sort((a, b) => b.totalReps - a.totalReps)
          .slice(0, 6)
          .map(t => t.name);
        setDrillSuggestions(sorted);
      } catch { /* silent */ }
    });

    return () => sub.remove();
  }, [loadPartners]);

  // Charger les lieux récents depuis la base de données (requête SQL directe — plus précise que getTrainings)
  useEffect(() => {
    (async () => {
      try {
        const db = await openDatabase();
        const rows = await db.getAllAsync<{ location_name: string; location_lat: number | null; location_lon: number | null }>(
          `SELECT DISTINCT location_name, location_lat, location_lon FROM trainings WHERE location_name IS NOT NULL AND location_name != '' ORDER BY date DESC LIMIT 20`
        );
        const seen = new Set<string>();
        const unique = rows.filter((r) => {
          const key = r.location_name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setRecentLocations(unique.map((r) => ({ name: r.location_name, lat: r.location_lat, lon: r.location_lon })));
      } catch (_e) {
        // Silently fail — recent locations are optional
      }
    })();
  }, []);

  useEffect(() => {
    if (!params.editId) return;
    getTrainingById(parseInt(params.editId)).then((training) => {
      if (!training) return;
      if (training.sport) setSelectedSport(training.sport);
      if (training.session_type) setSessionType(training.session_type as SessionTypeId);
      if (training.date) setDate(new Date(training.date));
      if (training.duration_minutes) {
        setDurationHours(Math.floor(training.duration_minutes / 60));
        setDurationMinutes(training.duration_minutes % 60);
      }
      if (training.technical_theme) {
        setTechnicalTheme(training.technical_theme);
        setSelectedThemeTags(training.technical_theme.split(',').map((t: string) => t.trim()).filter(Boolean));
      }
      if (training.rounds) setNbRounds(training.rounds);
      if (training.round_duration) setRoundDuration(training.round_duration);
      if (training.combat_rounds) {
        try {
          const rounds = JSON.parse(training.combat_rounds as any);
          if (Array.isArray(rounds) && rounds.length > 0) {
            setCombatRounds(rounds);
            setShowRoundDetail(true);
          }
        } catch {}
      }
      if (training.intensity) setRpe(training.intensity);
      if (training.heart_rate) setHeartRateAvg(String(training.heart_rate));
      if ((training as any).min_heart_rate) setHeartRateMin(String((training as any).min_heart_rate));
      if (training.max_heart_rate) setHeartRateMax(String(training.max_heart_rate));
      if (training.technique_rating) setTechniqueRating(training.technique_rating);
      if (training.notes) setNotes(training.notes);
      if (training.location_name) setLocationName(training.location_name);
      if (training.location_lat) setLocationLat(training.location_lat);
      if (training.location_lon) setLocationLon(training.location_lon);
      if (training.club_id) setSelectedClubId(training.club_id);
    });
  }, [params.editId]);

  // Synchroniser les rounds quand nbRounds change
  useEffect(() => {
    setCombatRounds((prev) => {
      if (nbRounds > prev.length) {
        const newRounds = [...prev];
        for (let i = prev.length; i < nbRounds; i++) {
          newRounds.push({
            number: i + 1,
            partner: '',
            result: undefined,
            method: '',
            methodsGiven: [],
            methodsTaken: [],
            submissionsGiven: 0,
            submissionsTaken: 0,
            notes: '',
          });
        }
        return newRounds;
      }
      return prev.slice(0, nbRounds);
    });
    // Clamp l'index courant si on a réduit le nombre de rounds
    setCurrentRoundIndex(prev => Math.min(prev, Math.max(0, nbRounds - 1)));
  }, [nbRounds]);

  // Charger les données utilisateur pour la carte de validation
  useEffect(() => {
    (async () => {
      try {
        const [profile, allTrainings] = await Promise.all([getProfile(), getTrainings()]);
        if (profile) {
          setUserName(profile.name);
          if (profile.profile_photo) setUserPhoto(profile.profile_photo);
        } else {
          const settings = await getUserSettings();
          if (settings.username) setUserName(settings.username);
        }
        if (contextAvatar) setUserAvatar(contextAvatar);
        const totalPoints = await getUnifiedPoints();
        const rank = getCurrentRank(totalPoints);
        setUserRank(rank.name);
        setUserLevel(totalPoints);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);
        const list = allTrainings || [];

        // Compteurs robustes : on utilise le PRÉFIXE string de la date stockée
        // (format YYYY-MM-DD en DB) plutôt que `new Date(t.date)` qui peut échouer
        // selon le format (ex: "25/01/2026" FR → Invalid Date).
        // ET on filtre par sport pour refléter le discipline courante ("j'ai fait
        // X séances de JJB cette année") — plus parlant que compter toutes séances.
        const yearPrefix = `${currentYear}-`;
        const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-`;
        const weekStartIso = startOfWeek.toISOString().slice(0, 10);

        const sameSportFilter = (t: any) => !!t.sport && t.sport === selectedSport;

        const yearMatch = (t: any) => typeof t.date === 'string' && t.date.startsWith(yearPrefix) && sameSportFilter(t);
        const monthMatch = (t: any) => typeof t.date === 'string' && t.date.startsWith(monthPrefix) && sameSportFilter(t);
        const weekMatch = (t: any) => typeof t.date === 'string' && t.date >= weekStartIso && sameSportFilter(t);

        setYearlyCount(list.filter(yearMatch).length + 1);
        setMonthlyCount(list.filter(monthMatch).length + 1);
        setWeeklyCount(list.filter(weekMatch).length + 1);
        try {
          const obj = await AsyncStorage.getItem('@yoroi_yearly_objective');
          if (obj) setYearlyObjective(parseInt(obj));
        } catch {}
      } catch {}
    })();
  // Recalcule les compteurs si le sport change (étape 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSport]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationLat(loc.coords.latitude);
      setLocationLon(loc.coords.longitude);
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        const name = [place.name, place.street, place.city].filter(Boolean).join(', ');
        setLocationName(name);
      }
    } catch (_e) {
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationSearch = (text: string) => {
    setLocationName(text);
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current);
    if (text.trim().length < 2) {
      // Afficher les lieux récents si texte court
      if (text.trim().length === 0 && recentLocations.length > 0) {
        setLocationSuggestions(recentLocations);
        setShowLocationSuggestions(true);
      } else {
        setShowLocationSuggestions(false);
      }
      return;
    }
    // Filtrer d'abord dans les lieux récents
    const q = text.toLowerCase();
    const localMatches = recentLocations.filter(l => l.name.toLowerCase().includes(q));
    if (localMatches.length > 0) {
      setLocationSuggestions(localMatches);
      setShowLocationSuggestions(true);
    }
    // Puis rechercher via Nominatim (OpenStreetMap) après debounce — gère les noms d'établissements
    locationSearchTimer.current = setTimeout(async () => {
      try {
        const encoded = encodeURIComponent(text.trim());
        const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'YoroiApp/1.0' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Nominatim error');
        const data = await res.json();
        const geoSuggestions = Array.isArray(data) ? data.map((item: any) => {
          const addr = item.address || {};
          const nameParts = [
            item.name || addr.amenity || addr.leisure || addr.shop || addr.building,
            addr.road || addr.pedestrian,
          ].filter(Boolean);
          const addrParts = [
            addr.city || addr.town || addr.village || addr.municipality,
            addr.postcode,
          ].filter(Boolean);
          return {
            name: nameParts.join(', ') || item.display_name?.split(',')[0] || text.trim(),
            address: addrParts.join(', '),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          };
        }) : [];
        // Combiner lieux récents filtrés + résultats Nominatim (sans doublons)
        const combined = [...localMatches];
        const existingNames = new Set(combined.map(l => l.name.toLowerCase()));
        for (const s of geoSuggestions) {
          if (!existingNames.has(s.name.toLowerCase())) {
            combined.push(s);
            existingNames.add(s.name.toLowerCase());
          }
        }
        setLocationSuggestions(combined.slice(0, 5));
        setShowLocationSuggestions(combined.length > 0);
      } catch (_e) {
        // Garder les résultats locaux si la recherche échoue
      }
    }, 500);
  };

  const selectLocationSuggestion = (suggestion: { name: string; lat: number | null; lon: number | null }) => {
    setLocationName(suggestion.name);
    setLocationLat(suggestion.lat);
    setLocationLon(suggestion.lon);
    setShowLocationSuggestions(false);
  };

  const handleOpenMaps = () => {
    const q = locationName.trim();
    if (!q) return;
    const encoded = encodeURIComponent(q);
    if (Platform.OS === 'ios') {
      safeOpenURL(`maps://?q=${encoded}`);
    } else {
      safeOpenURL(`https://maps.google.com/?q=${encoded}`);
    }
  };

  const updateRound = useCallback((index: number, updates: Partial<CombatRound>) => {
    setCombatRounds((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  }, []);

  // Handlers stables par round — évite les re-renders inutiles de RoundCard
  // Ne se recréent que quand le nombre de rounds change
  const roundUpdateHandlers = useMemo(
    () => combatRounds.map((_, i) => (updates: Partial<CombatRound>) => {
      setCombatRounds(prev => {
        const copy = [...prev];
        copy[i] = { ...copy[i], ...updates };
        return copy;
      });
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combatRounds.length]
  );

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    Keyboard.dismiss();
    try {
      const totalMinutes = durationHours * 60 + durationMinutes;
      const trainingData: any = {
        sport: selectedSport,
        session_type: sessionType,
        date: format(date, 'yyyy-MM-dd'),
        start_time: format(date, 'HH:mm'),
        duration_minutes: totalMinutes,
        intensity: rpe,
        rounds: nbRounds,
        round_duration: roundDuration,
      };

      if (notes.trim()) trainingData.notes = notes.trim();
      if (technicalTheme.trim()) trainingData.technical_theme = technicalTheme.trim();
      if (techniqueRating) trainingData.technique_rating = techniqueRating;
      if (heartRateAvg) trainingData.heart_rate = parseInt(heartRateAvg);
      if (heartRateMin) trainingData.min_heart_rate = parseInt(heartRateMin);
      if (heartRateMax) trainingData.max_heart_rate = parseInt(heartRateMax);
      if (showRoundDetail && combatRounds.length > 0)
        trainingData.combat_rounds = JSON.stringify(combatRounds);
      if (locationName.trim()) trainingData.location_name = locationName.trim();
      if (locationLat != null) trainingData.location_lat = locationLat;
      if (locationLon != null) trainingData.location_lon = locationLon;
      if (selectedClubId != null) trainingData.club_id = selectedClubId;

      let newId: number | null = null;
      if (params.editId) {
        await updateTraining(parseInt(params.editId), trainingData);
        newId = parseInt(params.editId);
      } else {
        newId = await addTraining(trainingData);
      }

      await notificationAsync(NotificationFeedbackType.Success);
      successHaptic();

      // Mettre à jour le widget streak (en arrière-plan)
      import('@/lib/widgetData').then(async ({ updateWidgetStreak }) => {
        try {
          const { calculateStreak } = await import('@/lib/database');
          const streak = await calculateStreak();
          const rankStr = await AsyncStorage.getItem('@yoroi_rank');
          await updateWidgetStreak(streak, rankStr ?? 'Recrue');
        } catch { /* non bloquant */ }
      }).catch(() => {});

      checkOvertrainingAlert().catch(() => {});
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');

      // Rappel de sauvegarde après ajout d'une séance sparring (protège les données)
      import('@/lib/backupReminderService').then(({ backupReminderService }) => {
        backupReminderService.onDataAdded().then(shouldShow => {
          if (shouldShow) {
            backupReminderService.showReminder().catch(() => {});
          }
        }).catch(() => {});
      }).catch(() => {});

      // Vérification achievements : débloque les nouveaux badges et les affiche
      import('@/lib/combatAchievements').then(async ({ computeStats, checkNewAchievements }) => {
        try {
          const allTrainings = await getTrainings(3650);
          const stats = computeStats(allTrainings);
          const newly = await checkNewAchievements(stats);
          if (newly.length > 0) {
            const titles = newly.map(a => `${a.emoji} ${a.title}`).join('\n');
            setTimeout(() => {
              Alert.alert(
                newly.length === 1 ? 'Achievement débloqué !' : `${newly.length} achievements débloqués !`,
                titles,
                [{ text: 'Voir tout', onPress: () => router.push('/combat-achievements' as any) }, { text: 'OK' }]
              );
            }, 600);
          }
        } catch { /* non bloquant */ }
      }).catch(() => {});

      if (params.editId) {
        router.back();
        return;
      }

      playWorkoutCompleteSound();

      // Naviguer directement vers la carte finale
      const shareId = newId ? Number(newId) : null;
      InteractionManager.runAfterInteractions(() => {
        if (shareId) router.push(`/social-share/last-session?id=${shareId}` as any);
        else router.replace('/(tabs)');
      });
    } catch (e) {
      showPopup('Erreur', 'Impossible d\'enregistrer la séance. Vérifie tes données et réessaie.', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Dérivé
  // ============================================

  const currentSport = COMBAT_SPORTS.find((s) => s.id === selectedSport);
  const sportDisplayName = currentSport
    ? currentSport.name.toUpperCase()
    : getSportName(selectedSport).toUpperCase();

  const showRoundsSection = sessionType === 'entrainement' || sessionType === 'openmat' || sessionType === 'guerre' || sessionType === 'competition';
  const suggestions = getSuggestionsForSport(selectedSport);


  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── HEADER ─── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: screenBackground,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (step > 1) {
              impactAsync(ImpactFeedbackStyle.Light);
              setStep(step - 1);
              return;
            }
            // À l'étape 1 : check si des données ont été saisies
            const hasData =
              combatRounds.some(r => r.result || r.partner || (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0 || (r.methodsGiven?.length ?? 0) > 0 || (r.methodsTaken?.length ?? 0) > 0 || r.notes || r.gamePlan || r.whatWorked || r.whatDidntWork || r.counteredBy || r.improvement) ||
              technicalTheme.trim().length > 0 ||
              selectedThemeTags.length > 0 ||
              notes.trim().length > 0 ||
              heartRateAvg.length > 0 ||
              heartRateMin.length > 0 ||
              heartRateMax.length > 0 ||
              techniqueRating > 0 ||
              locationName.trim().length > 0 ||
              selectedClubId != null;
            if (!hasData) {
              router.back();
              return;
            }
            // Données saisies : demander confirmation
            Alert.alert(
              'Quitter sans enregistrer ?',
              'Tes données seront perdues. Tu peux enregistrer la séance à l\'étape 4 pour les garder.',
              [
                { text: 'Continuer à éditer', style: 'cancel' },
                { text: 'Quitter sans enregistrer', style: 'destructive', onPress: () => { impactAsync(ImpactFeedbackStyle.Heavy); router.back(); } },
              ]
            );
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {step > 1 ? (
            <ChevronLeft size={24} color="#fff" />
          ) : (
            <X size={22} color="#fff" />
          )}
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {currentSport && (
              <MaterialCommunityIcons
                name={currentSport.icon as any}
                size={15}
                color="rgba(255,255,255,0.8)"
              />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sportDisplayName}
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 }}>
            ÉTAPE {step} / 4
          </Text>
        </View>

        {step < 4 ? (
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setStep(step + 1);
            }}
          >
            <Text style={styles.headerSaveBtnText}>Suivant →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerSaveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.headerSaveBtnText}>
                {params.editId ? 'Mettre à jour' : 'Enregistrer'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
      >
        <ScrollView
          ref={mainScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 300, keyboardHeight + 140) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ ÉTAPE 1 : Club + Quand & Où ══ */}
          {step === 1 && (
            <>
          {/* ─── CLUB / SALLE (en premier) ─── */}
          <View style={styles.section}>
            <View style={styles.clubLabelRow}>
              <SectionLabel label="CLUB / SALLE" accent={screenBackground} />
              <TouchableOpacity
                style={[styles.addClubBtn, { borderColor: screenBackground }]}
                onPress={() => setShowCreateClub(true)}
              >
                <Plus size={11} color={screenBackground} />
                <Text style={[styles.addClubBtnText, { color: screenBackground }]}>Nouveau</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.clubScrollContent}
            >
              {/* Libre */}
              <TouchableOpacity
                style={[
                  styles.clubCardBig,
                  {
                    backgroundColor: selectedClubId === null ? screenBackground + '20' : colors.card,
                    borderColor: selectedClubId === null ? screenBackground : (colors.border ?? '#444'),
                    borderWidth: selectedClubId === null ? 2 : 1,
                  },
                ]}
                onPress={() => setSelectedClubId(null)}
              >
                <View style={[styles.clubCardBigIcon, { backgroundColor: selectedClubId === null ? screenBackground + '30' : (colors.backgroundElevated ?? colors.card) }]}>
                  <Home size={22} color={selectedClubId === null ? screenBackground : colors.textMuted} />
                </View>
                <Text style={[styles.clubCardBigName, { color: selectedClubId === null ? screenBackground : colors.text }]} numberOfLines={1}>
                  Libre
                </Text>
              </TouchableOpacity>

              {/* Clubs enregistrés */}
              {clubs.map((club) => {
                const isSelected = selectedClubId === club.id;
                const logoSource = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
                const accentCol = club.color ?? screenBackground;
                return (
                  <TouchableOpacity
                    key={club.id}
                    style={[
                      styles.clubCardBig,
                      {
                        backgroundColor: isSelected ? accentCol + '20' : colors.card,
                        borderColor: isSelected ? accentCol : (colors.border ?? '#444'),
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => setSelectedClubId(club.id ?? null)}
                  >
                    {logoSource ? (
                      <Image
                        source={logoSource}
                        style={styles.clubCardBigLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.clubCardBigIcon, { backgroundColor: accentCol }]}>
                        <Swords size={22} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={[styles.clubCardBigName, { color: isSelected ? accentCol : colors.text }]} numberOfLines={1}>
                      {club.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.clubCardBigCheck, { backgroundColor: accentCol }]}>
                        <Check size={9} color="#fff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Bouton ajouter */}
              <TouchableOpacity
                style={[styles.clubCardBig, { backgroundColor: colors.card, borderColor: colors.border ?? '#444', borderStyle: 'dashed' }]}
                onPress={() => setShowCreateClub(true)}
              >
                <View style={[styles.clubCardBigIcon, { backgroundColor: screenBackground + '15' }]}>
                  <Plus size={22} color={screenBackground} />
                </View>
                <Text style={[styles.clubCardBigName, { color: screenBackground }]} numberOfLines={1}>Ajouter</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal création club */}
            <AddClubModal
              visible={showCreateClub}
              onClose={() => setShowCreateClub(false)}
              onSave={async () => {
                const updatedClubs = await getClubs();
                setClubs(updatedClubs);
                if (updatedClubs.length > 0) {
                  const newest = updatedClubs[updatedClubs.length - 1];
                  setSelectedClubId(newest.id ?? null);
                }
              }}
            />
          </View>

          {/* ─── SECTION QUAND & OÙ ─── */}
          <View style={styles.section}>
            <SectionLabel label="QUAND & OÙ" accent={screenBackground} />
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border ?? '#2a2a2a' },
              ]}
            >
              {/* Date + Heure */}
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[
                    styles.dateTimeBtn,
                    { backgroundColor: colors.background, borderColor: colors.border ?? '#333' },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={15} color={screenBackground} />
                  <Text style={[styles.dateTimeBtnText, { color: colors.text }]}>
                    {format(date, 'dd MMM yyyy', { locale: fr })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dateTimeBtn,
                    { backgroundColor: colors.background, borderColor: colors.border ?? '#333' },
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={15} color={screenBackground} />
                  <Text style={[styles.dateTimeBtnText, { color: colors.text }]}>
                    {format(date, 'HH:mm')}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_e, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, selectedDate) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}

              <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />

              {/* Durée */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text }]}>
                DURÉE
              </Text>
              <View style={styles.durationRow}>
                <View style={styles.durationItem}>
                  <Text style={[styles.durationLabel, { color: colors.textMuted ?? colors.text }]}>
                    Heures
                  </Text>
                  <Stepper
                    value={durationHours}
                    onDecrement={() => setDurationHours((h) => Math.max(0, h - 1))}
                    onIncrement={() => setDurationHours((h) => Math.min(8, h + 1))}
                    displayValue={`${durationHours}h`}
                    accentColor={screenBackground}
                  />
                </View>
                <View style={styles.durationSep} />
                <View style={styles.durationItem}>
                  <Text style={[styles.durationLabel, { color: colors.textMuted ?? colors.text }]}>
                    Minutes
                  </Text>
                  <Stepper
                    value={durationMinutes}
                    onDecrement={() => setDurationMinutes((m) => Math.max(0, m - 5))}
                    onIncrement={() => setDurationMinutes((m) => Math.min(55, m + 5))}
                    displayValue={`${durationMinutes}min`}
                    accentColor={screenBackground}
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />

              {/* Lieu */}
              <View onLayout={(e) => { locationSectionY.current = e.nativeEvent.layout.y; }}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text }]}>
                LIEU
              </Text>
              <View style={styles.locationRow}>
                <View
                  style={[
                    styles.locationInput,
                    { backgroundColor: colors.background, borderColor: colors.border ?? '#333' },
                  ]}
                >
                  <MapPin size={14} color={colors.textMuted ?? '#888'} />
                  <TextInput
                    style={[styles.locationTextInput, { color: colors.text }]}
                    value={locationName}
                    onChangeText={handleLocationSearch}
                    onFocus={() => {
                      if (locationName.trim().length === 0 && recentLocations.length > 0) {
                        setLocationSuggestions(recentLocations);
                        setShowLocationSuggestions(true);
                      }
                      // Scroll auto pour remonter le champ lieu en haut (laisser la place aux suggestions)
                      setTimeout(() => {
                        if (mainScrollRef.current && locationSectionY.current > 0) {
                          mainScrollRef.current.scrollTo({ y: Math.max(0, locationSectionY.current - 60), animated: true });
                        }
                      }, 250);
                    }}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    placeholder="Nom du lieu, adresse..."
                    placeholderTextColor={colors.textMuted ?? '#888'}
                    returnKeyType="done"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.locationActionBtn, { backgroundColor: screenBackground }]}
                  onPress={handleGetLocation}
                  disabled={isLoadingLocation}
                >
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Navigation size={15} color="#fff" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationActionBtn,
                    {
                      backgroundColor: locationName.trim() ? '#10B981' : (colors.card),
                      borderColor: colors.border ?? '#333',
                      borderWidth: locationName.trim() ? 0 : 1,
                    },
                  ]}
                  onPress={handleOpenMaps}
                  disabled={!locationName.trim()}
                >
                  <MapPin size={15} color={locationName.trim() ? '#fff' : (colors.textMuted ?? '#888')} />
                </TouchableOpacity>
              </View>

              {/* Suggestions d'adresse */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View style={{
                  backgroundColor: colors.card,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border ?? '#333',
                  marginTop: 4,
                  overflow: 'hidden',
                }}>
                  {locationSuggestions.map((suggestion, idx) => (
                    <TouchableOpacity
                      key={`${suggestion.name}-${idx}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderBottomWidth: idx < locationSuggestions.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border ?? '#333',
                      }}
                      onPress={() => selectLocationSuggestion(suggestion)}
                    >
                      <MapPin size={13} color={colors.textMuted ?? '#888'} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 13 }} numberOfLines={1}>
                          {suggestion.name}
                        </Text>
                        {suggestion.address ? (
                          <Text style={{ color: colors.textMuted ?? '#888', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                            {suggestion.address}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              </View>
            </View>
          </View>
            </>
          )}

          {/* ══ ÉTAPE 2 : Type de séance + Thème ══ */}
          {step === 2 && (
            <>
          {/* ─── SECTION TYPE DE SÉANCE ─── */}
          <View style={styles.section}>
            <SectionLabel label="TYPE DE SÉANCE" accent={screenBackground} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 2 }}
            >
              {SESSION_TYPES.map((type) => {
                const isSelected = sessionType === type.id;
                const IconComp = type.icon;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.sessionTypeCard,
                      {
                        backgroundColor: isSelected ? type.color : colors.card,
                        borderColor: isSelected ? type.color : (colors.border ?? '#333'),
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      setSessionType(type.id);
                    }}
                  >
                    <IconComp size={18} color={isSelected ? '#fff' : type.color} />
                    <Text
                      style={[styles.sessionTypeLabel, { color: isSelected ? '#fff' : colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {type.label}
                    </Text>
                    <Text
                      style={[
                        styles.sessionTypeSublabel,
                        { color: isSelected ? 'rgba(255,255,255,0.75)' : (colors.textMuted ?? colors.text) },
                      ]}
                    >
                      {type.sublabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ─── SECTION THÈME TECHNIQUE (masqué pour Guerre & Compétition) ─── */}
          {(sessionType === 'technique' || sessionType === 'entrainement' || sessionType === 'openmat') && (
          <View style={styles.section}>
            <SectionLabel label="THÈME DE LA SÉANCE" accent={screenBackground} />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border ?? '#2a2a2a' }]}>

              {/* Tags sélectionnés */}
              {selectedThemeTags.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {selectedThemeTags.map(tag => {
                    // Retrouver la couleur de la catégorie du tag
                    const tagCat = getThemeCategoriesForSport(selectedSport).find(c => c.themes.includes(tag));
                    const tagColor = tagCat?.color ?? screenBackground;
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          const next = selectedThemeTags.filter(t => t !== tag);
                          setSelectedThemeTags(next);
                          setTechnicalTheme(next.join(', '));
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          backgroundColor: tagColor,
                          borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                        <X size={10} color="rgba(255,255,255,0.85)" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 14, fontStyle: 'italic' }}>
                  Sélectionne ce que vous avez travaillé...
                </Text>
              )}

              {/* Catégories de thèmes */}
              {getThemeCategoriesForSport(selectedSport).map(cat => (
                <View key={cat.label} style={{ marginBottom: 12 }}>
                  {/* Header catégorie */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: `${cat.color}15`,
                    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                    marginBottom: 8,
                  }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cat.color }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: cat.color, letterSpacing: 0.5 }}>
                      {cat.label.toUpperCase()}
                    </Text>
                  </View>

                  {/* Chips de la catégorie */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {cat.themes.map(theme => {
                      const active = selectedThemeTags.includes(theme);
                      return (
                        <TouchableOpacity
                          key={theme}
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            const next = active
                              ? selectedThemeTags.filter(t => t !== theme)
                              : [...selectedThemeTags, theme];
                            setSelectedThemeTags(next);
                            setTechnicalTheme(next.join(', '));
                          }}
                          style={{
                            paddingHorizontal: 10, paddingVertical: 6,
                            borderRadius: 8, borderWidth: active ? 0 : 1,
                            borderColor: `${cat.color}50`,
                            backgroundColor: active ? cat.color : `${cat.color}12`,
                          }}
                        >
                          <Text style={{
                            fontSize: 12, fontWeight: '600',
                            color: active ? '#fff' : cat.color,
                          }}>
                            {theme}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          )}
            </>
          )}

          {/* ══ ÉTAPE 3 : Rounds + Ressenti + Notes ══ */}
          {step === 3 && (
            <>
          {/* ─── SECTION ROUNDS ─── */}
          {showRoundsSection && (
            <View style={styles.section}>
              <SectionLabel label="ROUNDS" accent={screenBackground} />
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border ?? '#2a2a2a' },
                ]}
              >
                {/* Nombre de rounds */}
                <View style={styles.roundsRow}>
                  <Text style={[styles.roundsRowLabel, { color: colors.text }]}>
                    Nombre de rounds
                  </Text>
                  <Stepper
                    value={nbRounds}
                    onDecrement={() => setNbRounds((n) => Math.max(0, n - 1))}
                    onIncrement={() => setNbRounds((n) => Math.min(20, n + 1))}
                    displayValue={`${nbRounds}`}
                    accentColor={screenBackground}
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />

                {/* Durée par round */}
                <View style={styles.roundsRow}>
                  <Text style={[styles.roundsRowLabel, { color: colors.text }]}>
                    Durée par round
                  </Text>
                  <Stepper
                    value={roundDuration}
                    onDecrement={() => setRoundDuration((d) => Math.max(1, d - 1))}
                    onIncrement={() => setRoundDuration((d) => Math.min(20, d + 1))}
                    displayValue={`${roundDuration} min`}
                    accentColor={screenBackground}
                  />
                </View>

                {nbRounds > 0 && (
                  <>
                    <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />
                    <TouchableOpacity
                      style={styles.toggleDetailBtn}
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        setShowRoundDetail((v) => !v);
                      }}
                    >
                      <Text style={[styles.toggleDetailText, { color: screenBackground }]}>
                        {showRoundDetail ? 'Masquer le détail' : `Détailler les ${nbRounds} rounds`}
                      </Text>
                      {showRoundDetail ? (
                        <ChevronUp size={16} color={screenBackground} />
                      ) : (
                        <ChevronDown size={16} color={screenBackground} />
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* ════════════════════════════════════════════════
                  📄 PAGER ROUNDS — un round = une page
                  ════════════════════════════════════════════════ */}
              {showRoundDetail && combatRounds.length > 0 && (() => {
                const idx = Math.min(currentRoundIndex, combatRounds.length - 1);
                const current = combatRounds[idx];
                const isFirst = idx === 0;
                const isLast = idx === combatRounds.length - 1;

                // Compter les champs remplis pour ce round (pour le % de complétion)
                const isRoundFilled = (r: CombatRound) => !!(r.result || r.partner || (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0 || (r.methodsGiven?.length ?? 0) > 0 || (r.methodsTaken?.length ?? 0) > 0 || r.notes || r.gamePlan || r.whatWorked);

                const filledCount = combatRounds.filter(isRoundFilled).length;
                const globalPct = combatRounds.length > 0 ? Math.round((filledCount / combatRounds.length) * 100) : 0;
                const winsSoFar = combatRounds.filter(r => r.result === 'win').length;
                const lossesSoFar = combatRounds.filter(r => r.result === 'loss').length;
                const drawsSoFar = combatRounds.filter(r => r.result === 'draw').length;

                return (
                  <View style={{ marginTop: 12 }}>
                    {/* ── Barre de progression globale de la séance ── */}
                    <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border ?? '#2a2a2a', padding: 12, marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted ?? '#888', letterSpacing: 1 }}>
                          PROGRESSION SÉANCE
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: globalPct === 100 ? '#22C55E' : screenBackground }}>
                          {filledCount}/{combatRounds.length} rounds · {globalPct}%
                        </Text>
                      </View>
                      {/* Barre */}
                      <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                        <View style={{ width: `${globalPct}%` as any, height: '100%', backgroundColor: globalPct === 100 ? '#22C55E' : screenBackground, borderRadius: 3 }} />
                      </View>
                      {/* Score cumulé si des résultats */}
                      {(winsSoFar + lossesSoFar + drawsSoFar) > 0 && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {winsSoFar > 0 && (
                            <View style={{ flex: 1, backgroundColor: '#22C55E15', borderRadius: 8, paddingVertical: 5, alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: '#22C55E' }}>{winsSoFar}V</Text>
                            </View>
                          )}
                          {lossesSoFar > 0 && (
                            <View style={{ flex: 1, backgroundColor: '#EF444415', borderRadius: 8, paddingVertical: 5, alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: '#EF4444' }}>{lossesSoFar}D</Text>
                            </View>
                          )}
                          {drawsSoFar > 0 && (
                            <View style={{ flex: 1, backgroundColor: '#F59E0B15', borderRadius: 8, paddingVertical: 5, alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: '#F59E0B' }}>{drawsSoFar}N</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    {/* Navigator pager stylé */}
                    <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border ?? '#2a2a2a', padding: 12, marginBottom: 10 }}>
                      {/* Ligne : Prev · Round X/Y · Next */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <TouchableOpacity
                          disabled={isFirst}
                          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setCurrentRoundIndex(i => Math.max(0, i - 1)); }}
                          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isFirst ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : `${screenBackground}20`, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <ChevronLeft size={20} color={isFirst ? (colors.textMuted ?? '#888') : screenBackground} />
                        </TouchableOpacity>

                        <View style={{ flex: 1, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted ?? '#888', letterSpacing: 1 }}>ROUND</Text>
                          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, marginTop: -2 }}>
                            {idx + 1}<Text style={{ fontSize: 16, color: colors.textMuted ?? '#888' }}> / {combatRounds.length}</Text>
                          </Text>
                        </View>

                        <TouchableOpacity
                          disabled={isLast}
                          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setCurrentRoundIndex(i => Math.min(combatRounds.length - 1, i + 1)); }}
                          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isLast ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)') : `${screenBackground}20`, justifyContent: 'center', alignItems: 'center' }}
                        >
                          <ChevronLeft size={20} color={isLast ? (colors.textMuted ?? '#888') : screenBackground} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                      </View>

                      {/* Dots navigation — un par round, couleur selon état */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                        {combatRounds.map((r, i) => {
                          const active = i === idx;
                          const filled = isRoundFilled(r);
                          const resColor = r.result === 'win' ? '#22C55E' : r.result === 'loss' ? '#EF4444' : r.result === 'draw' ? '#F59E0B' : null;
                          const dotColor = resColor ?? (filled ? screenBackground : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'));
                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setCurrentRoundIndex(i); }}
                              style={{
                                minWidth: 36, height: 30,
                                borderRadius: 8,
                                backgroundColor: active ? dotColor : `${dotColor}30`,
                                borderWidth: active ? 2 : 1,
                                borderColor: active ? dotColor : `${dotColor}60`,
                                justifyContent: 'center', alignItems: 'center',
                                paddingHorizontal: 8,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '900', color: active ? '#fff' : (resColor ?? dotColor) }}>
                                {r.result === 'win' ? 'V' : r.result === 'loss' ? 'D' : r.result === 'draw' ? 'N' : (i + 1)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* Actions rapides */}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                        <TouchableOpacity
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            router.push('/sparring-partners' as any);
                          }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#06B6D415', borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#06B6D430' }}
                        >
                          <Users size={13} color="#06B6D4" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#06B6D4' }}>Mes contacts</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            impactAsync(ImpactFeedbackStyle.Light);
                            setNbRounds(n => Math.min(20, n + 1));
                            setTimeout(() => setCurrentRoundIndex(nbRounds), 50);
                          }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: `${screenBackground}15`, borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: `${screenBackground}30` }}
                        >
                          <Plus size={13} color={screenBackground} />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: screenBackground }}>Ajouter un round</Text>
                        </TouchableOpacity>
                        {combatRounds.length > 1 && (
                          <TouchableOpacity
                            onPress={() => {
                              impactAsync(ImpactFeedbackStyle.Light);
                              const doDelete = () => {
                                impactAsync(ImpactFeedbackStyle.Heavy);
                                const nextRounds = combatRounds.filter((_, i) => i !== idx).map((r, i) => ({ ...r, number: i + 1 }));
                                setCombatRounds(nextRounds);
                                setNbRounds(nextRounds.length);
                                setCurrentRoundIndex(Math.max(0, idx - 1));
                              };
                              // Si round contient des données, demander confirmation
                              const hasData = isRoundFilled(current);
                              if (hasData) {
                                Alert.alert(
                                  `Supprimer le round ${idx + 1} ?`,
                                  'Les données saisies (résultat, points, finitions, notes, analyse) seront perdues.',
                                  [
                                    { text: 'Annuler', style: 'cancel' },
                                    { text: 'Supprimer', style: 'destructive', onPress: doDelete },
                                  ]
                                );
                              } else {
                                doDelete();
                              }
                            }}
                            style={{ width: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF444415', borderRadius: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#EF444430' }}
                          >
                            <X size={14} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Le round courant uniquement */}
                    <RoundCard
                      key={current.number}
                      round={current}
                      index={idx}
                      sportId={selectedSport}
                      accentColor={screenBackground}
                      colors={colors}
                      onUpdate={roundUpdateHandlers[idx]}
                      partnerSuggestions={partnerNames}
                      partnerGoals={partnerGoals}
                      drillSuggestions={drillSuggestions}
                      partnerProfiles={partnerProfiles}
                      previousRound={idx > 0 ? combatRounds[idx - 1] : undefined}
                    />

                    {/* Footer : bouton Round suivant / Terminer */}
                    {!isLast ? (
                      <TouchableOpacity
                        onPress={() => { impactAsync(ImpactFeedbackStyle.Medium); setCurrentRoundIndex(i => i + 1); }}
                        style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: screenBackground, borderRadius: 12, paddingVertical: 14 }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 0.5 }}>
                          Round {idx + 2} →
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22C55E15', borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: '#22C55E' }}>
                        <Flag size={16} color="#22C55E" />
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#22C55E', letterSpacing: 0.5 }}>
                          DERNIER ROUND — continue en bas pour terminer
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}

              {/* Bilan global des rounds */}
              {combatRounds.some(r => r.result || (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0) && (
                <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border ?? '#2a2a2a', padding: 14, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>BILAN</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#22C55E' }}>{combatRounds.filter(r => r.result === 'win').length}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#22C55E' }}>Victoires</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border ?? '#333' }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#EF4444' }}>{combatRounds.filter(r => r.result === 'loss').length}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>Défaites</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border ?? '#333' }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: '900', color: '#F97316' }}>{combatRounds.filter(r => r.result === 'draw').length}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#F97316' }}>Nuls</Text>
                    </View>
                    {combatRounds.some(r => (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0) && (
                      <>
                        <View style={{ width: 1, backgroundColor: colors.border ?? '#333' }} />
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                            {combatRounds.reduce((a, r) => a + (r.pointsFor ?? 0), 0)}
                            <Text style={{ color: colors.textMuted }}> – </Text>
                            {combatRounds.reduce((a, r) => a + (r.pointsAgainst ?? 0), 0)}
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>Points</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
          </>
          )}

          {/* ══ ÉTAPE 4 : Ressenti + Notes ══ */}
          {step === 4 && (
            <>
          {/* ─── SECTION RESSENTI ─── */}
          <View style={styles.section}>
            <SectionLabel label="RESSENTI" accent={screenBackground} />
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border ?? '#2a2a2a' },
              ]}
            >
              {/* RPE */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text }]}>
                INTENSITÉ (RPE {rpe}/10)
              </Text>
              <View style={styles.rpeRow}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => {
                  const isSelected = rpe === val;
                  const rpeColor = getRpeColor(val);
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.rpeCircle,
                        {
                          backgroundColor: isSelected ? rpeColor : 'transparent',
                          borderColor: isSelected ? rpeColor : (colors.border ?? '#444'),
                          width: isSelected ? 34 : 28,
                          height: isSelected ? 34 : 28,
                          borderRadius: isSelected ? 17 : 14,
                        },
                      ]}
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        setRpe(val);
                      }}
                    >
                      <Text
                        style={[
                          styles.rpeCircleText,
                          {
                            color: isSelected ? '#fff' : (colors.textMuted ?? colors.text),
                            fontSize: isSelected ? 14 : 11,
                            fontWeight: isSelected ? '700' : '400',
                          },
                        ]}
                      >
                        {val}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.rpeLabel, { color: getRpeColor(rpe) }]}>
                {RPE_LABELS[rpe] ?? ''}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />

              {/* Fréquence cardiaque MIN / MOY / MAX */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text }]}>
                FRÉQUENCE CARDIAQUE (BPM)
              </Text>
              <View style={styles.heartRateGrid}>
                {/* Min */}
                <View style={styles.heartRateItem}>
                  <Text style={[styles.heartRateItemLabel, { color: '#3B82F6' }]}>MIN</Text>
                  <View
                    style={[
                      styles.heartRateInputWrap,
                      { borderColor: heartRateMin ? '#3B82F6' : (colors.border ?? '#333'), backgroundColor: colors.background },
                    ]}
                  >
                    <Heart size={11} color="#3B82F6" />
                    <TextInput
                      style={[styles.heartRateInput, { color: colors.text }]}
                      value={heartRateMin}
                      onChangeText={setHeartRateMin}
                      placeholder="---"
                      placeholderTextColor={colors.textMuted ?? '#888'}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>

                {/* Moy */}
                <View style={styles.heartRateItem}>
                  <Text style={[styles.heartRateItemLabel, { color: '#F97316' }]}>MOY</Text>
                  <View
                    style={[
                      styles.heartRateInputWrap,
                      { borderColor: heartRateAvg ? '#F97316' : (colors.border ?? '#333'), backgroundColor: colors.background },
                    ]}
                  >
                    <Heart size={11} color="#F97316" />
                    <TextInput
                      style={[styles.heartRateInput, { color: colors.text }]}
                      value={heartRateAvg}
                      onChangeText={setHeartRateAvg}
                      placeholder="---"
                      placeholderTextColor={colors.textMuted ?? '#888'}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>

                {/* Max */}
                <View style={styles.heartRateItem}>
                  <Text style={[styles.heartRateItemLabel, { color: '#EF4444' }]}>MAX</Text>
                  <View
                    style={[
                      styles.heartRateInputWrap,
                      { borderColor: heartRateMax ? '#EF4444' : (colors.border ?? '#333'), backgroundColor: colors.background },
                    ]}
                  >
                    <Heart size={11} color="#EF4444" />
                    <TextInput
                      style={[styles.heartRateInput, { color: colors.text }]}
                      value={heartRateMax}
                      onChangeText={setHeartRateMax}
                      placeholder="---"
                      placeholderTextColor={colors.textMuted ?? '#888'}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />

              {/* Qualité technique (étoiles) */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text }]}>
                QUALITÉ TECHNIQUE
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setTechniqueRating(techniqueRating === star ? 0 : star);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Star
                      size={36}
                      color={star <= techniqueRating ? '#F59E0B' : (colors.border ?? '#444')}
                      fill={star <= techniqueRating ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ─── SECTION NOTES ─── */}
          <View style={styles.section}>
            <SectionLabel label="NOTES" accent={screenBackground} />
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border ?? '#2a2a2a',
                  padding: 0,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.notesInput,
                  { color: colors.text, backgroundColor: colors.card, borderRadius: 16 },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Bilan de la séance, points à améliorer..."
                placeholderTextColor={colors.textMuted ?? '#888'}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ─── BOUTON ENREGISTRER ─── */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: screenBackground, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {params.editId ? 'METTRE À JOUR' : 'ENREGISTRER LA SÉANCE'}
              </Text>
            )}
          </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
      <PopupComponent />

    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
  },
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    minWidth: 90,
    alignItems: 'center',
  },
  headerSaveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 0,
  },

  // Sections
  section: { marginBottom: 24 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionLabelAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },

  // Sport chips
  sportScrollContent: { gap: 8, paddingRight: 8 },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  sportChipText: { fontSize: 13, fontWeight: '600' },

  // Session types
  sessionTypeRow: { flexDirection: 'row', gap: 10 },
  sessionTypeCard: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 3,
  },
  sessionTypeLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  sessionTypeSublabel: { fontSize: 9, textAlign: 'center', lineHeight: 12 },

  // Date/time
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  dateTimeBtnText: { fontSize: 14, fontWeight: '500' },

  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },

  // Field labels
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Duration
  durationRow: { flexDirection: 'row', alignItems: 'center' },
  durationItem: { flex: 1, alignItems: 'center', gap: 8 },
  durationLabel: { fontSize: 12, fontWeight: '500' },
  durationSep: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 8,
  },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 68,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stepperValueText: { fontSize: 15, fontWeight: '700' },

  // Clubs — nouvelles cartes avec logo
  clubCardBig: {
    width: 80,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 6,
    position: 'relative',
  },
  clubCardBigIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubCardBigLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  clubCardBigName: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: 70,
  },
  clubCardBigCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Clubs
  clubScrollContent: { gap: 8, paddingRight: 8, marginBottom: 2 },
  clubChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubChipText: { fontSize: 13, fontWeight: '600' },

  // Location
  locationRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  locationInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  locationTextInput: { flex: 1, fontSize: 13, padding: 0 },
  locationActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Theme
  themeInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  chipsScroll: { marginTop: 4 },
  chipsScrollContent: { gap: 8, paddingRight: 8 },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  suggestionChipText: { fontSize: 12, fontWeight: '600' },

  // Rounds
  roundsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundsRowLabel: { fontSize: 14, fontWeight: '500' },
  toggleDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  toggleDetailText: { fontSize: 14, fontWeight: '600' },

  // Round card
  roundCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
  },
  roundCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  roundTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  resultBtnsRow: { flex: 1, flexDirection: 'row', gap: 6 },
  resultPill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultPillLetter: { fontSize: 20, fontWeight: '900' },
  roundPartnerInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 10,
  },
  roundSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 2,
  },
  roundSubBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  roundSubBtnText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  roundSubBtnPlaceholder: { fontSize: 12 },
  roundNotesInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 56,
    marginTop: 4,
  },

  // RPE
  rpeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rpeCircle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  rpeCircleText: {},
  rpeLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 4 },

  // Heart rate
  heartRateGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  heartRateItem: { flex: 1, alignItems: 'center', gap: 6 },
  heartRateItemLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heartRateInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  heartRateInput: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    padding: 0,
  },

  // Stars
  starsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },

  // Notes
  notesInput: {
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Save button
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    minHeight: 56,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },

  // Modal soumissions
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  selectedTagsRow: { gap: 6, paddingRight: 8 },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  selectedTagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  subItemText: { fontSize: 14, fontWeight: '500', flex: 1 },
  subItemCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Club label row
  clubLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addClubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  addClubBtnText: { fontSize: 11, fontWeight: '700' },
  clubColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Create club modal
  clubNameInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    minHeight: 50,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  clubPreviewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  clubPreviewText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
