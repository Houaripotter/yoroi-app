// ============================================
// SPORT PACK SWITCHER · petite barre horizontale pour changer de pack
// Visible en haut du Carnet
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Swords, Activity, Dumbbell, Mountain, Zap } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useSportPack } from '@/lib/SportPackContext';
import { PACK_META, type SportPack } from '@/lib/sportPacks';

const PACKS_ORDER: SportPack[] = ['combat', 'endurance', 'force', 'musculation', 'nature'];

const PACK_ICONS: Record<SportPack, React.ComponentType<{ size?: number; color?: string }>> = {
  combat: Swords,
  endurance: Activity,
  force: Zap,
  musculation: Dumbbell,
  nature: Mountain,
  all: Activity,
};

export default function SportPackSwitcher() {
  const { colors, isDark } = useTheme();
  const { activePack, setActivePack } = useSportPack();

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PACKS_ORDER.map(key => {
          const meta = PACK_META[key];
          const Icon = PACK_ICONS[key];
          const active = activePack === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setActivePack(key); }}
              activeOpacity={0.8}
              style={[styles.chip, {
                backgroundColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.18)',
                borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                borderWidth: 1,
              }]}
            >
              <Icon size={13} color={active ? meta.color : '#FFFFFF'} />
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: active ? meta.color : '#FFFFFF',
                letterSpacing: 0.3,
              }}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 0, paddingBottom: 0 },
  row: { flexDirection: 'row', gap: 6, paddingLeft: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
