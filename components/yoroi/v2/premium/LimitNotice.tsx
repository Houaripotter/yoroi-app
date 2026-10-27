/**
 * Carte d'une limite de la version gratuite (lib/v2/premium/limits.ts), affichee la ou elle s'applique.
 * Ton doux : ce que l'utilisateur garde, puis un lien vers le paywall (avec sa source et le vrai compteur).
 * Ne cache jamais rien.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { limitNotice, type FreeLimitKey } from '@/lib/v2/premium/limits';
import { ouvrirPaywall, type SourcePremium } from '@/lib/v2/premium/sources';
import { traduire } from '@/lib/i18n/tr';

/** Source du paywall pour chaque limite : la mesure sait quelle limite fait passer a Premium */
const SOURCE_DE_LIMITE: Record<FreeLimitKey, SourcePremium> = {
  chartDays: 'periode_longue',
  upcomingCompetitions: 'competitions_limite',
  progressPhotos: 'photos_limite',
  carnetBenchmarks: 'progression_mouvements',
  carnetSkills: 'progression_mouvements',
};

export function LimitNotice({ limit, count, style }: { limit: FreeLimitKey; count: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const n = limitNotice(limit, count);
  if (!n) return null;
  return (
    <View style={[{ borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="crown" size={17} color={c.accent} />
        </View>
        <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{traduire(n.title)}</Ink>
      </View>
      <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(n.text)}</Ink>
      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          // le vrai nombre (photos deja prises, competitions a venir) suit jusqu'au paywall
          ouvrirPaywall(SOURCE_DE_LIMITE[limit], count);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Voir YOROI Premium")}
        style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? c.accentTint : c.surface })}
      >
        <Ink size={14} weight="extraBold" color={c.accent}>{traduire("Voir YOROI Premium")}</Ink>
        <Icon name="chevron" size={14} color={c.accent} stroke={2.6} />
      </Pressable>
    </View>
  );
}

export default LimitNotice;
