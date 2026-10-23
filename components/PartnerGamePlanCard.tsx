// ============================================
// PARTNER GAME PLAN CARD : Rappel tactique eclair
// ============================================
// Auto-genere depuis whatWorks + historique recent + weaknesses
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  partnerName: string;
  whatWorks: string[];
  weaknesses: string[];
  lastResult?: 'V' | 'D' | 'N' | null;
  lastNote?: string;
}

export const PartnerGamePlanCard: React.FC<Props> = ({
  partnerName, whatWorks, weaknesses, lastResult, lastNote,
}) => {
  const { colors, isDark } = useTheme();

  const hasContent = whatWorks.length > 0 || weaknesses.length > 0 || lastNote;
  if (!hasContent) return null;

  const gamePlan: string[] = [];
  whatWorks.slice(0, 3).forEach(w => gamePlan.push(`${w}`));
  weaknesses.slice(0, 2).forEach(w => gamePlan.push(`→ Cible : ${w}`));

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: '#D4AF3755' }]}>
      <LinearGradient
        colors={['#D4AF3722', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: '#D4AF3725' }]}>
          <Target size={18} color="#D4AF37" strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: '#D4AF37' }]}>GAME PLAN : {partnerName.toUpperCase()}</Text>
          <Text style={[styles.title, { color: colors.text }]}>Avant de monter sur le tapis</Text>
        </View>
      </View>

      {gamePlan.length > 0 && (
        <View style={styles.list}>
          {gamePlan.map((item, i) => (
            <Text key={i} style={[styles.item, { color: colors.text }]}>
              {item}
            </Text>
          ))}
        </View>
      )}

      {lastResult && (
        <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>DERNIER RESULTAT</Text>
          <Text style={[styles.footerResult, {
            color: lastResult === 'V' ? '#10B981' : lastResult === 'D' ? '#EF4444' : '#F59E0B',
          }]}>
            {lastResult === 'V' ? 'Victoire' : lastResult === 'D' ? 'Defaite' : 'Nul'}
            {lastNote ? `, ${lastNote}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
    marginVertical: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '800' },
  list: { marginTop: 10, gap: 4 },
  item: { fontSize: 13, lineHeight: 18 },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 2 },
  footerResult: { fontSize: 12, fontWeight: '700' },
});

export default React.memo(PartnerGamePlanCard);
