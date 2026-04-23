// ============================================
// PARTNER EXTENDED EDITOR · Archétype, Niveau, Écart physique
// ============================================
// Composant que l'on peut inserer dans la fiche partenaire pour editer
// les nouveaux champs etendus.
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic } from '@/lib/haptics';
import { ARCHETYPE_META, EXPERIENCE_LEVEL_META, type Archetype, type ExperienceLevel } from '@/lib/partnerModel';

interface Props {
  archetype?: Archetype;
  experienceLevel?: ExperienceLevel;
  weightDeltaKg?: number;
  heightDeltaCm?: number;
  onChange: (patch: {
    archetype?: Archetype;
    experienceLevel?: ExperienceLevel;
    weightDeltaKg?: number;
    heightDeltaCm?: number;
  }) => void;
}

export const PartnerExtendedEditor: React.FC<Props> = ({
  archetype, experienceLevel, weightDeltaKg, heightDeltaCm, onChange,
}) => {
  const { colors, isDark } = useTheme();

  const pick = <K extends keyof typeof ARCHETYPE_META>(a: K) => {
    lightHaptic().catch(() => {});
    onChange({ archetype: a });
  };
  const pickLevel = (lvl: ExperienceLevel) => {
    lightHaptic().catch(() => {});
    onChange({ experienceLevel: lvl });
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Archetype */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Archetype</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>Son style dominant</Text>
        <View style={styles.grid}>
          {(Object.keys(ARCHETYPE_META) as Archetype[]).map(a => {
            const meta = ARCHETYPE_META[a];
            const Icon = (LucideIcons as any)[meta.icon] || LucideIcons.Star;
            const selected = archetype === a;
            return (
              <TouchableOpacity
                key={a}
                onPress={() => pick(a)}
                activeOpacity={0.85}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? meta.color + '25' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    borderColor: selected ? meta.color : 'transparent',
                  },
                ]}
              >
                <Icon size={16} color={meta.color} />
                <Text style={[styles.chipText, { color: selected ? meta.color : colors.text }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Niveau */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Niveau d'experience</Text>
        <View style={styles.grid}>
          {(Object.keys(EXPERIENCE_LEVEL_META) as ExperienceLevel[]).map(lvl => {
            const meta = EXPERIENCE_LEVEL_META[lvl];
            const selected = experienceLevel === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                onPress={() => pickLevel(lvl)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? meta.color + '25' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                    borderColor: selected ? meta.color : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? meta.color : colors.text }]}>
                  {meta.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Ecarts physiques */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Ecart physique (par rapport a toi)</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>Signe + ou - accepte</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Poids (kg)</Text>
            <TextInput
              keyboardType="numbers-and-punctuation"
              value={weightDeltaKg != null ? String(weightDeltaKg) : ''}
              onChangeText={v => {
                const parsed = v.trim() === '' || v.trim() === '-' ? undefined : Number(v.replace(',', '.'));
                onChange({ weightDeltaKg: isNaN(parsed as number) ? undefined : parsed });
              }}
              placeholder="+10 ou -5"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Taille (cm)</Text>
            <TextInput
              keyboardType="numbers-and-punctuation"
              value={heightDeltaCm != null ? String(heightDeltaCm) : ''}
              onChangeText={v => {
                const parsed = v.trim() === '' || v.trim() === '-' ? undefined : Number(v.replace(',', '.'));
                onChange({ heightDeltaCm: isNaN(parsed as number) ? undefined : parsed });
              }}
              placeholder="+8 ou -3"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  hint: { fontSize: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  inputLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});

export default PartnerExtendedEditor;
