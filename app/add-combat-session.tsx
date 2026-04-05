// ============================================
// YOROI - AJOUT / ÉDITION SÉANCE SPORT DE COMBAT
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { safeOpenURL } from '@/lib/security/validators';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  addTraining,
  updateTraining,
  getTrainingById,
  getClubs,
  addClub,
  Club,
  CombatRound,
} from '@/lib/database';
import { SPORTS, getSportName } from '@/lib/sports';

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
  // ─── ÉTRANGLEMENTS DORSAUX ───
  'RNC (Rear Naked Choke)',
  'Bow and Arrow choke',
  'Body triangle + RNC',
  'Rear triangle',
  'Mata leão',
  // ─── ÉTRANGLEMENTS DE GARDE ───
  'Triangle (ashi-sankaku)',
  'Triangle dos',
  'Mounted triangle',
  'Guillotine frontale',
  'Guillotine arm-in',
  'Guillotine high-elbow (Marcelotine)',
  'Arm-in guillotine (hip bump)',
  // ─── ÉTRANGLEMENTS AU SOL ───
  "D'Arce choke (no-gi brabo)",
  'Anaconda choke',
  'Brabo choke (gi)',
  'Loop choke',
  'Baseball bat choke',
  'Paper cutter choke',
  'Ezekiel choke (sode guruma)',
  'Crucifix choke',
  'Clock choke',
  'North-south choke',
  'Arm triangle (kata gatame)',
  'Von flue choke',
  'Carotid squeeze',
  'Cobra choke',
  // ─── ÉTRANGLEMENTS ORIGINAUX ───
  'Gogoplata',
  'Buggy choke',
  'Peruvian necktie',
  'Twister choke',
  'Lapel choke (worm guard)',
  'Squirrel choke',
  'Gator roll choke',
  'Darce-triangle (daratine)',
  // ─── LOCKS BRAS ───
  'Armbar (juji-gatame)',
  'Armbar depuis garde fermée',
  'Armbar depuis triangle',
  'Armbar depuis le dos',
  'Armbar depuis mount',
  'Kimura',
  'Kimura trap',
  'Américaine (Americana)',
  'Omoplata',
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
  'Heel hook intérieur (inside heel hook)',
  'Heel hook extérieur (outside heel hook)',
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

// ============================================
// THÈMES TECHNIQUES PAR CATÉGORIE
// ============================================

const THEMES_GRAPPLING = [
  // Gardes debout / takedowns
  'Single leg', 'Double leg', 'Fauchage ext.', 'Fauchage int.', 'Hanche', 'Épaule', 'Sacrifice', 'Corps à corps',
  // Gardes au sol
  'Garde fermée', 'Demi-garde', 'Papillon', 'Spider guard', 'De la Riva',
  'Reverse De la Riva', 'X-guard', 'Single leg X', '50/50', 'Lasso guard',
  'Worm guard', 'Rubber guard', 'Garde Z', 'Leg entanglement',
  // Passage de garde
  'Toreando', 'Knee slice', 'Leg weave', 'Smash pass', 'Stack pass',
  'Headquarters (HQ)', 'Over-under', 'Long step', 'Cartwheel pass',
  // Positions dominantes
  'Side control', 'Genou poitrine', 'Mount', 'Contrôle dos', 'Nord-sud',
  'Tortue (turtle)', 'Demi-dos', 'Crab ride',
  // Dos
  'Back take', 'Berimbolo', 'Dos depuis tortue', 'Body triangle', '50/50 dos',
  // Finitions
  'RNC', 'Triangle', 'Armbar', 'Kimura', 'Guillotine', "D'Arce",
  'Heel hook intérieur', 'Heel hook extérieur', 'Toe hold', 'Kneebar', 'Ankle lock', 'Omoplata',
];

const THEMES_STRIKING = [
  'Jab-cross',
  'Uppercut',
  'Crochet',
  'Combinaisons',
  'Clinch',
  'Low kick',
];

function getSuggestionsForSport(sportId: string): string[] {
  const sport = COMBAT_SPORTS.find((s) => s.id === sportId);
  if (!sport) return THEMES_STRIKING;
  return sport.category === 'combat_grappling' ? THEMES_GRAPPLING : THEMES_STRIKING;
}

// ============================================
// TYPES DE SÉANCE
// ============================================

const SESSION_TYPES = [
  {
    id: 'training' as const,
    label: 'Technique',
    sublabel: 'Drills, kata',
    icon: BookOpen,
    color: '#3B82F6',
  },
  {
    id: 'sparring' as const,
    label: 'Sparring',
    sublabel: 'Rolling, combat libre',
    icon: Swords,
    color: '#F97316',
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

type SessionTypeId = 'training' | 'sparring' | 'competition';

// ============================================
// COULEURS CLUB
// ============================================

const CLUB_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
  '#64748B', '#1E293B', '#FFFFFF',
];

// ============================================
// MODAL CRÉATION CLUB
// ============================================

function CreateClubModal({
  visible,
  onClose,
  onCreated,
  defaultSport,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (club: Club) => void;
  defaultSport: string;
}) {
  const { colors, screenBackground } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(screenBackground);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const newId = await addClub({
        name: name.trim(),
        sport: defaultSport,
        color: selectedColor,
        sessions_per_week: 3,
      });
      onCreated({ id: newId, name: name.trim(), sport: defaultSport, color: selectedColor });
      setName('');
      setSelectedColor(screenBackground);
      onClose();
    } catch (_e) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau club / salle</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Nom */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text, marginBottom: 8 }]}>
              NOM DU CLUB / DE LA SALLE
            </Text>
            <TextInput
              style={[
                styles.clubNameInput,
                { color: colors.text, borderColor: colors.border ?? '#333', backgroundColor: colors.card },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="ex: Team Renzo Gracie, Fight Club Lyon..."
              placeholderTextColor={colors.textMuted ?? '#888'}
              autoFocus
              returnKeyType="done"
            />

            {/* Couleur */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text, marginTop: 16, marginBottom: 10 }]}>
              COULEUR
            </Text>
            <View style={styles.colorGrid}>
              {CLUB_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 1, borderColor: selectedColor === c ? colors.text : 'rgba(128,128,128,0.3)' },
                  ]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setSelectedColor(c);
                  }}
                >
                  {selectedColor === c && <Check size={14} color={c === '#FFFFFF' ? '#000' : '#fff'} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Aperçu */}
            <View style={[styles.clubPreview, { backgroundColor: selectedColor + '22', borderColor: selectedColor }]}>
              <View style={[styles.clubPreviewDot, { backgroundColor: selectedColor }]} />
              <Text style={[styles.clubPreviewText, { color: selectedColor || colors.text }]}>
                {name.trim() || 'Nom du club'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                { backgroundColor: name.trim() ? screenBackground : (colors.card), marginTop: 16 },
              ]}
              onPress={handleCreate}
              disabled={!name.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.modalConfirmBtnText, { color: name.trim() ? '#fff' : (colors.textMuted ?? '#888') }]}>
                  Créer le club
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

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

  const filtered = search.trim()
    ? submissions.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : submissions;

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
              renderItem={({ item }) => {
                const isSelected = selected.includes(item);
                return (
                  <TouchableOpacity
                    style={[
                      styles.subItem,
                      {
                        borderColor: isSelected ? screenBackground : (colors.border ?? '#2a2a2a'),
                        backgroundColor: isSelected ? screenBackground + '20' : colors.card,
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      onToggle(item);
                    }}
                  >
                    <Text
                      style={[
                        styles.subItemText,
                        { color: isSelected ? screenBackground : colors.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={[styles.subItemCheck, { backgroundColor: screenBackground }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
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

// ============================================
// ROUND CARD
// ============================================

function RoundCard({
  round,
  index,
  sportId,
  accentColor,
  colors,
  onUpdate,
}: {
  round: CombatRound;
  index: number;
  sportId: string;
  accentColor: string;
  colors: any;
  onUpdate: (updates: Partial<CombatRound>) => void;
}) {
  // Actions de score rapide BJJ/Grappling (points prédéfinis par action)
  const sport = COMBAT_SPORTS.find(s => s.id === sportId);
  const isGrappling = sport?.category === 'combat_grappling';

  // Techniques standard par règlement BJJ/Grappling — organisées par groupe
  const BJJ_SCORE_ACTIONS = isGrappling ? [
    // ─── DEBOUT (2 pts chacune) ───
    { label: 'Single leg', pts: 2, group: 'Debout' },
    { label: 'Double leg', pts: 2, group: 'Debout' },
    { label: 'Corps à corps', pts: 2, group: 'Debout' },
    { label: 'Fauchage', pts: 2, group: 'Debout' },
    { label: 'Hanche', pts: 2, group: 'Debout' },
    { label: 'Épaule', pts: 2, group: 'Debout' },
    { label: 'Sacrifice', pts: 2, group: 'Debout' },
    { label: 'Renversement', pts: 2, group: 'Debout' },
    // ─── AU SOL ───
    { label: 'Sweep', pts: 2, group: 'Sol' },
    { label: 'Berimbolo', pts: 2, group: 'Sol' },
    { label: 'Retournement', pts: 2, group: 'Sol' },
    { label: 'Genou poitrine', pts: 2, group: 'Sol' },
    { label: 'Passage garde', pts: 3, group: 'Sol' },
    { label: 'Leg drag', pts: 3, group: 'Sol' },
    { label: 'Headquarters', pts: 3, group: 'Sol' },
    { label: 'Mount', pts: 4, group: 'Sol' },
    { label: 'Contrôle dos', pts: 4, group: 'Sol' },
    { label: 'Demi-dos', pts: 4, group: 'Sol' },
    // ─── AVANTAGES / BONUS ───
    { label: 'Avantage', pts: 1, group: 'Bonus' },
    { label: 'Pénalité adv.', pts: 1, group: 'Bonus' },
    { label: 'Near sub.', pts: 1, group: 'Bonus' },
    { label: 'Expo. dos', pts: 1, group: 'Bonus' },
  ] : [];

  // État pour technique personnalisée
  const [customLabel, setCustomLabel] = useState('');
  const [customPts, setCustomPts] = useState('2');

  const RESULTS: { value: 'win' | 'loss' | 'draw'; label: string; color: string }[] = [
    { value: 'win', label: 'Victoire', color: '#22C55E' },
    { value: 'loss', label: 'Défaite', color: '#EF4444' },
    { value: 'draw', label: 'Nul', color: '#F97316' },
  ];

  const submissions = getSubmissionsForSport(sportId);
  const [showSubsGivenModal, setShowSubsGivenModal] = useState(false);
  const [showSubsTakenModal, setShowSubsTakenModal] = useState(false);

  const methodsGiven = round.methodsGiven ?? [];
  const methodsTaken = round.methodsTaken ?? [];

  const resultColor =
    round.result === 'win'
      ? '#22C55E'
      : round.result === 'loss'
      ? '#EF4444'
      : round.result === 'draw'
      ? '#F97316'
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
        <View style={[styles.roundBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.roundBadgeText}>R{round.number}</Text>
        </View>

        {/* Résultat inline */}
        <View style={styles.resultBtnsRow}>
          {RESULTS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.resultPill,
                {
                  backgroundColor: round.result === r.value ? r.color : 'transparent',
                  borderColor: round.result === r.value ? r.color : (colors.border ?? '#444'),
                },
              ]}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                onUpdate({ result: round.result === r.value ? undefined : r.value });
              }}
            >
              <Text
                style={[
                  styles.resultPillText,
                  { color: round.result === r.value ? '#fff' : (colors.textMuted ?? colors.text) },
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Partenaire */}
      <TextInput
        style={[
          styles.roundPartnerInput,
          {
            color: colors.text,
            borderColor: colors.border ?? '#333',
            backgroundColor: colors.background,
          },
        ]}
        value={round.partner ?? ''}
        onChangeText={(v) => onUpdate({ partner: v })}
        placeholder="Adversaire / Partenaire..."
        placeholderTextColor={colors.textMuted ?? '#888'}
        returnKeyType="done"
      />

      {/* Finitions / Soumissions données */}
      <Text style={[styles.roundSubLabel, { color: colors.textMuted ?? colors.text }]}>
        Finitions données
      </Text>
      <TouchableOpacity
        style={[
          styles.roundSubBtn,
          { borderColor: methodsGiven.length > 0 ? accentColor : (colors.border ?? '#444'), backgroundColor: colors.background },
        ]}
        onPress={() => setShowSubsGivenModal(true)}
      >
        {methodsGiven.length > 0 ? (
          <Text style={[styles.roundSubBtnText, { color: accentColor }]} numberOfLines={2}>
            {methodsGiven.join(' · ')}
          </Text>
        ) : (
          <Text style={[styles.roundSubBtnPlaceholder, { color: colors.textMuted ?? '#888' }]}>
            + Ajouter une finition...
          </Text>
        )}
      </TouchableOpacity>

      {/* Finitions / Soumissions reçues */}
      <Text style={[styles.roundSubLabel, { color: colors.textMuted ?? colors.text }]}>
        Finitions reçues
      </Text>
      <TouchableOpacity
        style={[
          styles.roundSubBtn,
          { borderColor: methodsTaken.length > 0 ? '#EF4444' : (colors.border ?? '#444'), backgroundColor: colors.background },
        ]}
        onPress={() => setShowSubsTakenModal(true)}
      >
        {methodsTaken.length > 0 ? (
          <Text style={[styles.roundSubBtnText, { color: '#EF4444' }]} numberOfLines={2}>
            {methodsTaken.join(' · ')}
          </Text>
        ) : (
          <Text style={[styles.roundSubBtnPlaceholder, { color: colors.textMuted ?? '#888' }]}>
            + Ajouter une finition...
          </Text>
        )}
      </TouchableOpacity>

      {/* Score rapide BJJ */}
      {BJJ_SCORE_ACTIONS.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted ?? '#888', marginBottom: 8, letterSpacing: 0.5 }}>
            SCORE RAPIDE
          </Text>

          {/* Groupes de techniques */}
          {(['Debout', 'Sol', 'Bonus'] as const).map(group => {
            const actions = BJJ_SCORE_ACTIONS.filter(a => a.group === group);
            const groupColors: Record<string, string> = {
              Debout: '#3B82F6',
              Sol: '#22C55E',
              Bonus: '#F59E0B',
            };
            const groupLabels: Record<string, string> = {
              Debout: 'DEBOUT (TAKEDOWNS / PROJECTIONS)',
              Sol: 'AU SOL (PASSAGES / POSITIONS)',
              Bonus: 'AVANTAGES / BONUS',
            };
            const color = groupColors[group];
            return (
              <View key={group} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: color, marginBottom: 4, letterSpacing: 0.5 }}>
                  {groupLabels[group]}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {actions.map(action => (
                    <TouchableOpacity
                      key={action.label}
                      onPress={() => {
                        onUpdate({ pointsFor: (round.pointsFor ?? 0) + action.pts });
                        impactAsync(ImpactFeedbackStyle.Light);
                      }}
                      onLongPress={() => {
                        onUpdate({ pointsAgainst: (round.pointsAgainst ?? 0) + action.pts });
                        impactAsync(ImpactFeedbackStyle.Medium);
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
                        backgroundColor: `${color}12`, borderWidth: 1, borderColor: `${color}35`,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{action.label}</Text>
                      <View style={{ backgroundColor: color, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>+{action.pts}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
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
                  if (!customLabel.trim() || !parseInt(customPts)) return;
                  onUpdate({ pointsFor: (round.pointsFor ?? 0) + parseInt(customPts) });
                  impactAsync(ImpactFeedbackStyle.Light);
                  setCustomLabel('');
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
                  +{customPts} pts pour moi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!customLabel.trim() || !parseInt(customPts)) return;
                  onUpdate({ pointsAgainst: (round.pointsAgainst ?? 0) + parseInt(customPts) });
                  impactAsync(ImpactFeedbackStyle.Medium);
                  setCustomLabel('');
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
    </View>
  );
}

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
  const { showPopup, PopupComponent } = useCustomPopup();

  // --- State ---
  const [selectedSport, setSelectedSport] = useState(params.sport || 'jjb');
  const [sessionType, setSessionType] = useState<SessionTypeId>('sparring');
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

  // Séance combat
  const [technicalTheme, setTechnicalTheme] = useState('');
  const [nbRounds, setNbRounds] = useState(0);
  const [roundDuration, setRoundDuration] = useState(5);
  const [showRoundDetail, setShowRoundDetail] = useState(false);
  const [combatRounds, setCombatRounds] = useState<CombatRound[]>([]);

  // Ressenti
  const [rpe, setRpe] = useState(6);
  const [heartRateMin, setHeartRateMin] = useState('');
  const [heartRateAvg, setHeartRateAvg] = useState('');
  const [heartRateMax, setHeartRateMax] = useState('');
  const [techniqueRating, setTechniqueRating] = useState(0);

  // Notes
  const [notes, setNotes] = useState('');

  // UI
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [saving, setSaving] = useState(false);

  // ============================================
  // EFFETS
  // ============================================

  useEffect(() => {
    getClubs().then(setClubs);
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
      if (training.technical_theme) setTechnicalTheme(training.technical_theme);
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
  }, [nbRounds]);

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

  const updateRound = (index: number, updates: Partial<CombatRound>) => {
    setCombatRounds((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

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

      if (params.editId) {
        await updateTraining(parseInt(params.editId), trainingData);
      } else {
        await addTraining(trainingData);
      }

      await notificationAsync(NotificationFeedbackType.Success);

      // Mettre à jour le widget streak (en arrière-plan)
      import('@/lib/widgetData').then(async ({ updateWidgetStreak }) => {
        try {
          const { calculateStreak } = await import('@/lib/database');
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const streak = await calculateStreak();
          const rankStr = await AsyncStorage.getItem('@yoroi_rank');
          await updateWidgetStreak(streak, rankStr ?? 'Recrue');
        } catch { /* non bloquant */ }
      }).catch(() => {});

      router.back();
    } catch (e) {
      console.error(e);
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

  const showRoundsSection = sessionType === 'sparring' || sessionType === 'competition';
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
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {currentSport && (
            <MaterialCommunityIcons
              name={currentSport.icon as any}
              size={16}
              color="rgba(255,255,255,0.8)"
            />
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {sportDisplayName}
          </Text>
        </View>

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
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── SPORT SELECTOR ─── */}
          <View style={styles.section}>
            <SectionLabel label="SPORT" accent={screenBackground} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sportScrollContent}
            >
              {COMBAT_SPORTS.map((sport) => {
                const isSelected = selectedSport === sport.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportChip,
                      {
                        backgroundColor: isSelected
                          ? screenBackground
                          : (colors.card),
                        borderColor: isSelected
                          ? screenBackground
                          : (colors.border ?? '#333'),
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setSelectedSport(sport.id);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={sport.icon as any}
                      size={16}
                      color={isSelected ? '#fff' : (colors.textMuted ?? colors.text)}
                    />
                    <Text
                      style={[
                        styles.sportChipText,
                        { color: isSelected ? '#fff' : (colors.textMuted ?? colors.text) },
                      ]}
                    >
                      {sport.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ─── SECTION TYPE DE SÉANCE ─── */}
          <View style={styles.section}>
            <SectionLabel label="TYPE DE SÉANCE" accent={screenBackground} />
            <View style={styles.sessionTypeRow}>
              {SESSION_TYPES.map((type) => {
                const isSelected = sessionType === type.id;
                const IconComp = type.icon;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.sessionTypeCard,
                      {
                        backgroundColor: isSelected
                          ? type.color
                          : (colors.card),
                        borderColor: isSelected ? type.color : (colors.border ?? '#333'),
                      },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      setSessionType(type.id);
                    }}
                  >
                    <IconComp size={22} color={isSelected ? '#fff' : type.color} />
                    <Text style={[styles.sessionTypeLabel, { color: isSelected ? '#fff' : colors.text }]}>
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
            </View>
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

              {/* Club */}
              <View style={styles.clubLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted ?? colors.text, marginBottom: 0 }]}>
                  CLUB / SALLE
                </Text>
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
                <TouchableOpacity
                  style={[
                    styles.clubChip,
                    {
                      backgroundColor: selectedClubId === null ? screenBackground : colors.background,
                      borderColor: selectedClubId === null ? screenBackground : (colors.border ?? '#444'),
                    },
                  ]}
                  onPress={() => setSelectedClubId(null)}
                >
                  <Text
                    style={[styles.clubChipText, { color: selectedClubId === null ? '#fff' : colors.text }]}
                  >
                    Libre
                  </Text>
                </TouchableOpacity>

                {clubs.map((club) => (
                  <TouchableOpacity
                    key={club.id}
                    style={[
                      styles.clubChip,
                      {
                        backgroundColor:
                          selectedClubId === club.id
                            ? (club.color ?? screenBackground)
                            : colors.background,
                        borderColor:
                          selectedClubId === club.id
                            ? (club.color ?? screenBackground)
                            : (colors.border ?? '#444'),
                      },
                    ]}
                    onPress={() => setSelectedClubId(club.id ?? null)}
                  >
                    {club.color && (
                      <View style={[styles.clubColorDot, { backgroundColor: club.color }]} />
                    )}
                    <Text
                      style={[styles.clubChipText, { color: selectedClubId === club.id ? '#fff' : colors.text }]}
                    >
                      {club.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Modal création club */}
              <CreateClubModal
                visible={showCreateClub}
                onClose={() => setShowCreateClub(false)}
                defaultSport={selectedSport}
                onCreated={(newClub) => {
                  setClubs((prev) => [...prev, newClub]);
                  setSelectedClubId(newClub.id ?? null);
                }}
              />

              <View style={[styles.divider, { backgroundColor: colors.border ?? '#2a2a2a' }]} />

              {/* Lieu */}
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
                    onChangeText={setLocationName}
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
            </View>
          </View>

          {/* ─── SECTION THÈME TECHNIQUE ─── */}
          <View style={styles.section}>
            <SectionLabel label="THÈME TECHNIQUE" accent={screenBackground} />
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border ?? '#2a2a2a' },
              ]}
            >
              <TextInput
                style={[
                  styles.themeInput,
                  {
                    color: colors.text,
                    borderColor: colors.border ?? '#333',
                    backgroundColor: colors.background,
                  },
                ]}
                value={technicalTheme}
                onChangeText={setTechnicalTheme}
                placeholder="ex: Triangle choke, Passage de garde, Direct-croisé..."
                placeholderTextColor={colors.textMuted ?? '#888'}
                multiline
                numberOfLines={3}
                returnKeyType="done"
                blurOnSubmit
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
                style={styles.chipsScroll}
              >
                {suggestions.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.suggestionChip,
                      { backgroundColor: colors.background, borderColor: screenBackground + '88' },
                    ]}
                    onPress={() => {
                      impactAsync(ImpactFeedbackStyle.Light);
                      setTechnicalTheme((prev) =>
                        prev.trim() ? `${prev.trim()}, ${chip}` : chip
                      );
                    }}
                  >
                    <Text style={[styles.suggestionChipText, { color: screenBackground }]}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

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

              {showRoundDetail &&
                combatRounds.map((round, index) => (
                  <RoundCard
                    key={index}
                    round={round}
                    index={index}
                    sportId={selectedSport}
                    accentColor={screenBackground}
                    colors={colors}
                    onUpdate={(updates) => updateRound(index, updates)}
                  />
                ))}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 96,
  },
  sessionTypeLabel: { fontSize: 13, fontWeight: '700' },
  sessionTypeSublabel: { fontSize: 10, textAlign: 'center', lineHeight: 13 },

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
  roundBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  resultBtnsRow: { flex: 1, flexDirection: 'row', gap: 6 },
  resultPill: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultPillText: { fontSize: 11, fontWeight: '700' },
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
