// ============================================
// GUIDE DE L'APP - Cartes extensibles
// Remplace help-tutorials.tsx
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Home,
  BarChart3,
  Calendar,
  Plus,
  Menu,
  BookOpen,
  Zap,
  User,
  Sparkles,
  Layout,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import { GUIDE_SECTIONS, resetAllTips, GuideSection } from '@/lib/contextualTipsService';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  home: Home,
  'bar-chart': BarChart3,
  calendar: Calendar,
  plus: Plus,
  menu: Menu,
  book: BookOpen,
  zap: Zap,
  user: User,
  sparkles: Sparkles,
  layout: Layout,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GuideScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [resetDone, setResetDone] = useState(false);

  const toggleCard = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReset = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    await resetAllTips();
    setResetDone(true);
    notificationAsync(NotificationFeedbackType.Success);
    setTimeout(() => setResetDone(false), 3000);
  };

  const renderCard = (section: GuideSection) => {
    // Sections de groupe (sans tips) = titres de section
    if (section.tips.length === 0) {
      return (
        <View key={section.id} style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {section.title.toUpperCase()}
          </Text>
        </View>
      );
    }

    const isExpanded = expandedCards.has(section.id);
    const IconComponent = ICON_MAP[section.icon];

    return (
      <TouchableOpacity
        key={section.id}
        style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}
        onPress={() => toggleCard(section.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: section.color + '20' }]}>
            {IconComponent && <IconComponent size={20} color={section.color} />}
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.cardDescription, { color: colors.textMuted }]} numberOfLines={1}>
              {section.description}
            </Text>
          </View>
          {isExpanded ? (
            <ChevronDown size={20} color={colors.textMuted} />
          ) : (
            <ChevronRight size={20} color={colors.textMuted} />
          )}
        </View>

        {isExpanded && (
          <View style={[styles.tipsContainer, { borderTopColor: colors.borderLight }]}>
            {section.tips.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: section.color }]} />
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {tip.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Guide de l'app</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <Text style={[styles.introTitle, { color: colors.text }]}>
            Bienvenue dans Yoroi
          </Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Appuie sur une carte pour voir les astuces detaillees de chaque ecran.
          </Text>
        </View>

        {/* Toutes les sections */}
        {GUIDE_SECTIONS.map(renderCard)}

        {/* Bouton Reset */}
        <TouchableOpacity
          style={[
            styles.resetButton,
            {
              backgroundColor: resetDone ? '#10B981' : colors.backgroundCard,
              borderColor: resetDone ? '#10B981' : colors.borderLight,
            },
          ]}
          onPress={handleReset}
          disabled={resetDone}
          activeOpacity={0.7}
        >
          {resetDone ? (
            <>
              <Check size={18} color="#FFFFFF" />
              <Text style={[styles.resetText, { color: '#FFFFFF' }]}>Astuces reinitialises</Text>
            </>
          ) : (
            <>
              <RotateCcw size={18} color={colors.accent} />
              <Text style={[styles.resetText, { color: colors.accent }]}>Revoir les astuces</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  introCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  tipsContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    marginRight: 8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 20,
    gap: 8,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
