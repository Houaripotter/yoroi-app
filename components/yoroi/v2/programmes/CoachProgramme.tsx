/**
 * Le mot du coach (25 octobre 2026) : en haut de ton programme, chaque jour, ce que tu fais aujourd'hui et un mot
 * pour tenir (lib/v2/programmes/coach.ts). Jour d'entraînement ou séance ratée : le bouton lance la séance.
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton } from '@/components/yoroi/v2/seances/ui';
import type { MessageCoach } from '@/lib/v2/programmes/coach';
import { traduire } from '@/lib/i18n/tr';
import { ton } from '@/components/yoroi/v2/seance/pastel';

export function CoachProgramme({ message, onCommencer }: { message: MessageCoach; onCommencer: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const fort = message.etat === 'rattrape' || message.etat === 'debut';
  return (
    // 27 octobre 2026 (refonte Pastel) : le message fort sur le lilas, plus de fond bleu nuit plein
    <View style={{ borderRadius: 22, padding: 16, gap: 8, backgroundColor: fort ? ton('lilas').fond : c.accentTint }} accessibilityRole="summary">
      <Ink size={12} weight="black" color={fort ? ton('lilas').encre : c.accentText} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {traduire('Ton coach')}
      </Ink>
      <Ink size={19} weight="black" tight color={c.ink}>{message.titre}</Ink>
      <Ink size={15} weight="bold" color={c.textSecondary} style={{ lineHeight: 21 }}>{message.texte}</Ink>
      {message.ensuite ? <Ink size={13} weight="extraBold" color={c.ink}>{message.ensuite}</Ink> : null}
      {message.seanceDuJour ? <BigButton label={traduire('C’est parti')} icon="play" tone="accent" onPress={onCommencer} style={{ marginTop: 4 }} /> : null}
    </View>
  );
}
