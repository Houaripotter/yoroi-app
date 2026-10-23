/**
 * Carte « Décorations de saison » de Personnaliser (19 octobre 2026). Houari ne voyait pas l'ancien interrupteur,
 * une simple ligne sous le theme. C'est maintenant une vraie carte : une petite citrouille et un petit sapin dessines
 * (ceux d'INRO, components/yoroi/v2/saisons/inro/), un titre clair, une phrase courte et un gros interrupteur.
 * Toute la carte se touche. Pendant une saison, sa decoration passe devant (saisonEnTete, lib/v2/saisons/calendrier.ts),
 * sinon la prochaine. Coupee : les dessins palissent.
 * Textes en dur, comme l'ancienne ligne (pas de cle i18n).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CitrouilleInro } from '@/components/yoroi/v2/saisons/inro/halloween';
import { SapinInro } from '@/components/yoroi/v2/saisons/inro/noel';
import { resumeSaison, saisonEnTete, type SaisonId } from '@/lib/v2/saisons/calendrier';
import { traduire } from '@/lib/i18n/tr';

/** Teinte de la carte selon la saison qui passe devant */
const TEINTES: Record<SaisonId, { clair: string; sombre: string; bord: string }> = {
  halloween: { clair: 'rgba(232,121,31,0.16)', sombre: 'rgba(232,121,31,0.22)', bord: 'rgba(232,121,31,0.45)' },
  noel: { clair: 'rgba(21,128,61,0.14)', sombre: 'rgba(34,197,94,0.18)', bord: 'rgba(21,128,61,0.45)' },
};

/** Le gros interrupteur de la carte (60 x 36) */
function GrosInterrupteur({ on, couleur }: { on: boolean; couleur: string }) {
  const { theme } = useYoroiTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 60, height: 36, borderRadius: 18, backgroundColor: on ? couleur : theme.colors.fillSubtle, padding: 4, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
    </View>
  );
}

/** Les deux petits dessins : la saison en tete en grand devant, l'autre plus petite derriere */
function Dessins({ tete, on }: { tete: SaisonId; on: boolean }) {
  // horloge a zero : dessins fixes (le visage de la citrouille et l'etoile du sapin restent allumes)
  const temps = useSharedValue(0);
  const citrouille = (w: number) => <CitrouilleInro w={w} temps={temps} />;
  const sapin = (h: number) => <SapinInro h={h} temps={temps} />;
  return (
    <View style={{ width: 84, height: 72, opacity: on ? 1 : 0.4 }}>
      {/* l'autre saison, plus petite, derriere a droite */}
      <View style={{ position: 'absolute', right: 2, bottom: 6 }}>{tete === 'halloween' ? sapin(40) : citrouille(34)}</View>
      {/* la saison en tete, devant a gauche */}
      <View style={{ position: 'absolute', left: 2, bottom: 4 }}>{tete === 'halloween' ? citrouille(52) : sapin(60)}</View>
    </View>
  );
}

export function CarteDecorations({ active, onChange, date }: { active: boolean; onChange: (v: boolean) => void; date: Date }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const tete = saisonEnTete(date);
  const t = TEINTES[tete];
  const accent = tete === 'halloween' ? '#E8791F' : '#15803D';
  return (
    <Pressable
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
        onChange(!active);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={traduire("Décorations de saison")}
      accessibilityHint={resumeSaison(date, active)}
      style={({ pressed }) => ({ borderRadius: 22, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1.5, borderColor: active ? t.bord : c.border, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      {active ? <LinearGradient pointerEvents="none" colors={[theme.isDark ? t.sombre : t.clair, 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 10, paddingRight: 14, minHeight: 96 }}>
        <Dessins tete={tete} on={active} />
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={16} weight="black" numberOfLines={2}>
            {traduire("Décorations de saison")}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>
            {active ? resumeSaison(date, true) : traduire('Coupées. Touche pour les remettre.')}
          </Ink>
        </View>
        <GrosInterrupteur on={active} couleur={accent} />
      </View>
    </Pressable>
  );
}
