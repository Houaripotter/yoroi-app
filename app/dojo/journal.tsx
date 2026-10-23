/**
 * Journal d'XP : chaque ligne gagnee, jour par jour. Le total ne baisse jamais.
 * Vague 45 : le rang et le palier suivant s'affichent dans l'univers du personnage (Japon ou Classique).
 */
import React, { useMemo } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { THEME_IMAGES } from '@/lib/v2/dojo/personnages';
import { BackHeader, Bar, DOJO, formatDay, formatXp, tap } from '@/components/yoroi/v2/dojo/parts';
import { SOURCE_LABELS, XP_VALUES, totalsBySource } from '@/lib/v2/armure';
import type { XpEntry, XpSource } from '@/lib/v2/armure';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import { construction } from '@/lib/v2/dojo/pieces';
import { rangTitre } from '@/lib/v2/dojo/univers';
import { texteUnivers, universDe } from '@/lib/v2/dojo/dojoAffichage';
import { P } from '@/components/yoroi/livePalette';

const SOURCE_COLORS: Record<XpSource, string> = {
  seance: DOJO.indigo,
  pesee: DOJO.indigo,
  mensurations: DOJO.indigo,
  photo: DOJO.indigo,
  record: DOJO.record, // le rouge reste aux records (tampon rouge)
  semaine: DOJO.gold,
  sceau: DOJO.gold,
  migration: DOJO.moss,
  reprise: DOJO.moss,
  lune: DOJO.indigo,
  geste: DOJO.indigo,
  coffre: DOJO.gold,
};

export default function Journal() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { snap, espace } = useArmure();
  const entries = snap?.ledger ?? [];
  const xp = snap?.state.xp ?? 0;
  // Vague 45 : le rang et le palier suivant, nommes dans l'univers choisi
  const u = universDe(espace);
  const rang = snap?.state.rank;
  const titreRang = rangTitre(rang?.index ?? 0, rang?.dan ?? 0, u);
  const cons = useMemo(() => construction(xp, u), [xp, u]);
  const totals = useMemo(() => totalsBySource(entries), [entries]);

  const sections = useMemo(() => {
    const out: { title: string; total: number; data: XpEntry[] }[] = [];
    entries.slice(0, 600).forEach((e) => {
      const last = out[out.length - 1];
      if (last && last.title === e.date) {
        last.data.push(e);
        last.total += e.amount;
      } else out.push({ title: e.date, total: e.amount, data: [e] });
    });
    return out;
  }, [entries]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.key}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <BackHeader title="Journal d’XP" scene={u === 'classique' ? THEME_IMAGES.classique_ville_nuit : THEME_IMAGES.camp} subtitle="Tout ce que tu as gagné, ligne par ligne" />
            <Animated.View entering={ENTREE} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <Ink size={48} weight="black" tight color={c.accent}>{formatXp(xp)}</Ink>
                <Ink size={16} weight="extraBold" color={c.textSecondary} style={{ marginBottom: 8 }}>XP</Ink>
              </View>
              {/* Vague 45 : ou tu en es, dans ton univers */}
              <Ink size={14} weight="bold">{`Tu es ${titreRang}. Encore ${formatXp(cons.resteXp)} XP pour ${cons.palier}.`}</Ink>
              <Ink size={13} color={c.textSecondary}>Ton XP ne baisse jamais. Supprimer une séance ne retire rien.</Ink>
              {totals.length ? (
                <View style={{ gap: 10, marginTop: 2 }}>
                  {totals.map((t) => (
                    <View key={t.source} style={{ gap: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SOURCE_COLORS[t.source] }} />
                        <Ink size={14} style={{ flex: 1 }}>{t.label}</Ink>
                        <Ink size={14} weight="extraBold">{formatXp(t.amount)}</Ink>
                      </View>
                      <Bar progress={xp ? t.amount / xp : 0} color={SOURCE_COLORS[t.source]} height={4} />
                    </View>
                  ))}
                </View>
              ) : null}
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 30 }}>
            <Hanko size={84} color={c.accent} tampon="toro" />
            <Ink size={18} weight="black">Ton journal est vierge</Ink>
            <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center' }}>{`Une séance, c’est ${XP_VALUES.seance} XP. Une pesée, ${XP_VALUES.pesee} XP. Tout s’inscrit ici.`}</Ink>
            <Pressable
              onPress={() => {
                tap();
                router.push('/ajouter' as any);
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ alignSelf: 'stretch', marginTop: 6, minHeight: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <Ink size={16} weight="extraBold" color={c.onAccent}>Enregistrer une séance</Ink>
            </Pressable>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 16, marginBottom: 6, paddingHorizontal: 4 }}>
            <Ink size={14} weight="extraBold" style={{ flex: 1 }}>{formatDay(section.title)}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{`+${formatXp(section.total)} XP`}</Ink>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 50,
              paddingHorizontal: 14,
              backgroundColor: P.white,
              borderColor: c.border,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: 1,
              borderTopLeftRadius: index === 0 ? 18 : 0,
              borderTopRightRadius: index === 0 ? 18 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 18 : 0,
              borderBottomRightRadius: index === section.data.length - 1 ? 18 : 0,
            }}
          >
            <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: SOURCE_COLORS[item.source] }} />
            <View style={{ flex: 1, paddingVertical: 8 }}>
              <Ink size={14} weight="bold" numberOfLines={2}>{texteUnivers(item.label, u)}</Ink>
              <Ink size={12} color={c.textMuted}>{SOURCE_LABELS[item.source]}</Ink>
            </View>
            <Ink size={15} weight="black" color={item.source === 'record' ? DOJO.record : c.ink}>{`+${item.amount}`}</Ink>
          </View>
        )}
      />
    </View>
  );
}
