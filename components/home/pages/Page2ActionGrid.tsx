// ============================================
// PAGE 2 - ACTION GRID (Outils)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import {
  BookOpen,
  Timer,
  Calendar,
  LayoutGrid,
  Plus,
  Zap,
  BookMarked,
  Calculator,
  Target,
  Clock,
  Camera,
  Share2
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 16;
const COLUMNS = 4;
const ICON_SIZE = 32;

interface GridItem {
  id: string;
  label: string;
  icon: any;
  color: string;
  route: string;
}

const GRID_ITEMS: GridItem[] = [
  { id: 'carnet', label: 'Carnet', icon: BookOpen, color: '#F97316', route: '/training-journal' },
  { id: 'timer', label: 'Timer', icon: Timer, color: '#3B82F6', route: '/timer' },
  { id: 'calendrier', label: 'Calendrier', icon: Calendar, color: '#8B5CF6', route: '/calendar' },
  { id: 'planning', label: 'Planning', icon: LayoutGrid, color: '#10B981', route: '/planning' },
  { id: 'blessures', label: 'Blessures', icon: Plus, color: '#EF4444', route: '/infirmary' },
  { id: 'energie', label: 'Énergie', icon: Zap, color: '#F59E0B', route: '/energy' },
  { id: 'savoir', label: 'Savoir', icon: BookMarked, color: '#06B6D4', route: '/knowledge' },
  { id: 'calculs', label: 'Calculs', icon: Calculator, color: '#6366F1', route: '/calculators' },
  { id: 'objectif', label: 'Objectif', icon: Target, color: '#EC4899', route: '/challenges' },
  { id: 'jeune', label: 'Jeûne', icon: Clock, color: '#14B8A6', route: '/fasting' },
  { id: 'photo', label: 'Photo', icon: Camera, color: '#A855F7', route: '/progress-photos' },
  { id: 'partager', label: 'Partager', icon: Share2, color: '#84CC16', route: '/share' },
];

export const Page2ActionGrid: React.FC = () => {
  const { colors, isDark } = useTheme();

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const cardWidth = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Outils</Text>

      <View style={styles.grid}>
        {GRID_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.gridItem,
                {
                  width: cardWidth,
                  backgroundColor: colors.backgroundCard,
                }
              ]}
              onPress={() => handlePress(item.route)}
              activeOpacity={0.7}
            >
              {/* Icône avec background coloré */}
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Icon size={ICON_SIZE} color={item.color} strokeWidth={2} />
              </View>

              {/* Label */}
              <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 24,
    letterSpacing: -1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    aspectRatio: 1,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
