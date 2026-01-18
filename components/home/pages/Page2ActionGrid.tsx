// ============================================
// PAGE 2 - ACTION GRID (Outils)
// Version simplifiée sans drag & drop
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import {
  BookOpen,
  Timer,
  Calculator,
  Clock,
  Camera,
  Share2,
  User,
  Palette,
  Sparkles,
  Trophy,
  Utensils,
  Bell,
  Heart,
  Users,
  BookMarked,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getActionGridOrder, ActionGridItem } from '@/lib/actionGridCustomizationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 12;
const COLUMNS = 3;
const ICON_SIZE = 24;

const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  'BookOpen': BookOpen,
  'Timer': Timer,
  'BookMarked': BookMarked,
  'Calculator': Calculator,
  'Clock': Clock,
  'Camera': Camera,
  'Share2': Share2,
  'User': User,
  'Palette': Palette,
  'Sparkles': Sparkles,
  'Trophy': Trophy,
  'Utensils': Utensils,
  'Bell': Bell,
  'Heart': Heart,
  'Users': Users,
  'Plus': Plus,
};

const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || BookOpen;
};

const cardWidth = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

// Map tool IDs to translation keys
const TOOL_TRANSLATION_KEYS: { [key: string]: { label: string; description: string } } = {
  'blessures': { label: 'tools.injuries', description: 'tools.injuriesDescription' },
  'infirmerie': { label: 'tools.injuries', description: 'tools.injuriesDescription' },
  'timer': { label: 'tools.timer', description: 'tools.timerDescription' },
  'carnet': { label: 'tools.journal', description: 'tools.journalDescription' },
  'calculateurs': { label: 'tools.calculators', description: 'tools.calculatorsDescription' },
  'jeune': { label: 'tools.fasting', description: 'tools.fastingDescription' },
  'nutrition': { label: 'tools.nutrition', description: 'tools.nutritionDescription' },
  'health': { label: 'tools.appleHealth', description: 'tools.appleHealthDescription' },
  'savoir': { label: 'tools.knowledge', description: 'tools.knowledgeDescription' },
  'dojo': { label: 'tools.myDojo', description: 'tools.myDojoDescription' },
  'notifications': { label: 'tools.notifications', description: 'tools.notificationsDescription' },
  'partager': { label: 'tools.share', description: 'tools.shareDescription' },
  'clubs': { label: 'tools.clubsCoach', description: 'tools.clubsCoachDescription' },
  'competiteur': { label: 'tools.compete', description: 'tools.competeDescription' },
  'profil': { label: 'tools.profile', description: 'tools.profileDescription' },
  'themes': { label: 'tools.themes', description: 'tools.themesDescription' },
  'photos': { label: 'tools.photos', description: 'tools.photosDescription' },
};

export const Page2ActionGrid: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [gridItems, setGridItems] = useState<ActionGridItem[]>([]);

  useEffect(() => {
    loadGridOrder();
  }, []);

  const loadGridOrder = async () => {
    const items = await getActionGridOrder();
    setGridItems(items);
  };

  const handleItemPress = (item: ActionGridItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(item.route as any);
  };

  const rows: ActionGridItem[][] = [];
  for (let i = 0; i < gridItems.length; i += COLUMNS) {
    rows.push(gridItems.slice(i, i + COLUMNS));
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(_, index) => `row-${index}`}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t('tools.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {t('tools.subtitle')}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((item) => {
              const Icon = getIconComponent(item.icon);
              const translationKeys = TOOL_TRANSLATION_KEYS[item.id];
              const label = translationKeys ? t(translationKeys.label) : item.label;
              const description = translationKeys ? t(translationKeys.description) : item.description;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleItemPress(item)}
                  style={styles.gridItemWrapper}
                  activeOpacity={0.85}
                >
                  <View style={[styles.gridItem, { backgroundColor: colors.backgroundCard }]}>
                    <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
                      {item.id === 'infirmerie' ? (
                        // Croix rouge plus grande pour l'infirmerie
                        <View style={styles.redCross}>
                          <View style={[styles.crossVertical, { backgroundColor: item.color }]} />
                          <View style={[styles.crossHorizontal, { backgroundColor: item.color }]} />
                        </View>
                      ) : (
                        <Icon size={ICON_SIZE} color={item.color} strokeWidth={2.5} />
                      )}
                    </View>
                    <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={2}>
                      {label}
                    </Text>
                    <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                      {description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {row.length < COLUMNS &&
              Array.from({ length: COLUMNS - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: cardWidth }} />
              ))}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 250,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    marginBottom: GRID_GAP,
  },
  gridItemWrapper: {
    width: cardWidth,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  gridItem: {
    aspectRatio: 0.85,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  // Croix rouge pour l'infirmerie
  redCross: {
    width: 28,
    height: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 10,
    height: 28,
    borderRadius: 2,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 28,
    height: 10,
    borderRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 4,
    lineHeight: 18,
    minHeight: 36,
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    opacity: 0.9,
  },
});
