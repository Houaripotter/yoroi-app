/**
 * PremiumTeaser, Yoroi Freemium (refonte v2)
 *
 * Banniere affichee en bas des ecrans pour les utilisateurs gratuits.
 * Logique inchangee : invisible pour un abonne (sauf forceShow).
 */

import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePremium } from '@/context/PremiumContext';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CheckMark, GoldVein, PremiumBadge, PremiumButton, PremiumSeal } from './premiumKit';

interface PremiumTeaserProps {
  title?: string;
  description?: string;
  variant?: 'history' | 'analytics' | 'detail' | 'default';
  forceShow?: boolean;
}

const VARIANT_CONFIG: Record<string, { defaultTitle: string; defaultDesc: string; features: string[] }> = {
  history: {
    defaultTitle: 'Historique complet',
    defaultDesc: 'Tes courbes sur 1 an et sur tout ton historique avec Premium.',
    features: ['Tout ton historique, sans limite', 'Tes tendances et ta vraie progression', 'Comparaisons semaine par semaine'],
  },
  analytics: {
    defaultTitle: 'Analyses avancées',
    defaultDesc: 'Tendances, comparaisons et conseils détaillés avec Premium.',
    features: ['Graphiques avancés et tendances', 'Comparaisons période par période', 'Conseils adaptés à tes données'],
  },
  detail: {
    defaultTitle: 'Le détail complet',
    defaultDesc: 'Mesures avancées et analyses approfondies avec Premium.',
    features: ['Le détail de chaque séance', 'Phases et cycles analysés', 'Liens entre tes habitudes et tes résultats'],
  },
  default: {
    defaultTitle: 'Fonctionnalité Premium',
    defaultDesc: 'Débloque tout le potentiel de ton suivi avec YOROI Premium.',
    features: ['Toutes tes données, sans limite', 'Analyses et chiffres avancés', 'Export et sauvegarde inclus'],
  },
};

export function PremiumTeaser({ title, description, variant = 'default', forceShow = false }: PremiumTeaserProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const cfg = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.default;

  if (isPremium && !forceShow) return null;

  const displayTitle = title ?? cfg.defaultTitle;
  const displayDesc = description ?? cfg.defaultDesc;

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.goldLight, shadowColor: c.shadow }]}>
      <View pointerEvents="none" style={styles.kanjiWrap}>
        <Glyph kind="sakura" size={130} color={c.goldTint} />
      </View>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 8 }}>
          <PremiumBadge />
          <Ink size={21} weight="black" tight>
            {displayTitle}
          </Ink>
        </View>
        <PremiumSeal size={52} />
      </View>
      <Ink size={14} weight="medium" color={c.textSecondary} style={styles.desc}>
        {displayDesc}
      </Ink>
      <GoldVein style={{ marginVertical: 10 }} />
      <View style={styles.features}>
        {cfg.features.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.check, { backgroundColor: c.goldTint }]}>
              <CheckMark color={c.goldDeep} size={14} />
            </View>
            <Ink size={14} weight="bold" color={c.ink} style={{ flex: 1 }}>
              {feat}
            </Ink>
          </View>
        ))}
      </View>
      <PremiumButton label="Passer Premium" onPress={() => router.push('/paywall' as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 3,
  },
  kanjiWrap: {
    position: 'absolute',
    right: -14,
    bottom: -30,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desc: {
    marginTop: 8,
    lineHeight: 20,
  },
  features: {
    gap: 10,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
