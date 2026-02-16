// ============================================
// YOROI - COMPOSANT ICÔNES RÉUTILISABLE
// ============================================
// Wrapper pour les icônes Lucide avec styles cohérents
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import logger from '@/lib/security/logger';
import {
  // Navigation & Actions
  Timer,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Plus,
  Minus,
  Settings,
  Home,
  Menu,

  // Stats & Data
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Flame,

  // Health & Fitness
  Heart,
  Droplets,
  Moon,
  Sun,
  Sunrise,

  // Body & Physical
  Ruler,
  Scale,
  Dumbbell,

  // Media
  Camera,
  Image,
  Share2,
  Download,
  Upload,

  // Tools
  Calculator,
  Calendar,
  Clock,
  Bell,

  // People & Social
  User,
  Users,
  UserPlus,
  Award,
  Trophy,
  Medal,
  Crown,
  Star,

  // Nature & Elements
  Leaf,
  Sparkles,

  // Sports & Combat
  Swords,
  Sword,
  Shield,

  // Places & Buildings
  Castle,

  // Education
  GraduationCap,

  // Communication
  Mail,
  MessageCircle,
  Send,

  // Files & Data
  FileText,
  FolderOpen,
  Save,
  Trash2,

  // Info
  Info,
  HelpCircle,
  AlertTriangle,
  AlertCircle,

  // Food & Nutrition
  Utensils,
  Apple,
  Coffee,

  // Misc
  Gift,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ExternalLink,
  MapPin,
  Grip,
  RotateCcw,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react-native';

// ============================================
// TYPES
// ============================================

export type IconName =
  // Navigation & Actions
  | 'timer'
  | 'play'
  | 'pause'
  | 'stop'
  | 'back'
  | 'forward'
  | 'down'
  | 'up'
  | 'close'
  | 'check'
  | 'plus'
  | 'minus'
  | 'settings'
  | 'home'
  | 'menu'
  // Stats & Data
  | 'chart'
  | 'trending-up'
  | 'trending-down'
  | 'activity'
  | 'target'
  | 'energy'
  | 'flame'
  // Health & Fitness
  | 'heart'
  | 'water'
  | 'moon'
  | 'sun'
  | 'sunrise'
  // Body & Physical
  | 'ruler'
  | 'scale'
  | 'dumbbell'
  // Media
  | 'camera'
  | 'image'
  | 'share'
  | 'download'
  | 'upload'
  // Tools
  | 'calculator'
  | 'calendar'
  | 'clock'
  | 'bell'
  // People & Social
  | 'user'
  | 'users'
  | 'user-plus'
  | 'award'
  | 'trophy'
  | 'medal'
  | 'crown'
  | 'star'
  // Nature & Elements
  | 'leaf'
  | 'sparkles'
  // Sports & Combat
  | 'swords'
  | 'sword'
  | 'shield'
  // Places & Buildings
  | 'castle'
  // Education
  | 'graduation-cap'
  // Communication
  | 'mail'
  | 'message'
  | 'send'
  // Files & Data
  | 'file'
  | 'folder'
  | 'save'
  | 'trash'
  // Info
  | 'info'
  | 'help'
  | 'warning'
  | 'error'
  // Food & Nutrition
  | 'utensils'
  | 'apple'
  | 'coffee'
  // Misc
  | 'gift'
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eye-off'
  | 'external'
  | 'location'
  | 'grip'
  | 'reset'
  | 'refresh';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export interface IconBadgeProps extends IconProps {
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<IconName, LucideIcon> = {
  // Navigation & Actions
  timer: Timer,
  play: Play,
  pause: Pause,
  stop: Square,
  back: ChevronLeft,
  forward: ChevronRight,
  down: ChevronDown,
  up: ChevronUp,
  close: X,
  check: Check,
  plus: Plus,
  minus: Minus,
  settings: Settings,
  home: Home,
  menu: Menu,
  // Stats & Data
  chart: BarChart3,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  activity: Activity,
  target: Target,
  energy: Zap,
  flame: Flame,
  // Health & Fitness
  heart: Heart,
  water: Droplets,
  moon: Moon,
  sun: Sun,
  sunrise: Sunrise,
  // Body & Physical
  ruler: Ruler,
  scale: Scale,
  dumbbell: Dumbbell,
  // Media
  camera: Camera,
  image: Image,
  share: Share2,
  download: Download,
  upload: Upload,
  // Tools
  calculator: Calculator,
  calendar: Calendar,
  clock: Clock,
  bell: Bell,
  // People & Social
  user: User,
  users: Users,
  'user-plus': UserPlus,
  award: Award,
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  star: Star,
  // Nature & Elements
  leaf: Leaf,
  sparkles: Sparkles,
  // Sports & Combat
  swords: Swords,
  sword: Sword,
  shield: Shield,
  // Places & Buildings
  castle: Castle,
  // Education
  'graduation-cap': GraduationCap,
  // Communication
  mail: Mail,
  message: MessageCircle,
  send: Send,
  // Files & Data
  file: FileText,
  folder: FolderOpen,
  save: Save,
  trash: Trash2,
  // Info
  info: Info,
  help: HelpCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  // Food & Nutrition
  utensils: Utensils,
  apple: Apple,
  coffee: Coffee,
  // Misc
  gift: Gift,
  lock: Lock,
  unlock: Unlock,
  eye: Eye,
  'eye-off': EyeOff,
  external: ExternalLink,
  location: MapPin,
  grip: Grip,
  reset: RotateCcw,
  refresh: RefreshCw,
};

// ============================================
// COMPOSANTS
// ============================================

/**
 * Icône simple
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#888888', // Couleur neutre par défaut qui fonctionne dans les deux modes
  strokeWidth = 2,
}) => {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    logger.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
};

/**
 * Icône avec fond coloré (badge)
 */
export const IconBadge: React.FC<IconBadgeProps> = ({
  name,
  size = 24,
  color = '#888888', // Couleur neutre par défaut qui fonctionne dans les deux modes
  strokeWidth = 2,
  backgroundColor = 'rgba(255,255,255,0.1)',
  padding = 12,
  borderRadius = 12,
}) => {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          padding,
          borderRadius,
        },
      ]}
    >
      <Icon name={name} size={size} color={color} strokeWidth={strokeWidth} />
    </View>
  );
};

// ============================================
// RACCOURCIS SPÉCIALISÉS
// ============================================

// Icônes pour les raccourcis de l'écran d'accueil
export const ShortcutIcons = {
  timer: Timer,
  stats: BarChart3,
  calculator: Calculator,
  camera: Camera,
  water: Droplets,
  ruler: Ruler,
  calendar: Calendar,
  weight: Scale,
  heart: Heart,
  dumbbell: Dumbbell,
};

// Icônes pour les rangs
export const RankIcons = {
  target: Target,              // Recrue
  swords: Swords,              // Ashigaru
  sword: Sword,                // Samouraï
  moon: Moon,                  // Rōnin
  'graduation-cap': GraduationCap,  // Sensei
  crown: Crown,                // Shōgun
  castle: Castle,              // Daimyō
  shield: Shield,              // Legacy
  award: Award,                // Legacy
  medal: Medal,                // Legacy
  star: Star,                  // Legacy
  trophy: Trophy,              // Legacy
};

// Icônes pour la nutrition
export const NutritionIcons = {
  flame: Flame,        // Calories
  dumbbell: Dumbbell,  // Protéines
  energy: Zap,         // Glucides
  water: Droplets,     // Lipides
  utensils: Utensils,  // Repas
  apple: Apple,        // Fruits/Légumes
  coffee: Coffee,      // Boissons
};

// Icônes pour les partenaires
export const PartnerIcons = {
  user: User,          // Coach
  users: Users,        // Club
  star: Star,          // Featured
  location: MapPin,    // Localisation
  external: ExternalLink, // Lien externe
  mail: Mail,          // Contact
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================
// EXPORTS
// ============================================

export {
  // Lucide icons réexportées pour usage direct
  Timer,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Plus,
  Minus,
  Settings,
  Home,
  Menu,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Flame,
  Heart,
  Droplets,
  Moon,
  Sun,
  Sunrise,
  Ruler,
  Scale,
  Dumbbell,
  Camera,
  Image,
  Share2,
  Download,
  Upload,
  Calculator,
  Calendar,
  Clock,
  Bell,
  User,
  Users,
  UserPlus,
  Award,
  Trophy,
  Medal,
  Crown,
  Star,
  Leaf,
  Sparkles,
  Swords,
  Shield,
  Mail,
  MessageCircle,
  Send,
  FileText,
  FolderOpen,
  Save,
  Trash2,
  Info,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  Utensils,
  Apple,
  Coffee,
  Gift,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ExternalLink,
  MapPin,
  Grip,
  RotateCcw,
  RefreshCw,
};

export default Icon;
