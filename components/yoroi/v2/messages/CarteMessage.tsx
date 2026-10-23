/**
 * Carte de message de l'Accueil (15 octobre 2026) : une illustration dessinee, un titre, une phrase,
 * un bouton principal indigo et des liens discrets. Meme gabarit pour la sauvegarde, la sante et les suivants.
 * Papier blanc, filet fin, coins de 22 comme les autres cartes de l'Accueil.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, Press } from '@/components/yoroi/v2/accueil/kit';

export type ActionMessage = { label: string; onPress: () => void; busy?: boolean; busyLabel?: string };

export function CarteMessage({
  illustration,
  titre,
  texte,
  principal,
  liens = [],
  children,
}: {
  illustration: React.ReactNode;
  titre: string;
  texte: string;
  principal: ActionMessage;
  liens?: ActionMessage[];
  children?: React.ReactNode;
}) {
  return (
    <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 64, height: 64 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {illustration}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={16} weight="extraBold" tight accessibilityRole="header">
            {titre}
          </Ink>
          <Ink size={13} color={P.ink2} style={{ lineHeight: 18 }}>
            {texte}
          </Ink>
        </View>
      </View>
      {children}
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 4 }}>
        <Press onPress={principal.onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={principal.label} disabled={principal.busy}>
          <View style={{ minHeight: 44, borderRadius: 14, paddingHorizontal: 18, backgroundColor: P.indigo, justifyContent: 'center', opacity: principal.busy ? 0.6 : 1 }}>
            <Ink size={14} weight="extraBold" color={P.white}>
              {principal.busy ? principal.busyLabel ?? 'Un instant…' : principal.label}
            </Ink>
          </View>
        </Press>
        {liens.map((l) => (
          <Pressable key={l.label} onPress={l.onPress} accessibilityRole="button" accessibilityLabel={l.label} hitSlop={6} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}>
            <Ink size={13.5} weight="bold" color={P.ink2}>
              {l.label}
            </Ink>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
