// ============================================
// PARTNERS TIER LIST · classement S/A/B/C selon winrate + menace
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic } from '@/lib/haptics';

const PARTNERS_KEY = '@yoroi_sparring_partners';

interface TierPartner {
  id: string;
  name: string;
  photoUri?: string;
  belt?: string;
  wins: number;
  losses: number;
  total: number;
  winrate: number | null;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
}

const TIER_META: Record<TierPartner['tier'], { label: string; color: string; description: string }> = {
  S: { label: 'S', color: '#EF4444', description: 'Betes noires · winrate bas, partenaires qui te testent' },
  A: { label: 'A', color: '#F59E0B', description: 'Serieux challenges · equilibre difficile' },
  B: { label: 'B', color: '#3B82F6', description: 'Partenaires solides · equilibre' },
  C: { label: 'C', color: '#10B981', description: 'Tu maitrises · winrate > 65%' },
  D: { label: 'D', color: '#6B7280', description: 'Pas assez de rounds pour evaluer' },
};

function computeTier(winrate: number | null, total: number): TierPartner['tier'] {
  if (total < 3) return 'D';
  if (winrate == null) return 'D';
  if (winrate < 30) return 'S';
  if (winrate < 50) return 'A';
  if (winrate < 65) return 'B';
  return 'C';
}

export default function PartnersTierListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [partners, setPartners] = useState<TierPartner[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PARTNERS_KEY);
        if (!raw) return;
        const list: any[] = JSON.parse(raw);
        const mapped: TierPartner[] = list.map(p => {
          const wins = p.wins || 0;
          const losses = p.losses || 0;
          const total = p.matchCount || wins + losses + (p.draws || 0);
          const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
          return {
            id: p.id,
            name: p.name,
            photoUri: p.photoUri,
            belt: p.belt,
            wins, losses, total, winrate,
            tier: computeTier(winrate, total),
          };
        });
        setPartners(mapped);
      } catch { /* silent */ }
    })();
  }, []);

  const tierOrder: TierPartner['tier'][] = ['S', 'A', 'B', 'C', 'D'];
  const byTier: Record<TierPartner['tier'], TierPartner[]> = { S: [], A: [], B: [], C: [], D: [] };
  partners.forEach(p => byTier[p.tier].push(p));
  Object.keys(byTier).forEach(k => byTier[k as TierPartner['tier']].sort((a, b) => b.total - a.total));

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Tier List</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Classement selon ta domination
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {tierOrder.map(tier => {
          const meta = TIER_META[tier];
          const list = byTier[tier];
          if (list.length === 0) return null;
          return (
            <View key={tier} style={[styles.tierRow, { borderColor: meta.color }]}>
              {/* Label tier */}
              <View style={[styles.tierLabelBox, { backgroundColor: meta.color }]}>
                <Text style={styles.tierLabel}>{meta.label}</Text>
              </View>
              {/* Partenaires */}
              <View style={styles.tierContent}>
                <View style={styles.tierPartners}>
                  {list.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => { lightHaptic().catch(() => {}); router.push(`/sparring-partners?focus=${p.id}` as any); }}
                      activeOpacity={0.85}
                      style={[styles.chip, { backgroundColor: meta.color + '20', borderColor: meta.color + '60' }]}
                    >
                      {p.photoUri ? (
                        <Image source={{ uri: p.photoUri }} style={styles.chipPhoto} />
                      ) : (
                        <View style={[styles.chipPhoto, { backgroundColor: meta.color + '30', alignItems: 'center', justifyContent: 'center' }]}>
                          <User size={14} color={meta.color} />
                        </View>
                      )}
                      <View>
                        <Text style={[styles.chipName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                        {p.winrate != null && (
                          <Text style={[styles.chipStat, { color: meta.color }]}>{p.winrate}% · {p.total}r</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.tierDesc, { color: colors.textMuted }]}>{meta.description}</Text>
              </View>
            </View>
          );
        })}

        {partners.length === 0 && (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              Pas encore de partenaires avec un historique de rounds.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12 },
  tierRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tierLabelBox: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierLabel: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tierContent: {
    flex: 1,
    padding: 12,
  },
  tierPartners: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 180,
  },
  chipPhoto: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' },
  chipName: { fontSize: 12, fontWeight: '800' },
  chipStat: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  tierDesc: { fontSize: 10, marginTop: 8, fontStyle: 'italic' },
});
