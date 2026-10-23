/**
 * PremiumModal, Yoroi Freemium (refonte v2)
 *
 * Feuille du bas reutilisable pour presenter une fonctionnalite premium.
 * Fermable par la croix. API inchangee (gradientColors conserve, non utilise).
 */

import React from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import type { LucideIcon } from 'lucide-react-native';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CheckMark, GoldVein, PerkIcon, PremiumBadge, PremiumButton, PremiumSeal } from './premiumKit';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  /** Icone affichee dans l'en-tete */
  Icon: LucideIcon;
  /** Conserve pour compatibilite (le design v2 utilise l'or) */
  gradientColors: [string, string, string];
  title: string;
  description: string;
  /** Liste de 3 ou 4 avantages concrets */
  features: string[];
}

export function PremiumModal({ visible, onClose, Icon, title, description, features }: PremiumModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { backgroundColor: c.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.grabber, { backgroundColor: c.border }]} />

          <View style={styles.topRow}>
            <PremiumBadge />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={6}
              style={({ pressed }) => [styles.close, { backgroundColor: c.surface, borderColor: c.divider, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
            >
              <PerkIcon name="close" color={c.ink} size={18} />
            </Pressable>
          </View>

          <Animated.View entering={ENTREE} style={[styles.hero, { backgroundColor: c.surface, borderColor: c.goldLight }]}>
            <View style={styles.heroHead}>
              <View style={[styles.iconTile, { backgroundColor: c.ink }]}>
                <Icon size={26} color={c.goldLight} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={24} weight="black" tight>
                  {title}
                </Ink>
              </View>
              <PremiumSeal size={50} />
            </View>
            <Ink size={15} weight="medium" color={c.textSecondary} style={{ marginTop: 12, lineHeight: 21 }}>
              {description}
            </Ink>
            <GoldVein style={{ marginVertical: 12 }} />
            <Ink size={14} weight="extraBold" color={c.textSecondary} style={{ marginBottom: 8 }}>
              Ce que tu débloques
            </Ink>
            <View style={{ gap: 10 }}>
              {features.map((feat, i) => (
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
          </Animated.View>

          <View style={styles.cta}>
            <PremiumButton
              label="Passer Premium"
              onPress={() => {
                onClose();
                router.push('/paywall' as never);
              }}
            />
            <Pressable onPress={onClose} accessibilityRole="button" style={styles.skip} hitSlop={8}>
              <Ink size={14} weight="bold" color={c.textMuted}>
                Non merci, continuer gratuitement
              </Ink>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(29,32,41,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
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
  cta: {
    marginTop: 16,
    gap: 6,
  },
  skip: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
