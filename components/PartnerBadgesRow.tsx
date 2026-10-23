// ============================================
// PARTNER BADGES ROW : Affiche les badges deverrouilles
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import type { PartnerBadge } from '@/lib/partnerModel';

interface Props {
  badges: PartnerBadge[];
}

export const PartnerBadgesRow: React.FC<Props> = ({ badges }) => {
  const { colors } = useTheme();
  if (!badges || badges.length === 0) return null;

  return (
    <View>
      <Text style={[styles.header, { color: colors.text }]}>Badges deverrouilles</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {badges.map(b => {
          const Icon = (LucideIcons as any)[b.icon] || LucideIcons.Award;
          return (
            <View
              key={b.id}
              style={[styles.badge, { backgroundColor: b.color + '20', borderColor: b.color + '60' }]}
            >
              <Icon size={18} color={b.color} strokeWidth={2.3} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: b.color }]} numberOfLines={1}>{b.name}</Text>
                <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={1}>{b.description}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 220,
  },
  name: { fontSize: 12, fontWeight: '800' },
  desc: { fontSize: 10, fontWeight: '500' },
});

export default React.memo(PartnerBadgesRow);
