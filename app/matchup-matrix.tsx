// ============================================
// MATCHUP MATRIX · Grille visuelle de tous les partenaires
// ============================================
// Chaque case : partenaire, taille = volume, couleur = winrate
// ============================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Info, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { winrateColor, ARCHETYPE_META, type Archetype } from '@/lib/partnerModel';
import { lightHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';
import { PremiumGate } from '@/components/premium/PremiumGate';

const PARTNERS_KEY = '@yoroi_sparring_partners';

interface CellPartner {
  id: string;
  name: string;
  archetype?: Archetype;
  belt?: string;
  photoUri?: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winrate: number | null;
}

export default function MatchupMatrixScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [partners, setPartners] = useState<CellPartner[]>([]);
  const [filter, setFilter] = useState<'all' | 'beasts' | 'friends' | 'dormant'>('all');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PARTNERS_KEY);
        if (!raw) return;
        const list: any[] = JSON.parse(raw);
        const mapped: CellPartner[] = list.map(p => {
          const wins = p.wins || 0;
          const losses = p.losses || 0;
          const draws = p.draws || 0;
          const total = p.matchCount || wins + losses + draws;
          const wr = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
          return {
            id: p.id,
            name: p.name,
            archetype: p.archetype,
            belt: p.belt,
            photoUri: p.photoUri,
            wins, losses, draws, total,
            winrate: wr,
          };
        });
        setPartners(mapped);
      } catch (e) {
        logger.warn('[Matrix] erreur load', e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return partners;
    if (filter === 'beasts') return partners.filter(p => p.winrate != null && p.winrate < 40 && p.total >= 3);
    if (filter === 'friends') return partners.filter(p => p.winrate != null && p.winrate >= 60 && p.total >= 3);
    if (filter === 'dormant') return partners.filter(p => p.total > 0);
    return partners;
  }, [partners, filter]);

  // Normaliser la taille selon le volume (max 1)
  const maxTotal = Math.max(1, ...partners.map(p => p.total));

  return (
    <PremiumGate featureTitle="Matchup Matrix">
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Matrice des confrontations</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Taille = volume · couleur = taux de victoire
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Filtres */}
      <View style={styles.filterRow}>
        {([
          { k: 'all', label: 'Tous' },
          { k: 'beasts', label: 'Bêtes noires' },
          { k: 'friends', label: 'Favorables' },
        ] as const).map(f => (
          <TouchableOpacity
            key={f.k}
            onPress={() => { lightHaptic().catch(() => {}); setFilter(f.k); }}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === f.k ? colors.accent : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
              },
            ]}
          >
            <Text style={{ color: filter === f.k ? colors.textOnGold : colors.text, fontSize: 12, fontWeight: '700' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legende */}
      <View style={styles.legendRow}>
        {[
          { lbl: '< 30%', clr: '#EF4444' },
          { lbl: '30-50%', clr: '#F59E0B' },
          { lbl: '50-70%', clr: '#3B82F6' },
          { lbl: '> 70%', clr: '#10B981' },
        ].map(l => (
          <View key={l.lbl} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.clr }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{l.lbl}</Text>
          </View>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Info size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun match</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Enregistre des séances de sparring avec résultat pour voir la matrice.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {filtered
            .sort((a, b) => b.total - a.total)
            .map(p => {
              const size = 60 + Math.round((p.total / maxTotal) * 60); // 60..120
              const bg = winrateColor(p.winrate);
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.85}
                  onPress={() => { lightHaptic().catch(() => {}); router.push(`/sparring-partners?partnerName=${encodeURIComponent(p.name)}` as any); }}
                  style={[
                    styles.cell,
                    {
                      width: size,
                      height: size,
                      backgroundColor: bg,
                      borderColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
                    },
                  ]}
                >
                  {p.photoUri ? (
                    <Image source={{ uri: p.photoUri }} style={styles.cellPhoto} />
                  ) : (
                    <View style={styles.cellIconBox}>
                      <User size={Math.round(size * 0.28)} color="#fff" />
                    </View>
                  )}
                  <View style={styles.cellOverlay}>
                    <Text style={styles.cellName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.cellStats}>
                      {p.winrate != null ? `${p.winrate}%` : ','} · {p.total}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      )}
    </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 12, textAlign: 'center' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingBottom: 60,
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    justifyContent: 'flex-end',
  },
  cellPhoto: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  cellIconBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellOverlay: {
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cellName: { color: '#fff', fontSize: 11, fontWeight: '800' },
  cellStats: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700' },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
