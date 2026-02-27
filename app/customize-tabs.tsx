// ============================================
// YOROI - PERSONNALISATION ORDRE TABBAR
// Liste plate avec toggle visibilite
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  RotateCcw,
  Home,
  BarChart2,
  BookOpen,
  Plus,
  Calendar,
  Wrench,
  User,
  Settings,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  TabItem,
  getTabOrder,
  saveTabOrder,
  resetTabOrder,
  getEnabledTabs,
  DEFAULT_TAB_ORDER,
} from '@/lib/tabOrderService';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

const ICON_MAP: Record<string, any> = {
  Home,
  BarChart2,
  BookOpen,
  Plus,
  Calendar,
  Wrench,
  User,
  Settings,
};

export default function CustomizeTabsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [tabs, setTabs] = useState<TabItem[]>(DEFAULT_TAB_ORDER);

  useEffect(() => {
    getTabOrder().then(setTabs);
  }, []);

  const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);
  const enabledTabs = getEnabledTabs(tabs);

  const save = (updated: TabItem[]) => {
    setTabs(updated);
    saveTabOrder(updated);
  };

  const moveUp = (id: string) => {
    const sorted = [...tabs].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(t => t.id === id);
    if (idx <= 0) return;
    impactAsync(ImpactFeedbackStyle.Light);

    const reordered = [...sorted];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    const withNewOrder = reordered.map((t, i) => ({ ...t, order: i }));
    save(withNewOrder);
  };

  const moveDown = (id: string) => {
    const sorted = [...tabs].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(t => t.id === id);
    if (idx >= sorted.length - 1) return;
    impactAsync(ImpactFeedbackStyle.Light);

    const reordered = [...sorted];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    const withNewOrder = reordered.map((t, i) => ({ ...t, order: i }));
    save(withNewOrder);
  };

  const toggleEnabled = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;

    // If disabling, check we keep at least 1 enabled
    if (tab.enabled) {
      const enabledCount = tabs.filter(t => t.enabled).length;
      if (enabledCount <= 1) return;
    }

    impactAsync(ImpactFeedbackStyle.Medium);
    const updated = tabs.map(t =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    );
    save(updated);
  };

  const handleReset = async () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    await resetTabOrder();
    setTabs(DEFAULT_TAB_ORDER);
    notificationAsync(NotificationFeedbackType.Success);
  };

  const renderPreview = () => {
    const previewTabs = enabledTabs;
    const numTabs = previewTabs.length;
    const previewWidth = Math.min(Math.max(numTabs * 40 + 16, 140), 340);

    return (
      <View style={[styles.preview, {
        backgroundColor: isDark ? '#1A1A1E' : colors.accent,
        width: previewWidth,
      }]}>
        {previewTabs.map(t => {
          const Icon = ICON_MAP[t.icon];
          return Icon ? (
            <View key={t.id} style={styles.previewTab}>
              <Icon size={16} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)'} strokeWidth={1.8} />
            </View>
          ) : null;
        })}
      </View>
    );
  };

  const renderTabItem = (tab: TabItem, index: number, total: number) => {
    const Icon = ICON_MAP[tab.icon];
    const isEnabled = tab.enabled;
    const enabledCount = tabs.filter(t => t.enabled).length;
    const canDisable = !isEnabled || enabledCount > 1;

    return (
      <View
        key={tab.id}
        style={[
          styles.item,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: isEnabled ? 1 : 0.5,
          },
        ]}
      >
        <View style={styles.itemLeft}>
          <GripVertical size={16} color={colors.textMuted} />
          <View style={[styles.itemIcon, { backgroundColor: `${colors.accent}15` }]}>
            {Icon && <Icon size={18} color={colors.accent} strokeWidth={2} />}
          </View>
          <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{tab.label}</Text>
        </View>

        <View style={styles.itemActions}>
          {/* Toggle visibility */}
          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: isEnabled ? `${colors.accent}15` : `${colors.textMuted}15`,
            }]}
            onPress={() => toggleEnabled(tab.id)}
            activeOpacity={0.6}
            disabled={!canDisable}
          >
            {isEnabled ? (
              <Eye size={14} color={colors.accent} strokeWidth={2.5} />
            ) : (
              <EyeOff size={14} color={colors.textMuted} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {/* Move up */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.backgroundElevated, opacity: index === 0 ? 0.3 : 1 }]}
            onPress={() => moveUp(tab.id)}
            disabled={index === 0}
            activeOpacity={0.6}
          >
            <ChevronUp size={14} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Move down */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.backgroundElevated, opacity: index === total - 1 ? 0.3 : 1 }]}
            onPress={() => moveDown(tab.id)}
            disabled={index === total - 1}
            activeOpacity={0.6}
          >
            <ChevronDown size={14} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Barre de navigation</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
            <RotateCcw size={18} color={colors.accent} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Apercu */}
        <View style={styles.previewSection}>
          <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Apercu</Text>
          {renderPreview()}
          <Text style={[styles.previewCount, { color: colors.textMuted }]}>
            {enabledTabs.length} onglet{enabledTabs.length > 1 ? 's' : ''} actif{enabledTabs.length > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Liste plate */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Onglets</Text>
          {sortedTabs.map((tab, i) => renderTabItem(tab, i, sortedTabs.length))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  resetBtn: { padding: 4 },

  // Preview
  previewSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  previewCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 8,
    gap: 2,
  },
  previewTab: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
