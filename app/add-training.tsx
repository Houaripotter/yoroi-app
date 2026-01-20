import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  Share,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Activity,
  Trophy,
  Dumbbell,
  Timer,
  Heart,
  Share2,
  Cloud,
  Star,
  Plus,
  Lightbulb,
  X,
  Edit3,
  Building2,
  Sun,
  Home,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { useBadges } from '@/lib/BadgeContext';
import { addTraining, getClubs, Club, Exercise, getProfile, getTrainings } from '@/lib/database';
import { SPORTS, MUSCLES, getSportIcon, getSportName, getClubLogoSource } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings } from '@/lib/storage';
import * as WebBrowser from 'expo-web-browser';
import { SessionCard } from '@/components/social-cards/SessionCard';

// Constants for non-theme values
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
const RADIUS = { sm: 8, md: 12 };
const SPACING = { sm: 8, md: 12, lg: IS_SMALL_SCREEN ? 12 : 16, xl: IS_SMALL_SCREEN ? 16 : 20 }; // Adaptive spacing
const FONT_SIZE = { xs: 12, sm: 13, md: 14, lg: 16, xl: 18, xxl: 20, display: 28 };
import { successHaptic, errorHaptic, lightHaptic } from '@/lib/haptics';
import { backupReminderService } from '@/lib/backupReminderService';
import { playWorkoutCompleteSound } from '@/lib/soundManager';
import { incrementReviewTrigger, shouldAskForReview } from '@/lib/reviewService';
import { useReviewModal } from '@/components/ReviewModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import logger from '@/lib/security/logger';
import HealthConnect from '@/lib/healthConnect.ios';
import { SharePromptModal } from '@/components/SharePromptModal';

// ============================================
// NOUVEL ENTRAINEMENT - VERSION SIMPLIFIEE
// ============================================

const LAST_SPORT_KEY = 'yoroi_last_sport';
const LAST_DURATION_KEY = 'yoroi_last_duration';

// ============================================
// SOUS-OPTIONS PAR SPORT
// ============================================
type SportOption = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
};

const SPORT_OPTIONS: Record<string, SportOption[]> = {
  // ═══════════════════════════════════════════
  // COMBAT - GRAPPLING (10+ options chacun)
  // ═══════════════════════════════════════════
  jjb: [
    { id: 'drill', label: 'Drill', icon: 'refresh', color: '#3B82F6' },
    { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: '#EF4444' },
    { id: 'technique', label: 'Technique', icon: 'school', color: '#8B5CF6' },
    { id: 'positional', label: 'Positionnement', icon: 'target', color: '#F59E0B' },
    { id: 'guard', label: 'Travail de garde', icon: 'shield', color: '#06B6D4' },
    { id: 'sweeps', label: 'Sweeps', icon: 'rotate-left', color: '#10B981' },
    { id: 'submissions', label: 'Soumissions', icon: 'hand-back-left', color: '#EC4899' },
    { id: 'passes', label: 'Passages de garde', icon: 'arrow-right-bold', color: '#84CC16' },
    { id: 'takedowns', label: 'Takedowns', icon: 'arrow-down-bold', color: '#F97316' },
    { id: 'escapes', label: 'Escapes', icon: 'exit-run', color: '#14B8A6' },
    { id: 'competition', label: 'Competition', icon: 'trophy', color: '#EAB308' },
    { id: 'nogi', label: 'No-Gi', icon: 'tshirt-crew', color: '#6366F1' },
  ],
  judo: [
    { id: 'randori', label: 'Randori', icon: 'sword-cross', color: '#EF4444' },
    { id: 'uchikomi', label: 'Uchi-komi', icon: 'refresh', color: '#3B82F6' },
    { id: 'nagekomi', label: 'Nage-komi', icon: 'arrow-down-bold', color: '#8B5CF6' },
    { id: 'newaza', label: 'Ne-waza', icon: 'floor-plan', color: '#F59E0B' },
    { id: 'kata', label: 'Kata', icon: 'account-group', color: '#10B981' },
    { id: 'osaekomiwaza', label: 'Immobilisations', icon: 'lock', color: '#06B6D4' },
    { id: 'shimewaza', label: 'Etranglements', icon: 'hand-back-left', color: '#EC4899' },
    { id: 'kansetsuwaza', label: 'Cles de bras', icon: 'arm-flex', color: '#84CC16' },
    { id: 'ashiwaza', label: 'Techniques jambes', icon: 'shoe-sneaker', color: '#F97316' },
    { id: 'tewaza', label: 'Techniques bras', icon: 'hand-front-right', color: '#14B8A6' },
    { id: 'koshiwaza', label: 'Techniques hanches', icon: 'human', color: '#EAB308' },
  ],
  lutte: [
    { id: 'technique', label: 'Technique', icon: 'school', color: '#8B5CF6' },
    { id: 'sparring', label: 'Combat', icon: 'sword-cross', color: '#EF4444' },
    { id: 'takedowns', label: 'Takedowns', icon: 'arrow-down-bold', color: '#3B82F6' },
    { id: 'groundwork', label: 'Travail au sol', icon: 'floor-plan', color: '#F59E0B' },
    { id: 'clinch', label: 'Clinch', icon: 'account-multiple', color: '#10B981' },
    { id: 'conditioning', label: 'Conditioning', icon: 'lightning-bolt', color: '#06B6D4' },
    { id: 'sprawl', label: 'Sprawl', icon: 'arrow-expand-down', color: '#EC4899' },
    { id: 'singleleg', label: 'Single Leg', icon: 'human-male', color: '#84CC16' },
    { id: 'doubleleg', label: 'Double Leg', icon: 'run', color: '#F97316' },
    { id: 'greco', label: 'Greco-romaine', icon: 'arm-flex', color: '#14B8A6' },
  ],
  grappling: [
    { id: 'drill', label: 'Drill', icon: 'refresh', color: '#3B82F6' },
    { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: '#EF4444' },
    { id: 'submissions', label: 'Soumissions', icon: 'hand-back-left', color: '#8B5CF6' },
    { id: 'leglocks', label: 'Leg Locks', icon: 'shoe-sneaker', color: '#F59E0B' },
    { id: 'heelhook', label: 'Heel Hook', icon: 'hook', color: '#10B981' },
    { id: 'guillotine', label: 'Guillotine', icon: 'knife', color: '#06B6D4' },
    { id: 'darce', label: 'Darce/Anaconda', icon: 'snake', color: '#EC4899' },
    { id: 'backtakes', label: 'Back Takes', icon: 'arrow-right-bold', color: '#84CC16' },
    { id: 'wrestling', label: 'Wrestling', icon: 'kabaddi', color: '#F97316' },
    { id: 'transitions', label: 'Transitions', icon: 'swap-horizontal', color: '#14B8A6' },
  ],

  // ═══════════════════════════════════════════
  // COMBAT - STRIKING (10+ options chacun)
  // ═══════════════════════════════════════════
  mma: [
    { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: '#EF4444' },
    { id: 'striking', label: 'Striking', icon: 'boxing-glove', color: '#F59E0B' },
    { id: 'grappling', label: 'Grappling', icon: 'floor-plan', color: '#3B82F6' },
    { id: 'cage', label: 'Cage Work', icon: 'grid', color: '#8B5CF6' },
    { id: 'clinch', label: 'Clinch', icon: 'account-multiple', color: '#10B981' },
    { id: 'groundpound', label: 'Ground & Pound', icon: 'hand-back-left', color: '#06B6D4' },
    { id: 'takedowns', label: 'Takedowns', icon: 'arrow-down-bold', color: '#EC4899' },
    { id: 'submissions', label: 'Soumissions', icon: 'lock', color: '#84CC16' },
    { id: 'conditioning', label: 'Conditioning', icon: 'lightning-bolt', color: '#F97316' },
    { id: 'pads', label: 'Paos/Pattes', icon: 'hand-front-right', color: '#14B8A6' },
    { id: 'bag', label: 'Sac de frappe', icon: 'bag-personal', color: '#EAB308' },
  ],
  boxe: [
    { id: 'shadow', label: 'Shadow Boxing', icon: 'human-handsup', color: '#3B82F6' },
    { id: 'pads', label: 'Pattes d\'ours', icon: 'hand-back-left', color: '#F59E0B' },
    { id: 'bag', label: 'Sac de frappe', icon: 'bag-personal', color: '#8B5CF6' },
    { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: '#EF4444' },
    { id: 'technique', label: 'Technique', icon: 'school', color: '#10B981' },
    { id: 'footwork', label: 'Footwork', icon: 'shoe-sneaker', color: '#06B6D4' },
    { id: 'defense', label: 'Defense', icon: 'shield', color: '#EC4899' },
    { id: 'combos', label: 'Enchainements', icon: 'link', color: '#84CC16' },
    { id: 'conditioning', label: 'Conditioning', icon: 'lightning-bolt', color: '#F97316' },
    { id: 'corderope', label: 'Corde a sauter', icon: 'jump-rope', color: '#14B8A6' },
  ],
  kickboxing: [
    { id: 'shadow', label: 'Shadow', icon: 'human-handsup', color: '#3B82F6' },
    { id: 'pads', label: 'Paos', icon: 'hand-back-left', color: '#F59E0B' },
    { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: '#EF4444' },
    { id: 'lowkick', label: 'Low Kicks', icon: 'shoe-sneaker', color: '#8B5CF6' },
    { id: 'highkick', label: 'High Kicks', icon: 'karate', color: '#10B981' },
    { id: 'bag', label: 'Sac de frappe', icon: 'bag-personal', color: '#06B6D4' },
    { id: 'combos', label: 'Enchainements', icon: 'link', color: '#EC4899' },
    { id: 'footwork', label: 'Footwork', icon: 'run', color: '#84CC16' },
    { id: 'conditioning', label: 'Conditioning', icon: 'lightning-bolt', color: '#F97316' },
    { id: 'technique', label: 'Technique', icon: 'school', color: '#14B8A6' },
  ],
  muay_thai: [
    { id: 'clinch', label: 'Clinch', icon: 'account-multiple', color: '#3B82F6' },
    { id: 'pads', label: 'Paos Thai', icon: 'hand-back-left', color: '#F59E0B' },
    { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: '#EF4444' },
    { id: 'bag', label: 'Sac', icon: 'bag-personal', color: '#8B5CF6' },
    { id: 'teep', label: 'Teep', icon: 'shoe-sneaker', color: '#10B981' },
    { id: 'elbows', label: 'Coudes', icon: 'arm-flex', color: '#06B6D4' },
    { id: 'knees', label: 'Genoux', icon: 'human-male', color: '#EC4899' },
    { id: 'lowkick', label: 'Low Kicks', icon: 'karate', color: '#84CC16' },
    { id: 'shadow', label: 'Shadow', icon: 'human-handsup', color: '#F97316' },
    { id: 'conditioning', label: 'Conditioning', icon: 'lightning-bolt', color: '#14B8A6' },
  ],

  // ═══════════════════════════════════════════
  // MUSCULATION & FITNESS (10+ options chacun)
  // ═══════════════════════════════════════════
  musculation: [
    { id: 'chest', label: 'Pectoraux', icon: 'arm-flex', color: '#EF4444' },
    { id: 'back', label: 'Dos', icon: 'human', color: '#3B82F6' },
    { id: 'shoulders', label: 'Epaules', icon: 'triangle', color: '#F59E0B' },
    { id: 'biceps', label: 'Biceps', icon: 'arm-flex', color: '#8B5CF6' },
    { id: 'triceps', label: 'Triceps', icon: 'arm-flex-outline', color: '#10B981' },
    { id: 'legs', label: 'Jambes', icon: 'human-male', color: '#06B6D4' },
    { id: 'glutes', label: 'Fessiers', icon: 'seat', color: '#EC4899' },
    { id: 'abs', label: 'Abdominaux', icon: 'view-grid', color: '#84CC16' },
    { id: 'calves', label: 'Mollets', icon: 'shoe-sneaker', color: '#F97316' },
    { id: 'forearms', label: 'Avant-bras', icon: 'hand-front-right', color: '#14B8A6' },
    { id: 'fullbody', label: 'Full Body', icon: 'human', color: '#EAB308' },
    { id: 'push', label: 'Push Day', icon: 'arrow-right-bold', color: '#6366F1' },
    { id: 'pull', label: 'Pull Day', icon: 'arrow-left-bold', color: '#A855F7' },
    { id: 'dumbbells', label: 'Halteres', icon: 'dumbbell', color: '#F43F5E' },
    { id: 'barbell', label: 'Barre libre', icon: 'weight-lifter', color: '#0EA5E9' },
    { id: 'machines', label: 'Machines/Guides', icon: 'cog', color: '#64748B' },
    { id: 'cables', label: 'Poulies', icon: 'reorder-horizontal', color: '#8B5CF6' },
    { id: 'kettlebell', label: 'Kettlebell', icon: 'kettlebell', color: '#F59E0B' },
    { id: 'powerlifting', label: 'Force Athletique', icon: 'weight-lifter', color: '#EF4444' },
    { id: 'bodybuilding', label: 'Esthetique/Volume', icon: 'arm-flex', color: '#EC4899' },
    { id: 'strength', label: 'Force Pure', icon: 'lightning-bolt', color: '#EAB308' },
    { id: 'hypertrophy', label: 'Hypertrophie Focus', icon: 'arm-flex', color: '#F97316' },
    { id: 'endurance_musc', label: 'Endurance Musculaire', icon: 'clock-outline', color: '#10B981' },
    { id: 'explosivity', label: 'Explosivite/Plyo', icon: 'flash', color: '#FACC15' },
    { id: 'cross_training', label: 'Cross-Training', icon: 'refresh', color: '#06B6D4' },
    { id: 'calisthenics', label: 'Poids de corps', icon: 'human-handsup', color: '#8B5CF6' },
    { id: 'corrective', label: 'Muscu Corrective', icon: 'shield-check', color: '#14B8A6' },
    { id: 'postural', label: 'Renfort Postural', icon: 'human', color: '#6366F1' },
    { id: 'tabata_muscu', label: 'Tabata Muscu', icon: 'timer', color: '#EF4444' },
    { id: 'supersets', label: 'Supersets Focus', icon: 'link', color: '#EC4899' },
    { id: 'dropsets', label: 'Dropsets Focus', icon: 'arrow-down-bold', color: '#F43F5E' },
    { id: 'negatives', label: 'Negatives/Excentrique', icon: 'arrow-down', color: '#3B82F6' },
    { id: 'isometry', label: 'Isometrie/Gainage', icon: 'lock', color: '#10B981' },
    { id: 'olympic', label: 'Halterophilie', icon: 'weight-lifter', color: '#EAB308' },
    { id: 'strongman', label: 'Strongman', icon: 'weight', color: '#F97316' },
    { id: 'trx', label: 'Suspension (TRX)', icon: 'vector-line', color: '#0EA5E9' },
    { id: 'bands', label: 'Elastiques', icon: 'reorder-horizontal', color: '#84CC16' },
    { id: 'plyo_box', label: 'Plyo Box', icon: 'cube-outline', color: '#F59E0B' },
    { id: 'combat_specific', label: 'Specifique Combat', icon: 'sword-cross', color: '#EF4444' },
    { id: 'ppg', label: 'Prep. Physique (PPG)', icon: 'shield', color: '#3B82F6' },
    { id: 'circuit_training', label: 'Circuit Training', icon: 'refresh', color: '#10B981' },
    { id: 'mobility', label: 'Mobilite/Etirements', icon: 'human-handsup', color: '#06B6D4' },
  ],
  street_workout: [
    { id: 'pullups', label: 'Tractions', icon: 'arm-flex', color: '#3B82F6' },
    { id: 'dips', label: 'Dips', icon: 'arrow-down-bold', color: '#EF4444' },
    { id: 'pushups', label: 'Pompes', icon: 'arrow-up-bold', color: '#F59E0B' },
    { id: 'muscleup', label: 'Muscle Up', icon: 'arrow-up-bold-box', color: '#8B5CF6' },
    { id: 'fronlever', label: 'Front Lever', icon: 'human-handsdown', color: '#10B981' },
    { id: 'backlever', label: 'Back Lever', icon: 'human-handsup', color: '#06B6D4' },
    { id: 'planche', label: 'Planche', icon: 'human', color: '#EC4899' },
    { id: 'handstand', label: 'Handstand', icon: 'human-handsdown', color: '#84CC16' },
    { id: 'lunges', label: 'Fentes', icon: 'run', color: '#F97316' },
    { id: 'squats', label: 'Squats', icon: 'human-male', color: '#14B8A6' },
    { id: 'abs', label: 'Abdos', icon: 'view-grid', color: '#EAB308' },
    { id: 'freestyle', label: 'Freestyle', icon: 'creation', color: '#6366F1' },
  ],
  crossfit: [
    { id: 'wod', label: 'WOD', icon: 'fire', color: '#EF4444' },
    { id: 'amrap', label: 'AMRAP', icon: 'timer', color: '#F59E0B' },
    { id: 'emom', label: 'EMOM', icon: 'clock-outline', color: '#3B82F6' },
    { id: 'fortime', label: 'For Time', icon: 'timer-outline', color: '#8B5CF6' },
    { id: 'strength', label: 'Force', icon: 'weight-lifter', color: '#10B981' },
    { id: 'oly', label: 'Halterophilie', icon: 'dumbbell', color: '#06B6D4' },
    { id: 'gymnastics', label: 'Gymnastique', icon: 'human-handsup', color: '#EC4899' },
    { id: 'rowing', label: 'Rameur', icon: 'rowing', color: '#84CC16' },
    { id: 'burpees', label: 'Burpees', icon: 'run-fast', color: '#F97316' },
    { id: 'boxjumps', label: 'Box Jumps', icon: 'cube-outline', color: '#14B8A6' },
    { id: 'skill', label: 'Skill Work', icon: 'school', color: '#EAB308' },
  ],
  hiit: [
    { id: 'tabata', label: 'Tabata', icon: 'timer', color: '#EF4444' },
    { id: 'circuit', label: 'Circuit', icon: 'refresh-circle', color: '#F59E0B' },
    { id: 'intervals', label: 'Intervalles', icon: 'chart-line', color: '#3B82F6' },
    { id: 'amrap', label: 'AMRAP', icon: 'clock-fast', color: '#8B5CF6' },
    { id: 'emom', label: 'EMOM', icon: 'clock-outline', color: '#10B981' },
    { id: 'burpees', label: 'Burpees', icon: 'run-fast', color: '#06B6D4' },
    { id: 'squats', label: 'Squats', icon: 'human-male', color: '#EC4899' },
    { id: 'lunges', label: 'Fentes', icon: 'run', color: '#84CC16' },
    { id: 'plank', label: 'Planche', icon: 'human', color: '#F97316' },
    { id: 'jumps', label: 'Sauts', icon: 'arrow-up-bold', color: '#14B8A6' },
  ],
  yoga: [
    { id: 'vinyasa', label: 'Vinyasa', icon: 'yoga', color: '#8B5CF6' },
    { id: 'hatha', label: 'Hatha', icon: 'meditation', color: '#10B981' },
    { id: 'ashtanga', label: 'Ashtanga', icon: 'human-handsup', color: '#3B82F6' },
    { id: 'yin', label: 'Yin', icon: 'sleep', color: '#06B6D4' },
    { id: 'power', label: 'Power Yoga', icon: 'lightning-bolt', color: '#EF4444' },
    { id: 'stretch', label: 'Stretching', icon: 'human', color: '#F59E0B' },
    { id: 'meditation', label: 'Meditation', icon: 'meditation', color: '#EC4899' },
    { id: 'breathing', label: 'Respiration', icon: 'weather-windy', color: '#84CC16' },
    { id: 'balance', label: 'Equilibre', icon: 'scale-balance', color: '#F97316' },
    { id: 'recovery', label: 'Recovery', icon: 'bed', color: '#14B8A6' },
  ],

  // ═══════════════════════════════════════════
  // CARDIO (10+ options chacun)
  // ═══════════════════════════════════════════
  running: [
    { id: 'treadmill', label: 'Tapis de course', icon: 'run-fast', color: '#10B981' },
    { id: 'elliptical', label: 'Elliptique', icon: 'bike-fast', color: '#8B5CF6' },
    { id: '5k', label: '5K', icon: 'run', color: '#3B82F6' },
    { id: '10k', label: '10K', icon: 'run-fast', color: '#F59E0B' },
    { id: 'semi', label: 'Semi', icon: 'trophy', color: '#8B5CF6' },
    { id: 'marathon', label: 'Marathon', icon: 'medal', color: '#10B981' },
    { id: 'interval', label: 'Fractionne', icon: 'chart-line', color: '#EF4444' },
    { id: 'tempo', label: 'Tempo Run', icon: 'speedometer', color: '#06B6D4' },
    { id: 'endurance', label: 'Endurance', icon: 'clock-outline', color: '#EC4899' },
    { id: 'trail', label: 'Trail', icon: 'terrain', color: '#F97316' },
    { id: 'sprint', label: 'Sprints', icon: 'flash', color: '#14B8A6' },
  ],
  natation: [
    // ...
  ],
  velo: [
    { id: 'indoor_bike', label: 'Velo d\'appartement', icon: 'bike', color: '#10B981' },
    { id: 'spinning', label: 'Spinning/RPM', icon: 'fire', color: '#EF4444' },
    { id: 'short', label: 'Sortie courte', icon: 'bike', color: '#3B82F6' },
    { id: 'long', label: 'Sortie longue', icon: 'bike-fast', color: '#F59E0B' },
    { id: 'interval', label: 'Intervalles', icon: 'chart-line', color: '#EF4444' },
    { id: 'climb', label: 'Grimpee', icon: 'terrain', color: '#8B5CF6' },
  ],
  marche: [
    { id: 'walking_pad', label: 'Tapis de marche', icon: 'walk', color: '#10B981' },
    { id: 'walk', label: 'Marche', icon: 'walk', color: '#3B82F6' },
    { id: 'hike', label: 'Randonnee', icon: 'terrain', color: '#10B981' },
    { id: 'nordic', label: 'Nordique', icon: 'hiking', color: '#8B5CF6' },
    { id: 'urban', label: 'Urbaine', icon: 'city', color: '#F59E0B' },
  ],

  // ═══════════════════════════════════════════
  // SPORTS COLLECTIFS (10+ options chacun)
  // ═══════════════════════════════════════════
  football: [
    { id: 'match', label: 'Match', icon: 'soccer', color: '#10B981' },
    { id: 'training', label: 'Entrainement', icon: 'whistle', color: '#3B82F6' },
    { id: 'small', label: 'Petit jeu', icon: 'soccer-field', color: '#F59E0B' },
    { id: 'technique', label: 'Technique', icon: 'school', color: '#8B5CF6' },
    { id: 'shooting', label: 'Tirs', icon: 'target', color: '#EF4444' },
    { id: 'passing', label: 'Passes', icon: 'arrow-right-bold', color: '#06B6D4' },
    { id: 'dribbling', label: 'Dribbles', icon: 'soccer', color: '#EC4899' },
    { id: 'defense', label: 'Defense', icon: 'shield', color: '#84CC16' },
    { id: 'conditioning', label: 'Physique', icon: 'lightning-bolt', color: '#F97316' },
    { id: 'goalkeeper', label: 'Gardien', icon: 'hand-back-left', color: '#14B8A6' },
  ],
  basketball: [
    { id: 'match', label: 'Match', icon: 'basketball', color: '#F59E0B' },
    { id: 'training', label: 'Entrainement', icon: 'whistle', color: '#3B82F6' },
    { id: 'shooting', label: 'Tirs', icon: 'target', color: '#EF4444' },
    { id: '3points', label: '3 Points', icon: 'numeric-3-circle', color: '#8B5CF6' },
    { id: 'layup', label: 'Layups', icon: 'basketball-hoop', color: '#10B981' },
    { id: 'dribbling', label: 'Dribbles', icon: 'basketball', color: '#06B6D4' },
    { id: 'defense', label: 'Defense', icon: 'shield', color: '#EC4899' },
    { id: 'freethrow', label: 'Lancers francs', icon: 'target', color: '#84CC16' },
    { id: 'conditioning', label: 'Physique', icon: 'lightning-bolt', color: '#F97316' },
    { id: 'scrimmage', label: 'Scrimmage', icon: 'sword-cross', color: '#14B8A6' },
  ],
  rugby: [
    { id: 'match', label: 'Match', icon: 'rugby', color: '#10B981' },
    { id: 'training', label: 'Entrainement', icon: 'whistle', color: '#3B82F6' },
    { id: 'tackle', label: 'Plaquages', icon: 'account-multiple', color: '#EF4444' },
    { id: 'passing', label: 'Passes', icon: 'arrow-right-bold', color: '#F59E0B' },
    { id: 'scrum', label: 'Melee', icon: 'account-group', color: '#8B5CF6' },
    { id: 'lineout', label: 'Touche', icon: 'arrow-up-bold', color: '#06B6D4' },
    { id: 'kicking', label: 'Jeu au pied', icon: 'shoe-sneaker', color: '#EC4899' },
    { id: 'defense', label: 'Defense', icon: 'shield', color: '#84CC16' },
    { id: 'conditioning', label: 'Physique', icon: 'lightning-bolt', color: '#F97316' },
    { id: 'touch', label: 'Touch Rugby', icon: 'rugby', color: '#14B8A6' },
  ],

  // ═══════════════════════════════════════════
  // RAQUETTES (10+ options chacun)
  // ═══════════════════════════════════════════
  padel: [
    { id: 'match', label: 'Match', icon: 'tennis', color: '#10B981' },
    { id: 'training', label: 'Entrainement', icon: 'school', color: '#3B82F6' },
    { id: 'drill', label: 'Drill', icon: 'refresh', color: '#F59E0B' },
    { id: 'serve', label: 'Service', icon: 'tennis-ball', color: '#8B5CF6' },
    { id: 'volley', label: 'Volees', icon: 'hand-front-right', color: '#EF4444' },
    { id: 'smash', label: 'Smash', icon: 'arrow-down-bold', color: '#06B6D4' },
    { id: 'bandeja', label: 'Bandeja', icon: 'tennis', color: '#EC4899' },
    { id: 'vibora', label: 'Vibora', icon: 'tennis', color: '#84CC16' },
    { id: 'lob', label: 'Lob', icon: 'arrow-up-bold', color: '#F97316' },
    { id: 'wall', label: 'Jeu de mur', icon: 'wall', color: '#14B8A6' },
  ],
  tennis: [
    { id: 'match', label: 'Match', icon: 'tennis', color: '#10B981' },
    { id: 'training', label: 'Entrainement', icon: 'school', color: '#3B82F6' },
    { id: 'serve', label: 'Service', icon: 'tennis-ball', color: '#F59E0B' },
    { id: 'forehand', label: 'Coup droit', icon: 'arrow-right-bold', color: '#8B5CF6' },
    { id: 'backhand', label: 'Revers', icon: 'arrow-left-bold', color: '#EF4444' },
    { id: 'volley', label: 'Volees', icon: 'hand-front-right', color: '#06B6D4' },
    { id: 'smash', label: 'Smash', icon: 'arrow-down-bold', color: '#EC4899' },
    { id: 'footwork', label: 'Jeu de jambes', icon: 'run', color: '#84CC16' },
    { id: 'rally', label: 'Echanges', icon: 'swap-horizontal', color: '#F97316' },
    { id: 'conditioning', label: 'Physique', icon: 'lightning-bolt', color: '#14B8A6' },
  ],
  badminton: [
    { id: 'match', label: 'Match', icon: 'badminton', color: '#10B981' },
    { id: 'training', label: 'Entrainement', icon: 'school', color: '#3B82F6' },
    { id: 'serve', label: 'Service', icon: 'badminton', color: '#F59E0B' },
    { id: 'smash', label: 'Smash', icon: 'arrow-down-bold', color: '#EF4444' },
    { id: 'drop', label: 'Drop', icon: 'arrow-down', color: '#8B5CF6' },
    { id: 'clear', label: 'Clear', icon: 'arrow-up-bold', color: '#06B6D4' },
    { id: 'drive', label: 'Drive', icon: 'arrow-right-bold', color: '#EC4899' },
    { id: 'footwork', label: 'Deplacement', icon: 'run', color: '#84CC16' },
    { id: 'net', label: 'Jeu au filet', icon: 'grid', color: '#F97316' },
    { id: 'doubles', label: 'Double', icon: 'account-multiple', color: '#14B8A6' },
  ],
};

// Options par défaut pour les sports sans options spécifiques
const DEFAULT_OPTIONS: SportOption[] = [
  { id: 'training', label: 'Entrainement', icon: 'dumbbell', color: '#3B82F6' },
  { id: 'technique', label: 'Technique', icon: 'school', color: '#8B5CF6' },
  { id: 'sparring', label: 'Sparring/Match', icon: 'sword-cross', color: '#EF4444' },
  { id: 'competition', label: 'Competition', icon: 'trophy', color: '#10B981' },
];

export default function AddTrainingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients, isDark } = useTheme();
  const router = useRouter();
  const { checkBadges } = useBadges();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { showReviewModal, ReviewModalComponent } = useReviewModal();
  const params = useLocalSearchParams<{ date?: string }>();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<any>(null);

  // Catégories dépliées (par défaut aucune)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  // Afficher/cacher la section catégories quand sport déjà sélectionné
  const [showAddSportSection, setShowAddSportSection] = useState(false);

  // Dernier sport utilisé (pour Quick Add)
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({}); // { jjb: ['drill', 'sparring'], running: ['5k'] }
  const [sportEntries, setSportEntries] = useState<Record<string, string[]>>({}); // { jjb: ['Round 1: 5min', 'Guard work'], running: ['5K en 25min'] }
  const [newEntryText, setNewEntryText] = useState<Record<string, string>>({}); // Texte en cours de saisie pour chaque sport
  const [customDescription, setCustomDescription] = useState(''); // Description personnalisée
  const [customSportName, setCustomSportName] = useState(''); // Nom personnalisé pour "Autre" sport
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isOutdoor, setIsOutdoor] = useState(false);

  // Compatibilité avec l'ancien code
  const selectedSport = selectedSports[0] || 'jjb';
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [distance, setDistance] = useState<string>(''); // Nouveau: Distance en km
  const [manualPace, setManualPace] = useState<string>(''); // Allure saisie manuellement
  const [calories, setCalories] = useState<string>(''); // Nouveau: Calories
  const [intensity, setIntensity] = useState<number>(5); // RPE 1-10
  const [pente, setPente] = useState<string>(''); // Pour Tapis (Technogym/Matrix)
  const [resistance, setResistance] = useState<string>(''); // Pour Vélo/Elliptique
  const [watts, setWatts] = useState<string>(''); // Puissance
  const [cadence, setCadence] = useState<string>(''); // RPM
  const [rounds, setRounds] = useState<string>(''); // Nombre de rounds
  const [roundDuration, setRoundDuration] = useState<string>('5'); // Minutes par round
  const [notes, setNotes] = useState('');

  // Calculer l'allure (pace) en direct (uniquement si pas de saisie manuelle)
  const getLivePace = () => {
    if (manualPace) return manualPace;
    const distNum = parseFloat(distance.replace(',', '.'));
    if (!distNum || !duration) return null;
    const totalSeconds = duration * 60;
    const secondsPerKm = totalSeconds / distNum;
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [techniqueRating, setTechniqueRating] = useState<number | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showHouariRateModal, setShowHouariRateModal] = useState(false);
  const [lastSavedTrainingId, setLastSavedTrainingId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('Champion');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [yearlyCount, setYearlyCount] = useState<number>(0);
  const [yearlyObjective, setYearlyObjective] = useState<number>(0);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [showYearlyCountOnCard, setShowYearlyCountOnCard] = useState<boolean>(true);
  const [showMonthlyCount, setShowMonthlyCount] = useState<boolean>(true);
  const [showWeeklyCount, setShowWeeklyCount] = useState<boolean>(true);
  const [showExercisesOnCard, setShowExercisesOnCard] = useState<boolean>(true);
  const [heartRate, setHeartRate] = useState<string>('');

  // Charger les données utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profile, allTrainings] = await Promise.all([
          getProfile(),
          getTrainings(),
        ]);

        if (profile) {
          setUserName(profile.name);
          setUserGender(profile.avatar_gender === 'femme' ? 'female' : 'male');
          if (profile.profile_photo) setUserPhoto(profile.profile_photo);
        } else {
          const settings = await getUserSettings();
          if (settings.username) setUserName(settings.username);
          if (settings.gender) setUserGender(settings.gender);
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Calculer début de semaine (Lundi)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const trainingsList = allTrainings || [];

        // 1. Compteur annuel
        const thisYearTrainings = trainingsList.filter((t: any) => 
          new Date(t.date).getFullYear() === currentYear
        );
        setYearlyCount(thisYearTrainings.length + 1);

        // 2. Compteur mensuel
        const thisMonthTrainings = trainingsList.filter((t: any) => {
          const d = new Date(t.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        setMonthlyCount(thisMonthTrainings.length + 1);

        // 3. Compteur hebdomadaire
        const thisWeekTrainings = trainingsList.filter((t: any) => 
          new Date(t.date) >= startOfWeek
        );
        setWeeklyCount(thisWeekTrainings.length + 1);

      } catch (e) {
        const settings = await getUserSettings();
        if (settings.username) setUserName(settings.username);
      }
    };
    loadUserData();
  }, []);

  // Recalculer l'objectif quand le club change
  useEffect(() => {
    if (selectedClub) {
      // Semaines écoulées dans l'année
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffInMs = now.getTime() - startOfYear.getTime();
      const weeksPassed = Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60 * 24 * 7)));
      
      // Objectif = séances_par_semaine * semaines_passées
      const goalPerWeek = selectedClub.sessions_per_week || 3;
      setYearlyObjective(goalPerWeek * weeksPassed);
    } else {
      setYearlyObjective(0);
    }
  }, [selectedClub]);

  // Calculer heure de fin
  const calculateEndTime = (): string => {
    const end = new Date(startTime.getTime() + duration * 60 * 1000);
    return end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Parse date from params if provided
  useEffect(() => {
    if (params.date) {
      const parsedDate = new Date(params.date + 'T12:00:00');
      if (!isNaN(parsedDate.getTime())) {
        setDate(parsedDate);
      }
    }
  }, [params.date]);

  // Charger le dernier sport utilisé (pour Quick Add seulement, PAS de pré-sélection)
  useEffect(() => {
    const loadLastSport = async () => {
      try {
        const saved = await AsyncStorage.getItem(LAST_SPORT_KEY);
        const savedDuration = await AsyncStorage.getItem(LAST_DURATION_KEY);
        if (saved) {
          // Dernier sport chargé
        }
        if (savedDuration) {
          // Dernière durée chargée
        }
      } catch (error) {
        logger.error('Erreur chargement dernier sport:', error);
      }
    };
    loadLastSport();
  }, []);

  // Sauvegarder le sport et durée quand on enregistre
  const saveLastSportAndDuration = async (sport: string, dur: number) => {
    try {
      await AsyncStorage.setItem(LAST_SPORT_KEY, sport);
      await AsyncStorage.setItem(LAST_DURATION_KEY, dur.toString());
    } catch (error) {
      logger.error('Erreur sauvegarde dernier sport:', error);
    }
  };

  // Toggle une catégorie
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Toggle un sport (sélection multiple)
  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        // Retirer le sport (peut retirer tous les sports)
        const newSports = prev.filter(s => s !== sportId);
        // Nettoyer les options et entrées de ce sport
        setSelectedOptions(opts => {
          const newOpts = { ...opts };
          delete newOpts[sportId];
          return newOpts;
        });
        setSportEntries(entries => {
          const newEntries = { ...entries };
          delete newEntries[sportId];
          return newEntries;
        });
        // Reset custom sport name si on retire "autre"
        if (sportId === 'autre') {
          setCustomSportName('');
        }
        return newSports;
      } else {
        // Ajouter le sport (max 3)
        if (prev.length >= 3) return prev;
        // FERMER TOUTES LES CATÉGORIES et cacher la section quand on sélectionne un sport
        setExpandedCategories([]);
        setShowAddSportSection(false);
        // Scroller vers le haut pour voir le sport sélectionné
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
        return [...prev, sportId];
      }
    });
  };

  // Toggle une option pour un sport
  const toggleOption = (sportId: string, optionId: string) => {
    setSelectedOptions(prev => {
      const currentOptions = prev[sportId] || [];
      if (currentOptions.includes(optionId)) {
        return {
          ...prev,
          [sportId]: currentOptions.filter(o => o !== optionId),
        };
      } else {
        return {
          ...prev,
          [sportId]: [...currentOptions, optionId],
        };
      }
    });
  };

  // Obtenir les options pour un sport
  const getOptionsForSport = (sportId: string): SportOption[] => {
    return SPORT_OPTIONS[sportId] || DEFAULT_OPTIONS;
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const data = await getClubs();
      setClubs(data);
    } catch (error) {
      logger.error('Erreur chargement clubs:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const toggleMuscle = (muscleId: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleId)
        ? prev.filter(m => m !== muscleId)
        : [...prev, muscleId]
    );
  };

  // Ajouter une entrée pour un sport
  const addSportEntry = (sportId: string) => {
    const text = newEntryText[sportId]?.trim();
    if (!text) return;

    setSportEntries(prev => {
      const currentEntries = prev[sportId] || [];
      if (currentEntries.length >= 10) return prev; // Max 10 entrées
      return {
        ...prev,
        [sportId]: [...currentEntries, text],
      };
    });

    // Effacer le champ de saisie
    setNewEntryText(prev => ({
      ...prev,
      [sportId]: '',
    }));
  };

  // Supprimer une entrée pour un sport
  const removeSportEntry = (sportId: string, index: number) => {
    setSportEntries(prev => {
      const currentEntries = prev[sportId] || [];
      return {
        ...prev,
        [sportId]: currentEntries.filter((_, i) => i !== index),
      };
    });
  };

  const handleFinish = async () => {
    // Vérifier si on doit demander la notation (ou forcer pour cette feature)
    // On affiche le modal Houari
    setShowHouariRateModal(true);
  };

  const handleCloseHouariModal = () => {
    setShowHouariRateModal(false);
    // CRITIQUE : Rediriger l'utilisateur pour ne pas le laisser bloqué sur l'écran d'ajout
    router.replace('/(tabs)');
  };

  const handleShareModalShare = async () => {
    setShowShareModal(false);
    // Marquer qu'on doit demander la review au retour
    await AsyncStorage.setItem('@yoroi_pending_review', 'true');
    // Navigate to last-session sharing screen avec l'ID précis
    if (lastSavedTrainingId) {
      router.replace(`/social-share/last-session?id=${lastSavedTrainingId}`);
    } else {
      router.replace('/social-share/last-session');
    }
  };

  const handleShareModalSkip = async () => {
    setShowShareModal(false);
    handleFinish();
  };

  // Quick Fill pour pré-remplir le formulaire avec la dernière séance
  const handleQuickFill = (quickSport: string, quickDuration: number) => {
    // Pré-sélectionner le sport
    setSelectedSports([quickSport]);
    // Pré-remplir la durée
    setDuration(quickDuration);
    // Petit feedback haptic
    lightHaptic();
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      // Construire les notes avec les options sélectionnées et description custom
      let fullNotes = '';

      // Ajouter les options sélectionnées et entrées pour chaque sport
      selectedSports.forEach(sportId => {
        const sportName = getSportName(sportId);
        const sportOptions = selectedOptions[sportId] || [];
        const entries = sportEntries[sportId] || [];

        // Options sélectionnées
        if (sportOptions.length > 0) {
          const optionLabels = sportOptions.map(optId => {
            const opt = getOptionsForSport(sportId).find(o => o.id === optId);
            return opt?.label || optId;
          });
          fullNotes += `${sportName}: ${optionLabels.join(', ')}\n`;
        }

        // Entrées personnalisées
        if (entries.length > 0) {
          if (sportOptions.length === 0) {
            fullNotes += `${sportName}:\n`;
          }
          entries.forEach(entry => {
            fullNotes += `  • ${entry}\n`;
          });
        }
      });

      // Ajouter la description personnalisée
      if (customDescription.trim()) {
        fullNotes += `\n${customDescription.trim()}`;
      }

      // Ajouter les notes existantes
      if (notes.trim()) {
        fullNotes += `\n${notes.trim()}`;
      }

      // Pour chaque sport sélectionné, créer une entrée (ou une seule avec sports combinés)
      // Remplacer 'autre' par le nom personnalisé si défini
      const finalSports = selectedSports.map(sportId => {
        if (sportId === 'autre' && customSportName.trim()) {
          return customSportName.trim();
        }
        return sportId;
      });
      const sportsString = finalSports.join(',');

      const newId = await addTraining({
        club_id: selectedClub?.id,
        sport: sportsString, // Sports combinés
        date: format(date, 'yyyy-MM-dd'),
        duration_minutes: duration || undefined,
        start_time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        notes: fullNotes.trim() || undefined,
        muscles: selectedMuscles.length > 0 ? selectedMuscles.join(',') : undefined,
        exercises: exercises.length > 0 ? exercises : undefined,
        technique_rating: techniqueRating,
        is_outdoor: isOutdoor,
        distance: distance ? parseFloat(distance.replace(',', '.')) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        intensity: intensity,
        rounds: rounds ? parseInt(rounds) : undefined,
        round_duration: roundDuration ? parseInt(roundDuration) : undefined,
        pente: pente ? parseFloat(pente.replace(',', '.')) : undefined,
        resistance: resistance ? parseInt(resistance) : undefined,
        watts: watts ? parseInt(watts) : undefined,
        cadence: cadence ? parseInt(cadence) : undefined,
      });

      if (newId) {
        setLastSavedTrainingId(Number(newId));
      }

      // Sauvegarder le premier sport et durée pour le Quick Add
      await saveLastSportAndDuration(selectedSports[0], duration);

      successHaptic();
      playWorkoutCompleteSound();

      // 🔄 SYNC VERS APPLE HEALTH
      try {
        const startDateTime = new Date(date);
        const [hours, minutes] = startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

        const endDateTime = new Date(startDateTime.getTime() + (duration || 60) * 60 * 1000);

        const exported = await HealthConnect.writeWorkout({
          activityType: getSportName(selectedSport),
          startDate: startDateTime,
          endDate: endDateTime,
        });

        if (exported) {
          logger.info('Entraînement synchronisé vers Apple Health:', selectedSport);
        }
      } catch (healthError) {
        // Ne pas bloquer la sauvegarde si l'export échoue
        logger.warn('Export Apple Health échoué (non bloquant):', healthError);
      }

      // Trigger review apres une action positive (on incrementera apres le partage)
      await incrementReviewTrigger();

      // Verifier les badges debloques
      await checkBadges();

      // Vérifier si on doit afficher le rappel de sauvegarde
      const shouldShowBackupReminder = await backupReminderService.onDataAdded();

      if (shouldShowBackupReminder) {
        // Afficher le rappel de sauvegarde avec option de backup
        await backupReminderService.showReminder(() => {
          // Rediriger vers le menu Plus (export disponible)
          router.push('/(tabs)/more');
        });
        // router.back(); // On ne quitte plus, on laisse le flow continuer
      } 
      
      // AFFICHER LE MODAL DE VALIDATION (Step 1)
      setShowValidationModal(true);

    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      errorHaptic();
      showPopup('Erreur', "Impossible d'enregistrer l'entrainement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  // Clubs filtrés par sport sélectionné
  const filteredClubs = clubs.filter(c => c.sport === selectedSport);

  // Afficher les muscles et exercices si musculation ou street workout est sélectionné
  const showMuscles = selectedSports.includes('musculation') || selectedSports.includes('street_workout');

  return (
    <ScreenWrapper noPadding>
      {/* HEADER ÉTAPE 1 - SOMMET ABSOLU */}
      <View style={{ 
        paddingTop: insets.top, 
        backgroundColor: colors.background, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border,
        zIndex: 999
      }}>
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.accent, letterSpacing: 4, marginBottom: 12 }}>ÉTAPE 1 SUR 4</Text>
          <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.6, shadowRadius: 10, elevation: 10 }} />
            <View style={{ width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ width: 40, height: 3, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 12, letterSpacing: 1 }}>CONFIGURATION DE LA SÉANCE</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 1: CHOISIS TON SPORT */}
        {/* ═══════════════════════════════════════════ */}

        {/* Titre quand aucun sport sélectionné */}
        {selectedSports.length === 0 && (
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            1. Choisis ton sport
          </Text>
        )}

        {/* Bouton pour ajouter un autre sport (quand sport déjà sélectionné) */}
        {selectedSports.length > 0 && selectedSports.length < 3 && !showAddSportSection && (
          <TouchableOpacity
            style={[styles.addAnotherSportButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowAddSportSection(true)}
          >
            <Plus size={18} color={colors.textMuted} />
            <Text style={[styles.addAnotherSportText, { color: colors.textMuted }]}>
              Ajouter un autre sport
            </Text>
          </TouchableOpacity>
        )}

        {/* Titre section ajouter sport */}
        {selectedSports.length > 0 && showAddSportSection && (
          <View style={styles.addSportSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
              Ajouter un sport
            </Text>
            <TouchableOpacity onPress={() => setShowAddSportSection(false)}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Catégories - visibles si: aucun sport OU showAddSportSection */}
        {(selectedSports.length === 0 || showAddSportSection) && (() => {
          const categoryLabels: Record<string, string> = {
            cardio: 'Cardio',
            fitness: 'Musculation & Fitness',
            combat_grappling: 'Combat (Grappling)',
            combat_striking: 'Combat (Pieds-Poings)',
            danse: 'Danse',
            collectif: 'Sports Collectifs',
            raquettes: 'Raquettes',
            glisse: 'Sports de Glisse',
            nature: 'Sports Nature',
            autre: 'Autres',
          };

          const categoryIcons: Record<string, string> = {
            cardio: 'run-fast',
            fitness: 'dumbbell',
            combat_grappling: 'kabaddi',
            combat_striking: 'boxing-glove',
            danse: 'dance-ballroom',
            collectif: 'soccer',
            raquettes: 'tennis',
            glisse: 'snowboard',
            nature: 'hiking',
            autre: 'dots-horizontal',
          };

          const categoryColors: Record<string, string> = {
            cardio: '#10B981',
            fitness: '#8B5CF6',
            combat_grappling: '#3B82F6',
            combat_striking: '#EF4444',
            danse: '#EC4899',
            collectif: '#F59E0B',
            raquettes: '#06B6D4',
            glisse: '#0EA5E9',
            nature: '#22C55E',
            autre: '#6B7280',
          };

          // NOUVEL ORDRE : Cardio > Musculation > Combat > Danse > reste
          const categories = ['cardio', 'fitness', 'combat_grappling', 'combat_striking', 'danse', 'collectif', 'raquettes', 'glisse', 'nature', 'autre'];

          return categories.map((category) => {
            const sportsInCategory = SPORTS.filter(s => s.category === category);
            if (sportsInCategory.length === 0) return null;

            const isExpanded = expandedCategories.includes(category);
            // Vérifier si un sport sélectionné est dans cette catégorie
            const hasSelectedSport = sportsInCategory.some(s => selectedSports.includes(s.id));
            const catColor = categoryColors[category] || '#6B7280';

            return (
              <View key={category} style={styles.categorySection}>
                {/* Header de catégorie cliquable */}
                <TouchableOpacity
                  style={[
                    styles.categoryHeader,
                    { backgroundColor: colors.card, borderColor: hasSelectedSport ? catColor : colors.border },
                    hasSelectedSport && { backgroundColor: catColor + '15' }
                  ]}
                  onPress={() => toggleCategory(category)}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={[styles.categoryIconBadge, { backgroundColor: catColor + '20' }]}>
                      <MaterialCommunityIcons
                        name={categoryIcons[category] as any}
                        size={20}
                        color={catColor}
                      />
                    </View>
                    <Text style={[
                      styles.categoryLabel,
                      { color: hasSelectedSport ? catColor : colors.textPrimary }
                    ]}>
                      {categoryLabels[category]}
                    </Text>
                  </View>
                  <View style={styles.categoryHeaderRight}>
                    <Text style={[styles.categorySportCount, { color: colors.textMuted }]}>
                      {sportsInCategory.length}
                    </Text>
                    {isExpanded ? (
                      <ChevronDown size={20} color={colors.textMuted} />
                    ) : (
                      <ChevronRight size={20} color={colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Sports de la catégorie - GRILLE VERTICALE */}
                {isExpanded && (
                  <View style={styles.sportsGrid}>
                    {sportsInCategory.map((sport) => {
                      const isSelected = selectedSports.includes(sport.id);

                      return (
                        <TouchableOpacity
                          key={sport.id}
                          style={[
                            styles.sportGridItem,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            isSelected && {
                              borderColor: colors.gold,
                              backgroundColor: colors.goldMuted,
                            },
                          ]}
                          onPress={() => toggleSport(sport.id)}
                        >
                          <View style={[styles.sportGridIcon, { backgroundColor: sport.color + '20' }]}>
                            <MaterialCommunityIcons
                              name={sport.icon as any}
                              size={28}
                              color={isSelected ? colors.gold : sport.color}
                            />
                          </View>
                          <Text
                            style={[
                              styles.sportGridName,
                              { color: colors.textPrimary },
                              isSelected && { color: colors.gold, fontWeight: '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {sport.name}
                          </Text>
                          {isSelected && (
                            <View style={[styles.sportGridCheck, { backgroundColor: colors.gold }]}>
                              <Check size={12} color={colors.textOnGold} strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          });
        })()}

        {/* ═══════════════════════════════════════════ */}
        {/* SPORTS SÉLECTIONNÉS - Badge(s) avec X pour retirer */}
        {/* ═══════════════════════════════════════════ */}
        {selectedSports.length > 0 && (
          <View style={styles.selectedSportsSection}>
            <View style={styles.selectedSportsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                {selectedSports.length === 1 ? 'Sport selectionne' : `${selectedSports.length} sports selectionnes`}
              </Text>
              <Text style={[styles.selectedSportsHint, { color: colors.textMuted }]}>
                (max 3)
              </Text>
            </View>
            <View style={styles.selectedSportsList}>
              {selectedSports.map((sportId) => {
                const sport = SPORTS.find(s => s.id === sportId);
                if (!sport) return null;
                return (
                  <TouchableOpacity
                    key={sportId}
                    style={[styles.selectedSportChip, { backgroundColor: colors.gold, borderColor: colors.gold }]}
                    onPress={() => toggleSport(sportId)}
                  >
                    <MaterialCommunityIcons name={sport.icon as any} size={20} color={colors.textOnGold} />
                    <Text style={[styles.selectedSportChipText, { color: colors.textOnGold }]}>
                      {sportId === 'autre' && customSportName ? customSportName : sport.name}
                    </Text>
                    <X size={16} color={colors.textOnGold} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Champ de saisie pour nom personnalisé quand "Autre" est sélectionné */}
            {selectedSports.includes('autre') && (
              <View style={[styles.customSportInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="pencil" size={20} color={colors.accent} />
                <TextInput
                  style={[styles.customSportInput, { color: colors.textPrimary }]}
                  placeholder="Nom du sport..."
                  placeholderTextColor={colors.textMuted}
                  value={customSportName}
                  onChangeText={setCustomSportName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* LIEU D'ENTRAÎNEMENT - Seulement si sport sélectionné */}
        {/* ═══════════════════════════════════════════ */}
        {selectedSports.length > 0 && (
          <>
            {/* TYPE DE LIEU : En salle ou Plein air */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Lieu</Text>
            <View style={styles.locationTypeRow}>
              {/* Option En salle */}
              <TouchableOpacity
                style={[
                  styles.locationTypeCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !isOutdoor && { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
                ]}
                onPress={() => setIsOutdoor(false)}
              >
                <View style={[styles.locationTypeIcon, { backgroundColor: !isOutdoor ? colors.accent + '20' : colors.backgroundElevated }]}>
                  <Building2 size={28} color={!isOutdoor ? colors.accent : colors.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.locationTypeLabel, { color: !isOutdoor ? colors.accent : colors.textSecondary, fontWeight: !isOutdoor ? '700' : '500' }]}>
                  En salle
                </Text>
              </TouchableOpacity>

              {/* Option Plein Air */}
              <TouchableOpacity
                style={[
                  styles.locationTypeCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isOutdoor && { borderColor: '#22C55E', backgroundColor: '#22C55E15' },
                ]}
                onPress={() => setIsOutdoor(true)}
              >
                <View style={[styles.locationTypeIcon, { backgroundColor: isOutdoor ? '#22C55E30' : colors.backgroundElevated }]}>
                  <Sun size={28} color={isOutdoor ? '#22C55E' : colors.textSecondary} strokeWidth={2} />
                </View>
                <Text style={[styles.locationTypeLabel, { color: isOutdoor ? '#22C55E' : colors.textSecondary, fontWeight: isOutdoor ? '700' : '500' }]}>
                  Plein air
                </Text>
              </TouchableOpacity>
            </View>

            {/* CLUBS - Toujours visible (certains clubs ont des séances en plein air) */}
            <>
              <Text style={[styles.clubSectionTitle, { color: colors.textMuted }]}>Club (optionnel)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.clubsScroll}
                  contentContainerStyle={styles.clubsScrollContent}
                >
                  {/* Option Sans club */}
                  <TouchableOpacity
                    style={[
                      styles.clubCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      !selectedClub && { borderColor: colors.textMuted, borderStyle: 'dashed' },
                    ]}
                    onPress={() => setSelectedClub(null)}
                  >
                    <View style={[styles.clubCardIcon, { backgroundColor: colors.backgroundElevated }]}>
                      <Home size={24} color={!selectedClub ? colors.textPrimary : colors.textSecondary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.clubCardName, { color: !selectedClub ? colors.textPrimary : colors.textSecondary, fontWeight: !selectedClub ? '700' : '500' }]}>
                      Sans club
                    </Text>
                  </TouchableOpacity>

                  {/* Clubs enregistrés - triés par pertinence */}
                  {[...clubs]
                    .sort((a, b) => {
                      const aMatches = selectedSports.includes(a.sport || '');
                      const bMatches = selectedSports.includes(b.sport || '');
                      if (aMatches && !bMatches) return -1;
                      if (!aMatches && bMatches) return 1;
                      return 0;
                    })
                    .map((club) => {
                    const isMatchingSport = selectedSports.includes(club.sport || '');
                    return (
                    <TouchableOpacity
                      key={club.id}
                      style={[
                        styles.clubCard,
                        {
                          backgroundColor: selectedClub?.id === club.id ? colors.goldMuted : isMatchingSport ? colors.accent + '10' : colors.card,
                          borderColor: selectedClub?.id === club.id ? colors.gold : isMatchingSport ? colors.accent + '40' : colors.border,
                          borderWidth: selectedClub?.id === club.id ? 2 : 1,
                          opacity: isMatchingSport ? 1 : 0.6,
                        },
                      ]}
                      onPress={() => setSelectedClub(club)}
                    >
                      {(() => {
                        const logoSource = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
                        if (logoSource) {
                          return (
                            <Image
                              source={logoSource}
                              style={styles.clubCardLogo}
                              resizeMode="cover"
                            />
                          );
                        }
                        return (
                          <View style={[styles.clubCardIcon, { backgroundColor: club.color || colors.backgroundElevated }]}>
                            <MaterialCommunityIcons
                              name={getSportIcon(club.sport || 'autre') as any}
                              size={24}
                              color="#FFFFFF"
                            />
                          </View>
                        );
                      })()}
                      <Text
                        style={[
                          styles.clubCardName,
                          { color: selectedClub?.id === club.id ? colors.gold : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {club.name}
                      </Text>
                      {isMatchingSport && (
                        <View style={[styles.matchingBadge, { backgroundColor: colors.accent }]}>
                          <Check size={10} color={colors.textOnAccent} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                  })}

                  {/* Bouton Créer un club */}
                  <TouchableOpacity
                    style={[
                      styles.clubCard,
                      { backgroundColor: colors.card, borderColor: colors.border, borderStyle: 'dashed' },
                    ]}
                    onPress={() => router.push('/add-club' as any)}
                  >
                    <View style={[styles.clubCardIcon, { backgroundColor: colors.backgroundElevated }]}>
                      <Plus size={24} color={colors.accent} strokeWidth={2} />
                    </View>
                    <Text style={[styles.clubCardName, { color: colors.accent }]}>
                      Créer
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
            </>
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 2: DÉTAILS DE LA SÉANCE - Seulement si sport sélectionné */}
        {/* ═══════════════════════════════════════════ */}
        {selectedSports.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : '#000000', marginTop: SPACING.lg, fontWeight: '700' }]}>
              2. Configure ta seance
            </Text>

            {/* ESPACE PERSONNALISATION MANUELLE */}
            <View style={[styles.sportOptionsSection, { backgroundColor: colors.card, borderColor: colors.gold + '40', borderWidth: 1.5, marginBottom: 24 }]}>
              <View style={styles.sportOptionsHeader}>
                <Edit3 size={20} color={colors.gold} />
                <Text style={[styles.sportOptionsTitle, { color: colors.textPrimary }]}>Personnalise ta seance</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>Ajoute un exercice ou un detail specifique a la main :</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.notesInput, { flex: 1, minHeight: 50, marginBottom: 0, paddingVertical: 10 }]}
                  placeholder="Ex: 50 tractions, Sparring intensif..."
                  placeholderTextColor={colors.textMuted}
                  value={customExerciseName}
                  onChangeText={setCustomExerciseName}
                />
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: colors.gold, 
                    paddingHorizontal: 15, 
                    borderRadius: 12, 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                  }}
                  onPress={() => {
                    if (customExerciseName.trim()) {
                      setExercises(prev => [...prev, { name: customExerciseName.trim(), sets: 0, reps: 0, weight: 0 }]);
                      setCustomExerciseName('');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Plus size={24} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Options pour chaque sport sélectionné */}
        {selectedSports.map((sportId) => {
          const sport = SPORTS.find(s => s.id === sportId);
          const options = getOptionsForSport(sportId);
          const sportSelectedOptions = selectedOptions[sportId] || [];

          if (!sport || options.length === 0) return null;

          return (
            <View key={`options-${sportId}`} style={[styles.sportOptionsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sportOptionsHeader}>
                <MaterialCommunityIcons name={sport.icon as any} size={24} color={sport.color} />
                <Text style={[styles.sportOptionsTitle, { color: colors.textPrimary }]}>
                  {sport.name} - Qu'as-tu fait ?
                </Text>
              </View>
              <View style={styles.sportOptionsGrid}>
                {options.map((option) => {
                  const isSelected = sportSelectedOptions.includes(option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.sportOptionChip,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
                        isSelected && { backgroundColor: option.color + '20', borderColor: option.color }
                      ]}
                      onPress={() => toggleOption(sportId, option.id)}
                    >
                      {option.icon && (
                        <MaterialCommunityIcons
                          name={option.icon as any}
                          size={18}
                          color={isSelected ? option.color : colors.textMuted}
                        />
                      )}
                      <Text style={[
                        styles.sportOptionLabel,
                        { color: colors.textSecondary },
                        isSelected && { color: option.color, fontWeight: '700' }
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && <Check size={14} color={option.color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ═══ ENTRÉES PERSONNALISÉES ═══ */}
              <View style={styles.sportEntriesSection}>
                <Text style={[styles.sportEntriesTitle, { color: colors.textMuted }]}>
                  Tes notes ({(sportEntries[sportId] || []).length}/10)
                </Text>

                {/* Liste des entrées existantes */}
                {(sportEntries[sportId] || []).map((entry, index) => (
                  <View key={index} style={[styles.sportEntryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={[styles.sportEntryText, { color: colors.textPrimary }]} numberOfLines={2}>
                      {entry}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeSportEntry(sportId, index)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Champ d'ajout d'entrée */}
                {(sportEntries[sportId] || []).length < 10 && (
                  <View style={styles.sportEntryInputRow}>
                    <TextInput
                      style={[
                        styles.sportEntryInput,
                        { color: colors.textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }
                      ]}
                      value={newEntryText[sportId] || ''}
                      onChangeText={(text) => setNewEntryText(prev => ({ ...prev, [sportId]: text }))}
                      placeholder="Ex: 5 rounds, garde fermee..."
                      placeholderTextColor={colors.textMuted}
                      returnKeyType="done"
                      onSubmitEditing={() => addSportEntry(sportId)}
                      maxLength={100}
                    />
                    <TouchableOpacity
                      style={[styles.sportEntryAddButton, { backgroundColor: sport.color }]}
                      onPress={() => addSportEntry(sportId)}
                    >
                      <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* ═══════════════════════════════════════════ */}
        {/* DESCRIPTION PERSONNALISÉE - Seulement si sport sélectionné */}
        {/* ═══════════════════════════════════════════ */}
        {selectedSports.length > 0 && (
          <View style={[styles.customDescriptionSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.customDescriptionHeader}>
              <Plus size={20} color={colors.gold} />
              <Text style={[styles.customDescriptionTitle, { color: colors.textPrimary }]}>
                Ajoute ta description
              </Text>
            </View>
            <TextInput
              style={[styles.customDescriptionInput, { color: colors.textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              value={customDescription}
              onChangeText={setCustomDescription}
              placeholder="Ex: Travail garde fermée, révision des sweeps..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              maxLength={500}
            />
          </View>
        )}

        {/* DATE - Seulement si sport sélectionné */}
        {selectedSports.length > 0 && (
          <>
        {/* DATE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Date</Text>
        <TouchableOpacity
          style={[styles.dateSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={20} color={colors.gold} />
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
            {formatDate(date)}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: 12, padding: 8 }}>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={colors.textPrimary}
              onChange={handleDateChange}
              maximumDate={new Date()}
              locale="fr"
            />
          </View>
        )}

        {/* HEURE DE DÉBUT */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Heure de debut</Text>
        <TouchableOpacity
          style={[styles.timeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Clock size={20} color={colors.gold} />
          <Text style={[styles.timeText, { color: colors.textPrimary }]}>
            {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View style={{ backgroundColor: colors.backgroundCard, borderRadius: 12, padding: 8 }}>
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={colors.textPrimary}
              onChange={(event, selectedTime) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedTime) setStartTime(selectedTime);
              }}
            />
          </View>
        )}

        {/* DURÉE ESTIMÉE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Duree (minutes)</Text>
        <View style={[styles.durationContainer, { flexWrap: 'wrap' }]}>
          {[30, 45, 60, 90].map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.durationItem,
                { backgroundColor: colors.card, borderColor: colors.border },
                duration === d && { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
              ]}
              onPress={() => setDuration(d)}
            >
              <Text
                style={[
                  styles.durationText,
                  { color: colors.textSecondary },
                  duration === d && { color: colors.accent, fontWeight: '700' },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}

          {/* CHAMP LIBRE INTÉGRÉ */}
          <View
            style={[
              styles.durationItem,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                paddingVertical: 0,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 80,
                justifyContent: 'center'
              },
              (![30, 45, 60, 90].includes(duration)) && { borderColor: colors.accent, backgroundColor: colors.accent + '10' }
            ]}
          >
            <TextInput
              style={[
                styles.durationText,
                {
                  color: (![30, 45, 60, 90].includes(duration)) ? colors.accent : colors.textPrimary,
                  fontWeight: '600',
                  textAlign: 'right',
                  minWidth: 30,
                  paddingVertical: 12,
                  height: '100%'
                }
              ]}
              value={(![30, 45, 60, 90].includes(duration)) ? duration.toString() : ''}
              placeholder="..."
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={(text) => {
                const num = parseInt(text);
                if (!isNaN(num) && num > 0) {
                  setDuration(num);
                }
              }}
            />
            <Text style={[styles.durationText, { color: colors.textMuted, fontSize: 13, marginLeft: 4, fontWeight: '400' }]}>min</Text>
          </View>
        </View>

        <Text style={[styles.endTimeText, { color: colors.textMuted }]}>
          Fin estimee : {calculateEndTime()}
        </Text>

        {/* STATS PERFORMANCE - DYNAMIQUE SELON SPORT */}
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ta performance</Text>
          
          <View style={[styles.proStatsContainer, { flexDirection: 'column' }]}>
            {/* DISTANCE + ALLURE (Cardio) */}
            {(selectedSports.includes('running') || 
              selectedSports.includes('velo') || 
              selectedSports.includes('natation') || 
              selectedSports.includes('marche') || 
              selectedSports.includes('trail') ||
              selectedSports.includes('treadmill') ||
              selectedSports.includes('elliptical') ||
              selectedSports.includes('walking_pad')) && (
              <View style={{ width: '100%', gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.proStatLabel, { color: colors.textMuted }]}>Distance (km)</Text>
                    <TextInput
                      style={[styles.proStatInput, { color: colors.accent }]}
                      value={distance}
                      onChangeText={setDistance}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.proStatLabel, { color: colors.textMuted }]}>Calories</Text>
                    <TextInput
                      style={[styles.proStatInput, { color: colors.textPrimary }]}
                      value={calories}
                      onChangeText={setCalories}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* CHAMPS MACHINES PRO (Technogym / Matrix) */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {(selectedSports.includes('treadmill') || selectedSports.includes('walking_pad') || selectedSports.includes('trail')) && (
                    <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.gold + '40' }]}>
                      <Text style={[styles.proStatLabel, { color: colors.gold }]}>Pente (%)</Text>
                      <TextInput
                        style={[styles.proStatInput, { color: colors.textPrimary }]}
                        value={pente}
                        onChangeText={setPente}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                  {(selectedSports.includes('velo') || selectedSports.includes('indoor_bike') || selectedSports.includes('spinning') || selectedSports.includes('elliptical')) && (
                    <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.gold + '40' }]}>
                      <Text style={[styles.proStatLabel, { color: colors.gold }]}>Niveau/Res.</Text>
                      <TextInput
                        style={[styles.proStatInput, { color: colors.textPrimary }]}
                        value={resistance}
                        onChangeText={setResistance}
                        placeholder="1"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                      />
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.proStatLabel, { color: colors.textMuted }]}>Watts (Puissance)</Text>
                    <TextInput
                      style={[styles.proStatInput, { color: colors.textPrimary }]}
                      value={watts}
                      onChangeText={setWatts}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.proStatLabel, { color: colors.textMuted }]}>Cadence (RPM)</Text>
                    <TextInput
                      style={[styles.proStatInput, { color: colors.textPrimary }]}
                      value={cadence}
                      onChangeText={setCadence}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ... reste des champs (Rounds, Calories) ... */}

            {/* INTENSITÉ AVEC JUSTIFICATION SCIENTIFIQUE */}
            <View style={{ width: '100%' }}>
              <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.proStatLabel, { color: colors.textMuted }]}>Intensité (RPE - Échelle de Borg)</Text>
                  <MaterialCommunityIcons name="information-outline" size={14} color={colors.textMuted} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4, width: '100%', justifyContent: 'center' }}>
                  <TouchableOpacity onPress={() => setIntensity(Math.max(1, intensity - 1))} style={styles.intensityStep}>
                    <Text style={{ fontSize: 28, color: colors.textMuted, fontWeight: '300' }}>-</Text>
                  </TouchableOpacity>
                  
                  <View style={{ alignItems: 'center', minWidth: 80 }}>
                    <Text style={[styles.proStatInput, { color: intensity > 7 ? '#EF4444' : colors.accent, marginBottom: -4 }]}>
                      {intensity}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                      {intensity <= 3 ? 'Facile' : intensity <= 6 ? 'Modéré' : intensity <= 8 ? 'Difficile' : 'Maximal'}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => setIntensity(Math.min(10, intensity + 1))} style={styles.intensityStep}>
                    <Text style={{ fontSize: 28, color: colors.textMuted, fontWeight: '300' }}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  onPress={() => WebBrowser.openBrowserAsync('https://pubmed.ncbi.nlm.nih.gov/7154893/')}
                  style={{ marginTop: 10, alignItems: 'center' }}
                >
                  <Text style={[styles.scienceNote, { color: colors.accent, textDecorationLine: 'underline' }]}>
                    L'échelle RPE (Borg, 1982) est validée scientifiquement pour mesurer la charge interne et prévenir le surentraînement. Voir l'étude →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
          </>
        )}

        {/* NOTE TECHNIQUE - Seulement si sport sélectionné */}
        {selectedSports.length > 0 && (
          <>
            <View style={[styles.techniqueSection, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
              <View style={styles.techniqueSectionHeader}>
                <Text style={[styles.techniqueSectionTitle, { color: colors.textPrimary }]}>Note ta technique</Text>
                <Text style={[styles.techniqueSectionSubtitle, { color: colors.textMuted }]}>
                  Comment etait ta technique aujourd'hui ?
                </Text>
              </View>

              {/* Étoiles */}
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    onPress={() => setTechniqueRating(rating)}
                    style={styles.starButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Star
                      size={36}
                      color={techniqueRating && rating <= techniqueRating ? colors.accent : colors.textMuted}
                      fill={techniqueRating && rating <= techniqueRating ? colors.accent : 'transparent'}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Labels sous les étoiles */}
              <View style={styles.starsLabels}>
                <Text style={[styles.starLabel, { color: colors.textMuted }]}>1</Text>
                <Text style={[styles.starLabel, { color: colors.textMuted }]}>2</Text>
                <Text style={[styles.starLabel, { color: colors.textMuted }]}>3</Text>
                <Text style={[styles.starLabel, { color: colors.textMuted }]}>4</Text>
                <Text style={[styles.starLabel, { color: colors.textMuted }]}>5</Text>
              </View>

              {/* Info scientifique */}
              <View style={styles.techniqueInfo}>
                <Text style={[styles.techniqueInfoText, { color: colors.textMuted }]}>
                  Noter ta technique ameliore ta conscience corporelle et reduit ton risque de blessure de 35%
                </Text>
              </View>

              {/* Bouton Passer */}
              {techniqueRating !== null && (
                <TouchableOpacity
                  onPress={() => setTechniqueRating(null)}
                  style={styles.skipButton}
                >
                  <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>x Reinitialiser</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* BOUTON SAVE */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.accent },
                isSubmitting && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={isSubmitting || selectedSports.length === 0}
            >
              <View style={styles.saveButtonContent}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent || '#FFFFFF'} />
                ) : (
                  <Dumbbell size={22} color={colors.textOnAccent || '#FFFFFF'} />
                )}
                <Text style={[styles.saveButtonText, { color: colors.textOnAccent || '#FFFFFF' }]}>
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onAddExercise={(exercise) => setExercises(prev => [...prev, exercise])}
      />

      {/* MODAL 1: VALIDATION & APERÇU ÉTAPE 2 */}
      <Modal
        visible={showValidationModal}
        transparent
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: insets.top + 10 }}>
          
          {/* Header Étape 2 - PROPRE ET HAUT */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '900', color: colors.gold, letterSpacing: 2, marginBottom: 8 }}>ÉTAPE 2 SUR 4</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
              <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 5 }} />
              <View style={{ width: 30, height: 2, backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
              <View style={{ width: 30, height: 2, backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 }}>APERÇU DE LA CARTE & CLOUD</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40, paddingHorizontal: 16 }}>
            {/* CARTE À PARTAGER (Aperçu) */}
            <View 
              style={{ 
                width: '100%', 
                maxWidth: 360, 
                borderRadius: 24,
                overflow: 'hidden',
                shadowColor: "#000",
                shadowOpacity: 0.8,
                shadowRadius: 30,
                elevation: 25,
                marginBottom: 30
              }}
            >
              <SessionCard
                training={{
                  sport: selectedSports.join(','),
                  duration_minutes: duration,
                  distance: distance ? parseFloat(distance.replace(',', '.')) : undefined,
                  calories: calories ? parseInt(calories) : undefined,
                  intensity: intensity,
                  heart_rate: heartRate ? parseInt(heartRate) : undefined,
                  date: date.toISOString(),
                  start_time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                  rounds: rounds ? parseInt(rounds) : undefined,
                  round_duration: roundDuration ? parseInt(roundDuration) : undefined,
                  club_logo: selectedClub?.logo_uri,
                  club_name: selectedClub?.name,
                  muscles: selectedMuscles.join(','),
                  exercises: exercises,
                  technique_rating: techniqueRating || undefined,
                  is_outdoor: isOutdoor,
                }}
                backgroundImage={userPhoto}
                backgroundType={userPhoto ? 'photo' : 'black'}
                isLandscape={false}
                width={360}
                yearlyCount={yearlyCount}
                monthlyCount={monthlyCount}
                weeklyCount={weeklyCount}
                yearlyObjective={yearlyObjective}
                showYearlyCount={true}
                showMonthlyCount={true}
                showWeeklyCount={true}
                showExercises={true}
              />
            </View>

            {/* ACTIONS - ÉTAPE 2 */}
            <View style={{ width: '100%', maxWidth: 360, gap: 12 }}>
              <TouchableOpacity 
                style={{ 
                  backgroundColor: colors.accent, 
                  paddingVertical: 20, 
                  borderRadius: 24, 
                  alignItems: 'center', 
                  flexDirection: 'row', 
                  justifyContent: 'center', 
                  gap: 12,
                  shadowColor: colors.accent,
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  elevation: 10
                }}
                onPress={() => {
                  setShowValidationModal(false);
                  if (lastSavedTrainingId) {
                    router.push(`/social-share/last-session?id=${lastSavedTrainingId}`);
                  } else {
                    router.push('/social-share/last-session');
                  }
                }}
              >
                <Share2 size={24} color={colors.textOnAccent} strokeWidth={2.5} />
                <Text style={{ color: colors.textOnAccent, fontWeight: '900', fontSize: 18, letterSpacing: 1 }}>PERSONNALISER & PARTAGER</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  paddingVertical: 18, 
                  borderRadius: 24, 
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)'
                }}
                onPress={() => {
                  setShowValidationModal(false);
                  handleFinish();
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 16 }}>TERMINER SANS PARTAGER</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL 2: NOTATION HOUARI */}
      <Modal
        visible={showHouariRateModal}
        transparent
        animationType="slide"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            
            {/* Logo Yoroi */}
            <View style={{ marginBottom: 20, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={{ width: 80, height: 80, borderRadius: 20 }}
                resizeMode="cover"
              />
            </View>

            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>
              Hello {userGender === 'female' ? 'Championne' : 'Champion'} {userName} ! 👋
            </Text>

            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              J'espère que tu apprécies l'app !{'\n'}
              S'il y a quoi que ce soit, n'hésite pas à me dire tes bugs et tes idées.
            </Text>

            {/* Bouton Boîte à Idées */}
            <TouchableOpacity 
              style={{ backgroundColor: colors.backgroundElevated, width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 24, flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.border }}
              onPress={() => {
                setShowHouariRateModal(false);
                router.push('/ideas');
              }}
            >
              <Lightbulb size={20} color={colors.accent} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Boîte à idées / Support</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              Si tu aimes, ça m'aiderait énormément d'être en haut dans la barre de recherche si tu me mets un 5 étoiles (si tu penses que je le mérite).
            </Text>

            {/* Bouton Note */}
            <TouchableOpacity 
              style={{ backgroundColor: colors.gold, width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 20, shadowColor: colors.gold, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
              onPress={async () => {
                const storeUrl = Platform.OS === 'ios' 
                  ? 'https://apps.apple.com/app/id6757306612?action=write-review' 
                  : 'market://details?id=com.houari.yoroi';
                await WebBrowser.openBrowserAsync(storeUrl);
                setShowHouariRateModal(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Star fill={colors.textOnGold} color={colors.textOnGold} size={20} />
                <Text style={{ color: colors.textOnGold, fontWeight: '800', fontSize: 18 }}>Donner de la force (5★)</Text>
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 14, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center' }}>
              Merci de faire partie de la famille Yoroi ❤️
            </Text>

            {/* Bouton Fermer */}
            <TouchableOpacity 
              style={{ padding: 16, marginTop: 10 }}
              onPress={handleCloseHouariModal}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Plus tard</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      <PopupComponent />
      <ReviewModalComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },

  // SECTION
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // QUICK ADD
  quickAddButton: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  quickAddIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddContent: {
    flex: 1,
  },
  quickAddTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  // ADD ANOTHER SPORT BUTTON
  addAnotherSportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: SPACING.lg,
  },
  addAnotherSportText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  addSportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  quickAddSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },

  // SELECTED SPORTS SECTION
  selectedSportsSection: {
    marginBottom: SPACING.lg,
  },
  selectedSportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  selectedSportsHint: {
    fontSize: FONT_SIZE.xs,
  },
  selectedSportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  selectedSportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  selectedSportChipText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  customSportInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  customSportInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    paddingVertical: SPACING.sm,
  },

  // SPORT OPTIONS SECTION (Qu'as-tu fait?)
  sportOptionsSection: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sportOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sportOptionsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  sportOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sportOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
  },
  sportOptionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },

  // CUSTOM DESCRIPTION
  customDescriptionSection: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  customDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  customDescriptionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  customDescriptionInput: {
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // CATEGORY HEADER - Nouveau design avec icône
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SPORTS GRID (Vertical)
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingHorizontal: 4,
  },
  sportGridItem: {
    width: (SCREEN_WIDTH - SPACING.xl * 2 - SPACING.sm * 3) / 4,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    position: 'relative',
  },
  sportGridIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sportGridName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  sportGridCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SELECTED SPORT BANNER
  selectedSportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  selectedSportIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSportInfo: {
    flex: 1,
  },
  selectedSportName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  selectedSportCategory: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },

  // SPORTS
  sportsScroll: {
    marginTop: SPACING.sm,
  },
  categorySection: {
    marginBottom: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categorySportCount: {
    fontSize: FONT_SIZE.xs,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sportsContainer: {
    paddingHorizontal: SPACING.xl,
    gap: 10,
  },
  sportItem: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg, // Moins de padding sur petits écrans
    borderWidth: 1,
    minWidth: 80,
  },
  sportItemActive: {
    // Colors applied inline
  },
  sportIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  checkmarkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sportName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  sportNameActive: {
    // Colors applied inline
  },

  // LIEU - Type de lieu (En salle / Plein air)
  locationTypeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  locationTypeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
  },
  locationTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  locationTypeLabel: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  clubSectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  // CLUBS - Nouveau design horizontal
  clubsScroll: {
    marginHorizontal: -20,
    marginBottom: SPACING.lg,
  },
  clubsScrollContent: {
    paddingHorizontal: SPACING.xl,
    gap: 12,
  },
  clubCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: IS_SMALL_SCREEN ? SPACING.sm : SPACING.md, // Padding adaptatif
    borderWidth: 2,
    minWidth: IS_SMALL_SCREEN ? 80 : 90, // Plus compact sur petits écrans
    maxWidth: 100,
  },
  clubCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clubCardEmoji: {
    fontSize: 24,
  },
  clubCardLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  clubCardName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legacy clubs (pour compatibilité)
  clubsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  clubDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clubLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  clubItemText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },

  // DATE
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // TIME
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  timeText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
  },
  endTimeText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'left',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    marginLeft: 4,
  },

  // DURATION
  durationContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  durationItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  durationItemActive: {
    // Colors applied inline
  },
  durationText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  durationTextActive: {
    // Colors applied inline
  },
  durationChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
    flexWrap: 'nowrap',
  },
  customDurationLabel: {
    fontSize: FONT_SIZE.sm,
    flexShrink: 0,
  },
  customDurationInput: {
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  customDurationUnit: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    flexShrink: 0,
  },

  // SPORT ENTRIES (notes personnalisées par sport)
  sportEntriesSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  sportEntriesTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  sportEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  sportEntryText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    marginRight: SPACING.sm,
  },
  sportEntryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sportEntryInput: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.sm,
    borderWidth: 1,
  },
  sportEntryAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // MUSCLES
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  muscleItemActive: {
    // Colors applied inline
  },
  muscleName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  muscleNameActive: {
    // Colors applied inline
  },

  // EXERCISES
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  addExerciseText: {
    color: '#FFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  exercisesList: {
    gap: 10,
    marginBottom: SPACING.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: FONT_SIZE.xs,
  },
  removeExerciseButton: {
    padding: 4,
  },

  // NOTES
  notesInput: {
    borderRadius: RADIUS.md,
    padding: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg, // Padding adaptatif
    fontSize: IS_SMALL_SCREEN ? 14 : 15, // Plus petit sur petits écrans
    borderWidth: 1,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // TECHNIQUE RATING
  techniqueSection: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: 24,
    borderWidth: 1,
  },
  techniqueSectionHeader: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  techniqueSectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  techniqueSectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: IS_SMALL_SCREEN ? 6 : 8, // Moins d'espace entre étoiles sur petits écrans
    marginBottom: 4,
  },
  starButton: {
    padding: 4,
  },
  starsLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: SPACING.md,
  },
  starLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  techniqueInfo: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  techniqueInfoText: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },

  // SAVE
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  proStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  proStatItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  proStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  proStatInput: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  intensityStep: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  scienceNote: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.6,
    paddingHorizontal: 10,
    lineHeight: 12,
  },
});
