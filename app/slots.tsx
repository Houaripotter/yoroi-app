// ============================================
// ECRAN CRENEAUX REGULIERS
// Page plein ecran pour gerer ses entrainements recurrents
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ManageSlotsModal } from '@/components/planning/ManageSlotsModal';
import { useRouter } from 'expo-router';

export default function SlotsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ManageSlotsModal
        visible={true}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
