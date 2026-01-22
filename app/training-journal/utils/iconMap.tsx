/**
 * Icon Map for Training Journal
 * Maps icon names to Lucide React components
 */

import React from 'react';
import {
  Dumbbell,
  Timer,
  Mountain,
  Flame,
  Target,
  Shield,
  Move,
  Lock,
  Users,
  Zap,
  Scale,
  Swords,
  BarChart3,
  Footprints,
  BookOpen,
} from 'lucide-react-native';

export const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  dumbbell: Dumbbell,
  timer: Timer,
  mountain: Mountain,
  flame: Flame,
  target: Target,
  shield: Shield,
  move: Move,
  lock: Lock,
  users: Users,
  zap: Zap,
  scale: Scale,
  swords: Swords,
  'bar-chart': BarChart3,
  footprints: Footprints,
  'book-open': BookOpen,
};

export const renderIcon = (iconName: string, size: number, color: string) => {
  const IconComponent = ICON_MAP[iconName] || Target;
  return <IconComponent size={size} color={color} />;
};
