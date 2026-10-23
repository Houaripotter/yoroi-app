// ============================================
// CROSS PLATFORM MIGRATION BUTTON
// Bouton d'entrée vers le modal CrossPlatformMigration.
// À placer dans la page Mes Sauvegardes.
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Smartphone, ArrowRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { CrossPlatformMigration } from './CrossPlatformMigration';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { traduire } from '@/lib/i18n/tr';

const CrossPlatformMigrationButtonInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); setVisible(true); }}
        activeOpacity={0.8}
        style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: '#0EA5E940' }]}
        accessibilityLabel={traduire("Migrer vers un autre appareil")}
        accessibilityRole="button"
      >
        <View style={styles.iconWrap}>
          <Smartphone size={18} color="#0EA5E9" />
          <ArrowRight size={12} color="#0EA5E9" style={{ marginHorizontal: 2 }} />
          <Smartphone size={18} color="#0EA5E9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{traduire("Migrer vers un autre appareil")}</Text>
          <Text style={[styles.sub, { color: colors.textMuted ?? '#888' }]}>
            {traduire("iPhone ↔ Android ↔ iPad ↔ Tablette. Tous les sens supportés.")}</Text>
        </View>
        <ArrowRight size={16} color="#0EA5E9" />
      </TouchableOpacity>

      <CrossPlatformMigration visible={visible} onClose={() => setVisible(false)} />
    </>
  );
};

export const CrossPlatformMigrationButton = React.memo(CrossPlatformMigrationButtonInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginTop: 10, padding: 14,
    borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconWrap: {
    flexDirection: 'row', alignItems: 'center',
    padding: 8, borderRadius: 10, backgroundColor: 'rgba(14,165,233,0.12)',
  },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
});
