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
  const { colors, isDark, themeColor } = useTheme();
  const { activePack, setActivePack } = useSportPack();

  const isBlancTheme = themeColor === 'blanc';

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

          // Thème blanc : fond sombre (accent) pour actif, backgroundCard + bordure visible pour inactif
          const chipBackground = active
            ? (isBlancTheme ? colors.accent : '#FFFFFF')
            : (isBlancTheme ? colors.backgroundCard : 'rgba(255,255,255,0.18)');
          const chipBorder = active
            ? (isBlancTheme ? colors.accent : '#FFFFFF')
            : (isBlancTheme ? colors.border : 'rgba(255,255,255,0.4)');
          const chipTextColor = active
            ? (isBlancTheme ? '#FFFFFF' : meta.color)
            : (isBlancTheme ? colors.textPrimary : '#FFFFFF');

          return (
            <TouchableOpacity
              key={key}
              onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setActivePack(key); }}
              activeOpacity={0.8}
              style={[styles.chip, {
                backgroundColor: chipBackground,
                borderColor: chipBorder,
                borderWidth: 1,
              }]}
            >
              <Icon size={13} color={chipTextColor} />
              <Text style={{
                fontSize: 11,
                fontWeight: '900',
                color: chipTextColor,
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
