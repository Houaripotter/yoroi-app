import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Flame,
  Target,
  Activity,
  Ruler,
  Heart,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import DisciplineTab from '@/components/stats/DisciplineTab';
import PoidsTab from '@/components/stats/PoidsTab';
import CompositionTab from '@/components/stats/CompositionTab';
import MesuresTab from '@/components/stats/MesuresTab';
import VitaliteTab from '@/components/stats/VitaliteTab';
import PerformanceTab from '@/components/stats/PerformanceTab';

type StatsTab = 'discipline' | 'poids' | 'composition' | 'mesures' | 'vitalite' | 'performance';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<StatsTab>((params.tab as StatsTab) || 'discipline');

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Statistiques</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Onglets */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {[
            { id: 'discipline' as StatsTab, label: 'Discipline', icon: Flame },
            { id: 'poids' as StatsTab, label: 'Poids', icon: Target },
            { id: 'composition' as StatsTab, label: 'Compo', icon: Activity },
            { id: 'mesures' as StatsTab, label: 'Mesures', icon: Ruler },
            { id: 'vitalite' as StatsTab, label: 'Vitalité', icon: Heart },
            { id: 'performance' as StatsTab, label: 'Perf', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  { backgroundColor: isActive ? colors.accent : colors.backgroundCard },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Icon size={14} color={isActive ? colors.textOnAccent : colors.textMuted} />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.textOnAccent : colors.textMuted },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'discipline' && <DisciplineTab />}
        {activeTab === 'poids' && <PoidsTab />}
        {activeTab === 'composition' && <CompositionTab />}
        {activeTab === 'mesures' && <MesuresTab />}
        {activeTab === 'vitalite' && <VitaliteTab />}
        {activeTab === 'performance' && <PerformanceTab />}

        <View style={{ height: 40 }} />
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
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabsContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

