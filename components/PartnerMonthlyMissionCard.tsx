// ============================================
// PARTNER MONTHLY MISSION : Objectif du mois auto-genere
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Target, Check, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic } from '@/lib/haptics';
import { ensureMonthlyMission } from '@/lib/partnerMissionsService';
import type { PartnerMission } from '@/lib/partnerModel';

interface Props {
  partnerId: string;
}

export const PartnerMonthlyMissionCard: React.FC<Props> = ({ partnerId }) => {
  const { colors, isDark } = useTheme();
  const [mission, setMission] = useState<PartnerMission | null>(null);

  useEffect(() => {
    ensureMonthlyMission(partnerId).then(setMission).catch(() => {});
  }, [partnerId]);

  if (!mission) return null;

  const progressPct = Math.min(100, Math.round((mission.progress / mission.targetValue) * 100));
  const done = !!mission.completedAt;
  const color = done ? '#10B981' : '#F59E0B';

  const refresh = async () => {
    lightHaptic().catch(() => {});
    const m = await ensureMonthlyMission(partnerId);
    setMission(m);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: color + '55' }]}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
          {done ? (
            <Check size={18} color={color} strokeWidth={2.5} />
          ) : (
            <Target size={18} color={color} strokeWidth={2.3} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color }]}>MISSION DU MOIS</Text>
          <Text style={[styles.text, { color: colors.text }]}>{mission.text}</Text>
        </View>
        <TouchableOpacity onPress={refresh} hitSlop={8}>
          <RefreshCw size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {mission.progress} / {mission.targetValue}{done ? ', Accompli' : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  text: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  progressTrack: {
    height: 6, borderRadius: 3,
    marginTop: 10, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'right' },
});

export default React.memo(PartnerMonthlyMissionCard);
