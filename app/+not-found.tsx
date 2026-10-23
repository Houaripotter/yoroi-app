// ============================================
// Page introuvable (lien invalide, ecran deplace ou supprime)
// Refonte v2 : un ronin perdu sur l'allee des cerisiers (fond d'epoque plein ecran, vague 16),
// au-dessus de la carte (sans chevauchement). Le voile papier garde la carte et les boutons lisibles.
// ============================================

import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View, Image, Pressable, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { FondEpoque } from '@/components/yoroi/v2/fonds/FondEpoque';

const RONIN = require('@/assets/avatars/app/guerrier/guerrier_h_4_ronin.webp');

function tap() {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  } catch {
    // sans importance
  }
}

export default function NotFoundScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const heroH = Math.round(Math.min(width * 0.95, 420)) + insets.top;

  const goHome = () => {
    tap();
    router.replace('/' as never);
  };
  const goBack = () => {
    tap();
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Écran introuvable', headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <FondEpoque fond="sakura" voile="clair" />
        <View style={{ height: heroH, overflow: 'hidden' }}>
          <Animated.View entering={ENTREE} style={styles.warrior} pointerEvents="none">
            <Image source={RONIN} style={{ width: heroH * 0.6, height: heroH * 0.8 }} resizeMode="contain" accessibilityLabel="Un ronin perdu" />
          </Animated.View>
        </View>

        <Animated.View entering={ENTREE} style={[styles.glass, { shadowColor: c.shadow }]}>
          <Ink size={14} weight="bold" color={c.accent}>
            Page introuvable
          </Ink>
          <Ink size={30} weight="black" tight>
            Tu t’es égaré, ronin
          </Ink>
          <Ink size={15} weight="medium" color={c.textSecondary} style={{ lineHeight: 22 }}>
            Le lien que tu as suivi mène à un écran qui a été déplacé ou supprimé. Reviens à l’accueil pour continuer.
          </Ink>
        </Animated.View>

        <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Retour à l'accueil"
            style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? c.accentPressed : c.accent, shadowColor: c.accent }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" stroke={c.onAccent} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Ink size={17} weight="extraBold" color={c.onAccent}>
              Retour à l’accueil
            </Ink>
          </Pressable>
          <Pressable onPress={goBack} accessibilityRole="button" style={[styles.secondary, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Ink size={16} weight="bold" color={c.textSecondary}>
              Revenir en arrière
            </Ink>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warrior: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  kanji: {
    position: 'absolute',
    right: 18,
  },
  glass: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 28,
    padding: 20,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  actions: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  primary: {
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  secondary: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
