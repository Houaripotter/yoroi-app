import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { AddClubModal } from '@/components/planning/AddClubModal';

// ============================================
// ADD CLUB - Redirige vers AddClubModal unifie
// ============================================

export default function AddClubScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AddClubModal
        visible={visible}
        onClose={() => {
          setVisible(false);
          router.back();
        }}
        onSave={() => {
          setVisible(false);
          router.back();
        }}
      />
    </View>
  );
}
