/**
 * PremiumLockSection, Yoroi Freemium (refonte v2)
 *
 * Bloc verrouille visible DANS les ecrans sur les sections premium.
 * Invisible pour les utilisateurs Premium (logique inchangee).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { usePremium } from '@/context/PremiumContext';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CheckMark, GoldVein, PremiumBadge, PremiumButton } from './premiumKit';

interface PremiumLockSectionProps {
  title: string;
  description?: string;
  forceShow?: boolean;
}

const FEATURES = ['Toutes tes données, sans limite', 'Tes tendances sur la durée', 'Comparaisons et analyses avancées'];

/** Plaques d'armure encore vides (pointilles) puis une plaque doree */
function LockedPlates() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Svg key={i} width={24} height={30} viewBox="0 0 52 66">
          <Path
            d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z"
            fill={i === 4 ? c.goldTint : 'none'}
            stroke={i === 4 ? c.gold : '#B9B6AE'}
            strokeWidth={2.4}
            strokeDasharray={i === 4 ? undefined : '5 4'}
          />
          <Rect x={0} y={30} width={52} height={5} fill={i === 4 ? c.goldLight : c.border} />
          <Rect x={0} y={46} width={52} height={5} fill={i === 4 ? c.goldLight : c.border} />
        </Svg>
      ))}
    </View>
  );
}

export function PremiumLockSection({ title, description, forceShow = false }: PremiumLockSectionProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  if (isPremium && !forceShow) return null;

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.goldLight, shadowColor: c.shadow }]}>
      <View style={styles.head}>
        <PremiumBadge />
        <LockedPlates />
      </View>
      <View style={styles.titleRow}>
        <View style={[styles.lock, { backgroundColor: c.ink }]}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" stroke={c.goldLight} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Ink size={21} weight="black" tight style={{ flex: 1 }}>
          {title}
        </Ink>
      </View>
      {description ? (
        <Ink size={14} weight="medium" color={c.textSecondary} style={styles.desc}>
          {description}
        </Ink>
      ) : null}
      <GoldVein style={{ marginVertical: 10 }} />
      <Ink size={14} weight="extraBold" color={c.textSecondary} style={{ marginBottom: 8 }}>
        Ce que tu débloques
      </Ink>
      <View style={styles.features}>
        {FEATURES.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.check, { backgroundColor: c.goldTint }]}>
              <CheckMark color={c.goldDeep} size={14} />
            </View>
            <Ink size={14} weight="bold" style={{ flex: 1 }}>
              {feat}
            </Ink>
          </View>
        ))}
      </View>
      <PremiumButton label="Débloquer avec Premium" onPress={() => router.push('/paywall' as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 3,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lock: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    marginTop: 10,
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
